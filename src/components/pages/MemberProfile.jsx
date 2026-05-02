import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './MemberProfile.css';

const MemberProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const userProfile = profiles.find(p => p.username === user?.username);
    setProfile(userProfile || {
      username: user?.username,
      bio: '',
      top_banner_url: '',
      left_banner_url: '',
      right_banner_url: '',
      spotify_url: '',
      twitter_url: '',
      twitch_url: '',
      youtube_url: '',
      instagram_url: ''
    });
    setFormData(userProfile || {});
  }, [user]);

  const handleSave = () => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const index = profiles.findIndex(p => p.username === user?.username);
    if (index !== -1) {
      profiles[index] = formData;
    } else {
      profiles.push(formData);
    }
    localStorage.setItem('member_profiles', JSON.stringify(profiles));
    setProfile(formData);
    setEditing(false);
  };

  if (!profile) return <div>Loading...</div>;

  if (editing) {
    return (
      <div className="page member-profile-edit">
        <div className="page-header">
          <h1 className="gradient-text">Edit Your Profile</h1>
        </div>

        <div className="edit-form neon-card p-3">
          <div className="form-group">
            <label>Bio</label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Tell us about yourself"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label>Top Banner URL</label>
            <input
              type="text"
              value={formData.top_banner_url || ''}
              onChange={(e) => setFormData({...formData, top_banner_url: e.target.value})}
              placeholder="Image URL"
            />
          </div>

          <div className="form-group">
            <label>Left Banner URL</label>
            <input
              type="text"
              value={formData.left_banner_url || ''}
              onChange={(e) => setFormData({...formData, left_banner_url: e.target.value})}
              placeholder="Image URL"
            />
          </div>

          <div className="form-group">
            <label>Right Banner URL</label>
            <input
              type="text"
              value={formData.right_banner_url || ''}
              onChange={(e) => setFormData({...formData, right_banner_url: e.target.value})}
              placeholder="Image URL"
            />
          </div>

          <div className="form-group">
            <label>Spotify URL</label>
            <input
              type="text"
              value={formData.spotify_url || ''}
              onChange={(e) => setFormData({...formData, spotify_url: e.target.value})}
              placeholder="Spotify song/artist link"
            />
          </div>

          <div className="socials-section">
            <h3 className="gradient-text-cyan">Socials</h3>
            <div className="form-group">
              <label>Twitter</label>
              <input
                type="text"
                value={formData.twitter_url || ''}
                onChange={(e) => setFormData({...formData, twitter_url: e.target.value})}
                placeholder="Twitter URL"
              />
            </div>

            <div className="form-group">
              <label>Twitch</label>
              <input
                type="text"
                value={formData.twitch_url || ''}
                onChange={(e) => setFormData({...formData, twitch_url: e.target.value})}
                placeholder="Twitch URL"
              />
            </div>

            <div className="form-group">
              <label>YouTube</label>
              <input
                type="text"
                value={formData.youtube_url || ''}
                onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
                placeholder="YouTube URL"
              />
            </div>

            <div className="form-group">
              <label>Instagram</label>
              <input
                type="text"
                value={formData.instagram_url || ''}
                onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                placeholder="Instagram URL"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="neon-button" onClick={handleSave}>Save Profile</button>
            <button className="neon-button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page member-profile">
      <div className="profile-banner" style={{ backgroundImage: `url(${profile.top_banner_url})` }}>
        <button className="neon-button" onClick={() => setEditing(true)}>Edit Profile</button>
      </div>

      <div className="profile-content">
        <div className="profile-left">
          {profile.left_banner_url && (
            <img src={profile.left_banner_url} alt="Left banner" className="profile-banner-side" />
          )}
        </div>

        <div className="profile-main">
          <h1 className="gradient-text">{profile.username}</h1>
          <p className="profile-bio">{profile.bio}</p>

          {profile.spotify_url && (
            <div className="profile-spotify">
              <h3>Favorite Song</h3>
              <iframe
                title="Spotify player"
                src={profile.spotify_url}
                width="100%"
                height="90"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media"
                style={{borderRadius: '4px', marginTop: '10px'}}
              />
            </div>
          )}

          {(profile.twitter_url || profile.twitch_url || profile.youtube_url || profile.instagram_url) && (
            <div className="profile-socials">
              <h3>Connect</h3>
              <div className="socials-list">
                {profile.twitter_url && <a href={profile.twitter_url} target="_blank" rel="noreferrer">Twitter</a>}
                {profile.twitch_url && <a href={profile.twitch_url} target="_blank" rel="noreferrer">Twitch</a>}
                {profile.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}
                {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
              </div>
            </div>
          )}
        </div>

        <div className="profile-right">
          {profile.right_banner_url && (
            <img src={profile.right_banner_url} alt="Right banner" className="profile-banner-side" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;
