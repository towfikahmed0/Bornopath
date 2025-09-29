const CACHE_NAME = 'bornopath-cache-v1.3.2';
const OFFLINE_URL = '/offline.html';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
  '/js/ui.js',
  '/js/sys.js',
  '/js/dashboard.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Failed to cache during install:', err))
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim(); // Take control of clients immediately
});

// Fetch event
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);

    try {
      const networkResponse = await fetch(event.request);

      // Cache network responses if valid
      if (
        networkResponse &&
        networkResponse.status === 200 &&
        event.request.url.startsWith('http')
      ) {
        const cache = await caches.open(CACHE_NAME);
        try {
          await cache.put(event.request, networkResponse.clone());
        } catch (err) {
          console.warn('Failed to cache network response:', err);
        }
      }

      return networkResponse;

    } catch (err) {
      // If network fails, fallback to cache or offline page
      return cachedResponse || (event.request.mode === 'navigate' ? await caches.match(OFFLINE_URL) : undefined);
    }
  })());
});

// Listen for messages to force update
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
