import { supabase } from './supabaseClient';
import { normalizeMessagePayload } from './messagingRules';

const PROFILE_COLUMNS = 'id, username, full_name, role, year, year_of_joining, registration_number, department, is_active';

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
};

const getPairFilter = (userA, userB) => {
  return `and(participant_one_id.eq.${userA},participant_two_id.eq.${userB}),and(participant_one_id.eq.${userB},participant_two_id.eq.${userA})`;
};

export const fetchAllowedMessageRecipients = async (profile) => {
  ensureSupabase();
  if (!profile?.id || !profile?.role) return [];

  if (profile.role === 'admin') {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .in('role', ['student', 'teacher'])
      .eq('is_active', true)
      .order('role')
      .order('full_name');

    if (error) throw error;
    return data || [];
  }

  if (profile.role === 'teacher') {
    const { data, error } = await supabase
      .from('teacher_student_mappings')
      .select(`student:profiles!student_id(${PROFILE_COLUMNS})`)
      .eq('teacher_id', profile.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => row.student).filter(Boolean);
  }

  if (profile.role === 'student') {
    const { data, error } = await supabase
      .from('teacher_student_mappings')
      .select(`teacher:profiles!teacher_id(${PROFILE_COLUMNS})`)
      .eq('student_id', profile.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (!error) {
      const teachers = (data || []).map((row) => row.teacher).filter(Boolean);
      if (teachers.length > 0) return teachers;
    }

    const { data: mentorRows, error: mentorError } = await supabase.rpc('get_student_mentor', {
      student_uuid: profile.id
    });

    if (mentorError) {
      if (error) throw error;
      throw mentorError;
    }

    return (mentorRows || []).map((row) => ({
      id: row.teacher_id,
      full_name: row.teacher_name,
      role: 'teacher',
      department: row.teacher_department,
      is_active: true
    })).filter((mentor) => mentor.id);
  }

  return [];
};

export const fetchMessageThreads = async (currentUserId) => {
  ensureSupabase();
  if (!currentUserId) return [];

  const { data: threads, error: threadsError } = await supabase
    .from('message_threads')
    .select(`
      *,
      participant_one:profiles!participant_one_id(${PROFILE_COLUMNS}),
      participant_two:profiles!participant_two_id(${PROFILE_COLUMNS})
    `)
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false });

  if (threadsError) throw threadsError;

  const threadIds = (threads || []).map((thread) => thread.id);
  if (threadIds.length === 0) return [];

  const [latestMessagesRes, unreadMessagesRes] = await Promise.all([
    supabase
      .from('messages')
      .select('id, thread_id, sender_id, recipient_id, body, message_type, priority, due_date, read_at, created_at')
      .in('thread_id', threadIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('id, thread_id')
      .eq('recipient_id', currentUserId)
      .is('read_at', null)
      .is('deleted_at', null)
  ]);

  if (latestMessagesRes.error) throw latestMessagesRes.error;
  if (unreadMessagesRes.error) throw unreadMessagesRes.error;

  const latestByThread = new Map();
  (latestMessagesRes.data || []).forEach((message) => {
    if (!latestByThread.has(message.thread_id)) {
      latestByThread.set(message.thread_id, message);
    }
  });

  const unreadByThread = new Map();
  (unreadMessagesRes.data || []).forEach((message) => {
    unreadByThread.set(message.thread_id, (unreadByThread.get(message.thread_id) || 0) + 1);
  });

  return (threads || []).map((thread) => ({
    ...thread,
    latest_message: latestByThread.get(thread.id) || null,
    unread_count: unreadByThread.get(thread.id) || 0
  }));
};

export const fetchThreadMessages = async (threadId) => {
  ensureSupabase();
  if (!threadId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, username, full_name, role),
      recipient:profiles!recipient_id(id, username, full_name, role)
    `)
    .eq('thread_id', threadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const fetchUnreadMessageCount = async (currentUserId) => {
  ensureSupabase();
  if (!currentUserId) return 0;

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', currentUserId)
    .is('read_at', null)
    .is('deleted_at', null);

  if (error) throw error;
  return count || 0;
};

export const findOrCreateThread = async ({ currentUserId, recipientId, actorRole }) => {
  ensureSupabase();
  if (!currentUserId || !recipientId) {
    throw new Error('Both sender and recipient are required.');
  }

  const { data: existing, error: findError } = await supabase
    .from('message_threads')
    .select('*')
    .or(getPairFilter(currentUserId, recipientId))
    .is('deleted_at', null)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing;

  const payload = {
    participant_one_id: currentUserId,
    participant_two_id: recipientId,
    created_by: currentUserId,
    thread_type: actorRole === 'admin' ? 'admin' : 'direct'
  };

  const { data, error } = await supabase
    .from('message_threads')
    .insert(payload)
    .select()
    .single();

  if (!error) return data;

  if (error.code === '23505') {
    const { data: retryData, error: retryError } = await supabase
      .from('message_threads')
      .select('*')
      .or(getPairFilter(currentUserId, recipientId))
      .is('deleted_at', null)
      .single();

    if (retryError) throw retryError;
    return retryData;
  }

  throw error;
};

export const sendMessage = async ({
  threadId,
  senderId,
  recipientId,
  body,
  messageType,
  priority,
  dueDate
}) => {
  ensureSupabase();
  const normalized = normalizeMessagePayload({ body, messageType, priority, dueDate });

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      recipient_id: recipientId,
      ...normalized
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const markThreadMessagesRead = async ({ threadId, currentUserId }) => {
  ensureSupabase();
  if (!threadId || !currentUserId) return;

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('recipient_id', currentUserId)
    .is('read_at', null);

  if (error) throw error;
};

export const subscribeToIncomingMessages = ({ currentUserId, onMessage }) => {
  if (!supabase || !currentUserId || typeof onMessage !== 'function') {
    return null;
  }

  const channel = supabase
    .channel(`incoming-messages:${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${currentUserId}`
      },
      onMessage
    )
    .subscribe();

  return channel;
};
