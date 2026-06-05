/**
 * PlayByPlay.jsx — complete rewrite of state detection + display
 *
 * KEY FIXES vs previous version:
 * 1. Game state (live / final / preview / postponed) detected from
 *    multiple MLB-API fields so the right UI shows every time.
 * 2. "Current at-bat" section ONLY renders when there is an actual
 *    active batter (no more empty strike-zone / count grid).
 * 3. Final-game play log shows ALL plays (no 30-play cap), grouped
 *    by inning, with scoring plays highlighted.
 * 4. Postponed / cancelled / pre-game games show a clear message
 *    instead of an empty play log.
 * 5. Last-good-data ref prevents any blank screen on poll errors.
 * 6. Polling stops automatically when the game is final.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PlayByPlay.css';

const MLB_API = 'https://statsapi.mlb.com/api/v1';
const ESPN    = 'https://site.api.espn.com';

const ESPN_PATHS = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  nhl: 'hockey/nhl',
  cfb: 'football/college-football',
  cbb: 'baseball/college-baseball',
};

/* ── helpers ─────────────────────────────────────────────────── */
function mlbGameState(feed) {
  const abs = feed?.gameData?.status?.abstractGameState || '';
  const det = feed?.gameData?.status?.detailedState    || '';
  if (abs === 'Final')                         return 'final';
  if (abs === 'Live')                          return 'live';
  if (/postponed/i.test(det))                  return 'postponed';
  if (/cancelled|canceled/i.test(det))         return 'cancelled';
  if (/suspended/i.test(det))                  return 'suspended';
  return 'preview';
}

/* ── Strike Zone ─────────────────────────────────────────────── */
const StrikeZone = ({ pitches = [] }) => {
  const S = 180, ZX = 45, ZY = 30, ZW = 90, ZH = 110;
  const col = (r) => {
    if (!r) return '#888';
    if (r === 'Ball') return '#4488ff';
    if (r === 'Foul') return '#ffcc00';
    if (r === 'In Play') return '#00ff88';
    return '#ff4444';
  };
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="pbp-zone">
      <rect x={0} y={0} width={S} height={S} fill="rgba(0,0,20,0.85)" rx={6}/>
      <rect x={22} y={16} width={136} height={138} fill="none" stroke="rgba(80,120,255,0.2)" strokeWidth={1} strokeDasharray="4 3" rx={3}/>
      <rect x={ZX} y={ZY} width={ZW} height={ZH} fill="rgba(0,255,255,0.04)" stroke="rgba(0,255,255,0.5)" strokeWidth={1.5}/>
      {[1,2].map(i=><line key={`v${i}`} x1={ZX+ZW*(i/3)} y1={ZY} x2={ZX+ZW*(i/3)} y2={ZY+ZH} stroke="rgba(0,255,255,0.15)" strokeWidth={0.7}/>)}
      {[1,2].map(i=><line key={`h${i}`} x1={ZX} y1={ZY+ZH*(i/3)} x2={ZX+ZW} y2={ZY+ZH*(i/3)} stroke="rgba(0,255,255,0.15)" strokeWidth={0.7}/>)}
      <polygon points={`${S/2-14},${S-12} ${S/2+14},${S-12} ${S/2+17},${S-6} ${S/2},${S-2} ${S/2-17},${S-6}`} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
      <text x={ZX-3} y={ZY+9} textAnchor="end" fill="rgba(100,150,255,0.45)" fontSize={7}>HH</text>
      <text x={ZX-3} y={ZY+ZH} textAnchor="end" fill="rgba(100,150,255,0.45)" fontSize={7}>KN</text>
      {pitches.map((p,i)=>{
        if (p.px==null||p.pz==null) return null;
        const cx = ZX+ZW/2+(p.px/1.5)*(ZW/2);
        const cy = ZY+ZH-((p.pz-1.5)/2.0)*ZH;
        const c  = col(p.result);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={8} fill={`${c}30`} stroke={c} strokeWidth={1.5}/>
            <text x={cx} y={cy+3.5} textAnchor="middle" fill={c} fontSize={7} fontWeight="bold">{i+1}</text>
          </g>
        );
      })}
    </svg>
  );
};

const Runners = ({ first, second, third }) => (
  <div className="pbp-runners">
    <div className={`pbp-base pbp-second ${second?'on':''}`}/>
    <div className="pbp-base-row">
      <div className={`pbp-base pbp-third ${third?'on':''}`}/>
      <div className="pbp-home-plate"/>
      <div className={`pbp-base pbp-first ${first?'on':''}`}/>
    </div>
  </div>
);

