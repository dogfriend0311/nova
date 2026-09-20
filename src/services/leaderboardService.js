/**
 * leaderboardService.js — one place to answer "where does this member
 * rank?" across every leaderboard Nova already tracks:
 *
 *   - Overall Nova rank  — reputation XP (nova_user_stats), site-wide
 *   - Prediction rank    — pick'ems all-time record, site-wide
 *   - Fantasy rank       — fantasy all-time win record, site-wide
 *   - League rank        — power ranking of the member's followed
 *                           Roblox league team, within that league
 *
 * Each already has its own sorted "all-time leaderboard" query
 * somewhere in the app (getAllUserStats, pickemsDb, fantasyDb,
 * powerRankingsService) — this module just runs all four in parallel,
 * finds the member's row in each, and returns a uniform
 * { rank, total, ...meta } | null shape so a single widget can render
 * all four without knowing the underlying data source.
 */
import db from './db';
import pickemsDb from './pickemsDb';
import fantasyDb from './fantasyDb';
import { getFollowedTeams } from './favoritesService';
import { computePowerRankings } from './powerRankingsService';

// The one Roblox baseball sim league this app tracks games/teams for
// (branded NABB/RBML in-game; keyed 'vizta' in the data layer — see
// data/sportsConfig.js). League rank is computed against this league's
// franchise standings, not the real-world Sports Hub.
const SIM_LEAGUE = 'vizta';

async function overallRank(username) {
  const all = await db.getAllUserStats().catch(() => []);
  const rows = (all || []).filter(r => r && r.username);
  if (!rows.some(r => r.username === username)) return null;
  const sorted = [...rows].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const idx = sorted.findIndex(r => r.username === username);
  if (idx < 0) return null;
  return { rank: idx + 1, total: sorted.length, xp: sorted[idx].xp || 0 };
}

async function predictionRank(username) {
  const rows = await pickemsDb.getAllTimeLeaderboard().catch(() => []);
  const idx = (rows || []).findIndex(r => r.username === username);
  if (idx < 0) return null;
  const row = rows[idx];
  if (!row.total_picks) return null;
  return { rank: idx + 1, total: rows.length, correctPicks: row.correct_picks, totalPicks: row.total_picks };
}

async function fantasyRank(username) {
  const rows = await fantasyDb.getAllTimeLeaderboard().catch(() => []);
  const idx = (rows || []).findIndex(r => r.username === username);
  if (idx < 0) return null;
  const row = rows[idx];
  if (!row.wins && !row.losses && !row.ties) return null;
  return { rank: idx + 1, total: rows.length, wins: row.wins, losses: row.losses };
}

async function leagueRank(username) {
  const followed = await getFollowedTeams(username, SIM_LEAGUE).catch(() => []);
  if (!followed || followed.length === 0) return null;
  const [teams, games] = await Promise.all([
    db.getTeams(SIM_LEAGUE).catch(() => []),
    db.getGames(SIM_LEAGUE).catch(() => []),
  ]);
  const { rankings } = computePowerRankings({ teams: teams || [], games: games || [] });
  if (!rankings.length) return null;
  const followedNames = new Set(followed.map(f => f.team_name));
  const mine = rankings.filter(r => followedNames.has(r.team_name));
  if (!mine.length) return null;
  const best = mine.reduce((a, b) => (a.rank <= b.rank ? a : b));
  return { rank: best.rank, total: rankings.length, teamName: best.team_name };
}

/** Every rank for one member, fetched in parallel. Any category with no
 *  data for this member (never played pick'ems, doesn't follow a team,
 *  etc.) comes back null so the widget can skip it. */
export async function getMemberRanks(username) {
  if (!username) return { overall: null, prediction: null, fantasy: null, league: null };
  const [overall, prediction, fantasy, league] = await Promise.all([
    overallRank(username).catch(() => null),
    predictionRank(username).catch(() => null),
    fantasyRank(username).catch(() => null),
    leagueRank(username).catch(() => null),
  ]);
  return { overall, prediction, fantasy, league };
}

const leaderboardService = { getMemberRanks };
export default leaderboardService;
