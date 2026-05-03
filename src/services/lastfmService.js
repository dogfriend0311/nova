const API_KEY   = process.env.REACT_APP_LASTFM_KEY;
const BASE      = 'https://ws.audioscrobbler.com/2.0/';

export function hasApiKey() {
  return !!API_KEY;
}

export async function getNowPlaying(username) {
  if (!API_KEY || !username) return null;
  try {
    const url = `${BASE}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&limit=1&format=json&api_key=${API_KEY}`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const tracks = data?.recenttracks?.track;
    if (!tracks || tracks.length === 0) return null;

    const track      = Array.isArray(tracks) ? tracks[0] : tracks;
    const isPlaying  = track?.['@attr']?.nowplaying === 'true';

    const images = track.image || [];
    const art    = (images.find((i) => i.size === 'large') || images.find((i) => i.size === 'medium') || images[images.length - 1] || {})['#text'] || null;

    return {
      isPlaying,
      trackName:  track.name  || '',
      artistName: track.artist?.['#text'] || track.artist || '',
      albumName:  track.album?.['#text']  || '',
      albumArt:   art && art !== '' ? art : null,
      trackUrl:   track.url || null,
      userUrl:    `https://www.last.fm/user/${username}`,
    };
  } catch {
    return null;
  }
}
