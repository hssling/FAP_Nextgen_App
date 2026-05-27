# Mentor, Student, And Admin Messaging Design

## Goal
Add a safe one-on-one messaging and reminder feature for FAP NextGen without changing existing family, assessment, reflection, reporting, or assignment workflows.

## Scope
Version 1 supports one-on-one conversations:

- Mentors can message and receive replies from their assigned mentees.
- Students can message and receive replies from their assigned mentor.
- Admins can message mentors and students.
- Admins can view all conversations.
- Messages can be normal messages or reminders.
- Users see unread message counts and in-app new message alerts.

Group/broadcast messaging, file attachments, scheduled reminders, and background push notifications are out of scope for version 1.

## Data Model
Create `public.message_threads` to represent a two-person conversation. Each thread stores `participant_one_id`, `participant_two_id`, `created_by`, `thread_type`, `last_message_at`, and lifecycle timestamps.

Create `public.messages` to represent each sent item. Each message stores `thread_id`, `sender_id`, `recipient_id`, `body`, `message_type`, optional `due_date`, optional `priority`, `read_at`, and lifecycle timestamps.

The schema is additive and idempotent. Existing tables are not altered except through read-only authorization checks against `profiles` and `teacher_student_mappings`.

## Authorization
Row-level security is required on both new tables.

- A user can view threads where they are one of the two participants.
- Admin users can view all threads.
- A user can view messages in threads where they are a participant.
- Admin users can view all messages.
- Mentors can create or reply only in threads with active assigned students.
- Students can create or reply only in threads with their active assigned mentor.
- Admin users can create or reply in any one-on-one thread involving an active mentor or student.
- Users can mark only their received messages as read.

The app will also enforce the same recipient choices in the UI, but database RLS remains the source of truth.

## Frontend
Add a `Messages` page shared by students, mentors, and admins. The page has a left conversation list and a right message panel on wide screens, stacking on mobile. It supports composing a new thread, replying, selecting `message` or `reminder`, setting optional due date for reminders, and marking messages read when opened.

Add a small `Messages` navigation item to each role's sidebar. Show an unread badge next to it. Use the existing `react-hot-toast` system for new-message alerts while the app is open.

Mentor dashboard can later add a shortcut from a mentee drawer, but version 1 keeps the main workflow in the shared Messages page.

## Verification
Verification includes:

- Unit tests for role/recipient helper behavior.
- Build and lint checks.
- SQL validation queries to confirm tables, policies, and indexes exist after applying the migration.
- Manual smoke test paths for student, mentor, and admin roles.
