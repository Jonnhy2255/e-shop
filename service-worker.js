/* E-Shop : service worker (hors ligne + mise à jour automatique) */
const VERSION = 'eshop-v5';
const CACHE_APP = VERSION + '-app';
const CACHE_FONTS = VERSION + '-fonts';

const FICHIERS = [
  './',
  './index.html',
  './manifest.json',
  './logo-header.png',
  './icon-192x192.png',
  './icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then(cache => Promise.allSettled(FICHIERS.map(f => cache.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => !n.startsWith(VERSION)).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Réponse du cache tout de suite, mise à jour en arrière-plan
function ancienPuisReseau(requete, nomCache) {
  return caches.open(nomCache).then(cache =>
    cache.match(requete).then(enCache => {
      const reseau = fetch(requete).then(rep => {
        if (rep && (rep.ok || rep.type === 'opaque')) cache.put(requete, rep.clone());
        return rep;
      }).catch(() => enCache);
      return enCache || reseau;
    })
  );
}

self.addEventListener('fetch', event => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);

  // Pages : le réseau d'abord (toujours à jour), sinon la version enregistrée
  if (requete.mode === 'navigate') {
    event.respondWith(
      fetch(requete).then(rep => {
        if (rep && rep.ok) { const copie = rep.clone(); caches.open(CACHE_APP).then(c => c.put('./index.html', copie)); }
        return rep;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Polices Google
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(ancienPuisReseau(requete, CACHE_FONTS));
    return;
  }

  // Fichiers et images du site
  if (url.origin === self.location.origin) {
    event.respondWith(ancienPuisReseau(requete, CACHE_APP));
  }
  // Tout le reste (base de données, API) passe directement par le réseau
});