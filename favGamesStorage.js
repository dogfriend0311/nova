// ── Favorite-games storage (single source of truth) ────────────────
// "Starred games" live in per-browser localStorage under
// `nova_favgames_${username}`. This used to be hand-built independently
// in both SportsHub.jsx (ScoreCard) and MemberProfile.jsx — the same
// "reach into localStorage from inside a component" pattern that caused
// the coins desync bug. Everything that reads or writes a user's
// favorite games should go through the functions below instead of
// touching localStorage directly.

function favGamesKey(username) {
  return `nova_favgames_${username}`;
}

/** Read a user's saved favorite games. Returns [] if unset or username is falsy. */
export function getFavGames(username) {
  if (!username) return [];
  try {
    return JSON.parse(localStorage.getItem(favGamesKey(username)) || '[]');
  } catch {
    return [];
  }
}

/** Overwrite a user's full favorite-games list. */
export function setFavGames(username, games) {
  if (!username) return;
  localStorage.setItem(favGamesKey(username), JSON.stringify(games || []));
}

/** True if `gameId` is already in the user's favorites. */
export function isGameStarred(username, gameId) {
  return getFavGames(username).some(g => g.gameId === gameId);
}

/** Add a favorite game entry (used by the ScoreCard star button). Returns the new list. */
export function addFavGame(username, entry) {
  const updated = [...getFavGames(username), entry];
  setFavGames(username, updated);
  return updated;
}

/** Remove a favorite game by its own `id` (not `gameId`). Returns the new list. */
export function removeFavGameById(username, id) {
  const updated = getFavGames(username).filter(g => g.id !== id);
  setFavGames(username, updated);
  return updated;
}

/** Remove a favorite game by the underlying `gameId` (used by the ScoreCard star toggle). Returns the new list. */
export function removeFavGameByGameId(username, gameId) {
  const updated = getFavGames(username).filter(g => g.gameId !== gameId);
  setFavGames(username, updated);
  return updated;
}

/** Read the currently logged-in username from `nova_user`, or null. */
export function getCurrentUsername() {
  try {
    const u = localStorage.getItem('nova_user');
    return u ? JSON.parse(u).username : null;
  } catch {
    return null;
  }
}
