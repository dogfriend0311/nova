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

const RostersTab = ({ onSelectPlayer }) => {
  const [teams] = useState(JSON.parse(localStorage.getItem('nabb_teams') || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [selectedTeam, setSelectedTeam] = useState(null);

  if (selectedTeam) {
    const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);
    return (
      <div>
        <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={() => setSelectedTeam(null)}>
          ← Back to Teams
        </button>

        <div className="neon-card p-3" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          {selectedTeam.logo_url && (
            <img src={selectedTeam.logo_url} alt="logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '6px' }} />
          )}
          <div>
            <h3 className="gradient-text-cyan" style={{ margin: 0 }}>{selectedTeam.team_name}</h3>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(192,208,255,0.6)', fontSize: '0.9rem' }}>{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''} on roster</p>
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
                className="neon-card p-3"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (onSelectPlayer) {
                    const fresh = JSON.parse(localStorage.getItem('nabb_players') || '[]');
                    onSelectPlayer(fresh.find(p => p.id === player.id) || player);
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 className="gradient-text-cyan" style={{ margin: 0 }}>{player.player_name}</h4>
                  {player.number && <span style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.9rem' }}>#{player.number}</span>}
                </div>
                <div className="data-row">
                  <span className="data-label">Position</span>
                  <span className="data-value">{player.position || '—'}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Overall</span>
                  <span className="data-value">{player.overall || '—'}</span>
                </div>
                <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'rgba(0,255,255,0.6)', textAlign: 'center' }}>Click to view stats →</p>
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
            const teamPlayers = players.filter(p => p.team === team.team_name);
            return (
              <div
                key={team.id}
                className="neon-card p-3"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTeam(team)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="logo" style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '6px' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: team.team_color || 'linear-gradient(135deg, var(--color-cyan), var(--color-magenta))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚾</div>
                  )}
                  <h4 className="gradient-text-cyan" style={{ margin: 0 }}>{team.team_name}</h4>
                </div>
                <div className="data-row">
                  <span className="data-label">Players</span>
                  <span className="data-value">{teamPlayers.length}</span>
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'rgba(0,255,255,0.6)', textAlign: 'center' }}>Click to view roster →</p>
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
  const [selectedGame, setSelectedGame] = useState(null);

  if (selectedGame) {
    const gameScores = boxScores.filter(b => b.game_id === selectedGame.id);
    const getPlayerName = (id) => players.find(p => p.id === id)?.player_name || 'Unknown';

    return (
      <div>
        <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={() => setSelectedGame(null)}>
          ← Back to Box Scores
        </button>
        <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
          <h3 className="gradient-text-cyan">{selectedGame.game_name}</h3>
          <p style={{ color: 'rgba(192,208,255,0.7)', marginTop: '8px' }}>
            {selectedGame.home_team} <strong style={{ color: 'var(--color-cyan)' }}>{selectedGame.home_score}</strong>
            {' — '}
            <strong style={{ color: 'var(--color-cyan)' }}>{selectedGame.away_score}</strong> {selectedGame.away_team}
          </p>
          {selectedGame.game_date && <p style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.85rem', marginTop: '4px' }}>{new Date(selectedGame.game_date).toLocaleDateString()}</p>}
        </div>

        {gameScores.length === 0 ? (
          <div className="neon-card p-3"><p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No player stats logged for this game</p></div>
        ) : (
          <div className="neon-card p-3" style={{ overflowX: 'auto' }}>
            <h4 className="gradient-text-magenta" style={{ marginBottom: '15px' }}>Player Stats</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Player', 'Team', 'H', 'R', 'RBI', 'HR', 'K', 'IP', 'KP', 'HA', 'ER'].map(h => (
                    <th key={h} style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', textAlign: 'center', borderBottom: '1px solid rgba(0,255,255,0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gameScores.map((score, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,255,255,0.05)' }}>
                    <td style={{ padding: '8px', color: 'var(--color-cyan)' }}>{getPlayerName(score.player_id)}</td>
                    <td style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', textAlign: 'center' }}>{score.team || '—'}</td>
                    {[score.hits, score.runs, score.rbis, score.home_runs, score.strike_outs,
                      score.innings_pitched, score.strikeouts_pitched, score.hits_allowed, score.earned_runs].map((v, j) => (
                      <td key={j} style={{ padding: '8px', textAlign: 'center', color: 'rgba(192,208,255,0.9)' }}>{v || 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
