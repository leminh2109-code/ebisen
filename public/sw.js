self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'EBISEN', {
      body: data.body ?? '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'sale-update',
      renotify: true,
      data: { url: data.url ?? '/sales/new' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = e.notification.data?.url ?? '/';
      for (const c of list) {
        if (c.url.includes(self.location.origin)) {
          c.focus(); c.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
