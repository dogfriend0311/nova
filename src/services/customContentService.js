const STORAGE_KEY =
  'nova_baseball_custom_packs';

export const CONTENT_FORMAT =
  'nova-baseball-pack';

export const CONTENT_VERSION = 1;

export const DEFAULT_CONTENT_PACK = {
  format: CONTENT_FORMAT,

  version:
    CONTENT_VERSION,

  name:
    'My Baseball Universe',

  description:
    'Custom Nova Baseball league',

  league: {
    name:
      'My League',

    season: 2026,

    innings: 9,

    teams: []
  },

  teams: [],

  stadiums: [],

  players: [],

  schedules: [],

  settings: {
    designatedHitter: true,

    extraInnings: true,

    runnerOnSecondInExtras: false,

    mercyRule: false
  }
};

export const CONTENT_PACK_TEMPLATE =
  DEFAULT_CONTENT_PACK;

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function isObject(value) {
  return (
    value !== null &&
    typeof value ===
      'object' &&
    !Array.isArray(value)
  );
}

function cleanString(
  value,
  fallback = ''
) {
  if (
    typeof value !==
    'string'
  ) {
    return fallback;
  }

  return value.trim() ||
    fallback;
}

function number(
  value,
  fallback
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}

function normalizePlayer(
  player = {},
  index = 0
) {
  const position =
    cleanString(
      player.position,
      'UTIL'
    );

  const isPitcher =
    position === 'P' ||
    position === 'SP' ||
    position === 'RP';

  return {
    ...player,

    id:
      cleanString(
        player.id,
        `player-${index + 1}`
      ),

    name:
      cleanString(
        player.name ||
          player.fullName,
        `Player ${index + 1}`
      ),

    position,

    number:
      number(
        player.number,
        index + 1
      ),

    ...(isPitcher
      ? {
          stuff:
            number(
              player.stuff,
              65
            ),
          control:
            number(
              player.control,
              60
            ),
          movement:
            number(
              player.movement,
              60
            ),
          stamina:
            number(
              player.stamina,
              75
            ),
          velocity:
            number(
              player.velocity,
              93
            )
        }
      : {
          contact:
            number(
              player.contact,
              65
            ),
          power:
            number(
              player.power,
              60
            ),
          discipline:
            number(
              player.discipline,
              60
            ),
          speed:
            number(
              player.speed,
              55
            ),
          defense:
            number(
              player.defense,
              55
            )
        })
  };
}

function normalizeStadium(
  stadium = {},
  index = 0
) {
  return {
    ...stadium,

    id:
      cleanString(
        stadium.id,
        `stadium-${index + 1}`
      ),

    name:
      cleanString(
        stadium.name,
        `Stadium ${index + 1}`
      ),

    city:
      cleanString(
        stadium.city,
        'Unknown City'
      ),

    capacity:
      number(
        stadium.capacity,
        30000
      ),

    wallLeft:
      number(
        stadium.wallLeft,
        330
      ),

    wallCenter:
      number(
        stadium.wallCenter,
        400
      ),

    wallRight:
      number(
        stadium.wallRight,
        330
      )
  };
}

function normalizeTeam(
  team = {},
  index = 0
) {
  const roster =
    Array.isArray(
      team.roster
    )
      ? team.roster
      : [];

  return {
    ...team,

    id:
      cleanString(
        team.id,
        `team-${index + 1}`
      ),

    name:
      cleanString(
        team.name,
        `Team ${index + 1}`
      ),

    abbreviation:
      cleanString(
        team.abbreviation,
        `T${index + 1}`
          .slice(0, 3)
          .toUpperCase()
      ),

    city:
      cleanString(
        team.city,
        ''
      ),

    primaryColor:
      cleanString(
        team.primaryColor,
        '#2d6cdf'
      ),

    secondaryColor:
      cleanString(
        team.secondaryColor,
        '#ffffff'
      ),

    logo:
      cleanString(
        team.logo,
        ''
      ),

    stadiumId:
      cleanString(
        team.stadiumId,
        ''
      ),

    roster:
      roster.map(
        normalizePlayer
      )
  };
}

