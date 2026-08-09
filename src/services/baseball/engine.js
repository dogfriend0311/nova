// ══════════════════════════════════════════════════════════════
// Diamond League — simulation engine (v3 / interactive)
// simulateGame()       — whole game resolved instantly, AI vs AI.
// simulateGameSteps()  — a generator. Yields {kind:'log', ...} for
//   every play so the UI can stream them, and PAUSES with
//   {kind:'bat-prompt'|'pitch-prompt'|'steal-prompt', ...} whenever
//   the controlled player is up to bat, on the mound, or on first
//   with second open — resume with gen.next(input) once the user
//   has responded. Returns the final box score / log when done.
// ══════════════════════════════════════════════════════════════

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function rand() { return Math.random(); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function nameOf(p) { return `${p.firstName[0]}. ${p.lastName}`; }

function battingOrder(roster) {
  const healthy = roster.filter(p => !p.isPitcher && !p.injury);
  const pool = healthy.length >= 9 ? healthy : roster.filter(p => !p.isPitcher);
  return pool.slice(0, 9);
}
function startingPitcher(roster) {
  const healthy = roster.filter(p => p.isPitcher && !p.injury);
  return healthy.find(p => p.position === 'SP') || healthy[0]
    || roster.find(p => p.isPitcher && p.position === 'SP') || roster.find(p => p.isPitcher) || roster[0];
}
function bullpen(roster) { return roster.filter(p => p.isPitcher && p.position !== 'SP' && !p.injury); }
function closerOf(roster) { return roster.find(p => p.isPitcher && p.position === 'CL' && !p.injury); }
function catcherOf(roster) { return roster.find(p => p.position === 'C') || roster.find(p => !p.isPitcher); }
function outfieldArm(roster) {
  const of = roster.filter(p => ['LF', 'CF', 'RF'].includes(p.position));
  const pool = of.length ? of : roster.filter(p => !p.isPitcher);
  if (!pool.length) return 50;
  return pool.reduce((s, p) => s + (p.ratings.arm || 50), 0) / pool.length;
}
function infieldFielding(roster) {
  const inf = roster.filter(p => ['1B', '2B', '3B', 'SS'].includes(p.position));
  const pool = inf.length ? inf : roster.filter(p => !p.isPitcher);
  if (!pool.length) return 50;
  return pool.reduce((s, p) => s + (p.ratings.fielding || 50), 0) / pool.length;
}

// Swing-timing / pitch-aim inputs translate into small, capped rating
// nudges for just that one plate appearance — enough to feel earned
// without letting a single tap overwhelm a player's real ratings.
const SWING_BONUS = {
  perfect: { contact: 18, power: 14 },
  good: { contact: 8, power: 6 },
  early: { contact: -14, power: -8 },
  late: { contact: -14, power: -8 },
  take: { contact: 0, power: 0 },
};

// Batter's-box approach called from the Strategy desk before the pitch —
// trades contact/power/eye against each other rather than adding pure
// upside, so there's a real decision instead of a strictly-best option.
const APPROACH_ADJ = {
  contact: { contact: 6, power: -4, eye: 0, babip: 0.01 },
  power: { contact: -8, power: 12, eye: -4, babip: -0.01 },
  patient: { contact: 0, power: -3, eye: 10, babip: 0 },
  bunt: { contact: 10, power: -30, eye: 0, babip: 0.10, groundLean: 0.9 },
};

// Pitch-type flavor: each shape trades a little stuff for control or
// vice versa, on top of whatever the location-timing meter earns.
const PITCH_TYPE_ADJ = {
  fastball: { stuff: 4, control: -2 },
  slider: { stuff: 2, control: 2, whiffBonus: 0.02 },
  changeup: { stuff: -2, control: 4, whiffBonus: 0.015 },
  curveball: { stuff: 3, control: -1, whiffBonus: 0.02 },
};

// Defensive alignment called from the Field tab — shifts run-prevention
// against extra-base risk instead of being a free upgrade.
const ALIGNMENT_ADJ = {
  standard: { babip: 0, xbhGuard: 0 },
  infield_in: { babip: 0.03, groundOutBonus: -0.10 },
  shift: { babip: -0.03, groundOutBonus: 0.08 },
  no_doubles: { babip: 0.015, xbhGuard: 0.10 },
  bunt_guard: { babip: 0.02, groundOutBonus: -0.05 },
  deep: { babip: -0.015, xbhGuard: -0.06 },
};

function resolveAtBat(batter, pitcher, fatigue = 0, modifier = {}) {
  const b = batter.ratings, p = pitcher.ratings;
  const contact = clamp(b.contact + (modifier.contactBonus || 0), 5, 99);
  const power = clamp(b.power + (modifier.powerBonus || 0), 5, 99);
  const eye = clamp(b.eye + (modifier.eyeBonus || 0), 5, 99);
  const stuffEff = clamp(p.stuff * (1 - fatigue * 0.35) + (modifier.stuffBonus || 0), 5, 99);
  const controlEff = clamp(p.control * (1 - fatigue * 0.25) + (modifier.controlBonus || 0), 5, 99);

  let kChance = 0.20 + (stuffEff - contact) / 380 + (eye - 50) / -600 + (modifier.whiffBonus || 0);
  let bbChance = 0.085 + (eye - controlEff) / 420;
  let hrChance = 0.028 + (power - stuffEff) / 480;
  kChance = clamp(kChance, 0.04, 0.46);
  bbChance = clamp(bbChance, 0.02, 0.20);
  hrChance = clamp(hrChance, 0.003, 0.13);

  const hbpChance = 0.008;
  const inPlayChance = clamp(1 - kChance - bbChance - hrChance - hbpChance, 0.2, 0.78);

  const babip = clamp(0.30 + (contact - p.movement) / 700 - (contact < 40 ? 0.02 : 0) + (modifier.babipAdj || 0), 0.14, 0.46);
  const hitOnInPlay = inPlayChance * babip;
  const outOnInPlay = inPlayChance - hitOnInPlay;
  const single = hitOnInPlay * 0.68;
  const double = hitOnInPlay * 0.23 + (b.speed - 50) / 4000;
  const triple = hitOnInPlay * 0.03 + (b.speed - 50) / 8000;

  const roll = rand();
  let cursor = 0;
  const bands = [
    ['K', kChance], ['BB', bbChance], ['HBP', hbpChance], ['HR', hrChance],
    ['3B', Math.max(0, triple)], ['2B', Math.max(0, double)],
    ['1B', Math.max(0, single)], ['OUT', Math.max(0, outOnInPlay)],
  ];
  const total = bands.reduce((s, [, v]) => s + v, 0);
  for (const [code, val] of bands) {
    cursor += val / total;
    if (roll <= cursor) return code;
  }
  return 'OUT';
}

function battedBallType(batter, groundLeanBonus = 0) {
  const gbLean = clamp(0.55 - (batter.ratings.power - 50) / 400 + groundLeanBonus, 0.2, 0.92);
  const r = rand();
  if (r < gbLean) return 'ground';
  if (r < gbLean + 0.32) return 'fly';
  return 'line';
}
function groundOutText() { return pick(['grounds out to short', 'grounds out to second', 'grounds out to third', 'grounds out to first']); }
function flyOutText() { return pick(['flies out to center', 'flies out to left', 'flies out to right', 'pops out to short']); }
function lineOutText() { return 'lines out sharply'; }

function advanceRunners(bases, batterOnBase, outcome) {
  const newBases = [null, null, null];
  let scorers = [];
  switch (outcome) {
    case 'HR':
      scorers = [...bases.filter(Boolean), batterOnBase];
      return { bases: [null, null, null], scorers, rbi: scorers.length };
    case '3B':
      scorers = bases.filter(Boolean);
      newBases[2] = batterOnBase;
      return { bases: newBases, scorers, rbi: scorers.length };
    case '2B':
      if (bases[2]) scorers.push(bases[2]);
      if (bases[1]) scorers.push(bases[1]);
      if (bases[0]) newBases[2] = bases[0];
      newBases[1] = batterOnBase;
      return { bases: newBases, scorers, rbi: scorers.length };
    case '1B':
      if (bases[2]) scorers.push(bases[2]);
      if (bases[1]) newBases[2] = bases[1];
      if (bases[0]) newBases[1] = bases[0];
      newBases[0] = batterOnBase;
      return { bases: newBases, scorers, rbi: scorers.length };
    case 'BB':
    case 'HBP': {
      const b = [...bases];
      if (b[0] && b[1] && b[2]) {
        scorers = [b[2]];
        newBases[0] = batterOnBase; newBases[1] = b[0]; newBases[2] = b[1];
      } else if (b[0]) {
        newBases[0] = batterOnBase; newBases[1] = b[0]; newBases[2] = b[2];
      } else {
        newBases[0] = batterOnBase; newBases[1] = b[1]; newBases[2] = b[2];
      }
      return { bases: newBases, scorers, rbi: scorers.length };
    }
    default:
      return { bases, scorers: [], rbi: 0 };
  }
}

function freshLine(isPitcher) {
  return isPitcher
    ? { ip: 0, h: 0, er: 0, bb: 0, k: 0, r: 0, outs: 0 }
    : { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, r: 0, sb: 0, cs: 0 };
}

// ── Core generator: everything routes through this ───────────
function* simulateGameCore(homeTeam, awayTeam, opts = {}) {
  const maxInnings = opts.innings || 9;
  // Legacy single-player mode: controlledPlayerId can belong to either
  // roster and is resolved to whichever side it's actually on. For two
  // human players (local hot-seat or networked), pass controlledHomeId
  // and controlledAwayId explicitly instead — see session.js.
  const legacyId = opts.controlledPlayerId || null;
  const legacyIsHome = legacyId ? homeTeam.roster.some(p => p.id === legacyId) : false;
  const controlledHomeId = opts.controlledHomeId || (legacyIsHome ? legacyId : null);
  const controlledAwayId = opts.controlledAwayId || (legacyId && !legacyIsHome ? legacyId : null);
  const log = [];
  const boxHome = {}, boxAway = {};
  const homeOrder = battingOrder(homeTeam.roster);
  const awayOrder = battingOrder(awayTeam.roster);

  const startPitcherFor = (team) => [startingPitcher(team.roster), ...bullpen(team.roster)];
  [...homeOrder, ...startPitcherFor(homeTeam)].forEach(p => (boxHome[p.id] = freshLine(p.isPitcher)));
  [...awayOrder, ...startPitcherFor(awayTeam)].forEach(p => (boxAway[p.id] = freshLine(p.isPitcher)));

  const ensure = (box, player) => { if (!box[player.id]) box[player.id] = freshLine(player.isPitcher); return box[player.id]; };
  const scoreRunner = (box, player) => { ensure(box, player).r += 1; };
  // Which side (if either) controls a given player — this is what a
  // multiplayer session uses to route a prompt to the right client.
  const controllingSide = (p) => {
    if (!p) return null;
    if (controlledHomeId && p.id === controlledHomeId) return 'home';
    if (controlledAwayId && p.id === controlledAwayId) return 'away';
    return null;
  };
  const isControlled = (p) => controllingSide(p) !== null;

  let homeIdx = 0, awayIdx = 0;
  let homeRuns = 0, awayRuns = 0;

  const usage = {
    home: { pitcher: startingPitcher(homeTeam.roster), pitches: 0, battersFaced: 0, used: new Set([startingPitcher(homeTeam.roster).id]), closerUsed: false, alignment: 'standard' },
    away: { pitcher: startingPitcher(awayTeam.roster), pitches: 0, battersFaced: 0, used: new Set([startingPitcher(awayTeam.roster).id]), closerUsed: false, alignment: 'standard' },
  };

  function staminaLimit(pitcher) { return 55 + (pitcher.ratings.stamina || 50) * 0.75; }

  function considerPitchingChange(side, inningNum) {
    const u = usage[side];
    const team = side === 'home' ? homeTeam : awayTeam;
    if (isControlled(u.pitcher)) return; // never auto-pull the human's pitcher
    const fatigueRatio = u.pitches / staminaLimit(u.pitcher);
    const timesThrough = Math.floor(u.battersFaced / Math.max(1, battingOrder(team.roster).length));
    const pitchingLeads = side === 'home' ? homeRuns > awayRuns : awayRuns > homeRuns;
    const leadMargin = side === 'home' ? homeRuns - awayRuns : awayRuns - homeRuns;
    const saveSpot = inningNum >= maxInnings && pitchingLeads && leadMargin <= 3 && u.pitcher.position !== 'CL' && !u.closerUsed;

    let pullReason = null;
    if (fatigueRatio >= 1.05) pullReason = 'tired';
    else if (saveSpot && rand() < 0.85) pullReason = 'save';
    else if (fatigueRatio >= 0.75 && timesThrough >= 2 && rand() < 0.35) pullReason = 'times-through';
    if (!pullReason) return;

    let next;
    if (pullReason === 'save') { next = closerOf(team.roster); if (next) u.closerUsed = true; }
    if (!next) {
      next = bullpen(team.roster).find(p => !u.used.has(p.id) && p.position === 'RP')
        || team.roster.find(p => p.isPitcher && !u.used.has(p.id));
    }
    if (!next || next.id === u.pitcher.id) return;
    log.push({ type: 'pitching-change', text: `${team.city} bring in ${nameOf(next)} to pitch${pullReason === 'save' ? ' for the save' : '.'}` });
    u.pitcher = next; u.pitches = 0; u.battersFaced = 0; u.used.add(next.id);
  }

  function* playHalf(top, inningNum) {
    const order = top ? awayOrder : homeOrder;
    const box = top ? boxAway : boxHome;
    const pitcherBox = top ? boxHome : boxAway;
    const side = top ? 'home' : 'away';
    const defenseTeam = top ? homeTeam : awayTeam;

    considerPitchingChange(side, inningNum);

    let outs = 0;
    let bases = [null, null, null];
    let runsThisHalf = 0;

    while (outs < 3) {
      const u = usage[side];
      const activePitcher = u.pitcher;
      const fatigue = clamp(u.pitches / staminaLimit(activePitcher), 0, 1.3);

      // ── Stolen base opportunity ──
      if (bases[0] && !bases[1] && outs < 3) {
        const runner = bases[0];
        let attempt = false;
        let aggressive = false;
        if (isControlled(runner)) {
          const resp = yield { kind: 'steal-prompt', side: controllingSide(runner), runner, catcher: catcherOf(defenseTeam.roster), pitcher: activePitcher };
          attempt = !!(resp && resp.attempt);
          aggressive = !!(resp && resp.aggressive);
        } else {
          const chance = runner.ratings.speed >= 60 ? clamp((runner.ratings.speed - 55) / 180, 0, 0.30) : 0;
          attempt = rand() < chance;
        }
        if (attempt) {
          const catcher = catcherOf(defenseTeam.roster);
          // Aggressive jumps buy a better break (higher success) but a worse
          // one when it fails outright gets you picked off more cleanly —
          // modeled here as a wider swing rather than a free win.
          const aggBonus = aggressive ? 10 : 0;
          const successChance = clamp(0.65 + aggBonus + (runner.ratings.speed - (catcher.ratings.arm || 50) - activePitcher.ratings.hold) / 300, 0.30, 0.94);
          let entry;
          if (rand() < successChance) {
            bases = [null, runner, bases[2]];
            ensure(box, runner).sb += 1;
            entry = { type: 'play', inning: inningNum, top, text: `${nameOf(runner)} steals second base.` };
          } else {
            outs++;
            ensure(box, runner).cs += 1;
            bases = [null, bases[1], bases[2]];
            entry = { type: 'play', inning: inningNum, top, text: `${nameOf(runner)} is caught stealing.` };
          }
          log.push(entry);
          yield { kind: 'log', entry };
          if (outs >= 3) break;
        }
      }

      const batter = order[(top ? awayIdx : homeIdx) % order.length];
      const userBatting = isControlled(batter);
      const userPitching = isControlled(activePitcher);

      let modifier = {};
      let groundLeanBonus = 0;
      const alignment = ALIGNMENT_ADJ[u.alignment] || ALIGNMENT_ADJ.standard;
      if (userBatting) {
        const resp = yield {
          kind: 'bat-prompt', side: controllingSide(batter), batter, pitcher: activePitcher, bases: [...bases], outs,
          fatigue, pitchCount: u.pitches, staminaLimit: staminaLimit(activePitcher),
        };
        const timing = (resp && resp.timing) || 'take';
        const approach = APPROACH_ADJ[resp && resp.approach] || APPROACH_ADJ.contact;
        const b = SWING_BONUS[timing] || SWING_BONUS.take;
        modifier = {
          contactBonus: b.contact + approach.contact,
          powerBonus: b.power + approach.power,
          eyeBonus: approach.eye,
          babipAdj: (approach.babip || 0) + alignment.babip,
        };
        groundLeanBonus = (approach.groundLean ? 0.25 : 0) + (alignment.groundOutBonus || 0) * -1;
      } else if (userPitching) {
        const resp = yield {
          kind: 'pitch-prompt', side: controllingSide(activePitcher), batter, pitcher: activePitcher, bases: [...bases], outs,
          fatigue, pitchCount: u.pitches, staminaLimit: staminaLimit(activePitcher),
        };
        const acc = clamp(resp && typeof resp.accuracy === 'number' ? resp.accuracy : 0.5, 0, 1);
        const type = PITCH_TYPE_ADJ[resp && resp.pitchType] || PITCH_TYPE_ADJ.fastball;
        if (resp && resp.alignment) u.alignment = resp.alignment;
        modifier = {
          controlBonus: (acc - 0.5) * 26 + type.control,
          stuffBonus: (acc - 0.5) * 12 + type.stuff,
          whiffBonus: type.whiffBonus || 0,
          babipAdj: alignment.babip,
        };
        groundLeanBonus = -(alignment.groundOutBonus || 0);
      } else {
        modifier = { babipAdj: alignment.babip };
        groundLeanBonus = -(alignment.groundOutBonus || 0);
      }

      const outcome = resolveAtBat(batter, activePitcher, fatigue, modifier);
      u.pitches += 3 + Math.floor(rand() * 4);
      u.battersFaced += 1;

      const bLine = ensure(box, batter);
      const pLine = ensure(pitcherBox, activePitcher);
      let text = '';

      if (outcome === 'K') {
        outs++; bLine.ab++; bLine.k++; pLine.k++; pLine.outs++;
        text = `${nameOf(batter)} strikes out.`;
      } else if (outcome === 'BB') {
        const adv = advanceRunners(bases, batter, 'BB');
        bases = adv.bases; adv.scorers.forEach(s => scoreRunner(box, s));
        runsThisHalf += adv.scorers.length; bLine.bb++; pLine.bb++; pLine.er += adv.scorers.length; bLine.rbi += adv.rbi;
        text = `${nameOf(batter)} draws a walk.`;
      } else if (outcome === 'HBP') {
        const adv = advanceRunners(bases, batter, 'BB');
        bases = adv.bases; adv.scorers.forEach(s => scoreRunner(box, s));
        runsThisHalf += adv.scorers.length; pLine.er += adv.scorers.length;
        text = `${nameOf(batter)} is hit by the pitch.`;
      } else if (outcome === 'HR') {
        const adv = advanceRunners(bases, batter, 'HR');
        bases = adv.bases; adv.scorers.forEach(s => scoreRunner(box, s));
        runsThisHalf += adv.scorers.length;
        bLine.ab++; bLine.h++; bLine.hr++; bLine.rbi += adv.rbi; pLine.h++; pLine.er += adv.scorers.length;
        text = adv.scorers.length > 1 ? `${nameOf(batter)} hits a ${adv.scorers.length}-run homer!` : `${nameOf(batter)} homers!`;
      } else if (outcome === '3B') {
        const adv = advanceRunners(bases, batter, '3B');
        bases = adv.bases; adv.scorers.forEach(s => scoreRunner(box, s));
        runsThisHalf += adv.scorers.length;
        bLine.ab++; bLine.h++; bLine.triples++; bLine.rbi += adv.rbi; pLine.h++; pLine.er += adv.scorers.length;
        text = `${nameOf(batter)} triples.`;
      } else if (outcome === '2B') {
        const adv = advanceRunners(bases, batter, '2B');
        bases = adv.bases; adv.scorers.forEach(s => scoreRunner(box, s));
        runsThisHalf += adv.scorers.length;
        bLine.ab++; bLine.h++; bLine.doubles++; bLine.rbi += adv.rbi; pLine.h++; pLine.er += adv.scorers.length;
        text = `${nameOf(batter)} doubles`;
        if (bases[2] && bases[2] !== batter) {
          const runner = bases[2];
          const arm = outfieldArm(defenseTeam.roster);
          const goChance = clamp(0.12 + (runner.ratings.speed - arm) / 300, 0, 0.35);
          if (rand() < goChance) {
            bases = [bases[0], bases[1], null];
            scoreRunner(box, runner); bLine.rbi += 1; pLine.er += 1; runsThisHalf += 1;
            text += `, and ${nameOf(runner)} scores all the way from first!`;
          } else text += '.';
        } else text += '.';
      } else if (outcome === '1B') {
        const originalSecondEmpty = !bases[1];
        const originalFirstRunner = bases[0];
        const adv = advanceRunners(bases, batter, '1B');
        bases = adv.bases; adv.scorers.forEach(s => scoreRunner(box, s));
        runsThisHalf += adv.scorers.length;
        bLine.ab++; bLine.h++; bLine.rbi += adv.rbi; pLine.h++; pLine.er += adv.scorers.length;
        text = `${nameOf(batter)} singles`;
        if (originalFirstRunner && originalSecondEmpty && bases[1] === originalFirstRunner) {
          const arm = outfieldArm(defenseTeam.roster);
          const goChance = clamp(0.30 + (originalFirstRunner.ratings.speed - arm) / 250, 0.05, 0.75);
          if (rand() < goChance) {
            const thrownOutChance = clamp(0.12 - (originalFirstRunner.ratings.speed - arm) / 800, 0.03, 0.2);
            if (rand() < thrownOutChance && outs < 2) {
              bases = [bases[0], null, bases[2]]; outs++;
              text += `, ${nameOf(originalFirstRunner)} tries for third but is thrown out!`;
            } else {
              bases = [bases[0], null, originalFirstRunner];
              text += `, and ${nameOf(originalFirstRunner)} takes third.`;
            }
          } else text += '.';
        } else text += '.';
      } else {
        const type = battedBallType(batter, groundLeanBonus);
        bLine.ab++;
        if (type === 'ground' && bases[0] && outs < 2) {
          const defFielding = infieldFielding(defenseTeam.roster);
          const dpChance = clamp(0.42 + (defFielding - 50) / 200 - (batter.ratings.speed - 50) / 250, 0.1, 0.7);
          if (rand() < dpChance) {
            const runnerOut = bases[0];
            outs += 2; pLine.outs += 2; bases = [null, bases[1], bases[2]];
            text = `${nameOf(batter)} grounds into a double play, ${nameOf(runnerOut)} forced at second.`;
          } else if (bases[2] && outs < 2 && rand() < 0.22) {
            outs++; pLine.outs++;
            const runner = bases[2];
            scoreRunner(box, runner); bLine.rbi += 1; pLine.er += 1; runsThisHalf += 1;
            bases = [bases[0], bases[1], null];
            text = `${nameOf(batter)} ${groundOutText()}, ${nameOf(runner)} scores!`;
          } else {
            outs++; pLine.outs++;
            text = `${nameOf(batter)} ${groundOutText()}.`;
          }
        } else if (type === 'fly' && bases[2] && outs < 2) {
          const runner = bases[2];
          const sacChance = clamp(0.55 + (runner.ratings.speed - 50) / 300, 0.3, 0.85);
          outs++; pLine.outs++;
          if (rand() < sacChance) {
            bases = [bases[0], bases[1], null];
            scoreRunner(box, runner); bLine.rbi += 1; pLine.er += 1; runsThisHalf += 1;
            text = `${nameOf(batter)} lifts a sac fly, ${nameOf(runner)} scores.`;
          } else {
            text = `${nameOf(batter)} ${flyOutText()}.`;
          }
        } else {
          outs++; pLine.outs++;
          text = `${nameOf(batter)} ${type === 'line' ? lineOutText() : flyOutText()}.`;
        }
      }

      const entry = { type: 'play', inning: inningNum, top, outs, text, score: { home: homeRuns + (top ? 0 : runsThisHalf), away: awayRuns + (top ? runsThisHalf : 0) } };
      log.push(entry);
      yield { kind: 'log', entry };
      if (top) awayIdx++; else homeIdx++;
    }

    ensure(pitcherBox, usage[side].pitcher).ip += 1;
    return runsThisHalf;
  }

  let inning = 1;
  while (inning <= maxInnings || homeRuns === awayRuns) {
    const topRuns = yield* playHalf(true, inning);
    awayRuns += topRuns;
    const endTop = { type: 'inning-end', inning, top: true, text: `End of the top of the ${ordinal(inning)}.` };
    log.push(endTop); yield { kind: 'log', entry: endTop };

    if (!(inning === maxInnings && homeRuns > awayRuns)) {
      const botRuns = yield* playHalf(false, inning);
      homeRuns += botRuns;
      const endBot = { type: 'inning-end', inning, top: false, text: `End of the ${ordinal(inning)}.` };
      log.push(endBot); yield { kind: 'log', entry: endBot };
    }
    inning++;
    if (inning > maxInnings && homeRuns !== awayRuns) break;
    if (inning > 30) break;
  }

  const finalEntry = { type: 'final', text: `Final: ${awayTeam.city} ${awayRuns} — ${homeTeam.city} ${homeRuns}` };
  log.push(finalEntry); yield { kind: 'log', entry: finalEntry };

  return {
    homeRuns, awayRuns,
    winner: homeRuns > awayRuns ? 'home' : 'away',
    boxHome, boxAway, log,
    homeStartingPitcher: startingPitcher(homeTeam.roster).id,
    awayStartingPitcher: startingPitcher(awayTeam.roster).id,
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Instant, fully-automatic game — used for exhibitions, CPU-vs-CPU,
// and any at-bat where nobody is under user control.
export function simulateGame(homeTeam, awayTeam, opts = {}) {
  const gen = simulateGameCore(homeTeam, awayTeam, { ...opts, controlledPlayerId: null });
  let result = gen.next();
  while (!result.done) result = gen.next();
  return result.value;
}

// Interactive generator — drive it with gen.next(input) each time it
// yields a '*-prompt' event; 'log' events can be auto-continued.
// Pass either controlledPlayerId (legacy single-player) or the pair
// controlledHomeId/controlledAwayId for two humans, one per side —
// see session.js for the networked wrapper built on top of this.
export function createInteractiveGame(homeTeam, awayTeam, controlledPlayerId, opts = {}) {
  return simulateGameCore(homeTeam, awayTeam, { ...opts, controlledPlayerId });
}

export function createMultiplayerGame(homeTeam, awayTeam, { controlledHomeId = null, controlledAwayId = null, ...opts } = {}) {
  return simulateGameCore(homeTeam, awayTeam, { ...opts, controlledHomeId, controlledAwayId });
}

export function applyBoxToRoster(team, box) {
  team.roster.forEach(p => {
    const line = box[p.id];
    if (!line) return;
    if (p.isPitcher) {
      if (line.ip === 0 && line.outs === 0) return;
      const ipThisGame = line.ip + line.outs / 3;
      p.season.g += 1; p.season.ip += ipThisGame;
      p.season.h += line.h; p.season.er += line.er; p.season.bb += line.bb; p.season.k += line.k;
      p.career.g += 1; p.career.ip += ipThisGame;
      p.career.h += line.h; p.career.er += line.er; p.career.bb += line.bb; p.career.k += line.k;
      p.lastGame = { ...line, ip: ipThisGame };
      if (!p.careerHighs) p.careerHighs = { ip: 0, k: 0, er: 0, hits: 0 };
      if (ipThisGame > (p.careerHighs.ip || 0)) p.careerHighs.ip = ipThisGame;
      if (line.k > (p.careerHighs.k || 0)) p.careerHighs.k = line.k;
      if (line.h > (p.careerHighs.hits || 0)) p.careerHighs.hits = line.h;
    } else {
      if (line.ab === 0 && line.bb === 0) return;
      p.season.g += 1; p.season.ab += line.ab; p.season.h += line.h;
      p.season.doubles += line.doubles; p.season.triples += line.triples; p.season.hr += line.hr;
      p.season.rbi += line.rbi; p.season.bb += line.bb; p.season.k += line.k; p.season.r += line.r || 0;
      p.season.sb += line.sb || 0;
      p.career.g += 1; p.career.ab += line.ab; p.career.h += line.h;
      p.career.doubles += line.doubles; p.career.triples += line.triples; p.career.hr += line.hr;
      p.career.rbi += line.rbi; p.career.bb += line.bb; p.career.k += line.k; p.career.r += line.r || 0;
      p.career.sb += line.sb || 0;
      p.lastGame = { ...line };
      if (line.h > (p.careerHighs.hits || 0)) p.careerHighs.hits = line.h;
      if (line.hr > (p.careerHighs.hr || 0)) p.careerHighs.hr = line.hr;
      if (line.rbi > (p.careerHighs.rbi || 0)) p.careerHighs.rbi = line.rbi;
      if ((line.sb || 0) > (p.careerHighs.sb || 0)) p.careerHighs.sb = line.sb || 0;
    }
  });
}

export { resolveAtBat };
export const APPROACH_KEYS = Object.keys(APPROACH_ADJ);
export const PITCH_TYPE_KEYS = Object.keys(PITCH_TYPE_ADJ);
export const ALIGNMENT_KEYS = Object.keys(ALIGNMENT_ADJ);
