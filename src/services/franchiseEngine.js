/**
 * franchiseEngine.js — the core baseball simulation.
 *
 * Pure functions only (no Supabase calls here) so this can be tested,
 * reused for instant "fast sim" results AND later for an animated
 * play-by-play "watch mode" from the exact same play_by_play log.
 *
 * Rating scale: 20-80 "scouting scale" (50 = league average), same
 * convention real scouts and OOTP use.
 */

// ─────────────────────────────────────────────────────────────
//  Name generation (fictional players — no real-person likeness)
// ─────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Jake','Marcus','Tyler','Diego','Malik','Connor','Ethan','Jordan','Xavier','Blake',
  'Cameron','Devon','Elias','Felix','Gavin','Hunter','Isaiah','Julian','Kai','Landon',
  'Mason','Nolan','Owen','Preston','Quentin','Riley','Sawyer','Trevor','Vince','Wyatt',
  'Aaron','Bryce','Caleb','Dante','Emilio','Grant','Henry','Ivan','Jax','Kyle',
  'Logan','Miles','Nathan','Oscar','Parker','Reid','Silas','Theo','Victor','Zane',
];
const LAST_NAMES = [
  'Anderson','Brooks','Carter','Delgado','Ellis','Fischer','Garrett','Hayes','Ibarra','Jennings',
  'Kowalski','Lambert','Mercer','Navarro','O\'Brien','Pierce','Quintana','Ramsey','Sullivan','Torres',
  'Underwood','Vaughn','Walsh','Yates','Zimmerman','Adams','Bishop','Castillo','Dawson','Emerson',
  'Foster','Griffin','Holloway','Irving','Jacobs','Keller','Larsen','Monroe','Nolan','Ortega',
  'Patton','Quinlan','Reeves','Sawyer','Tucker','Valdez','Ward','Cross','Hunt','Lane',
];
const CITIES = [
  'Austin','Denver','Portland','Nashville','Columbus','Sacramento','Milwaukee','Raleigh',
  'Tucson','Omaha','Richmond','Spokane','Providence','Tulsa','Boise','Madison',
  'Savannah','Reno','Akron','Biloxi','Fresno','Charleston','Toledo','Wichita',
  'Albany','Knoxville','Chattanooga','Shreveport','Anchorage','Honolulu','Duluth','Amarillo',
];
const LEAGUES = ['American', 'National'];
const DIVISIONS = ['East', 'West', 'North', 'South'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
// 20-80 scale, roughly normal around 50
function ratingRoll(mean = 50, spread = 15) {
  const v = mean + (Math.random() + Math.random() + Math.random() - 1.5) * spread;
  return clamp(Math.round(v / 5) * 5, 20, 80);
}

function genName() { return { first: pick(FIRST_NAMES), last: pick(LAST_NAMES) }; }

// ─────────────────────────────────────────────────────────────
//  Player generation
// ─────────────────────────────────────────────────────────────
const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

function genHitter(level, position) {
  const { first, last } = genName();
  const levelMean = { MLB: 50, AAA: 42, AA: 36, A: 30 }[level] || 40;
  const ageRange  = { MLB: [22, 38], AAA: [21, 30], AA: [19, 27], A: [18, 24] }[level] || [20, 28];
  return {
    first_name: first, last_name: last,
    age: rand(...ageRange),
    position,
    bats: pick(['L', 'R', 'R', 'R', 'S']),
    throws: pick(['L', 'R', 'R', 'R', 'R']),
    is_pitcher: false,
    contact:  ratingRoll(levelMean),
    power:    ratingRoll(levelMean),
    eye:      ratingRoll(levelMean),
    speed:    ratingRoll(levelMean),
    fielding: ratingRoll(levelMean),
    arm:      ratingRoll(levelMean),
    salary: level === 'MLB' ? rand(500000, 8000000) : 15000,
    contract_years_remaining: rand(1, 4),
    level,
  };
}

function genPitcher(level, position) {
  const { first, last } = genName();
  const levelMean = { MLB: 50, AAA: 42, AA: 36, A: 30 }[level] || 40;
  const ageRange  = { MLB: [22, 38], AAA: [21, 30], AA: [19, 27], A: [18, 24] }[level] || [20, 28];
  return {
    first_name: first, last_name: last,
    age: rand(...ageRange),
    position,
    bats: pick(['L', 'R']),
    throws: pick(['L', 'R', 'R', 'R']),
    is_pitcher: true,
    stuff:    ratingRoll(levelMean),
    control:  ratingRoll(levelMean),
    movement: ratingRoll(levelMean),
    stamina:  ratingRoll(levelMean),
    salary: level === 'MLB' ? rand(500000, 8000000) : 15000,
    contract_years_remaining: rand(1, 4),
    level,
  };
}

// One level's worth of a roster: ~13 position players + ~12 pitchers (25-man style)
function genRosterForLevel(level) {
  const players = [];
  HITTER_POSITIONS.forEach(pos => players.push(genHitter(level, pos)));
  // bench: extra C/IF/OF
  players.push(genHitter(level, pick(['C', '2B', '3B', 'SS'])));
  players.push(genHitter(level, pick(['LF', 'CF', 'RF'])));
  players.push(genHitter(level, pick(['1B', '3B'])));
  players.push(genHitter(level, pick(['2B', 'SS'])));
  // rotation (5 SP) + bullpen (7 RP)
  for (let i = 0; i < 5; i++) players.push(genPitcher(level, 'SP'));
  for (let i = 0; i < 7; i++) players.push(genPitcher(level, 'RP'));
  return players;
}

/** Generates all 32 teams + full 4-level rosters. Returns plain objects
 *  ready to insert (no franchise_instance_id/team_id — the DB layer
 *  attaches those after insert). */
export function generateLeague() {
  const cities = [...CITIES].sort(() => Math.random() - 0.5).slice(0, 32);
  const teams = [];
  for (let i = 0; i < 32; i++) {
    teams.push({
      name: `Team ${i + 1}`,
      city: cities[i],
      abbreviation: `T${i + 1}`,
      league: LEAGUES[Math.floor(i / 16)],
      division: DIVISIONS[Math.floor(i / 4) % 4],
      primary_color: '#5e81f4',
      secondary_color: '#1a1a2e',
      budget_cap: rand(120, 180) * 1000000,
      budget_used: 0,
      wins: 0,
      losses: 0,
      _rosters: {
        MLB: genRosterForLevel('MLB'),
        AAA: genRosterForLevel('AAA'),
        AA:  genRosterForLevel('AA'),
        A:   genRosterForLevel('A'),
      },
    });
  }
  return teams;
}

/** Round-robin schedule across all teams for `totalDays` games each. */
export function generateSchedule(teamIds, totalDays = 162) {
  const games = []; // { day, home, away }
  let day = 1;
  // Simple repeating round-robin: pair teams randomly each day, avoiding
  // a team playing itself; not a perfectly balanced MLB schedule, but a
  // functional one for simulation purposes.
  while (day <= totalDays) {
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      games.push({ day, home: shuffled[i], away: shuffled[i + 1] });
    }
    day++;
  }
  return games;
}

