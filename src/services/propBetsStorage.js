// ── Prop-bet storage & validation (single source of truth) ─────────
// Props catalog + a user's placed bets live in localStorage under
// `nova_prop_bets` / `nova_user_bets_${username}`. This used to be
// hand-built independently in both ViztaLeague.jsx (PropBetsTab) and
// PropBets.jsx, with nearly-identical bet-placement validation
// (amount parsing, "already bet" check) copy-pasted between the two.
// Everything that reads/writes prop bets or validates a bet amount
// should go through the functions below instead.

const PROPS_KEY = 'nova_prop_bets';
const BETS_KEY  = 'nova_user_bets';

// Sanity cap so a typo'd extra zero in the bet-amount field can't wipe
// a user's whole balance in one click — bets are capped at whichever
// is smaller: the user's current balance, or this absolute ceiling.
export const MAX_BET_AMOUNT = 10000;

export function getAllProps() {
  try { return JSON.parse(localStorage.getItem(PROPS_KEY) || '[]'); }
  catch { return []; }
}

export function getUserBets(username) {
  try { return JSON.parse(localStorage.getItem(`${BETS_KEY}_${username}`) || '{}'); }
  catch { return {}; }
}

export function saveUserBets(username, bets) {
  localStorage.setItem(`${BETS_KEY}_${username}`, JSON.stringify(bets));
}

/**
 * Validate a raw (string) bet amount against the rules every prop-betting
 * surface needs to enforce: must be a positive integer, must not exceed
 * the user's coin balance, and must not exceed MAX_BET_AMOUNT.
 * Returns { ok: true, amount } or { ok: false, error }.
 */
export function validateBetAmount(rawAmount, coinsBalance) {
  const amount = parseInt(rawAmount ?? '10', 10);
  if (isNaN(amount) || amount < 1) {
    return { ok: false, error: 'Enter a valid bet amount.' };
  }
  if (amount > coinsBalance) {
    return { ok: false, error: `Not enough coins! You have ${coinsBalance}.` };
  }
  if (amount > MAX_BET_AMOUNT) {
    return { ok: false, error: `Max bet is ${MAX_BET_AMOUNT.toLocaleString()} coins.` };
  }
  return { ok: true, amount };
}

/**
 * Attempt to place a bet: validates the amount, checks for an existing
 * bet on this prop, and (if valid) returns the updated bets object for
 * the caller to persist via saveUserBets + deduct coins for. Does NOT
 * touch coin balance itself, since that's owned by coinsStorage.js —
 * callers should deduct `amount` coins only after `ok` is true.
 */
export function tryPlaceBet({ myBets, propId, optionIdx, rawAmount, coinsBalance }) {
  if (myBets[propId] !== undefined) {
    return { ok: false, error: 'Already placed a bet on this prop.' };
  }
  const validation = validateBetAmount(rawAmount, coinsBalance);
  if (!validation.ok) return validation;
  const updatedBets = { ...myBets, [propId]: { optionIdx, amount: validation.amount } };
  return { ok: true, amount: validation.amount, updatedBets };
}
