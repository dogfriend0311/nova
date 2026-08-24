/**
 * beatWriterService.js — "Beat Writer" bot recap generator.
 *
 * Turns a finalized nova_games record (home_team/away_team/home_score/
 * away_score) into a short, sports-journalist-styled recap blurb, the way
 * a beat writer's live tweet after the final whistle/out/buzzer might
 * read. Pure and synchronous — no network calls — so it can run
 * client-side the instant a game is marked Final (see db.js:saveGame).
 *
 * Not every recap is meant to reach Discord: `is_featured` flags the
 * "big games" (blowouts and nailbiters) that are actually worth pinging
 * the server about, while every finalized game still gets a blurb in the
 * in-app League Wire feed (see BeatWireFeed.jsx).
 */

// Margin (in runs/goals/points) that counts as a rout or a squeaker, tuned
// per sport since a 10-point football game is a nailbiter but a 10-run
// baseball game is a blowout.
const MARGIN_BY_LEAGUE = {
  vizta:    { blowout: 6, nailbiter: 1 }, // baseball: runs
  hockey:   { blowout: 4, nailbiter: 1 }, // hockey: goals
  football: { blowout: 21, nailbiter: 3 }, // football: points
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TEMPLATES = {
  blowout: [
    (w, l, ws, ls) => `${w} put on a clinic tonight, running away with a ${ws}-${ls} rout over ${l}.`,
    (w, l, ws, ls) => `It wasn't close. ${w} steamrolled ${l} ${ws}-${ls} and never looked back.`,
    (w, l, ws, ls) => `${l} had no answers as ${w} cruised to a ${ws}-${ls} blowout.`,
    (w, l, ws, ls) => `${w} sent a message, blowing past ${l} by a final of ${ws}-${ls}.`,
  ],
  nailbiter: [
    (w, l, ws, ls) => `${w} escaped with a nerve-wracking ${ws}-${ls} win over ${l}.`,
    (w, l, ws, ls) => `Down to the wire — ${w} edged ${l} ${ws}-${ls} in a game that came down to the final possession.`,
    (w, l, ws, ls) => `${w} survived a late push from ${l}, holding on for a ${ws}-${ls} squeaker.`,
    (w, l, ws, ls) => `A one-score classic: ${w} outlasted ${l}, ${ws}-${ls}.`,
  ],
  standard: [
    (w, l, ws, ls) => `${w} took care of business, beating ${l} ${ws}-${ls}.`,
    (w, l, ws, ls) => `${w} controlled the game from start to finish in a ${ws}-${ls} win over ${l}.`,
    (w, l, ws, ls) => `${w} came out on top ${ws}-${ls} against ${l}.`,
    (w, l, ws, ls) => `${w} picked up the win, ${ws}-${ls}, over ${l}.`,
  ],
  tie: [
    (a, b, s) => `${a} and ${b} split the difference in a ${s}-${s} tie.`,
    (a, b, s) => `Nobody blinked — ${a} and ${b} finished knotted at ${s}-${s}.`,
  ],
};

const TAG_BY_KIND = {
  blowout:   '🔥 Blowout',
  nailbiter: '😱 Nail-biter',
  standard:  '📋 Final',
  tie:       '🤝 Tie',
};

export function classifyGame(league, homeScore, awayScore) {
  if (homeScore === awayScore) return 'tie';
  const margin = Math.abs(homeScore - awayScore);
  const thresholds = MARGIN_BY_LEAGUE[league] || MARGIN_BY_LEAGUE.vizta;
  if (margin >= thresholds.blowout) return 'blowout';
  if (margin <= thresholds.nailbiter) return 'nailbiter';
  return 'standard';
}

/**
 * @param {{ league: string, game: object }} args - game must have
 *   home_team, away_team, home_score, away_score (status is checked by
 *   the caller, not here).
 * @returns {{headline, body, tag, kind, is_featured}|null} null if the
 *   game doesn't have two valid final scores yet.
 */
export function generateBeatPost({ league, game }) {
  const home = (game.home_team || 'the home team').trim();
  const away = (game.away_team || 'the visitors').trim();
  const hs = Number(game.home_score);
  const as = Number(game.away_score);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;

  const kind = classifyGame(league, hs, as);

  if (kind === 'tie') {
    const body = pick(TEMPLATES.tie)(home, away, hs);
    return {
      headline: `${home} and ${away} tie, ${hs}-${as}`,
      body,
      tag: TAG_BY_KIND.tie,
      kind,
      is_featured: false,
    };
  }

  const winner = hs > as ? home : away;
  const loser = hs > as ? away : home;
  const winnerScore = Math.max(hs, as);
  const loserScore = Math.min(hs, as);
  const body = pick(TEMPLATES[kind])(winner, loser, winnerScore, loserScore);

  return {
    headline: `${winner} defeats ${loser}, ${winnerScore}-${loserScore}`,
    body,
    tag: TAG_BY_KIND[kind],
    kind,
    // "Big games" — the ones actually worth a live Discord ping — are
    // blowouts and nailbiters. Routine wins still get a blurb in the
    // in-app feed but stay quiet on Discord.
    is_featured: kind === 'blowout' || kind === 'nailbiter',
  };
}

const beatWriterService = { generateBeatPost, classifyGame };

export default beatWriterService;
