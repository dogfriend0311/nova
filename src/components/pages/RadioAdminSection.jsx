/**
 * RadioAdminSection
 *
 * Drop this component inside your OwnerDashboard's Radio tab:
 *
 *   import RadioAdminSection from '../admin/RadioAdminSection';
 *   // ... inside your tab renderer:
 *   {activeTab === 'radio' && <RadioAdminSection adminUser={user} />}
 *
 * It manages nova_radio_config in localStorage (and optionally Supabase).
 */

import React, { useState, useEffect, useRef } from 'react';

const CONFIG_KEY = 'nova_radio_config';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function readConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
  catch { return null; }
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/|v\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function ytThumbnail(url) {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// ── Small input component matching dashboard style ─────────────
const Field = ({ label, value, onChange, placeholder, type = 'text', hint }) => (
  <div className="form-field">
    <label>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ''}
    />
    {hint && <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.4)', marginTop: 2 }}>{hint}</span>}
  </div>
);

// ── Track row in the playlist ──────────────────────────────────
const TrackRow = ({ track, index, total, onMove, onDelete, isPlaying, onPlay }) => {
  const thumb = track.coverUrl || ytThumbnail(track.url);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: isPlaying ? 'rgba(94,129,244,0.1)' : 'rgba(94,129,244,0.03)',
      border: `1px solid ${isPlaying ? 'rgba(94,129,244,0.35)' : 'rgba(94,129,244,0.1)'}`,
      borderRadius: 10,
      transition: 'all 0.18s',
    }}>
      {/* Drag handle / index */}
      <div style={{ color: 'rgba(158,165,196,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', width: 22, textAlign: 'center', flexShrink: 0 }}>
        {isPlaying ? '▶' : index + 1}
      </div>

      {/* Thumbnail */}
      <div style={{ width: 42, height: 42, borderRadius: 6, overflow: 'hidden', background: 'rgba(94,129,244,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
          : '🎵'
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: isPlaying ? 'var(--color-cyan)' : '#e2e5f0', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title || 'Untitled'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist || '—'}
          {track.url && (
            <span style={{ marginLeft: 6, color: 'rgba(158,165,196,0.3)' }}>
              · {getYouTubeId(track.url) ? 'YouTube' : 'Audio'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          title="Move up"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(94,129,244,0.2)', background: 'rgba(94,129,244,0.05)', color: 'rgba(158,165,196,0.6)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: index === 0 ? 0.3 : 1 }}
        >▲</button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          title="Move down"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(94,129,244,0.2)', background: 'rgba(94,129,244,0.05)', color: 'rgba(158,165,196,0.6)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: index === total - 1 ? 0.3 : 1 }}
        >▼</button>
        <button
          onClick={() => onDelete(index)}
          title="Remove"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,107,122,0.2)', background: 'rgba(255,107,122,0.05)', color: 'rgba(255,107,122,0.6)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────
