import axios from 'axios';

// Initialize API client
const apiClient = axios.create({
  baseURL: 'https://api.example-sports.com', // Replace with actual sports API
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.REACT_APP_SPORTS_API_KEY,
  },
});

// Sports Service
export const sportsService = {
  // NFL
  async getNFLScores(date = null) {
    try {
      // Format: YYYY-MM-DD or 'latest'
      const endpoint = date ? `/nfl/scores/${date}` : '/nfl/scores/latest';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching NFL scores:', error);
      return { error: error.message };
    }
  },

  async getNFLStats(teamId) {
    try {
      const response = await apiClient.get(`/nfl/teams/${teamId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NFL stats:', error);
      return { error: error.message };
    }
  },

  async getNFLStandings(season = null) {
    try {
      const endpoint = season ? `/nfl/standings/${season}` : '/nfl/standings/current';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching NFL standings:', error);
      return { error: error.message };
    }
  },

  async getNFLNews() {
    try {
      const response = await apiClient.get('/nfl/news');
      return response.data;
    } catch (error) {
      console.error('Error fetching NFL news:', error);
      return { error: error.message };
    }
  },

  // MLB
  async getMLBScores(date = null) {
    try {
      const endpoint = date ? `/mlb/scores/${date}` : '/mlb/scores/latest';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching MLB scores:', error);
      return { error: error.message };
    }
  },

  async getMLBStats(teamId) {
    try {
      const response = await apiClient.get(`/mlb/teams/${teamId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching MLB stats:', error);
      return { error: error.message };
    }
  },

  async getMLBStandings(season = null) {
    try {
      const endpoint = season ? `/mlb/standings/${season}` : '/mlb/standings/current';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching MLB standings:', error);
      return { error: error.message };
    }
  },

  async getMLBNews() {
    try {
      const response = await apiClient.get('/mlb/news');
      return response.data;
    } catch (error) {
      console.error('Error fetching MLB news:', error);
      return { error: error.message };
    }
  },

  // NBA
  async getNBAScores(date = null) {
    try {
      const endpoint = date ? `/nba/scores/${date}` : '/nba/scores/latest';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching NBA scores:', error);
      return { error: error.message };
    }
  },

  async getNBAStats(teamId) {
    try {
      const response = await apiClient.get(`/nba/teams/${teamId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NBA stats:', error);
      return { error: error.message };
    }
  },

  async getNBAStandings(season = null) {
    try {
      const endpoint = season ? `/nba/standings/${season}` : '/nba/standings/current';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching NBA standings:', error);
      return { error: error.message };
    }
  },

  async getNBANews() {
    try {
      const response = await apiClient.get('/nba/news');
      return response.data;
    } catch (error) {
      console.error('Error fetching NBA news:', error);
      return { error: error.message };
    }
  },

  // NHL
  async getNHLScores(date = null) {
    try {
      const endpoint = date ? `/nhl/scores/${date}` : '/nhl/scores/latest';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching NHL scores:', error);
      return { error: error.message };
    }
  },

  async getNHLStats(teamId) {
    try {
      const response = await apiClient.get(`/nhl/teams/${teamId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NHL stats:', error);
      return { error: error.message };
    }
  },

  async getNHLStandings(season = null) {
    try {
      const endpoint = season ? `/nhl/standings/${season}` : '/nhl/standings/current';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching NHL standings:', error);
      return { error: error.message };
    }
  },

  async getNHLNews() {
    try {
      const response = await apiClient.get('/nhl/news');
      return response.data;
    } catch (error) {
      console.error('Error fetching NHL news:', error);
      return { error: error.message };
    }
  },

  // Combined functionality
  async getMultipleSportsScores(leagues = ['nfl', 'mlb', 'nba', 'nhl'], date = null) {
    try {
      const requests = leagues.map((league) => {
        const leagueLower = league.toLowerCase();
        return this[`get${leagueLower.toUpperCase()}Scores`](date);
      });

      const results = await Promise.all(requests);
      return results.reduce((acc, result, index) => {
        acc[leagues[index]] = result;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching multiple sports scores:', error);
      return { error: error.message };
    }
  },

  async getAllNews() {
    try {
      const requests = [
        this.getNFLNews(),
        this.getMLBNews(),
        this.getNBANews(),
        this.getNHLNews(),
      ];

      const [nflNews, mlbNews, nbaNews, nhlNews] = await Promise.all(requests);
      return {
        nfl: nflNews,
        mlb: mlbNews,
        nba: nbaNews,
        nhl: nhlNews,
      };
    } catch (error) {
      console.error('Error fetching all sports news:', error);
      return { error: error.message };
    }
  },

  // Upcoming games
  async getUpcomingGames(days = 7) {
    try {
      const response = await apiClient.get(`/games/upcoming?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      return { error: error.message };
    }
  },

  // Player stats (example)
  async getPlayerStats(playerId, league) {
    try {
      const response = await apiClient.get(`/${league}/players/${playerId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return { error: error.message };
    }
  },
};

export default sportsService;
