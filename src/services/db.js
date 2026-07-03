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

  async saveUser(user) {
    try {
      await supabase.from('nova_users').upsert([{ username: user.username, role: user.role || 'member' }], { onConflict: 'username' });
    } catch {}
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    if (!users.find(u => u.username === user.username)) {
      users.push(user);
      localStorage.setItem('nova_users', JSON.stringify(users));
    }
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
