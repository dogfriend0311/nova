/* ── Last.fm Service ─────────────────────────────────────────────
   Key priority: localStorage (runtime) → REACT_APP env var (build)
   Using localStorage means admins can set the key without a rebuild.
──────────────────────────────────────────────────────────────── */
const BASE = 'https://ws.audioscrobbler.com/2.0/';
const LS_KEY = 'nova_lastfm_api_key';

function getApiKey() {
  const stored = localStorage.getItem(LS_KEY) || '';
  if (stored.trim()) return stored.trim();
  return (process.env.REACT_APP_LASTFM_KEY || '').trim();
}

export function hasApiKey() { return !!getApiKey(); }

export function saveApiKey(key) {
  localStorage.setItem(LS_KEY, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(LS_KEY);
}

/* ── Internal fetch helper ────────────────────────────────────── */
async function lfmFetch(params) {
  const key = getApiKey();
  if (!key) return null;
  try {
    const q   = new URLSearchParams({ ...params, format: 'json', api_key: key });
    const res = await fetch(`${BASE}?${q}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

function pickImage(images, preferSize = 'large') {
  if (!images || !images.length) return null;
  const order = [preferSize, 'extralarge', 'mega', 'large', 'medium', 'small'];
  for (const size of order) {
    const img = images.find((i) => i.size === size);
    if (img?.['#text']) return img['#text'];
  }
  return null;
}

/* ── User info ────────────────────────────────────────────────── */
export async function getUserInfo(username) {
  const data = await lfmFetch({ method: 'user.getInfo', user: username });
  if (!data?.user) return null;
  const u = data.user;
  return {
    name:       u.name,
    realname:   u.realname || '',
    url:        u.url,
    image:      pickImage(u.image, 'extralarge'),
    playcount:  parseInt(u.playcount, 10) || 0,
    country:    u.country || '',
    registered: u.registered?.['#text'] || '',
  };
}

/* ── Now playing / recent ─────────────────────────────────────── */
export async function getNowPlaying(username) {
  if (!username) return null;
  const data = await lfmFetch({ method: 'user.getRecentTracks', user: username, limit: 1 });
  if (!data?.recenttracks?.track) return null;
  const tracks    = data.recenttracks.track;
  const track     = Array.isArray(tracks) ? tracks[0] : tracks;
  const isPlaying = track?.['@attr']?.nowplaying === 'true';
  return {
    isPlaying,
    trackName:  track.name || '',
    artistName: track.artist?.['#text'] || track.artist || '',
    albumName:  track.album?.['#text'] || '',
    albumArt:   pickImage(track.image),
    trackUrl:   track.url || null,
    userUrl:    `https://www.last.fm/user/${username}`,
  };
}

export async function getRecentTracks(username, limit = 10) {
  const data = await lfmFetch({ method: 'user.getRecentTracks', user: username, limit });
  const raw  = data?.recenttracks?.track;
  if (!raw) return [];
  const tracks = Array.isArray(raw) ? raw : [raw];
  return tracks.map((t) => ({
    name:       t.name,
    artist:     t.artist?.['#text'] || t.artist || '',
    album:      t.album?.['#text'] || '',
    image:      pickImage(t.image, 'medium'),
    url:        t.url,
    nowplaying: t?.['@attr']?.nowplaying === 'true',
    date:       t.date?.['#text'] || null,
    dateUts:    t.date?.uts ? parseInt(t.date.uts, 10) * 1000 : null,
  }));
}

/* ── Top artists ──────────────────────────────────────────────── */
export async function getTopArtists(username, period = '1month', limit = 12) {
  const data = await lfmFetch({ method: 'user.getTopArtists', user: username, period, limit });
  const raw  = data?.topartists?.artist;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((a, i) => ({
    rank:      i + 1,
    name:      a.name,
    playcount: parseInt(a.playcount, 10) || 0,
    image:     pickImage(a.image, 'extralarge') || pickImage(a.image, 'large'),
    url:       a.url,
  }));
}

/* ── Top tracks ───────────────────────────────────────────────── */
export async function getTopTracks(username, period = '1month', limit = 15) {
  const data = await lfmFetch({ method: 'user.getTopTracks', user: username, period, limit });
  const raw  = data?.toptracks?.track;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((t, i) => ({
    rank:      i + 1,
    name:      t.name,
    artist:    t.artist?.name || '',
    playcount: parseInt(t.playcount, 10) || 0,
    image:     pickImage(t.image, 'medium'),
    url:       t.url,
  }));
}

/* ── Top tags (genres) ────────────────────────────────────────── */
export async function getTopTags(username, limit = 20) {
  const data = await lfmFetch({ method: 'user.getTopTags', user: username, limit });
  const raw  = data?.toptags?.tag;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((t) => ({
    name:  t.name,
    count: parseInt(t.count, 10) || 0,
    url:   t.url,
  }));
}

/* ── Loved tracks ─────────────────────────────────────────────── */
export async function getLovedTracks(username, limit = 10) {
  const data = await lfmFetch({ method: 'user.getLovedTracks', user: username, limit });
  const raw  = data?.lovedtracks?.track;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((t) => ({
    name:   t.name,
    artist: t.artist?.name || '',
    image:  pickImage(t.image, 'medium'),
    url:    t.url,
    date:   t.date?.['#text'] || null,
  }));
}
