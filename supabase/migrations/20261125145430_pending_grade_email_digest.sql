-- Allow a one-time, deduplicated digest email for each mentor with pending grading.
alter table private.mentor_email_outbox
  add column if not exists pending_count integer not null default 0;

alter table private.mentor_email_outbox
  drop constraint if exists mentor_email_outbox_event_kind_check;
alter table private.mentor_email_outbox
  add constraint mentor_email_outbox_event_kind_check
  check (event_kind in ('message', 'reflection', 'pending_grading'));

-- Queue one digest per mentor for a caller-provided run key. A run key makes
-- retries safe: calling this function again with the same key cannot create
-- duplicate deliveries for a mentor.
create or replace function public.queue_pending_grade_email_jobs(p_run_key text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  inserted_count integer;
begin
  if p_run_key is null or btrim(p_run_key) = '' or length(p_run_key) > 100 then
    raise exception 'A non-empty run key of at most 100 characters is required';
  end if;

  with pending as (
    select m.teacher_id, count(distinct r.id)::integer as pending_count
    from public.teacher_student_mappings m
    join public.reflections r on r.student_id = m.student_id
    join public.profiles p on p.id = m.teacher_id
      and p.role = 'teacher'
      and coalesce(p.is_active, true)
      and btrim(coalesce(p.email, '')) <> ''
    where m.is_active = true
      and r.status = 'Pending'
    group by m.teacher_id
  )
  insert into private.mentor_email_outbox(event_kind, source_id, mentor_id, pending_count)
  select 'pending_grading', p_run_key, pending.teacher_id, pending.pending_count
  from pending
  on conflict (event_kind, source_id, mentor_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.queue_pending_grade_email_jobs(text) from public, anon, authenticated;
grant execute on function public.queue_pending_grade_email_jobs(text) to service_role;

-- Include the digest count in claims while preserving the existing claim flow.
drop function if exists public.claim_mentor_email_jobs();
create or replace function public.claim_mentor_email_jobs()
returns table(id bigint, event_kind text, mentor_id uuid, source_id text, pending_count integer)
language sql security definer set search_path = '' as $$
  with due as (
    select q.id from private.mentor_email_outbox q
    where q.completed_at is null and q.available_at <= now() and q.attempts < 8
    order by q.id for update skip locked limit 20
  )
  update private.mentor_email_outbox q
    set available_at = now() + interval '5 minutes', attempts = q.attempts + 1
  from due where q.id = due.id
  returning q.id, q.event_kind, q.mentor_id, q.source_id, q.pending_count;
$$;
revoke all on function public.claim_mentor_email_jobs() from public, anon, authenticated;
grant execute on function public.claim_mentor_email_jobs() to service_role;
