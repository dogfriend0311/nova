/* ── Last.fm Service ─────────────────────────────────────────────
   Key priority: localStorage (runtime) → REACT_APP env var (build)
   Images: Last.fm CDN is broken / artist images removed in 2019.
           We fall back to iTunes Search API (free, no auth, CORS OK).
──────────────────────────────────────────────────────────────── */
const BASE    = 'https://ws.audioscrobbler.com/2.0/';
const LS_KEY  = 'nova_lastfm_api_key';

/* Last.fm's universal "no image" placeholder hash — treat as null */
const LFM_PLACEHOLDER = '2a96cbd8b46e442fc4';

/* ── API key helpers ──────────────────────────────────────────── */
function getApiKey() {
  const stored = localStorage.getItem(LS_KEY) || '';
  if (stored.trim()) return stored.trim();
  return (process.env.REACT_APP_LASTFM_KEY || '').trim();
}
export function hasApiKey()      { return !!getApiKey(); }
export function saveApiKey(key)  { localStorage.setItem(LS_KEY, key.trim()); }
export function clearApiKey()    { localStorage.removeItem(LS_KEY); }

/* ── Detect & strip Last.fm placeholder images ────────────────── */
function isPlaceholder(url) {
  return !url || url.includes(LFM_PLACEHOLDER);
}

function pickImage(images, preferSize = 'large') {
  if (!images || !images.length) return null;
  const order = [preferSize, 'extralarge', 'mega', 'large', 'medium', 'small'];
  for (const size of order) {
    const img = images.find((i) => i.size === size);
    if (img?.['#text'] && !isPlaceholder(img['#text'])) return img['#text'];
  }
  return null;
}

/* ── iTunes Search API (image fallback) ───────────────────────── */
const itunesCache = new Map();

async function itunesFetch(term, entity) {
  const key = `${entity}::${term.toLowerCase()}`;
  if (itunesCache.has(key)) return itunesCache.get(key);
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=1&media=music`;
    const res  = await fetch(url);
    if (!res.ok) { itunesCache.set(key, null); return null; }
    const data = await res.json();
    const result = data?.results?.[0] || null;
    itunesCache.set(key, result);
    return result;
  } catch {
    itunesCache.set(key, null);
    return null;
  }
}

function itunesArtwork(result, size = 600) {
  const raw = result?.artworkUrl100;
  if (!raw) return null;
  return raw.replace('100x100bb', `${size}x${size}bb`);
}

async function getArtistImage(artistName) {
  const result = await itunesFetch(artistName, 'song');
  return itunesArtwork(result, 300);
}

async function getTrackArtwork(artistName, trackName) {
  const result = await itunesFetch(`${artistName} ${trackName}`, 'song');
  return itunesArtwork(result, 300);
}

/* ── Last.fm fetch helper ─────────────────────────────────────── */
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

/* ── Enrich a list with iTunes images in parallel ─────────────── */
async function enrichWithArtistImages(items) {
  await Promise.all(
    items.map(async (item) => {
      if (!item.image) {
        item.image = await getArtistImage(item.name);
      }
    })
  );
  return items;
}

async function enrichWithTrackArtwork(items) {
  await Promise.all(
    items.map(async (item) => {
      if (!item.image) {
        item.image = await getTrackArtwork(item.artist || '', item.name);
      }
    })
  );
  return items;
}

/* ── User info ────────────────────────────────────────────────── */
export async function getUserInfo(username) {
  const data = await lfmFetch({ method: 'user.getInfo', user: username });
  if (!data?.user) return null;
  const u = data.user;
  let avatar = pickImage(u.image, 'extralarge');
  if (!avatar) {
    const itunes = await itunesFetch(u.name, 'musicArtist');
    avatar = itunesArtwork(itunes, 300);
  }
  return {
    name:       u.name,
    realname:   u.realname || '',
    url:        u.url,
    image:      avatar,
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
  const artistName = track.artist?.['#text'] || track.artist || '';
  let albumArt = pickImage(track.image);
  if (!albumArt) albumArt = await getTrackArtwork(artistName, track.name || '');
  return {
    isPlaying,
    trackName:  track.name || '',
    artistName,
    albumName:  track.album?.['#text'] || '',
    albumArt,
    trackUrl:   track.url || null,
    userUrl:    `https://www.last.fm/user/${username}`,
  };
}

export async function getRecentTracks(username, limit = 10) {
  const data = await lfmFetch({ method: 'user.getRecentTracks', user: username, limit });
  const raw  = data?.recenttracks?.track;
  if (!raw) return [];
  const tracks = Array.isArray(raw) ? raw : [raw];
  const list = tracks.map((t) => ({
    name:       t.name,
    artist:     t.artist?.['#text'] || t.artist || '',
    album:      t.album?.['#text'] || '',
    image:      pickImage(t.image, 'medium'),
    url:        t.url,
    nowplaying: t?.['@attr']?.nowplaying === 'true',
    date:       t.date?.['#text'] || null,
    dateUts:    t.date?.uts ? parseInt(t.date.uts, 10) * 1000 : null,
  }));
  return enrichWithTrackArtwork(list);
}

/* ── Top artists ──────────────────────────────────────────────── */
export async function getTopArtists(username, period = '1month', limit = 12) {
  const data = await lfmFetch({ method: 'user.getTopArtists', user: username, period, limit });
  const raw  = data?.topartists?.artist;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const artists = list.map((a, i) => ({
    rank:      i + 1,
    name:      a.name,
    playcount: parseInt(a.playcount, 10) || 0,
    image:     pickImage(a.image, 'extralarge'),
    url:       a.url,
  }));
  return enrichWithArtistImages(artists);
}

/* ── Top tracks ───────────────────────────────────────────────── */
export async function getTopTracks(username, period = '1month', limit = 15) {
  const data = await lfmFetch({ method: 'user.getTopTracks', user: username, period, limit });
  const raw  = data?.toptracks?.track;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const tracks = list.map((t, i) => ({
    rank:      i + 1,
    name:      t.name,
    artist:    t.artist?.name || '',
    playcount: parseInt(t.playcount, 10) || 0,
    image:     pickImage(t.image, 'medium'),
    url:       t.url,
  }));
  return enrichWithTrackArtwork(tracks);
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
  const tracks = list.map((t) => ({
    name:   t.name,
    artist: t.artist?.name || '',
    image:  pickImage(t.image, 'medium'),
    url:    t.url,
    date:   t.date?.['#text'] || null,
  }));
  return enrichWithTrackArtwork(tracks);
}
