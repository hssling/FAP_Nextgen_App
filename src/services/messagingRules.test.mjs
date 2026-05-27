import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countUnreadMessages,
  formatRelativeMessageTime,
  formatThreadTitle,
  getRecipientRoleLabel,
  normalizeMessagePayload
} from './messagingRules.js';

test('getRecipientRoleLabel returns labels for app roles', () => {
  assert.equal(getRecipientRoleLabel({ role: 'teacher' }), 'Mentor');
  assert.equal(getRecipientRoleLabel({ role: 'student' }), 'Mentee');
  assert.equal(getRecipientRoleLabel({ role: 'admin' }), 'Admin');
  assert.equal(getRecipientRoleLabel({ role: 'unknown' }), 'User');
});

test('formatThreadTitle shows the other participant for direct conversations', () => {
  const thread = {
    participant_one_id: 'student-1',
    participant_two_id: 'teacher-1',
    participant_one: { full_name: 'Ananya Rao', role: 'student' },
    participant_two: { full_name: 'Dr Meera Shah', role: 'teacher' }
  };

  assert.equal(formatThreadTitle(thread, 'student-1'), 'Dr Meera Shah');
  assert.equal(formatThreadTitle(thread, 'teacher-1'), 'Ananya Rao');
});

test('formatThreadTitle falls back to usernames and generic text', () => {
  const thread = {
    participant_one_id: 'admin-1',
    participant_two_id: 'student-1',
    participant_one: { username: 'admin' },
    participant_two: {}
  };

  assert.equal(formatThreadTitle(thread, 'student-1'), 'admin');
  assert.equal(formatThreadTitle(thread, 'admin-1'), 'Conversation');
});

test('countUnreadMessages counts only unread messages received by current user', () => {
  const messages = [
    { recipient_id: 'student-1', read_at: null },
    { recipient_id: 'student-1', read_at: undefined },
    { recipient_id: 'student-1', read_at: '2026-05-27T10:00:00Z' },
    { recipient_id: 'teacher-1', read_at: null }
  ];

  assert.equal(countUnreadMessages(messages, 'student-1'), 2);
});

test('normalizeMessagePayload trims body and normalizes reminder metadata', () => {
  assert.deepEqual(
    normalizeMessagePayload({
      body: '  Please review the family visit notes.  ',
      messageType: 'reminder',
      priority: 'important',
      dueDate: '2026-06-01'
    }),
    {
      body: 'Please review the family visit notes.',
      message_type: 'reminder',
      priority: 'important',
      due_date: '2026-06-01'
    }
  );
});

test('normalizeMessagePayload rejects empty messages', () => {
  assert.throws(
    () => normalizeMessagePayload({ body: '   ', messageType: 'message' }),
    /Message cannot be empty/
  );
});

test('formatRelativeMessageTime returns compact labels', () => {
  const now = new Date('2026-05-27T12:00:00Z');

  assert.equal(formatRelativeMessageTime('2026-05-27T11:59:30Z', now), 'Now');
  assert.equal(formatRelativeMessageTime('2026-05-27T11:45:00Z', now), '15m');
  assert.equal(formatRelativeMessageTime('2026-05-27T09:00:00Z', now), '3h');
  assert.equal(formatRelativeMessageTime('2026-05-26T12:00:00Z', now), '1d');
});
