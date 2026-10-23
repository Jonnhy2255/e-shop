const CACHE_NAME = 'eshop-cache-v2';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './avatar-192x192.png',
  './avatar-512x512.png'
].map(path => new URL(path, APP_ROOT).toString());

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('eshop-cache-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match(new URL('./index.html', APP_ROOT).toString());
        return Response.error();
      });
    })
  );
});
