// src/components/pages/music/YTMusicPanel.jsx
//
// UI for the ytmusicapi-backed endpoint (api/ytmusic.py). Organized into
// the same groups as that backend: Search, Explore, Library, Podcasts —
// plus Artist/Album/Song detail views reached by tapping a search result.
//
// Playback: ytmusicapi only returns metadata (titles, artists, lyrics,
// track order) — it can't hand back an audio stream. Actual playback here
// is a real embedded YouTube player (the official iframe embed), driven
// by a persistent "now playing" bar at the bottom of the panel so it
// keeps playing while you keep browsing.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ytm from '../../../services/ytMusicService';
import '../NovaFeatures.css';
import './ytmusic.css';

const MusicVisualizer = React.lazy(() => import('./MusicVisualizer'));

// ── small shared bits ───────────────────────────────────────────────
const thumbUrl = (thumbnails) => {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || null;
};

const artistNames = (artists) =>
  Array.isArray(artists) ? artists.filter((a) => a?.name).map((a) => a.name).join(', ') : '';

function Thumb({ src, round, size = 'list' }) {
  const cls = `ytm-thumb ${round ? 'round' : ''}`.trim();
  return src
    ? <img className={cls} src={src} alt="" />
    : <div className={cls} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>♪</div>;
}

function ListRow({ thumb, round, title, sub, tag, onClick, onPlay, actions }) {
  return (
    <div className={`ytm-list-row ${onClick ? '' : 'static'}`} onClick={onClick}>
      <Thumb src={thumb} round={round} />
      <div className="ytm-list-main">
        <div className="ytm-list-title">{title}</div>
        {sub && <div className="ytm-list-sub">{sub}</div>}
      </div>
      {tag && <div className="ytm-list-tag">{tag}</div>}
      <div className="ytm-list-actions" onClick={(e) => e.stopPropagation()}>
        {onPlay && <button className="ytm-play-btn" title="Play" onClick={onPlay}>▶</button>}
        {actions}
      </div>
    </div>
  );
}

