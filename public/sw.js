const CACHE_NAME = 'scenaria-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API/Firebase, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API requests (Firebase, Gemini, etc.)
  if (
    request.method !== 'GET' ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  // For same-origin: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache fresh responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|png|ico|webmanifest|woff2?)$/))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For HTML navigation requests, return the app shell
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
