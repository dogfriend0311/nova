import db from './db';
import { addCoins } from './coinsStorage';

// ── Member reputation / level system ────────────────────────────
// XP is synced via db.getUserStats/updateUserStats (nova_user_stats
// table) so a member's level shows correctly from any device. Coins
// stay in their existing per-browser localStorage scheme (matching
// CoinShop.jsx and everywhere else that already reads/writes coins
// via coinsStorage.js) — this only adds a small streak bonus on top
// of that existing system, it doesn't change how coins work.

// Full 1–100 progression. Levels are named in tiers rather than one
// title per level so the badge always reads as a meaningful rank:
//   Lv.  1– 9  Rookie
//   Lv. 10–24  Prospect
//   Lv. 25–49  All-Star
//   Lv. 50–99  MVP
//   Lv.   100  Legend
const LEVEL_TIERS = [
  { level: 1,   title: 'Rookie'   },
  { level: 10,  title: 'Prospect' },
  { level: 25,  title: 'All-Star' },
  { level: 50,  title: 'MVP'      },
  { level: 100, title: 'Legend'   },
];

export const MAX_LEVEL = 100;

// Level N requires N*N*40 total XP (classic RPG-style curve — early
// levels come fast, later ones take real commitment), capped at
// MAX_LEVEL so the highest rank (Legend) is a real, reachable ceiling
// rather than an unbounded grind.
export function xpToLevel(xp) {
  let level = 1;
  while (level < MAX_LEVEL && (level) * (level) * 40 <= (xp || 0)) level++;
  return level;
}

export function xpForLevel(level) {
  return Math.min(level, MAX_LEVEL) * Math.min(level, MAX_LEVEL) * 40;
}

export function levelTitle(level) {
  let title = LEVEL_TIERS[0].title;
  for (const tier of LEVEL_TIERS) {
    if (level >= tier.level) title = tier.title; else break;
  }
  return title;
}

// Every tier threshold, for progression UIs that want to show
// "Lv. 10 — Prospect", "Lv. 25 — All-Star", etc. as milestones.
export function levelTiers() {
  return LEVEL_TIERS.map(t => ({ ...t }));
}

export function levelProgress(xp) {
  const level = xpToLevel(xp || 0);
  const floor = xpForLevel(level - 1) || 0;
  const ceil = xpForLevel(level);
  const maxedOut = level >= MAX_LEVEL;
  const pct = maxedOut ? 100 : (ceil > floor ? Math.round(((xp - floor) / (ceil - floor)) * 100) : 100);
  return { level, title: levelTitle(level), floor, ceil, pct: Math.max(0, Math.min(100, pct)), maxedOut };
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
    addCoins(username, coinReward);
    db.createNotification(username, {
      type: 'coins',
      title: `💰 Daily reward: +${coinReward} coins`,
      body: `Day ${streak} login streak${xpReward ? ` · +${xpReward} XP` : ''}`,
      link: '#store',
    }).catch(() => {});
  } catch { /* ignore */ }

  return { streak, coinReward, xpReward };
}
