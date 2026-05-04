import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { searchMedia, getWatchList, saveWatchList, getAllReviews } from '../../services/mediaService';
import './WatchList.css';

const STATUS_LABELS = {
  plan:     'Plan to Watch',
  watching: 'Watching',
  watched:  'Watched',
  dropped:  'Dropped',
};

const STATUS_COLORS = {
  plan:     '#64b5f6',
  watching: '#66bb6a',
  watched:  '#a5d6a7',
  dropped:  '#ef9a9a',
};

const TYPE_ICONS = { anime: '🎌', movie: '🎬', tv: '📺' };

/* ── Star Rating ─────────────────────────────────────────────── */
const Stars = ({ rating, onRate, readonly }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="wl-stars">
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          className={`wl-star ${(hover || rating || 0) > i ? 'filled' : ''}`}
          onClick={() => { if (!readonly && onRate) onRate(i + 1 === rating ? null : i + 1); }}
          onMouseEnter={() => { if (!readonly) setHover(i + 1); }}
          onMouseLeave={() => { if (!readonly) setHover(0); }}
        >★</span>
      ))}
      {rating != null && <span className="wl-rating-num">{rating}/10</span>}
    </div>
  );
};

/* ── Watch Card ──────────────────────────────────────────────── */
const WatchCard = ({ item, onEdit, onRemove, onPin }) => (
  <div className={`wl-card ${item.pinned ? 'pinned' : ''}`}>
    <div className="wl-card-poster">
      {item.poster
        ? <img src={item.poster} alt={item.title} loading="lazy" />
        : <div className="wl-poster-ph">{TYPE_ICONS[item.type] || '?'}</div>
      }
      {item.pinned && <span className="wl-pin-badge">📌</span>}
    </div>
    <div className="wl-card-body">
      <div className="wl-card-title">{item.title}</div>
      <div className="wl-card-meta">
        {item.year && <span>{item.year}</span>}
        <span>{TYPE_ICONS[item.type]} {item.type === 'tv' ? 'TV Show' : item.type === 'anime' ? 'Anime' : 'Movie'}</span>
      </div>
      <span
        className="wl-status-badge"
        style={{ background: `${STATUS_COLORS[item.status]}1a`, color: STATUS_COLORS[item.status], border: `1px solid ${STATUS_COLORS[item.status]}44` }}
      >
        {STATUS_LABELS[item.status]}
      </span>
      {item.rating != null && <Stars rating={item.rating} readonly />}
      {item.review && (
        <p className="wl-review-preview">
          {item.review.length > 90 ? item.review.slice(0, 90) + '…' : item.review}
        </p>
      )}
      <div className="wl-card-actions">
        <button className={`wl-action-btn ${item.pinned ? 'pinned' : ''}`} onClick={() => onPin(item.id)} title={item.pinned ? 'Unpin' : 'Pin to profile'}>
          📌
        </button>
        <button className="wl-action-btn" onClick={() => onEdit(item)}>✏️</button>
        <button className="wl-action-btn danger" onClick={() => onRemove(item.id)}>🗑️</button>
      </div>
    </div>
  </div>
);

