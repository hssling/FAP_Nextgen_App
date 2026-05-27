-- Mentor, Student, And Admin Messaging Validation
-- Run after mentor_student_messaging.sql.

-- 1) Confirm tables exist.
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('message_threads', 'messages')
ORDER BY table_name;

-- 2) Confirm RLS is enabled.
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('message_threads', 'messages')
ORDER BY tablename;

-- 3) Confirm policies exist.
SELECT
  tablename,
  count(*) AS policy_count,
  array_agg(policyname ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('message_threads', 'messages')
GROUP BY tablename
ORDER BY tablename;

-- 4) Confirm indexes exist.
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('message_threads', 'messages')
  AND indexname IN (
    'uq_message_threads_active_pair',
    'idx_message_threads_participant_one',
    'idx_message_threads_participant_two',
    'idx_message_threads_last_message',
    'idx_messages_thread_created',
    'idx_messages_recipient_unread',
    'idx_messages_sender_created'
  )
ORDER BY tablename, indexname;

-- 5) Confirm helper functions exist.
SELECT
  proname AS function_name
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE pg_namespace.nspname = 'private'
  AND proname IN (
    'is_admin_user',
    'is_active_student_or_teacher',
    'is_active_mentor_student_pair',
    'can_start_message_thread',
    'can_view_message_thread',
    'touch_message_thread'
  )
ORDER BY proname;

-- 6) Current unread counts by recipient.
SELECT
  recipient_id,
  count(*) AS unread_count
FROM public.messages
WHERE read_at IS NULL
  AND deleted_at IS NULL
GROUP BY recipient_id
ORDER BY unread_count DESC;
