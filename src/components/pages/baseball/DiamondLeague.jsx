import React, { useEffect, useState } from 'react';
import './diamond.css';
import {
  createRoom,
  joinRoom,
  setPlayerReady,
  startRoom,
  subscribeToRoom
} from '../../../services/multiplayerDb';
import { simulateGame } from '../../../services/simulationEngine';

const TEAM_A = {
  id: 'nova-a', name: 'NOVA CITY', abbreviation: 'NVC', color: '#f5b942',
  players: [
    { name: 'M. Carter', position: 'P', stuff: 78, control: 71, movement: 74, velocity: 95, stamina: 82 },
    { name: 'J. Reed', contact: 82, power: 76, discipline: 72, speed: 67 },
    { name: 'A. King', contact: 76, power: 88, discipline: 69, speed: 54 },
    { name: 'D. Brooks', contact: 79, power: 68, discipline: 81, speed: 72 },
    { name: 'R. Hayes', contact: 71, power: 82, discipline: 65, speed: 61 }
  ]
};
const TEAM_B = {
  id: 'metro-b', name: 'METRO CLUB', abbreviation: 'MTC', color: '#65a9ff',
  players: [
    { name: 'T. Vaughn', position: 'P', stuff: 84, control: 65, movement: 79, velocity: 97, stamina: 77 },
    { name: 'L. Price', contact: 84, power: 71, discipline: 77, speed: 63 },
    { name: 'C. Wells', contact: 73, power: 91, discipline: 61, speed: 49 },
    { name: 'B. Grant', contact: 81, power: 73, discipline: 75, speed: 78 },
    { name: 'S. Cole', contact: 75, power: 79, discipline: 70, speed: 69 }
  ]
};

const modes = [
  ['quick', 'Quick Game', 'Simulate a complete game and inspect every plate appearance.'],
  ['h2h', 'Head-to-Head', 'Two managers share a room and control their teams.'],
  ['franchise', 'Online Franchise', 'Persistent league rooms with multiple managers.'],
  ['coop', 'Co-op Season', 'Play a season together against the simulation.']
];

function Stat({ label, value }) {
  return <div className="diamond-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Scoreboard({ game }) {
  if (!game) return null;
  return (
    <div className="diamond-scoreboard">
      <div className="score-team"><b>{game.away.abbreviation}</b><strong>{game.score.away}</strong></div>
      <div className="score-middle"><span>{game.status === 'final' ? 'FINAL' : `${game.inning} ${game.half.toUpperCase()}`}</span><small>{game.hits.away} H · {game.hits.home} H</small></div>
      <div className="score-team home"><b>{game.home.abbreviation}</b><strong>{game.score.home}</strong></div>
    </div>
  );
}

