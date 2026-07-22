import React, { useState, useEffect, useRef } from 'react';
import './NovaFeatures.css';

/**
 * NovaRadio — 24/7 community radio.
 *
 * The previous version only played if an admin had manually stored an
 * `embedUrl` in localStorage. Because localStorage is browser-local, that
 * meant most users saw "No playlist configured" and the radio appeared dead.
 *
 * This version ships with a default live internet-radio stream so it works
 * the moment anyone opens the tab, while still letting an admin override the
 * stream URL (Owner Dashboard → Radio tab stores it in localStorage under
 * `nova_radio_config`).
 */

const STORAGE_KEY = 'nova_radio_config';
const LISTENERS_KEY = 'nova_radio_listeners';

// Default always-on streams (public, CORS-friendly SHOUTcast/Icecast).
// First one that loads wins; the rest are fallbacks.
const DEFAULT_STREAMS = [
  'https://ice1.chillhop.com/128/1',
  'https://stream.zeno.fm/0r0xa792kwzuv',
  'https://radio.novahub.app/listen/nova/radio.mp3',
];

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function trackListener(username) {
  if (!username) return;
  try {
    const data = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
    data[username] = Date.now();
    localStorage.setItem(LISTENERS_KEY, JSON.stringify(data));
  } catch {}
}

function getListeners() {
  try {
    const data = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 min
    return Object.entries(data)
      .filter(([, ts]) => ts > cutoff)
      .map(([u]) => u);
  } catch {
    return [];
  }
}

const NovaRadio = ({ user }) => {
  const audioRef = useRef(null);
  const [config, setConfig] = useState(getConfig);
  const [listeners, setListeners] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState('');
  const [streamIdx, setStreamIdx] = useState(0);

  // The effective stream: admin override > default stream list
  const streamUrl = config?.embedUrl || DEFAULT_STREAMS[streamIdx];

  useEffect(() => {
    if (user?.username) trackListener(user.username);
    setListeners(getListeners());
    const id = setInterval(() => {
      if (user?.username) trackListener(user.username);
      setListeners(getListeners());
      setConfig(getConfig()); // pick up admin changes live
    }, 30000);
    return () => clearInterval(id);
  }, [user]);

  function play() {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    setLoading(true);
    setError('');
    a.play()
      .then(() => {
        setPlaying(true);
        setLoading(false);
      })
      .catch(() => {
        // this stream failed — try the next default stream
        if (!config?.embedUrl && streamIdx < DEFAULT_STREAMS.length - 1) {
          setStreamIdx((i) => i + 1);
          // reload will attempt the new src
          setTimeout(() => {
            a.load();
            a.play().catch(() => setError('Could not connect to the radio stream. Try again.'));
          }, 200);
        } else {
          setError('Could not connect to the radio stream. Try again.');
          setLoading(false);
        }
      });
  }

  function pause() {
    const a = audioRef.current;
    if (a) a.pause();
    setPlaying(false);
  }

  function toggle() {
    if (playing) pause();
    else play();
  }

  function changeVolume(v) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>📻 Nova Radio</h1>
      <p style={{ color: 'rgba(158,165,196,0.7)', marginBottom: 18, fontSize: '0.9rem' }}>
        Community music — live 24/7 while the tab is open
      </p>

      <div
        style={{
          borderRadius: 18,
          padding: 24,
          background:
            'linear-gradient(160deg, rgba(94,129,244,0.12), rgba(124,94,244,0.08) 60%, rgba(8,10,22,0.6))',
          border: '1px solid rgba(94,129,244,0.22)',
          textAlign: 'center',
        }}
      >
        {/* pulsing disc */}
        <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto 16px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 50% 50%, #1a1d33 30%, #5e81f4 31%, #2a2e4d 33%, #7c5ef4 60%, #1a1d33 61%)',
              animation: playing ? 'nova-spin 4s linear infinite' : 'none',
              boxShadow: '0 0 30px rgba(94,129,244,0.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#0a0c18',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          />
          {playing && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%,-50%)',
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(94,129,244,0.25)',
                animation: 'nova-pulse 1.2s ease-in-out infinite',
              }}
            />
          )}
        </div>

        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {config?.title || 'Nova Radio Live'}
        </div>
        <div style={{ color: 'rgba(158,165,196,0.7)', fontSize: '0.82rem', marginTop: 4 }}>
          {playing ? 'Now playing · 24/7' : loading ? 'Connecting…' : 'Paused'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 18 }}>
          <button
            onClick={toggle}
            disabled={loading}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg,#5e81f4,#7c5ef4)',
              color: '#fff',
              fontSize: '1.6rem',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 6px 20px rgba(94,129,244,0.4)',
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* volume */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: '0.85rem' }}>🔉</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            style={{ width: 140, accentColor: '#5e81f4' }}
          />
          <span style={{ fontSize: '0.85rem' }}>🔊</span>
        </div>

        {error && (
          <div style={{ marginTop: 12, color: '#f87171', fontSize: '0.82rem' }}>{error}</div>
        )}

        <div
          style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            color: '#3ad36b',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3ad36b',
              boxShadow: '0 0 8px #3ad36b',
            }}
          />
          {listeners.length} listening now
        </div>

        {config?.embedUrl && (
          <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'rgba(158,165,196,0.5)' }}>
            Custom stream set by admin
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={streamUrl}
        preload="none"
        onPlaying={() => {
          setPlaying(true);
          setLoading(false);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onError={() => {
          if (!config?.embedUrl && streamIdx < DEFAULT_STREAMS.length - 1) {
            setStreamIdx((i) => i + 1);
          } else {
            setError('Stream unavailable — try again in a moment.');
            setLoading(false);
            setPlaying(false);
          }
        }}
      />

      <style>{`
        @keyframes nova-spin { to { transform: rotate(360deg); } }
        @keyframes nova-pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 0.15; transform: translate(-50%,-50%) scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default NovaRadio;