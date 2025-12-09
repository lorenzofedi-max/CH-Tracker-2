

const CACHE_NAME = 'cupra-hybrid-tracker-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
  // logo.png intentionally removed from strict install cache to allow install even if logo is missing/misnamed
];

// Installazione: Cache immediata degli asset statici
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Attivazione: Pulizia cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Strategia Network-First per navigazione, Cache-First per asset
self.addEventListener('fetch', (event) => {
  // Gestione speciale per la navigazione (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Per gli altri asset (immagini, script, ecc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Restituisci la cache se c'è, altrimenti vai in rete
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        // Opzionale: cache dinamica delle nuove risorse visitate
        return networkResponse;
      });
    })
  );
});