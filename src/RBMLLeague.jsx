import React, { useState } from 'react';
import './RBMLLeague.css';

const RBMLLeague = ({ onSelectPlayer }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Data from localStorage (rbml_ prefix)
  const teams = JSON.parse(localStorage.getItem('rbml_teams') || '[]');
  const players = JSON.parse(localStorage.getItem('rbml_players') || '[]');
  const games = JSON.parse(localStorage.getItem('rbml_games') || '[]');
  const hof = JSON.parse(localStorage.getItem('rbml_hof') || '[]');

  const OverviewTab = () => (
    <div className="league-overview">
      <div className="overview-header">
        <h1 className="gradient-text">⚾ RBML</h1>
        <p className="overview-desc">Roblox Baseball League</p>
      </div>
      <div className="stats-grid">
        <div className="neon-card p-3">
          <span className="data-label">League</span>
          <span className="data-value">RBML</span>
        </div>
        <div className="neon-card p-3">
          <span className="data-label">Teams</span>
          <span className="data-value">{teams.length}</span>
        </div>
        <div className="neon-card p-3">
          <span className="data-label">Players</span>
          <span className="data-value">{players.length}</span>
        </div>
        <div className="neon-card p-3">
          <span className="data-label">Hall of Fame</span>
          <span className="data-value">{hof.length}</span>
        </div>
      </div>
    </div>
  );

  const RostersTab = () => (
    <div className="rosters-view">
      <h2 className="gradient-text-cyan">Team Rosters</h2>
      <div className="teams-grid">
        {teams.map(team => (
          <div key={team.id} className="neon-card p-3">
            <div className="team-header">
              {team.logo_url && <img src={team.logo_url} alt={team.team_name} className="team-logo-small" />}
              <h3>{team.team_name}</h3>
            </div>
            <div className="players-list">
              {players.filter(p => p.team === team.team_name).map(player => (
                <button key={player.id} className="player-btn" onClick={() => onSelectPlayer(player)}>
                  {player.player_name} - {player.position} (OVR {player.overall})
                </button>
              ))}
              {players.filter(p => p.team === team.team_name).length === 0 && <p className="empty-message">No players</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const GamesTab = () => (
    <div className="games-view">
      <h2 className="gradient-text-cyan">Recent Games</h2>
      <div className="games-list">
        {games.slice().reverse().map(game => (
          <div key={game.id} className="neon-card p-3 game-card">
            <div className="game-teams">
              <span>{game.home_team}</span>
              <span className="score">{game.home_score} - {game.away_score}</span>
              <span>{game.away_team}</span>
            </div>
            <div className="game-meta">
              <span className={`status ${game.status}`}>{game.status}</span>
              <span className="date">{new Date(game.game_date).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const HallOfFameTab = () => (
    <div className="hof-view">
      <h2 className="gradient-text-cyan">RBML Hall of Fame</h2>
      <div className="hof-grid">
        {hof.map(member => (
          <div key={member.id} className="neon-card p-3">
            <h3 className="gradient-text-magenta">{member.player_name}</h3>
            <p>Inducted: {member.year}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'rosters': return <RostersTab />;
      case 'games': return <GamesTab />;
      case 'hof': return <HallOfFameTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="nabb-league"> {/* reusing the same class for styling */}
      <div className="league-tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'rosters' ? 'active' : ''}`} onClick={() => setActiveTab('rosters')}>Rosters</button>
        <button className={`tab ${activeTab === 'games' ? 'active' : ''}`} onClick={() => setActiveTab('games')}>Games</button>
        <button className={`tab ${activeTab === 'hof' ? 'active' : ''}`} onClick={() => setActiveTab('hof')}>Hall of Fame</button>
      </div>
      <div className="league-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default RBMLLeague;