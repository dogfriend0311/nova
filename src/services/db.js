/**
 * db.js — Universal data service
 * Tries Supabase first (cross-device). Falls back to localStorage if
 * Supabase isn't configured yet so the site still works locally.
 */
import { supabase } from './supabaseClient';
import { notifyDiscordEvent } from './discordEventNotify';
import { generateBeatPost } from './beatWriterService';

const hasSupabase = () => true; // Rivestack via /api/query — no client-side env vars needed

/* ── Generic localStorage helpers ─────────────────────────────── */
const ls = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

/* ── Audit log ──────────────────────────────────────────────────
   Fire-and-forget: never throws, never blocks the save/delete it's
   logging. Reads the current user straight from localStorage (same
   place AuthContext keeps it) since this module has no access to
   React context. Visible only to owner/co-founder in the dashboard
   (see AuditLogTab in OwnerDashboard.jsx). */
async function logAudit(action, league, entityType, entityName, details) {
  try {
    const rawUser = localStorage.getItem('nova_user');
    const actor = rawUser ? (JSON.parse(rawUser).username || 'unknown') : 'unknown';
    await supabase.from('nova_audit_log').insert([{
      actor, action, league: league || null, entity_type: entityType || null,
      entity_name: entityName || null, details: details || null,
    }]);
  } catch {
    // audit logging must never break the actual save/delete
  }
}

