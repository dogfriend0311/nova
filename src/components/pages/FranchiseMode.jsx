import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as fdb from '../../services/franchiseDb';
import * as engine from '../../services/franchiseEngine';
import FranchiseTrades from './FranchiseTrades';
import FranchiseDraft from './FranchiseDraft';
import FranchiseFreeAgency from './FranchiseFreeAgency';
import GameFieldViewer from './GameFieldViewer';

const POS_ORDER = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const LEVELS = ['MLB', 'AAA', 'AA', 'A'];

function pct(w, l) { const g = w + l; return g > 0 ? (w / g).toFixed(3).replace(/^0/, '') : '.000'; }

// ── Single player row with lazily-loaded season stats + GM actions ──
const PlayerRow = ({ player, seasonId, leagueAverages, isGM, onLevelChange, onRelease }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    if (seasonId) {
      fdb.getPlayerSeasonStats(player.id, seasonId, leagueAverages).then(s => { if (active) setStats(s); });
    }
    return () => { active = false; };
  }, [player.id, seasonId, leagueAverages]);

  const ratingsStr = player.is_pitcher
    ? `STU ${player.stuff} / CTL ${player.control} / MOV ${player.movement} / STA ${player.stamina}`
    : `CON ${player.contact} / POW ${player.power} / EYE ${player.eye} / SPD ${player.speed} / FLD ${player.fielding}`;

  const stars = engine.starRating(player);
  const starColor = stars >= 4 ? '#ffd166' : stars === 3 ? '#5e81f4' : 'rgba(158,165,196,0.35)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid rgba(94,129,244,0.08)', flexWrap: 'wrap' }}>
      <span style={{ width: 34, fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-cyan)', flexShrink: 0 }}>{player.position}</span>
      <span style={{ minWidth: 130, fontSize: '0.85rem', color: '#e2e5f0', fontWeight: 600 }}>{player.first_name} {player.last_name}</span>
      <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>Age {player.age}</span>
      {player.level !== 'MLB' && (
        <span
          title={`${engine.STAR_LABELS[stars]} — projects to a ${player.potential ?? '—'} overall ceiling`}
          style={{ fontSize: '0.76rem', color: starColor, fontWeight: 700, cursor: 'default' }}
        >
          {engine.starDisplay(stars)}
        </span>
      )}
      <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.45)', flex: 1, minWidth: 200 }}>{ratingsStr}</span>
      {stats && (
        <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.6)', fontFamily: 'monospace' }}>
          {player.is_pitcher
            ? `ERA ${stats.era.toFixed(2)} · WHIP ${stats.whip.toFixed(2)} · K/9 ${stats.k9.toFixed(1)} · FIP ${stats.fip.toFixed(2)} · WAR ${(stats.war || 0).toFixed(1)}`
            : `AVG ${stats.avg.toFixed(3)} · OPS ${stats.ops.toFixed(3)} · HR ${stats.hr || 0} · RBI ${stats.rbi || 0} · WAR ${(stats.war || 0).toFixed(1)}`}
        </span>
      )}
      {isGM && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <select
            value={player.level}
            onChange={e => onLevelChange(player.id, e.target.value)}
            style={{ fontSize: '0.7rem', padding: '4px 6px', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 5 }}
          >
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={() => onRelease(player.id)} title="Release to free agency"
            style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(255,107,122,0.08)', border: '1px solid rgba(255,107,122,0.25)', color: '#ff6b7a', borderRadius: 5, cursor: 'pointer' }}>
            Release
          </button>
        </div>
      )}
    </div>
  );
};

