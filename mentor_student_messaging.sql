-- Mentor, Student, And Admin Messaging
-- Run in Supabase SQL Editor. This script is additive and idempotent.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_one_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  thread_type text NOT NULL DEFAULT 'direct'
    CHECK (thread_type IN ('direct', 'admin')),
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CHECK (participant_one_id <> participant_two_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_threads_active_pair
ON public.message_threads (
  LEAST(participant_one_id, participant_two_id),
  GREATEST(participant_one_id, participant_two_id)
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_participant_one
ON public.message_threads(participant_one_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_participant_two
ON public.message_threads(participant_two_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_last_message
ON public.message_threads(last_message_at DESC)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  message_type text NOT NULL DEFAULT 'message'
    CHECK (message_type IN ('message', 'reminder')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important')),
  due_date date,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created
ON public.messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
ON public.messages(recipient_id, read_at)
WHERE read_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON public.messages(sender_id, created_at DESC)
WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_touch_message_thread ON public.messages;
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_active_student_or_teacher(uuid);
DROP FUNCTION IF EXISTS public.is_active_mentor_student_pair(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_start_message_thread(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_message_thread(uuid, uuid);
DROP FUNCTION IF EXISTS public.touch_message_thread();

CREATE OR REPLACE FUNCTION private.is_admin_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_uuid
      AND p.role = 'admin'
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_active_student_or_teacher(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_uuid
      AND p.role IN ('student', 'teacher')
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_active_mentor_student_pair(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_student_mappings m
    JOIN public.profiles teacher ON teacher.id = m.teacher_id
    JOIN public.profiles student ON student.id = m.student_id
    WHERE COALESCE(m.is_active, true) = true
      AND COALESCE(teacher.is_active, true) = true
      AND COALESCE(student.is_active, true) = true
      AND teacher.role = 'teacher'
      AND student.role = 'student'
      AND (
        (m.teacher_id = user_a AND m.student_id = user_b)
        OR
        (m.teacher_id = user_b AND m.student_id = user_a)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_start_message_thread(actor_uuid uuid, other_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT actor_uuid IS NOT NULL
    AND other_uuid IS NOT NULL
    AND actor_uuid <> other_uuid
    AND (
      (
        private.is_admin_user(actor_uuid)
        AND private.is_active_student_or_teacher(other_uuid)
      )
      OR private.is_active_mentor_student_pair(actor_uuid, other_uuid)
    );
$$;

CREATE OR REPLACE FUNCTION private.can_view_message_thread(thread_uuid uuid, viewer_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_admin_user(viewer_uuid)
    OR EXISTS (
      SELECT 1
      FROM public.message_threads t
      WHERE t.id = thread_uuid
        AND t.deleted_at IS NULL
        AND viewer_uuid IN (t.participant_one_id, t.participant_two_id)
    );
$$;

CREATE OR REPLACE FUNCTION private.touch_message_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads
  SET
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_message_thread ON public.messages;
CREATE TRIGGER trg_touch_message_thread
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION private.touch_message_thread();

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name text;
BEGIN
  FOREACH policy_name IN ARRAY ARRAY[
    'Participants and admins can view message threads',
    'Allowed users can create message threads',
    'Participants and admins can view messages',
    'Thread participants can send messages',
    'Recipients can mark messages read'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.message_threads', policy_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', policy_name);
  END LOOP;
END $$;

CREATE POLICY "Participants and admins can view message threads"
ON public.message_threads FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    private.is_admin_user(auth.uid())
    OR auth.uid() IN (participant_one_id, participant_two_id)
  )
);

CREATE POLICY "Allowed users can create message threads"
ON public.message_threads FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND auth.uid() IN (participant_one_id, participant_two_id)
  AND deleted_at IS NULL
  AND (
    private.can_start_message_thread(auth.uid(), participant_one_id)
    OR private.can_start_message_thread(auth.uid(), participant_two_id)
  )
);

CREATE POLICY "Participants and admins can view messages"
ON public.messages FOR SELECT
USING (
  deleted_at IS NULL
  AND private.can_view_message_thread(thread_id, auth.uid())
);

CREATE POLICY "Thread participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND deleted_at IS NULL
  AND char_length(trim(body)) BETWEEN 1 AND 4000
  AND EXISTS (
    SELECT 1
    FROM public.message_threads t
    WHERE t.id = thread_id
      AND t.deleted_at IS NULL
      AND sender_id IN (t.participant_one_id, t.participant_two_id)
      AND recipient_id IN (t.participant_one_id, t.participant_two_id)
      AND sender_id <> recipient_id
  )
);

CREATE POLICY "Recipients can mark messages read"
ON public.messages FOR UPDATE
USING (
  deleted_at IS NULL
  AND recipient_id = auth.uid()
)
WITH CHECK (
  deleted_at IS NULL
  AND recipient_id = auth.uid()
  AND sender_id <> recipient_id
);

GRANT SELECT, INSERT ON public.message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_student_or_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_mentor_student_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_start_message_thread(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_message_thread(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'message_threads'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
    END IF;
  END IF;
END $$;

SELECT 'Messaging schema installed' AS status;
