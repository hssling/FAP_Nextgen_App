export const getRecipientRoleLabel = (recipient) => {
  if (!recipient?.role) return 'User';
  if (recipient.role === 'teacher') return 'Mentor';
  if (recipient.role === 'student') return 'Mentee';
  if (recipient.role === 'admin') return 'Admin';
  return 'User';
};

const getDisplayName = (participant) => {
  return participant?.full_name || participant?.username || 'Conversation';
};

export const getOtherParticipant = (thread, currentUserId) => {
  if (!thread) return null;
  if (thread.participant_one_id === currentUserId) return thread.participant_two || null;
  if (thread.participant_two_id === currentUserId) return thread.participant_one || null;
  return thread.participant_two || thread.participant_one || null;
};

export const formatThreadTitle = (thread, currentUserId) => {
  return getDisplayName(getOtherParticipant(thread, currentUserId));
};

export const countUnreadMessages = (messages = [], currentUserId) => {
  return messages.filter((message) => (
    message?.recipient_id === currentUserId && !message?.read_at
  )).length;
};

export const normalizeMessagePayload = ({
  body,
  messageType = 'message',
  priority = 'normal',
  dueDate = null
}) => {
  const trimmedBody = String(body || '').trim();
  if (!trimmedBody) {
    throw new Error('Message cannot be empty.');
  }

  const safeType = messageType === 'reminder' ? 'reminder' : 'message';
  const safePriority = priority === 'important' ? 'important' : 'normal';

  return {
    body: trimmedBody,
    message_type: safeType,
    priority: safePriority,
    due_date: safeType === 'reminder' && dueDate ? dueDate : null
  };
};

export const formatRelativeMessageTime = (value, now = new Date()) => {
  if (!value) return '';

  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const diffMs = Math.max(0, now.getTime() - then.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return then.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short'
  });
};
