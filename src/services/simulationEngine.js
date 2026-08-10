// Advanced baseball simulation engine for Nova.
// Deterministic inputs + randomized plate-appearance outcomes.
// Designed to be expanded into full-season / franchise simulation.

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const random = () => Math.random();

const normalRandom = () => {
  let u = 0;
  let v = 0;

  while (u === 0) u = random();
  while (v === 0) v = random();

  return Math.sqrt(-2 * Math.log(u)) *
    Math.cos(2 * Math.PI * v);
};

const weightedChoice = (items) => {
  const total = items.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  let roll = random() * total;

  for (const item of items) {
    roll -= item.weight;

    if (roll <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
};

export const DEFAULT_BATTER = {
  contact: 65,
  power: 60,
  discipline: 60,
  speed: 55,
  defense: 55
};

export const DEFAULT_PITCHER = {
  stuff: 65,
  control: 60,
  movement: 60,
  stamina: 75,
  velocity: 93
};

export function normalizeBatter(player = {}) {
  return {
    ...DEFAULT_BATTER,
    ...player,
    contact: clamp(player.contact ?? 65, 1, 99),
    power: clamp(player.power ?? 60, 1, 99),
    discipline: clamp(player.discipline ?? 60, 1, 99),
    speed: clamp(player.speed ?? 55, 1, 99),
    defense: clamp(player.defense ?? 55, 1, 99)
  };
}

export function normalizePitcher(player = {}) {
  return {
    ...DEFAULT_PITCHER,
    ...player,
    stuff: clamp(player.stuff ?? 65, 1, 99),
    control: clamp(player.control ?? 60, 1, 99),
    movement: clamp(player.movement ?? 60, 1, 99),
    stamina: clamp(player.stamina ?? 75, 1, 99),
    velocity: clamp(player.velocity ?? 93, 70, 105)
  };
}

function fatigueFactor(pitcher, pitchCount) {
  const stamina = pitcher.stamina;

  const threshold =
    65 + stamina * 0.45;

  if (pitchCount <= threshold) {
    return 1;
  }

  const excess =
    pitchCount - threshold;

  return clamp(
    1 - excess / 100,
    0.72,
    1
  );
}

function calculatePitcherEffect(
  pitcher,
  pitchCount
) {
  const fatigue =
    fatigueFactor(pitcher, pitchCount);

  return {
    stuff: pitcher.stuff * fatigue,
    control: pitcher.control * fatigue,
    movement: pitcher.movement * fatigue,
    velocity:
      pitcher.velocity -
      (1 - fatigue) * 7
  };
}

function calculateContactScore(
  batter,
  pitcher
) {
  const contact =
    batter.contact * 0.58;

  const discipline =
    batter.discipline * 0.12;

  const pitcherStuff =
    pitcher.stuff * 0.18;

  const movement =
    pitcher.movement * 0.12;

  return (
    contact +
    discipline -
    pitcherStuff * 0.45 -
    movement * 0.25
  );
}

function calculatePowerScore(
  batter,
  pitcher,
  launchAngle
) {
  const base =
    batter.power * 0.7 -
    pitcher.movement * 0.2;

  const angleBonus =
    launchAngle >= 15 &&
    launchAngle <= 32
      ? 12
      : 0;

  return base + angleBonus;
}

function generateExitVelocity(
  batter,
  pitcher
) {
  const base =
    72 +
    batter.power * 0.25 +
    normalRandom() * 5;

  const pitcherEffect =
    (pitcher.velocity - 90) * 0.08;

  return clamp(
    base - pitcherEffect,
    55,
    115
  );
}

function generateLaunchAngle() {
  return clamp(
    12 + normalRandom() * 18,
    -25,
    55
  );
}

function determinePitchType() {
  return weightedChoice([
    { value: '4-Seam', weight: 36 },
    { value: 'Sinker', weight: 16 },
    { value: 'Slider', weight: 18 },
    { value: 'Curveball', weight: 10 },
    { value: 'Changeup', weight: 12 },
    { value: 'Cutter', weight: 8 }
  ]);
}

function pitchVelocity(
  pitcher,
  pitchType
) {
  const modifiers = {
    '4-Seam': 1,
    Sinker: -1.5,
    Slider: -3,
    Curveball: -7,
    Changeup: -8,
    Cutter: -2
  };

  return (
    pitcher.velocity +
    (modifiers[pitchType] || 0) +
    normalRandom() * 1.8
  );
}

function chooseOutcome(
  batter,
  pitcher,
  pitchCount
) {
  const effectivePitcher =
    calculatePitcherEffect(
      pitcher,
      pitchCount
    );

  const contactScore =
    calculateContactScore(
      batter,
      effectivePitcher
    );

  const powerScore =
    calculatePowerScore(
      batter,
      effectivePitcher,
      22
    );

  const control =
    effectivePitcher.control;

  const discipline =
    batter.discipline;

  const walkChance =
    0.055 +
    (discipline - control) *
      0.0018;

  const strikeoutChance =
    0.17 +
    (effectivePitcher.stuff -
      batter.contact) *
      0.0024;

  const homerChance =
    0.018 +
    (powerScore - 55) *
      0.0012;

  const hitChance =
    0.20 +
    (contactScore - 40) *
      0.002;

  const roll = random();

  if (
    roll <
    clamp(
      walkChance,
      0.02,
      0.18
    )
  ) {
    return 'BB';
  }

  if (
    roll <
    clamp(
      walkChance + strikeoutChance,
      0.12,
      0.42
    )
  ) {
    return 'K';
  }

  if (
    roll <
    clamp(
      walkChance +
        strikeoutChance +
        homerChance,
      0.14,
      0.48
    )
  ) {
    return 'HR';
  }

  if (
    roll <
    clamp(
      walkChance +
        strikeoutChance +
        homerChance +
        hitChance,
      0.30,
      0.65
    )
  ) {
    const doubleChance =
      batter.power * 0.003;

    const tripleChance =
      batter.speed * 0.001;

    const hitRoll = random();

    if (hitRoll < tripleChance) {
      return '3B';
    }

    if (
      hitRoll <
      tripleChance + doubleChance
    ) {
      return '2B';
    }

    return '1B';
  }

  return 'OUT';
}

function createEmptyBases() {
  return [null, null, null];
}

function advanceRunners(
  bases,
  outcome,
  batter,
  battingTeam
) {
  const runs = [];

  const next = [
    null,
    null,
    null
  ];

  if (outcome === 'HR') {
    for (const runner of bases) {
      if (runner) {
        runs.push({
          player: runner,
          team: battingTeam
        });
      }
    }

    runs.push({
      player: batter,
      team: battingTeam
    });

    return {
      bases: next,
      runs
    };
  }

  if (outcome === '3B') {
    for (const runner of bases) {
      if (runner) {
        runs.push({
          player: runner,
          team: battingTeam
        });
      }
    }

    next[2] = batter;

    return {
      bases: next,
      runs
    };
  }

  if (outcome === '2B') {
    if (bases[2]) {
      runs.push({
        player: bases[2],
        team: battingTeam
      });
    }

    if (bases[1]) {
      runs.push({
        player: bases[1],
        team: battingTeam
      });
    }

    next[1] = batter;

    if (bases[0]) {
      next[2] = bases[0];
    }

    return {
      bases: next,
      runs
    };
  }

  if (outcome === '1B') {
    if (bases[2]) {
      runs.push({
        player: bases[2],
        team: battingTeam
      });
    }

    if (bases[1]) {
      next[2] = bases[1];
    }

    if (bases[0]) {
      next[1] = bases[0];
    }

    next[0] = batter;

    return {
      bases: next,
      runs
    };
  }

  return {
    bases,
    runs
  };
}

function createLineup(team = {}) {
  if (
    Array.isArray(team.lineup) &&
    team.lineup.length
  ) {
    return team.lineup.map(
      normalizeBatter
    );
  }

  return Array.from(
    { length: 9 },
    (_, index) => ({
      ...DEFAULT_BATTER,
      id: `${team.id || 'team'}-batter-${index + 1}`,
      name: `Batter ${index + 1}`
    })
  );
}

export function createGameState(
  homeTeam,
  awayTeam,
  options = {}
) {
  const innings =
    options.innings || 9;

  return {
    id:
      options.id ||
      `game_${Date.now()}`,

    status: 'scheduled',

    inning: 1,
    half: 'top',

    maxInnings: innings,

    home: {
      ...homeTeam,
      lineup: createLineup(
        homeTeam
      ),
      score: 0,
      hits: 0,
      errors: 0
    },

    away: {
      ...awayTeam,
      lineup: createLineup(
        awayTeam
      ),
      score: 0,
      hits: 0,
      errors: 0
    },

    outs: 0,

    bases: createEmptyBases(),

    pitchCount: {
      home: 0,
      away: 0
    },

    battingIndex: {
      home: 0,
      away: 0
    },

    pitcher: {
      home:
        normalizePitcher(
          homeTeam.startingPitcher
        ),
      away:
        normalizePitcher(
          awayTeam.startingPitcher
        )
    },

    linescore: [],

    playByPlay: [],

    battingStats: {},

    pitchingStats: {},

    startedAt: null,

    completedAt: null
  };
}

function getCurrentTeam(
  state
) {
  return state.half === 'top'
    ? state.away
    : state.home;
}

function getFieldingTeam(
  state
) {
  return state.half === 'top'
    ? state.home
    : state.away;
}

function getCurrentBatter(
  state
) {
  const team =
    getCurrentTeam(state);

  const index =
    state.battingIndex[
      team.id
    ] || 0;

  return team.lineup[index];
}

function recordBattingStat(
  state,
  batter,
  key,
  amount = 1
) {
  if (!batter) return;

  if (!state.battingStats[batter.id]) {
    state.battingStats[
      batter.id
    ] = {
      id: batter.id,
      name: batter.name,
      AB: 0,
      H: 0,
      HR: 0,
      RBI: 0,
      BB: 0,
      K: 0,
      R: 0
    };
  }

  state.battingStats[
    batter.id
  ][key] += amount;
}

function recordPitchingStat(
  state,
  pitcher,
  key,
  amount = 1
) {
  if (!pitcher) return;

  const id =
    pitcher.id ||
    pitcher.name ||
    'pitcher';

  if (!state.pitchingStats[id]) {
    state.pitchingStats[id] = {
      id,
      name:
        pitcher.name ||
        'Pitcher',
      IP: 0,
      H: 0,
      R: 0,
      ER: 0,
      BB: 0,
      K: 0,
      HR: 0,
      P: 0
    };
  }

  state.pitchingStats[id][
    key
  ] += amount;
}

export function simulatePlateAppearance(
  state
) {
  const battingTeam =
    getCurrentTeam(state);

  const fieldingTeam =
    getFieldingTeam(state);

  const batter =
    getCurrentBatter(state);

  const pitcher =
    state.pitcher[
      fieldingTeam.id
    ];

  const pitchType =
    determinePitchType();

  const velocity =
    pitchVelocity(
      pitcher,
      pitchType
    );

  const pitchCount =
    state.pitchCount[
      fieldingTeam.id
    ];

  const outcome =
    chooseOutcome(
      batter,
      pitcher,
      pitchCount
    );

  const launchAngle =
    outcome === 'BB' ||
    outcome === 'K'
      ? null
      : generateLaunchAngle();

  const exitVelocity =
    outcome === 'BB' ||
    outcome === 'K'
      ? null
      : generateExitVelocity(
          batter,
          pitcher
        );

  state.pitchCount[
    fieldingTeam.id
  ] +=
    outcome === 'BB' ||
    outcome === 'K'
      ? 4
      : 3;

  recordPitchingStat(
    state,
    pitcher,
    'P',
    outcome === 'BB' ||
      outcome === 'K'
      ? 4
      : 3
  );

  const event = {
    inning: state.inning,
    half: state.half,
    batter:
      batter?.name ||
      'Unknown Batter',
    pitcher:
      pitcher?.name ||
      'Unknown Pitcher',
    pitchType,
    velocity:
      Math.round(
        velocity * 10
      ) / 10,
    outcome,
    exitVelocity:
      exitVelocity == null
        ? null
        : Math.round(
            exitVelocity * 10
          ) / 10,
    launchAngle:
      launchAngle == null
        ? null
        : Math.round(
            launchAngle * 10
          ) / 10
  };

  if (outcome === 'BB') {
    recordBattingStat(
      state,
      batter,
      'BB'
    );

    recordPitchingStat(
      state,
      pitcher,
      'BB'
    );
  } else {
    recordBattingStat(
      state,
      batter,
      'AB'
    );
  }

  if (outcome === 'K') {
    state.outs += 1;

    recordBattingStat(
      state,
      batter,
      'K'
    );

    recordPitchingStat(
      state,
      pitcher,
      'K'
    );
  } else if (
    ['1B', '2B', '3B', 'HR'].includes(
      outcome
    )
  ) {
    recordBattingStat(
      state,
      batter,
      'H'
    );

    state[
      battingTeam.id ===
      state.home.id
        ? 'home'
        : 'away'
    ].hits += 1;

    if (outcome === 'HR') {
      recordBattingStat(
        state,
        batter,
        'HR'
      );

      recordPitchingStat(
        state,
        pitcher,
        'HR'
      );
    }

    const advancement =
      advanceRunners(
        state.bases,
        outcome,
        batter,
        battingTeam.id
      );

    state.bases =
      advancement.bases;

    for (const run of advancement.runs) {
      battingTeam.score += 1;

      recordBattingStat(
        state,
        run.player,
        'R'
      );

      recordBattingStat(
        state,
        batter,
        'RBI'
      );

      recordPitchingStat(
        state,
        pitcher,
        'R'
      );
    }
  } else if (outcome === 'OUT') {
    state.outs += 1;
  }

  state.playByPlay.push(
    event
  );

  state.battingIndex[
    battingTeam.id
  ] =
    (state.battingIndex[
      battingTeam.id
    ] +
      1) %
    battingTeam.lineup.length;

  return event;
}

function recordLineScore(
  state
) {
  if (!state.linescore[
    state.inning - 1
  ]) {
    state.linescore[
      state.inning - 1
    ] = {
      inning: state.inning,
      away: 0,
      home: 0
    };
  }

  const inning =
    state.linescore[
      state.inning - 1
    ];

  inning[
    state.half === 'top'
      ? 'away'
      : 'home'
  ] =
    getCurrentTeam(state).score -
    state.linescore
      .slice(0, state.inning - 1)
      .reduce(
        (
          sum,
          row
        ) =>
          sum +
          row[
            state.half === 'top'
              ? 'away'
              : 'home'
          ],
        0
      );
}

function advanceHalfInning(
  state
) {
  recordLineScore(state);

  state.outs = 0;

  state.bases =
    createEmptyBases();

  if (state.half === 'top') {
    state.half = 'bottom';
  } else {
    state.half = 'top';
    state.inning += 1;
  }
}

function shouldEndGame(
  state
) {
  if (
    state.inning <=
    state.maxInnings
  ) {
    return false;
  }

  return (
    state.home.score !==
    state.away.score
  );
}

export function simulateNextPlay(
  state
) {
  if (
    state.status ===
    'final'
  ) {
    return state;
  }

  state.status = 'live';

  simulatePlateAppearance(
    state
  );

  if (
    state.half ===
      'bottom' &&
    state.inning >=
      state.maxInnings &&
    state.home.score >
      state.away.score
  ) {
    state.status = 'final';
    state.completedAt =
      new Date().toISOString();

    return state;
  }

  if (state.outs >= 3) {
    advanceHalfInning(
      state
    );
  }

  if (
    shouldEndGame(state)
  ) {
    state.status = 'final';
    state.completedAt =
      new Date().toISOString();
  }

  return state;
}

export function simulateGame(
  homeTeam,
  awayTeam,
  options = {}
) {
  const state =
    createGameState(
      homeTeam,
      awayTeam,
      options
    );

  state.status = 'live';

  while (
    state.status !==
    'final'
  ) {
    simulateNextPlay(
      state
    );
  }

  return state;
}

export function calculateBattingLine(
  stats = {}
) {
  const AB =
    stats.AB || 0;

  const H =
    stats.H || 0;

  const BB =
    stats.BB || 0;

  const HR =
    stats.HR || 0;

  const avg =
    AB > 0
      ? H / AB
      : 0;

  const obpDenom =
    AB + BB;

  const obp =
    obpDenom > 0
      ? (H + BB) /
        obpDenom
      : 0;

  const singles =
    Math.max(
      H -
        (stats['2B'] || 0) -
        (stats['3B'] || 0) -
        HR,
      0
    );

  const totalBases =
    singles +
    (stats['2B'] || 0) * 2 +
    (stats['3B'] || 0) * 3 +
    HR * 4;

  const slg =
    AB > 0
      ? totalBases / AB
      : 0;

  return {
    ...stats,
    AVG: avg,
    OBP: obp,
    SLG: slg,
    OPS: obp + slg
  };
}

export function calculatePitchingLine(
  stats = {}
) {
  const IP =
    stats.IP || 0;

  const ER =
    stats.ER || 0;

  const H =
    stats.H || 0;

  const BB =
    stats.BB || 0;

  const K =
    stats.K || 0;

  const HR =
    stats.HR || 0;

  return {
    ...stats,

    ERA:
      IP > 0
        ? (ER * 9) / IP
        : 0,

    WHIP:
      IP > 0
        ? (BB + H) / IP
        : 0,

    K9:
      IP > 0
        ? (K * 9) / IP
        : 0,

    BB9:
      IP > 0
        ? (BB * 9) / IP
        : 0,

    HR9:
      IP > 0
        ? (HR * 9) / IP
        : 0
  };
}

export default {
  createGameState,
  simulatePlateAppearance,
  simulateNextPlay,
  simulateGame,
  calculateBattingLine,
  calculatePitchingLine,
  normalizeBatter,
  normalizePitcher
};