/* ── Edit Modal ──────────────────────────────────────────────── */
const EditModal = ({ item, onSave, onClose }) => {
  const [status, setStatus] = useState(item?.status || 'plan');
  const [rating, setRating] = useState(item?.rating ?? null);
  const [review, setReview] = useState(item?.review || '');

  return (
    <div className="wl-overlay" onClick={onClose}>
      <div className="wl-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="wl-modal-title">{item?.title}</h3>

        <div className="wl-form-group">
          <label>Status</label>
          <div className="wl-status-btns">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <button key={k} className={`wl-status-btn ${status === k ? 'active' : ''}`} onClick={() => setStatus(k)}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="wl-form-group">
          <label>Rating (click to rate, click again to clear)</label>
          <Stars rating={rating} onRate={setRating} />
        </div>

        <div className="wl-form-group">
          <label>Review</label>
          <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share your thoughts…" rows={4} />
        </div>

        <div className="wl-modal-actions">
          <button className="neon-button" onClick={() => onSave({ status, rating, review })}>Save</button>
          <button className="neon-button" style={{ opacity: 0.6 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ── Add Media Panel ─────────────────────────────────────────── */
const AddMediaPanel = ({ onAdd, onClose }) => {
  const [type,      setType]      = useState('anime');
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [status,    setStatus]    = useState('plan');
  const [rating,    setRating]    = useState(null);
  const [review,    setReview]    = useState('');
  const debounce = useRef(null);

  const doSearch = useCallback(async (q, t) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await searchMedia(q, t);
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQuery = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(q, type), 400);
  };

  const switchType = (t) => {
    setType(t);
    setResults([]);
    if (query) doSearch(query, t);
  };

  const handleSelect = (item) => { setSelected(item); setResults([]); };

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ ...selected, status, rating, review, pinned: false, addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    onClose();
  };

  const hasOmdb = !!process.env.REACT_APP_OMDB_KEY;

  return (
    <div className="wl-overlay" onClick={onClose}>
      <div className="wl-modal wl-add-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="wl-modal-title">➕ Add to Watch List</h3>

        <div className="wl-type-tabs">
          {['anime', 'tv', 'movie'].map((t) => (
            <button key={t} className={`wl-type-tab ${type === t ? 'active' : ''}`} onClick={() => switchType(t)}>
              {TYPE_ICONS[t]} {t === 'tv' ? 'TV Show' : t === 'anime' ? 'Anime' : 'Movie'}
            </button>
          ))}
        </div>

        {!selected ? (
          <>
            <input
              autoFocus
              type="text"
              className="wl-search-input"
              placeholder={`Search ${type === 'tv' ? 'TV shows' : type === 'anime' ? 'anime' : 'movies'}…`}
              value={query}
              onChange={handleQuery}
            />
            {type === 'movie' && !hasOmdb && (
              <p className="wl-no-key-note">
                Movie search requires an OMDb API key (free at omdbapi.com). Add <strong>REACT_APP_OMDB_KEY</strong> to enable it. You can still add any title manually below.
              </p>
            )}
            {searching && <div className="wl-searching">Searching…</div>}
            <div className="wl-results">
              {results.map((r) => (
                <div key={r.id} className="wl-result" onClick={() => handleSelect(r)}>
                  {r.poster
                    ? <img src={r.poster} alt="" className="wl-result-thumb" />
                    : <div className="wl-result-thumb-ph">{TYPE_ICONS[r.type]}</div>
                  }
                  <div className="wl-result-info">
                    <div className="wl-result-title">{r.title}</div>
                    <div className="wl-result-meta">
                      {r.year && <span>{r.year}</span>}
                      {r.score && <span>★ {r.score}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {query.trim().length >= 2 && (
                <div
                  className="wl-result manual"
                  onClick={() => handleSelect({ id: `manual-${Date.now()}`, title: query.trim(), type, poster: null, year: null, genres: [] })}
                >
                  <div className="wl-result-thumb-ph">➕</div>
                  <div className="wl-result-info">
                    <div className="wl-result-title">Add "{query.trim()}" manually</div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <div className="wl-selected">
              {selected.poster && <img src={selected.poster} alt="" className="wl-selected-thumb" />}
              <div className="wl-result-info">
                <div className="wl-result-title">{selected.title}</div>
                <div className="wl-result-meta">{selected.year}</div>
              </div>
              <button className="wl-action-btn" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="wl-form-group">
              <label>Status</label>
              <div className="wl-status-btns">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <button key={k} className={`wl-status-btn ${status === k ? 'active' : ''}`} onClick={() => setStatus(k)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="wl-form-group">
              <label>Rating (optional)</label>
              <Stars rating={rating} onRate={setRating} />
            </div>

            <div className="wl-form-group">
              <label>Review (optional)</label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Write your thoughts…" rows={3} />
            </div>

            <div className="wl-modal-actions">
              <button className="neon-button" onClick={handleAdd}>Add to List</button>
              <button className="neon-button" style={{ opacity: 0.6 }} onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Community Reviews ───────────────────────────────────────── */
const CommunityReviews = () => {
  const reviews = getAllReviews();

  if (!reviews.length) {
    return (
      <div className="sh-empty">
        No reviews yet — be the first to review something! Start by adding items to your list.
      </div>
    );
  }

  return (
    <div className="wl-reviews-feed">
      {reviews.map((r, i) => (
        <div key={i} className="wl-review-card">
          <div className="wl-review-header">
            <span className="wl-reviewer">@{r.username}</span>
            <span className="wl-review-type">{TYPE_ICONS[r.type]}</span>
            <span className="wl-review-title">{r.title}</span>
            {r.rating != null && <span className="wl-review-rating">★ {r.rating}/10</span>}
            <span
              className="wl-status-badge"
              style={{ background: `${STATUS_COLORS[r.status]}1a`, color: STATUS_COLORS[r.status], border: `1px solid ${STATUS_COLORS[r.status]}44`, marginLeft: 'auto' }}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </div>
          {r.review && <p className="wl-review-text">"{r.review}"</p>}
          <div className="wl-review-meta">
            {r.updatedAt && new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Main WatchList ──────────────────────────────────────────── */
const WatchList = () => {
  const { user } = useAuth();
  const [list,         setList]         = useState([]);
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editItem,     setEditItem]     = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [activeTab,    setActiveTab]    = useState('mylist');

  useEffect(() => {
    if (user?.username) setList(getWatchList(user.username));
  }, [user]);

  const persist = useCallback((newList) => {
    setList(newList);
    if (user?.username) saveWatchList(user.username, newList);
  }, [user]);

  const handleAdd = (item) => persist([...list, item]);

  const handleSaveEdit = ({ status, rating, review }) => {
    persist(list.map((i) =>
      i.id === editItem.id ? { ...i, status, rating, review, updatedAt: new Date().toISOString() } : i
    ));
    setEditItem(null);
  };

  const handleRemove = (id) => persist(list.filter((i) => i.id !== id));

  const handlePin = (id) => persist(list.map((i) => i.id === id ? { ...i, pinned: !i.pinned } : i));

  const filtered = list.filter((i) => {
    if (typeFilter   !== 'all' && i.type   !== typeFilter)   return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  const pinned = list.filter((i) => i.pinned);

  return (
    <div className="page wl-page">
      <div className="page-header">
        <h1 className="gradient-text">🎬 Watch List</h1>
        <p className="subtitle">Track anime, movies &amp; TV shows — share reviews with the community</p>
      </div>

      <div className="sh-sub-tabs" style={{ marginBottom: '24px' }}>
        <button className={`sh-sub-tab ${activeTab === 'mylist'    ? 'active' : ''}`} onClick={() => setActiveTab('mylist')}>📋 My List {list.length > 0 && <span className="sh-section-count" style={{marginLeft:4}}>{list.length}</span>}</button>
        <button className={`sh-sub-tab ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>🌐 Community Reviews</button>
      </div>

      {activeTab === 'mylist' && (
        <>
          {pinned.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h3 className="sh-section-title">📌 Pinned to Profile</h3>
              <div className="wl-grid">
                {pinned.map((item) => (
                  <WatchCard key={item.id} item={item} onEdit={setEditItem} onRemove={handleRemove} onPin={handlePin} />
                ))}
              </div>
            </div>
          )}

          <div className="wl-controls">
            <div className="wl-filter-row">
              <div className="wl-filter-group">
                {['all', 'anime', 'movie', 'tv'].map((t) => (
                  <button key={t} className={`wl-filter-btn ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
                    {t === 'all' ? '🌐 All' : `${TYPE_ICONS[t]} ${t === 'tv' ? 'TV' : t === 'anime' ? 'Anime' : 'Movies'}`}
                  </button>
                ))}
              </div>
              <div className="wl-filter-group">
                {['all', ...Object.keys(STATUS_LABELS)].map((s) => (
                  <button key={s} className={`wl-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? 'All Status' : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <button className="neon-button wl-add-btn" onClick={() => setShowAdd(true)}>+ Add</button>
          </div>

          {filtered.length === 0 ? (
            <div className="sh-empty">
              {list.length === 0
                ? 'Your list is empty. Click "+ Add" to start tracking anime, movies, and TV shows!'
                : 'No items match your current filters.'}
            </div>
          ) : (
            <div className="wl-grid">
              {filtered.map((item) => (
                <WatchCard key={item.id} item={item} onEdit={setEditItem} onRemove={handleRemove} onPin={handlePin} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'community' && <CommunityReviews />}

      {showAdd  && <AddMediaPanel onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
      {editItem && <EditModal item={editItem} onSave={handleSaveEdit} onClose={() => setEditItem(null)} />}
    </div>
  );
};

export default WatchList;
