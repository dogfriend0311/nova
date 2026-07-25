/**
 * db.js — Universal data service
 * Tries Supabase first (cross-device). Falls back to localStorage if
 * Supabase isn't configured yet so the site still works locally.
 */
import { supabase } from './supabaseClient';

const hasSupabase = () => !!(
  process.env.REACT_APP_SUPABASE_URL &&
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

/* ── Generic localStorage helpers ─────────────────────────────── */
const ls = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

/* ── League data (teams, players, games, etc.) ────────────────── */
export const db = {

  /* TEAMS */
  async getTeams(league) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_teams').select('*').eq('league', league).order('created_at');
      if (!error) return data;
    }
    return ls.get(`${league}_teams`);
  },

  async saveTeam(league, team) {
    const isNew = !team.id;
    const record = { ...team, league, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();

    if (hasSupabase()) {
      if (isNew) {
        delete record.id;
        const { data, error } = await supabase.from('nova_teams').insert([record]).select();
        if (!error) { _syncLs(league, 'teams', data[0], 'add'); return data[0]; }
      } else {
        const { data, error } = await supabase.from('nova_teams')
          .update({ ...record, id: undefined }).eq('id', team.id).select();
        if (!error) { _syncLs(league, 'teams', data[0], 'update'); return data[0]; }
      }
    }
    const list = ls.get(`${league}_teams`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_teams`, [...list, newItem]);
      return newItem;
    } else {
      const updated = list.map(t => t.id === team.id ? { ...t, ...record } : t);
      ls.set(`${league}_teams`, updated);
      return record;
    }
  },

  async deleteTeam(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_teams').delete().eq('id', id);
    }
    ls.set(`${league}_teams`, ls.get(`${league}_teams`).filter(t => t.id !== id));
  },

  /* PLAYERS */
  async getPlayers(league) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_players').select('*').eq('league', league).order('player_name');
      if (!error) return data;
    }
    return ls.get(`${league}_players`);
  },

  async savePlayer(league, player) {
    const isNew = !player.id;
    const record = { ...player, league, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();

    if (hasSupabase()) {
      if (isNew) {
        delete record.id;
        const { data, error } = await supabase.from('nova_players').insert([record]).select();
        if (!error) { _syncLs(league, 'players', data[0], 'add'); return data[0]; }
      } else {
        const updateRecord = { ...record };
        delete updateRecord.id;
        const { data, error } = await supabase.from('nova_players')
          .update(updateRecord).eq('id', player.id).select();
        if (!error) { _syncLs(league, 'players', data[0], 'update'); return data[0]; }
      }
    }
    const list = ls.get(`${league}_players`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_players`, [...list, newItem]);
      return newItem;
    } else {
      const updated = list.map(p => p.id === player.id ? { ...p, ...record } : p);
      ls.set(`${league}_players`, updated);
      return record;
    }
  },

  async deletePlayer(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_players').delete().eq('id', id);
    }
    ls.set(`${league}_players`, ls.get(`${league}_players`).filter(p => p.id !== id));
  },

  /* GAMES */
  async getGames(league) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_games').select('*').eq('league', league).order('game_date', { ascending: false });
      if (!error) return data;
    }
    return ls.get(`${league}_games`);
  },

  async saveGame(league, game) {
    const isNew = !game.id;
    const record = { ...game, league, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();

    if (hasSupabase()) {
      if (isNew) {
        delete record.id;
        const { data, error } = await supabase.from('nova_games').insert([record]).select();
        if (!error) { _syncLs(league, 'games', data[0], 'add'); return data[0]; }
      } else {
        const { data, error } = await supabase.from('nova_games')
          .update({ ...record, id: undefined }).eq('id', game.id).select();
        if (!error) { _syncLs(league, 'games', data[0], 'update'); return data[0]; }
      }
    }
    const list = ls.get(`${league}_games`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_games`, [...list, newItem]);
      return newItem;
    } else {
      const updated = list.map(g => g.id === game.id ? { ...g, ...record } : g);
      ls.set(`${league}_games`, updated);
      return record;
    }
  },

  async deleteGame(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_games').delete().eq('id', id);
    }
    ls.set(`${league}_games`, ls.get(`${league}_games`).filter(g => g.id !== id));
  },

  /* BOX SCORE GAMES */
  async getBsGames(league) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_bs_games').select('*').eq('league', league).order('created_at', { ascending: false });
      if (!error) return data;
    }
    return ls.get(`${league}_bs_games`);
  },

  async saveBsGame(league, game) {
    const isNew = !game.id;
    const record = { ...game, league, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();
    if (hasSupabase()) {
      if (isNew) {
        delete record.id;
        const { data, error } = await supabase.from('nova_bs_games').insert([record]).select();
        if (!error) { _syncLs(league, 'bs_games', data[0], 'add'); return data[0]; }
      } else {
        const { data, error } = await supabase.from('nova_bs_games').update({ ...record, id: undefined }).eq('id', game.id).select();
        if (!error) { _syncLs(league, 'bs_games', data[0], 'update'); return data[0]; }
      }
    }
    const list = ls.get(`${league}_bs_games`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_bs_games`, [...list, newItem]);
      return newItem;
    } else {
      const updated = list.map(g => g.id === game.id ? { ...g, ...record } : g);
      ls.set(`${league}_bs_games`, updated);
      return record;
    }
  },

  async deleteBsGame(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_bs_games').delete().eq('id', id);
      await supabase.from('nova_box_scores').delete().eq('game_id', id);
    }
    ls.set(`${league}_bs_games`, ls.get(`${league}_bs_games`).filter(g => g.id !== id));
    ls.set(`${league}_box_scores`, ls.get(`${league}_box_scores`).filter(b => b.game_id !== id));
  },

  /* BOX SCORES */
  async getBoxScores(league, gameId) {
    if (hasSupabase()) {
      let q = supabase.from('nova_box_scores').select('*').eq('league', league);
      if (gameId) q = q.eq('game_id', gameId);
      const { data, error } = await q;
      if (!error) return data;
    }
    const all = ls.get(`${league}_box_scores`);
    return gameId ? all.filter(b => b.game_id === gameId) : all;
  },

  async saveBoxScore(league, score) {
    const isNew = !score.id;
    const record = { ...score, league };
    if (hasSupabase()) {
      if (isNew) {
        delete record.id;
        const { data, error } = await supabase.from('nova_box_scores').insert([record]).select();
        if (!error) { _syncLs(league, 'box_scores', data[0], 'add'); return data[0]; }
      } else {
        const { data, error } = await supabase.from('nova_box_scores').update({ ...record, id: undefined }).eq('id', score.id).select();
        if (!error) { _syncLs(league, 'box_scores', data[0], 'update'); return data[0]; }
      }
    }
    const list = ls.get(`${league}_box_scores`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_box_scores`, [...list, newItem]);
      return newItem;
    } else {
      const updated = list.map(b => b.id === score.id ? { ...b, ...record } : b);
      ls.set(`${league}_box_scores`, updated);
      return record;
    }
  },

  /* GAME FEED */
  async getFeed(league, gameId) {
    if (hasSupabase()) {
      let q = supabase.from('nova_game_feed').select('*').eq('league', league);
      if (gameId) q = q.eq('game_id', gameId);
      const { data, error } = await q.order('created_at');
      if (!error) return data;
    }
    const all = ls.get(`${league}_feed`);
    return gameId ? all.filter(f => f.game_id === gameId) : all;
  },

  async addFeedEvent(league, event) {
    const record = { ...event, league, created_at: new Date().toISOString() };
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_game_feed').insert([record]).select();
      if (!error) { _syncLs(league, 'feed', data[0], 'add'); return data[0]; }
    }
    const list = ls.get(`${league}_feed`);
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(`${league}_feed`, [...list, newItem]);
    return newItem;
  },

  async deleteFeedEvent(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_game_feed').delete().eq('id', id);
    }
    ls.set(`${league}_feed`, ls.get(`${league}_feed`).filter(f => f.id !== id));
  },

  async updateFeedEvent(league, id, updates) {
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_game_feed').update(updates).eq('id', id).select();
      if (!error) { _syncLs(league, 'feed', data[0], 'update'); return data[0]; }
    }
    const list = ls.get(`${league}_feed`);
    const updated = list.map(f => f.id === id ? { ...f, ...updates } : f);
    ls.set(`${league}_feed`, updated);
    return updated.find(f => f.id === id);
  },

  /* HALL OF FAME */
  async getHof(league) {
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_hof').select('*').eq('league', league);
      if (!error) return data;
    }
    return ls.get(`${league}_hof`);
  },

  async addHof(league, member) {
    const record = { ...member, league, created_at: new Date().toISOString() };
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_hof').insert([record]).select();
      if (!error) { _syncLs(league, 'hof', data[0], 'add'); return data[0]; }
    }
    const list = ls.get(`${league}_hof`);
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(`${league}_hof`, [...list, newItem]);
    return newItem;
  },

  async deleteHof(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_hof').delete().eq('id', id);
    }
    ls.set(`${league}_hof`, ls.get(`${league}_hof`).filter(m => m.id !== id));
  },

  /* WATCHLIST */
  async getWatchlist(username) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_watchlist').select('*').eq('username', username).order('updated_at', { ascending: false });
      if (!error) return data;
    }
    const all = JSON.parse(localStorage.getItem('nova_watchlists') || '{}');
    return all[username] || [];
  },

  async saveWatchlist(username, list) {
    if (hasSupabase()) {
      await supabase.from('nova_watchlist').delete().eq('username', username);
      if (list.length > 0) {
        const records = list.map(item => ({ ...item, username, updated_at: new Date().toISOString() }));
        await supabase.from('nova_watchlist').insert(records);
      }
    }
    const all = JSON.parse(localStorage.getItem('nova_watchlists') || '{}');
    all[username] = list;
    localStorage.setItem('nova_watchlists', JSON.stringify(all));
  },

  /* MEMBER PROFILES */
  async getMemberProfiles() {
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_member_profiles').select('*');
      if (!error) return data;
    }
    return ls.get('member_profiles');
  },

  async saveMemberProfile(profile) {
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_member_profiles')
        .upsert([{ ...profile, updated_at: new Date().toISOString() }], { onConflict: 'username' })
        .select();
      if (!error) {
        const list = ls.get('member_profiles');
        const exists = list.findIndex(p => p.username === profile.username);
        if (exists >= 0) list[exists] = { ...list[exists], ...profile };
        else list.push(profile);
        ls.set('member_profiles', list);
        return data[0];
      }
      // Supabase save failed — log it and still cache locally so the editor
      // doesn't lose their edits, but tell the caller it didn't really save
      // (this used to fail silently, which is why background/audio uploads
      // could appear to work in the editor but never show up for visitors).
      console.error('saveMemberProfile: Supabase upsert failed —', error.message, error);
      const list = ls.get('member_profiles');
      const exists = list.findIndex(p => p.username === profile.username);
      if (exists >= 0) list[exists] = { ...list[exists], ...profile };
      else list.push(profile);
      ls.set('member_profiles', list);
      const err = new Error(error.message || 'Failed to save profile to Supabase');
      err.supabaseError = error;
      throw err;
    }
    const list = ls.get('member_profiles');
    const exists = list.findIndex(p => p.username === profile.username);
    if (exists >= 0) list[exists] = { ...list[exists], ...profile };
    else list.push(profile);
    ls.set('member_profiles', list);
    return profile;
  },

  /* USERS / ROLES */
  async getUsers() {
    try {
      const { data, error } = await supabase.from('nova_users').select('username,role,created_at,last_seen').order('created_at');
      if (!error && data) return data;
    } catch {}
    return JSON.parse(localStorage.getItem('nova_users') || '[]');
  },

  /**
   * Verify a username/password pair against Supabase nova_users.
   * Returns { username, role } on match, null otherwise.
   * Used as a cross-device fallback in AuthContext when the account was
   * created on a different device and isn't in local localStorage.
   */
  async checkCredential(username, password) {
    try {
      const { data, error } = await supabase
        .from('nova_users')
        .select('username,role')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();
      if (!error && data) return data;
    } catch {}
    return null;
  },

  async saveUser(user) {
    try {
      // Include password when provided so cross-device login works.
      // Requires: ALTER TABLE nova_users ADD COLUMN IF NOT EXISTS password TEXT;
      const record = { username: user.username, role: user.role || 'member' };
      if (user.password) record.password = user.password;
      await supabase.from('nova_users').upsert([record], { onConflict: 'username' });
    } catch {}
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const idx = users.findIndex(u => u.username === user.username);
    if (idx >= 0) {
      // Update role (and anything else passed) on the existing entry rather
      // than silently keeping a stale role if one was already stored.
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem('nova_users', JSON.stringify(users));
  },

  async updateUserRole(username, role) {
    try {
      await supabase.from('nova_users').update({ role }).eq('username', username);
    } catch {}
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const idx = users.findIndex(u => u.username === username);
    if (idx >= 0) { users[idx].role = role; localStorage.setItem('nova_users', JSON.stringify(users)); }
  },

  /* ── ONLINE PRESENCE (cross-device) ──────────────────────────
     Heartbeat writes last_seen to Supabase every 30s while logged in.
     getOnlineUsers() reads everyone whose last_seen is within the
     last 5 minutes, so you can see which of your friends are online
     from any device — not just yourself in localStorage.          */
  async updateLastSeen(username) {
    if (!username) return;
    try {
      await supabase.from('nova_users').update({ last_seen: new Date().toISOString() }).eq('username', username);
    } catch {}
    // Keep a local fallback too
    const online = JSON.parse(localStorage.getItem('nova_online') || '{}');
    online[username] = Date.now();
    localStorage.setItem('nova_online', JSON.stringify(online));
  },

  async getOnlineUsers() {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    if (hasSupabase()) {
      try {
        const cutoff = new Date(fiveMinAgo).toISOString();
        const { data, error } = await supabase
          .from('nova_users')
          .select('username,last_seen')
          .gte('last_seen', cutoff);
        if (!error && data) return data.map(u => u.username);
      } catch {}
    }
    // localStorage fallback — only reflects this device
    const online = JSON.parse(localStorage.getItem('nova_online') || '{}');
    return Object.entries(online).filter(([, ts]) => ts > fiveMinAgo).map(([u]) => u);
  },

  /* ── PLAYER OF THE MONTH AWARDS ───────────────────────────────
     Permanent trophy-case entries for a player's stat page. Multiple
     awards can stack over a career (e.g. one per month won).         */
  async getPotmAwards(league, playerId) {
    if (hasSupabase()) {
      let q = supabase.from('nova_potm_awards').select('*').eq('league', league);
      if (playerId) q = q.eq('player_id', String(playerId));
      const { data, error } = await q.order('created_at', { ascending: false });
      if (!error) return data;
    }
    const all = ls.get(`${league}_potm_awards`);
    return playerId ? all.filter(a => String(a.player_id) === String(playerId)) : all;
  },

  async addPotmAward(league, award) {
    const record = { ...award, league, player_id: String(award.player_id), created_at: new Date().toISOString() };
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_potm_awards').insert([record]).select();
      if (!error) { _syncLs(league, 'potm_awards', data[0], 'add'); return data[0]; }
    }
    const list = ls.get(`${league}_potm_awards`);
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(`${league}_potm_awards`, [...list, newItem]);
    return newItem;
  },

  async deletePotmAward(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_potm_awards').delete().eq('id', id);
    }
    ls.set(`${league}_potm_awards`, ls.get(`${league}_potm_awards`).filter(a => a.id !== id));
  },

  /* ── ACCOLADES (season awards: Gold Glove, Silver Slugger, MVP, All-Star, etc.) ── */
  async getAccolades(league, playerId) {
    if (hasSupabase()) {
      let q = supabase.from('nova_accolades').select('*').eq('league', league);
      if (playerId) q = q.eq('player_id', String(playerId));
      const { data, error } = await q.order('created_at', { ascending: false });
      if (!error) return data;
    }
    const all = ls.get(`${league}_accolades`);
    return playerId ? all.filter(a => String(a.player_id) === String(playerId)) : all;
  },

  async addAccolade(league, accolade) {
    const record = { ...accolade, league, player_id: String(accolade.player_id), created_at: new Date().toISOString() };
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_accolades').insert([record]).select();
      if (!error) { _syncLs(league, 'accolades', data[0], 'add'); return data[0]; }
    }
    const list = ls.get(`${league}_accolades`);
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(`${league}_accolades`, [...list, newItem]);
    return newItem;
  },

  async deleteAccolade(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_accolades').delete().eq('id', id);
    }
    ls.set(`${league}_accolades`, ls.get(`${league}_accolades`).filter(a => a.id !== id));
  },

  /* ── COMMENTS (member profile comments) ──────────────────────── */
  async getComments(toUsername) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_comments')
          .select('*')
          .eq('to_username', toUsername)
          .order('created_at', { ascending: false });
        if (!error) return data;
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
    return all[toUsername] || [];
  },

  async addComment(comment) {
    if (hasSupabase()) {
      try {
        const record = { ...comment };
        delete record.id;
        const { data, error } = await supabase.from('nova_comments').insert([record]).select();
        if (!error) return data[0];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
    all[comment.to_username] = [comment, ...(all[comment.to_username] || [])];
    localStorage.setItem('nova_comments', JSON.stringify(all));
    return comment;
  },

  async deleteComment(id) {
    if (hasSupabase()) {
      try {
        await supabase.from('nova_comments').delete().eq('id', id);
        return;
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
    for (const key of Object.keys(all)) {
      all[key] = (all[key] || []).filter(c => c.id !== id);
    }
    localStorage.setItem('nova_comments', JSON.stringify(all));
  },

  /* ── PLAYER COMMENTS (comments + GIFs on a league player's stat page) ── */
  async getPlayerComments(league, playerId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_player_comments')
          .select('*')
          .eq('league', league)
          .eq('player_id', String(playerId))
          .order('created_at', { ascending: false });
        if (!error) return data;
      } catch {}
    }
    const all = ls.get(`${league}_player_comments`);
    return all.filter(c => String(c.player_id) === String(playerId));
  },

  async addPlayerComment(league, comment) {
    const record = { ...comment, league, player_id: String(comment.player_id), created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const insertRecord = { ...record };
        delete insertRecord.id;
        const { data, error } = await supabase.from('nova_player_comments').insert([insertRecord]).select();
        if (!error) { _syncLs(league, 'player_comments', data[0], 'add'); return data[0]; }
      } catch {}
    }
    const list = ls.get(`${league}_player_comments`);
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(`${league}_player_comments`, [...list, newItem]);
    return newItem;
  },

  async deletePlayerComment(league, id) {
    if (hasSupabase()) {
      try { await supabase.from('nova_player_comments').delete().eq('id', id); } catch {}
    }
    ls.set(`${league}_player_comments`, ls.get(`${league}_player_comments`).filter(c => c.id !== id));
  },

  /* ── FANTASY TEAM SCHEDULES ───────────────────────────────────────
     Stores schedule entries for fantasy teams (week, opponent, result).
     Requires: supabase/team_schedule_schema.sql to be run once.        */

  async getTeamSchedule(teamId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_fantasy_schedules')
          .select('*')
          .eq('team_id', teamId)
          .order('week', { ascending: true });
        if (!error) return data;
      } catch {}
    }
    const all = ls.get('nova_fantasy_schedules');
    return all.filter(e => e.team_id === teamId);
  },

  async saveScheduleEntry(entry) {
    const isNew = !entry.id;
    const record = { ...entry, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();
    if (hasSupabase()) {
      try {
        if (isNew) {
          const ins = { ...record }; delete ins.id;
          const { data, error } = await supabase.from('nova_fantasy_schedules').insert([ins]).select();
          if (!error) {
            const all = ls.get('nova_fantasy_schedules');
            ls.set('nova_fantasy_schedules', [...all, data[0]]);
            return data[0];
          }
        } else {
          const upd = { ...record }; delete upd.id;
          const { data, error } = await supabase.from('nova_fantasy_schedules')
            .update(upd).eq('id', entry.id).select();
          if (!error) {
            const all = ls.get('nova_fantasy_schedules');
            ls.set('nova_fantasy_schedules', all.map(e => e.id === entry.id ? data[0] : e));
            return data[0];
          }
        }
      } catch {}
    }
    const all = ls.get('nova_fantasy_schedules');
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set('nova_fantasy_schedules', [...all, newItem]);
      return newItem;
    }
    const updated = all.map(e => e.id === entry.id ? { ...e, ...record } : e);
    ls.set('nova_fantasy_schedules', updated);
    return record;
  },

  async deleteScheduleEntry(id) {
    if (hasSupabase()) {
      try { await supabase.from('nova_fantasy_schedules').delete().eq('id', id); } catch {}
    }
    ls.set('nova_fantasy_schedules', ls.get('nova_fantasy_schedules').filter(e => e.id !== id));
  },

  /* ── ANNOUNCEMENTS / UPDATE LOG ──────────────────────────────
     Everyone can read these; only the owner can post/delete (enforced
     client-side, same pattern as the rest of the admin dashboard).
     Run this SQL once in Supabase:

       CREATE TABLE IF NOT EXISTS nova_announcements (
         id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         message    TEXT NOT NULL,
         posted_by  TEXT,
         created_at TIMESTAMPTZ DEFAULT now()
       );
       ALTER TABLE nova_announcements ENABLE ROW LEVEL SECURITY;
       CREATE POLICY "Public read"  ON nova_announcements FOR SELECT USING (true);
       CREATE POLICY "Public write" ON nova_announcements FOR INSERT WITH CHECK (true);
       CREATE POLICY "Public delete" ON nova_announcements FOR DELETE USING (true); */

  async getAnnouncements() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) return data || [];
      } catch {}
    }
    return ls.get('nova_announcements').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async postAnnouncement(message, username) {
    const record = { message, posted_by: username || 'owner', created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_announcements').insert([record]).select();
        if (!error && data?.[0]) {
          ls.set('nova_announcements', [...ls.get('nova_announcements'), data[0]]);
          return data[0];
        }
      } catch {}
    }
    const local = { ...record, id: Date.now().toString() };
    ls.set('nova_announcements', [...ls.get('nova_announcements'), local]);
    return local;
  },

  async deleteAnnouncement(id) {
    if (hasSupabase()) {
      try { await supabase.from('nova_announcements').delete().eq('id', id); } catch {}
    }
    ls.set('nova_announcements', ls.get('nova_announcements').filter(a => a.id !== id));
  },

  /* ── ARTICLES ─────────────────────────────────────────────────
     Owner/cofounders write these (photo + title + body); everyone can
     read them on the Articles tab. Enforced client-side like the rest
     of the admin dashboard. Run this SQL once in Supabase:

       CREATE TABLE IF NOT EXISTS nova_articles (
         id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         title      TEXT NOT NULL,
         body       TEXT NOT NULL,
         photo_url  TEXT,
         category   TEXT DEFAULT 'sports',
         author     TEXT,
         created_at TIMESTAMPTZ DEFAULT now()
       );
       ALTER TABLE nova_articles ENABLE ROW LEVEL SECURITY;
       CREATE POLICY "Public read"   ON nova_articles FOR SELECT USING (true);
       CREATE POLICY "Public write"  ON nova_articles FOR INSERT WITH CHECK (true);
       CREATE POLICY "Public update" ON nova_articles FOR UPDATE USING (true);
       CREATE POLICY "Public delete" ON nova_articles FOR DELETE USING (true);

     Article photos reuse the existing "member-media" Storage bucket
     under an "articles/" folder — no new bucket needed. */

  async getArticles() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_articles')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) return data || [];
      } catch {}
    }
    return ls.get('nova_articles').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async saveArticle(article) {
    if (hasSupabase()) {
      try {
        if (article.id) {
          const { data, error } = await supabase.from('nova_articles').update(article).eq('id', article.id).select();
          if (!error && data?.[0]) return data[0];
        } else {
          const { data, error } = await supabase.from('nova_articles').insert([article]).select();
          if (!error && data?.[0]) return data[0];
        }
      } catch {}
    }
    const list = ls.get('nova_articles');
    if (article.id) {
      ls.set('nova_articles', list.map(a => a.id === article.id ? { ...a, ...article } : a));
      return article;
    }
    const local = { ...article, id: Date.now().toString() };
    ls.set('nova_articles', [...list, local]);
    return local;
  },

  async deleteArticle(id) {
    if (hasSupabase()) {
      try { await supabase.from('nova_articles').delete().eq('id', id); } catch {}
    }
    ls.set('nova_articles', ls.get('nova_articles').filter(a => a.id !== id));
  },

};

/* ── Internal: keep localStorage in sync with Supabase ─────────── */
function _syncLs(league, table, record, op) {
  const key = `${league}_${table}`;
  const list = ls.get(key);
  if (op === 'add') ls.set(key, [...list, record]);
  else if (op === 'update') ls.set(key, list.map(i => i.id === record.id ? record : i));
  else if (op === 'delete') ls.set(key, list.filter(i => i.id !== record.id));
}

export default db;
