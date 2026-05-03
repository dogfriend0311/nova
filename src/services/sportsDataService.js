const _ORIGIN = process.env.NODE_ENV === 'production'
  ? '/espn-proxy'
  : 'https://site.api.espn.com';
const ESPN    = `${_ORIGIN}/apis/site/v2/sports`;
const ESPN_V2 = `${_ORIGIN}/apis/v2/sports`;
const ESPN_V3 = `${_ORIGIN}/apis/common/v3/sports`;

export const SPORT_PATHS = {
  mlb: 'baseball/mlb',
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  nhl: 'hockey/nhl',
  cfb: 'football/college-football',
  cbb: 'baseball/college-baseball',
};

const LEVEL3_SPORTS = ['mlb', 'nfl', 'nba', 'nhl'];

const DIV_LABELS = {
  ALE: 'AL East', ALC: 'AL Central', ALW: 'AL West',
  NLE: 'NL East', NLC: 'NL Central', NLW: 'NL West',
};

const apiFetch = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP_${r.status}`);
  return r.json();
};

export const fetchScoreboard  = (sport) =>
  apiFetch(`${ESPN}/${SPORT_PATHS[sport]}/scoreboard`);

export const fetchStandings   = (sport) => {
  const qs = LEVEL3_SPORTS.includes(sport) ? '?level=3' : '';
  return apiFetch(`${ESPN_V2}/${SPORT_PATHS[sport]}/standings${qs}`);
};

export const fetchNews        = (sport) =>
  apiFetch(`${ESPN}/${SPORT_PATHS[sport]}/news?limit=12`);

export const fetchGameSummary = (sport, eventId) =>
  apiFetch(`${ESPN}/${SPORT_PATHS[sport]}/summary?event=${eventId}`);

// Module-level cache so re-mounting the component doesn't re-fetch
const _athleteCache = {};

export const fetchAllAthletes = async (sport) => {
  if (_athleteCache[sport]) return _athleteCache[sport];
  const teamsData = await apiFetch(`${ESPN}/${SPORT_PATHS[sport]}/teams?limit=100`);
  const leagues   = teamsData.sports?.[0]?.leagues || [];
  const teams     = (leagues[0]?.teams || []).map(t => t.team || t).slice(0, 80);
  const leagueSlug = SPORT_PATHS[sport].split('/')[1];
  const rosterResults = await Promise.allSettled(
    teams.map(team =>
      apiFetch(`${ESPN}/${SPORT_PATHS[sport]}/teams/${team.id}/roster`)
        .then(data => (data.athletes || []).flatMap(group =>
          (group.items || []).map(a => ({
            id:          a.id,
            displayName: a.displayName || a.fullName,
            position:    a.position?.abbreviation || '',
            jersey:      a.jersey,
            teamName:    team.displayName,
            teamAbbrev:  team.abbreviation,
            headshotUrl: a.headshot?.href ||
              `https://a.espncdn.com/i/headshots/${leagueSlug}/players/full/${a.id}.png`,
          }))
        ))
        .catch(() => [])
    )
  );
  const athletes = rosterResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  _athleteCache[sport] = athletes;
  return athletes;
};

export const fetchAthleteProfile = (sport, athleteId) =>
  apiFetch(`${ESPN_V3}/${SPORT_PATHS[sport]}/athletes/${athleteId}`);

export const fetchAthleteStats = (sport, athleteId) =>
  apiFetch(`${ESPN_V3}/${SPORT_PATHS[sport]}/athletes/${athleteId}/stats`);

/* ── Normalizers ─────────────────────────────────────────────── */

export function normalizeGame(event) {
  if (!event?.competitions?.[0]) return null;
  const comp = event.competitions[0];
  const home = comp.competitors?.find((c) => c.homeAway === 'home');
  const away = comp.competitors?.find((c) => c.homeAway === 'away');
  const status = comp.status?.type;

  const mkTeam = (c) => ({
    abbr:      c?.team?.abbreviation || '?',
    name:      c?.team?.displayName  || '?',
    shortName: c?.team?.shortDisplayName || c?.team?.abbreviation || '?',
    logo:      c?.team?.logo         || null,
    score:     c?.score              || null,
    record:    c?.records?.[0]?.summary || null,
  });

  return {
    id:           event.id,
    status:       status?.state || 'pre',
    statusDetail: status?.shortDetail || '',
    homeTeam:     mkTeam(home),
    awayTeam:     mkTeam(away),
    broadcast:    comp.broadcasts?.[0]?.names?.[0] || null,
  };
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((e) => {
      const gs = (name) => e.stats?.find((s) => s.name === name);
      return {
        team:   e.team?.abbreviation || '?',
        name:   e.team?.displayName  || '?',
        logo:   e.team?.logos?.[0]?.href || e.team?.logo || null,
        wins:   +(gs('wins')?.value    ?? 0),
        losses: +(gs('losses')?.value  ?? 0),
        pct:    gs('winPercent')?.displayValue || '.000',
        gb:     gs('gamesBehind')?.displayValue || '—',
        streak: gs('streak')?.displayValue      || '—',
        record: gs('overall')?.displayValue     || null,
        home:   gs('Home')?.displayValue        || null,
        away:   gs('Road')?.displayValue        || null,
        pts:    gs('points')?.value             ?? null,
        otl:    gs('otLosses')?.value           ?? null,
      };
    })
    .sort((a, b) => b.wins - a.wins);
}