// ─────────────────────────────────────────────────────────────
//  At-bat resolution — statistical model off ratings
// ─────────────────────────────────────────────────────────────
// Returns one of: 'K','BB','HBP','1B','2B','3B','HR','OUT'
function resolveAtBat(batter, pitcher) {
  const contact = batter.contact ?? 50, power = batter.power ?? 50, eye = batter.eye ?? 50;
  const stuff = pitcher.stuff ?? 50, control = pitcher.control ?? 50, movement = pitcher.movement ?? 50;

  // K chance: pitcher stuff/movement vs batter contact
  const kChance = clamp(0.14 + (stuff + movement - contact * 1.3) / 600, 0.04, 0.40);
  // BB chance: batter eye vs pitcher control
  const bbChance = clamp(0.08 + (eye - control) / 500, 0.02, 0.18);
  // HBP: small flat chance
  const hbpChance = 0.008;

  const roll = Math.random();
  if (roll < kChance) return 'K';
  if (roll < kChance + bbChance) return 'BB';
  if (roll < kChance + bbChance + hbpChance) return 'HBP';

  // Ball in play — determine hit vs out, then hit type
  const contactQuality = clamp((contact - stuff / 2) / 100, -0.3, 0.4);
  const hitChance = clamp(0.29 + contactQuality, 0.18, 0.42); // ~BABIP-ish + K/BB removed
  if (Math.random() > hitChance) return 'OUT';

  // Hit type driven by power
  const hr = clamp((power - 50) / 260, 0.01, 0.14);
  const triple = 0.006;
  const double = clamp(0.14 + (power - 50) / 400, 0.08, 0.22);
  const r2 = Math.random();
  if (r2 < hr) return 'HR';
  if (r2 < hr + triple) return '3B';
  if (r2 < hr + triple + double) return '2B';
  return '1B';
}

