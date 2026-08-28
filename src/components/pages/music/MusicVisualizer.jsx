// src/components/pages/music/MusicVisualizer.jsx
//
// Full-screen music visualizer for Nova Music: water fountains + disco
// lights pulsing on the beat, with real lyrics synced to playback.
//
// Honesty note on "the beat": ytmusicapi (and the YouTube iframe embed
// that actually plays the audio) never hand back an audio stream, so
// there's no waveform/FFT data to analyze here — a cross-origin YouTube
// iframe can't be fed into the Web Audio API either. So the beat driving
// the fountains/lights is a BPM clock, not a live audio analysis: it
// defaults to a reasonable guess and you dial it in with the "Tap tempo"
// button (tap along and it both sets the BPM and locks the downbeat to
// that moment in the track). The lyrics, by contrast, ARE real —
// ytmusicapi returns actual per-line timestamps for most tracks, and
// this synced against the live playback time from the YouTube player.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ytm from '../../../services/ytMusicService';
import { useNowPlaying } from '../../../context/NowPlayingContext';
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
  const stateRef = useRef({ particles: [], lastBeatIndex: -1, hue: 0 });

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
    };
    resize();
    window.addEventListener('resize', resize);

    // 3 fountain emitters along the bottom
    const emitters = [0.2, 0.5, 0.8];

    const spawnBurst = (baseHue) => {
      const st = stateRef.current;
      emitters.forEach((fx, idx) => {
        const count = 14;
        for (let i = 0; i < count; i++) {
          const spread = (Math.random() - 0.5) * 0.9;
          const speed = 5.5 + Math.random() * 3.2;
          const angle = -Math.PI / 2 + spread;
          st.particles.push({
            x: fx * w,
            y: h,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: 60 + Math.random() * 30,
            hue: (baseHue + idx * 40 + Math.random() * 20) % 360,
            size: 1.5 + Math.random() * 2.2,
          });
        }
      });
      if (st.particles.length > 1400) st.particles.splice(0, st.particles.length - 1400);
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

      // detect a fresh beat (phase just wrapped near 0) to spawn a burst + advance hue
      if (playing && phase < 0.06 && st.lastPhase !== undefined && st.lastPhase > 0.5) {
        st.hue = (st.hue + 47) % 360;
        spawnBurst(st.hue + colorSeed);
      }
      st.lastPhase = phase;

      // ── background wash ──
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, `hsla(${(st.hue + colorSeed) % 360}, 60%, ${playing ? 10 + envelope * 6 : 8}%, 1)`);
      bgGrad.addColorStop(1, 'hsla(230, 40%, 3%, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // ── disco light beams sweeping from the top ──
      const beamCount = 5;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < beamCount; i++) {
        const t = ts / 1000;
        const sweep = Math.sin(t * 0.35 + i * 1.7) * 0.9;
        const originX = w * (0.15 + (i / (beamCount - 1)) * 0.7);
        const hue = (st.hue + colorSeed + i * 65) % 360;
        const beamW = 0.09 + envelope * 0.05;
        ctx.save();
        ctx.translate(originX, -h * 0.05);
        ctx.rotate(sweep * 0.5);
        const grad = ctx.createLinearGradient(0, 0, 0, h * 1.15);
        grad.addColorStop(0, `hsla(${hue}, 90%, 65%, ${0.20 + envelope * 0.28})`);
        grad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-w * beamW * 0.15, 0);
        ctx.lineTo(w * beamW * 0.15, 0);
        ctx.lineTo(w * beamW * 1.8, h * 1.15);
        ctx.lineTo(-w * beamW * 1.8, h * 1.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';

      // ── mirror-ball flash on beat ──
      if (envelope > 0.05) {
        ctx.fillStyle = `rgba(255,255,255,${envelope * 0.05})`;
        ctx.fillRect(0, 0, w, h);
      }

      // ── fountain particles ──
      ctx.globalCompositeOperation = 'lighter';
      const gravity = 0.16;
      st.particles.forEach((p) => {
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
      });
      st.particles = st.particles.filter((p) => p.life < p.maxLife && p.y < h + 40);
      st.particles.forEach((p) => {
        const lifeRatio = p.life / p.maxLife;
        const alpha = Math.max(0, 1 - lifeRatio);
        const r = p.size * (1 + lifeRatio * 1.4);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${alpha * 0.85})`;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      // ── fountain basins ──
      emitters.forEach((fx) => {
        const bx = fx * w;
        const basinGrad = ctx.createRadialGradient(bx, h - 4, 0, bx, h - 4, 46 + envelope * 14);
        basinGrad.addColorStop(0, `hsla(${(st.hue + colorSeed) % 360}, 80%, 60%, ${0.35 + envelope * 0.25})`);
        basinGrad.addColorStop(1, 'hsla(220, 60%, 10%, 0)');
        ctx.fillStyle = basinGrad;
        ctx.beginPath();
        ctx.ellipse(bx, h - 4, 60 + envelope * 18, 16 + envelope * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
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

  // search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);

  // playback
  const [song, setSong] = useState(null); // { videoId, title, artists, thumbnails }
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  // lyrics
  const [lyricsState, setLyricsState] = useState({ status: 'idle', lines: [], hasTimestamps: false, plain: '' });
  const [activeLineIdx, setActiveLineIdx] = useState(-1);

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
    beatOffsetRef.current = 0;
    tapTimesRef.current = [];

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
  }, [stopGlobal]);

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

  // ── playback clock: poll currentTime + drive lyric sync ──
  useEffect(() => {
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        const t = p.getCurrentTime();
        currentTimeRef.current = t;
        setLyricsState((prev) => {
          if (!prev.hasTimestamps || !prev.lines.length) return prev;
          const idx = prev.lines.findIndex((ln) => ln.start != null && t >= ln.start && (ln.end == null || t < ln.end));
          if (idx !== activeLineIdx) setActiveLineIdx(idx);
          return prev;
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLineIdx]);

  // ── beat phase getter for canvas (0..1, wraps every beat, anchored to tap/offset) ──
  const getBeatPhase = useCallback(() => {
    const secPerBeat = 60 / (bpmRef.current || 120);
    const t = currentTimeRef.current - beatOffsetRef.current;
    const phase = ((t % secPerBeat) + secPerBeat) % secPerBeat;
    return phase / secPerBeat;
  }, []);
  const getIsPlaying = useCallback(() => isPlaying, [isPlaying]);

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

  const activeLine = lyricsState.hasTimestamps ? lyricsState.lines[activeLineIdx] : null;
  const nextLine = lyricsState.hasTimestamps ? lyricsState.lines[activeLineIdx + 1] : null;

  return (
    <div>
      <div className="ytm-list-sub" style={{ marginBottom: 12 }}>
        Pick a song — fountains and disco lights pulse to a tappable beat clock, with real lyrics synced underneath.
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
                <>
                  <div className="viz-lyrics-line active">{activeLine?.text || '\u00A0'}</div>
                  <div className="viz-lyrics-line next">{nextLine?.text || ''}</div>
                </>
              )}
              {!lyricsState.hasTimestamps && lyricsState.plain && (
                <div className="viz-lyrics-plain">{lyricsState.plain}</div>
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
