import React, { useState, useEffect, useCallback } from 'react';
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

// ── MusicHub root ─────────────────────────────────────────────
const TABS = [
  { id: 'lastfm',    label: '🎧 Last.fm'    },
  { id: 'battle',    label: '🎵 Beat Battle' },
];

const MusicHub = ({ user, initialTab, onSignIn }) => {
  const [tab, setTab] = useState(initialTab && TABS.some(t => t.id === initialTab) ? initialTab : 'lastfm');

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

      {tab === 'lastfm'     && <LastFmPanel user={user} />}
      {tab === 'battle'     && <BeatBattle user={user} />}
    </div>
  );
};

export default MusicHub;
