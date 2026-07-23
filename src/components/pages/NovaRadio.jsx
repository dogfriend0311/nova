import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
const CONFIG_KEY    = 'nova_radio_config';
const LISTENERS_KEY = 'nova_radio_listeners';
// Fixed epoch — all users share the same "live" position in the playlist
const RADIO_EPOCH   = 1700000000; // Nov 14 2023 (arbitrary fixed start)

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function readConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
  catch { return null; }
}
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
// Returns { idx, seek } for the current moment in the live radio feed
function getLivePosition(playlist) {
  const totalDur = playlist.reduce((sum, t) => sum + (t.duration || 180), 0);
  if (!totalDur) return { idx: 0, seek: 0 };
  const elapsed = (Date.now() / 1000 - RADIO_EPOCH) % totalDur;
  let acc = 0;
  for (let i = 0; i < playlist.length; i++) {
    const d = playlist[i].duration || 180;
    if (elapsed < acc + d) return { idx: i, seek: elapsed - acc };
    acc += d;
  }
  return { idx: 0, seek: 0 };
}
function heartbeat(username) {
  if (!username) return;
  try {
    const d = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
    d[username] = Date.now();
    localStorage.setItem(LISTENERS_KEY, JSON.stringify(d));
  } catch {}
}
function getListeners() {
  try {
    const d   = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
    const cut = Date.now() - 5 * 60 * 1000;
    return Object.entries(d).filter(([, ts]) => ts > cut).map(([u]) => u);
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────
//  NovaRadio — iPod Classic + 24/7 live radio
// ─────────────────────────────────────────────────────────────
const NovaRadio = ({ user }) => {
  const [config,       setConfig]       = useState(readConfig);
  const [trackIdx,     setTrackIdx]     = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isLive,       setIsLive]       = useState(true);
  const [interacted,   setInteracted]   = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [view,         setView]         = useState('nowplaying'); // 'nowplaying' | 'songs'
  const [listCursor,   setListCursor]   = useState(0);
  const [btnFx,        setBtnFx]        = useState(null);      // button visual feedback
  const [listeners,    setListeners]    = useState([]);
  const [tuneMsg,      setTuneMsg]      = useState('');        // "Tuning in…" flash message

  const audioRef    = useRef(null);
  const seekOnLoad  = useRef(0);   // where to seek after audio loads
  const pollRef     = useRef(null);

  const playlist = config?.playlist || [];
  const track    = playlist[trackIdx] || null;

  // ── Load config + set initial live position ───────────────
  useEffect(() => {
    const loadConfig = async () => {
      let cfg = null;
      try {
        const { db } = await import('../../services/db');
        if (db?.getRadioConfig) cfg = await db.getRadioConfig();
      } catch {}
      if (!cfg) cfg = readConfig();
      if (cfg) {
        setConfig(cfg);
        if (cfg.playlist?.length) {
          const { idx, seek } = getLivePosition(cfg.playlist);
          setTrackIdx(idx);
          setListCursor(idx);
          seekOnLoad.current = seek;
        }
      }
    };
    loadConfig();

    // Periodic refresh + listener heartbeat
    pollRef.current = setInterval(() => {
      const fresh = readConfig();
      if (fresh) setConfig(fresh);
      if (user?.username) heartbeat(user.username);
      setListeners(getListeners());
    }, 30_000);
    if (user?.username) heartbeat(user.username);
    setListeners(getListeners());

    return () => clearInterval(pollRef.current);
  }, [user]);

  // ── When track changes: load audio ───────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.url) return;
    audio.src = track.url;
    audio.load();
  }, [trackIdx, track?.url]);

  // ── Play / pause audio ────────────────────────────────────
  const doPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !track?.url) return;
    if (!interacted) {
      // First interaction — tune in to live position
      setInteracted(true);
      setTuneMsg('Tuning in…');
      setTimeout(() => setTuneMsg(''), 1800);
      if (isLive) {
        const { idx, seek } = getLivePosition(playlist);
        seekOnLoad.current = seek;
        if (idx !== trackIdx) {
          setTrackIdx(idx);
          setListCursor(idx);
          return; // useEffect above will reload audio; play triggered below
        }
        if (audio.readyState >= 1) audio.currentTime = seek;
        else seekOnLoad.current = seek;
      }
    }
    try { await audio.play(); } catch {}
  }, [interacted, isLive, playlist, trackIdx, track]);

  const doPause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // ── After loading metadata — apply queued seek ────────────
  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
    if (seekOnLoad.current > 0) {
      audio.currentTime = seekOnLoad.current;
      seekOnLoad.current = 0;
    }
    if (interacted) {
      audio.play().catch(() => {});
    }
  }

  // ── Track ended → advance ─────────────────────────────────
  function handleEnded() {
    if (!playlist.length) return;
    const next = (trackIdx + 1) % playlist.length;
    setTrackIdx(next);
    setListCursor(next);
    seekOnLoad.current = 0;
    // If live, re-sync (in case we drifted)
    if (isLive) {
      const { idx, seek } = getLivePosition(playlist);
      setTrackIdx(idx);
      setListCursor(idx);
      seekOnLoad.current = seek;
    }
  }

  // ── Click wheel zone handlers ─────────────────────────────
  function flashBtn(zone) {
    setBtnFx(zone);
    setTimeout(() => setBtnFx(null), 180);
  }

  function handleMenuPress() {
    flashBtn('menu');
    if (view === 'songs') {
      setView('nowplaying');
    } else {
      setView('songs');
      setListCursor(trackIdx);
    }
  }

  function handlePrevPress() {
    flashBtn('left');
    if (view === 'songs') {
      setListCursor(c => Math.max(0, c - 1));
      return;
    }
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prev = (trackIdx - 1 + playlist.length) % playlist.length;
    setIsLive(false);
    setTrackIdx(prev);
    setListCursor(prev);
    seekOnLoad.current = 0;
  }

  function handleNextPress() {
    flashBtn('right');
    if (view === 'songs') {
      setListCursor(c => Math.min(playlist.length - 1, c + 1));
      return;
    }
    const next = (trackIdx + 1) % playlist.length;
    setIsLive(false);
    setTrackIdx(next);
    setListCursor(next);
    seekOnLoad.current = 0;
  }

  function handlePlayPausePress() {
    flashBtn('bottom');
    if (isPlaying) doPause(); else doPlay();
  }

  function handleCenterPress() {
    flashBtn('center');
    if (view === 'songs') {
      // Play the selected track
      setIsLive(false);
      setTrackIdx(listCursor);
      seekOnLoad.current = 0;
      setView('nowplaying');
      // play will trigger via useEffect + interacted flag
      if (!interacted) setInteracted(true);
      setTimeout(() => { audioRef.current?.play().catch(() => {}); }, 100);
    } else {
      if (isPlaying) doPause(); else doPlay();
    }
  }

  function handleReturnLive() {
    const { idx, seek } = getLivePosition(playlist);
    setIsLive(true);
    setTrackIdx(idx);
    setListCursor(idx);
    seekOnLoad.current = seek;
    setView('nowplaying');
    setTuneMsg('Tuning in…');
    setTimeout(() => setTuneMsg(''), 1800);
    if (!interacted) setInteracted(true);
  }

  function handleSeek(e) {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
    setIsLive(false);
  }

  // ── "No playlist" state ───────────────────────────────────
  if (!playlist.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={STYLES.ipodBody}>
          <div style={STYLES.screen}>
            <div style={{ ...STYLES.screenHeader }}>NOVA RADIO</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: '2rem' }}>📻</div>
              <div style={{ color: '#7a8aaa', fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.5, padding: '0 8px' }}>
                No playlist yet.<br />Admin sets it up in<br />the Owner Dashboard.
              </div>
            </div>
          </div>
          <WheelDead />
        </div>
      </div>
    );
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px 40px', gap: 16 }}>
      {/* Listeners pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#43b581', boxShadow: '0 0 6px #43b581', animation: 'pulseDot 1.8s ease-in-out infinite' }} />
        <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)', fontFamily: 'var(--font-mono)' }}>
          {listeners.length || 1} listening
        </span>
        {config?.addedBy && (
          <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.25)' }}>
            · curated by @{config.addedBy}
          </span>
        )}
      </div>

      {/* ── iPod body ─────────────────────────────────────── */}
      <div style={STYLES.ipodBody}>

        {/* Screen */}
        <div style={STYLES.screen}>
          {/* Screen header bar */}
          <div style={STYLES.screenHeader}>
            <span style={{ opacity: 0.5 }}>{view === 'songs' ? '🎵 Songs' : config?.name || 'NOVA RADIO'}</span>
            {view === 'nowplaying' && isLive && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: '#ff4d4d', fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff4d4d', animation: 'pulseDot 1s ease-in-out infinite', display: 'inline-block' }} />
                LIVE
              </span>
            )}
            {view === 'nowplaying' && !isLive && interacted && (
              <button onClick={handleReturnLive} style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(94,129,244,0.2)', border: '1px solid rgba(94,129,244,0.4)', color: '#8aa4ff', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
                ↩ Live
              </button>
            )}
          </div>

          {/* Screen content */}
          {view === 'nowplaying' ? (
            <NowPlayingView
              track={track}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              pct={pct}
              onSeek={handleSeek}
              interacted={interacted}
              tuneMsg={tuneMsg}
              trackIdx={trackIdx}
              total={playlist.length}
            />
          ) : (
            <SongListView
              playlist={playlist}
              cursor={listCursor}
              currentIdx={trackIdx}
              isPlaying={isPlaying}
            />
          )}
        </div>

        {/* Click wheel */}
        <ClickWheel
          onMenu={handleMenuPress}
          onPrev={handlePrevPress}
          onNext={handleNextPress}
          onPlayPause={handlePlayPausePress}
          onCenter={handleCenterPress}
          btnFx={btnFx}
          isPlaying={isPlaying}
          disabled={!playlist.length}
        />

        {/* Nova wordmark */}
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.65rem', color: '#c0c0c0', letterSpacing: '0.25em', fontWeight: 700 }}>
          NOVA
        </div>
      </div>

      {/* Hidden audio */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a) { setCurrentTime(a.currentTime); setDuration(a.duration || 0); }
        }}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
      />

      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes waveBar1 { 0%{height:4px} 100%{height:20px} }
        @keyframes waveBar2 { 0%{height:10px} 100%{height:6px} }
        @keyframes waveBar3 { 0%{height:6px} 100%{height:18px} }
        @keyframes waveBar4 { 0%{height:14px} 100%{height:4px} }
        @keyframes waveBar5 { 0%{height:8px} 100%{height:16px} }
        @keyframes scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Now Playing screen content
