/**
 * pickemsDb.js — Data service for the Pick'ems social game.
 * Independent of fantasy leagues: users join a Pick'ems group via invite
 * code, pick winners for real-world games (fetched from sportsApi), and
 * earn coins for correct picks. Same Supabase-first/localStorage-fallback
 * convention as db.js / fantasyDb.js. Column names below mirror
 * supabase/fantasy_schema.sql exactly — keep them in sync.
 */
import { supabase } from './supabaseClient';
import sportsApi from './sportsApi';

const hasSupabase = () => true; // Rivestack via /api/query — no client-side env vars needed

const ls = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const inviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const COINS_PER_CORRECT_PICK = 10;

async function genericGet(table, filters = {}) {
  if (hasSupabase()) {
    try {
      let q = supabase.from(table).select('*');
      Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q;
      if (!error) return data;
    } catch {}
  }
  let list = ls.get(table);
  Object.entries(filters).forEach(([k, v]) => { list = list.filter(r => String(r[k]) === String(v)); });
  return list;
}

async function genericInsert(table, record) {
  const withId = { ...record, id: record.id || uid(), created_at: record.created_at || new Date().toISOString() };
  if (hasSupabase()) {
    try {
      const { data, error } = await supabase.from(table).insert([withId]).select();
      if (!error) { const list = ls.get(table); ls.set(table, [...list, data[0]]); return data[0]; }
    } catch {}
  }
  const list = ls.get(table);
  ls.set(table, [...list, withId]);
  return withId;
}

async function genericUpdate(table, id, patch) {
  if (hasSupabase()) {
    try {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select();
      if (!error) { const list = ls.get(table); ls.set(table, list.map(r => r.id === id ? data[0] : r)); return data[0]; }
    } catch {}
  }
  const list = ls.get(table);
  const updated = list.map(r => r.id === id ? { ...r, ...patch } : r);
  ls.set(table, updated);
  return updated.find(r => r.id === id);
}

