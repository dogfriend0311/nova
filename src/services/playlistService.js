/**
 * playlistService.js — Data service for the Music Hub's Playlists tab.
 * Same Supabase-first ( /api/query, see supabaseClient.js ) / localStorage
 * fallback convention as db.js / pickemsDb.js / fantasyDb.js. Column names
 * mirror supabase/nova_playlists.sql — keep them in sync.
 *
 * Two kinds of playlist live in the same `nova_playlists` table:
 *   - featured (is_featured = true): the owner/co-owner-built playlist(s),
 *     pinned to the top for every member. Only 'owner'/'cofounder' may
 *     create, rename, delete, or add/remove/reorder songs in these —
 *     enforced by the UI via canEditPlaylist() below (same client-side
 *     enforcement pattern the rest of the app uses).
 *   - personal (is_featured = false): a regular member's own playlist.
 *     Only that member (created_by) may edit it.
 */
import { supabase } from './supabaseClient';

const hasSupabase = () => true; // Rivestack via /api/query — no client-side env vars needed

const ls = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const PLAYLISTS_TABLE = 'nova_playlists';
const SONGS_TABLE = 'nova_playlist_songs';

/* ── Permissions ───────────────────────────────────────────────────
   Same "owner + co-owner only" idiom used elsewhere in the app
   (see OwnerDashboard.jsx's isBadgeManager / isAthleteRatingsEditor). */
export function isOwnerOrCofounder(user) {
  return ['owner', 'cofounder'].includes(user?.role);
}

export function canEditPlaylist(playlist, user) {
  if (!user || !playlist) return false;
  if (playlist.is_featured) return isOwnerOrCofounder(user);
  return playlist.created_by === user.username;
}

/* ── Playlists ─────────────────────────────────────────────────────── */

