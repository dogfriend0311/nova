import React, { useEffect, useState } from 'react';
import { robloxService } from '../../services/robloxService';
import './Pages.css';

const RobloxStats = () => {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRobloxData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchRobloxData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchRobloxData = async () => {
    setLoading(true);
    const data = await robloxService.getLeaderboard(100);
    if (!data.error) {
      setLeaderboard(data.players || []);
    }
    setLoading(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'leaderboard':
        return <LeaderboardTab data={leaderboard} />;
      case 'teams':
        return <TeamsTab />;
      case 'matches':
        return <MatchesTab />;
      case 'achievements':
        return <AchievementsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="page roblox-page">
      <div className="page-header">
        <h1 className="gradient-text">Roblox League</h1>
        <p className="subtitle">Track your league stats and compete with others</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button
          className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          👥 Teams
        </button>
        <button
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          🎮 Matches
        </button>
        <button
          className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          ⭐ Achievements
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

const LeaderboardTab = ({ data }) => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">Top Players</h3>
        <div className="mt-2" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Rank</th>
                <th>Points</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.length > 0
                ? data.slice(0, 20)
                : Array(10)
                    .fill(0)
                    .map((_, i) => ({ rank: i + 1 }))
              ).map((player, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{player.name || `Player ${idx + 1}`}</td>
                  <td>{player.rank || idx + 1}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-cyan)' }}>
                    {player.points || Math.floor(Math.random() * 5000)}
                  </td>
                  <td>
                    <span className="badge badge-active">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TeamsTab = () => {
  return (
    <div className="card-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="neon-card p-3">
          <h3 className="gradient-text-magenta">Team {i}</h3>
          <div className="mt-2">
            <div className="data-row">
              <span className="data-label">Members</span>
              <span className="data-value">8</span>
            </div>
            <div className="data-row">
              <span className="data-label">Wins</span>
              <span className="data-value">{Math.floor(Math.random() * 50)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Rank</span>
              <span className="data-value">#{i}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MatchesTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">Recent Matches</h3>
        <div className="list-items mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="list-item">
              <div className="list-item-icon">🎮</div>
              <div className="list-item-content">
                <div className="list-item-label">Team Alpha vs Team Beta</div>
                <div className="list-item-description">
                  {new Date(Date.now() - i * 3600000).toLocaleString()}
                </div>
              </div>
              <span
                className="data-value"
                style={{ color: i % 2 === 0 ? 'var(--color-success)' : 'var(--color-error)' }}
              >
                {i % 2 === 0 ? 'Won' : 'Lost'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AchievementsTab = () => {
  return (
    <div className="card-grid">
      {[
        { name: 'First Blood', icon: '🎯' },
        { name: 'Unstoppable', icon: '⚡' },
        { name: 'Champion', icon: '👑' },
        { name: 'Legendary', icon: '✨' },
        { name: 'Collector', icon: '📦' },
        { name: 'Speedrunner', icon: '🏃' },
      ].map((achievement, i) => (
        <div key={i} className="neon-card p-3 text-center">
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>
            {achievement.icon}
          </div>
          <h4 className="gradient-text-cyan">{achievement.name}</h4>
          <p style={{ fontSize: '0.85rem', color: 'rgba(192, 208, 255, 0.6)' }}>
            Earned {Math.floor(Math.random() * 100)} times
          </p>
        </div>
      ))}
    </div>
  );
};

export default RobloxStats;
