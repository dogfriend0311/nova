// ══════════════════════════════════════════════════════════════
// Diamond League — simulation engine (v1 / placeholder)
// A lightweight, rating-driven at-bat resolver. Not a physics sim —
// just enough signal (contact vs. stuff, power vs. movement, eye vs.
// control) to make ratings matter and produce a believable box score
// and play-by-play log. This is the seam to deepen later.
// ══════════════════════════════════════════════════════════════

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function rand() { return Math.random(); }

function battingOrder(roster) {
  return roster.filter(p => !p.isPitcher).slice(0, 9);
}
function startingPitcher(roster) {
  return roster.find(p => p.isPitcher && p.position === 'SP') || roster.find(p => p.isPitcher) || roster[0];
}
function bullpen(roster) {
  return roster.filter(p => p.isPitcher && p.position !== 'SP');
}

// Resolve one plate appearance. Returns an outcome code + description.
function resolveAtBat(batter, pitcher, fatigue = 0) {
  const b = batter.ratings, p = pitcher.ratings;
  const stuffEff = p.stuff * (1 - fatigue * 0.35);
  const controlEff = p.control * (1 - fatigue * 0.25);

  let kChance = 0.20 + (stuffEff - b.contact) / 380 + (b.eye - 50) / -600;
  let bbChance = 0.085 + (b.eye - controlEff) / 420;
  let hrChance = 0.028 + (b.power - stuffEff) / 480;
  kChance = clamp(kChance, 0.06, 0.42);
  bbChance = clamp(bbChance, 0.02, 0.20);
  hrChance = clamp(hrChance, 0.005, 0.10);

  const hbpChance = 0.008;
  const inPlayChance = clamp(1 - kChance - bbChance - hrChance - hbpChance, 0.25, 0.75);

  // BABIP-ish split of in-play chance into out / 1B / 2B / 3B
  const babip = clamp(0.30 + (b.contact - pitcher.ratings.movement) / 700 - (b.contact < 40 ? 0.02 : 0), 0.18, 0.40);
  const hitOnInPlay = inPlayChance * babip;
  const outOnInPlay = inPlayChance - hitOnInPlay;
  const single = hitOnInPlay * 0.68;
  const double = hitOnInPlay * 0.23 + (b.speed - 50) / 4000;
  const triple = hitOnInPlay * 0.03 + (b.speed - 50) / 8000;

  const roll = rand();
  let cursor = 0;
  const bands = [
    ['K', kChance],
    ['BB', bbChance],
    ['HBP', hbpChance],
    ['HR', hrChance],
    ['3B', Math.max(0, triple)],
    ['2B', Math.max(0, double)],
    ['1B', Math.max(0, single)],
    ['OUT', Math.max(0, outOnInPlay)],
  ];
  const total = bands.reduce((s, [, v]) => s + v, 0);
  for (const [code, val] of bands) {
    cursor += val / total;
    if (roll <= cursor) return code;
  }
  return 'OUT';
}

