import React, { useEffect, useMemo, useState } from 'react';
import './diamond.css';
import {
  createGameState,
  simulateNextPlay,
  simulateGame,
  calculateBattingLine,
} from '../../../services/simulationEngine';
import {
  CONTENT_PACK_TEMPLATE,
  downloadTemplate,
  flattenPlayers,
  listPacks,
  parseContentFile,
  savePack,
  validatePack,
  deletePack,
} from '../../../services/customContentService';

const DEMO_PACK = {
  ...CONTENT_PACK_TEMPLATE,
  name: 'Nova Showcase League',
  teams: [
    { id: 'nova', name: 'Nova Stars', abbreviation: 'NVS', primaryColor: '#8b5cf6', secondaryColor: '#ffffff', stadiumId: 'nova-park', roster: [
      { id: 'n1', name: 'Jay Carter', position: 'CF', contact: 91, power: 76, discipline: 84, speed: 93, defense: 88 },
      { id: 'n2', name: 'Mason Lee', position: '1B', contact: 78, power: 94, discipline: 73, speed: 44, defense: 62 },
      { id: 'n3', name: 'Ace Morgan', position: 'P', stuff: 91, control: 84, movement: 88, stamina: 91, velocity: 98 },
    ] },
    { id: 'city', name: 'City Kings', abbreviation: 'CTK', primaryColor: '#ef4444', secondaryColor: '#f8fafc', stadiumId: 'kings-field', roster: [
      { id: 'c1', name: 'Drew Brooks', position: 'SS', contact: 87, power: 82, discipline: 78, speed: 86, defense: 91 },
      { id: 'c2', name: 'Leo Torres', position: 'RF', contact: 74, power: 91, discipline: 69, speed: 71, defense: 76 },
      { id: 'c3', name: 'Ryan Cole', position: 'P', stuff: 86, control: 89, movement: 79, stamina: 86, velocity: 95 },
    ] },
  ],
  stadiums: [
    { id: 'nova-park', name: 'Nova Park', city: 'Nova City', capacity: 32000, wallLeft: 325, wallCenter: 400, wallRight: 335 },
    { id: 'kings-field', name: 'Kings Field', city: 'Kings City', capacity: 41000, wallLeft: 315, wallCenter: 410, wallRight: 320 },
  ],
};

const fmt = (v) => Number(v || 0).toFixed(3).replace(/^0/, '');

function TeamCard({ team, selected, onClick }) {
  return <button className={`sim-team-card ${selected ? 'selected' : ''}`} onClick={onClick}>
    <div className="team-logo" style={{ background: team.primaryColor || '#2d6cdf' }}>{(team.abbreviation || team.name.slice(0, 3)).toUpperCase()}</div>
    <div><strong>{team.name}</strong><span>{team.abbreviation || '---'}</span></div>
  </button>;
}