const RadioAdminSection = ({ adminUser }) => {
  const [stationName, setStationName] = useState('Nova Radio');
  const [description, setDescription] = useState('');
  const [playlist,    setPlaylist]    = useState([]);
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState(null);

  // Add track form state
  const [addTitle,  setAddTitle]  = useState('');
  const [addArtist, setAddArtist] = useState('');
  const [addCover,  setAddCover]  = useState('');
  const [addUrl,    setAddUrl]    = useState('');
  const [addError,  setAddError]  = useState('');

  // URL preview (auto-resolve YouTube thumbnail)
  const [urlPreview, setUrlPreview] = useState(null);
  const debounceRef = useRef(null);

  // Load existing config on mount
  useEffect(() => {
    // Try Supabase first, fall back to localStorage
    const tryLoad = async () => {
      try {
        const { default: db } = await import('../../services/db');
        if (db.getRadioConfig) {
          const remote = await db.getRadioConfig();
          if (remote) {
            applyConfig(remote);
            return;
          }
        }
      } catch {}
      const local = readConfig();
      if (local) applyConfig(local);
    };
    tryLoad();
  }, []);

  function applyConfig(cfg) {
    setStationName(cfg.name        || 'Nova Radio');
    setDescription(cfg.description || '');
    setPlaylist(cfg.playlist       || []);
  }

  // Auto-fetch YouTube thumbnail when URL changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!addUrl.trim()) { setUrlPreview(null); return; }
    debounceRef.current = setTimeout(() => {
      const thumb = ytThumbnail(addUrl);
      if (thumb && !addCover) setUrlPreview(thumb);
      else setUrlPreview(null);
    }, 600);
  }, [addUrl, addCover]);

  // ── Add track ──────────────────────────────────────────────
  function handleAddTrack() {
    setAddError('');
    if (!addTitle.trim())  { setAddError('Track title is required.'); return; }
    if (!addArtist.trim()) { setAddError('Artist name is required.'); return; }
    if (!addUrl.trim())    { setAddError('Track URL is required.'); return; }

    const autoCover = addCover.trim() || ytThumbnail(addUrl.trim()) || '';

    const track = {
      id:       uid(),
      title:    addTitle.trim(),
      artist:   addArtist.trim(),
      coverUrl: autoCover,
      url:      addUrl.trim(),
    };

    setPlaylist(p => [...p, track]);
    setAddTitle('');
    setAddArtist('');
    setAddCover('');
    setAddUrl('');
    setUrlPreview(null);
  }

  // ── Reorder ────────────────────────────────────────────────
  function handleMove(index, dir) {
    const next = [...playlist];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPlaylist(next);
  }

  // ── Delete ─────────────────────────────────────────────────
  function handleDelete(index) {
    setPlaylist(p => p.filter((_, i) => i !== index));
  }

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    setSaved(false);
    setSaveError(null);

    const config = {
      name:        stationName.trim() || 'Nova Radio',
      description: description.trim(),
      addedBy:     adminUser?.username || 'admin',
      playlist,
      updatedAt:   new Date().toISOString(),
    };

    // Always write to localStorage first (instant, no auth needed)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

    // Try Supabase for cross-device sync
    try {
      const { default: db } = await import('../../services/db');
      if (db.setRadioConfig) {
        await db.setRadioConfig(config);
      }
    } catch (e) {
      // Supabase unavailable — localStorage is the fallback
      console.warn('Radio config saved to localStorage only:', e.message);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Clear all ──────────────────────────────────────────────
  function handleClear() {
    if (!window.confirm('Remove the entire playlist and clear the radio config? This will show "No Playlist" to all users.')) return;
    localStorage.removeItem(CONFIG_KEY);
    setPlaylist([]);
    setStationName('Nova Radio');
    setDescription('');
  }

  const previewThumb = addCover.trim() || urlPreview;

  return (
    <div style={{ maxWidth: 760, padding: '4px 0' }}>

      {/* Station settings */}
      <div style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)', marginBottom: 14 }}>
          📻 Station Info
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Station Name" value={stationName} onChange={setStationName} placeholder="Nova Radio" />
          <Field label="Tagline / Description" value={description} onChange={setDescription} placeholder="Community vibes 24/7" />
        </div>
      </div>

      {/* Current playlist */}
      <div style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)' }}>
            🎵 Playlist · {playlist.length} track{playlist.length !== 1 ? 's' : ''}
          </div>
          {playlist.length > 0 && (
            <button onClick={handleClear}
              style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(255,107,122,0.07)', border: '1px solid rgba(255,107,122,0.25)', color: 'rgba(255,107,122,0.6)', borderRadius: 6, cursor: 'pointer' }}>
              Clear All
            </button>
          )}
        </div>

        {playlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem' }}>
            No tracks yet — add some below
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {playlist.map((t, i) => (
              <TrackRow
                key={t.id || i}
                track={t}
                index={i}
                total={playlist.length}
                onMove={handleMove}
                onDelete={handleDelete}
                isPlaying={false}
                onPlay={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add track form */}
      <div style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(158,165,196,0.4)', marginBottom: 14 }}>
          ➕ Add Track
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* Preview thumbnail */}
          <div style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
            {previewThumb
              ? <img src={previewThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
              : '🎵'
            }
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Track Title *" value={addTitle} onChange={setAddTitle} placeholder="Blinding Lights" />
              <Field label="Artist *" value={addArtist} onChange={setAddArtist} placeholder="The Weeknd" />
            </div>
            <Field
              label="YouTube / Audio URL *"
              value={addUrl}
              onChange={setAddUrl}
              placeholder="https://youtube.com/watch?v=... or https://example.com/track.mp3"
              hint="Supports YouTube links and direct audio file URLs (MP3, OGG, WAV)"
            />
            <Field
              label="Cover Art URL (optional)"
              value={addCover}
              onChange={setAddCover}
              placeholder="https://... — leave blank to auto-use YouTube thumbnail"
            />
          </div>
        </div>

        {addError && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,107,122,0.07)', border: '1px solid rgba(255,107,122,0.25)', borderRadius: 7, color: 'rgba(255,107,122,0.85)', fontSize: '0.82rem' }}>
            ⚠ {addError}
          </div>
        )}

        <button
          onClick={handleAddTrack}
          disabled={!addTitle || !addArtist || !addUrl}
          style={{ marginTop: 14, padding: '10px 24px', background: 'rgba(94,129,244,0.15)', border: '1px solid rgba(94,129,244,0.4)', color: 'var(--color-cyan)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', opacity: (!addTitle || !addArtist || !addUrl) ? 0.4 : 1, transition: 'opacity 0.15s' }}
        >
          + Add to Playlist
        </button>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          style={{ padding: '12px 32px', background: saved ? 'rgba(67,181,129,0.15)' : 'linear-gradient(135deg,rgba(94,129,244,0.3),rgba(200,100,220,0.2))', border: `1px solid ${saved ? 'rgba(67,181,129,0.5)' : 'rgba(94,129,244,0.5)'}`, color: saved ? '#43b581' : 'var(--color-cyan)', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', transition: 'all 0.2s', minHeight: 44 }}
        >
          {saved ? '✓ Saved!' : '💾 Save & Publish Playlist'}
        </button>

        {saveError && (
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,107,122,0.7)' }}>
            ⚠ {saveError}
          </span>
        )}

        <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.35)' }}>
          Changes go live immediately for all users
        </span>
      </div>

      {/* Supabase note */}
      <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 8 }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', lineHeight: 1.6 }}>
          ℹ️ <strong style={{ color: 'rgba(158,165,196,0.6)' }}>Cross-device sync:</strong> To let all users see the playlist (not just the admin's browser), add{' '}
          <code style={{ background: 'rgba(94,129,244,0.12)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>getRadioConfig</code> and{' '}
          <code style={{ background: 'rgba(94,129,244,0.12)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>setRadioConfig</code> to your{' '}
          <code style={{ background: 'rgba(94,129,244,0.12)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>services/db.js</code>.{' '}
          See CHANGES.md for the SQL table and the two method stubs.
        </div>
      </div>
    </div>
  );
};

export default RadioAdminSection;