export function normalizeStandings(data) {
  if (!data?.children) return [];
  const result = [];
  for (const top of data.children) {
    if (top.children?.length) {
      for (const sub of top.children) {
        const label = DIV_LABELS[sub.abbreviation]
          || sub.name
          || `${top.abbreviation} ${sub.abbreviation}`;
        result.push({
          label,
          entries: normalizeEntries(sub.standings?.entries),
        });
      }
    } else if (top.standings?.entries) {
      result.push({
        label:   DIV_LABELS[top.abbreviation] || top.abbreviation || top.name,
        entries: normalizeEntries(top.standings.entries),
      });
    }
  }
  return result;
}

export function normalizeNews(data) {
  if (!Array.isArray(data?.articles)) return [];
  return data.articles.map((a) => ({
    id:          a.id || String(Math.random()),
    headline:    a.headline     || '',
    description: a.description  || '',
    byline:      a.byline       || '',
    published:   a.published    || null,
    image:       a.images?.[0]?.url || null,
    link:        a.links?.web?.href || null,
  }));
}

export function normalizeGameSummary(data) {
  if (!data) return null;
  const comp = data.header?.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === 'home');
  const away = comp?.competitors?.find(c => c.homeAway === 'away');

  // Line score — try linescore.lines first (MLB), fall back to scoring (NFL/NBA/NHL)
  let lineScore = null;
  if (data.linescore?.lines?.length) {
    lineScore = {
      periods: data.linescore.lines.map((l, i) => ({
        label: String(l.displayValue || i + 1),
        home:  l.homeValue ?? '—',
        away:  l.awayValue ?? '—',
      })),
      extras: data.linescore.runs
        ? [
            { label: 'R', home: data.linescore.runs?.home ?? '—', away: data.linescore.runs?.away ?? '—' },
            { label: 'H', home: data.linescore.hits?.home ?? '—', away: data.linescore.hits?.away ?? '—' },
            { label: 'E', home: data.linescore.errors?.home ?? '—', away: data.linescore.errors?.away ?? '—' },
          ]
        : [],
    };
  } else if (data.scoring?.length) {
    // Build period-by-period from scoring plays (take the last play per period)
    const byPeriod = {};
    for (const play of data.scoring) {
      const p = play.period?.number ?? play.period;
      byPeriod[p] = play;
    }
    lineScore = {
      periods: Object.entries(byPeriod).map(([p, play]) => ({
        label: String(p),
        home:  play.homeScore ?? '—',
        away:  play.awayScore ?? '—',
      })),
      extras: [],
    };
  }

  // Team stats comparison
  const teamStats = (data.boxscore?.teams || []).map(t => ({
    name:  t.team?.displayName || '?',
    abbr:  t.team?.abbreviation || '?',
    logo:  t.team?.logo || null,
    color: t.team?.color || null,
    stats: (t.statistics || []).map(s => ({
      label: s.displayName || s.name || '',
      value: s.displayValue || String(s.value ?? '—'),
    })),
  }));

  // Player stats by team
  const playerGroups = (data.boxscore?.players || []).map(g => ({
    teamName: g.team?.displayName || '?',
    categories: (g.statistics || [])
      .filter(cat => cat.athletes?.length > 0)
      .map(cat => ({
        name:     cat.displayName || cat.name || '',
        keys:     cat.keys || [],
        athletes: (cat.athletes || []).map(a => ({
          name:     a.athlete?.displayName || '?',
          photo:    a.athlete?.headshot?.href || null,
          position: a.athlete?.position?.abbreviation || '',
          stats:    a.stats || [],
          didNotPlay: a.didNotPlay || false,
        })).filter(a => !a.didNotPlay),
      }))
      .filter(cat => cat.athletes.length > 0),
  }));

  return {
    status:   comp?.status?.type?.description || '',
    home:     { name: home?.team?.displayName || '?', abbr: home?.team?.abbreviation || '?', logo: home?.team?.logo || null, score: home?.score || '0', record: home?.record?.[0]?.summary || null },
    away:     { name: away?.team?.displayName || '?', abbr: away?.team?.abbreviation || '?', logo: away?.team?.logo || null, score: away?.score || '0', record: away?.record?.[0]?.summary || null },
    lineScore,
    teamStats,
    playerGroups,
  };
}