function fielderTypeForOut() {
  const r = rand();
  if (r < 0.55) return pick(['grounds out to short', 'grounds out to second', 'grounds out to third', 'grounds out to first']);
  if (r < 0.9) return pick(['flies out to center', 'flies out to left', 'flies out to right', 'pops out to short']);
  return 'lines out sharply';
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function nameOf(p) { return `${p.firstName[0]}. ${p.lastName}`; }

function advanceRunners(bases, batterOnBase, outcome) {
  // bases = [first, second, third] each holds player or null
  let runsScored = 0;
  const rbi = { count: 0 };
  const newBases = [null, null, null];

  switch (outcome) {
    case 'HR': {
      runsScored = 1 + bases.filter(Boolean).length;
      rbi.count = runsScored;
      return { bases: [null, null, null], runsScored, rbi: rbi.count };
    }
    case '3B': {
      // every runner already on base scores, batter stands on third
      runsScored = bases.filter(Boolean).length;
      rbi.count = runsScored;
      newBases[2] = batterOnBase;
      return { bases: newBases, runsScored, rbi: rbi.count };
    }
    case '2B': {
      // runners on 2nd/3rd score, runner on 1st usually reaches 3rd
      if (bases[2]) { runsScored++; rbi.count++; }
      if (bases[1]) { runsScored++; rbi.count++; }
      if (bases[0]) newBases[2] = bases[0];
      newBases[1] = batterOnBase;
      return { bases: newBases, runsScored, rbi: rbi.count };
    }
    case '1B': {
      if (bases[2]) { runsScored++; rbi.count++; }
      if (bases[1]) newBases[2] = bases[1];
      if (bases[0]) newBases[1] = bases[0];
      newBases[0] = batterOnBase;
      return { bases: newBases, runsScored, rbi: rbi.count };
    }
    case 'BB':
    case 'HBP': {
      // force only where needed
      const b = [...bases];
      if (b[0] && b[1] && b[2]) {
        // bases loaded — force in a run
        runsScored++; rbi.count++;
        newBases[0] = batterOnBase; newBases[1] = b[0]; newBases[2] = b[1];
      } else if (b[0]) {
        // force runner(s) ahead of first up one base
        newBases[0] = batterOnBase; newBases[1] = b[0]; newBases[2] = b[2];
      } else {
        newBases[0] = batterOnBase; newBases[1] = b[1]; newBases[2] = b[2];
      }
      return { bases: newBases, runsScored, rbi: rbi.count };
    }
    default:
      return { bases, runsScored: 0, rbi: 0 };
  }
}

function freshLine(isPitcher) {
  return isPitcher
    ? { ip: 0, h: 0, er: 0, bb: 0, k: 0, r: 0, outs: 0 }
    : { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, r: 0, sb: 0 };
}

export function simulateGame(homeTeam, awayTeam, opts = {}) {
  const innings = opts.innings || 9;
  const log = [];
  const boxHome = {}, boxAway = {};
  const homeOrder = battingOrder(homeTeam.roster);
  const awayOrder = battingOrder(awayTeam.roster);
  [...homeOrder, ...startingsAndBullpen(homeTeam)].forEach(p => (boxHome[p.id] = freshLine(p.isPitcher)));
  [...awayOrder, ...startingsAndBullpen(awayTeam)].forEach(p => (boxAway[p.id] = freshLine(p.isPitcher)));

  function startingsAndBullpen(team) {
    const sp = startingPitcher(team.roster);
    const bp = bullpen(team.roster);
    return [sp, ...bp];
  }

  let homePitcher = startingPitcher(homeTeam.roster);
  let awayPitcher = startingPitcher(awayTeam.roster);
  let homeIdx = 0, awayIdx = 0; // batting order cursor
  let homeRuns = 0, awayRuns = 0;
  const linescore = [];

  const inningsToPlay = () => (innings);
  let inning = 1;
  let maxInnings = inningsToPlay();

  const pitcherFatigue = { home: 0, away: 0 };

  function maybeSwapPitcher(side) {
    // Pull starter for a fresh reliever once fatigue climbs high enough
    const fat = pitcherFatigue[side];
    if (fat > 0.55 && rand() < 0.4) {
      const team = side === 'home' ? homeTeam : awayTeam;
      const rp = bullpen(team.roster).find(p => (side === 'home' ? boxHome : boxAway)[p.id].ip === 0 && p.position === 'RP')
        || bullpen(team.roster)[0];
      if (rp) {
        pitcherFatigue[side] = 0;
        if (side === 'home') homePitcher = rp; else awayPitcher = rp;
        log.push({ type: 'pitching-change', text: `${team.city} bring in ${nameOf(rp)} to pitch.` });
      }
    }
  }

  function playHalf(top) {
    const order = top ? awayOrder : homeOrder;
    const box = top ? boxAway : boxHome;
    const pitcherBox = top ? boxHome : boxAway;
    const side = top ? 'home' : 'away';

    let outs = 0;
    let bases = [null, null, null];
    let runsThisHalf = 0;

    while (outs < 3) {
      maybeSwapPitcher(side);
      const activePitcher = top ? homePitcher : awayPitcher;
      const batter = order[(top ? awayIdx : homeIdx) % order.length];
      const outcome = resolveAtBat(batter, activePitcher, pitcherFatigue[side]);
      pitcherFatigue[side] = clamp(pitcherFatigue[side] + 0.018 - (activePitcher.ratings.stamina - 50) / 4000, 0, 1);

      if (!box[batter.id]) box[batter.id] = freshLine(false);
      if (!pitcherBox[activePitcher.id]) pitcherBox[activePitcher.id] = freshLine(true);
      const bLine = box[batter.id];
      const pLine = pitcherBox[activePitcher.id];

      let text = '';
      if (outcome === 'K') {
        outs++; bLine.ab++; bLine.k++; pLine.k++; pLine.outs++;
        text = `${nameOf(batter)} strikes out.`;
      } else if (outcome === 'BB') {
        const adv = advanceRunners(bases, batter, 'BB');
        bases = adv.bases; runsThisHalf += adv.runsScored; bLine.bb++; pLine.bb++;
        text = `${nameOf(batter)} draws a walk.`;
      } else if (outcome === 'HBP') {
        const adv = advanceRunners(bases, batter, 'BB');
        bases = adv.bases; runsThisHalf += adv.runsScored;
        text = `${nameOf(batter)} is hit by the pitch.`;
      } else if (outcome === 'HR') {
        const adv = advanceRunners(bases, batter, 'HR');
        bases = adv.bases; runsThisHalf += adv.runsScored;
        bLine.ab++; bLine.h++; bLine.hr++; bLine.rbi += adv.rbi;
        pLine.h++; pLine.er += adv.runsScored;
        text = adv.runsScored > 1 ? `${nameOf(batter)} hits a ${adv.runsScored}-run homer!` : `${nameOf(batter)} homers!`;
      } else if (outcome === '3B') {
        const adv = advanceRunners(bases, batter, '3B');
        bases = adv.bases; runsThisHalf += adv.runsScored;
        bLine.ab++; bLine.h++; bLine.triples++; bLine.rbi += adv.rbi;
        pLine.h++; pLine.er += adv.runsScored;
        text = `${nameOf(batter)} triples.`;
      } else if (outcome === '2B') {
        const adv = advanceRunners(bases, batter, '2B');
        bases = adv.bases; runsThisHalf += adv.runsScored;
        bLine.ab++; bLine.h++; bLine.doubles++; bLine.rbi += adv.rbi;
        pLine.h++; pLine.er += adv.runsScored;
        text = `${nameOf(batter)} doubles.`;
      } else if (outcome === '1B') {
        const adv = advanceRunners(bases, batter, '1B');
        bases = adv.bases; runsThisHalf += adv.runsScored;
        bLine.ab++; bLine.h++; bLine.rbi += adv.rbi;
        pLine.h++; pLine.er += adv.runsScored;
        text = `${nameOf(batter)} singles.`;
      } else {
        outs++; bLine.ab++; pLine.outs++;
        text = `${nameOf(batter)} ${fielderTypeForOut()}.`;
      }
      log.push({ type: 'play', inning, top, outs, text, score: { home: homeRuns + (top ? 0 : runsThisHalf), away: awayRuns + (top ? runsThisHalf : 0) } });

      if (top) awayIdx++; else homeIdx++;
    }
    pitcherBox[(top ? homePitcher : awayPitcher).id].ip += 1;
    return runsThisHalf;
  }

  while (inning <= maxInnings || homeRuns === awayRuns) {
    const topRuns = playHalf(true);
    awayRuns += topRuns;
    log.push({ type: 'inning-end', inning, top: true, text: `End of the top of the ${ordinal(inning)}.` });

    if (!(inning === maxInnings && homeRuns > awayRuns)) {
      const botRuns = playHalf(false);
      homeRuns += botRuns;
      log.push({ type: 'inning-end', inning, top: false, text: `End of the ${ordinal(inning)}.` });
    }
    linescore.push({ inning, away: awayRuns, home: homeRuns });
    inning++;
    if (inning > maxInnings && homeRuns !== awayRuns) break;
    if (inning > 30) break; // absolute safety valve
  }

  log.push({ type: 'final', text: `Final: ${awayTeam.city} ${awayRuns} — ${homeTeam.city} ${homeRuns}` });

  return {
    homeRuns, awayRuns,
    winner: homeRuns > awayRuns ? 'home' : 'away',
    boxHome, boxAway,
    log,
    homeStartingPitcher: startingPitcher(homeTeam.roster).id,
    awayStartingPitcher: startingPitcher(awayTeam.roster).id,
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function applyBoxToRoster(team, box) {
  team.roster.forEach(p => {
    const line = box[p.id];
    if (!line) return;
    if (p.isPitcher) {
      p.season.g += line.ip > 0 || line.outs > 0 ? 1 : 0;
      p.season.ip += line.ip + line.outs / 3;
      p.season.h += line.h; p.season.er += line.er; p.season.bb += line.bb; p.season.k += line.k;
      p.career.g += line.ip > 0 || line.outs > 0 ? 1 : 0;
      p.career.ip += line.ip + line.outs / 3;
      p.career.h += line.h; p.career.er += line.er; p.career.bb += line.bb; p.career.k += line.k;
    } else {
      if (line.ab === 0 && line.bb === 0) return;
      p.season.g += 1; p.season.ab += line.ab; p.season.h += line.h;
      p.season.doubles += line.doubles; p.season.triples += line.triples; p.season.hr += line.hr;
      p.season.rbi += line.rbi; p.season.bb += line.bb; p.season.k += line.k; p.season.r += line.r || 0;
      p.career.g += 1; p.career.ab += line.ab; p.career.h += line.h;
      p.career.doubles += line.doubles; p.career.triples += line.triples; p.career.hr += line.hr;
      p.career.rbi += line.rbi; p.career.bb += line.bb; p.career.k += line.k;
      p.lastGame = { ...line };
      if (line.h > (p.careerHighs.hits || 0)) p.careerHighs.hits = line.h;
      if (line.hr > (p.careerHighs.hr || 0)) p.careerHighs.hr = line.hr;
      if (line.rbi > (p.careerHighs.rbi || 0)) p.careerHighs.rbi = line.rbi;
    }
  });
}

export { resolveAtBat };