// ─────────────────────────────────────────────────────────────
const NowPlayingView = ({ track, isPlaying, currentTime, duration, pct, onSeek, interacted, tuneMsg, trackIdx, total }) => {
  const titleLen = (track?.title || '').length;
  const scroll   = isPlaying && titleLen > 16;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 10px 4px', overflow: 'hidden' }}>
      {/* Cover art / waveform */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <div style={{ width: 44, height: 44, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {track?.coverUrl
            ? <img src={track.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
            : (
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 22, paddingBottom: 2 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2, background: '#5e81f4',
                    animation: isPlaying ? `waveBar${i} ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
                    height: isPlaying ? undefined : 4,
                    animationDelay: `${(i-1)*0.1}s`,
                  }} />
                ))}
              </div>
            )
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Scrolling title */}
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}>
            <span style={{
              fontSize: '0.82rem', fontWeight: 700, color: '#e8eeff',
              display: 'inline-block',
              animation: scroll ? 'scroll 8s linear infinite' : 'none',
              paddingRight: scroll ? '3rem' : 0,
            }}>
              {track?.title || 'No Track'}
              {scroll && <span style={{ paddingLeft: '3rem' }}>{track?.title}</span>}
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#6a7a9a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track?.artist || '—'}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#3a4a6a', marginTop: 1 }}>
            {trackIdx + 1} of {total}
          </div>
        </div>
      </div>

      {/* Tune-in message or progress */}
      {!interacted ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: '0.65rem', color: '#3a5a8a', textAlign: 'center' }}>Press ● to tune in</div>
          <div style={{ fontSize: '0.55rem', color: '#2a3a5a' }}>Live 24/7</div>
        </div>
      ) : (
        <>
          {tuneMsg && (
            <div style={{ fontSize: '0.65rem', color: '#5e81f4', textAlign: 'center', marginBottom: 4 }}>{tuneMsg}</div>
          )}
          {/* Progress bar */}
          <div style={{ marginTop: 'auto', paddingTop: 4 }}>
            <div style={{ position: 'relative', height: 3, borderRadius: 2, background: 'rgba(94,129,244,0.15)', marginBottom: 4 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, borderRadius: 2, background: 'linear-gradient(90deg,#5e81f4,#a78bfa)', transition: 'width 0.5s linear' }} />
              <input type="range" min={0} max={duration || 100} step={0.5} value={currentTime}
                onChange={onSeek}
                style={{ position: 'absolute', inset: '-6px 0', width: '100%', height: '15px', opacity: 0, cursor: 'pointer', margin: 0 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#3a5a8a', fontFamily: 'monospace' }}>
              <span>{fmtTime(currentTime)}</span>
              <span>-{fmtTime(Math.max(0, duration - currentTime))}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Song List screen
// ─────────────────────────────────────────────────────────────
const SongListView = ({ playlist, cursor, currentIdx, isPlaying }) => {
  // Show 5 items centered around cursor
  const visible = 5;
  const start   = Math.max(0, Math.min(cursor - 2, playlist.length - visible));
  const items   = playlist.slice(start, start + visible);

  return (
    <div style={{ flex: 1, overflow: 'hidden', paddingTop: 2 }}>
      {items.map((t, i) => {
        const realIdx   = start + i;
        const isCursor  = realIdx === cursor;
        const isPlaying_ = realIdx === currentIdx && isPlaying;
        return (
          <div key={t.id || realIdx} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px',
            background: isCursor ? '#2a4adc' : 'transparent',
            borderRadius: 2,
          }}>
            <span style={{ width: 14, textAlign: 'center', fontSize: '0.55rem', color: isCursor ? '#fff' : '#2a4a8a', flexShrink: 0 }}>
              {isPlaying_ ? '♫' : realIdx + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: isCursor ? 700 : 400, color: isCursor ? '#fff' : '#8a9abb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title || 'Untitled'}
              </div>
              <div style={{ fontSize: '0.58rem', color: isCursor ? 'rgba(255,255,255,0.6)' : '#3a4a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.artist || '—'}
              </div>
            </div>
            <span style={{ fontSize: '0.55rem', color: isCursor ? 'rgba(255,255,255,0.5)' : '#2a3a5a', flexShrink: 0, fontFamily: 'monospace' }}>
              {t.duration ? fmtTime(t.duration) : ''}
            </span>
          </div>
        );
      })}
      {/* Scroll hint */}
      {playlist.length > visible && (
        <div style={{ textAlign: 'center', fontSize: '0.55rem', color: '#1a2a4a', marginTop: 2 }}>
          ⏮ ⏭ to scroll · ● to play
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Click Wheel component
// ─────────────────────────────────────────────────────────────
const ClickWheel = ({ onMenu, onPrev, onNext, onPlayPause, onCenter, btnFx, isPlaying, disabled }) => {
  const pressed = (zone) => btnFx === zone;

  const zoneStyle = (zone) => ({
    position: 'absolute',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    userSelect: 'none',
    transition: 'all 0.1s',
    borderRadius: 4,
    background: pressed(zone) ? 'rgba(0,0,0,0.08)' : 'transparent',
  });

  const labelStyle = {
    fontSize: '0.6rem', fontWeight: 700, color: pressed('menu') ? '#444' : '#888',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={STYLES.wheelOuter}>
      {/* Top — MENU */}
      <div onClick={disabled ? null : onMenu}
        style={{ ...zoneStyle('menu'), top: '8%', left: '25%', right: '25%', height: '22%' }}>
        <span style={labelStyle}>menu</span>
      </div>

      {/* Left — ⏮ / Scroll Up */}
      <div onClick={disabled ? null : onPrev}
        style={{ ...zoneStyle('left'), top: '28%', left: '5%', width: '22%', height: '44%' }}>
        <span style={{ fontSize: '1rem', color: pressed('left') ? '#444' : '#888', lineHeight: 1 }}>⏮</span>
      </div>

      {/* Right — ⏭ / Scroll Down */}
      <div onClick={disabled ? null : onNext}
        style={{ ...zoneStyle('right'), top: '28%', right: '5%', width: '22%', height: '44%' }}>
        <span style={{ fontSize: '1rem', color: pressed('right') ? '#444' : '#888', lineHeight: 1 }}>⏭</span>
      </div>

      {/* Bottom — ⏯ */}
      <div onClick={disabled ? null : onPlayPause}
        style={{ ...zoneStyle('bottom'), bottom: '8%', left: '25%', right: '25%', height: '22%' }}>
        <span style={{ fontSize: '1rem', color: pressed('bottom') ? '#444' : '#888', lineHeight: 1 }}>
          {isPlaying ? '⏸' : '▶'}
        </span>
      </div>

      {/* Center button */}
      <div onClick={disabled ? null : onCenter}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 68, height: 68, borderRadius: '50%',
          background: pressed('center')
            ? 'radial-gradient(circle at 40% 35%, #d0d0d0, #b8b8b8)'
            : 'radial-gradient(circle at 40% 35%, #f0f0f0, #d8d8d8)',
          boxShadow: pressed('center')
            ? 'inset 0 2px 6px rgba(0,0,0,0.25)'
            : '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'all 0.1s',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      />
    </div>
  );
};

// Dead wheel (no playlist)
const WheelDead = () => (
  <div style={STYLES.wheelOuter}>
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 68, height: 68, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #f0f0f0, #d8d8d8)', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
  </div>
);

// ─────────────────────────────────────────────────────────────
//  Shared styles
// ─────────────────────────────────────────────────────────────
const STYLES = {
  ipodBody: {
    width: 280,
    background: 'linear-gradient(160deg, #f8f8f8 0%, #e8e8e8 100%)',
    borderRadius: 28,
    padding: '14px 14px 18px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    border: '1px solid rgba(0,0,0,0.12)',
  },
  screen: {
    width: '100%',
    height: 160,
    background: 'linear-gradient(160deg, #0a1020 0%, #060d1a 100%)',
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
    border: '1px solid rgba(0,0,0,0.4)',
  },
  screenHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    background: 'rgba(94,129,244,0.12)',
    borderBottom: '1px solid rgba(94,129,244,0.1)',
    fontSize: '0.62rem',
    color: '#4a6a9a',
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  wheelOuter: {
    width: 220,
    height: 220,
    borderRadius: '50%',
    position: 'relative',
    background: 'radial-gradient(circle at 40% 35%, #f4f4f4 0%, #d8d8d8 100%)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.12)',
    flexShrink: 0,
  },
};

export default NovaRadio;
