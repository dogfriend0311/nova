/**
 * Supabase Sync Service
 * Handles all Supabase data synchronization for NABB data
 */

import { supabase } from './supabase';

export const supabaseSync = {
  /**
   * Get all NABB teams
   */
  async getNABBTeams() {
    try {
      const { data, error } = await supabase
        .from('nabb_teams')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching NABB teams:', error);
      return [];
    }
  },

  /**
   * Add a new NABB team
   */
  async addNABBTeam(teamData) {
    try {
      const { data, error } = await supabase
        .from('nabb_teams')
        .insert([teamData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding NABB team:', error);
      throw error;
    }
  },

  /**
   * Update a NABB team
   */
  async updateNABBTeam(teamId, updates) {
    try {
      const { data, error } = await supabase
        .from('nabb_teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating NABB team:', error);
      throw error;
    }
  },

  /**
   * Delete a NABB team
   */
  async deleteNABBTeam(teamId) {
    try {
      const { error } = await supabase
        .from('nabb_teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting NABB team:', error);
      throw error;
    }
  },

  /**
   * Get NABB players
   */
  async getNABBPlayers() {
    try {
      const { data, error } = await supabase
        .from('nabb_players')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching NABB players:', error);
      return [];
    }
  },

  /**
   * Add a NABB player
   */
  async addNABBPlayer(playerData) {
    try {
      const { data, error } = await supabase
        .from('nabb_players')
        .insert([playerData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding NABB player:', error);
      throw error;
    }
  },

  /**
   * Update a NABB player
   */
  async updateNABBPlayer(playerId, updates) {
    try {
      const { data, error } = await supabase
        .from('nabb_players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating NABB player:', error);
      throw error;
    }
  },

  /**
   * Delete a NABB player
   */
  async deleteNABBPlayer(playerId) {
    try {
      const { error } = await supabase
        .from('nabb_players')
        .delete()
        .eq('id', playerId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting NABB player:', error);
      throw error;
    }
  },

  /**
   * Get member profiles
   */
  async getMemberProfiles() {
    try {
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching member profiles:', error);
      return [];
    }
  },

  /**
   * Update member profile
   */
  async updateMemberProfile(username, updates) {
    try {
      const { data, error } = await supabase
        .from('member_profiles')
        .update(updates)
        .eq('username', username)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating member profile:', error);
      throw error;
    }
  }
};
