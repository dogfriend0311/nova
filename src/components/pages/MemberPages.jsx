import React, { useEffect, useState } from 'react';
import { supabaseHelpers } from '../../services/supabaseClient';
import './Pages.css';

const MemberPages = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabaseHelpers.getMembers(50);
    if (!error && data) {
      setMembers(data);
    } else {
      // Fallback mock data
      setMembers(
        Array(20)
          .fill(0)
          .map((_, i) => ({
            id: i + 1,
            username: `Player_${i + 1}`,
            level: Math.floor(Math.random() * 100),
            clips_count: Math.floor(Math.random() * 50),
          }))
      );
    }
    setLoading(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'directory':
        return <DirectoryTab members={members} onSelectMember={setSelectedMember} />;
      case 'profile':
        return selectedMember ? (
          <ProfileTab member={selectedMember} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-title">Select a Member</div>
            <div className="empty-state-message">
              Click on a member to view their profile
            </div>
          </div>
        );
      case 'clips':
        return <ClipsTab />;
      case 'music':
        return <MusicTab />;
      default:
        return null;
    }
  };

  return (
    <div className="page members-page">
      <div className="page-header">
        <h1 className="gradient-text">Member Pages</h1>
        <p className="subtitle">Explore member profiles, clips, and favorite songs</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          📚 Member Directory
        </button>
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`tab ${activeTab === 'clips' ? 'active' : ''}`}
          onClick={() => setActiveTab('clips')}
        >
          🎬 Gaming Clips
        </button>
        <button
          className={`tab ${activeTab === 'music' ? 'active' : ''}`}
          onClick={() => setActiveTab('music')}
        >
          🎵 Favorite Songs
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        renderTabContent()
      )}
    </div>
  );
};

const DirectoryTab = ({ members, onSelectMember }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = members.filter((m) =>
    m.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card-container">
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      <div className="card-grid">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="neon-card p-3"
            onClick={() => onSelectMember(member)}
            style={{ cursor: 'pointer' }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, var(--color-cyan), var(--color-magenta))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                margin: '0 auto 15px',
              }}
            >
              🚀
            </div>
            <h4 className="gradient-text-cyan text-center">{member.username}</h4>
            <div className="mt-2">
              <div className="data-row">
                <span className="data-label">Level</span>
                <span className="data-value">{member.level}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Clips</span>
                <span className="data-value">{member.clips_count}</span>
              </div>
            </div>
            <button className="neon-button" style={{ width: '100%', marginTop: '15px' }}>
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileTab = ({ member }) => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, var(--color-cyan), var(--color-magenta))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '60px',
              margin: '0 auto 20px',
            }}
          >
            🚀
          </div>
          <h2 className="gradient-text">{member.username}</h2>
          <p style={{ color: 'var(--color-cyan)', marginTop: '10px' }}>Member since 2024</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="neon-card p-2">
            <div className="data-row">
              <span className="data-label">Level</span>
              <span className="data-value">{member.level}</span>
            </div>
            <div className="data-row">
              <span className="data-label">XP</span>
              <span className="data-value">12,500</span>
            </div>
          </div>

          <div className="neon-card p-2">
            <div className="data-row">
              <span className="data-label">Followers</span>
              <span className="data-value">234</span>
            </div>
            <div className="data-row">
              <span className="data-label">Following</span>
              <span className="data-value">89</span>
            </div>
          </div>

          <div className="neon-card p-2">
            <div className="data-row">
              <span className="data-label">Clips</span>
              <span className="data-value">{member.clips_count}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Likes</span>
              <span className="data-value">1,234</span>
            </div>
          </div>

          <div className="neon-card p-2">
            <div className="data-row">
              <span className="data-label">Playlists</span>
              <span className="data-value">5</span>
            </div>
            <div className="data-row">
              <span className="data-label">Songs</span>
              <span className="data-value">127</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="neon-button">Follow Member</button>
        </div>
      </div>
    </div>
  );
};

const ClipsTab = () => {
  return (
    <div className="card-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="neon-card p-3">
          <div
            style={{
              width: '100%',
              height: '150px',
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1))',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              marginBottom: '10px',
            }}
          >
            🎬
          </div>
          <h4 className="gradient-text-cyan">Epic Gaming Moment #{i}</h4>
          <div className="mt-2" style={{ fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.7)' }}>
            {Math.floor(Math.random() * 50000)} views • {Math.floor(Math.random() * 1000)} likes
          </div>
        </div>
      ))}
    </div>
  );
};

const MusicTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Favorite Songs</h3>
        <div className="list-items mt-2">
          {[
            { name: 'Cosmic Chill', artist: 'Space Beats' },
            { name: 'Neon Dreams', artist: 'Synth Wave' },
            { name: 'Digital Sky', artist: 'Electronic Vibes' },
            { name: 'Stellar Journey', artist: 'Ambient Space' },
            { name: 'Cyber Midnight', artist: 'Darkwave' },
          ].map((song, i) => (
            <div key={i} className="list-item">
              <div className="list-item-icon">🎵</div>
              <div className="list-item-content">
                <div className="list-item-label">{song.name}</div>
                <div className="list-item-description">{song.artist}</div>
              </div>
              <button className="neon-button" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                ▶ Play
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemberPages;
