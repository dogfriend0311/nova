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
const LastFmPage = ({ pendingToken, onTokenConsumed }) => {
  const { user } = useAuth();

  const [activeUsername, setActiveUsername] = useState('');
  const [period,         setPeriod]         = useState('1month');

  const [userInfo,     setUserInfo]     = useState(null);
  const [topArtists,   setTopArtists]   = useState([]);
  const [topTracks,    setTopTracks]    = useState([]);
  const [topTags,      setTopTags]      = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [lovedTracks,  setLovedTracks]  = useState([]);

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  /* Manual fallback modal state */
  const [showManual,    setShowManual]    = useState(false);
  const [manualInput,   setManualInput]   = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError,   setManualError]   = useState('');

  const SAVED_USER_KEY = 'nova_lastfm_saved_username';

  /* ── Persist username to localStorage + member profile ──── */
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

  /* ── Restore saved username on load ─────────────────────── */
  useEffect(() => {
    if (user) {
      const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
      const p = profiles.find((pr) => pr.username === user.username);
      if (p?.lastfm_username) { setActiveUsername(p.lastfm_username); return; }
    }
    const saved = localStorage.getItem(SAVED_USER_KEY);
    if (saved) setActiveUsername(saved);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handle OAuth callback token from App.jsx ───────────── */
  useEffect(() => {
    if (!pendingToken) return;
    onTokenConsumed?.();
    (async () => {
      setOauthLoading(true);
      setError(null);
      try {
        const session = await lfm.authGetSession(pendingToken);
        if (session?.name) {
          saveUsername(session.name);
          setActiveUsername(session.name);
          return;
        }
        /* Secret not set → show manual entry so they can still link */
        setShowManual(true);
      } catch {
        setShowManual(true);
      } finally {
        setOauthLoading(false);
      }
    })();
  }, [pendingToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch all stats for a username ─────────────────────── */
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
        setError(info._error === 10
          ? 'Last.fm API key is invalid. Contact the site admin.'
          : `Last.fm error ${info._error}: ${info._message}`);
        return;
      }
      setUserInfo(info);
      setTopArtists(artists);
      setTopTracks(tracks);
      setTopTags(tags);
      setRecentTracks(recent);
      setLovedTracks(loved);
      localStorage.setItem(SAVED_USER_KEY, uname);
    } catch {
      setError('Could not reach Last.fm. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeUsername) fetchStats(activeUsername, period);
  }, [activeUsername, period, fetchStats]);

  /* ── Sign in via Last.fm redirect ───────────────────────── */
  const handleSignIn = () => {
    window.location.href = lfm.getAuthUrl();
  };

  /* ── Manual username fallback ───────────────────────────── */
  const handleManualSubmit = async (e) => {
    e?.preventDefault();
    const uname = manualInput.trim();
    if (!uname) return;
    setManualLoading(true);
    setManualError('');
    try {
      const info = await lfm.getUserInfo(uname);
      if (!info) {
        setManualError(`"${uname}" not found on Last.fm. Double-check the spelling.`);
        return;
      }
      if (info._error) {
        setManualError(info._error === 10
          ? 'API key error — contact the site admin.'
          : `Last.fm error: ${info._message}`);
        return;
      }
      saveUsername(uname);
      setActiveUsername(uname);
      setShowManual(false);
      setManualInput('');
      setManualError('');
    } catch {
      setManualError('Could not reach Last.fm. Try again.');
    } finally {
      setManualLoading(false);
    }
  };

  /* ── Disconnect ─────────────────────────────────────────── */
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
    setUserInfo(null);
    setError(null);
  };

  /* ── Render ─────────────────────────────────────────────── */
  const noAccount = !activeUsername && !loading && !oauthLoading && !error;

  return (
    <div className="page lfm-page">

      {/* Manual username modal (fallback if no API secret) */}
      {showManual && (
        <div className="lfm-modal-overlay" onClick={() => setShowManual(false)}>
          <div className="lfm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lfm-modal-header">
              <div className="lfm-modal-logo">🎵</div>
              <h2 className="lfm-modal-title">Enter Your Username</h2>
              <p className="lfm-modal-sub">Type your Last.fm username to pull in your stats</p>
            </div>
            <form className="lfm-modal-form" onSubmit={handleManualSubmit}>
              <input
                className="lfm-modal-input"
                type="text"
                placeholder="Your Last.fm username"
                value={manualInput}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setManualInput(e.target.value)}
                autoFocus
              />
              {manualError && <div className="lfm-modal-error">{manualError}</div>}
              <button
                className="lfm-modal-btn"
                type="submit"
                disabled={!manualInput.trim() || manualLoading}
              >
                {manualLoading ? 'Loading…' : 'Show My Stats'}
              </button>
              <a className="lfm-modal-link" href="https://www.last.fm/settings/account" target="_blank" rel="noreferrer">
                Find your username at last.fm/settings →
              </a>
            </form>
            <button className="lfm-modal-close" onClick={() => setShowManual(false)}>✕</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="gradient-text">Last.fm</h1>
        <p className="subtitle">Music stats &amp; listening history</p>
      </div>

      {/* Connected account bar */}
      {activeUsername && !oauthLoading && (
        <div className="lfm-connect-bar">
          <span className="lfm-connected-label">
            <span className="lfm-connected-dot" /> Connected: <strong>{activeUsername}</strong>
          </span>
          <button className="lfm-bar-btn" onClick={handleSignIn}>Switch Account</button>
          <button className="lfm-bar-btn lfm-bar-btn-ghost" onClick={handleDisconnect}>Disconnect</button>
        </div>
      )}

      {/* OAuth loading */}
      {oauthLoading && (
        <div className="lfm-loading lfm-oauth-loading">
          <span className="lfm-dot" /><span className="lfm-dot" /><span className="lfm-dot" />
          <span style={{ marginLeft: 8 }}>Signing you in…</span>
        </div>
      )}

      {/* Stats loading */}
      {loading && !oauthLoading && (
        <div className="lfm-loading">
          <span className="lfm-dot" /><span className="lfm-dot" /><span className="lfm-dot" />
          <span style={{ marginLeft: 8 }}>Loading stats…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && !oauthLoading && error && (
        <div className="lfm-error">
          {error}
          <button className="lfm-error-retry" onClick={handleSignIn}>
            Try signing in again
          </button>
        </div>
      )}

      {/* No account — big sign-in CTA */}
      {noAccount && (
        <div className="lfm-signin-hero">
          <div className="lfm-signin-logo">🎵</div>
          <h2 className="lfm-signin-title">Connect Your Last.fm</h2>
          <p className="lfm-signin-sub">Sign in with Last.fm to instantly see your scrobbles, top artists, top tracks, and more.</p>
          <button className="lfm-signin-btn" onClick={handleSignIn}>
            Sign in with Last.fm
          </button>
          <button className="lfm-signin-manual" onClick={() => setShowManual(true)}>
            Enter username manually instead
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && !oauthLoading && !error && userInfo && (
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
