// src/services/gifService.js
//
// Thin client for Giphy's v1 API, used by the GIF picker in Messages
// (src/components/messages/GifPicker.jsx). Originally built on Tenor,
// but Google fully shut down the public Tenor API on June 30, 2026
// (key registration had already been frozen since January 2026), so
// this uses Giphy instead — still free, still issuing developer keys
// at https://developers.giphy.com.
//
// Giphy's key is meant to be used client-side for this kind of search
// widget (it's rate-limited per key, not a secret the way a server
// credential is), so this calls api.giphy.com directly from the
// browser rather than proxying through /api — same pattern as the
// app's other read-only third-party lookups.
//
// Needs REACT_APP_GIPHY_API_KEY set (see env.example). Without a key,
// every call resolves to an empty list and the picker shows its
// "no results" state rather than throwing.

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

// Fixed quick-access categories shown as tabs in the picker, each backed
// by a canned search term. "Trending" and "Search" are handled separately
// (trending feed / free-text query) rather than living in this map.
const CATEGORIES = {
  reactions: 'reaction',
  sports: 'sports hype',
  mlb: 'mlb baseball',
  roblox: 'roblox',
  memes: 'meme',
};

function hasKey() {
  return Boolean(process.env.REACT_APP_GIPHY_API_KEY);
}

function mapResult(g) {
  const images = g.images || {};
  const full = images.original || {};
  const preview = images.fixed_width_small || images.fixed_width || full;
  return {
    id: g.id,
    description: g.title || '',
    url: full.url,
    width: full.width ? Number(full.width) : undefined,
    height: full.height ? Number(full.height) : undefined,
    preview_url: preview.url || full.url,
    preview_width: preview.width ? Number(preview.width) : undefined,
    preview_height: preview.height ? Number(preview.height) : undefined,
  };
}

async function request(path, params) {
  if (!hasKey()) return [];
  const qs = new URLSearchParams({
    api_key: process.env.REACT_APP_GIPHY_API_KEY,
    limit: '24',
    rating: 'pg-13',
    ...params,
  });
  try {
    const res = await fetch(`${GIPHY_BASE}/${path}?${qs.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(mapResult).filter(g => g.url);
  } catch {
    return [];
  }
}

const gifService = {
  CATEGORIES: Object.keys(CATEGORIES),
  hasKey,

  /** Giphy's curated trending feed — used for the Trending tab. */
  async getTrending() {
    return request('trending', {});
  },

  /** Free-text search — used for the Search tab. */
  async search(query) {
    const q = (query || '').trim();
    if (!q) return [];
    return request('search', { q });
  },

  /** One of the canned category tabs (Reactions, Sports, MLB, Roblox, Memes). */
  async getCategory(key) {
    const q = CATEGORIES[key];
    if (!q) return [];
    return request('search', { q });
  },
};

export default gifService;

