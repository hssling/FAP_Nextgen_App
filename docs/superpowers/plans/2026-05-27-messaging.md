# Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one-on-one mentor/student/admin messaging with reminders, unread badges, and in-app alerts.

**Architecture:** Add Supabase tables and RLS policies for message threads and messages, then add focused React services/hooks/pages that consume those tables. Keep the feature additive and route-gated by existing `profile.role`.

**Tech Stack:** React 19, Vite, Supabase JS v2, Supabase Postgres/RLS, react-hot-toast, lucide-react, Node built-in test runner.

---

### Task 1: Database Schema

**Files:**
- Create: `mentor_student_messaging.sql`
- Create: `mentor_student_messaging_validation.sql`

- [ ] Create idempotent SQL for `message_threads`, `messages`, helper authorization functions, RLS policies, indexes, grants, and realtime publication guards.
- [ ] Create validation SQL that reports table existence, policy counts, index existence, and unread-message sample counts.
- [ ] Review SQL for additive behavior and no destructive changes to existing tables.

### Task 2: Messaging Helpers And Tests

**Files:**
- Create: `src/services/messagingRules.js`
- Create: `src/services/messagingRules.test.mjs`

- [ ] Write failing tests for role-based recipient labels, thread title formatting, unread counting, and reminder payload normalization.
- [ ] Run `node --test src/services/messagingRules.test.mjs` and verify the expected missing-module failure.
- [ ] Implement the helper functions.
- [ ] Re-run the node tests and verify they pass.

### Task 3: Supabase Messaging Service

**Files:**
- Create: `src/services/messagingService.js`

- [ ] Add functions for fetching allowed recipients, fetching threads, fetching messages, creating threads, sending messages, marking a thread read, and subscribing to incoming messages.
- [ ] Keep all database writes narrow and dependent on RLS for final authorization.

### Task 4: Unread Hook

**Files:**
- Create: `src/hooks/useUnreadMessages.js`

- [ ] Add a hook that fetches unread count for the current user.
- [ ] Subscribe to message inserts for the current recipient and show a toast when a new message arrives.
- [ ] Expose `unreadCount` and `refreshUnreadCount`.

### Task 5: Messages Page

**Files:**
- Create: `src/pages/Messages.jsx`
- Create: `src/pages/Messages.css`

- [ ] Build a responsive inbox with thread list, message panel, compose controls, reminder fields, empty states, loading states, and error states.
- [ ] Mark received messages read when a thread opens.
- [ ] Refresh thread list and unread count after sending.

### Task 6: Routing And Navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Layout.jsx`

- [ ] Add role-gated `messages` routes for student, mentor, and admin dashboards.
- [ ] Add `Messages` nav item with unread badge for all roles.
- [ ] Preserve all existing route paths and redirects.

### Task 7: Verification And Release

**Files:**
- Modify: package or source files only if verification reveals a real issue.

- [ ] Run `node --test src/services/messagingRules.test.mjs`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Inspect `git diff`.
- [ ] Commit changes.
- [ ] Push to `origin main`.
- [ ] Deploy with Vercel from the linked project, then report the deployment URL or blocker.
