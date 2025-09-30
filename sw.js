// Improved sw.js for Bornopath PWA to prevent Firestore offline issues
const CACHE_NAME = 'bornopath-cache-v1.3.3';
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Failed to cache during install:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    // Bypass Firestore requests to avoid cache issues
    if (event.request.url.includes('firestore.googleapis.com')) {
      try {
        return await fetch(event.request);
      } catch (err) {
        console.warn('Firestore request failed, falling back to network retry');
        throw err;
      }
    }

    const cachedResponse = await caches.match(event.request);

    try {
      const networkResponse = await fetch(event.request);
      if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
        const cache = await caches.open(CACHE_NAME);
        try { await cache.put(event.request, networkResponse.clone()); } catch(e){console.warn('Failed to cache network response', e);}
      }
      return networkResponse;
    } catch (err) {
      return cachedResponse || (event.request.mode === 'navigate' ? await caches.match(OFFLINE_URL) : undefined);
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
