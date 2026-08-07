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
  const notificationId = payload.id || (payload.data && payload.data.id) || null;
  const options = {
    body: payload.body || '',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_ICON,
    // Tag defaulted to the category, so two POs in a row collapsed into one OS
    // toast and the earlier one vanished unseen. Key on the notification id so
    // distinct events stay distinct; only a genuine repeat should replace.
    tag: payload.tag || (notificationId ? `notif-${notificationId}` : 'workwise'),
    renotify: true,
    data: payload.data || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Acting on a push is the clearest possible signal that a notification has been
// read, but this worker cannot call the API itself — auth is a bearer token in
// localStorage, which is not reachable from a service worker. So the page is
// asked to do it: an already-open tab gets a postMessage (its listener is
// guaranteed to be attached), while a cold start carries the id in the URL
// because a message posted to a still-loading window would be dropped.
const READ_PARAM = 'notif_read';

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';
  const notificationId = data.id || null;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          try {
            const clientUrl = new URL(client.url);
            const targetParsed = new URL(targetUrl, self.location.origin);
            if (clientUrl.origin === targetParsed.origin && 'focus' in client) {
              if (notificationId) {
                client.postMessage({ type: 'notification-read', id: notificationId });
              }
              client.navigate(targetParsed.href);
              return client.focus();
            }
          } catch (_) {}
        }
        if (self.clients.openWindow) {
          let coldUrl = targetUrl;
          if (notificationId) {
            try {
              const u = new URL(targetUrl, self.location.origin);
              u.searchParams.set(READ_PARAM, notificationId);
              coldUrl = u.pathname + u.search + u.hash;
            } catch (_) {}
          }
          return self.clients.openWindow(coldUrl);
        }
      })
  );
});
