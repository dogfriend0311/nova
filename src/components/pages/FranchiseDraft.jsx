import React, { useState, useEffect, useCallback } from 'react';
import * as fdb from '../../services/franchiseDb';

const FranchiseDraft = ({ instance, season, teams, myTeam, onChanged }) => {
  const [currentPick, setCurrentPick] = useState(null);
  const [available,   setAvailable]   = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [starting,     setStarting]   = useState(false);
  const [picking,      setPicking]    = useState(false);
  const [error,        setError]      = useState('');
  const [recentPicks,  setRecentPicks] = useState([]);

  const inDraft = season?.phase === 'draft';

  const refresh = useCallback(async () => {
    if (!inDraft) { setLoading(false); return; }
    setLoading(true);
    try {
      const cpuMade = await fdb.autoAdvanceCpuPicks(instance.id, season.id);
      if (cpuMade.length) setRecentPicks(prev => [...cpuMade, ...prev].slice(0, 8));
      const pick = await fdb.getCurrentPick(season.id);
      setCurrentPick(pick);
      if (pick) setAvailable(await fdb.getAvailableProspects(instance.id));
      else setAvailable([]);
    } catch (err) {
      setError(err.message || 'Failed to load draft state.');
    } finally {
      setLoading(false);
    }
  }, [inDraft, instance, season]);

  useEffect(() => { refresh(); }, [refresh]);

  const startDraft = async () => {
    setStarting(true);
    setError('');
    try {
      await fdb.startDraft(instance.id, season.id, 10);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to start draft.');
    } finally {
      setStarting(false);
    }
  };

  const makePick = async (playerId) => {
    if (!currentPick) return;
    setPicking(true);
    setError('');
    try {
      await fdb.makeDraftPick(currentPick.id, playerId);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to make pick.');
    } finally {
      setPicking(false);
    }
  };

  const finishUp = async () => {
    await fdb.finishDraft(season.id);
    onChanged?.();
  };

  if (!inDraft) {
    return (
      <div style={{ textAlign: 'center', padding: 30 }}>
        <p style={{ color: 'rgba(158,165,196,0.5)', marginBottom: 16 }}>No draft is currently active.</p>
        <button className="neon-button" onClick={startDraft} disabled={starting}>
          {starting ? 'Setting up draft…' : '🎓 Start Draft (10 rounds)'}
        </button>
        {error && <div style={{ color: '#ff6b7a', fontSize: '0.82rem', marginTop: 12 }}>⚠ {error}</div>}
      </div>
    );
  }

  if (loading) return <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 30 }}>Loading draft…</div>;

  if (!currentPick) {
    return (
      <div style={{ textAlign: 'center', padding: 30 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
        <p style={{ color: '#e2e5f0', marginBottom: 16 }}>Draft complete!</p>
        <button className="neon-button" onClick={finishUp}>Return to Season</button>
      </div>
    );
  }

  const onClockTeam = teams.find(t => t.id === currentPick.team_id);
  const isMyPick = myTeam && currentPick.team_id === myTeam.id;

  return (
    <div>
      <div className="neon-card p-3" style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Round {currentPick.round} · Pick {currentPick.pick_number}
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-cyan)', margin: '4px 0' }}>
          On the clock: {onClockTeam?.city} {onClockTeam?.name}
        </div>
        {isMyPick && <div style={{ color: '#43b581', fontSize: '0.85rem' }}>Your pick — choose a prospect below</div>}
      </div>

      {recentPicks.length > 0 && (
        <div style={{ marginBottom: 16, fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)' }}>
          Auto-picked by CPU teams: {recentPicks.length} prospect(s) since your last visit
        </div>
      )}

      {error && <div style={{ color: '#ff6b7a', fontSize: '0.82rem', marginBottom: 12 }}>⚠ {error}</div>}

      {isMyPick ? (
        <div className="neon-card p-3" style={{ maxHeight: 500, overflowY: 'auto' }}>
          {available.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderBottom: '1px solid rgba(94,129,244,0.08)' }}>
              <span style={{ width: 34, fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-cyan)' }}>{p.position}</span>
              <span style={{ minWidth: 130, fontSize: '0.85rem', color: '#e2e5f0' }}>{p.first_name} {p.last_name}</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>Age {p.age}</span>
              <span style={{ flex: 1, fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>
                {p.is_pitcher ? `STU ${p.stuff} / CTL ${p.control}` : `CON ${p.contact} / POW ${p.power} / SPD ${p.speed}`}
              </span>
              <button className="neon-button" disabled={picking} onClick={() => makePick(p.id)} style={{ padding: '5px 14px', fontSize: '0.78rem' }}>
                Draft
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>
          Waiting on {onClockTeam?.name} — check back or refresh.
        </div>
      )}
    </div>
  );
};

export default FranchiseDraft;
