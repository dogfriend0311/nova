import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchScoreboard, fetchStandings, fetchNews, fetchGameSummary,
  fetchAllAthletes, fetchAthleteProfile, fetchAthleteStats,
  normalizeGame, normalizeStandings, normalizeNews, normalizeGameSummary,
  fetchMiLBScoreboard, normalizeMiLBGame, fetchMiLBGameDetail,
  fetchSearch, normalizeSearchResults,
  fetchLeaders, normalizeLeaders,
  fetchEventOdds, fetchEventPredictor, fetchEventSituation,
} from '../../services/sportsDataService';
import './SportsHub.css';
import PlayByPlay from './PlayByPlay';
import WinProbabilityChart from './WinProbabilityChart';
import GameChat from './GameChat';
import PlayerOfGame from './PlayerOfGame';
import InjuryReport from './InjuryReport';
import AroundLeagueDigest from './AroundLeagueDigest';
import OnThisDaySports from './OnThisDaySports';
import AllStarVoting from './AllStarVoting';
import { ScoresGridSkeleton, StandingsSkeleton, NewsGridSkeleton } from '../Skeleton';
import { getCurrentUsername, isGameStarred, addFavGame as addFavGameLS, removeFavGameByGameId } from '../../services/favGamesStorage';
import { getMyFavTeamAbbrs, toEspnAbbr } from '../../services/favTeamsService';
import { Flame, Snowflake } from 'lucide-react';

const SPORTS = [
  { id:'mlb',          label:'MLB',              icon:'⚾' },
  { id:'nfl',          label:'NFL',              icon:'🏈' },
  { id:'nba',          label:'NBA',              icon:'🏀' },
  { id:'nhl',          label:'NHL',              icon:'🏒' },
  { id:'cfb',          label:'College Football', icon:'🏈' },
  { id:'cbb',          label:'College Baseball', icon:'⚾' },
  { id:'milb_aaa',     label:'Triple-A',         icon:'⚾' },
  { id:'milb_aa',      label:'Double-A',         icon:'⚾' },
  { id:'milb_highA',   label:'High-A',           icon:'⚾' },
  { id:'milb_singleA', label:'Single-A',         icon:'⚾' },
];

const LAST_SPORT_KEY = 'nova_last_sport';

const isMiLB = (sport) => sport.startsWith('milb_');

