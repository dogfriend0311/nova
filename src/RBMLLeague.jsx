import React, { useState, useEffect } from 'react';
import db from './services/db';
import './RBMLLeague.css';

const RBMLLeague = ({ onSelectPlayer }) => {
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
        <h1 className="gradient-text rbml-title">âš¾ RBML</h1>
        <p className="subtitle">Roblox Baseball League</p>
      </div>

      <div className="league-tabs">
        {[
          { id: 'overview', label: 'ðŸŸï¸ Overview' },
          { id: 'rosters', label: 'ðŸ‘¥ Rosters' },
          { id: 'players', label: 'ðŸŽ® Players' },
          { id: 'leaders', label: 'ðŸ“Š League Leaders' },
          { id: 'feed', label: 'ðŸ“° Game Feed' },
          { id: 'scores', label: 'ðŸ“ˆ Box Scores' },
          { id: 'compare', label: 'âš”ï¸ Compare' },
          { id: 'halloffame', label: 'ðŸ† Hall of Fame' },
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
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bsGames, setBsGames] = useState([]);
  useEffect(() => {
    db.getTeams('rbml').then(setTeams);
    db.getPlayers('rbml').then(setPlayers);
    db.getBsGames('rbml').then(setBsGames);
  }, []);
  const recentGames = [...bsGames].reverse().slice(0, 3);

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">RBML Overview</h3>
        <div className="mt-2">
          <div className="data-row">
            <span className="data-label">League</span>
            <span className="data-value">RBML</span>
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
                  {game.home_team} <strong>{game.home_score}</strong> â€” <strong>{game.away_score}</strong> {game.away_team}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
  if (!color) return true;
  const hex = color.replace('#', '');
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 165;
};

const RostersTab = ({ onSelectPlayer }) => {
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getTeams('rbml'), db.getPlayers('rbml')])
      .then(([t, p]) => { setTeams(t); setPlayers(p); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color:'rgba(192,208,255,0.5)', padding:'40px', textAlign:'center' }}>Loading...</p>;

  if (!selectedTeam) return (
    <div>
      <h2 className="gradient-text-cyan">Rosters</h2>
      <div className="card-container" style={{ marginTop:'20px' }}>
        {teams.length === 0 && <p style={{ color:'rgba(192,208,255,0.5)' }}>No teams yet.</p>}
        {teams.map(team => (
          <div key={team.id} className="neon-card p-3" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'16px' }}
            onClick={()=>setSelectedTeam(team)}>
            {team.logo_url
              ? <img src={team.logo_url} alt={team.team_name} style={{ width:'44px', height:'44px', objectFit:'contain', borderRadius:'6px' }} />
              : <div style={{ width:'44px', height:'44px', background:team.team_color, borderRadius:'6px', flexShrink:0 }} />
            }
            <div>
              <p style={{ margin:'0 0 3px', color:'var(--color-cyan)', fontWeight:700, fontSize:'1rem' }}>{team.team_name}</p>
              <p style={{ margin:0, fontSize:'0.8rem', color:'rgba(192,208,255,0.5)' }}>
                {players.filter(p=>p.team===team.team_name).length} players
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);

  // Aggregate team stats
  const sum = (key) => teamPlayers.reduce((s,p) => s + (parseFloat(p[key])||0), 0);
  const avg = (key) => {
    const vals = teamPlayers.map(p=>parseFloat(p[key])).filter(v=>!isNaN(v)&&v>0);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3) : 'â€”';
  };
  const teamStats = [
    {label:'Players', value: teamPlayers.length},
    {label:'Avg OVR', value: teamPlayers.length ? Math.round(teamPlayers.reduce((s,p)=>s+(parseInt(p.overall)||0),0)/teamPlayers.length) : 'â€”'},
    {label:'Team AVG', value: avg('season_avg')},
    {label:'Team OBP', value: avg('season_obp')},
    {label:'Team SLG', value: avg('season_slg')},
    {label:'Team OPS', value: avg('season_ops')},
    {label:'Total H',  value: sum('season_hits')},
    {label:'Total R',  value: sum('season_runs')},
    {label:'Total HR', value: sum('season_home_runs')},
    {label:'Total RBI',value: sum('season_rbis')},
    {label:'Total SB', value: sum('season_sb')},
    {label:'Team ERA', value: avg('season_era')},
    {label:'Team WHIP',value: avg('season_whip')},
    {label:'Total W',  value: sum('season_w')},
    {label:'Total K',  value: sum('season_strikeouts_pitched')},
    {label:'Total SV', value: sum('season_sv')},
  ];

  const teamColor = selectedTeam.team_color || 'var(--color-cyan)';

  return (
    <div>
      <button className="neon-button" onClick={()=>setSelectedTeam(null)} style={{ marginBottom:'20px' }}>â† Back to Teams</button>
      <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'24px' }}>
        {selectedTeam.logo_url
          ? <img src={selectedTeam.logo_url} alt={selectedTeam.team_name} style={{ width:'52px', height:'52px', objectFit:'contain', borderRadius:'8px' }} />
          : <div style={{ width:'52px', height:'52px', background:teamColor, borderRadius:'8px', flexShrink:0 }} />
        }
        <h2 style={{ margin:0, color:teamColor, fontWeight:900 }}>{selectedTeam.team_name}</h2>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        {/* LEFT: Roster list */}
        <div className="neon-card p-3">
          <h4 style={{ color:'var(--color-cyan)', marginBottom:'14px' }}>Roster ({teamPlayers.length})</h4>
          {teamPlayers.length === 0
            ? <p style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.85rem' }}>No players assigned</p>
            : teamPlayers.map(p => (
              <div key={p.id}
                onClick={()=>onSelectPlayer && onSelectPlayer(p)}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', marginBottom:'6px', background:'rgba(0,255,255,0.04)', borderRadius:'6px', border:'1px solid rgba(0,255,255,0.08)', cursor: onSelectPlayer?'pointer':'default', transition:'all 0.15s' }}
                onMouseEnter={e=>{if(onSelectPlayer) e.currentTarget.style.background='rgba(0,255,255,0.1)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,255,255,0.04)';}}
              >
                {p.avatar_data
                  ? <img src={p.avatar_data} alt={p.player_name} style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', border:`1px solid ${teamColor}44` }} />
                  : <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:`${teamColor}22`, border:`1px solid ${teamColor}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>ðŸŽ®</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:600, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.player_name}</p>
                  <p style={{ margin:0, fontSize:'0.72rem', color:'rgba(192,208,255,0.5)' }}>{p.position||'â€”'} Â· OVR {p.overall||'?'}</p>
                </div>
                {onSelectPlayer && <span style={{ color:`${teamColor}66`, fontSize:'0.75rem' }}>â†’</span>}
              </div>
            ))
          }
        </div>

        {/* RIGHT: Team stats */}
        <div className="neon-card p-3">
          <h4 style={{ color:teamColor, marginBottom:'14px' }}>Team Stats (Season)</h4>
          {teamStats.map(({label,value})=>(
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(0,255,255,0.06)' }}>
              <span style={{ fontSize:'0.78rem', color:'rgba(192,208,255,0.55)' }}>{label}</span>
              <span style={{ fontWeight:700, color: value==='â€”'?'rgba(192,208,255,0.25)':teamColor, fontSize:'0.88rem' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const PlayersTab = ({ onSelectPlayer }) => {
  const [players, setPlayers] = useState([]);
  useEffect(() => { db.getPlayers('rbml').then(setPlayers); }, []);
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
                  onSelectPlayer(player);
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
                <span className="data-value">{player.position || 'â€”'}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Overall</span>
                <span className="data-value">{player.overall || 'â€”'}</span>
              </div>
              <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'rgba(0,255,255,0.6)', textAlign: 'center' }}>Click to view stat page â†’</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LeagueLeadersTab = ({ onSelectPlayer }) => {
  const [players, setPlayers] = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  useEffect(() => {
    db.getPlayers('rbml').then(setPlayers);
    db.getBoxScores('rbml').then(setBoxScores);
  }, []);

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
                      onSelectPlayer(p);
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
      <LeaderTable title="ðŸ  Home Run Leaders" leaders={hrLeaders} statKey="total_hr" statLabel="HR" color="cyan" />
      <LeaderTable title="âš¾ Hits Leaders" leaders={hitsLeaders} statKey="total_hits" statLabel="H" color="magenta" />
      <LeaderTable title="ðŸƒ RBI Leaders" leaders={rbiLeaders} statKey="total_rbis" statLabel="RBI" color="cyan" />
      <LeaderTable title="âš¡ Strikeout Leaders (Pitching)" leaders={kLeaders} statKey="total_k" statLabel="K" color="magenta" />
    </div>
  );
};

const GameFeedTab = () => {
  const [feed, setFeed] = useState([]);
  useEffect(() => { db.getFeed('rbml').then(setFeed); }, []);
  const sorted = [...feed].reverse();

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">ðŸ“° Game Feed</h3>
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
  const [bsGames, setBsGames] = useState([]);
  useEffect(() => { db.getBsGames('rbml').then(setBsGames); }, []);
  const [boxScores, setBoxScores] = useState([]);
  useEffect(() => { db.getBoxScores('rbml').then(setBoxScores); }, []);
  const [players, setPlayers] = useState([]);
  useEffect(() => { db.getPlayers('rbml').then(setPlayers); }, []);
  const [teams, setTeams] = useState([]);
  useEffect(() => { db.getTeams('rbml').then(setTeams); }, []);
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
                          : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${color || accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', flexShrink: 0 }}>ðŸŽ®</div>
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
          â† Back to Box Scores
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
              <span style={{ color: 'rgba(192,208,255,0.3)', fontSize: '1.2rem' }}>â€”</span>
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
        <h3 className="gradient-text-cyan">ðŸ“ˆ Box Scores</h3>
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
                  {game.home_team} <strong>{game.home_score}</strong> â€” <strong>{game.away_score}</strong> {game.away_team}
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

const CompareTab = ({ onSelectPlayer }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState('player'); // 'player' | 'team'
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [mode, setMode]       = useState('season');
  const [statFilter, setStatFilter] = useState('hitting');

  useEffect(() => {
    Promise.all([db.getPlayers('rbml'), db.getTeams('rbml')])
      .then(([p, t]) => { setPlayers(p); setTeams(t); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color:'rgba(192,208,255,0.5)', padding:'40px', textAlign:'center' }}>Loading...</p>;

  const getTeamColor = (name) => teams.find(t => t.team_name === name)?.team_color || null;

  // â”€â”€ Player stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pA = players.find(p => p.id === idA);
  const pB = players.find(p => p.id === idB);
  const colorA = (pA && getTeamColor(pA.team)) || '#00ffff';
  const colorB = (pB && getTeamColor(pB.team)) || '#ff00ff';

  const HIT_STATS = [
    ['G','season_g','career_g'],['AB','season_ab','career_ab'],
    ['AVG','season_avg','career_avg'],['OBP','season_obp','career_obp'],
    ['SLG','season_slg','career_slg'],['OPS','season_ops','career_ops'],
    ['H','season_hits','hits'],['R','season_runs','runs'],
    ['2B','season_2b','career_2b'],['3B','season_3b','career_3b'],
    ['HR','season_home_runs','home_runs'],['RBI','season_rbis','rbis'],
    ['BB','season_bb','career_bb'],['K','season_strike_outs','strike_outs'],
    ['SB','season_sb','career_sb'],
  ];
  const PIT_STATS = [
    ['W','season_w','career_w'],['L','season_l','career_l'],
    ['ERA','season_era','career_era'],['G','season_pg','career_pg'],
    ['GS','season_gs','career_gs'],['IP','season_innings_pitched','innings_pitched'],
    ['K','season_strikeouts_pitched','strikeouts_pitched'],
    ['BB','season_pit_bb','career_pit_bb'],['H','season_hits_allowed','hits_allowed'],
    ['ER','season_earned_runs','earned_runs'],['WHIP','season_whip','career_whip'],
    ['SV','season_sv','career_sv'],['HLD','season_hld','career_hld'],
  ];
  const STAT_LIST = statFilter === 'hitting' ? HIT_STATS : PIT_STATS;
  const lowerBetter = new Set(['L','ERA','K','BB','H','ER','WHIP']);

  const getVal = (p, label, sKey, cKey) => {
    if (!p) return null;
    const raw = mode === 'season' ? p[sKey] : p[cKey];
    if (raw === null || raw === undefined || raw === '') return 'â€”';
    return raw;
  };

  const numVal = (v) => {
    if (v === 'â€”' || v === null || v === undefined) return null;
    return parseFloat(v);
  };

  const isBetter = (key, a, b) => {
    const na = numVal(a), nb = numVal(b);
    if (na === null || nb === null || na === nb) return null;
    return lowerBetter.has(key) ? na < nb : na > nb;
  };

  // â”€â”€ Team stats (aggregate all players on that team) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const teamA_obj = teams.find(t => t.id === idA);
  const teamB_obj = teams.find(t => t.id === idB);
  const colorTA = teamA_obj?.team_color || '#00ffff';
  const colorTB = teamB_obj?.team_color || '#ff00ff';

  const aggregateTeam = (teamName) => {
    const roster = players.filter(p => p.team === teamName);
    if (roster.length === 0) return null;
    const sum = (key) => roster.reduce((s, p) => s + (parseFloat(p[key]) || 0), 0);
    const avg = (key) => {
      const vals = roster.map(p => parseFloat(p[key])).filter(v => !isNaN(v));
      return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3) : 'â€”';
    };
    const suf = mode === 'season' ? 'season_' : '';
    return {
      'Players': roster.length,
      'Team AVG': avg(suf ? 'season_avg' : 'career_avg'),
      'Team OBP': avg(suf ? 'season_obp' : 'career_obp'),
      'Team SLG': avg(suf ? 'season_slg' : 'career_slg'),
      'Team OPS': avg(suf ? 'season_ops' : 'career_ops'),
      'Total H':  sum(suf ? 'season_hits' : 'hits'),
      'Total R':  sum(suf ? 'season_runs' : 'runs'),
      'Total HR': sum(suf ? 'season_home_runs' : 'home_runs'),
      'Total RBI':sum(suf ? 'season_rbis' : 'rbis'),
      'Total K':  sum(suf ? 'season_strike_outs' : 'strike_outs'),
      'Total SB': sum(suf ? 'season_sb' : 'career_sb'),
      'Team ERA': avg(suf ? 'season_era' : 'career_era'),
      'Team WHIP':avg(suf ? 'season_whip' : 'career_whip'),
      'Total W':  sum(suf ? 'season_w' : 'career_w'),
      'Total SV': sum(suf ? 'season_sv' : 'career_sv'),
    };
  };

  const tA = compareMode === 'team' ? aggregateTeam(teamA_obj?.team_name) : null;
  const tB = compareMode === 'team' ? aggregateTeam(teamB_obj?.team_name) : null;

  const selSty = (col) => ({
    padding:'10px 12px', background:'rgba(10,10,30,0.85)',
    border:`1px solid ${col}55`, color:'#c0d0ff',
    borderRadius:'8px', fontSize:'0.88rem', width:'100%', cursor:'pointer',
  });

  const btnSty = (active) => ({
    padding:'7px 18px',
    background: active ? 'rgba(0,255,255,0.12)' : 'rgba(10,10,30,0.7)',
    border: active ? '1px solid rgba(0,255,255,0.45)' : '1px solid rgba(100,120,200,0.18)',
    color: active ? 'var(--color-cyan)' : 'rgba(192,208,255,0.45)',
    borderRadius:'8px', cursor:'pointer', fontWeight:'700',
    fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.08em',
  });

  return (
    <div>
      {/* Compare mode toggle */}
      <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'18px' }}>
        <button style={{...btnSty(compareMode==='player')}} onClick={()=>{setCompareMode('player');setIdA('');setIdB('');}}> Players</button>
        <button style={{...btnSty(compareMode==='team')}}   onClick={()=>{setCompareMode('team');setIdA('');setIdB('');}}> Teams</button>
      </div>

      {/* Selectors */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'14px', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(192,208,255,0.5)', marginBottom:'6px', textTransform:'uppercase' }}>{compareMode === 'player' ? 'Player A' : 'Team A'}</label>
          {compareMode === 'player' ? (
            <select value={idA} onChange={e=>setIdA(e.target.value)} style={selSty(colorA)}>
              <option value="">Select playerâ€¦</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.player_name}{p.team?` (${p.team})`:''} OVR {p.overall}</option>)}
            </select>
          ) : (
            <select value={idA} onChange={e=>setIdA(e.target.value)} style={selSty(colorTA)}>
              <option value="">Select teamâ€¦</option>
              {teams.map(t=><option key={t.id} value={t.id}>{t.team_name}</option>)}
            </select>
          )}
        </div>
        <span style={{ color:'rgba(192,208,255,0.3)', fontWeight:'800', fontSize:'1rem' }}>VS</span>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(192,208,255,0.5)', marginBottom:'6px', textTransform:'uppercase' }}>{compareMode === 'player' ? 'Player B' : 'Team B'}</label>
          {compareMode === 'player' ? (
            <select value={idB} onChange={e=>setIdB(e.target.value)} style={selSty(colorB)}>
              <option value="">Select playerâ€¦</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.player_name}{p.team?` (${p.team})`:''} OVR {p.overall}</option>)}
            </select>
          ) : (
            <select value={idB} onChange={e=>setIdB(e.target.value)} style={selSty(colorTB)}>
              <option value="">Select teamâ€¦</option>
              {teams.map(t=><option key={t.id} value={t.id}>{t.team_name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Mode + stat filter */}
      <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
        {['season','career'].map(m=>(
          <button key={m} style={{...btnSty(mode===m)}} onClick={()=>setMode(m)}>{m}</button>
        ))}
      </div>
      {compareMode === 'player' && (
        <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'20px' }}>
          {['hitting','pitching'].map(f=>(
            <button key={f} style={{...btnSty(statFilter===f), borderColor: statFilter===f?'rgba(255,0,255,0.5)':'rgba(100,120,200,0.18)', color: statFilter===f?'var(--color-magenta)':'rgba(192,208,255,0.45)', background: statFilter===f?'rgba(255,0,255,0.1)':'rgba(10,10,30,0.7)'}} onClick={()=>setStatFilter(f)}>{f}</button>
          ))}
        </div>
      )}

      {/* â”€â”€ PLAYER COMPARE â”€â”€ */}
      {compareMode === 'player' && (
        <>
          {/* Player cards */}
          {(pA || pB) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'22px' }}>
              {[{p:pA,color:colorA,side:'A'},{p:pB,color:colorB,side:'B'}].map(({p,color,side})=>(
                <div key={side} style={{
                  background: p?`linear-gradient(160deg,${color}0d,rgba(8,8,26,0.95))`:'rgba(10,10,30,0.5)',
                  border:`1px solid ${p?color+'30':'rgba(100,120,200,0.1)'}`,
                  borderTop:`3px solid ${p?color:'rgba(100,120,200,0.2)'}`,
                  borderRadius:'10px', padding:'16px', textAlign:'center',
                  minHeight:'120px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent: p?'flex-start':'center',
                }}>
                  {p ? (
                    <>
                      {p.avatar_data
                        ? <img src={p.avatar_data} alt={p.player_name} style={{ width:'56px', height:'56px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${color}55`, marginBottom:'8px' }} />
                        : <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:`${color}18`, border:`2px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', marginBottom:'8px' }}>ðŸŽ®</div>
                      }
                      <h4 style={{ margin:'0 0 3px', color, fontWeight:'800', fontSize:'0.9rem' }}>{p.player_name}</h4>
                      {p.team && <span style={{ fontSize:'0.72rem', color:`${color}99` }}>{p.team}</span>}
                      <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', justifyContent:'center', marginTop:'6px' }}>
                        {p.position && <span style={{ fontSize:'0.68rem', background:`${color}1a`, color, padding:'2px 6px', borderRadius:'4px' }}>{p.position}</span>}
                        {p.overall   && <span style={{ fontSize:'0.68rem', background:'rgba(255,215,0,0.12)', color:'#ffd700', padding:'2px 6px', borderRadius:'4px' }}>OVR {p.overall}</span>}
                      </div>
                      {onSelectPlayer && <button onClick={()=>onSelectPlayer(p)} style={{ marginTop:'10px', background:'none', border:`1px solid ${color}44`, color, borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'0.72rem' }}>View Stats</button>}
                    </>
                  ) : (
                    <span style={{ color:'rgba(192,208,255,0.3)', fontSize:'0.82rem' }}>Select Player {side}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats table */}
          {pA && pB ? (
            <div style={{ background:'rgba(10,10,30,0.8)', border:'1px solid rgba(100,120,200,0.13)', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', background:'rgba(0,0,0,0.3)', padding:'10px 14px', borderBottom:'1px solid rgba(100,120,200,0.15)' }}>
                <span style={{ color:colorA, fontWeight:'800', fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pA.player_name}</span>
                <span style={{ color:'rgba(192,208,255,0.35)', fontSize:'0.7rem', textAlign:'center', alignSelf:'center' }}>STAT</span>
                <span style={{ color:colorB, fontWeight:'800', fontSize:'0.88rem', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pB.player_name}</span>
              </div>
              {STAT_LIST.map(([label, sKey, cKey]) => {
                const valA = getVal(pA, label, sKey, cKey);
                const valB = getVal(pB, label, sKey, cKey);
                const aBetter = isBetter(label, valA, valB);
                const bBetter = isBetter(label, valB, valA);
                return (
                  <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', padding:'9px 14px', borderBottom:'1px solid rgba(100,120,200,0.06)', alignItems:'center' }}>
                    <div>
                      <span style={{ fontWeight:aBetter?'800':'400', color:aBetter?colorA:'rgba(192,208,255,0.55)', background:aBetter?`${colorA}22`:'transparent', padding:aBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem', boxShadow:aBetter?`0 0 8px ${colorA}44`:'none' }}>{valA}</span>
                    </div>
                    <span style={{ color:'rgba(192,208,255,0.3)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center' }}>{label}</span>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontWeight:bBetter?'800':'400', color:bBetter?colorB:'rgba(192,208,255,0.55)', background:bBetter?`${colorB}22`:'transparent', padding:bBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem', boxShadow:bBetter?`0 0 8px ${colorB}44`:'none' }}>{valB}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign:'center', color:'rgba(192,208,255,0.3)', padding:'40px 20px', background:'rgba(10,10,30,0.5)', borderRadius:'10px', border:'1px dashed rgba(100,120,200,0.15)' }}>
              <p style={{ margin:0, fontSize:'0.9rem' }}>Select two players to compare their stats</p>
              <p style={{ margin:'8px 0 0', fontSize:'0.78rem', opacity:0.6 }}>Make sure players have stats entered in the dashboard</p>
            </div>
          )}
        </>
      )}

      {/* â”€â”€ TEAM COMPARE â”€â”€ */}
      {compareMode === 'team' && (
        <>
          {(teamA_obj || teamB_obj) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'22px' }}>
              {[{t:teamA_obj,ta:tA,color:colorTA,side:'A'},{t:teamB_obj,ta:tB,color:colorTB,side:'B'}].map(({t,ta,color,side})=>(
                <div key={side} style={{ background:t?`linear-gradient(160deg,${color}0d,rgba(8,8,26,0.95))`:'rgba(10,10,30,0.5)', border:`1px solid ${t?color+'30':'rgba(100,120,200,0.1)'}`, borderTop:`3px solid ${t?color:'rgba(100,120,200,0.2)'}`, borderRadius:'10px', padding:'16px', textAlign:'center', minHeight:'100px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  {t ? (
                    <>
                      {t.logo_url
                        ? <img src={t.logo_url} alt={t.team_name} style={{ width:'50px', height:'50px', objectFit:'contain', marginBottom:'8px' }} />
                        : <div style={{ width:'50px', height:'50px', background:color, borderRadius:'8px', marginBottom:'8px' }} />
                      }
                      <h4 style={{ margin:0, color, fontWeight:'800', fontSize:'0.9rem' }}>{t.team_name}</h4>
                      <span style={{ fontSize:'0.72rem', color:`${color}88`, marginTop:'4px' }}>{players.filter(p=>p.team===t.team_name).length} players</span>
                    </>
                  ) : <span style={{ color:'rgba(192,208,255,0.3)', fontSize:'0.82rem' }}>Select Team {side}</span>}
                </div>
              ))}
            </div>
          )}

          {teamA_obj && teamB_obj && tA && tB ? (
            <div style={{ background:'rgba(10,10,30,0.8)', border:'1px solid rgba(100,120,200,0.13)', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', background:'rgba(0,0,0,0.3)', padding:'10px 14px', borderBottom:'1px solid rgba(100,120,200,0.15)' }}>
                <span style={{ color:colorTA, fontWeight:'800', fontSize:'0.88rem' }}>{teamA_obj.team_name}</span>
                <span style={{ color:'rgba(192,208,255,0.35)', fontSize:'0.7rem', textAlign:'center', alignSelf:'center' }}>STAT</span>
                <span style={{ color:colorTB, fontWeight:'800', fontSize:'0.88rem', textAlign:'right' }}>{teamB_obj.team_name}</span>
              </div>
              {Object.entries(tA).map(([key,valA])=>{
                const valB = tB[key];
                const na = parseFloat(valA), nb = parseFloat(valB);
                const lowerKeys = new Set(['Team ERA','Team WHIP']);
                const aBetter = !isNaN(na)&&!isNaN(nb)&&na!==nb ? (lowerKeys.has(key)?na<nb:na>nb) : null;
                const bBetter = !isNaN(na)&&!isNaN(nb)&&na!==nb ? (lowerKeys.has(key)?nb<na:nb>na) : null;
                return (
                  <div key={key} style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', padding:'9px 14px', borderBottom:'1px solid rgba(100,120,200,0.06)', alignItems:'center' }}>
                    <span style={{ fontWeight:aBetter?'800':'400', color:aBetter?colorTA:'rgba(192,208,255,0.55)', background:aBetter?`${colorTA}22`:'transparent', padding:aBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem' }}>{typeof valA==='number'?valA.toFixed?valA:valA:valA}</span>
                    <span style={{ color:'rgba(192,208,255,0.3)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center' }}>{key}</span>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontWeight:bBetter?'800':'400', color:bBetter?colorTB:'rgba(192,208,255,0.55)', background:bBetter?`${colorTB}22`:'transparent', padding:bBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem' }}>{typeof valB==='number'?valB.toFixed?valB:valB:valB}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (teamA_obj && teamB_obj) ? (
            <p style={{ textAlign:'center', color:'rgba(192,208,255,0.4)', padding:'20px' }}>No players on these rosters yet.</p>
          ) : (
            <div style={{ textAlign:'center', color:'rgba(192,208,255,0.3)', padding:'40px', background:'rgba(10,10,30,0.5)', borderRadius:'10px', border:'1px dashed rgba(100,120,200,0.15)' }}>Select two teams to compare</div>
          )}
        </>
      )}
    </div>
  );
};


const HallOfFameTab = () => {
  const [hof, setHof] = useState([]);
  useEffect(() => { db.getHof('rbml').then(setHof); }, []);

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Hall of Fame</h3>
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

export default RBMLLeague;
