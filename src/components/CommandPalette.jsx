import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, FileText, X } from 'lucide-react';
import db from '../services/db';
import { SPORTS } from '../data/sportsConfig';

// ── Global search / command palette ────────────────────────────
// Opens with Cmd+K / Ctrl+K anywhere in the app, or by tapping the
// search icon in the navbar. Searches players (across every league),
// member profiles, and articles, then jumps straight to the matching
// page via the same hash-router the rest of the app already uses —
// so this component needs zero wiring into App.jsx's state.

const LEAGUE_KEYS = Object.keys(SPORTS); // ['vizta', 'hockey', 'football']

const goTo = (hash) => { window.location.hash = hash; };

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ players: [], members: [], articles: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Global keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else { setQuery(''); setResults({ players: [], members: [], articles: [] }); setActiveIndex(0); }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim().toLowerCase();
    if (q.length < 2) { setResults({ players: [], members: [], articles: [] }); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [playerLists, members, articles] = await Promise.all([
          Promise.all(LEAGUE_KEYS.map(lg => db.getPlayers(lg).then(list => (Array.isArray(list) ? list : []).map(p => ({ ...p, _league: lg }))).catch(() => []))),
          db.getMemberProfiles().catch(() => []),
          db.getArticles().catch(() => []),
        ]);
        const allPlayers = playerLists.flat();
        const players = allPlayers.filter(p =>
          (p.nickname || '').toLowerCase().includes(q) || (p.player_name || '').toLowerCase().includes(q)
        ).slice(0, 6);
        const memberMatches = (Array.isArray(members) ? members : []).filter(m =>
          (m.username || '').toLowerCase().includes(q) || (m.display_name || '').toLowerCase().includes(q)
        ).slice(0, 5);
        const articleMatches = (Array.isArray(articles) ? articles : []).filter(a =>
          (a.title || '').toLowerCase().includes(q)
        ).slice(0, 5);
        setResults({ players, members: memberMatches, articles: articleMatches });
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const flat = useMemo(() => {
    const list = [];
    results.players.forEach(p => list.push({ type: 'player', item: p }));
    results.members.forEach(m => list.push({ type: 'member', item: m }));
    results.articles.forEach(a => list.push({ type: 'article', item: a }));
    return list;
  }, [results]);

  const select = (entry) => {
    if (!entry) return;
    if (entry.type === 'player') goTo(`#leagues/player/${entry.item.id}`);
    else if (entry.type === 'member') goTo(`#members/${entry.item.username}`);
    else if (entry.type === 'article') goTo(`#articles/${entry.item.id}`);
    setOpen(false);
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(flat[activeIndex]); }
  };

  return (
    <>
      <button
        className="user-button"
        onClick={() => setOpen(true)}
        aria-label="Search Nova"
        title="Search (Ctrl/Cmd+K)"
      >
        <Search size={17} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(5,7,13,0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '10vh 16px 16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560,
              background: 'linear-gradient(160deg, #131729, #0a0d1a)',
              border: '1px solid rgba(94,129,244,0.3)', borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(94,129,244,0.15)' }}>
              <Search size={18} color="rgba(158,165,196,0.5)" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search players, members, articles…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#e2e5f0', fontSize: '0.95rem', padding: '6px 0',
                }}
              />
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              {query.trim().length < 2 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>
                  Type at least 2 characters to search.
                </div>
              ) : loading ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>Searching…</div>
              ) : flat.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>No results for "{query.trim()}"</div>
              ) : (
                <>
                  {results.players.length > 0 && <SectionLabel label="Players" />}
                  {results.players.map((p, i) => (
                    <ResultRow
                      key={`p-${p._league}-${p.id}`}
                      active={flat[activeIndex]?.item === p}
                      icon={<User size={15} />}
                      title={p.nickname || p.player_name}
                      subtitle={`${SPORTS[p._league]?.label || p._league}${p.team ? ` · ${p.team}` : ''}`}
                      onClick={() => select({ type: 'player', item: p })}
                    />
                  ))}
                  {results.members.length > 0 && <SectionLabel label="Members" />}
                  {results.members.map((m) => (
                    <ResultRow
                      key={`m-${m.username}`}
                      active={flat[activeIndex]?.item === m}
                      icon={<User size={15} />}
                      title={m.display_name || m.username}
                      subtitle={`@${m.username}`}
                      onClick={() => select({ type: 'member', item: m })}
                    />
                  ))}
                  {results.articles.length > 0 && <SectionLabel label="Articles" />}
                  {results.articles.map((a) => (
                    <ResultRow
                      key={`a-${a.id}`}
                      active={flat[activeIndex]?.item === a}
                      icon={<FileText size={15} />}
                      title={a.title}
                      subtitle={a.author ? `By ${a.author}` : 'Article'}
                      onClick={() => select({ type: 'article', item: a })}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SectionLabel = ({ label }) => (
  <div style={{ padding: '10px 16px 4px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)' }}>
    {label}
  </div>
);

const ResultRow = ({ icon, title, subtitle, onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 16px', background: active ? 'rgba(94,129,244,0.1)' : 'none',
      border: 'none', cursor: 'pointer', textAlign: 'left',
    }}
  >
    <span style={{ color: 'var(--color-cyan)', flexShrink: 0 }}>{icon}</span>
    <span style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#e2e5f0', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.72rem' }}>{subtitle}</div>
    </span>
  </button>
);

export default CommandPalette;
