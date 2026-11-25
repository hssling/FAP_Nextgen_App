import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('push event shows a generic notification and opens the mentor dashboard', async () => {
  const handlers = {};
  let displayed;
  let pending;
  const self = { addEventListener: (type, fn) => { handlers[type] = fn; }, registration: { showNotification: async (title, options) => { displayed = { title, options }; } }, clients: {} };
  vm.runInNewContext(await readFile(new URL('../../public/push-worker.js', import.meta.url), 'utf8'), { self, URL });
  handlers.push({ data: { json: () => ({ kind: 'message' }) }, waitUntil: promise => { pending = promise; } });
  await pending;
  assert.equal(displayed.title, 'FAP NextGen');
  assert.equal(displayed.options.body, 'You have a new message. Open FAP NextGen to view it.');
  assert.equal(displayed.options.data.url, '/teacher-dashboard/messages');
});
