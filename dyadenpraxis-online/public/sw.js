/**
 * Service Worker für Push Notifications
 * Dyaden Praxis Online
 */

// Cache-Name für Offline-Fallback
const CACHE_NAME = 'dyaden-praxis-v1';

// Installation: Cache initialisieren
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installiert');
  // Sofort aktivieren ohne auf bestehende Tabs zu warten
  self.skipWaiting();
});

// Aktivierung: Alte Caches aufräumen
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker aktiviert');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Sofort alle Clients übernehmen
  self.clients.claim();
});

// Push Event: Notification anzeigen
self.addEventListener('push', (event) => {
  console.log('[SW] Push Event empfangen');

  let data = {
    title: 'Dyaden Praxis',
    body: 'Du hast eine neue Benachrichtigung',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default',
    data: {},
  };

  // Payload parsen
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {},
      };
    } catch (e) {
      // Falls kein JSON, als Text behandeln
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [],
  };

  // Notification-spezifische Actions hinzufügen
  if (data.data.type === 'session_request') {
    options.actions = [
      { action: 'accept', title: 'Annehmen' },
      { action: 'decline', title: 'Ablehnen' },
    ];
    options.requireInteraction = true;
  } else if (data.data.type === 'message') {
    options.actions = [
      { action: 'reply', title: 'Antworten' },
    ];
  } else if (data.data.type === 'scheduled_session') {
    options.actions = [
      { action: 'join', title: 'Beitreten' },
    ];
    options.requireInteraction = true;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click: App öffnen oder Action ausführen
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification geklickt:', event.action);

  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Action-spezifische URLs
  if (event.action === 'accept' && data.type === 'session_request') {
    targetUrl = `/session?id=${data.sessionId}&action=accept`;
  } else if (event.action === 'decline' && data.type === 'session_request') {
    targetUrl = `/session?id=${data.sessionId}&action=decline`;
  } else if (event.action === 'reply' && data.type === 'message') {
    targetUrl = `/messages?user=${data.senderId}`;
  } else if (event.action === 'join' && data.type === 'scheduled_session') {
    targetUrl = `/session?scheduled=${data.scheduledSessionId}`;
  } else if (data.url) {
    // Fallback: URL aus Payload
    targetUrl = data.url;
  } else if (data.type === 'message') {
    targetUrl = '/messages';
  } else if (data.type === 'session_request' || data.type === 'scheduled_session') {
    targetUrl = '/calendar';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Existierendes Fenster fokussieren wenn vorhanden
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sonst neues Fenster öffnen
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Notification Close: Tracking (optional)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification geschlossen');
  // Hier könnte man Analytics tracken
});

// Push Subscription Change: Subscription erneuern
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push Subscription geändert');
  // Hier könnte man die neue Subscription an den Server senden
  // Dies wird selten benötigt, da wir beim Login prüfen
});
