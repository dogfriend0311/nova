import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import * as Data from '../../../services/baseball/data';
import * as Save from '../../../services/baseball/save';
import CareerHub from './CareerHub';
import './diamond.css';

const ARCHETYPE_DEFAULT = 'Contact Hitter';

function newCareerState({ league, totalGames, playerName, playerPos, teamId }) {
  const schedule = Data.generateSchedule(league.teams, totalGames);
  const team = teamId ? league.teams.find(t => t.id === teamId) : league.teams[0];
  const player = Data.generatePlayer({ isPitcher: playerPos === 'SP' || playerPos === 'RP', age: 18 });
  player.firstName = playerName.first || player.firstName;
  player.lastName = playerName.last || player.lastName;
  if (playerPos) player.position = playerPos;
  player.archetype = ARCHETYPE_DEFAULT;
  player.isRookie = true;
  team.roster.push(player);
  return {
    league,
    schedule,
    dayIndex: 0,
    careerPlayerId: player.id,
    news: [`BREAKING: ${team.city} sign undrafted rookie ${player.firstName} ${player.lastName}.`],
    social: [],
  };
}

export default function DiamondLeague() {
  const { user } = useAuth();
  const username = user?.username;

  const [screen, setScreen] = useState('menu');
  const [slots, setSlots] = useState(() => Save.listSlots(username));
  const [activeSlot, setActiveSlot] = useState(null);
  const [session, setSession] = useState(null); // { data, meta }
  const [pendingMode, setPendingMode] = useState('career');
  const [pendingLeague, setPendingLeague] = useState(null);
  const [setupError, setSetupError] = useState('');
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState('');
  const [customLeagueRaw, setCustomLeagueRaw] = useState(() => {
    const raw = Save.loadCustomLeagueJson(username);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });

  const [setupForm, setSetupForm] = useState({
    leagueName: 'Diamond League',
    teamCount: 20,
    totalGames: 30,
    startYear: new Date().getFullYear(),
    useCustom: false,
    firstName: '', lastName: '', position: 'SS', teamId: null,
  });

  const refreshSlots = () => setSlots(Save.listSlots(username));

  const persist = (next) => {
    setSession(next);
    if (activeSlot) {
      Save.saveSlot(username, activeSlot, {
        meta: {
          label: next.meta.label, mode: next.meta.mode, year: next.data.league.year,
          record: next.meta.record, icon: '⚾',
        },
        data: next.data,
      });
      refreshSlots();
    }
  };

  // ── Save slot screen ──────────────────────────────────────
  const openSlot = (slotId) => {
    const existing = Save.loadSlot(username, slotId);
    setActiveSlot(slotId);
    if (existing) {
      setSession({ meta: existing.meta, data: existing.data });
      setScreen('hub');
    } else {
      setScreen('mode');
    }
  };

  const deleteSlot = (slotId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this save? This cannot be undone.')) return;
    Save.deleteSlot(username, slotId);
    refreshSlots();
  };

  // ── Mode -> league setup -> player create ─────────────────
  const startSetupFlow = (mode) => { setPendingMode(mode); setScreen('leagueSetup'); };

  const confirmLeagueSetup = () => {
    if (!setupForm.useCustom && setupForm.teamCount < 2) { setSetupError('Need at least 2 teams.'); return; }
    setSetupError('');
    const league = (setupForm.useCustom && customLeagueRaw)
      ? Data.hydrateLeague(customLeagueRaw, { year: Number(setupForm.startYear) })
      : Data.generateLeague({ teamCount: Number(setupForm.teamCount), level: 'pro', year: Number(setupForm.startYear) });
    league.name = setupForm.leagueName || league.name;
    setPendingLeague(league);
    if (pendingMode === 'career') setScreen('createPlayer');
    else setScreen('pickTeam'); // Franchise / commissioner: skip player creation, pick a team to run
  };

  const finalizeCareer = () => {
    if (!setupForm.firstName.trim() || !setupForm.lastName.trim()) {
      setSetupError('Enter a first and last name.'); return;
    }
    const data = newCareerState({
      league: pendingLeague,
      totalGames: Number(setupForm.totalGames),
      playerName: { first: setupForm.firstName, last: setupForm.lastName },
      playerPos: setupForm.position,
    });
    const team = data.league.teams[0];
    const next = {
      meta: { label: `[Career] ${team.city} Y1 ${data.league.year}`, mode: 'career', record: '0-0' },
      data,
    };
    persist(next);
    setScreen('hub');
  };

  const finalizeFranchise = (teamId) => {
    const league = pendingLeague;
    const schedule = Data.generateSchedule(league.teams, Number(setupForm.totalGames));
    const team = league.teams.find(t => t.id === teamId) || league.teams[0];
    const data = { league, schedule, dayIndex: 0, careerPlayerId: null, userTeamId: team.id, news: [`${team.city} ${team.name} begin a new era.`], social: [] };
    const next = {
      meta: { label: `[${pendingMode === 'commissioner' ? 'Commish' : 'Franchise'}] ${team.city} Y1 ${league.year}`, mode: pendingMode, record: '0-0' },
      data,
    };
    persist(next);
    setScreen('hub');
  };

  // ── Customize: create/import league or draft class as raw JSON ──
  const doImportLeague = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.teams || !Array.isArray(parsed.teams)) throw new Error('JSON must include a "teams" array');
      setImportErr('');
      Save.saveCustomLeagueJson(username, importText);
      setCustomLeagueRaw(parsed);
      setSetupForm(f => ({ ...f, useCustom: true, teamCount: parsed.teams.length }));
      alert(`Imported "${parsed.name || 'custom league'}" with ${parsed.teams.length} teams. It'll be offered as an option next time you start a new save.`);
    } catch (e) {
      setImportErr(e.message);
    }
  };

  const sampleLeagueJson = () => JSON.stringify({
    name: 'My Custom League',
    teams: [{ city: 'Sample City', name: 'Sample Mascot', abbr: 'SMP', roster: '...9 hitters + pitchers, see docs' }],
  }, null, 2);

  // ══════════════════════════════════════════════════════════
  if (screen === 'hub' && session) {
    return (
      <div className="dl-root">
        <CareerHub
          session={session}
          onUpdate={persist}
          onExitToMenu={() => { setScreen('menu'); setActiveSlot(null); setSession(null); }}
        />
      </div>
    );
  }

  return (
    <div className="dl-root">
      <div className="dl-screen">
        <TopBar screen={screen} year={session?.data?.league?.year} />

        {screen === 'menu' && (
          <MainMenu
            onSeasonModes={() => setScreen('slots')}
            onExhibition={() => setScreen('exhibition')}
            onCustomize={() => setScreen('customize')}
          />
        )}

        {screen === 'slots' && (
          <SlotScreen slots={slots} onOpen={openSlot} onDelete={deleteSlot} onBack={() => setScreen('menu')} />
        )}

        {screen === 'mode' && (
          <ModeScreen onPick={startSetupFlow} onBack={() => setScreen('slots')} />
        )}

        {screen === 'leagueSetup' && (
          <LeagueSetupScreen
            form={setupForm} setForm={setSetupForm} error={setupError}
            customLeagueRaw={customLeagueRaw}
            onBack={() => setScreen('mode')} onConfirm={confirmLeagueSetup}
          />
        )}

        {screen === 'createPlayer' && (
          <CreatePlayerScreen
            form={setupForm} setForm={setSetupForm} error={setupError}
            onBack={() => setScreen('leagueSetup')} onConfirm={finalizeCareer}
          />
        )}

        {screen === 'pickTeam' && pendingLeague && (
          <PickTeamScreen
            teams={pendingLeague.teams}
            onBack={() => setScreen('leagueSetup')}
            onPick={finalizeFranchise}
          />
        )}

        {screen === 'customize' && (
          <CustomizeScreen
            importText={importText} setImportText={setImportText} importErr={importErr}
            onImport={doImportLeague} sample={sampleLeagueJson()}
            onBack={() => setScreen('menu')}
          />
        )}

        {screen === 'exhibition' && (
          <ExhibitionScreen onBack={() => setScreen('menu')} />
        )}
      </div>
    </div>
  );
}