// ── Roster view for one team, with level tabs + GM controls ────
const TeamRoster = ({ team, seasonId, leagueAverages, onBack, canClaim, onClaim, user, preseason }) => {
  const [level, setLevel] = useState('MLB');
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  const isGM = !!(user?.username && team.owner_user_id === user.username);

  const load = useCallback(() => {
    setLoading(true);
    fdb.getRoster(team.id, level).then(r => {
      const sorted = [...r].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position));
      setRoster(sorted);
      setLoading(false);
    });
  }, [team.id, level]);
  useEffect(load, [load]);

  const handleLevelChange = async (playerId, newLevel) => {
    await fdb.changePlayerLevel(playerId, newLevel);
    load();
  };
  const handleRelease = async (playerId) => {
    if (!window.confirm('Release this player to free agency?')) return;
    await fdb.releasePlayer(playerId);
    load();
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 14 }}>← Back to Standings</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ color: '#e2e5f0', margin: 0 }}>{team.city} {team.name}</h2>
          <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)' }}>
            {team.league} League · {team.division} Division · {team.wins}-{team.losses} ({pct(team.wins, team.losses)})
            {team.owner_user_id && ` · Owned by @${team.owner_user_id}`}
          </div>
        </div>
        {!team.owner_user_id && canClaim && preseason && (
          <button className="neon-button" onClick={() => onClaim(team.id)}>Claim This Team</button>
        )}
      </div>

      {isGM && (
        <div style={{ fontSize: '0.78rem', color: '#43b581', marginBottom: 12 }}>
          🧢 You're the GM of this team — change a player's level or release them below.
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, minHeight: 40,
            background: level === l ? 'rgba(94,129,244,0.18)' : 'rgba(94,129,244,0.05)',
            border: `1px solid ${level === l ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
            color: level === l ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
          }}>{l}</button>
        ))}
      </div>

      <div className="neon-card p-3">
        {loading ? (
          <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>Loading roster…</div>
        ) : roster.length === 0 ? (
          <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>No players at this level.</div>
        ) : (
          roster.map(p => (
            <PlayerRow key={p.id} player={p} seasonId={seasonId} leagueAverages={leagueAverages}
              isGM={isGM} onLevelChange={handleLevelChange} onRelease={handleRelease} />
          ))
        )}
      </div>
    </div>
  );
};

// ── Standings grouped by league/division ────────────────────────
const Standings = ({ teams, onSelectTeam }) => {
  const groups = {};
  teams.forEach(t => {
    const key = `${t.league} — ${t.division}`;
    (groups[key] = groups[key] || []).push(t);
  });
  Object.values(groups).forEach(list => list.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses)));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {Object.entries(groups).map(([label, list]) => (
        <div key={label} className="neon-card p-3">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(158,165,196,0.4)', marginBottom: 10 }}>{label}</div>
          {list.map(t => (
            <button key={t.id} onClick={() => onSelectTeam(t)} style={{
              display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 6px', minHeight: 44,
              background: 'transparent', border: 'none', borderBottom: '1px solid rgba(94,129,244,0.08)', cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ color: '#e2e5f0', fontSize: '0.85rem' }}>
                {t.city} {t.name}{t.owner_user_id && <span style={{ color: 'var(--color-cyan)', fontSize: '0.7rem' }}> · @{t.owner_user_id}</span>}
              </span>
              <span style={{ color: 'rgba(158,165,196,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{t.wins}-{t.losses}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

// ── Instance picker — public league vs your private leagues ────
const InstancePicker = ({ sharedInstance, personalInstances, onEnter, onCreatePersonal, onDeletePersonal, canManagePublic, generatingPublic }) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async () => {
    setCreating(true);
    try { await onCreatePersonal(newName.trim()); setNewName(''); } finally { setCreating(false); }
  };

  const handleDelete = async (inst) => {
    if (!window.confirm(`Delete "${inst.name}"? This permanently removes its teams, rosters, standings, and trade history — there's no undo.`)) return;
    setDeletingId(inst.id);
    try { await onDeletePersonal(inst.id); } finally { setDeletingId(null); }
  };

  return (
    <div style={{ padding: '30px 16px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: '2.4rem' }}>⚾</div>
        <h1 style={{ color: '#e2e5f0', margin: '6px 0 0' }}>Nova Baseball Simulator</h1>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.88rem' }}>Pick a league to play in.</p>
      </div>

      <div className="neon-card p-3" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>🌐 Public League</div>
        {sharedInstance ? (
          <button className="neon-button" onClick={() => onEnter(sharedInstance)}>Enter {sharedInstance.name}</button>
        ) : canManagePublic ? (
          <button className="neon-button" onClick={() => onEnter(null, true)} disabled={generatingPublic}>
            {generatingPublic ? 'Generating…' : '⚾ Generate Public League'}
          </button>
        ) : (
          <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.85rem' }}>An owner or cofounder needs to generate this first.</p>
        )}
      </div>

      <div className="neon-card p-3">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>🔒 Your Private Leagues</div>
        {personalInstances.length === 0 ? (
          <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem', marginBottom: 12 }}>Just you against 31 CPU teams — good for practice or solo play. Create as many as you like, and delete any you're done with.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {personalInstances.map(inst => (
              <div key={inst.id} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <button className="neon-button" onClick={() => onEnter(inst)} style={{ textAlign: 'left', flex: 1 }}>{inst.name}</button>
                <button
                  onClick={() => handleDelete(inst)}
                  disabled={deletingId === inst.id}
                  title="Delete this league"
                  style={{ padding: '0 14px', background: 'rgba(255,107,122,0.08)', border: '1px solid rgba(255,107,122,0.3)', color: '#ff6b7a', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {deletingId === inst.id ? '…' : '🗑️'}
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="League name (optional)"
          style={{ width: '100%', padding: '9px 12px', marginBottom: 10, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
        />
        <button className="neon-button" onClick={handleCreate} disabled={creating} style={{ borderColor: 'rgba(94,129,244,0.4)' }}>
          {creating ? 'Creating…' : '+ Create Private League'}
        </button>
      </div>
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────
const FranchiseMode = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'cofounder';

  const [sharedInstance, setSharedInstance] = useState(null);
  const [personalInstances, setPersonalInstances] = useState([]);
  const [instance, setInstance] = useState(null); // the one currently entered
  const [pickerLoading, setPickerLoading] = useState(true);
  const [generatingPublic, setGeneratingPublic] = useState(false);

  const [teams, setTeams] = useState([]);
  const [season, setSeason] = useState(null);
  const [leagueAvg, setLeagueAvg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [lastResults, setLastResults] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('standings');
  const [watchingGame, setWatchingGame] = useState(null);

  // ── Load the picker ──
  const loadPicker = useCallback(async () => {
    setPickerLoading(true);
    const [shared, personal] = await Promise.all([
      fdb.getSharedInstance(),
      fdb.getMyPersonalInstances(user?.username),
    ]);
    setSharedInstance(shared);
    setPersonalInstances(personal);
    setPickerLoading(false);
  }, [user]);
  useEffect(() => { loadPicker(); }, [loadPicker]);

  // ── Load an entered instance's data ──
  const loadInstanceData = useCallback(async (inst) => {
    setLoading(true);
    try {
      const [teamList, currentSeason] = await Promise.all([fdb.getTeams(inst.id), fdb.getCurrentSeason(inst.id)]);
      setTeams(teamList);
      setSeason(currentSeason);
      if (currentSeason) setLeagueAvg(await fdb.getLeagueAverages(currentSeason.id));
    } catch (err) {
      setError(err.message || 'Failed to load league data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const enterInstance = async (inst, generatePublicFirst) => {
    if (generatePublicFirst) {
      setGeneratingPublic(true);
      setError('');
      try {
        const created = await fdb.initializeSharedLeague();
        setSharedInstance(created);
        setInstance(created);
        await loadInstanceData(created);
      } catch (err) {
        setError(err.message || 'Failed to generate public league.');
      } finally {
        setGeneratingPublic(false);
      }
      return;
    }
    setInstance(inst);
    setTab('standings');
    setSelectedTeam(null);
    await loadInstanceData(inst);
  };

  const createPersonal = async (name) => {
    setError('');
    try {
      const inst = await fdb.createPersonalInstance(user.username, name);
      setPersonalInstances(prev => [...prev, inst]);
      setInstance(inst);
      await loadInstanceData(inst);
    } catch (err) {
      setError(err.message || 'Failed to create private league.');
    }
  };

  const deletePersonal = async (instanceId) => {
    setError('');
    try {
      await fdb.deletePersonalInstance(instanceId, user.username);
      setPersonalInstances(prev => prev.filter(i => i.id !== instanceId));
      if (instance?.id === instanceId) setInstance(null);
    } catch (err) {
      setError(err.message || 'Failed to delete league.');
    }
  };

  const myTeam = teams.find(t => t.owner_user_id === user?.username);
  const canSimulate = instance?.type === 'personal' ? instance.owner_user_id === user?.username : canManage;
  const preseason = season?.phase === 'preseason';
  const inDraft = season?.phase === 'draft';

  const handleStartSeason = async () => {
    setError('');
    try {
      await fdb.startSeason(season.id);
      await loadInstanceData(instance);
    } catch (err) {
      setError(err.message || 'Failed to start season.');
    }
  };

  const handleSimulateDay = async () => {
    if (!season) return;
    setSimulating(true);
    setError('');
    try {
      const results = await fdb.simulateDay(season.id);
      setLastResults(results);
      await loadInstanceData(instance);
    } catch (err) {
      setError(err.message || 'Failed to simulate day.');
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateSeason = async () => {
    if (!season) return;
    setSimulating(true);
    setError('');
    setSimProgress('Starting…');
    try {
      const result = await fdb.simulateRestOfSeason(season.id, (done, remaining) => {
        setSimProgress(`Simulated ${done} day(s)… ${remaining} to go`);
      });
      setSimProgress(`Done — simulated ${result.daysSimulated} days, ${result.totalGames} games.`);
      await loadInstanceData(instance);
    } catch (err) {
      setError(err.message || 'Failed to simulate season.');
    } finally {
      setSimulating(false);
    }
  };

  const handleClaim = async (teamId) => {
    if (!user?.username) return;
    setError('');
    try {
      await fdb.claimTeam(teamId, user.username, instance.id);
      await loadInstanceData(instance);
      setSelectedTeam(prev => prev ? { ...prev, owner_user_id: user.username } : prev);
    } catch (err) {
      setError(err.message || 'Failed to claim team.');
    }
  };

  if (pickerLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(158,165,196,0.4)' }}>Loading…</div>;
  }

  if (!instance) {
    return (
      <InstancePicker
        sharedInstance={sharedInstance}
        personalInstances={personalInstances}
        onEnter={enterInstance}
        onCreatePersonal={createPersonal}
        onDeletePersonal={deletePersonal}
        canManagePublic={canManage}
        generatingPublic={generatingPublic}
      />
    );
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(158,165,196,0.4)' }}>Loading franchise…</div>;
  }

  if (selectedTeam) {
    return (
      <div style={{ padding: '20px 12px', maxWidth: 900, margin: '0 auto' }}>
        <TeamRoster
          team={teams.find(t => t.id === selectedTeam.id) || selectedTeam}
          seasonId={season?.id}
          leagueAverages={leagueAvg}
          onBack={() => setSelectedTeam(null)}
          canClaim={!!user}
          onClaim={handleClaim}
          user={user}
          preseason={preseason}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 12px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <div>
          <button onClick={() => setInstance(null)} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', fontSize: '0.75rem', marginBottom: 4 }}>← Switch League</button>
          <h1 style={{ color: '#e2e5f0', margin: 0 }}>⚾ {instance.name}</h1>
        </div>
        {season && (
          <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)' }}>
            {season.year} · {season.phase === 'regular' ? `Day ${season.current_day} of ${season.total_days}` : season.phase}
          </div>
        )}
      </div>

      {preseason && (
        <div className="neon-card p-3" style={{ margin: '16px 0', background: 'rgba(94,129,244,0.08)' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 4 }}>🏟️ Preseason — Team Selection Open</div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(158,165,196,0.6)', margin: '0 0 10px' }}>
            Pick your team from Standings below before the season starts.
          </p>
          {canSimulate && (
            <button className="neon-button" onClick={handleStartSeason} style={{ fontSize: '0.95rem', padding: '10px 24px', fontWeight: 800 }}>
              🚀 Start Season
            </button>
          )}
        </div>
      )}

      {!preseason && !inDraft && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['standings', 'trades', 'draft', 'freeagency'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, minHeight: 44,
              background: tab === t ? 'rgba(94,129,244,0.18)' : 'rgba(94,129,244,0.05)',
              border: `1px solid ${tab === t ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
              color: tab === t ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
            }}>
              {{ standings: '📊 Standings', trades: '🔁 Trades', draft: '🎓 Draft', freeagency: '💰 Free Agency' }[t]}
            </button>
          ))}
        </div>
      )}

      {canSimulate && !preseason && season && season.phase === 'regular' && season.current_day <= season.total_days && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="neon-button" onClick={handleSimulateDay} disabled={simulating} style={{ fontWeight: 700 }}>
            {simulating ? 'Simulating…' : '▶ Simulate Next Day'}
          </button>
          <button className="neon-button" onClick={handleSimulateSeason} disabled={simulating} style={{ fontWeight: 700, borderColor: '#f5a623', color: '#f5a623' }}>
            ⏩ Simulate Rest of Season
          </button>
          {simProgress && <span style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)' }}>{simProgress}</span>}
        </div>
      )}

      {error && <div style={{ color: '#ff6b7a', fontSize: '0.85rem', marginBottom: 14 }}>⚠ {error}</div>}

      {lastResults.length > 0 && tab === 'standings' && (
        <div className="neon-card p-3" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)', marginBottom: 8 }}>Yesterday's Results</div>
          {lastResults.map(g => {
            const home = teams.find(t => t.id === g.home_team_id);
            const away = teams.find(t => t.id === g.away_team_id);
            return (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.7)' }}>
                  {away?.name} {g.away_score} @ {home?.name} {g.home_score}
                </span>
                {g.play_by_play?.length > 0 && (
                  <button onClick={() => setWatchingGame(g)} style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'rgba(94,129,244,0.1)', border: '1px solid rgba(94,129,244,0.3)', color: 'var(--color-cyan)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
                    ▶ Watch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {watchingGame && (
        <GameFieldViewer
          game={watchingGame}
          homeTeam={teams.find(t => t.id === watchingGame.home_team_id)}
          awayTeam={teams.find(t => t.id === watchingGame.away_team_id)}
          onClose={() => setWatchingGame(null)}
        />
      )}

      {inDraft ? (
        <FranchiseDraft instance={instance} season={season} teams={teams} myTeam={myTeam} onChanged={() => loadInstanceData(instance)} />
      ) : tab === 'standings' ? (
        <Standings teams={teams} onSelectTeam={setSelectedTeam} />
      ) : tab === 'trades' ? (
        <FranchiseTrades instance={instance} teams={teams} myTeam={myTeam} onChanged={() => loadInstanceData(instance)} />
      ) : tab === 'draft' ? (
        <FranchiseDraft instance={instance} season={season} teams={teams} myTeam={myTeam} onChanged={() => loadInstanceData(instance)} />
      ) : (
        <FranchiseFreeAgency instance={instance} myTeam={myTeam} canManage={canSimulate} onChanged={() => loadInstanceData(instance)} />
      )}
    </div>
  );
};

export default FranchiseMode;
