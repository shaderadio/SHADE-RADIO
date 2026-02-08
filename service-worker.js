const CACHE_NAME = 'shade-radio-v1';

// Fichiers à mettre en cache (page, manifest, icônes)
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo-192.png',
  '/assets/logo-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // NE PAS cacher le flux audio
  if (event.request.url.includes('stream') || event.request.url.includes('m3u')) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
