// ══════════════════════════════════════════════════════════════
// Diamond League — data generation
// Procedural cities, mascots, names, teams, players, leagues.
// No external data required — this is the "basic package" that
// ships free, same idea as Hoop Land's default league.
// ══════════════════════════════════════════════════════════════

const CITIES = [
  'Bozeman', 'Durham', 'Missoula', 'Corvallis', 'Spokane', 'Ogden', 'Tulsa',
  'Amarillo', 'Biloxi', 'Savannah', 'Erie', 'Akron', 'Peoria', 'Modesto',
  'Fresno', 'Toledo', 'Dayton', 'Wichita', 'Boise', 'Reno', 'Providence',
  'Hartford', 'Trenton', 'Richmond', 'Chattanooga', 'Knoxville', 'Shreveport',
  'Mobile', 'Lansing', 'Rockford', 'Binghamton', 'Altoona', 'Frisco',
  'Midland', 'Lubbock', 'Yuma', 'Bakersfield', 'Stockton', 'Eugene', 'Salem',
];

const MASCOTS = [
  'Saddles', 'Dragons', 'Mountains', 'Loggers', 'Reign', 'Lions', 'Drillers',
  'Sod Poodles', 'Shuckers', 'Bananas', 'SeaWolves', 'RubberDucks', 'Chiefs',
  'Nuts', 'Grizzlies', 'Mud Hens', 'Dragons', 'Wind Surge', 'Hawks', 'Aces',
  'Grays', 'Yard Goats', 'Thunder', 'Flying Squirrels', 'Lookouts', 'Smokies',
  'Captains', 'BayBears', 'Lugnuts', 'Cardinals', 'Rumble Ponies', 'Curve',
  'RoughRiders', 'RockHounds', 'Hooks', 'Sixguns', 'Blaze', 'Ports', 'Emeralds',
  'Volcanoes',
];

const FIRST_NAMES = [
  'Tune', 'Marcus', 'Diego', 'Silas', 'Jamal', 'Colt', 'Andre', 'Wyatt',
  'Kenji', 'Miguel', 'Trey', 'Levi', 'Deshawn', 'Cole', 'Isaiah', 'Bo',
  'Rafael', 'Tanner', 'Xavier', 'Gunnar', 'Elijah', 'Beau', 'Malik', 'Hank',
  'Julio', 'Cade', 'Amir', 'Jesse', 'Ronan', 'Tyree', 'Sabre', 'Willie',
  'Nicholas', 'Randall', 'Hugh', 'Derrick', 'Lyle', 'Justin', 'Patrick',
];

const LAST_NAMES = [
  'Jam', 'Canada', 'Graves', 'Leroy', 'Petersen', 'Boyer', 'Sparks', 'Maxwell',
  'Smith', 'Ward', 'Christian', 'Ceci', 'Hensley', 'Foster', 'Daniel', 'Davis',
  'Cummings', 'Stephens', 'Ferguson', 'Bowen', 'Snyder', 'Adams', 'Harmon',
  'Smiff', 'Hanson', 'Ríos', 'Nakamura', 'Alvarado', 'Whitfield', 'Okafor',
  'Delgado', 'Prescott', 'Vance', 'Marsh', 'Osei', 'Castillo', 'Doyle',
];

const ARCHETYPES_HITTER = [
  'Slugger', 'Contact Hitter', 'Table Setter', 'Five Tool', 'Free Swinger',
  'Gap-to-Gap', 'Grinder',
];
const ARCHETYPES_PITCHER = [
  'Flamethrower', 'Crafty Lefty', 'Command Artist', 'Sinkerballer',
  'Strikeout Ace', 'Bulk Innings', 'Closer',
];

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const PITCHER_ROLES = ['SP', 'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CL'];

