import React, { useState, useMemo } from 'react';
import * as Data from '../../../services/baseball/data';
import { simulateGame, applyBoxToRoster } from '../../../services/baseball/engine';
import GameDayScreen from './GameDayScreen';
import MultiplayerLobbyScreen from './MultiplayerLobbyScreen';
import MultiplayerGameScreen from './MultiplayerGameScreen';

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
  const [playerControl, setPlayerControl] = useState('play'); // play | sim | rest
  const [draftState, setDraftState] = useState(null);
  const [manageTeamId, setManageTeamId] = useState(null);
  const [tradePlayer, setTradePlayer] = useState(null);
  const [mpConfig, setMpConfig] = useState(null);
  const [simming, setSimming] = useState(false);

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

  // Called once a result exists — whether it came from the instant AI-vs-AI
  // sim or from the user having played every prompt out live.
  // Roll injuries for anyone who appeared, then let one day of recovery
  // pass for the rest of each roster (a simple stand-in for the calendar).
  const applyInjuryRolls = (team, box) => {
    team.roster.forEach(p => {
      const line = box[p.id];
      const appeared = line && (p.isPitcher ? ((line.outs || 0) > 0 || (line.ip || 0) > 0) : ((line.ab || 0) > 0 || (line.bb || 0) > 0));
      if (appeared) {
        const workload = p.isPitcher ? Math.min(2, ((line.outs || 0) / 3 + (line.ip || 0)) / 3) : Math.min(2, (line.ab || 0) / 4);
        Data.rollInjury(p, workload);
      } else {
        Data.healOneGame(p);
      }
    });
  };

  const finalizeGameResult = (result) => {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    applyBoxToRoster(home, result.boxHome);
    applyBoxToRoster(away, result.boxAway);
    applyInjuryRolls(home, result.boxHome);
    applyInjuryRolls(away, result.boxAway);
    home.wins += result.winner === 'home' ? 1 : 0;
    home.losses += result.winner === 'away' ? 1 : 0;
    away.wins += result.winner === 'away' ? 1 : 0;
    away.losses += result.winner === 'home' ? 1 : 0;
    home.runsFor += result.homeRuns; home.runsAgainst += result.awayRuns;
    away.runsFor += result.awayRuns; away.runsAgainst += result.homeRuns;
    nextGame.played = true;
    nextGame.result = { home: result.homeRuns, away: result.awayRuns };

    let xpGained = 0, levelsGained = 0;
    if (careerPlayer) {
      xpGained = Data.xpForGame(careerPlayer.lastGame, careerPlayer.isPitcher);
      levelsGained = Data.awardXp(careerPlayer, xpGained);
    }

    let news = data.news;
    let social = data.social || [];
    if (careerPlayer?.lastGame) {
      const lg = careerPlayer.lastGame;
      if (lg.hr >= 2) news = [`${careerPlayer.firstName} ${careerPlayer.lastName} goes deep twice as ${userTeam.city} ${result.winner === (nextGame.home === userTeam.id ? 'home' : 'away') ? 'win' : 'fall'}!`, ...news].slice(0, 6);
      if (lg.h >= 3) social = [{ user: careerPlayer, text: `${lg.h}-hit night. Just doing my job.` }, ...social].slice(0, 8);
      if (careerPlayer.injury) news = [`${careerPlayer.firstName} ${careerPlayer.lastName} leaves with a ${careerPlayer.injury.type.toLowerCase()} — expected out ${careerPlayer.injury.totalGames} games.`, ...news].slice(0, 6);
    }
    const nextData = { ...data, news, social };
    setLastResult({ result, home, away, userIsHome: nextGame.home === userTeam.id, xpGained, levelsGained });
    onUpdate({ meta: { ...meta, record }, data: nextData });
    setScreen('boxscore');
  };

  // ── Offseason / draft ──────────────────────────────────────
  function processDraftUntilUserTurn(state) {
    let { pickSequence, pickIdx, available, log } = state;
    available = [...available];
    log = [...log];
    while (pickIdx < pickSequence.length && pickSequence[pickIdx] !== userTeam?.id) {
      const team = teamById(pickSequence[pickIdx]);
      if (available.length === 0 || !team) break;
      available.sort((a, b) => Data.overallRating(b) - Data.overallRating(a));
      const p = available.shift();
      team.roster.push(p);
      log = [...log, `${team.city} ${team.name} select ${p.firstName} ${p.lastName} (${p.position}).`];
      pickIdx++;
    }
    return { pickSequence, pickIdx, available, log };
  }

  const startDraft = () => {
    const rounds = 5;
    const order = Data.draftOrder(data.league.teams);
    const pickSequence = [];
    for (let r = 0; r < rounds; r++) order.forEach(t => pickSequence.push(t.id));
    const available = Data.generateDraftClass(pickSequence.length + 10);
    const initial = processDraftUntilUserTurn({ pickSequence, pickIdx: 0, available, log: [] });
    setDraftState(initial);
    setScreen('draft');
  };

  const userDraftPick = (prospect) => {
    const team = teamById(draftState.pickSequence[draftState.pickIdx]);
    team.roster.push(prospect);
    const stepped = {
      ...draftState,
      available: draftState.available.filter(p => p.id !== prospect.id),
      pickIdx: draftState.pickIdx + 1,
      log: [...draftState.log, `${team.city} ${team.name} select ${prospect.firstName} ${prospect.lastName} (${prospect.position}).`],
    };
    setDraftState(processDraftUntilUserTurn(stepped));
  };

  const autoFinishDraft = () => {
    let state = draftState;
    while (state.pickIdx < state.pickSequence.length) {
      if (state.pickSequence[state.pickIdx] === userTeam?.id) {
        const best = [...state.available].sort((a, b) => Data.overallRating(b) - Data.overallRating(a))[0];
        const team = teamById(state.pickSequence[state.pickIdx]);
        team.roster.push(best);
        state = {
          ...state,
          available: state.available.filter(p => p.id !== best.id),
          pickIdx: state.pickIdx + 1,
          log: [...state.log, `${team.city} ${team.name} select ${best.firstName} ${best.lastName} (${best.position}).`],
        };
      }
      state = processDraftUntilUserTurn(state);
    }
    setDraftState(state);
  };

  const finishOffseason = () => {
    let userFreeAgents = [];
    let userRetirees = [];
    data.league.teams.forEach(t => {
      const protectedId = isCareer && t.id === userTeam?.id ? data.careerPlayerId : null;
      const { roster, organization, retirees, freeAgents } = Data.advanceRosterForNewSeason(t.roster, { protectedId, organization: t.organization || [] });
      t.roster = roster;
      t.organization = organization;
      t.wins = 0; t.losses = 0; t.runsFor = 0; t.runsAgainst = 0; t.streak = 0;
      if (t.id === userTeam?.id) { userFreeAgents = freeAgents; userRetirees = retirees; }
    });
    if (careerPlayer) careerPlayer.yearsPro = (careerPlayer.yearsPro || 0) + 1;
    data.league.year += 1;
    const totalGames = data.totalGames || 30;
    const newSchedule = Data.generateSchedule(data.league.teams, totalGames);
    let offseasonNews = [`Year ${data.league.year} begins!`, ...data.news];
    if (userRetirees.length) offseasonNews = [`${userRetirees.map(p => `${p.firstName} ${p.lastName}`).join(', ')} retired.`, ...offseasonNews];
    if (userFreeAgents.length) offseasonNews = [`${userFreeAgents.map(p => `${p.firstName} ${p.lastName}`).join(', ')} hit free agency and left ${userTeam?.city}.`, ...offseasonNews];
    const nextData = { ...data, schedule: newSchedule, news: offseasonNews.slice(0, 6) };
    onUpdate({ meta: { ...meta, record: '0-0' }, data: nextData });
    setDraftState(null);
    setScreen('home');
  };

  // ── Roster management: release / trade (Franchise on your own
  // team; Commissioner on any team via the League Office) ───────
  const isCommissioner = meta.mode === 'commissioner';
  const manageTeam = teamById(manageTeamId) || userTeam;

  const canRelease = (team, player) => {
    const hitters = team.roster.filter(p => !p.isPitcher).length;
    const pitchers = team.roster.filter(p => p.isPitcher).length;
    if (!player.isPitcher && hitters <= 9) return false;
    if (player.isPitcher && pitchers <= 2) return false;
    return true;
  };

  const releasePlayer = (team, player) => {
    if (player.id === data.careerPlayerId) { alert("You can't release yourself."); return; }
    if (!canRelease(team, player)) { alert('Roster is already at the minimum needed to field a full team.'); return; }
    if (!window.confirm(`Release ${player.firstName} ${player.lastName}? This can't be undone.`)) return;
    team.roster = team.roster.filter(p => p.id !== player.id);
    onUpdate({ meta: { ...meta, record }, data: { ...data } });
  };

  const proposeTrade = (myTeam, myPlayer, theirTeam, theirPlayer) => {
    if (myPlayer.id === data.careerPlayerId) return { accepted: false, reason: "You can't trade yourself." };
    const myValue = Data.overallRating(myPlayer);
    const theirValue = Data.overallRating(theirPlayer);
    const noise = (Math.random() - 0.5) * 14;
    const accepted = (myValue + noise) >= theirValue;
    if (accepted) {
      myTeam.roster = myTeam.roster.filter(p => p.id !== myPlayer.id).concat([theirPlayer]);
      theirTeam.roster = theirTeam.roster.filter(p => p.id !== theirPlayer.id).concat([myPlayer]);
      onUpdate({ meta: { ...meta, record }, data: { ...data } });
    }
    return { accepted };
  };

  const callUpPlayer = (team, playerId) => {
    Data.callUp(team, playerId);
    onUpdate({ meta: { ...meta, record }, data: { ...data } });
  };
  const sendDownPlayer = (team, playerId) => {
    if (playerId === data.careerPlayerId) { alert("You can't option yourself to the minors."); return; }
    if (!canRelease(team, team.roster.find(p => p.id === playerId))) { alert('Roster is already at the minimum needed to field a full team.'); return; }
    Data.sendDown(team, playerId);
    onUpdate({ meta: { ...meta, record }, data: { ...data } });
  };

  const simAllRemaining = () => {
    setSimming(true);
    setTimeout(() => {
      data.schedule.filter(g => !g.played).forEach(g => {
        const home = teamById(g.home), away = teamById(g.away);
        const result = simulateGame(home, away);
        applyBoxToRoster(home, result.boxHome);
        applyBoxToRoster(away, result.boxAway);
        applyInjuryRolls(home, result.boxHome);
        applyInjuryRolls(away, result.boxAway);
        home.wins += result.winner === 'home' ? 1 : 0; home.losses += result.winner === 'away' ? 1 : 0;
        away.wins += result.winner === 'away' ? 1 : 0; away.losses += result.winner === 'home' ? 1 : 0;
        home.runsFor += result.homeRuns; home.runsAgainst += result.awayRuns;
        away.runsFor += result.awayRuns; away.runsAgainst += result.homeRuns;
        g.played = true; g.result = { home: result.homeRuns, away: result.awayRuns };
      });
      onUpdate({ meta: { ...meta, record }, data: { ...data } });
      setSimming(false);
      setScreen('home');
    }, 50);
  };

  if (screen === 'matchup' && nextGame) {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    return (
      <MatchupScreen
        home={home} away={away} userTeam={userTeam} careerPlayer={careerPlayer}
        control={playerControl} setControl={setPlayerControl}
        onBack={() => setScreen('home')} onStart={playGame}
        onPlayVsFriend={() => setScreen('mpLobby')}
      />
    );
  }

  if (screen === 'mpLobby' && nextGame) {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    const mySide = nextGame.home === userTeam?.id ? 'home' : 'away';
    return (
      <MultiplayerLobbyScreen
        home={home} away={away} mySide={mySide}
        defaultControlledId={data.careerPlayerId || null}
        onBack={() => setScreen('matchup')}
        onStart={(cfg) => { setMpConfig(cfg); setScreen('mpGame'); }}
      />
    );
  }

  if (screen === 'mpGame' && nextGame && mpConfig) {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    return (
      <MultiplayerGameScreen
        home={home} away={away}
        roomCode={mpConfig.roomCode} isHost={mpConfig.isHost} mySide={mpConfig.mySide}
        transport={mpConfig.transport} relayUrl={mpConfig.relayUrl}
        controlledHomeId={mpConfig.controlledHomeId} controlledAwayId={mpConfig.controlledAwayId}
        onDone={finalizeGameResult}
        onExit={() => { setMpConfig(null); setScreen('home'); }}
      />
    );
  }

  if (screen === 'game' && nextGame) {
    const home = teamById(nextGame.home), away = teamById(nextGame.away);
    const interactive = isCareer && playerControl === 'play' && !!careerPlayer;
    return (
      <GameDayScreen
        home={home} away={away} careerPlayer={interactive ? careerPlayer : null}
        onDone={finalizeGameResult}
      />
    );
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
    return (
      <RosterScreen
        team={manageTeam} careerPlayerId={data.careerPlayerId}
        canManage={isCommissioner || manageTeam?.id === userTeam?.id}
        onRelease={(p) => releasePlayer(manageTeam, p)}
        onTrade={(p) => { setTradePlayer(p); setScreen('trade'); }}
        onSendDown={(p) => sendDownPlayer(manageTeam, p.id)}
        onOrganization={() => setScreen('organization')}
        onBack={() => setScreen(isCommissioner ? 'leagueOffice' : 'home')}
      />
    );
  }

  if (screen === 'organization') {
    return (
      <OrganizationScreen
        team={manageTeam}
        canManage={isCommissioner || manageTeam?.id === userTeam?.id}
        onCallUp={(p) => callUpPlayer(manageTeam, p.id)}
        onBack={() => setScreen('roster')}
      />
    );
  }

  if (screen === 'trade' && tradePlayer) {
    return (
      <TradeScreen
        myTeam={manageTeam} myPlayer={tradePlayer} allTeams={data.league.teams}
        onPropose={(theirTeam, theirPlayer) => proposeTrade(manageTeam, tradePlayer, theirTeam, theirPlayer)}
        onDone={() => { setTradePlayer(null); setScreen('roster'); }}
      />
    );
  }

  if (screen === 'leagueOffice') {
    return (
      <LeagueOfficeScreen
        teams={data.league.teams} userTeamId={userTeam?.id} simming={simming}
        remainingGames={data.schedule.filter(g => !g.played).length}
        onManageTeam={(id) => { setManageTeamId(id); setScreen('roster'); }}
        onSimAll={simAllRemaining}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'offseason') {
    return (
      <OffseasonScreen
        standings={standings} year={data.league.year} userTeamId={userTeam?.id}
        onEnterDraft={startDraft} onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'draft' && draftState) {
    const onTheClock = teamById(draftState.pickSequence[draftState.pickIdx]);
    const isUserTurn = onTheClock?.id === userTeam?.id;
    const draftDone = draftState.pickIdx >= draftState.pickSequence.length;
    return (
      <DraftScreen
        draftState={draftState} onTheClock={onTheClock} isUserTurn={isUserTurn} draftDone={draftDone}
        onPick={userDraftPick} onAutoRest={autoFinishDraft} onFinish={finishOffseason}
      />
    );
  }

  return (
    <HomeScreen
      data={data} meta={meta} userTeam={userTeam} record={record}
      nextGame={nextGame} recentGames={recentGames} teamById={teamById}
      isCareer={isCareer} isCommissioner={isCommissioner}
      onGoMatchup={() => setScreen('matchup')}
      onStandings={() => setScreen('standings')}
      onLeaders={() => setScreen('leaders')}
      onMyPlayer={() => { setManageTeamId(userTeam?.id || null); setScreen(isCareer ? 'myplayer' : 'roster'); }}
      onSocial={() => setScreen('social')}
      onOffseason={() => setScreen('offseason')}
      onLeagueOffice={() => setScreen('leagueOffice')}
      onExit={onExitToMenu}
    />
  );
}

// ── Season hub (mirrors Hoop Land's league dashboard) ─────────
function HomeScreen({ data, userTeam, record, nextGame, recentGames, teamById, isCareer, isCommissioner, onGoMatchup, onStandings, onLeaders, onMyPlayer, onSocial, onOffseason, onLeagueOffice, onExit }) {
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
          {isCommissioner && <button className="dl-btn dl-btn-primary" onClick={onLeagueOffice}>🏛️ League Office</button>}
        </div>
      </div>

      <div className="dl-footer-nav">
        <button className="dl-btn dl-btn-ghost" onClick={onExit}>← Save &amp; Exit</button>
        {nextGame
          ? <button className="dl-btn dl-btn-primary" onClick={onGoMatchup}>CONTINUE ▶</button>
          : <button className="dl-btn dl-btn-primary" onClick={onOffseason}>🏆 SEASON COMPLETE — ENTER OFFSEASON</button>}
      </div>
    </div>
  );
}

