/**
 * playerInsightsService.js — data shaping for "Nova Player Cards 2.0".
 *
 * Pure and synchronous, same pattern as playerTrendService/percentileService:
 * takes data the caller already has loaded and shapes it for the UI. Nothing
 * here talks to Supabase/localStorage directly.
 */

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * A "dynamic" overall rating — the stored `overall` nudged a few points by
 * how hot or cold the player has been lately, instead of a single frozen
 * number. Compares the first half of the supplied recent-form points
 * against the second half; a real swing in form moves the rating a little,
 * capped so it never strays far from the stored base rating.
 *
 * @param {number|string} baseOverall
 * @param {{label, value}[]} recentPoints - chronological, oldest first
 *   (e.g. gameLogTrend() output for a representative counting stat)
 */
export function computeDynamicRating(baseOverall, recentPoints) {
  const base = num(baseOverall) || 0;
  if (!recentPoints || recentPoints.length < 4) {
    return { rating: Math.round(base), delta: 0, trend: 'steady', base: Math.round(base) };
  }
  const half = Math.floor(recentPoints.length / 2);
  const olderAvg = recentPoints.slice(0, half).reduce((s, p) => s + p.value, 0) / half;
  const recentAvg = recentPoints.slice(half).reduce((s, p) => s + p.value, 0) / (recentPoints.length - half);

  let pctChange;
  if (olderAvg !== 0) pctChange = (recentAvg - olderAvg) / Math.abs(olderAvg);
  else pctChange = recentAvg > 0 ? 1 : 0;

  // Scale a big swing in recent form to a modest rating nudge (+/-4 max)
  // so "dynamic" never means "unrecognizable from the base rating".
  const delta = Math.max(-4, Math.min(4, Math.round(pctChange * 10)));
  const rating = Math.max(40, Math.min(99, Math.round(base) + delta));
  const trend = delta > 1 ? 'hot' : delta < -1 ? 'cold' : 'steady';
  return { rating, delta, trend, base: Math.round(base) };
}

/**
 * Team stops derived from season-archive snapshots (each snapshot's stats
 * blob carries whatever fields were captured at the time, including team
 * if it was on the player record then). Falls back to a single "Current"
 * stop when there's no archive history yet or no team changes are visible.
 *
 * @param {object[]} seasonArchiveRows - chronological (oldest first), from
 *   db.getPlayerSeasonArchive
 * @param {string} currentTeam
 */
export function buildTeamHistory(seasonArchiveRows, currentTeam) {
  const stops = [];
  let lastTeam = null;
  (seasonArchiveRows || []).forEach((row) => {
    const team = row?.stats?.team || row?.stats?.team_name || null;
    if (team && team !== lastTeam) {
      stops.push({ team, season: row.season, captured_at: row.captured_at });
      lastTeam = team;
    }
  });
  if (currentTeam && lastTeam !== currentTeam) {
    stops.push({ team: currentTeam, season: 'Current', captured_at: null });
  }
  if (stops.length === 0 && currentTeam) {
    stops.push({ team: currentTeam, season: 'Current', captured_at: null });
  }
  return stops;
}

/**
 * Per-opponent performance splits, aggregated from game-log points that
 * carry an `opponent` field (see playerTrendService.gameLogTrend).
 *
 * @param {{label, value, opponent}[]} gameLogPoints
 * @returns {{opponent, games, total, avg}[]} sorted by most games played
 */
export function buildHeadToHead(gameLogPoints) {
  const byOpp = new Map();
  (gameLogPoints || []).forEach((p) => {
    if (!p.opponent) return;
    if (!byOpp.has(p.opponent)) byOpp.set(p.opponent, { opponent: p.opponent, games: 0, total: 0 });
    const row = byOpp.get(p.opponent);
    row.games += 1;
    row.total += p.value;
  });
  return Array.from(byOpp.values())
    .map((r) => ({ ...r, avg: r.total / r.games }))
    .sort((a, b) => b.games - a.games);
}

/**
 * Nearest-neighbor "comparable players" — players whose season stat
 * profile sits closest to this player's, normalized (min-max) across the
 * league pool so stats on wildly different scales (AVG vs HR) contribute
 * comparably to the distance. Generalized via cfg.leadersA/leadersB so it
 * works for every sport in sportsConfig.
 *
 * @param {object} player
 * @param {object[]} allPlayers - the league's full player pool
 * @param {object} cfg - sportsConfig entry for this league
 * @param {number} limit
 * @returns {{player, similarity}[]} similarity is 0-100, highest first
 */
export function findComparablePlayers(player, allPlayers, cfg, limit = 5) {
  if (!player || !allPlayers?.length || !cfg) return [];
  const fields = [...(cfg.leadersA || []), ...(cfg.leadersB || [])].map((l) => l.seasonField);
  const activeFields = [...new Set(fields)].filter((f) => num(player[f]) !== null);
  if (activeFields.length < 2) return [];

  const ranges = {};
  activeFields.forEach((f) => {
    const vals = allPlayers.map((p) => num(p[f])).filter((v) => v !== null);
    ranges[f] = { min: Math.min(...vals), max: Math.max(...vals) };
  });
  const norm = (v, f) => {
    const { min, max } = ranges[f];
    return max === min ? 0.5 : (v - min) / (max - min);
  };

  return allPlayers
    .filter((p) => String(p.id) !== String(player.id))
    .map((p) => {
      let sumSq = 0;
      let used = 0;
      activeFields.forEach((f) => {
        const pv = num(p[f]);
        if (pv === null) return;
        const d = norm(num(player[f]), f) - norm(pv, f);
        sumSq += d * d;
        used += 1;
      });
      if (used < 2) return null;
      // Players missing some fields get their distance scaled up a bit so
      // a thin stat line doesn't look artificially "close" to everyone.
      const distance = Math.sqrt(sumSq / used) * (activeFields.length / used);
      return { player: p, distance };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ player: p, distance }) => ({ player: p, similarity: Math.max(0, Math.round((1 - distance) * 100)) }));
}

const playerInsightsService = { computeDynamicRating, buildTeamHistory, buildHeadToHead, findComparablePlayers };
export default playerInsightsService;