const SKIN_COLORS = ['#4a2c2a', '#8a5a3d', '#c68863', '#e0ac7a', '#f0c8a0'];
const HAIR_COLORS = ['#0b0b0b', '#2b1a0f', '#5a3820', '#a85c2c', '#d4c19c'];
const HAIR_STYLES = ['Style 1', 'Style 2', 'Style 3', 'Style 4', 'Style 5', 'Bald'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid(prefix = 'id') { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

// Normal-ish distribution for ratings so most players cluster mid-range,
// with occasional stars and scrubs — same feel as Hoop Land's rookies.
function ratingRoll(base = 50, spread = 20) {
  const r = (Math.random() + Math.random() + Math.random()) / 3; // triangular-ish
  return Math.max(20, Math.min(99, Math.round(base + (r - 0.5) * spread * 2)));
}

export function generatePlayer({ isPitcher = false, level = 'pro', age = null } = {}) {
  const position = isPitcher ? pick(PITCHER_ROLES) : pick(POSITIONS);
  const baseAdj = level === 'college' ? -12 : level === 'rookie' ? -6 : 0;
  const player = {
    id: uid('plyr'),
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    number: randInt(0, 99),
    age: age || randInt(19, 34),
    position,
    bats: pick(['L', 'R', 'R', 'S']),
    throws: pick(['L', 'R', 'R', 'R']),
    archetype: isPitcher ? pick(ARCHETYPES_PITCHER) : pick(ARCHETYPES_HITTER),
    appearance: {
      skinColor: pick(SKIN_COLORS),
      hairColor: pick(HAIR_COLORS),
      hairStyle: pick(HAIR_STYLES),
      jerseyPrimary: '#123024',
      jerseySecondary: '#ffb703',
    },
    ratings: isPitcher ? {
      stuff: ratingRoll(55 + baseAdj),
      control: ratingRoll(50 + baseAdj),
      movement: ratingRoll(50 + baseAdj),
      stamina: ratingRoll(55 + baseAdj),
      fielding: ratingRoll(45 + baseAdj),
      hold: ratingRoll(50 + baseAdj),
    } : {
      contact: ratingRoll(50 + baseAdj),
      power: ratingRoll(50 + baseAdj),
      eye: ratingRoll(50 + baseAdj),
      speed: ratingRoll(50 + baseAdj),
      fielding: ratingRoll(50 + baseAdj),
      arm: ratingRoll(50 + baseAdj),
    },
    xp: { finishing: 0, hitting: 0, creating: 0, defense: 0 },
    skillPoints: 0,
    level: 1,
    totalXp: 0,
    season: emptySeasonStats(isPitcher),
    career: emptyCareerStats(isPitcher),
    careerHighs: isPitcher
      ? { ip: 0, k: 0, er: 0, hits: 0 }
      : { pts: 0, hr: 0, rbi: 0, hits: 0, sb: 0 },
    lastGame: null,
    isPitcher,
  };
  return player;
}

export function emptySeasonStats(isPitcher) {
  return isPitcher
    ? { g: 0, w: 0, l: 0, sv: 0, ip: 0, h: 0, er: 0, bb: 0, k: 0 }
    : { g: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, r: 0 };
}
export function emptyCareerStats(isPitcher) {
  return isPitcher
    ? { g: 0, w: 0, l: 0, sv: 0, ip: 0, h: 0, er: 0, bb: 0, k: 0 }
    : { g: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, r: 0 };
}

export function generateRoster(level = 'pro') {
  const hitters = POSITIONS.map(() => generatePlayer({ isPitcher: false, level }));
  // A couple bench bats
  hitters.push(generatePlayer({ isPitcher: false, level }));
  hitters.push(generatePlayer({ isPitcher: false, level }));
  const pitchers = PITCHER_ROLES.map(() => generatePlayer({ isPitcher: true, level }));
  return [...hitters, ...pitchers];
}

export function generateTeam(usedNames, level = 'pro') {
  let city, mascot, key;
  do {
    city = pick(CITIES);
    mascot = pick(MASCOTS);
    key = `${city}-${mascot}`;
  } while (usedNames.has(key));
  usedNames.add(key);
  const abbr = city.slice(0, 3).toUpperCase();
  return {
    id: uid('team'),
    city,
    name: mascot,
    abbr,
    colors: { primary: pick(['#123024', '#1c2a4a', '#4a1c1c', '#2a2a1c', '#1c2a2a']), secondary: pick(['#ffb703', '#e5533d', '#eaf3ec', '#7fd8a0']) },
    roster: generateRoster(level),
    wins: 0,
    losses: 0,
    runsFor: 0,
    runsAgainst: 0,
    streak: 0,
  };
}

export function generateLeague({ teamCount = 20, level = 'pro', year = new Date().getFullYear() } = {}) {
  const usedNames = new Set();
  const teams = Array.from({ length: teamCount }, () => generateTeam(usedNames, level));
  return {
    id: uid('league'),
    name: level === 'college' ? 'Diamond College Association' : 'Diamond League',
    year,
    level,
    teams,
  };
}

export function generateDraftClass(size = 40) {
  return Array.from({ length: size }, (_, i) => ({
    ...generatePlayer({ isPitcher: i % 3 === 0, level: 'college', age: randInt(18, 22) }),
    draftRank: i + 1,
  }));
}

// Round-robin-ish schedule generator: each team plays a set number of
// games against a mix of opponents across the season.
export function generateSchedule(teams, totalGames = 30) {
  const schedule = [];
  const ids = teams.map(t => t.id);
  let day = 1;
  const gamesPerTeam = {};
  ids.forEach(id => (gamesPerTeam[id] = 0));
  while (Math.min(...ids.map(id => gamesPerTeam[id])) < totalGames) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const home = shuffled[i], away = shuffled[i + 1];
      if (gamesPerTeam[home] >= totalGames || gamesPerTeam[away] >= totalGames) continue;
      schedule.push({ id: uid('game'), day, home, away, played: false, result: null });
      gamesPerTeam[home]++;
      gamesPerTeam[away]++;
    }
    day++;
    if (day > totalGames * 3) break; // safety valve
  }
  return schedule.sort((a, b) => a.day - b.day);
}

