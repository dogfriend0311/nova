/**
 * percentileService.js — computes "vs. the field" percentile rankings for a
 * player's season stats, live from the current player pool for that league.
 * Generalized across every sport in sportsConfig via each cfg's
 * leadersA / leadersB stat lists, so it works for baseball hitters/pitchers,
 * hockey skaters/goalies, football offense/defense, etc. without any
 * sport-specific code.
 */

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// The first tuple in seasonA / seasonB is always the games-played field
// for that category (season_g, season_gp, season_pg, ...).
const gamesField = (cfg, side) => (side === 'A' ? cfg.seasonA?.[0]?.[0] : cfg.seasonB?.[0]?.[0]);

// "Qualified" = played a meaningful share of the league's heaviest usage at
// that category, so a player with one cameo appearance doesn't post a
// misleading 99th-percentile single-stat spike. Falls back to "played at
// least one game" if the pool is too small for a stricter cut to make sense.
const QUALIFY_RATIO = 0.4;

export function getQualifiedPool(players, cfg, side) {
  const gField = gamesField(cfg, side);
  const withGames = (players || [])
    .map(p => ({ player: p, games: num(p[gField]) }))
    .filter(row => row.games !== null && row.games > 0);
  if (withGames.length === 0) return [];
  const maxGames = Math.max(...withGames.map(r => r.games));
  const threshold = maxGames * QUALIFY_RATIO;
  const qualified = withGames.filter(r => r.games >= threshold).map(r => r.player);
  return qualified.length > 0 ? qualified : withGames.map(r => r.player);
}

// Percentile rank of `value` within `pool` (values array), respecting
// whether a higher or lower raw number is the better outcome. Returns a
// number 0-100, or null if there's nothing to compare against.
export function percentileRank(value, pool, higherIsBetter = true) {
  const v = num(value);
  if (v === null || !pool || pool.length < 2) return null;
  const better = pool.filter(x => (higherIsBetter ? x < v : x > v)).length;
  const tied = pool.filter(x => x === v).length - 1; // exclude the player's own value
  const denom = pool.length - 1;
  if (denom <= 0) return null;
  const pct = ((better + tied * 0.5) / denom) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Computes percentile bars for one player across both of the sport's stat
 * categories (e.g. hitting/pitching). Only categories the player actually
 * has qualifying games in are returned, since a pure hitter shouldn't show
 * an (empty) pitching percentile row.
 */
export function computeVsFieldStats(player, allPlayers, cfg) {
  if (!player || !cfg) return { A: [], B: [] };
  const build = (side) => {
    const leaders = side === 'A' ? cfg.leadersA : cfg.leadersB;
    if (!leaders || leaders.length === 0) return [];
    const pool = getQualifiedPool(allPlayers, cfg, side);
    const gField = gamesField(cfg, side);
    const playerGames = num(player[gField]);
    // Player needs to have actually logged games in this category, and the
    // pool needs at least a few other qualified players to compare against.
    if (!playerGames || playerGames <= 0 || pool.length < 3) return [];
    return leaders.map(stat => {
      const values = pool
        .map(p => num(p[stat.seasonField]))
        .filter(v => v !== null);
      const value = player[stat.seasonField];
      const pct = percentileRank(value, values, stat.hi !== false);
      if (pct === null) return null;
      return {
        label: stat.label,
        value,
        fmt: stat.fmt,
        percentile: pct,
        poolSize: values.length,
      };
    }).filter(Boolean);
  };
  return { A: build('A'), B: build('B') };
}
