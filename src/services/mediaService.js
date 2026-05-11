export const searchMedia = async (query, type) => {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];

  if (type === 'anime') {
    const r = await fetch(`https://api.jikan.moe/v4/anime?q=${q}&limit=12&sfw=true`);
    if (!r.ok) throw new Error('Jikan error');
    const d = await r.json();
    return (d.data || []).map((a) => ({
      id:       `jikan-${a.mal_id}`,
      title:    a.title_english || a.title,
      type:     'anime',
      poster:   a.images?.jpg?.image_url || null,
      year:     a.aired?.prop?.from?.year ? String(a.aired.prop.from.year) : null,
      score:    a.score,
      episodes: a.episodes,
      genres:   (a.genres || []).map((g) => g.name),
    }));
  }

  if (type === 'tv') {
    const r = await fetch(`https://api.tvmaze.com/search/shows?q=${q}`);
    if (!r.ok) throw new Error('TVMaze error');
    const d = await r.json();
    return (d || []).map((item) => ({
      id:     `tvmaze-${item.show.id}`,
      title:  item.show.name,
      type:   'tv',
      poster: item.show.image?.medium || null,
      year:   item.show.premiered?.slice(0, 4) || null,
      score:  item.show.rating?.average || null,
      genres: item.show.genres || [],
    }));
  }

  if (type === 'movie') {
    const raw = process.env.REACT_APP_OMDB_KEY || '';
    // Accept either just the key OR the full demo URL the user may have pasted
    const keyMatch = raw.match(/apikey=([^&\s]+)/);
    const key = keyMatch ? keyMatch[1] : raw.trim();
    if (!key) return [];
    const r = await fetch(`https://www.omdbapi.com/?s=${q}&type=movie&apikey=${key}`);
    if (!r.ok) throw new Error('OMDb error');
    const d = await r.json();
    return (d.Search || []).slice(0, 12).map((m) => ({
      id:     `omdb-${m.imdbID}`,
      title:  m.Title,
      type:   'movie',
      poster: m.Poster !== 'N/A' ? m.Poster : null,
      year:   m.Year,
      genres: [],
    }));
  }

  return [];
};

export const getWatchList = async (username) => {
  try {
    const { db } = await import('./db');
    return await db.getWatchlist(username);
  } catch {
    const all = JSON.parse(localStorage.getItem('nova_watchlists') || '{}');
    return all[username] || [];
  }
};

export const saveWatchList = async (username, list) => {
  try {
    const { db } = await import('./db');
    await db.saveWatchlist(username, list);
  } catch {
    const all = JSON.parse(localStorage.getItem('nova_watchlists') || '{}');
    all[username] = list;
    localStorage.setItem('nova_watchlists', JSON.stringify(all));
  }
};

export const getAllReviews = () => {
  const all = JSON.parse(localStorage.getItem('nova_watchlists') || '{}');
  const reviews = [];
  Object.entries(all).forEach(([username, items]) => {
    (items || []).forEach((item) => {
      if (item.review || item.rating) reviews.push({ ...item, username });
    });
  });
  return reviews.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

/* ── Fetch episode list for anime (Jikan) ──────────────────── */
export const fetchAnimeEpisodes = async (malId) => {
  try {
    const episodes = [];
    let page = 1;
    while (true) {
      const r = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`);
      if (!r.ok) break;
      const d = await r.json();
      const items = d.data || [];
      episodes.push(...items.map(e => ({
        number: e.mal_id,
        title:  e.title || e.title_romanji || `Episode ${e.mal_id}`,
      })));
      if (!d.pagination?.has_next_page) break;
      page++;
      if (page > 20) break; // cap at 500 eps
      await new Promise(res => setTimeout(res, 350)); // Jikan rate limit
    }
    return episodes;
  } catch { return []; }
};

/* ── Fetch episode list for TV shows (TVMaze) ──────────────── */
export const fetchTVEpisodes = async (tvmazeId) => {
  try {
    const r = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/episodes`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d || []).map(e => ({
      number: e.number,
      season: e.season,
      title:  e.name || `Episode ${e.number}`,
    }));
  } catch { return []; }
};
