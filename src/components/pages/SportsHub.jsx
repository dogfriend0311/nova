import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchScoreboard, fetchStandings, fetchNews, fetchGameSummary,
  fetchAllAthletes, fetchAthleteProfile, fetchAthleteStats,
  normalizeGame, normalizeStandings, normalizeNews, normalizeGameSummary,
  fetchMiLBScoreboard, normalizeMiLBGame, fetchMiLBGameDetail,
} from '../../services/sportsDataService';
import './SportsHub.css';
import PlayByPlay from './PlayByPlay';

const SPORTS = [
  { id:'mlb',          label:'MLB',              icon:'B' },
  { id:'nfl',          label:'NFL',              icon:'F' },
  { id:'nba',          label:'NBA',              icon:'B' },
  { id:'nhl',          label:'NHL',              icon:'H' },
  { id:'cfb',          label:'College Football', icon:'F' },
  { id:'cbb',          label:'College Baseball', icon:'B' },
  { id:'milb_aaa',     label:'Triple-A',         icon:'B' },
  { id:'milb_aa',      label:'Double-A',         icon:'B' },
  { id:'milb_highA',   label:'High-A',           icon:'B' },
  { id:'milb_singleA', label:'Single-A',         icon:'B' },
];

const isMiLB = (sport) => sport.startsWith('milb_');

const SUB_TABS = [
  { id:'scores',    label:'Scores'    },
  { id:'standings', label:'Standings' },
  { id:'news',      label:'News'      },
  { id:'players',   label:'Players'   },
];

const timeSince = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

