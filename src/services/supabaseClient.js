import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase configuration is missing. Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const supabaseHelpers = {
  // Authentication
  async signUp(email, password) {
    return await supabase.auth.signUp({ email, password });
  },

  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  // Database operations - Members
  async getMembers(limit = 50) {
    return await supabase.from('members').select('*').limit(limit);
  },

  async getMemberById(id) {
    return await supabase.from('members').select('*').eq('id', id).single();
  },

  async createMember(data) {
    return await supabase.from('members').insert([data]);
  },

  async updateMember(id, data) {
    return await supabase.from('members').update(data).eq('id', id);
  },

  // Gaming clips
  async getGamingClips(memberId, limit = 20) {
    return await supabase
      .from('gaming_clips')
      .select('*')
      .eq('member_id', memberId)
      .limit(limit);
  },

  async createGamingClip(data) {
    return await supabase.from('gaming_clips').insert([data]);
  },

  async deleteGamingClip(id) {
    return await supabase.from('gaming_clips').delete().eq('id', id);
  },

  // Favorite songs
  async getFavoriteSongs(memberId, limit = 20) {
    return await supabase
      .from('favorite_songs')
      .select('*')
      .eq('member_id', memberId)
      .limit(limit);
  },

  async addFavoriteSong(data) {
    return await supabase.from('favorite_songs').insert([data]);
  },

  async removeFavoriteSong(id) {
    return await supabase.from('favorite_songs').delete().eq('id', id);
  },

  // Sports stats
  async getSportsStats(league, limit = 50) {
    return await supabase
      .from('sports_stats')
      .select('*')
      .eq('league', league)
      .limit(limit);
  },

  async getGameScores(league, date) {
    return await supabase
      .from('scores')
      .select('*')
      .eq('league', league)
      .eq('game_date', date);
  },

  async updateGameScore(id, data) {
    return await supabase.from('scores').update(data).eq('id', id);
  },

  // Roblox stats
  async getRobloxStats(userId) {
    return await supabase
      .from('roblox_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
  },

  async getRobloxLeaderboard(limit = 100) {
    return await supabase
      .from('roblox_stats')
      .select('*')
      .order('league_rank', { ascending: true })
      .limit(limit);
  },

  async updateRobloxStats(userId, data) {
    return await supabase
      .from('roblox_stats')
      .update(data)
      .eq('user_id', userId);
  },

  // Real-time subscriptions
  subscribeToScores(league, callback) {
    return supabase
      .channel(`scores:${league}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `league=eq.${league}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToMembers(callback) {
    return supabase
      .channel('members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
        },
        callback
      )
      .subscribe();
  },

  subscribeToMemberActivity(memberId, callback) {
    return supabase
      .channel(`member:${memberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gaming_clips',
          filter: `member_id=eq.${memberId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorite_songs',
          filter: `member_id=eq.${memberId}`,
        },
        callback
      )
      .subscribe();
  },

  // Unsubscribe
  unsubscribe(channel) {
    return supabase.removeChannel(channel);
  },
};

export default supabase;