/* ── League data (teams, players, games, etc.) ────────────────── */
export const db = {

  /* AUDIT LOG */
  async getAuditLog(limitN = 200) {
    try {
      const { data, error } = await supabase
        .from('nova_audit_log').select('*').order('created_at', { ascending: false }).limit(limitN);
      if (!error && Array.isArray(data)) return data;
    } catch { /* fall through */ }
    return [];
  },

  /* CUSTOM STATS (owner-added stat columns per league) */
  async getCustomStats(league) {
    try {
      const { data, error } = await supabase
        .from('nova_custom_stats').select('*').eq('league', league);
      if (!error && Array.isArray(data)) return data;
    } catch { /* fall through */ }
    return [];
  },

  async addCustomStat(rec) {
    const record = { ...rec, created_at: new Date().toISOString() };
    delete record.id;
    const { data, error } = await supabase.from('nova_custom_stats').insert([record]).select();
    if (error) throw new Error(error.message || 'Failed to save custom stat');
    logAudit('stat.create', rec.league, 'custom_stat', `${rec.label} (${rec.stat_key})`);
    return data && data[0];
  },

  async deleteCustomStat(id, league, label) {
    const { error } = await supabase.from('nova_custom_stats').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Failed to delete custom stat');
    logAudit('stat.delete', league, 'custom_stat', label || id);
  },

  /* CUSTOM AWARD CATEGORIES (commissioner-defined award types per league,
     beyond MVP/ROY/etc. — see src/data/accolades.js for how these merge
     into the awards dropdown) */
  async getCustomAwardTypes(league) {
    try {
      const { data, error } = await supabase
        .from('nova_custom_award_types').select('*').eq('league', league);
      if (!error && Array.isArray(data)) return data;
    } catch { /* fall through */ }
    return [];
  },

  async addCustomAwardType(rec) {
    const record = { ...rec, created_at: new Date().toISOString() };
    delete record.id;
    const { data, error } = await supabase.from('nova_custom_award_types').insert([record]).select();
    if (error) throw new Error(error.message || 'Failed to save award category');
    logAudit('award_type.create', rec.league, 'custom_award_type', `${rec.label} (${rec.key})`);
    return data && data[0];
  },

  async deleteCustomAwardType(id, league, label) {
    const { error } = await supabase.from('nova_custom_award_types').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Failed to remove award category');
    logAudit('award_type.delete', league, 'custom_award_type', label || id);
  },

  /* TEAMS */
  async getTeams(league) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_teams').select('*').eq('league', league).order('created_at');
        if (!error && Array.isArray(data)) return data;
        if (error) console.error('[db.getTeams] supabase error:', error && error.message ? error.message : JSON.stringify(error));
      } catch (err) {
        console.error('[db.getTeams] request failed:', err && err.message ? err.message : String(err));
      }
    }
    return ls.get(`${league}_teams`);
  },

  async saveTeam(league, team) {
    const isNew = !team.id;
    const record = { ...team, league, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();

    if (hasSupabase()) {
      try {
        if (isNew) {
          delete record.id;
          const { data, error } = await supabase.from('nova_teams').insert([record]).select();
          if (!error && data && data[0]) {
            _syncLs(league, 'teams', data[0], 'add');
            logAudit('team.create', league, 'team', data[0].team_name || data[0].name || data[0].id);
            return data[0];
          }
          if (error) console.error('[db.saveTeam] insert error:', error && error.message ? error.message : JSON.stringify(error));
        } else {
          const { data, error } = await supabase.from('nova_teams')
            .update({ ...record, id: undefined }).eq('id', team.id).select();
          if (!error && data && data[0]) {
            _syncLs(league, 'teams', data[0], 'update');
            logAudit('team.update', league, 'team', data[0].team_name || data[0].name || data[0].id);
            return data[0];
          }
          if (error) console.error('[db.saveTeam] update error:', error && error.message ? error.message : JSON.stringify(error));
        }
      } catch (err) {
        console.error('[db.saveTeam] request failed:', err && err.message ? err.message : String(err));
      }
    }
    const list = ls.get(`${league}_teams`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_teams`, [...list, newItem]);
      logAudit('team.create', league, 'team', newItem.team_name || newItem.name || newItem.id);
      return newItem;
    } else {
      const updated = list.map(t => t.id === team.id ? { ...t, ...record } : t);
      ls.set(`${league}_teams`, updated);
      logAudit('team.update', league, 'team', record.team_name || record.name || team.id);
      return record;
    }
  },

  async deleteTeam(league, id) {
    if (hasSupabase()) {
      try {
        const { error } = await supabase.from('nova_teams').delete().eq('id', id);
        if (error) console.error('[db.deleteTeam] error:', error && error.message ? error.message : JSON.stringify(error));
      } catch (err) {
        console.error('[db.deleteTeam] request failed:', err && err.message ? err.message : String(err));
      }
    }
    ls.set(`${league}_teams`, ls.get(`${league}_teams`).filter(t => t.id !== id));
    logAudit('team.delete', league, 'team', id);
  },

  /* PLAYERS */
  async getPlayers(league) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_players').select('*').eq('league', league).order('player_name');
        if (!error && Array.isArray(data)) return data;
        if (error) console.error('[db.getPlayers] supabase error:', error && error.message ? error.message : JSON.stringify(error));
      } catch (err) {
        console.error('[db.getPlayers] request failed:', err && err.message ? err.message : String(err));
      }
    }
    return ls.get(`${league}_players`);
  },

  async savePlayer(league, player) {
    const isNew = !player.id;
    const record = { ...player, league, updated_at: new Date().toISOString() };
    if (isNew) record.created_at = new Date().toISOString();

    if (hasSupabase()) {
      try {
        if (isNew) {
          delete record.id;
          const { data, error } = await supabase.from('nova_players').insert([record]).select();
          if (!error && data && data[0]) {
            _syncLs(league, 'players', data[0], 'add');
            logAudit('player.create', league, 'player', data[0].player_name || data[0].id);
            return data[0];
          }
          if (error) console.error('[db.savePlayer] insert error:', error && error.message ? error.message : JSON.stringify(error));
        } else {
          const updateRecord = { ...record };
          delete updateRecord.id;
          const { data, error } = await supabase.from('nova_players')
            .update(updateRecord).eq('id', player.id).select();
          if (!error && data && data[0]) {
            _syncLs(league, 'players', data[0], 'update');
            logAudit('player.update', league, 'player', data[0].player_name || data[0].id);
            this.notifyPlayerFollowers(league, data[0].id, 'notify_stats', {
              type: 'stats',
              title: '📊 Stats updated',
              body: `${data[0].player_name || 'A player you follow'}'s stats were just updated.`,
              link: `#leagues/player/${data[0].id}`,
            });
            return data[0];
          }
          if (error) console.error('[db.savePlayer] update error:', error && error.message ? error.message : JSON.stringify(error));
        }
      } catch (err) {
        console.error('[db.savePlayer] request failed:', err && err.message ? err.message : String(err));
      }
    }
    const list = ls.get(`${league}_players`);
    if (isNew) {
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_players`, [...list, newItem]);
      logAudit('player.create', league, 'player', newItem.player_name || newItem.id);
      return newItem;
    } else {
      const updated = list.map(p => p.id === player.id ? { ...p, ...record } : p);
      ls.set(`${league}_players`, updated);
      logAudit('player.update', league, 'player', record.player_name || player.id);
      return record;
    }
  },

  async deletePlayer(league, id) {
    if (hasSupabase()) {
      try {
        const { error } = await supabase.from('nova_players').delete().eq('id', id);
        if (error) console.error('[db.deletePlayer] error:', error && error.message ? error.message : JSON.stringify(error));
      } catch (err) {
        console.error('[db.deletePlayer] request failed:', err && err.message ? err.message : String(err));
      }
    }
    ls.set(`${league}_players`, ls.get(`${league}_players`).filter(p => p.id !== id));
    logAudit('player.delete', league, 'player', id);
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

    let saved = null;
    if (hasSupabase()) {
      if (isNew) {
        delete record.id;
        const { data, error } = await supabase.from('nova_games').insert([record]).select();
        if (!error) { _syncLs(league, 'games', data[0], 'add'); logAudit('game.create', league, 'game', data[0].id); saved = data[0]; }
      } else {
        const { data, error } = await supabase.from('nova_games')
          .update({ ...record, id: undefined }).eq('id', game.id).select();
        if (!error) { _syncLs(league, 'games', data[0], 'update'); logAudit('game.update', league, 'game', data[0].id); saved = data[0]; }
      }
    }
    if (!saved) {
      const list = ls.get(`${league}_games`);
      if (isNew) {
        const newItem = { ...record, id: Date.now().toString() };
        ls.set(`${league}_games`, [...list, newItem]);
        logAudit('game.create', league, 'game', newItem.id);
        saved = newItem;
      } else {
        const updated = list.map(g => g.id === game.id ? { ...g, ...record } : g);
        ls.set(`${league}_games`, updated);
        logAudit('game.update', league, 'game', game.id);
        saved = record;
      }
    }

    // A game just got marked Final (or was edited while already Final) —
    // fire off the beat-writer recap. Fire-and-forget: never awaited, and
    // internally swallows its own errors, so a beat-post hiccup can never
    // fail or slow down the game save itself.
    if (saved && saved.status === 'final') this._maybeAutoBeatPost(league, saved);

    return saved;
  },

  async deleteGame(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_games').delete().eq('id', id);
    }
    ls.set(`${league}_games`, ls.get(`${league}_games`).filter(g => g.id !== id));
    logAudit('game.delete', league, 'game', id);
  },

  /* ── BEAT WRITER POSTS ─────────────────────────────────────────
     Auto-generated recap blurbs, created the instant a game (see
     saveGame above) is marked Final. Shown as a Twitter/X-style feed
     (BeatWireFeed.jsx) and, for "big games", also pushed to Discord. */
  async getBeatPosts(league, limitN = 50) {
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_beat_posts').select('*')
        .eq('league', league).order('created_at', { ascending: false }).limit(limitN);
      if (!error) return data;
    }
    return [...ls.get(`${league}_beat_posts`)].reverse().slice(0, limitN);
  },

  async _hasBeatPostForGame(league, gameId) {
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_beat_posts').select('id')
        .eq('league', league).eq('game_id', String(gameId)).limit(1);
      if (!error) return (data || []).length > 0;
    }
    return ls.get(`${league}_beat_posts`).some(p => String(p.game_id) === String(gameId));
  },

  async addBeatPost(league, post) {
    const record = { ...post, league, game_id: String(post.game_id), created_at: new Date().toISOString() };
    let saved = null;
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_beat_posts').insert([record]).select();
      if (!error) { _syncLs(league, 'beat_posts', data[0], 'add'); saved = data[0]; }
    }
    if (!saved) {
      const list = ls.get(`${league}_beat_posts`);
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_beat_posts`, [...list, newItem]);
      saved = newItem;
    }
    // Only "big games" (blowouts/nailbiters, per beatWriterService) ping
    // Discord live — routine wins still show up in the in-app feed but
    // don't need to interrupt the channel.
    if (record.is_featured) {
      notifyDiscordEvent('beat_post', {
        league, headline: record.headline, body: record.body, tag: record.tag,
      });
    }
    return saved;
  },

  async deleteBeatPost(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_beat_posts').delete().eq('id', id);
    }
    ls.set(`${league}_beat_posts`, ls.get(`${league}_beat_posts`).filter(p => p.id !== id));
  },

  // Called from saveGame whenever a game is saved with status 'final'.
  // Idempotent — skips if a recap already exists for this game — so
  // re-saving a Final game (e.g. fixing a typo in the score) doesn't spam
  // duplicate posts. To regenerate on purpose, delete the existing post
  // first (see the Beat Wire admin tab).
  async _maybeAutoBeatPost(league, game) {
    try {
      const post = generateBeatPost({ league, game });
      if (!post) return; // scores aren't both set yet
      const already = await this._hasBeatPostForGame(league, game.id);
      if (already) return;
      await this.addBeatPost(league, {
        ...post,
        game_id: game.id,
        home_team: game.home_team,
        away_team: game.away_team,
        home_score: game.home_score,
        away_score: game.away_score,
      });
    } catch {
      // A beat-post failure must never surface as a game-save failure.
    }
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
    let saved = null;
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_hof').insert([record]).select();
      if (!error) { _syncLs(league, 'hof', data[0], 'add'); logAudit('hof.add', league, 'hof', data[0].player_name || data[0].id); saved = data[0]; }
    }
    if (!saved) {
      const list = ls.get(`${league}_hof`);
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_hof`, [...list, newItem]);
      logAudit('hof.add', league, 'hof', newItem.player_name || newItem.id);
      saved = newItem;
    }
    // HOF entries are keyed by player_name, not player_id, so resolve the
    // matching player record in this league before fanning out follower
    // notifications (best-effort — a name that doesn't match any current
    // player record just means no one gets pinged for it).
    if (record.player_name) {
      this.getPlayers(league).then((players) => {
        const match = (players || []).find(p => (p.player_name || '').toLowerCase() === record.player_name.toLowerCase());
        if (!match) return;
        this.notifyPlayerFollowers(league, match.id, 'notify_awards', {
          type: 'award',
          title: '⭐ Hall of Fame',
          body: `${record.player_name} was just inducted into the Hall of Fame!`,
          link: `#leagues/player/${match.id}`,
        });
      }).catch(() => {});
    }
    notifyDiscordEvent('hof', { player_name: record.player_name, league });
    return saved;
  },

  async deleteHof(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_hof').delete().eq('id', id);
    }
    ls.set(`${league}_hof`, ls.get(`${league}_hof`).filter(m => m.id !== id));
    logAudit('hof.delete', league, 'hof', id);
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

  // nova_member_profiles has several jsonb columns (fav_teams, fav_games,
  // bg_media, audio_tracks, displayed_badges). Profiles that trace back to
  // pre-Supabase localStorage data can carry these as the wrong shape (e.g.
  // a plain string instead of an array) — Postgres then rejects the whole
  // upsert with "invalid input syntax for type json" instead of just that
  // field. Normalize defensively so a bad legacy value can't block a save.
  _sanitizeProfileJsonFields(profile) {
    const DEFAULT_FAV_TEAMS = { mlb: [], nfl: [], nba: [], nhl: [], cfb: [], cbb: [] };
    const p = { ...profile };
    if (!p.fav_teams || typeof p.fav_teams !== 'object' || Array.isArray(p.fav_teams)) {
      p.fav_teams = DEFAULT_FAV_TEAMS;
    } else {
      p.fav_teams = { ...DEFAULT_FAV_TEAMS, ...p.fav_teams };
      for (const league of Object.keys(DEFAULT_FAV_TEAMS)) {
        if (!Array.isArray(p.fav_teams[league])) p.fav_teams[league] = [];
      }
    }
    if (!p.fav_team_notifs || typeof p.fav_team_notifs !== 'object' || Array.isArray(p.fav_team_notifs)) {
      p.fav_team_notifs = {};
    }
    for (const key of ['fav_games', 'bg_media', 'audio_tracks', 'displayed_badges']) {
      if (!Array.isArray(p[key])) p[key] = [];
    }
    return p;
  },

  // Postgres validates every string nested inside a jsonb value for
  // well-formed Unicode. A single broken surrogate pair anywhere inside
  // (e.g. an emoji mangled by a copy-paste or a filename-derived audio
  // track title) makes the ENTIRE upsert fail with "invalid input syntax
  // for type json" — even though the JS object's shape is fine. Repair
  // lone surrogate halves before sending, rather than dropping the whole
  // save.
  _fixLoneSurrogates(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF) {
        // high surrogate — keep only if immediately followed by its low half
        const next = str.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          out += str[i] + str[i + 1];
          i++;
        } // else: lone high surrogate — drop it
      } else if (code >= 0xDC00 && code <= 0xDFFF) {
        // lone low surrogate with no preceding high — drop it
      } else {
        out += str[i];
      }
    }
    return out;
  },

  _deepFixUnicode(value) {
    if (typeof value === 'string') return this._fixLoneSurrogates(value);
    if (Array.isArray(value)) return value.map(v => this._deepFixUnicode(v));
    if (value && typeof value === 'object') {
      const out = {};
      for (const k of Object.keys(value)) out[k] = this._deepFixUnicode(value[k]);
      return out;
    }
    return value;
  },

  async saveMemberProfile(profile) {
    if (hasSupabase()) {
      const safeProfile = this._deepFixUnicode(this._sanitizeProfileJsonFields(profile));
      const { data, error } = await supabase
        .from('nova_member_profiles')
        .upsert([{ ...safeProfile, updated_at: new Date().toISOString() }], { onConflict: 'username' })
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

  // Marks a member as a confirmed Discord member (sticky — once set, stays
  // set even if they later show as offline in the widget). See
  // src/services/discordBadgeCheck.js for the matching logic that calls this.
  async setDiscordVerified(username) {
    if (!username) return;
    const verified_at = new Date().toISOString();
    if (hasSupabase()) {
      try { await supabase.from('nova_member_profiles').update({ discord_verified_at: verified_at }).eq('username', username); } catch {}
    }
    const list = ls.get('member_profiles');
    const idx = list.findIndex(p => p.username === username);
    if (idx >= 0) list[idx] = { ...list[idx], discord_verified_at: verified_at };
    ls.set('member_profiles', list);
  },

  // Manual admin override to remove a Discord-verified flair (e.g. it was
  // assigned by mistake, or the member left the server).
  async clearDiscordVerified(username) {
    if (!username) return;
    if (hasSupabase()) {
      try { await supabase.from('nova_member_profiles').update({ discord_verified_at: null }).eq('username', username); } catch {}
    }
    const list = ls.get('member_profiles');
    const idx = list.findIndex(p => p.username === username);
    if (idx >= 0) list[idx] = { ...list[idx], discord_verified_at: null };
    ls.set('member_profiles', list);
  },

  // Lightweight visit counter, shown on the public profile card (e.g.
  // "142 views"). There's no atomic increment through /api/query's
  // select/insert/update/upsert/delete shape, so this reads the current
  // count and writes count+1 — same eventually-consistent, no-RPC
  // approach the rest of this file uses (see e.g. addCoins-style
  // read-then-write patterns). A rare lost increment under concurrent
  // visits is an acceptable trade-off for a casual stat like this one.
  async incrementProfileView(username) {
    if (!username) return null;
    if (hasSupabase()) {
      try {
        const { data } = await supabase.from('nova_member_profiles').select('profile_views').eq('username', username).maybeSingle();
        const next = (data?.profile_views || 0) + 1;
        await supabase.from('nova_member_profiles').update({ profile_views: next }).eq('username', username);
        const list = ls.get('member_profiles');
        const idx = list.findIndex(p => p.username === username);
        if (idx >= 0) list[idx] = { ...list[idx], profile_views: next };
        ls.set('member_profiles', list);
        return next;
      } catch {}
    }
    const list = ls.get('member_profiles');
    const idx = list.findIndex(p => p.username === username);
    const next = (list[idx]?.profile_views || 0) + 1;
    if (idx >= 0) list[idx] = { ...list[idx], profile_views: next };
    ls.set('member_profiles', list);
    return next;
  },

  // Custom URL/slug support — lets a member claim a display slug (e.g.
  // /members/nova) in addition to their username. Case-insensitive
  // uniqueness check against every OTHER member's claimed slug (a
  // member is always allowed to keep/re-save their own).
  async isProfileSlugTaken(slug, excludeUsername) {
    const clean = (slug || '').trim().toLowerCase();
    if (!clean) return false;
    const profiles = await this.getMemberProfiles();
    return (profiles || []).some(p =>
      p.username !== excludeUsername && (p.profile_slug || '').trim().toLowerCase() === clean
    );
  },

  // Manual status (Online / Do Not Disturb / Invisible) a member picks for
  // themselves. This used to be written ONLY to that member's own
  // localStorage, keyed by their username — which meant it could never be
  // seen by anyone visiting from a different browser/device, since that
  // key simply doesn't exist anywhere else. Syncing it onto their profile
  // row (like discord_verified_at above) makes it visible to everyone.
  async setPresence(username, presence) {
    if (!username) return;
    if (hasSupabase()) {
      try { await supabase.from('nova_member_profiles').update({ presence }).eq('username', username); } catch {}
    }
    localStorage.setItem(`nova_presence_${username}`, presence);
    const list = ls.get('member_profiles');
    const idx = list.findIndex(p => p.username === username);
    if (idx >= 0) list[idx] = { ...list[idx], presence };
    ls.set('member_profiles', list);
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

  /* ── PLAYER OF THE MONTH AWARDS ─────────────────────────────
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
    let saved = null;
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_potm_awards').insert([record]).select();
      if (!error) { _syncLs(league, 'potm_awards', data[0], 'add'); saved = data[0]; }
    }
    if (!saved) {
      const list = ls.get(`${league}_potm_awards`);
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_potm_awards`, [...list, newItem]);
      saved = newItem;
    }
    this.notifyPlayerFollowers(league, record.player_id, 'notify_awards', {
      type: 'award',
      title: '🏆 Player of the Month',
      body: `${record.player_name || 'A player you follow'} just won Player of the Month${record.month_label ? ` (${record.month_label})` : ''}.`,
      link: `#leagues/player/${record.player_id}`,
    });
    notifyDiscordEvent('potm', { player_name: record.player_name, league, month_label: record.month_label });
    return saved;
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
    let saved = null;
    if (hasSupabase()) {
      delete record.id;
      const { data, error } = await supabase.from('nova_accolades').insert([record]).select();
      if (!error) { _syncLs(league, 'accolades', data[0], 'add'); saved = data[0]; }
    }
    if (!saved) {
      const list = ls.get(`${league}_accolades`);
      const newItem = { ...record, id: Date.now().toString() };
      ls.set(`${league}_accolades`, [...list, newItem]);
      saved = newItem;
    }
    const label = record.type === 'custom' ? (record.custom_label || 'Award') : record.type;
    this.notifyPlayerFollowers(league, record.player_id, 'notify_awards', {
      type: 'award',
      title: '🎖️ New Accolade',
      body: `${record.player_name || 'A player you follow'} earned ${label}.`,
      link: `#leagues/player/${record.player_id}`,
    });
    notifyDiscordEvent('accolade', { player_name: record.player_name, league, label });
    return saved;
  },

  async deleteAccolade(league, id) {
    if (hasSupabase()) {
      await supabase.from('nova_accolades').delete().eq('id', id);
    }
    ls.set(`${league}_accolades`, ls.get(`${league}_accolades`).filter(a => a.id !== id));
  },

  /* ── AWARD / TROPHY CASE ORDERING ─────────────────────────────
     Both nova_potm_awards and nova_accolades support an optional
     sort_index column (see supabase/awards_and_depth_order.sql) so staff
     can manually reorder a player's trophy case in the Owner Dashboard
     instead of always seeing awards newest-first. Awards without a
     sort_index yet (pre-migration, or still localStorage-only) simply
     fall back to their existing created_at order — see
     sortByDisplayOrder() below, used wherever these lists are rendered. */
  async reorderPotmAward(league, id, sort_index) {
    if (hasSupabase()) {
      try {
        await supabase.from('nova_potm_awards').update({ sort_index }).eq('id', id);
      } catch {}
    }
    ls.set(`${league}_potm_awards`, ls.get(`${league}_potm_awards`).map(a => (a.id === id ? { ...a, sort_index } : a)));
  },

  async reorderAccolade(league, id, sort_index) {
    if (hasSupabase()) {
      try {
        await supabase.from('nova_accolades').update({ sort_index }).eq('id', id);
      } catch {}
    }
    ls.set(`${league}_accolades`, ls.get(`${league}_accolades`).map(a => (a.id === id ? { ...a, sort_index } : a)));
  },

  /* ── ALL-STAR VOTING (mid-season fan/member vote — separate from
     end-of-season accolades above). One "ballot" per league represents
     the current/most-recent round; opening a new round automatically
     closes any round still marked open, so only one is ever live. Votes
     are upserted on (ballot_id, category, voter_username) so a member
     can change their pick, but only ever counts once per category. ── */
  async getAllStarBallot(league) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_allstar_ballots').select('*').eq('league', league)
          .order('created_at', { ascending: false }).limit(1);
        if (!error && Array.isArray(data)) return data[0] || null;
      } catch { /* fall through */ }
    }
    const list = ls.get(`${league}_allstar_ballots`);
    return list.length ? list[list.length - 1] : null;
  },

  async startAllStarVote(league, roundLabel, username) {
    const current = await this.getAllStarBallot(league);
    if (current && current.status === 'open') {
      await this.closeAllStarVote(current.id, league);
    }
    const record = { league, round_label: roundLabel, status: 'open', opened_by: username || 'admin', created_at: new Date().toISOString() };
    let saved = null;
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_allstar_ballots').insert([record]).select();
        if (!error) saved = data[0];
      } catch { /* fall through */ }
    }
    if (!saved) {
      const list = ls.get(`${league}_allstar_ballots`);
      saved = { ...record, id: Date.now().toString() };
      ls.set(`${league}_allstar_ballots`, [...list, saved]);
    }
    logAudit('allstar.open', league, 'allstar_ballot', roundLabel);
    return saved;
  },

  async closeAllStarVote(id, league) {
    if (hasSupabase()) {
      try { await supabase.from('nova_allstar_ballots').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id); } catch {}
    }
    ls.set(`${league}_allstar_ballots`, ls.get(`${league}_allstar_ballots`).map(b => (b.id === id ? { ...b, status: 'closed' } : b)));
    logAudit('allstar.close', league, 'allstar_ballot', id);
  },

  async finalizeAllStarVote(id, league) {
    if (hasSupabase()) {
      try { await supabase.from('nova_allstar_ballots').update({ status: 'final', closed_at: new Date().toISOString() }).eq('id', id); } catch {}
    }
    ls.set(`${league}_allstar_ballots`, ls.get(`${league}_allstar_ballots`).map(b => (b.id === id ? { ...b, status: 'final' } : b)));
    logAudit('allstar.finalize', league, 'allstar_ballot', id);
  },

  async getAllStarVotes(league, ballotId) {
    if (!ballotId) return [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_allstar_votes').select('*').eq('league', league).eq('ballot_id', ballotId);
        if (!error && Array.isArray(data)) return data;
      } catch { /* fall through */ }
    }
    return ls.get(`${league}_allstar_votes`).filter(v => v.ballot_id === ballotId);
  },

  async getMyAllStarVotes(league, ballotId, username) {
    if (!ballotId || !username) return [];
    const all = await this.getAllStarVotes(league, ballotId);
    return all.filter(v => v.voter_username === username);
  },

  async castAllStarVote(league, ballotId, category, player, username) {
    const record = {
      ballot_id: ballotId, league, category,
      player_id: String(player.id), player_name: player.player_name || player.nickname || 'Unknown',
      voter_username: username, created_at: new Date().toISOString(),
    };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_allstar_votes')
          .upsert([record], { onConflict: 'ballot_id,category,voter_username' }).select();
        if (!error) return data[0];
      } catch { /* fall through */ }
    }
    const list = ls.get(`${league}_allstar_votes`)
      .filter(v => !(v.ballot_id === ballotId && v.category === category && v.voter_username === username));
    const saved = { ...record, id: Date.now().toString() };
    ls.set(`${league}_allstar_votes`, [...list, saved]);
    return saved;
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
    let saved = null;
    if (hasSupabase()) {
      try {
        const record = { ...comment };
        delete record.id;
        const { data, error } = await supabase.from('nova_comments').insert([record]).select();
        if (!error) saved = data[0];
      } catch {}
    }
    if (!saved) {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[comment.to_username] = [comment, ...(all[comment.to_username] || [])];
      localStorage.setItem('nova_comments', JSON.stringify(all));
      saved = comment;
    }
    if (comment.to_username && comment.to_username !== comment.from_username) {
      this.createNotification(comment.to_username, {
        type: 'comment', title: `${comment.from_username} commented on your profile`,
        body: (comment.content || '').slice(0, 120), link: `#members/${comment.to_username}`,
      }).catch(() => {});
    }
    return saved;
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

  /* ── GAME CHAT (Sports Hub "watch party" — live chat scoped to one
     real-world game, separate from the league PlayerComments thread).
     Requires: supabase/game_chat.sql to be run once. ── */
  async getGameChat(sport, gameId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_game_chat')
          .select('*')
          .eq('sport', sport)
          .eq('game_id', String(gameId))
          .order('created_at', { ascending: true });
        if (!error) return data;
      } catch {}
    }
    const all = ls.get(`sports_game_chat_${sport}`);
    return all.filter(c => String(c.game_id) === String(gameId));
  },

  async addGameChatMessage(sport, message) {
    const record = { ...message, sport, game_id: String(message.game_id), created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const insertRecord = { ...record };
        delete insertRecord.id;
        const { data, error } = await supabase.from('nova_game_chat').insert([insertRecord]).select();
        if (!error) return data[0];
      } catch {}
    }
    const key = `sports_game_chat_${sport}`;
    const list = ls.get(key);
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(key, [...list, newItem]);
    return newItem;
  },

  async deleteGameChatMessage(sport, id) {
    if (hasSupabase()) {
      try { await supabase.from('nova_game_chat').delete().eq('id', id); } catch {}
    }
    const key = `sports_game_chat_${sport}`;
    ls.set(key, ls.get(key).filter(c => c.id !== id));
  },

  /* ── PLAYER OF THE GAME (community voting, scoped to one real-world
     game — separate from the admin-assigned league POTM awards above).
     Requires: supabase/potg_votes.sql to be run once. ── */
  async getGameVotes(sport, gameId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_potg_votes')
          .select('*')
          .eq('sport', sport)
          .eq('game_id', String(gameId));
        if (!error) return data;
      } catch {}
    }
    const all = ls.get(`sports_potg_votes_${sport}`);
    return all.filter(v => String(v.game_id) === String(gameId));
  },

  async castGameVote(sport, vote) {
    const key = `sports_potg_votes_${sport}`;
    const record = { ...vote, sport, game_id: String(vote.game_id), created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        // One vote per member per game — replace their previous pick if any.
        await supabase.from('nova_potg_votes').delete()
          .eq('sport', sport).eq('game_id', record.game_id).eq('from_username', record.from_username);
        const insertRecord = { ...record };
        delete insertRecord.id;
        const { data, error } = await supabase.from('nova_potg_votes').insert([insertRecord]).select();
        if (!error) return data[0];
      } catch {}
    }
    const list = ls.get(key).filter(v => !(String(v.game_id) === record.game_id && v.from_username === record.from_username));
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(key, [...list, newItem]);
    return newItem;
  },

  /* ── SPORTS HUB ALL-STAR VOTING (league-wide real-sports ballot, by
     position + conference — up to 2 picks per conference per position;
     one ballot row per member per position+conference, most recent
     submission replaces their prior ballot for that slot). Distinct
     from the in-league getAllStarVotes/castAllStarVote pair above,
     which vote on Nova's own Roblox players, not real athletes.
     Requires: supabase/sports_allstar_votes.sql. ── */
  async getSportsAllStarVotes(sport, position) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_sports_allstar_votes')
          .select('*')
          .eq('sport', sport)
          .eq('position', position);
        if (!error) return data;
      } catch {}
    }
    const all = ls.get(`sports_allstar_votes_${sport}`);
    return all.filter(v => v.position === position);
  },

  async saveSportsAllStarBallot(sport, ballot) {
    // ballot: { position, conference, from_username, picks: [{id,name,team,photo}, ...] (max 2) }
    const key = `sports_allstar_votes_${sport}`;
    const record = { ...ballot, sport, created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        await supabase.from('nova_sports_allstar_votes').delete()
          .eq('sport', sport).eq('position', record.position).eq('conference', record.conference).eq('from_username', record.from_username);
        const insertRecord = { ...record };
        delete insertRecord.id;
        const { data, error } = await supabase.from('nova_sports_allstar_votes').insert([insertRecord]).select();
        if (!error) return data[0];
      } catch {}
    }
    const list = ls.get(key).filter(v => !(v.position === record.position && v.conference === record.conference && v.from_username === record.from_username));
    const newItem = { ...record, id: Date.now().toString() };
    ls.set(key, [...list, newItem]);
    return newItem;
  },

  /* ── FANTASY TEAM SCHEDULES ─────────────────────────────────────
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

  /* ── STAFF OF THE MONTH ──────────────────────────────────────
     A single spotlighted member set by an owner/co-founder — shown
     as a featured card on the home page and as a small badge next
     to their name on Member Pages / their profile. Everyone reads
     it; only owner/co-founder can set it (enforced client-side,
     same pattern as the rest of the admin dashboard). Run this SQL
     once in Supabase:

       CREATE TABLE IF NOT EXISTS nova_staff_of_month (
         id          TEXT PRIMARY KEY DEFAULT 'current',
         username    TEXT NOT NULL,
         note        TEXT,
         month_label TEXT,
         set_by      TEXT,
         created_at  TIMESTAMPTZ DEFAULT now()
       );
       ALTER TABLE nova_staff_of_month ENABLE ROW LEVEL SECURITY;
       CREATE POLICY "Public read"  ON nova_staff_of_month FOR SELECT USING (true);
       CREATE POLICY "Public write" ON nova_staff_of_month FOR ALL USING (true) WITH CHECK (true);

     Until that migration is run, this still works — it just falls
     back to localStorage (so only the browser that set it will see
     it) instead of syncing to every visitor. */

  async getStaffOfMonth() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_staff_of_month').select('*').eq('id', 'current').maybeSingle();
        if (!error && data) return data;
      } catch {}
    }
    try { return JSON.parse(localStorage.getItem('nova_staff_of_month') || 'null'); }
    catch { return null; }
  },

  async setStaffOfMonth(entry) {
    const record = {
      id: 'current',
      username: entry.username,
      note: entry.note || '',
      month_label: entry.month_label || '',
      set_by: entry.set_by || null,
      created_at: new Date().toISOString(),
    };
    if (hasSupabase()) {
      try { await supabase.from('nova_staff_of_month').upsert([record], { onConflict: 'id' }); } catch {}
    }
    localStorage.setItem('nova_staff_of_month', JSON.stringify(record));
    this.broadcastNotification({
      type: 'staff',
      title: `⭐ Staff of the Month: ${record.username}`,
      body: record.note || (record.month_label ? `Recognized for ${record.month_label}` : undefined),
      link: `#members/${record.username}`,
    }, record.set_by).catch(() => {});
    return record;
  },

  async clearStaffOfMonth() {
    if (hasSupabase()) {
      try { await supabase.from('nova_staff_of_month').delete().eq('id', 'current'); } catch {}
    }
    localStorage.removeItem('nova_staff_of_month');
  },

  /* Note: followed *league* teams (starring a Roblox league team so
     it surfaces first when opening Leagues) reuse the existing
     getFollowedTeams / addFollowedTeam / removeFollowedTeam trio
     further down (search "FOLLOWED TEAMS (Roblox league team-following)")
     rather than a second table — see favoritesService.js. This is a
     different concept from a member's real-world "Favorite Teams" on
     their profile (fav_teams, below). */

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
    const isNew = !article.id;
    if (hasSupabase()) {
      try {
        if (article.id) {
          const { data, error } = await supabase.from('nova_articles').update(article).eq('id', article.id).select();
          if (!error && data?.[0]) return data[0];
        } else {
          const { data, error } = await supabase.from('nova_articles').insert([article]).select();
          if (!error && data?.[0]) {
            if (isNew) notifyDiscordEvent('article', { title: data[0].title, author: data[0].author });
            return data[0];
          }
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
    if (isNew) notifyDiscordEvent('article', { title: local.title, author: local.author });
    return local;
  },

  async deleteArticle(id) {
    if (hasSupabase()) {
      try { await supabase.from('nova_articles').delete().eq('id', id); } catch {}
    }
    ls.set('nova_articles', ls.get('nova_articles').filter(a => a.id !== id));
  },

  /* ── PROFILE BADGES (owner/co-founder assigned, shown next to a member's name) ──
     Two pieces:
       nova_badge_types    — the badge catalog (name, icon, color, description)
       nova_member_badges  — which badges are assigned to which username
     Which of a member's assigned badges they've chosen to *display* lives on
     their profile row (member_profiles.displayed_badges), saved via the
     normal saveMemberProfile() call. */
  async getBadgeTypes() {
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_badge_types').select('*').order('created_at');
      if (!error) return data;
    }
    return ls.get('nova_badge_types');
  },

  async createBadgeType(badge) {
    const record = {
      name:        badge.name,
      icon:        badge.icon || '🏅',
      description: badge.description || '',
      color:       badge.color || '#5e81f4',
      created_by:  badge.created_by || null,
      created_at:  new Date().toISOString(),
    };
    if (hasSupabase()) {
      const { data, error } = await supabase.from('nova_badge_types').insert([record]).select();
      if (!error) {
        const list = ls.get('nova_badge_types');
        ls.set('nova_badge_types', [...list, data[0]]);
        return data[0];
      }
      console.error('createBadgeType: Supabase insert failed —', error.message, error);
    }
    const list = ls.get('nova_badge_types');
    const newItem = { ...record, id: Date.now().toString() };
    ls.set('nova_badge_types', [...list, newItem]);
    return newItem;
  },

  async deleteBadgeType(id) {
    if (hasSupabase()) {
      await supabase.from('nova_badge_types').delete().eq('id', id);
      await supabase.from('nova_member_badges').delete().eq('badge_id', id);
    }
    ls.set('nova_badge_types', ls.get('nova_badge_types').filter(b => String(b.id) !== String(id)));
    ls.set('nova_member_badges', ls.get('nova_member_badges').filter(a => String(a.badge_id) !== String(id)));
  },

  /** All badge assignments, or just one member's if username is passed. */
  async getMemberBadges(username) {
    if (hasSupabase()) {
      let q = supabase.from('nova_member_badges').select('*');
      if (username) q = q.eq('username', username);
      const { data, error } = await q.order('created_at');
      if (!error) return data;
    }
    const all = ls.get('nova_member_badges');
    return username ? all.filter(a => a.username === username) : all;
  },

  async assignBadge(username, badgeId, assignedBy) {
    const record = { username, badge_id: badgeId, assigned_by: assignedBy || null, created_at: new Date().toISOString() };
    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('nova_member_badges')
        .upsert([record], { onConflict: 'username,badge_id' })
        .select();
      if (!error) {
        const list = ls.get('nova_member_badges');
        const exists = list.findIndex(a => a.username === username && String(a.badge_id) === String(badgeId));
        if (exists >= 0) list[exists] = data[0]; else list.push(data[0]);
        ls.set('nova_member_badges', list);
        return data[0];
      }
      console.error('assignBadge: Supabase upsert failed —', error.message, error);
    }
    const list = ls.get('nova_member_badges');
    const exists = list.findIndex(a => a.username === username && String(a.badge_id) === String(badgeId));
    const newItem = { ...record, id: Date.now().toString() };
    if (exists >= 0) list[exists] = newItem; else list.push(newItem);
    ls.set('nova_member_badges', list);
    return newItem;
  },

  async unassignBadge(username, badgeId) {
    if (hasSupabase()) {
      await supabase.from('nova_member_badges').delete().eq('username', username).eq('badge_id', badgeId);
    }
    ls.set('nova_member_badges', ls.get('nova_member_badges').filter(a => !(a.username === username && String(a.badge_id) === String(badgeId))));
  },

  /* ── FOLLOWED TEAMS (Roblox league team-following) ────────────
     Not to be confused with a member's real-world "Favorite Teams" on
     their profile (see fav_teams in saveMemberProfile/getMemberProfiles
     above) — that's pro-sports fandom shown on their public page. This
     is a separate concept: starring an in-league Roblox team so it
     surfaces first when opening Leagues. Storage layer (Supabase table
     + localStorage key) is still named favorite_teams for now — only
     the JS-facing names changed, to avoid a data migration.
     Requires: favorite_teams table (see nova-migrations.sql). */
  async getFollowedTeams(username) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('favorite_teams').select('*').eq('member_username', username).order('created_at');
        if (!error) return data;
      } catch {}
    }
    return ls.get('favorite_teams').filter(t => t.member_username === username);
  },

  // Unfiltered read of the whole table — used by the Member Directory's
  // "followed team" filter, which needs every member's picks at once
  // rather than one member at a time.
  async getAllFollowedTeams() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('favorite_teams').select('*');
        if (!error) return data || [];
      } catch {}
    }
    return ls.get('favorite_teams');
  },

  /* ── KUDOS (member-to-member endorsements) ────────────────────
     Requires: nova_kudos table (see supabase/kudos.sql). One row per
     kudos given — a lightweight "thanks" with an optional note, shown
     on the receiving member's profile. Spam control is the same
     client-side rateLimiter already used for comments (kind: 'kudos'),
     not a server-side rule, matching this app's existing pattern. */
  async giveKudos(fromUsername, toUsername, note) {
    if (!fromUsername || !toUsername || fromUsername === toUsername) return null;
    const record = { from_username: fromUsername, to_username: toUsername, note: (note || '').slice(0, 200), created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_kudos').insert([record]).select();
        if (!error && data?.[0]) return data[0];
      } catch {}
    }
    const all = ls.get('nova_kudos');
    const local = { ...record, id: `local-${Date.now()}` };
    ls.set('nova_kudos', [...all, local]);
    return local;
  },

  async getKudosReceived(username) {
    if (!username) return [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('nova_kudos').select('*').eq('to_username', username).order('created_at', { ascending: false });
        if (!error) return data || [];
      } catch {}
    }
    return ls.get('nova_kudos').filter(k => k.to_username === username).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Unfiltered read of the whole table — used for a site-wide "most
  // kudos received" leaderboard, same pattern as getAllFollowedTeams.
  async getAllKudos() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_kudos').select('*');
        if (!error) return data || [];
      } catch {}
    }
    return ls.get('nova_kudos');
  },

  async addFollowedTeam(username, league, teamId, teamName) {
    const record = { member_username: username, league, team_id: teamId, team_name: teamName, created_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('favorite_teams').insert([record]).select();
        if (!error && data?.[0]) {
          ls.set('favorite_teams', [...ls.get('favorite_teams'), data[0]]);
          return data[0];
        }
      } catch {}
    }
    const local = { ...record, id: Date.now().toString() };
    ls.set('favorite_teams', [...ls.get('favorite_teams'), local]);
    return local;
  },

  async removeFollowedTeam(id) {
    if (hasSupabase()) {
      try { await supabase.from('favorite_teams').delete().eq('id', id); } catch {}
    }
    ls.set('favorite_teams', ls.get('favorite_teams').filter(t => String(t.id) !== String(id)));
  },

  /* ── NOW PLAYING (music "now listening" status) ───────────────
     Requires: now_playing table (see nova-migrations.sql).         */
  async getNowPlaying(username) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('now_playing').select('*').eq('member_username', username).maybeSingle();
        if (!error) return data;
      } catch {}
    }
    return ls.get('now_playing').find(n => n.member_username === username) || null;
  },

  async setNowPlaying(username, trackTitle, artist, source) {
    const record = { member_username: username, track_title: trackTitle, artist, source, updated_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('now_playing').upsert([record], { onConflict: 'member_username' }).select();
        if (!error && data?.[0]) {
          const list = ls.get('now_playing').filter(n => n.member_username !== username);
          ls.set('now_playing', [...list, data[0]]);
          return data[0];
        }
      } catch {}
    }
    const list = ls.get('now_playing').filter(n => n.member_username !== username);
    ls.set('now_playing', [...list, record]);
    return record;
  },

  /* ── XP / ACHIEVEMENTS (site-wide progression) ────────────────
     Requires: member_xp, achievements, member_achievements tables
     (see nova-migrations.sql).                                    */
  async getMemberXp(username) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('member_xp').select('*').eq('member_username', username).maybeSingle();
        if (!error) return data;
      } catch {}
    }
    return ls.get('member_xp').find(x => x.member_username === username) || null;
  },

  async setMemberXp(username, xp, level) {
    const record = { member_username: username, xp, level, updated_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('member_xp').upsert([record], { onConflict: 'member_username' }).select();
        if (!error && data?.[0]) {
          const list = ls.get('member_xp').filter(x => x.member_username !== username);
          ls.set('member_xp', [...list, data[0]]);
          return data[0];
        }
      } catch {}
    }
    const list = ls.get('member_xp').filter(x => x.member_username !== username);
    ls.set('member_xp', [...list, record]);
    return record;
  },

  async getMemberAchievements(username) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('member_achievements').select('*').eq('member_username', username);
        if (!error) return data;
      } catch {}
    }
    return ls.get('member_achievements').filter(a => a.member_username === username);
  },

  async grantAchievement(username, code) {
    const record = { member_username: username, achievement_code: code, earned_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('member_achievements').insert([record]).select();
        if (!error && data?.[0]) {
          ls.set('member_achievements', [...ls.get('member_achievements'), data[0]]);
          return data[0];
        }
      } catch {}
    }
    ls.set('member_achievements', [...ls.get('member_achievements'), record]);
    return record;
  },

  /* ── ROBLOX BADGES (badge showcase / trophy case) ─────────────
     Requires: roblox_badges table (see nova-migrations.sql).       */
  async getRobloxBadges(username) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('roblox_badges').select('*').eq('member_username', username);
        if (!error) return data;
      } catch {}
    }
    return ls.get('roblox_badges').filter(b => b.member_username === username);
  },

  async saveRobloxBadges(username, badges) {
    // badges: [{ badge_id, name, icon_url, awarded_at }, ...]
    const rows = badges.map(b => ({ member_username: username, ...b }));
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase
          .from('roblox_badges').upsert(rows, { onConflict: 'member_username,badge_id' }).select();
        if (!error && data) {
          const list = ls.get('roblox_badges').filter(b => b.member_username !== username);
          ls.set('roblox_badges', [...list, ...data]);
          return data;
        }
      } catch {}
    }
    const list = ls.get('roblox_badges').filter(b => b.member_username !== username);
    ls.set('roblox_badges', [...list, ...rows]);
    return rows;
  },

  /* ── SITE SETTINGS (generic key/value store) ────────────────
     Small owner-configurable values that don't warrant their own
     table — e.g. which Roblox place ID the homepage status widget
     should track. */
  async getSiteSetting(key) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_site_settings').select('value').eq('key', key).maybeSingle();
        if (!error && data) return data.value;
      } catch {}
    }
    try {
      const all = JSON.parse(localStorage.getItem('nova_site_settings') || '{}');
      return all[key];
    } catch { return undefined; }
  },

  async setSiteSetting(key, value) {
    if (hasSupabase()) {
      try {
        const { error } = await supabase.from('nova_site_settings')
          .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' });
        if (!error) logAudit('setting.update', null, 'site_setting', key);
      } catch {}
    }
    try {
      const all = JSON.parse(localStorage.getItem('nova_site_settings') || '{}');
      all[key] = value;
      localStorage.setItem('nova_site_settings', JSON.stringify(all));
    } catch {}
    return value;
  },

  /* ── USER STATS (reputation/XP, login streaks) ──────────────
     Synced (not per-browser-only like coins) so a member's level and
     streak show correctly from any device. */
  async getUserStats(username) {
    if (!username) return null;
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_user_stats').select('*').eq('username', username).maybeSingle();
        if (!error && data) return data;
      } catch {}
    }
    try {
      const all = JSON.parse(localStorage.getItem('nova_user_stats') || '{}');
      return all[username] || { username, xp: 0, login_streak: 0, last_login_date: null };
    } catch { return { username, xp: 0, login_streak: 0, last_login_date: null }; }
  },

  async getAllUserStats() {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_user_stats').select('*');
        if (!error) return data || [];
      } catch {}
    }
    try {
      const all = JSON.parse(localStorage.getItem('nova_user_stats') || '{}');
      return Object.values(all);
    } catch { return []; }
  },

  async updateUserStats(username, patch) {
    if (!username) return null;
    const merged = { username, ...patch, updated_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { error } = await supabase.from('nova_user_stats').upsert([merged], { onConflict: 'username' });
        if (!error) return merged;
      } catch {}
    }
    try {
      const all = JSON.parse(localStorage.getItem('nova_user_stats') || '{}');
      all[username] = { ...(all[username] || {}), ...merged };
      localStorage.setItem('nova_user_stats', JSON.stringify(all));
      return all[username];
    } catch { return merged; }
  },

  /* ── DIRECT MESSAGES ──────────────────────────────────────── */
  _dmConversationId(a, b) {
    return [a, b].sort().join('::');
  },

  async getConversations(username) {
    if (!username) return [];
    let rows = [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_direct_messages')
          .select('*').or(`from_username.eq.${username},to_username.eq.${username}`)
          .order('created_at', { ascending: false });
        if (!error) rows = data || [];
      } catch {}
    }
    if (!rows.length) {
      const all = JSON.parse(localStorage.getItem('nova_direct_messages') || '[]');
      rows = all.filter(m => m.from_username === username || m.to_username === username)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const byConvo = new Map();
    for (const m of rows) {
      if (!byConvo.has(m.conversation_id)) byConvo.set(m.conversation_id, m);
    }
    return Array.from(byConvo.values()).map(m => ({
      conversation_id: m.conversation_id,
      other_username: m.from_username === username ? m.to_username : m.from_username,
      last_message: m.content,
      last_at: m.created_at,
      unread: m.to_username === username && !m.read_at,
    }));
  },

  async getMessages(username, otherUsername) {
    const conversationId = this._dmConversationId(username, otherUsername);
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_direct_messages')
          .select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        if (!error) return data || [];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_direct_messages') || '[]');
    return all.filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  async sendMessage(fromUsername, toUsername, content) {
    const record = {
      conversation_id: this._dmConversationId(fromUsername, toUsername),
      from_username: fromUsername, to_username: toUsername, content,
      created_at: new Date().toISOString(), read_at: null,
    };
    let saved;
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_direct_messages').insert([record]).select();
        if (!error && data && data[0]) saved = data[0];
      } catch {}
    }
    if (!saved) {
      const all = JSON.parse(localStorage.getItem('nova_direct_messages') || '[]');
      saved = { ...record, id: Date.now().toString() };
      all.push(saved);
      localStorage.setItem('nova_direct_messages', JSON.stringify(all));
    }
    this.createNotification(toUsername, {
      type: 'dm', title: `New message from ${fromUsername}`,
      body: content.slice(0, 120), link: `#messages/${fromUsername}`,
    }).catch(() => {});
    return saved;
  },

  async markConversationRead(username, otherUsername) {
    const conversationId = this._dmConversationId(username, otherUsername);
    if (hasSupabase()) {
      try {
        await supabase.from('nova_direct_messages').update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId).eq('to_username', username).is('read_at', null);
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_direct_messages') || '[]');
    let changed = false;
    all.forEach(m => {
      if (m.conversation_id === conversationId && m.to_username === username && !m.read_at) {
        m.read_at = new Date().toISOString(); changed = true;
      }
    });
    if (changed) localStorage.setItem('nova_direct_messages', JSON.stringify(all));
  },

  async getUnreadDMCount(username) {
    const convos = await this.getConversations(username);
    return convos.filter(c => c.unread).length;
  },

  /* ── DAILY VISITS (owner analytics) ──────────────────────────
     One row per member per day — written once daily by
     reputationService.checkDailyLogin(). */
  async recordDailyVisit(username, dateStr) {
    if (!username || !dateStr) return;
    if (hasSupabase()) {
      try {
        await supabase.from('nova_daily_visits')
          .upsert([{ username, visit_date: dateStr }], { onConflict: 'username,visit_date' });
        return;
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_daily_visits') || '[]');
    if (!all.some(v => v.username === username && v.visit_date === dateStr)) {
      all.push({ username, visit_date: dateStr });
      localStorage.setItem('nova_daily_visits', JSON.stringify(all));
    }
  },

  async getDailyVisitCounts(days = 14) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    let rows = [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_daily_visits').select('*').gte('visit_date', cutoff);
        if (!error) rows = data || [];
      } catch {}
    }
    if (!rows.length) {
      const all = JSON.parse(localStorage.getItem('nova_daily_visits') || '[]');
      rows = all.filter(v => v.visit_date >= cutoff);
    }
    const counts = {};
    rows.forEach(v => { counts[v.visit_date] = (counts[v.visit_date] || 0) + 1; });
    return counts; // { '2026-08-18': 5, ... }
  },

  /* ── PLAYER FOLLOWS (per-member notification subscriptions on a
     specific player page) ────────────────────────────────────────
     Requires: nova_player_follows table —
       CREATE TABLE IF NOT EXISTS nova_player_follows (
         id BIGSERIAL PRIMARY KEY,
         username TEXT NOT NULL,
         league TEXT NOT NULL,
         player_id TEXT NOT NULL,
         player_name TEXT,
         notify_awards BOOLEAN DEFAULT true,
         notify_stats BOOLEAN DEFAULT true,
         created_at TIMESTAMPTZ DEFAULT now(),
         UNIQUE(username, league, player_id)
       );
       ALTER TABLE nova_player_follows ENABLE ROW LEVEL SECURITY;
       CREATE POLICY "Public read"  ON nova_player_follows FOR SELECT USING (true);
       CREATE POLICY "Public write" ON nova_player_follows FOR INSERT WITH CHECK (true);
       CREATE POLICY "Public update" ON nova_player_follows FOR UPDATE USING (true);
       CREATE POLICY "Public delete" ON nova_player_follows FOR DELETE USING (true);         */
  async getPlayerFollows(username) {
    if (!username) return [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_player_follows').select('*').eq('username', username);
        if (!error) return data || [];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_player_follows') || '[]');
    return all.filter(f => f.username === username);
  },

  async isFollowingPlayer(username, league, playerId) {
    const list = await this.getPlayerFollows(username);
    return list.find(f => f.league === league && String(f.player_id) === String(playerId)) || null;
  },

  async followPlayer(username, league, playerId, playerName, prefs = {}) {
    const record = {
      username, league, player_id: String(playerId), player_name: playerName || null,
      notify_awards: prefs.notify_awards !== false, notify_stats: prefs.notify_stats !== false,
      created_at: new Date().toISOString(),
    };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_player_follows')
          .upsert([record], { onConflict: 'username,league,player_id' }).select();
        if (!error && data && data[0]) return data[0];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_player_follows') || '[]');
    const existsIdx = all.findIndex(f => f.username === username && f.league === league && String(f.player_id) === String(playerId));
    const saved = { ...record, id: existsIdx >= 0 ? all[existsIdx].id : Date.now().toString() };
    if (existsIdx >= 0) all[existsIdx] = saved; else all.push(saved);
    localStorage.setItem('nova_player_follows', JSON.stringify(all));
    return saved;
  },

  async updatePlayerFollowPrefs(username, league, playerId, patch) {
    if (hasSupabase()) {
      try {
        await supabase.from('nova_player_follows').update(patch)
          .eq('username', username).eq('league', league).eq('player_id', String(playerId));
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_player_follows') || '[]');
    const idx = all.findIndex(f => f.username === username && f.league === league && String(f.player_id) === String(playerId));
    if (idx >= 0) { all[idx] = { ...all[idx], ...patch }; localStorage.setItem('nova_player_follows', JSON.stringify(all)); }
  },

  async unfollowPlayer(username, league, playerId) {
    if (hasSupabase()) {
      try { await supabase.from('nova_player_follows').delete().eq('username', username).eq('league', league).eq('player_id', String(playerId)); } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_player_follows') || '[]');
    localStorage.setItem('nova_player_follows', JSON.stringify(all.filter(f => !(f.username === username && f.league === league && String(f.player_id) === String(playerId)))));
  },

  // Everyone following a given player page — used to fan out a
  // notification when an award/accolade/stat update happens for them.
  async getPlayerFollowers(league, playerId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_player_follows')
          .select('*').eq('league', league).eq('player_id', String(playerId));
        if (!error) return data || [];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_player_follows') || '[]');
    return all.filter(f => f.league === league && String(f.player_id) === String(playerId));
  },

  // Fans a notification out to every follower of a player, respecting
  // their per-follow toggle (notify_awards / notify_stats). prefKey is
  // whichever of those two columns gates this particular event.
  async notifyPlayerFollowers(league, playerId, prefKey, { type, title, body, link }) {
    try {
      const followers = await this.getPlayerFollowers(league, playerId);
      await Promise.all(
        followers
          .filter(f => f[prefKey] !== false)
          .map(f => this.createNotification(f.username, { type, title, body, link }))
      );
    } catch {
      // notification fan-out must never break the underlying save
    }
  },

  // Fans a notification out to every registered member — used for
  // site-wide announcements (e.g. Staff of the Month) rather than
  // events tied to a single follow relationship. Best-effort: a
  // failure here should never break the announcement itself.
  async broadcastNotification({ type, title, body, link }, excludeUsername = null) {
    try {
      const users = await this.getUsers();
      await Promise.all(
        (users || [])
          .filter(u => u.username && u.username !== excludeUsername)
          .map(u => this.createNotification(u.username, { type, title, body, link }))
      );
    } catch {
      // fan-out must never break the underlying save
    }
  },

  /* ── NOTIFICATIONS ────────────────────────────────────────── */
  async createNotification(username, { type, title, body, link }) {
    if (!username) return null;
    const record = { username, type, title, body: body || null, link: link || null, created_at: new Date().toISOString(), read_at: null };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_notifications').insert([record]).select();
        if (!error && data && data[0]) return data[0];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_notifications') || '[]');
    const saved = { ...record, id: Date.now().toString() };
    all.push(saved);
    localStorage.setItem('nova_notifications', JSON.stringify(all));
    return saved;
  },

  async getNotifications(username, limit = 30) {
    if (!username) return [];
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_notifications')
          .select('*').eq('username', username).order('created_at', { ascending: false }).limit(limit);
        if (!error) return data || [];
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_notifications') || '[]');
    return all.filter(n => n.username === username).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
  },

  async getUnreadNotificationCount(username) {
    const list = await this.getNotifications(username, 50);
    return list.filter(n => !n.read_at).length;
  },

  async markNotificationsRead(username) {
    if (!username) return;
    if (hasSupabase()) {
      try {
        await supabase.from('nova_notifications').update({ read_at: new Date().toISOString() }).eq('username', username).is('read_at', null);
      } catch {}
    }
    const all = JSON.parse(localStorage.getItem('nova_notifications') || '[]');
    let changed = false;
    all.forEach(n => { if (n.username === username && !n.read_at) { n.read_at = new Date().toISOString(); changed = true; } });
    if (changed) localStorage.setItem('nova_notifications', JSON.stringify(all));
  },

  /* ── SEASON ARCHIVE ───────────────────────────────────────────────
     Summary snapshots (see SeasonArchiveTab in LeagueFeatures.jsx) plus
     one nova_player_season_archive row per player per snapshot, storing
     that player's season stats at capture time. The per-player rows are
     what let a player's page plot a "Career Arc" — a stat trending
     season over season — once a couple of snapshots have been saved. */
  async getSeasonArchive(league) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_season_archive')
          .select('*').eq('league', league).order('captured_at', { ascending: false });
        if (!error && Array.isArray(data)) return data;
      } catch { /* fall through */ }
    }
    return [...ls.get(`${league}_season_archive`)].reverse();
  },

  // playerSnapshots: [{ player_id, player_name, stats: { field: value, ... } }, ...]
  async saveSeasonArchive(league, item, playerSnapshots = []) {
    const record = { ...item, league, captured_at: new Date().toISOString() };
    let saved = null;

    if (hasSupabase()) {
      try {
        delete record.id;
        const { data, error } = await supabase.from('nova_season_archive').insert([record]).select();
        if (!error && data && data[0]) saved = data[0];
      } catch { /* fall through */ }
    }
    if (!saved) {
      saved = { ...record, id: Date.now().toString() };
      const list = ls.get(`${league}_season_archive`);
      ls.set(`${league}_season_archive`, [...list, saved]);
    }

    if (playerSnapshots.length) {
      const rows = playerSnapshots.map(p => ({
        league, snapshot_id: saved.id, season: String(saved.season),
        player_id: String(p.player_id), player_name: p.player_name || '',
        stats: p.stats || {}, captured_at: saved.captured_at,
      }));
      if (hasSupabase()) {
        try {
          await supabase.from('nova_player_season_archive').insert(rows);
        } catch { /* per-player history is a bonus — never block the snapshot itself */ }
      } else {
        const key = `${league}_player_season_archive`;
        const list = ls.get(key);
        ls.set(key, [...list, ...rows.map(r => ({ ...r, id: `${Date.now()}_${r.player_id}` }))]);
      }
    }

    logAudit('archive.snapshot', league, 'season_archive', saved.season);
    return saved;
  },

  // Chronological (oldest first) stat-snapshot history for one player —
  // what PlayerDevelopmentArcPanel plots for the "Career Arc" view.
  async getPlayerSeasonArchive(league, playerId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from('nova_player_season_archive')
          .select('*').eq('league', league).eq('player_id', String(playerId)).order('captured_at', { ascending: true });
        if (!error && Array.isArray(data)) return data;
      } catch { /* fall through */ }
    }
    return ls.get(`${league}_player_season_archive`)
      .filter(r => String(r.player_id) === String(playerId))
      .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
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

/* ── Shared: stable sort respecting a manual sort_index ────────────
   Items with a numeric sort_index sort by it (ascending — lower shows
   first, i.e. "closer to the front of the trophy case"). Items without
   one (undefined/null) keep their original relative order and sort
   after every explicitly-ordered item. Used by the Owner Dashboard
   awards admin panel and the player page's trophy case/awards display
   so both agree on the same order. */
export function sortByDisplayOrder(list) {
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ai = typeof a.item.sort_index === 'number' ? a.item.sort_index : null;
      const bi = typeof b.item.sort_index === 'number' ? b.item.sort_index : null;
      if (ai === null && bi === null) return a.i - b.i;
      if (ai === null) return 1;
      if (bi === null) return -1;
      return ai - bi;
    })
    .map(({ item }) => item);
}

export default db;
