/* Kingdoms Touch — Web Push handlers.
 * Imported by the Workbox-generated service worker via workbox.importScripts
 * (see vite.config.ts). Plain ES5-ish JS so it runs in the SW global as-is. */

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data && event.data.text ? event.data.text() : '' };
  }

  var title = data.title || 'Kingdoms Touch';
  var options = {
    body: data.body || '',
    tag: data.tag || 'kt-notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (list) {
        for (var i = 0; i < list.length; i++) {
          var client = list[i];
          if ('focus' in client) {
            if ('navigate' in client) {
              try {
                client.navigate(url);
              } catch (e) {
                /* ignore cross-origin navigate */
              }
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
