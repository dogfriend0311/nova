const BASE = 'https://api.sportsdata.io/v3';

const todayDate = () => {
  const d = new Date();
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${d.getFullYear()}-${M[d.getMonth()]}-${String(d.getDate()).padStart(2,'0')}`;
};

const getSeasonYear = (sport) => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  if (sport === 'mlb') return y;
  return m < 9 ? y - 1 : y;
};

const apiFetch = async (url) => {
  const key = process.env.REACT_APP_SPORTSDATA_KEY;
  if (!key) throw new Error('NO_KEY');
  const res = await fetch(`${url}?key=${key}`);
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
};

export const api = {
  mlb: {
    scores:    () => apiFetch(`${BASE}/mlb/scores/json/ScoresByDate/${todayDate()}`),
    standings: () => apiFetch(`${BASE}/mlb/scores/json/Standings/${getSeasonYear('mlb')}`),
    stats:     () => apiFetch(`${BASE}/mlb/stats/json/PlayerSeasonStats/${getSeasonYear('mlb')}`),
  },
  nfl: {
    scores:    (week) => apiFetch(`${BASE}/nfl/scores/json/ScoresByWeek/${getSeasonYear('nfl')}/${week || 1}`),
    currentSeason: () => apiFetch(`${BASE}/nfl/scores/json/CurrentSeason`),
    standings: () => apiFetch(`${BASE}/nfl/scores/json/Standings/${getSeasonYear('nfl')}`),
    stats:     () => apiFetch(`${BASE}/nfl/stats/json/PlayerSeasonStats/${getSeasonYear('nfl')}`),
  },
  nba: {
    scores:    () => apiFetch(`${BASE}/nba/scores/json/GamesByDate/${todayDate()}`),
    standings: () => apiFetch(`${BASE}/nba/scores/json/Standings/${getSeasonYear('nba')}`),
    stats:     () => apiFetch(`${BASE}/nba/stats/json/PlayerSeasonStats/${getSeasonYear('nba')}`),
  },
  nhl: {
    scores:    () => apiFetch(`${BASE}/nhl/scores/json/GamesByDate/${todayDate()}`),
    standings: () => apiFetch(`${BASE}/nhl/scores/json/Standings/${getSeasonYear('nhl')}`),
    stats:     () => apiFetch(`${BASE}/nhl/stats/json/PlayerSeasonStats/${getSeasonYear('nhl')}`),
  },
  cfb: {
    scores:    (week) => apiFetch(`${BASE}/cfb/scores/json/GamesByWeek/${getSeasonYear('cfb')}/${week || 1}`),
    currentSeason: () => apiFetch(`${BASE}/cfb/scores/json/CurrentSeason`),
    standings: () => apiFetch(`${BASE}/cfb/scores/json/Standings/${getSeasonYear('cfb')}`),
    stats:     () => apiFetch(`${BASE}/cfb/stats/json/PlayerSeasonStats/${getSeasonYear('cfb')}`),
  },
};

export const hasKey = () => !!process.env.REACT_APP_SPORTSDATA_KEY;
export { getSeasonYear, todayDate };

function normalizeGame(sport, g) {
  const base = {
    id: g.GameID || g.GameKey || g.ScoreID || String(Math.random()),
    status: g.Status || 'Scheduled',
    time: g.DateTime || g.Date || null,
    channel: g.Channel || null,
  };
  switch (sport) {
    case 'mlb':
      return {
        ...base,
        homeTeam: g.HomeTeam, awayTeam: g.AwayTeam,
        homeTeamName: g.HomeTeamName || g.HomeTeam,
        awayTeamName: g.AwayTeamName || g.AwayTeam,
        homeScore: g.HomeTeamRuns, awayScore: g.AwayTeamRuns,
        periodInfo: g.Status === 'InProgress'
          ? `${g.InningHalf || ''} ${g.Inning || ''}`.trim()
          : null,
      };
    case 'nfl':
      return {
        ...base,
        homeTeam: g.HomeTeam, awayTeam: g.AwayTeam,
        homeTeamName: g.HomeTeam, awayTeamName: g.AwayTeam,
        homeScore: g.HomeScore, awayScore: g.AwayScore,
        periodInfo: g.Status === 'InProgress'
          ? `Q${g.Quarter} ${g.TimeRemaining || ''}`.trim()
          : null,
      };
    case 'nba':
      return {
        ...base,
        homeTeam: g.HomeTeam, awayTeam: g.AwayTeam,
        homeTeamName: g.HomeTeamName || g.HomeTeam,
        awayTeamName: g.AwayTeamName || g.AwayTeam,
        homeScore: g.HomeTeamScore, awayScore: g.AwayTeamScore,
        periodInfo: g.Status === 'InProgress'
          ? `Q${g.Quarter} ${g.TimeRemainingMinutes}:${String(g.TimeRemainingSeconds || 0).padStart(2, '0')}`
          : null,
      };
    case 'nhl':
      return {
        ...base,
        homeTeam: g.HomeTeam, awayTeam: g.AwayTeam,
        homeTeamName: g.HomeTeamName || g.HomeTeam,
        awayTeamName: g.AwayTeamName || g.AwayTeam,
        homeScore: g.HomeTeamScore, awayScore: g.AwayTeamScore,
        periodInfo: g.Status === 'InProgress'
          ? `P${g.Period} ${g.TimeRemainingMinutes}:${String(g.TimeRemainingSeconds || 0).padStart(2, '0')}`
          : null,
      };
    case 'cfb':
      return {
        ...base,
        homeTeam: g.HomeTeam, awayTeam: g.AwayTeam,
        homeTeamName: g.HomeTeamName || g.HomeTeam,
        awayTeamName: g.AwayTeamName || g.AwayTeam,
        homeScore: g.HomeTeamScore, awayScore: g.AwayTeamScore,
        periodInfo: g.Status === 'InProgress'
          ? `Q${g.Period || ''} ${g.TimeRemainingMinutes}:${String(g.TimeRemainingSeconds || 0).padStart(2, '0')}`
          : null,
      };
    default:
      return base;
  }
}

function normalizeStandings(sport, data) {
  if (!Array.isArray(data)) return {};
  const grouped = {};
  data.forEach((s) => {
    let divKey;
    switch (sport) {
      case 'mlb': divKey = s.Division || 'League'; break;
      case 'nfl': divKey = `${s.Conference} — ${s.Division}`; break;
      case 'nba': divKey = `${s.Conference} — ${s.Division}`; break;
      case 'nhl': divKey = `${s.Conference} — ${s.Division}`; break;
      case 'cfb': divKey = s.Conference || 'Independent'; break;
      default: divKey = 'Standings';
    }
    if (!grouped[divKey]) grouped[divKey] = [];
    grouped[divKey].push({
      team: s.Team || s.Key || s.TeamID,
      name: s.Name || s.Team,
      city: s.City || '',
      wins: s.Wins ?? 0,
      losses: s.Losses ?? 0,
      ties: s.Ties ?? 0,
      pct: s.Percentage || s.WinPercentage || 0,
      gb: s.GamesBack,
      pts: s.Points,
      streak: s.StreakDescription || s.Streak || '',
      home: s.HomeWins != null ? `${s.HomeWins}-${s.HomeLosses}` : null,
      away: s.AwayWins != null ? `${s.AwayWins}-${s.AwayLosses}` : null,
    });
  });
  Object.values(grouped).forEach((div) =>
    div.sort((a, b) => (b.wins || 0) - (a.wins || 0))
  );
  return grouped;
}

function normalizeStats(sport, data) {
  if (!Array.isArray(data)) return {};
  switch (sport) {
    case 'mlb': {
      const hitters = [...data]
        .filter((p) => (p.AtBats || 0) > 30)
        .sort((a, b) => (b.HomeRuns || 0) - (a.HomeRuns || 0))
        .slice(0, 10)
        .map((p) => ({
          name: `${p.FirstName} ${p.LastName}`,
          team: p.Team,
          stat: p.HomeRuns ?? 0,
          statLabel: 'HR',
          sub: `${(p.BattingAverage || 0).toFixed(3)} AVG · ${p.RunsBattedIn ?? 0} RBI`,
        }));
      const pitchers = [...data]
        .filter((p) => (p.InningsPitchedDecimal || 0) > 15)
        .sort((a, b) => (b.PitchingStrikeouts || 0) - (a.PitchingStrikeouts || 0))
        .slice(0, 10)
        .map((p) => ({
          name: `${p.FirstName} ${p.LastName}`,
          team: p.Team,
          stat: p.PitchingStrikeouts ?? 0,
          statLabel: 'SO',
          sub: `${(p.EarnedRunAverage || 0).toFixed(2)} ERA · ${p.Wins ?? 0}W`,
        }));
      return { 'HR Leaders': hitters, 'Strikeout Leaders': pitchers };
    }
    case 'nfl': {
      const passers = [...data]
        .filter((p) => (p.PassingYards || 0) > 100)
        .sort((a, b) => (b.PassingYards || 0) - (a.PassingYards || 0))
        .slice(0, 10)
        .map((p) => ({
          name: p.Name,
          team: p.Team,
          stat: p.PassingYards ?? 0,
          statLabel: 'PASS YDS',
          sub: `${p.PassingTouchdowns ?? 0} TD · ${p.PassingInterceptions ?? 0} INT`,
        }));
      const rushers = [...data]
        .filter((p) => (p.RushingYards || 0) > 50)
        .sort((a, b) => (b.RushingYards || 0) - (a.RushingYards || 0))
        .slice(0, 10)
        .map((p) => ({
          name: p.Name,
          team: p.Team,
          stat: p.RushingYards ?? 0,
          statLabel: 'RUSH YDS',
          sub: `${p.RushingTouchdowns ?? 0} TD`,
        }));
      return { 'Passing Leaders': passers, 'Rushing Leaders': rushers };
    }
    case 'nba': {
      const scorers = [...data]
        .filter((p) => (p.Games || 0) > 5)
        .sort((a, b) => (b.PointsPerGame || 0) - (a.PointsPerGame || 0))
        .slice(0, 10)
        .map((p) => ({
          name: `${p.FirstName} ${p.LastName}`,
          team: p.Team,
          stat: (p.PointsPerGame || 0).toFixed(1),
          statLabel: 'PPG',
          sub: `${(p.AssistsPerGame || 0).toFixed(1)} APG · ${(p.ReboundsPerGame || 0).toFixed(1)} RPG`,
        }));
      return { 'Scoring Leaders': scorers };
    }
    case 'nhl': {
      const scorers = [...data]
        .filter((p) => (p.Games || 0) > 5)
        .sort((a, b) => (b.Points || 0) - (a.Points || 0))
        .slice(0, 10)
        .map((p) => ({
          name: `${p.FirstName} ${p.LastName}`,
          team: p.Team,
          stat: p.Points ?? 0,
          statLabel: 'PTS',
          sub: `${p.Goals ?? 0} G · ${p.Assists ?? 0} A`,
        }));
      return { 'Points Leaders': scorers };
    }
    case 'cfb': {
      const passers = [...data]
        .filter((p) => (p.PassingYards || 0) > 100)
        .sort((a, b) => (b.PassingYards || 0) - (a.PassingYards || 0))
        .slice(0, 10)
        .map((p) => ({
          name: p.Name,
          team: p.Team,
          stat: p.PassingYards ?? 0,
          statLabel: 'PASS YDS',
          sub: `${p.PassingTouchdowns ?? 0} TD`,
        }));
      return { 'Passing Leaders': passers };
    }
    default:
      return {};
  }
}

export { normalizeGame, normalizeStandings, normalizeStats };
