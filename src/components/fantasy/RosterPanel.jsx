import React, { useEffect, useState } from 'react';
import fantasyDb from '../../services/fantasyDb';
import db from '../../services/db';
import { rosterSlotList } from './fantasyUtils';
import './FantasyHub.css';

const RESULT_LABELS = { W: '🟢 W', L: '🔴 L', T: '🟡 T' };
const RESULT_COLORS = { W: 'var(--color-success, #22c55e)', L: 'var(--color-error, #ef4444)', T: '#eab308' };

const RosterPanel = ({ league, myTeam }) => {
  const [activeView, setActiveView] = useState('roster');

  // ── Roster state ──────────────────────────────────────────────────
  const [roster,      setRoster]      = useState([]);
  const [players,     setPlayers]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [pool,        setPool]        = useState([]);
  const [search,      setSearch]      = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [rosteredIds, setRosteredIds] = useState(new Set());

  // ── Schedule state ────────────────────────────────────────────────
  const [schedule,    setSchedule]    = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);

  /* ── Roster loader ───────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    const r = await fantasyDb.getRoster(myTeam.id);
    setRoster(r);
    const allPlayers = await fantasyDb.getPlayers(league.sport);
    const map = {};
    allPlayers.forEach(p => { map[p.id] = p; });
    setPlayers(map);
    setPool(allPlayers);
    const ids = await fantasyDb.getLeagueRosteredPlayerIds(league.id);
    setRosteredIds(ids);
    setLoading(false);
  };

  /* ── Schedule loader ─────────────────────────────────────────── */
  const loadSchedule = async () => {
    setSchedLoading(true);
    try {
      const entries = await db.getTeamSchedule(myTeam.id);
      setSchedule(entries);
    } catch { setSchedule([]); }
    setSchedLoading(false);
  };

  useEffect(() => { load(); }, [myTeam.id, league.id]); // eslint-disable-line

  useEffect(() => {
    if (activeView === 'schedule') loadSchedule();
  }, [activeView, myTeam.id]); // eslint-disable-line

  const syncPool = async () => {
    setLoading(true);
    try { await fantasyDb.syncPlayerPoolFromEspn(league.sport); } catch {}
    await load();
  };

  const slots = rosterSlotList(league.sport);
  const filledSlots  = roster.filter(r => r.slot !== 'BENCH');
  const benchEntries = roster.filter(r => r.slot === 'BENCH');

  const setSlot = async (entryId, slot) => {
    await fantasyDb.setRosterSlot(entryId, slot);
    load();
  };

  const drop = async (entryId) => {
    await fantasyDb.removeFromRoster(entryId);
    load();
  };

  const addFreeAgent = async (playerId) => {
    await fantasyDb.addToRoster(myTeam.id, playerId, 'BENCH', 'free_agent');
    setShowAdd(false);
    load();
  };

  const availablePlayers = pool
    .filter(p => !rosteredIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 40);

  /* ── Shared header ───────────────────────────────────────────── */
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <h2 style={{ margin: 0 }}>{myTeam.team_name}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className={`btn-ghost ${activeView === 'roster' ? 'active' : ''}`}
          style={{ fontWeight: activeView === 'roster' ? 700 : 400, color: activeView === 'roster' ? 'var(--color-cyan)' : undefined }}
          onClick={() => setActiveView('roster')}
        >📋 Roster</button>
        <button
          className={`btn-ghost ${activeView === 'schedule' ? 'active' : ''}`}
          style={{ fontWeight: activeView === 'schedule' ? 700 : 400, color: activeView === 'schedule' ? 'var(--color-cyan)' : undefined }}
          onClick={() => setActiveView('schedule')}
        >📅 Schedule</button>
      </div>
    </div>
  );

  /* ── Roster view ─────────────────────────────────────────────── */
  if (activeView === 'roster') {
    if (loading) return <p style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Loading roster…</p>;
    return (
      <div>
        {header}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
          <button className="btn-ghost" onClick={syncPool}>Sync Players from ESPN</button>
          <button className="neon-button" onClick={() => setShowAdd(true)}>+ Add Free Agent</button>
        </div>

        {pool.length === 0 && (
          <div className="empty-state">No players cached yet. Click "Sync Players from ESPN" to load the pool.</div>
        )}

        <table className="roster-table">
          <thead><tr><th>Slot</th><th>Player</th><th>Pos</th><th>Team</th><th></th></tr></thead>
          <tbody>
            {roster.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Empty roster — draft or add free agents.</td></tr>
            )}
            {[...filledSlots, ...benchEntries].map(entry => {
              const p = players[entry.player_id];
              return (
                <tr key={entry.id}>
                  <td>
                    <select value={entry.slot} onChange={(e) => setSlot(entry.id, e.target.value)}>
                      {[...new Set([entry.slot, ...slots])].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{p?.name || 'Unknown player'}</td>
                  <td><span className="slot-pill">{p?.position || '—'}</span></td>
                  <td>{p?.team_abbr || '—'}</td>
                  <td><button className="btn-ghost" onClick={() => drop(entry.id)}>Drop</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {showAdd && (
          <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <h2 className="gradient-text-cyan">Add Free Agent</h2>
              <div className="form-row">
                <input autoFocus placeholder="Search players…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {availablePlayers.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid rgba(94,129,244,0.1)' }}>
                    <span>{p.name} <span className="slot-pill">{p.position}</span> {p.team_abbr}</span>
                    <button className="btn-ghost" onClick={() => addFreeAgent(p.id)}>Add</button>
                  </div>
                ))}
                {availablePlayers.length === 0 && <p style={{ color: 'var(--color-text-tertiary)' }}>No matching free agents.</p>}
              </div>
              <div className="modal-actions"><button className="btn-ghost" onClick={() => setShowAdd(false)}>Close</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Schedule view ───────────────────────────────────────────── */
  const wins   = schedule.filter(e => e.result === 'W').length;
  const losses = schedule.filter(e => e.result === 'L').length;
  const ties   = schedule.filter(e => e.result === 'T').length;

  return (
    <div>
      {header}

      {schedLoading ? (
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Loading schedule…</p>
      ) : schedule.length === 0 ? (
        <div className="empty-state">
          No schedule yet. Ask your league commissioner to add games via the admin panel.
        </div>
      ) : (
        <>
          {/* Record summary */}
          <div className="neon-card" style={{ display: 'flex', gap: 28, padding: '14px 20px', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success, #22c55e)' }}>{wins}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Wins</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-error, #ef4444)' }}>{losses}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Losses</div>
            </div>
            {ties > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#eab308' }}>{ties}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Ties</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>{schedule.length - wins - losses - ties}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Upcoming</div>
            </div>
          </div>

          {/* Schedule table */}
          <table className="roster-table">
            <thead>
              <tr>
                <th>Wk</th>
                <th>Opponent</th>
                <th>Location</th>
                <th>Date</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(entry => (
                <tr key={entry.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-cyan)' }}>{entry.week ?? '—'}</td>
                  <td>{entry.opponent || '—'}</td>
                  <td>
                    <span className="slot-pill" style={{ background: entry.is_home ? 'rgba(94,129,244,0.15)' : 'rgba(255,100,255,0.1)', color: entry.is_home ? 'var(--color-cyan)' : 'var(--color-magenta)' }}>
                      {entry.is_home ? 'HOME' : 'AWAY'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    {entry.game_date ? new Date(entry.game_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '0.9rem' }}>{entry.score || '—'}</td>
                  <td>
                    {entry.result ? (
                      <span style={{ fontWeight: 700, color: RESULT_COLORS[entry.result] }}>{RESULT_LABELS[entry.result] || entry.result}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>TBD</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default RosterPanel;
