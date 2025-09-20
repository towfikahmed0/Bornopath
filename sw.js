 const CACHE_NAME = 'bornopath-cache-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Add more static assets if needed
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );

  // Activate new SW immediately
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );

  // Control all clients without reload
  self.clients.claim();
});

// Fetch event - stale-while-revalidate
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Update cache in background
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => cachedResponse);

        // Return cached version immediately, update later
        return cachedResponse || fetchPromise;
      });
    })
  );
});