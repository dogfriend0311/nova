// rateLimiter.js — lightweight client-side spam guard for comment/post
// actions. Not a substitute for server-side rate limiting (a determined
// spammer can clear localStorage), but it stops accidental double-posts,
// rapid-fire flooding from the UI, and casual abuse — which is the actual
// threat model for a community site like this one.
//
// Usage:
//   import { checkRateLimit } from './rateLimiter';
//   const verdict = checkRateLimit('comment', username);
//   if (!verdict.allowed) { showError(verdict.message); return; }
//   ...post the comment...
//   recordAction('comment', username);

const WINDOW_MS = 10 * 60 * 1000; // 10 minute rolling window
const MAX_IN_WINDOW = 6;          // max actions per window
const MIN_GAP_MS = 8 * 1000;      // minimum gap between two actions

const storageKey = (kind, actor) => `nova_ratelimit_${kind}_${actor || 'anon'}`;

const readTimestamps = (kind, actor) => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(kind, actor)) || '[]');
    const cutoff = Date.now() - WINDOW_MS;
    return Array.isArray(raw) ? raw.filter(t => t > cutoff) : [];
  } catch { return []; }
};

/** Returns { allowed: boolean, message?: string, retryAfterSec?: number } */
export function checkRateLimit(kind, actor) {
  const timestamps = readTimestamps(kind, actor);
  const now = Date.now();

  if (timestamps.length && now - timestamps[timestamps.length - 1] < MIN_GAP_MS) {
    const retryAfterSec = Math.ceil((MIN_GAP_MS - (now - timestamps[timestamps.length - 1])) / 1000);
    return { allowed: false, message: `Slow down a bit — try again in ${retryAfterSec}s.`, retryAfterSec };
  }

  if (timestamps.length >= MAX_IN_WINDOW) {
    return { allowed: false, message: "You're posting too fast. Take a short break and try again in a few minutes." };
  }

  return { allowed: true };
}

/** Call this right after a successful post to count it against the window. */
export function recordAction(kind, actor) {
  const timestamps = readTimestamps(kind, actor);
  timestamps.push(Date.now());
  try { localStorage.setItem(storageKey(kind, actor), JSON.stringify(timestamps)); } catch { /* ignore */ }
}