function MatchupScreen({ home, away, userTeam, careerPlayer, control, setControl, onBack, onStart, onPlayVsFriend }) {
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
              {control === 'play' ? `You'll bat${careerPlayer.isPitcher ? ' — er, pitch' : ''} and call steals yourself as ${careerPlayer.firstName} ${careerPlayer.lastName} (${careerPlayer.position}). Everyone else plays out automatically.`
                : control === 'sim' ? 'Simulate this game without controlling your player.'
                : 'Rest your player for this game.'}
            </p>
          </div>
        )}

        <div className="dl-footer-nav">
          <button className="dl-back" onClick={onBack}>←</button>
          <button className="dl-btn dl-btn-ghost" onClick={onPlayVsFriend}>Play vs Friend (Local)</button>
          <button className="dl-btn dl-btn-primary" onClick={onStart}>START GAME</button>
        </div>
      </div>
    </div>
  );
}


function BoxScoreScreen({ lastResult, careerPlayer, onContinue }) {
  const { result, home, away, xpGained, levelsGained } = lastResult;
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
            {careerPlayer.isPitcher ? (
              <div className="dl-grid dl-grid-4" style={{ textAlign: 'center' }}>
                <Stat label="IP" v={playerLine.ip?.toFixed(1)} /><Stat label="K" v={playerLine.k} />
                <Stat label="ER" v={playerLine.er} /><Stat label="BB" v={playerLine.bb} />
              </div>
            ) : (
              <div className="dl-grid dl-grid-4" style={{ textAlign: 'center' }}>
                <Stat label="AB" v={playerLine.ab} /><Stat label="H" v={playerLine.h} />
                <Stat label="HR" v={playerLine.hr} /><Stat label="RBI" v={playerLine.rbi} />
              </div>
            )}
            {!!xpGained && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.8rem', color: 'var(--dl-amber)' }}>
                +{xpGained} XP {levelsGained > 0 && <strong>· LEVEL UP! Now level {careerPlayer.level} (+{levelsGained} skill pt{levelsGained > 1 ? 's' : ''})</strong>}
              </div>
            )}
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