export function validateContentPack(
  pack
) {
  const errors = [];

  if (!isObject(pack)) {
    errors.push(
      'The file must contain a JSON object.'
    );

    return {
      valid: false,
      errors
    };
  }

  if (
    pack.format !==
    CONTENT_FORMAT
  ) {
    errors.push(
      `Invalid format. Expected "${CONTENT_FORMAT}".`
    );
  }

  if (
    Number(pack.version) !==
    CONTENT_VERSION
  ) {
    errors.push(
      `Unsupported content version. Expected ${CONTENT_VERSION}.`
    );
  }

  if (
    !Array.isArray(
      pack.teams
    )
  ) {
    errors.push(
      'The pack must contain a teams array.'
    );
  }

  if (
    !Array.isArray(
      pack.stadiums
    )
  ) {
    errors.push(
      'The pack must contain a stadiums array.'
    );
  }

  if (
    pack.league &&
    !isObject(pack.league)
  ) {
    errors.push(
      'league must be an object.'
    );
  }

  return {
    valid:
      errors.length === 0,
    errors
  };
}

export function normalizeContentPack(
  source = {}
) {
  const pack = {
    ...clone(
      DEFAULT_CONTENT_PACK
    ),
    ...clone(source)
  };

  pack.name =
    cleanString(
      pack.name,
      DEFAULT_CONTENT_PACK.name
    );

  pack.description =
    cleanString(
      pack.description,
      DEFAULT_CONTENT_PACK.description
    );

  pack.league = {
    ...DEFAULT_CONTENT_PACK.league,
    ...(isObject(pack.league)
      ? pack.league
      : {})
  };

  pack.league.name =
    cleanString(
      pack.league.name,
      'My League'
    );

  pack.league.season =
    number(
      pack.league.season,
      2026
    );

  pack.league.innings =
    number(
      pack.league.innings,
      9
    );

  pack.teams =
    (
      Array.isArray(
        pack.teams
      )
        ? pack.teams
        : []
    ).map(
      normalizeTeam
    );

  pack.stadiums =
    (
      Array.isArray(
        pack.stadiums
      )
        ? pack.stadiums
        : []
    ).map(
      normalizeStadium
    );

  pack.players =
    (
      Array.isArray(
        pack.players
      )
        ? pack.players
        : []
    ).map(
      normalizePlayer
    );

  pack.schedules =
    Array.isArray(
      pack.schedules
    )
      ? pack.schedules
      : [];

  pack.settings = {
    ...DEFAULT_CONTENT_PACK.settings,
    ...(isObject(
      pack.settings
    )
      ? pack.settings
      : {})
  };

  return pack;
}

export function createContentPack(
  overrides = {}
) {
  return normalizeContentPack({
    ...clone(
      DEFAULT_CONTENT_PACK
    ),
    ...overrides
  });
}

export function serializeContentPack(
  pack
) {
  const normalized =
    normalizeContentPack(
      pack
    );

  return JSON.stringify(
    normalized,
    null,
    2
  );
}

export function parseContentPack(
  text
) {
  let parsed;

  try {
    parsed =
      JSON.parse(text);
  } catch (error) {
    throw new Error(
      'The content file is not valid JSON.'
    );
  }

  const validation =
    validateContentPack(
      parsed
    );

  if (!validation.valid) {
    throw new Error(
      validation.errors.join(
        '\n'
      )
    );
  }

  return normalizeContentPack(
    parsed
  );
}

export function saveContentPack(
  pack
) {
  const normalized =
    normalizeContentPack(
      pack
    );

  const existing =
    getContentPacks();

  const index =
    existing.findIndex(
      (item) =>
        item.name ===
        normalized.name
    );

  if (index >= 0) {
    existing[index] =
      normalized;
  } else {
    existing.push(
      normalized
    );
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      existing
    )
  );

  return normalized;
}

export function getContentPacks() {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.map(
      normalizeContentPack
    );
  } catch {
    return [];
  }
}

export function listPacks() {
  return getContentPacks();
}

export function flattenPlayers(pack) {
  const normalized =
    normalizeContentPack(pack);

  const teamPlayers =
    normalized.teams.flatMap(
      (team) =>
        (team.roster || []).map(
          (player) => ({
            ...player,
            teamId: team.id,
            teamName: team.name,
            teamAbbreviation:
              team.abbreviation
          })
        )
    );

  const standalonePlayers =
    normalized.players || [];

  const seen = new Set();
  const players = [];

  for (const player of [
    ...teamPlayers,
    ...standalonePlayers
  ]) {
    const id =
      player.id ||
      `${player.teamId || 'free-agent'}-${player.name}`;

    if (seen.has(id)) continue;

    seen.add(id);

    players.push({
      ...player,
      id
    });
  }

  return players;
}

export function getContentPack(
  name
) {
  return (
    getContentPacks().find(
      (pack) =>
        pack.name ===
        name
    ) || null
  );
}

