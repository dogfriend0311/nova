import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
//  Storage helpers
// ─────────────────────────────────────────────────────────────
const CONFIG_KEY    = 'nova_radio_config';
const LISTENERS_KEY = 'nova_radio_listeners';

function readConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
  catch { return null; }
}
function trackListenerActive(username) {
  if (!username) return;
  const d = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
  d[username] = Date.now();
  localStorage.setItem(LISTENERS_KEY, JSON.stringify(d));
}
function getActiveListeners() {
  try {
    const d   = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
    const cut = Date.now() - 5 * 60 * 1000;
    return Object.entries(d).filter(([, ts]) => ts > cut).map(([u]) => u);
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────
//  YouTube IFrame API — Promise-based loader
// ─────────────────────────────────────────────────────────────
let _ytReady = false;
const _ytCallbacks = [];

function loadYouTubeAPI() {
  if (_ytReady) return Promise.resolve();
  return new Promise((resolve) => {
    _ytCallbacks.push(resolve);
    if (!document.getElementById('yt-api-script')) {
      const s = document.createElement('script');
      s.id  = 'yt-api-script';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  });
}
// Must be global
window.onYouTubeIframeAPIReady = () => {
  _ytReady = true;
  _ytCallbacks.forEach(cb => cb());
  _ytCallbacks.length = 0;
};

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/|v\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function isDirectAudio(url) {
  if (!url) return false;
  if (getYouTubeId(url)) return false;
  if (url.includes('spotify.com') || url.includes('soundcloud.com')) return false;
  return true;
}

function fmtTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
//  NovaRadio — iPod-style player
// ─────────────────────────────────────────────────────────────
const NovaRadio = ({ user }) => {
  const [config,      setConfig]      = useState(readConfig);
  const [trackIdx,    setTrackIdx]    = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [listeners,   setListeners]   = useState([]);
  const [showList,    setShowList]    = useState(false);
  // ytReady tracked via _ytReady module-level flag

  // Refs
  const audioRef    = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytDivId     = 'nova-yt-player';
  const pollRef     = useRef(null);
  const rotRef      = useRef(0);      // album art rotation degrees
  const rafRef      = useRef(null);

  const playlist = config?.playlist || [];
  const track    = playlist[trackIdx] || null;
  const ytId     = getYouTubeId(track?.url);
  const isDirect = isDirectAudio(track?.url);

  // ── Listener heartbeat ─────────────────────────────────────
  useEffect(() => {
    if (user?.username) trackListenerActive(user.username);
    setListeners(getActiveListeners());
    const id = setInterval(() => {
      if (user?.username) trackListenerActive(user.username);
      setListeners(getActiveListeners());
      // Re-read config in case admin changed it
      const fresh = readConfig();
      setConfig(fresh);
    }, 30_000);
    return () => clearInterval(id);
  }, [user]);

  // ── Album art rotation animation ───────────────────────────
  const animateArt = useCallback(() => {
    if (isPlaying) {
      rotRef.current += 0.15;
      const el = document.getElementById('nova-art-img');
      if (el) el.style.transform = `rotate(${rotRef.current}deg)`;
    }
    rafRef.current = requestAnimationFrame(animateArt);
  }, [isPlaying]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateArt);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animateArt]);

  // ── YouTube player setup ───────────────────────────────────
  useEffect(() => {
    if (!ytId) return;

    loadYouTubeAPI().then(() => {

      // Destroy previous player if it exists
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }

      // Ensure the div exists
      const container = document.getElementById(ytDivId);
      if (!container) return;

      ytPlayerRef.current = new window.YT.Player(ytDivId, {
        videoId: ytId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) {
              setIsPlaying(true);
              startYTPoll();
            } else if (e.data === S.PAUSED) {
              setIsPlaying(false);
              stopYTPoll();
            } else if (e.data === S.ENDED) {
              setIsPlaying(false);
              stopYTPoll();
              handleNext();
            }
          },
        },
      });
    });

    return () => {
      stopYTPoll();
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId, trackIdx]);

  function startYTPoll() {
    stopYTPoll();
    pollRef.current = setInterval(() => {
      try {
        const p = ytPlayerRef.current;
        if (!p) return;
        const cur = p.getCurrentTime?.() ?? 0;
        const dur = p.getDuration?.()    ?? 0;
        setCurrentTime(cur);
        setDuration(dur);
      } catch {}
    }, 500);
  }
  function stopYTPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  // ── Playback controls ──────────────────────────────────────
  function handlePlayPause() {
    if (ytId && ytPlayerRef.current) {
      try {
        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1 /* PLAYING */) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
      } catch {}
    } else if (isDirect && audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else           audioRef.current.play();
    }
  }

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    setTrackIdx(i => (i + 1) % playlist.length);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [playlist.length]);

  function handlePrev() {
    if (!playlist.length) return;
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      if (ytId && ytPlayerRef.current) {
        try { ytPlayerRef.current.seekTo(0, true); } catch {}
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }
    setTrackIdx(i => (i - 1 + playlist.length) % playlist.length);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }

  function handleSeek(e) {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (ytId && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(t, true); } catch {}
    } else if (audioRef.current) {
      audioRef.current.currentTime = t;
    }
  }

  function selectTrack(i) {
    if (i === trackIdx) {
      handlePlayPause();
    } else {
      setTrackIdx(i);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
    setShowList(false);
  }

  // ── No config — placeholder ────────────────────────────────
  if (!config || playlist.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ width: 120, height: 120, borderRadius: 24, background: 'linear-gradient(135deg,rgba(94,129,244,0.15),rgba(200,100,220,0.1))', border: '1px solid rgba(94,129,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', margin: '0 auto 24px' }}>
          📻
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: '#e2e5f0', marginBottom: 10 }}>No Playlist Yet</h2>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          An admin can set up the playlist in the<br />
          <strong style={{ color: 'rgba(94,129,244,0.8)' }}>Owner Dashboard → 📻 Radio</strong> tab.
        </p>
      </div>
    );
  }

  // ── Derived UI values ──────────────────────────────────────
  const coverFallback = `linear-gradient(135deg, rgba(94,129,244,0.3) 0%, rgba(200,100,220,0.2) 100%)`;
  const progress      = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 12px 40px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#e2e5f0', margin: 0, letterSpacing: '-0.01em' }}>
          📻 {config.name || 'Nova Radio'}
        </h1>
        {config.description && (
          <p style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.82rem', marginTop: 4 }}>
            {config.description}
          </p>
        )}
      </div>

      {/* Main layout: player + playlist */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── iPod player card ───────────────────────────── */}
        <div style={{
          flex: '1 1 300px', minWidth: 280,
          background: 'linear-gradient(160deg, rgba(19,23,41,0.97) 0%, rgba(10,13,26,0.97) 100%)',
          border: '1px solid rgba(94,129,244,0.18)',
          borderRadius: 24,
          padding: '28px 24px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0,
          boxShadow: isPlaying ? '0 0 40px rgba(94,129,244,0.12)' : 'none',
          transition: 'box-shadow 0.6s ease',
        }}>

          {/* Album art */}
          <div style={{
            width: 200, height: 200,
            borderRadius: 20,
            background: track?.coverUrl ? 'transparent' : coverFallback,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: isPlaying
              ? '0 12px 48px rgba(94,129,244,0.35), 0 0 0 1px rgba(94,129,244,0.2)'
              : '0 8px 24px rgba(0,0,0,0.5)',
            transition: 'box-shadow 0.4s ease',
            flexShrink: 0,
            marginBottom: 24,
          }}>
            {track?.coverUrl ? (
              <img
                id="nova-art-img"
                src={track.coverUrl}
                alt={track.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transformOrigin: 'center', transition: 'transform 0.05s linear' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div id="nova-art-img" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>
                🎵
              </div>
            )}
            {/* Playing overlay pulse */}
            {isPlaying && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 20, border: '2px solid rgba(94,129,244,0.4)', animation: 'glowPulse 2s ease-in-out infinite', pointerEvents: 'none' }} />
            )}
          </div>

          {/* Track info */}
          <div style={{ width: '100%', textAlign: 'center', marginBottom: 18, minHeight: 50 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '1.05rem', color: '#ffffff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: 4,
            }}>
              {track?.title || 'Unknown Track'}
            </div>
            <div style={{ color: 'rgba(158,165,196,0.55)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track?.artist || '—'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.3)', marginTop: 4 }}>
              {trackIdx + 1} / {playlist.length}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', marginBottom: 8 }}>
            <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(94,129,244,0.12)', cursor: 'pointer', marginBottom: 6 }}>
              {/* Filled */}
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, borderRadius: 2, background: 'linear-gradient(90deg, #5e81f4, #c864dc)', transition: 'width 0.5s linear' }} />
              {/* Thumb */}
              <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, width: 12, height: 12, borderRadius: '50%', background: '#ffffff', transform: 'translate(-50%,-50%)', boxShadow: '0 0 6px rgba(94,129,244,0.6)', opacity: duration > 0 ? 1 : 0, transition: 'left 0.5s linear' }} />
              {/* Invisible range input for drag-to-seek */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                style={{ position: 'absolute', inset: '-8px 0', width: '100%', height: '20px', opacity: 0, cursor: 'pointer', margin: 0 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)', fontFamily: 'var(--font-mono)' }}>
              <span>{fmtTime(currentTime)}</span>
              <span>{duration > 0 ? fmtTime(duration) : ytId ? '—' : '—'}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
            {/* Prev */}
            <button onClick={handlePrev} disabled={playlist.length < 2}
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.2)', color: 'rgba(158,165,196,0.8)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: playlist.length < 2 ? 0.3 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(94,129,244,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(94,129,244,0.08)'}
            >
              ⏮
            </button>

            {/* Play / Pause */}
            <button onClick={handlePlayPause}
              style={{ width: 60, height: 60, borderRadius: '50%', background: isPlaying ? 'rgba(94,129,244,0.2)' : 'linear-gradient(135deg,#5e81f4,#c864dc)', border: isPlaying ? '2px solid rgba(94,129,244,0.5)' : 'none', color: '#ffffff', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isPlaying ? '0 0 20px rgba(94,129,244,0.4)' : '0 4px 16px rgba(94,129,244,0.3)', transition: 'all 0.2s' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Next */}
            <button onClick={handleNext} disabled={playlist.length < 2}
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.2)', color: 'rgba(158,165,196,0.8)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: playlist.length < 2 ? 0.3 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(94,129,244,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(94,129,244,0.08)'}
            >
              ⏭
            </button>
          </div>

          {/* Listener count */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#43b581', boxShadow: '0 0 6px #43b581', animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)' }}>
                {listeners.length || 0} listening
              </span>
            </div>
            {config.addedBy && (
              <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.3)' }}>
                · curated by @{config.addedBy}
              </span>
            )}
          </div>

          {/* Mobile: show playlist toggle */}
          <button
            onClick={() => setShowList(p => !p)}
            style={{ marginTop: 16, padding: '8px 20px', background: 'rgba(94,129,244,0.07)', border: '1px solid rgba(94,129,244,0.18)', color: 'rgba(158,165,196,0.6)', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'none' }}
            className="radio-playlist-toggle"
          >
            {showList ? 'Hide Playlist ▲' : 'Playlist ▼'}
          </button>
        </div>

        {/* ── Playlist sidebar ───────────────────────────── */}
        <div style={{
          flex: '1 1 240px', minWidth: 220,
          background: 'linear-gradient(160deg, rgba(19,23,41,0.97) 0%, rgba(10,13,26,0.97) 100%)',
          border: '1px solid rgba(94,129,244,0.18)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(94,129,244,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)' }}>
              📋 Playlist · {playlist.length} tracks
            </div>
          </div>

          {/* Track list */}
          <div style={{ maxHeight: 440, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {playlist.map((t, i) => {
              const isActive = i === trackIdx;
              return (
                <div
                  key={t.id || i}
                  onClick={() => selectTrack(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(94,129,244,0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-cyan)' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(94,129,244,0.05)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Cover thumb */}
                  <div style={{ width: 38, height: 38, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'rgba(94,129,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {t.coverUrl
                      ? <img src={t.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
                      : '🎵'
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.83rem', color: isActive ? '#ffffff' : 'rgba(220,230,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.artist || '—'}
                    </div>
                  </div>

                  {/* Playing indicator */}
                  {isActive && isPlaying && (
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexShrink: 0, height: 14 }}>
                      {[1, 2, 3].map(b => (
                        <div key={b} style={{
                          width: 3, borderRadius: 2,
                          background: 'var(--color-cyan)',
                          animation: `equalizerBar${b} 0.6s ease-in-out infinite alternate`,
                          height: `${[8, 14, 10][b - 1]}px`,
                          animationDelay: `${(b - 1) * 0.15}s`,
                        }} />
                      ))}
                    </div>
                  )}
                  {isActive && !isPlaying && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(94,129,244,0.5)', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden YouTube player div — must stay in DOM */}
      <div style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
        <div id={ytDivId} />
      </div>

      {/* Hidden HTML5 audio for direct files */}
      {isDirect && track?.url && (
        <audio
          ref={audioRef}
          src={track.url}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleNext}
          onTimeUpdate={e => {
            setCurrentTime(e.target.currentTime);
            setDuration(e.target.duration || 0);
          }}
          onLoadedMetadata={e => setDuration(e.target.duration || 0)}
          style={{ display: 'none' }}
        />
      )}

      {/* Equalizer bar keyframes */}
      <style>{`
        @keyframes equalizerBar1 { from { height: 4px; } to { height: 14px; } }
        @keyframes equalizerBar2 { from { height: 10px; } to { height: 4px; } }
        @keyframes equalizerBar3 { from { height: 6px; } to { height: 12px; } }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        .radio-playlist-toggle { display: none !important; }
        @media (max-width: 620px) {
          .radio-playlist-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default NovaRadio;
