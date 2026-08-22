/**
 * favoritesService.js — lets a member star Roblox league players and
 * teams so they surface first when opening Leagues.
 *
 * Players reuse the existing per-user watchlist (nova_watchlist /
 * db.getWatchlist·saveWatchlist) so the ⭐ button here and the
 * "Watchlist" league tab always agree. Teams use a small new table
 * (nova_favorite_teams / db.getFavoriteTeams·saveFavoriteTeams)
 * that mirrors the same shape.
 *
 * Toggling dispatches a window event so any other mounted component
 * (e.g. the favorites strip at the top of the Leagues page) can
 * refresh without prop-drilling shared state through every league tab.
 */
import db from './db';

const CHANGE_EVENT = 'nova-fav-league-change';

const notifyChange = () => {
  try { window.dispatchEvent(new Event(CHANGE_EVENT)); } catch {}
};

export const onFavoritesChange = (cb) => {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
};

export const currentUsername = () => {
  try { return JSON.parse(localStorage.getItem('nova_user') || 'null')?.username || null; }
  catch { return null; }
};

export const getPlayerLabel = (player) => player?.nickname || player?.player_name || 'Unknown player';

/* ── Favorite players (watchlist) ───────────────────────────────── */
export async function getFavoritePlayers(username, sport) {
  if (!username) return [];
  const all = await db.getWatchlist(username);
  return (all || []).filter((item) => item.league === sport);
}

export async function toggleFavoritePlayer(username, sport, player) {
  if (!username || !player) return null;
  const all = await db.getWatchlist(username);
  const matches = (item) => item.league === sport && String(item.player_id || item.playerId) === String(player.id);
  const exists = (all || []).some(matches);
  const rest = (all || []).filter((item) => !matches(item));
  const next = exists
    ? rest
    : [...rest, { player_id: player.id, player_name: getPlayerLabel(player), team: player.team || '', league: sport }];
  await db.saveWatchlist(username, next);
  notifyChange();
  return !exists;
}

/* ── Favorite teams ──────────────────────────────────────────────────
   Reuses db's existing favorite_teams table (member_username, league,
   team_id, team_name) — it already existed for team-following but had
   no UI wired up to it yet. */
export async function getFavoriteTeams(username, sport) {
  if (!username) return [];
  const all = await db.getFavoriteTeams(username);
  return (all || []).filter((item) => item.league === sport);
}

export async function toggleFavoriteTeam(username, sport, team) {
  if (!username || !team) return null;
  const all = await db.getFavoriteTeams(username);
  const match = (all || []).find((item) => item.league === sport && String(item.team_id) === String(team.id));
  if (match) {
    await db.removeFavoriteTeam(match.id);
    notifyChange();
    return false;
  }
  await db.addFavoriteTeam(username, sport, team.id, team.team_name);
  notifyChange();
  return true;
}
