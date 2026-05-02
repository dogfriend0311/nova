import React, { useState } from 'react';
import './NABBLeague.css';

const NABBLeague = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'rosters':
        return <RostersTab />;
      case 'players':
        return <PlayersTab />;
      case 'leaders':
        return <LeagueLeadersTab />;
      case 'feed':
        return <GameFeedTab />;
      case 'scores':
        return <BoxScoresTab />;
      case 'halloffame':
        return <HallOfFameTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="page nabb-league">
      <div className="page-header">
        <h1 className="gradient-text">⚾ NABB</h1>
        <p className="subtitle">Roblox Baseball League</p>
      </div>

      <div className="league-tabs">
        <button
          className={`league-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🏟️ Overview
        </button>
        <button
          className={`league-tab ${activeTab === 'rosters' ? 'active' : ''}`}
          onClick={() => setActiveTab('rosters')}
        >
          👥 Rosters
        </button>
        <button
          className={`league-tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          🎮 Players
        </button>
        <button
          className={`league-tab ${activeTab === 'leaders' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaders')}
        >
          📊 League Leaders
        </button>
        <button
          className={`league-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          📰 Game Feed
        </button>
        <button
          className={`league-tab ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => setActiveTab('scores')}
        >
          📈 Box Scores
        </button>
        <button
          className={`league-tab ${activeTab === 'halloffame' ? 'active' : ''}`}
          onClick={() => setActiveTab('halloffame')}
        >
          🏆 Hall of Fame
        </button>
      </div>

      <div className="league-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

const OverviewTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">NABB Overview</h3>
        <div className="mt-2">
          <div className="data-row">
            <span className="data-label">League</span>
            <span className="data-value">NABB</span>
          </div>
          <div className="data-row">
            <span className="data-label">Sport</span>
            <span className="data-value">Roblox Baseball</span>
          </div>
          <div className="data-row">
            <span className="data-label">Status</span>
            <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#00ff00',
                boxShadow: '0 0 8px rgba(0, 255, 0, 0.6)'
              }}></span>
              ONGOING
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">Teams</span>
            <span className="data-value">8</span>
          </div>
          <div className="data-row">
            <span className="data-label">Players</span>
            <span className="data-value">Coming Soon</span>
          </div>
        </div>
      </div>

      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Recent Games</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          No games played yet
        </p>
      </div>
    </div>
  );
};

const RostersTab = () => {
  const teams = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="card-grid">
      {teams.map((team) => (
        <div key={team} className="neon-card p-3">
          <h4 className="gradient-text-cyan">Team {team}</h4>
          <div className="mt-2">
            <div className="data-row">
              <span className="data-label">Players</span>
              <span className="data-value">0</span>
            </div>
            <div className="data-row">
              <span className="data-label">Wins</span>
              <span className="data-value">0</span>
            </div>
            <div className="data-row">
              <span className="data-label">Losses</span>
              <span className="data-value">0</span>
            </div>
          </div>
          <button className="neon-button" style={{ width: '100%', marginTop: '15px' }}>
            View Roster
          </button>
        </div>
      ))}
    </div>
  );
};

const PlayersTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">League Players</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          Players will appear here. View individual player stat pages in this section.
        </p>
      </div>
    </div>
  );
};

const LeagueLeadersTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">Hitting Leaders</h3>
        <table style={{ width: '100%', marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>HR</th>
              <th>AVG</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>No data yet</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Pitching Leaders</h3>
        <table style={{ width: '100%', marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>W</th>
              <th>ERA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>No data yet</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GameFeedTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">📰 Game Feed</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          Game updates and news will appear here
        </p>
      </div>
    </div>
  );
};

const BoxScoresTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">📈 Box Scores</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          Game box scores will appear here
        </p>
      </div>
    </div>
  );
};

const HallOfFameTab = () => {
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">🏆 Hall of Fame</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          Hall of Fame players will appear here
        </p>
      </div>
    </div>
  );
};

export default NABBLeague;