const pickemsDb = {
  uid,
  COINS_PER_CORRECT_PICK,

  /* ── GROUPS ──────────────────────────────────────────────────── */
  async getGroupsForUser(username) {
    const memberships = await genericGet('pickems_members', { username });
    const groupIds = [...new Set(memberships.map(m => m.group_id))];
    if (groupIds.length === 0) return [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('pickems_groups').select('*').in('id', groupIds);
        if (!error) return data;
      } catch {}
    }
    return ls.get('pickems_groups').filter(g => groupIds.includes(g.id));
  },

  async getGroup(id) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('pickems_groups').select('*').eq('id', id).single();
        if (!error) return data;
      } catch {}
    }
    return ls.get('pickems_groups').find(g => g.id === id) || null;
  },

  async getGroupByInviteCode(code) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('pickems_groups').select('*').eq('invite_code', code.toUpperCase()).maybeSingle();
        if (!error) return data;
      } catch {}
    }
    return ls.get('pickems_groups').find(g => g.invite_code === code.toUpperCase()) || null;
  },

  async createGroup(name, sport, ownerUsername) {
    const group = await genericInsert('pickems_groups', {
      name, sport, commissioner_username: ownerUsername, invite_code: inviteCode(),
    });
    await genericInsert('pickems_members', { group_id: group.id, username: ownerUsername, coins: 0, correct_picks: 0, total_picks: 0 });
    return group;
  },

  async joinGroup(code, username) {
    const group = await this.getGroupByInviteCode(code);
    if (!group) throw new Error('Invalid invite code.');
    const members = await this.getMembers(group.id);
    if (members.find(m => m.username === username)) throw new Error('You are already in this group.');
    await genericInsert('pickems_members', { group_id: group.id, username, coins: 0, correct_picks: 0, total_picks: 0 });
    return group;
  },

  /* ── MEMBERS / LEADERBOARD ───────────────────────────────────── */
  async getMembers(groupId) { return genericGet('pickems_members', { group_id: groupId }); },

  async getMember(groupId, username) {
    const members = await this.getMembers(groupId);
    return members.find(m => m.username === username) || null;
  },

  async getLeaderboard(groupId) {
    const members = await this.getMembers(groupId);
    return [...members].sort((a, b) => (b.coins - a.coins) || (b.correct_picks - a.correct_picks));
  },

  /* ── GAMES (cached from sportsApi.getScoreboard) ─────────────── */
  async getGames(sport) { return genericGet('pickems_games', { sport }); },

  async cacheGame(sport, game) {
    const existing = (await genericGet('pickems_games', { sport, external_game_id: game.external_game_id }))[0];
    if (existing) {
      if (existing.status !== game.status || existing.winner !== game.winner) {
        return genericUpdate('pickems_games', existing.id, { status: game.status, winner: game.winner });
      }
      return existing;
    }
    return genericInsert('pickems_games', { sport, ...game });
  },

  async cacheGames(sport, games) {
    const results = [];
    for (const g of games) results.push(await this.cacheGame(sport, g));
    return results;
  },

  /** Fetches the live ESPN scoreboard for a sport/date, caches it in
   * pickems_games, and resolves any picks for games that just went final.
   * Returns the cached game rows (with local ids) for display/pick-submission. */
  async syncGamesFromEspn(sport, dateYYYYMMDD) {
    const events = await sportsApi.getScoreboard(sport, dateYYYYMMDD);
    const mapped = events.map(ev => ({
      external_game_id: ev.external_game_id,
      home_team: ev.home_team,
      away_team: ev.away_team,
      home_abbr: ev.home_abbr,
      away_abbr: ev.away_abbr,
      game_time: ev.game_time,
      status: ev.status,
      winner: ev.winner,
    }));
    const cached = await this.cacheGames(sport, mapped);
    for (const g of cached) {
      if (g.status === 'final' && g.winner) await this.resolvePicksForGame(g);
    }
    return cached;
  },

  /* ── PICKS ───────────────────────────────────────────────────── */
  async getPicksForGroup(groupId) { return genericGet('pickems_picks', { group_id: groupId }); },

  async getUserPicks(groupId, username) {
    const picks = await this.getPicksForGroup(groupId);
    return picks.filter(p => p.username === username);
  },

  /** pickedSide is 'home' | 'away' */
  async submitPick(groupId, username, gameId, pickedSide) {
    const existing = (await this.getUserPicks(groupId, username)).find(p => p.game_id === gameId);
    if (existing) return genericUpdate('pickems_picks', existing.id, { picked_side: pickedSide });
    return genericInsert('pickems_picks', { group_id: groupId, username, game_id: gameId, picked_side: pickedSide, correct: null, coins_awarded: 0 });
  },

  /**
   * Called after a game's status becomes 'final' (winner known). Scores every
   * unresolved pick for that game across all groups tracking it, awards coins.
   */
  async resolvePicksForGame(game) {
    if (!game.winner || game.status !== 'final') return;
    const candidates = hasSupabase()
      ? await genericGet('pickems_picks', { game_id: game.id })
      : ls.get('pickems_picks').filter(p => p.game_id === game.id);

    for (const pick of candidates) {
      if (pick.correct !== null && pick.correct !== undefined) continue; // already resolved
      const correct = pick.picked_side === game.winner;
      const coinsAwarded = correct ? COINS_PER_CORRECT_PICK : 0;
      await genericUpdate('pickems_picks', pick.id, { correct, coins_awarded: coinsAwarded });
      const member = await this.getMember(pick.group_id, pick.username);
      if (member) {
        await genericUpdate('pickems_members', member.id, {
          coins: member.coins + coinsAwarded,
          correct_picks: member.correct_picks + (correct ? 1 : 0),
          total_picks: member.total_picks + 1,
        });
      }
    }
  },
};

export default pickemsDb;
