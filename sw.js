// ============================================================
// SERVICE WORKER — Network-First with Versioned Cache
// Version: v20260927.08
//
// HOW THIS FIXES THE STALE CACHE PROBLEM:
// - Browsers ALWAYS fetch sw.js fresh from the server (browser spec).
// - When CACHE_VERSION changes, the new SW installs & activates
//   immediately (skipWaiting), purges all old caches, and forces
//   ALL open pages (on any device) to reload from the network.
// - HTML/navigate requests are ALWAYS fetched from the network,
//   so users NEVER get stale pages after a deployment.
// ============================================================

const CACHE_VERSION = 'v20260927.08';
const CACHE_NAME = `inv-app-${CACHE_VERSION}`;

// ---- INSTALL ----
// Take control immediately without waiting for old SW to release clients
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ---- ACTIVATE ----
// Delete ALL old caches (from any previous version), then claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // Take control of all open tabs immediately
      .then(() => {
        // Tell all open tabs to reload so they get fresh HTML
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
          });
        });
      })
  );
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // NAVIGATION (HTML pages) → Always network-first, never serve stale HTML
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            // Update cache with fresh HTML
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve last cached version of the page
          return caches.match(req).then(cached => cached || new Response(
            '<h1>You are offline</h1><p>Please connect to the internet and refresh.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          ));
        })
    );
    return;
  }

  // STATIC ASSETS (JS, CSS, images, fonts) → Cache-first for performance
  // But note: js files with ?v= params bust their own cache automatically
  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
