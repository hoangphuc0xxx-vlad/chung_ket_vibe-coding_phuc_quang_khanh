// Service worker: ưu tiên mạng, mất mạng thì trả bản đã lưu. Giúp bản triển khai mở lại được khi offline.
const TEN = 'ttv-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok) {
          const ban = res.clone();
          caches.open(TEN).then((c) => c.put(r, ban));
        }
        return res;
      })
      .catch(() => caches.match(r).then((m) => m || caches.match('/index.html'))),
  );
});
