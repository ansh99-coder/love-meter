// Love Meter ❤️ — Service Worker v2
const CACHE = 'love-meter-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/404.html',
  '/favicon.svg',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/utils.js',
  '/assets/js/config.js',
  '/assets/js/loveAlgorithm.js',
  '/assets/js/api.js',
  '/assets/js/animations.js',
  '/assets/js/particles.js',
  '/assets/js/audio.js',
  '/assets/js/firebaseClient.js',
  '/assets/js/main.js',
  '/assets/js/admin.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
