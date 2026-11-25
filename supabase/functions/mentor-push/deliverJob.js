const isAllowedEndpoint = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (url.hostname === 'fcm.googleapis.com' || url.hostname.endsWith('.push.apple.com') || url.hostname === 'updates.push.services.mozilla.com' || url.hostname.endsWith('.notify.windows.com'));
  } catch { return false; }
};

export async function deliverJob({ kind, subscriptions, send, remove = async (_subscription) => {} }) {
  let retry = false;
  for (const subscription of subscriptions) {
    if (!isAllowedEndpoint(subscription.endpoint)) continue;
    try {
      await send(subscription, JSON.stringify({ kind }));
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        try { await remove(subscription); } catch { retry = true; }
      } else retry = true;
    }
  }
  return { retry };
}

export function shouldDeliver({ kind, record, mentorId, mapping }) {
  if (!record || !mapping?.is_active || mapping.teacher_id !== mentorId) return false;
  const studentId = kind === 'message' ? record.sender_id : record.student_id;
  if (mapping.student_id !== studentId) return false;
  return kind !== 'message' || (record.recipient_id === mentorId && !record.deleted_at);
}
