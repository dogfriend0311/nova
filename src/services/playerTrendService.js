/**
 * playerTrendService.js — data shaping for Player Development Arcs.
 *
 * Pure and synchronous — takes data the caller already has loaded and
 * shapes it into the { label, value }[] points DevelopmentArcChart draws.
 * Two views, per what a player's page actually has available:
 *
 *   gameLogTrend   — a stat game-by-game within the CURRENT season, from
 *                     box scores (nova_box_scores) joined against their
 *                     game's date (nova_bs_games).
 *   seasonTrend    — a stat season-over-season (the "Career Arc"), from
 *                     nova_player_season_archive rows saved each time an
 *                     owner captures a Season Archive snapshot
 *                     (see db.saveSeasonArchive / SeasonArchiveTab).
 */

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * @param {object[]} playerScores - nova_box_scores rows for one player
 * @param {object[]} bsGames - nova_bs_games rows for the league, used to
 *   date/order each box score and label points on the x-axis
 * @param {string} statField - a field name from playerScores (see
 *   sportsConfig.js boxFields for the set available per sport)
 * @returns {{label,value,date}[]} chronological, oldest first
 */
export function gameLogTrend(playerScores, bsGames, statField) {
  const gameById = new Map((bsGames || []).map((g) => [g.id, g]));
  const rows = (playerScores || [])
    .map((score) => {
      const value = toNum(score[statField]);
      if (value === null) return null;
      const game = gameById.get(score.game_id);
      return {
        value,
        date: game?.game_date || null,
        opponent: game ? (score.team === game.home_team ? game.away_team : game.home_team) : null,
        sortKey: game?.game_date ? new Date(game.game_date).getTime() : null,
      };
    })
    .filter(Boolean);

  // Games with a real date sort chronologically; anything undated keeps
  // its original (insertion) order and trails at the end.
  const dated = rows.filter((r) => r.sortKey !== null).sort((a, b) => a.sortKey - b.sortKey);
  const undated = rows.filter((r) => r.sortKey === null);
  const ordered = [...dated, ...undated];

  return ordered.map((r, i) => ({
    label: r.date ? new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Game ${i + 1}`,
    value: r.value,
    date: r.date,
    opponent: r.opponent,
  }));
}

/**
 * @param {object[]} archiveRows - nova_player_season_archive rows for
 *   one player, from db.getPlayerSeasonArchive (already chronological)
 * @param {string} statField
 * @returns {{label,value,date}[]} chronological, oldest first
 */
export function seasonTrend(archiveRows, statField) {
  return (archiveRows || [])
    .map((row) => {
      const value = toNum(row?.stats?.[statField]);
      if (value === null) return null;
      return { label: String(row.season), value, date: row.captured_at };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** One-line read on a set of points: direction + magnitude of change
 *  from the first point to the last. Returns null for <2 points. */
export function trendSummary(points) {
  if (!points || points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;
  const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : null;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return { first, last, delta, pct, direction };
}

const playerTrendService = { gameLogTrend, seasonTrend, trendSummary };

export default playerTrendService;
