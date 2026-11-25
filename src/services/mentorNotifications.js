export async function fetchPendingReflectionCount(client, teacherId) {
  const { data, error } = await client.from('teacher_student_mappings')
    .select('student_id').eq('teacher_id', teacherId).eq('is_active', true);
  if (error) throw error;
  const ids = [...new Set((data || []).map(row => row.student_id).filter(Boolean))];
  if (!ids.length) return 0;
  const result = await client.from('reflections').select('id', { count: 'exact', head: true })
    .eq('status', 'Pending').in('student_id', ids);
  if (result.error) throw result.error;
  return result.count || 0;
}
