/**
 * discordEventNotify.js — fire-and-forget client helper for real-time
 * Discord auto-posting (see api/discord-notify.js for the actual webhook
 * call and setup instructions).
 *
 * Deliberately "best effort": if the request fails, is slow, or Discord
 * isn't configured for this deployment, the caller (db.js, mid-award-save)
 * never awaits or throws on this — a Discord hiccup should never block or
 * fail the underlying save.
 */

const EVENTS = new Set(['hof', 'potm', 'accolade', 'article', 'beat_post']);

/**
 * @param {'hof'|'potm'|'accolade'|'article'|'beat_post'} event
 * @param {object} payload - small, JSON-serializable fields for that
 *   event's template in api/discord-notify.js (e.g. { player_name, league }).
 */
export function notifyDiscordEvent(event, payload = {}) {
  if (!EVENTS.has(event)) return;
  try {
    fetch('/api/discord-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
    }).catch(() => {}); // offline / blocked / route not deployed yet — ignore
  } catch {
    // fetch itself can throw synchronously in some environments (e.g. SSR)
  }
}

export default notifyDiscordEvent;