// ── Import hydration ──────────────────────────────────────────
// Accepts partial, human-authored JSON (a team might only specify
// a city/name/colors, or a full roster with real ratings) and fills
// in anything missing with generated defaults, so imports never
// crash the game even if they're incomplete.
export function hydratePlayer(raw = {}, fallbackOpts = {}) {
  const base = generatePlayer(fallbackOpts);
  return {
    ...base,
    ...raw,
    appearance: { ...base.appearance, ...(raw.appearance || {}) },
    ratings: { ...base.ratings, ...(raw.ratings || {}) },
    season: { ...base.season, ...(raw.season || {}) },
    career: { ...base.career, ...(raw.career || {}) },
    careerHighs: { ...base.careerHighs, ...(raw.careerHighs || {}) },
    id: raw.id || base.id,
    isPitcher: raw.isPitcher ?? base.isPitcher,
  };
}

export function hydrateTeam(raw = {}, usedNames) {
  const base = generateTeam(usedNames, 'pro');
  let roster = Array.isArray(raw.roster) && raw.roster.length > 0
    ? raw.roster.map(p => hydratePlayer(p, { isPitcher: !!p.isPitcher }))
    : base.roster;
  // Top up an incomplete import so there's always a full lineup + a pitcher
  // who can go the distance — otherwise the same one or two players would
  // have to bat/pitch every single time through the order.
  const hitterCount = roster.filter(p => !p.isPitcher).length;
  const pitcherCount = roster.filter(p => p.isPitcher).length;
  if (hitterCount < 9) roster = [...roster, ...base.roster.filter(p => !p.isPitcher).slice(0, 9 - hitterCount)];
  if (pitcherCount < 1) roster = [...roster, ...base.roster.filter(p => p.isPitcher).slice(0, 3)];
  return {
    ...base,
    ...raw,
    colors: { ...base.colors, ...(raw.colors || {}) },
    roster,
    id: raw.id || base.id,
    wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: 0,
  };
}

export function hydrateLeague(raw = {}, { year = new Date().getFullYear() } = {}) {
  const usedNames = new Set();
  const teams = Array.isArray(raw.teams) && raw.teams.length >= 2
    ? raw.teams.map(t => hydrateTeam(t, usedNames))
    : generateLeague({ teamCount: 20 }).teams;
  return {
    id: uid('league'),
    name: raw.name || 'Custom League',
    year: raw.year || year,
    level: raw.level || 'pro',
    teams,
  };
}


export function battingAvg(s) { return s.ab > 0 ? (s.h / s.ab) : 0; }
export function era(s) { return s.ip > 0 ? (s.er * 9 / s.ip) : 0; }
export function fmtAvg(n) { return n.toFixed(3).replace(/^0/, ''); }
export function fmtEra(n) { return n.toFixed(2); }

export { CITIES, MASCOTS, FIRST_NAMES, LAST_NAMES, uid, randInt, pick };
