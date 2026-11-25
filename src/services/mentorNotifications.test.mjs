import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPendingReflectionCount } from './mentorNotifications.js';

test('counts pending reflections only for actively assigned students', async () => {
  const calls = [];
  const client = { from(table) { return {
    select() { return this; },
    eq(column, value) { calls.push([table, column, value]); if (table === 'teacher_student_mappings' && column === 'is_active') return Promise.resolve({ data: [{ student_id: 'a' }, { student_id: 'b' }] }); return this; },
    in(column, values) { calls.push([table, column, values]); return Promise.resolve({ count: 3 }); }
  }; } };
  assert.equal(await fetchPendingReflectionCount(client, 'mentor'), 3);
  assert.deepEqual(calls, [['teacher_student_mappings', 'teacher_id', 'mentor'], ['teacher_student_mappings', 'is_active', true], ['reflections', 'status', 'Pending'], ['reflections', 'student_id', ['a', 'b']]]);
});

test('does not query reflections when no students are assigned', async () => {
  const client = { from(table) { assert.equal(table, 'teacher_student_mappings'); return { select() { return this; }, eq(column) { return column === 'is_active' ? Promise.resolve({ data: [] }) : this; } }; } };
  assert.equal(await fetchPendingReflectionCount(client, 'mentor'), 0);
});
