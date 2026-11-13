// Service Worker: macht das Notenbuch ohne Internet startbar.
// Strategie: zuerst das Netz fragen (damit neue Versionen sofort ankommen),
// bei fehlender oder zu langsamer Verbindung die zuletzt geladene Fassung nehmen.
const CACHE = 'notenbuch-v1';
const PAGE = './';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(PAGE)));
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Nur das Laden der App-Seite selbst; Microsoft-Anmeldung und OneDrive bleiben unberührt.
  if (req.method !== 'GET' || req.mode !== 'navigate' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      if (fresh.ok) cache.put(PAGE, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await cache.match(PAGE);
      if (cached) return cached;
      throw e;
    }
  })());
});
