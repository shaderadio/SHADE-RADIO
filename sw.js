// Écouter l'événement 'push' envoyé par Supabase
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'assets/logo.JPG', // Assure-toi que le chemin est correct
      badge: 'assets/logo.JPG',
      vibrate: [100, 50, 100],
      data: {
        url: 'https://shaderadio.github.io/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SHADE RADIO', options)
    );
  }
});

// Ouvrir le site quand on clique sur la notification
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
