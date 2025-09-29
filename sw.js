const CACHE_NAME = 'bornopath-cache-v1.3.0';
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
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
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
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Only cache http(s) requests
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              event.request.url.startsWith('http')
            ) {
              cache.put(event.request, networkResponse.clone()).catch(err => {
                console.warn('Cache put failed:', event.request.url, err);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // If offline
            if (cachedResponse) return cachedResponse;

            // If it’s a navigation request → show offline.html
            if (event.request.mode === 'navigate') {
              return cache.match(OFFLINE_URL);
            }
          });

        return cachedResponse || fetchPromise;
      })
    )
  );
});
