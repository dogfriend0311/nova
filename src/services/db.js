// ── Paste these into your existing src/services/db.js ──────────────
// These follow the same request shape your app already sends to
// api/query.js (table/action/columns/filters/values/onConflict).
// If your db.js wraps things differently (e.g. a `query()` helper you
// already call), adjust the outer function signatures to match —
// the request body shape below is what api/query.js expects either way.

async function callQuery(body) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json(); // { data, error }
}

// ── Favorite teams ───────────────────────────────────────────────
export async function getFavoriteTeams(username) {
  return callQuery({
    table: 'favorite_teams',
    action: 'select',
    filters: [{ column: 'member_username', op: 'eq', value: username }],
  });
}

export async function addFavoriteTeam(username, league, teamId, teamName) {
  return callQuery({
    table: 'favorite_teams',
    action: 'insert',
    values: { member_username: username, league, team_id: teamId, team_name: teamName },
  });
}

export async function removeFavoriteTeam(id) {
  return callQuery({
    table: 'favorite_teams',
    action: 'delete',
    filters: [{ column: 'id', op: 'eq', value: id }],
  });
}

// ── Now playing ──────────────────────────────────────────────────
export async function setNowPlaying(username, trackTitle, artist, source) {
  return callQuery({
    table: 'now_playing',
    action: 'upsert',
    onConflict: 'member_username',
    values: {
      member_username: username,
      track_title: trackTitle,
      artist,
      source,
      updated_at: new Date().toISOString(),
    },
  });
}

export async function getNowPlaying(username) {
  return callQuery({
    table: 'now_playing',
    action: 'select',
    filters: [{ column: 'member_username', op: 'eq', value: username }],
    maybeSingle: true,
  });
}

// ── XP / achievements ─────────────────────────────────────────────
export async function getMemberXp(username) {
  return callQuery({
    table: 'member_xp',
    action: 'select',
    filters: [{ column: 'member_username', op: 'eq', value: username }],
    maybeSingle: true,
  });
}

export async function addXp(username, amount, newLevel) {
  return callQuery({
    table: 'member_xp',
    action: 'upsert',
    onConflict: 'member_username',
    values: {
      member_username: username,
      xp: amount,
      level: newLevel,
      updated_at: new Date().toISOString(),
    },
  });
}

export async function getMemberAchievements(username) {
  return callQuery({
    table: 'member_achievements',
    action: 'select',
    filters: [{ column: 'member_username', op: 'eq', value: username }],
  });
}

export async function grantAchievement(username, code) {
  return callQuery({
    table: 'member_achievements',
    action: 'insert',
    values: { member_username: username, achievement_code: code },
  });
}

// ── Roblox badges ────────────────────────────────────────────────
export async function saveRobloxBadges(username, badges) {
  // badges: [{ badge_id, name, icon_url, awarded_at }, ...]
  const rows = badges.map((b) => ({ member_username: username, ...b }));
  return callQuery({
    table: 'roblox_badges',
    action: 'upsert',
    onConflict: 'member_username,badge_id',
    values: rows,
  });
}

export async function getRobloxBadges(username) {
  return callQuery({
    table: 'roblox_badges',
    action: 'select',
    filters: [{ column: 'member_username', op: 'eq', value: username }],
  });
}
