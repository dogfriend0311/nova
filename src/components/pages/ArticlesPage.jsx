import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadToBlob } from '../../services/blobUpload';

function uid() { return Math.random().toString(36).slice(2, 10); }

async function uploadArticlePhoto(file, username) {
  if (file.size > 8 * 1024 * 1024) throw new Error(`Photo must be under 8 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  const ext  = file.name.split('.').pop();
  const path = `articles/${username || 'author'}-${Date.now()}-${uid()}.${ext}`;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 60000));
  try {
    return await Promise.race([uploadToBlob(file, path), timeoutPromise]);
  } catch (err) {
    console.error('article photo upload error:', err);
    throw new Error(err.message === 'TIMEOUT' ? 'Upload timed out. Try a smaller photo or check your connection.' : (err.message || 'Upload failed'));
  }
}

const CATEGORIES = [
  { id: 'sports', label: '⚾ Sports' },
  { id: 'music',  label: '🎵 Music' },
  { id: 'roblox', label: '🎮 Roblox Sports' },
];

const LEAGUE_META = {
  vizta:    { label: 'Roblox Baseball', icon: '⚾' },
  hockey:   { label: 'Roblox Hockey',   icon: '🏒' },
  football: { label: 'Heavenly Football', icon: '🏈' },
};

// ── Tag picker: search + attach site player pages / teams / leagues
// to an article while writing it. Tags are stored on the article as
// [{ type: 'player'|'team'|'league', league, id, name }] and rendered
// as clickable chips on the reader view.
const TagPicker = ({ tags, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    import('../../services/db').then(({ default: db }) => {
      const leagues = Object.keys(LEAGUE_META);
      Promise.all(leagues.map(lg => Promise.all([db.getPlayers(lg), db.getTeams(lg)]).then(([players, teams]) => ({ lg, players: players || [], teams: teams || [] }))))
        .then(perLeague => {
          if (cancelled) return;
          const hits = [];
          perLeague.forEach(({ lg, players, teams }) => {
            const leagueLabel = LEAGUE_META[lg].label;
            if (leagueLabel.toLowerCase().includes(q)) {
              hits.push({ type: 'league', league: lg, id: lg, name: leagueLabel });
            }
            players.forEach(p => {
              const name = p.nickname || p.player_name || '';
              if (name.toLowerCase().includes(q)) hits.push({ type: 'player', league: lg, id: p.id, name });
            });
            teams.forEach(t => {
              if ((t.name || '').toLowerCase().includes(q)) hits.push({ type: 'team', league: lg, id: t.id, name: t.name });
            });
          });
          setResults(hits.slice(0, 20));
          setSearching(false);
        });
    });
    return () => { cancelled = true; };
  }, [query]);

  const addTag = (tag) => {
    const exists = tags.some(t => t.type === tag.type && t.league === tag.league && String(t.id) === String(tag.id));
    if (!exists) onChange([...tags, tag]);
    setQuery('');
    setResults([]);
  };
  const removeTag = (tag) => {
    onChange(tags.filter(t => !(t.type === tag.type && t.league === tag.league && String(t.id) === String(tag.id))));
  };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player pages, teams, or leagues to tag…"
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box' }}
        />
        {query.trim().length >= 2 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, background: '#12162a', border: '1px solid rgba(94,129,244,0.25)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
            {searching && <div style={{ padding: 10, fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)' }}>Searching…</div>}
            {!searching && results.length === 0 && <div style={{ padding: 10, fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)' }}>No matches.</div>}
            {results.map((r, i) => (
              <div key={`${r.type}-${r.league}-${r.id}-${i}`} onClick={() => addTag(r)}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', color: '#e2e5f0', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(94,129,244,0.08)' }}>
                <span>{r.type === 'player' ? '👤' : r.type === 'team' ? '🛡️' : LEAGUE_META[r.league]?.icon}</span>
                <span style={{ flex: 1 }}>{r.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>{LEAGUE_META[r.league]?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {tags.map((t, i) => (
            <span key={`${t.type}-${t.league}-${t.id}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 14, background: 'rgba(94,129,244,0.12)', border: '1px solid rgba(94,129,244,0.3)', color: 'var(--color-cyan)', fontSize: '0.78rem', fontWeight: 600 }}>
              {t.type === 'player' ? '👤' : t.type === 'team' ? '🛡️' : LEAGUE_META[t.league]?.icon} {t.name}
              <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, padding: 0 }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return ''; }
};

