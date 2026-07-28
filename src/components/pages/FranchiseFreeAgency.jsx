import React, { useState, useEffect, useCallback } from 'react';
import * as fdb from '../../services/franchiseDb';
import * as engine from '../../services/franchiseEngine';

const FranchiseFreeAgency = ({ instance, myTeam, canManage, onChanged }) => {
  const [agents,   setAgents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);
  const [offering, setOffering] = useState(null); // player being offered to
  const [amount,   setAmount]   = useState(1000000);
  const [years,    setYears]    = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');
  const [notice,   setNotice]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fdb.getFreeAgents(instance.id).then(list => { setAgents(list); setLoading(false); });
  }, [instance]);
  useEffect(load, [load]);

  const seedPool = async () => {
    setSeeding(true);
    setError('');
    try {
      await fdb.generateFreeAgentPool(instance.id, 40);
      load();
    } catch (err) {
      setError(err.message || 'Failed to generate free agents.');
    } finally {
      setSeeding(false);
    }
  };

  const submitOffer = async () => {
    if (!myTeam || !offering) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await fdb.makeFreeAgentOffer(offering.id, myTeam.id, amount, years);
      if (result.accepted) setNotice(`✓ ${offering.first_name} ${offering.last_name} signed!`);
      else setNotice(`Rejected — their estimated value is around $${result.marketValue.toLocaleString()}. Try a higher offer.`);
      setOffering(null);
      load();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to submit offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const budgetRemaining = myTeam ? myTeam.budget_cap - myTeam.budget_used : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 style={{ color: '#e2e5f0', margin: 0 }}>💰 Free Agency</h3>
        {canManage && (
          <button className="neon-button" onClick={seedPool} disabled={seeding}>
            {seeding ? 'Generating…' : '+ Add More Free Agents'}
          </button>
        )}
      </div>

      {myTeam && (
        <div style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.5)', marginBottom: 14 }}>
          {myTeam.city} {myTeam.name} budget: ${budgetRemaining.toLocaleString()} remaining of ${myTeam.budget_cap.toLocaleString()} cap
        </div>
      )}
      {!myTeam && (
        <div style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem', marginBottom: 14 }}>Claim a team from Standings to sign free agents.</div>
      )}

      {error && <div style={{ color: '#ff6b7a', fontSize: '0.82rem', marginBottom: 12 }}>⚠ {error}</div>}
      {notice && <div style={{ color: '#43b581', fontSize: '0.82rem', marginBottom: 12 }}>{notice}</div>}

      {loading ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>Loading free agents…</div>
      ) : agents.length === 0 ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>
          No free agents available{canManage ? ' — generate a pool above.' : '.'}
        </div>
      ) : (
        <div className="neon-card p-3">
          {agents.map(p => {
            const stars = engine.starRating(p);
            const starColor = stars >= 4 ? '#ffd166' : stars === 3 ? '#5e81f4' : 'rgba(158,165,196,0.35)';
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderBottom: '1px solid rgba(94,129,244,0.08)', flexWrap: 'wrap' }}>
                <span style={{ width: 34, fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-cyan)' }}>{p.position}</span>
                <span style={{ minWidth: 130, fontSize: '0.85rem', color: '#e2e5f0' }}>{p.first_name} {p.last_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>Age {p.age}</span>
                <span title={engine.STAR_LABELS[stars]} style={{ fontSize: '0.74rem', color: starColor, fontWeight: 700, cursor: 'default' }}>
                  {engine.starDisplay(stars)}
                </span>
                <span style={{ flex: 1, fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>
                  {p.is_pitcher ? `STU ${p.stuff} / CTL ${p.control} / MOV ${p.movement}` : `CON ${p.contact} / POW ${p.power} / EYE ${p.eye}`}
                </span>
                {myTeam && (
                  <button className="neon-button" onClick={() => { setOffering(p); setAmount(1000000); setYears(2); setNotice(''); }} style={{ padding: '5px 14px', fontSize: '0.78rem' }}>
                    Make Offer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {offering && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
          onClick={() => setOffering(null)}>
          <div className="neon-card p-3" style={{ maxWidth: 360, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ color: '#e2e5f0', marginBottom: 4 }}>Offer to {offering.first_name} {offering.last_name}</h4>
            <p style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)', marginBottom: 14 }}>{offering.position} · Age {offering.age}</p>

            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>Salary (per year)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} step={100000}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, marginBottom: 12, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>Contract length (years)</label>
            <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={7}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, marginBottom: 16, boxSizing: 'border-box' }} />

            {error && <div style={{ color: '#ff6b7a', fontSize: '0.8rem', marginBottom: 10 }}>⚠ {error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="neon-button" onClick={submitOffer} disabled={submitting}>{submitting ? 'Sending…' : 'Submit Offer'}</button>
              <button className="neon-button" style={{ borderColor: 'rgba(158,165,196,0.3)', color: 'rgba(158,165,196,0.6)' }} onClick={() => setOffering(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FranchiseFreeAgency;
