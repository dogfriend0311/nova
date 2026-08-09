// ══════════════════════════════════════════════════════════════
// Diamond League — roster depth systems (OOTP-style layer)
// Contracts, scouting uncertainty, injuries, service time /
// arbitration / free agency, and a real minor-league organization
// underneath the MLB roster. Deliberately has no dependency on
// data.js — data.js calls attachOrgMeta() right after building a
// player so there's no circular import.
// ══════════════════════════════════════════════════════════════

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// ── Contracts ────────────────────────────────────────────────
// Salary scales with talent and age; rookie-scale deals sit well
// below market the way a real pre-arb deal does.
export function generateContract(overall, age, { type = 'standard' } = {}) {
  const talentMult = clamp((overall - 40) / 45, 0.05, 1.6);
  let base = 480000 + talentMult * 9500000;
  if (type === 'rookie') base = 480000 + talentMult * 900000;
  const primeBoost = age >= 27 && age <= 31 ? 1.15 : 1;
  const salary = Math.round((base * primeBoost) / 25000) * 25000;
  const yearsLeft = type === 'rookie' ? randInt(2, 4) : randInt(1, 5);
  return { salary, yearsLeft, type, option: type === 'rookie' && yearsLeft <= 2 ? 'team' : 'none' };
}

export function fmtSalary(n) {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  return `$${Math.round(n / 1000)}K`;
}

export function tickContractYear(player) {
  if (!player.contract) return;
  player.contract = { ...player.contract, yearsLeft: Math.max(0, player.contract.yearsLeft - 1) };
}
export function isExpiring(player) { return !!player.contract && player.contract.yearsLeft <= 0; }

export function teamPayroll(team) {
  return team.roster.reduce((s, p) => s + (p.contract?.salary || 0), 0);
}

// ── Service time / arbitration / free agency ──────────────────
export function bumpServiceTime(player) { player.serviceYears = (player.serviceYears || 0) + 1; }
export function isArbEligible(player) { const s = player.serviceYears || 0; return s >= 3 && s < 6; }
export function isFreeAgentEligible(player) { return (player.serviceYears || 0) >= 6 || isExpiring(player); }

// Simple raise toward market rate rather than modeling an actual hearing.
export function arbitrationRaise(player) {
  const overall = ratingsAvg(player.ratings);
  const marketBase = generateContract(overall, player.age).salary;
  const raised = Math.round(((player.contract.salary * 1.4) + marketBase) / 2 / 25000) * 25000;
  player.contract = { salary: raised, yearsLeft: 1, type: 'arbitration', option: 'none' };
}

