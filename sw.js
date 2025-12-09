// Bornopath Progressive Web App Service Worker
// Version: 1.4.0
// Cache Strategy: Stale-While-Revalidate with Network First for critical resources

const APP_VERSION = 'bornopath-v1.4.1:0';
const CACHE_NAMES = {
  static: `${APP_VERSION}-static`,
  dynamic: `${APP_VERSION}-dynamic`,
  api: `${APP_VERSION}-api`
};

// Core app shell - critical resources for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/install.html',
  '/offline.html',
  '/manifest.json',
  
  // Core CSS
  '/style/dashboard.css',
  '/style/profile.css',
  '/style/log.css',
  
  // Core JavaScript
  '/js/ui.js',
  '/js/sys.js',
  '/js/dashboard.js',
  
  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  
  // Fonts (local copies if possible)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
];

// External resources that should be cached
const EXTERNAL_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://code.jquery.com/jquery-3.2.1.slim.min.js',
  'https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/js/bootstrap.min.js'
];

// API endpoints that should never be cached
const API_BLACKLIST = [
  'firestore.googleapis.com',
  'www.googleapis.com',
  'securetoken.googleapis.com'
];

// Network timeout in milliseconds
const NETWORK_TIMEOUT = 5000;

// ===== SERVICE WORKER LIFE CYCLE =====

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', APP_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // Open static cache and add core resources
        const staticCache = await caches.open(CACHE_NAMES.static);
        await staticCache.addAll(STATIC_CACHE_URLS);
        
        // Cache external resources
        const externalCache = await caches.open(CACHE_NAMES.dynamic);
        await Promise.all(
          EXTERNAL_RESOURCES.map(url => externalCache.add(url).catch(err => 
            console.warn('[SW] Failed to cache external resource:', url, err)
          ))
        );
        
        console.log('[SW] Static resources cached successfully');
        return self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', APP_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(key => {
            if (!Object.values(CACHE_NAMES).includes(key)) {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        );
        
        // Claim clients immediately
        await self.clients.claim();
        console.log('[SW] Activation completed');
        
        // Send version update message to all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: APP_VERSION
          });
        });
      } catch (error) {
        console.error('[SW] Activation failed:', error);
        throw error;
      }
    })()
  );
});

// ===== FETCH HANDLING STRATEGIES =====

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  
  // Handle different types of requests with appropriate strategies
  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// ===== REQUEST STRATEGIES =====

// API requests - Network only, no caching for Firestore/auth
async function handleApiRequest(request) {
  try {
    // Network first for API calls with timeout
    const networkPromise = fetchWithTimeout(request, NETWORK_TIMEOUT);
    return await networkPromise;
  } catch (error) {
    console.warn('[SW] API request failed, returning error:', request.url, error);
    
    // For API failures, return appropriate error response
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Static assets - Cache first, then network
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAMES.static);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Update cache in background
      updateCacheInBackground(request, cache);
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Static asset failed, serving offline page:', error);
    return await serveOfflineFallback(request);
  }
}

// Dynamic content - Network first, then cache
async function handleDynamicRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  
  try {
    // Try network first with timeout
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    // Cache successful responses
    if (networkResponse.ok && isCacheable(request)) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', request.url);
    
    // Try cache as fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Final fallback for navigation requests
    if (request.mode === 'navigate') {
      return await serveOfflineFallback(request);
    }
    
    throw error;
  }
}

// ===== HELPER FUNCTIONS =====

// Fetch with timeout
function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
    
    fetch(request)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// Update cache in background without blocking response
function updateCacheInBackground(request, cache) {
  fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse);
      }
    })
    .catch(() => {
      // Silent fail for background updates
    });
}

// Serve offline fallback page
async function serveOfflineFallback(request) {
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAMES.static);
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  return new Response('Offline - Please check your connection', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Check if request is for API
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_BLACKLIST.some(domain => url.hostname.includes(domain));
}

// Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         STATIC_CACHE_URLS.some(staticUrl => url.pathname === new URL(staticUrl, self.location.origin).pathname);
}

// Check if response is cacheable
function isCacheable(request) {
  const url = new URL(request.url);
  
  // Don't cache API requests
  if (isApiRequest(request)) return false;
  
  // Don't cache non-successful responses
  return true;
}

// ===== MESSAGE HANDLING =====

self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: APP_VERSION });
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(CACHE_NAMES.dynamic)
          .then(cache => cache.addAll(data.urls))
          .then(() => event.ports[0]?.postMessage({ success: true }))
          .catch(error => event.ports[0]?.postMessage({ success: false, error: error.message }))
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then(keys => Promise.all(keys.map(key => caches.delete(key))))
          .then(() => event.ports[0]?.postMessage({ success: true }))
          .catch(error => event.ports[0]?.postMessage({ success: false, error: error.message }))
      );
      break;
  }
});

// ===== BACKGROUND SYNC (Future Enhancement) =====

self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // Future: Sync user progress when back online
  }
});

// ===== PERIODIC SYNC (Future Enhancement) =====

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-update') {
    console.log('[SW] Periodic sync for content updates');
    // Future: Check for dictionary updates
  }
});

console.log('[SW] Service worker loaded successfully');
