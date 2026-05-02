const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const mockData = {
  nfl: {
    games: [
      { matchup: 'KC Chiefs vs LAR Rams', score: '24 - 17' },
      { matchup: 'DAL Cowboys vs NYG Giants', score: '31 - 10' },
      { matchup: 'SF 49ers vs SEA Seahawks', score: '20 - 13' },
    ],
    date: today,
  },
  mlb: {
    games: [
      { matchup: 'NYY Yankees vs BOS Red Sox', score: '5 - 3' },
      { matchup: 'LAD Dodgers vs SF Giants', score: '7 - 2' },
      { matchup: 'HOU Astros vs TEX Rangers', score: '4 - 4' },
    ],
    date: today,
  },
  nba: {
    games: [
      { matchup: 'LAL Lakers vs GSW Warriors', score: '112 - 108' },
      { matchup: 'BOS Celtics vs MIA Heat', score: '99 - 95' },
      { matchup: 'MIL Bucks vs CHI Bulls', score: '120 - 101' },
    ],
    date: today,
  },
  nhl: {
    games: [
      { matchup: 'TOR Maple Leafs vs MTL Canadiens', score: '3 - 1' },
      { matchup: 'NYR Rangers vs PIT Penguins', score: '2 - 2' },
      { matchup: 'EDM Oilers vs CGY Flames', score: '4 - 3' },
    ],
    date: today,
  },
};

export const sportsService = {
  async getNFLScores() { return mockData.nfl; },
  async getMLBScores() { return mockData.mlb; },
  async getNBAScores() { return mockData.nba; },
  async getNHLScores() { return mockData.nhl; },

  async getMultipleSportsScores(leagues = ['nfl', 'mlb', 'nba', 'nhl']) {
    return leagues.reduce((acc, league) => {
      acc[league] = mockData[league.toLowerCase()] || { games: [] };
      return acc;
    }, {});
  },

  async getAllNews() {
    return { nfl: [], mlb: [], nba: [], nhl: [] };
  },
};

export default sportsService;