function advanceRunners(bases, outcome, batterId, speed = 50) {
  // bases = [first, second, third] each holds a player id or null
  const scored = [];
  const b = [...bases];
  const speedBoost = speed > 60 ? 1 : 0;

  if (outcome === 'BB' || outcome === 'HBP') {
    if (b[0] && b[1] && b[2]) scored.push(b[2]); // bases loaded walk forces a run
    if (b[0] && b[1]) b[2] = b[1];
    if (b[0]) b[1] = b[0];
    b[0] = batterId;
  } else if (outcome === '1B') {
    if (b[2]) scored.push(b[2]);
    let third = null;
    if (b[1]) { if (Math.random() < 0.6 + speedBoost * 0.15) scored.push(b[1]); else third = b[1]; }
    b[2] = third;
    b[1] = b[0] || null;
    b[0] = batterId;
  } else if (outcome === '2B') {
    if (b[2]) scored.push(b[2]);
    if (b[1]) scored.push(b[1]);
    let third = null;
    if (b[0]) { if (Math.random() < 0.45 + speedBoost * 0.2) scored.push(b[0]); else third = b[0]; }
    b[2] = third;
    b[1] = batterId;
    b[0] = null;
  } else if (outcome === '3B') {
    if (b[2]) scored.push(b[2]);
    if (b[1]) scored.push(b[1]);
    if (b[0]) scored.push(b[0]);
    b[2] = batterId; b[1] = null; b[0] = null;
  } else if (outcome === 'HR') {
    if (b[0]) scored.push(b[0]);
    if (b[1]) scored.push(b[1]);
    if (b[2]) scored.push(b[2]);
    scored.push(batterId);
    return { bases: [null, null, null], scored };
  }
  return { bases: b, scored };
}

/** Simulates a full 9-inning game between two rosters (MLB-level arrays
 *  of player objects with an `id`). Returns { homeScore, awayScore,
 *  playByPlay, boxScore } — boxScore keyed by player id. */
export function simulateGame(homeRoster, awayRoster) {
  const homeLineup = homeRoster.filter(p => !p.is_pitcher).slice(0, 9);
  const awayLineup = awayRoster.filter(p => !p.is_pitcher).slice(0, 9);
  const homePitcher = homeRoster.find(p => p.is_pitcher && p.position === 'SP') || homeRoster.find(p => p.is_pitcher);
  const awayPitcher = awayRoster.find(p => p.is_pitcher && p.position === 'SP') || awayRoster.find(p => p.is_pitcher);

  const box = {}; // playerId -> stat line
  const ensure = (p) => {
    if (!box[p.id]) {
      box[p.id] = p.is_pitcher
        ? { name: `${p.first_name} ${p.last_name}`, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, hbp: 0, so: 0, rbi: 0, runs: 0, outs_recorded: 0, hits_allowed: 0, er: 0, bb_allowed: 0, k: 0, hr_allowed: 0 }
        : { name: `${p.first_name} ${p.last_name}`, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, hbp: 0, so: 0, rbi: 0, runs: 0 };
    }
    return box[p.id];
  };

  const playByPlay = [];
  let homeScore = 0, awayScore = 0;

  for (let inning = 1; inning <= 9; inning++) {
    for (const half of ['top', 'bottom']) {
      const battingLineup = half === 'top' ? awayLineup : homeLineup;
      const pitcher = half === 'top' ? homePitcher : awayPitcher;
      let outs = 0, bases = [null, null, null], batterIdx = 0;
      while (outs < 3 && battingLineup.length) {
        const batter = battingLineup[batterIdx % battingLineup.length];
        batterIdx++;
        const outcome = resolveAtBat(batter, pitcher || {});
        const bLine = ensure(batter);
        const pLine = pitcher ? ensure(pitcher) : null;

        if (outcome === 'K') {
          outs++; bLine.ab++; bLine.so++;
          if (pLine) { pLine.k++; pLine.outs_recorded++; }
        } else if (outcome === 'OUT') {
          outs++; bLine.ab++;
          if (pLine) pLine.outs_recorded++;
        } else if (outcome === 'BB' || outcome === 'HBP') {
          if (outcome === 'BB') bLine.bb++; else bLine.hbp++;
          if (pLine && outcome === 'BB') pLine.bb_allowed++;
          const res = advanceRunners(bases, outcome, batter.id, batter.speed);
          bases = res.bases;
          if (res.scored.length) {
            bLine.rbi += res.scored.length;
            if (pLine) pLine.er += res.scored.length;
            res.scored.forEach(pid => { const line = box[pid]; if (line) line.runs++; });
            if (half === 'top') awayScore += res.scored.length; else homeScore += res.scored.length;
          }
        } else {
          // hit
          bLine.ab++; bLine.h++;
          if (outcome === '2B') bLine.doubles++;
          if (outcome === '3B') bLine.triples++;
          if (outcome === 'HR') bLine.hr++;
          if (pLine) { pLine.hits_allowed++; if (outcome === 'HR') pLine.hr_allowed++; }
          const res = advanceRunners(bases, outcome, batter.id, batter.speed);
          bases = res.bases;
          if (res.scored.length) {
            bLine.rbi += res.scored.length;
            if (pLine) pLine.er += res.scored.length;
            res.scored.forEach(pid => { const line = box[pid]; if (line) line.runs++; });
            if (half === 'top') awayScore += res.scored.length; else homeScore += res.scored.length;
          }
        }
        playByPlay.push({ inning, half, batter: `${batter.first_name} ${batter.last_name}`, outcome });
      }
    }
  }

  return {
    homeScore, awayScore, playByPlay, boxScore: box,
    homePitcherId: homePitcher?.id, awayPitcherId: awayPitcher?.id,
  };
}

