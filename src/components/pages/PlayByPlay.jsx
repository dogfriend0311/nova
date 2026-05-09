/**
 * PlayByPlay.jsx
 * Live play-by-play for real sports leagues.
 * Baseball (MLB, MiLB, College): pitch-by-pitch via MLB Stats API
 * Football / Basketball / Hockey: play log via ESPN API
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PlayByPlay.css';

const MLB_API = 'https://statsapi.mlb.com/api/v1';
const ESPN    = 'https://site.api.espn.com';

/* ── Helpers ─────────────────────────────────────────────────── */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const MILB_IDS = { milb_aaa: 11, milb_aa: 12, milb_highA: 13, milb_singleA: 14 };

const ESPN_PATHS = {
  nfl:  'football/nfl',
  nba:  'basketball/nba',
  nhl:  'hockey/nhl',
  cfb:  'football/college-football',
  cbb:  'baseball/college-baseball',
};

const isMlbFamily = (s) => s === 'mlb' || s.startsWith('milb_') || s === 'cbb_milb';

/* ── Strike Zone ─────────────────────────────────────────────── */
const StrikeZone = ({ pitches = [] }) => {
  const S = 180;
  const ZX = 45, ZY = 30, ZW = 90, ZH = 110;

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
      {/* ball zone hint */}
      <rect x={22} y={16} width={136} height={138} fill="none" stroke="rgba(80,120,255,0.2)" strokeWidth={1} strokeDasharray="4 3" rx={3}/>
      {/* strike zone */}
      <rect x={ZX} y={ZY} width={ZW} height={ZH} fill="rgba(0,255,255,0.04)" stroke="rgba(0,255,255,0.5)" strokeWidth={1.5}/>
      {/* grid */}
      {[1,2].map(i=><line key={`v${i}`} x1={ZX+ZW*(i/3)} y1={ZY} x2={ZX+ZW*(i/3)} y2={ZY+ZH} stroke="rgba(0,255,255,0.15)" strokeWidth={0.7}/>)}
      {[1,2].map(i=><line key={`h${i}`} x1={ZX} y1={ZY+ZH*(i/3)} x2={ZX+ZW} y2={ZY+ZH*(i/3)} stroke="rgba(0,255,255,0.15)" strokeWidth={0.7}/>)}
      {/* home plate */}
      <polygon points={`${S/2-14},${S-12} ${S/2+14},${S-12} ${S/2+17},${S-6} ${S/2},${S-2} ${S/2-17},${S-6}`} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
      {/* labels */}
      <text x={ZX-3} y={ZY+9} textAnchor="end" fill="rgba(100,150,255,0.45)" fontSize={7}>HH</text>
      <text x={ZX-3} y={ZY+ZH} textAnchor="end" fill="rgba(100,150,255,0.45)" fontSize={7}>KN</text>
      {/* pitches */}
      {pitches.map((p,i)=>{
        if (p.px == null || p.pz == null) return null;
        // MLB coords: pX horizontal (-1.5 to 1.5), pZ vertical (1 to 4 approx)
        const cx = ZX + ZW/2 + (p.px / 1.5) * (ZW/2);
        const cy = ZY + ZH - ((p.pz - 1.5) / 2.0) * ZH;
        const c = col(p.result);
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

/* ── Base Runner Diagram ─────────────────────────────────────── */
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

/* ── Count Dots ──────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════
   BASEBALL PBP — MLB Stats API live feed
══════════════════════════════════════════════════════════════ */
const BaseballPBP = ({ gamePk, game }) => {
  const [feed, setFeed]   = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    try {
      const r = await fetch(`${MLB_API}/game/${gamePk}/feed/live`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setFeed(d);
    } catch (e) {
      setError(e.message);
    }
  }, [gamePk]);

  useEffect(() => {
    fetchFeed();
    intervalRef.current = setInterval(fetchFeed, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchFeed]);

  if (error) return <div className="pbp-error">Could not load live feed: {error}</div>;
  if (!feed)  return <div className="pbp-loading">Loading live data…</div>;

  const ld  = feed.liveData;
  const gd  = feed.gameData;
  const plays = ld?.plays?.allPlays || [];
  const cur   = ld?.plays?.currentPlay;
  const ls    = ld?.linescore || {};
  const innings = ls.innings || [];

  const batter  = cur?.matchup?.batter;
  const pitcher = cur?.matchup?.pitcher;
  const count   = cur?.count || {};
  const events  = cur?.playEvents || [];
  const pitches = events
    .filter(e => e.isPitch)
    .map(e => ({
      px:     e.pitchData?.coordinates?.pX,
      pz:     e.pitchData?.coordinates?.pZ,
      mph:    e.pitchData?.startSpeed?.toFixed(1),
      type:   e.details?.type?.description || '',
      result: e.details?.description || '',
      exitVelo:     e.hitData?.launchSpeed?.toFixed(0),
      launchAngle:  e.hitData?.launchAngle?.toFixed(0),
      distance:     e.hitData?.totalDistance?.toFixed(0),
    }));

  const runners = {
    first:  !!ls.offense?.first,
    second: !!ls.offense?.second,
    third:  !!ls.offense?.third,
  };

  const inningLabel = ls.currentInning
    ? `${ls.inningHalf === 'Top' ? '▲' : '▼'} ${ls.currentInning}`
    : '—';

  // Build at-bat log from all plays (reverse = newest first)
  const atBats = [...plays].reverse().slice(0, 30);

  return (
    <div className="pbp-baseball">
      {/* Score header */}
      <div className="pbp-scoreboard">
        <div className="pbp-team">
          <span className="pbp-team-name">{gd?.teams?.away?.abbreviation || game?.away_team}</span>
          <span className="pbp-score">{ls.teams?.away?.runs ?? game?.away_score}</span>
        </div>
        <div className="pbp-inning-info">
          <div className="pbp-inning">{inningLabel}</div>
          <div className="pbp-outs">{count.outs ?? ls.outs ?? 0} out{(count.outs ?? 1) !== 1 ? 's' : ''}</div>
        </div>
        <div className="pbp-team">
          <span className="pbp-score">{ls.teams?.home?.runs ?? game?.home_score}</span>
          <span className="pbp-team-name">{gd?.teams?.home?.abbreviation || game?.home_team}</span>
        </div>
      </div>

      {/* Line score */}
      {innings.length > 0 && (
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
                  <td className="pbp-ls-team">{gd?.teams?.[side]?.abbreviation || game?.[`${side}_team`]}</td>
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

      {/* Current at-bat */}
      {batter && pitcher && (
        <div className="pbp-current-ab">
          <div className="pbp-matchup">
            <div className="pbp-matchup-side">
              <div className="pbp-player-role">Batting</div>
              <div className="pbp-player-name">{batter.fullName}</div>
              <div className="pbp-player-sub">{cur?.matchup?.batSide?.description}</div>
            </div>
            <div className="pbp-matchup-vs">VS</div>
            <div className="pbp-matchup-side right">
              <div className="pbp-player-role">Pitching</div>
              <div className="pbp-player-name">{pitcher.fullName}</div>
              <div className="pbp-player-sub">{cur?.matchup?.pitchHand?.description}</div>
            </div>
          </div>

          <div className="pbp-live-row">
            {/* Strike zone */}
            <div className="pbp-zone-wrap">
              <div className="pbp-zone-label">Strike Zone</div>
              <StrikeZone pitches={pitches}/>
              <div className="pbp-zone-legend">
                {[['#4488ff','Ball'],['#ff4444','Strike'],['#ffcc00','Foul'],['#00ff88','In Play']].map(([c,l])=>(
                  <span key={l} style={{ color:c, fontSize:'0.72rem', marginRight:'8px' }}>● {l}</span>
                ))}
              </div>
            </div>

            {/* Count + runners */}
            <div className="pbp-state">
              <Count balls={count.balls} strikes={count.strikes} outs={ls.outs ?? 0}/>
              <Runners first={runners.first} second={runners.second} third={runners.third}/>
            </div>
          </div>

          {/* Current pitch sequence */}
          {pitches.length > 0 && (
            <div className="pbp-pitch-list">
              <div className="pbp-section-label">Current At-Bat Pitches</div>
              {pitches.map((p,i)=>(
                <div key={i} className={`pbp-pitch-row pbp-result-${p.result?.replace(/\s+/g,'-').toLowerCase()}`}>
                  <span className="pbp-pitch-num">#{i+1}</span>
                  <span className="pbp-pitch-type">{p.type}</span>
                  {p.mph && <span className="pbp-pitch-mph">{p.mph} mph</span>}
                  <span className="pbp-pitch-result">{p.result}</span>
                  {p.exitVelo && <span className="pbp-pitch-exit">EV {p.exitVelo} mph</span>}
                  {p.launchAngle && <span className="pbp-pitch-angle">LA {p.launchAngle}°</span>}
                  {p.distance && <span className="pbp-pitch-dist">{p.distance} ft</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* At-bat log */}
      <div className="pbp-log">
        <div className="pbp-section-label">Play Log</div>
        {atBats.map((ab,i)=>{
          const res = ab.result;
          const about = ab.about;
          const abPitches = (ab.playEvents||[]).filter(e=>e.isPitch);
          const lastPitch = abPitches[abPitches.length-1];
          const inning = about ? `${about.halfInning==='top'?'▲':'▼'}${about.inning}` : '';
          const isHit = ['Single','Double','Triple','Home Run'].includes(res?.event);
          const isHR  = res?.event === 'Home Run';
          return (
            <div key={i} className={`pbp-ab-row ${isHR?'pbp-hr':isHit?'pbp-hit':''}`}>
              <div className="pbp-ab-header">
                <span className="pbp-ab-inning">{inning}</span>
                <span className="pbp-ab-batter">{ab.matchup?.batter?.fullName}</span>
                <span className="pbp-ab-result">{res?.event}</span>
                {abPitches.length > 0 && <span className="pbp-ab-pitches">{abPitches.length}p</span>}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   FOOTBALL PBP — ESPN API
══════════════════════════════════════════════════════════════ */
const FootballPBP = ({ eventId, sport, game }) => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const path = ESPN_PATHS[sport];

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${ESPN}/apis/site/v2/sports/${path}/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setData(d);
    } catch(e) {
      setError(e.message);
    }
  }, [eventId, path]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (error) return <div className="pbp-error">Could not load data: {error}</div>;
  if (!data)  return <div className="pbp-loading">Loading play-by-play…</div>;

  const header   = data.header;
  const comps    = header?.competitions?.[0];
  const home     = comps?.competitors?.find(c=>c.homeAway==='home');
  const away     = comps?.competitors?.find(c=>c.homeAway==='away');
  const status   = comps?.status?.type?.shortDetail || '';
  const plays    = data.drives?.previous?.flatMap(d=>(d.plays||[])) || [];
  const curDrive = data.drives?.current;
  const situation= data.situation;

  const downStr = (d,ds) => d ? `${d}${['st','nd','rd','th'][Math.min(d-1,3)]} & ${ds}` : '';

  return (
    <div className="pbp-football">
      {/* Scoreboard */}
      <div className="pbp-scoreboard">
        <div className="pbp-team">
          <span className="pbp-team-name">{away?.team?.abbreviation}</span>
          <span className="pbp-score">{away?.score || 0}</span>
        </div>
        <div className="pbp-inning-info">
          <div className="pbp-inning">{status}</div>
        </div>
        <div className="pbp-team">
          <span className="pbp-score">{home?.score || 0}</span>
          <span className="pbp-team-name">{home?.team?.abbreviation}</span>
        </div>
      </div>

      {/* Situation */}
      {situation && (
        <div className="pbp-football-situation">
          {situation.down > 0 && (
            <div className="pbp-situation-item">
              <span className="pbp-sit-label">Down</span>
              <span className="pbp-sit-val">{downStr(situation.down, situation.distance)}</span>
            </div>
          )}
          {situation.yardLine && (
            <div className="pbp-situation-item">
              <span className="pbp-sit-label">Field Position</span>
              <span className="pbp-sit-val">{situation.possessionText || `${situation.yardLine}`}</span>
            </div>
          )}
          {situation.possession && (
            <div className="pbp-situation-item">
              <span className="pbp-sit-label">Possession</span>
              <span className="pbp-sit-val">
                {comps?.competitors?.find(c=>c.team?.id===situation.possession)?.team?.abbreviation || '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Current drive */}
      {curDrive && (
        <div className="pbp-current-drive">
          <div className="pbp-section-label">Current Drive — {curDrive.team?.abbreviation}</div>
          <div className="pbp-drive-summary">
            {curDrive.yardLine && <span>{curDrive.yards || 0} yds</span>}
            {curDrive.plays?.length && <span>{curDrive.plays.length} plays</span>}
            {curDrive.description && <span>{curDrive.description}</span>}
          </div>
          {curDrive.plays?.slice(-5).reverse().map((p,i)=>(
            <div key={i} className={`pbp-play-row ${p.scoringPlay?'pbp-scoring':''}`}>
              <span className="pbp-play-clock">{p.clock?.displayValue}</span>
              <span className="pbp-play-text">{p.text}</span>
              {p.scoringPlay && <span className="pbp-play-score-badge">TD/Score</span>}
            </div>
          ))}
        </div>
      )}

      {/* Full play log */}
      <div className="pbp-log">
        <div className="pbp-section-label">Play Log</div>
        {[...plays].reverse().slice(0,50).map((p,i)=>(
          <div key={i} className={`pbp-play-row ${p.scoringPlay?'pbp-scoring':''}`}>
            <span className="pbp-play-clock">{p.period?.number && `Q${p.period.number}`} {p.clock?.displayValue}</span>
            <span className="pbp-play-text">{p.text || p.type?.text}</span>
            {p.scoringPlay && <span className="pbp-play-score-badge">⭐ Score</span>}
          </div>
        ))}
        {plays.length === 0 && <p className="pbp-empty">No plays yet.</p>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   BASKETBALL PBP — ESPN API
══════════════════════════════════════════════════════════════ */
const BasketballPBP = ({ eventId, sport, game }) => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${ESPN}/apis/site/v2/sports/${ESPN_PATHS[sport]}/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`${r.status}`);
      setData(await r.json());
    } catch(e) { setError(e.message); }
  }, [eventId, sport]);

  useEffect(() => { fetchData(); intervalRef.current = setInterval(fetchData, 15000); return ()=>clearInterval(intervalRef.current); }, [fetchData]);

  if (error) return <div className="pbp-error">Could not load data: {error}</div>;
  if (!data)  return <div className="pbp-loading">Loading…</div>;

  const comps   = data.header?.competitions?.[0];
  const home    = comps?.competitors?.find(c=>c.homeAway==='home');
  const away    = comps?.competitors?.find(c=>c.homeAway==='away');
  const status  = comps?.status?.type?.shortDetail || '';
  const plays   = data.plays || [];

  return (
    <div className="pbp-basketball">
      <div className="pbp-scoreboard">
        <div className="pbp-team">
          <span className="pbp-team-name">{away?.team?.abbreviation}</span>
          <span className="pbp-score">{away?.score || 0}</span>
        </div>
        <div className="pbp-inning-info"><div className="pbp-inning">{status}</div></div>
        <div className="pbp-team">
          <span className="pbp-score">{home?.score || 0}</span>
          <span className="pbp-team-name">{home?.team?.abbreviation}</span>
        </div>
      </div>
      <div className="pbp-log">
        <div className="pbp-section-label">Play Log</div>
        {[...plays].reverse().slice(0,60).map((p,i)=>{
          const isMake  = p.type?.text?.toLowerCase().includes('makes');
          const isMiss  = p.type?.text?.toLowerCase().includes('misses');
          const isFoul  = p.type?.text?.toLowerCase().includes('foul');
          return (
            <div key={i} className={`pbp-play-row ${isMake?'pbp-make':''} ${isMiss?'pbp-miss':''} ${isFoul?'pbp-foul':''}`}>
              <span className="pbp-play-clock">
                {p.period?.number && `Q${p.period.number}`} {p.clock?.displayValue}
              </span>
              <span className="pbp-play-team" style={{ color:'rgba(0,255,255,0.6)', fontSize:'0.75rem', marginRight:'6px' }}>
                {p.team?.abbreviation}
              </span>
              <span className="pbp-play-text">{p.text}</span>
              {p.scoreValue > 0 && <span className="pbp-play-pts">+{p.scoreValue}</span>}
            </div>
          );
        })}
        {plays.length === 0 && <p className="pbp-empty">No plays yet.</p>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   HOCKEY PBP — ESPN API
══════════════════════════════════════════════════════════════ */
const HockeyPBP = ({ eventId, game }) => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${ESPN}/apis/site/v2/sports/hockey/nhl/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`${r.status}`);
      setData(await r.json());
    } catch(e) { setError(e.message); }
  }, [eventId]);

  useEffect(() => { fetchData(); intervalRef.current = setInterval(fetchData, 15000); return ()=>clearInterval(intervalRef.current); }, [fetchData]);

  if (error) return <div className="pbp-error">Could not load data: {error}</div>;
  if (!data)  return <div className="pbp-loading">Loading…</div>;

  const comps  = data.header?.competitions?.[0];
  const home   = comps?.competitors?.find(c=>c.homeAway==='home');
  const away   = comps?.competitors?.find(c=>c.homeAway==='away');
  const status = comps?.status?.type?.shortDetail || '';
  const plays  = data.plays || [];

  return (
    <div className="pbp-hockey">
      <div className="pbp-scoreboard">
        <div className="pbp-team"><span className="pbp-team-name">{away?.team?.abbreviation}</span><span className="pbp-score">{away?.score||0}</span></div>
        <div className="pbp-inning-info"><div className="pbp-inning">{status}</div></div>
        <div className="pbp-team"><span className="pbp-score">{home?.score||0}</span><span className="pbp-team-name">{home?.team?.abbreviation}</span></div>
      </div>
      <div className="pbp-log">
        <div className="pbp-section-label">Play Log</div>
        {[...plays].reverse().slice(0,60).map((p,i)=>{
          const isGoal    = p.type?.text?.toLowerCase().includes('goal');
          const isPenalty = p.type?.text?.toLowerCase().includes('penalty');
          const isShot    = p.type?.text?.toLowerCase().includes('shot');
          return (
            <div key={i} className={`pbp-play-row ${isGoal?'pbp-scoring':''} ${isPenalty?'pbp-foul':''} ${isShot?'pbp-shot':''}`}>
              <span className="pbp-play-clock">P{p.period?.number} {p.clock?.displayValue}</span>
              <span className="pbp-play-text">{p.text}</span>
              {isGoal && <span className="pbp-play-score-badge">🚨 GOAL</span>}
              {isPenalty && <span className="pbp-play-penalty-badge">🔲 PEN</span>}
            </div>
          );
        })}
        {plays.length === 0 && <p className="pbp-empty">No plays yet.</p>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const PlayByPlay = ({ game, sport, onBack }) => {
  const isBaseball = sport === 'mlb' || sport.startsWith('milb_') || sport === 'cbb';
  const isFootball = sport === 'nfl' || sport === 'cfb';
  const isBasketball = sport === 'nba';
  const isHockey   = sport === 'nhl';

  // gamePk for baseball, eventId for ESPN sports
  const gamePk  = game?.gamePk || game?.id;
  const eventId = game?.espnId || game?.id;

  return (
    <div className="pbp-wrapper">
      <button className="pbp-back neon-button" onClick={onBack}>← Back to Scores</button>

      <div className="pbp-game-header">
        <span className="pbp-game-sport">{sport.toUpperCase()}</span>
        <h2 className="pbp-game-title">
          {game?.away_team || game?.awayTeam} vs {game?.home_team || game?.homeTeam}
        </h2>
        <div className="pbp-refresh-hint">Auto-refreshes every 15s</div>
      </div>

      {isBaseball   && <BaseballPBP gamePk={gamePk} game={game} />}
      {isFootball   && <FootballPBP eventId={eventId} sport={sport} game={game} />}
      {isBasketball && <BasketballPBP eventId={eventId} sport={sport} game={game} />}
      {isHockey     && <HockeyPBP eventId={eventId} game={game} />}
    </div>
  );
};

export default PlayByPlay;
