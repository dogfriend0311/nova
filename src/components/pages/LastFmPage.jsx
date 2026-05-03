import React, { useState, useEffect, useCallback } from 'react';
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
  // eslint-disable-next-line no-unused-vars
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

  const [showConnect, setShowConnect] = useState(false);
  const [connectInput, setConnectInput] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');

  const SAVED_USER_KEY = 'nova_lastfm_saved_username';

  useEffect(() => {
    if (user) {
      const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
      const p = profiles.find((pr) => pr.username === user.username);
      if (p?.lastfm_username) {
        setSearchInput(p.lastfm_username);
        setActiveUsername(p.lastfm_username);
        return;
      }
    }
    const saved = localStorage.getItem(SAVED_USER_KEY);
    if (saved) {
      setSearchInput(saved);
      setActiveUsername(saved);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveUsername = useCallback((uname) => {
    localStorage.setItem(SAVED_USER_KEY, uname);
    if (user) {
      const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
      const idx = profiles.findIndex((p) => p.username === user.username);
      if (idx !== -1) {
        profiles[idx] = { ...profiles[idx], lastfm_username: uname };
      } else {
        profiles.push({ username: user.username, lastfm_username: uname });
      }
      localStorage.setItem('member_profiles', JSON.stringify(profiles));
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
      if (!info) {
        setError(`Last.fm user "${uname}" not found. Check the username and try again.`);
        return;
      }
      if (info._error) {
        const msg = info._error === 10
          ? 'Last.fm API key is invalid. Contact the site admin.'
          : `Last.fm error ${info._error}: ${info._message}`;
        setError(msg);
        return;
      }
      setUserInfo(info);
      setTopArtists(artists);
      setTopTracks(tracks);
      setTopTags(tags);
      setRecentTracks(recent);
      setLovedTracks(loved);
      localStorage.setItem(SAVED_USER_KEY, uname);
    } catch (e) {
      setError('Could not reach Last.fm. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeUsername) fetchStats(activeUsername, period);
  }, [activeUsername, period, fetchStats]);

  const handleConnectSubmit = async (e) => {
    e?.preventDefault();
    const uname = connectInput.trim();
    if (!uname) return;
    setConnectLoading(true);
    setConnectError('');
    try {
      const info = await lfm.getUserInfo(uname);
      if (!info) {
        setConnectError(`Username "${uname}" not found on Last.fm. Double-check it and try again.`);
        return;
      }
      if (info._error) {
        setConnectError(info._error === 10
          ? 'API key error — contact the site admin.'
          : `Last.fm error: ${info._message}`);
        return;
      }
      saveUsername(uname);
      setSearchInput(uname);
      setActiveUsername(uname);
      setShowConnect(false);
      setConnectInput('');
      setConnectError('');
    } catch {
      setConnectError('Could not reach Last.fm. Try again.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem(SAVED_USER_KEY);
    if (user) {
      const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
      const idx = profiles.findIndex((p) => p.username === user.username);
      if (idx !== -1) {
        profiles[idx] = { ...profiles[idx], lastfm_username: '' };
        localStorage.setItem('member_profiles', JSON.stringify(profiles));
      }
    }
    setActiveUsername('');
    setSearchInput('');
    setUserInfo(null);
    setError(null);
  };

  return (
    <div className="page lfm-page">
      {showConnect && (
        <div className="lfm-modal-overlay" onClick={() => setShowConnect(false)}>
          <div className="lfm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lfm-modal-header">
              <div className="lfm-modal-logo">🎵</div>
              <h2 className="lfm-modal-title">Connect Last.fm</h2>
              <p className="lfm-modal-sub">Enter your Last.fm username to link your listening stats</p>
            </div>
            <form className="lfm-modal-form" onSubmit={handleConnectSubmit}>
              <input
                className="lfm-modal-input"
                type="text"
                placeholder="Your Last.fm username"
                value={connectInput}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setConnectInput(e.target.value)}
                autoFocus
              />
              {connectError && <div className="lfm-modal-error">{connectError}</div>}
              <button
                className="lfm-modal-btn"
                type="submit"
                disabled={!connectInput.trim() || connectLoading}
              >
                {connectLoading ? 'Verifying…' : 'Connect Account'}
              </button>
              <a
                className="lfm-modal-link"
                href="https://www.last.fm/join"
                target="_blank"
                rel="noreferrer"
              >
                Don't have an account? Sign up at last.fm →
              </a>
              <a
                className="lfm-modal-link"
                href="https://www.last.fm/settings/account"
                target="_blank"
                rel="noreferrer"
              >
                Find your username in Last.fm settings →
              </a>
            </form>
            <button className="lfm-modal-close" onClick={() => setShowConnect(false)}>✕</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="gradient-text">Last.fm</h1>
        <p className="subtitle">Music stats &amp; listening history</p>
      </div>

      <div className="lfm-connect-bar">
        {activeUsername ? (
          <>
            <span className="lfm-connected-label">
              <span className="lfm-connected-dot" /> Viewing: <strong>{activeUsername}</strong>
            </span>
            <button className="lfm-bar-btn" onClick={() => { setShowConnect(true); setConnectInput(''); }}>Switch Account</button>
            <button className="lfm-bar-btn lfm-bar-btn-ghost" onClick={handleDisconnect}>Disconnect</button>
          </>
        ) : (
          <button className="lfm-connect-big-btn" onClick={() => setShowConnect(true)}>
            🎵 Connect Your Last.fm Account
          </button>
        )}
      </div>

      {loading && (
        <div className="lfm-loading">
          <span className="lfm-dot" /><span className="lfm-dot" /><span className="lfm-dot" />
          <span style={{ marginLeft: 8 }}>Loading stats…</span>
        </div>
      )}

      {!loading && error && (
        <div className="lfm-error">
          {error}
          <button className="lfm-error-retry" onClick={() => { setShowConnect(true); setConnectInput(''); }}>
            Try a different username
          </button>
        </div>
      )}

      {!loading && !error && !activeUsername && (
        <div className="lfm-no-user">
          <div className="lfm-no-user-icon">🎵</div>
          <p>Connect your Last.fm account to see your music stats.</p>
          <button className="lfm-connect-big-btn" style={{ marginTop: 16 }} onClick={() => setShowConnect(true)}>
            Connect Last.fm
          </button>
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
