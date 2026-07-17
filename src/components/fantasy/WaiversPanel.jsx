import React, { useState, useEffect, useCallback } from 'react';
import fantasyDb from '../../services/fantasyDb';

const WaiversPanel = ({ league, teams, myTeam, isCommissioner }) => {
  const [freeAgents, setFreeAgents] = useState([]);
  const [myRoster, setMyRoster] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Claim form state
  const [showForm, setShowForm] = useState(false);
  const [addPlayerId, setAddPlayerId] = useState('');
  const [dropRosterEntryId, setDropRosterEntryId] = useState('');
  const [bidAmount, setBidAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    if (!league || !myTeam) return;
    setLoading(true);
    try {
      const [players, rosteredIds, myRosterData, claimsData] = await Promise.all([
        fantasyDb.getPlayers(league.sport),
        fantasyDb.getLeagueRosteredPlayerIds(league.id),
        fantasyDb.getRoster(myTeam.id),
        fantasyDb.getWaiverClaims(league.id),
      ]);

      const playerMap = {};
      players.forEach(p => { playerMap[p.id] = p; });
      setAllPlayers(playerMap);

      const fas = players.filter(p => !rosteredIds.has(p.id));
      setFreeAgents(fas);
      setMyRoster(myRosterData);
      setClaims(claimsData);
    } catch (e) {
      setError('Failed to load waiver data.');
    } finally {
      setLoading(false);
    }
  }, [league, myTeam]);

  useEffect(() => { loadData(); }, [loadData]);

  const myClaims = claims.filter(c => c.team_id === myTeam?.id);
  const pendingMyClaims = myClaims.filter(c => c.status === 'pending');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!addPlayerId) { setFormError('Select a player to add.'); return; }
    const bid = parseInt(bidAmount, 10) || 0;
    if (bid < 0) { setFormError('Bid cannot be negative.'); return; }
    if (bid > (myTeam?.faab_balance ?? 0)) { setFormError(`Bid exceeds your FAAB balance ($${myTeam?.faab_balance}).`); return; }

    // Check for duplicate pending claim on same player
    const dupe = pendingMyClaims.find(c => c.add_player_id === addPlayerId);
    if (dupe) { setFormError('You already have a pending claim for that player.'); return; }

    setSubmitting(true);
    try {
      await fantasyDb.submitWaiverClaim({
        league_id: league.id,
        team_id: myTeam.id,
        add_player_id: addPlayerId,
        drop_player_id: dropRosterEntryId
          ? myRoster.find(r => r.id === dropRosterEntryId)?.player_id || null
          : null,
        drop_roster_entry_id: dropRosterEntryId || null,
        bid_amount: bid,
        week: league.current_week,
      });
      setSuccess('Waiver claim submitted!');
      setShowForm(false);
      setAddPlayerId('');
      setDropRosterEntryId('');
      setBidAmount(0);
      await loadData();
    } catch (e) {
      setFormError('Failed to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (claimId) => {
    try {
      await fantasyDb.cancelWaiverClaim(claimId);
      setSuccess('Claim cancelled.');
      await loadData();
    } catch { setError('Failed to cancel claim.'); }
  };

  const handleProcessWaivers = async () => {
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      const week = league.current_week;
      const weekClaims = claims.filter(c => c.status === 'pending' && c.week === week);

      // Group by add_player_id
      const byPlayer = {};
      weekClaims.forEach(c => {
        if (!byPlayer[c.add_player_id]) byPlayer[c.add_player_id] = [];
        byPlayer[c.add_player_id].push(c);
      });

      // Re-fetch rosters to check current rostered ids
      const currentRosteredIds = await fantasyDb.getLeagueRosteredPlayerIds(league.id);

      for (const [playerId, playerClaims] of Object.entries(byPlayer)) {
        // Skip if player is already rostered (claimed by an earlier-processed group)
        if (currentRosteredIds.has(playerId)) {
          for (const c of playerClaims) {
            await fantasyDb.updateWaiverClaim(c.id, { status: 'lost', processed_at: new Date().toISOString() });
          }
          continue;
        }

        // Sort: highest bid first, ties broken by earliest created_at
        playerClaims.sort((a, b) => {
          if (b.bid_amount !== a.bid_amount) return b.bid_amount - a.bid_amount;
          return new Date(a.created_at) - new Date(b.created_at);
        });

        const winner = playerClaims[0];
        const winnerTeam = teams.find(t => t.id === winner.team_id);

        if (winnerTeam) {
          // Add player to winner's roster
          await fantasyDb.addToRoster(winner.team_id, playerId, 'BENCH', 'waiver');
          currentRosteredIds.add(playerId);

          // Drop player if specified
          if (winner.drop_roster_entry_id) {
            try { await fantasyDb.removeFromRoster(winner.drop_roster_entry_id); } catch {}
          } else if (winner.drop_player_id) {
            // Try to find the roster entry for this player on their team
            const teamRoster = await fantasyDb.getRoster(winner.team_id);
            const entry = teamRoster.find(r => r.player_id === winner.drop_player_id);
            if (entry) await fantasyDb.removeFromRoster(entry.id);
          }

          // Deduct FAAB
          const newBalance = Math.max(0, (winnerTeam.faab_balance ?? 0) - (winner.bid_amount ?? 0));
          await fantasyDb.updateTeam(winner.team_id, { faab_balance: newBalance });

          // Mark winner
          await fantasyDb.updateWaiverClaim(winner.id, { status: 'won', processed_at: new Date().toISOString() });
        }

        // Mark losers
        for (const c of playerClaims.slice(1)) {
          await fantasyDb.updateWaiverClaim(c.id, { status: 'lost', processed_at: new Date().toISOString() });
        }
      }

      setSuccess(`Waivers processed for Week ${week}!`);
      await loadData();
    } catch (e) {
      setError('Error processing waivers: ' + (e.message || ''));
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', cls: 'waiver-badge-pending' },
      won: { label: 'Won ✓', cls: 'waiver-badge-won' },
      lost: { label: 'Lost', cls: 'waiver-badge-lost' },
      cancelled: { label: 'Cancelled', cls: 'waiver-badge-cancelled' },
    };
    const s = map[status] || { label: status, cls: '' };
    return <span className={`waiver-status-badge ${s.cls}`}>{s.label}</span>;
  };

  if (loading) return <div className="empty-state">Loading waivers…</div>;

  return (
    <div className="waivers-panel">
      {error && <div className="error-text waiver-alert">{error}</div>}
      {success && <div className="success-text waiver-alert">{success}</div>}

      {/* Header */}
      <div className="waiver-header">
        <div>
          <h2 className="gradient-text-cyan">FAAB Waivers</h2>
          <p className="waiver-sub">Week {league.current_week} · Your balance: <strong className="faab-balance">${myTeam?.faab_balance ?? 0}</strong></p>
        </div>
        <div className="waiver-header-actions">
          {isCommissioner && (
            <button
              className="neon-button-magenta neon-button waiver-process-btn"
              onClick={handleProcessWaivers}
              disabled={processing}
            >
              {processing ? 'Processing…' : `Process Week ${league.current_week} Waivers`}
            </button>
          )}
          <button className="neon-button" onClick={() => { setShowForm(v => !v); setFormError(''); }}>
            {showForm ? 'Cancel' : '+ Claim Player'}
          </button>
        </div>
      </div>

      {/* Claim Form */}
      {showForm && (
        <div className="neon-card waiver-form-card">
          <h3>Submit Waiver Claim</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Player to Add *</label>
              <select value={addPlayerId} onChange={e => setAddPlayerId(e.target.value)} required>
                <option value="">— Select free agent —</option>
                {freeAgents.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position || '?'}) {p.team_abbr ? `· ${p.team_abbr}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Player to Drop (optional)</label>
              <select value={dropRosterEntryId} onChange={e => setDropRosterEntryId(e.target.value)}>
                <option value="">— Keep current roster —</option>
                {myRoster.map(r => {
                  const p = allPlayers[r.player_id];
                  return (
                    <option key={r.id} value={r.id}>
                      {p ? `${p.name} (${p.position || '?'})` : r.player_id}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-row">
              <label>FAAB Bid ($0–${myTeam?.faab_balance ?? 0})</label>
              <input
                type="number"
                min="0"
                max={myTeam?.faab_balance ?? 0}
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
              />
            </div>
            {formError && <div className="error-text">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="neon-button" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Claims */}
      <div className="waiver-section">
        <h3>My Claims</h3>
        {myClaims.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>No claims yet.</div>
        ) : (
          <table className="roster-table">
            <thead>
              <tr>
                <th>Add</th>
                <th>Drop</th>
                <th>Bid</th>
                <th>Week</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {myClaims.map(c => {
                const addP = allPlayers[c.add_player_id];
                const dropP = c.drop_player_id ? allPlayers[c.drop_player_id] : null;
                return (
                  <tr key={c.id}>
                    <td>{addP ? addP.name : c.add_player_id.slice(0, 8)}</td>
                    <td>{dropP ? dropP.name : c.drop_player_id ? c.drop_player_id.slice(0, 8) : '—'}</td>
                    <td><strong>${c.bid_amount}</strong></td>
                    <td><span className="slot-pill">W{c.week}</span></td>
                    <td>{statusBadge(c.status)}</td>
                    <td>
                      {c.status === 'pending' && (
                        <button className="btn-ghost waiver-cancel-btn" onClick={() => handleCancel(c.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Free Agent Pool */}
      <div className="waiver-section">
        <h3>Free Agent Pool <span className="fa-count">({freeAgents.length} available)</span></h3>
        {freeAgents.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>No free agents available.</div>
        ) : (
          <table className="roster-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Pos</th>
                <th>Team</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {freeAgents.slice(0, 50).map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><span className="slot-pill">{p.position || '?'}</span></td>
                  <td>{p.team_abbr || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{p.status || ''}</td>
                  <td>
                    <button
                      className="btn-ghost waiver-quick-claim"
                      onClick={() => { setAddPlayerId(p.id); setShowForm(true); }}
                    >
                      Claim
                    </button>
                  </td>
                </tr>
              ))}
              {freeAgents.length > 50 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '8px' }}>
                    + {freeAgents.length - 50} more players
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Commissioner: all pending claims for the week */}
      {isCommissioner && (
        <div className="waiver-section">
          <h3>All Pending Claims (Week {league.current_week})</h3>
          {claims.filter(c => c.status === 'pending' && c.week === league.current_week).length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>No pending claims this week.</div>
          ) : (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Add</th>
                  <th>Drop</th>
                  <th>Bid</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {claims
                  .filter(c => c.status === 'pending' && c.week === league.current_week)
                  .sort((a, b) => b.bid_amount - a.bid_amount)
                  .map(c => {
                    const team = teams.find(t => t.id === c.team_id);
                    const addP = allPlayers[c.add_player_id];
                    const dropP = c.drop_player_id ? allPlayers[c.drop_player_id] : null;
                    return (
                      <tr key={c.id}>
                        <td>{team ? team.team_name : c.team_id.slice(0, 8)}</td>
                        <td>{addP ? addP.name : c.add_player_id.slice(0, 8)}</td>
                        <td>{dropP ? dropP.name : '—'}</td>
                        <td><strong>${c.bid_amount}</strong></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                          {new Date(c.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default WaiversPanel;