// ── Shared top bar (the "signature" LED ticker header) ───────
function TopBar({ screen, year }) {
  const titles = {
    menu: 'MAIN MENU', slots: 'SELECT SAVE SLOT', mode: 'SELECT MODE',
    leagueSetup: 'LEAGUE SETTINGS', createPlayer: 'CREATE PLAYER', pickTeam: 'SELECT TEAM',
    customize: 'CUSTOMIZE', exhibition: 'EXHIBITION',
  };
  return (
    <div className="dl-topbar">
      <div className="dl-chip">⚾ Y{year || '–'}</div>
      <div className="dl-ticker">{titles[screen] || 'DIAMOND LEAGUE'}</div>
      <div className="dl-coins">🪙 40</div>
    </div>
  );
}

function MainMenu({ onSeasonModes, onExhibition, onCustomize }) {
  return (
    <div className="dl-grid dl-grid-2">
      <div className="dl-panel">
        <div className="dl-panel-title">Modes</div>
        <div className="dl-grid" style={{ gridTemplateColumns: '1fr' }}>
          <button className="dl-btn dl-btn-primary dl-btn-block" onClick={onSeasonModes}>🏆 Season Modes</button>
          <button className="dl-btn dl-btn-block" onClick={onExhibition}>▶ Exhibition</button>
          <button className="dl-btn dl-btn-block" onClick={onCustomize}>✏️ Customize</button>
        </div>
      </div>
      <div className="dl-panel" style={{ textAlign: 'center' }}>
        <div className="dl-logo">DIAMOND<br />LEAGUE<small>PREMIUM EDITION</small></div>
        <p style={{ color: 'var(--dl-text-faint)', fontSize: '0.78rem', marginTop: 14 }}>
          Retro pixel baseball. Solo career, franchise or commissioner play — bring your own rosters or use the free default league.
        </p>
      </div>
    </div>
  );
}

