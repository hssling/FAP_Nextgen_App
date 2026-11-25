-- Additive device notification outbox. The original records remain the source of truth.
create schema if not exists private;
create table if not exists private.mentor_push_outbox (
  id bigint generated always as identity primary key,
  event_kind text not null check (event_kind in ('message', 'reflection')),
  source_id text not null,
  mentor_id uuid not null references auth.users(id) on delete cascade,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (event_kind, source_id, mentor_id)
);
revoke all on private.mentor_push_outbox from public, anon, authenticated;

-- The existing table has INSERT/SELECT/DELETE ownership policies but no UPDATE policy.
drop policy if exists "Users can update their own subscriptions" on public.push_subscriptions;
create policy "Users can update their own subscriptions" on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

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
  elsif tg_table_name = 'messages' then
    insert into private.mentor_push_outbox(event_kind, source_id, mentor_id)
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

drop trigger if exists queue_mentor_reflection_push on public.reflections;
create trigger queue_mentor_reflection_push after insert on public.reflections
  for each row execute function private.queue_mentor_push();
drop trigger if exists queue_mentor_message_push on public.messages;
create trigger queue_mentor_message_push after insert on public.messages
  for each row execute function private.queue_mentor_push();

create or replace function public.claim_mentor_push_jobs() returns table(id bigint, event_kind text, mentor_id uuid, source_id text)
language sql security definer set search_path = '' as $$
  with due as (
    select q.id from private.mentor_push_outbox q
    where q.completed_at is null and q.available_at <= now() and q.attempts < 8
    order by q.id for update skip locked limit 20
  )
  update private.mentor_push_outbox q
    set available_at = now() + interval '5 minutes', attempts = q.attempts + 1
  from due where q.id = due.id returning q.id, q.event_kind, q.mentor_id, q.source_id;
$$;
revoke all on function public.claim_mentor_push_jobs() from public, anon, authenticated;
grant execute on function public.claim_mentor_push_jobs() to service_role;

create or replace function public.finish_mentor_push_job(job_id bigint, retry boolean) returns void
language sql security definer set search_path = '' as $$
  update private.mentor_push_outbox q
  set completed_at = case when retry then null else now() end,
      available_at = case when retry then now() + interval '5 minutes' else q.available_at end
  where q.id = job_id and q.completed_at is null;
$$;
revoke all on function public.finish_mentor_push_job(bigint, boolean) from public, anon, authenticated;
grant execute on function public.finish_mentor_push_job(bigint, boolean) to service_role;


create index if not exists mentor_push_outbox_due_idx
  on private.mentor_push_outbox (available_at, id) where completed_at is null;

-- Schedule only calls with pending work; the key itself is provisioned separately in Vault.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('fap-mentor-push-dispatch', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_project_url' limit 1) || '/functions/v1/mentor-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_anon_key' limit 1),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_anon_key' limit 1), 'x-push-worker-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'fap_mentor_push_worker_secret' limit 1)),
    body := '{}'::jsonb
  )
  where exists (select 1 from private.mentor_push_outbox where completed_at is null and available_at <= now() and attempts < 8)
    and exists (select 1 from vault.decrypted_secrets where name = 'fap_mentor_push_worker_secret')
    and exists (select 1 from vault.decrypted_secrets where name = 'fap_mentor_push_project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'fap_mentor_push_anon_key');
$job$);
select cron.schedule('fap-mentor-push-cleanup', '15 3 * * *', $job$
  delete from private.mentor_push_outbox where completed_at < now() - interval '7 days';
  delete from private.mentor_push_outbox where completed_at is null and attempts >= 8 and available_at < now() - interval '30 days';
$job$);