// ── Write / edit form ──────────────────────────────────────────
const ArticleForm = ({ initial, username, onCancel, onSaved }) => {
  const [title,    setTitle]    = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || 'sports');
  const [body,     setBody]     = useState(initial?.body || '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url || '');
  const [tags,     setTags]     = useState(initial?.tags || []);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const inputRef = useRef(null);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadArticlePhoto(file, username);
      setPhotoUrl(url);
    } catch (err) {
      setError(err.message === 'TIMEOUT' ? 'Upload timed out. Try a smaller image.' : err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const save = async () => {
    if (!title.trim() || !body.trim()) { setError('Title and article text are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const { default: db } = await import('../../services/db');
      const record = {
        ...(initial?.id ? { id: initial.id } : {}),
        title: title.trim(),
        category,
        body: body.trim(),
        photo_url: photoUrl,
        tags,
        author: initial?.author || username,
        ...(initial?.id ? {} : { created_at: new Date().toISOString() }),
      };
      await db.saveArticle(record);
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="neon-card p-3" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h3 style={{ color: '#e2e5f0', marginBottom: 16 }}>{initial ? '✏️ Edit Article' : '📝 Write New Article'}</h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 5 }}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title"
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.92rem', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 5 }}>Category</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              background: category === c.id ? 'rgba(94,129,244,0.18)' : 'rgba(94,129,244,0.05)',
              border: `1px solid ${category === c.id ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
              color: category === c.id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 5 }}>Photo (optional)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ padding: '8px 16px', background: 'rgba(94,129,244,0.1)', border: '1px solid rgba(94,129,244,0.3)', color: 'var(--color-cyan)', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'Uploading…' : '📁 Upload Photo'}
            <input ref={inputRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} disabled={uploading} />
          </label>
          {photoUrl && !uploading && (
            <button onClick={() => setPhotoUrl('')} style={{ background: 'none', border: 'none', color: '#ff6b7a', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Remove</button>
          )}
        </div>
        {photoUrl && (
          <img src={photoUrl} alt="" style={{ marginTop: 10, maxWidth: '100%', maxHeight: 220, borderRadius: 8, objectFit: 'cover' }} />
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 5 }}>Article</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write the article here…" rows={10}
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 5 }}>Tag player pages, teams, or leagues (optional)</label>
        <TagPicker tags={tags} onChange={setTags} />
      </div>

      {error && <div style={{ color: '#ff6b7a', fontSize: '0.82rem', marginBottom: 12 }}>⚠ {error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="neon-button" onClick={save} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : (initial ? '✓ Save Changes' : '📢 Publish Article')}
        </button>
        <button className="neon-button" onClick={onCancel} style={{ borderColor: 'rgba(158,165,196,0.3)', color: 'rgba(158,165,196,0.6)' }}>Cancel</button>
      </div>
    </div>
  );
};

// ── Full article reader ────────────────────────────────────────
const ArticleReader = ({ article, canManage, onBack, onEdit, onDelete }) => (
  <div style={{ maxWidth: 720, margin: '0 auto' }}>
    <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 16 }}>← Back to Articles</button>
    {article.photo_url && (
      <img src={article.photo_url} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} />
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(94,129,244,0.15)', color: 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {CATEGORIES.find(c => c.id === article.category)?.label || article.category}
      </span>
    </div>
    <h1 style={{ color: '#e2e5f0', fontSize: '1.6rem', margin: '0 0 8px' }}>{article.title}</h1>
    <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.45)', marginBottom: 20 }}>
      By {article.author || 'Staff'} · {fmt(article.created_at)}
    </div>
    <div style={{ color: 'rgba(226,229,240,0.85)', fontSize: '1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
      {article.body}
    </div>
    {article.tags?.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(94,129,244,0.12)' }}>
        {article.tags.map((t, i) => (
          <a key={`${t.type}-${t.league}-${t.id}-${i}`}
            href={t.type === 'player' ? `#leagues/player/${t.id}` : t.type === 'team' ? `#leagues` : `#leagues`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 16, background: 'rgba(94,129,244,0.1)', border: '1px solid rgba(94,129,244,0.25)', color: 'var(--color-cyan)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
            {t.type === 'player' ? '👤' : t.type === 'team' ? '🛡️' : LEAGUE_META[t.league]?.icon} {t.name}
          </a>
        ))}
      </div>
    )}
    {canManage && (
      <div style={{ display: 'flex', gap: 10, marginTop: 30, paddingTop: 20, borderTop: '1px solid rgba(94,129,244,0.12)' }}>
        <button className="neon-button" onClick={onEdit}>✏️ Edit</button>
        <button className="neon-button" style={{ borderColor: '#ff6b7a', color: '#ff6b7a' }} onClick={onDelete}>🗑 Delete</button>
      </div>
    )}
  </div>
);

