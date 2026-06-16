/**
 * PlayByPlay.jsx
 *
 * FIXES in this version:
 * 1. Game log for COMPLETED games — when game.status === 'post' the
 *    gamePk resolver searches the last 7 days and prioritises Final
 *    games so it never says "game hasn't started" for a finished game.
 * 2. Highlight VIDEOS — every scoring play in the game log shows
 *    the MLB cut video (same URL scheme as mlb-cuts-diamond.mlb.com).
 *    Click the thumbnail to play inline; click again to close.
 * 3. Live mode unchanged — every at-bat updates in real time.
 * 4. NHL / NFL / NBA keep existing behaviour + last-good-data ref.
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

/* ── helpers ──────────────────────────────────────────────────── */
function mlbGameState(feed) {
  const abs = feed?.gameData?.status?.abstractGameState || '';
  const det = feed?.gameData?.status?.detailedState    || '';
  if (abs === 'Final')              return 'final';
  if (abs === 'Live')               return 'live';
  if (/postponed/i.test(det))       return 'postponed';
  if (/cancelled|canceled/i.test(det)) return 'cancelled';
  if (/suspended/i.test(det))       return 'suspended';
  return 'preview';
}

/** Pick the best MP4 playback URL from an array of MLB playback objects */
function bestPlayback(playbacks = []) {
  const preferred = ['FORGE_2500K_1280x720_59.94','FORGE_2500K','mp4Avc','hlsCloud'];
  for (const name of preferred) {
    const p = playbacks.find(x => x.name && x.name.includes(name.split('_')[0]));
    if (p?.url) return p.url;
  }
  return playbacks.find(x => x.url)?.url || null;
}

/* ── MLB Highlights fetch ─────────────────────────────────────── */
async function fetchMLBHighlights(gamePk) {
  if (!gamePk) return [];
  try {
    const r = await fetch(`${MLB_API}/game/${gamePk}/content?language=en`);
    if (!r.ok) return [];
    const d = await r.json();
    const items = [
      ...(d?.highlights?.scoreboard?.items || []),
      ...(d?.highlights?.live?.items || []),
    ];
    return items.map(item => ({
      id:        item.id,
      headline:  item.headline || item.blurb || '',
      videoUrl:  bestPlayback(item.playbacks || []),
      thumb:     item.image?.cuts?.find(c => c.width >= 640)?.src
                 || item.image?.cuts?.[0]?.src
                 || null,
    })).filter(h => h.videoUrl);
  } catch { return []; }
}

