import React, { useEffect, useState } from 'react';
import fantasyDb from '../services/fantasyDb';
import pickemsDb from '../services/pickemsDb';

const th = { textAlign: 'left', padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(158,165,196,0.45)', borderBottom: '1px solid rgba(94,129,244,0.12)' };
const td = { padding: '9px 10px', fontSize: '0.85rem', color: '#e2e5f0', borderBottom: '1px solid rgba(94,129,244,0.06)' };

const AllTimeLeaderboard = () => {
  const [mode, setMode] = useState('fantasy');
  const [fantasyRows, setFantasyRows] = useState(null);
  const [pickemsRows, setPickemsRows] = useState(null);

  useEffect(() => {
    fantasyDb.getAllTimeLeaderboard().then(setFantasyRows).catch(() => setFantasyRows([]));
    pickemsDb.getAllTimeLeaderboard().then(setPickemsRows).catch(() => setPickemsRows([]));
  }, []);

  const rows = mode === 'fantasy' ? fantasyRows : pickemsRows;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ id: 'fantasy', label: '🏈 Fantasy' }, { id: 'pickems', label: "✅ Pick'ems" }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
            background: mode === m.id ? 'rgba(94,129,244,0.15)' : 'rgba(94,129,244,0.04)',
            border: `1px solid ${mode === m.id ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
            color: mode === m.id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
          }}>{m.label}</button>
        ))}
      </div>

      {rows === null ? (
        <div style={{ color: 'rgba(158,165,196,0.4)', padding: 20 }}>Loading all-time stats…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', padding: 20 }}>
          No {mode === 'fantasy' ? 'fantasy seasons' : "pick'ems groups"} played yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Member</th>
                {mode === 'fantasy' ? (
                  <>
                    <th style={th}>W</th>
                    <th style={th}>L</th>
                    <th style={th}>T</th>
                    <th style={th}>Pts For</th>
                    <th style={th}>Seasons</th>
                  </>
                ) : (
                  <>
                    <th style={th}>Correct</th>
                    <th style={th}>Total</th>
                    <th style={th}>Accuracy</th>
                    <th style={th}>Coins</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.username}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.username}</td>
                  {mode === 'fantasy' ? (
                    <>
                      <td style={td}>{r.wins}</td>
                      <td style={td}>{r.losses}</td>
                      <td style={td}>{r.ties}</td>
                      <td style={td}>{Math.round(r.points_for).toLocaleString()}</td>
                      <td style={td}>{r.seasons}</td>
                    </>
                  ) : (
                    <>
                      <td style={td}>{r.correct_picks}</td>
                      <td style={td}>{r.total_picks}</td>
                      <td style={td}>{r.total_picks ? `${Math.round((r.correct_picks / r.total_picks) * 100)}%` : '—'}</td>
                      <td style={td}>{r.coins}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllTimeLeaderboard;
