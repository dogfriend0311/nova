/**
 * powerRankingsService.js — algorithm-generated 1–N power rankings.
 *
 * Pure and synchronous, like beatWriterService.js — no network calls, so
 * it can run entirely client-side against whatever games/teams data the
 * caller already has loaded (see PowerRankingsTab in LeagueFeatures.jsx).
 *
 * Weeks come from the `week` number an admin sets on a game when it's
 * scheduled/edited (see LeagueGamesTab in OwnerDashboard.jsx) — there's
 * no calendar-based week here, only whatever the admin assigned.
 *
 * Ranking formula (0–1 composite score, higher is better):
 *   55% win rate (ties count as half a win), through the selected week
 *   25% form over the team's last 3 games (falls back to season win
 *       rate for teams with fewer than 3 games played)
 *   20% average scoring margin, clamped to +/-10 and normalized to 0–1
 * Ties break on win rate, then average margin, then team name.
 */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Final games that have a valid numeric week, sorted chronologically
 *  (by week, then by game_date/created_at as a tiebreak within a week). */
function finalWeeklyGames(games) {
  return (games || [])
    .filter((g) => g && g.status === 'final' && toNum(g.week) !== null)
    .map((g) => ({ ...g, week: toNum(g.week) }))
    .sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      const ad = a.game_date ? new Date(a.game_date).getTime() : 0;
      const bd = b.game_date ? new Date(b.game_date).getTime() : 0;
      return ad - bd;
    });
}

/** Cumulative record + composite score for every team that has played
 *  at least one final, weeked game with week <= uptoWeek. */
function rankTeamsThroughWeek(games, uptoWeek) {
  const relevant = finalWeeklyGames(games).filter((g) => g.week <= uptoWeek);
  const records = new Map(); // team_name -> { wins, losses, ties, pf, pa, results: [] }

  const ensure = (name) => {
    if (!records.has(name)) records.set(name, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, results: [] });
    return records.get(name);
  };

  relevant.forEach((g) => {
    const hs = toNum(g.home_score);
    const as = toNum(g.away_score);
    if (hs === null || as === null || !g.home_team || !g.away_team) return;
    const home = ensure(g.home_team);
    const away = ensure(g.away_team);
    home.pf += hs; home.pa += as;
    away.pf += as; away.pa += hs;
    if (hs === as) {
      home.ties += 1; away.ties += 1;
      home.results.push('T'); away.results.push('T');
    } else if (hs > as) {
      home.wins += 1; away.losses += 1;
      home.results.push('W'); away.results.push('L');
    } else {
      away.wins += 1; home.losses += 1;
      away.results.push('W'); home.results.push('L');
    }
  });

  const rows = [...records.entries()].map(([team_name, r]) => {
    const gamesPlayed = r.wins + r.losses + r.ties;
    const winPct = gamesPlayed ? (r.wins + r.ties * 0.5) / gamesPlayed : 0;
    const avgMargin = gamesPlayed ? (r.pf - r.pa) / gamesPlayed : 0;
    const last3 = r.results.slice(-3);
    const formPct = last3.length
      ? (last3.filter((x) => x === 'W').length + last3.filter((x) => x === 'T').length * 0.5) / last3.length
      : winPct;
    const marginScore = (clamp(avgMargin / 10, -1, 1) + 1) / 2;
    const score = winPct * 0.55 + formPct * 0.25 + marginScore * 0.20;
    return {
      team_name, wins: r.wins, losses: r.losses, ties: r.ties, gamesPlayed,
      pointsFor: r.pf, pointsAgainst: r.pa, avgMargin, winPct, score,
    };
  });

  rows.sort((a, b) => (
    b.score - a.score ||
    b.winPct - a.winPct ||
    b.avgMargin - a.avgMargin ||
    a.team_name.localeCompare(b.team_name)
  ));

  rows.forEach((row, i) => { row.rank = i + 1; });
  return rows;
}

/**
 * @param {{ teams: object[], games: object[], week?: number }} args
 *   `week` optionally pins the ranking to a specific week (for a
 *   week-picker); defaults to the most recent week with final games.
 * @returns {{
 *   weeks: number[],
 *   currentWeek: number|null,
 *   previousWeek: number|null,
 *   rankings: object[],
 * }} rankings is empty (and currentWeek null) until games have both a
 *   'final' status and a week number set.
 */
export function computePowerRankings({ teams = [], games = [], week } = {}) {
  const weeks = [...new Set(finalWeeklyGames(games).map((g) => g.week))].sort((a, b) => a - b);
  if (weeks.length === 0) return { weeks, currentWeek: null, previousWeek: null, rankings: [] };

  const currentWeek = weeks.includes(week) ? week : weeks[weeks.length - 1];
  const priorWeeks = weeks.filter((w) => w < currentWeek);
  const previousWeek = priorWeeks.length ? priorWeeks[priorWeeks.length - 1] : null;

  const current = rankTeamsThroughWeek(games, currentWeek);
  const prevRankByTeam = previousWeek !== null
    ? new Map(rankTeamsThroughWeek(games, previousWeek).map((r) => [r.team_name, r.rank]))
    : new Map();

  const teamMeta = new Map((teams || []).map((t) => [t.team_name, t]));

  const rankings = current.map((row) => {
    const prevRank = prevRankByTeam.has(row.team_name) ? prevRankByTeam.get(row.team_name) : null;
    const meta = teamMeta.get(row.team_name);
    return {
      ...row,
      prevRank,
      movement: prevRank !== null ? prevRank - row.rank : null, // +up / -down / 0 same / null new
      logo_url: meta?.logo_url || null,
      team_color: meta?.team_color || null,
      id: meta?.id || row.team_name,
    };
  });

  return { weeks, currentWeek, previousWeek, rankings };
}

const powerRankingsService = { computePowerRankings };

export default powerRankingsService;