function Linescore({ game }) {
  if (!game) return null;
  const innings = game.linescore || [];
  return (
    <div className="linescore-wrap">
      <table className="linescore"><thead><tr><th>TEAM</th>{innings.map((_, i) => <th key={i}>{i + 1}</th>)}<th>R</th><th>H</th><th>E</th></tr></thead>
        <tbody>
          <tr><td>{game.away.abbreviation}</td>{innings.map((x, i) => <td key={i}>{x.away}</td>)}<td><b>{game.score.away}</b></td><td>{game.hits.away}</td><td>{game.errors.away}</td></tr>
          <tr><td>{game.home.abbreviation}</td>{innings.map((x, i) => <td key={i}>{x.home}</td>)}<td><b>{game.score.home}</b></td><td>{game.hits.home}</td><td>{game.errors.home}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function GameView({ game, onBack }) {
  const [feedIndex, setFeedIndex] = useState(game?.events?.length || 0);
  const visibleEvents = game?.events?.slice(0, feedIndex) || [];

  useEffect(() => {
    if (!game?.events?.length) return;
    setFeedIndex(game.events.length);
  }, [game]);

  return (
    <div className="diamond-shell">
      <button className="diamond-back" onClick={onBack}>← Baseball Hub</button>
      <Scoreboard game={game} />
      <Linescore game={game} />
      <div className="diamond-game-grid">
        <section className="diamond-panel">
          <div className="panel-title"><span>GAME CENTER</span><b>{game.status.toUpperCase()}</b></div>
          <div className="field">
            <div className="base base2" /><div className="base base1" /><div className="base base3" /><div className="home-plate" />
            <div className="mound" />
            <div className="field-label">{game.home.name}</div>
          </div>
          <div className="live-stats">
            <Stat label="Pitches" value={game.pitches.home + game.pitches.away} />
            <Stat label="Hits" value={game.hits.home + game.hits.away} />
            <Stat label="Errors" value={game.errors.home + game.errors.away} />
            <Stat label="Plays" value={game.events.length} />
          </div>
        </section>
        <section className="diamond-panel feed-panel">
          <div className="panel-title"><span>PLAY-BY-PLAY</span><b>{visibleEvents.length}</b></div>
          <div className="play-feed">
            {visibleEvents.slice().reverse().map((e, i) => (
              <div className="play-row" key={`${e.inning}-${e.half}-${i}`}>
                <div className="play-tag">{e.half === 'top' ? '▲' : '▼'} {e.inning}</div>
                <div><strong>{e.result}</strong><p>{e.text}</p><small>{e.pitchVelocity} MPH · {e.exitVelocity} EV · {e.launchAngle}° LA</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Multiplayer({ user }) {
  const playerId = user?.username || `guest_${Math.random().toString(36).slice(2, 7)}`;
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState(null);
  const [mode, setMode] = useState('h2h');
  const [name, setName] = useState('My Baseball Club');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!roomId) return undefined;
    return subscribeToRoom(roomId, setRoom);
  }, [roomId]);

  const create = async () => {
    try {
      const r = await createRoom({ name, ownerId: playerId, mode, maxPlayers: mode === 'franchise' ? 8 : 2 });
      setRoom(r); setRoomId(r.id); setStatus(`Room created: ${r.id}`);
    } catch (e) { setStatus(e.message); }
  };

  const join = async () => {
    if (!roomId.trim()) return setStatus('Enter a room code.');
    try {
      const r = await joinRoom(roomId.trim(), { id: playerId, name, team: null });
      setRoom(r); setStatus('Joined room.');
    } catch (e) { setStatus(e.message); }
  };

  const ready = async () => {
    if (!room) return;
    const me = (room.players || []).find(p => p.id === playerId);
    await setPlayerReady(room.id, playerId, !me?.ready);
  };

  const launch = async () => {
    const game = simulateGame(TEAM_A, TEAM_B);
    await startRoom(room.id, game);
    setStatus('Game started. Everyone in the room receives the same game state.');
  };

  return (
    <section className="multi-panel">
      <div className="multi-hero"><div><span className="eyebrow">NOVA ONLINE BASEBALL</span><h2>Build a league that persists.</h2><p>Invite managers, assign teams, simulate games and keep the league state synced across devices.</p></div><div className="online-dot">● ONLINE MODE</div></div>
      {!room ? (
        <div className="multi-grid">
          <div className="multi-card">
            <h3>Create a league room</h3>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="League name" />
            <div className="mode-grid">{modes.slice(1).map(([id, label, desc]) => <button className={mode === id ? 'mode active' : 'mode'} key={id} onClick={() => setMode(id)}><b>{label}</b><span>{desc}</span></button>)}</div>
            <button className="primary-btn" onClick={create}>CREATE ONLINE ROOM</button>
          </div>
          <div className="multi-card">
            <h3>Join a room</h3>
            <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Paste room code" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Manager name" />
            <button className="secondary-btn" onClick={join}>JOIN ROOM</button>
            {status && <p className="status-line">{status}</p>}
          </div>
        </div>
      ) : (
        <div className="multi-room">
          <div className="room-head"><div><span className="eyebrow">{room.mode?.toUpperCase()}</span><h3>{room.name}</h3><code>{room.id}</code></div><span className="room-status">{room.status}</span></div>
          <div className="room-body">
            <div><h4>Managers</h4>{(room.players || []).map(p => <div className="manager-row" key={p.id}><span>{p.name}</span><b>{p.ready ? 'READY' : 'NOT READY'}</b></div>)}</div>
            <div className="room-actions"><button className="primary-btn" onClick={ready}>READY / UNREADY</button>{room.owner_id === playerId && <button className="secondary-btn" disabled={(room.players || []).length < 2} onClick={launch}>START GAME</button>}</div>
          </div>
          {status && <p className="status-line">{status}</p>}
        </div>
      )}
    </section>
  );
}

export default function DiamondLeague({ user }) {
  const [tab, setTab] = useState('home');
  const [game, setGame] = useState(null);

  const playQuickGame = () => setGame(simulateGame(TEAM_A, TEAM_B));
  if (game) return <GameView game={game} onBack={() => setGame(null)} />;

  return (
    <div className="diamond-page">
      <header className="diamond-header">
        <div><span className="eyebrow">NOVA BASEBALL SIMULATION</span><h1>DIAMOND<span>GM</span></h1><p>Manage. Simulate. Compete.</p></div>
        <div className="header-record"><b>SEASON 01</b><span>ONLINE READY</span></div>
      </header>
      <nav className="diamond-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Dashboard</button>
        <button className={tab === 'simulate' ? 'active' : ''} onClick={() => setTab('simulate')}>Simulate</button>
        <button className={tab === 'multiplayer' ? 'active' : ''} onClick={() => setTab('multiplayer')}>Multiplayer</button>
        <button className={tab === 'franchise' ? 'active' : ''} onClick={() => setTab('franchise')}>Franchise</button>
      </nav>

      {tab === 'home' && (
        <main className="diamond-home">
          <section className="hero-card">
            <div><span className="eyebrow">BASEBALL UNIVERSE</span><h2>More than a game.<br />Build a baseball world.</h2><p>Deep simulation, persistent franchises, live box scores and multiplayer leagues.</p><button className="primary-btn" onClick={() => setTab('simulate')}>PLAY A GAME →</button></div>
            <div className="hero-score"><span>TONIGHT</span><b>NVC</b><strong>—</strong><b>MTC</b><small>9:00 PM · NOVA BALLPARK</small></div>
          </section>
          <div className="dashboard-grid">
            <div className="dash-card"><span>SIM ENGINE</span><strong>Advanced</strong><p>Ratings influence every plate appearance.</p></div>
            <div className="dash-card"><span>ONLINE</span><strong>2–8 Managers</strong><p>Head-to-head and commissioner leagues.</p></div>
            <div className="dash-card"><span>DATABASE</span><strong>Persistent</strong><p>Games and franchise state are stored server-side.</p></div>
          </div>
        </main>
      )}

      {tab === 'simulate' && (
        <main className="sim-screen">
          <div className="section-heading"><div><span className="eyebrow">GAME LAB</span><h2>Choose a game.</h2></div><span>REALISTIC BOX SCORE · PLAY-BY-PLAY · ADVANCED RATINGS</span></div>
          <div className="matchup-card"><div className="club"><b>NVC</b><span>NOVA CITY</span><small>Home · 86 OVR</small></div><div className="versus">VS</div><div className="club"><b>MTC</b><span>METRO CLUB</span><small>Away · 84 OVR</small></div><button className="primary-btn" onClick={playQuickGame}>SIMULATE 9 INNINGS</button></div>
        </main>
      )}

      {tab === 'multiplayer' && <Multiplayer user={user} />}

      {tab === 'franchise' && (
        <main className="sim-screen">
          <div className="section-heading"><div><span className="eyebrow">ONLINE FRANCHISE</span><h2>Commissioner tools.</h2></div></div>
          <div className="franchise-grid">
            {['Roster management','Schedule generator','Trades & free agency','Draft & scouting','Player development','Standings & playoffs'].map(x => <div className="dash-card" key={x}><span>MODULE</span><strong>{x}</strong><p>Persistent franchise infrastructure ready for your league.</p></div>)}
          </div>
        </main>
      )}
    </div>
  );
}