/** Fuzzy-match a play description to a highlight headline */
function matchHighlight(highlights, playDesc) {
  if (!playDesc || !highlights.length) return null;
  const words = playDesc.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let best = null, bestScore = 0;
  for (const h of highlights) {
    const hl = h.headline.toLowerCase();
    const score = words.reduce((n, w) => n + (hl.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = h; }
  }
  return bestScore >= 2 ? best : null;
}

/* ── Inline video player for a highlight ─────────────────────── */
const HighlightClip = ({ highlight }) => {
  const [open, setOpen] = useState(false);
  if (!highlight?.videoUrl) return null;
  return (
    <div style={{ marginTop: '10px' }}>
      {!open ? (
        <div
          onClick={() => setOpen(true)}
          style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,100,0,0.4)', maxWidth: '300px', width: '100%' }}
          title="Watch highlight"
        >
          {highlight.thumb && (
            <img src={highlight.thumb} alt="" style={{ width: '100%', display: 'block', maxHeight: '160px', objectFit: 'cover' }} />
          )}
          <div style={{ position: highlight.thumb ? 'absolute' : 'relative', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,80,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '1rem', marginLeft: '3px' }}>&#9654;</span>
            </div>
            <span style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)', lineHeight: 1.3 }}>
              {highlight.headline.length > 60 ? highlight.headline.slice(0, 60) + '...' : highlight.headline}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <video
            src={highlight.videoUrl}
            controls
            autoPlay
            style={{ width: '100%', borderRadius: '8px', background: '#000', display: 'block' }}
          />
          <button onClick={() => setOpen(false)} style={{ marginTop: '6px', background: 'none', border: '1px solid rgba(192,208,255,0.2)', color: 'rgba(192,208,255,0.5)', borderRadius: '5px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
            Close video
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Strike Zone ─────────────────────────────────────────────── */
const StrikeZone = ({ pitches = [] }) => {
  const S = 180, ZX = 45, ZY = 30, ZW = 90, ZH = 110;
  const col = r => !r ? '#888' : r === 'Ball' ? '#4488ff' : r === 'Foul' ? '#ffcc00' : r === 'In Play' ? '#00ff88' : '#ff4444';
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
        const cx=ZX+ZW/2+(p.px/1.5)*(ZW/2), cy=ZY+ZH-((p.pz-1.5)/2)*ZH, c=col(p.result);
        return <g key={i}><circle cx={cx} cy={cy} r={8} fill={`${c}30`} stroke={c} strokeWidth={1.5}/><text x={cx} y={cy+3.5} textAnchor="middle" fill={c} fontSize={7} fontWeight="bold">{i+1}</text></g>;
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
    {[['B','ball',balls,4],['S','strike',strikes,3],['O','out',outs,3]].map(([lbl,cls,val,max])=>(
      <div key={lbl} className="pbp-count-row">
        <span className="pbp-count-label">{lbl}</span>
        {Array.from({length:max},(_,i)=><div key={i} className={`pbp-dot ${cls} ${i<val?'on':''}`}/>)}
      </div>
    ))}
  </div>
);

const StatusBanner = ({ state, detail }) => {
  const cfg = {
    final:     { bg:'rgba(0,255,100,0.08)', border:'rgba(0,255,100,0.25)', color:'#00ff88', text:'FINAL - Full game log' },
    postponed: { bg:'rgba(255,200,0,0.08)', border:'rgba(255,200,0,0.3)',  color:'#ffcc00', text:`POSTPONED${detail?` - ${detail}`:''}` },
    cancelled: { bg:'rgba(255,80,80,0.08)', border:'rgba(255,80,80,0.3)', color:'#ff8080', text:'CANCELLED' },
    suspended: { bg:'rgba(255,200,0,0.08)', border:'rgba(255,200,0,0.3)', color:'#ffcc00', text:'SUSPENDED' },
  }[state];
  if (!cfg) return null;
  return <div style={{ textAlign:'center', marginBottom:'12px', padding:'7px 16px', background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:'8px', color:cfg.color, fontSize:'0.83rem', fontWeight:700 }}>{cfg.text}</div>;
};

/* ── Full completed game log with highlight videos ────────────── */
const FullGameLog = ({ plays, highlights }) => {
  const [expandedPlay, setExpandedPlay] = useState(null);
  const HIT_EVENTS = new Set(['Single','Double','Triple','Home Run','Ground Rule Double']);

  if (!plays || plays.length === 0) return <p className="pbp-empty">No play data recorded for this game.</p>;

  /* group by inning half */
  const innings = {};
  plays.forEach(ab => {
    const half = ab.about?.halfInning === 'top' ? 'Top' : 'Bot';
    const num  = ab.about?.inning ?? 0;
    const key  = `${String(num).padStart(2,'0')}-${half}`;
    if (!innings[key]) innings[key] = { num, half, plays: [] };
    innings[key].plays.push(ab);
  });
  const inningKeys = Object.keys(innings).sort();

  return (
    <div className="pbp-log">
      <div className="pbp-section-label" style={{ marginBottom:'12px' }}>
        Complete Game Log — {plays.length} plate appearances
        {highlights.length > 0 && <span style={{ marginLeft:'10px', color:'#ff8040', fontWeight:700 }}>+ {highlights.length} highlight videos</span>}
      </div>

      {inningKeys.map(key => {
        const inn     = innings[key];
        const halfSym = inn.half === 'Top' ? '\u25b2' : '\u25bc';
        const hasScoring = inn.plays.some(ab => (ab.result?.rbi || 0) > 0);

        return (
          <div key={key} style={{ marginBottom:'18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'6px 12px', background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.14)', borderRadius:'8px', marginBottom:'6px' }}>
              <span style={{ color:'var(--color-cyan)', fontWeight:800, fontSize:'0.85rem', minWidth:'55px' }}>{halfSym} {inn.num}</span>
              <span style={{ fontSize:'0.75rem', color:'rgba(192,208,255,0.4)' }}>
                {inn.half} of {inn.num} — {inn.plays.length} batter{inn.plays.length!==1?'s':''}
              </span>
              {hasScoring && <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#ffd700', fontWeight:700 }}>Scoring inning</span>}
            </div>

            {inn.plays.map((ab, i) => {
              const res        = ab.result;
              const abPitches  = (ab.playEvents||[]).filter(e=>e.isPitch);
              const lastPitch  = abPitches[abPitches.length-1];
              const isHR       = res?.event === 'Home Run';
              const isHit      = HIT_EVENTS.has(res?.event);
              const isScoring  = (res?.rbi || 0) > 0;
              const isExpanded = expandedPlay === `${key}-${i}`;
              const highlight  = isScoring || isHR ? matchHighlight(highlights, res?.description || '') : null;

              if (!res?.event || res.event === 'Game Advisory') return null;

              return (
                <div key={i}
                  className={`pbp-ab-row ${isHR?'pbp-hr':isHit?'pbp-hit':''}`}
                  style={{ cursor: abPitches.length ? 'pointer' : 'default', borderLeft: isScoring ? '3px solid #ffd700' : undefined }}
                  onClick={() => setExpandedPlay(isExpanded ? null : `${key}-${i}`)}
                >
                  <div className="pbp-ab-header">
                    <span className="pbp-ab-batter" style={{ fontWeight: isHit?800:600 }}>
                      {isHR && '💣 '}{ab.matchup?.batter?.fullName}
                    </span>
                    <span className="pbp-ab-result" style={{ color: isHR?'#ffd700':isHit?'#00ff88':'rgba(192,208,255,0.7)', fontWeight:isHit?800:600 }}>
                      {res?.event}
                    </span>
                    {isScoring && <span style={{ color:'#ffd700', fontSize:'0.72rem', fontWeight:700 }}>{res.rbi} RBI</span>}
                    {abPitches.length>0 && <span className="pbp-ab-pitches">{abPitches.length}p {isExpanded?'\u25b2':'\u25bc'}</span>}
                    {highlight && <span style={{ color:'#ff8040', fontSize:'0.7rem', fontWeight:700, marginLeft:'auto' }}>VIDEO</span>}
                  </div>

                  {res?.description && <div className="pbp-ab-desc">{res.description}</div>}

                  {lastPitch?.hitData?.launchSpeed && (
                    <div className="pbp-ab-hitdata">
                      EV {lastPitch.hitData.launchSpeed.toFixed(0)} mph
                      {lastPitch.hitData.launchAngle ? ` · LA ${lastPitch.hitData.launchAngle.toFixed(0)}\u00b0` : ''}
                      {lastPitch.hitData.totalDistance ? ` · ${lastPitch.hitData.totalDistance.toFixed(0)} ft` : ''}
                    </div>
                  )}

                  {/* Highlight video always visible for scoring / HR plays */}
                  {highlight && <HighlightClip highlight={highlight} />}

                  {/* Expanded pitch log */}
                  {isExpanded && abPitches.length > 0 && (
                    <div style={{ marginTop:'12px', display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'flex-start' }} onClick={e=>e.stopPropagation()}>
                      <div>
                        <div className="pbp-zone-label">Pitch Locations</div>
                        <StrikeZone pitches={abPitches.map(p=>({ px:p.pitchData?.coordinates?.pX, pz:p.pitchData?.coordinates?.pZ, result:p.details?.description||'' }))} />
                      </div>
                      <div style={{ flex:1, minWidth:'160px' }}>
                        {abPitches.map((p,pi)=>(
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

/* ══════════════════════════════════════════════════════════════
   BASEBALL PBP
   KEY FIX: when parent says game is 'post', search recent dates
   for a FINAL game so we never land on a future scheduled game.
══════════════════════════════════════════════════════════════ */
const BaseballPBP = ({ gamePk, game }) => {
  const [feed, setFeed]           = useState(null);
  const [gameState, setGameState] = useState('preview');
  const [highlights, setHighlights] = useState([]);
  const [error, setError]         = useState(null);
  const lastGoodRef = useRef(null);
  const intervalRef = useRef(null);
  const [resolvedPk, setResolvedPk] = useState(null);
  const [selectedPlay, setSelectedPlay] = useState(null);

  /* Parent already knows if game is final */
  const parentIsFinal = game?.status === 'post' ||
    (game?.statusDetail || '').toLowerCase().includes('final');

  /* ── resolve gamePk ────────────────────────────────────────── */
  useEffect(() => {
    const pk = String(gamePk || '');
    if (!pk) { setError('No game ID provided.'); return; }

    /* MLB native 6-7 digit ID — use directly */
    if (pk.length <= 7) { setResolvedPk(pk); return; }

    /* ESPN 9-digit ID — find matching MLB game.
       Search up to 7 days back; if parent says it's final,
       prioritise games with status 'F' (Final). */
    const daysToSearch = parentIsFinal ? [-1,-2,-3,-4,-5,-6,-7,0,1] : [0,-1,1,-2,2,-3,3];
    (async () => {
      for (const offset of daysToSearch) {
        try {
          const d = new Date(); d.setDate(d.getDate() + offset);
          const dateStr = d.toISOString().slice(0,10);
          const r = await fetch(`${MLB_API}/schedule?sportId=1&date=${dateStr}&hydrate=team,game(content(summary)),decisions`);
          const data = await r.json();
          const games = (data.dates?.[0]?.games || []);
          if (!games.length) continue;

          /* Try team name match first */
          const away = (game?.away_team || game?.awayTeam || '').toLowerCase().split(' ').pop();
          const home = (game?.home_team || game?.homeTeam || '').toLowerCase().split(' ').pop();
          let match = games.find(g =>
            (g.teams?.away?.team?.name?.toLowerCase().includes(away) ||
             g.teams?.home?.team?.name?.toLowerCase().includes(home)) &&
            (!parentIsFinal || g.status?.abstractGameState === 'Final')
          );
          /* Fallback: any final game on that day */
          if (!match && parentIsFinal) match = games.find(g => g.status?.abstractGameState === 'Final');
          if (!match && !parentIsFinal) match = games[0];

          if (match?.gamePk) { setResolvedPk(String(match.gamePk)); return; }
        } catch {}
      }
      /* Last resort: use raw ID */
      setResolvedPk(pk);
    })();
  }, [gamePk, game, parentIsFinal]);

  /* ── fetch live feed ───────────────────────────────────────── */
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
      /* stop polling when done */
      if (['final','postponed','cancelled','suspended'].includes(state)) {
        clearInterval(intervalRef.current);
        /* fetch highlights for final games */
        if (state === 'final') {
          fetchMLBHighlights(resolvedPk).then(setHighlights);
        }
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

  if (error && !feed) return <div className="pbp-error">{error}<br/><small style={{color:'rgba(192,208,255,0.4)'}}>Data appears once the game starts.</small></div>;
  if (!resolvedPk)    return <div className="pbp-loading">Resolving game...</div>;
  if (!feed)          return <div className="pbp-loading">Loading play data...</div>;

  const ld       = feed.liveData;
  const gd       = feed.gameData;
  const ls       = ld?.linescore || {};
  const innings  = ls.innings || [];
  const allPlays = ld?.plays?.allPlays || [];
  const isLive   = gameState === 'live';
  const isFinal  = gameState === 'final';

  const cur     = isLive ? ld?.plays?.currentPlay : null;
  const batter  = cur?.matchup?.batter;
  const pitcher = cur?.matchup?.pitcher;
  const count   = cur?.count || {};
  const pitches = (cur?.playEvents||[]).filter(e=>e.isPitch).map(e=>({
    px:e.pitchData?.coordinates?.pX, pz:e.pitchData?.coordinates?.pZ,
    mph:e.pitchData?.startSpeed?.toFixed(1), type:e.details?.type?.description||'',
    result:e.details?.description||'',
    exitVelo:e.hitData?.launchSpeed?.toFixed(0),
    launchAngle:e.hitData?.launchAngle?.toFixed(0),
    distance:e.hitData?.totalDistance?.toFixed(0),
  }));
  const runners = { first:!!ls.offense?.first, second:!!ls.offense?.second, third:!!ls.offense?.third };
  const inningLabel = ls.currentInning ? `${ls.inningHalf==='Top'?'\u25b2':'\u25bc'} ${ls.currentInning}` : '—';
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
          <div className="pbp-inning">{isFinal ? 'FINAL' : gameState==='preview' ? 'PREVIEW' : inningLabel}</div>
          {isLive && <div className="pbp-outs">{count.outs ?? ls.outs ?? 0} out{(count.outs??1)!==1?'s':''}</div>}
        </div>
        <div className="pbp-team">
          <span className="pbp-score">{ls.teams?.home?.runs ?? game?.home_score ?? '—'}</span>
          <span className="pbp-team-name">{homeAbbr}</span>
        </div>
      </div>

      {/* Linescore */}
      {innings.length > 0 && ls.teams?.away?.runs != null && (
        <div className="pbp-linescore-wrap">
          <table className="pbp-linescore">
            <thead><tr>
              <th>Team</th>
              {innings.map((_,i)=><th key={i}>{i+1}</th>)}
              <th>R</th><th>H</th><th>E</th>
            </tr></thead>
            <tbody>
              {['away','home'].map(side=>(
                <tr key={side}>
                  <td className="pbp-ls-team">{gd?.teams?.[side]?.abbreviation}</td>
                  {innings.map((inn,i)=><td key={i}>{inn[side]?.runs??''}</td>)}
                  <td className="pbp-ls-total">{ls.teams?.[side]?.runs??'—'}</td>
                  <td className="pbp-ls-total">{ls.teams?.[side]?.hits??'—'}</td>
                  <td className="pbp-ls-total">{ls.teams?.[side]?.errors??'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live current at-bat */}
      {isLive && batter && pitcher && (
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
          {pitches.length>0 && (
            <div className="pbp-pitch-list">
              <div className="pbp-section-label">Current At-Bat</div>
              {pitches.map((p,i)=>(
                <div key={i} className={`pbp-pitch-row pbp-result-${(p.result||'').replace(/\s+/g,'-').toLowerCase()}`}>
                  <span className="pbp-pitch-num">#{i+1}</span>
                  <span className="pbp-pitch-type">{p.type}</span>
                  {p.mph&&<span className="pbp-pitch-mph">{p.mph} mph</span>}
                  <span className="pbp-pitch-result">{p.result}</span>
                  {p.exitVelo&&<span className="pbp-pitch-exit">EV {p.exitVelo} mph</span>}
                  {p.launchAngle&&<span className="pbp-pitch-angle">LA {p.launchAngle}&deg;</span>}
                  {p.distance&&<span className="pbp-pitch-dist">{p.distance} ft</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Play log */}
      {isFinal ? (
        <FullGameLog plays={allPlays} highlights={highlights} />
      ) : isLive ? (
        <div className="pbp-log">
          <div className="pbp-section-label">Play Log</div>
          {[...allPlays].reverse().slice(0,40).map((ab,i)=>{
            const res=ab.result, about=ab.about;
            const abPitches=(ab.playEvents||[]).filter(e=>e.isPitch);
            if (!res?.event||res.event==='Game Advisory') return null;
            const inning=about?`${about.halfInning==='top'?'\u25b2':'\u25bc'}${about.inning}`:'';
            const isHR=res?.event==='Home Run';
            const isHit=['Single','Double','Triple','Home Run','Ground Rule Double'].includes(res?.event);
            const highlight=matchHighlight(highlights,res?.description||'');
            return (
              <div key={i} className={`pbp-ab-row ${isHR?'pbp-hr':isHit?'pbp-hit':''} ${selectedPlay===i?'pbp-selected':''}`}
                onClick={()=>setSelectedPlay(selectedPlay===i?null:i)}
                style={{cursor:abPitches.length?'pointer':'default'}}>
                <div className="pbp-ab-header">
                  <span className="pbp-ab-inning">{inning}</span>
                  <span className="pbp-ab-batter">{ab.matchup?.batter?.fullName}</span>
                  <span className="pbp-ab-result">{res?.event}</span>
                  {(res?.rbi||0)>0&&<span style={{color:'#ffd700',fontSize:'0.72rem',fontWeight:700}}>{res.rbi} RBI</span>}
                  {abPitches.length>0&&<span className="pbp-ab-pitches">{abPitches.length}p {selectedPlay===i?'\u25b2':'\u25bc'}</span>}
                </div>
                {res?.description&&<div className="pbp-ab-desc">{res.description}</div>}
                {highlight&&<HighlightClip highlight={highlight}/>}
                {selectedPlay===i&&abPitches.length>0&&(
                  <div style={{marginTop:'10px',display:'flex',gap:'12px',flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
                    <StrikeZone pitches={abPitches.map(p=>({px:p.pitchData?.coordinates?.pX,pz:p.pitchData?.coordinates?.pZ,result:p.details?.description||''}))}/>
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
        <div className="pbp-log">
          <div className="pbp-section-label">Play Log</div>
          <p className="pbp-empty">
            {gameState==='postponed'?'Game was postponed — no plays recorded.':
             gameState==='cancelled'?'Game was cancelled — no plays recorded.':
             gameState==='suspended'?'Game was suspended.':
             'Game has not started yet. Play data appears here once the game begins.'}
          </p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   FOOTBALL / BASKETBALL / HOCKEY — unchanged logic + last-good ref
══════════════════════════════════════════════════════════════ */
const ESPNSportPBP = ({ eventId, sport }) => {
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [isFinal, setIsFinal] = useState(false);
  const lastGoodRef = useRef(null);
  const intervalRef = useRef(null);
  const isHockey = sport === 'nhl';
  const path = isHockey ? 'hockey/nhl' : ESPN_PATHS[sport];

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
  if (!data)        return <div className="pbp-loading">Loading play-by-play...</div>;

  const comps     = data.header?.competitions?.[0];
  const home      = comps?.competitors?.find(c=>c.homeAway==='home');
  const away      = comps?.competitors?.find(c=>c.homeAway==='away');
  const status    = comps?.status?.type?.shortDetail||'';
  const gameFinal = isFinal||comps?.status?.type?.state==='post';

  /* plays: football uses drives, basketball/hockey use plays[] */
  const isFootball = sport==='nfl'||sport==='cfb';
  const plays = isFootball
    ? (data.drives?.previous?.flatMap(d=>(d.plays||[]))||[])
    : (data.plays||[]);
  const curDrive  = isFootball ? data.drives?.current : null;
  const situation = isFootball ? data.situation : null;
  const downStr   = (d,ds) => d ? `${d}${['st','nd','rd','th'][Math.min(d-1,3)]} & ${ds}` : '';

  return (
    <div>
      {gameFinal && <StatusBanner state="final" />}
      <div className="pbp-scoreboard">
        <div className="pbp-team"><span className="pbp-team-name">{away?.team?.abbreviation}</span><span className="pbp-score">{away?.score||0}</span></div>
        <div className="pbp-inning-info"><div className="pbp-inning">{status}</div></div>
        <div className="pbp-team"><span className="pbp-score">{home?.score||0}</span><span className="pbp-team-name">{home?.team?.abbreviation}</span></div>
      </div>

      {isFootball && !gameFinal && situation && (
        <div className="pbp-football-situation">
          {situation.down>0&&<div className="pbp-situation-item"><span className="pbp-sit-label">Down</span><span className="pbp-sit-val">{downStr(situation.down,situation.distance)}</span></div>}
          {situation.yardLine&&<div className="pbp-situation-item"><span className="pbp-sit-label">Field Pos</span><span className="pbp-sit-val">{situation.possessionText||situation.yardLine}</span></div>}
        </div>
      )}
      {isFootball && !gameFinal && curDrive && (
        <div className="pbp-current-drive">
          <div className="pbp-section-label">Current Drive — {curDrive.team?.abbreviation}</div>
          {curDrive.plays?.slice(-4).reverse().map((p,i)=>(
            <div key={i} className={`pbp-play-row ${p.scoringPlay?'pbp-scoring':''}`}>
              <span className="pbp-play-clock">{p.clock?.displayValue}</span>
              <span className="pbp-play-text">{p.text}</span>
              {p.scoringPlay&&<span className="pbp-play-score-badge">Score</span>}
            </div>
          ))}
        </div>
      )}

      <div className="pbp-log">
        <div className="pbp-section-label">
          {gameFinal ? `Complete Game Log — ${plays.length} plays` : 'Play Log'}
        </div>
        {plays.length===0&&<p className="pbp-empty">{gameFinal?'No play data recorded.':'No plays yet.'}</p>}
        {[...plays].reverse().map((p,i)=>{
          const isGoal    = sport==='nhl'&&p.type?.text?.toLowerCase().includes('goal');
          const isPenalty = sport==='nhl'&&p.type?.text?.toLowerCase().includes('penalty');
          const isMake    = sport==='nba'&&p.type?.text?.toLowerCase().includes('makes');
          const isFoul    = sport==='nba'&&p.type?.text?.toLowerCase().includes('foul');
          const isScore   = isFootball&&p.scoringPlay;
          return (
            <div key={i} className={`pbp-play-row ${isScore||isGoal?'pbp-scoring':''} ${isPenalty||isFoul?'pbp-foul':''} ${isMake?'pbp-make':''}`}>
              <span className="pbp-play-clock">
                {sport==='nhl'?`P${p.period?.number}`:(sport==='nba'||sport==='nfl'||sport==='cfb')?`Q${p.period?.number}`:''} {p.clock?.displayValue}
              </span>
              {sport==='nba'&&<span style={{color:'rgba(0,255,255,0.6)',fontSize:'0.75rem',marginRight:'6px'}}>{p.team?.abbreviation}</span>}
              <span className="pbp-play-text">{p.text||p.type?.text}</span>
              {isScore&&<span className="pbp-play-score-badge">Score</span>}
              {isGoal&&<span className="pbp-play-score-badge">GOAL</span>}
              {isPenalty&&<span className="pbp-play-penalty-badge">PEN</span>}
              {p.scoreValue>0&&<span className="pbp-play-pts">+{p.scoreValue}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
const PlayByPlay = ({ game, sport, onBack }) => {
  const isBaseball = sport==='mlb'||sport.startsWith('milb_')||sport==='cbb';
  const gamePk     = game?.gamePk||game?.id;
  const eventId    = game?.espnId||game?.id;
  const isFinalGame= game?.status==='post'||(game?.statusDetail||'').toLowerCase().includes('final');

  return (
    <div className="pbp-wrapper">
      <button className="pbp-back neon-button" onClick={onBack}>Back to Scores</button>
      <div className="pbp-game-header">
        <span className="pbp-game-sport">{sport.toUpperCase()}</span>
        <h2 className="pbp-game-title">
          {game?.away_team||game?.awayTeam} vs {game?.home_team||game?.homeTeam}
        </h2>
        <div className="pbp-refresh-hint" style={isFinalGame?{color:'#00ff88',fontWeight:700}:{}}>
          {isFinalGame ? 'Full game log — click any at-bat to expand pitches' : 'Auto-refreshes every 15s'}
        </div>
      </div>
      {isBaseball
        ? <BaseballPBP gamePk={gamePk} game={game}/>
        : <ESPNSportPBP eventId={eventId} sport={sport}/>
      }
    </div>
  );
};

export default PlayByPlay;