// ── Article card (list view) ───────────────────────────────────
const ArticleCard = ({ article, onOpen }) => (
  <div className="neon-card p-3" onClick={onOpen} style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
    {article.photo_url ? (
      <img src={article.photo_url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
    ) : (
      <div style={{ width: 96, height: 96, borderRadius: 8, flexShrink: 0, background: 'rgba(94,129,244,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
        {article.category === 'music' ? '🎵' : article.category === 'roblox' ? '🎮' : '⚾'}
      </div>
    )}
    <div style={{ minWidth: 0, flex: 1 }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {CATEGORIES.find(c => c.id === article.category)?.label || article.category}
      </span>
      <h3 style={{ color: '#e2e5f0', fontSize: '1.05rem', margin: '4px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {article.title}
      </h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {article.body}
      </p>
      <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.35)' }}>
        By {article.author || 'Staff'} · {fmt(article.created_at)}
      </div>
    </div>
  </div>
);

// ── Root ──────────────────────────────────────────────────────
const ArticlesPage = ({ initialArticleId, onArticleSelect }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'cofounder';

  const [articles, setArticles] = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [view,     setView]     = useState(null); // null (URL-driven) | 'write' | 'edit'
  const [editing,  setEditing]  = useState(null); // article being edited, when view==='edit'
  const [filter,   setFilter]   = useState('all');
  const [copied,   setCopied]   = useState(false);
  const [query,    setQuery]    = useState('');

  const load = () => {
    import('../../services/db').then(({ default: db }) => {
      db.getArticles().then(list => { setArticles(list); setLoaded(true); });
    });
  };
  useEffect(load, []);

  const filtered = (filter === 'all' ? articles : articles.filter(a => a.category === filter))
    .filter(a => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (a.title || '').toLowerCase().includes(q)
        || (a.body || '').toLowerCase().includes(q)
        || (a.author || '').toLowerCase().includes(q);
    });
  const active = initialArticleId ? articles.find(a => String(a.id) === String(initialArticleId)) : null;

  const goTo = (id) => { if (onArticleSelect) onArticleSelect(id); };

  const deleteArticle = async (id) => {
    if (!window.confirm('Delete this article for everyone?')) return;
    const { default: db } = await import('../../services/db');
    await db.deleteArticle(id);
    goTo(null);
    load();
  };

  const shareArticle = (id) => {
    const url = `${window.location.origin}${window.location.pathname}#articles/${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (view === 'write' || view === 'edit') {
    return (
      <div style={{ padding: '20px 12px' }}>
        <ArticleForm
          initial={view === 'edit' ? editing : null}
          username={user?.username}
          onCancel={() => { setView(null); setEditing(null); }}
          onSaved={() => { setView(null); setEditing(null); load(); }}
        />
      </div>
    );
  }

  if (initialArticleId && active) {
    return (
      <div style={{ padding: '20px 12px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto 12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => shareArticle(active.id)} style={{ background: 'rgba(94,129,244,0.1)', border: '1px solid rgba(94,129,244,0.3)', color: 'var(--color-cyan)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            {copied ? '✓ Link copied!' : '🔗 Share this article'}
          </button>
        </div>
        <ArticleReader
          article={active}
          canManage={canManage}
          onBack={() => goTo(null)}
          onEdit={() => { setEditing(active); setView('edit'); }}
          onDelete={() => deleteArticle(active.id)}
        />
      </div>
    );
  }

  if (initialArticleId && loaded && !active) {
    return (
      <div style={{ padding: '40px 12px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(158,165,196,0.5)' }}>This article doesn't exist or was removed.</p>
        <button className="neon-button" onClick={() => goTo(null)} style={{ marginTop: 10 }}>← Back to Articles</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 12px', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h1 style={{ color: '#e2e5f0', margin: 0 }}>📰 Articles</h1>
        {canManage && (
          <button className="neon-button" onClick={() => setView('write')}>📝 Write Article</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'All' }, ...CATEGORIES].map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} style={{
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, minHeight: 40,
            background: filter === c.id ? 'rgba(94,129,244,0.15)' : 'rgba(94,129,244,0.04)',
            border: `1px solid ${filter === c.id ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
            color: filter === c.id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
          }}>{c.label}</button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles by title, author, or text…"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, minHeight: 42,
            background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)',
            color: '#e2e5f0', fontSize: '0.88rem', outline: 'none',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(158,165,196,0.5)', cursor: 'pointer', fontSize: '1rem', padding: 4 }}
          >✕</button>
        )}
      </div>

      {loaded && query.trim() && (
        <div style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.78rem', marginBottom: 8, marginTop: -12 }}>
          {filtered.length} result{filtered.length === 1 ? '' : 's'} for "{query.trim()}"
        </div>
      )}

      {!loaded ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 40 }}>Loading articles…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 40 }}>
          {query.trim() ? 'No articles match your search.' : `No articles yet${canManage ? ' — write the first one!' : '.'}`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(a => (
            <ArticleCard key={a.id} article={a} onOpen={() => goTo(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticlesPage;
