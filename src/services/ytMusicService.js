// src/services/ytMusicService.js
//
// Thin client for /api/ytmusic (see that file for the full list of
// supported actions). GET is used for read-only lookups so responses can
// be cached/shared by URL; POST is used for the handful of actions that
// send a longer payload (bulk id lists) or write library state (ratings,
// subscriptions, history). Playlist creation/editing and uploads are not
// exposed here — see api/ytmusic.py for why.

const ENDPOINT = '/api/ytmusic';

async function callGet(action, params = {}) {
  const qs = new URLSearchParams({ action });
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  const res = await fetch(`${ENDPOINT}?${qs.toString()}`);
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!res.ok || !data.ok) throw new Error(data.error || `Nova Music request failed (${res.status})`);
  return data.result;
}

async function callPost(action, body = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!res.ok || !data.ok) throw new Error(data.error || `Nova Music request failed (${res.status})`);
  return data.result;
}

const ytMusicService = {
  // ── Browsing: search & suggestions ──────────────────────────────
  search: (query, { filter, scope, limit, ignoreSpelling } = {}) =>
    callGet('search', { query, filter, scope, limit, ignore_spelling: ignoreSpelling }),
  getSearchSuggestions: (query) => callGet('get_search_suggestions', { query }),
  removeSearchSuggestions: (suggestions, indices) =>
    callPost('remove_search_suggestions', { suggestions, indices }),

  // ── Browsing: artists, users, albums, songs ─────────────────────
  getArtist: (channelId) => callGet('get_artist', { channelId }),
  getArtistAlbums: (channelId, params, { limit, order } = {}) =>
    callGet('get_artist_albums', { channelId, params, limit, order }),
  getUser: (channelId) => callGet('get_user', { channelId }),
  getUserPlaylists: (channelId, params) => callGet('get_user_playlists', { channelId, params }),
  getUserVideos: (channelId, params) => callGet('get_user_videos', { channelId, params }),
  getAlbumBrowseId: (audioPlaylistId) => callGet('get_album_browse_id', { audioPlaylistId }),
  getAlbum: (browseId) => callGet('get_album', { browseId }),
  getSong: (videoId, signatureTimestamp) => callGet('get_song', { videoId, signatureTimestamp }),
  getSongRelated: (browseId) => callGet('get_song_related', { browseId }),
  getSongCredits: (browseId) => callGet('get_song_credits', { browseId }),
  getLyrics: (browseId, timestamps) => callGet('get_lyrics', { browseId, timestamps }),

  // ── Watch playlists (next-up when you press play/radio/shuffle) ─
  getWatchPlaylist: (opts = {}) => callGet('get_watch_playlist', opts),

  // ── Exploring music: moods/genres + charts ──────────────────────
  getMoodCategories: () => callGet('get_mood_categories'),
  getMoodPlaylists: (params) => callGet('get_mood_playlists', { params }),
  getCharts: (country) => callGet('get_charts', { country }),

  // ── Library management ───────────────────────────────────────────
  getLibrarySongs: (opts = {}) => callGet('get_library_songs', opts),
  getLibraryAlbums: (opts = {}) => callGet('get_library_albums', opts),
  getLibraryArtists: (opts = {}) => callGet('get_library_artists', opts),
  getLibrarySubscriptions: (opts = {}) => callGet('get_library_subscriptions', opts),
  getLibraryPodcasts: (opts = {}) => callGet('get_library_podcasts', opts),
  getLibraryChannels: (opts = {}) => callGet('get_library_channels', opts),
  getHistory: () => callGet('get_history'),
  addHistoryItem: (song) => callPost('add_history_item', { song }),
  removeHistoryItems: (feedbackTokens) => callPost('remove_history_items', { feedbackTokens }),
  rateSong: (videoId, rating) => callPost('rate_song', { videoId, rating }),
  ratePlaylist: (playlistId, rating) => callPost('rate_playlist', { playlistId, rating }),
  editSongLibraryStatus: (feedbackTokens) => callPost('edit_song_library_status', { feedbackTokens }),
  subscribeArtists: (channelIds) => callPost('subscribe_artists', { channelIds }),
  unsubscribeArtists: (channelIds) => callPost('unsubscribe_artists', { channelIds }),
  getAccountInfo: () => callGet('get_account_info'),

  // ── Playlists (view-only — no create/edit/delete/upload) ──────────
  getPlaylist: (playlistId, opts = {}) => callGet('get_playlist', { playlistId, ...opts }),

  // ── Podcasts ──────────────────────────────────────────────────────
  getChannel: (channelId) => callGet('get_channel', { channelId }),
  getChannelEpisodes: (channelId, params) => callGet('get_channel_episodes', { channelId, params }),
  getPodcast: (playlistId, limit) => callGet('get_podcast', { playlistId, limit }),
  getEpisode: (videoId) => callGet('get_episode', { videoId }),
  getEpisodesPlaylist: (playlistId) => callGet('get_episodes_playlist', { playlist_id: playlistId }),
};

export default ytMusicService;
