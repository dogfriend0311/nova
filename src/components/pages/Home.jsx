import React, { useState, useEffect } from 'react';
import './Pages.css';

const Home = () => {
  const [stats, setStats] = useState({ members: 0, online: 0, clips: 0 });

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    const memberCount = users.length + 1; // +1 for owner

    const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const onlineCount = Object.values(onlineData).filter(ts => ts > fiveMinAgo).length;

    const clips = JSON.parse(localStorage.getItem('nova_clips') || '[]');

    setStats({ members: memberCount, online: onlineCount, clips: clips.length });
  }, []);

  return (
    <div className="page home-page">
      <div className="page-header">
        <h1 className="gradient-text">Welcome to Nova</h1>
        <p className="subtitle">Social hub</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="neon-card p-3">
          <h3 className="gradient-text-cyan">🌟 Featured Members</h3>
          <div className="mt-2">
            {(() => {
              const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
              const featured = profiles.slice(0, 3);
              if (featured.length === 0) {
                return <p style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.9rem' }}>No members yet</p>;
              }
              return featured.map((p, i) => (
                <div key={i} className="data-row">
                  <span className="data-label">{p.username}</span>
                  <span className="data-value" style={{ color: 'var(--color-cyan)' }}>Active</span>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="neon-card p-3">
          <h3 className="gradient-text-magenta">📊 Quick Stats</h3>
          <div className="mt-2">
            <div className="data-row">
              <span className="data-label">Total Members</span>
              <span className="data-value">{stats.members}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Online Now</span>
              <span className="data-value">{stats.online}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Gaming Clips</span>
              <span className="data-value">{stats.clips}</span>
            </div>
          </div>
        </div>

        <div className="neon-card p-3">
          <h3 className="gradient-text-cyan">🎬 Latest Clips</h3>
          <div className="mt-2">
            <p style={{ fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.7)' }}>
              Check out the latest gaming clips from our members in the Hub!
            </p>
          </div>
        </div>

        <div className="neon-card p-3">
          <h3 className="gradient-text-magenta">🏆 Live Sports</h3>
          <div className="mt-2">
            <p style={{ fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.7)' }}>
              View live scores and statistics across all major sports leagues in the Hub.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button className="neon-button">Start Exploring Nova →</button>
      </div>
    </div>
  );
};

export default Home;