/* ── Highlights Panel ────────────────────────────────────────── */
const HighlightsPanel = ({ gamePk }) => {
  const [clips, setClips]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    if (!gamePk) return;
    setLoading(true);
    setError(null);
    const mlbBase = process.env.NODE_ENV === 'production' ? '/mlb-proxy' : 'https://statsapi.mlb.com/api/v1';
    fetch(`${mlbBase}/game/${gamePk}/content`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const items = data?.highlights?.highlights?.items || [];
        const parsed = items
          .filter(item => item.playbacks?.length)
          .map(item => {
            const pb = item.playbacks.find(p => /mp4/i.test(p.name)) || item.playbacks[0];
            const thumb = item.image?.cuts?.find(c => c.width >= 480 && c.width <= 960)?.src
              || item.image?.cuts?.[0]?.src || null;
            return {
              id:          item.id,
              title:       item.title || item.headline || 'Highlight',
              description: item.description || item.blurb || '',
              videoUrl:    pb?.url || null,
              thumb,
              duration:    item.duration || null,
            };
          })
          .filter(c => c.videoUrl);
        setClips(parsed);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [gamePk]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load highlights: {error}</div>;
  if (!clips.length) return <div className="sh-empty">No highlights available for this game yet.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {playing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setPlaying(null)}>
          <div style={{ maxWidth:'900px', width:'100%' }} onClick={e => e.stopPropagation()}>
            <video src={playing.videoUrl} controls autoPlay style={{ width:'100%', borderRadius:'10px', background:'#000' }} />
            <div style={{ marginTop:'10px', color:'#e0e8ff', fontWeight:700 }}>{playing.title}</div>
            {playing.description && <div style={{ marginTop:'4px', fontSize:'0.85rem', color:'rgba(158, 165, 196,0.55)' }}>{playing.description}</div>}
            <button onClick={() => setPlaying(null)} style={{ marginTop:'14px', background:'none', border:'1px solid rgba(158, 165, 196,0.3)', color:'rgba(158, 165, 196,0.6)', borderRadius:'6px', padding:'6px 16px', cursor:'pointer', fontSize:'0.82rem' }}>Close</button>
          </div>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px' }}>
        {clips.map(clip => (
          <div key={clip.id}
            onClick={() => setPlaying(clip)}
            style={{ borderRadius:'10px', overflow:'hidden', background:'rgba(10,10,30,0.9)', border:'1px solid rgba(100,120,200,0.2)', cursor:'pointer', transition:'border-color 0.18s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(94, 129, 244,0.45)'; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(100,120,200,0.2)'; e.currentTarget.style.transform=''; }}
          >
            <div style={{ position:'relative', width:'100%', aspectRatio:'16/9', background:'rgba(5,5,20,0.9)', overflow:'hidden' }}>
              {clip.thumb
                ? <img src={clip.thumb} alt={clip.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', opacity:0.3 }}>play</div>}
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.25)' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'rgba(94, 129, 244,0.85)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', boxShadow:'0 2px 18px rgba(94, 129, 244,0.5)' }}>
                  play
                </div>
              </div>
              {clip.duration && (
                <div style={{ position:'absolute', bottom:6, right:8, background:'rgba(0,0,0,0.75)', color:'#fff', fontSize:'0.68rem', fontWeight:700, padding:'2px 6px', borderRadius:'4px' }}>
                  {clip.duration}
                </div>
              )}
            </div>
            <div style={{ padding:'10px 12px 12px' }}>
              <p style={{ margin:0, fontSize:'0.82rem', fontWeight:700, color:'rgba(158, 165, 196,0.92)', lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {clip.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Score Card ──────────────────────────────────────────────── */
const ScoreCard = ({ game, onSelectGame }) => {
  const isLive  = game.status === 'in';
  const isFinal = game.status === 'post';
  const isSched = game.status === 'pre';
  const awayWins = isFinal && +game.awayTeam.score > +game.homeTeam.score;
  const homeWins = isFinal && +game.homeTeam.score > +game.awayTeam.score;

  const getStarred = () => {
    const u = localStorage.getItem('nova_user');
    if (!u) return false;
    const username = JSON.parse(u).username;
    return JSON.parse(localStorage.getItem(`nova_favgames_${username}`) || '[]').some(g => g.gameId === game.id);
  };
  const [starred, setStarred] = useState(getStarred);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleStarClick = (e) => {
    e.stopPropagation();
    const u = localStorage.getItem('nova_user');
    if (!u) return;
    const username = JSON.parse(u).username;
    const key = `nova_favgames_${username}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    if (starred) {
      localStorage.setItem(key, JSON.stringify(stored.filter(g => g.gameId !== game.id)));
      setStarred(false);
    } else {
      setShowNote(true);
    }
  };

  const confirmStar = (e) => {
    e.stopPropagation();
    const u = localStorage.getItem('nova_user');
    if (!u) return;
    const username = JSON.parse(u).username;
    const key = `nova_favgames_${username}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([...stored, {
      id: Date.now().toString(), gameId: game.id,
      text: `${game.awayTeam?.abbr || ''} vs ${game.homeTeam?.abbr || ''}`,
      note: noteText, date: new Date().toLocaleDateString(),
    }]));
    setStarred(true); setShowNote(false); setNoteText('');
  };

  const TeamRow = ({ team, winner }) => (
    <div className={`sh-team-row ${winner ? 'winner' : ''}`}>
      <div className="sh-team-left">
        {team.logo ? <img src={team.logo} alt={team.abbr} className="sh-team-logo" /> : <span className="sh-team-logo-placeholder">?</span>}
        <div className="sh-team-info">
          <span className="sh-team-abbr">{team.abbr}</span>
          {team.record && <span className="sh-team-record">{team.record}</span>}
        </div>
        <span className="sh-team-name">{team.shortName}</span>
      </div>
      {!isSched && <span className={`sh-team-score ${winner ? 'winner-score' : ''}`}>{team.score ?? '--'}</span>}
    </div>
  );

  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={handleStarClick}
        style={{ position:'absolute', top:'6px', right:'6px', zIndex:10, background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem', opacity:starred?1:0.4, transition:'opacity 0.15s', color:'#ffd700' }}
        title={starred ? 'Remove from favorites' : 'Star this game'}
      >
        {starred ? 'star' : 'star-outline'}
      </button>
      {showNote && (
        <div style={{ position:'absolute', top:'30px', right:'6px', zIndex:20, background:'rgba(5,5,20,0.98)', border:'1px solid rgba(94, 129, 244,0.4)', borderRadius:'8px', padding:'10px 12px', width:'220px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }} onClick={e=>e.stopPropagation()}>
          <p style={{ margin:'0 0 8px', fontSize:'0.78rem', color:'rgba(158, 165, 196,0.7)', fontWeight:600 }}>Add a note (optional)</p>
          <input
            autoFocus
            type="text"
            value={noteText}
            onChange={e=>setNoteText(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') confirmStar(e); if(e.key==='Escape'){setShowNote(false);setNoteText('');} }}
            placeholder="e.g. Amazing comeback game"
            style={{ width:'100%', padding:'6px 8px', background:'rgba(94, 129, 244,0.06)', border:'1px solid rgba(94, 129, 244,0.3)', color:'#e2e5f0', borderRadius:'5px', fontSize:'0.8rem', boxSizing:'border-box' }}
          />
          <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
            <button onClick={confirmStar} style={{ flex:1, padding:'5px', background:'rgba(94, 129, 244,0.15)', border:'1px solid rgba(94, 129, 244,0.4)', color:'#5e81f4', borderRadius:'5px', cursor:'pointer', fontSize:'0.78rem', fontWeight:700 }}>Save</button>
            <button onClick={e=>{e.stopPropagation();setShowNote(false);setNoteText('');}} style={{ flex:1, padding:'5px', background:'transparent', border:'1px solid rgba(158, 165, 196,0.15)', color:'rgba(158, 165, 196,0.5)', borderRadius:'5px', cursor:'pointer', fontSize:'0.78rem' }}>Cancel</button>
          </div>
        </div>
      )}
      <div
        className={`sh-score-card ${isLive?'live':''} ${isFinal?'final':''} ${isSched?'scheduled':''} clickable`}
        onClick={() => (isFinal||isLive) && onSelectGame && onSelectGame(game)}
        title={(isFinal||isLive) ? 'Click for box score' : ''}
      >
        <div className="sh-card-header">
          {isLive && <><span className="sh-live-dot" /><span className="sh-live-text">LIVE</span></>}
          <span className="sh-status-detail">{game.statusDetail}</span>
          {game.broadcast && <span className="sh-broadcast">{game.broadcast}</span>}
          {(isFinal||isLive) && <span className="sh-detail-hint">Box Score</span>}
        </div>
        <TeamRow team={game.awayTeam} winner={awayWins} />
        <TeamRow team={game.homeTeam} winner={homeWins} />
      </div>
    </div>
  );
};

/* ── Scores Panel ────────────────────────────────────────────── */
const ScoresPanel = ({ sport, refreshKey, onSelectGame, selectedDate }) => {
  const [games, setGames]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchScoreboard(sport, selectedDate || undefined);
      setGames((data.events || []).map(normalizeGame).filter(Boolean));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [sport, selectedDate]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load scores: {error}</div>;

  const live      = games.filter(g=>g.status==='in');
  const final     = games.filter(g=>g.status==='post');
  const scheduled = games.filter(g=>g.status==='pre');

  if (!games.length) return (
    <div className="sh-no-games">
      <div className="sh-no-games-icon">cal</div>
      <p>No games scheduled right now.</p>
      <p className="sh-no-games-sub">Check back later or view the Standings tab.</p>
    </div>
  );

  const Section = ({ title, items }) => !items.length ? null : (
    <>
      <h3 className="sh-section-title">{title} <span className="sh-section-count">{items.length}</span></h3>
      <div className="sh-scores-grid">{items.map(g=><ScoreCard key={g.id} game={g} onSelectGame={onSelectGame} />)}</div>
    </>
  );

  return (
    <div className="sh-scores-wrap">
      <Section title="Live"      items={live} />
      <Section title="Final"     items={final} />
      <Section title="Upcoming"  items={scheduled} />
    </div>
  );
};

/* ── MiLB Game Detail ────────────────────────────────────────── */
const MiLBGameDetailView = ({ game, onBack }) => {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchMiLBGameDetail(game.id).then(setDetail).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [game.id]);

  const thS = { padding:'6px 10px', color:'rgba(158, 165, 196,0.45)', fontSize:'0.72rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid rgba(100,120,200,0.18)', textAlign:'center', whiteSpace:'nowrap' };
  const tdS = { padding:'6px 10px', textAlign:'center', color:'rgba(158, 165, 196,0.82)', fontSize:'0.82rem', borderBottom:'1px solid rgba(100,120,200,0.07)' };

  return (
    <div className="sh-detail-view">
      <button className="sh-back-btn" onClick={onBack}>Back to Scores</button>
      <div className="sh-detail-header" style={{ textAlign:'center', marginBottom:'20px' }}>
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'16px', flexWrap:'wrap', marginBottom:'6px' }}>
          <span style={{ fontSize:'1rem', fontWeight:'700', color:'rgba(158, 165, 196,0.9)' }}>{game.awayTeam.name}</span>
          {game.status!=='pre' && <span style={{ fontSize:'1.6rem', fontWeight:'800', color:'var(--color-cyan)', letterSpacing:'2px' }}>{game.awayTeam.score??'--'} - {game.homeTeam.score??'--'}</span>}
          <span style={{ fontSize:'1rem', fontWeight:'700', color:'rgba(158, 165, 196,0.9)' }}>{game.homeTeam.name}</span>
        </div>
        <div style={{ fontSize:'0.82rem', color:'rgba(158, 165, 196,0.45)' }}>{game.statusDetail}</div>
      </div>
      {loading && <div className="sh-loading"><div className="sh-spinner" /></div>}
      {error && <div className="sh-error">Could not load box score: {error}</div>}
      {!loading && detail && (() => {
        const ls = detail.linescore, bs = detail.boxscore;
        return (
          <>
            {ls?.innings?.length > 0 ? (
              <div style={{ overflowX:'auto', marginBottom:'28px' }}>
                <h4 style={{ fontSize:'0.78rem', color:'rgba(158, 165, 196,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>Linescore</h4>
                <table style={{ borderCollapse:'collapse', minWidth:'500px' }}>
                  <thead><tr>
                    <th style={{ ...thS, textAlign:'left', minWidth:'70px' }}>Team</th>
                    {ls.innings.map(inn=><th key={inn.num} style={thS}>{inn.num}</th>)}
                    <th style={{ ...thS, borderLeft:'1px solid rgba(100,120,200,0.3)' }}>R</th>
                    <th style={thS}>H</th><th style={thS}>E</th>
                  </tr></thead>
                  <tbody>
                    {[{label:game.awayTeam.abbr,k:'away'},{label:game.homeTeam.abbr,k:'home'}].map(({label,k})=>(
                      <tr key={k}>
                        <td style={{ ...tdS, textAlign:'left', fontWeight:'700', color:'rgba(158, 165, 196,0.9)' }}>{label}</td>
                        {ls.innings.map(inn=><td key={inn.num} style={tdS}>{inn[k]?.runs??'--'}</td>)}
                        <td style={{ ...tdS, borderLeft:'1px solid rgba(100,120,200,0.3)', fontWeight:'700' }}>{ls.teams?.[k]?.runs??'--'}</td>
                        <td style={tdS}>{ls.teams?.[k]?.hits??'--'}</td>
                        <td style={tdS}>{ls.teams?.[k]?.errors??'--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem', marginBottom:'20px', padding:'20px', textAlign:'center', background:'rgba(255,255,255,0.02)', borderRadius:'8px' }}>
                {game.status==='pre'?'Game has not started yet.':'Linescore not available.'}
              </div>
            )}
            {[{k:'away',name:game.awayTeam.name},{k:'home',name:game.homeTeam.name}].map(({k,name})=>{
              const td=bs?.teams?.[k]; if(!td) return null;
              const batters  = (td.battingOrder||td.batters||[]).map(id=>td.players?.[`ID${id}`]).filter(Boolean);
              const pitchers = (td.pitchers||[]).map(id=>td.players?.[`ID${id}`]).filter(Boolean);
              if(!batters.length&&!pitchers.length) return null;
              return (
                <div key={k} style={{ marginBottom:'28px' }}>
                  <h4 style={{ fontSize:'0.82rem', color:'var(--color-cyan)', marginBottom:'12px', borderBottom:'1px solid rgba(100,120,200,0.15)', paddingBottom:'6px' }}>{name}</h4>
                  {batters.length>0&&<div style={{ overflowX:'auto', marginBottom:'14px' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%' }}>
                      <thead><tr><th style={{ ...thS, textAlign:'left', minWidth:'140px' }}>Player</th>{['AB','R','H','RBI','BB','K','HR'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                      <tbody>{batters.map((p,i)=>{const b=p.stats?.batting||{};return(<tr key={i}><td style={{ ...tdS, textAlign:'left' }}>{p.person?.fullName}</td><td style={tdS}>{b.atBats??'--'}</td><td style={tdS}>{b.runs??'--'}</td><td style={tdS}>{b.hits??'--'}</td><td style={tdS}>{b.rbi??'--'}</td><td style={tdS}>{b.baseOnBalls??'--'}</td><td style={tdS}>{b.strikeOuts??'--'}</td><td style={tdS}>{b.homeRuns??'--'}</td></tr>);})}</tbody>
                    </table>
                  </div>}
                  {pitchers.length>0&&<div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%' }}>
                      <thead><tr><th style={{ ...thS, textAlign:'left', minWidth:'140px' }}>Pitcher</th>{['IP','H','R','ER','BB','K','Dec'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                      <tbody>{pitchers.map((p,i)=>{const pt=p.stats?.pitching||{};return(<tr key={i}><td style={{ ...tdS, textAlign:'left' }}>{p.person?.fullName}</td><td style={tdS}>{pt.inningsPitched??'--'}</td><td style={tdS}>{pt.hits??'--'}</td><td style={tdS}>{pt.runs??'--'}</td><td style={tdS}>{pt.earnedRuns??'--'}</td><td style={tdS}>{pt.baseOnBalls??'--'}</td><td style={tdS}>{pt.strikeOuts??'--'}</td><td style={{ ...tdS, color:'rgba(158, 165, 196,0.5)', fontStyle:'italic' }}>{pt.note||'--'}</td></tr>);})}</tbody>
                    </table>
                  </div>}
                </div>
              );
            })}
          </>
        );
      })()}
    </div>
  );
};

/* ── MiLB Scores Panel ───────────────────────────────────────── */
const MiLBScoresPanel = ({ sport, refreshKey, selectedDate }) => {
  const [games, setGames]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setSelectedGame(null);
    try {
      const raw = await fetchMiLBScoreboard(sport, selectedDate || undefined);
      setGames(raw.map(normalizeMiLBGame));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [sport, selectedDate]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load scores: {error}</div>;
  if (selectedGame) return <MiLBGameDetailView game={selectedGame} onBack={()=>setSelectedGame(null)} />;

  const live=games.filter(g=>g.status==='in'), final=games.filter(g=>g.status==='post'), scheduled=games.filter(g=>g.status==='pre');
  if (!games.length) return <div className="sh-no-games"><div className="sh-no-games-icon">B</div><p>No games scheduled today.</p></div>;

  const Section = ({ title, items, clickable }) => !items.length?null:(
    <><h3 className="sh-section-title">{title} <span className="sh-section-count">{items.length}</span></h3>
    <div className="sh-scores-grid">{items.map(g=><ScoreCard key={g.id} game={g} onSelectGame={clickable?setSelectedGame:undefined} />)}</div></>
  );
  return <div className="sh-scores-wrap"><Section title="Live" items={live} clickable /><Section title="Final" items={final} clickable /><Section title="Upcoming" items={scheduled} /></div>;
};

/* ── Game Detail View ────────────────────────────────────────── */
const GameDetailView = ({ game, sport, onBack }) => {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showPbp, setShowPbp]   = useState(false);
  const [detailTab, setDetailTab] = useState('boxscore');

  const isMLB = sport === 'mlb';

  useEffect(() => {
    setLoading(true); setError(null);
    fetchGameSummary(sport, game.id).then(raw=>setSummary(normalizeGameSummary(raw))).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [game.id, sport]);

  const thStyle = { padding:'8px 10px', color:'rgba(158, 165, 196,0.5)', fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid rgba(100,120,200,0.18)', textAlign:'center' };
  const tdStyle = { padding:'8px 10px', textAlign:'center', color:'rgba(158, 165, 196,0.85)', fontSize:'0.85rem', borderBottom:'1px solid rgba(100,120,200,0.07)' };

  if (showPbp) return (
    <PlayByPlay
      game={{ ...game, away_team:game.awayTeam?.abbr, home_team:game.homeTeam?.abbr, away_score:game.awayTeam?.score, home_score:game.homeTeam?.score, gamePk:game.id, espnId:game.id }}
      sport={sport}
      onBack={()=>setShowPbp(false)}
    />
  );

  return (
    <div className="sh-detail-view">
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
        <button className="neon-button" onClick={onBack}>Back to Scores</button>
        <button className="neon-button" onClick={()=>setShowPbp(true)} style={{ borderColor:'rgba(94, 129, 244,0.5)', color:'var(--color-cyan)' }}>
          Live Play-by-Play
        </button>
      </div>

      {/* Game header */}
      <div className="sh-detail-header">
        <div className="sh-detail-team">
          {game.awayTeam.logo ? <img src={game.awayTeam.logo} alt={game.awayTeam.abbr} className="sh-detail-logo" /> : <div className="sh-detail-logo-ph">{game.awayTeam.abbr[0]}</div>}
          <span className="sh-detail-abbr">{game.awayTeam.abbr}</span>
          {game.awayTeam.record && <span className="sh-detail-record">{game.awayTeam.record}</span>}
        </div>
        <div className="sh-detail-score-block">
          <div className="sh-detail-scores">
            <span className={`sh-detail-score ${+game.awayTeam.score>+game.homeTeam.score?'winner-score':''}`}>{game.awayTeam.score}</span>
            <span className="sh-detail-dash">-</span>
            <span className={`sh-detail-score ${+game.homeTeam.score>+game.awayTeam.score?'winner-score':''}`}>{game.homeTeam.score}</span>
          </div>
          <span className="sh-detail-status">{loading?'...':(summary?.status||game.statusDetail)}</span>
        </div>
        <div className="sh-detail-team">
          {game.homeTeam.logo ? <img src={game.homeTeam.logo} alt={game.homeTeam.abbr} className="sh-detail-logo" /> : <div className="sh-detail-logo-ph">{game.homeTeam.abbr[0]}</div>}
          <span className="sh-detail-abbr">{game.homeTeam.abbr}</span>
          {game.homeTeam.record && <span className="sh-detail-record">{game.homeTeam.record}</span>}
        </div>
      </div>

      {/* Detail tabs */}
      <div style={{ display:'flex', gap:'6px', margin:'18px 0', borderBottom:'1px solid rgba(100,120,200,0.18)', paddingBottom:'12px' }}>
        {[
          { id:'boxscore',   label:'Box Score' },
          ...(isMLB ? [{ id:'highlights', label:'Highlights' }] : []),
        ].map(t => (
          <button key={t.id} onClick={()=>setDetailTab(t.id)}
            className={`sh-sub-tab ${detailTab===t.id?'active':''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {detailTab === 'highlights' && isMLB && (
        <HighlightsPanel gamePk={game.id} />
      )}

      {detailTab === 'boxscore' && (
        <>
          {loading && <div className="sh-loading" style={{ marginTop:'30px' }}><div className="sh-spinner" /></div>}
          {error && <div className="sh-error" style={{ marginTop:'20px' }}>Box score unavailable: {error}</div>}

          {summary && (
            <>
              {summary.lineScore && (
                <div className="sh-detail-section">
                  <h3 className="sh-detail-section-title">Line Score</h3>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'400px' }}>
                      <thead><tr>
                        <th style={{ ...thStyle, textAlign:'left', width:'80px' }}>Team</th>
                        {summary.lineScore.periods.map((p,i)=><th key={i} style={thStyle}>{p.label}</th>)}
                        {summary.lineScore.extras.map((e,i)=><th key={`ex-${i}`} style={{ ...thStyle, color:'var(--color-cyan)' }}>{e.label}</th>)}
                      </tr></thead>
                      <tbody>
                        {[{label:game.awayTeam.abbr,key:'away'},{label:game.homeTeam.abbr,key:'home'}].map(row=>(
                          <tr key={row.key}>
                            <td style={{ ...tdStyle, textAlign:'left', fontWeight:'700', color:'var(--color-cyan)' }}>{row.label}</td>
                            {summary.lineScore.periods.map((p,i)=><td key={i} style={tdStyle}>{p[row.key]}</td>)}
                            {summary.lineScore.extras.map((e,i)=><td key={`ex-${i}`} style={{ ...tdStyle, fontWeight:'700', color:'var(--color-cyan)' }}>{e[row.key]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {summary.teamStats.length===2 && summary.teamStats[0].stats.length>0 && (
                <div className="sh-detail-section">
                  <h3 className="sh-detail-section-title">Team Stats</h3>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead><tr>
                        <th style={thStyle}>Stat</th>
                        <th style={thStyle}>{summary.teamStats[0].abbr||summary.teamStats[0].name}</th>
                        <th style={thStyle}>{summary.teamStats[1].abbr||summary.teamStats[1].name}</th>
                      </tr></thead>
                      <tbody>
                        {summary.teamStats[0].stats.slice(0,12).map((s,i)=>{
                          const s2=summary.teamStats[1].stats[i];
                          return(<tr key={i}><td style={{ ...tdStyle, color:'rgba(158, 165, 196,0.5)', fontSize:'0.78rem' }}>{s.label}</td><td style={tdStyle}>{s.value}</td><td style={tdStyle}>{s2?.value||'--'}</td></tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {summary.playerGroups.map((group,gi)=>(
                group.categories.length>0&&(
                  <div key={gi} className="sh-detail-section">
                    <h3 className="sh-detail-section-title">{group.teamName}</h3>
                    {group.categories.map((cat,ci)=>(
                      cat.athletes.length>0&&(
                        <div key={ci} style={{ marginBottom:'16px' }}>
                          <h4 style={{ fontSize:'0.8rem', color:'rgba(158, 165, 196,0.45)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>{cat.name}</h4>
                          <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:`${200+cat.keys.length*60}px` }}>
                              <thead><tr>
                                <th style={{ ...thStyle, textAlign:'left' }}>Player</th>
                                {cat.keys.map((k,ki)=><th key={ki} style={thStyle}>{k}</th>)}
                              </tr></thead>
                              <tbody>
                                {cat.athletes.map((a,ai)=>(
                                  <tr key={ai}>
                                    <td style={{ ...tdStyle, textAlign:'left' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                        {a.photo&&<img src={a.photo} alt={a.name} style={{ width:'26px', height:'26px', borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />}
                                        <span style={{ color:'rgba(158, 165, 196,0.9)' }}>{a.name}</span>
                                        {a.position&&<span style={{ fontSize:'0.72rem', color:'rgba(158, 165, 196,0.35)' }}>{a.position}</span>}
                                      </div>
                                    </td>
                                    {a.stats.map((v,vi)=><td key={vi} style={tdStyle}>{v||'--'}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

/* ── Player Search Panel ─────────────────────────────────────── */
const PlayerSearchPanel = ({ sport }) => {
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [selectedId, setSelectedId]     = useState(null);
  const [playerData, setPlayerData]     = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  if (sport==='cbb') return (
    <div className="sh-players-panel">
      <h3 className="gradient-text-cyan">Player Lookup</h3>
      <div className="sh-no-games" style={{ marginTop:'30px' }}><p>Player search is not available for College Baseball.</p></div>
    </div>
  );

  const handleSearch = async (e) => {
    e.preventDefault(); if (!query.trim()) return;
    setLoading(true); setError(null); setResults([]); setSelectedId(null); setPlayerData(null);
    try {
      const all = await fetchAllAthletes(sport);
      const q   = query.trim().toLowerCase();
      const filtered = all.filter(a=>(a.displayName||'').toLowerCase().includes(q)||(a.teamName||'').toLowerCase().includes(q));
      setResults(filtered.slice(0,20));
      if (!filtered.length) setError('No players found. Try a different name.');
    } catch { setError('Search failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleSelectAthlete = async (athlete) => {
    if (selectedId===athlete.id) { setSelectedId(null); setPlayerData(null); return; }
    setSelectedId(athlete.id); setPlayerData(null); setStatsLoading(true);
    try {
      const [profileRes,statsRes] = await Promise.allSettled([fetchAthleteProfile(sport,athlete.id),fetchAthleteStats(sport,athlete.id)]);
      setPlayerData({ profile:profileRes.status==='fulfilled'?profileRes.value?.athlete:null, statsCat:statsRes.status==='fulfilled'?(statsRes.value?.categories||[]):[] });
    } catch { setPlayerData({ profile:null, statsCat:[] }); }
    finally { setStatsLoading(false); }
  };

  const thS={padding:'7px 10px',color:'rgba(158, 165, 196,0.45)',fontSize:'0.72rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'1px solid rgba(100,120,200,0.18)',textAlign:'center'};
  const tdS={padding:'7px 10px',textAlign:'center',color:'rgba(158, 165, 196,0.82)',fontSize:'0.83rem',borderBottom:'1px solid rgba(100,120,200,0.07)'};

  return (
    <div className="sh-players-panel">
      <div className="sh-players-header">
        <h3 className="gradient-text-cyan">Player Lookup</h3>
        <p style={{ color:'rgba(158, 165, 196,0.5)', fontSize:'0.85rem', marginTop:'6px' }}>Search by player name or team{sport==='cfb'?' (first search loads all rosters ~10s)':''}</p>
      </div>
      <form className="sh-search-form" onSubmit={handleSearch}>
        <input className="sh-search-input" type="text" placeholder="Search player or team name..." value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="neon-button sh-search-btn" type="submit" disabled={loading}>{loading?'Loading...':'Search'}</button>
      </form>
      {error && <div className="sh-error" style={{ marginTop:'14px' }}>{error}</div>}
      {results.length>0 && (
        <div className="sh-search-results">
          <p style={{ fontSize:'0.78rem', color:'rgba(158, 165, 196,0.4)', marginBottom:'10px' }}>{results.length} result{results.length!==1?'s':''} found</p>
          {results.map(athlete=>(
            <div key={athlete.id} className="sh-athlete-result">
              <button className={`sh-athlete-btn ${selectedId===athlete.id?'selected':''}`} onClick={()=>handleSelectAthlete(athlete)}>
                <div className="sh-athlete-left">
                  <img src={athlete.headshotUrl} alt={athlete.displayName} className="sh-athlete-photo" onError={e=>{e.target.style.display='none';}} />
                  <div className="sh-athlete-info">
                    <span className="sh-athlete-name">{athlete.displayName||'--'}</span>
                    <span className="sh-athlete-meta">{[athlete.teamName,athlete.position&&`#${athlete.jersey||''} ${athlete.position}`].filter(Boolean).join(' - ')}</span>
                  </div>
                </div>
                <span className="sh-athlete-toggle">{selectedId===athlete.id?'^':'v'}</span>
              </button>
              {selectedId===athlete.id && (
                <div className="sh-athlete-detail">
                  {statsLoading && <div className="sh-loading" style={{ padding:'20px 0' }}><div className="sh-spinner" /></div>}
                  {!statsLoading && playerData && (
                    <>
                      {playerData.profile && (
                        <div className="sh-athlete-profile">
                          {playerData.profile.headshot?.href && <img src={playerData.profile.headshot.href} alt={playerData.profile.displayName} className="sh-profile-photo" />}
                          <div className="sh-profile-info">
                            <h4 style={{ color:'var(--color-cyan)', margin:'0 0 6px', fontSize:'1rem' }}>{playerData.profile.displayName}</h4>
                            {playerData.profile.team?.displayName && <p style={{ margin:'0 0 4px', color:'rgba(158, 165, 196,0.7)', fontSize:'0.85rem' }}>{playerData.profile.team.displayName}</p>}
                            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'6px' }}>
                              {playerData.profile.position?.displayName && <span className="sh-profile-badge">{playerData.profile.position.displayName}</span>}
                              {playerData.profile.jersey && <span className="sh-profile-badge">#{playerData.profile.jersey}</span>}
                              {playerData.profile.age && <span className="sh-profile-badge">Age {playerData.profile.age}</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      {playerData.statsCat.length>0 ? (
                        <div style={{ marginTop:'16px' }}>
                          <h4 style={{ fontSize:'0.8rem', color:'rgba(158, 165, 196,0.45)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'12px' }}>Stats</h4>
                          {playerData.statsCat.slice(0,1).map((cat,ci)=>(
                            <div key={ci} style={{ marginBottom:'16px' }}>
                              <h5 style={{ fontSize:'0.75rem', color:'rgba(158, 165, 196,0.35)', marginBottom:'8px' }}>{cat.displayName||cat.name}</h5>
                              <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                  <thead><tr><th style={thS}>Year</th>{(cat.labels||[]).map((lbl,li)=><th key={li} style={thS}>{lbl}</th>)}</tr></thead>
                                  <tbody>
                                    {Object.values(cat.statistics||{}).slice(0,5).map((row,ri)=>(
                                      <tr key={ri}><td style={tdS}>{row.season?.year||'--'}</td>{(row.stats||[]).map((val,vi)=><td key={vi} style={tdS}>{val}</td>)}</tr>
                                    ))}
                                    {cat.totals?.length>0&&(
                                      <tr style={{ borderTop:'1px solid rgba(100,120,200,0.2)' }}>
                                        <td style={{ ...tdS, color:'var(--color-cyan)', fontWeight:'700' }}>Career</td>
                                        {cat.totals.map((val,vi)=><td key={vi} style={{ ...tdS, fontWeight:'600' }}>{val}</td>)}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem', marginTop:'14px' }}>No stats available.</p>}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && !error && !results.length && (
        <div className="sh-no-games" style={{ marginTop:'30px' }}>
          <p>Search for a player to see their profile and stats.</p>
        </div>
      )}
    </div>
  );
};

/* ── Standings Panel ─────────────────────────────────────────── */
const StandingsPanel = ({ sport }) => {
  const [groups, setGroups]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const isNHL = sport==='nhl';

  useEffect(() => {
    setLoading(true); setError(null);
    fetchStandings(sport).then(raw=>setGroups(normalizeStandings(raw))).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Standings unavailable: {error}</div>;
  if (!groups?.length) return <div className="sh-empty">No standings data available.</div>;

  return (
    <div className="sh-standings-wrap">
      {groups.map((g,gi)=>(
        <div key={gi} className="sh-standings-group">
          <h3 className="sh-division-title">{g.label}</h3>
          <div className="sh-table">
            <div className="sh-table-header">
              <span className="sh-col-team">Team</span>
              <span className="sh-col-num">W</span><span className="sh-col-num">L</span>
              {isNHL&&<><span className="sh-col-num">OTL</span><span className="sh-col-num">PTS</span></>}
              <span className="sh-col-num hide-xs">PCT</span>
              <span className="sh-col-num hide-sm">GB</span>
              <span className="sh-col-num hide-md">HOME</span>
              <span className="sh-col-num hide-md">AWAY</span>
              <span className="sh-col-num hide-sm">STRK</span>
            </div>
            {g.entries.map((t,i)=>(
              <div key={i} className={`sh-table-row ${i===0?'leader':''}`}>
                <span className="sh-col-team">
                  <span className="sh-rank">{i+1}</span>
                  {t.logo?<img src={t.logo} alt={t.team} className="sh-stand-logo" />:<span className="sh-stand-logo-ph">{t.team[0]}</span>}
                  <span className="sh-stand-abbr">{t.team}</span>
                  <span className="sh-stand-name">{t.name}</span>
                </span>
                <span className="sh-col-num">{t.wins}</span><span className="sh-col-num">{t.losses}</span>
                {isNHL&&<><span className="sh-col-num">{t.otl??'--'}</span><span className="sh-col-num">{t.pts??'--'}</span></>}
                <span className="sh-col-num hide-xs">{t.pct}</span>
                <span className="sh-col-num hide-sm">{t.gb}</span>
                <span className="sh-col-num hide-md">{t.home||'--'}</span>
                <span className="sh-col-num hide-md">{t.away||'--'}</span>
                <span className="sh-col-num hide-sm">{t.streak}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── News Panel ──────────────────────────────────────────────── */
const NewsPanel = ({ sport }) => {
  const [articles, setArticles] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchNews(sport).then(raw=>setArticles(normalizeNews(raw))).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load news: {error}</div>;
  if (!articles?.length) return <div className="sh-empty">No news available right now.</div>;

  return (
    <div className="sh-news-grid">
      {articles.map(a => a.link ? (
        <a key={a.id} href={a.link} target="_blank" rel="noreferrer" className="sh-news-card">
          {a.image && <img src={a.image} alt="" className="sh-news-img" loading="lazy" />}
          <div className="sh-news-body">
            <h4 className="sh-news-headline">{a.headline}</h4>
            {a.description && <p className="sh-news-desc">{a.description}</p>}
            <span className="sh-news-meta">{a.byline&&<>{a.byline} - </>}{timeSince(a.published)}</span>
          </div>
        </a>
      ) : (
        <div key={a.id} className="sh-news-card no-link">
          {a.image && <img src={a.image} alt="" className="sh-news-img" loading="lazy" />}
          <div className="sh-news-body">
            <h4 className="sh-news-headline">{a.headline}</h4>
            {a.description && <p className="sh-news-desc">{a.description}</p>}
            <span className="sh-news-meta">{timeSince(a.published)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Main SportsHub ──────────────────────────────────────────── */
const SportsHub = ({ initialSport }) => {
  const [activeSport, setActiveSport] = useState(() => {
    const valid = ['mlb','nfl','nba','nhl','cfb','cbb','milb_aaa','milb_aa','milb_highA','milb_singleA'];
    return (initialSport && valid.includes(initialSport)) ? initialSport : 'mlb';
  });
  const [activeTab,   setActiveTab]   = useState('scores');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const iv = setInterval(()=>{ setLastUpdated(new Date()); setRefreshKey(k=>k+1); }, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleSportChange = (id) => {
    setActiveSport(id);
    setActiveTab('scores');
    setSelectedGame(null);
    // Update URL so users can share direct sport links (e.g. #sports/nfl)
    const next = '#sports/' + id;
    if (window.location.hash !== next) window.location.hash = next;
  };
  const handleTabChange   = (id) => { setActiveTab(id); setSelectedGame(null); };

  return (
    <div className="page sh-page">
      <div className="page-header sh-header">
        <h1 className="gradient-text">Sports Hub</h1>
        <p className="subtitle">
          {isMiLB(activeSport)?'MLB Stats API':'ESPN'}
          {' '}-{' '}Live scores - Standings - News - {' '}
          <span className="sh-updated">{lastUpdated.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span>
        </p>
      </div>

      <div className="sh-sport-tabs">
        {SPORTS.map(s=>(
          <button key={s.id} className={`sh-sport-tab ${activeSport===s.id?'active':''}`} onClick={()=>handleSportChange(s.id)}>
            <span className="sh-sport-label">{s.label}</span>
          </button>
        ))}
      </div>

      {activeTab==='scores' && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'8px 0 4px', flexWrap:'wrap' }}>
          <button className="neon-button" style={{ padding:'5px 12px' }} onClick={()=>{
            const base=selectedDate?new Date(selectedDate+'T12:00:00'):new Date(); base.setDate(base.getDate()-1);
            setSelectedDate(`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`); setRefreshKey(k=>k+1);
          }}>Prev</button>
          <span style={{ color:'var(--color-cyan)', fontWeight:700, minWidth:'110px', textAlign:'center', fontSize:'0.88rem' }}>
            {selectedDate ? new Date(selectedDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : 'Today'}
          </span>
          <button className="neon-button" style={{ padding:'5px 12px' }} onClick={()=>{
            const base=selectedDate?new Date(selectedDate+'T12:00:00'):new Date(); base.setDate(base.getDate()+1);
            setSelectedDate(`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`); setRefreshKey(k=>k+1);
          }}>Next</button>
          {selectedDate && <button className="neon-button" style={{ padding:'5px 12px', fontSize:'0.8rem' }} onClick={()=>{setSelectedDate('');setRefreshKey(k=>k+1);}}>Today</button>}
          <input type="date" value={selectedDate} onChange={e=>{setSelectedDate(e.target.value);setRefreshKey(k=>k+1);}}
            style={{ padding:'5px 8px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.2)', color:'#e2e5f0', borderRadius:'6px', fontSize:'0.82rem' }} />
        </div>
      )}

      <div className="sh-sub-tabs">
        {(isMiLB(activeSport)?SUB_TABS.filter(t=>t.id==='scores'):SUB_TABS).map(t=>(
          <button key={t.id} className={`sh-sub-tab ${activeTab===t.id?'active':''}`} onClick={()=>handleTabChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="sh-content">
        {selectedGame ? (
          <GameDetailView game={selectedGame} sport={activeSport} onBack={()=>setSelectedGame(null)} />
        ) : (
          <>
            {activeTab==='scores' && isMiLB(activeSport) && <MiLBScoresPanel key={`${activeSport}-milb-${selectedDate}`} sport={activeSport} refreshKey={refreshKey} selectedDate={selectedDate} />}
            {activeTab==='scores' && !isMiLB(activeSport) && <ScoresPanel key={`${activeSport}-scores-${selectedDate}`} sport={activeSport} refreshKey={refreshKey} onSelectGame={setSelectedGame} selectedDate={selectedDate} />}
            {activeTab==='standings' && <StandingsPanel key={`${activeSport}-standings`} sport={activeSport} />}
            {activeTab==='news'      && <NewsPanel key={`${activeSport}-news`} sport={activeSport} />}
            {activeTab==='players'   && <PlayerSearchPanel key={`${activeSport}-players`} sport={activeSport} />}
          </>
        )}
      </div>
    </div>
  );
};

export default SportsHub;
