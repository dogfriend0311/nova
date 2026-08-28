// src/context/NowPlayingContext.jsx
//
// Nova Music's "now playing" used to live inside the Music tab's own
// component tree, so navigating to any other page (Home, Sports, etc.)
// unmounted it — killing the YouTube embed that actually produces the
// audio. This context mounts the real player at the App root, outside
// the page-switching logic, so it survives navigation the way a normal
// mini-player ("the iPod", bottom-right of every page) should. Nova
// Music itself just calls play()/stop() from useNowPlaying() instead of
// holding its own state.
//
// ytmusicapi only returns metadata (titles, artists, track order) — it
// can't hand back an audio stream. Actual sound comes from a single,
// persistent, official YouTube IFrame Player API instance created here
// (not a plain autoplaying <iframe>), which is what gives the iPod
// widget a real play/pause button and a live "how far into the track"
// position — the same thing shown on a member's public page while
// they're listening.
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { loadYouTubeAPI } from '../services/youtubeApiLoader';
import db from '../services/db';
import './nowPlaying.css';

const NowPlayingContext = createContext(null);

// How often we push the current position up to the shared `now_playing`
// table (so someone's "Listening to" line on their member page stays
// roughly in sync without hammering the backend every second).
const SYNC_INTERVAL_MS = 15000;
const HOST_ID = 'nova-now-playing-yt-host';

export function NowPlayingProvider({ children }) {
  const { user } = useAuth();

  const [current, setCurrent] = useState(null); // { videoId, title, subtitle, thumbnail, kind }
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const playerRef = useRef(null);
  const pendingRef = useRef(null);
  const tickRef = useRef(null);

  // ── Set up the single, persistent, hidden YT player ────────────────
  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || playerRef.current) return;
      playerRef.current = new YT.Player(HOST_ID, {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, playsinline: 1, controls: 0 },
        events: {
          onReady: () => {
            setIsReady(true);
            if (pendingRef.current) {
              const videoId = pendingRef.current;
              pendingRef.current = null;
              playerRef.current.loadVideoById(videoId);
            }
          },
          onStateChange: (e) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (e.data === 1) {
              setIsPlaying(true);
              setDuration(playerRef.current?.getDuration?.() || 0);
            } else if (e.data === 2 || e.data === 0) {
              setIsPlaying(false);
            }
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, []);

  // ── Tick the displayed position once a second while playing ────────
  useEffect(() => {
    clearInterval(tickRef.current);
    if (isPlaying) {
      tickRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t === 'number') setPosition(t);
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [isPlaying]);

  const play = useCallback((videoId, title, extra = {}) => {
    if (!videoId) return;
    setCurrent({ videoId, title, ...extra });
    setPosition(0);
    setDuration(0);
    setCollapsed(false);
    if (playerRef.current && isReady) {
      playerRef.current.loadVideoById(videoId);
    } else {
      pendingRef.current = videoId;
    }
    // Fire-and-forget listen tracking for the Music Hub leaderboard —
    // never blocks playback if it fails.
    db.recordMusicPlay({
      username: user?.username,
      video_id: videoId,
      title,
      artist: extra.subtitle,
      thumbnail: extra.thumbnail,
    }).catch(() => {});
  }, [isReady, user]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [isPlaying]);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo?.();
    setCurrent(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  // ── Sync "listening to" status to the shared now_playing table so it
  // shows up under this person's username on their public member page.
  useEffect(() => {
    if (!user?.username) return undefined;
    let intervalId = null;

    const push = () => {
      if (current) {
        // A predictable YouTube CDN thumbnail URL, derived from the
        // video id — used whenever the calling view didn't already
        // hand us one (most list rows only pass videoId/title).
        const thumb = current.thumbnail || `https://i.ytimg.com/vi/${current.videoId}/mqdefault.jpg`;
        db.setNowPlaying(user.username, current.title, current.subtitle || '', 'nova_music', {
          videoId: current.videoId,
          thumbnail: thumb,
          kind: current.kind || 'song',
          positionSec: position,
          durationSec: duration,
          isPaused: !isPlaying,
        }).catch(() => {});
      } else {
        db.clearNowPlaying(user.username).catch(() => {});
      }
    };

    push();
    if (current) intervalId = setInterval(push, SYNC_INTERVAL_MS);
    return () => { if (intervalId) clearInterval(intervalId); };
    // Position ticks every 1s via the effect above; re-syncing on every
    // tick would hammer the backend, so this only re-pushes on track /
    // play-state changes, then periodically while something is playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.videoId, isPlaying, user?.username]);

  // Best-effort: clear the shared status when the tab actually closes,
  // so we don't leave a stale "listening to" on someone's profile.
  useEffect(() => {
    const onUnload = () => {
      if (!user?.username || !navigator.sendBeacon) return;
      const blob = new Blob([JSON.stringify({
        table: 'now_playing',
        action: 'delete',
        filters: [{ column: 'member_username', op: 'eq', value: user.username }],
      })], { type: 'application/json' });
      navigator.sendBeacon('/api/query', blob);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [user?.username]);

  return (
    <NowPlayingContext.Provider value={{ current, isPlaying, position, duration, collapsed, play, stop, togglePlayPause, setCollapsed }}>
      {children}
      <GlobalNowPlayingPod
        current={current} isPlaying={isPlaying} position={position} duration={duration}
        collapsed={collapsed} onToggle={togglePlayPause} onStop={stop} onSetCollapsed={setCollapsed}
      />
      {/* Hidden host for the YouTube IFrame Player API. Kept a tiny
          1x1px element rather than display:none — some browsers throttle
          or pause playback on elements that aren't actually rendered. */}
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <div id={HOST_ID} />
      </div>
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying() {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) throw new Error('useNowPlaying must be used within a NowPlayingProvider');
  return ctx;
}

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── The "iPod": a small click-wheel widget pinned bottom-right on every
// page, so a track keeps playing (and stays controllable) no matter
// which tab you're on. ─────────────────────────────────────────────
function GlobalNowPlayingPod({ current, isPlaying, position, duration, collapsed, onToggle, onStop, onSetCollapsed }) {
  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  if (collapsed) {
    return (
      <div className="nmp-pod nmp-pod-collapsed" onClick={() => onSetCollapsed(false)} title={current.title}>
        <div className="nmp-wheel nmp-wheel-sm">
          <button className="nmp-center-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nmp-pod">
      <button className="nmp-close" onClick={onStop} title="Stop">✕</button>
      <button className="nmp-minimize" onClick={() => onSetCollapsed(true)} title="Minimize">–</button>

      <div className="nmp-screen">
        <div className="nmp-screen-art">
          {current.thumbnail ? <img src={current.thumbnail} alt="" /> : <span className="nmp-note">♪</span>}
        </div>
        <div className="nmp-screen-info">
          <div className="nmp-title">{current.title || 'Unknown track'}</div>
          <div className="nmp-artist">{current.subtitle || (current.kind === 'episode' ? 'Podcast' : 'Nova Music')}</div>
          <div className="nmp-progress-track"><div className="nmp-progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="nmp-time-row">
            <span>{fmtTime(position)}</span>
            <span>{duration ? fmtTime(duration) : '--:--'}</span>
          </div>
        </div>
      </div>

      <div className="nmp-wheel">
        <span className="nmp-wheel-label nmp-wheel-label-top">NOVA</span>
        <button className="nmp-center-btn" onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </div>
    </div>
  );
}
