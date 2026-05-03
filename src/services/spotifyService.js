const CLIENT_ID    = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const SCOPES       = 'user-read-currently-playing user-read-playback-state';
const REDIRECT_URI = window.location.origin;

const STORAGE_KEY    = (u) => `nova_spotify_${u}`;
const VERIFIER_KEY   = 'nova_spotify_verifier';
const PENDING_KEY    = 'nova_spotify_pending_user';

/* ── PKCE helpers ─────────────────────────────────────────────── */
function generateRandom(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => chars[b % chars.length]).join('');
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ── Public API ───────────────────────────────────────────────── */
export function hasClientId() {
  return !!CLIENT_ID;
}

export function isConnected(username) {
  return !!localStorage.getItem(STORAGE_KEY(username));
}

export function disconnect(username) {
  localStorage.removeItem(STORAGE_KEY(username));
}

export async function initiateAuth(username) {
  const verifier   = generateRandom(64);
  const hashed     = await sha256(verifier);
  const challenge  = base64url(hashed);

  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(PENDING_KEY,  username);

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
    scope:                 SCOPES,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleCallback(code) {
  const verifier = localStorage.getItem(VERIFIER_KEY);
  const username = localStorage.getItem(PENDING_KEY);
  if (!verifier || !username) return null;

  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      code_verifier: verifier,
    });

    const res  = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    if (!res.ok) return null;

    const data   = await res.json();
    const tokens = {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    Date.now() + data.expires_in * 1000,
    };
    localStorage.setItem(STORAGE_KEY(username), JSON.stringify(tokens));
  } finally {
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem(PENDING_KEY);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return username;
}

async function refreshAccessToken(username, tokens) {
  try {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id:     CLIENT_ID,
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    if (!res.ok) return null;
    const data      = await res.json();
    const newTokens = {
      access_token:  data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_at:    Date.now() + data.expires_in * 1000,
    };
    localStorage.setItem(STORAGE_KEY(username), JSON.stringify(newTokens));
    return newTokens.access_token;
  } catch {
    return null;
  }
}

async function getAccessToken(username) {
  const raw = localStorage.getItem(STORAGE_KEY(username));
  if (!raw) return null;
  const tokens = JSON.parse(raw);
  if (Date.now() > tokens.expires_at - 5 * 60 * 1000) {
    return refreshAccessToken(username, tokens);
  }
  return tokens.access_token;
}

export async function getCurrentlyPlaying(username) {
  const token = await getAccessToken(username);
  if (!token) return null;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json();
    if (!data?.item) return null;

    return {
      isPlaying:   data.is_playing,
      trackName:   data.item.name,
      artistName:  data.item.artists?.map((a) => a.name).join(', ') || '',
      albumName:   data.item.album?.name || '',
      albumArt:    data.item.album?.images?.[1]?.url || data.item.album?.images?.[0]?.url || null,
      spotifyUrl:  data.item.external_urls?.spotify || null,
      progressMs:  data.progress_ms || 0,
      durationMs:  data.item.duration_ms || 0,
    };
  } catch {
    return null;
  }
}
