import React, { useState } from 'react';
import './LeaguePlayerPage.css';

const formatStatName = (key) =>
  key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const LeaguePlayerPage = ({ player, onBack }) => {
  const [careerToggles, setCareerToggles] = useState({
    hitting: false,
    pitching: false,
  });

  if (!player) {
    return (
      <div className="league-player-page">
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(192,208,255,0.6)' }}>No player selected.</p>
          {onBack && <button className="neon-button" style={{ marginTop: '15px' }} onClick={onBack}>← Back</button>}
        </div>
      </div>
    );
  }

  const boxScores = JSON.parse(localStorage.getItem('nabb_box_scores') || '[]');
  const playerScores = boxScores.filter(b => b.player_id === player.id);

  const aggHits = playerScores.reduce((s, b) => s + (parseInt(b.hits) || 0), 0);
  const aggRuns = playerScores.reduce((s, b) => s + (parseInt(b.runs) || 0), 0);
  const aggRbis = playerScores.reduce((s, b) => s + (parseInt(b.rbis) || 0), 0);
  const aggHR = playerScores.reduce((s, b) => s + (parseInt(b.home_runs) || 0), 0);
  const aggSO = playerScores.reduce((s, b) => s + (parseInt(b.strike_outs) || 0), 0);
  const aggIP = playerScores.reduce((s, b) => s + (parseFloat(b.innings_pitched) || 0), 0);
  const aggKP = playerScores.reduce((s, b) => s + (parseInt(b.strikeouts_pitched) || 0), 0);
  const aggHA = playerScores.reduce((s, b) => s + (parseInt(b.hits_allowed) || 0), 0);
  const aggER = playerScores.reduce((s, b) => s + (parseInt(b.earned_runs) || 0), 0);

  const hittingStats = {
    games_played: playerScores.length,
    hits: aggHits + (parseInt(player.hits) || 0),
    runs: aggRuns + (parseInt(player.runs) || 0),
    rbis: aggRbis + (parseInt(player.rbis) || 0),
    home_runs: aggHR + (parseInt(player.home_runs) || 0),
    strike_outs: aggSO + (parseInt(player.strike_outs) || 0),
  };

  const pitchingStats = {
    games_pitched: playerScores.filter(b => (parseFloat(b.innings_pitched) || 0) > 0).length,
    innings_pitched: (aggIP + (parseFloat(player.innings_pitched) || 0)).toFixed(1),
    strikeouts: aggKP + (parseInt(player.strikeouts_pitched) || 0),
    hits_allowed: aggHA + (parseInt(player.hits_allowed) || 0),
    earned_runs: aggER + (parseInt(player.earned_runs) || 0),
  };

  const toggleCareer = (stat) => setCareerToggles(prev => ({ ...prev, [stat]: !prev[stat] }));

  return (
    <div className="league-player-page">
      {onBack && (
        <button
          className="neon-button"
          style={{ marginBottom: '20px', fontSize: '0.9rem' }}
          onClick={onBack}
        >
          ← Back to League
        </button>
      )}

      <div className="player-container">
        {/* LEFT — Trading Card */}
        <div className="player-card neon-card">
          <div className="card-avatar">
            {player.roblox_id ? (
              <img
                src={`https://www.roblox.com/headshot-thumbnail/image?userId=${player.roblox_id}&width=420&height=420&format=png`}
                alt={player.player_name}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="avatar-placeholder" style={{ display: player.roblox_id ? 'none' : 'flex' }}>🎮</div>
          </div>

          <div className="card-content">
            <h2 className="card-name">{player.player_name}</h2>
            <div className="card-team">{player.team || 'Free Agent'}</div>
            <div className="card-position">{player.position || '—'}</div>

            <div className="card-overall">
              <span className="label">Overall</span>
              <span className="value">{player.overall || '—'}</span>
            </div>

            {player.number && (
              <div className="card-overall">
                <span className="label">Number</span>
                <span className="value">#{player.number}</span>
              </div>
            )}

            <div className="card-divider"></div>

            {player.spotify_url && (
              <div className="card-spotify">
                <div className="spotify-label">🎵 Favorite Song</div>
                <iframe
                  title="Spotify player"
                  src={player.spotify_url}
                  width="100%"
                  height="90"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  style={{ marginTop: '10px', borderRadius: '4px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Stats */}
        <div className="player-stats">
          {/* Hitting */}
          <div className="stats-section neon-card">
            <div className="stats-header">
              <h3 className="gradient-text-cyan">⚾ Hitting Stats</h3>
              <button className="career-toggle" onClick={() => toggleCareer('hitting')}>
                {careerToggles.hitting ? 'Season' : 'Career'}
              </button>
            </div>
            <div className="stats-grid">
              {Object.entries(hittingStats).map(([key, val]) => (
                <div key={key} className="stat-item">
                  <span className="stat-label">{formatStatName(key)}</span>
                  <span className="stat-value">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pitching */}
          <div className="stats-section neon-card">
            <div className="stats-header">
              <h3 className="gradient-text-magenta">⚡ Pitching Stats</h3>
              <button className="career-toggle" onClick={() => toggleCareer('pitching')}>
                {careerToggles.pitching ? 'Season' : 'Career'}
              </button>
            </div>
            <div className="stats-grid">
              {Object.entries(pitchingStats).map(([key, val]) => (
                <div key={key} className="stat-item">
                  <span className="stat-label">{formatStatName(key)}</span>
                  <span className="stat-value">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Log */}
          {playerScores.length > 0 && (
            <div className="stats-section neon-card">
              <h3 className="gradient-text-cyan" style={{ marginBottom: '15px' }}>📋 Game Log</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {['H', 'R', 'RBI', 'HR', 'K', 'IP', 'KP', 'HA', 'ER'].map(h => (
                        <th key={h} style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', textAlign: 'center', borderBottom: '1px solid rgba(0,255,255,0.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playerScores.map((score, i) => (
                      <tr key={i}>
                        {[score.hits, score.runs, score.rbis, score.home_runs, score.strike_outs,
                          score.innings_pitched, score.strikeouts_pitched, score.hits_allowed, score.earned_runs
                        ].map((v, j) => (
                          <td key={j} style={{ padding: '8px', textAlign: 'center', color: 'var(--color-cyan)', borderBottom: '1px solid rgba(0,255,255,0.05)' }}>{v || 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaguePlayerPage;
