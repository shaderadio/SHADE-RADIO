/* ============================================================
   SHADE RADIO — Service Worker
   Gère les notifications push MÊME quand l'app est fermée.
   ============================================================ */

var CACHE_NAME = 'shade-radio-v1';
var ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/logo.JPG',
  '/assets/logo2.PNG',
  '/assets/disque.PNG',
  '/manifest.json'
];

/* ── Installation : mise en cache des assets ── */
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE).catch(function() {
        /* On ignore les erreurs de cache pour ne pas bloquer l'install */
      });
    })
  );
});

/* ── Activation : nettoyage des vieux caches ── */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── Fetch : cache-first pour les assets statiques ── */
self.addEventListener('fetch', function(event) {
  /* On ne cache que les requêtes GET */
  if (event.request.method !== 'GET') return;
  /* On ne cache pas les appels API / Supabase */
  if (event.request.url.includes('supabase.co') ||
      event.request.url.includes('streamradio.fr')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});

/* ────────────────────────────────────────────────────────────
   PUSH EVENT — déclenché par le serveur (Edge Function)
   même lorsque l'application est complètement fermée.
   ────────────────────────────────────────────────────────── */
self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data;
  try { data = event.data.json(); }
  catch(e) { data = { title: 'Shade Radio', body: event.data.text() }; }

  var title   = data.title   || 'Shade Radio 🎙️';
  var options = {
    body:    data.body    || 'Nouveau message dans le chat !',
    icon:    data.icon    || '/assets/logo.JPG',
    badge:   data.badge   || '/assets/logo.JPG',
    image:   data.image   || null,
    tag:     data.tag     || 'shade-chat',        /* remplace la notif précédente si même tag */
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      pseudo: data.pseudo || ''
    },
    actions: [
      { action: 'open',    title: '💬 Ouvrir le chat' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ── Clic sur la notification ── */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  var targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      /* Si une fenêtre est déjà ouverte, on la focus */
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          /* On signale à la page d'ouvrir le chat */
          client.postMessage({ type: 'OPEN_CHAT' });
          return;
        }
      }
      /* Sinon on ouvre une nouvelle fenêtre */
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/* ── Message depuis la page (fallback app ouverte) ── */
self.addEventListener('message', function(event) {
  if (!event.data) return;

  /* Ancienne méthode conservée pour compatibilité quand l'app est ouverte */
  if (event.data.type === 'NEW_MESSAGE') {
    self.registration.showNotification('Shade Radio 🎙️', {
      body:    event.data.pseudo + ' : ' + event.data.message,
      icon:    '/assets/logo.JPG',
      badge:   '/assets/logo.JPG',
      tag:     'shade-chat',
      renotify: true,
      vibrate: [200, 100, 200],
      data:    { url: '/' }
    });
  }
});
