import axios from 'axios';

// Roblox API client
const robloxClient = axios.create({
  baseURL: 'https://api.roblox.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom endpoint for league stats (if using a custom backend service)
const leagueClient = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.REACT_APP_ROBLOX_API_KEY,
  },
});

export const robloxService = {
  // Get user info
  async getUserInfo(userId) {
    try {
      const response = await robloxClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Roblox user info:', error);
      return { error: error.message };
    }
  },

  async getUserByUsername(username) {
    try {
      const response = await robloxClient.post('/users/search', {
        keyword: username,
        limit: 1,
      });
      return response.data;
    } catch (error) {
      console.error('Error searching for Roblox user:', error);
      return { error: error.message };
    }
  },

  // Get user avatar
  async getUserAvatar(userId) {
    try {
      const response = await robloxClient.get(`/users/${userId}/avatar`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user avatar:', error);
      return { error: error.message };
    }
  },

  // Get user presence
  async getUserPresence(userId) {
    try {
      const response = await robloxClient.get(`/users/${userId}/presence`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user presence:', error);
      return { error: error.message };
    }
  },

  // League-specific methods
  async getLeagueStats(userId) {
    try {
      const response = await leagueClient.get(`/roblox/league-stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching league stats:', error);
      return { error: error.message };
    }
  },

  async getLeagueRanking(userId) {
    try {
      const response = await leagueClient.get(
        `/roblox/league-ranking/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching league ranking:', error);
      return { error: error.message };
    }
  },

  async getLeaderboard(limit = 100, offset = 0) {
    try {
      const response = await leagueClient.get(
        `/roblox/leaderboard?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return { error: error.message };
    }
  },

  async getLeagueSeasonStats(userId, seasonId) {
    try {
      const response = await leagueClient.get(
        `/roblox/league-stats/${userId}/season/${seasonId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching season stats:', error);
      return { error: error.message };
    }
  },

  async getTeamStats(teamId) {
    try {
      const response = await leagueClient.get(`/roblox/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return { error: error.message };
    }
  },

  async getTeamMembers(teamId) {
    try {
      const response = await leagueClient.get(
        `/roblox/teams/${teamId}/members`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching team members:', error);
      return { error: error.message };
    }
  },

  async getSchedule(teamId) {
    try {
      const response = await leagueClient.get(
        `/roblox/teams/${teamId}/schedule`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return { error: error.message };
    }
  },

  async getMatchHistory(userId, limit = 10) {
    try {
      const response = await leagueClient.get(
        `/roblox/match-history/${userId}?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching match history:', error);
      return { error: error.message };
    }
  },

  async getMatchDetails(matchId) {
    try {
      const response = await leagueClient.get(`/roblox/matches/${matchId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching match details:', error);
      return { error: error.message };
    }
  },

  async getAchievements(userId) {
    try {
      const response = await leagueClient.get(
        `/roblox/achievements/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return { error: error.message };
    }
  },

  async getPlayerStats(userId) {
    try {
      const response = await leagueClient.get(`/roblox/player-stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return { error: error.message };
    }
  },

  async getMultipleUsers(userIds) {
    try {
      const response = await robloxClient.post('/users', {
        userIds: userIds,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching multiple users:', error);
      return { error: error.message };
    }
  },

  async getGroupInfo(groupId) {
    try {
      const response = await robloxClient.get(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching group info:', error);
      return { error: error.message };
    }
  },

  async getGroupMembers(groupId, limit = 50) {
    try {
      const response = await robloxClient.get(
        `/groups/${groupId}/users?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching group members:', error);
      return { error: error.message };
    }
  },

  // Watch list operations
  async addToWatchlist(userId) {
    try {
      const response = await leagueClient.post(`/roblox/watchlist`, {
        userId: userId,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return { error: error.message };
    }
  },

  async removeFromWatchlist(userId) {
    try {
      const response = await leagueClient.delete(
        `/roblox/watchlist/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { error: error.message };
    }
  },

  async getWatchlist(limit = 20) {
    try {
      const response = await leagueClient.get(
        `/roblox/watchlist?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return { error: error.message };
    }
  },
};

export default robloxService;
