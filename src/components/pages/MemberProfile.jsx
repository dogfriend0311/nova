import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadToBlob } from '../../services/blobUpload';
import { TEAMS, SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import { getWatchList } from '../../services/mediaService';
import * as lfm from '../../services/lastfmService';
import { BADGES, getEarnedBadges, syncBadges } from '../../services/achievementsService';
import { BadgeRow } from '../BadgeDisplay';
import './MemberProfile.css';

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', vizta_helper: 'Roblox Baseball Helper', member: 'Member', guest: 'Guest' };
  return map[role] || role || 'Member';
};

const TYPE_ICONS  = { anime: '🎌', movie: '🎬', tv: '📺' };
const SPORT_KEYS  = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];
const DEFAULT_FAV_TEAMS = { mlb: [], nfl: [], nba: [], nhl: [], cfb: [], cbb: [] };

const DEFAULT_PROFILE = {
  bio: '', top_banner_url: '', avatar_url: '', lastfm_username: '',
  twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '',
  discord_tag: '', fav_teams: DEFAULT_FAV_TEAMS,
  fav_games: [],
  // guns.lol-style page customization
  bg_media_url: '', bg_media_type: '', // legacy single-item fields (kept so old profiles still work)
  audio_url: '', audio_title: '',
  bg_media: [],     // [{ id, url, type: 'video'|'image' }] — cycles through, each video loops
  audio_tracks: [], // [{ id, url, title, artist }] — mini radio playlist, loops
  displayed_badges: [], // badge ids (from nova_badge_types) this member has chosen to show next to their name
};

// Old profiles only have the single bg_media_url/audio_url fields. New profiles
// use the arrays. These merge both so nothing old breaks.
export function effectiveBgList(profile) {
  const list = Array.isArray(profile?.bg_media) ? profile.bg_media.filter(b => b?.url) : [];
  if (list.length) return list;
  if (profile?.bg_media_url) return [{ id: 'legacy', url: profile.bg_media_url, type: profile.bg_media_type || 'image' }];
  return [];
}
export function effectiveAudioList(profile) {
  const list = Array.isArray(profile?.audio_tracks) ? profile.audio_tracks.filter(t => t?.url) : [];
  if (list.length) return list;
  if (profile?.audio_url) return [{ id: 'legacy', url: profile.audio_url, title: profile.audio_title || 'Untitled', artist: '' }];
  return [];
}

function _uid() { return Math.random().toString(36).slice(2, 10); }

// ── Roblox URL helpers ────────────────────────────────────────
function parseRobloxPlaceId(input) {
  if (!input) return null;
  const match = input.match(/roblox\.com\/games\/(\d+)/i);
  return match ? match[1] : null;
}

