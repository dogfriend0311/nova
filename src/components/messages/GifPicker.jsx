import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, TrendingUp, X } from 'lucide-react';
import gifService from '../../services/gifService';

const TABS = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'reactions', label: 'Reactions' },
  { key: 'sports', label: 'Sports' },
  { key: 'mlb', label: 'MLB' },
  { key: 'roblox', label: 'Roblox' },
  { key: 'memes', label: 'Memes' },
];

// Popover shown above the message composer when the GIF button is clicked.
// `onSelect(gif)` fires with { url, width, height, preview_url, description }.
const GifPicker = ({ onSelect, onClose }) => {
  const [tab, setTab] = useState('trending');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const rootRef = useRef(null);

  const load = useCallback(async (activeTab, activeQuery) => {
    setLoading(true);
    let gifs = [];
    if (activeTab === 'trending') gifs = await gifService.getTrending();
    else if (activeTab === 'search') gifs = activeQuery ? await gifService.search(activeQuery) : [];
    else gifs = await gifService.getCategory(activeTab);
    setResults(gifs);
    setLoading(false);
  }, []);

  useEffect(() => { load(tab, query); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'search') return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load('search', query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, tab, load]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute', bottom: '110%', left: 0, zIndex: 20, width: 320, height: 380,
        background: 'var(--color-bg-light, #131729)', border: '1px solid rgba(94,129,244,0.25)',
        borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid rgba(94,129,244,0.15)' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#e2e5f0', flex: 1 }}>GIFs</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <X size={14} color="rgba(158,165,196,0.6)" />
        </button>
      </div>

      {tab === 'search' && (
        <div style={{ padding: '8px 10px 0' }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tenor…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', fontSize: '0.82rem' }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {!gifService.hasKey() ? (
          <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.78rem', textAlign: 'center', marginTop: 30 }}>
            GIF search isn't configured yet — set REACT_APP_GIPHY_API_KEY to enable it.
          </p>
        ) : loading ? (
          <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.8rem', textAlign: 'center', marginTop: 30 }}>Loading…</p>
        ) : results.length === 0 ? (
          <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.8rem', textAlign: 'center', marginTop: 30 }}>
            {tab === 'search' && !query ? 'Start typing to search.' : 'No GIFs found.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {results.map((g) => (
              <button
                key={g.id}
                onClick={() => onSelect(g)}
                title={g.description}
                style={{
                  padding: 0, border: 'none', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                  background: 'rgba(94,129,244,0.06)', aspectRatio: '1 / 1',
                }}
              >
                <img src={g.preview_url} alt={g.description} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', gap: 4, padding: '6px 8px', borderTop: '1px solid rgba(94,129,244,0.15)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 999,
              border: '1px solid rgba(94,129,244,0.2)', cursor: 'pointer', fontSize: '0.7rem', whiteSpace: 'nowrap',
              background: tab === key ? 'rgba(94,129,244,0.22)' : 'transparent',
              color: tab === key ? '#e2e5f0' : 'rgba(158,165,196,0.6)',
            }}
          >
            {Icon && <Icon size={11} />}{label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GifPicker;
