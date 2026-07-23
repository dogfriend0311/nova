import React, { useState, useEffect, useRef, useCallback } from 'react';
import NovaRadio from './NovaRadio';
import BeatBattle from './BeatBattle';
import './NovaFeatures.css';

// ── Last.fm inline panel ─────────────────────────────────────
const LastFmPanel = ({ user }) => {
  const [lfmUser,   setLfmUser]   = useState(() => localStorage.getItem('nova_lastfm_user') || '');
  const [input,     setInput]     = useState(() => localStorage.getItem('nova_lastfm_user') || '');
  const [tracks,    setTracks]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const API_KEY = localStorage.getItem('nova_lastfm_key') || '';

  const fetchRecent = useCallback(async (uname) => {
    if (!uname || !API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(uname)}&api_key=${API_KEY}&format=json&limit=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.message || 'Last.fm error');
      const list = data?.recenttracks?.track || [];
      setTracks(Array.isArray(list) ? list : [list]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [API_KEY]);

  useEffect(() => {
    if (lfmUser) fetchRecent(lfmUser);
  }, [lfmUser, fetchRecent]);

  const handleSet = () => {
    const v = input.trim();
    localStorage.setItem('nova_lastfm_user', v);
    setLfmUser(v);
  };

  const nowPlaying = tracks.find(t => t['@attr']?.nowplaying === 'true');

  return (
    <div className="nf-page">
      <div className="nf-header">
        <h1>🎧 Last.fm</h1>
        <p>Track what you're listening to</p>
      </div>

      <div className="nf-card">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)', marginBottom: 10 }}>
          Your Last.fm Username
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSet()}
            placeholder="Last.fm username…"
            style={{ flex: '1 1 160px', padding: '10px 12px', background: 'rgba(213,16,7,0.04)', border: '1px solid rgba(213,16,7,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.9rem', minWidth: 0 }}
          />
          <button
            onClick={handleSet}
            disabled={!input.trim()}
            style={{ padding: '10px 20px', background: 'rgba(213,16,7,0.12)', border: '1px solid rgba(213,16,7,0.4)', color: '#d51007', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', opacity: !input.trim() ? 0.5 : 1 }}
          >
            Load
          </button>
          {lfmUser && (
            <a href={`https://www.last.fm/user/${lfmUser}`} target="_blank" rel="noreferrer"
              style={{ padding: '10px 14px', background: 'none', border: '1px solid rgba(213,16,7,0.2)', color: 'rgba(213,16,7,0.7)', borderRadius: 8, fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              ↗ Profile
            </a>
          )}
        </div>
        {!API_KEY && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)', lineHeight: 1.5 }}>
            ℹ️ A Last.fm API key is needed. Set one in <strong style={{ color: 'rgba(213,16,7,0.7)' }}>Owner Dashboard → Last.fm</strong> to enable scrobble tracking.
          </div>
        )}
      </div>

      {error && (
        <div className="nf-card" style={{ borderColor: 'rgba(255,107,122,0.3)' }}>
          <div style={{ color: 'rgba(255,107,122,0.8)', fontSize: '0.85rem' }}>❌ {error}</div>
        </div>
      )}

      {loading && (
        <div className="nf-card nf-empty">Loading tracks…</div>
      )}

      {/* Now playing */}
      {nowPlaying && (
        <div className="nf-card" style={{ borderColor: 'rgba(213,16,7,0.3)', background: 'rgba(213,16,7,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {nowPlaying.image?.[2]?.['#text'] && (
              <img src={nowPlaying.image[2]['#text']} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#d51007', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d51007', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
                Now Playing
              </div>
              <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '1rem' }}>{nowPlaying.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.55)' }}>{nowPlaying.artist?.['#text']}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.35)' }}>{nowPlaying.album?.['#text']}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent tracks */}
      {!loading && tracks.length > 0 && (
        <div className="nf-card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)', marginBottom: 14 }}>
            Recent Scrobbles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tracks.slice(0, 20).map((t, i) => {
              const isNP = t['@attr']?.nowplaying === 'true';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < tracks.length - 1 ? '1px solid rgba(94,129,244,0.07)' : 'none' }}>
                  {t.image?.[1]?.['#text']
                    ? <img src={t.image[1]['#text']} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(213,16,7,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>♪</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: isNP ? '#d51007' : '#e2e5f0', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'rgba(158,165,196,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.artist?.['#text']}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.3)', flexShrink: 0 }}>
                    {isNP ? '▶' : t.date?.['#text']?.split(',')[0] || ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Music Visualizer ─────────────────────────────────────────
const VIZ_MODES = [
  { id: 'tunnel',    label: '🌀 Tunnel'     },
  { id: 'waterfall', label: '🌊 Waterfall'  },
  { id: 'bars',      label: '📊 Bars'       },
  { id: 'radial',    label: '⭕ Radial'     },
];

const MusicVisualizer = () => {
  const canvasRef    = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const sourceRef    = useRef(null);
  const animRef      = useRef(null);
  const wfDataRef    = useRef(null);    // waterfall image data
  const timeRef      = useRef(0);

  const [isPlaying,  setIsPlaying]  = useState(false);
  const [fileName,   setFileName]   = useState('');
  const [vizMode,    setVizMode]    = useState('tunnel');
  const [lyrics,     setLyrics]     = useState('');
  const [lyricIdx,   setLyricIdx]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [currentT,   setCurrentT]   = useState(0);
  const vizModeRef = useRef(vizMode);
  useEffect(() => { vizModeRef.current = vizMode; }, [vizMode]);

  const lyricsLines = lyrics.split('\n').filter(l => l.trim());

  // Colour helpers
  const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

  // ── Canvas draw functions ──────────────────────────────────
  const draw = useCallback(() => {
    const canvas   = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx         = canvas.getContext('2d');
    const W           = canvas.width;
    const H           = canvas.height;
    const bufLen      = analyser.frequencyBinCount;
    const freqData    = new Uint8Array(bufLen);
    const timeData    = new Uint8Array(analyser.fftSize);
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    // Average bass energy (low 10% of bins)
    const bassEnd = Math.floor(bufLen * 0.1);
    let bass = 0;
    for (let i = 0; i < bassEnd; i++) bass += freqData[i];
    bass = bass / bassEnd / 255;

    const mode = vizModeRef.current;

    if (mode === 'tunnel') {
      // Fading trail
      ctx.fillStyle = `rgba(10, 13, 26, 0.18)`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const rings = 12;
      for (let r = rings; r >= 0; r--) {
        const frac      = r / rings;
        const baseRad   = Math.max(20, frac * Math.min(W, H) * 0.5);
        const hue       = (timeRef.current * 40 + r * 25) % 360;
        const binsPerRing = Math.floor(bufLen / rings);
        const avgFreq   = freqData.slice(r * binsPerRing, (r + 1) * binsPerRing).reduce((a, b) => a + b, 0) / binsPerRing / 255;
        const rad       = baseRad + avgFreq * 60 * (1 - frac * 0.5);
        const pts       = 64 + r * 4;

        ctx.beginPath();
        for (let p = 0; p <= pts; p++) {
          const angle    = (p / pts) * Math.PI * 2;
          const binIdx   = Math.floor((p / pts) * binsPerRing) + r * binsPerRing;
          const jitter   = (freqData[binIdx] / 255) * 12 * bass;
          const px       = cx + (rad + jitter) * Math.cos(angle);
          const py       = cy + (rad + jitter) * Math.sin(angle);
          p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = hsl(hue, 80, 55 + avgFreq * 25);
        ctx.lineWidth   = 1.5 + avgFreq * 2.5;
        ctx.globalAlpha = 0.7 - frac * 0.45;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    else if (mode === 'waterfall') {
      // Shift existing pixels down by 1 row
      const img = ctx.getImageData(0, 0, W, H);
      ctx.putImageData(img, 0, 2);
      // New row at top from frequency data
      for (let i = 0; i < W; i++) {
        const binIdx = Math.floor((i / W) * bufLen);
        const v      = freqData[binIdx] / 255;
        const hue    = 240 - v * 240; // blue→green→yellow→red
        ctx.fillStyle = v > 0.02 ? `hsla(${hue},90%,${40 + v * 40}%,1)` : '#0a0d1a';
        ctx.fillRect(i, 0, 1, 2);
      }
    }

    else if (mode === 'bars') {
      ctx.fillStyle = '#0a0d1a';
      ctx.fillRect(0, 0, W, H);
      const barCount = 80;
      const bW       = W / barCount;
      for (let i = 0; i < barCount; i++) {
        const binIdx = Math.floor((i / barCount) * bufLen);
        const v      = freqData[binIdx] / 255;
        const bH     = v * H * 0.92;
        const hue    = (timeRef.current * 30 + i * 3) % 360;
        const grad   = ctx.createLinearGradient(0, H - bH, 0, H);
        grad.addColorStop(0, hsl(hue, 90, 65));
        grad.addColorStop(1, hsl((hue + 40) % 360, 80, 30));
        ctx.fillStyle   = grad;
        ctx.shadowColor = hsl(hue, 90, 65);
        ctx.shadowBlur  = 8 * v;
        ctx.fillRect(i * bW + 1, H - bH, bW - 2, bH);
      }
      ctx.shadowBlur = 0;
    }

    else if (mode === 'radial') {
      ctx.fillStyle = `rgba(10, 13, 26, 0.25)`;
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const total = bufLen / 2;
      for (let i = 0; i < total; i++) {
        const angle   = (i / total) * Math.PI * 2 - Math.PI / 2;
        const v       = freqData[i] / 255;
        const innerR  = 60 + bass * 30;
        const outerR  = innerR + v * 140;
        const hue     = (i / total * 360 + timeRef.current * 50) % 360;
        ctx.beginPath();
        ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
        ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
        ctx.strokeStyle = hsl(hue, 85, 55 + v * 20);
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.6 + v * 0.4;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Lyrics overlay (bottom third of canvas)
    if (lyricsLines.length > 0) {
      const line = lyricsLines[lyricIdx % lyricsLines.length];
      const fs   = Math.max(14, Math.min(22, W / 28));
      ctx.save();
      ctx.font      = `700 ${fs}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.92;
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = '#ffffff';
      ctx.fillText(line, W / 2, H - 32);
      ctx.restore();
    }

    timeRef.current += 0.016;
  }, [lyricsLines, lyricIdx]);

  // Animation loop
  const startLoop = useCallback(() => {
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const stopLoop = () => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  };

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.clientWidth;
      canvas.height = Math.min(Math.floor(parent.clientWidth * 9 / 16), 380);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (isPlaying) { startLoop(); } else { stopLoop(); }
    return stopLoop;
  }, [isPlaying, startLoop]);

  // Advance lyrics every 4s when playing
  useEffect(() => {
    if (!isPlaying || lyricsLines.length === 0) return;
    const id = setInterval(() => setLyricIdx(i => i + 1), 4000);
    return () => clearInterval(id);
  }, [isPlaying, lyricsLines.length]);

  // Track time
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const ctx = audioCtxRef.current;
      if (ctx) setCurrentT(ctx.currentTime);
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Load audio file
  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);

    // Stop any current playback
    if (sourceRef.current) { try { sourceRef.current.stop(); } catch {} }
    if (audioCtxRef.current) { audioCtxRef.current.close(); }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const reader = new FileReader();
    reader.onload = (e) => {
      audioCtx.decodeAudioData(e.target.result, (buffer) => {
        setDuration(buffer.duration);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        source.start(0);
        source.onended = () => setIsPlaying(false);
        sourceRef.current = source;
        timeRef.current = 0;
        setCurrentT(0);
        setIsPlaying(true);
        setLyricIdx(0);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type?.startsWith('audio/')) handleFile(file);
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 4px' }}>
      <div className="nf-header">
        <h1>🎨 Music Visualizer</h1>
        <p>Upload a local audio file — see it come alive in real-time</p>
      </div>

      {/* File drop zone */}
      <div
        className="nf-card"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderColor: 'rgba(94,129,244,0.35)', padding: '28px 20px', transition: 'border-color 0.2s' }}
        onClick={() => document.getElementById('viz-file-input')?.click()}
      >
        <input
          id="viz-file-input"
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🎵</div>
        <div style={{ fontWeight: 700, color: '#e2e5f0', marginBottom: 4 }}>
          {fileName || 'Drop an audio file here or click to browse'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)' }}>
          MP3 · WAV · OGG · AAC · FLAC — any format your browser supports
        </div>
        {isPlaying && (
          <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#43b581' }}>
            ▶ Playing — {fmtTime(currentT)} / {fmtTime(duration)}
          </div>
        )}
      </div>

      {/* Viz mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {VIZ_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setVizMode(m.id)}
            style={{ padding: '8px 16px', background: vizMode === m.id ? 'rgba(94,129,244,0.15)' : 'rgba(94,129,244,0.04)', border: `1px solid ${vizMode === m.id ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`, color: vizMode === m.id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', minHeight: 40 }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="nf-card" style={{ padding: 0, overflow: 'hidden', background: '#0a0d1a', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%' }}
        />
        {!isPlaying && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,13,26,0.6)', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎵</div>
              <div style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.88rem' }}>Load a track to start</div>
            </div>
          </div>
        )}
      </div>

      {/* Lyrics input */}
      <div className="nf-card" style={{ marginTop: 12 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)', marginBottom: 10 }}>
          📝 Lyrics (one line per row — scrolls every 4 seconds)
        </div>
        <textarea
          rows={6}
          placeholder={"Paste song lyrics here…\nEach line scrolls on screen while the music plays."}
          value={lyrics}
          onChange={e => { setLyrics(e.target.value); setLyricIdx(0); }}
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.88rem', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
        />
        {lyricsLines.length > 0 && (
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'rgba(158,165,196,0.3)' }}>
            {lyricsLines.length} lines loaded — showing line {(lyricIdx % lyricsLines.length) + 1}
          </div>
        )}
      </div>
    </div>
  );
};

// ── MusicHub root ─────────────────────────────────────────────
const TABS = [
  { id: 'radio',     label: '📻 Radio'      },
  { id: 'lastfm',    label: '🎧 Last.fm'    },
  { id: 'battle',    label: '🎵 Beat Battle' },
  { id: 'visualizer',label: '🎨 Visualizer' },
];

const MusicHub = ({ user, initialTab, onSignIn }) => {
  const [tab, setTab] = useState(initialTab || 'radio');

  // If parent redirects here with a specific tab, honour it
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, borderBottom: '1px solid rgba(94,129,244,0.12)',
        overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 24, WebkitOverflowScrolling: 'touch',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 20px', background: 'none', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--color-cyan)' : '2px solid transparent',
              color: tab === t.id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.5)',
              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.88rem',
              minHeight: 48, transition: 'color 0.18s, border-color 0.18s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'radio'      && <NovaRadio user={user} />}
      {tab === 'lastfm'     && <LastFmPanel user={user} />}
      {tab === 'battle'     && <BeatBattle user={user} />}
      {tab === 'visualizer' && <MusicVisualizer />}
    </div>
  );
};

export default MusicHub;
