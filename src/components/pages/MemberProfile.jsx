import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TEAMS, SPORT_LABELS } from '../../data/teams';
import { getWatchList } from '../../services/mediaService';
import './MemberProfile.css';

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', nabb_helper: 'NABB Helper', member: 'Member', guest: 'Guest' };
  return map[role] || role || 'Member';
};

const TYPE_ICONS = { anime: '🎌', movie: '🎬', tv: '📺' };

const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];

const DEFAULT_FAV_TEAMS = { mlb: [], nfl: [], nba: [], nhl: [], cfb: [], cbb: [] };

const DEFAULT_PROFILE = {
  bio: '', top_banner_url: '', avatar_url: '', spotify_url: '',
  twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '',
  discord_tag: '', fav_teams: DEFAULT_FAV_TEAMS,
};

/* ── Team Selector (used in edit form) ─────────────────────── */
const TeamSelector = ({ favTeams, onChange }) => {
  const [activeSport, setActiveSport] = useState('mlb');

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
              {SPORT_LABELS[s].split(' ')[0]}
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
                return (
                  <button
                    key={t.abbr}
                    className={`mp-team-btn ${selected ? 'selected' : ''}`}
                    onClick={() => toggle(activeSport, t.abbr)}
                    title={t.name}
                  >
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

/* ── Favorite Teams Display ──────────────────────────────────── */
const FavTeamsDisplay = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;

  return (
    <div className="discord-section">
      <div className="discord-section-title">⭐ Favorite Teams</div>
      {SPORT_KEYS.map((sport) => {
        const picked = favTeams?.[sport] || [];
        if (!picked.length) return null;
        return (
          <div key={sport} className="mp-fav-sport-row">
            <span className="mp-fav-sport-label">{SPORT_LABELS[sport]}</span>
            <div className="mp-fav-teams">
              {picked.map((abbr) => (
                <span key={abbr} className="mp-fav-team-badge">{abbr}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Watch List Preview ──────────────────────────────────────── */
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
        <span className="mp-wl-stat"><span style={{color:'#a5d6a7'}}>✓</span> {watched} watched</span>
        <span className="mp-wl-stat"><span style={{color:'#66bb6a'}}>▶</span> {watching} watching</span>
        <span className="mp-wl-stat"><span style={{color:'#64b5f6'}}>📋</span> {plan} planned</span>
      </div>

      {pinned.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', color: 'rgba(192,208,255,0.35)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '10px', marginBottom: '8px' }}>
            📌 Pinned
          </div>
          <div className="mp-pinned-grid">
            {pinned.slice(0, 6).map((item) => (
              <div key={item.id} className="mp-pinned-card" title={item.title}>
                {item.poster
                  ? <img src={item.poster} alt={item.title} />
                  : <div className="mp-pinned-ph">{TYPE_ICONS[item.type] || '?'}</div>
                }
                {item.rating != null && <div className="mp-pinned-rating">★{item.rating}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Main MemberProfile ──────────────────────────────────────── */
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
            <div className="form-group">
              <label>Banner Image URL</label>
              <input type="text" value={formData.top_banner_url || ''} onChange={(e) => setFormData({ ...formData, top_banner_url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="form-group">
              <label>Avatar Image URL</label>
              <input type="text" value={formData.avatar_url || ''} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="form-group">
              <label>About Me</label>
              <textarea rows="4" value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself…" />
            </div>
            <div className="form-group">
              <label>Discord Tag</label>
              <input type="text" value={formData.discord_tag || ''} onChange={(e) => setFormData({ ...formData, discord_tag: e.target.value })} placeholder="username#0000" />
            </div>
            <div className="form-group">
              <label>Spotify Embed URL</label>
              <input type="text" value={formData.spotify_url || ''} onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })} placeholder="https://open.spotify.com/embed/…" />
            </div>

            <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Socials</h4>
            {[
              { key: 'twitter_url', label: 'Twitter URL' },
              { key: 'twitch_url',  label: 'Twitch URL' },
              { key: 'youtube_url', label: 'YouTube URL' },
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

        {profile.spotify_url && (
          <div className="discord-section discord-spotify">
            <div className="discord-section-title">🎵 Listening To</div>
            <iframe
              title="Spotify"
              src={profile.spotify_url.includes('/embed/') ? profile.spotify_url : profile.spotify_url.replace('open.spotify.com/', 'open.spotify.com/embed/')}
              width="100%" height="90" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media"
              style={{ borderRadius: '8px', marginTop: '8px' }}
            />
          </div>
        )}

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