function GridCard({ thumb, round, title, sub, onClick }) {
  return (
    <div className="ytm-grid-card" onClick={onClick}>
      <img className={`ytm-grid-thumb ${round ? 'round' : ''}`} src={thumb || ''} alt=""
        style={!thumb ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined} />
      <div className="ytm-grid-title">{title}</div>
      {sub && <div className="ytm-grid-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return <div style={{ marginTop: 16 }}>{title && <div className="ytm-section-title">{title}</div>}{children}</div>;
}

// Runs an async loader whenever `depsKey` changes; exposes {data, loading, error, reload}
function useLoad(loader, depsKey) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e) => setState({ data: null, loading: false, error: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

// ── Artist / Album / Song detail views ──────────────────────────────
function ArtistView({ channelId, onOpen, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getArtist(channelId), channelId);
  if (loading) return <div className="ytm-loading">Loading artist…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;
  const songs = data.songs?.results || [];
  const albums = data.albums?.results || [];
  const singles = data.singles?.results || [];
  const videos = data.videos?.results || [];
  const related = data.related?.results || [];
  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(data.thumbnails)} round size="detail" />
        <div>
          <div className="ytm-detail-title">{data.name}</div>
          {data.subscribers && <div className="ytm-detail-sub">{data.subscribers} subscribers</div>}
          {data.description && <div className="ytm-list-sub" style={{ marginTop: 6, maxWidth: 480 }}>{data.description}</div>}
        </div>
      </div>

      {songs.length > 0 && (
        <Section title="Songs">
          <div className="ytm-list">
            {songs.map((s, i) => (
              <ListRow key={s.videoId || i} thumb={thumbUrl(s.thumbnails)}
                title={s.title} sub={artistNames(s.artists)}
                onClick={() => onOpen({ kind: 'song', videoId: s.videoId, title: s.title })}
                onPlay={() => onPlay(s.videoId, s.title)} />
            ))}
          </div>
        </Section>
      )}

      {videos.length > 0 && (
        <Section title="Videos">
          <div className="ytm-grid">
            {videos.map((v, i) => (
              <GridCard key={v.videoId || i} thumb={thumbUrl(v.thumbnails)} title={v.title} sub={artistNames(v.artists)}
                onClick={() => onOpen({ kind: 'song', videoId: v.videoId, title: v.title })} />
            ))}
          </div>
        </Section>
      )}

      {albums.length > 0 && (
        <Section title="Albums">
          <div className="ytm-grid">
            {albums.map((al, i) => (
              <GridCard key={al.browseId || i} thumb={thumbUrl(al.thumbnails)} title={al.title} sub={al.year}
                onClick={() => onOpen({ kind: 'album', browseId: al.browseId, title: al.title })} />
            ))}
          </div>
        </Section>
      )}

      {singles.length > 0 && (
        <Section title="Singles">
          <div className="ytm-grid">
            {singles.map((al, i) => (
              <GridCard key={al.browseId || i} thumb={thumbUrl(al.thumbnails)} title={al.title} sub={al.year}
                onClick={() => onOpen({ kind: 'album', browseId: al.browseId, title: al.title })} />
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section title="Related artists">
          <div className="ytm-grid">
            {related.map((ar, i) => (
              <GridCard key={ar.browseId || i} thumb={thumbUrl(ar.thumbnails)} round title={ar.title}
                onClick={() => onOpen({ kind: 'artist', channelId: ar.browseId, title: ar.title })} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function AlbumView({ browseId, onOpen, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getAlbum(browseId), browseId);
  if (loading) return <div className="ytm-loading">Loading album…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;
  const tracks = data.tracks || [];
  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(data.thumbnails)} />
        <div>
          <div className="ytm-detail-title">{data.title}</div>
          <div className="ytm-detail-sub">{artistNames(data.artists)} {data.year ? `· ${data.year}` : ''}</div>
          {data.trackCount && <div className="ytm-list-sub">{data.trackCount} tracks</div>}
        </div>
      </div>
      <Section title="Tracks">
        <div className="ytm-list">
          {tracks.map((t, i) => (
            <ListRow key={t.videoId || i} tag={t.duration}
              title={`${i + 1}. ${t.title}`} sub={artistNames(t.artists) || artistNames(data.artists)}
              onClick={() => onOpen({ kind: 'song', videoId: t.videoId, title: t.title })}
              onPlay={() => onPlay(t.videoId, t.title)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function SongView({ videoId, title, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getWatchPlaylist({ videoId }), videoId);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsErr, setLyricsErr] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    setLyrics(null); setLyricsErr(null); setCredits(null);
    if (data?.lyrics) {
      ytm.getLyrics(data.lyrics).then((l) => setLyrics(l)).catch((e) => setLyricsErr(e.message));
    }
  }, [data]);

  // Opening a song's detail page starts it playing automatically.
  useEffect(() => { onPlay(videoId, title); }, [videoId, title, onPlay]);

  const current = (data?.tracks || []).find((t) => t.videoId === videoId) || data?.tracks?.[0];

  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(current?.thumbnail)} />
        <div>
          <div className="ytm-detail-title">{current?.title || title}</div>
          <div className="ytm-detail-sub">{artistNames(current?.artists)}</div>
          {current?.album?.name && <div className="ytm-list-sub">{current.album.name}</div>}
          {current?.length && <div className="ytm-list-sub">{current.length}</div>}
          <div className="ytm-row" style={{ marginTop: 8 }}>
            <button className="ytm-btn small" onClick={() => onPlay(videoId, current?.title || title)}>▶ Play</button>
            {!credits && (
              <button className="ytm-btn small ghost"
                onClick={() => ytm.getSongCredits(videoId).then((c) => setCredits(c || {})).catch(() => {})}>
                Load credits
              </button>
            )}
          </div>
        </div>
      </div>

      {credits && Object.keys(credits).length > 0 && (
        <Section title="Credits">
          <div className="ytm-list-sub">{JSON.stringify(credits)}</div>
        </Section>
      )}

      {lyrics?.lyrics && (
        <Section title="Lyrics">
          <div className="ytm-lyrics">{lyrics.lyrics}</div>
          {lyrics.source && <div className="ytm-list-sub" style={{ marginTop: 8 }}>Source: {lyrics.source}</div>}
        </Section>
      )}
      {lyricsErr && <div className="ytm-error">No lyrics available: {lyricsErr}</div>}

      <Section title="Up next (watch playlist)">
        {loading && <div className="ytm-loading">Loading…</div>}
        {error && <div className="ytm-error">{error}</div>}
        <div className="ytm-list">
          {(data?.tracks || []).map((t, i) => (
            <ListRow key={t.videoId || i} thumb={thumbUrl(t.thumbnail)}
              title={t.title} sub={artistNames(t.artists)} tag={t.length}
              onPlay={() => onPlay(t.videoId, t.title)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────
const SEARCH_FILTERS = [
  { id: '', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'videos', label: 'Videos' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'community_playlists', label: 'Community playlists' },
  { id: 'featured_playlists', label: 'Featured playlists' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'episodes', label: 'Episodes' },
];

function resultRowProps(r, onOpen, onPlay) {
  const t = r.title || r.artist || r.name || '';
  switch (r.resultType) {
    case 'song':
    case 'video':
      return { title: t, sub: artistNames(r.artists), tag: r.duration,
        onClick: () => onOpen({ kind: 'song', videoId: r.videoId, title: t }),
        onPlay: () => onPlay(r.videoId, t) };
    case 'album':
      return { title: t, sub: `${r.artist || ''}${r.year ? ` · ${r.year}` : ''}`,
        onClick: () => onOpen({ kind: 'album', browseId: r.browseId, title: t }) };
    case 'artist':
      return { title: t, sub: 'Artist',
        onClick: () => onOpen({ kind: 'artist', channelId: r.browseId, title: t }) };
    case 'playlist':
      return { title: t, sub: `${r.author || ''}${r.itemCount ? ` · ${r.itemCount} items` : ''}`,
        onClick: () => onOpen({ kind: 'playlist', playlistId: r.browseId?.replace(/^VL/, ''), title: t }) };
    case 'profile':
      return { title: t, sub: r.name };
    case 'podcast':
      return { title: t, sub: r.author,
        onClick: () => onOpen({ kind: 'podcast', playlistId: r.browseId, title: t }) };
    case 'episode':
      return { title: t, sub: r.date,
        onClick: () => onOpen({ kind: 'episode', videoId: r.videoId, title: t }),
        onPlay: () => onPlay(r.videoId, t) };
    default:
      return { title: t, sub: r.resultType };
  }
}

function SearchTab({ onOpen, onPlay }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const runSearch = useCallback((q, f) => {
    if (!q.trim()) return;
    setLoading(true); setError(null); setShowSuggest(false);
    ytm.search(q, { filter: f || undefined, limit: 30 })
      .then((r) => setResults(r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const onQueryChange = (v) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    if (!v.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      ytm.getSearchSuggestions(v).then((s) => { setSuggestions(s || []); setShowSuggest(true); }).catch(() => {});
    }, 250);
  };

  return (
    <div>
      <div className="ytm-row">
        <div className="ytm-suggest-wrap">
          <input className="ytm-input" style={{ width: '100%' }} placeholder="Search YouTube Music…"
            value={query} onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => suggestions.length && setShowSuggest(true)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(query, filter)} />
          {showSuggest && suggestions.length > 0 && (
            <div className="ytm-suggest-list">
              {suggestions.map((s, i) => {
                const text = typeof s === 'string' ? s : (s.text || s.suggestion || JSON.stringify(s));
                return (
                  <div key={i} className="ytm-suggest-item"
                    onClick={() => { setQuery(text); setShowSuggest(false); runSearch(text, filter); }}>
                    {text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <select className="ytm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {SEARCH_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button className="ytm-btn" onClick={() => runSearch(query, filter)} disabled={!query.trim()}>Search</button>
      </div>

      {loading && <div className="ytm-loading">Searching…</div>}
      {error && <div className="ytm-error">{error}</div>}
      {results && results.length === 0 && <div className="ytm-empty">No results.</div>}
      {results && results.length > 0 && (
        <div className="ytm-list" style={{ marginTop: 12 }}>
          {results.map((r, i) => {
            const props = resultRowProps(r, onOpen, onPlay);
            return <ListRow key={i} thumb={thumbUrl(r.thumbnails)} round={r.resultType === 'artist'} tag={r.resultType} {...props} />;
          })}
        </div>
      )}
    </div>
  );
}

// ── Explore: moods/genres + charts ──────────────────────────────────
function ExploreTab({ onOpen, onPlay }) {
  const [sub, setSub] = useState('moods');
  const { data: moodCats, loading: catsLoading, error: catsError } = useLoad(() => ytm.getMoodCategories(), sub === 'moods');
  const [activeMood, setActiveMood] = useState(null);
  const [moodPlaylists, setMoodPlaylists] = useState(null);
  const [country, setCountry] = useState('ZZ');
  const { data: charts, loading: chartsLoading, error: chartsError, reload: reloadCharts } = useLoad(() => ytm.getCharts(country), sub + country);

  useEffect(() => { if (sub !== 'charts') return; reloadCharts(); }, [sub, country, reloadCharts]);

  const openMood = (label, params) => {
    setActiveMood(label);
    setMoodPlaylists(null);
    ytm.getMoodPlaylists(params).then((r) => setMoodPlaylists(r)).catch(() => setMoodPlaylists([]));
  };

  return (
    <div>
      <div className="ytm-pills">
        <button className={`ytm-pill ${sub === 'moods' ? 'active' : ''}`} onClick={() => setSub('moods')}>Moods &amp; genres</button>
        <button className={`ytm-pill ${sub === 'charts' ? 'active' : ''}`} onClick={() => setSub('charts')}>Charts</button>
      </div>

      {sub === 'moods' && (
        <div style={{ marginTop: 12 }}>
          {catsLoading && <div className="ytm-loading">Loading categories…</div>}
          {catsError && <div className="ytm-error">{catsError}</div>}
          {moodCats && Object.entries(moodCats).map(([groupName, items]) => (
            <Section title={groupName} key={groupName}>
              <div className="ytm-pills">
                {(items || []).map((m, i) => (
                  <button key={i} className={`ytm-pill ${activeMood === m.title ? 'active' : ''}`}
                    onClick={() => openMood(m.title, m.params)}>{m.title}</button>
                ))}
              </div>
            </Section>
          ))}
          {activeMood && (
            <Section title={`${activeMood} playlists`}>
              {moodPlaylists === null && <div className="ytm-loading">Loading…</div>}
              {moodPlaylists && moodPlaylists.length === 0 && <div className="ytm-empty">Nothing found.</div>}
              <div className="ytm-grid">
                {(moodPlaylists || []).map((p, i) => (
                  <GridCard key={p.playlistId || i} thumb={thumbUrl(p.thumbnails)} title={p.title} sub={p.description}
                    onClick={() => p.playlistId && onOpen({ kind: 'playlist', playlistId: p.playlistId, title: p.title })} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {sub === 'charts' && (
        <div style={{ marginTop: 12 }}>
          <div className="ytm-row">
            <span className="ytm-list-sub">Country code (ISO 3166, e.g. US, GB, ZZ = global)</span>
            <input className="ytm-input" style={{ width: 90 }} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} />
          </div>
          {chartsLoading && <div className="ytm-loading">Loading charts…</div>}
          {chartsError && <div className="ytm-error">{chartsError}</div>}
          {charts && Object.entries(charts).filter(([, v]) => Array.isArray(v?.items)).map(([key, section]) => (
            <Section title={section.title || key} key={key}>
              <div className="ytm-list">
                {section.items.map((it, i) => (
                  <ListRow key={it.videoId || it.browseId || i} thumb={thumbUrl(it.thumbnails)}
                    round={key === 'artists'} title={it.title || it.artist} sub={artistNames(it.artists) || it.subscribers}
                    onClick={() => (it.videoId
                      ? onOpen({ kind: 'song', videoId: it.videoId, title: it.title })
                      : it.browseId && onOpen(key === 'artists'
                        ? { kind: 'artist', channelId: it.browseId, title: it.title }
                        : { kind: 'album', browseId: it.browseId, title: it.title }))}
                    onPlay={it.videoId ? () => onPlay(it.videoId, it.title) : undefined} />
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Library management ───────────────────────────────────────────────
const LIBRARY_SECTIONS = [
  { id: 'songs', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'channels', label: 'Channels' },
  { id: 'history', label: 'History' },
];

function LibraryTab({ onOpen, onPlay }) {
  const [sub, setSub] = useState('songs');
  const loader = useCallback(() => {
    switch (sub) {
      case 'songs': return ytm.getLibrarySongs();
      case 'artists': return ytm.getLibraryArtists();
      case 'albums': return ytm.getLibraryAlbums();
      case 'subscriptions': return ytm.getLibrarySubscriptions();
      case 'podcasts': return ytm.getLibraryPodcasts();
      case 'channels': return ytm.getLibraryChannels();
      case 'history': return ytm.getHistory();
      default: return Promise.resolve([]);
    }
  }, [sub]);
  const { data, loading, error, reload } = useLoad(loader, sub);

  const rate = (videoId, rating) => ytm.rateSong(videoId, rating).then(reload).catch(() => {});
  const unsub = (channelId) => ytm.unsubscribeArtists([channelId]).then(reload).catch(() => {});

  const needsAuth = error && /signed-in/i.test(error);

  return (
    <div>
      <div className="ytm-pills">
        {LIBRARY_SECTIONS.map((s) => (
          <button key={s.id} className={`ytm-pill ${sub === s.id ? 'active' : ''}`} onClick={() => setSub(s.id)}>{s.label}</button>
        ))}
      </div>

      {loading && <div className="ytm-loading">Loading…</div>}
      {needsAuth && (
        <div className="ytm-auth-note" style={{ marginTop: 12 }}>
          Library data needs a signed-in YouTube Music session configured on the server
          (see <code>YTMUSIC_AUTH_HEADERS</code> / <code>YTMUSIC_OAUTH_JSON</code> in env.example).
        </div>
      )}
      {error && !needsAuth && <div className="ytm-error">{error}</div>}
      {data && Array.isArray(data) && data.length === 0 && <div className="ytm-empty">Nothing here yet.</div>}

      {data && Array.isArray(data) && (
        <div className="ytm-list" style={{ marginTop: 12 }}>
          {data.map((item, i) => {
            if (sub === 'songs' || sub === 'history') {
              return <ListRow key={item.videoId || i} thumb={thumbUrl(item.thumbnails)} title={item.title} sub={artistNames(item.artists)} tag={item.duration}
                onClick={() => onOpen({ kind: 'song', videoId: item.videoId, title: item.title })}
                onPlay={item.videoId ? () => onPlay(item.videoId, item.title) : undefined}
                actions={item.videoId && (
                  <>
                    <button className="ytm-btn small" onClick={() => rate(item.videoId, 'LIKE')}>👍</button>
                    <button className="ytm-btn small ghost" onClick={() => rate(item.videoId, 'DISLIKE')}>👎</button>
                  </>
                )} />;
            }
            if (sub === 'artists' || sub === 'subscriptions') {
              return <ListRow key={item.browseId || i} thumb={thumbUrl(item.thumbnails)} round title={item.artist} sub={item.subscribers}
                onClick={() => onOpen({ kind: 'artist', channelId: item.browseId, title: item.artist })}
                actions={<button className="ytm-btn small danger" onClick={() => unsub(item.browseId)}>Unsubscribe</button>} />;
            }
            if (sub === 'albums') {
              return <ListRow key={item.browseId || i} thumb={thumbUrl(item.thumbnails)} title={item.title} sub={`${artistNames(item.artists)}${item.year ? ` · ${item.year}` : ''}`}
                onClick={() => onOpen({ kind: 'album', browseId: item.browseId, title: item.title })} />;
            }
            if (sub === 'podcasts') {
              return <ListRow key={item.podcastId || i} thumb={thumbUrl(item.thumbnails)} title={item.title} sub={item.channel?.name}
                onClick={() => item.podcastId && onOpen({ kind: 'podcast', playlistId: item.podcastId, title: item.title })} />;
            }
            if (sub === 'channels') {
              return <ListRow key={item.channelId || i} thumb={thumbUrl(item.thumbnails)} round title={item.title} sub={item.subscribers}
                onClick={() => item.channelId && onOpen({ kind: 'podcastChannel', channelId: item.channelId, title: item.title })} />;
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Playlists: view contents only (no create/edit/delete) ──────────
function PlaylistView({ playlistId, onOpen, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getPlaylist(playlistId, { suggestions_limit: 5 }), playlistId);

  if (loading) return <div className="ytm-loading">Loading playlist…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(data.thumbnails)} />
        <div>
          <div className="ytm-detail-title">{data.title}</div>
          <div className="ytm-detail-sub">{data.author?.name} · {data.trackCount} tracks</div>
          {data.description && <div className="ytm-list-sub" style={{ maxWidth: 480 }}>{data.description}</div>}
        </div>
      </div>

      <Section title="Tracks">
        <div className="ytm-list">
          {(data.tracks || []).map((t, i) => (
            <ListRow key={t.videoId || i} thumb={thumbUrl(t.thumbnails)} title={`${i + 1}. ${t.title}`} sub={artistNames(t.artists)} tag={t.duration}
              onClick={() => onOpen({ kind: 'song', videoId: t.videoId, title: t.title })}
              onPlay={() => onPlay(t.videoId, t.title)} />
          ))}
        </div>
      </Section>

      {data.suggestions?.length > 0 && (
        <Section title="Suggestions">
          <div className="ytm-list">
            {data.suggestions.map((t, i) => (
              <ListRow key={t.videoId || i} thumb={thumbUrl(t.thumbnails)} title={t.title} sub={artistNames(t.artists)}
                onClick={() => onOpen({ kind: 'song', videoId: t.videoId, title: t.title })}
                onPlay={() => onPlay(t.videoId, t.title)} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Podcasts ──────────────────────────────────────────────────────────
function PodcastView({ playlistId, onOpen, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getPodcast(playlistId), playlistId);
  if (loading) return <div className="ytm-loading">Loading podcast…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;
  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(data.thumbnails)} />
        <div>
          <div className="ytm-detail-title">{data.title}</div>
          <div className="ytm-detail-sub">{data.author?.name}</div>
        </div>
      </div>
      <Section title="Episodes">
        <div className="ytm-list">
          {(data.episodes || []).map((e, i) => (
            <ListRow key={e.videoId || i} thumb={thumbUrl(e.thumbnails)} title={e.title} sub={e.date}
              onClick={() => onOpen({ kind: 'episode', videoId: e.videoId, title: e.title })}
              onPlay={() => onPlay(e.videoId, e.title)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function EpisodeView({ videoId, title, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getEpisode(videoId), videoId);

  // Opening an episode starts it playing automatically, same as songs.
  useEffect(() => { onPlay(videoId, title); }, [videoId, title, onPlay]);

  if (loading) return <div className="ytm-loading">Loading episode…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;
  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(data.thumbnails)} />
        <div>
          <div className="ytm-detail-title">{data.title}</div>
          <div className="ytm-detail-sub">{data.author?.name} · {data.date}</div>
          <button className="ytm-btn small" style={{ marginTop: 8 }} onClick={() => onPlay(videoId, data.title || title)}>▶ Play</button>
        </div>
      </div>
      {data.description && <Section title="Description"><div className="ytm-lyrics">{data.description}</div></Section>}
    </div>
  );
}

function ChannelView({ channelId, onOpen, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getChannel(channelId), channelId);
  if (loading) return <div className="ytm-loading">Loading channel…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;
  return (
    <div>
      <div className="ytm-detail-header">
        <Thumb src={thumbUrl(data.thumbnails)} round />
        <div>
          <div className="ytm-detail-title">{data.title}</div>
          {data.subscribers && <div className="ytm-detail-sub">{data.subscribers}</div>}
        </div>
      </div>
      <Section title="Episodes">
        <div className="ytm-list">
          {(data.episodes?.results || []).map((e, i) => (
            <ListRow key={e.videoId || i} thumb={thumbUrl(e.thumbnails)} title={e.title} sub={e.date}
              onClick={() => onOpen({ kind: 'episode', videoId: e.videoId, title: e.title })}
              onPlay={() => onPlay(e.videoId, e.title)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function PodcastsTab({ onOpen }) {
  const [input, setInput] = useState('');
  const [kind, setKind] = useState('podcast');

  const go = () => {
    if (!input.trim()) return;
    if (kind === 'podcast') onOpen({ kind: 'podcast', playlistId: input.trim(), title: 'Podcast' });
    else if (kind === 'channel') onOpen({ kind: 'podcastChannel', channelId: input.trim(), title: 'Channel' });
    else if (kind === 'episode') onOpen({ kind: 'episode', videoId: input.trim(), title: 'Episode' });
    else onOpen({ kind: 'episodesPlaylist', playlistId: input.trim() || 'RDPN', title: 'Episodes for you' });
  };

  return (
    <div>
      <div className="ytm-list-sub" style={{ marginBottom: 8 }}>
        Look up a podcast, channel or episode by id — the easiest way to find one is via Search → filter “Podcasts” or “Episodes”.
      </div>
      <div className="ytm-row">
        <select className="ytm-select" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="podcast">Podcast (playlist id)</option>
          <option value="channel">Channel (channel id)</option>
          <option value="episode">Episode (video id)</option>
          <option value="episodesPlaylist">Episodes-for-you playlist id</option>
        </select>
        <input className="ytm-input" style={{ flex: '1 1 220px' }} placeholder="Paste an id…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="ytm-btn" onClick={go} disabled={!input.trim() && kind !== 'episodesPlaylist'}>Open</button>
      </div>
      {kind === 'episodesPlaylist' && (
        <button className="ytm-btn ghost" style={{ marginTop: 8 }} onClick={() => onOpen({ kind: 'episodesPlaylist', playlistId: 'RDPN', title: 'Episodes for you' })}>
          Open default “Episodes for you”
        </button>
      )}
    </div>
  );
}

function EpisodesPlaylistView({ playlistId, onOpen, onPlay }) {
  const { data, loading, error } = useLoad(() => ytm.getEpisodesPlaylist(playlistId), playlistId);
  if (loading) return <div className="ytm-loading">Loading…</div>;
  if (error) return <div className="ytm-error">{error}</div>;
  if (!data) return null;
  return (
    <div>
      <div className="ytm-detail-title" style={{ marginBottom: 10 }}>{data.title || 'Episodes for you'}</div>
      <div className="ytm-list">
        {(data.episodes || data.tracks || []).map((e, i) => (
          <ListRow key={e.videoId || i} thumb={thumbUrl(e.thumbnails)} title={e.title} sub={e.date || artistNames(e.artists)}
            onClick={() => onOpen({ kind: 'episode', videoId: e.videoId, title: e.title })}
            onPlay={() => onPlay(e.videoId, e.title)} />
        ))}
      </div>
    </div>
  );
}

// ── Now Playing: a real, official YouTube iframe embed. ytmusicapi only
// returns metadata — it can't hand back an audio stream — so this is
// what actually produces sound. It's pinned to the bottom of the panel
// so it keeps playing as you keep browsing to other tabs/pages.
function NowPlayingBar({ current, onClose }) {
  if (!current) return null;
  return (
    <div className="ytm-nowplaying">
      <div className="ytm-nowplaying-frame">
        <iframe
          key={current.videoId}
          src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1`}
          title={current.title || 'Now playing'}
          allow="autoplay; encrypted-media"
          allowFullScreen
          frameBorder="0"
        />
      </div>
      <div className="ytm-nowplaying-title">{current.title}</div>
      <button className="ytm-btn small ghost" onClick={onClose} title="Stop">✕</button>
    </div>
  );
}

// ── root panel ───────────────────────────────────────────────────────
const TOP_TABS = [
  { id: 'search', label: '🔍 Search' },
  { id: 'explore', label: '🧭 Explore' },
  { id: 'library', label: '📚 Library' },
  { id: 'podcasts', label: '🎙️ Podcasts' },
  { id: 'visualizer', label: '✨ Visualizer' },
];

export default function YTMusicPanel() {
  const [tab, setTab] = useState('search');
  const [stack, setStack] = useState([]); // detail-view navigation stack
  const [nowPlaying, setNowPlaying] = useState(null);

  const open = (view) => setStack((s) => [...s, view]);
  const back = () => setStack((s) => s.slice(0, -1));
  const goHome = (t) => { setTab(t); setStack([]); };
  const play = useCallback((videoId, title) => { if (videoId) setNowPlaying({ videoId, title }); }, []);
  const stopPlaying = () => setNowPlaying(null);

  const current = stack[stack.length - 1];

  return (
    <div className="nf-page">
      <div className="nf-header">
        <h1>🎶 Nova Music</h1>
        <p>Search and browse YouTube Music — songs, artists, albums, playlists, podcasts and your library. Tap ▶ on anything to play it.</p>
      </div>

      <div className="ytm-wrap">
        <div className="ytm-subtabs">
          {TOP_TABS.map((t) => (
            <button key={t.id} className={`ytm-subtab ${tab === t.id && !current ? 'active' : ''}`} onClick={() => goHome(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="nf-card">
          {current && (
            <button className="ytm-btn ghost ytm-back" onClick={back}>← Back</button>
          )}

          {!current && tab === 'search' && <SearchTab onOpen={open} onPlay={play} />}
          {!current && tab === 'explore' && <ExploreTab onOpen={open} onPlay={play} />}
          {!current && tab === 'library' && <LibraryTab onOpen={open} onPlay={play} />}
          {!current && tab === 'podcasts' && <PodcastsTab onOpen={open} />}
          {!current && tab === 'visualizer' && (
            <React.Suspense fallback={<div className="ytm-loading">Loading…</div>}>
              <MusicVisualizer />
            </React.Suspense>
          )}

          {current?.kind === 'artist' && <ArtistView channelId={current.channelId} onOpen={open} onPlay={play} />}
          {current?.kind === 'album' && <AlbumView browseId={current.browseId} onOpen={open} onPlay={play} />}
          {current?.kind === 'song' && <SongView videoId={current.videoId} title={current.title} onPlay={play} />}
          {current?.kind === 'playlist' && <PlaylistView playlistId={current.playlistId} onOpen={open} onPlay={play} />}
          {current?.kind === 'podcast' && <PodcastView playlistId={current.playlistId} onOpen={open} onPlay={play} />}
          {current?.kind === 'podcastChannel' && <ChannelView channelId={current.channelId} onOpen={open} onPlay={play} />}
          {current?.kind === 'episode' && <EpisodeView videoId={current.videoId} title={current.title} onPlay={play} />}
          {current?.kind === 'episodesPlaylist' && <EpisodesPlaylistView playlistId={current.playlistId} onOpen={open} onPlay={play} />}
        </div>
      </div>

      {tab !== 'visualizer' && <NowPlayingBar current={nowPlaying} onClose={stopPlaying} />}
    </div>
  );
}
