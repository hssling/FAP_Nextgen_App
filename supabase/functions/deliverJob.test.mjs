import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverJob } from './mentor-push/deliverJob.js';

test('sends generic alerts to all mentor devices', async () => {
  const sent = [];
  const result = await deliverJob({ kind: 'message', subscriptions: [{ endpoint: 'https://fcm.googleapis.com/fcm/send/1' }, { endpoint: 'https://example.push.apple.com/2' }], send: async (s, payload) => sent.push([s.endpoint, JSON.parse(payload)]) });
  assert.equal(result.retry, false);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent.map(x => x[1]), [{ kind: 'message' }, { kind: 'message' }]);
});

test('removes expired devices and retries transient failures', async () => {
  const removed = [];
  const result = await deliverJob({ kind: 'reflection', subscriptions: [{ endpoint: 'https://fcm.googleapis.com/a' }, { endpoint: 'https://fcm.googleapis.com/b' }], send: async s => { const e = new Error('failure'); e.statusCode = s.endpoint.endsWith('/a') ? 410 : 503; throw e; }, remove: async s => removed.push(s.endpoint) });
  assert.equal(result.retry, true);
  assert.deepEqual(removed, ['https://fcm.googleapis.com/a']);
});

test('does not send to untrusted endpoints', async () => {
  let invoked = false;
  const result = await deliverJob({ kind: 'message', subscriptions: [{ endpoint: 'https://malicious.example/' }], send: async () => { invoked = true; } });
  assert.equal(invoked, false);
  assert.equal(result.retry, false);
});


test('does not notify after an assignment is removed or the message is deleted', async () => {
  const { shouldDeliver } = await import('./mentor-push/deliverJob.js');
  assert.equal(shouldDeliver({ kind: 'message', record: { sender_id: 's', recipient_id: 'm', deleted_at: null }, mentorId: 'm', mapping: { student_id: 's', teacher_id: 'm', is_active: true } }), true);
  assert.equal(shouldDeliver({ kind: 'message', record: { sender_id: 's', recipient_id: 'm', deleted_at: '2026-01-01' }, mentorId: 'm', mapping: { student_id: 's', teacher_id: 'm', is_active: true } }), false);
  assert.equal(shouldDeliver({ kind: 'reflection', record: { student_id: 's' }, mentorId: 'm', mapping: null }), false);
});
