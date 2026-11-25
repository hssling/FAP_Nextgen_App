self.addEventListener('push', event => {
  let kind = '';
  try { kind = event.data?.json()?.kind || ''; } catch { /* use generic text */ }
  const message = kind === 'message';
  event.waitUntil(self.registration.showNotification('FAP NextGen', {
    body: message ? 'You have a new message. Open FAP NextGen to view it.' : 'A reflection is awaiting review. Open FAP NextGen to view it.',
    icon: '/pwa-192x192.png',
    data: { url: message ? '/teacher-dashboard/messages' : '/teacher-dashboard' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url === '/teacher-dashboard/messages' ? '/teacher-dashboard/messages' : '/teacher-dashboard';
  event.waitUntil(self.clients.openWindow(path));
});