function OffseasonScreen({ standings, year, userTeamId, onEnterDraft, onBack }) {
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Year {year} — Final Standings</div>
        <table className="dl-stat-table">
          <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th></tr></thead>
          <tbody>
            {standings.slice(0, 10).map((t, i) => (
              <tr key={t.id} style={t.id === userTeamId ? { color: 'var(--dl-amber)' } : undefined}>
                <td>{i + 1}</td><td>{t.city} {t.name}</td><td>{t.wins}</td><td>{t.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '0.8rem', color: 'var(--dl-text-dim)', marginTop: 12 }}>
          Time for the offseason: a 5-round draft to restock every roster, then rosters age up —
          young players develop, veterans decline, and a few will retire.
        </p>
        <div className="dl-footer-nav">
          <button className="dl-back" onClick={onBack}>←</button>
          <button className="dl-btn dl-btn-primary" onClick={onEnterDraft}>ENTER DRAFT ▶</button>
        </div>
      </div>
    </div>
  );
}

function DraftScreen({ draftState, onTheClock, isUserTurn, draftDone, onPick, onAutoRest, onFinish }) {
  const round = Math.floor(draftState.pickIdx / Math.max(1, draftState.pickSequence.length / 5)) + 1;
  const topProspects = [...draftState.available].sort((a, b) => Data.overallRating(b) - Data.overallRating(a)).slice(0, 12);
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">
          {draftDone ? 'Draft Complete' : `Draft — Round ${Math.min(5, round)} · Pick ${draftState.pickIdx + 1}/${draftState.pickSequence.length}`}
        </div>

        {!draftDone && (
          <p style={{ fontSize: '0.85rem', marginBottom: 10 }}>
            On the clock: <strong>{onTheClock ? `${onTheClock.city} ${onTheClock.name}` : '—'}</strong>
            {isUserTurn && <span style={{ color: 'var(--dl-amber)' }}> — your pick!</span>}
          </p>
        )}

        {!draftDone && isUserTurn && (
          <div className="dl-grid dl-grid-3">
            {topProspects.map(p => (
              <div key={p.id} className="dl-row dl-row-clickable" style={{ flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => onPick(p)}>
                <div style={{ fontWeight: 800 }}>{p.firstName} {p.lastName}</div>
                <div style={{ color: 'var(--dl-text-dim)', fontSize: '0.78rem' }}>{p.position} · Age {p.age}</div>
                <span className="dl-badge" style={{ marginTop: 4 }}>OVR {Data.overallRating(p).toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {!draftDone && !isUserTurn && (
          <div className="dl-empty">Other teams are picking…</div>
        )}

        <div className="dl-log" style={{ marginTop: 12 }}>
          {draftState.log.slice(-12).map((l, i) => <div key={i} className="dl-log-line">{l}</div>)}
        </div>

        <div className="dl-footer-nav">
          {!draftDone && <button className="dl-btn dl-btn-ghost" onClick={onAutoRest}>Auto-pick rest of draft for me</button>}
          {draftDone && <button className="dl-btn dl-btn-primary dl-btn-block" onClick={onFinish}>START NEXT SEASON ▶</button>}
        </div>
      </div>
    </div>
  );
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

function experienceLabel(yearsPro) {
  const tiers = ['Rookie', 'Sophomore', 'Junior', 'Senior'];
  return tiers[yearsPro] || 'Veteran';
}

function MyPlayerScreen({ player, team, tab, setTab, onBack, onSpend }) {
  const ratingKeys = Object.keys(player.ratings);
  const level = player.level || 1;
  const totalXp = player.totalXp || 0;
  const prevThreshold = (level - 1) * Data.XP_PER_LEVEL;
  const xpIntoLevel = totalXp - prevThreshold;
  const xpPct = Math.min(100, (xpIntoLevel / Data.XP_PER_LEVEL) * 100);
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
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{player.firstName} {player.lastName} <span className="dl-badge">LVL {level}</span></div>
                  <div style={{ color: 'var(--dl-text-dim)', fontSize: '0.8rem' }}>{team?.city} {team?.name} · #{player.number} · {player.position}</div>
                  <div style={{ color: 'var(--dl-text-faint)', fontSize: '0.75rem' }}>{player.archetype} · {experienceLabel(player.yearsPro || 0)} · Age {player.age}</div>
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
                {Object.entries(player.careerHighs).map(([k, v]) => <Stat key={k} label={k.toUpperCase()} v={typeof v === 'number' ? Math.round(v * 10) / 10 : v} />)}
              </div>
            </div>
          </>
        )}

        {tab === 'upgrades' && (
          <>
            <div className="dl-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                <span>Level {level}</span>
                <span>{xpIntoLevel} / {Data.XP_PER_LEVEL} XP</span>
              </div>
              <div className="dl-bar-track"><div className="dl-bar-fill" style={{ width: `${xpPct}%`, background: 'var(--dl-amber)' }} /></div>
            </div>
            <div style={{ margin: '10px 0', fontSize: '0.85rem' }}>Skill Points available: <strong style={{ color: 'var(--dl-amber)' }}>{player.skillPoints}</strong></div>
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

function RosterScreen({ team, careerPlayerId, canManage, onRelease, onTrade, onSendDown, onOrganization, onBack }) {
  if (!team) return null;
  const payroll = Data.teamPayroll(team);
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">{team.city} {team.name} — Roster</div>
        <div className="dl-row" style={{ marginBottom: 12 }}>
          <span style={{ color: 'var(--dl-text-dim)' }}>Active payroll</span>
          <span style={{ fontFamily: "'Teko', sans-serif", fontSize: '1.15rem', color: 'var(--dl-amber-bright)' }}>{Data.fmtSalary(payroll)}</span>
        </div>
        <table className="dl-stat-table">
          <thead><tr><th>#</th><th>Name</th><th>Pos</th><th>Age</th><th>AVG/ERA</th><th>Contract</th><th>Status</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {team.roster.map(p => {
              const il = Data.ilStatus(p);
              const arb = Data.isArbEligible(p), fa = Data.isFreeAgentEligible(p);
              return (
                <tr key={p.id}>
                  <td>{p.number}</td>
                  <td>{p.firstName} {p.lastName}{p.id === careerPlayerId ? ' (you)' : ''}</td>
                  <td>{p.position}</td>
                  <td>{p.age}</td>
                  <td>{p.isPitcher ? Data.fmtEra(Data.era(p.season)) : Data.fmtAvg(Data.battingAvg(p.season))}</td>
                  <td>{Data.fmtSalary(p.contract?.salary)} · {p.contract?.yearsLeft ?? 0}yr{fa ? ' · FA' : arb ? ' · Arb' : ''}</td>
                  <td>{il ? <span style={{ color: 'var(--dl-clay-bright)' }}>{il}</span> : <span style={{ color: 'var(--dl-line-bright)' }}>Healthy</span>}</td>
                  {canManage && (
                    <td>
                      {p.id !== careerPlayerId && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button className="dl-btn dl-btn-sm" onClick={() => onTrade(p)}>Trade</button>
                          <button className="dl-btn dl-btn-sm" onClick={() => onSendDown(p)}>Option</button>
                          <button className="dl-btn dl-btn-sm dl-btn-danger" onClick={() => onRelease(p)}>Cut</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="dl-footer-nav">
          <button className="dl-back" onClick={onBack}>←</button>
          <button className="dl-btn dl-btn-primary" onClick={onOrganization}>Minor League Organization →</button>
        </div>
      </div>
    </div>
  );
}

function OrganizationScreen({ team, canManage, onCallUp, onBack }) {
  if (!team) return null;
  const levels = ['AAA', 'AA', 'A', 'Rookie'];
  const org = team.organization || [];
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">{team.city} {team.name} — Organization</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--dl-text-dim)', marginBottom: 12 }}>
          Ratings on prospects are scouted, not exact — the further from the majors, the fuzzier the read.
          Accuracy sharpens the longer they're in your system.
        </p>
        {levels.map(lvl => {
          const players = org.filter(p => p.orgLevel === lvl);
          if (!players.length) return null;
          return (
            <div key={lvl} style={{ marginBottom: 16 }}>
              <div className="dl-panel-title" style={{ marginBottom: 8 }}>{lvl}</div>
              <table className="dl-stat-table">
                <thead><tr><th>Name</th><th>Pos</th><th>Age</th><th>Scouted OVR</th><th>Potential</th>{canManage && <th></th>}</tr></thead>
                <tbody>
                  {players.map(p => {
                    const scoutedOvr = Data.scoutedOverall(p);
                    return (
                      <tr key={p.id}>
                        <td>{p.firstName} {p.lastName}</td>
                        <td>{p.position}</td>
                        <td>{p.age}</td>
                        <td>{Data.to80Scale(scoutedOvr)} <span style={{ color: 'var(--dl-text-faint)' }}>({Math.round(scoutedOvr)})</span></td>
                        <td>{Data.to80Scale(p.potential)}</td>
                        {canManage && (
                          <td><button className="dl-btn dl-btn-sm dl-btn-primary" onClick={() => onCallUp(p)}>Call Up</button></td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        {org.length === 0 && <div className="dl-empty">No minor-league players in the system.</div>}
        <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
      </div>
    </div>
  );
}

function TradeScreen({ myTeam, myPlayer, allTeams, onPropose, onDone }) {
  const [targetTeamId, setTargetTeamId] = useState(null);
  const [targetPlayerId, setTargetPlayerId] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const otherTeams = allTeams.filter(t => t.id !== myTeam.id);
  const targetTeam = otherTeams.find(t => t.id === targetTeamId);
  const targetPlayer = targetTeam?.roster.find(p => p.id === targetPlayerId);

  const submit = () => {
    const res = onPropose(targetTeam, targetPlayer);
    setOutcome(res.accepted ? 'accepted' : 'rejected');
  };

  if (outcome) {
    return (
      <div className="dl-screen">
        <div className="dl-panel">
          <div className="dl-panel-title">Trade {outcome === 'accepted' ? 'Accepted!' : 'Rejected'}</div>
          <p style={{ fontSize: '0.85rem' }}>
            {outcome === 'accepted'
              ? `${targetTeam.city} ${targetTeam.name} accepted — you sent ${myPlayer.firstName} ${myPlayer.lastName} for ${targetPlayer.firstName} ${targetPlayer.lastName}.`
              : `${targetTeam.city} ${targetTeam.name} turned it down. Try offering for someone closer in value.`}
          </p>
          <div className="dl-footer-nav"><button className="dl-btn dl-btn-primary dl-btn-block" onClick={onDone}>DONE</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Propose Trade — Offering {myPlayer.firstName} {myPlayer.lastName} ({myPlayer.position})</div>

        {!targetTeam && (
          <>
            <div className="dl-label" style={{ marginBottom: 8 }}>Pick a trade partner</div>
            <div className="dl-grid dl-grid-3">
              {otherTeams.map(t => (
                <div key={t.id} className="dl-row dl-row-clickable" onClick={() => setTargetTeamId(t.id)}>
                  <span>{t.city} {t.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {targetTeam && !targetPlayer && (
          <>
            <div className="dl-label" style={{ marginBottom: 8 }}>Pick a player from {targetTeam.city} to request</div>
            <div className="dl-grid dl-grid-3">
              {targetTeam.roster.map(p => (
                <div key={p.id} className="dl-row dl-row-clickable" style={{ flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => setTargetPlayerId(p.id)}>
                  <div style={{ fontWeight: 800 }}>{p.firstName} {p.lastName}</div>
                  <div style={{ color: 'var(--dl-text-dim)', fontSize: '0.78rem' }}>{p.position} · OVR {Data.overallRating(p).toFixed(0)}</div>
                </div>
              ))}
            </div>
            <button className="dl-btn dl-btn-ghost" style={{ marginTop: 10 }} onClick={() => setTargetTeamId(null)}>← Choose a different team</button>
          </>
        )}

        {targetTeam && targetPlayer && (
          <div className="dl-panel">
            <p style={{ fontSize: '0.85rem' }}>
              Send <strong>{myPlayer.firstName} {myPlayer.lastName}</strong> to {targetTeam.city} for <strong>{targetPlayer.firstName} {targetPlayer.lastName}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="dl-btn dl-btn-primary" style={{ flex: 1 }} onClick={submit}>Propose</button>
              <button className="dl-btn dl-btn-ghost" style={{ flex: 1 }} onClick={() => setTargetPlayerId(null)}>Back</button>
            </div>
          </div>
        )}

        <div className="dl-footer-nav"><button className="dl-back" onClick={onDone}>←</button></div>
      </div>
    </div>
  );
}

function LeagueOfficeScreen({ teams, userTeamId, simming, remainingGames, onManageTeam, onSimAll, onBack }) {
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">League Office</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--dl-text-dim)', marginBottom: 10 }}>
          As commissioner you can manage any team's roster — cut players or broker trades — and fast-forward
          the season whenever you're ready.
        </p>
        <button className="dl-btn dl-btn-primary dl-btn-block" onClick={onSimAll} disabled={simming || remainingGames === 0}>
          {simming ? 'Simulating…' : `⏩ Simulate All Remaining Games (${remainingGames})`}
        </button>

        <div className="dl-panel-title" style={{ marginTop: 16 }}>Teams</div>
        <div className="dl-grid dl-grid-3">
          {teams.map(t => (
            <div key={t.id} className="dl-row dl-row-clickable" style={{ flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => onManageTeam(t.id)}>
              <div style={{ fontWeight: 800 }}>{t.city}</div>
              <div style={{ color: 'var(--dl-text-dim)', fontSize: '0.78rem' }}>{t.name} · {t.wins}-{t.losses}{t.id === userTeamId ? ' · your team' : ''}</div>
              <div style={{ color: 'var(--dl-amber-bright)', fontSize: '0.72rem' }}>{Data.fmtSalary(Data.teamPayroll(t))} payroll</div>
            </div>
          ))}
        </div>
        <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
      </div>
    </div>
  );
}
