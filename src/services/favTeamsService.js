/**
 * favTeamsService.js — reads a member's real-world "Favorite Teams"
 * (set on their Nova profile via MemberProfile.jsx's TeamSelector,
 * stored as profile.fav_teams = { mlb: [abbr,...], nfl: [...], ... })
 * so Sports Hub can offer a "My Teams" quick filter on the Scores tab.
 *
 * This is intentionally separate from favoritesService.js, which covers
 * in-league (Roblox) "followed teams" — see the note at the top of that
 * file. This service is about pro-sports fandom, sourced from the same
 * fav_teams field MemberProfile already reads/writes.
 */
import db from './db';

const memCache = { profiles: null, loadedAt: 0 };
const CACHE_MS = 60000;

async function loadProfiles() {
  const now = Date.now();
  if (memCache.profiles && (now - memCache.loadedAt) < CACHE_MS) return memCache.profiles;
  try {
    const profiles = await db.getMemberProfiles();
    memCache.profiles = Array.isArray(profiles) ? profiles : [];
    memCache.loadedAt = now;
    return memCache.profiles;
  } catch {
    return memCache.profiles || [];
  }
}

/** Team abbreviations (app scheme, e.g. "TBR", "WSN") the given user has
 *  starred for a sport on their profile. Returns [] if signed out, no
 *  profile, or none picked. */
export async function getMyFavTeamAbbrs(username, sport) {
  if (!username) return [];
  const profiles = await loadProfiles();
  const me = profiles.find((p) => p.username === username);
  const picked = me?.fav_teams?.[sport];
  return Array.isArray(picked) ? picked : [];
}

// App abbreviations occasionally differ from ESPN's scoreboard abbreviations
// (mirrors the mapping teams.js already uses for CDN logo URLs).
const ESPN_ABBR = {
  mlb: { TBR: 'TB', CHW: 'CWS', KCR: 'KC', WSN: 'WSH', SDP: 'SD', SFG: 'SF' },
  nfl: {},
  nba: { NO: 'NOP', UTA: 'UTAH', WAS: 'WSH' },
  nhl: {},
  cfb: {},
  cbb: {},
};

/** Normalizes an app-scheme team abbreviation to the abbreviation ESPN's
 *  scoreboard uses for the same team, so fav_teams picks can be matched
 *  against live ESPN game data. */
export function toEspnAbbr(sport, abbr) {
  return ESPN_ABBR[sport]?.[abbr] || abbr;
}

export function clearFavTeamsCache() {
  memCache.profiles = null;
  memCache.loadedAt = 0;
}
