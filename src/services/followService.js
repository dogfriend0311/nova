/**
 * followService.js — one API for every "Follow" button in Nova:
 *   - Roblox league Players  (delegates to db.js's nova_player_follows —
 *     predates this file, also drives award/stat notifications)
 *   - Roblox league Teams    (delegates to favoritesService's followed
 *     teams — predates this file, backed by favorite_teams)
 *   - Roblox Leagues         (whole league, e.g. "Roblox Baseball")
 *   - Sports Hub Players     (real-world athlete, e.g. an NFL player)
 *   - Sports Hub Teams       (real-world team, e.g. the Chiefs)
 *   - Sports Hub Leagues     (whole league, e.g. "NFL")
 *   - Users                  (another Nova member)
 *
 * The last five all go through db.js's generic nova_follows table.
 * UI components never need to know which storage layer backs a given
 * type — they just call toggleFollow/isFollowing with a FOLLOW_TYPES
 * value and an id, and getAllFollowing()/FeedPage read everything back
 * out for the personalized feed.
 *
 * Toggling dispatches a window event so any other mounted component
 * (a Follow button for the same item elsewhere on screen, the Feed
 * page, a "Following" list) can refresh without prop-drilling.
 */
import db from './db';
import { getFollowedTeams, toggleFollowedTeam } from './favoritesService';

const CHANGE_EVENT = 'nova-follow-change';

const notifyChange = () => {
  try { window.dispatchEvent(new Event(CHANGE_EVENT)); } catch {}
};

export const onFollowChange = (cb) => {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
};

export const currentUsername = () => {
  try { return JSON.parse(localStorage.getItem('nova_user') || 'null')?.username || null; }
  catch { return null; }
};

export const FOLLOW_TYPES = {
  ROBLOX_PLAYER: 'roblox_player',
  ROBLOX_TEAM: 'roblox_team',
  ROBLOX_LEAGUE: 'roblox_league',
  SPORTS_PLAYER: 'sports_player',
  SPORTS_TEAM: 'sports_team',
  SPORTS_LEAGUE: 'sports_league',
  USER: 'user',
};

/** Human label for a follow type, for the Feed and "Following" lists. */
export const FOLLOW_TYPE_LABELS = {
  [FOLLOW_TYPES.ROBLOX_PLAYER]: 'Roblox League Player',
  [FOLLOW_TYPES.ROBLOX_TEAM]: 'Roblox League Team',
  [FOLLOW_TYPES.ROBLOX_LEAGUE]: 'Roblox League',
  [FOLLOW_TYPES.SPORTS_PLAYER]: 'Sports Hub Player',
  [FOLLOW_TYPES.SPORTS_TEAM]: 'Sports Hub Team',
  [FOLLOW_TYPES.SPORTS_LEAGUE]: 'Sports Hub League',
  [FOLLOW_TYPES.USER]: 'Nova Member',
};

export async function isFollowing(username, type, id, extra = {}) {
  if (!username || !id) return false;
  if (type === FOLLOW_TYPES.ROBLOX_PLAYER) {
    return !!(await db.isFollowingPlayer(username, extra.league, id));
  }
  if (type === FOLLOW_TYPES.ROBLOX_TEAM) {
    const list = await getFollowedTeams(username, extra.league);
    return list.some((t) => String(t.team_id) === String(id));
  }
  return db.isFollowing(username, type, id);
}

export async function toggleFollow(username, type, id, label, extra = {}) {
  if (!username || !id) return null;

  if (type === FOLLOW_TYPES.ROBLOX_PLAYER) {
    const following = await db.isFollowingPlayer(username, extra.league, id);
    if (following) { await db.unfollowPlayer(username, extra.league, id); notifyChange(); return false; }
    await db.followPlayer(username, extra.league, id, label);
    notifyChange();
    return true;
  }

  if (type === FOLLOW_TYPES.ROBLOX_TEAM) {
    const nowFollowing = await toggleFollowedTeam(username, extra.league, { id, team_name: label });
    notifyChange();
    return nowFollowing;
  }

  const following = await db.isFollowing(username, type, id);
  if (following) {
    await db.removeFollow(username, type, id);
    notifyChange();
    return false;
  }
  await db.addFollow(username, type, id, label, extra.meta || {});
  notifyChange();
  return true;
}

/** Every follow of one type for a member — used by "Following" lists. */
export async function getFollowing(username, type) {
  if (!username) return [];
  if (type === FOLLOW_TYPES.ROBLOX_PLAYER) return db.getPlayerFollows(username);
  if (type === FOLLOW_TYPES.ROBLOX_TEAM) return db.getFollowedTeams(username);
  return db.getFollows(username, type);
}

/** Everything a member follows, across every type — used by the Feed. */
export async function getAllFollowing(username) {
  const empty = {
    [FOLLOW_TYPES.ROBLOX_PLAYER]: [], [FOLLOW_TYPES.ROBLOX_TEAM]: [], [FOLLOW_TYPES.ROBLOX_LEAGUE]: [],
    [FOLLOW_TYPES.SPORTS_PLAYER]: [], [FOLLOW_TYPES.SPORTS_TEAM]: [], [FOLLOW_TYPES.SPORTS_LEAGUE]: [],
    [FOLLOW_TYPES.USER]: [],
  };
  if (!username) return empty;
  const [robloxPlayers, robloxTeams, generic] = await Promise.all([
    db.getPlayerFollows(username).catch(() => []),
    db.getFollowedTeams(username).catch(() => []),
    db.getFollows(username).catch(() => []),
  ]);
  const byType = { ...empty, [FOLLOW_TYPES.ROBLOX_PLAYER]: robloxPlayers, [FOLLOW_TYPES.ROBLOX_TEAM]: robloxTeams };
  generic.forEach((f) => { if (byType[f.follow_type]) byType[f.follow_type].push(f); });
  return byType;
}

/** Total follow count across every type — for a quick "Following (12)" chip. */
export async function getFollowingCount(username) {
  const all = await getAllFollowing(username);
  return Object.values(all).reduce((sum, list) => sum + list.length, 0);
}
