import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as lfm from '../../services/lastfmService';
import './LastFmPage.css';

const PERIODS = [
  { value: '7day',   label: '7 Days' },
  { value: '1month', label: '1 Month' },
  { value: '3month', label: '3 Months' },
  { value: '6month', label: '6 Months' },
  { value: '12month',label: '12 Months' },
  { value: 'overall',label: 'All Time' },
];

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1)    + 'K';
  return String(n);
}

function timeAgo(tsMs) {
  if (!tsMs) return '';
  const diff = Date.now() - tsMs;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Now Playing banner ─────────────────────────────────────── */
const NowPlayingBanner = ({ username }) => {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    if (!username) return;
    let active = true;
    const poll = async () => {
      const t = await lfm.getNowPlaying(username);
      if (active) setTrack(t?.isPlaying ? t : null);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [username]);

  if (!track) return null;

  return (
    <a className="lfm-now-playing" href={track.trackUrl || '#'} target="_blank" rel="noreferrer">
      {track.albumArt
        ? <img className="lfm-np-art" src={track.albumArt} alt="" />
        : <div className="lfm-np-art-ph">🎵</div>}
      <div className="lfm-np-info">
        <div className="lfm-np-label"><span className="lfm-np-pulse" /> Now Playing</div>
        <div className="lfm-np-track">{track.trackName}</div>
        <div className="lfm-np-artist">{track.artistName}</div>
      </div>
    </a>
  );
};

/* ── Top Artists ────────────────────────────────────────────── */
const ArtistsSection = ({ artists }) => (
  <div className="lfm-card">
    <div className="lfm-card-title">🎤 Top Artists</div>
    {artists.length === 0
      ? <div className="lfm-empty">No artist data for this period</div>
      : (
        <div className="lfm-artists-grid">
          {artists.map((a) => (
            <a key={a.name} className="lfm-artist-card" href={a.url} target="_blank" rel="noreferrer">
              {a.image
                ? <img className="lfm-artist-img" src={a.image} alt={a.name} onError={(e) => { e.target.style.display = 'none'; }} />
                : <div className="lfm-artist-ph">🎤</div>}
              <div className="lfm-artist-rank">#{a.rank}</div>
              <div className="lfm-artist-name">{a.name}</div>
              <div className="lfm-artist-plays">{fmt(a.playcount)} plays</div>
            </a>
          ))}
        </div>
      )}
  </div>
);

/* ── Top Tracks ─────────────────────────────────────────────── */
const TracksSection = ({ tracks }) => (
  <div className="lfm-card">
    <div className="lfm-card-title">🎵 Top Tracks</div>
    {tracks.length === 0
      ? <div className="lfm-empty">No track data for this period</div>
      : (
        <div className="lfm-track-list">
          {tracks.map((t) => (
            <a key={`${t.name}-${t.artist}`} className="lfm-track-row" href={t.url} target="_blank" rel="noreferrer">
              <span className="lfm-track-rank">{t.rank}</span>
              {t.image
                ? <img className="lfm-track-img" src={t.image} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                : <div className="lfm-track-ph">🎵</div>}
              <div className="lfm-track-info">
                <div className="lfm-track-name">{t.name}</div>
                <div className="lfm-track-artist">{t.artist}</div>
              </div>
              <span className="lfm-track-plays">{fmt(t.playcount)}</span>
            </a>
          ))}
        </div>
      )}
  </div>
);

/* ── Tags / Genres ──────────────────────────────────────────── */
const TagsSection = ({ tags }) => (
  <div className="lfm-card lfm-card-full">
    <div className="lfm-card-title">🏷 Top Genres &amp; Tags</div>
    {tags.length === 0
      ? <div className="lfm-empty">No tag data available</div>
      : (
        <div className="lfm-tags-wrap">
          {tags.map((t) => (
            <a key={t.name} className="lfm-tag" href={t.url} target="_blank" rel="noreferrer">
              {t.name}
              {t.count > 1 && <span className="lfm-tag-count">×{t.count}</span>}
            </a>
          ))}
        </div>
      )}
  </div>
);

/* ── Recent Tracks ──────────────────────────────────────────── */
const RecentSection = ({ tracks }) => (
  <div className="lfm-card lfm-card-full">
    <div className="lfm-card-title">🕐 Recent Tracks</div>
    {tracks.length === 0
      ? <div className="lfm-empty">No recent tracks</div>
      : (
        <div className="lfm-recent-list">
          {tracks.map((t, i) => (
            <a key={i} className={`lfm-recent-row${t.nowplaying ? ' is-now' : ''}`} href={t.url} target="_blank" rel="noreferrer">
              <div className={`lfm-recent-dot${t.nowplaying ? ' playing' : ''}`} />
              {t.image
                ? <img className="lfm-recent-art" src={t.image} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                : <div className="lfm-recent-ph">🎵</div>}
              <div className="lfm-recent-info">
                <div className="lfm-recent-name">{t.name}</div>
                <div className="lfm-recent-artist">{t.artist}</div>
              </div>
              <div className="lfm-recent-time">
                {t.nowplaying ? '▶ Now' : timeAgo(t.dateUts)}
              </div>
            </a>
          ))}
        </div>
      )}
  </div>
);

/* ── Loved Tracks ───────────────────────────────────────────── */
const LovedSection = ({ tracks }) => (
  <div className="lfm-card lfm-card-full">
    <div className="lfm-card-title">❤️ Loved Tracks</div>
    {tracks.length === 0
      ? <div className="lfm-empty">No loved tracks</div>
      : (
        <div className="lfm-loved-list">
          {tracks.map((t, i) => (
            <a key={i} className="lfm-loved-row" href={t.url} target="_blank" rel="noreferrer">
              <span className="lfm-loved-heart">♥</span>
              {t.image
                ? <img className="lfm-recent-art" src={t.image} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                : <div className="lfm-recent-ph">🎵</div>}
              <div className="lfm-recent-info">
                <div className="lfm-recent-name">{t.name}</div>
                <div className="lfm-recent-artist">{t.artist}</div>
              </div>
            </a>
          ))}
        </div>
      )}
  </div>
);

/* ── Main Page ──────────────────────────────────────────────── */
const LastFmPage = () => {
  const { user } = useAuth();

  const [activeUsername, setActiveUsername] = useState('');
  const [searchInput,    setSearchInput]    = useState('');
  const [period,         setPeriod]         = useState('1month');

  const [userInfo,     setUserInfo]     = useState(null);
  const [topArtists,   setTopArtists]   = useState([]);
  const [topTracks,    setTopTracks]    = useState([]);
  const [topTags,      setTopTags]      = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [lovedTracks,  setLovedTracks]  = useState([]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!user) return;
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const p = profiles.find((pr) => pr.username === user.username);
    if (p?.lastfm_username) {
      setSearchInput(p.lastfm_username);
      setActiveUsername(p.lastfm_username);
    }
  }, [user]);

  const fetchStats = useCallback(async (uname, per) => {
    if (!uname) return;
    setLoading(true);
    setError(null);
    try {
      const [info, artists, tracks, tags, recent, loved] = await Promise.all([
        lfm.getUserInfo(uname),
        lfm.getTopArtists(uname, per, 12),
        lfm.getTopTracks(uname, per, 15),
        lfm.getTopTags(uname, 24),
        lfm.getRecentTracks(uname, 15),
        lfm.getLovedTracks(uname, 10),
      ]);
      if (!info) { setError(`Last.fm user "${uname}" not found. Check the username and try again.`); return; }
      setUserInfo(info);
      setTopArtists(artists);
      setTopTracks(tracks);
      setTopTags(tags);
      setRecentTracks(recent);
      setLovedTracks(loved);
    } catch {
      setError('Could not load Last.fm data. Try again shortly.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeUsername) fetchStats(activeUsername, period);
  }, [activeUsername, period, fetchStats]);

  const handleSearch = (e) => {
    e?.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) setActiveUsername(trimmed);
  };

  const [keyInput,  setKeyInput]  = useState('');
  const [keyError,  setKeyError]  = useState('');
  const [keyReady,  setKeyReady]  = useState(lfm.hasApiKey());
  const keyRef = useRef(null);

  const handleSaveKey = (e) => {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) { setKeyError('Please paste your API key.'); return; }
    if (k.length < 20) { setKeyError('That doesn\'t look like a valid key — it\'s too short.'); return; }
    lfm.saveApiKey(k);
    setKeyError('');
    setKeyReady(true);
  };

  if (!keyReady) {
    return (
      <div className="page lfm-page">
        <div className="page-header">
          <h1 className="gradient-text">Last.fm</h1>
        </div>
        <div className="lfm-setup-card">
          <div className="lfm-setup-icon">🎵</div>
          <h2>Connect Last.fm</h2>
          <p>
            A free API key is needed. Get one in seconds at{' '}
            <a href="https://www.last.fm/api/account/create" target="_blank" rel="noreferrer">
              last.fm/api/account/create
            </a>
            {' '}— then paste it below.
          </p>
          <form className="lfm-key-form" onSubmit={handleSaveKey}>
            <input
              ref={keyRef}
              className="lfm-key-input"
              type="text"
              placeholder="Paste your Last.fm API key here…"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setKeyError(''); }}
              autoFocus
            />
            <button className="lfm-key-btn" type="submit">Save Key</button>
          </form>
          {keyError && <div className="lfm-key-error">{keyError}</div>}
          <p className="lfm-key-note">The key is stored in your browser only — never sent anywhere except Last.fm.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page lfm-page">
      <div className="page-header">
        <h1 className="gradient-text">Last.fm</h1>
        <p className="subtitle">Music stats &amp; listening history</p>
      </div>

      <form className="lfm-search-row" onSubmit={handleSearch}>
        <input
          className="lfm-search-input"
          type="text"
          placeholder="Enter a Last.fm username…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="lfm-search-btn" type="submit" disabled={!searchInput.trim() || loading}>
          {loading ? '…' : 'View Stats'}
        </button>
      </form>

      {loading && (
        <div className="lfm-loading">
          <span className="lfm-dot" /><span className="lfm-dot" /><span className="lfm-dot" />
          <span style={{ marginLeft: 8 }}>Loading stats…</span>
        </div>
      )}

      {!loading && error && <div className="lfm-error">{error}</div>}

      {!loading && !error && !activeUsername && (
        <div className="lfm-no-user">
          <div className="lfm-no-user-icon">🎵</div>
          <p>Enter a Last.fm username to see their music stats.</p>
          {user && <p style={{ marginTop: 8, fontSize: '0.8rem' }}>Add your username on your profile to auto-load here.</p>}
        </div>
      )}

      {!loading && !error && userInfo && (
        <>
          <div className="lfm-profile-header">
            {userInfo.image
              ? <img className="lfm-avatar" src={userInfo.image} alt={userInfo.name} />
              : <div className="lfm-avatar-ph">🎵</div>}
            <div className="lfm-profile-info">
              <div className="lfm-profile-name">{userInfo.name}</div>
              {userInfo.realname && <div className="lfm-profile-real">{userInfo.realname}</div>}
              <div className="lfm-profile-stats">
                <div className="lfm-stat-chip">
                  <span className="lfm-stat-val">{fmt(userInfo.playcount)}</span>
                  <span className="lfm-stat-lbl">Scrobbles</span>
                </div>
                {userInfo.country && (
                  <div className="lfm-stat-chip">
                    <span className="lfm-stat-val">{userInfo.country}</span>
                    <span className="lfm-stat-lbl">Country</span>
                  </div>
                )}
              </div>
              <a className="lfm-profile-link" href={userInfo.url} target="_blank" rel="noreferrer">View on Last.fm →</a>
            </div>
          </div>

          <NowPlayingBanner username={activeUsername} />

          <div className="lfm-period-row">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                className={`lfm-period-btn ${period === p.value ? 'active' : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="lfm-two-col">
            <ArtistsSection artists={topArtists} />
            <TracksSection  tracks={topTracks} />
          </div>

          <TagsSection  tags={topTags} />
          <RecentSection tracks={recentTracks} />
          <LovedSection  tracks={lovedTracks} />
        </>
      )}
    </div>
  );
};

export default LastFmPage;
