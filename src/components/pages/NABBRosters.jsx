import React, { useState, useEffect } from 'react';
import './NABBRosters.css';

const NABBRosters = () => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const loadedTeams = JSON.parse(localStorage.getItem('nabb_teams') || '[]');
    const loadedPlayers = JSON.parse(localStorage.getItem('nabb_players') || '[]');
    setTeams(loadedTeams);
    setPlayers(loadedPlayers);
    if (loadedTeams.length > 0) {
      setSelectedTeam(loadedTeams[0]);
    }
  }, []);

  const teamPlayers = selectedTeam
    ? players.filter(p => p.team === selectedTeam.team_name)
    : [];

  return (
    <div className="page nabb-rosters">
      <div className="page-header">
        <h1 className="gradient-text">⚾ NABB Rosters</h1>
        <p className="subtitle">Team Rosters & Player Information</p>
      </div>

      <div className="rosters-container">
        <div className="teams-selector">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              style={{
                padding: '15px',
                background: selectedTeam?.id === team.id 
                  ? 'rgba(0, 255, 255, 0.2)' 
                  : 'rgba(0, 255, 255, 0.05)',
                border: selectedTeam?.id === team.id
                  ? '2px solid var(--color-cyan)'
                  : '1px solid rgba(0, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}
              className="neon-card"
            >
              {team.logo_url && (
                <img src={team.logo_url} alt={team.team_name} style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  display: 'block',
                  margin: '0 auto 10px'
                }} />
              )}
              {!team.logo_url && (
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: team.team_color,
                  borderRadius: '50%',
                  display: 'block',
                  margin: '0 auto 10px'
                }} />
              )}
              <p style={{ margin: '0', color: selectedTeam?.id === team.id ? 'var(--color-cyan)' : 'rgba(192, 208, 255, 0.7)', fontWeight: '600' }}>
                {team.team_name}
              </p>
            </button>
          ))}
        </div>

        {selectedTeam && (
          <div className="roster-display neon-card p-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              {selectedTeam.logo_url && (
                <img src={selectedTeam.logo_url} alt={selectedTeam.team_name} style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px'
                }} />
              )}
              {!selectedTeam.logo_url && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: selectedTeam.team_color,
                  borderRadius: '8px'
                }} />
              )}
              <div>
                <h2 className="gradient-text" style={{ margin: '0 0 5px 0' }}>
                  {selectedTeam.team_name}
                </h2>
                <p style={{ margin: '0', color: 'rgba(192, 208, 255, 0.7)' }}>
                  {teamPlayers.length} Players
                </p>
              </div>
            </div>

            {teamPlayers.length === 0 ? (
              <p style={{ color: 'rgba(192, 208, 255, 0.6)' }}>No players on this roster yet</p>
            ) : (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0, 255, 255, 0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Player</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--color-cyan)' }}>Position</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--color-cyan)' }}>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPlayers.map((player) => (
                    <tr key={player.id} style={{ borderBottom: '1px solid rgba(0, 255, 255, 0.1)' }}>
                      <td style={{ padding: '12px', color: 'var(--color-cyan)', fontWeight: '600' }}>
                        {player.number || '-'}
                      </td>
                      <td style={{ padding: '12px', color: '#c0d0ff' }}>
                        {player.player_name}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px', color: 'rgba(192, 208, 255, 0.8)' }}>
                        {player.position}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px', color: 'var(--color-magenta)', fontWeight: '600' }}>
                        {player.overall}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NABBRosters;
