import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as Data from '../../../services/baseball/data';
import { simulateGame, applyBoxToRoster } from '../../../services/baseball/engine';

const RATING_COLORS = {
  contact: '#7fd8a0', power: '#e5533d', eye: '#ffb703', speed: '#5e9dff',
  fielding: '#c088ff', arm: '#ff8fa3',
  stuff: '#e5533d', control: '#ffb703', movement: '#7fd8a0', stamina: '#5e9dff', hold: '#c088ff',
};

function findUserTeam(data) {
  const { league, careerPlayerId, userTeamId } = data;
  if (userTeamId) return league.teams.find(t => t.id === userTeamId);
  if (careerPlayerId) return league.teams.find(t => t.roster.some(p => p.id === careerPlayerId));
  return league.teams[0];
}

function computeStandings(teams) {
  return [...teams].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses) || b.wins - a.wins);
}

function computeLeaders(teams) {
  const hitters = [], pitchers = [];
  teams.forEach(t => t.roster.forEach(p => {
    if (p.isPitcher) { if (p.season.ip > 0) pitchers.push({ ...p, teamAbbr: t.abbr }); }
    else if (p.season.ab > 0) hitters.push({ ...p, teamAbbr: t.abbr });
  }));
  const by = (arr, fn) => [...arr].sort((a, b) => fn(b) - fn(a)).slice(0, 5);
  return {
    avg: by(hitters, p => Data.battingAvg(p.season)),
    hr: by(hitters, p => p.season.hr),
    rbi: by(hitters, p => p.season.rbi),
    k: by(pitchers, p => p.season.k),
    era: by(pitchers.filter(p => p.season.ip >= 1), p => -Data.era(p.season)),
  };
}

