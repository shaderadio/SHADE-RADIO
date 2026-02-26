/* ============================================================
   SHADE RADIO — Service Worker
   ⚠️ Incrémente CACHE_VERSION à chaque déploiement GitHub
      pour forcer la mise à jour chez tous les utilisateurs
   ============================================================ */
const CACHE_VERSION = 'v25';
const CACHE_NAME    = 'shade-radio-' + CACHE_VERSION;

/* Fichiers à mettre en cache lors de l'installation */
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.JPG',
  '/assets/logo2.PNG',
  '/assets/disque.PNG'
];

/* ── INSTALL : mise en cache des ressources statiques ── */
self.addEventListener('install', function(event) {
  console.log('[SW] Install – cache', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      /* Active immédiatement le nouveau SW sans attendre la fermeture des onglets */
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE : supprime les anciens caches ── */
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate – nettoyage des anciens caches');
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key.startsWith('shade-radio-') && key !== CACHE_NAME;
        }).map(function(key) {
          console.log('[SW] Suppression ancien cache :', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      /* Prend le contrôle de tous les onglets ouverts immédiatement */
      return self.clients.claim();
    })
  );
});

/* ── FETCH : Network First pour HTML/JS, Cache First pour assets ── */
self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  /* Ne pas intercepter les requêtes externes (Supabase, StreamRadio, CDN…) */
  if (url.origin !== self.location.origin) return;

  /* Stratégie Network First pour index.html → toujours la dernière version */
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req).then(function(response) {
        /* Met à jour le cache avec la version réseau */
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        return response;
      }).catch(function() {
        /* Hors-ligne : fallback sur le cache */
        return caches.match(req).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  /* Stratégie Cache First pour les autres assets (images, etc.) */
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        return response;
      });
    })
  );
});

/* ── NOTIFICATIONS PUSH (messages chat) ── */
self.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'NEW_MESSAGE') return;
  var pseudo  = event.data.pseudo  || 'Auditeur';
  var message = event.data.message || '…';

  self.registration.showNotification('💬 ' + pseudo, {
    body:    message,
    icon:    '/assets/logo.JPG',
    badge:   '/assets/logo.JPG',
    vibrate: [100, 50, 100],
    tag:     'shade-chat',          /* remplace la notif précédente */
    renotify: true,
    data:    { url: self.location.origin }
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.startsWith(self.location.origin) && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
