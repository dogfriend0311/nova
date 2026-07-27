import React, { useState, useEffect, useCallback } from 'react';
import * as fdb from '../../services/franchiseDb';

const FranchiseTrades = ({ instance, teams, myTeam, onChanged }) => {
  const [trades,   setTrades]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [partnerId, setPartnerId] = useState('');
  const [myRoster, setMyRoster] = useState([]);
  const [theirRoster, setTheirRoster] = useState([]);
  const [offeredIds, setOfferedIds] = useState([]);
  const [requestedIds, setRequestedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTrades = useCallback(() => {
    if (!myTeam) { setLoading(false); return; }
    fdb.getTradesForTeam(myTeam.id).then(list => { setTrades(list); setLoading(false); });
  }, [myTeam]);
  useEffect(loadTrades, [loadTrades]);

  useEffect(() => {
    if (myTeam) fdb.getRoster(myTeam.id, 'MLB').then(setMyRoster);
  }, [myTeam]);

  useEffect(() => {
    if (partnerId) fdb.getRoster(partnerId, 'MLB').then(setTheirRoster);
    else setTheirRoster([]);
    setRequestedIds([]);
  }, [partnerId]);

  const toggle = (id, list, setList) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const submitTrade = async () => {
    if (!partnerId || (!offeredIds.length && !requestedIds.length)) {
      setError('Pick a team and at least one player on either side.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await fdb.proposeTrade(instance.id, myTeam.id, partnerId, offeredIds, requestedIds);
      setOfferedIds([]); setRequestedIds([]); setPartnerId('');
      if (result.status === 'accepted') setNotice('✓ Trade accepted!');
      else if (result.status === 'rejected') setNotice('The CPU team rejected that offer — try adjusting it.');
      else setNotice('Trade sent — waiting on the other team.');
      loadTrades();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to propose trade.');
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (tradeId, accept) => {
    try {
      await fdb.respondToTrade(tradeId, accept);
      loadTrades();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to respond to trade.');
    }
  };

  if (!myTeam) {
    return <div style={{ color: 'rgba(158,165,196,0.4)', textAlign: 'center', padding: 30 }}>Claim a team from Standings first to make trades.</div>;
  }

  const otherTeams = teams.filter(t => t.id !== myTeam.id);
  const pendingIncoming = trades.filter(t => t.status === 'pending' && t.receiving_team_id === myTeam.id);
  const pendingOutgoing = trades.filter(t => t.status === 'pending' && t.proposing_team_id === myTeam.id);
  const resolved = trades.filter(t => t.status !== 'pending');

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 4 }}>🔁 Propose a Trade</h3>
      <p style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.82rem', marginBottom: 16 }}>Trading as {myTeam.city} {myTeam.name}.</p>

      <div className="neon-card p-3" style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 6 }}>Trade with</label>
        <select value={partnerId} onChange={e => setPartnerId(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, marginBottom: 16 }}>
          <option value="">Select a team…</option>
          {otherTeams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}{t.owner_user_id ? ` (@${t.owner_user_id})` : ' (CPU)'}</option>)}
        </select>

        {partnerId && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', marginBottom: 6 }}>YOU GIVE</div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {myRoster.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#e2e5f0', padding: '4px 6px', background: offeredIds.includes(p.id) ? 'rgba(94,129,244,0.15)' : 'transparent', borderRadius: 5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={offeredIds.includes(p.id)} onChange={() => toggle(p.id, offeredIds, setOfferedIds)} />
                    {p.first_name} {p.last_name} <span style={{ color: 'rgba(158,165,196,0.4)' }}>({p.position})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', marginBottom: 6 }}>YOU GET</div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {theirRoster.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#e2e5f0', padding: '4px 6px', background: requestedIds.includes(p.id) ? 'rgba(94,129,244,0.15)' : 'transparent', borderRadius: 5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={requestedIds.includes(p.id)} onChange={() => toggle(p.id, requestedIds, setRequestedIds)} />
                    {p.first_name} {p.last_name} <span style={{ color: 'rgba(158,165,196,0.4)' }}>({p.position})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#ff6b7a', fontSize: '0.82rem', marginTop: 12 }}>⚠ {error}</div>}
        {notice && <div style={{ color: '#43b581', fontSize: '0.82rem', marginTop: 12 }}>{notice}</div>}

        {partnerId && (
          <button className="neon-button" onClick={submitTrade} disabled={submitting} style={{ marginTop: 14 }}>
            {submitting ? 'Sending…' : '📤 Propose Trade'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>Loading trades…</div>
      ) : (
        <>
          {pendingIncoming.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>Incoming Offers</div>
              {pendingIncoming.map(t => (
                <div key={t.id} className="neon-card p-3" style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: '0.85rem', color: '#e2e5f0', marginBottom: 8 }}>
                    {teams.find(x => x.id === t.proposing_team_id)?.name} offers you {t.players_offered.length} player(s) for {t.players_requested.length} of yours
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="neon-button" onClick={() => respond(t.id, true)}>✓ Accept</button>
                    <button className="neon-button" style={{ borderColor: '#ff6b7a', color: '#ff6b7a' }} onClick={() => respond(t.id, false)}>✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingOutgoing.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>Sent — Awaiting Response</div>
              {pendingOutgoing.map(t => (
                <div key={t.id} style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.55)', padding: '6px 0' }}>
                  To {teams.find(x => x.id === t.receiving_team_id)?.name}: {t.players_offered.length} for {t.players_requested.length}
                </div>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>History</div>
              {resolved.slice(0, 10).map(t => (
                <div key={t.id} style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)', padding: '4px 0' }}>
                  {teams.find(x => x.id === t.proposing_team_id)?.name} ↔ {teams.find(x => x.id === t.receiving_team_id)?.name} — {t.status}
                </div>
              ))}
            </div>
          )}

          {!pendingIncoming.length && !pendingOutgoing.length && !resolved.length && (
            <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>No trade activity yet.</div>
          )}
        </>
      )}
    </div>
  );
};

export default FranchiseTrades;
