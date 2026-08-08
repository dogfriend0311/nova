/**
 * sportsApi.js — Free, key-free client for ESPN's public JSON endpoints.
 * Uses Nova's Vercel serverless proxy in production because ESPN blocks
 * cross-origin requests from non-ESPN domains.
 */

const ESPN_SPORT_PATH = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
};

const DIRECT_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// On local development use ESPN directly. On Vercel use Nova's server-side
// proxy so browser CORS restrictions and ESPN rate-limit behavior do not break
// fantasy and pick'em data.
function buildUrl(url) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isDev = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' ||
                host.endsWith('.replit.dev') ||
                host.endsWith('.repl.co') ||
                host.endsWith('.replit.app');
  if (isDev) return url;
  return url.replace(DIRECT_BASE, '/espn-proxy/apis/site/v2/sports');
}

async function getJson(url) {
  const res = await fetch(buildUrl(url));
  if (!res.ok) throw new Error(`ESPN API ${res.status}: ${url}`);
  return res.json();
}

const sportsApi = {
  sports: Object.keys(ESPN_SPORT_PATH),

  /** All teams for a sport */
  async getTeams(sport) {
    const path = ESPN_SPORT_PATH[sport];
    if (!path) return [];
    const data = await getJson(`${DIRECT_BASE}/${path}/teams?limit=64`);
    const list = data?.sports?.[0]?.leagues?.[0]?.teams || [];
    return list.map(({ team }) => ({
      id: team.id,
      abbreviation: team.abbreviation,
      name: team.displayName,
      logo: team.logos?.[0]?.href || '',
    }));
  },

  /** Full roster for one team */
  async getTeamRoster(sport, teamId) {
    const path = ESPN_SPORT_PATH[sport];
    if (!path) return [];
    const data = await getJson(`${DIRECT_BASE}/${path}/teams/${teamId}/roster`);
    const groups = data?.athletes || [];
    const flat = [];
    groups.forEach(g => {
      const items = g.items || (Array.isArray(g) ? g : []);
      items.forEach(a => flat.push(a));
    });
    return flat.map(a => ({
      external_id: String(a.id),
      name: a.displayName || a.fullName,
      position: a.position?.abbreviation || a.position?.name || '',
      team_abbr: data?.team?.abbreviation || '',
      headshot_url: a.headshot?.href || '',
      status: a.status?.type || 'active',
    }));
  },

  /** Full player pool — all teams' rosters combined */
  async getFullPlayerPool(sport) {
    const teams = await this.getTeams(sport);
    const rosters = await Promise.all(
      teams.map(t => this.getTeamRoster(sport, t.id).catch(() => []))
    );
    return rosters.flat();
  },

  /** Scoreboard */
  async getScoreboard(sport, dateYYYYMMDD) {
    const path = ESPN_SPORT_PATH[sport];
    if (!path) return [];
    const q = dateYYYYMMDD ? `?dates=${dateYYYYMMDD}` : '';
    const data = await getJson(`${DIRECT_BASE}/${path}/scoreboard${q}`);
    const events = data?.events || [];
    return events.map(ev => {
      const comp = ev.competitions?.[0];
      const competitors = comp?.competitors || [];
      const home = competitors.find(c => c.homeAway === 'home');
      const away = competitors.find(c => c.homeAway === 'away');
      const statusType = comp?.status?.type?.name || '';
      let status = 'scheduled';
      if (statusType.includes('FINAL')) status = 'final';
      else if (comp?.status?.type?.state === 'in') status = 'live';
      let winner = null;
      if (status === 'final') {
        if (home?.winner) winner = 'home';
        else if (away?.winner) winner = 'away';
      }
      return {
        external_game_id: String(ev.id),
        sport,
        home_team: home?.team?.displayName || 'TBD',
        away_team: away?.team?.displayName || 'TBD',
        home_abbr: home?.team?.abbreviation || '',
        away_abbr: away?.team?.abbreviation || '',
        home_score: home?.score,
        away_score: away?.score,
        game_time: ev.date,
        status,
        winner,
      };
    });
  },
};

export default sportsApi;
