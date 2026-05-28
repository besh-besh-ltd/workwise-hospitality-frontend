// Workwise service worker — handles browser push notifications.

const DEFAULT_ICON = '/fabicon.ico';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'Workwise', body: event.data.text() };
  }

  const title = payload.title || 'Workwise';
  const options = {
    body: payload.body || '',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_ICON,
    tag: payload.tag || (payload.data && payload.data.category) || 'workwise',
    renotify: true,
    data: payload.data || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          try {
            const clientUrl = new URL(client.url);
            const targetParsed = new URL(targetUrl, self.location.origin);
            if (clientUrl.origin === targetParsed.origin && 'focus' in client) {
              client.navigate(targetParsed.href);
              return client.focus();
            }
          } catch (_) {}
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
