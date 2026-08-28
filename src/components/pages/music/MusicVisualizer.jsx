// src/components/pages/music/MusicVisualizer.jsx
//
// Full-screen music visualizer for Nova Music: fireworks launching and
// bursting on the beat, with karaoke-style lyrics synced to playback.
//
// Honesty note on "the beat": ytmusicapi (and the YouTube iframe embed
// that actually plays the audio) never hand back an audio stream, so
// there's no waveform/FFT data to analyze here — a cross-origin YouTube
// iframe can't be fed into the Web Audio API either. So the beat driving
// the fireworks is a BPM clock, not a live audio analysis: it defaults
// to a reasonable guess and you dial it in with the "Tap tempo" button
// (tap along and it both sets the BPM and locks the downbeat to that
// moment in the track). The lyrics, by contrast, ARE real — ytmusicapi
// returns actual per-line timestamps for most tracks, and this is
// synced against the live playback time from the YouTube player. Every
// line (past/active/upcoming) is rendered in a scrolling karaoke list,
// and the active line fills in left-to-right in time with its
// start/end timestamps. Tracks without timestamps fall back to a
// plain lyrics block that auto-scrolls proportionally to playback
// position (via the player's duration), so it still moves with the
// song instead of sitting static.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ytm from '../../../services/ytMusicService';
import { useNowPlaying } from '../../../context/NowPlayingContext';
import { useAuth } from '../../../context/AuthContext';
import db from '../../../services/db';
import '../NovaFeatures.css';
import './ytmusic.css';
import './visualizer.css';

const thumbUrl = (thumbnails) => {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || null;
};
const artistNames = (artists) =>
  Array.isArray(artists) ? artists.filter((a) => a?.name).map((a) => a.name).join(', ') : '';

// ── YouTube IFrame Player API loader (singleton) ──────────────────────
let ytApiPromise = null;
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

// Normalize a lyrics line coming back from ytmusicapi's LyricLine
// dataclass — fields are snake_case (start_time/end_time) but be
// defensive in case of camelCase too.
function normalizeLine(line) {
  const start = line.start_time ?? line.startTime ?? line.start ?? null;
  const end = line.end_time ?? line.endTime ?? line.end ?? null;
  return { text: line.text ?? '', start: start != null ? Number(start) : null, end: end != null ? Number(end) : null };
}

