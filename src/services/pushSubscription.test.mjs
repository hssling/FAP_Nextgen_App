import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeDevice } from './pushSubscription.js';

test('registers the browser subscription for the signed-in mentor', async () => {
  const subscription = { toJSON: () => ({ endpoint: 'https://push.example/a', keys: { p256dh: 'key', auth: 'secret' } }) };
  let saved;
  const registration = { pushManager: { getSubscription: async () => null, subscribe: async options => { assert.equal(options.userVisibleOnly, true); return subscription; } } };
  const client = { from: name => { assert.equal(name, 'push_subscriptions'); return { upsert: async data => { saved = data; return { error: null }; } }; } };
  await subscribeDevice({ registration, client, userId: 'mentor-1', publicKey: 'AQID' });
  assert.equal(saved.user_id, 'mentor-1');
  assert.equal(saved.endpoint, 'https://push.example/a');
  assert.deepEqual(saved.keys, { p256dh: 'key', auth: 'secret' });
});

test('reports failed subscription storage', async () => {
  const registration = { pushManager: { getSubscription: async () => ({ toJSON: () => ({ endpoint: 'https://push.example/a', keys: {} }) }) } };
  const client = { from: () => ({ upsert: async () => ({ error: new Error('database unavailable') }) }) };
  await assert.rejects(() => subscribeDevice({ registration, client, userId: 'mentor-1', publicKey: 'AQID' }), /database unavailable/);
});

test('unsubscribes a device and removes its registration on sign out', async () => {
  const { unsubscribeDevice } = await import('./pushSubscription.js');
  const actions = [];
  const subscription = { endpoint: 'https://fcm.googleapis.com/device', unsubscribe: async () => { actions.push('unsubscribe'); return true; } };
  const registration = { pushManager: { getSubscription: async () => subscription } };
  const client = { from: () => ({ delete: () => ({ eq: (field, value) => { actions.push([field, value]); return { eq: async (key, id) => { actions.push([key, id]); return { error: null }; } }; } }) }) };
  await unsubscribeDevice({ registration, client, userId: 'mentor' });
  assert.deepEqual(actions, ['unsubscribe', ['endpoint', subscription.endpoint], ['user_id', 'mentor']]);
});