async function fetchPlaylists(filters) {
  if (hasSupabase()) {
    try {
      let q = supabase.from(PLAYLISTS_TABLE).select('*');
      Object.entries(filters || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q.order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) return data;
    } catch { /* fall through */ }
  }
  let list = ls.get(PLAYLISTS_TABLE);
  Object.entries(filters || {}).forEach(([k, v]) => { list = list.filter((r) => r[k] === v); });
  return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

const playlistService = {
  uid,
  isOwnerOrCofounder,
  canEditPlaylist,

  /** Every playlist a given member sees: official/featured ones (visible
   *  to everyone, pinned first) followed by that member's own playlists. */
  async getPlaylistsForUser(username) {
    const [featured, mine] = await Promise.all([
      fetchPlaylists({ is_featured: true }),
      username ? fetchPlaylists({ created_by: username, is_featured: false }) : Promise.resolve([]),
    ]);
    return { featured, mine };
  },

  async getPlaylist(id) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from(PLAYLISTS_TABLE).select('*').eq('id', id).maybeSingle();
        if (!error) return data;
      } catch { /* fall through */ }
    }
    return ls.get(PLAYLISTS_TABLE).find((p) => p.id === id) || null;
  },

  async createPlaylist({ name, createdBy, isFeatured = false, description = null }) {
    const record = {
      id: uid(),
      name: (name || 'Untitled Playlist').trim(),
      description,
      is_featured: !!isFeatured,
      created_by: createdBy,
      cover_thumbnail: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from(PLAYLISTS_TABLE).insert([record]).select();
        if (!error) {
          ls.set(PLAYLISTS_TABLE, [...ls.get(PLAYLISTS_TABLE), data[0]]);
          return data[0];
        }
      } catch { /* fall through */ }
    }
    ls.set(PLAYLISTS_TABLE, [...ls.get(PLAYLISTS_TABLE), record]);
    return record;
  },

  async renamePlaylist(id, name) {
    const patch = { name: (name || '').trim(), updated_at: new Date().toISOString() };
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from(PLAYLISTS_TABLE).update(patch).eq('id', id).select();
        if (!error) {
          ls.set(PLAYLISTS_TABLE, ls.get(PLAYLISTS_TABLE).map((p) => (p.id === id ? data[0] : p)));
          return data[0];
        }
      } catch { /* fall through */ }
    }
    const list = ls.get(PLAYLISTS_TABLE).map((p) => (p.id === id ? { ...p, ...patch } : p));
    ls.set(PLAYLISTS_TABLE, list);
    return list.find((p) => p.id === id);
  },

  async deletePlaylist(id) {
    if (hasSupabase()) {
      try { await supabase.from(SONGS_TABLE).delete().eq('playlist_id', id); } catch { /* cascades server-side anyway */ }
      try { await supabase.from(PLAYLISTS_TABLE).delete().eq('id', id); } catch { /* fall through */ }
    }
    ls.set(SONGS_TABLE, ls.get(SONGS_TABLE).filter((s) => s.playlist_id !== id));
    ls.set(PLAYLISTS_TABLE, ls.get(PLAYLISTS_TABLE).filter((p) => p.id !== id));
  },

  /* ── Songs ─────────────────────────────────────────────────────── */

  async getSongs(playlistId) {
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from(SONGS_TABLE).select('*').eq('playlist_id', playlistId).order('position', { ascending: true });
        if (!error && Array.isArray(data)) return data;
      } catch { /* fall through */ }
    }
    return ls.get(SONGS_TABLE)
      .filter((s) => s.playlist_id === playlistId)
      .sort((a, b) => a.position - b.position);
  },

  /** Adds a song (skips silently if that videoId is already in the
   *  playlist) and bumps the playlist's cover art if it didn't have one. */
  async addSong(playlistId, song, addedBy) {
    const existing = await this.getSongs(playlistId);
    if (existing.some((s) => s.video_id === song.videoId)) return null;

    const record = {
      id: uid(),
      playlist_id: playlistId,
      video_id: song.videoId,
      title: song.title || 'Unknown title',
      artist: song.artist || '',
      thumbnail: song.thumbnail || null,
      duration: song.duration || null,
      position: existing.length,
      added_by: addedBy || null,
      added_at: new Date().toISOString(),
    };

    let saved = record;
    if (hasSupabase()) {
      try {
        const { data, error } = await supabase.from(SONGS_TABLE).insert([record]).select();
        if (!error) saved = data[0];
      } catch { /* fall through, still keep local copy below */ }
    }
    ls.set(SONGS_TABLE, [...ls.get(SONGS_TABLE), saved]);

    if (existing.length === 0 && record.thumbnail) {
      const patch = { cover_thumbnail: record.thumbnail, updated_at: new Date().toISOString() };
      if (hasSupabase()) {
        try { await supabase.from(PLAYLISTS_TABLE).update(patch).eq('id', playlistId); } catch { /* fine, cosmetic only */ }
      }
      ls.set(PLAYLISTS_TABLE, ls.get(PLAYLISTS_TABLE).map((p) => (p.id === playlistId ? { ...p, ...patch } : p)));
    }
    return saved;
  },

  async removeSong(songRowId, playlistId) {
    if (hasSupabase()) {
      try { await supabase.from(SONGS_TABLE).delete().eq('id', songRowId); } catch { /* fall through */ }
    }
    ls.set(SONGS_TABLE, ls.get(SONGS_TABLE).filter((s) => s.id !== songRowId));
    // Close any gap left behind so `position` stays a clean 0..n-1 run.
    const remaining = await this.getSongs(playlistId);
    await this.reorder(playlistId, remaining.map((s) => s.id));
  },

  /** orderedIds: song row ids in the new desired order. */
  async reorder(playlistId, orderedIds) {
    const updates = orderedIds.map((songId, index) => ({ songId, position: index }));
    if (hasSupabase()) {
      await Promise.all(updates.map(({ songId, position }) =>
        supabase.from(SONGS_TABLE).update({ position }).eq('id', songId).catch(() => {})));
    }
    const posById = new Map(updates.map((u) => [u.songId, u.position]));
    const list = ls.get(SONGS_TABLE).map((s) => (posById.has(s.id) ? { ...s, position: posById.get(s.id) } : s));
    ls.set(SONGS_TABLE, list);
  },

  moveSong(orderedIds, fromIndex, toIndex) {
    const next = orderedIds.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  },

  shuffleOrder(orderedIds) {
    const next = orderedIds.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  },
};

export default playlistService;
