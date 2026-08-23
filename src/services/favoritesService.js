/**
 * favoritesService.js — lets a member star Roblox league players and
 * teams so they surface first when opening Leagues.
 *
 * Not to be confused with a member's real-world "Favorite Teams" set on
 * their Nova profile (MemberProfile.jsx's fav_teams/TeamSelector/
 * FavTeamsDisplay) — that's pro-sports fandom shown on their public page.
 * This service is a separate, in-league concept: "followed teams" and
 * "favorite players" for personalizing the Leagues tabs themselves.
 *
 * Players reuse the existing per-user watchlist (nova_watchlist /
 * db.getWatchlist·saveWatchlist) so the ⭐ button here and the
 * "Watchlist" league tab always agree. Followed teams use a small
 * table (favorite_teams / db.getFollowedTeams·addFollowedTeam) that
 * mirrors the same shape — the table's still named favorite_teams in
 * Supabase, but everything JS-facing here calls it "followed" to keep
 * it distinct from the profile feature above.
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

/* ── Followed (Roblox league) teams ──────────────────────────────── */
export async function getFollowedTeams(username, sport) {
  if (!username) return [];
  const all = await db.getFollowedTeams(username);
  return (all || []).filter((item) => item.league === sport);
}

export async function toggleFollowedTeam(username, sport, team) {
  if (!username || !team) return null;
  const all = await db.getFollowedTeams(username);
  const match = (all || []).find((item) => item.league === sport && String(item.team_id) === String(team.id));
  if (match) {
    await db.removeFollowedTeam(match.id);
    notifyChange();
    return false;
  }
  await db.addFollowedTeam(username, sport, team.id, team.team_name);
  notifyChange();
  return true;
}
