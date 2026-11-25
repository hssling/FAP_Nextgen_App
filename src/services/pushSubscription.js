function decodePublicKey(value) {
  const padded = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

export async function subscribeDevice({ registration, client, userId, publicKey }) {
  if (!publicKey || !userId) throw new Error('Push notifications are not configured.');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePublicKey(publicKey) });
  }
  const { endpoint, keys } = subscription.toJSON();
  const { error } = await client.from('push_subscriptions').upsert({ user_id: userId, endpoint, keys }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
  return subscription;
}

export async function unsubscribeDevice({ registration, client, userId }) {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await subscription.unsubscribe();
  const { error } = await client.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint).eq('user_id', userId);
  if (error) throw error;
}
