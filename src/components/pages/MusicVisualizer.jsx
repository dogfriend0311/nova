import React, { useState, useRef, useEffect, useCallback } from 'react';
import './NovaFeatures.css';

/**
 * MusicVisualizer — a self-contained audio visualizer.
 *  • Drop in any song URL or upload a local audio file.
 *  • Realtime canvas visuals driven by the Web Audio AnalyserNode:
 *      - "tunnel":   pulsing concentric rings receding into infinity
 *      - "waterfall": columns of colored light cascading down
 *      - "bars":     classic frequency bars
 *  • iPod-style click wheel for play / pause / seek / volume.
 *  • Live lyrics via the free lyrics.ovh API (artist + title).
 *
 * No external dependencies — pure canvas + Web Audio API.
 */

const VISUALS = [
  { id: 'tunnel', label: '🌀 Tunnel' },
  { id: 'waterfall', label: '💧 Waterfall' },
  { id: 'bars', label: '📊 Bars' },
];

const PALETTES = [
  ['#5e81f4', '#7c5ef4', '#e0a93b'],
  ['#f43f5e', '#8b5cf6', '#22d3ee'],
  ['#22d3ee', '#34d399', '#a78bfa'],
  ['#f59e0b', '#ef4444', '#ec4899'],
];

const fmt = (s) => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const MusicVisualizer = () => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const ringAngleRef = useRef(0);

  const [songUrl, setSongUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [visual, setVisual] = useState('tunnel');
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const [showWheel, setShowWheel] = useState(true);

  // ── Set up canvas sizing ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = c;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Wire up Web Audio once the audio element exists ────────
  const ensureAudioGraph = useCallback(() => {
    if (analyserRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      const source = audioCtx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      // element may already be connected — ignore
    }
  }, []);

  useEffect(() => {
    if (loaded) ensureAudioGraph();
  }, [loaded, ensureAudioGraph]);

  // ── Lyrics fetch ───────────────────────────────────────────
  const fetchLyrics = useCallback(async (a, t) => {
    if (!a || !t) return;
    setLyricsLoading(true);
    setLyricsError('');
    setLyrics('');
    try {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`
      );
      const data = await res.json();
      if (data.error) {
        setLyricsError(data.error || 'No lyrics found');
      } else {
        setLyrics(data.lyrics || 'No lyrics returned');
      }
    } catch {
      setLyricsError('Could not load lyrics');
    } finally {
      setLyricsLoading(false);
    }
  }, []);

  // ── Load a song ─────────────────────────────────────────────
  function loadSong(url) {
    if (!url) return;
    ensureAudioGraph();
    audioRef.current.src = url;
    audioRef.current.load();
    setLoaded(true);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSongUrl('');
    loadSong(url);
    // try to parse "Artist - Title" from filename
    const base = file.name.replace(/\.[^.]+$/, '');
    const parts = base.split(/\s*-\s*/);
    if (parts.length >= 2) {
      setArtist(parts[0].trim());
      setTitle(parts.slice(1).join(' - ').trim());
    } else {
      setTitle(base);
    }
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a || !a.src) return;
    ensureAudioGraph();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (analyserRef.current && analyserRef.current.context.state === 'suspended') {
      analyserRef.current.context.resume();
    } else if (window.__novaAudioCtx && window.__novaAudioCtx.state === 'suspended') {
      window.__novaAudioCtx.resume();
    }
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  // ── Animation loop ─────────────────────────────────────────
  useEffect(() => {
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const palette = PALETTES[paletteIdx];

      // fade trail
      ctx.fillStyle = 'rgba(8,10,22,0.22)';
      ctx.fillRect(0, 0, w, h);

      if (!analyser) return;
      const bins = analyser.frequencyBinCount;
      const freq = new Uint8Array(bins);
      const time = new Uint8Array(bins);
      analyser.getByteFrequencyData(freq);
      analyser.getByteTimeDomainData(time);

      if (visual === 'bars') {
        drawBars(ctx, freq, w, h, palette);
      } else if (visual === 'waterfall') {
        drawWaterfall(ctx, freq, w, h, palette);
      } else {
        drawTunnel(ctx, freq, w, h, palette);
      }
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visual, paletteIdx]);

  // ── iPod click wheel helpers ───────────────────────────────
  function onWheelDrag(e) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const wheel = e.currentTarget;
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = Math.atan2(dy, dx);
    if (wheelAngleRef.last === null) {
      wheelAngleRef.last = angle;
      return;
    }
    let delta = angle - wheelAngleRef.last;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    wheelAngleRef.last = angle;
    a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + delta * 1.2));
  }
  const wheelAngleRef = useRef({ last: null });

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 14px' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>🎧 Music Visualizer</h1>
      <p style={{ color: 'rgba(158,165,196,0.7)', marginBottom: 18, fontSize: '0.9rem' }}>
        Drop in a song — watch color tunnels & waterfalls dance to the beat, with lyrics.
      </p>

      {/* Load a song */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={songUrl}
          onChange={(e) => setSongUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadSong(songUrl)}
          placeholder="Paste song URL (mp3 / audio)…"
          style={{
            flex: '1 1 240px',
            minWidth: 200,
            padding: '10px 14px',
            background: 'rgba(94,129,244,0.06)',
            border: '1px solid rgba(94,129,244,0.2)',
            color: '#e2e5f0',
            borderRadius: 8,
            fontSize: '0.88rem',
          }}
        />
        <button
          onClick={() => loadSong(songUrl)}
          style={btnStyle}
        >
          Load URL
        </button>
        <label style={{ ...btnStyle, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
          Upload File
          <input
            type="file"
            accept="audio/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Lyrics lookup */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          style={inputStyle}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Song title"
          style={inputStyle}
        />
        <button
          onClick={() => fetchLyrics(artist, title)}
          style={btnStyle}
        >
          Get Lyrics
        </button>
      </div>

      {/* Visualizer + iPod wheel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: 360,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'rgba(8,10,22,0.9)',
            border: '1px solid rgba(94,129,244,0.18)',
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          {!loaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(158,165,196,0.5)',
                fontSize: '0.9rem',
              }}
            >
              Load a song to start the visuals
            </div>
          )}
        </div>

        {showWheel && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div
              onMouseMove={onWheelDrag}
              onDoubleClick={togglePlay}
              style={{
                width: 130,
                height: 130,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), rgba(94,129,244,0.06) 60%, rgba(0,0,0,0.4))',
                border: '2px solid rgba(255,255,255,0.12)',
                position: 'relative',
                cursor: 'grab',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {/* center button */}
              <button
                onClick={togglePlay}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: playing
                    ? 'linear-gradient(135deg,#5e81f4,#7c5ef4)'
                    : 'rgba(20,22,40,0.9)',
                  color: '#fff',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                }}
              >
                {playing ? '⏸' : '▶'}
              </button>
              {/* labels */}
              <span style={{ ...wheelLabelStyle, top: 6, left: '50%', transform: 'translateX(-50%)' }}>MENU</span>
              <span style={{ ...wheelLabelStyle, bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>⏭</span>
              <span style={{ ...wheelLabelStyle, left: 8, top: '50%', transform: 'translateY(-50%)' }}>⏮</span>
              <span style={{ ...wheelLabelStyle, right: 8, top: '50%', transform: 'translateY(-50%)' }}>⏭</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.5)', textAlign: 'center', maxWidth: 140 }}>
              Drag the wheel to seek · center to {playing ? 'pause' : 'play'}
            </div>
          </div>
        )}
      </div>

      {/* Transport bar */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(158,165,196,0.7)', marginBottom: 4 }}>
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => {
            const a = audioRef.current;
            if (a) a.currentTime = parseFloat(e.target.value);
          }}
          style={{ width: '100%', accentColor: '#5e81f4' }}
        />
      </div>

      {/* Visual + palette + volume controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
        {VISUALS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVisual(v.id)}
            style={{
              ...btnStyle,
              background: visual === v.id ? 'rgba(94,129,244,0.18)' : btnStyle.background,
              borderColor: visual === v.id ? 'rgba(94,129,244,0.5)' : btnStyle.borderColor,
            }}
          >
            {v.label}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
        {PALETTES.map((p, i) => (
          <button
            key={i}
            onClick={() => setPaletteIdx(i)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: paletteIdx === i ? '2px solid #fff' : '2px solid transparent',
              background: `linear-gradient(135deg, ${p[0]}, ${p[1]}, ${p[2]})`,
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
        <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(158,165,196,0.7)' }}>
          🔊
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            style={{ width: 90, accentColor: '#5e81f4' }}
          />
        </label>
        <button
          onClick={() => setShowWheel((s) => !s)}
          style={{ ...btnStyle, fontSize: '0.78rem' }}
        >
          {showWheel ? 'Hide' : 'Show'} Wheel
        </button>
      </div>

      {/* Lyrics */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>
          {artist && title ? `${artist} — ${title}` : 'Lyrics'}
        </h3>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(20,22,40,0.6)',
            border: '1px solid rgba(94,129,244,0.14)',
            maxHeight: 320,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
            fontSize: '0.88rem',
            color: 'rgba(226,229,240,0.85)',
          }}
        >
          {lyricsLoading ? (
            <span style={{ color: 'rgba(158,165,196,0.6)' }}>Searching for lyrics…</span>
          ) : lyricsError ? (
            <span style={{ color: '#f87171' }}>{lyricsError}</span>
          ) : lyrics ? (
            lyrics
          ) : (
            <span style={{ color: 'rgba(158,165,196,0.5)' }}>
              Enter the artist and song title, then “Get Lyrics” to see them here.
            </span>
          )}
        </div>
      </div>

      {/* hidden audio element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.target.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        crossOrigin="anonymous"
        volume={volume}
      />
    </div>
  );
};

// ── Drawing functions ────────────────────────────────────────
function drawBars(ctx, freq, w, h, palette) {
  const bars = 64;
  const step = Math.floor(freq.length / bars);
  const barW = w / bars;
  for (let i = 0; i < bars; i++) {
    const v = freq[i * step] / 255;
    const bh = v * h * 0.9;
    const x = i * barW;
    const grad = ctx.createLinearGradient(x, h, x, h - bh);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(0.5, palette[1]);
    grad.addColorStop(1, palette[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, h - bh, barW - 2, bh);
  }
}

function drawWaterfall(ctx, freq, w, h, palette) {
  // shift the whole canvas down by 1px to create the fall
  const img = ctx.getImageData(0, 0, w, h);
  ctx.putImageData(img, 0, 2);
  const cols = 96;
  const step = Math.floor(freq.length / cols);
  const colW = w / cols;
  for (let i = 0; i < cols; i++) {
    const v = freq[i * step] / 255;
    const hue = (i / cols) * 360;
    const c = hslToHex(hue, 80, 50 + v * 20);
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.15 + v * 0.85;
    ctx.fillRect(i * colW, 0, colW + 1, 2 + v * 4);
  }
  ctx.globalAlpha = 1;
}

function drawTunnel(ctx, freq, w, h, palette) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(w, h) / 2;
  const rings = 28;
  // average low frequencies for a "bass pulse"
  let bass = 0;
  for (let i = 0; i < 16; i++) bass += freq[i];
  bass = bass / (16 * 255);

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = rings; i > 0; i--) {
    const t = i / rings;
    const v = freq[Math.floor((i / rings) * freq.length * 0.6)] / 255;
    const r = t * maxR + bass * 40 * (1 - t);
    const rot = (Date.now() / 1000) * (0.2 + v) * (i % 2 === 0 ? 1 : -1);
    ctx.rotate(rot * 0.0 + t * 0.4);
    ctx.beginPath();
    const points = 64;
    for (let p = 0; p <= points; p++) {
      const ang = (p / points) * Math.PI * 2;
      const wobble = Math.sin(ang * 6 + Date.now() / 400) * (8 + v * 30) * (1 - t);
      const rr = r + wobble + v * 18;
      const px = Math.cos(ang) * rr;
      const py = Math.sin(ang) * rr;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const color = palette[i % palette.length];
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25 + v * 0.75;
    ctx.lineWidth = 2 + v * 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  const toHex = (x) => x.toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// ── shared styles ────────────────────────────────────────────
const btnStyle = {
  padding: '9px 16px',
  background: 'rgba(94,129,244,0.1)',
  border: '1px solid rgba(94,129,244,0.25)',
  color: '#e2e5f0',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: '0.84rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const inputStyle = {
  flex: '1 1 140px',
  minWidth: 120,
  padding: '9px 14px',
  background: 'rgba(94,129,244,0.06)',
  border: '1px solid rgba(94,129,244,0.2)',
  color: '#e2e5f0',
  borderRadius: 8,
  fontSize: '0.86rem',
};

const wheelLabelStyle = {
  position: 'absolute',
  fontSize: '0.6rem',
  color: 'rgba(158,165,196,0.5)',
  fontWeight: 700,
  pointerEvents: 'none',
};

export default MusicVisualizer;