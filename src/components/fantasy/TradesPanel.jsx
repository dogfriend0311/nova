import React, { useState, useEffect, useCallback } from 'react';
import fantasyDb from '../../services/fantasyDb';

/**
 * TradesPanel — propose, accept, reject, cancel, and veto trades.
 *
 * Veto design: Commissioner can veto any trade in 'pending' or 'accepted' status.
 * When a receiving team clicks Accept, the trade is immediately moved to 'completed'
 * and roster moves execute. The commissioner can still veto a 'pending' trade before
 * the receiving team accepts. Once 'completed', the veto button no longer appears
 * (keep it simple — no rollback of completed roster moves).
 */
const TradesPanel = ({ league, teams, myTeam, isCommissioner }) => {
  const [trades, setTrades] = useState([]);
  const [allRosters, setAllRosters] = useState({}); // teamId -> roster entries
  const [allPlayers, setAllPlayers] = useState({}); // playerId -> player
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Propose form
  const [showForm, setShowForm] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [offeredIds, setOfferedIds] = useState([]); // player ids from myTeam roster
  const [requestedIds, setRequestedIds] = useState([]); // player ids from target team roster
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!league || !myTeam) return;
    setLoading(true);
    try {
      const [players, tradesData] = await Promise.all([
        fantasyDb.getPlayers(league.sport),
        fantasyDb.getTrades(league.id),
      ]);

      const playerMap = {};
      players.forEach(p => { playerMap[p.id] = p; });
      setAllPlayers(playerMap);
      setTrades(tradesData);

      // Load rosters for all teams
      const rosterEntries = await Promise.all(teams.map(t => fantasyDb.getRoster(t.id)));
      const rosterMap = {};
      teams.forEach((t, i) => { rosterMap[t.id] = rosterEntries[i]; });
      setAllRosters(rosterMap);
    } catch {
      setError('Failed to load trade data.');
    } finally {
      setLoading(false);
    }
  }, [league, myTeam, teams]);

  useEffect(() => { loadData(); }, [loadData]);

  const myRoster = allRosters[myTeam?.id] || [];
  const targetRoster = targetTeamId ? (allRosters[targetTeamId] || []) : [];
  const otherTeams = teams.filter(t => t.id !== myTeam?.id);

  const incoming = trades.filter(t => t.receiving_team_id === myTeam?.id && t.status === 'pending');
  const outgoing = trades.filter(t => t.proposing_team_id === myTeam?.id && ['pending', 'accepted'].includes(t.status));
  const resolved = trades.filter(t =>
    (t.proposing_team_id === myTeam?.id || t.receiving_team_id === myTeam?.id) &&
    ['completed', 'rejected', 'vetoed'].includes(t.status)
  );
  const allPending = isCommissioner
    ? trades.filter(t => ['pending', 'accepted'].includes(t.status))
    : [];

  const toggleId = (list, setList, id) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!targetTeamId) { setFormError('Select a team to trade with.'); return; }
    if (offeredIds.length === 0) { setFormError('Select at least one player to offer.'); return; }
    if (requestedIds.length === 0) { setFormError('Select at least one player to request.'); return; }
    setSubmitting(true);
    try {
      await fantasyDb.proposeTrade({
        league_id: league.id,
        proposing_team_id: myTeam.id,
        receiving_team_id: targetTeamId,
        offered_player_ids: offeredIds,
        requested_player_ids: requestedIds,
      });
      setSuccess('Trade proposal sent!');
      setShowForm(false);
      setOfferedIds([]);
      setRequestedIds([]);
      setTargetTeamId('');
      await loadData();
    } catch {
      setFormError('Failed to propose trade.');
    } finally {
      setSubmitting(false);
    }
  };

  const executeTrade = async (trade) => {
    // Move offered players from proposing team to receiving team
    const proposingRoster = allRosters[trade.proposing_team_id] || [];
    const receivingRoster = allRosters[trade.receiving_team_id] || [];

    const offeredEntries = proposingRoster.filter(r => trade.offered_player_ids.includes(r.player_id));
    const requestedEntries = receivingRoster.filter(r => trade.requested_player_ids.includes(r.player_id));

    await Promise.all([
      ...offeredEntries.map(r => fantasyDb.removeFromRoster(r.id)),
      ...requestedEntries.map(r => fantasyDb.removeFromRoster(r.id)),
    ]);
    await Promise.all([
      ...offeredEntries.map(r => fantasyDb.addToRoster(trade.receiving_team_id, r.player_id, 'BENCH', 'trade')),
      ...requestedEntries.map(r => fantasyDb.addToRoster(trade.proposing_team_id, r.player_id, 'BENCH', 'trade')),
    ]);
  };

  const handleAccept = async (trade) => {
    try {
      await executeTrade(trade);
      await fantasyDb.updateTrade(trade.id, { status: 'completed' });
      setSuccess('Trade accepted and completed!');
      await loadData();
    } catch {
      setError('Failed to accept trade.');
    }
  };

  const handleReject = async (trade) => {
    try {
      await fantasyDb.updateTrade(trade.id, { status: 'rejected' });
      setSuccess('Trade rejected.');
      await loadData();
    } catch {
      setError('Failed to reject trade.');
    }
  };

  const handleCancel = async (trade) => {
    try {
      await fantasyDb.updateTrade(trade.id, { status: 'rejected' });
      setSuccess('Trade cancelled.');
      await loadData();
    } catch {
      setError('Failed to cancel trade.');
    }
  };

  const handleVeto = async (trade) => {
    try {
      await fantasyDb.updateTrade(trade.id, { status: 'vetoed' });
      setSuccess('Trade vetoed.');
      await loadData();
    } catch {
      setError('Failed to veto trade.');
    }
  };

  const teamName = (id) => teams.find(t => t.id === id)?.team_name || id?.slice(0, 8);

  const renderPlayerList = (playerIds) => {
    if (!playerIds || playerIds.length === 0) return <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>;
    return playerIds.map(pid => {
      const p = allPlayers[pid];
      return p
        ? <span key={pid} className="trade-player-chip">{p.name} <span className="slot-pill">{p.position || '?'}</span></span>
        : <span key={pid} className="trade-player-chip">{pid.slice(0, 8)}</span>;
    });
  };

  const statusBadge = (status) => {
    const map = {
      pending: 'trade-badge-pending',
      accepted: 'trade-badge-accepted',
      completed: 'trade-badge-completed',
      rejected: 'trade-badge-rejected',
      vetoed: 'trade-badge-vetoed',
    };
    return <span className={`trade-status-badge ${map[status] || ''}`}>{status}</span>;
  };

  if (loading) return <div className="empty-state">Loading trades…</div>;

  return (
    <div className="trades-panel">
      {error && <div className="error-text waiver-alert">{error}</div>}
      {success && <div className="success-text waiver-alert">{success}</div>}

      {/* Header */}
      <div className="waiver-header">
        <div>
          <h2 className="gradient-text-cyan">Trades</h2>
          <p className="waiver-sub">Propose, accept, or manage trades with other teams</p>
        </div>
        <button className="neon-button" onClick={() => { setShowForm(v => !v); setFormError(''); }}>
          {showForm ? 'Cancel' : '+ Propose Trade'}
        </button>
      </div>

      {/* Propose Form */}
      {showForm && (
        <div className="neon-card waiver-form-card">
          <h3>Propose a Trade</h3>
          <form onSubmit={handlePropose}>
            <div className="form-row">
              <label>Trade With</label>
              <select value={targetTeamId} onChange={e => { setTargetTeamId(e.target.value); setRequestedIds([]); }}>
                <option value="">— Select team —</option>
                {otherTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.team_name} ({t.owner_username})</option>
                ))}
              </select>
            </div>

            <div className="trade-picker-grid">
              <div className="trade-picker-col">
                <label className="trade-picker-label">Your Players to Offer</label>
                <div className="trade-player-list">
                  {myRoster.length === 0 && <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>No roster players.</div>}
                  {myRoster.map(r => {
                    const p = allPlayers[r.player_id];
                    const selected = offeredIds.includes(r.player_id);
                    return (
                      <div
                        key={r.id}
                        className={`trade-player-row ${selected ? 'selected' : ''}`}
                        onClick={() => toggleId(offeredIds, setOfferedIds, r.player_id)}
                      >
                        <span className="slot-pill">{p?.position || '?'}</span>
                        <span className="trade-player-name">{p ? p.name : r.player_id.slice(0, 8)}</span>
                        {selected && <span className="trade-check">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="trade-picker-divider">⇆</div>

              <div className="trade-picker-col">
                <label className="trade-picker-label">Their Players to Request</label>
                <div className="trade-player-list">
                  {!targetTeamId && <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>Select a team first.</div>}
                  {targetTeamId && targetRoster.length === 0 && <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>No roster players.</div>}
                  {targetRoster.map(r => {
                    const p = allPlayers[r.player_id];
                    const selected = requestedIds.includes(r.player_id);
                    return (
                      <div
                        key={r.id}
                        className={`trade-player-row ${selected ? 'selected' : ''}`}
                        onClick={() => toggleId(requestedIds, setRequestedIds, r.player_id)}
                      >
                        <span className="slot-pill">{p?.position || '?'}</span>
                        <span className="trade-player-name">{p ? p.name : r.player_id.slice(0, 8)}</span>
                        {selected && <span className="trade-check">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {formError && <div className="error-text" style={{ marginTop: 8 }}>{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="neon-button" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Incoming Proposals */}
      <div className="waiver-section">
        <h3>Incoming Proposals <span className="fa-count">({incoming.length})</span></h3>
        {incoming.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>No incoming trade proposals.</div>
        ) : incoming.map(trade => (
          <div key={trade.id} className="neon-card trade-card">
            <div className="trade-card-header">
              <span className="trade-from">From: <strong>{teamName(trade.proposing_team_id)}</strong></span>
              {statusBadge(trade.status)}
            </div>
            <div className="trade-sides">
              <div className="trade-side">
                <div className="trade-side-label">They offer you</div>
                <div className="trade-chips">{renderPlayerList(trade.offered_player_ids)}</div>
              </div>
              <div className="trade-arrow">→</div>
              <div className="trade-side">
                <div className="trade-side-label">You send them</div>
                <div className="trade-chips">{renderPlayerList(trade.requested_player_ids)}</div>
              </div>
            </div>
            <div className="trade-card-actions">
              <button className="neon-button" onClick={() => handleAccept(trade)}>Accept</button>
              <button className="neon-button-magenta neon-button" onClick={() => handleReject(trade)}>Reject</button>
              {isCommissioner && (
                <button className="btn-ghost trade-veto-btn" onClick={() => handleVeto(trade)}>🚫 Veto</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Outgoing Proposals */}
      <div className="waiver-section">
        <h3>Outgoing Proposals <span className="fa-count">({outgoing.length})</span></h3>
        {outgoing.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>No outgoing proposals.</div>
        ) : outgoing.map(trade => (
          <div key={trade.id} className="neon-card trade-card">
            <div className="trade-card-header">
              <span className="trade-from">To: <strong>{teamName(trade.receiving_team_id)}</strong></span>
              {statusBadge(trade.status)}
            </div>
            <div className="trade-sides">
              <div className="trade-side">
                <div className="trade-side-label">You offer</div>
                <div className="trade-chips">{renderPlayerList(trade.offered_player_ids)}</div>
              </div>
              <div className="trade-arrow">→</div>
              <div className="trade-side">
                <div className="trade-side-label">You request</div>
                <div className="trade-chips">{renderPlayerList(trade.requested_player_ids)}</div>
              </div>
            </div>
            <div className="trade-card-actions">
              {trade.status === 'pending' && (
                <button className="btn-ghost" onClick={() => handleCancel(trade)}>Cancel</button>
              )}
              {isCommissioner && (
                <button className="btn-ghost trade-veto-btn" onClick={() => handleVeto(trade)}>🚫 Veto</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Commissioner: all pending/accepted trades */}
      {isCommissioner && allPending.filter(t => t.proposing_team_id !== myTeam?.id && t.receiving_team_id !== myTeam?.id).length > 0 && (
        <div className="waiver-section">
          <h3>All Pending Trades (Commissioner View)</h3>
          {allPending.filter(t => t.proposing_team_id !== myTeam?.id && t.receiving_team_id !== myTeam?.id).map(trade => (
            <div key={trade.id} className="neon-card trade-card">
              <div className="trade-card-header">
                <span className="trade-from">
                  <strong>{teamName(trade.proposing_team_id)}</strong> ↔ <strong>{teamName(trade.receiving_team_id)}</strong>
                </span>
                {statusBadge(trade.status)}
              </div>
              <div className="trade-sides">
                <div className="trade-side">
                  <div className="trade-side-label">Offered</div>
                  <div className="trade-chips">{renderPlayerList(trade.offered_player_ids)}</div>
                </div>
                <div className="trade-arrow">⇆</div>
                <div className="trade-side">
                  <div className="trade-side-label">Requested</div>
                  <div className="trade-chips">{renderPlayerList(trade.requested_player_ids)}</div>
                </div>
              </div>
              <div className="trade-card-actions">
                <button className="btn-ghost trade-veto-btn" onClick={() => handleVeto(trade)}>🚫 Veto</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved Trades History */}
      <div className="waiver-section">
        <h3>Trade History</h3>
        {resolved.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>No resolved trades yet.</div>
        ) : resolved.map(trade => (
          <div key={trade.id} className="neon-card trade-card trade-card-resolved">
            <div className="trade-card-header">
              <span className="trade-from">
                <strong>{teamName(trade.proposing_team_id)}</strong> ↔ <strong>{teamName(trade.receiving_team_id)}</strong>
              </span>
              {statusBadge(trade.status)}
            </div>
            <div className="trade-sides">
              <div className="trade-side">
                <div className="trade-side-label">Offered</div>
                <div className="trade-chips">{renderPlayerList(trade.offered_player_ids)}</div>
              </div>
              <div className="trade-arrow">⇆</div>
              <div className="trade-side">
                <div className="trade-side-label">Requested</div>
                <div className="trade-chips">{renderPlayerList(trade.requested_player_ids)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradesPanel;