function SlotScreen({ slots, onOpen, onDelete, onBack }) {
  return (
    <div className="dl-panel">
      <div className="dl-panel-title">Save Slots</div>
      <div className="dl-grid dl-grid-3">
        {slots.map(s => (
          <div key={s.slotId} className="dl-row dl-row-clickable" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }} onClick={() => onOpen(s.slotId)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--dl-text-faint)' }}>
              <span>SAVE {s.slotId}</span>
              {!s.empty && <button className="dl-btn dl-btn-sm dl-btn-danger" onClick={(e) => onDelete(s.slotId, e)}>✕</button>}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              {s.empty ? 'New Season' : s.label}
            </div>
            {!s.empty && <div style={{ fontSize: '0.72rem', color: 'var(--dl-text-dim)' }}>{s.mode?.toUpperCase()} · {s.record}</div>}
          </div>
        ))}
      </div>
      <div className="dl-footer-nav">
        <button className="dl-back" onClick={onBack}>←</button>
      </div>
    </div>
  );
}

function ModeScreen({ onPick, onBack }) {
  const modes = [
    { id: 'career', icon: '🧢', title: 'CAREER MODE', desc: 'Start as an undrafted rookie and build a legacy, one at-bat at a time.', tag: '1 Player' },
    { id: 'franchise', icon: '🏆', title: 'FRANCHISE MODE', desc: 'Run a whole roster and build a championship contender over the years.', tag: '1 Player' },
    { id: 'commissioner', icon: '🧑‍⚖️', title: 'COMMISSIONER MODE', desc: 'Control the whole league and watch it evolve across simulated seasons.', tag: '1 Player (for now)' },
  ];
  return (
    <div className="dl-panel">
      <div className="dl-panel-title">Select Mode</div>
      {modes.map(m => (
        <div key={m.id} className="dl-row dl-row-clickable" onClick={() => onPick(m.id)}>
          <div>
            <div style={{ fontWeight: 800 }}>{m.icon} {m.title}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--dl-text-dim)', marginTop: 4 }}>{m.desc}</div>
          </div>
          <span className="dl-badge">{m.tag}</span>
        </div>
      ))}
      <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
    </div>
  );
}

