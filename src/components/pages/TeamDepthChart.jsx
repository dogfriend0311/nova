import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import db from '../../services/db';
import { getSport } from '../../data/sportsConfig';
import './TeamDepthChart.css';

const isColorDark = (color) => {
  if (!color) return true;
  const hex = color.replace('#', '');
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 165;
};

// Positions without a depth_rank yet fall back to sorting by overall
// (highest first) so a freshly-added roster still shows a sensible depth
// order before anyone has manually arranged it.
const sortDepth = (players) => [...players].sort((a, b) => {
  const ar = typeof a.depth_rank === 'number' ? a.depth_rank : null;
  const br = typeof b.depth_rank === 'number' ? b.depth_rank : null;
  if (ar !== null && br !== null) return ar - br;
  if (ar !== null) return -1;
  if (br !== null) return 1;
  return (b.overall || 0) - (a.overall || 0);
});

/**
 * TeamDepthChart — shows a team's roster grouped by position, ranked by
 * depth (starter first, then backups). Staff (owner/cofounder/mod) can
 * reorder players within a position with up/down controls; everyone else
 * sees a read-only chart. Order is persisted via player.depth_rank
 * (unique per player, compared within a position group — see sortDepth).
 *
 * Props:
 *   league — sport/league prefix, e.g. 'vizta', 'nabb' (default 'vizta')
 */
const TeamDepthChart = ({ league = 'vizta' }) => {
  const { user } = useAuth();
  const role = user?.role;
  const canEdit = ['owner', 'cofounder', 'mod'].includes(role);

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const cfg = getSport(league);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([db.getTeams(league), db.getPlayers(league)]).then(([t, p]) => {
      if (!active) return;
      setTeams(t);
      setPlayers(p);
      setSelectedTeam((prev) => prev || (t.length > 0 ? t[0] : null));
      setLoading(false);
    });
    return () => { active = false; };
  }, [league]);

  const teamPlayers = useMemo(
    () => (selectedTeam ? players.filter((p) => p.team === selectedTeam.team_name) : []),
    [players, selectedTeam]
  );

  const byPosition = useMemo(() => {
    const groups = {};
    teamPlayers.forEach((p) => {
      const pos = p.position || 'Unassigned';
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(p);
    });
    Object.keys(groups).forEach((pos) => { groups[pos] = sortDepth(groups[pos]); });
    return groups;
  }, [teamPlayers]);

  const positionOrder = Object.keys(byPosition).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  const activeColor = selectedTeam?.team_color || cfg.accent || '#00ffff';
  const onColor = isColorDark(activeColor.replace('#', '')) ? '#ffffff' : '#111111';

  const move = async (position, playerId, direction) => {
    const group = byPosition[position];
    const idx = group.findIndex((p) => p.id === playerId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= group.length) return;

    const reordered = [...group];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    setSavingId(playerId);
    // Optimistic local update so the reorder feels instant.
    const updates = reordered.map((p, i) => ({ ...p, depth_rank: i }));
    setPlayers((prev) => prev.map((p) => {
      const match = updates.find((u) => u.id === p.id);
      return match ? { ...p, depth_rank: match.depth_rank } : p;
    }));

    await Promise.all(updates.map((p) => db.savePlayer(league, { id: p.id, depth_rank: p.depth_rank })));
    setSavingId(null);
  };

  return (
    <div className="page depth-chart-page">
      <div className="page-header">
        <h1 className="gradient-text">{cfg.icon} {cfg.label} Depth Chart</h1>
        <p className="subtitle">
          {canEdit
            ? 'Roster grouped by position, ranked by depth — use the arrows to set who starts.'
            : 'Roster grouped by position, ranked from starter to backup.'}
        </p>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div></div>
      ) : (
        <div className="depth-chart-container">
          <div className="teams-selector">
            {teams.map((team) => {
              const c = team.team_color || '#00ffff';
              const active = selectedTeam?.id === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`depth-team-btn${active ? ' depth-team-btn--active' : ''}`}
                  style={{
                    background: active ? `${c}22` : 'rgba(10,10,30,0.7)',
                    border: active ? `2px solid ${c}` : `1px solid ${c}33`,
                    boxShadow: active ? `0 0 18px ${c}22` : 'none',
                  }}
                >
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.team_name} className="depth-team-logo" />
                  ) : (
                    <div className="depth-team-logo depth-team-logo--fallback" style={{ background: `${c}33`, border: `2px solid ${c}55` }}>
                      {cfg.icon}
                    </div>
                  )}
                  <p style={{ color: active ? c : 'rgba(192,208,255,0.65)' }}>{team.team_name}</p>
                </button>
              );
            })}
            {teams.length === 0 && <p className="depth-chart-empty">No teams set up for this league yet.</p>}
          </div>

          {selectedTeam && (
            <div className="depth-chart-body">
              <div
                className="depth-chart-banner"
                style={{
                  background: `linear-gradient(135deg, ${activeColor}20 0%, #07071a 70%)`,
                  borderBottom: `3px solid ${activeColor}`,
                  boxShadow: `0 4px 28px ${activeColor}14`,
                }}
              >
                {selectedTeam.logo_url ? (
                  <img src={selectedTeam.logo_url} alt={selectedTeam.team_name} className="depth-chart-banner-logo" />
                ) : (
                  <div className="depth-chart-banner-logo depth-chart-banner-logo--fallback" style={{ background: `${activeColor}22`, border: `2px solid ${activeColor}44` }}>
                    {cfg.icon}
                  </div>
                )}
                <div>
                  <h2 style={{ color: activeColor }}>{selectedTeam.team_name}</h2>
                  <p>{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''} on roster · {positionOrder.length} position group{positionOrder.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {teamPlayers.length === 0 ? (
                <p className="depth-chart-empty">No players on this roster yet.</p>
              ) : (
                <div className="depth-position-groups">
                  {positionOrder.map((pos) => (
                    <div key={pos} className="depth-position-group" style={{ borderColor: `${activeColor}22` }}>
                      <div className="depth-position-header" style={{ background: `${activeColor}12`, color: activeColor }}>
                        {pos}
                      </div>
                      <div className="depth-position-rows">
                        {byPosition[pos].map((player, i) => (
                          <div key={player.id} className="depth-position-row" style={{ borderColor: `${activeColor}18` }}>
                            <span className="depth-rank-badge" style={{ background: activeColor, color: onColor }}>
                              {i === 0 ? 'STARTER' : `#${i + 1}`}
                            </span>
                            <span className="depth-player-name">{player.player_name}</span>
                            {player.overall != null && <span className="depth-player-overall" style={{ color: activeColor }}>{player.overall} OVR</span>}
                            {canEdit && (
                              <span className="depth-reorder-controls">
                                <button
                                  onClick={() => move(pos, player.id, -1)}
                                  disabled={i === 0 || savingId === player.id}
                                  aria-label={`Move ${player.player_name} up`}
                                  title="Move up"
                                >▲</button>
                                <button
                                  onClick={() => move(pos, player.id, 1)}
                                  disabled={i === byPosition[pos].length - 1 || savingId === player.id}
                                  aria-label={`Move ${player.player_name} down`}
                                  title="Move down"
                                >▼</button>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamDepthChart;
