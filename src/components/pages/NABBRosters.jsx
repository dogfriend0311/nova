import React, { useState, useEffect } from 'react';
import './NABBRosters.css';

const isColorDark = (color) => {
  if (!color) return true;
  const hex = color.replace('#', '');
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 165;
};

const NABBRosters = () => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const loadedTeams = JSON.parse(localStorage.getItem('nabb_teams') || '[]');
    const loadedPlayers = JSON.parse(localStorage.getItem('nabb_players') || '[]');
    setTeams(loadedTeams);
    setPlayers(loadedPlayers);
    if (loadedTeams.length > 0) setSelectedTeam(loadedTeams[0]);
  }, []);

  const teamPlayers = selectedTeam
    ? players.filter(p => p.team === selectedTeam.team_name)
    : [];

  const activeColor  = selectedTeam?.team_color || '#00ffff';
  const onColor      = isColorDark(activeColor.replace('#', '')) ? '#ffffff' : '#111111';

  return (
    <div className="page nabb-rosters">
      <div className="page-header">
        <h1 className="gradient-text">⚾ NABB Rosters</h1>
        <p className="subtitle">Team Rosters &amp; Player Information</p>
      </div>

      <div className="rosters-container">
        {/* ── Team selector ── */}
        <div className="teams-selector">
          {teams.map(team => {
            const c   = team.team_color || '#00ffff';
            const act = selectedTeam?.id === team.id;
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                style={{
                  padding: '15px',
                  background: act ? `${c}22` : 'rgba(10,10,30,0.7)',
                  border: act ? `2px solid ${c}` : `1px solid ${c}33`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  boxShadow: act ? `0 0 18px ${c}22` : 'none',
                }}
              >
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.team_name} style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'block', margin: '0 auto 8px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '56px', height: '56px', background: `${c}33`, border: `2px solid ${c}55`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 8px' }}>⚾</div>
                )}
                <p style={{ margin: 0, color: act ? c : 'rgba(192,208,255,0.65)', fontWeight: '700', fontSize: '0.85rem' }}>
                  {team.team_name}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Roster display ── */}
        {selectedTeam && (
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Banner header */}
            <div style={{
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '20px',
              background: `linear-gradient(135deg, ${activeColor}20 0%, #07071a 70%)`,
              borderBottom: `3px solid ${activeColor}`,
              boxShadow: `0 4px 28px ${activeColor}14`,
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
            }}>
              {selectedTeam.logo_url ? (
                <img src={selectedTeam.logo_url} alt={selectedTeam.team_name} style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '10px', background: `${activeColor}22`, border: `2px solid ${activeColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>⚾</div>
              )}
              <div>
                <h2 style={{ margin: '0 0 4px', color: activeColor, fontWeight: '900', fontSize: '1.7rem', letterSpacing: '1px' }}>
                  {selectedTeam.team_name}
                </h2>
                <p style={{ margin: 0, color: 'rgba(192,208,255,0.5)', fontSize: '0.9rem' }}>
                  {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''} on roster
                </p>
              </div>
            </div>

            {/* Player table */}
            {teamPlayers.length === 0 ? (
              <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center', padding: '40px 0' }}>No players on this roster yet</p>
            ) : (
              <div style={{ background: 'rgba(10,10,30,0.85)', border: `1px solid ${activeColor}22`, borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: `${activeColor}12` }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: activeColor, fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `2px solid ${activeColor}44` }}>#</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: activeColor, fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `2px solid ${activeColor}44` }}>Player</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', color: activeColor, fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `2px solid ${activeColor}44` }}>Position</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', color: activeColor, fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `2px solid ${activeColor}44` }}>Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayers.map((player, i) => (
                      <tr key={player.id} style={{ borderBottom: `1px solid ${activeColor}18`, background: i % 2 === 0 ? 'transparent' : `${activeColor}06` }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: activeColor, color: onColor, fontWeight: '800', fontSize: '0.78rem', padding: '2px 8px', borderRadius: '5px' }}>
                            {player.number || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'rgba(192,208,255,0.92)', fontWeight: '600' }}>
                          {player.player_name}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(192,208,255,0.7)' }}>
                          {player.position || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: activeColor, fontWeight: '800', fontSize: '1rem' }}>
                          {player.overall || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NABBRosters;
