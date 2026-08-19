import db from './db';

// ── Member reputation / level system ────────────────────────────
// XP is synced via db.getUserStats/updateUserStats (nova_user_stats
// table) so a member's level shows correctly from any device. Coins
// stay in their existing per-browser localStorage scheme (matching
// CoinShop.jsx and everywhere else that already reads/writes
// `nova_coins_${username}`) — this only adds a small streak bonus on
// top of that existing system, it doesn't change how coins work.

const LEVEL_TITLES = [
  'Rookie', 'Prospect', 'Regular', 'Veteran', 'Star', 'All-Star',
  'Franchise Player', 'Hall of Famer', 'Legend', 'Icon',
];

// Level N requires N*N*40 total XP (classic RPG-style curve — early
// levels come fast, later ones take real commitment).
export function xpToLevel(xp) {
  let level = 1;
  while ((level) * (level) * 40 <= (xp || 0)) level++;
  return level;
}

export function xpForLevel(level) {
  return level * level * 40;
}

export function levelTitle(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export function levelProgress(xp) {
  const level = xpToLevel(xp || 0);
  const floor = xpForLevel(level - 1) || 0;
  const ceil = xpForLevel(level);
  const pct = ceil > floor ? Math.round(((xp - floor) / (ceil - floor)) * 100) : 100;
  return { level, title: levelTitle(level), floor, ceil, pct: Math.max(0, Math.min(100, pct)) };
}

// Call after any XP-worthy action (posting a comment, submitting a
// playoff pick, etc). Fire-and-forget — never blocks the UI action it's
// attached to.
export async function awardXP(username, amount) {
  if (!username || username === 'Guest' || !amount) return;
  try {
    const stats = await db.getUserStats(username);
    const newXp = (stats?.xp || 0) + amount;
    await db.updateUserStats(username, { xp: newXp, login_streak: stats?.login_streak || 0, last_login_date: stats?.last_login_date || null });
  } catch { /* non-fatal — reputation is a nice-to-have, never blocks the real action */ }
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// 7-day reward cycle, coins per streak day (wraps after day 7).
const STREAK_COIN_REWARDS = [5, 8, 10, 12, 15, 20, 30];
const STREAK_XP_REWARDS   = [10, 15, 20, 25, 30, 40, 60];

/**
 * Call once per app session after a user is known (login, or app boot
 * with an existing session). Awards a coin + XP bonus at most once per
 * calendar day per user. Returns the reward info (for a toast) or null
 * if today's reward was already claimed.
 */
export async function checkDailyLogin(username) {
  if (!username || username === 'Guest') return null;
  const today = todayStr();

  const stats = await db.getUserStats(username);
  const lastDate = stats?.last_login_date;
  if (lastDate === today) return null; // already claimed today

  let streak = stats?.login_streak || 0;
  streak = lastDate && daysBetween(lastDate, today) === 1 ? streak + 1 : 1;

  const cycleIdx = (streak - 1) % 7;
  const coinReward = STREAK_COIN_REWARDS[cycleIdx];
  const xpReward = STREAK_XP_REWARDS[cycleIdx];

  await db.updateUserStats(username, {
    xp: (stats?.xp || 0) + xpReward,
    login_streak: streak,
    last_login_date: today,
  });
  db.recordDailyVisit(username, today).catch(() => {});

  // Coins stay in the existing per-browser scheme.
  try {
    const current = parseInt(localStorage.getItem(`nova_coins_${username}`) || '0', 10);
    localStorage.setItem(`nova_coins_${username}`, String(current + coinReward));
  } catch { /* ignore */ }

  return { streak, coinReward, xpReward };
}