const SUB_TABS = [
  { id:'scores',    label:'Scores'    },
  { id:'standings', label:'Standings' },
  { id:'news',      label:'News'      },
  { id:'players',   label:'Players'   },
  { id:'leaders',   label:'Leaders'   },
  { id:'search',    label:'Search'    },
  { id:'injuries',  label:'Injuries'  },
  { id:'onthisday', label:'On This Day' },
  { id:'allstar',   label:'All-Star Voting' },
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
// Cached per gamePk in-memory (module scope) so replaying the same
// game's highlights within a session doesn't refetch statsapi.mlb.com,
// plus a sessionStorage layer so it survives a tab-switch/remount.
const highlightsMemCache = new Map();
const highlightsCacheKey = (gamePk) => `nova_highlights_cache_${gamePk}`;

const HighlightsPanel = ({ gamePk }) => {
  const [clips, setClips]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [playing, setPlaying] = useState(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!gamePk) return;

    if (highlightsMemCache.has(gamePk)) {
      setClips(highlightsMemCache.get(gamePk));
      setLoading(false);
      setError(null);
      return;
    }
    try {
      const cached = sessionStorage.getItem(highlightsCacheKey(gamePk));
      if (cached) {
        const parsedCache = JSON.parse(cached);
        highlightsMemCache.set(gamePk, parsedCache);
        setClips(parsedCache);
        setLoading(false);
        setError(null);
        return;
      }
    } catch { /* sessionStorage unavailable or corrupt — fall through to fetch */ }

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
        highlightsMemCache.set(gamePk, parsed);
        try { sessionStorage.setItem(highlightsCacheKey(gamePk), JSON.stringify(parsed)); } catch { /* storage full/unavailable — non-fatal */ }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [gamePk]);

  // Reset the "video failed mid-playback" flag whenever a new clip starts playing.
  useEffect(() => { setVideoError(false); }, [playing]);

  // Close the video modal on Escape, in addition to the existing outer-click handler.
  useEffect(() => {
    if (!playing) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setPlaying(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playing]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load highlights: {error}</div>;
  if (!clips.length) return <div className="sh-empty">No highlights available for this game yet.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {playing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setPlaying(null)}>
          <div style={{ maxWidth:'900px', width:'100%' }} onClick={e => e.stopPropagation()}>
            {videoError ? (
              <div style={{ width:'100%', aspectRatio:'16/9', borderRadius:'10px', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(158, 165, 196,0.6)', fontSize:'0.9rem', textAlign:'center', padding:'20px' }}>
                This clip couldn't be played right now. It may have expired or moved.
              </div>
            ) : (
              <video src={playing.videoUrl} controls autoPlay style={{ width:'100%', borderRadius:'10px', background:'#000' }} onError={() => setVideoError(true)} />
            )}
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

  const getStarred = () => isGameStarred(getCurrentUsername(), game.id);
  // Lazy-init only runs once per mount (React never re-invokes the useState
  // initializer on re-render), so this doesn't re-parse localStorage on every
  // render — no extra memoization needed here.
  const [starred, setStarred] = useState(getStarred);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleStarClick = (e) => {
    e.stopPropagation();
    const username = getCurrentUsername();
    if (!username) return;
    if (starred) {
      removeFavGameByGameId(username, game.id);
      setStarred(false);
    } else {
      setShowNote(true);
    }
  };

  const confirmStar = (e) => {
    e.stopPropagation();
    const username = getCurrentUsername();
    if (!username) return;
    addFavGameLS(username, {
      id: Date.now().toString(), gameId: game.id,
      text: `${game.awayTeam?.abbr || ''} vs ${game.homeTeam?.abbr || ''}`,
      note: noteText, date: new Date().toLocaleDateString(),
    });
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
  const [myTeamAbbrs, setMyTeamAbbrs] = useState([]);
  const [myTeamsOnly, setMyTeamsOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchScoreboard(sport, selectedDate || undefined);
      setGames((data.events || []).map(normalizeGame).filter(Boolean));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [sport, selectedDate]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // "My Teams" quick filter — pulls the abbreviations the member picked
  // for this sport on their Nova profile (MemberProfile's TeamSelector).
  useEffect(() => {
    const username = getCurrentUsername();
    if (!username) { setMyTeamAbbrs([]); return; }
    getMyFavTeamAbbrs(username, sport).then(abbrs => {
      setMyTeamAbbrs((abbrs || []).map(a => toEspnAbbr(sport, a)));
    });
  }, [sport]);

  if (loading) return <ScoresGridSkeleton />;
  if (error)   return <div className="sh-error">Could not load scores: {error}</div>;

  const applyMyTeams = (list) => (myTeamsOnly && myTeamAbbrs.length)
    ? list.filter(g => myTeamAbbrs.includes(g.homeTeam.abbr) || myTeamAbbrs.includes(g.awayTeam.abbr))
    : list;

  const allFinal   = games.filter(g=>g.status==='post');
  const live       = applyMyTeams(games.filter(g=>g.status==='in'));
  const final      = applyMyTeams(allFinal);
  const scheduled  = applyMyTeams(games.filter(g=>g.status==='pre'));

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
      {myTeamAbbrs.length > 0 && (
        <button
          className={`sh-mytab-toggle ${myTeamsOnly ? 'active' : ''}`}
          onClick={() => setMyTeamsOnly(v => !v)}
        >
          ⭐ My Teams {myTeamsOnly ? '✓' : ''}
        </button>
      )}
      {!myTeamsOnly && <AroundLeagueDigest sport={sport} finals={allFinal} onSelectGame={onSelectGame} />}
      {myTeamsOnly && !live.length && !final.length && !scheduled.length && (
        <div className="sh-empty">None of your favorite teams are playing right now.</div>
      )}
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

  if (loading) return <ScoresGridSkeleton />;
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

/* ── Odds & Predictor Panel ──────────────────────────────────────
   Pulls from ESPN's Core API (sports.core.api.espn.com): betting odds
   from whichever providers ESPN has for the game, ESPN's own win-probability
   predictor, and — for live games only — the current situation (down &
   distance, balls/strikes/outs, etc., whatever the sport provides). Any
   piece that ESPN doesn't have for this particular game is just omitted
   rather than shown as an error, since coverage varies a lot by sport
   and by how far out the game is. */
const OddsPredictorPanel = ({ sport, game }) => {
  const [odds, setOdds]           = useState(null);
  const [predictor, setPredictor] = useState(null);
  const [situation, setSituation] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetchEventOdds(sport, game.id),
      fetchEventPredictor(sport, game.id),
      game.status === 'in' ? fetchEventSituation(sport, game.id) : Promise.reject(),
    ]).then(([oddsRes, predRes, sitRes]) => {
      setOdds(oddsRes.status === 'fulfilled' ? (oddsRes.value?.items || []) : []);
      setPredictor(predRes.status === 'fulfilled' ? predRes.value : null);
      setSituation(sitRes?.status === 'fulfilled' ? sitRes.value : null);
    }).finally(() => setLoading(false));
  }, [sport, game.id, game.status]);

  if (loading) return <div className="sh-loading" style={{ marginTop:'30px' }}><div className="sh-spinner" /></div>;

  const homePct = predictor?.homeTeamPredictedWinPct ?? predictor?.homeTeam?.gameProjection;
  const awayPct = predictor?.awayTeamPredictedWinPct ?? predictor?.awayTeam?.gameProjection;
  const hasAnything = odds?.length || homePct != null || situation;

  if (!hasAnything) return (
    <div className="sh-empty" style={{ marginTop:'20px' }}>No odds or predictor data available for this game.</div>
  );

  return (
    <div style={{ marginTop:'10px' }}>
      {situation && (
        <div className="sh-detail-section">
          <h3 className="sh-detail-section-title">Current Situation</h3>
          <p style={{ color:'var(--color-cyan)', fontSize:'0.95rem', fontWeight:600 }}>
            {situation.shortDownDistanceText || situation.downDistanceText || situation.lastPlay?.text || 'Live — no situational detail available.'}
          </p>
        </div>
      )}
      {homePct != null && (
        <div className="sh-detail-section">
          <h3 className="sh-detail-section-title">ESPN Predictor</h3>
          <div style={{ display:'flex', gap:'18px', alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'0.78rem', color:'rgba(158, 165, 196,0.5)', marginBottom:'4px' }}>{game.awayTeam.abbr}</div>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--color-cyan)' }}>{Math.round(awayPct)}%</div>
            </div>
            <div style={{ flex:1, textAlign:'right' }}>
              <div style={{ fontSize:'0.78rem', color:'rgba(158, 165, 196,0.5)', marginBottom:'4px' }}>{game.homeTeam.abbr}</div>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--color-cyan)' }}>{Math.round(homePct)}%</div>
            </div>
          </div>
        </div>
      )}
      {odds?.length > 0 && (
        <div className="sh-detail-section">
          <h3 className="sh-detail-section-title">Odds</h3>
          <div style={{ display:'grid', gap:'10px' }}>
            {odds.slice(0, 4).map((o, i) => (
              <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(100,120,200,0.12)', borderRadius:'8px' }}>
                <div style={{ fontSize:'0.72rem', color:'rgba(158, 165, 196,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>{o.provider?.name || 'Odds'}</div>
                <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', fontSize:'0.85rem', color:'rgba(158, 165, 196,0.85)' }}>
                  {o.details && <span>{o.details}</span>}
                  {o.overUnder != null && <span>O/U {o.overUnder}</span>}
                  {o.awayTeamOdds?.moneyLine != null && <span>{game.awayTeam.abbr} ML {o.awayTeamOdds.moneyLine}</span>}
                  {o.homeTeamOdds?.moneyLine != null && <span>{game.homeTeam.abbr} ML {o.homeTeamOdds.moneyLine}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
      <div style={{ display:'flex', gap:'6px', margin:'18px 0', borderBottom:'1px solid rgba(100,120,200,0.18)', paddingBottom:'12px', flexWrap:'wrap' }}>
        {[
          { id:'boxscore',   label:'Box Score' },
          ...(isMLB ? [{ id:'highlights', label:'Highlights' }] : []),
          { id:'winprob',    label:'Win Probability' },
          { id:'odds',       label:'Odds & Predictor' },
          { id:'potg',       label:'Player of the Game' },
          { id:'chat',       label:'Watch Party' },
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

      {detailTab === 'winprob' && (
        <WinProbabilityChart
          sport={sport}
          eventId={game.id}
          homeAbbr={game.homeTeam.abbr}
          awayAbbr={game.awayTeam.abbr}
          isFinal={game.status === 'post'}
        />
      )}

      {detailTab === 'odds' && (
        <OddsPredictorPanel sport={sport} game={game} />
      )}

      {detailTab === 'potg' && (
        <PlayerOfGame
          sport={sport}
          gameId={game.id}
          homeAbbr={game.homeTeam.abbr}
          awayAbbr={game.awayTeam.abbr}
        />
      )}

      {detailTab === 'chat' && (
        <GameChat sport={sport} gameId={game.id} isLive={game.status === 'in'} />
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

/* ── Leaders Panel (richer schema) ──────────────────────────────
   ESPN's site API v3 leaders endpoint — statistical leaders across all
   the categories ESPN tracks for the sport (passing, home runs, points,
   etc.), each with the leading players already embedded (no extra
   per-athlete fetches needed). */
const LeadersPanel = ({ sport }) => {
  const [categories, setCategories] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchLeaders(sport)
      .then(raw => setCategories(normalizeLeaders(raw)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Leaders unavailable: {error}</div>;
  if (!categories?.length) return <div className="sh-empty">No leader data available for this sport right now.</div>;

  return (
    <div className="sh-scores-wrap">
      {categories.map(cat => (
        <div key={cat.name} style={{ marginBottom:'22px' }}>
          <h3 className="sh-section-title">{cat.displayName}</h3>
          <div style={{ display:'grid', gap:'8px' }}>
            {cat.leaders.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(100,120,200,0.12)', borderRadius:'8px' }}>
                <span style={{ width:'20px', textAlign:'center', color:'rgba(158, 165, 196,0.4)', fontSize:'0.8rem', fontWeight:700 }}>{i+1}</span>
                {l.athletePhoto && <img src={l.athletePhoto} alt={l.athleteName} style={{ width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover' }} />}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'rgba(158, 165, 196,0.92)', fontSize:'0.85rem', fontWeight:600 }}>{l.athleteName} {l.teamAbbr && <span style={{ color:'rgba(158, 165, 196,0.4)', fontWeight:400 }}>· {l.teamAbbr}</span>}</div>
                </div>
                <span style={{ color:'var(--color-cyan)', fontWeight:700, fontSize:'0.85rem', whiteSpace:'nowrap' }}>{l.displayValue}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Search Panel ─────────────────────────────────────────────── */
const SearchPanel = ({ sport }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault(); if (!query.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const raw = await fetchSearch(query.trim(), sport);
      setResults(normalizeSearchResults(raw));
    } catch { setError('Search failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="sh-players-panel">
      <div className="sh-players-header">
        <h3 className="gradient-text-cyan">Search ESPN</h3>
        <p style={{ color:'rgba(158, 165, 196,0.5)', fontSize:'0.85rem', marginTop:'6px' }}>Find players, teams, and events across ESPN's coverage.</p>
      </div>
      <form className="sh-search-form" onSubmit={handleSearch}>
        <input className="sh-search-input" type="text" placeholder="Search players, teams, events..." value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="neon-button sh-search-btn" type="submit" disabled={loading}>{loading?'Searching...':'Search'}</button>
      </form>
      {error && <div className="sh-error" style={{ marginTop:'14px' }}>{error}</div>}
      {results && results.length === 0 && !error && (
        <div className="sh-no-games" style={{ marginTop:'30px' }}><p>No results found. Try a different search term.</p></div>
      )}
      {results && results.length > 0 && (
        <div className="sh-search-results">
          <p style={{ fontSize:'0.78rem', color:'rgba(158, 165, 196,0.4)', marginBottom:'10px' }}>{results.length} result{results.length!==1?'s':''} found</p>
          {results.map((r, i) => {
            const Wrapper = r.link ? 'a' : 'div';
            const wrapperProps = r.link ? { href:r.link, target:'_blank', rel:'noreferrer' } : {};
            return (
              <Wrapper key={r.id || i} {...wrapperProps} className="sh-athlete-btn" style={{ textDecoration:'none', marginBottom:'8px' }}>
                <div className="sh-athlete-left">
                  {r.image ? <img src={r.image} alt={r.name} className="sh-athlete-photo" onError={e=>{e.target.style.display='none';}} /> : <span className="sh-team-logo-placeholder">?</span>}
                  <div className="sh-athlete-info">
                    <span className="sh-athlete-name">{r.name}</span>
                    <span className="sh-athlete-meta">{[r.type, r.subtitle].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
      {!loading && !results && !error && (
        <div className="sh-no-games" style={{ marginTop:'30px' }}><p>Search for a player, team, or event to get started.</p></div>
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

/* ── Streak Badge (hot/cold indicator next to a team's streak) ──
   ESPN's streak displayValue is a short code like "W3" or "L2". A
   streak of 3+ in either direction gets a flame/snowflake badge. */
const StreakIcon = ({ streak }) => {
  const m = /^([WL])\s*(\d+)/i.exec(streak || '');
  if (!m) return null;
  const [, dir, lenStr] = m;
  const len = +lenStr;
  if (len < 3) return null;
  return dir.toUpperCase() === 'W'
    ? <Flame size={13} color="#ff9e57" style={{ marginLeft: 4, verticalAlign: '-2px' }} title={`${len}-game winning streak`} />
    : <Snowflake size={13} color="#5ec8ff" style={{ marginLeft: 4, verticalAlign: '-2px' }} title={`${len}-game losing streak`} />;
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

  if (loading) return <StandingsSkeleton />;
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
                <span className="sh-col-num hide-sm sh-streak-cell">
                  {t.streak}
                  <StreakIcon streak={t.streak} />
                </span>
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

  if (loading) return <NewsGridSkeleton />;
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
    if (initialSport && valid.includes(initialSport)) return initialSport;
    // Fall back to whatever sport the user last viewed (beyond just the URL
    // hash), so a user who always checks e.g. NFL isn't dropped back to MLB.
    const lastSport = localStorage.getItem(LAST_SPORT_KEY);
    if (lastSport && valid.includes(lastSport)) return lastSport;
    return 'mlb';
  });
  const [activeTab,   setActiveTab]   = useState('scores');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);

  // Only poll the scoreboard while the user is actually looking at Scores
  // (not Standings/News/Players), and pause entirely while the browser tab
  // is backgrounded, to avoid wasted requests/battery.
  useEffect(() => {
    if (activeTab !== 'scores') return;
    let iv = null;
    const tick = () => { setLastUpdated(new Date()); setRefreshKey(k => k + 1); };
    const start = () => { if (!iv) iv = setInterval(tick, 30000); };
    const stop  = () => { if (iv) { clearInterval(iv); iv = null; } };

    if (document.visibilityState === 'visible') start();
    const onVisibility = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [activeTab]);

  const handleSportChange = (id) => {
    setActiveSport(id);
    setActiveTab('scores');
    setSelectedGame(null);
    localStorage.setItem(LAST_SPORT_KEY, id);
    // Update URL so users can share direct sport links (e.g. #sports/nfl)
    const next = '#sports/' + id;
    if (window.location.hash !== next) window.location.hash = next;
  };
  const handleTabChange   = (id) => { setActiveTab(id); setSelectedGame(null); };

  const stepDate = useCallback((deltaDays) => {
    setSelectedDate(prevDate => {
      const base = prevDate ? new Date(prevDate + 'T12:00:00') : new Date();
      base.setDate(base.getDate() + deltaDays);
      return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    });
    setRefreshKey(k => k + 1);
  }, []);

  // Arrow-key date stepping while on the Scores tab (cheap a11y win) — only
  // fires when focus isn't inside a text input/date field.
  useEffect(() => {
    if (activeTab !== 'scores') return;
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  stepDate(-1);
      if (e.key === 'ArrowRight') stepDate(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, stepDate]);

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
            <span className="sh-sport-icon" aria-hidden="true">{s.icon}</span>
            <span className="sh-sport-label">{s.label}</span>
          </button>
        ))}
      </div>

      {activeTab==='scores' && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'8px 0 4px', flexWrap:'wrap' }}>
          <button className="neon-button" style={{ padding:'5px 12px' }} onClick={()=>stepDate(-1)} title="Previous day (or press ←)">Prev</button>
          <span style={{ color:'var(--color-cyan)', fontWeight:700, minWidth:'110px', textAlign:'center', fontSize:'0.88rem' }}>
            {selectedDate ? new Date(selectedDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : 'Today'}
          </span>
          <button className="neon-button" style={{ padding:'5px 12px' }} onClick={()=>stepDate(1)} title="Next day (or press →)">Next</button>
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
            {/* Note: key intentionally omits selectedDate — ScoresPanel/MiLBScoresPanel
                already refetch internally when selectedDate changes (see their own
                useEffect deps). Remounting on every date click was resetting scroll
                position for anyone flipping through several days of scores. */}
            {activeTab==='scores' && isMiLB(activeSport) && <MiLBScoresPanel key={`${activeSport}-milb`} sport={activeSport} refreshKey={refreshKey} selectedDate={selectedDate} />}
            {activeTab==='scores' && !isMiLB(activeSport) && <ScoresPanel key={`${activeSport}-scores`} sport={activeSport} refreshKey={refreshKey} onSelectGame={setSelectedGame} selectedDate={selectedDate} />}
            {activeTab==='standings' && <StandingsPanel key={`${activeSport}-standings`} sport={activeSport} />}
            {activeTab==='news'      && <NewsPanel key={`${activeSport}-news`} sport={activeSport} />}
            {activeTab==='players'   && <PlayerSearchPanel key={`${activeSport}-players`} sport={activeSport} />}
            {activeTab==='leaders'  && <LeadersPanel key={`${activeSport}-leaders`} sport={activeSport} />}
            {activeTab==='search'   && <SearchPanel key={`${activeSport}-search`} sport={activeSport} />}
            {activeTab==='injuries' && <InjuryReport key={`${activeSport}-injuries`} sport={activeSport} />}
            {activeTab==='onthisday' && <OnThisDaySports key={`${activeSport}-otd`} sport={activeSport} onSelectGame={setSelectedGame} />}
            {activeTab==='allstar' && <AllStarVoting key={`${activeSport}-allstar`} sport={activeSport} />}
          </>
        )}
      </div>
    </div>
  );
};

export default SportsHub;