export default function CareerHub({ session, onUpdate, onExitToMenu }) {
  const { data, meta } = session;
  const [screen, setScreen] = useState('home');
  const [lastResult, setLastResult] = useState(null);
  const [playerTab, setPlayerTab] = useState('profile');

  const userTeam = useMemo(() => findUserTeam(data), [data]);
  const isCareer = !!data.careerPlayerId;
  const careerPlayer = isCareer ? userTeam?.roster.find(p => p.id === data.careerPlayerId) : null;

  const standings = useMemo(() => computeStandings(data.league.teams), [data.league.teams]);
  const leaders = useMemo(() => computeLeaders(data.league.teams), [data.league.teams]);

  const nextGame = useMemo(() => {
    return data.schedule.find(g => !g.played && (g.home === userTeam?.id || g.away === userTeam?.id))
      || data.schedule.find(g => !g.played);
  }, [data.schedule, userTeam]);

  const recentGames = useMemo(() => {
    return [...data.schedule].filter(g => g.played && (g.home === userTeam?.id || g.away === userTeam?.id))
      .sort((a, b) => b.day - a.day).slice(0, 5);
  }, [data.schedule, userTeam]);

  const teamById = (id) => data.league.teams.find(t => t.id === id);

  const record = userTeam ? `${userTeam.wins}-${userTeam.losses}` : '0-0';

  const goHome = (next) => {
    onUpdate({ meta: { ...meta, record }, data: next || data });
    setScreen('home');
  };

  const playGame = () => {
    if (!nextGame) return;
    setScreen('game');
  };

  const resolveGame = () => {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    const result = simulateGame(home, away);
    applyBoxToRoster(home, result.boxHome);
    applyBoxToRoster(away, result.boxAway);
    home.wins += result.winner === 'home' ? 1 : 0;
    home.losses += result.winner === 'away' ? 1 : 0;
    away.wins += result.winner === 'away' ? 1 : 0;
    away.losses += result.winner === 'home' ? 1 : 0;
    home.runsFor += result.homeRuns; home.runsAgainst += result.awayRuns;
    away.runsFor += result.awayRuns; away.runsAgainst += result.homeRuns;
    nextGame.played = true;
    nextGame.result = { home: result.homeRuns, away: result.awayRuns };

    let news = data.news;
    let social = data.social || [];
    if (careerPlayer?.lastGame) {
      const lg = careerPlayer.lastGame;
      if (lg.hr >= 2) news = [`${careerPlayer.firstName} ${careerPlayer.lastName} goes deep twice as ${userTeam.city} ${result.winner === (nextGame.home === userTeam.id ? 'home' : 'away') ? 'win' : 'fall'}!`, ...news].slice(0, 6);
      if (lg.h >= 3) social = [{ user: careerPlayer, text: `${lg.h}-hit night. Just doing my job.` }, ...social].slice(0, 8);
    }
    const nextData = { ...data, news, social };
    setLastResult({ result, home, away, userIsHome: nextGame.home === userTeam.id });
    onUpdate({ meta: { ...meta, record }, data: nextData });
    setScreen('boxscore');
  };

  if (screen === 'matchup' && nextGame) {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    return (
      <MatchupScreen
        home={home} away={away} userTeam={userTeam} careerPlayer={careerPlayer}
        onBack={() => setScreen('home')} onStart={playGame}
      />
    );
  }

  if (screen === 'game' && nextGame) {
    return <LiveGameScreen onDone={resolveGame} />;
  }

  if (screen === 'boxscore' && lastResult) {
    return (
      <BoxScoreScreen
        lastResult={lastResult} careerPlayer={careerPlayer}
        onContinue={() => goHome()}
      />
    );
  }

  if (screen === 'standings') {
    return <StandingsScreen standings={standings} userTeamId={userTeam?.id} onBack={() => setScreen('home')} />;
  }

  if (screen === 'leaders') {
    return <LeadersScreen leaders={leaders} onBack={() => setScreen('home')} />;
  }

  if (screen === 'social') {
    return <SocialScreen social={data.social || []} player={careerPlayer} onBack={() => setScreen('home')} />;
  }

  if (screen === 'myplayer' && careerPlayer) {
    return (
      <MyPlayerScreen
        player={careerPlayer} team={userTeam} tab={playerTab} setTab={setPlayerTab}
        onBack={() => setScreen('home')}
        onSpend={(category, key) => {
          const p = careerPlayer;
          if (p.skillPoints > 0) {
            p.ratings[key] = Math.min(99, p.ratings[key] + 1);
            p.skillPoints -= 1;
            onUpdate({ meta, data: { ...data } });
          }
        }}
      />
    );
  }

  if (screen === 'roster') {
    return <RosterScreen team={userTeam} onBack={() => setScreen('home')} />;
  }

  return (
    <HomeScreen
      data={data} meta={meta} userTeam={userTeam} record={record}
      nextGame={nextGame} recentGames={recentGames} teamById={teamById}
      isCareer={isCareer}
      onGoMatchup={() => setScreen('matchup')}
      onStandings={() => setScreen('standings')}
      onLeaders={() => setScreen('leaders')}
      onMyPlayer={() => setScreen(isCareer ? 'myplayer' : 'roster')}
      onSocial={() => setScreen('social')}
      onExit={onExitToMenu}
    />
  );
}

