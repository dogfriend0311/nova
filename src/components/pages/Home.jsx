import React, { useEffect, useState } from 'react';
import './Pages.css';

const Home = () => {
  const [memberCount] = useState(1234);

  useEffect(() => {
    // Add any home page initialization here
  }, []);

  return (
    <div className="page home-page">
      <div className="page-header">
        <h1 className="gradient-text">Welcome to Nova</h1>
        <p className="subtitle">
          Your home for all things Roblox Sports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Featured Members */}
        <div className="neon-card p-3">
          <h3 className="gradient-text-cyan">🌟 Featured Members</h3>
          <div className="mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="data-row">
                <span className="data-label">Member {i}</span>
                <span className="data-value">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="neon-card p-3">
          <h3 className="gradient-text-magenta">📊 Quick Stats</h3>
          <div className="mt-2">
            <div className="data-row">
              <span className="data-label">Total Members</span>
              <span className="data-value">{memberCount}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Active Now</span>
              <span className="data-value">42</span>
            </div>
            <div className="data-row">
              <span className="data-label">Gaming Clips</span>
              <span className="data-value">567</span>
            </div>
          </div>
        </div>

        {/* Latest Clips */}
        <div className="neon-card p-3">
          <h3 className="gradient-text-cyan">🎬 Latest Clips</h3>
          <div className="mt-2">
            <p style={{ fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.7)' }}>
              Check out the latest gaming clips from our members in the Hub!
            </p>
          </div>
        </div>

        {/* Live Sports */}
        <div className="neon-card p-3">
          <h3 className="gradient-text-magenta">🏆 Live Sports</h3>
          <div className="mt-2">
            <p style={{ fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.7)' }}>
              View live scores and statistics across all major sports leagues in
              the Hub.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-4 text-center">
        <button className="neon-button">
          Start Exploring Nova →
        </button>
      </div>
    </div>
  );
};

export default Home;
