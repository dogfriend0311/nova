import React, { useEffect, useState } from 'react';
import { sportsService } from '../../services/sportsService';
import './Pages.css';

const Hub = () => {
  const [activeTab, setActiveTab] = useState('scores');
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHubData();
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchHubData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHubData = async () => {
    setLoading(true);
    const scoresData = await sportsService.getMultipleSportsScores([
      'nfl',
      'mlb',
      'nba',
      'nhl',
    ]);
    setScores(scoresData);
    setLoading(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scores':
        return <LiveScoresTab scores={scores} />;
      case 'trending':
        return <TrendingTab />;
      case 'activity':
        return <ActivityTab />;
      case 'news':
        return <NewsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="page hub-page">
      <div className="page-header">
        <h1 className="gradient-text">Nova Hub</h1>
        <p className="subtitle">Everything happening in Nova, live and in real-time</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => setActiveTab('scores')}
        >
          🏆 Live Scores
        </button>
        <button
          className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          ⭐ Trending
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📊 Activity Feed
        </button>
        <button
          className={`tab ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          📰 News
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

const LiveScoresTab = ({ scores }) => {
  const leagues = ['nfl', 'mlb', 'nba', 'nhl'];

  return (
    <div className="card-container">
      {leagues.map((league) => (
        <div key={league} className="neon-card p-3">
          <h3 className="gradient-text-cyan" style={{ textTransform: 'uppercase' }}>
            {league}
          </h3>
          <div className="mt-2">
            {scores[league]?.games ? (
              scores[league].games.slice(0, 3).map((game, idx) => (
                <div key={idx} className="data-row">
                  <span className="data-label">{game.matchup}</span>
                  <span className="data-value">{game.score}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'rgba(192, 208, 255, 0.5)' }}>No games today</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const TrendingTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">🔥 Trending Now</h3>
        <div className="list-items mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="list-item">
              <div className="list-item-icon">🚀</div>
              <div className="list-item-content">
                <div className="list-item-label">Trending Clip #{i}</div>
                <div className="list-item-description">
                  {Math.floor(Math.random() * 10000)} views
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ActivityTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">📊 Recent Activity</h3>
        <div className="list-items mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="data-row">
              <span className="data-label">Member {i}</span>
              <span className="data-value">Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NewsTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">📰 Latest News</h3>
        <div className="list-items mt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="list-item">
              <div className="list-item-icon">📰</div>
              <div className="list-item-content">
                <div className="list-item-label">Breaking News #{i}</div>
                <div className="list-item-description">
                  Just now • Major sports update
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hub;
