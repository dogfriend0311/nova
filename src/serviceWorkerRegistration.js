// Registers public/sw.js in production builds only — CRA's dev server
// aggressively caches, which makes debugging with a live service worker
// confusing, so this is skipped on localhost during `npm start`.

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — the app works fine without it, it just won't be
      // installable as a PWA and won't have the offline app-shell fallback.
    });
  });
}
