/**
 * achievementsService.js — Badge definitions and earn/check logic.
 * All data stored in localStorage. No Supabase needed.
 */
import db from './db';

export const BADGES = [
  { id: 'early_member',     emoji: '🚀', name: 'Early Adopter',       desc: 'One of the first 50 members',           color: '#ff9e57' },
  { id: 'coin_100',         emoji: '💰', name: 'Coin Collector',       desc: 'Earned 100+ coins',                     color: '#ffd700' },
  { id: 'coin_500',         emoji: '💎', name: 'Diamond Hands',        desc: 'Stacked 500+ coins',                    color: '#5e81f4' },
  { id: 'coin_1000',        emoji: '👑', name: 'Coin King',            desc: '1000+ coins earned',                    color: '#c864dc' },
  { id: 'music_fan',        emoji: '🎵', name: 'Music Fan',            desc: 'Linked a Last.fm account',              color: '#e24a4a' },
  { id: 'roblox_linked',   emoji: '🎮', name: 'Roblox Player',        desc: 'Linked a Roblox account',               color: '#00b2ff' },
  { id: 'beat_battle_vote', emoji: '🗳️', name: 'Community Voice',     desc: 'Voted in a Beat Battle',                color: '#5e81f4' },
  { id: 'beat_battle_win',  emoji: '🏆', name: 'Beat Battle Champ',   desc: 'Won a Beat Battle vote',                color: '#ff9e57' },
  { id: 'prop_bet_win',     emoji: '🎯', name: 'Sharp',                desc: 'Won a Prop Bet',                        color: '#43b581' },
  { id: 'song_of_day',      emoji: '🎶', name: 'DJ Nova',              desc: 'Suggested a Song of the Day',           color: '#c864dc' },
  { id: 'pick_10',          emoji: '📊', name: 'Pick\'em Pro',         desc: 'Made 10+ correct pick\'em picks',       color: '#ff9e57' },
  { id: 'shop_buyer',       emoji: '🛍️', name: 'Shopaholic',          desc: 'Purchased from the Coin Shop',          color: '#ffd700' },
  { id: 'bracket_perfect',  emoji: '✨', name: 'Oracle',               desc: 'Perfect first-round bracket picks',     color: '#c864dc' },
  { id: 'veteran_30',       emoji: '⭐', name: 'Veteran',              desc: 'Account older than 30 days',            color: '#747f8d' },
  { id: 'discord_verified', emoji: '💬', name: 'Discord Regular',      desc: 'Confirmed member of the Discord server', color: '#5865F2' },
  { id: 'potg_voter',       emoji: '🏅', name: 'Talent Scout',         desc: 'Voted for a Player of the Game',        color: '#43b581' },
  { id: 'allstar_voter',    emoji: '⭐', name: 'All-Star Ballot Cast', desc: 'Submitted an All-Star Voting ballot',   color: '#ffd700' },
];

const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]));

function storageKey(username) { return `nova_badges_${username}`; }

// Earlier versions stored a flat array of badge id strings with no earn
// date. Normalize that alongside the current [{ id, earned_at }] shape so
// existing members' saved badges don't need a migration step.
function normalizeEarned(raw) {
  return (Array.isArray(raw) ? raw : []).map(e => (typeof e === 'string' ? { id: e, earned_at: null } : e));
}

function readEarned(username) {
  try { return normalizeEarned(JSON.parse(localStorage.getItem(storageKey(username)) || '[]')); }
  catch { return []; }
}

/** Returns array of badge IDs the user has earned */
export function getEarnedBadges(username) {
  return readEarned(username).map(e => e.id);
}

/** Returns [{ id, earned_at }] for the user's earned badges — earned_at is
 *  null for badges earned before this field existed. Used for the activity
 *  timeline, where "badge earned" needs a real timestamp to sort by. */
export function getEarnedBadgesWithDates(username) {
  return readEarned(username);
}

/** Returns full badge objects the user has earned */
export function getEarnedBadgeObjects(username) {
  return getEarnedBadges(username).map(id => BADGE_MAP[id]).filter(Boolean);
}

/** Award a single badge (idempotent). Notifies the unified notification
 *  center the first time a badge is newly earned — a no-op re-check
 *  (the common case, since syncBadges runs on every profile load)
 *  never fires a duplicate. */
export function awardBadge(username, badgeId) {
  if (!username || !badgeId) return;
  const earned = readEarned(username);
  if (!earned.some(e => e.id === badgeId)) {
    localStorage.setItem(storageKey(username), JSON.stringify([...earned, { id: badgeId, earned_at: new Date().toISOString() }]));
    const badge = BADGE_MAP[badgeId];
    if (badge) {
      db.createNotification(username, {
        type: 'badge',
        title: `${badge.emoji} Badge earned: ${badge.name}`,
        body: badge.desc,
        link: '#profile',
      }).catch(() => {});
    }
  }
}

/** Auto-check and award all deterministic badges for a user */
export function syncBadges(username, { profile = {}, coins = 0, joinDate = null } = {}) {
  if (!username) return;

  // Coins
  if (coins >= 100)  awardBadge(username, 'coin_100');
  if (coins >= 500)  awardBadge(username, 'coin_500');
  if (coins >= 1000) awardBadge(username, 'coin_1000');

  // Last.fm
  if (profile.lastfm_username) awardBadge(username, 'music_fan');

  // Discord — mirrors profile.discord_verified_at (set by
  // discordBadgeCheck.js once their Discord Tag is matched in the
  // server's widget), so this tab stays in sync with the "In Discord"
  // flair shown elsewhere.
  if (profile.discord_verified_at) awardBadge(username, 'discord_verified');

  // Roblox
  if (localStorage.getItem(`nova_roblox_${username}`)) awardBadge(username, 'roblox_linked');

  // Coin shop purchase
  const owned = JSON.parse(localStorage.getItem(`nova_cosmetics_${username}`) || '{}');
  if (Object.keys(owned).length > 0) awardBadge(username, 'shop_buyer');

  // Early member (joined when there were < 50 users)
  try {
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const idx = users.findIndex(u => u.username === username);
    if (idx >= 0 && idx < 50) awardBadge(username, 'early_member');
  } catch {}

  // Veteran (30 days)
  if (joinDate) {
    const daysOld = (Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld >= 30) awardBadge(username, 'veteran_30');
  }
}

/**
 * For a locked badge, returns { current, target } progress toward earning
 * it when that can be computed from data the caller already has on hand,
 * or null when the badge is a one-time / boolean action (linked an
 * account, voted once, made a purchase) that has no meaningful "partway
 * there" state. Keep this in sync with the thresholds in syncBadges().
 */
export function getBadgeProgress(badgeId, { coins = 0 } = {}) {
  switch (badgeId) {
    case 'coin_100':  return { current: Math.min(coins, 100),  target: 100 };
    case 'coin_500':  return { current: Math.min(coins, 500),  target: 500 };
    case 'coin_1000': return { current: Math.min(coins, 1000), target: 1000 };
    default: return null;
  }
}

const achievementsService = { BADGES, BADGE_MAP, getEarnedBadges, getEarnedBadgesWithDates, getEarnedBadgeObjects, awardBadge, syncBadges, getBadgeProgress };
export default achievementsService;
