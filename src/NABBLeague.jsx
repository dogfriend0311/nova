import React, { useState } from 'react';
import './NABBLeague.css';

const NABBLeague = ({ onSelectPlayer }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'rosters': return <RostersTab onSelectPlayer={onSelectPlayer} />;
      case 'players': return <PlayersTab onSelectPlayer={onSelectPlayer} />;
      case 'leaders': return <LeagueLeadersTab onSelectPlayer={onSelectPlayer} />;
      case 'feed': return <GameFeedTab />;
      case 'scores': return <BoxScoresTab />;
      case 'compare': return <CompareTab />;
      case 'halloffame': return <HallOfFameTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="page nabb-league">
      <div className="page-header">
        <h1 className="gradient-text">⚾ NABB</h1>
        <p className="subtitle">Roblox Baseball League</p>
      </div>

      <div className="league-tabs">
        {[
          { id: 'overview', label: '🏟️ Overview' },
          { id: 'rosters', label: '👥 Rosters' },
          { id: 'players', label: '🎮 Players' },
          { id: 'leaders', label: '📊 League Leaders' },
          { id: 'feed', label: '📰 Game Feed' },
          { id: 'scores', label: '📈 Box Scores' },
          { id: 'compare', label: '⚔️ Compare' },
          { id: 'halloffame', label: '🏆 Hall of Fame' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`league-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="league-content">{renderTabContent()}</div>
    </div>
  );
};

const OverviewTab = () => {
  const teams = JSON.parse(localStorage.getItem('nabb_teams') || '[]');
  const players = JSON.parse(localStorage.getItem('nabb_players') || '[]');
  const bsGames = JSON.parse(localStorage.getItem('nabb_bs_games') || '[]');
  const recentGames = [...bsGames].reverse().slice(0, 3);

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
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 8px rgba(0,255,0,0.6)' }}></span>
              ONGOING
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">Teams</span>
            <span className="data-value">{teams.length}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Players</span>
            <span className="data-value">{players.length}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Games Played</span>
            <span className="data-value">{bsGames.length}</span>
          </div>
        </div>
      </div>

      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Recent Games</h3>
        {recentGames.length === 0 ? (
          <p style={{ marginTop: '15px', color: 'rgba(192,208,255,0.7)' }}>No games played yet</p>
        ) : (
          <div className="mt-2">
            {recentGames.map(game => (
              <div key={game.id} className="data-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '10px 0', borderBottom: '1px solid rgba(0,255,255,0.08)' }}>
                <span style={{ color: 'var(--color-cyan)', fontWeight: '600', fontSize: '0.9rem' }}>{game.game_name}</span>
                <span style={{ color: 'rgba(192,208,255,0.8)' }}>
                  {game.home_team} <strong>{game.home_score}</strong> — <strong>{game.away_score}</strong> {game.away_team}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const rosterColorDark = (color) => {
  if (!color) return true;
  const hex = color.replace('#', '');
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 165;
};

const RostersTab = ({ onSelectPlayer }) => {
  const [teams] = useState(JSON.parse(localStorage.getItem('nabb_teams') || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [selectedTeam, setSelectedTeam] = useState(null);

  if (selectedTeam) {
    const color    = selectedTeam.team_color || '#00ffff';
    const onColor  = rosterColorDark(color) ? '#ffffff' : '#111111';
    const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);

    return (
      <div>
        {/* Themed banner */}
        <div style={{
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '22px',
          background: `linear-gradient(135deg, ${color}20 0%, #07071a 70%)`,
          borderBottom: `3px solid ${color}`,
          boxShadow: `0 4px 28px ${color}14`,
        }}>
          <button
            className="neon-button"
            style={{ marginBottom: '16px', fontSize: '0.85rem', borderColor: `${color}88`, color }}
            onClick={() => setSelectedTeam(null)}
          >
            ← Back to Teams
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {selectedTeam.logo_url ? (
              <img src={selectedTeam.logo_url} alt="logo" style={{ width: '68px', height: '68px', objectFit: 'contain', borderRadius: '8px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
            ) : (
              <div style={{ width: '68px', height: '68px', borderRadius: '8px', background: `${color}22`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>⚾</div>
            )}
            <div>
              <h3 style={{ margin: '0 0 5px', fontSize: '1.6rem', fontWeight: '900', color, letterSpacing: '1px' }}>
                {selectedTeam.team_name}
              </h3>
              <p style={{ margin: 0, color: 'rgba(192,208,255,0.5)', fontSize: '0.88rem' }}>
                {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''} on roster
              </p>
            </div>
          </div>
        </div>

        {teamPlayers.length === 0 ? (
          <div className="neon-card p-3">
            <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No players on this roster yet</p>
          </div>
        ) : (
          <div className="card-grid">
            {teamPlayers.map(player => (
              <div
                key={player.id}
                style={{
                  background: `linear-gradient(160deg, ${color}0e 0%, rgba(8,8,26,0.95) 100%)`,
                  border: `1px solid ${color}33`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.12s',
                }}
                onClick={() => {
                  if (onSelectPlayer) {
                    const fresh = JSON.parse(localStorage.getItem('nabb_players') || '[]');
                    onSelectPlayer(fresh.find(p => p.id === player.id) || player);
                  }
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color, fontWeight: '800' }}>{player.player_name}</h4>
                  {player.number && (
                    <span style={{ background: color, color: onColor, fontWeight: '800', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '5px' }}>
                      #{player.number}
                    </span>
                  )}
                </div>
                <div className="data-row">
                  <span className="data-label">Position</span>
                  <span className="data-value">{player.position || '—'}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Overall</span>
                  <span style={{ fontWeight: '800', color }}>{player.overall || '—'}</span>
                </div>
                <p style={{ marginTop: '10px', fontSize: '0.78rem', color: `${color}99`, textAlign: 'center' }}>Click to view stats →</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {teams.length === 0 ? (
        <div className="neon-card p-3">
          <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No teams created yet</p>
        </div>
      ) : (
        <div className="card-grid">
          {teams.map(team => {
            const color = team.team_color || '#00ffff';
            const teamPlayers = players.filter(p => p.team === team.team_name);
            return (
              <div
                key={team.id}
                style={{
                  background: `linear-gradient(160deg, ${color}0a 0%, rgba(8,8,26,0.95) 100%)`,
                  border: `1px solid ${color}2a`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.12s',
                }}
                onClick={() => setSelectedTeam(team)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="logo" style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '6px' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: `${color}22`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚾</div>
                  )}
                  <h4 style={{ margin: 0, color, fontWeight: '800' }}>{team.team_name}</h4>
                </div>
                <div className="data-row">
                  <span className="data-label">Players</span>
                  <span className="data-value">{teamPlayers.length}</span>
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.8rem', color: `${color}88`, textAlign: 'center' }}>Click to view roster →</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PlayersTab = ({ onSelectPlayer }) => {
  const [players] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [search, setSearch] = useState('');

  const filtered = players.filter(p =>
    p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.team?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search players or teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="neon-card p-3">
          <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>
            {players.length === 0 ? 'No players added yet' : 'No players match your search'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(player => (
            <div
              key={player.id}
              className="neon-card p-3"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (onSelectPlayer) {
                  const fresh = JSON.parse(localStorage.getItem('nabb_players') || '[]');
                  onSelectPlayer(fresh.find(p => p.id === player.id) || player);
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 className="gradient-text-cyan" style={{ margin: 0 }}>{player.player_name}</h4>
                {player.number && <span style={{ color: 'rgba(192,208,255,0.5)' }}>#{player.number}</span>}
              </div>
              <div className="data-row">
                <span className="data-label">Team</span>
                <span className="data-value">{player.team || 'Free Agent'}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Position</span>
                <span className="data-value">{player.position || '—'}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Overall</span>
                <span className="data-value">{player.overall || '—'}</span>
              </div>
              <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'rgba(0,255,255,0.6)', textAlign: 'center' }}>Click to view stat page →</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LeagueLeadersTab = ({ onSelectPlayer }) => {
  const players = JSON.parse(localStorage.getItem('nabb_players') || '[]');
  const boxScores = JSON.parse(localStorage.getItem('nabb_box_scores') || '[]');

  const withStats = players.map(p => {
    const scores = boxScores.filter(b => b.player_id === p.id);
    return {
      ...p,
      total_hr: scores.reduce((s, b) => s + (parseInt(b.home_runs) || 0), 0) + (parseInt(p.home_runs) || 0),
      total_hits: scores.reduce((s, b) => s + (parseInt(b.hits) || 0), 0) + (parseInt(p.hits) || 0),
      total_rbis: scores.reduce((s, b) => s + (parseInt(b.rbis) || 0), 0) + (parseInt(p.rbis) || 0),
      total_runs: scores.reduce((s, b) => s + (parseInt(b.runs) || 0), 0) + (parseInt(p.runs) || 0),
      total_k: scores.reduce((s, b) => s + (parseInt(b.strikeouts_pitched) || 0), 0) + (parseInt(p.strikeouts_pitched) || 0),
    };
  });

  const hrLeaders = [...withStats].sort((a, b) => b.total_hr - a.total_hr).slice(0, 8);
  const hitsLeaders = [...withStats].sort((a, b) => b.total_hits - a.total_hits).slice(0, 8);
  const rbiLeaders = [...withStats].sort((a, b) => b.total_rbis - a.total_rbis).slice(0, 8);
  const kLeaders = [...withStats].sort((a, b) => b.total_k - a.total_k).slice(0, 8);

  const LeaderTable = ({ title, leaders, statKey, statLabel, color }) => (
    <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
      <h3 className={color === 'cyan' ? 'gradient-text-cyan' : 'gradient-text-magenta'} style={{ marginBottom: '15px' }}>{title}</h3>
      {leaders.length === 0 || leaders[0][statKey] === 0 ? (
        <p style={{ color: 'rgba(192,208,255,0.5)' }}>No data yet</p>
      ) : (
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(192,208,255,0.6)', fontSize: '0.8rem' }}>Player</th>
              <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(192,208,255,0.6)', fontSize: '0.8rem' }}>Team</th>
              <th style={{ textAlign: 'center', padding: '8px', color: 'rgba(192,208,255,0.6)', fontSize: '0.8rem' }}>{statLabel}</th>
            </tr>
          </thead>
          <tbody>
            {leaders.filter(p => p[statKey] > 0).map((p, i) => (
              <tr
                key={p.id}
                style={{ cursor: 'pointer', borderBottom: '1px solid rgba(0,255,255,0.06)' }}
                onClick={() => {
                  if (onSelectPlayer) {
                    const fresh = JSON.parse(localStorage.getItem('nabb_players') || '[]');
                    onSelectPlayer(fresh.find(fp => fp.id === p.id) || p);
                  }
                }}
              >
                <td style={{ padding: '8px', color: i === 0 ? 'var(--color-cyan)' : 'rgba(192,208,255,0.9)', fontWeight: i === 0 ? '700' : 'normal' }}>
                  {i + 1}. {p.player_name}
                </td>
                <td style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', fontSize: '0.85rem' }}>{p.team || 'FA'}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: i === 0 ? 'var(--color-magenta)' : 'var(--color-cyan)', fontWeight: '700' }}>{p[statKey]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <LeaderTable title="🏠 Home Run Leaders" leaders={hrLeaders} statKey="total_hr" statLabel="HR" color="cyan" />
      <LeaderTable title="⚾ Hits Leaders" leaders={hitsLeaders} statKey="total_hits" statLabel="H" color="magenta" />
      <LeaderTable title="🏃 RBI Leaders" leaders={rbiLeaders} statKey="total_rbis" statLabel="RBI" color="cyan" />
      <LeaderTable title="⚡ Strikeout Leaders (Pitching)" leaders={kLeaders} statKey="total_k" statLabel="K" color="magenta" />
    </div>
  );
};

const GameFeedTab = () => {
  const feed = JSON.parse(localStorage.getItem('nabb_feed') || '[]');
  const sorted = [...feed].reverse();

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">📰 Game Feed</h3>
        {sorted.length === 0 ? (
          <p style={{ marginTop: '15px', color: 'rgba(192,208,255,0.7)' }}>Game updates and news will appear here</p>
        ) : (
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sorted.map((entry, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.1)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-cyan)', fontWeight: '600', fontSize: '0.85rem' }}>{entry.event_type || 'Event'}</span>
                  {entry.timestamp && <span style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.75rem' }}>{new Date(entry.timestamp).toLocaleString()}</span>}
                </div>
                <p style={{ margin: 0, color: 'rgba(192,208,255,0.85)', fontSize: '0.9rem' }}>{entry.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BoxScoresTab = () => {
  const [bsGames] = useState(JSON.parse(localStorage.getItem('nabb_bs_games') || '[]'));
  const [boxScores] = useState(JSON.parse(localStorage.getItem('nabb_box_scores') || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [teams] = useState(JSON.parse(localStorage.getItem('nabb_teams') || '[]'));
  const [selectedGame, setSelectedGame] = useState(null);

  const getTeamColor = (name) => teams.find(t => t.team_name === name)?.team_color || null;
  const getTeamLogo  = (name) => teams.find(t => t.team_name === name)?.logo_url   || null;
  const getPlayer    = (id)   => players.find(p => p.id === id);

  const thS = { padding: '7px 8px', color: 'rgba(192,208,255,0.5)', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid rgba(0,255,255,0.08)' };
  const tdS = (cyan) => ({ padding: '7px 8px', textAlign: 'center', color: cyan ? 'var(--color-cyan)' : 'rgba(192,208,255,0.85)', fontSize: '0.83rem', borderBottom: '1px solid rgba(0,255,255,0.04)' });

  const TeamTable = ({ teamName, scores, accent }) => {
    const color = getTeamColor(teamName) || accent;
    const logo  = getTeamLogo(teamName);
    if (scores.length === 0) return null;
    return (
      <div className="neon-card p-3" style={{ marginBottom: '16px', borderTop: `3px solid ${color || accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {logo
            ? <img src={logo} alt={teamName} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }} />
            : <div style={{ width: '32px', height: '32px', background: color || accent, borderRadius: '4px', opacity: 0.7 }} />
          }
          <h4 style={{ margin: 0, color: color || accent, fontWeight: '800', fontSize: '0.95rem' }}>
            {teamName || 'Unknown Team'}
          </h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '480px' }}>
            <thead>
              <tr>
                <th style={{ ...thS, textAlign: 'left', minWidth: '120px' }}>Player</th>
                {['H','R','RBI','HR','K','IP','KP','HA','ER'].map(h => <th key={h} style={thS}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {scores.map((score, i) => {
                const p = getPlayer(score.player_id);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,255,255,0.04)' }}>
                    <td style={{ ...tdS(false), textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {p?.avatar_data
                          ? <img src={p.avatar_data} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${color || accent}44` }} />
                          : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${color || accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', flexShrink: 0 }}>🎮</div>
                        }
                        <span style={{ color: color || 'var(--color-cyan)', fontWeight: '600' }}>{p?.player_name || '?'}</span>
                      </div>
                    </td>
                    {[score.hits, score.runs, score.rbis, score.home_runs, score.strike_outs,
                      score.innings_pitched, score.strikeouts_pitched, score.hits_allowed, score.earned_runs].map((v, j) => (
                      <td key={j} style={tdS(false)}>{v || 0}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (selectedGame) {
    const gameScores    = boxScores.filter(b => b.game_id === selectedGame.id);
    const homeScores    = gameScores.filter(s => s.team === selectedGame.home_team);
    const awayScores    = gameScores.filter(s => s.team === selectedGame.away_team);
    const otherScores   = gameScores.filter(s => s.team !== selectedGame.home_team && s.team !== selectedGame.away_team);
    const homeWin       = selectedGame.home_score > selectedGame.away_score;
    const awayWin       = selectedGame.away_score > selectedGame.home_score;

    return (
      <div>
        <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={() => setSelectedGame(null)}>
          ← Back to Box Scores
        </button>

        {/* Score header */}
        <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
          <h3 className="gradient-text-cyan" style={{ marginBottom: '14px' }}>{selectedGame.game_name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              {getTeamLogo(selectedGame.home_team) && <img src={getTeamLogo(selectedGame.home_team)} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />}
              <p style={{ margin: '0 0 4px', color: getTeamColor(selectedGame.home_team) || 'var(--color-cyan)', fontWeight: '700' }}>{selectedGame.home_team || 'Home'}</p>
              <p style={{ margin: 0, fontSize: homeWin ? '2rem' : '1.6rem', fontWeight: '800', color: homeWin ? 'var(--color-cyan)' : 'rgba(192,208,255,0.6)' }}>{selectedGame.home_score}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'rgba(192,208,255,0.3)', fontSize: '1.2rem' }}>—</span>
              {selectedGame.game_date && <p style={{ margin: '6px 0 0', color: 'rgba(192,208,255,0.4)', fontSize: '0.75rem' }}>{new Date(selectedGame.game_date).toLocaleDateString()}</p>}
            </div>
            <div style={{ textAlign: 'center' }}>
              {getTeamLogo(selectedGame.away_team) && <img src={getTeamLogo(selectedGame.away_team)} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />}
              <p style={{ margin: '0 0 4px', color: getTeamColor(selectedGame.away_team) || 'var(--color-magenta)', fontWeight: '700' }}>{selectedGame.away_team || 'Away'}</p>
              <p style={{ margin: 0, fontSize: awayWin ? '2rem' : '1.6rem', fontWeight: '800', color: awayWin ? 'var(--color-magenta)' : 'rgba(192,208,255,0.6)' }}>{selectedGame.away_score}</p>
            </div>
          </div>
        </div>

        {gameScores.length === 0 ? (
          <div className="neon-card p-3"><p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No player stats logged for this game</p></div>
        ) : (
          <>
            <TeamTable teamName={selectedGame.home_team} scores={homeScores} accent="var(--color-cyan)" />
            <TeamTable teamName={selectedGame.away_team} scores={awayScores} accent="var(--color-magenta)" />
            {otherScores.length > 0 && <TeamTable teamName="Other" scores={otherScores} accent="rgba(192,208,255,0.6)" />}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">📈 Box Scores</h3>
        {bsGames.length === 0 ? (
          <p style={{ marginTop: '15px', color: 'rgba(192,208,255,0.7)' }}>No box scores logged yet</p>
        ) : (
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...bsGames].reverse().map(game => (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game)}
                style={{ padding: '15px', background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,255,0.04)'}
              >
                <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: 'var(--color-cyan)' }}>{game.game_name}</p>
                <p style={{ margin: 0, color: 'rgba(192,208,255,0.8)' }}>
                  {game.home_team} <strong>{game.home_score}</strong> — <strong>{game.away_score}</strong> {game.away_team}
                </p>
                {game.game_date && <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.4)' }}>{new Date(game.game_date).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CompareTab = () => {
  const [players] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [teams]   = useState(JSON.parse(localStorage.getItem('nabb_teams')   || '[]'));
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [mode, setMode] = useState('career');

  const getTeamColor = (name) => teams.find(t => t.team_name === name)?.team_color || null;
  const pA = players.find(p => p.id === idA);
  const pB = players.find(p => p.id === idB);
  const colorA = (pA && getTeamColor(pA.team)) || '#00ffff';
  const colorB = (pB && getTeamColor(pB.team)) || '#ff00ff';

  const getStats = (p) => {
    if (!p) return null;
    return mode === 'season' ? {
      'H':       parseInt(p.season_hits)              || 0,
      'R':       parseInt(p.season_runs)              || 0,
      'RBI':     parseInt(p.season_rbis)              || 0,
      'HR':      parseInt(p.season_home_runs)         || 0,
      'K (Bat)': parseInt(p.season_strike_outs)       || 0,
      'IP':      parseFloat(p.season_innings_pitched) || 0,
      'K (Pit)': parseInt(p.season_strikeouts_pitched)|| 0,
      'H All':   parseInt(p.season_hits_allowed)      || 0,
      'ER':      parseInt(p.season_earned_runs)       || 0,
    } : {
      'H':       parseInt(p.hits)              || 0,
      'R':       parseInt(p.runs)              || 0,
      'RBI':     parseInt(p.rbis)              || 0,
      'HR':      parseInt(p.home_runs)         || 0,
      'K (Bat)': parseInt(p.strike_outs)       || 0,
      'IP':      parseFloat(p.innings_pitched) || 0,
      'K (Pit)': parseInt(p.strikeouts_pitched)|| 0,
      'H All':   parseInt(p.hits_allowed)      || 0,
      'ER':      parseInt(p.earned_runs)       || 0,
    };
  };

  const lowerBetter = new Set(['K (Bat)', 'H All', 'ER']);
  const isBetter = (key, a, b) => {
    if (a === b) return null;
    return lowerBetter.has(key) ? a < b : a > b;
  };

  const sA = getStats(pA);
  const sB = getStats(pB);

  const selStyle = (border) => ({
    padding: '10px 12px', background: 'rgba(10,10,30,0.85)',
    border: `1px solid ${border}55`, color: '#c0d0ff',
    borderRadius: '8px', fontSize: '0.88rem', width: '100%', cursor: 'pointer',
  });

  return (
    <div>
      {/* Player selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(192,208,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Player A</label>
          <select value={idA} onChange={e => setIdA(e.target.value)} style={selStyle(colorA)}>
            <option value="">Select player…</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.player_name}{p.team ? ` (${p.team})` : ''}</option>)}
          </select>
        </div>
        <span style={{ color: 'rgba(192,208,255,0.3)', fontWeight: '800', fontSize: '1rem' }}>VS</span>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(192,208,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Player B</label>
          <select value={idB} onChange={e => setIdB(e.target.value)} style={selStyle(colorB)}>
            <option value="">Select player…</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.player_name}{p.team ? ` (${p.team})` : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '22px' }}>
        {['career','season'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '8px 22px',
            background: mode === m ? 'rgba(0,255,255,0.12)' : 'rgba(10,10,30,0.7)',
            border: mode === m ? '1px solid rgba(0,255,255,0.45)' : '1px solid rgba(100,120,200,0.18)',
            color: mode === m ? 'var(--color-cyan)' : 'rgba(192,208,255,0.45)',
            borderRadius: '8px', cursor: 'pointer', fontWeight: '700',
            fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {m === 'career' ? '⭐ Career' : '📅 Season'}
          </button>
        ))}
      </div>

      {/* Player cards */}
      {(pA || pB) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
          {[{ p: pA, color: colorA, side: 'A' }, { p: pB, color: colorB, side: 'B' }].map(({ p, color, side }) => (
            <div key={side} style={{
              background: p ? `linear-gradient(160deg,${color}0d 0%,rgba(8,8,26,0.95) 100%)` : 'rgba(10,10,30,0.5)',
              border: `1px solid ${p ? color + '30' : 'rgba(100,120,200,0.1)'}`,
              borderTop: `3px solid ${p ? color : 'rgba(100,120,200,0.2)'}`,
              borderRadius: '10px', padding: '16px', textAlign: 'center',
              minHeight: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: p ? 'flex-start' : 'center',
            }}>
              {p ? (
                <>
                  {p.avatar_data
                    ? <img src={p.avatar_data} alt={p.player_name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}55`, marginBottom: '8px' }} />
                    : <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: '8px' }}>🎮</div>
                  }
                  <h4 style={{ margin: '0 0 3px', color, fontWeight: '800', fontSize: '0.95rem' }}>{p.player_name}</h4>
                  {p.team && <span style={{ fontSize: '0.75rem', color: `${color}99`, marginBottom: '5px' }}>{p.team}</span>}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                    {p.position && <span style={{ fontSize: '0.7rem', background: `${color}1a`, color, padding: '2px 7px', borderRadius: '4px' }}>{p.position}</span>}
                    {p.overall   && <span style={{ fontSize: '0.7rem', background: 'rgba(255,215,0,0.12)', color: '#ffd700', padding: '2px 7px', borderRadius: '4px' }}>OVR {p.overall}</span>}
                  </div>
                </>
              ) : (
                <span style={{ color: 'rgba(192,208,255,0.3)', fontSize: '0.82rem' }}>Select Player {side}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats table */}
      {sA && sB && (
        <div style={{ background: 'rgba(10,10,30,0.8)', border: '1px solid rgba(100,120,200,0.13)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderBottom: '1px solid rgba(100,120,200,0.15)' }}>
            <span style={{ color: colorA, fontWeight: '800', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pA?.player_name}</span>
            <span style={{ color: 'rgba(192,208,255,0.35)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', alignSelf: 'center' }}>STAT</span>
            <span style={{ color: colorB, fontWeight: '800', fontSize: '0.88rem', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pB?.player_name}</span>
          </div>
          {Object.entries(sA).map(([key, valA]) => {
            const valB  = sB[key];
            const aBest = isBetter(key, valA, valB);
            const bBest = isBetter(key, valB, valA);
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', padding: '11px 14px', borderBottom: '1px solid rgba(100,120,200,0.07)', alignItems: 'center' }}>
                <span style={{ fontWeight: aBest ? '800' : '400', color: aBest ? colorA : 'rgba(192,208,255,0.55)', fontSize: '0.95rem' }}>{valA}</span>
                <span style={{ color: 'rgba(192,208,255,0.3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>{key}</span>
                <span style={{ fontWeight: bBest ? '800' : '400', color: bBest ? colorB : 'rgba(192,208,255,0.55)', fontSize: '0.95rem', textAlign: 'right' }}>{valB}</span>
              </div>
            );
          })}
        </div>
      )}

      {!pA && !pB && (
        <div className="neon-card p-3" style={{ textAlign: 'center', marginTop: '10px' }}>
          <p style={{ color: 'rgba(192,208,255,0.4)' }}>Select two players above to compare their stats head-to-head</p>
        </div>
      )}
    </div>
  );
};

const HallOfFameTab = () => {
  const hof = JSON.parse(localStorage.getItem('nabb_hof') || '[]');

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">🏆 Hall of Fame</h3>
        {hof.length === 0 ? (
          <p style={{ marginTop: '15px', color: 'rgba(192,208,255,0.7)' }}>Hall of Fame players will appear here</p>
        ) : (
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hof.map((entry, i) => (
              <div key={i} style={{ padding: '15px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontWeight: '700', color: '#ffd700' }}>{entry.player_name}</p>
                {entry.team && <p style={{ margin: '4px 0 0 0', color: 'rgba(192,208,255,0.7)', fontSize: '0.85rem' }}>{entry.team}</p>}
                {entry.description && <p style={{ margin: '8px 0 0 0', color: 'rgba(192,208,255,0.8)', fontSize: '0.9rem' }}>{entry.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NABBLeague;
