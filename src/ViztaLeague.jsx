import React, { useState, useEffect } from 'react';
import db from './services/db';
import { getSport } from './data/sportsConfig';
import './ViztaLeague.css';

const fmtVal = (v, fmt) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '--';
  if (fmt === 'avg3') return n.toFixed(3);
  if (fmt === 'avg2') return n.toFixed(2);
  if (fmt === 'avg1') return n.toFixed(1);
  return Math.round(n) || 0;
};

const ViztaLeague = ({ onSelectPlayer, sport = 'vizta' }) => {
  const cfg = getSport(sport);
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':   return <OverviewTab sport={sport} cfg={cfg} />;
      case 'rosters':    return <RostersTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} />;
      case 'players':    return <PlayersTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} />;
      case 'leaders':    return <LeagueLeadersTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} />;
      case 'feed':       return <GameFeedTab sport={sport} cfg={cfg} />;
      case 'scores':     return <BoxScoresTab sport={sport} cfg={cfg} />;
      case 'compare':    return <CompareTab sport={sport} cfg={cfg} />;
      case 'propbets':   return <PropBetsTab sport={sport} cfg={cfg} />;
      case 'halloffame': return <HallOfFameTab sport={sport} cfg={cfg} />;
      default:           return <OverviewTab sport={sport} cfg={cfg} />;
    }
  };

  return (
    <div className="page nabb-league">
      <div className="page-header">
        <h1 className="gradient-text">{cfg.label}</h1>
        <p className="subtitle">League Central</p>
      </div>

      <div className="league-tabs">
        {[
          { id: 'overview',   label: 'Overview' },
          { id: 'rosters',    label: 'Rosters' },
          { id: 'players',    label: 'Players' },
          { id: 'leaders',    label: 'League Leaders' },
          { id: 'feed',       label: 'Game Feed' },
          { id: 'scores',     label: 'Box Scores' },
          { id: 'compare',    label: 'Compare' },
          { id: 'propbets',   label: '🎯 Prop Bets' },
          { id: 'halloffame', label: 'Hall of Fame' },
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

const OverviewTab = ({ sport, cfg }) => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bsGames, setBsGames] = useState([]);
  useEffect(() => {
    db.getTeams(sport).then(setTeams);
    db.getPlayers(sport).then(setPlayers);
    db.getBsGames(sport).then(setBsGames);
  }, [sport]);
  const recentGames = [...bsGames].reverse().slice(0, 3);

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">League Overview</h3>
        <div className="mt-2">
          <div className="data-row"><span className="data-label">League</span><span className="data-value">{cfg.label}</span></div>
          <div className="data-row"><span className="data-label">Sport</span><span className="data-value">{cfg.label}</span></div>
          <div className="data-row">
            <span className="data-label">Status</span>
            <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5ee6a8', boxShadow: '0 0 8px rgba(94, 230, 168,0.6)' }} />
              ONGOING
            </span>
          </div>
          <div className="data-row"><span className="data-label">Teams</span><span className="data-value">{teams.length}</span></div>
          <div className="data-row"><span className="data-label">Players</span><span className="data-value">{players.length}</span></div>
          <div className="data-row"><span className="data-label">Games Played</span><span className="data-value">{bsGames.length}</span></div>
        </div>
      </div>

      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Recent Games</h3>
        {recentGames.length === 0 ? (
          <p style={{ marginTop: '15px', color: 'rgba(158, 165, 196,0.7)' }}>No games played yet</p>
        ) : (
          <div className="mt-2">
            {recentGames.map(game => (
              <div key={game.id} className="data-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '10px 0', borderBottom: '1px solid rgba(94, 129, 244,0.08)' }}>
                <span style={{ color: 'var(--color-cyan)', fontWeight: '600', fontSize: '0.9rem' }}>{game.game_name}</span>
                <span style={{ color: 'rgba(158, 165, 196,0.8)' }}>
                  {game.home_team} <strong>{game.home_score}</strong> - <strong>{game.away_score}</strong> {game.away_team}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RostersTab = ({ sport, cfg, onSelectPlayer }) => {
  const [teams, setTeams]         = useState([]);
  const [players, setPlayers]     = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [rightPanel, setRightPanel] = useState('stats');
  const [schedule, setSchedule]   = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);

  useEffect(() => {
    Promise.all([db.getTeams(sport), db.getPlayers(sport)])
      .then(([t, p]) => { setTeams(t); setPlayers(p); setLoading(false); });
  }, [sport]);

  useEffect(() => {
    if (!selectedTeam) return;
    setSchedLoading(true);
    db.getTeamSchedule(selectedTeam.id)
      .then(entries => { setSchedule(entries || []); setSchedLoading(false); })
      .catch(() => { setSchedule([]); setSchedLoading(false); });
  }, [selectedTeam]);

  if (loading) return <p style={{ color:'rgba(158, 165, 196,0.5)', padding:'40px', textAlign:'center' }}>Loading...</p>;

  if (!selectedTeam) return (
    <div>
      <h2 className="gradient-text-cyan">Rosters</h2>
      <div className="card-container" style={{ marginTop:'20px' }}>
        {teams.length === 0 && <p style={{ color:'rgba(158, 165, 196,0.5)' }}>No teams yet.</p>}
        {teams.map(team => (
          <div key={team.id} className="neon-card p-3" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'16px' }} onClick={() => setSelectedTeam(team)}>
            {team.logo_url
              ? <img src={team.logo_url} alt={team.team_name} style={{ width:'44px', height:'44px', objectFit:'contain', borderRadius:'6px' }} />
              : <div style={{ width:'44px', height:'44px', background:team.team_color, borderRadius:'6px', flexShrink:0 }} />}
            <div>
              <p style={{ margin:'0 0 3px', color:'var(--color-cyan)', fontWeight:700, fontSize:'1rem' }}>{team.team_name}</p>
              <p style={{ margin:0, fontSize:'0.8rem', color:'rgba(158, 165, 196,0.5)' }}>{players.filter(p=>p.team===team.team_name).length} players</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);
  const sum = (key) => teamPlayers.reduce((s,p) => s + (parseFloat(p[key])||0), 0);
  const avg = (key) => {
    const vals = teamPlayers.map(p=>parseFloat(p[key])).filter(v=>!isNaN(v)&&v>0);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3) : '--';
  };
  const teamStats = [
    {label:'Players', value: teamPlayers.length},
    {label:'Avg OVR', value: teamPlayers.length ? Math.round(teamPlayers.reduce((s,p)=>s+(parseInt(p.overall)||0),0)/teamPlayers.length) : '--'},
    ...cfg.teamStats.map(ts => ({ label: ts.label, value: ts.agg === 'avg' ? avg(ts.field) : sum(ts.field) })),
  ];
  const teamColor = selectedTeam.team_color || 'var(--color-cyan)';

  const wins   = schedule.filter(e => e.result === 'W').length;
  const losses = schedule.filter(e => e.result === 'L').length;
  const ties   = schedule.filter(e => e.result === 'T').length;

  return (
    <div>
      <button className="neon-button" onClick={() => { setSelectedTeam(null); setRightPanel('stats'); }} style={{ marginBottom:'20px' }}>Back to Teams</button>
      <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' }}>
        {selectedTeam.logo_url
          ? <img src={selectedTeam.logo_url} alt={selectedTeam.team_name} style={{ width:'52px', height:'52px', objectFit:'contain', borderRadius:'8px' }} />
          : <div style={{ width:'52px', height:'52px', background:teamColor, borderRadius:'8px', flexShrink:0 }} />}
        <h2 style={{ margin:0, color:teamColor, fontWeight:900 }}>{selectedTeam.team_name}</h2>
      </div>
      <div className="vz-2col-grid">
        {/* Left: Roster */}
        <div className="neon-card p-3">
          <h4 style={{ color:'var(--color-cyan)', marginBottom:'14px' }}>Roster ({teamPlayers.length})</h4>
          {teamPlayers.length === 0
            ? <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem' }}>No players assigned</p>
            : teamPlayers.map(p => (
              <div key={p.id}
                onClick={() => onSelectPlayer && onSelectPlayer(p)}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', marginBottom:'6px', background:'rgba(94, 129, 244,0.04)', borderRadius:'6px', border:'1px solid rgba(94, 129, 244,0.08)', cursor:onSelectPlayer?'pointer':'default', transition:'all 0.15s' }}
                onMouseEnter={e=>{if(onSelectPlayer) e.currentTarget.style.background='rgba(94, 129, 244,0.1)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(94, 129, 244,0.04)';}}
              >
                {p.avatar_data
                  ? <img src={p.avatar_data} alt={p.player_name} style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', border:`1px solid ${teamColor}44` }} />
                  : <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:`${teamColor}22`, border:`1px solid ${teamColor}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>G</div>}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:600, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.player_name}</p>
                  <p style={{ margin:0, fontSize:'0.72rem', color:'rgba(158, 165, 196,0.5)' }}>{p.position||'--'} - OVR {p.overall||'?'}</p>
                </div>
                {onSelectPlayer && <span style={{ color:`${teamColor}66`, fontSize:'0.75rem' }}>→</span>}
              </div>
            ))}
        </div>

        {/* Right: Stats / Schedule toggle */}
        <div className="neon-card p-3">
          {/* Toggle */}
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            {['stats','schedule'].map(id => (
              <button key={id} onClick={() => setRightPanel(id)} style={{
                padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.78rem',
                background: rightPanel===id ? teamColor : 'rgba(94,129,244,0.08)',
                color: rightPanel===id ? '#0a0d1a' : 'rgba(158,165,196,0.6)',
              }}>
                {id === 'stats' ? '📊 Team Stats' : '📅 Schedule'}
              </button>
            ))}
          </div>

          {rightPanel === 'stats' && (
            <>
              <h4 style={{ color:teamColor, marginBottom:'14px', marginTop:0 }}>Team Stats (Season)</h4>
              {teamStats.map(({label,value}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(94,129,244,0.06)' }}>
                  <span style={{ fontSize:'0.78rem', color:'rgba(158,165,196,0.55)' }}>{label}</span>
                  <span style={{ fontWeight:700, color:value==='--'?'rgba(158,165,196,0.25)':teamColor, fontSize:'0.88rem' }}>{value}</span>
                </div>
              ))}
            </>
          )}

          {rightPanel === 'schedule' && (
            <>
              <h4 style={{ color:teamColor, marginBottom:'10px', marginTop:0 }}>Schedule</h4>
              {/* Record pills */}
              <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
                {[['W', wins,'#22c55e'],['L',losses,'#ef4444'],['T',ties,'#eab308']].filter(([,v])=>v>0||['W','L'].includes(''+v[0])).map(([l,v,c])=>(
                  <span key={l} style={{ fontWeight:800, fontSize:'0.95rem', color:c }}>{v} {l}</span>
                ))}
                {schedule.filter(e=>!e.result).length > 0 && (
                  <span style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.85rem' }}>{schedule.filter(e=>!e.result).length} upcoming</span>
                )}
              </div>
              {schedLoading ? (
                <p style={{ color:'rgba(158,165,196,0.4)', textAlign:'center', padding:'20px 0', fontSize:'0.85rem' }}>Loading…</p>
              ) : schedule.length === 0 ? (
                <p style={{ color:'rgba(158,165,196,0.35)', textAlign:'center', padding:'20px 0', fontSize:'0.82rem' }}>
                  No schedule yet.<br />An admin can add games via Admin → Fantasy Schedule.
                </p>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid rgba(94,129,244,0.15)' }}>
                        {['Wk','Opponent','Loc','Date','Score','Result'].map(h=>(
                          <th key={h} style={{ padding:'5px 6px', textAlign:'left', color:'rgba(158,165,196,0.4)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...schedule].sort((a,b)=>(a.week||999)-(b.week||999)).map(entry=>(
                        <tr key={entry.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding:'6px', fontWeight:700, color:'var(--color-cyan)' }}>{entry.week??'—'}</td>
                          <td style={{ padding:'6px', color:'#e2e5f0' }}>{entry.opponent||'—'}</td>
                          <td style={{ padding:'6px', fontSize:'0.7rem', fontWeight:700, color:entry.is_home?'var(--color-cyan)':'#d946ef' }}>{entry.is_home?'HOME':'AWAY'}</td>
                          <td style={{ padding:'6px', color:'rgba(158,165,196,0.5)', fontSize:'0.75rem' }}>{entry.game_date||'—'}</td>
                          <td style={{ padding:'6px' }}>{entry.score||'—'}</td>
                          <td style={{ padding:'6px', fontWeight:700, color:entry.result==='W'?'#22c55e':entry.result==='L'?'#ef4444':'#eab308' }}>{entry.result||<span style={{color:'rgba(158,165,196,0.3)',fontSize:'0.75rem'}}>TBD</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayersTab = ({ sport, onSelectPlayer }) => {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => { db.getPlayers(sport).then(setPlayers); }, [sport]);

  const filtered = players.filter(p =>
    p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.team?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom:'20px' }}>
        <input type="text" placeholder="Search players or teams..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:'100%', maxWidth:'400px' }} />
      </div>
      {filtered.length === 0 ? (
        <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)', textAlign:'center' }}>{players.length === 0 ? 'No players added yet' : 'No players match your search'}</p></div>
      ) : (
        <div className="card-grid">
          {filtered.map(player => (
            <div key={player.id} className="neon-card p-3" style={{ cursor:'pointer' }} onClick={() => onSelectPlayer && onSelectPlayer(player)}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                <h4 className="gradient-text-cyan" style={{ margin:0 }}>{player.player_name}</h4>
                {player.number && <span style={{ color:'rgba(158, 165, 196,0.5)' }}>#{player.number}</span>}
              </div>
              <div className="data-row"><span className="data-label">Team</span><span className="data-value">{player.team || 'Free Agent'}</span></div>
              <div className="data-row"><span className="data-label">Position</span><span className="data-value">{player.position || '--'}</span></div>
              <div className="data-row"><span className="data-label">Overall</span><span className="data-value">{player.overall || '--'}</span></div>
              <p style={{ marginTop:'10px', fontSize:'0.8rem', color:'rgba(94, 129, 244,0.6)', textAlign:'center' }}>Click to view stat page</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LeagueLeadersTab = ({ sport, cfg, onSelectPlayer }) => {
  const [players, setPlayers]   = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState('season');
  const [statType, setStatType] = useState(cfg.catA.id);

  useEffect(() => { setStatType(cfg.catA.id); }, [cfg]);

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getBoxScores(sport)])
      .then(([p, b]) => { setPlayers(p); setBoxScores(Array.isArray(b)?b:[]); setLoading(false); });
  }, [sport]);

  if (loading) return <p style={{ color:'rgba(158, 165, 196,0.5)', padding:'40px', textAlign:'center' }}>Loading...</p>;

  const CATS = statType === cfg.catA.id ? cfg.leadersA : cfg.leadersB;

  const withStats = players.map(p => {
    const scores = boxScores.filter(b => String(b.player_id) === String(p.id));
    const sumBox = (key) => key ? scores.reduce((s,b) => s + (parseFloat(b[key])||0), 0) : 0;
    const vals = {};
    CATS.forEach(cat => {
      const seasonRaw = sumBox(cat.box) + (parseFloat(p[cat.seasonField])||0);
      const careerRaw = parseFloat(p[cat.careerField]) || seasonRaw;
      vals[cat.label + '_season'] = seasonRaw;
      vals[cat.label + '_career'] = careerRaw;
    });
    return { ...p, _vals: vals };
  });

  const btnSty = (active) => ({
    padding:'6px 16px', background:active?'rgba(94, 129, 244,0.12)':'rgba(10,10,30,0.6)',
    border:active?'1px solid rgba(94, 129, 244,0.4)':'1px solid rgba(100,120,200,0.15)',
    color:active?'var(--color-cyan)':'rgba(158, 165, 196,0.4)', borderRadius:'6px',
    cursor:'pointer', fontWeight:'700', fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.08em',
  });

  return (
    <div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', justifyContent:'center' }}>
        {['season','career'].map(m2 => <button key={m2} style={btnSty(mode===m2)} onClick={()=>setMode(m2)}>{m2}</button>)}
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'24px', flexWrap:'wrap', justifyContent:'center' }}>
        {[cfg.catA, cfg.catB].map(c => (
          <button key={c.id} style={{...btnSty(statType===c.id), borderColor:statType===c.id?'rgba(255, 158, 87,0.4)':'rgba(100,120,200,0.15)', color:statType===c.id?'var(--color-magenta)':'rgba(158, 165, 196,0.4)', background:statType===c.id?'rgba(255, 158, 87,0.1)':'rgba(10,10,30,0.6)'}} onClick={()=>setStatType(c.id)}>{c.label}</button>
        ))}
      </div>
      {CATS.map((cat) => {
        const key = cat.label + '_' + mode;
        const sorted = [...withStats].filter(p=>p._vals[key]!==undefined).sort((a,b)=>cat.hi?(b._vals[key]||0)-(a._vals[key]||0):(a._vals[key]||9999)-(b._vals[key]||9999)).slice(0,10);
        if (!sorted.length) return null;
        return (
          <div key={cat.label} className="neon-card p-3" style={{ marginBottom:'20px' }}>
            <h4 className="gradient-text-magenta" style={{ marginBottom:'12px' }}>{cat.label}</h4>
            {sorted.map((p,i) => (
              <div key={p.id} onClick={()=>onSelectPlayer&&onSelectPlayer(p)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px', borderRadius:'6px', marginBottom:'4px', background:i===0?'rgba(94, 129, 244,0.06)':'transparent', cursor:onSelectPlayer?'pointer':'default' }}>
                <span style={{ width:'22px', textAlign:'center', color:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(158, 165, 196,0.4)', fontWeight:'700', fontSize:'0.82rem' }}>
                  {i===0?'#1':i===1?'#2':i===2?'#3':`#${i+1}`}
                </span>
                {p.avatar_data && <img src={p.avatar_data} alt="" style={{ width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover' }} />}
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:600, fontSize:'0.88rem' }}>{p.player_name}</p>
                  <p style={{ margin:0, fontSize:'0.72rem', color:'rgba(158, 165, 196,0.4)' }}>{p.team||'FA'} - {p.position||'--'}</p>
                </div>
                <span style={{ fontWeight:'800', color:i===0?'var(--color-cyan)':'rgba(158, 165, 196,0.7)', fontSize:'0.95rem' }}>{fmtVal(p._vals[key], cat.fmt)}</span>
              </div>
            ))}
          </div>
        );
      })}
      {withStats.length === 0 && <p style={{ color:'rgba(158, 165, 196,0.4)', textAlign:'center', padding:'40px 20px' }}>No players yet.</p>}
    </div>
  );
};

const GameFeedTab = ({ sport }) => {
  const [feed, setFeed] = useState([]);
  useEffect(() => { db.getFeed(sport).then(setFeed); }, [sport]);
  const sorted = [...feed].reverse();
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">Game Feed</h3>
        {sorted.length === 0 ? (
          <p style={{ marginTop:'15px', color:'rgba(158, 165, 196,0.7)' }}>Game updates and news will appear here</p>
        ) : (
          <div style={{ marginTop:'15px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {sorted.map((entry, i) => (
              <div key={i} style={{ padding:'12px', background:'rgba(94, 129, 244,0.04)', border:'1px solid rgba(94, 129, 244,0.1)', borderRadius:'6px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ color:'var(--color-cyan)', fontWeight:'600', fontSize:'0.85rem' }}>{entry.event_type || 'Event'}</span>
                  {entry.timestamp && <span style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.75rem' }}>{new Date(entry.timestamp).toLocaleString()}</span>}
                </div>
                <p style={{ margin:0, color:'rgba(158, 165, 196,0.85)', fontSize:'0.9rem' }}>{entry.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BoxScoresTab = ({ sport, cfg }) => {
  const [bsGames, setBsGames]     = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [players, setPlayers]     = useState([]);
  const [teams, setTeams]         = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    db.getBsGames(sport).then(setBsGames);
    db.getBoxScores(sport).then(setBoxScores);
    db.getPlayers(sport).then(setPlayers);
    db.getTeams(sport).then(setTeams);
  }, [sport]);

  const getTeamColor = (name) => teams.find(t=>t.team_name===name)?.team_color||null;
  const getTeamLogo  = (name) => teams.find(t=>t.team_name===name)?.logo_url||null;
  const getPlayer    = (id)   => players.find(p=>p.id===id);

  const thS = { padding:'7px 8px', color:'rgba(158, 165, 196,0.5)', fontSize:'0.72rem', fontWeight:'700', letterSpacing:'0.06em', textTransform:'uppercase', textAlign:'center', borderBottom:'1px solid rgba(94, 129, 244,0.08)' };
  const tdS = { padding:'7px 8px', textAlign:'center', color:'rgba(158, 165, 196,0.85)', fontSize:'0.83rem', borderBottom:'1px solid rgba(94, 129, 244,0.04)' };

  const TeamTable = ({ teamName, scores, accent }) => {
    const color = getTeamColor(teamName)||accent;
    const logo  = getTeamLogo(teamName);
    if (!scores.length) return null;
    return (
      <div className="neon-card p-3" style={{ marginBottom:'16px', borderTop:`3px solid ${color||accent}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
          {logo ? <img src={logo} alt={teamName} style={{ width:'32px', height:'32px', objectFit:'contain', borderRadius:'4px' }} /> : <div style={{ width:'32px', height:'32px', background:color||accent, borderRadius:'4px', opacity:0.7 }} />}
          <h4 style={{ margin:0, color:color||accent, fontWeight:'800', fontSize:'0.95rem' }}>{teamName||'Unknown Team'}</h4>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth:'480px' }}>
            <thead><tr>
              <th style={{...thS, textAlign:'left', minWidth:'120px'}}>Player</th>
              {cfg.boxFields.map(f=><th key={f} style={thS}>{cfg.boxLabels[f]}</th>)}
            </tr></thead>
            <tbody>
              {scores.map((score,i) => {
                const p = getPlayer(score.player_id);
                return (
                  <tr key={i}>
                    <td style={{...tdS, textAlign:'left'}}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        {p?.avatar_data ? <img src={p.avatar_data} alt="" style={{ width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', flexShrink:0 }} /> : <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:`${color||accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', flexShrink:0 }}>G</div>}
                        <span style={{ color:color||'var(--color-cyan)', fontWeight:'600' }}>{p?.player_name||'?'}</span>
                      </div>
                    </td>
                    {cfg.boxFields.map((f,j)=>(
                      <td key={j} style={tdS}>{score[f]||0}</td>
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
    const gameScores  = boxScores.filter(b=>b.game_id===selectedGame.id);
    const homeScores  = gameScores.filter(s=>s.team===selectedGame.home_team);
    const awayScores  = gameScores.filter(s=>s.team===selectedGame.away_team);
    const otherScores = gameScores.filter(s=>s.team!==selectedGame.home_team&&s.team!==selectedGame.away_team);
    const homeWin = selectedGame.home_score > selectedGame.away_score;
    const awayWin = selectedGame.away_score > selectedGame.home_score;
    return (
      <div>
        <button className="neon-button" style={{ marginBottom:'20px', fontSize:'0.9rem' }} onClick={()=>setSelectedGame(null)}>Back to Box Scores</button>
        <div className="neon-card p-3" style={{ marginBottom:'20px' }}>
          <h3 className="gradient-text-cyan" style={{ marginBottom:'14px' }}>{selectedGame.game_name}</h3>
          <div className="vz-vs-grid">
            <div style={{ textAlign:'center' }}>
              {getTeamLogo(selectedGame.home_team) && <img src={getTeamLogo(selectedGame.home_team)} alt="" style={{ width:'40px', height:'40px', objectFit:'contain', display:'block', margin:'0 auto 8px' }} />}
              <p style={{ margin:'0 0 4px', color:getTeamColor(selectedGame.home_team)||'var(--color-cyan)', fontWeight:'700' }}>{selectedGame.home_team||'Home'}</p>
              <p style={{ margin:0, fontSize:homeWin?'2rem':'1.6rem', fontWeight:'800', color:homeWin?'var(--color-cyan)':'rgba(158, 165, 196,0.6)' }}>{selectedGame.home_score}</p>
            </div>
            <div style={{ textAlign:'center' }}>
              <span style={{ color:'rgba(158, 165, 196,0.3)', fontSize:'1.2rem' }}>-</span>
              {selectedGame.game_date && <p style={{ margin:'6px 0 0', color:'rgba(158, 165, 196,0.4)', fontSize:'0.75rem' }}>{new Date(selectedGame.game_date).toLocaleDateString()}</p>}
            </div>
            <div style={{ textAlign:'center' }}>
              {getTeamLogo(selectedGame.away_team) && <img src={getTeamLogo(selectedGame.away_team)} alt="" style={{ width:'40px', height:'40px', objectFit:'contain', display:'block', margin:'0 auto 8px' }} />}
              <p style={{ margin:'0 0 4px', color:getTeamColor(selectedGame.away_team)||'var(--color-magenta)', fontWeight:'700' }}>{selectedGame.away_team||'Away'}</p>
              <p style={{ margin:0, fontSize:awayWin?'2rem':'1.6rem', fontWeight:'800', color:awayWin?'var(--color-magenta)':'rgba(158, 165, 196,0.6)' }}>{selectedGame.away_score}</p>
            </div>
          </div>
        </div>
        {gameScores.length===0 ? (
          <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)', textAlign:'center' }}>No player stats logged for this game</p></div>
        ) : (
          <>
            <TeamTable teamName={selectedGame.home_team} scores={homeScores} accent="var(--color-cyan)" />
            <TeamTable teamName={selectedGame.away_team} scores={awayScores} accent="var(--color-magenta)" />
            {otherScores.length>0&&<TeamTable teamName="Other" scores={otherScores} accent="rgba(158, 165, 196,0.6)" />}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">Box Scores</h3>
        {bsGames.length===0 ? (
          <p style={{ marginTop:'15px', color:'rgba(158, 165, 196,0.7)' }}>No box scores logged yet</p>
        ) : (
          <div style={{ marginTop:'15px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {[...bsGames].reverse().map(game => (
              <div key={game.id} onClick={()=>setSelectedGame(game)} style={{ padding:'15px', background:'rgba(94, 129, 244,0.04)', border:'1px solid rgba(94, 129, 244,0.12)', borderRadius:'8px', cursor:'pointer', transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(94, 129, 244,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(94, 129, 244,0.04)'}>
                <p style={{ margin:'0 0 6px', fontWeight:'700', color:'var(--color-cyan)' }}>{game.game_name}</p>
                <p style={{ margin:0, color:'rgba(158, 165, 196,0.8)' }}>{game.home_team} <strong>{game.home_score}</strong> - <strong>{game.away_score}</strong> {game.away_team}</p>
                {game.game_date && <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.4)' }}>{new Date(game.game_date).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CompareTab = ({ sport, cfg }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState('player');
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [mode, setMode]         = useState('season');
  const [statFilter, setStatFilter] = useState(cfg.catA.id);

  useEffect(() => { setStatFilter(cfg.catA.id); }, [cfg]);

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getTeams(sport)])
      .then(([p, t]) => { setPlayers(p); setTeams(t); setLoading(false); });
  }, [sport]);

  if (loading) return <p style={{ color:'rgba(158, 165, 196,0.5)', padding:'40px', textAlign:'center' }}>Loading...</p>;

  const getTeamColor = (name) => teams.find(t=>t.team_name===name)?.team_color||null;
  const pA = players.find(p=>String(p.id)===String(idA));
  const pB = players.find(p=>String(p.id)===String(idB));
  const colorA = (pA&&getTeamColor(pA.team))||'#5e81f4';
  const colorB = (pB&&getTeamColor(pB.team))||'#ff9e57';

  const STAT_LIST = statFilter===cfg.catA.id ? cfg.compareA : cfg.compareB;
  const lowerBetter = new Set(cfg.lowerBetter);

  const getVal = (p, label, sKey, cKey) => {
    if (!p) return null;
    const raw = mode==='season'?p[sKey]:p[cKey];
    if (raw===null||raw===undefined||raw==='') return '--';
    return String(raw);
  };
  const numVal = (v) => { if (v==='--'||v===null||v===undefined) return null; return parseFloat(v); };
  const isBetter = (key, a, b) => {
    const na=numVal(a), nb=numVal(b);
    if (na===null||nb===null||na===nb) return null;
    return lowerBetter.has(key)?na<nb:na>nb;
  };

  const teamA_obj = teams.find(t=>String(t.id)===String(idA));
  const teamB_obj = teams.find(t=>String(t.id)===String(idB));
  const colorTA = teamA_obj?.team_color||'#5e81f4';
  const colorTB = teamB_obj?.team_color||'#ff9e57';

  const aggregateTeam = (teamName) => {
    const roster = players.filter(p=>p.team===teamName);
    if (!roster.length) return null;
    const sum = (key) => roster.reduce((s,p)=>s+(parseFloat(p[key])||0),0);
    const avg = (key) => { const vals=roster.map(p=>parseFloat(p[key])).filter(v=>!isNaN(v)); return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3):'--'; };
    const out = { 'Players': roster.length };
    cfg.teamStats.forEach(ts => { out[ts.label] = ts.agg==='avg' ? avg(ts.field) : sum(ts.field); });
    return out;
  };
  const tA = compareMode==='team'?aggregateTeam(teamA_obj?.team_name):null;
  const tB = compareMode==='team'?aggregateTeam(teamB_obj?.team_name):null;

  const selSty = (col) => ({ padding:'10px 12px', background:'rgba(10,10,30,0.85)', border:`1px solid ${col}55`, color:'#e2e5f0', borderRadius:'8px', fontSize:'0.88rem', width:'100%', cursor:'pointer' });
  const btnSty = (active) => ({ padding:'7px 18px', background:active?'rgba(94, 129, 244,0.12)':'rgba(10,10,30,0.7)', border:active?'1px solid rgba(94, 129, 244,0.45)':'1px solid rgba(100,120,200,0.18)', color:active?'var(--color-cyan)':'rgba(158, 165, 196,0.45)', borderRadius:'8px', cursor:'pointer', fontWeight:'700', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.08em' });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'18px' }}>
        <button style={btnSty(compareMode==='player')} onClick={()=>{setCompareMode('player');setIdA('');setIdB('');}}>Players</button>
        <button style={btnSty(compareMode==='team')}   onClick={()=>{setCompareMode('team');setIdA('');setIdB('');}}>Teams</button>
      </div>
      <div className="vz-vs-grid" style={{ marginBottom:'20px' }}>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(158, 165, 196,0.5)', marginBottom:'6px', textTransform:'uppercase' }}>{compareMode==='player'?'Player A':'Team A'}</label>
          {compareMode==='player' ? (
            <select value={idA} onChange={e=>setIdA(e.target.value)} style={selSty(colorA)}>
              <option value="">Select player...</option>
              {players.map(p=><option key={p.id} value={String(p.id)}>{p.player_name}{p.team?` (${p.team})`:''} OVR {p.overall}</option>)}
            </select>
          ) : (
            <select value={idA} onChange={e=>setIdA(e.target.value)} style={selSty(colorTA)}>
              <option value="">Select team...</option>
              {teams.map(t=><option key={t.id} value={String(t.id)}>{t.team_name}</option>)}
            </select>
          )}
        </div>
        <span style={{ color:'rgba(158, 165, 196,0.3)', fontWeight:'800', fontSize:'1rem' }}>VS</span>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', color:'rgba(158, 165, 196,0.5)', marginBottom:'6px', textTransform:'uppercase' }}>{compareMode==='player'?'Player B':'Team B'}</label>
          {compareMode==='player' ? (
            <select value={idB} onChange={e=>setIdB(e.target.value)} style={selSty(colorB)}>
              <option value="">Select player...</option>
              {players.map(p=><option key={p.id} value={String(p.id)}>{p.player_name}{p.team?` (${p.team})`:''} OVR {p.overall}</option>)}
            </select>
          ) : (
            <select value={idB} onChange={e=>setIdB(e.target.value)} style={selSty(colorTB)}>
              <option value="">Select team...</option>
              {teams.map(t=><option key={t.id} value={String(t.id)}>{t.team_name}</option>)}
            </select>
          )}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
        {['season','career'].map(m=><button key={m} style={btnSty(mode===m)} onClick={()=>setMode(m)}>{m}</button>)}
      </div>
      {compareMode==='player' && (
        <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'20px' }}>
          {[cfg.catA, cfg.catB].map(c=>(
            <button key={c.id} style={{...btnSty(statFilter===c.id), borderColor:statFilter===c.id?'rgba(255, 158, 87,0.5)':'rgba(100,120,200,0.18)', color:statFilter===c.id?'var(--color-magenta)':'rgba(158, 165, 196,0.45)', background:statFilter===c.id?'rgba(255, 158, 87,0.1)':'rgba(10,10,30,0.7)'}} onClick={()=>setStatFilter(c.id)}>{c.label}</button>
          ))}
        </div>
      )}
      {compareMode==='player' && pA && pB && (
        <div style={{ background:'rgba(10,10,30,0.8)', border:'1px solid rgba(100,120,200,0.13)', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', background:'rgba(0,0,0,0.3)', padding:'10px 14px', borderBottom:'1px solid rgba(100,120,200,0.15)' }}>
            <span style={{ color:colorA, fontWeight:'800', fontSize:'0.88rem' }}>{pA.player_name}</span>
            <span style={{ color:'rgba(158, 165, 196,0.35)', fontSize:'0.7rem', textAlign:'center', alignSelf:'center' }}>STAT</span>
            <span style={{ color:colorB, fontWeight:'800', fontSize:'0.88rem', textAlign:'right' }}>{pB.player_name}</span>
          </div>
          {STAT_LIST.map(([label,sKey,cKey]) => {
            const valA=getVal(pA,label,sKey,cKey), valB=getVal(pB,label,sKey,cKey);
            const aBetter=isBetter(label,valA,valB), bBetter=isBetter(label,valB,valA);
            return (
              <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', padding:'9px 14px', borderBottom:'1px solid rgba(100,120,200,0.06)', alignItems:'center' }}>
                <span style={{ fontWeight:aBetter?'800':'400', color:aBetter?colorA:'rgba(158, 165, 196,0.55)', background:aBetter?`${colorA}22`:'transparent', padding:aBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem' }}>{valA}</span>
                <span style={{ color:'rgba(158, 165, 196,0.3)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center' }}>{label}</span>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontWeight:bBetter?'800':'400', color:bBetter?colorB:'rgba(158, 165, 196,0.55)', background:bBetter?`${colorB}22`:'transparent', padding:bBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem' }}>{valB}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {compareMode==='player' && (!pA||!pB) && (
        <div style={{ textAlign:'center', color:'rgba(158, 165, 196,0.3)', padding:'40px 20px', background:'rgba(10,10,30,0.5)', borderRadius:'10px', border:'1px dashed rgba(100,120,200,0.15)' }}>
          <p style={{ margin:0, fontSize:'0.9rem' }}>Select two players to compare</p>
        </div>
      )}
      {compareMode==='team' && teamA_obj && teamB_obj && tA && tB && (
        <div style={{ background:'rgba(10,10,30,0.8)', border:'1px solid rgba(100,120,200,0.13)', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', background:'rgba(0,0,0,0.3)', padding:'10px 14px', borderBottom:'1px solid rgba(100,120,200,0.15)' }}>
            <span style={{ color:colorTA, fontWeight:'800', fontSize:'0.88rem' }}>{teamA_obj.team_name}</span>
            <span style={{ color:'rgba(158, 165, 196,0.35)', fontSize:'0.7rem', textAlign:'center', alignSelf:'center' }}>STAT</span>
            <span style={{ color:colorTB, fontWeight:'800', fontSize:'0.88rem', textAlign:'right' }}>{teamB_obj.team_name}</span>
          </div>
          {Object.entries(tA).map(([key,valA]) => {
            const valB=tB[key], na=parseFloat(valA), nb=parseFloat(valB);
            const lk=new Set(cfg.teamStats.filter(ts=>cfg.lowerBetter.some(lb=>ts.label.endsWith(lb))).map(ts=>ts.label));
            const aBetter=!isNaN(na)&&!isNaN(nb)&&na!==nb?(lk.has(key)?na<nb:na>nb):null;
            const bBetter=!isNaN(na)&&!isNaN(nb)&&na!==nb?(lk.has(key)?nb<na:nb>na):null;
            return (
              <div key={key} style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', padding:'9px 14px', borderBottom:'1px solid rgba(100,120,200,0.06)', alignItems:'center' }}>
                <span style={{ fontWeight:aBetter?'800':'400', color:aBetter?colorTA:'rgba(158, 165, 196,0.55)', background:aBetter?`${colorTA}22`:'transparent', padding:aBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem' }}>{valA}</span>
                <span style={{ color:'rgba(158, 165, 196,0.3)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center' }}>{key}</span>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontWeight:bBetter?'800':'400', color:bBetter?colorTB:'rgba(158, 165, 196,0.55)', background:bBetter?`${colorTB}22`:'transparent', padding:bBetter?'3px 8px':'0', borderRadius:'6px', display:'inline-block', fontSize:'0.93rem' }}>{valB}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {compareMode==='team' && (!teamA_obj||!teamB_obj) && (
        <div style={{ textAlign:'center', color:'rgba(158, 165, 196,0.3)', padding:'40px', background:'rgba(10,10,30,0.5)', borderRadius:'10px', border:'1px dashed rgba(100,120,200,0.15)' }}>Select two teams to compare</div>
      )}
    </div>
  );
};

/* ── Prop Bets (scoped to this league's sport) ─────────────────── */
const PROPS_KEY = 'nova_prop_bets';
const BETS_KEY  = 'nova_user_bets';
const getAllProps = () => { try { return JSON.parse(localStorage.getItem(PROPS_KEY) || '[]'); } catch { return []; } };
const getUserBets = (username) => { try { return JSON.parse(localStorage.getItem(`${BETS_KEY}_${username}`) || '{}'); } catch { return {}; } };
const saveUserBets = (username, bets) => localStorage.setItem(`${BETS_KEY}_${username}`, JSON.stringify(bets));

const PropBetsTab = ({ cfg }) => {
  const [user, setUser] = useState(null);
  const [props, setProps] = useState(getAllProps);
  const [myBets, setMyBets] = useState({});
  const [betAmounts, setBetAmounts] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nova_user') || 'null');
      setUser(stored);
      if (stored?.username) setMyBets(getUserBets(stored.username));
    } catch { /* no-op */ }
    setProps(getAllProps());
  }, []);

  const getCoins = () => user?.username ? parseInt(localStorage.getItem(`nova_coins_${user.username}`) || '0') : 0;
  const setCoins = (n) => { if (user?.username) localStorage.setItem(`nova_coins_${user.username}`, String(Math.max(0, n))); };

  function placeBet(propId, optionIdx) {
    if (!user) { alert('Sign in to bet!'); return; }
    if (myBets[propId] !== undefined) { alert('Already placed a bet on this prop.'); return; }
    const amount = parseInt(betAmounts[propId] || '10');
    if (isNaN(amount) || amount < 1) { alert('Enter a valid bet amount.'); return; }
    const coins = getCoins();
    if (coins < amount) { alert(`Not enough coins! You have ${coins}.`); return; }
    setCoins(coins - amount);
    const updated = { ...myBets, [propId]: { optionIdx, amount } };
    setMyBets(updated);
    saveUserBets(user.username, updated);
  }

  const sportProps = props.filter(p => p.sport === cfg.propSport);
  const open     = sportProps.filter(p => p.status === 'open');
  const resolved = sportProps.filter(p => p.status === 'resolved');

  const winnings = (prop) => {
    const bet = myBets[prop.id];
    if (!bet || prop.status !== 'resolved') return null;
    if (bet.optionIdx === prop.winnerIdx) return { win: true, amount: Math.round(bet.amount * (prop.multiplier || 2)) };
    return { win: false, amount: bet.amount };
  };

  const Section = ({ title, items }) => (
    <>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.45)', margin: '20px 0 12px' }}>{title}</div>
      {items.length === 0
        ? <div className="neon-card p-3" style={{ padding: '24px', textAlign:'center', color:'rgba(158,165,196,0.4)' }}>{title === 'Open Props' ? 'No open props right now.' : 'No resolved props yet.'}</div>
        : items.map(prop => {
            const bet = myBets[prop.id];
            const result = winnings(prop);
            return (
              <div key={prop.id} className="neon-card p-3" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '1rem', marginBottom: 4 }}>{prop.question}</div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)' }}>
                      {cfg.icon} {cfg.shortLabel} · {prop.multiplier || 2}× payout
                      {prop.deadline ? ` · Closes ${new Date(prop.deadline).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  {result && (
                    <div style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, background: result.win ? 'rgba(67,181,129,0.15)' : 'rgba(255,107,122,0.1)', color: result.win ? '#43b581' : 'rgba(255,107,122,0.8)', border: `1px solid ${result.win ? '#43b581' : 'rgba(255,107,122,0.3)'}`, flexShrink: 0 }}>
                      {result.win ? `+${result.amount} 🪙` : `-${result.amount} 🪙`}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'12px' }}>
                  {(prop.options || []).map((opt, oi) => {
                    const isWinner = prop.status === 'resolved' && prop.winnerIdx === oi;
                    const isLoser  = prop.status === 'resolved' && prop.winnerIdx !== oi;
                    const isPicked = bet?.optionIdx === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => prop.status === 'open' && !bet && placeBet(prop.id, oi)}
                        disabled={prop.status !== 'open' || !!bet}
                        style={{
                          padding:'8px 16px', borderRadius:8, cursor: prop.status==='open'&&!bet ? 'pointer':'default', fontWeight:700, fontSize:'0.85rem',
                          background: isWinner ? 'rgba(67,181,129,0.15)' : isPicked ? 'rgba(94,129,244,0.15)' : 'rgba(94,129,244,0.05)',
                          color: isWinner ? '#43b581' : isLoser && isPicked ? '#ff6b7a' : isPicked ? 'var(--color-cyan)' : 'rgba(158,165,196,0.75)',
                          border: `1px solid ${isWinner ? '#43b581' : isPicked ? 'var(--color-cyan)' : 'rgba(94,129,244,0.2)'}`,
                        }}
                      >
                        {opt}{isWinner && ' ✓'}{isPicked && !isWinner && prop.status === 'resolved' && ' ✗'}
                      </button>
                    );
                  })}
                </div>
                {prop.status === 'open' && !bet && user && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <input
                      type="number" min={1} placeholder="Coins to bet"
                      value={betAmounts[prop.id] || ''}
                      onChange={e => setBetAmounts(prev => ({ ...prev, [prop.id]: e.target.value }))}
                      style={{ width: 120, padding: '6px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 6, fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)' }}>coins · pick an option above to bet</span>
                  </div>
                )}
                {bet && prop.status === 'open' && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)' }}>Bet {bet.amount} 🪙 on "{prop.options?.[bet.optionIdx]}"</div>
                )}
              </div>
            );
          })
      }
    </>
  );

  return (
    <div>
      <div className="neon-card p-3" style={{ marginBottom:'8px' }}>
        <h3 className="gradient-text-cyan" style={{ margin:0 }}>{cfg.icon} {cfg.label} Prop Bets</h3>
        <p style={{ margin:'6px 0 0', color:'rgba(158, 165, 196,0.6)', fontSize:'0.85rem' }}>Bet coins on props for this league — admin posts, you pick, coins awarded on resolve</p>
        {user && <div style={{ marginTop: 10, fontSize: '0.88rem', color: '#ffd700', fontWeight: 700 }}>Your balance: {getCoins().toLocaleString()} 🪙</div>}
      </div>
      <Section title="Open Props" items={open} />
      <Section title="Resolved" items={resolved} />
    </div>
  );
};

const HallOfFameTab = ({ sport }) => {
  const [hof, setHof] = useState([]);
  useEffect(() => { db.getHof(sport).then(setHof); }, [sport]);
  return (
    <div className="card-container">
      <div className="neon-card p-3">
        <h3 className="gradient-text-magenta">Hall of Fame</h3>
        {hof.length===0 ? (
          <p style={{ marginTop:'15px', color:'rgba(158, 165, 196,0.7)' }}>Hall of Fame players will appear here</p>
        ) : (
          <div style={{ marginTop:'15px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {hof.map((entry,i) => (
              <div key={i} style={{ padding:'15px', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:'8px' }}>
                <p style={{ margin:0, fontWeight:'700', color:'#ffd700' }}>{entry.player_name}</p>
                {entry.team && <p style={{ margin:'4px 0 0', color:'rgba(158, 165, 196,0.7)', fontSize:'0.85rem' }}>{entry.team}</p>}
                {entry.description && <p style={{ margin:'8px 0 0', color:'rgba(158, 165, 196,0.8)', fontSize:'0.9rem' }}>{entry.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViztaLeague;
