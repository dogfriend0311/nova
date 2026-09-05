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

  // ── Playlist queue (Playlists tab: "play all", skip, back, shuffle) ──
  // `queue` is always in the playlist's own order; `order` is the actual
  // playback order (identity order normally, shuffled order when
  // `shuffled` is on) — this way toggling shuffle off restores the
  // original order instead of losing it. `pos` indexes into `order`.
  const [queue, setQueue] = useState(null);     // [{ videoId, title, subtitle, thumbnail }] | null
  const [queueName, setQueueName] = useState(''); // playlist name, for display
  const [order, setOrder] = useState([]);       // indices into `queue`
  const [pos, setPos] = useState(0);            // index into `order`
  const [shuffled, setShuffled] = useState(false);

  const playerRef = useRef(null);
  const pendingRef = useRef(null);
  const tickRef = useRef(null);

  // Refs mirroring the queue state above, so the YT onStateChange handler
  // (registered once, at player creation) always sees the latest queue
  // instead of a stale closure over the initial (empty) state.
  const queueRef = useRef(null);
  const orderRef = useRef([]);
  const posRef = useRef(0);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { orderRef.current = order; }, [order]);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const shuffleArray = (arr) => {
    const next = arr.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  };

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
            } else if (e.data === 2) {
              setIsPlaying(false);
            } else if (e.data === 0) {
              setIsPlaying(false);
              // Track ended — if we're playing through a playlist, auto-
              // advance to the next song instead of just going silent.
              const q = queueRef.current;
              if (q && q.length) {
                const nextPos = posRef.current + 1;
                if (nextPos < orderRef.current.length) {
                  advanceToRef.current(nextPos);
                }
              }
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
    // A one-off play (not "play this playlist") — leave queue mode.
    setQueue(null);
    setQueueName('');
    setOrder([]);
    setPos(0);
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

  // Loads whichever track sits at `orderPos` within the current queue's
  // playback order — the one shared step used by playQueue/next/previous
  // and by the auto-advance-on-end handler above.
  const advanceTo = useCallback((orderPos, queueOverride, orderOverride) => {
    const q = queueOverride || queueRef.current;
    const ord = orderOverride || orderRef.current;
    if (!q || !ord.length) return;
    const clamped = ((orderPos % ord.length) + ord.length) % ord.length; // wrap around both ways
    const track = q[ord[clamped]];
    if (!track) return;
    setPos(clamped);
    setCurrent(track);
    setPosition(0);
    setDuration(0);
    setCollapsed(false);
    if (playerRef.current && isReady) {
      playerRef.current.loadVideoById(track.videoId);
    } else {
      pendingRef.current = track.videoId;
    }
    db.recordMusicPlay({
      username: user?.username,
      video_id: track.videoId,
      title: track.title,
      artist: track.subtitle,
      thumbnail: track.thumbnail,
    }).catch(() => {});
  }, [isReady, user]);

  const advanceToRef = useRef(advanceTo);
  useEffect(() => { advanceToRef.current = advanceTo; }, [advanceTo]);

  /** Starts playing a playlist. `tracks` is [{ videoId, title, subtitle,
   *  thumbnail }], `startIndex` is which track (in the playlist's own
   *  order) to start on. */
  const playQueue = useCallback((tracks, startIndex = 0, { name = '', shuffle = false } = {}) => {
    if (!Array.isArray(tracks) || !tracks.length) return;
    const identity = tracks.map((_, i) => i);
    const startOrder = shuffle
      ? [identity[startIndex], ...shuffleArray(identity.filter((i) => i !== startIndex))]
      : identity;
    const startPos = shuffle ? 0 : startIndex;
    setQueue(tracks);
    setQueueName(name);
    setOrder(startOrder);
    setShuffled(shuffle);
    advanceTo(startPos, tracks, startOrder);
  }, [advanceTo]);

  const next = useCallback(() => {
    if (!queueRef.current || !orderRef.current.length) return;
    advanceTo(posRef.current + 1);
  }, [advanceTo]);

  const previous = useCallback(() => {
    if (!queueRef.current || !orderRef.current.length) return;
    // More than a couple seconds in: restart the current track first
    // (standard music-player behavior), like a real "back" button.
    if (playerRef.current?.getCurrentTime?.() > 3) {
      playerRef.current.seekTo(0, true);
      return;
    }
    advanceTo(posRef.current - 1);
  }, [advanceTo]);

  const toggleShuffle = useCallback(() => {
    setShuffled((prevShuffled) => {
      const q = queueRef.current;
      if (!q) return prevShuffled;
      const currentTrackIndex = order[posRef.current];
      if (!prevShuffled) {
        const rest = q.map((_, i) => i).filter((i) => i !== currentTrackIndex);
        setOrder([currentTrackIndex, ...shuffleArray(rest)]);
        setPos(0);
      } else {
        const identity = q.map((_, i) => i);
        setOrder(identity);
        setPos(identity.indexOf(currentTrackIndex));
      }
      return !prevShuffled;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

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
    setQueue(null);
    setQueueName('');
    setOrder([]);
    setPos(0);
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

  const hasQueue = !!(queue && queue.length);

  return (
    <NowPlayingContext.Provider value={{
      current, isPlaying, position, duration, collapsed, play, stop, togglePlayPause, setCollapsed,
      // Playlist queue controls (Playlists tab)
      queue, queueName, queueLength: queue?.length || 0, queuePosition: pos, shuffled,
      playQueue, next, previous, toggleShuffle, hasQueue,
    }}>
      {children}
      <GlobalNowPlayingPod
        current={current} isPlaying={isPlaying} position={position} duration={duration}
        collapsed={collapsed} onToggle={togglePlayPause} onStop={stop} onSetCollapsed={setCollapsed}
        hasQueue={hasQueue} queueName={queueName} queuePosition={pos} queueLength={queue?.length || 0}
        shuffled={shuffled} onNext={next} onPrevious={previous} onToggleShuffle={toggleShuffle}
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
function GlobalNowPlayingPod({
  current, isPlaying, position, duration, collapsed, onToggle, onStop, onSetCollapsed,
  hasQueue, queueName, queuePosition, queueLength, shuffled, onNext, onPrevious, onToggleShuffle,
}) {
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
          <div className="nmp-artist">
            {current.subtitle || (current.kind === 'episode' ? 'Podcast' : 'Nova Music')}
          </div>
          {hasQueue && (
            <div className="nmp-queue-line" title={queueName}>
              {queueName ? `${queueName} · ` : ''}{queuePosition + 1}/{queueLength}
            </div>
          )}
          <div className="nmp-progress-track"><div className="nmp-progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="nmp-time-row">
            <span>{fmtTime(position)}</span>
            <span>{duration ? fmtTime(duration) : '--:--'}</span>
          </div>
        </div>
      </div>

      <div className="nmp-wheel">
        <span className="nmp-wheel-label nmp-wheel-label-top">NOVA</span>
        {hasQueue && (
          <button className="nmp-side-btn nmp-side-btn-left" onClick={onPrevious} title="Previous" aria-label="Previous track">◀◀</button>
        )}
        <button className="nmp-center-btn" onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        {hasQueue && (
          <button className="nmp-side-btn nmp-side-btn-right" onClick={onNext} title="Next" aria-label="Next track">▶▶</button>
        )}
        {hasQueue && (
          <button
            className={`nmp-side-btn nmp-side-btn-bottom ${shuffled ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title={shuffled ? 'Shuffle on' : 'Shuffle off'}
            aria-label="Toggle shuffle"
          >
            🔀
          </button>
        )}
      </div>
    </div>
  );
}
