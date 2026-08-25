/**
 * InjuryReport.jsx
 * League-wide injury report, sourced from ESPN's per-league injuries
 * endpoint (same site.api.espn.com host as everything else in Sports
 * Hub, so it goes through the existing /espn-proxy).
 */
import React, { useEffect, useState } from 'react';
import { fetchInjuries, normalizeInjuries } from '../../services/sportsDataService';

const STATUS_COLOR = {
  Out:             '#ff6b6b',
  Doubtful:        '#ff9e57',
  Questionable:    '#ffd700',
  'Day-To-Day':    '#ffd700',
  Probable:        '#43b581',
  'Injured Reserve': '#ff6b6b',
  IR:              '#ff6b6b',
};
const statusColor = (s) => STATUS_COLOR[s] || 'rgba(158,165,196,0.6)';

const InjuryReport = ({ sport }) => {
  const [groups, setGroups]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [query, setQuery]     = useState('');

  useEffect(() => {
    setLoading(true); setError(null);
    fetchInjuries(sport)
      .then(raw => setGroups(normalizeInjuries(raw)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load injury report: {error}</div>;
  if (!groups?.length) return <div className="sh-empty">No injuries currently reported.</div>;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? groups.map(g => ({ ...g, players: g.players.filter(p => p.name.toLowerCase().includes(q) || g.team.toLowerCase().includes(q)) })).filter(g => g.players.length)
    : groups;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filter by player or team..."
        style={{ width: '100%', maxWidth: 340, padding: '9px 12px', marginBottom: 18, background: 'rgba(10,10,30,0.85)', border: '1px solid rgba(100,120,200,0.3)', borderRadius: 8, color: '#e2e5f0', fontSize: '0.85rem' }}
      />
      {filtered.length === 0 && <div className="sh-empty">No matches.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map((g, gi) => (
          <div key={gi} style={{ background: 'rgba(10,10,30,0.7)', border: '1px solid rgba(100,120,200,0.15)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {g.logo && <img src={g.logo} alt={g.team} style={{ width: 22, height: 22, objectFit: 'contain' }} />}
              <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(158,165,196,0.9)', fontWeight: 700 }}>{g.team}</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.players.map((p) => (
                <div key={p.id || p.name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 8, borderBottom: '1px solid rgba(100,120,200,0.08)' }}>
                  {p.photo
                    ? <img src={p.photo} alt={p.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(100,120,200,0.15)', flexShrink: 0 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'rgba(220,230,255,0.9)' }}>{p.name}{p.position && <span style={{ color: 'rgba(158,165,196,0.4)', fontWeight: 400 }}> · {p.position}</span>}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: statusColor(p.status), whiteSpace: 'nowrap' }}>{p.status}</span>
                    </div>
                    {p.detail && <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)', marginTop: 2 }}>{p.detail}</div>}
                    {p.comment && <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', marginTop: 2 }}>{p.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InjuryReport;
