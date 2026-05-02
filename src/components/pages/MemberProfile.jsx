import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './MemberProfile.css';

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', nabb_helper: 'NABB Helper', member: 'Member', guest: 'Guest' };
  return map[role] || role || 'Member';
};

const MemberProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const p = profiles.find(p => p.username === user?.username) || {
      username: user?.username,
      bio: '',
      top_banner_url: '',
      avatar_url: '',
      spotify_url: '',
      twitter_url: '',
      twitch_url: '',
      youtube_url: '',
      instagram_url: '',
      discord_tag: ''
    };
    setProfile(p);
    setFormData(p);
  }, [user]);

  const handleSave = () => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const idx = profiles.findIndex(p => p.username === user?.username);
    if (idx !== -1) profiles[idx] = formData;
    else profiles.push(formData);
    localStorage.setItem('member_profiles', JSON.stringify(profiles));
    setProfile(formData);
    setEditing(false);
  };

  if (!profile) return <div>Loading...</div>;

  if (editing) {
    return (
      <div className="page discord-edit-page">
        <div className="page-header">
          <h1 className="gradient-text">Edit Profile</h1>
          <button className="neon-button" onClick={() => setEditing(false)}>Cancel</button>
        </div>

        <div className="neon-card p-3">
          <div className="form-group">
            <label>Banner Image URL</label>
            <input type="text" value={formData.top_banner_url || ''} onChange={e => setFormData({ ...formData, top_banner_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Avatar Image URL</label>
            <input type="text" value={formData.avatar_url || ''} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>About Me</label>
            <textarea rows="4" value={formData.bio || ''} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." />
          </div>
          <div className="form-group">
            <label>Discord Tag</label>
            <input type="text" value={formData.discord_tag || ''} onChange={e => setFormData({ ...formData, discord_tag: e.target.value })} placeholder="username#0000" />
          </div>
          <div className="form-group">
            <label>Spotify Embed URL</label>
            <input type="text" value={formData.spotify_url || ''} onChange={e => setFormData({ ...formData, spotify_url: e.target.value })} placeholder="https://open.spotify.com/embed/..." />
          </div>

          <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Socials</h4>
          {[
            { key: 'twitter_url', label: 'Twitter URL' },
            { key: 'twitch_url', label: 'Twitch URL' },
            { key: 'youtube_url', label: 'YouTube URL' },
            { key: 'instagram_url', label: 'Instagram URL' },
          ].map(({ key, label }) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type="text" value={formData[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder="https://..." />
            </div>
          ))}

          <div className="form-actions">
            <button className="neon-button" onClick={handleSave}>Save Profile</button>
            <button className="neon-button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const socials = [
    { key: 'twitter_url', label: 'Twitter', icon: '🐦' },
    { key: 'twitch_url', label: 'Twitch', icon: '🎮' },
    { key: 'youtube_url', label: 'YouTube', icon: '▶️' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸' },
  ].filter(s => profile[s.key]);

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

        {profile.spotify_url && (
          <div className="discord-section discord-spotify">
            <div className="discord-section-title">🎵 Listening To</div>
            <iframe
              title="Spotify"
              src={profile.spotify_url}
              width="100%"
              height="90"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media"
              style={{ borderRadius: '8px', marginTop: '8px' }}
            />
          </div>
        )}

        {socials.length > 0 && (
          <div className="discord-section">
            <div className="discord-section-title">Connections</div>
            <div className="discord-connections">
              {socials.map(s => (
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