export function deleteContentPack(
  name
) {
  const remaining =
    getContentPacks().filter(
      (pack) =>
        pack.name !==
        name
    );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      remaining
    )
  );

  return remaining;
}

export function exportContentPack(
  pack
) {
  const normalized =
    normalizeContentPack(
      pack
    );

  const text =
    serializeContentPack(
      normalized
    );

  const blob =
    new Blob(
      [text],
      {
        type:
          'application/json'
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      'a'
    );

  const safeName =
    normalized.name
      .replace(
        /[^a-z0-9-_]+/gi,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      )
      .toLowerCase() ||
    'nova-baseball-pack';

  anchor.href = url;

  anchor.download =
    `${safeName}.json`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(
    url
  );

  return normalized;
}

export async function importContentFile(
  file
) {
  if (!file) {
    throw new Error(
      'No file was selected.'
    );
  }

  const text =
    await file.text();

  const pack =
    parseContentPack(
      text
    );

  saveContentPack(
    pack
  );

  return pack;
}

export function downloadContentTemplate() {
  exportContentPack(
    createContentPack()
  );
}

export function getTeamById(
  pack,
  teamId
) {
  const normalized =
    normalizeContentPack(
      pack
    );

  return (
    normalized.teams.find(
      (team) =>
        team.id ===
        teamId
    ) || null
  );
}

export function getStadiumById(
  pack,
  stadiumId
) {
  const normalized =
    normalizeContentPack(
      pack
    );

  return (
    normalized.stadiums.find(
      (stadium) =>
        stadium.id ===
        stadiumId
    ) || null
  );
}

export function getRoster(
  pack,
  teamId
) {
  const team =
    getTeamById(
      pack,
      teamId
    );

  return team?.roster || [];
}

export function getStartingPitcher(
  pack,
  teamId
) {
  const roster =
    getRoster(
      pack,
      teamId
    );

  return (
    roster.find(
      (player) =>
        player.position ===
          'SP' ||
        player.position ===
          'P'
    ) ||
    roster.find(
      (player) =>
        player.stuff !==
          undefined ||
        player.velocity !==
          undefined
    ) ||
    null
  );
}

export function getStartingLineup(
  pack,
  teamId
) {
  const roster =
    getRoster(
      pack,
      teamId
    );

  const hitters =
    roster.filter(
      (player) =>
        player.position !==
          'P' &&
        player.position !==
          'SP' &&
        player.position !==
          'RP'
    );

  return hitters.slice(
    0,
    9
  );
}

export function createSamplePack() {
  return createContentPack({
    name:
      'Nova Baseball Demo',

    description:
      'Sample custom baseball universe',

    league: {
      name:
        'Nova Baseball League',

      season: 2026,

      innings: 9
    },

    stadiums: [
      {
        id:
          'nova-field',

        name:
          'Nova Field',

        city:
          'Nova City',

        capacity:
          32000,

        wallLeft:
          330,

        wallCenter:
          400,

        wallRight:
          330
      }
    ],

    teams: [
      {
        id:
          'nova',

        name:
          'Nova Bears',

        city:
          'Nova City',

        abbreviation:
          'NVB',

        primaryColor:
          '#7c3aed',

        secondaryColor:
          '#ffffff',

        stadiumId:
          'nova-field',

        roster: [
          {
            id:
              'nova-001',

            name:
              'Mike Carter',

            position:
              'SS',

            contact:
              82,

            power:
              76,

            discipline:
              78,

            speed:
              84,

            defense:
              81
          },

          {
            id:
              'nova-002',

            name:
              'Jake Wilson',

            position:
              'CF',

            contact:
              76,

            power:
              72,

            discipline:
              70,

            speed:
              91,

            defense:
              87
          },

          {
            id:
              'nova-003',

            name:
              'Alex Rivera',

            position:
              'P',

            stuff:
              88,

            control:
              82,

            movement:
              85,

            stamina:
              91,

            velocity:
              97
          }
        ]
      }
    ]
  });
}

export default {
  CONTENT_FORMAT,
  CONTENT_VERSION,
  DEFAULT_CONTENT_PACK,
  CONTENT_PACK_TEMPLATE,
  createContentPack,
  createSamplePack,
  validateContentPack,
  normalizeContentPack,
  serializeContentPack,
  parseContentPack,
  saveContentPack,
  getContentPacks,
  listPacks,
  flattenPlayers,
  getContentPack,
  deleteContentPack,
  exportContentPack,
  importContentFile,
  downloadContentTemplate,
  getTeamById,
  getStadiumById,
  getRoster,
  getStartingPitcher,
  getStartingLineup
};
