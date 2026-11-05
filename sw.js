const CACHE = 'wardrobe-v7';
const CORE = [
  './',
  './index.html',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/router.js',
  './js/db/db.js',
  './js/db/photos.js',
  './js/db/items.js',
  './js/db/outfits.js',
  './js/db/logs.js',
  './js/db/settings.js',
  './js/db/backups.js',
  './js/views/wardrobe.js',
  './js/views/item-detail.js',
  './js/views/item-edit.js',
  './js/views/outfits.js',
  './js/views/outfit-detail.js',
  './js/views/outfit-edit.js',
  './js/views/logs.js',
  './js/views/settings.js',
  './js/components/nav.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/components/log-sheet.js',
  './js/components/photo-input.js',
  './js/components/empty-state.js',
  './js/components/camera.js',
  './js/utils/dates.js',
  './js/utils/stats.js',
  './js/utils/filters.js',
  './js/utils/validation.js',
  './js/utils/image.js',
  './js/utils/id.js',
  './js/utils/dom.js',
  './js/utils/sortable.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
