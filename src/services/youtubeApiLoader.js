// src/services/youtubeApiLoader.js
//
// Loads https://www.youtube.com/iframe_api exactly once, however many
// places in the app need a real YT.Player instance (the global "now
// playing" mini-player, the Music Visualizer's karaoke/fireworks
// screen, etc). Whoever calls first injects the script tag; everyone
// else just waits on the same promise / the already-resolved API.
let ytApiPromise = null;
export function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}
