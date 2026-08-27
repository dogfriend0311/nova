/* eslint-disable no-restricted-globals */
// Minimal service worker for Nova.
//
// This is intentionally simple (no Workbox) — it just caches the app shell
// on install and serves cached responses when the network is unavailable.
// Its main job is to satisfy the browser's PWA "installability" criteria
// (HTTPS + manifest + a registered service worker with a fetch handler) so
// the "Install Nova" prompt (see src/components/InstallPrompt.jsx) actually
// fires. It is NOT a full offline-first cache strategy for the whole app.

const CACHE_NAME = 'nova-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // don't block install if one shell asset 404s
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation/API requests, falling back to cache when
// offline; cache-first for same-origin static assets. Never intercepts
// cross-origin requests (Supabase, ESPN, Roblox, etc.) — those always hit
// the network directly.
//
// IMPORTANT: /espn-proxy/*, /mlb-proxy/*, and everything under /api/ are
// same-origin (they're rewritten through this same domain — see
// vercel.json) even though they ultimately serve live, constantly-changing
// data from ESPN/MLB/Supabase/etc. They must NEVER be served cache-first —
// doing so previously froze scoreboards at whatever was cached on first
// load (a game could sit "live" for hours after it ended, and "today"
// could silently mean whatever day the cache was first populated).
const isDynamicDataPath = (pathname) =>
  pathname.startsWith('/api/') ||
  pathname.startsWith('/espn-proxy/') ||
  pathname.startsWith('/mlb-proxy/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Always go straight to the network for live/dynamic data — never read
  // from or write to the cache for these.
  if (isDynamicDataPath(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return res;
    }).catch(() => cached))
  );
});