// ─────────────────────────────────────────────────────────────
//  Advanced stats — computed from raw counting stats, never stored
// ─────────────────────────────────────────────────────────────
export function battingAvg(h, ab) { return ab > 0 ? h / ab : 0; }
export function obp(h, bb, hbp, ab, sf = 0) {
  const denom = ab + bb + hbp + sf;
  return denom > 0 ? (h + bb + hbp) / denom : 0;
}
export function slg(h, doubles, triples, hr, ab) {
  const singles = h - doubles - triples - hr;
  const totalBases = singles + doubles * 2 + triples * 3 + hr * 4;
  return ab > 0 ? totalBases / ab : 0;
}
export function ops(h, bb, hbp, doubles, triples, hr, ab, sf = 0) {
  return obp(h, bb, hbp, ab, sf) + slg(h, doubles, triples, hr, ab);
}
export function era(er, outsRecorded) {
  const ip = outsRecorded / 3;
  return ip > 0 ? (er * 9) / ip : 0;
}
export function whip(bbAllowed, hitsAllowed, outsRecorded) {
  const ip = outsRecorded / 3;
  return ip > 0 ? (bbAllowed + hitsAllowed) / ip : 0;
}
export function k9(k, outsRecorded) {
  const ip = outsRecorded / 3;
  return ip > 0 ? (k * 9) / ip : 0;
}
export function bb9(bbAllowed, outsRecorded) {
  const ip = outsRecorded / 3;
  return ip > 0 ? (bbAllowed * 9) / ip : 0;
}
// FIP constant ~3.10 is a reasonable fixed placeholder until we can
// calibrate one off a full simulated season's league-wide stats.
export function fip(hrAllowed, bbAllowed, k, outsRecorded, constant = 3.10) {
  const ip = outsRecorded / 3;
  return ip > 0 ? ((13 * hrAllowed + 3 * bbAllowed - 2 * k) / ip) + constant : constant;
}

/** Simplified WAR — calibrated directly off this league's own simulated
 *  stats (not real-world constants), since we generated the whole
 *  league ourselves. ~10 runs per win is the standard sabermetric rule
 *  of thumb; batting runs use a linear-weights approximation off
 *  OBP/SLG vs league average, pitching runs use ERA vs league average. */
export function simplifiedBattingWAR(playerStats, leagueAvgOBP, leagueAvgSLG, runsPerWin = 10) {
  const { h, bb, hbp, doubles, triples, hr, ab } = playerStats;
  const pObp = obp(h, bb, hbp, ab);
  const pSlg = slg(h, doubles, triples, hr, ab);
  const pa = ab + bb + hbp;
  const runsAboveAvg = ((pObp - leagueAvgOBP) * 1.8 + (pSlg - leagueAvgSLG) * 1.0) * pa;
  return runsAboveAvg / runsPerWin;
}
export function simplifiedPitchingWAR(playerStats, leagueAvgERA, runsPerWin = 10) {
  const { er, outs_recorded } = playerStats;
  const ip = outs_recorded / 3;
  const pERA = era(er, outs_recorded);
  const runsSaved = ((leagueAvgERA - pERA) / 9) * ip;
  return runsSaved / runsPerWin;
}
