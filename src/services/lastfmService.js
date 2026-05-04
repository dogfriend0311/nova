/**
 * Last.fm Service
 * Handles all Last.fm API interactions for music stats
 */

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const API_KEY = process.env.REACT_APP_LASTFM_KEY;
const API_SECRET = process.env.REACT_APP_LASTFM_SECRET;

export const lastfmService = {
  /**
   * Get user's top tracks
   */
  async getTopTracks(username, limit = 10) {
    try {
      const response = await fetch(
        `${LASTFM_API_URL}?method=user.gettoptracks&user=${username}&limit=${limit}&api_key=${API_KEY}&format=json`
      );
      const data = await response.json();
      return data.toptracks?.track || [];
    } catch (error) {
      console.error('Error fetching top tracks:', error);
      return [];
    }
  },

  /**
   * Get user's top artists
   */
  async getTopArtists(username, limit = 10) {
    try {
      const response = await fetch(
        `${LASTFM_API_URL}?method=user.gettopartists&user=${username}&limit=${limit}&api_key=${API_KEY}&format=json`
      );
      const data = await response.json();
      return data.topartists?.artist || [];
    } catch (error) {
      console.error('Error fetching top artists:', error);
      return [];
    }
  },

  /**
   * Get user info
   */
  async getUserInfo(username) {
    try {
      const response = await fetch(
        `${LASTFM_API_URL}?method=user.getinfo&user=${username}&api_key=${API_KEY}&format=json`
      );
      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  },

  /**
   * Get recent tracks
   */
  async getRecentTracks(username, limit = 20) {
    try {
      const response = await fetch(
        `${LASTFM_API_URL}?method=user.getrecenttracks&user=${username}&limit=${limit}&api_key=${API_KEY}&format=json`
      );
      const data = await response.json();
      return data.recenttracks?.track || [];
    } catch (error) {
      console.error('Error fetching recent tracks:', error);
      return [];
    }
  }
};