// ── Canvas visualizer: fountains + disco lights, driven by a beat clock ──
function useVisualizerCanvas(canvasRef, { getBeatPhase, getIsPlaying, colorSeed }) {
  const stateRef = useRef({ rockets: [], sparks: [], flashes: [], stars: [], hue: 0, beatCount: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // reseed the starfield to the new size
      const st = stateRef.current;
      st.stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * w, y: Math.random() * h * 0.85,
        r: 0.4 + Math.random() * 1.1, phase: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    // Launch a rocket from near the bottom that climbs to a random
    // apex height, then explodes into a radial shell of sparks. Every
    // 4th beat gets a bigger, double-shell "finale" burst for variety.
    const launchFirework = (baseHue, big) => {
      const st = stateRef.current;
      const x = w * (0.12 + Math.random() * 0.76);
      const apexY = h * (big ? 0.16 + Math.random() * 0.14 : 0.22 + Math.random() * 0.3);
      st.rockets.push({
        x, y: h + 6, apexY,
        vy: -(h - apexY) / (big ? 34 : 26) - 2,
        hue: (baseHue + Math.random() * 30) % 360,
        big, trail: [],
      });
      if (st.rockets.length > 8) st.rockets.shift();
    };

    const explode = (rocket) => {
      const st = stateRef.current;
      const shells = rocket.big ? 2 : 1;
      for (let s = 0; s < shells; s++) {
        const count = rocket.big ? 70 : 46;
        const speed0 = rocket.big ? 3.4 : 2.6;
        const shellHue = (rocket.hue + s * 45) % 360;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
          const speed = speed0 * (0.7 + Math.random() * 0.5);
          st.sparks.push({
            x: rocket.x, y: rocket.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: 46 + Math.random() * 30,
            hue: (shellHue + (Math.random() - 0.5) * 26) % 360,
            size: 1.6 + Math.random() * 1.8,
            flicker: Math.random() * 10,
          });
        }
      }
      if (st.sparks.length > 2200) st.sparks.splice(0, st.sparks.length - 2200);
      st.flashes.push({ x: rocket.x, y: rocket.y, life: 0, maxLife: 14, size: rocket.big ? 70 : 46 });
    };

    let lastTs = performance.now();

    const draw = (ts) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min((ts - lastTs) / 16.67, 3); // normalized ~frames
      lastTs = ts;

      // Re-measure every frame — cheap, and self-heals the canvas size
      // when it goes from display:none (0×0, before a song is picked)
      // to visible without needing a dedicated "just became visible"
      // signal.
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width !== w || rect.height !== h)) {
        resize();
      }

      const st = stateRef.current;
      const playing = getIsPlaying();
      const phase = getBeatPhase(); // 0..1, wraps every beat
      // envelope: sharp attack, decay over the beat — peaks right after phase resets to 0
      const envelope = Math.max(0, 1 - phase * 2.2);

      // detect a fresh beat (phase just wrapped near 0) → launch fireworks to it
      if (playing && phase < 0.06 && st.lastPhase !== undefined && st.lastPhase > 0.5) {
        st.hue = (st.hue + 47) % 360;
        st.beatCount += 1;
        const big = st.beatCount % 4 === 0;
        launchFirework(st.hue + colorSeed, big);
        // occasionally a second, smaller rocket for a fuller sky
        if (Math.random() < 0.35) launchFirework((st.hue + 90 + colorSeed) % 360, false);
      }
      st.lastPhase = phase;

      // ── night sky background ──
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, Math.max(w, h) * 0.8);
      bgGrad.addColorStop(0, `hsla(${(st.hue + colorSeed) % 360}, 45%, ${playing ? 7 + envelope * 5 : 6}%, 1)`);
      bgGrad.addColorStop(1, 'hsla(230, 45%, 2%, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // ── twinkling stars ──
      st.stars.forEach((star) => {
        const tw = 0.35 + 0.35 * Math.sin(ts / 500 + star.phase);
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, tw)})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── rocket flight + trails ──
      ctx.globalCompositeOperation = 'lighter';
      st.rockets.forEach((r) => {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();
        r.y += r.vy * dt;
        r.vy += 0.02 * dt; // gentle deceleration as it climbs
        r.trail.forEach((p, i) => {
          const a = (i / r.trail.length) * 0.5;
          ctx.beginPath();
          ctx.fillStyle = `hsla(${r.hue}, 90%, 70%, ${a})`;
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.beginPath();
        ctx.fillStyle = `hsla(${r.hue}, 95%, 80%, 0.95)`;
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      const done = st.rockets.filter((r) => r.y <= r.apexY);
      done.forEach(explode);
      st.rockets = st.rockets.filter((r) => r.y > r.apexY);

      // ── burst flash rings ──
      st.flashes.forEach((f) => { f.life += dt; });
      st.flashes = st.flashes.filter((f) => f.life < f.maxLife);
      st.flashes.forEach((f) => {
        const a = Math.max(0, 1 - f.life / f.maxLife);
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
        ctx.arc(f.x, f.y, f.size * (0.3 + (f.life / f.maxLife) * 0.7), 0, Math.PI * 2);
        ctx.fill();
      });

      // ── spark shells ──
      const gravity = 0.045;
      const drag = 0.986;
      st.sparks.forEach((p) => {
        p.vx *= drag; p.vy *= drag;
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
      });
      st.sparks = st.sparks.filter((p) => p.life < p.maxLife);
      st.sparks.forEach((p) => {
        const lifeRatio = p.life / p.maxLife;
        const flicker = 0.6 + 0.4 * Math.sin(p.life * 0.9 + p.flicker);
        const alpha = Math.max(0, 1 - lifeRatio) * flicker;
        const r = p.size * (1 - lifeRatio * 0.3);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 90%, 68%, ${alpha})`;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, colorSeed]);
}

// ── main component ─────────────────────────────────────────────────
export default function MusicVisualizer() {
  // Stop the global mini-player (if something's playing there) so we
  // don't end up with two YouTube embeds producing audio at once.
  const { stop: stopGlobal } = useNowPlaying();
  const { user } = useAuth();

  // search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);

  // playback
  const [song, setSong] = useState(null); // { videoId, title, artists, thumbnails }
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  // lyrics (karaoke)
  const [lyricsState, setLyricsState] = useState({ status: 'idle', lines: [], hasTimestamps: false, plain: '' });
  const lyricsStateRef = useRef(lyricsState);
  useEffect(() => { lyricsStateRef.current = lyricsState; }, [lyricsState]);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const activeLineIdxRef = useRef(-1);
  const activeFillRef = useRef(null); // the currently-active line's karaoke fill overlay
  const plainLyricsRef = useRef(null); // scroll container for untimed lyrics

  // beat / bpm
  const [bpm, setBpm] = useState(120);
  const bpmRef = useRef(120);
  const beatOffsetRef = useRef(0); // seconds — the video-time of "beat 0"
  const tapTimesRef = useRef([]);
  const currentTimeRef = useRef(0);

  const canvasRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // ── search ──
  const runSearch = useCallback((q) => {
    if (!q.trim()) return;
    setSearching(true); setSearchErr(null);
    ytm.search(q, { filter: 'songs', limit: 20 })
      .then((r) => setResults(r))
      .catch((e) => setSearchErr(e.message))
      .finally(() => setSearching(false));
  }, []);

  // ── select a song: set up player + fetch lyrics ──
  const selectSong = useCallback((s) => {
    stopGlobal();
    setSong(s);
    setLyricsState({ status: 'loading', lines: [], hasTimestamps: false, plain: '' });
    setActiveLineIdx(-1);
    activeLineIdxRef.current = -1;
    beatOffsetRef.current = 0;
    tapTimesRef.current = [];

    // Fire-and-forget listen tracking for the Music Hub leaderboard.
    db.recordMusicPlay({
      username: user?.username,
      video_id: s.videoId,
      title: s.title,
      artist: artistNames(s.artists),
      thumbnail: thumbUrl(s.thumbnails),
    }).catch(() => {});

    ytm.getWatchPlaylist({ videoId: s.videoId })
      .then((data) => {
        const browseId = data?.lyrics;
        if (!browseId) { setLyricsState({ status: 'unavailable', lines: [], hasTimestamps: false, plain: '' }); return; }
        return ytm.getLyrics(browseId, true)
          .then((l) => {
            if (!l) { setLyricsState({ status: 'unavailable', lines: [], hasTimestamps: false, plain: '' }); return; }
            if (l.hasTimestamps && Array.isArray(l.lyrics)) {
              setLyricsState({ status: 'ready', lines: l.lyrics.map(normalizeLine), hasTimestamps: true, plain: '', source: l.source });
            } else {
              // fall back to plain (untimed) lyrics text
              const text = typeof l.lyrics === 'string' ? l.lyrics : '';
              setLyricsState({ status: text ? 'ready' : 'unavailable', lines: [], hasTimestamps: false, plain: text, source: l.source });
            }
          });
      })
      .catch(() => setLyricsState({ status: 'unavailable', lines: [], hasTimestamps: false, plain: '' }));
  }, [stopGlobal, user]);

  // ── mount YT player once ──
  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || !playerElRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(playerElRef.current, {
        height: '100%',
        width: '100%',
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e) => {
            setIsPlaying(e.data === 1);
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, []);

  // load selected video into the player
  useEffect(() => {
    if (playerReady && song?.videoId && playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(song.videoId);
    }
  }, [playerReady, song]);

  // ── playback clock: poll currentTime + drive karaoke sync ──
  // Runs every frame via rAF. Reads/writes through refs (not React
  // state) wherever a per-frame update is needed, so a 60fps tick
  // doesn't trigger 60 re-renders a second — activeLineIdx only
  // triggers a (cheap) re-render when the active LINE actually
  // changes; the karaoke fill sweep and the plain-lyrics auto-scroll
  // are applied straight to the DOM.
  useEffect(() => {
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const t = p.getCurrentTime();
      currentTimeRef.current = t;
      const lstate = lyricsStateRef.current;

      if (lstate.hasTimestamps && lstate.lines.length) {
        const idx = lstate.lines.findIndex((ln) => ln.start != null && t >= ln.start && (ln.end == null || t < ln.end));
        if (idx !== activeLineIdxRef.current) {
          activeLineIdxRef.current = idx;
          setActiveLineIdx(idx);
        }
        // karaoke fill sweep: left-to-right progress across the active line's timestamp span
        if (idx >= 0 && activeFillRef.current) {
          const ln = lstate.lines[idx];
          const dur = ln.start != null && ln.end != null ? ln.end - ln.start : null;
          const pct = dur && dur > 0 ? Math.max(0, Math.min(1, (t - ln.start) / dur)) * 100 : 100;
          activeFillRef.current.style.setProperty('--fill', `${pct}%`);
        }
      } else if (lstate.status === 'ready' && !lstate.hasTimestamps && lstate.plain && plainLyricsRef.current && typeof p.getDuration === 'function') {
        // No per-line timestamps — still move the lyrics with the song by
        // auto-scrolling proportionally to playback position.
        const dur = p.getDuration();
        if (dur > 0) {
          const el = plainLyricsRef.current;
          const maxScroll = el.scrollHeight - el.clientHeight;
          if (maxScroll > 0) el.scrollTop = Math.max(0, Math.min(maxScroll, (t / dur) * maxScroll));
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── beat phase getter for canvas (0..1, wraps every beat, anchored to tap/offset) ──
  const getBeatPhase = useCallback(() => {
    const secPerBeat = 60 / (bpmRef.current || 120);
    const t = currentTimeRef.current - beatOffsetRef.current;
    const phase = ((t % secPerBeat) + secPerBeat) % secPerBeat;
    return phase / secPerBeat;
  }, []);
  // Reads through a ref (not the `isPlaying` state closure) — the
  // canvas draw loop below is set up once on mount, so a plain
  // `() => isPlaying` closure would freeze at whatever `isPlaying`
  // was at that first render (false) and never see play/pause again.
  const getIsPlaying = useCallback(() => isPlayingRef.current, []);

  useVisualizerCanvas(canvasRef, { getBeatPhase, getIsPlaying, colorSeed: 0 });

  // ── tap tempo ──
  const tapTempo = () => {
    const now = currentTimeRef.current;
    const taps = tapTimesRef.current;
    taps.push(now);
    if (taps.length > 8) taps.shift();
    beatOffsetRef.current = now;
    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avg > 0.15 && avg < 2.5) setBpm(Math.round(60 / avg));
    }
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen?.(); setFullscreen(true); }
    else { document.exitFullscreen?.(); setFullscreen(false); }
  };
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Karaoke list scroll: keep the active row vertically centered in the
  // track by translating the whole track up/down. ROW_H must match
  // .viz-karaoke-row's height in visualizer.css.
  const ROW_H = 44;
  const KARAOKE_H = ROW_H * 5;
  const karaokeOffset = KARAOKE_H / 2 - ROW_H / 2 - Math.max(activeLineIdx, 0) * ROW_H;

  return (
    <div>
      <div className="ytm-list-sub" style={{ marginBottom: 12 }}>
        Pick a song — fireworks launch and burst to a tappable beat clock, with karaoke-style lyrics scrolling underneath.
      </div>

      {!song && (
        <div className="ytm-row">
          <input
            className="ytm-input" style={{ flex: '1 1 220px' }}
            placeholder="Search for a song…" value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
          />
          <button className="ytm-btn" onClick={() => runSearch(query)} disabled={!query.trim()}>Search</button>
        </div>
      )}
      {!song && searching && <div className="ytm-loading">Searching…</div>}
      {!song && searchErr && <div className="ytm-error">{searchErr}</div>}
      {!song && results && results.length === 0 && <div className="ytm-empty">No songs found.</div>}
      {!song && results && results.length > 0 && (
        <div className="ytm-list" style={{ marginTop: 12 }}>
          {results.map((r, i) => (
            <div key={r.videoId || i} className="ytm-list-row" onClick={() => selectSong(r)}>
              {thumbUrl(r.thumbnails)
                ? <img className="ytm-thumb" src={thumbUrl(r.thumbnails)} alt="" />
                : <div className="ytm-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>♪</div>}
              <div className="ytm-list-main">
                <div className="ytm-list-title">{r.title}</div>
                <div className="ytm-list-sub">{artistNames(r.artists)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Always mounted (even before a song is picked) so the YouTube
          player element exists in the DOM the moment the player-creation
          effect runs — otherwise the player never gets created and
          Play silently does nothing. Visually hidden via CSS until a
          song is selected. */}
      <div className={`viz-wrap ${!song ? 'viz-hidden' : ''} ${fullscreen ? 'viz-fullscreen' : ''}`} ref={wrapRef}>
        <canvas ref={canvasRef} className="viz-canvas" />

        {/* Hidden-ish YT player — audio comes from here */}
        <div className="viz-player-slot">
          <div ref={playerElRef} />
        </div>

        {song && (
          <>
            <div className="viz-topbar">
              <button className="ytm-btn ghost small" onClick={() => { setSong(null); setResults(null); }}>← New search</button>
              <div className="viz-track-meta">
                <div className="viz-track-title">{song.title}</div>
                <div className="viz-track-sub">{artistNames(song.artists)}</div>
              </div>
              <button className="ytm-btn ghost small" onClick={toggleFullscreen}>{fullscreen ? '⤢ Exit' : '⤢ Fullscreen'}</button>
            </div>

            <div className="viz-lyrics">
              {lyricsState.status === 'loading' && <div className="viz-lyrics-line dim">Loading lyrics…</div>}
              {lyricsState.status === 'unavailable' && <div className="viz-lyrics-line dim">No lyrics available for this track.</div>}

              {lyricsState.hasTimestamps && (
                <div className="viz-karaoke" style={{ height: KARAOKE_H }}>
                  <div
                    className="viz-karaoke-track"
                    style={{ transform: `translateY(${karaokeOffset}px)` }}
                  >
                    {lyricsState.lines.map((ln, i) => {
                      const rowState = i === activeLineIdx ? 'active' : i < activeLineIdx ? 'past' : 'upcoming';
                      return (
                        <div key={i} className={`viz-karaoke-row ${rowState}`} style={{ height: ROW_H }}>
                          {rowState === 'active' ? (
                            <span className="viz-karaoke-text">
                              <span className="viz-karaoke-text-base">{ln.text || '\u00A0'}</span>
                              <span className="viz-karaoke-text-fill" ref={activeFillRef}>{ln.text || '\u00A0'}</span>
                            </span>
                          ) : (
                            <span>{ln.text || '\u00A0'}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!lyricsState.hasTimestamps && lyricsState.plain && (
                <div className="viz-lyrics-plain" ref={plainLyricsRef}>{lyricsState.plain}</div>
              )}
            </div>

            <div className="viz-controls">
              <button className="ytm-btn" onClick={togglePlay}>{isPlaying ? '⏸ Pause' : '▶ Play'}</button>
              <button className="ytm-btn ghost" onClick={tapTempo}>👏 Tap tempo</button>
              <div className="viz-bpm">
                <span>{bpm} BPM</span>
                <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