function extractRobloxGameName(url) {
  const match = url.match(/roblox\.com\/games\/\d+\/([^?#\s]+)/i);
  if (match) return decodeURIComponent(match[1].replace(/-/g, ' '));
  return url;
}

// ── Roblox game card — fetches a live thumbnail (the old client-side
// thumbnail URL was a Roblox endpoint that's since been discontinued)
// and links out to the actual game when clicked.
export const RobloxGameCard = ({ placeId, title, note, onRemove }) => {
  const [thumbUrl, setThumbUrl] = useState(null);
  const [failed,   setFailed]   = useState(false);

  useEffect(() => {
    if (!placeId) return;
    let active = true;
    fetch(`/api/roblox-game-thumb?placeId=${encodeURIComponent(placeId)}`)
      .then(res => res.json())
      .then(data => { if (active) { if (data?.thumbnailUrl) setThumbUrl(data.thumbnailUrl); else setFailed(true); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [placeId]);

  return (
    <div style={{ position: 'relative', background: 'rgba(94, 129, 244,0.04)', border: '1px solid rgba(94, 129, 244,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
      <a href={`https://www.roblox.com/games/${placeId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
        {thumbUrl ? (
          <img src={thumbUrl} alt={title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} onError={() => setFailed(true)} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94,129,244,0.08)', fontSize: '1.8rem' }}>
            {failed ? '🎮' : '⏳'}
          </div>
        )}
        <div style={{ padding: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {note && <div style={{ fontSize: '0.7rem', color: 'rgba(158, 165, 196,0.5)', marginTop: '2px', fontStyle: 'italic' }}>"{note}"</div>}
        </div>
      </a>
      {onRemove && (
        <button onClick={onRemove}
          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'rgba(255, 107, 122,0.8)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}>
          x
        </button>
      )}
    </div>
  );
};

// ── Image upload field ────────────────────────────────────────
// Previously this stored images as base64 directly in the profile row.
// That meant every visit to the Members list downloaded every member's
// full-size banner/avatar image data at once (select * on the whole
// table) — a major contributor to slow page loads. Now it uploads to
// Supabase Storage like the background/audio fields do, and only a
// small URL is stored on the profile.
const ImageField = ({ label, fieldKey, value, onChange, username }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(`Image must be under 5 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const ext  = file.name.split('.').pop();
      const path = `image/${username || 'user'}-${Date.now()}-${_uid()}.${ext}`;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 60000));
      const publicUrl = await Promise.race([uploadToBlob(file, path), timeoutPromise]);
      onChange(fieldKey, publicUrl);
    } catch (err) {
      setError(err.message === 'TIMEOUT' ? 'Upload timed out. Try a smaller image or check your connection.' : (err.message || 'Upload failed — check the browser console for details.'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isBase64 = value && value.startsWith('data:');
  const hasImage = !!value;
  return (
    <div className="form-group mp-image-field">
      <label>{label}</label>
      <div className="mp-image-upload-row">
        <input type="text" value={isBase64 ? '' : (value || '')} onChange={(e) => onChange(fieldKey, e.target.value)} placeholder={isBase64 ? '(uploaded file)' : 'Paste image URL…'} style={{ flex: 1 }} />
        <label className="mp-upload-btn" title="Upload from device" style={{ opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : '📁 Upload'}
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
        </label>
        {hasImage && !uploading && <button className="mp-upload-clear" onClick={() => onChange(fieldKey, '')} title="Remove image">✕</button>}
      </div>
      {error && <div style={{ color: '#ff6b7a', fontSize: '0.75rem', marginTop: 4 }}>⚠ {error}</div>}
      {isBase64 && (
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,180,80,0.7)', marginTop: 4 }}>
          This image is stored the old (slower) way — re-upload it to speed up your page for visitors.
        </div>
      )}
      {hasImage && (
        <div className="mp-image-preview-wrap">
          <img src={value} alt="preview" className="mp-image-preview" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
};

// ── Shared upload helper (guns.lol-style backgrounds/audio) ───
// These files can be large, so they upload straight to Vercel Blob
// storage (browser → Blob directly, bypassing serverless body limits)
// and only the resulting URL is saved on the profile.
async function uploadMemberMedia(file, kind, username) {
  const isVideo = file.type?.startsWith('video');
  const maxMb = isVideo ? 40 : 15;
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`File must be under ${maxMb} MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  }
  const ext  = file.name.split('.').pop();
  const path = `${kind}/${username || 'user'}-${Date.now()}-${_uid()}.${ext}`;

  // Vercel Blob's client SDK has no built-in timeout — on a stalled
  // connection the upload can hang indefinitely with no error. Race it
  // against a timeout so the user always gets feedback instead of a
  // silent stall.
  //
  // The timeout scales with file size (min 60s) instead of being flat.
  // A flat 60s was firing on legitimately-slow-but-working uploads of
  // large video/audio files — Promise.race doesn't cancel the real
  // upload, so it kept going in the background and finished moments
  // after the user was shown an error, silently wasting the upload
  // since its URL was never attached to the profile.
  const mb = file.size / (1024 * 1024);
  const timeoutMs = Math.max(60000, mb * 2500);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs));

  let publicUrl;
  try {
    publicUrl = await Promise.race([uploadToBlob(file, path), timeoutPromise]);
  } catch (err) {
    if (err.message === 'TIMEOUT') throw err;
    console.error('member-media upload error:', err);
    throw new Error(err.message || 'Upload failed — check the browser console for details.');
  }

  return { publicUrl, isVideo };
}

// ── Multiple background uploads (video/image) — cycles through them ──
const MultiBgUploadField = ({ username, list, onChange, hint }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { publicUrl, isVideo } = await uploadMemberMedia(file, 'bg', username);
      onChange([...list, { id: _uid(), url: publicUrl, type: isVideo ? 'video' : 'image' }]);
    } catch (err) {
      setError(err.message === 'TIMEOUT' ? 'Upload is taking a long time and may have stalled — check your connection. If it does complete, it may not be attached to your profile; try again in a moment.' : err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (id) => onChange(list.filter(b => b.id !== id));

  return (
    <div className="form-group mp-image-field">
      <label>Page Backgrounds (video or image — add as many as you want)</label>
      {hint && <small style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.75rem', display: 'block', marginBottom: 6 }}>{hint}</small>}
      <div className="mp-image-upload-row">
        <label className="mp-upload-btn" title="Add a background" style={{ opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : '📁 Add Background'}
          <input ref={inputRef} type="file" accept="video/*,image/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>
      {error && <div style={{ color: '#ff6b7a', fontSize: '0.75rem', marginTop: 4 }}>⚠ {error}</div>}
      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {list.map((b, i) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 6 }}>
              <span style={{ fontSize: '0.9rem' }}>{b.type === 'video' ? '🎬' : '🖼️'}</span>
              <span style={{ flex: 1, fontSize: '0.78rem', color: 'rgba(158,165,196,0.6)' }}>
                Background {i + 1} ({b.type})
              </span>
              <button onClick={() => remove(b.id)} style={{ background: 'none', border: 'none', color: '#ff6b7a', cursor: 'pointer', fontSize: '0.85rem' }}>✕ Remove</button>
            </div>
          ))}
          {list.length > 1 && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.4)' }}>
              These will cycle on your page, looping through each one.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Multiple audio uploads — mini radio playlist with title/artist ──
const MultiAudioUploadField = ({ username, list, onChange, hint }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { publicUrl } = await uploadMemberMedia(file, 'audio', username);
      const base = file.name.replace(/\.[^/.]+$/, '');
      onChange([...list, { id: _uid(), url: publicUrl, title: base, artist: '' }]);
    } catch (err) {
      setError(err.message === 'TIMEOUT' ? 'Upload is taking a long time and may have stalled — check your connection. If it does complete, it may not be attached to your profile; try again in a moment.' : err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (id) => onChange(list.filter(t => t.id !== id));
  const updateField = (id, key, val) => onChange(list.map(t => t.id === id ? { ...t, [key]: val } : t));

  return (
    <div className="form-group mp-image-field">
      <label>Profile Audio (add as many tracks as you want — they'll loop like a mini radio)</label>
      {hint && <small style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.75rem', display: 'block', marginBottom: 6 }}>{hint}</small>}
      <div className="mp-image-upload-row">
        <label className="mp-upload-btn" title="Add a track" style={{ opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : '📁 Add Track'}
          <input ref={inputRef} type="file" accept="audio/*" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>
      {error && <div style={{ color: '#ff6b7a', fontSize: '0.75rem', marginTop: 4 }}>⚠ {error}</div>}
      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {list.map((t, i) => (
            <div key={t.id} style={{ padding: '8px 10px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.35)', width: 16 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)' }}>🎵 Uploaded</span>
                <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: '#ff6b7a', cursor: 'pointer', fontSize: '0.85rem' }}>✕ Remove</button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={t.title} onChange={(e) => updateField(t.id, 'title', e.target.value)} placeholder="Song title" style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 5 }} />
                <input value={t.artist} onChange={(e) => updateField(t.id, 'artist', e.target.value)} placeholder="Artist" style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 5 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TeamSelector = ({ favTeams, onChange }) => {
  const [activeSport, setActiveSport] = useState('mlb');
  const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(activeSport);
  const toggle = (sport, abbr) => {
    const current = favTeams[sport] || [];
    const next    = current.includes(abbr) ? current.filter((a) => a !== abbr) : [...current, abbr];
    onChange({ ...favTeams, [sport]: next });
  };
  return (
    <div className="mp-team-selector">
      <div className="mp-sport-tabs">
        {SPORT_KEYS.map((s) => {
          const count = (favTeams[s] || []).length;
          return (
            <button key={s} className={`mp-sport-tab ${activeSport === s ? 'active' : ''}`} onClick={() => setActiveSport(s)}>
              <span>{SPORT_ICONS[s]}</span><span>{SPORT_SHORT[s]}</span>
              {count > 0 && <span className="mp-sport-count">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="mp-team-grid">
        {Object.entries(TEAMS[activeSport] || {}).map(([div, teams]) => (
          <div key={div} className="mp-team-division">
            <div className="mp-div-label">{div}</div>
            <div className="mp-team-row">
              {teams.map((t) => {
                const selected = (favTeams[activeSport] || []).includes(t.abbr);
                const logo     = hasLogos ? getTeamLogoUrl(activeSport, t.abbr) : null;
                return (
                  <button key={t.abbr} className={`mp-team-btn ${selected ? 'selected' : ''}`} onClick={() => toggle(activeSport, t.abbr)} title={t.name}>
                    {logo && <img src={logo} alt="" className="mp-team-logo" onError={(e) => { e.target.style.display = 'none'; }} />}
                    {t.abbr}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Fav Teams Display ─────────────────────────────────────────
const FavTeamsDisplay = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div className="discord-section">
      <div className="discord-section-title">★ Favorite Teams</div>
      {SPORT_KEYS.map((sport) => {
        const picked   = favTeams?.[sport] || [];
        if (!picked.length) return null;
        const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(sport);
        return (
          <div key={sport} className="mp-fav-sport-row">
            <span className="mp-fav-sport-label">{SPORT_ICONS[sport]} {SPORT_SHORT[sport]}</span>
            <div className="mp-fav-teams">
              {picked.map((abbr) => {
                const logo = hasLogos ? getTeamLogoUrl(sport, abbr) : null;
                return (
                  <span key={abbr} className="mp-fav-team-badge">
                    {logo && <img src={logo} alt="" className="mp-badge-logo" onError={(e) => { e.target.style.display = 'none'; }} />}
                    {abbr}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Watch List Preview ────────────────────────────────────────
const WatchListPreview = ({ username }) => {
  const list = getWatchList(username);
  if (!list.length) return null;
  const pinned   = list.filter((i) => i.pinned);
  const watched  = list.filter((i) => i.status === 'watched').length;
  const watching = list.filter((i) => i.status === 'watching').length;
  const plan     = list.filter((i) => i.status === 'plan').length;
  return (
    <div className="discord-section">
      <div className="discord-section-title">🎬 Watch List</div>
      <div className="mp-wl-stats">
        <span className="mp-wl-stat"><span style={{ color: '#a5d6a7' }}>✓</span> {watched} watched</span>
        <span className="mp-wl-stat"><span style={{ color: '#66bb6a' }}>▶</span> {watching} watching</span>
        <span className="mp-wl-stat"><span style={{ color: '#64b5f6' }}>📋</span> {plan} planned</span>
      </div>
      {pinned.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', color: 'rgba(158, 165, 196,0.35)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '10px', marginBottom: '8px' }}>
            📌 Pinned
          </div>
          <div className="mp-pinned-grid">
            {pinned.slice(0, 6).map((item) => (
              <div key={item.id} className="mp-pinned-card" title={item.title}>
                {item.poster ? <img src={item.poster} alt={item.title} /> : <div className="mp-pinned-ph">{TYPE_ICONS[item.type] || '?'}</div>}
                {item.rating != null && <div className="mp-pinned-rating">★{item.rating}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Last.fm Widget ────────────────────────────────────────────
const LastFmWidget = ({ lastfmUsername }) => {
  const [track, setTrack] = useState(undefined);

  useEffect(() => {
    if (!lastfmUsername || !lfm.hasApiKey()) { setTrack(null); return; }
    let active = true;
    const poll = async () => {
      const t = await lfm.getNowPlaying(lastfmUsername);
      if (active) setTrack(t);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [lastfmUsername]);

  if (!lastfmUsername || !lfm.hasApiKey() || track === null || track === undefined) return null;

  return (
    <div className="discord-section">
      <div className="discord-section-title-row">
        <span className="discord-section-title">
          {track.isPlaying ? '🎵 Now Playing' : '🎵 Last Scrobbled'}
        </span>
        <a className="lfm-mini-link" href={track.userUrl} target="_blank" rel="noreferrer">Last.fm →</a>
      </div>
      <a className={`sp-track ${track.isPlaying ? 'playing' : 'paused'}`} href={track.trackUrl || '#'} target="_blank" rel="noreferrer" style={{ '--sp-color': '#d51007' }}>
        {track.albumArt
          ? <img className="sp-art" src={track.albumArt} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          : <div className="sp-art sp-art-placeholder">🎵</div>}
        <div className="sp-info">
          <div className="sp-track-name">{track.trackName}</div>
          <div className="sp-artist-name">{track.artistName}</div>
          <div className="sp-status" style={{ color: track.isPlaying ? '#d51007' : undefined }}>
            {track.isPlaying
              ? <><span className="sp-pulse" style={{ background: '#d51007' }} /> Playing</>
              : <span style={{ color: 'rgba(158, 165, 196,0.4)' }}>Last played</span>}
          </div>
        </div>
      </a>
    </div>
  );
};

// ── Full-page background media (guns.lol style) — cycles through
// multiple backgrounds if more than one was uploaded. Each video loops
// while it's showing; every ~20s it crossfades to the next one.
export const ProfileBackground = ({ list }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [list?.length]);
  useEffect(() => {
    if (!list || list.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % list.length), 20000);
    return () => clearInterval(id);
  }, [list]);

  if (!list || list.length === 0) return null;
  const current = list[idx];
  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: -1,
    background: 'linear-gradient(180deg, rgba(10,13,26,0.55) 0%, rgba(10,13,26,0.75) 60%, rgba(10,13,26,0.92) 100%)',
  };
  const mediaWrapStyle = { position: 'fixed', inset: 0, zIndex: -2, overflow: 'hidden' };
  return (
    <div aria-hidden="true">
      <div style={mediaWrapStyle}>
        <div key={current.id} style={{ width: '100%', height: '100%', animation: 'novaBgFade 1s ease' }}>
          {current.type === 'video' ? (
            <video
              src={current.url} autoPlay muted loop playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img src={current.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
          )}
        </div>
      </div>
      <div style={overlayStyle} />
      <style>{`@keyframes novaBgFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};

// ── Mini radio — profile audio playlist with skip/back/play, track name
// + artist, and a LIVE indicator. Autoplay-with-click-to-enable fallback
// since browsers block unmuted autoplay until the visitor interacts.
export const ProfileAudioPlayer = ({ list }) => {
  const audioRef = useRef(null);
  const [idx, setIdx]         = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen]       = useState(false);

  const track = list?.[idx];

  useEffect(() => { setIdx(0); }, [list?.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.url) return;
    audio.volume = 0.5;
    audio.play().then(() => { setPlaying(true); setBlocked(false); }).catch(() => setBlocked(true));
  }, [track?.url]);

  if (!list || list.length === 0) return null;

  const enable = () => {
    audioRef.current?.play().then(() => { setPlaying(true); setBlocked(false); setOpen(true); }).catch(() => {});
  };
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };
  const next = () => setIdx(i => (i + 1) % list.length);
  const prev = () => setIdx(i => (i - 1 + list.length) % list.length);

  if (blocked) {
    return (
      <>
        <audio ref={audioRef} src={track?.url} />
        <button onClick={enable} style={{
          position: 'fixed', bottom: 18, right: 18, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 16px', borderRadius: 999, minHeight: 44,
          background: 'rgba(94,129,244,0.9)', color: '#fff', border: 'none',
          fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          🔊 Click for sound{track?.title ? ` — ${track.title}` : ''}
        </button>
      </>
    );
  }

  return (
    <>
      <audio ref={audioRef} src={track?.url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={next} />
      <div style={{
        position: 'fixed', bottom: 18, right: 18, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(16,20,34,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: open ? 14 : 999,
        padding: open ? '10px 12px' : '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        maxWidth: open ? 240 : undefined, transition: 'border-radius 0.2s',
      }}>
        {!open ? (
          <button onClick={() => setOpen(true)} title="Open mini radio" style={{
            width: 34, height: 34, borderRadius: '50%', background: 'rgba(94,129,244,0.25)',
            border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer',
          }}>📻</button>
        ) : (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                {playing && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.58rem', fontWeight: 800, color: '#ff4d4d', letterSpacing: '0.05em' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff4d4d', animation: 'novaLivePulse 1.2s ease-in-out infinite', display: 'inline-block' }} />
                    LIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track?.title || 'Untitled'}
              </div>
              {track?.artist && (
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.artist}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {list.length > 1 && (
                <button onClick={prev} title="Back" style={{ width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>⏮</button>
              )}
              <button onClick={togglePlay} title={playing ? 'Pause' : 'Play'} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(94,129,244,0.3)', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                {playing ? '⏸' : '▶'}
              </button>
              {list.length > 1 && (
                <button onClick={next} title="Skip" style={{ width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>⏭</button>
              )}
              <button onClick={() => setOpen(false)} title="Minimize" style={{ width: 24, height: 24, borderRadius: '50%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', cursor: 'pointer', marginLeft: 2 }}>✕</button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes novaLivePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }`}</style>
    </>
  );
};

// ── Roblox link card — shown on a member's page once they've linked
// their account via the Roblox Tracker. Fetches live stats each time
// the page loads (same serverless endpoint the tracker itself uses).
export const RobloxLinkCard = ({ username }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!username) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`/api/roblox-lookup?username=${encodeURIComponent(username)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(result => { if (active) { setData(result); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [username]);

  if (!username || error) return null;

  return (
    <div className="neon-card p-3" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      {loading ? (
        <div style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>Loading Roblox stats…</div>
      ) : (
        <>
          {data?.avatar && (
            <img src={data.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              🎮 Roblox
            </div>
            <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '0.92rem' }}>{data?.displayName || username}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)' }}>
              @{data?.username || username}
              {data?.friendCount != null && ` · ${data.friendCount.toLocaleString()} friends`}
              {data?.badgeCount != null && ` · ${data.badgeCount}+ badges`}
            </div>
          </div>
          {data?.id && (
            <a href={`https://www.roblox.com/users/${data.id}/profile`} target="_blank" rel="noopener noreferrer"
              style={{ flexShrink: 0, fontSize: '0.78rem', color: 'var(--color-cyan)', textDecoration: 'none', fontWeight: 600 }}>
              View →
            </a>
          )}
        </>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Main MemberProfile
// ══════════════════════════════════════════════════════════════
const MemberProfile = () => {
  const { user } = useAuth();
  const [profile,      setProfile]     = useState(null);
  const [editing,      setEditing]     = useState(false);
  const [activeTab,    setActiveTab]   = useState('badges');
  const [formData,     setFormData]    = useState({});
  const [favTab,       setFavTab]      = useState(false);
  const [presence,     setPresence]    = useState(() => localStorage.getItem(`nova_presence_${user?.username}`) || 'online');
  const [coins,        setCoins]       = useState(() => parseInt(localStorage.getItem(`nova_coins_${user?.username}`) || '0'));
  const [copied,       setCopied]      = useState(false);
  const coinsRef = useRef(null);

  // Admin-assigned profile badges (created/assigned by owners & co-founders)
  const [badgeTypes,      setBadgeTypes]      = useState([]);
  const [assignedBadgeIds, setAssignedBadgeIds] = useState([]);

  // fav games — synced to Supabase profile
  const [favGames,     setFavGames]    = useState([]);
  const [showAddGame,  setShowAddGame] = useState(false);
  const [newGameNote,  setNewGameNote] = useState('');
  const addGameInputRef = useRef(null);

  // Earn 1 coin every 2 minutes while on the page
  useEffect(() => {
    if (!user?.username) return;
    coinsRef.current = setInterval(() => {
      setCoins(prev => {
        const next = prev + 1;
        localStorage.setItem(`nova_coins_${user.username}`, next);
        return next;
      });
    }, 120000);
    return () => clearInterval(coinsRef.current);
  }, [user]);

  const changePresence = (p) => {
    setPresence(p);
    localStorage.setItem(`nova_presence_${user?.username}`, p);
  };

  // ── Load this member's assigned badges + the full badge catalog ──
  useEffect(() => {
    if (!user?.username) return;
    import('../../services/db').then(({ default: db }) => {
      Promise.all([db.getBadgeTypes(), db.getMemberBadges(user.username)])
        .then(([types, assignments]) => {
          setBadgeTypes(types || []);
          setAssignedBadgeIds((assignments || []).map(a => String(a.badge_id)));
        })
        .catch(() => {});
    });
  }, [user]);

  // ── Load profile from Supabase ────────────────────────────
  useEffect(() => {
    if (!user?.username) return;
    import('../../services/db').then(({ default: db }) => {
      db.getMemberProfiles().then(profiles => {
        const found = profiles.find(p => p.username === user.username);
        if (!found) {
          const lsProfiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
          const lsFound    = lsProfiles.find(p => p.username === user.username);
          const p = { ...DEFAULT_PROFILE, username: user.username, ...(lsFound || {}), fav_teams: { ...DEFAULT_FAV_TEAMS, ...(lsFound?.fav_teams || {}) }, fav_games: lsFound?.fav_games || [] };
          p.bg_media = effectiveBgList(p); p.audio_tracks = effectiveAudioList(p);
          setProfile(p); setFormData(p);
          // Seed fav_games from localStorage
          const lsGames = JSON.parse(localStorage.getItem(`nova_favgames_${user.username}`) || '[]');
          setFavGames(p.fav_games.length > 0 ? p.fav_games : lsGames);
          if (lsFound) db.saveMemberProfile(p).catch(() => {});
        } else {
          const p = { ...DEFAULT_PROFILE, ...found, fav_teams: { ...DEFAULT_FAV_TEAMS, ...(found.fav_teams || {}) }, fav_games: found.fav_games || [] };
          p.bg_media = effectiveBgList(p); p.audio_tracks = effectiveAudioList(p);
          setProfile(p); setFormData(p);
          // Prefer Supabase fav_games; fall back to localStorage
          const supaGames = found.fav_games || [];
          const lsGames   = JSON.parse(localStorage.getItem(`nova_favgames_${user.username}`) || '[]');
          setFavGames(supaGames.length > 0 ? supaGames : lsGames);
        }
      }).catch(() => {
        const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
        const found    = profiles.find(p => p.username === user.username);
        const p = { ...DEFAULT_PROFILE, username: user.username, ...(found || {}), fav_teams: { ...DEFAULT_FAV_TEAMS, ...(found?.fav_teams || {}) }, fav_games: found?.fav_games || [] };
          p.bg_media = effectiveBgList(p); p.audio_tracks = effectiveAudioList(p);
        setProfile(p); setFormData(p);
        const lsGames = JSON.parse(localStorage.getItem(`nova_favgames_${user.username}`) || '[]');
        setFavGames(p.fav_games.length > 0 ? p.fav_games : lsGames);
      });
    });
  }, [user]);

  // ── Save helpers ──────────────────────────────────────────
  const handleField = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const [saveError, setSaveError] = useState('');

  const handleSave = () => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const idx = profiles.findIndex((p) => p.username === user?.username);
    if (idx !== -1) profiles[idx] = formData; else profiles.push(formData);
    localStorage.setItem('member_profiles', JSON.stringify(profiles));
    setSaveError('');
    import('../../services/db').then(({ default: db }) => {
      db.saveMemberProfile(formData).catch((err) => {
        console.error('Profile save failed:', err);
        setSaveError(
          "Couldn't save to the server (saved on this device only — other visitors won't see your changes). " +
          "This usually means a database column is missing. Check the browser console for details, or ask an admin to run the setup SQL."
        );
      });
    });
    setProfile(formData);
    setEditing(false);
    setFavTab(false);
  };

  // ── Fav games helpers ─────────────────────────────────────
  const persistFavGames = (updated) => {
    setFavGames(updated);
    localStorage.setItem(`nova_favgames_${user?.username}`, JSON.stringify(updated));
    // Sync to Supabase profile for cross-device visibility
    const cur = profile || { username: user?.username };
    import('../../services/db').then(({ default: db }) => {
      db.saveMemberProfile({ ...cur, fav_games: updated }).catch(() => {});
    });
  };

  const addFavGame = (gameText, isRoblox = false) => {
    if (!gameText.trim()) return;
    const placeId     = isRoblox ? parseRobloxPlaceId(gameText) : null;
    const displayText = placeId ? extractRobloxGameName(gameText) : gameText.trim();
    const newG = {
      id:       Date.now().toString(),
      text:     displayText,
      placeId:  placeId || null,
      note:     newGameNote,
      date:     new Date().toLocaleDateString(),
    };
    persistFavGames([...favGames, newG]);
    setNewGameNote('');
    setShowAddGame(false);
    if (addGameInputRef.current) addGameInputRef.current.value = '';
  };

  const removeFavGame = (id) => {
    persistFavGames(favGames.filter(g => g.id !== id));
  };

  const shareProfile = () => {
    // Path-based URL (not #hash) so Discord/iMessage/Slack/etc bots can
    // fetch it and see this specific person's name/team via the
    // /api/preview-member serverless function. Real visitors get an
    // instant redirect into the actual app.
    const url = `${window.location.origin}/members/${user?.username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // ── Edit mode ─────────────────────────────────────────────
  if (!profile) return <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(158, 165, 196,0.4)' }}>Loading…</div>;

  if (editing) {
    return (
      <div className="page discord-edit-page">
        <div className="page-header">
          <h1 className="gradient-text">Edit Profile</h1>
          <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
        </div>
        <div className="mp-edit-tabs">
          <button className={`sh-sub-tab ${!favTab ? 'active' : ''}`} onClick={() => setFavTab(false)}>👤 Profile</button>
          <button className={`sh-sub-tab ${favTab ? 'active' : ''}`} onClick={() => setFavTab(true)}>★ Favorite Teams</button>
        </div>
        {!favTab ? (
          <div className="neon-card p-3">
            <ImageField label="Banner Image"          fieldKey="top_banner_url" value={formData.top_banner_url || ''} onChange={handleField} username={user?.username} />
            <ImageField label="Avatar / Profile Pic"  fieldKey="avatar_url"     value={formData.avatar_url || ''}     onChange={handleField} username={user?.username} />

            <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Badges</h4>
            {assignedBadgeIds.length === 0 ? (
              <p style={{ color: 'rgba(158, 165, 196,0.4)', fontSize: '0.82rem', marginBottom: '16px' }}>
                No badges have been assigned to you yet. Owners and co-founders can assign badges from the dashboard.
              </p>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'rgba(158, 165, 196,0.5)', fontSize: '0.82rem', marginBottom: '10px' }}>
                  Pick which of your badges show up next to your name.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {badgeTypes.filter(b => assignedBadgeIds.includes(String(b.id))).map(b => {
                    const checked = (formData.displayed_badges || []).map(String).includes(String(b.id));
                    return (
                      <label key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                        padding: '6px 12px', borderRadius: '20px',
                        border: `1px solid ${checked ? (b.color || '#5e81f4') : 'rgba(94,129,244,0.2)'}`,
                        background: checked ? `${b.color || '#5e81f4'}18` : 'transparent',
                        fontSize: '0.82rem', color: checked ? (b.color || '#5e81f4') : 'rgba(158,165,196,0.6)',
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = (formData.displayed_badges || []).map(String);
                            const next = e.target.checked
                              ? [...cur, String(b.id)]
                              : cur.filter(id => id !== String(b.id));
                            setFormData({ ...formData, displayed_badges: next });
                          }}
                          style={{ margin: 0 }}
                        />
                        <span>{b.icon}</span> {b.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Page Customization</h4>
            <MultiBgUploadField
              username={user?.username}
              list={formData.bg_media || []}
              onChange={(list) => setFormData(prev => ({ ...prev, bg_media: list }))}
              hint="Shows behind your whole profile, like a guns.lol page. Video loops muted; under 40MB each."
            />
            <MultiAudioUploadField
              username={user?.username}
              list={formData.audio_tracks || []}
              onChange={(list) => setFormData(prev => ({ ...prev, audio_tracks: list }))}
              hint="Plays for visitors to your page like a mini radio. Under 15MB each. Admins can remove tracks from the Owner Dashboard if something's inappropriate."
            />
            <div className="form-group">
              <label>About Me</label>
              <textarea rows="4" value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself…" />
            </div>
            <div className="form-group">
              <label>Discord Tag</label>
              <input type="text" value={formData.discord_tag || ''} onChange={(e) => setFormData({ ...formData, discord_tag: e.target.value })} placeholder="username#0000" />
            </div>
            <div className="form-group">
              <label>Last.fm Username</label>
              <input type="text" value={formData.lastfm_username || ''} onChange={(e) => setFormData({ ...formData, lastfm_username: e.target.value })} placeholder="your-lastfm-username" />
              <small style={{ color: 'rgba(158, 165, 196,0.4)', fontSize: '0.75rem' }}>Shows your now-playing track. Free at last.fm</small>
            </div>
            <div className="form-group">
              <label>Spotify URL</label>
              <input type="text" value={formData.spotify_url || ''} onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })} placeholder="https://open.spotify.com/track/..." />
            </div>
            <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Socials</h4>
            {[
              { key: 'twitter_url',   label: 'Twitter URL'   },
              { key: 'twitch_url',    label: 'Twitch URL'    },
              { key: 'youtube_url',   label: 'YouTube URL'   },
              { key: 'instagram_url', label: 'Instagram URL' },
            ].map(({ key, label }) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type="text" value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} placeholder="https://…" />
              </div>
            ))}
            <div className="form-actions">
              <button className="neon-button" onClick={handleSave}>Save Profile</button>
              <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="neon-card p-3">
            <p style={{ color: 'rgba(158, 165, 196,0.5)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Pick your favorite teams. You can select multiple per sport.
            </p>
            <TeamSelector
              favTeams={formData.fav_teams || DEFAULT_FAV_TEAMS}
              onChange={(ft) => setFormData({ ...formData, fav_teams: ft })}
            />
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button className="neon-button" onClick={handleSave}>Save</button>
              <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── View mode ─────────────────────────────────────────────
  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: '🐦' },
    { key: 'twitch_url',    label: 'Twitch',    icon: '🎮' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶️' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸' },
  ].filter((s) => profile[s.key]);

  const TABS = [
    { id: 'badges',      label: '🏅 Badges'    },
    { id: 'music',       label: 'Music'        },
    { id: 'favgames',    label: 'Fav Games'    },
    { id: 'robloxgames', label: 'Roblox Games' },
    { id: 'teams',       label: 'Teams'        },
    { id: 'watchlist',   label: 'Watch List'   },
  ];

  const SI = { padding: '10px', background: 'rgba(94, 129, 244,0.05)', border: '1px solid rgba(94, 129, 244,0.2)', color: '#e2e5f0', borderRadius: '6px', width: '100%', marginBottom: '8px' };

  return (
    <div className="tw-page">
      {saveError && (
        <div style={{
          position: 'relative', zIndex: 10, margin: '12px', padding: '10px 14px',
          background: 'rgba(255,107,122,0.1)', border: '1px solid rgba(255,107,122,0.35)',
          borderRadius: 8, color: '#ff8a96', fontSize: '0.82rem', lineHeight: 1.5,
        }}>
          ⚠ {saveError}
          <button onClick={() => setSaveError('')} style={{ marginLeft: 10, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Custom page background — guns.lol style */}
      <ProfileBackground list={effectiveBgList(profile)} />
      <ProfileAudioPlayer list={effectiveAudioList(profile)} />

      {/* Banner */}
      <div className="tw-banner" style={{ backgroundImage: profile.top_banner_url ? `url(${profile.top_banner_url})` : undefined }}>
        <div className="tw-avatar-wrap">
          <div className="tw-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" /> : '🚀'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="tw-action-row">
        <button className="neon-button" onClick={() => setEditing(true)}>Edit Profile</button>
        <button
          className="neon-button"
          onClick={shareProfile}
          style={{ fontSize: '0.82rem', padding: '8px 14px', borderColor: copied ? '#00ff88' : 'rgba(94, 129, 244,0.3)', color: copied ? '#00ff88' : 'rgba(158, 165, 196,0.7)' }}
        >
          {copied ? '✓ Copied!' : '🔗 Share Profile'}
        </button>
      </div>

      {/* Info */}
      <div className="tw-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h2 className="tw-name">{profile.username}</h2>
          <BadgeRow
            badgeTypes={badgeTypes}
            ids={(profile.displayed_badges || []).filter(id => assignedBadgeIds.includes(String(id)))}
            size={16}
          />
          <span className={`tw-role-badge ${user?.role || 'member'}`}>{roleLabel(user?.role)}</span>
        </div>
        <p className="tw-handle">@{profile.username}</p>

        {/* Presence toggle */}
        <div className="tw-status-row">
          {[
            { key: 'online',  label: 'Online',          color: '#43b581' },
            { key: 'idle',    label: 'Do Not Disturb',  color: '#f04747' },
            { key: 'offline', label: 'Invisible',        color: '#747f8d' },
          ].map(({ key, label, color }) => (
            <button key={key} className="tw-presence-btn"
              onClick={() => changePresence(key)}
              style={{ borderColor: presence === key ? color : 'rgba(100,120,200,0.2)', color: presence === key ? color : 'rgba(158, 165, 196,0.4)', background: presence === key ? `${color}18` : 'transparent' }}>
              <span className="tw-presence-dot" style={{ background: presence === key ? color : 'rgba(100,120,200,0.3)' }} />
              {label}
            </button>
          ))}
          <div className="tw-coins">
            <span>Coins:</span>
            <span>{coins.toLocaleString()}</span>
          </div>
        </div>

        {profile.bio && <p className="tw-bio">{profile.bio}</p>}

        {profile.roblox_username && <RobloxLinkCard username={profile.roblox_username} />}

        {socials.length > 0 && (
          <div className="tw-socials">
            {socials.map(s => (
              <a key={s.key} href={profile[s.key]} target="_blank" rel="noreferrer" className="tw-social-link">
                {s.icon} {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tw-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tw-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tw-feed">

        {/* BADGES */}
        {activeTab === 'badges' && (() => {
          const earnedIds = new Set(getEarnedBadges(user?.username));
          syncBadges(user?.username, { profile, coins });
          const earned   = BADGES.filter(b => earnedIds.has(b.id));
          const locked   = BADGES.filter(b => !earnedIds.has(b.id));
          return (
            <div className="tw-section">
              <div className="tw-section-title">Earned Badges ({earned.length}/{BADGES.length})</div>
              {earned.length === 0
                ? <div className="tw-empty">No badges yet — keep playing!</div>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                    {earned.map(b => (
                      <div key={b.id} title={b.desc} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 999,
                        border: `1px solid ${b.color}55`, background: `${b.color}12`,
                        color: b.color, fontSize: '0.85rem', fontWeight: 700,
                        transition: 'transform 0.15s', cursor: 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = ''}>
                        <span style={{ fontSize: '1.1rem' }}>{b.emoji}</span>
                        {b.name}
                      </div>
                    ))}
                  </div>
              }
              {locked.length > 0 && (
                <>
                  <div className="tw-section-title" style={{ marginTop: 20 }}>Locked ({locked.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                    {locked.map(b => (
                      <div key={b.id} title={b.desc} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 999,
                        border: '1px solid rgba(94,129,244,0.12)', background: 'rgba(94,129,244,0.04)',
                        color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem', fontWeight: 600,
                        filter: 'grayscale(1)', opacity: 0.5, cursor: 'default',
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>🔒</span>
                        {b.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* MUSIC */}
        {activeTab === 'music' && (
          <div className="tw-section">
            <LastFmWidget lastfmUsername={profile.lastfm_username} />
            {profile.spotify_url && (
              <>
                <div className="tw-section-title" style={{ marginTop: '16px' }}>Spotify</div>
                <iframe
                  src={profile.spotify_url.includes('/embed/') ? profile.spotify_url : profile.spotify_url.replace('open.spotify.com/', 'open.spotify.com/embed/')}
                  width="100%" height="80" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  title="Spotify" style={{ borderRadius: '10px', display: 'block' }}
                />
              </>
            )}
            {!profile.lastfm_username && !profile.spotify_url && (
              <div className="tw-empty">No music linked. Edit your profile to add Last.fm or Spotify.</div>
            )}
          </div>
        )}

        {/* FAV GAMES — sports / baseball events only */}
        {activeTab === 'favgames' && (
          <div className="tw-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="tw-section-title" style={{ margin: 0 }}>Favorite Games</div>
              <button className="neon-button" style={{ padding: '5px 14px', fontSize: '0.8rem' }} onClick={() => setShowAddGame(s => !s)}>
                {showAddGame ? 'Cancel' : '+ Add Game'}
              </button>
            </div>

            {showAddGame && (
              <div style={{ marginBottom: '16px', padding: '14px', background: 'rgba(94, 129, 244,0.04)', borderRadius: '10px', border: '1px solid rgba(94, 129, 244,0.12)' }}>
                <input
                  ref={addGameInputRef}
                  type="text"
                  placeholder="Game or event name (e.g. Yankees vs Red Sox, April 20)"
                  style={SI}
                  onKeyDown={(e) => { if (e.key === 'Enter') addFavGame(e.target.value, false); }}
                />
                <input
                  type="text"
                  placeholder="Why is it your favorite? (optional)"
                  value={newGameNote}
                  onChange={(e) => setNewGameNote(e.target.value)}
                  style={SI}
                />
                <button className="neon-button" style={{ width: '100%' }} onClick={() => {
                  if (addGameInputRef.current) addFavGame(addGameInputRef.current.value, false);
                }}>Add to Favorites</button>
              </div>
            )}

            {favGames.filter(g => !g.placeId).length === 0 ? (
              <div className="tw-empty">No favorite games yet. Add your most memorable games or events!</div>
            ) : (
              favGames.filter(g => !g.placeId).map(g => (
                <div key={g.id} className="tw-fav-game">
                  <div className="tw-fav-game-title">{g.text}</div>
                  {g.note && <div className="tw-fav-game-note">"{g.note}"</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="tw-fav-game-meta">{g.date}</span>
                    <button className="tw-fav-game-remove" onClick={() => removeFavGame(g.id)}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ROBLOX GAMES — Roblox links with thumbnails */}
        {activeTab === 'robloxgames' && (
          <div className="tw-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="tw-section-title" style={{ margin: 0 }}>Favorite Roblox Games</div>
              <button className="neon-button" style={{ padding: '5px 14px', fontSize: '0.8rem' }} onClick={() => setShowAddGame(s => !s)}>
                {showAddGame ? 'Cancel' : '+ Add Game'}
              </button>
            </div>

            {showAddGame && (
              <div style={{ marginBottom: '16px', padding: '14px', background: 'rgba(94, 129, 244,0.04)', borderRadius: '10px', border: '1px solid rgba(94, 129, 244,0.12)' }}>
                <input
                  ref={addGameInputRef}
                  type="text"
                  placeholder="Paste a Roblox game URL (e.g. roblox.com/games/12345)"
                  style={SI}
                  onKeyDown={(e) => { if (e.key === 'Enter') addFavGame(e.target.value, true); }}
                />
                <input
                  type="text"
                  placeholder="Why is it your favorite? (optional)"
                  value={newGameNote}
                  onChange={(e) => setNewGameNote(e.target.value)}
                  style={SI}
                />
                <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'rgba(158, 165, 196,0.4)' }}>
                  Paste a Roblox game URL to auto-fetch its thumbnail.
                </p>
                <button className="neon-button" style={{ width: '100%' }} onClick={() => {
                  if (addGameInputRef.current) addFavGame(addGameInputRef.current.value, true);
                }}>Add Roblox Game</button>
              </div>
            )}

            {favGames.filter(g => g.placeId).length === 0 ? (
              <div className="tw-empty">No Roblox games yet. Paste a Roblox game URL to add one!</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {favGames.filter(g => g.placeId).map(g => (
                  <RobloxGameCard key={g.id} placeId={g.placeId} title={g.text} note={g.note} onRemove={() => removeFavGame(g.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAMS */}
        {activeTab === 'teams' && (
          <div className="tw-section">
            <FavTeamsDisplay favTeams={profile.fav_teams} />
          </div>
        )}

        {/* WATCH LIST */}
        {activeTab === 'watchlist' && (
          <div className="tw-section">
            <WatchListPreview username={profile.username} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
