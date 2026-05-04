import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TEAMS, SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import { getWatchList } from '../../services/mediaService';
import * as lfm from '../../services/lastfmService';
import './MemberProfile.css';

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', nabb_helper: 'NABB Helper', member: 'Member', guest: 'Guest' };
  return map[role] || role || 'Member';
};

const TYPE_ICONS = { anime: '🎌', movie: '🎬', tv: '📺' };
const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];
const DEFAULT_FAV_TEAMS = { mlb: [], nfl: [], nba: [], nhl: [], cfb: [], cbb: [] };

const DEFAULT_PROFILE = {
  bio: '', top_banner_url: '', avatar_url: '', lastfm_username: '',
  twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '',
  discord_tag: '', fav_teams: DEFAULT_FAV_TEAMS,
};

/* ── Image upload field ─────────────────────────────────────── */
const ImageField = ({ label, fieldKey, value, onChange }) => {
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Image must be under 3 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => onChange(fieldKey, reader.result);
    reader.readAsDataURL(file);
  };
  const isBase64 = value && value.startsWith('data:');
  const hasImage = !!value;
  return (
    <div className="form-group mp-image-field">
      <label>{label}</label>
      <div className="mp-image-upload-row">
        <input type="text" value={isBase64 ? '' : (value || '')} onChange={(e) => onChange(fieldKey, e.target.value)} placeholder={isBase64 ? '(uploaded file)' : 'Paste image URL…'} style={{ flex: 1 }} />
        <label className="mp-upload-btn" title="Upload from device">
          📁 Upload
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {hasImage && <button className="mp-upload-clear" onClick={() => onChange(fieldKey, '')} title="Remove image">✕</button>}
      </div>
      {hasImage && (
        <div className="mp-image-preview-wrap">
          <img src={value} alt="preview" className="mp-image-preview" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
};

/* ── Team Selector ──────────────────────────────────────────── */
const TeamSelector = ({ favTeams, onChange }) => {
  const [activeSport, setActiveSport] = useState('mlb');
  const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(activeSport);
  const toggle = (sport, abbr) => {
    const current = favTeams[sport] || [];
    const next = current.includes(abbr) ? current.filter((a) => a !== abbr) : [...current, abbr];
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
                const logo = hasLogos ? getTeamLogoUrl(activeSport, t.abbr) : null;
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

/* ── Favorite Teams Display ─────────────────────────────────── */
const FavTeamsDisplay = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div className="discord-section">
      <div className="discord-section-title">⭐ Favorite Teams</div>
      {SPORT_KEYS.map((sport) => {
        const picked = favTeams?.[sport] || [];
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

/* ── Watch List Preview ─────────────────────────────────────── */
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
          <div style={{ fontSize: '0.72rem', color: 'rgba(192,208,255,0.35)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '10px', marginBottom: '8px' }}>
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

/* ── Last.fm Now Playing Widget ─────────────────────────────── */
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

  if (!lastfmUsername || !lfm.hasApiKey() || track === null) return null;
  if (track === undefined) return null;

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
              ? <><span className="sp-pulse" style={{ background: '#d51007' }} /> Playing on Spotify</>
              : <span style={{ color: 'rgba(192,208,255,0.4)' }}>Last played</span>}
          </div>
        </div>
        <svg viewBox="0 0 512 512" fill="#d51007" width="18" height="18" style={{ flexShrink: 0, opacity: 0.7 }}>
          <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm117.4 369.3c-4.6 7.5-14.4 9.9-21.9 5.3-60-36.7-135.5-45-224.5-24.7-8.6 2-17.1-3.4-19.1-12-2-8.6 3.4-17.1 12-19.1 97.3-22.2 180.8-12.7 248.2 28.5 7.5 4.7 9.9 14.5 5.3 22zm31.3-69.6c-5.8 9.4-18.1 12.4-27.5 6.6-68.7-42.3-173.4-54.5-254.5-29.8-10.5 3.2-21.6-2.8-24.7-13.3-3.2-10.5 2.8-21.6 13.3-24.7 92.7-28.2 207.8-14.5 286.8 34 9.4 5.8 12.4 18.1 6.6 27.2zm2.7-72.4c-82.4-48.9-218.4-53.4-297-29.5-12.6 3.8-25.9-3.3-29.7-15.9-3.8-12.6 3.3-25.9 15.9-29.7 90.2-27.4 240.2-22.1 335 34.1 11.3 6.7 15 21.3 8.3 32.6-6.7 11.2-21.4 14.9-32.5 8.4z" />
        </svg>
      </a>
    </div>
  );
};

/* ── Main MemberProfile ─────────────────────────────────────── */
const MemberProfile = () => {
  const { user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [formData, setFormData] = useState({});
  const [favTab,   setFavTab]   = useState(false);

  useEffect(() => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const found = profiles.find((p) => p.username === user?.username);
    const p = { ...DEFAULT_PROFILE, username: user?.username, ...(found || {}), fav_teams: { ...DEFAULT_FAV_TEAMS, ...(found?.fav_teams || {}) } };
    setProfile(p);
    setFormData(p);
  }, [user]);

  const handleField = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const idx = profiles.findIndex((p) => p.username === user?.username);
    if (idx !== -1) profiles[idx] = formData;
    else profiles.push(formData);
    localStorage.setItem('member_profiles', JSON.stringify(profiles));
    setProfile(formData);
    setEditing(false);
    setFavTab(false);
  };

  if (!profile) return <div>Loading…</div>;

  if (editing) {
    return (
      <div className="page discord-edit-page">
        <div className="page-header">
          <h1 className="gradient-text">Edit Profile</h1>
          <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
        </div>
        <div className="mp-edit-tabs">
          <button className={`sh-sub-tab ${!favTab ? 'active' : ''}`} onClick={() => setFavTab(false)}>👤 Profile</button>
          <button className={`sh-sub-tab ${favTab ? 'active' : ''}`} onClick={() => setFavTab(true)}>⭐ Favorite Teams</button>
        </div>
        {!favTab ? (
          <div className="neon-card p-3">
            <ImageField label="Banner Image" fieldKey="top_banner_url" value={formData.top_banner_url || ''} onChange={handleField} />
            <ImageField label="Avatar / Profile Picture" fieldKey="avatar_url" value={formData.avatar_url || ''} onChange={handleField} />
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
              <small style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.75rem' }}>Shows your now-playing track on your profile. Free at last.fm</small>
            </div>
            <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Socials</h4>
            {[
              { key: 'twitter_url',   label: 'Twitter URL' },
              { key: 'twitch_url',    label: 'Twitch URL' },
              { key: 'youtube_url',   label: 'YouTube URL' },
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
            <p style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Pick your favorite teams for each sport. You can select multiple.
            </p>
            <TeamSelector favTeams={formData.fav_teams || DEFAULT_FAV_TEAMS} onChange={(ft) => setFormData({ ...formData, fav_teams: ft })} />
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button className="neon-button" onClick={handleSave}>Save</button>
              <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: '🐦' },
    { key: 'twitch_url',    label: 'Twitch',    icon: '🎮' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶️' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸' },
  ].filter((s) => profile[s.key]);

  return (
    <div className="page discord-profile-page">
      <div className="discord-banner" style={{ backgroundImage: profile.top_banner_url ? `url(${profile.top_banner_url})` : undefined }} />
      <div className="discord-card">
        <div className="discord-avatar">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" /> : '🚀'}
        </div>
        <button className="neon-button discord-edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
        <div style={{ marginTop: '8px' }}>
          <div className="discord-username-row">
            <h2 className="discord-username">{profile.username}</h2>
            <span className={`discord-role-badge ${user?.role || 'member'}`}>{roleLabel(user?.role)}</span>
          </div>
          {profile.discord_tag && (
            <p style={{ color: 'rgba(192,208,255,0.45)', fontSize: '0.85rem', margin: '0 0 6px 0' }}>{profile.discord_tag}</p>
          )}
        </div>
        {profile.bio && (
          <div className="discord-section">
            <div className="discord-section-title">About Me</div>
            <p className="discord-section-text">{profile.bio}</p>
          </div>
        )}
        <FavTeamsDisplay favTeams={profile.fav_teams} />
        <WatchListPreview username={profile.username} />
        <LastFmWidget lastfmUsername={profile.lastfm_username} />
        {socials.length > 0 && (
          <div className="discord-section">
            <div className="discord-section-title">Connections</div>
            <div className="discord-connections">
              {socials.map((s) => (
                <a key={s.key} href={profile[s.key]} target="_blank" rel="noreferrer" className="discord-conn-btn">
                  {s.icon} {s.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
