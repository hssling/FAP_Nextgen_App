-- Add a separate email outbox so push delivery and email delivery have
-- independent retries and completion state.
create table if not exists private.mentor_email_outbox (
  id bigint generated always as identity primary key,
  event_kind text not null check (event_kind in ('message', 'reflection')),
  source_id text not null,
  mentor_id uuid not null references auth.users(id) on delete cascade,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (event_kind, source_id, mentor_id)
);
revoke all on private.mentor_email_outbox from public, anon, authenticated;

-- Queue the same mentor-facing events as the existing push notification
-- trigger. The email worker re-checks the assignment before sending.
create or replace function private.queue_mentor_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'reflections' then
    insert into private.mentor_push_outbox(event_kind, source_id, mentor_id)
    select 'reflection', new.id::text, m.teacher_id
    from public.teacher_student_mappings m
    join public.profiles p on p.id = m.teacher_id and p.role = 'teacher' and coalesce(p.is_active, true)
    where m.student_id = new.student_id and m.is_active = true
    on conflict do nothing;

    insert into private.mentor_email_outbox(event_kind, source_id, mentor_id)
    select 'reflection', new.id::text, m.teacher_id
    from public.teacher_student_mappings m
    join public.profiles p on p.id = m.teacher_id and p.role = 'teacher' and coalesce(p.is_active, true)
    where m.student_id = new.student_id and m.is_active = true
    on conflict do nothing;
  elsif tg_table_name = 'messages' then
    insert into private.mentor_push_outbox(event_kind, source_id, mentor_id)
    select 'message', new.id::text, new.recipient_id
    from public.teacher_student_mappings m
    join public.profiles p on p.id = m.teacher_id and p.role = 'teacher' and coalesce(p.is_active, true)
    where m.student_id = new.sender_id and m.teacher_id = new.recipient_id and m.is_active = true
    on conflict do nothing;

    insert into private.mentor_email_outbox(event_kind, source_id, mentor_id)
    select 'message', new.id::text, new.recipient_id
    from public.teacher_student_mappings m
    join public.profiles p on p.id = m.teacher_id and p.role = 'teacher' and coalesce(p.is_active, true)
    where m.student_id = new.sender_id and m.teacher_id = new.recipient_id and m.is_active = true
    on conflict do nothing;
  end if;
  return new;
exception when others then
  raise warning 'Could not queue mentor notification (SQLSTATE %) ', sqlstate;
  return new;
end $$;
revoke all on function private.queue_mentor_push() from public, anon, authenticated;

create or replace function public.claim_mentor_email_jobs()
returns table(id bigint, event_kind text, mentor_id uuid, source_id text)
language sql security definer set search_path = '' as $$
  with due as (
    select q.id from private.mentor_email_outbox q
    where q.completed_at is null and q.available_at <= now() and q.attempts < 8
    order by q.id for update skip locked limit 20
  )
  update private.mentor_email_outbox q
    set available_at = now() + interval '5 minutes', attempts = q.attempts + 1
  from due where q.id = due.id returning q.id, q.event_kind, q.mentor_id, q.source_id;
$$;
revoke all on function public.claim_mentor_email_jobs() from public, anon, authenticated;
grant execute on function public.claim_mentor_email_jobs() to service_role;

create or replace function public.finish_mentor_email_job(job_id bigint, retry boolean)
returns void
language sql security definer set search_path = '' as $$
  update private.mentor_email_outbox q
  set completed_at = case when retry then null else now() end,
      available_at = case when retry then now() + interval '5 minutes' else q.available_at end
  where q.id = job_id and q.completed_at is null;
$$;
revoke all on function public.finish_mentor_email_job(bigint, boolean) from public, anon, authenticated;
grant execute on function public.finish_mentor_email_job(bigint, boolean) to service_role;

create index if not exists mentor_email_outbox_due_idx
  on private.mentor_email_outbox (available_at, id) where completed_at is null;

-- Reuse the existing notification worker Vault values. The email worker uses
-- its own Edge Function SMTP secrets, but the cron dispatcher can share the
-- existing project URL, anon key, and worker secret.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('fap-mentor-email-dispatch', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_project_url' limit 1) || '/functions/v1/mentor-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_anon_key' limit 1),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_anon_key' limit 1), 'x-email-worker-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_worker_secret' limit 1)),
    body := '{}'::jsonb
  )
  where exists (select 1 from private.mentor_email_outbox where completed_at is null and available_at <= now() and attempts < 8)
    and exists (select 1 from vault.decrypted_secrets where name = 'fap_mentor_push_worker_secret')
    and exists (select 1 from vault.decrypted_secrets where name = 'fap_mentor_push_project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'fap_mentor_push_anon_key');
$job$);
select cron.schedule('fap-mentor-email-cleanup', '30 3 * * *', $job$
  delete from private.mentor_email_outbox where completed_at < now() - interval '7 days';
  delete from private.mentor_email_outbox where completed_at is null and attempts >= 8 and available_at < now() - interval '30 days';
$job$);
