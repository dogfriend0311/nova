// ── Coin balance storage (single source of truth) ──────────────────
// Coins live in per-browser localStorage under `nova_coins_${username}`.
// This used to be hand-built independently in 8+ places (App.jsx,
// MemberProfile.jsx, PropBets.jsx, CoinShop.jsx, reputationService.js,
// ViztaLeague.jsx, NovaWrapped.jsx, OwnerDashboard.jsx's "Give Coins"
// tool), which risked the key format or parsing drifting apart across
// call sites. Everything that reads or writes a user's coin balance
// should go through the functions below instead of touching
// localStorage directly.

function coinsKey(username) {
  return `nova_coins_${username}`;
}

/** Read a user's current coin balance. Returns 0 if unset or username is falsy. */
export function getCoins(username) {
  if (!username) return 0;
  return parseInt(localStorage.getItem(coinsKey(username)) || '0', 10);
}

/** Set a user's coin balance directly. Clamped to a minimum of 0. */
export function setCoins(username, amount) {
  if (!username) return;
  localStorage.setItem(coinsKey(username), String(Math.max(0, amount)));
}

/**
 * Add (or subtract, with a negative delta) coins relative to the
 * current balance, and return the new balance. Clamped to a minimum
 * of 0.
 */
export function addCoins(username, delta) {
  if (!username) return 0;
  const next = Math.max(0, getCoins(username) + delta);
  localStorage.setItem(coinsKey(username), String(next));
  return next;
}