export default function DiamondLeague() {
  const [packs, setPacks] = useState(() => listPacks());
  const [activePack, setActivePack] = useState(() => listPacks()[0] || DEMO_PACK);
  const [homeId, setHomeId] = useState(() => (listPacks()[0] || DEMO_PACK).teams?.[0]?.id);
  const [awayId, setAwayId] = useState(() => (listPacks()[0] || DEMO_PACK).teams?.[1]?.id);
  const [game, setGame] = useState(null);
  const [tab, setTab] = useState('game');
  const [importStatus, setImportStatus] = useState('');
  const [auto, setAuto] = useState(false);

  const teams = activePack?.teams || [];
  const home = teams.find((t) => t.id === homeId) || teams[0];
  const away = teams.find((t) => t.id === awayId) || teams[1] || teams[0];
  const players = useMemo(() => flattenPlayers(activePack), [activePack]);
  const stadium = (activePack?.stadiums || []).find((s) => s.id === home?.stadiumId) || activePack?.stadiums?.[0];

  useEffect(() => {
    if (!auto || !game || game.status === 'final') return undefined;
    const timer = setInterval(() => {
      setGame((current) => {
        if (!current || current.status === 'final') return current;
        const next = { ...current, bases: [...current.bases], scores: { ...current.scores }, battingIndex: { ...current.battingIndex }, pitchCounts: { ...current.pitchCounts }, linescore: current.linescore.map((x) => ({ ...x })), playByPlay: [...current.playByPlay], battingStats: { ...current.battingStats }, pitchStats: { ...current.pitchStats } };
        simulateNextPlay(next);
        if (next.status === 'final') setAuto(false);
        return next;
      });
    }, 550);
    return () => clearInterval(timer);
  }, [auto, game]);

  const start = () => {
    if (!home || !away || home.id === away.id) return;
    setGame(createGameState(home, away, { innings: 9 }));
    setTab('game');
    setAuto(false);
  };

  const quickSim = () => {
    if (!home || !away || home.id === away.id) return;
    setGame(simulateGame(home, away, { innings: 9 }));
    setTab('game');
  };

  const play = () => {
    setGame((current) => {
      if (!current || current.status === 'final') return current;
      const next = { ...current, bases: [...current.bases], scores: { ...current.scores }, battingIndex: { ...current.battingIndex }, pitchCounts: { ...current.pitchCounts }, linescore: current.linescore.map((x) => ({ ...x })), playByPlay: [...current.playByPlay], battingStats: { ...current.battingStats }, pitchStats: { ...current.pitchStats } };
      simulateNextPlay(next);
      return next;
    });
  };

  const importPack = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const pack = await parseContentFile(file);
      const result = validatePack(pack);
      if (!result.valid) throw new Error(result.errors.join(' '));
      const saved = savePack(pack);
      setPacks(listPacks());
      setActivePack(saved);
      setHomeId(saved.teams[0]?.id);
      setAwayId(saved.teams[1]?.id || saved.teams[0]?.id);
      setImportStatus(`Imported ${saved.name || file.name}: ${saved.teams.length} teams.`);
    } catch (error) {
      setImportStatus(`Import failed: ${error.message}`);
    }
  };

  const applyPack = (pack) => {
    setActivePack(pack);
    setHomeId(pack.teams?.[0]?.id);
    setAwayId(pack.teams?.[1]?.id || pack.teams?.[0]?.id);
    setGame(null);
  };

  return <div className="diamond-sim">
    <header className="sim-header">
      <div><div className="eyebrow">NOVA BASEBALL</div><h1>Diamond Manager</h1><p>Retro baseball presentation with OOTP-style simulation depth.</p></div>
      <div className="header-actions"><button onClick={quickSim} className="primary-btn">Quick Sim</button><button onClick={start} className="secondary-btn">Start Game</button></div>
    </header>

    <nav className="sim-tabs">
      {['game', 'teams', 'players', 'content'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'game' ? 'Game Center' : item === 'content' ? 'Custom Content' : item[0].toUpperCase() + item.slice(1)}</button>)}
    </nav>

    {tab === 'game' && <>
      <section className="matchup-panel">
        <div className="team-picker"><TeamCard team={away} selected onClick={() => setTab('teams')} /><div className="at">AT</div><TeamCard team={home} selected onClick={() => setTab('teams')} /></div>
        <div className="scoreboard">
          <div><span>{away?.abbreviation}</span><strong>{game ? game.scores[away.id] : 0}</strong></div>
          <div className="score-middle"><small>{game ? `${game.half === 'top' ? 'TOP' : 'BOT'} ${game.inning}` : '9 INNINGS'}</small><b>{game?.status === 'final' ? 'FINAL' : game ? `${game.outs} OUT${game.outs === 1 ? '' : 'S'}` : 'READY'}</b></div>
          <div><span>{home?.abbreviation}</span><strong>{game ? game.scores[home.id] : 0}</strong></div>
        </div>
        <div className="game-actions"><button onClick={play} disabled={!game || game.status === 'final'}>Play Next PA</button><button onClick={() => setAuto((v) => !v)} disabled={!game || game.status === 'final'}>{auto ? 'Pause Simulation' : 'Auto Sim'}</button><button onClick={quickSim}>Sim Full Game</button></div>
      </section>

      <section className="game-grid">
        <div className="diamond-card"><div className="card-title">FIELD • {stadium?.name || 'Custom Stadium'}</div><div className="field"><div className="infield"></div>{['first','second','third'].map((base, i) => <div key={base} className={`base base-${base} ${(game?.bases?.[i === 0 ? 0 : i === 1 ? 1 : 2]) ? 'occupied' : ''}`}></div>)}<div className="pitcher-mound"></div><div className="home-plate"></div><div className="field-label">{stadium?.city || 'Nova Baseball'}</div></div></div>
        <div className="play-card"><div className="card-title">LIVE PLAY-BY-PLAY</div><div className="play-feed">{(game?.playByPlay || []).slice(-16).reverse().map((p, i) => <div className="play-row" key={`${p.inning}-${i}`}><span>{p.half === 'top' ? '▲' : '▼'}{p.inning}</span><strong>{p.batter}</strong><em>{p.result}</em><small>{p.velocity} MPH {p.exitVelocity ? `• ${p.exitVelocity} EV` : ''}</small></div>)}{!game && <div className="empty">Choose two teams and start a game.</div>}</div></div>
      </section>

      {game && <section className="stat-grid"><div className="stat-panel"><div className="card-title">LINESCORE</div><table><thead><tr><th>TEAM</th>{game.linescore.map((r) => <th key={r.inning}>{r.inning}</th>)}<th>R</th></tr></thead><tbody><tr><td>{away.abbreviation}</td>{game.linescore.map((r) => <td key={r.inning}>{r.away}</td>)}<td>{game.scores[away.id]}</td></tr><tr><td>{home.abbreviation}</td>{game.linescore.map((r) => <td key={r.inning}>{r.home}</td>)}<td>{game.scores[home.id]}</td></tr></tbody></table></div><div className="stat-panel"><div className="card-title">GAME LEADERS</div>{Object.values(game.battingStats).sort((a, b) => b.HR - a.HR || b.H - a.H).slice(0, 6).map((s) => <div className="leader-row" key={s.id}><strong>{s.name}</strong><span>{s.H}-{s.AB} • {s.HR} HR • {s.RBI} RBI • {fmt(calculateBattingLine(s).AVG)}</span></div>)}</div></section>}
    </>}

    {tab === 'teams' && <section className="content-panel"><div className="panel-heading"><div><div className="eyebrow">FRANCHISE SETUP</div><h2>Choose the matchup</h2></div><span>{teams.length} teams loaded</span></div><div className="team-grid">{teams.map((team) => <TeamCard key={team.id} team={team} selected={team.id === homeId || team.id === awayId} onClick={() => setHomeId((current) => current === team.id ? awayId : team.id)} />)}</div><div className="picker-row"><label>Away<select value={awayId} onChange={(e) => setAwayId(e.target.value)}>{teams.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>Home<select value={homeId} onChange={(e) => setHomeId(e.target.value)}>{teams.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label></div></section>}

    {tab === 'players' && <section className="content-panel"><div className="panel-heading"><div><div className="eyebrow">ROSTER DATABASE</div><h2>Player ratings</h2></div><span>{players.length} players</span></div><div className="player-table">{players.map((p) => <div className="player-row" key={`${p.teamId}-${p.id}`}><div><strong>{p.name}</strong><span>{p.teamName} • {p.position || '—'}</span></div><div className="ratings">{p.position === 'P' ? <><i>STF {p.stuff ?? 60}</i><i>CTL {p.control ?? 55}</i><i>MOV {p.movement ?? 55}</i><i>VEL {p.velocity ?? 92}</i></> : <><i>CON {p.contact ?? 60}</i><i>PWR {p.power ?? 55}</i><i>DISC {p.discipline ?? 55}</i><i>SPD {p.speed ?? 50}</i></>}</div></div>)}</div></section>}

    {tab === 'content' && <section className="content-panel"><div className="panel-heading"><div><div className="eyebrow">HOOP LAND STYLE CONTENT SYSTEM</div><h2>Custom Baseball Packs</h2><p>Import teams, full rosters, ratings, stadiums and league metadata from files you create yourself.</p></div><div className="content-actions"><button onClick={downloadTemplate} className="secondary-btn">Download Template</button><label className="primary-btn file-button">Import JSON Pack<input type="file" accept=".json,application/json" onChange={importPack} /></label></div></div>{importStatus && <div className="import-status">{importStatus}</div>}<div className="pack-grid">{packs.map((pack) => <div className="pack-card" key={pack.id}><div className="pack-art">⚾</div><strong>{pack.name}</strong><span>{pack.teams?.length || 0} teams • {(pack.stadiums || []).length} stadiums</span><div><button onClick={() => applyPack(pack)}>Use Pack</button><button onClick={() => { deletePack(pack.id); setPacks(listPacks()); }}>Delete</button></div></div>)}<div className="pack-card template"><div className="pack-art">＋</div><strong>Build your own universe</strong><span>Teams • rosters • ratings • logos • stadiums</span><button onClick={downloadTemplate}>Get starter file</button></div></div><details className="format-help"><summary>Content pack format</summary><pre>{JSON.stringify(CONTENT_PACK_TEMPLATE, null, 2)}</pre></details></section>}
  </div>;
}