function LeagueSetupScreen({ form, setForm, error, customLeagueRaw, onBack, onConfirm }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="dl-panel">
      <div className="dl-panel-title">General</div>

      {customLeagueRaw && (
        <div className="dl-row" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Use imported league</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--dl-text-dim)' }}>
              "{customLeagueRaw.name || 'Custom League'}" — {customLeagueRaw.teams?.length || 0} teams
            </div>
          </div>
          <button
            className={`dl-btn dl-btn-sm ${form.useCustom ? 'dl-btn-primary' : ''}`}
            onClick={() => set('useCustom', !form.useCustom)}
          >
            {form.useCustom ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      <div className="dl-field">
        <label className="dl-label">League Name</label>
        <input className="dl-input" value={form.leagueName} onChange={e => set('leagueName', e.target.value)} />
      </div>
      <div className="dl-grid dl-grid-3">
        <div className="dl-field">
          <label className="dl-label">Starting Year</label>
          <div className="dl-stepper">
            <button className="dl-btn" onClick={() => set('startYear', form.startYear - 1)}>−</button>
            <div className="dl-stepper-value">{form.startYear}</div>
            <button className="dl-btn" onClick={() => set('startYear', form.startYear + 1)}>+</button>
          </div>
        </div>
        <div className="dl-field">
          <label className="dl-label">Total Teams</label>
          {form.useCustom ? (
            <div className="dl-stepper-value">{customLeagueRaw?.teams?.length || 0} (from import)</div>
          ) : (
            <select className="dl-select" value={form.teamCount} onChange={e => set('teamCount', Number(e.target.value))}>
              {[8, 12, 16, 20, 24, 30].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>
        <div className="dl-field">
          <label className="dl-label">Games / Season</label>
          <select className="dl-select" value={form.totalGames} onChange={e => set('totalGames', Number(e.target.value))}>
            {[20, 30, 40, 60, 81, 162].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {error && <div style={{ color: 'var(--dl-clay)', fontSize: '0.8rem', marginBottom: 8 }}>{error}</div>}
      <div className="dl-footer-nav">
        <button className="dl-back" onClick={onBack}>←</button>
        <button className="dl-btn dl-btn-primary" onClick={onConfirm}>CONFIRM</button>
      </div>
    </div>
  );
}

const POSITIONS_ALL = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'RP'];

function CreatePlayerScreen({ form, setForm, error, onBack, onConfirm }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="dl-panel">
      <div className="dl-panel-title">Player Profile</div>
      <div className="dl-grid dl-grid-2">
        <div>
          <div className="dl-field">
            <label className="dl-label">First Name</label>
            <input className="dl-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Tune" />
          </div>
          <div className="dl-field">
            <label className="dl-label">Last Name</label>
            <input className="dl-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Jam" />
          </div>
        </div>
        <div>
          <div className="dl-field">
            <label className="dl-label">Position</label>
            <select className="dl-select" value={form.position} onChange={e => set('position', e.target.value)}>
              {POSITIONS_ALL.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>
      {error && <div style={{ color: 'var(--dl-clay)', fontSize: '0.8rem', marginBottom: 8 }}>{error}</div>}
      <div className="dl-footer-nav">
        <button className="dl-back" onClick={onBack}>←</button>
        <button className="dl-btn dl-btn-primary" onClick={onConfirm}>START CAREER</button>
      </div>
    </div>
  );
}

function PickTeamScreen({ teams, onBack, onPick }) {
  return (
    <div className="dl-panel">
      <div className="dl-panel-title">Pick Your Team</div>
      <div className="dl-grid dl-grid-3">
        {teams.map(t => (
          <div key={t.id} className="dl-row dl-row-clickable" onClick={() => onPick(t.id)} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 800 }}>{t.city}</div>
            <div style={{ color: 'var(--dl-text-dim)', fontSize: '0.8rem' }}>{t.name}</div>
          </div>
        ))}
      </div>
      <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
    </div>
  );
}

function CustomizeScreen({ importText, setImportText, importErr, onImport, sample, onBack }) {
  const [tab, setTab] = useState('league');
  return (
    <div className="dl-panel">
      <div className="dl-tabs">
        <button className={`dl-tab ${tab === 'league' ? 'active' : ''}`} onClick={() => setTab('league')}>Custom Leagues</button>
        <button className={`dl-tab ${tab === 'draft' ? 'active' : ''}`} onClick={() => setTab('draft')}>Draft Classes</button>
      </div>
      {tab === 'league' && (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--dl-text-dim)', marginBottom: 10 }}>
            Paste a league JSON (teams, rosters, colors) to replace the default generated league, or skip this
            entirely — new saves ship with a free procedurally-generated league already.
          </p>
          <textarea className="dl-input" value={importText} onChange={e => setImportText(e.target.value)} placeholder={sample} />
          {importErr && <div style={{ color: 'var(--dl-clay)', fontSize: '0.8rem', margin: '8px 0' }}>{importErr}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="dl-btn dl-btn-primary" onClick={onImport}>Import League</button>
            <button className="dl-btn" onClick={() => setImportText(sample)}>Load Sample Format</button>
          </div>
        </>
      )}
      {tab === 'draft' && (
        <p style={{ fontSize: '0.8rem', color: 'var(--dl-text-dim)' }}>
          Draft class import works the same way — every new season a fresh class is generated for you automatically,
          or supply your own prospects JSON here in a future update.
        </p>
      )}
      <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
    </div>
  );
}

function ExhibitionScreen({ onBack }) {
  const [result, setResult] = useState(null);
  const runExhibition = () => {
    const usedNames = new Set();
    const home = Data.generateTeam(usedNames, 'pro');
    const away = Data.generateTeam(usedNames, 'pro');
    import('../../../services/baseball/engine').then(({ simulateGame }) => {
      const r = simulateGame(home, away);
      setResult({ home, away, r });
    });
  };
  return (
    <div className="dl-panel">
      <div className="dl-panel-title">Exhibition — Quick Sim vs CPU</div>
      <button className="dl-btn dl-btn-primary dl-btn-block" onClick={runExhibition}>⚡ Simulate Random Matchup</button>
      {result && (
        <div className="dl-panel" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, textAlign: 'center', fontSize: '1.1rem' }}>
            {result.away.city} {result.r.awayRuns} — {result.home.city} {result.r.homeRuns}
          </div>
          <div style={{ textAlign: 'center', color: 'var(--dl-text-dim)', fontSize: '0.8rem', marginTop: 4 }}>
            {result.r.winner === 'home' ? result.home.name : result.away.name} win
          </div>
        </div>
      )}
      <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
    </div>
  );
}