const Count = ({ balls, strikes, outs }) => (
  <div className="pbp-count">
    <div className="pbp-count-row">
      <span className="pbp-count-label">B</span>
      {[0,1,2,3].map(i=><div key={i} className={`pbp-dot ball ${i<balls?'on':''}`}/>)}
    </div>
    <div className="pbp-count-row">
      <span className="pbp-count-label">S</span>
      {[0,1,2].map(i=><div key={i} className={`pbp-dot strike ${i<strikes?'on':''}`}/>)}
    </div>
    <div className="pbp-count-row">
      <span className="pbp-count-label">O</span>
      {[0,1,2].map(i=><div key={i} className={`pbp-dot out ${i<outs?'on':''}`}/>)}
    </div>
  </div>
);

/* ── Status banner ───────────────────────────────────────────── */
const StatusBanner = ({ state, detail }) => {
  const cfg = {
    final:     { bg:'rgba(0,255,100,0.08)',  border:'rgba(0,255,100,0.25)',  color:'#00ff88', text:'✅ FINAL — Full game data' },
    postponed: { bg:'rgba(255,200,0,0.08)',  border:'rgba(255,200,0,0.3)',   color:'#ffcc00', text:`⏸ POSTPONED${detail ? ` — ${detail}` : ''}` },
    cancelled: { bg:'rgba(255,80,80,0.08)',  border:'rgba(255,80,80,0.3)',   color:'#ff8080', text:'❌ CANCELLED' },
    suspended: { bg:'rgba(255,200,0,0.08)',  border:'rgba(255,200,0,0.3)',   color:'#ffcc00', text:'⏸ SUSPENDED' },
  }[state];
  if (!cfg) return null;
  return (
    <div style={{ textAlign:'center', marginBottom:'12px', padding:'7px 16px', background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:'8px', color:cfg.color, fontSize:'0.83rem', fontWeight:700 }}>
      {cfg.text}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   BASEBALL — complete game log display
══════════════════════════════════════════════════════════════ */

/** Renders the full play log grouped by inning for completed games */
const FullGameLog = ({ plays, gd }) => {
  const [expandedPlay, setExpandedPlay] = useState(null);

  if (!plays || plays.length === 0) {
    return <p className="pbp-empty">No play data recorded for this game.</p>;
  }

  /* Group plays by inning */
  const innings = {};
  plays.forEach(ab => {
    const half = ab.about?.halfInning === 'top' ? 'Top' : 'Bot';
    const num  = ab.about?.inning ?? 0;
    const key  = `${num}-${half}`;
    if (!innings[key]) innings[key] = { num, half, plays: [] };
    innings[key].plays.push(ab);
  });

  const inningKeys = Object.keys(innings).sort((a,b) => {
    const [an,ah] = a.split('-'); const [bn] = b.split('-');
    return (+an - +bn) || (ah === 'Top' ? -1 : 1);
  });

  const HIT_EVENTS = new Set(['Single','Double','Triple','Home Run','Ground Rule Double']);

  return (
    <div className="pbp-log">
      <div className="pbp-section-label" style={{ marginBottom:'12px' }}>
        Complete Game Log — {plays.length} plate appearances
      </div>

      {inningKeys.map(key => {
        const inn  = innings[key];
        const half = inn.half === 'Top' ? '▲' : '▼';
        const hasRuns = inn.plays.some(ab => ab.result?.rbi > 0 || HIT_EVENTS.has(ab.result?.event));
        return (
          <div key={key} style={{ marginBottom:'18px' }}>
            {/* Inning header */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'6px 12px', background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.15)', borderRadius:'8px', marginBottom:'6px' }}>
              <span style={{ color:'var(--color-cyan)', fontWeight:800, fontSize:'0.85rem', minWidth:'55px' }}>
                {half} {inn.num}
              </span>
              <span style={{ fontSize:'0.75rem', color:'rgba(192,208,255,0.4)' }}>
                {inn.half} of {inn.num}{inn.num===1?'st':inn.num===2?'nd':inn.num===3?'rd':'th'} —&nbsp;
                {inn.plays.length} batter{inn.plays.length!==1?'s':''}
              </span>
              {hasRuns && <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#ffd700', fontWeight:700 }}>⚡ Scoring inning</span>}
            </div>

            {/* At-bats in this inning */}
            {inn.plays.map((ab, i) => {
              const res       = ab.result;
              const abPitches = (ab.playEvents||[]).filter(e=>e.isPitch);
              const lastPitch = abPitches[abPitches.length-1];
              const isHR      = res?.event === 'Home Run';
              const isHit     = HIT_EVENTS.has(res?.event);
              const isScoring = res?.rbi > 0;
              const isExpanded = expandedPlay === `${key}-${i}`;

              /* skip pure advisory / game status entries */
              if (!res?.event || res.event === 'Game Advisory') return null;

              return (
                <div key={i}
                  className={`pbp-ab-row ${isHR?'pbp-hr':isHit?'pbp-hit':''}`}
                  style={{ cursor: abPitches.length ? 'pointer' : 'default', borderLeft: isScoring ? '3px solid #ffd700' : undefined }}
                  onClick={() => setExpandedPlay(isExpanded ? null : `${key}-${i}`)}
                >
                  <div className="pbp-ab-header">
                    <span className="pbp-ab-batter" style={{ fontWeight: isHit ? 800 : 600 }}>
                      {ab.matchup?.batter?.fullName}
                    </span>
                    <span className="pbp-ab-result" style={{ color: isHR?'#ffd700':isHit?'#00ff88':'rgba(192,208,255,0.7)', fontWeight: isHit?800:600 }}>
                      {isHR && '💣 '}{res?.event}
                    </span>
                    {res?.rbi > 0 && (
                      <span style={{ color:'#ffd700', fontSize:'0.72rem', fontWeight:700 }}>
                        {res.rbi} RBI
                      </span>
                    )}
                    {abPitches.length > 0 && (
                      <span className="pbp-ab-pitches">{abPitches.length}p {isExpanded?'▲':'▼'}</span>
                    )}
                  </div>

                  {res?.description && (
                    <div className="pbp-ab-desc">{res.description}</div>
                  )}

                  {lastPitch?.hitData?.launchSpeed && (
                    <div className="pbp-ab-hitdata">
                      EV {lastPitch.hitData.launchSpeed.toFixed(0)} mph
                      {lastPitch.hitData.launchAngle ? ` · LA ${lastPitch.hitData.launchAngle.toFixed(0)}°` : ''}
                      {lastPitch.hitData.totalDistance ? ` · ${lastPitch.hitData.totalDistance.toFixed(0)} ft` : ''}
                    </div>
                  )}

                  {/* Expanded pitch log */}
                  {isExpanded && abPitches.length > 0 && (
                    <div style={{ marginTop:'12px', display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'flex-start' }}>
                      <div>
                        <div className="pbp-zone-label">Pitch Locations</div>
                        <StrikeZone pitches={abPitches.map(p=>({
                          px: p.pitchData?.coordinates?.pX,
                          pz: p.pitchData?.coordinates?.pZ,
                          result: p.details?.description||'',
                        }))} />
                      </div>
                      <div style={{ flex:1, minWidth:'160px' }}>
                        {abPitches.map((p, pi) => (
                          <div key={pi} style={{ display:'flex', gap:'8px', padding:'4px 0', borderBottom:'1px solid rgba(0,255,255,0.06)', fontSize:'0.78rem', alignItems:'center' }}>
                            <span style={{ color:'rgba(192,208,255,0.35)', minWidth:'18px' }}>#{pi+1}</span>
                            <span style={{ color:'var(--color-cyan)', minWidth:'80px' }}>{p.details?.type?.description||'—'}</span>
                            {p.pitchData?.startSpeed && <span style={{ color:'#ffd700' }}>{p.pitchData.startSpeed.toFixed(0)} mph</span>}
                            <span style={{ color:'rgba(192,208,255,0.7)' }}>{p.details?.description||'—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const BaseballPBP = ({ gamePk, game }) => {
  const [feed, setFeed]         = useState(null);
  const [gameState, setGameState] = useState('preview');
  const [error, setError]       = useState(null);
  const lastGoodRef = useRef(null);
  const intervalRef = useRef(null);
  const [resolvedPk, setResolvedPk] = useState(null);
  const [selectedPlay, setSelectedPlay] = useState(null);

  /* Resolve gamePk */
  useEffect(() => {
    const pk = String(gamePk || '');
    if (!pk) { setError('No game ID provided.'); return; }
    if (pk.length <= 7) { setResolvedPk(pk); return; }
    const tryDates = [0,-1,1,-2,2].map(offset => {
      const d = new Date(); d.setDate(d.getDate()+offset);
      return d.toISOString().slice(0,10);
    });
    (async () => {
      for (const date of tryDates) {
        try {
          const r = await fetch(`${MLB_API}/schedule?sportId=1&date=${date}&hydrate=team`);
          const data = await r.json();
          const games = data.dates?.[0]?.games || [];
          const match = game ? games.find(g =>
            g.teams?.home?.team?.name?.toLowerCase().includes((game.home_team||'').toLowerCase().split(' ').pop()) ||
            g.teams?.away?.team?.name?.toLowerCase().includes((game.away_team||'').toLowerCase().split(' ').pop())
          ) : null;
          const found = match || (games.length ? games[0] : null);
          if (found?.gamePk) { setResolvedPk(String(found.gamePk)); return; }
        } catch {}
      }
      setResolvedPk(pk);
    })();
  }, [gamePk, game]);

  const fetchFeed = useCallback(async () => {
    if (!resolvedPk) return;
    try {
      let r = await fetch(`${MLB_API}/game/${resolvedPk}/feed/live`);
      if (r.status === 404) r = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${resolvedPk}/feed/live`);
      if (!r.ok) throw new Error(`Feed unavailable (${r.status})`);
      const d = await r.json();
      lastGoodRef.current = d;
      const state = mlbGameState(d);
      setGameState(state);
      setFeed(d);
      setError(null);
      if (state === 'final' || state === 'postponed' || state === 'cancelled' || state === 'suspended') {
        clearInterval(intervalRef.current);
      }
    } catch (e) {
      if (lastGoodRef.current) { setFeed(lastGoodRef.current); setError(null); }
      else setError(e.message);
    }
  }, [resolvedPk]);

  useEffect(() => {
    if (!resolvedPk) return;
    fetchFeed();
    intervalRef.current = setInterval(fetchFeed, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchFeed, resolvedPk]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !feed)  return <div className="pbp-error">{error}<br/><small style={{color:'rgba(192,208,255,0.4)'}}>Data appears once the game starts.</small></div>;
  if (!resolvedPk)     return <div className="pbp-loading">Resolving game…</div>;
  if (!feed)           return <div className="pbp-loading">Loading play data…</div>;

  const ld      = feed.liveData;
  const gd      = feed.gameData;
  const ls      = ld?.linescore || {};
  const innings = ls.innings    || [];
  const allPlays = ld?.plays?.allPlays || [];

  /* current at-bat — only show when game is genuinely live */
  const cur     = gameState === 'live' ? ld?.plays?.currentPlay : null;
  const batter  = cur?.matchup?.batter;
  const pitcher = cur?.matchup?.pitcher;
  const count   = cur?.count || {};
  const events  = cur?.playEvents || [];
  const pitches = events.filter(e=>e.isPitch).map(e=>({
    px: e.pitchData?.coordinates?.pX,
    pz: e.pitchData?.coordinates?.pZ,
    mph: e.pitchData?.startSpeed?.toFixed(1),
    type: e.details?.type?.description||'',
    result: e.details?.description||'',
    exitVelo:    e.hitData?.launchSpeed?.toFixed(0),
    launchAngle: e.hitData?.launchAngle?.toFixed(0),
    distance:    e.hitData?.totalDistance?.toFixed(0),
  }));
  const runners = { first:!!ls.offense?.first, second:!!ls.offense?.second, third:!!ls.offense?.third };
  const inningLabel = ls.currentInning
    ? `${ls.inningHalf==='Top'?'▲':'▼'} ${ls.currentInning}`
    : '—';

  const awayAbbr = gd?.teams?.away?.abbreviation || game?.away_team || 'Away';
  const homeAbbr = gd?.teams?.home?.abbreviation || game?.home_team || 'Home';

  return (
    <div className="pbp-baseball">
      <StatusBanner state={gameState} detail={gd?.status?.detailedState} />

      {/* Scoreboard */}
      <div className="pbp-scoreboard">
        <div className="pbp-team">
          <span className="pbp-team-name">{awayAbbr}</span>
          <span className="pbp-score">{ls.teams?.away?.runs ?? game?.away_score ?? '—'}</span>
        </div>
        <div className="pbp-inning-info">
          <div className="pbp-inning">
            {gameState === 'final' ? 'FINAL' : gameState === 'preview' ? 'PREVIEW' : inningLabel}
          </div>
          {gameState === 'live' && (
            <div className="pbp-outs">{count.outs ?? ls.outs ?? 0} out{(count.outs ?? 1)!==1?'s':''}</div>
          )}
        </div>
        <div className="pbp-team">
          <span className="pbp-score">{ls.teams?.home?.runs ?? game?.home_score ?? '—'}</span>
          <span className="pbp-team-name">{homeAbbr}</span>
        </div>
      </div>

      {/* Linescore — only show if innings have actual data */}
      {innings.length > 0 && ls.teams?.away?.runs != null && (
        <div className="pbp-linescore-wrap">
          <table className="pbp-linescore">
            <thead>
              <tr>
                <th>Team</th>
                {innings.map((_,i)=><th key={i}>{i+1}</th>)}
                <th>R</th><th>H</th><th>E</th>
              </tr>
            </thead>
            <tbody>
              {['away','home'].map(side=>(
                <tr key={side}>
                  <td className="pbp-ls-team">{gd?.teams?.[side]?.abbreviation}</td>
                  {innings.map((inn,i)=>(
                    <td key={i}>{inn[side]?.runs ?? ''}</td>
                  ))}
                  <td className="pbp-ls-total">{ls.teams?.[side]?.runs ?? '—'}</td>
                  <td className="pbp-ls-total">{ls.teams?.[side]?.hits ?? '—'}</td>
                  <td className="pbp-ls-total">{ls.teams?.[side]?.errors ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Current at-bat — ONLY when live and there is an actual batter */}
      {gameState === 'live' && batter && pitcher && (
        <div className="pbp-current-ab">
          <div className="pbp-matchup">
            <div className="pbp-matchup-side">
              <div className="pbp-player-role">Batting</div>
              <a href={`https://www.mlb.com/player/${batter.id}`} target="_blank" rel="noopener noreferrer" className="pbp-player-name pbp-player-link">{batter.fullName}</a>
              <div className="pbp-player-sub">{cur?.matchup?.batSide?.description}</div>
            </div>
            <div className="pbp-matchup-vs">VS</div>
            <div className="pbp-matchup-side right">
              <div className="pbp-player-role">Pitching</div>
              <a href={`https://www.mlb.com/player/${pitcher.id}`} target="_blank" rel="noopener noreferrer" className="pbp-player-name pbp-player-link">{pitcher.fullName}</a>
              <div className="pbp-player-sub">{cur?.matchup?.pitchHand?.description}</div>
            </div>
          </div>
          <div className="pbp-live-row">
            <div className="pbp-zone-wrap">
              <div className="pbp-zone-label">Strike Zone</div>
              <StrikeZone pitches={pitches}/>
              <div className="pbp-zone-legend">
                {[['#4488ff','Ball'],['#ff4444','Strike'],['#ffcc00','Foul'],['#00ff88','In Play']].map(([c,l])=>(
                  <span key={l} style={{color:c,fontSize:'0.72rem',marginRight:'8px'}}>● {l}</span>
                ))}
              </div>
            </div>
            <div className="pbp-state">
              <Count balls={count.balls} strikes={count.strikes} outs={ls.outs??0}/>
              <Runners first={runners.first} second={runners.second} third={runners.third}/>
            </div>
          </div>
          {pitches.length > 0 && (
            <div className="pbp-pitch-list">
              <div className="pbp-section-label">Current At-Bat Pitches</div>
              {pitches.map((p,i)=>(
                <div key={i} className={`pbp-pitch-row pbp-result-${p.result?.replace(/\s+/g,'-').toLowerCase()}`}>
                  <span className="pbp-pitch-num">#{i+1}</span>
                  <span className="pbp-pitch-type">{p.type}</span>
                  {p.mph&&<span className="pbp-pitch-mph">{p.mph} mph</span>}
                  <span className="pbp-pitch-result">{p.result}</span>
                  {p.exitVelo&&<span className="pbp-pitch-exit">EV {p.exitVelo} mph</span>}
                  {p.launchAngle&&<span className="pbp-pitch-angle">LA {p.launchAngle}°</span>}
                  {p.distance&&<span className="pbp-pitch-dist">{p.distance} ft</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PLAY LOG ── */}
      {gameState === 'final' ? (
        /* Final: show ALL plays grouped by inning */
        <FullGameLog plays={allPlays} gd={gd} />
      ) : gameState === 'live' ? (
        /* Live: recent plays reversed */
        <div className="pbp-log">
          <div className="pbp-section-label">Play Log</div>
          {[...allPlays].reverse().slice(0,40).map((ab,i)=>{
            const res   = ab.result;
            const about = ab.about;
            const abPitches = (ab.playEvents||[]).filter(e=>e.isPitch);
            if (!res?.event || res.event==='Game Advisory') return null;
            const inning = about ? `${about.halfInning==='top'?'▲':'▼'}${about.inning}` : '';
            const isHit  = ['Single','Double','Triple','Home Run','Ground Rule Double'].includes(res?.event);
            const isHR   = res?.event === 'Home Run';
            return (
              <div key={i} className={`pbp-ab-row ${isHR?'pbp-hr':isHit?'pbp-hit':''} ${selectedPlay===i?'pbp-selected':''}`}
                onClick={()=>setSelectedPlay(selectedPlay===i?null:i)}
                style={{cursor:abPitches.length?'pointer':'default'}}>
                <div className="pbp-ab-header">
                  <span className="pbp-ab-inning">{inning}</span>
                  <span className="pbp-ab-batter">{ab.matchup?.batter?.fullName}</span>
                  <span className="pbp-ab-result">{res?.event}</span>
                  {abPitches.length>0&&<span className="pbp-ab-pitches">{abPitches.length}p {selectedPlay===i?'▲':'▼'}</span>}
                </div>
                {res?.description&&<div className="pbp-ab-desc">{res.description}</div>}
                {selectedPlay===i&&abPitches.length>0&&(
                  <div style={{marginTop:'10px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                    <div>
                      <div className="pbp-zone-label">Pitch Locations</div>
                      <StrikeZone pitches={abPitches.map(p=>({px:p.pitchData?.coordinates?.pX,pz:p.pitchData?.coordinates?.pZ,result:p.details?.description||''}))} />
                    </div>
                    <div style={{flex:1,minWidth:'140px'}}>
                      {abPitches.map((p,pi)=>(
                        <div key={pi} style={{display:'flex',gap:'8px',padding:'4px 0',borderBottom:'1px solid rgba(0,255,255,0.06)',fontSize:'0.78rem'}}>
                          <span style={{color:'rgba(192,208,255,0.35)',minWidth:'18px'}}>#{pi+1}</span>
                          <span style={{color:'var(--color-cyan)',minWidth:'70px'}}>{p.details?.type?.description||'—'}</span>
                          {p.pitchData?.startSpeed&&<span style={{color:'#ffd700'}}>{p.pitchData.startSpeed.toFixed(0)} mph</span>}
                          <span style={{color:'rgba(192,208,255,0.7)'}}>{p.details?.description||'—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Preview / postponed / other */
        <div className="pbp-log">
          <div className="pbp-section-label">Play Log</div>
          <p className="pbp-empty">
            {gameState === 'postponed' ? 'Game was postponed — no plays.' :
             gameState === 'cancelled' ? 'Game was cancelled — no plays.' :
             gameState === 'suspended' ? 'Game was suspended.' :
             'Game has not started yet. Play data will appear here once the game begins.'}
          </p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   FOOTBALL PBP
══════════════════════════════════════════════════════════════ */
const FootballPBP = ({ eventId, sport, game }) => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [isFinal, setIsFinal] = useState(false);
  const lastGoodRef = useRef(null);
  const intervalRef = useRef(null);
  const path = ESPN_PATHS[sport];

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${ESPN}/apis/site/v2/sports/${path}/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      lastGoodRef.current = d; setData(d); setError(null);
      if (d.header?.competitions?.[0]?.status?.type?.state === 'post') {
        setIsFinal(true); clearInterval(intervalRef.current);
      }
    } catch(e) {
      if (lastGoodRef.current) { setData(lastGoodRef.current); setError(null); }
      else setError(e.message);
    }
  }, [eventId, path]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (error&&!data) return <div className="pbp-error">Could not load data: {error}</div>;
  if (!data)        return <div className="pbp-loading">Loading play-by-play…</div>;

  const comps     = data.header?.competitions?.[0];
  const home      = comps?.competitors?.find(c=>c.homeAway==='home');
  const away      = comps?.competitors?.find(c=>c.homeAway==='away');
  const status    = comps?.status?.type?.shortDetail || '';
  const plays     = data.drives?.previous?.flatMap(d=>(d.plays||[])) || [];
  const curDrive  = data.drives?.current;
  const situation = data.situation;
  const gameFinal = isFinal || comps?.status?.type?.state === 'post';
  const downStr   = (d,ds) => d ? `${d}${['st','nd','rd','th'][Math.min(d-1,3)]} & ${ds}` : '';

  return (
    <div className="pbp-football">
      {gameFinal && <StatusBanner state="final" />}
      <div className="pbp-scoreboard">
        <div className="pbp-team"><span className="pbp-team-name">{away?.team?.abbreviation}</span><span className="pbp-score">{away?.score||0}</span></div>
        <div className="pbp-inning-info"><div className="pbp-inning">{status}</div></div>
        <div className="pbp-team"><span className="pbp-score">{home?.score||0}</span><span className="pbp-team-name">{home?.team?.abbreviation}</span></div>
      </div>
      {!gameFinal && situation && (
        <div className="pbp-football-situation">
          {situation.down>0&&<div className="pbp-situation-item"><span className="pbp-sit-label">Down</span><span className="pbp-sit-val">{downStr(situation.down,situation.distance)}</span></div>}
          {situation.yardLine&&<div className="pbp-situation-item"><span className="pbp-sit-label">Field Position</span><span className="pbp-sit-val">{situation.possessionText||situation.yardLine}</span></div>}
        </div>
      )}
      {!gameFinal && curDrive && (
        <div className="pbp-current-drive">
          <div className="pbp-section-label">Current Drive — {curDrive.team?.abbreviation}</div>
          <div className="pbp-drive-summary">
            {curDrive.yards&&<span>{curDrive.yards} yds</span>}
            {curDrive.plays?.length&&<span>{curDrive.plays.length} plays</span>}
          </div>
          {curDrive.plays?.slice(-5).reverse().map((p,i)=>(
            <div key={i} className={`pbp-play-row ${p.scoringPlay?'pbp-scoring':''}`}>
              <span className="pbp-play-clock">{p.clock?.displayValue}</span>
              <span className="pbp-play-text">{p.text}</span>
              {p.scoringPlay&&<span className="pbp-play-score-badge">TD/Score</span>}
            </div>
          ))}
        </div>
      )}
      <div className="pbp-log">
        <div className="pbp-section-label">
          {gameFinal ? `Complete Play Log — ${plays.length} plays` : 'Play Log'}
        </div>
        {plays.length===0&&<p className="pbp-empty">{gameFinal?'No play data recorded.':'No plays yet.'}</p>}
        {[...plays].reverse().map((p,i)=>(
          <div key={i} className={`pbp-play-row ${p.scoringPlay?'pbp-scoring':''}`}>
            <span className="pbp-play-clock">{p.period?.number&&`Q${p.period.number}`} {p.clock?.displayValue}</span>
            <span className="pbp-play-text">{p.text||p.type?.text}</span>
            {p.scoringPlay&&<span className="pbp-play-score-badge">⭐ Score</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   BASKETBALL PBP
══════════════════════════════════════════════════════════════ */
const BasketballPBP = ({ eventId, sport }) => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [isFinal, setIsFinal] = useState(false);
  const lastGoodRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${ESPN}/apis/site/v2/sports/${ESPN_PATHS[sport]}/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      lastGoodRef.current = d; setData(d); setError(null);
      if (d.header?.competitions?.[0]?.status?.type?.state === 'post') {
        setIsFinal(true); clearInterval(intervalRef.current);
      }
    } catch(e) {
      if (lastGoodRef.current) { setData(lastGoodRef.current); setError(null); }
      else setError(e.message);
    }
  }, [eventId, sport]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (error&&!data) return <div className="pbp-error">Could not load data: {error}</div>;
  if (!data)        return <div className="pbp-loading">Loading…</div>;

  const comps     = data.header?.competitions?.[0];
  const home      = comps?.competitors?.find(c=>c.homeAway==='home');
  const away      = comps?.competitors?.find(c=>c.homeAway==='away');
  const status    = comps?.status?.type?.shortDetail||'';
  const plays     = data.plays||[];
  const gameFinal = isFinal||comps?.status?.type?.state==='post';

  return (
    <div className="pbp-basketball">
      {gameFinal&&<StatusBanner state="final"/>}
      <div className="pbp-scoreboard">
        <div className="pbp-team"><span className="pbp-team-name">{away?.team?.abbreviation}</span><span className="pbp-score">{away?.score||0}</span></div>
        <div className="pbp-inning-info"><div className="pbp-inning">{status}</div></div>
        <div className="pbp-team"><span className="pbp-score">{home?.score||0}</span><span className="pbp-team-name">{home?.team?.abbreviation}</span></div>
      </div>
      <div className="pbp-log">
        <div className="pbp-section-label">
          {gameFinal?`Complete Play Log — ${plays.length} plays`:'Play Log'}
        </div>
        {plays.length===0&&<p className="pbp-empty">{gameFinal?'No play data recorded.':'No plays yet.'}</p>}
        {[...plays].reverse().map((p,i)=>{
          const isMake = p.type?.text?.toLowerCase().includes('makes');
          const isFoul = p.type?.text?.toLowerCase().includes('foul');
          return (
            <div key={i} className={`pbp-play-row ${isMake?'pbp-make':''} ${isFoul?'pbp-foul':''}`}>
              <span className="pbp-play-clock">{p.period?.number&&`Q${p.period.number}`} {p.clock?.displayValue}</span>
              <span className="pbp-play-team" style={{color:'rgba(0,255,255,0.6)',fontSize:'0.75rem',marginRight:'6px'}}>{p.team?.abbreviation}</span>
              <span className="pbp-play-text">{p.text}</span>
              {p.scoreValue>0&&<span className="pbp-play-pts">+{p.scoreValue}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   HOCKEY PBP
══════════════════════════════════════════════════════════════ */
const HockeyPBP = ({ eventId }) => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [isFinal, setIsFinal] = useState(false);
  const lastGoodRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${ESPN}/apis/site/v2/sports/hockey/nhl/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      lastGoodRef.current = d; setData(d); setError(null);
      if (d.header?.competitions?.[0]?.status?.type?.state==='post') {
        setIsFinal(true); clearInterval(intervalRef.current);
      }
    } catch(e) {
      if (lastGoodRef.current) { setData(lastGoodRef.current); setError(null); }
      else setError(e.message);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (error&&!data) return <div className="pbp-error">Could not load data: {error}</div>;
  if (!data)        return <div className="pbp-loading">Loading…</div>;

  const comps     = data.header?.competitions?.[0];
  const home      = comps?.competitors?.find(c=>c.homeAway==='home');
  const away      = comps?.competitors?.find(c=>c.homeAway==='away');
  const status    = comps?.status?.type?.shortDetail||'';
  const plays     = data.plays||[];
  const gameFinal = isFinal||comps?.status?.type?.state==='post';

  return (
    <div className="pbp-hockey">
      {gameFinal&&<StatusBanner state="final"/>}
      <div className="pbp-scoreboard">
        <div className="pbp-team"><span className="pbp-team-name">{away?.team?.abbreviation}</span><span className="pbp-score">{away?.score||0}</span></div>
        <div className="pbp-inning-info"><div className="pbp-inning">{status}</div></div>
        <div className="pbp-team"><span className="pbp-score">{home?.score||0}</span><span className="pbp-team-name">{home?.team?.abbreviation}</span></div>
      </div>
      <div className="pbp-log">
        <div className="pbp-section-label">
          {gameFinal?`Complete Play Log — ${plays.length} plays`:'Play Log'}
        </div>
        {plays.length===0&&<p className="pbp-empty">{gameFinal?'No play data recorded.':'No plays yet.'}</p>}
        {[...plays].reverse().map((p,i)=>{
          const isGoal=p.type?.text?.toLowerCase().includes('goal');
          const isPen =p.type?.text?.toLowerCase().includes('penalty');
          return (
            <div key={i} className={`pbp-play-row ${isGoal?'pbp-scoring':''} ${isPen?'pbp-foul':''}`}>
              <span className="pbp-play-clock">P{p.period?.number} {p.clock?.displayValue}</span>
              <span className="pbp-play-text">{p.text}</span>
              {isGoal&&<span className="pbp-play-score-badge">🚨 GOAL</span>}
              {isPen&&<span className="pbp-play-penalty-badge">🔲 PEN</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const PlayByPlay = ({ game, sport, onBack }) => {
  const isBaseball   = sport==='mlb'||sport.startsWith('milb_')||sport==='cbb';
  const isFootball   = sport==='nfl'||sport==='cfb';
  const isBasketball = sport==='nba';
  const isHockey     = sport==='nhl';

  const gamePk  = game?.gamePk||game?.id;
  const eventId = game?.espnId||game?.id;

  const isFinalGame = game?.status==='post'||game?.statusDetail?.toLowerCase().includes('final');

  return (
    <div className="pbp-wrapper">
      <button className="pbp-back neon-button" onClick={onBack}>← Back to Scores</button>
      <div className="pbp-game-header">
        <span className="pbp-game-sport">{sport.toUpperCase()}</span>
        <h2 className="pbp-game-title">
          {game?.away_team||game?.awayTeam} vs {game?.home_team||game?.homeTeam}
        </h2>
        <div className="pbp-refresh-hint" style={isFinalGame?{color:'#00ff88',fontWeight:700}:{}}>
          {isFinalGame ? '✅ Final — full game log below' : 'Auto-refreshes every 15s'}
        </div>
      </div>

      {isBaseball   && <BaseballPBP gamePk={gamePk} game={game}/>}
      {isFootball   && <FootballPBP eventId={eventId} sport={sport} game={game}/>}
      {isBasketball && <BasketballPBP eventId={eventId} sport={sport}/>}
      {isHockey     && <HockeyPBP eventId={eventId}/>}
    </div>
  );
};

export default PlayByPlay;