// ── Season hub (mirrors Hoop Land's league dashboard) ─────────
function HomeScreen({ data, userTeam, record, nextGame, recentGames, teamById, isCareer, onGoMatchup, onStandings, onLeaders, onMyPlayer, onSocial, onExit }) {
  const standingsTop = computeStandings(data.league.teams).slice(0, 8);
  return (
    <div className="dl-screen">
      <div className="dl-topbar">
        <div className="dl-chip">⚾ Y1 {data.league.year}</div>
        <div className="dl-ticker">{data.league.name.toUpperCase()}</div>
        <div className="dl-coins">🪙 40</div>
      </div>

      <div className="dl-grid dl-grid-3">
        <div className="dl-panel">
          <div className="dl-panel-title">Top Story</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--dl-text-dim)' }}>{data.news[0] || 'A new season begins.'}</p>
        </div>
        <div className="dl-panel">
          <div className="dl-panel-title">{userTeam?.city} {userTeam?.name}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dl-amber)' }}>{record}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--dl-text-faint)' }}>Runs {userTeam?.runsFor}-{userTeam?.runsAgainst}</div>
        </div>
        <div className="dl-panel">
          <div className="dl-panel-title">Up Next</div>
          {nextGame ? (
            <div style={{ fontSize: '0.85rem' }}>
              {teamById(nextGame.home).abbr} vs {teamById(nextGame.away).abbr}
              <div style={{ color: 'var(--dl-text-faint)', fontSize: '0.75rem' }}>Day {nextGame.day}</div>
            </div>
          ) : <div style={{ color: 'var(--dl-text-faint)' }}>Season complete</div>}
        </div>
      </div>

      <div className="dl-grid dl-grid-2" style={{ marginTop: 12 }}>
        <div className="dl-panel">
          <div className="dl-panel-title">Recent Games</div>
          {recentGames.length === 0 && <div className="dl-empty">No games played yet</div>}
          {recentGames.map(g => (
            <div key={g.id} className="dl-row">
              <span>{teamById(g.away).abbr} {g.result?.away}</span>
              <span style={{ color: 'var(--dl-text-faint)' }}>@</span>
              <span>{teamById(g.home).abbr} {g.result?.home}</span>
            </div>
          ))}
        </div>
        <div className="dl-panel">
          <div className="dl-panel-title">Rankings</div>
          {standingsTop.map((t, i) => (
            <div key={t.id} className="dl-row">
              <span>{i + 1}. {t.abbr} {t.city}</span>
              <span className="dl-badge">{t.wins}-{t.losses}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dl-panel" style={{ marginTop: 12 }}>
        <div className="dl-grid dl-grid-4">
          <button className="dl-btn" onClick={onMyPlayer}>{isCareer ? '🧢 My Player' : '📋 My Team'}</button>
          <button className="dl-btn" onClick={onStandings}>📊 Standings</button>
          <button className="dl-btn" onClick={onLeaders}>🌟 Leaders</button>
          <button className="dl-btn" onClick={onSocial}>💬 Diamond Wire</button>
        </div>
      </div>

      <div className="dl-footer-nav">
        <button className="dl-btn dl-btn-ghost" onClick={onExit}>← Save &amp; Exit</button>
        <button className="dl-btn dl-btn-primary" onClick={onGoMatchup} disabled={!nextGame}>CONTINUE ▶</button>
      </div>
    </div>
  );
}

function MatchupScreen({ home, away, userTeam, careerPlayer, onBack, onStart }) {
  const [control, setControl] = useState('play');
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Team Matchup</div>
        <div className="dl-grid dl-grid-2">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem' }}>⚾</div>
            <div style={{ fontWeight: 800 }}>{away.city}</div>
            <div style={{ color: 'var(--dl-text-dim)' }}>{away.name}</div>
            <div className="dl-badge" style={{ marginTop: 6 }}>{away.wins}-{away.losses}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem' }}>⚾</div>
            <div style={{ fontWeight: 800 }}>{home.city}</div>
            <div style={{ color: 'var(--dl-text-dim)' }}>{home.name}</div>
            <div className="dl-badge" style={{ marginTop: 6 }}>{home.wins}-{home.losses}</div>
          </div>
        </div>

        {careerPlayer && (
          <div className="dl-panel" style={{ marginTop: 12 }}>
            <div className="dl-panel-title">Player Control</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['play', 'sim', 'rest'].map(c => (
                <button key={c} className={`dl-btn ${control === c ? 'dl-btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setControl(c)}>
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--dl-text-faint)', marginTop: 8 }}>
              {control === 'play' ? `${careerPlayer.firstName} ${careerPlayer.lastName} starts at ${careerPlayer.position}.`
                : control === 'sim' ? 'Simulate this game without controlling your player.'
                : 'Rest your player for this game.'}
            </p>
          </div>
        )}

        <div className="dl-footer-nav">
          <button className="dl-back" onClick={onBack}>←</button>
          <button className="dl-btn dl-btn-primary" onClick={onStart}>START GAME</button>
        </div>
      </div>
    </div>
  );
}

// ── Live game: plays back a pre-computed log with simple pacing ──
function LiveGameScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const timer = useRef(null);
  const total = 46; // fake pacing steps before resolving — placeholder animation

  useEffect(() => {
    timer.current = setInterval(() => {
      setProgress(p => {
        if (p >= total) { clearInterval(timer.current); return p; }
        return p + speed;
      });
    }, 90);
    return () => clearInterval(timer.current);
  }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (progress >= total) onDone();
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.min(100, Math.round((progress / total) * 100));
  const inningEstimate = Math.min(9, 1 + Math.floor(pct / 11));

  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Simulating Game — {inningEstimate === 9 && pct > 90 ? 'Bottom 9th' : `Inning ${inningEstimate}`}</div>
        <div className="dl-field">
          <div className="dl-mound" />
          <div className="dl-diamond">
            <div className="dl-base" style={{ left: '0%', top: '0%' }} />
            <div className="dl-base" style={{ left: '100%', top: '0%' }} />
            <div className="dl-base" style={{ left: '100%', top: '100%' }} />
            <div className="dl-base" style={{ left: '0%', top: '100%' }} />
          </div>
          <div className="dl-pitcher" style={{ left: '50%', top: '58%' }}>🧑‍🦱</div>
          <div className="dl-batter" style={{ left: '46%', top: '86%' }}>🏏</div>
        </div>
        <div className="dl-bar-track" style={{ marginTop: 12 }}>
          <div className="dl-bar-fill" style={{ width: `${pct}%`, background: 'var(--dl-amber)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button className={`dl-btn dl-btn-sm ${speed === 1 ? 'dl-btn-primary' : ''}`} onClick={() => setSpeed(1)}>1x</button>
          <button className={`dl-btn dl-btn-sm ${speed === 3 ? 'dl-btn-primary' : ''}`} onClick={() => setSpeed(3)}>3x</button>
          <button className="dl-btn dl-btn-sm" onClick={() => setProgress(total)}>Skip to Result ▶▶</button>
        </div>
      </div>
    </div>
  );
}

function BoxScoreScreen({ lastResult, careerPlayer, onContinue }) {
  const { result, home, away } = lastResult;
  const playerLine = careerPlayer?.lastGame;
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Final Score</div>
        <div style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 800 }}>
          {away.city} {result.awayRuns} — {home.city} {result.homeRuns}
        </div>
        {careerPlayer && playerLine && (
          <div className="dl-panel" style={{ marginTop: 12 }}>
            <div className="dl-panel-title">{careerPlayer.firstName} {careerPlayer.lastName} — Box Line</div>
            <div className="dl-grid dl-grid-4" style={{ textAlign: 'center' }}>
              <Stat label="AB" v={playerLine.ab} /><Stat label="H" v={playerLine.h} />
              <Stat label="HR" v={playerLine.hr} /><Stat label="RBI" v={playerLine.rbi} />
            </div>
          </div>
        )}
        <div className="dl-log" style={{ marginTop: 12 }}>
          {result.log.filter(l => l.type === 'play' || l.type === 'final').slice(-25).map((l, i) => (
            <div key={i} className={`dl-log-line ${l.type === 'final' ? 'hl' : ''}`}>{l.text}</div>
          ))}
        </div>
        <div className="dl-footer-nav">
          <button className="dl-btn dl-btn-primary dl-btn-block" onClick={onContinue}>CONTINUE</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }) {
  return <div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dl-amber)' }}>{v}</div><div style={{ fontSize: '0.68rem', color: 'var(--dl-text-faint)' }}>{label}</div></div>;
}

function StandingsScreen({ standings, userTeamId, onBack }) {
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Standings</div>
        <table className="dl-stat-table">
          <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>PCT</th></tr></thead>
          <tbody>
            {standings.map((t, i) => (
              <tr key={t.id} style={t.id === userTeamId ? { color: 'var(--dl-amber)' } : undefined}>
                <td>{i + 1}</td><td>{t.city} {t.name}</td><td>{t.wins}</td><td>{t.losses}</td>
                <td>{(t.wins + t.losses) > 0 ? (t.wins / (t.wins + t.losses)).toFixed(3) : '.000'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
      </div>
    </div>
  );
}

function LeadersScreen({ leaders, onBack }) {
  const rows = [
    { title: 'Batting Average', list: leaders.avg, fmt: p => Data.fmtAvg(Data.battingAvg(p.season)) },
    { title: 'Home Runs', list: leaders.hr, fmt: p => p.season.hr },
    { title: 'RBI', list: leaders.rbi, fmt: p => p.season.rbi },
    { title: 'Strikeouts (P)', list: leaders.k, fmt: p => p.season.k },
    { title: 'ERA', list: leaders.era, fmt: p => Data.fmtEra(Data.era(p.season)) },
  ];
  return (
    <div className="dl-screen">
      <div className="dl-grid dl-grid-2">
        {rows.map(r => (
          <div className="dl-panel" key={r.title}>
            <div className="dl-panel-title">{r.title}</div>
            {r.list.length === 0 && <div className="dl-empty">No qualifiers yet</div>}
            {r.list.map((p, i) => (
              <div key={p.id} className="dl-row">
                <span>{i + 1}. {p.firstName[0]}. {p.lastName} <span style={{ color: 'var(--dl-text-faint)' }}>({p.teamAbbr})</span></span>
                <span className="dl-badge">{r.fmt(p)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
    </div>
  );
}

function SocialScreen({ social, player, onBack }) {
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Diamond Wire</div>
        {social.length === 0 && <div className="dl-empty">No posts yet — put up a big game to get noticed.</div>}
        {social.map((s, i) => (
          <div key={i} className="dl-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <strong>{s.user.firstName} {s.user.lastName}</strong>
            <span style={{ color: 'var(--dl-text-dim)', fontSize: '0.82rem' }}>{s.text}</span>
          </div>
        ))}
        <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
      </div>
    </div>
  );
}

function MyPlayerScreen({ player, team, tab, setTab, onBack, onSpend }) {
  const ratingKeys = Object.keys(player.ratings);
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-tabs">
          <button className={`dl-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
          <button className={`dl-tab ${tab === 'upgrades' ? 'active' : ''}`} onClick={() => setTab('upgrades')}>Upgrades</button>
        </div>

        {tab === 'profile' && (
          <>
            <div className="dl-grid dl-grid-2">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="dl-sprite" style={{ background: player.appearance.jerseyPrimary }}>🧑‍🦱</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{player.firstName} {player.lastName}</div>
                  <div style={{ color: 'var(--dl-text-dim)', fontSize: '0.8rem' }}>{team?.city} {team?.name} · #{player.number} · {player.position}</div>
                  <div style={{ color: 'var(--dl-text-faint)', fontSize: '0.75rem' }}>{player.archetype} · Age {player.age}</div>
                </div>
              </div>
              <div>
                <div className="dl-panel-title">Season Stats</div>
                {player.isPitcher ? (
                  <div className="dl-grid dl-grid-4">
                    <Stat label="IP" v={player.season.ip.toFixed(1)} /><Stat label="K" v={player.season.k} />
                    <Stat label="ERA" v={Data.fmtEra(Data.era(player.season))} /><Stat label="BB" v={player.season.bb} />
                  </div>
                ) : (
                  <div className="dl-grid dl-grid-4">
                    <Stat label="AVG" v={Data.fmtAvg(Data.battingAvg(player.season))} /><Stat label="HR" v={player.season.hr} />
                    <Stat label="RBI" v={player.season.rbi} /><Stat label="H" v={player.season.h} />
                  </div>
                )}
              </div>
            </div>
            <div className="dl-panel" style={{ marginTop: 12 }}>
              <div className="dl-panel-title">Career Highs</div>
              <div className="dl-grid dl-grid-4">
                {Object.entries(player.careerHighs).map(([k, v]) => <Stat key={k} label={k.toUpperCase()} v={v} />)}
              </div>
            </div>
          </>
        )}

        {tab === 'upgrades' && (
          <>
            <div style={{ marginBottom: 10, fontSize: '0.85rem' }}>Skill Points: <strong style={{ color: 'var(--dl-amber)' }}>{player.skillPoints}</strong></div>
            {ratingKeys.map(k => (
              <div key={k} className="dl-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'capitalize', marginBottom: 4 }}>{k}</div>
                  <div className="dl-bar-track"><div className="dl-bar-fill" style={{ width: `${player.ratings[k]}%`, background: RATING_COLORS[k] || 'var(--dl-amber)' }} /></div>
                </div>
                <span className="dl-badge">{player.ratings[k]}</span>
                <button className="dl-btn dl-btn-sm" disabled={player.skillPoints <= 0} onClick={() => onSpend('rating', k)}>+1</button>
              </div>
            ))}
          </>
        )}

        <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
      </div>
    </div>
  );
}

function RosterScreen({ team, onBack }) {
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">{team.city} {team.name} — Roster</div>
        <table className="dl-stat-table">
          <thead><tr><th>#</th><th>Name</th><th>Pos</th><th>AVG/ERA</th></tr></thead>
          <tbody>
            {team.roster.map(p => (
              <tr key={p.id}>
                <td>{p.number}</td><td>{p.firstName} {p.lastName}</td><td>{p.position}</td>
                <td>{p.isPitcher ? Data.fmtEra(Data.era(p.season)) : Data.fmtAvg(Data.battingAvg(p.season))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
      </div>
    </div>
  );
}
