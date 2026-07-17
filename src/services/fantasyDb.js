/**
 * fantasyDb.js — Data service for the Fantasy Sports platform.
 * Same convention as db.js: Supabase-first (cross-device), falls back to
 * localStorage (keyed by entity) so the feature still works before the
 * supabase/fantasy_schema.sql migration has been run.
 */
import { supabase } from './supabaseClient';
import sportsApi from './sportsApi';

const hasSupabase = () => !!(
  process.env.REACT_APP_SUPABASE_URL &&
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const ls = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const inviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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

async function genericDelete(table, id) {
  if (hasSupabase()) {
    try { await supabase.from(table).delete().eq('id', id); } catch {}
  }
  ls.set(table, ls.get(table).filter(r => r.id !== id));
}

const fantasyDb = {
  uid,

  /* ── LEAGUES ─────────────────────────────────────────────────── */
  async deleteLeague(leagueId) {
    if (hasSupabase()) {
      try { await supabase.from('fantasy_leagues').delete().eq('id', leagueId); } catch {}
    }
    ls.set('fantasy_leagues', ls.get('fantasy_leagues').filter(l => l.id !== leagueId));
  },

  async deleteTeam(teamId) {
    if (hasSupabase()) {
      try { await supabase.from('fantasy_teams').delete().eq('id', teamId); } catch {}
    }
    ls.set('fantasy_teams', ls.get('fantasy_teams').filter(t => t.id !== teamId));
  },

  async getAllLeagues() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('fantasy_leagues').select('*').order('created_at', { ascending: false });
        if (!error) return data;
      } catch {}
    }
    return ls.get('fantasy_leagues');
  },

  async getLeaguesForUser(username) {
    const teams = await genericGet('fantasy_teams', { owner_username: username });
    const leagueIds = [...new Set(teams.map(t => t.league_id))];
    if (leagueIds.length === 0) return [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('fantasy_leagues').select('*').in('id', leagueIds);
        if (!error) return data;
      } catch {}
    }
    return ls.get('fantasy_leagues').filter(l => leagueIds.includes(l.id));
  },

  async getLeague(id) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('fantasy_leagues').select('*').eq('id', id).single();
        if (!error) return data;
      } catch {}
    }
    return ls.get('fantasy_leagues').find(l => l.id === id) || null;
  },

  async getLeagueByInviteCode(code) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('fantasy_leagues').select('*').eq('invite_code', code.toUpperCase()).maybeSingle();
        if (!error) return data;
      } catch {}
    }
    return ls.get('fantasy_leagues').find(l => l.invite_code === code.toUpperCase()) || null;
  },

  async createLeague(settings, commissionerUsername, teamName) {
    const league = await genericInsert('fantasy_leagues', {
      ...settings,
      commissioner_username: commissionerUsername,
      invite_code: inviteCode(),
      status: 'setup',
      current_week: 1,
    });
    const team = await this.createTeam(league.id, commissionerUsername, teamName, league.faab_budget);
    return { league, team };
  },

  async updateLeague(id, patch) { return genericUpdate('fantasy_leagues', id, patch); },

  async joinLeague(code, username, teamName) {
    const league = await this.getLeagueByInviteCode(code);
    if (!league) throw new Error('Invalid invite code.');
    const teams = await this.getTeams(league.id);
    if (teams.find(t => t.owner_username === username)) throw new Error('You already have a team in this league.');
    if (teams.length >= league.num_teams) throw new Error('This league is full.');
    const team = await this.createTeam(league.id, username, teamName, league.faab_budget);
    return { league, team };
  },

  /* ── TEAMS ───────────────────────────────────────────────────── */
  async getTeams(leagueId) { return genericGet('fantasy_teams', { league_id: leagueId }); },

  async createTeam(leagueId, ownerUsername, teamName, faabBudget = 100) {
    return genericInsert('fantasy_teams', {
      league_id: leagueId,
      owner_username: ownerUsername,
      team_name: teamName || `${ownerUsername}'s Team`,
      faab_balance: faabBudget,
      wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0,
    });
  },

  async updateTeam(id, patch) { return genericUpdate('fantasy_teams', id, patch); },

  /* ── PLAYERS (cached pool) ───────────────────────────────────── */
  async getPlayers(sport) { return genericGet('fantasy_players', { sport }); },

  async cachePlayer(sport, p) {
    const existing = (await this.getPlayers(sport)).find(x => x.external_id === p.external_id);
    if (existing) return existing;
    return genericInsert('fantasy_players', { sport, ...p });
  },

  async cachePlayers(sport, players) {
    const existing = await this.getPlayers(sport);
    const existingIds = new Set(existing.map(x => x.external_id));
    const toAdd = players.filter(p => !existingIds.has(p.external_id));
    const results = [...existing];
    for (const p of toAdd) {
      results.push(await genericInsert('fantasy_players', { sport, ...p }));
    }
    return results;
  },

  /** Pulls the full ESPN player pool for a sport and caches any new players.
   * Cheap to call repeatedly — only inserts players not already cached.
   * Returns the full cached pool for the sport. */
  async syncPlayerPoolFromEspn(sport) {
    const existing = await this.getPlayers(sport);
    if (existing.length > 0) return existing; // already seeded; avoid refetching hundreds of rosters
    const pool = await sportsApi.getFullPlayerPool(sport);
    return this.cachePlayers(sport, pool);
  },

  /* ── ROSTERS ─────────────────────────────────────────────────── */
  async getRoster(teamId) { return genericGet('fantasy_rosters', { team_id: teamId }); },

  async addToRoster(teamId, playerId, slot = 'BENCH', acquiredVia = 'draft') {
    return genericInsert('fantasy_rosters', { team_id: teamId, player_id: playerId, slot, acquired_via: acquiredVia });
  },

  async removeFromRoster(rosterEntryId) { return genericDelete('fantasy_rosters', rosterEntryId); },

  async setRosterSlot(rosterEntryId, slot) { return genericUpdate('fantasy_rosters', rosterEntryId, { slot }); },

  async getLeagueRosteredPlayerIds(leagueId) {
    const teams = await this.getTeams(leagueId);
    const all = await Promise.all(teams.map(t => this.getRoster(t.id)));
    return new Set(all.flat().map(r => r.player_id));
  },

  /* ── DRAFTS ──────────────────────────────────────────────────── */
  async getDraft(leagueId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('fantasy_drafts').select('*').eq('league_id', leagueId).maybeSingle();
        if (!error) return data;
      } catch {}
    }
    return ls.get('fantasy_drafts').find(d => d.league_id === leagueId) || null;
  },

  async createDraft(leagueId, { rounds = 15, secondsPerPick = 60, teamOrder }) {
    return genericInsert('fantasy_drafts', {
      league_id: leagueId,
      status: 'scheduled',
      current_pick_index: 0,
      pick_order: teamOrder,
      rounds,
      seconds_per_pick: secondsPerPick,
      nomination_team_index: 0,
    });
  },

  async updateDraft(id, patch) { return genericUpdate('fantasy_drafts', id, patch); },

  async getDraftPicks(draftId) { return genericGet('fantasy_draft_picks', { draft_id: draftId }); },

  async makeDraftPick(draftId, { pickNumber, round, teamId, playerId, bidAmount }) {
    return genericInsert('fantasy_draft_picks', {
      draft_id: draftId, pick_number: pickNumber, round, team_id: teamId, player_id: playerId, bid_amount: bidAmount ?? null,
    });
  },

  /* ── MATCHUPS / SCHEDULE ─────────────────────────────────────── */
  async getMatchups(leagueId, week) {
    const filters = week ? { league_id: leagueId, week } : { league_id: leagueId };
    return genericGet('fantasy_matchups', filters);
  },

  async createMatchup(m) { return genericInsert('fantasy_matchups', m); },

  async updateMatchup(id, patch) { return genericUpdate('fantasy_matchups', id, patch); },

  /* ── WAIVERS / FAAB ──────────────────────────────────────────── */
  async getWaiverClaims(leagueId) { return genericGet('fantasy_waiver_claims', { league_id: leagueId }); },

  async submitWaiverClaim(claim) { return genericInsert('fantasy_waiver_claims', { ...claim, status: 'pending' }); },

  async updateWaiverClaim(id, patch) { return genericUpdate('fantasy_waiver_claims', id, patch); },

  async cancelWaiverClaim(id) { return genericDelete('fantasy_waiver_claims', id); },

  /* ── TRADES ──────────────────────────────────────────────────── */
  async getTrades(leagueId) { return genericGet('fantasy_trades', { league_id: leagueId }); },

  async proposeTrade(trade) { return genericInsert('fantasy_trades', { ...trade, status: 'pending' }); },

  async updateTrade(id, patch) { return genericUpdate('fantasy_trades', id, { ...patch, resolved_at: new Date().toISOString() }); },

  /* ── CHAT ────────────────────────────────────────────────────── */
  async getChatMessages(leagueId) { return genericGet('fantasy_chat_messages', { league_id: leagueId }); },

  async sendChatMessage(leagueId, username, content) {
    return genericInsert('fantasy_chat_messages', { league_id: leagueId, username, content });
  },

  subscribeToChannel(channelName, table, filterCol, filterVal, callback) {
    if (!hasSupabase()) return null;
    return supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterCol}=eq.${filterVal}` }, callback)
      .subscribe();
  },

  unsubscribe(channel) { if (channel && hasSupabase()) supabase.removeChannel(channel); },
};

export default fantasyDb;