function ratingsAvg(ratings) {
  const vals = Object.values(ratings);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// ── Scouting ────────────────────────────────────────────────
// True ratings on player.ratings always drive the simulation.
// scoutAccuracy (0..1) controls how tightly a *displayed* scouted
// rating clusters around the truth — 1.0 for an MLB regular you see
// every day, low for a Rookie-ball prospect you've barely seen.
export function initialScoutAccuracy(orgLevel) {
  return { MLB: 1, AAA: 0.82, AA: 0.62, A: 0.45, Rookie: 0.3 }[orgLevel] ?? 1;
}
export function developScoutAccuracy(player) {
  player.scoutAccuracy = clamp((player.scoutAccuracy ?? 1) + 0.08, 0, 1);
}
// Classic 20-80 scouting scale conversion, for display alongside the raw number.
export function to80Scale(rating) { return Math.round(20 + (clamp(rating, 20, 99) - 20) * (60 / 79)); }

export function scoutedRatings(player) {
  const acc = player.scoutAccuracy ?? 1;
  const spread = (1 - acc) * 30; // up to +/-30 fuzz for a totally unscouted player
  const out = {};
  Object.keys(player.ratings).forEach(k => {
    const err = (Math.random() * 2 - 1) * spread;
    out[k] = clamp(Math.round(player.ratings[k] + err), 15, 99);
  });
  return out;
}
export function scoutedOverall(player) { return ratingsAvg(scoutedRatings(player)); }

export function rollPotential(overall, age) {
  const room = clamp((26 - age) * 2, 0, 20);
  return clamp(Math.round(overall + room * (0.4 + Math.random() * 0.8)), overall, 99);
}

// ── Injuries ────────────────────────────────────────────────
const INJURY_TABLE = [
  { type: 'Bruised hand', minGames: 2, maxGames: 5, weight: 3 },
  { type: 'Mild hamstring strain', minGames: 4, maxGames: 10, weight: 3 },
  { type: 'Oblique strain', minGames: 10, maxGames: 20, weight: 2 },
  { type: 'Elbow soreness', minGames: 8, maxGames: 18, weight: 2, pitcherOnly: true },
  { type: 'Shoulder inflammation', minGames: 15, maxGames: 35, weight: 1.4, pitcherOnly: true },
  { type: 'Torn UCL (Tommy John)', minGames: 90, maxGames: 140, weight: 0.25, pitcherOnly: true },
  { type: 'Torn ACL', minGames: 100, maxGames: 160, weight: 0.2 },
];

// Called once after a player appears in a game. Durability lowers the
// chance, workload (innings pitched / at-bats that game) raises it.
export function rollInjury(player, workload = 1) {
  if (player.injury) return player.injury;
  const durability = player.durability ?? 60;
  const baseChance = player.isPitcher ? 0.010 : 0.006;
  const chance = clamp(baseChance * (1 + workload * 0.3) * (1 - (durability - 50) / 120), 0.001, 0.05);
  if (Math.random() > chance) return null;
  const pool = INJURY_TABLE.filter(i => !i.pitcherOnly || player.isPitcher);
  const totalWeight = pool.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = pool[0];
  for (const i of pool) { roll -= i.weight; if (roll <= 0) { picked = i; break; } }
  const games = randInt(picked.minGames, picked.maxGames);
  player.injury = { type: picked.type, gamesRemaining: games, totalGames: games };
  return player.injury;
}

export function healOneGame(player) {
  if (!player.injury) return;
  const gamesRemaining = player.injury.gamesRemaining - 1;
  player.injury = gamesRemaining <= 0 ? null : { ...player.injury, gamesRemaining };
}
export function isAvailable(player) { return !player.injury; }
export function ilStatus(player) {
  if (!player.injury) return null;
  return player.injury.totalGames >= 15 ? 'IL-15' : 'Day-to-Day';
}

// ── Organization / minor-league depth ──────────────────────────
export const ORG_LEVELS = ['Rookie', 'A', 'AA', 'AAA', 'MLB'];

// data.js calls this right after generatePlayer() builds ratings, so
// this file never has to import data.js back.
export function attachOrgMeta(player, { orgLevel = 'MLB' } = {}) {
  const overall = ratingsAvg(player.ratings);
  player.orgLevel = orgLevel;
  player.scoutAccuracy = initialScoutAccuracy(orgLevel);
  player.potential = rollPotential(overall, player.age);
  player.durability = player.durability ?? randInt(35, 90);
  player.serviceYears = player.serviceYears ?? (orgLevel === 'MLB' ? randInt(0, 6) : 0);
  player.contract = player.contract || generateContract(overall, player.age, {
    type: orgLevel === 'MLB' && player.serviceYears > 0 ? 'standard' : 'rookie',
  });
  player.injury = player.injury || null;
  return player;
}

export function canCallUp(player) { return player.orgLevel !== 'MLB' && !player.injury; }

export function callUp(team, playerId) {
  const p = (team.organization || []).find(x => x.id === playerId);
  if (!p) return false;
  p.orgLevel = 'MLB';
  team.organization = team.organization.filter(x => x.id !== playerId);
  team.roster = [...team.roster, p];
  return true;
}
export function sendDown(team, playerId, targetLevel = 'AAA') {
  const p = team.roster.find(x => x.id === playerId);
  if (!p) return false;
  p.orgLevel = targetLevel;
  team.roster = team.roster.filter(x => x.id !== playerId);
  team.organization = [...(team.organization || []), p];
  return true;
}

// Season-turnover hook for the whole minor-league pool: age, develop
// scouting certainty, and occasionally auto-promote a level so a
// 29-year-old never lingers in Rookie ball. The interesting call-up
// decisions stay with the user — this just keeps the pool sane.
export function advanceOrganizationForNewSeason(organization) {
  const idx = { Rookie: 0, A: 1, AA: 2, AAA: 3 };
  return organization
    .filter(p => { p.age += 1; return p.age < 30; })
    .map(p => {
      developScoutAccuracy(p);
      const lvl = idx[p.orgLevel] ?? 0;
      const promoteChance = 0.12 + (p.potential - 50) / 300;
      if (lvl < 3 && Math.random() < promoteChance) p.orgLevel = ORG_LEVELS[lvl + 1];
      return p;
    });
}
