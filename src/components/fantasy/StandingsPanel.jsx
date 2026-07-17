import React from 'react';
import { formatRecord } from './fantasyUtils';

const StandingsPanel = ({ teams, scoringType }) => {
  const sorted = [...teams].sort((a, b) => {
    if (scoringType === 'roto') return b.points_for - a.points_for;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.points_for - a.points_for;
  });

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Standings</h2>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th><th>Team</th><th>Record</th><th>Pts For</th><th>Pts Against</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr key={t.id}>
              <td>{i + 1}</td>
              <td>{t.team_name} <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.78rem' }}>({t.owner_username})</span></td>
              <td>{formatRecord(t)}</td>
              <td>{Number(t.points_for).toFixed(1)}</td>
              <td>{Number(t.points_against).toFixed(1)}</td>
            </tr>
          ))}
          {sorted.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>No teams yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default StandingsPanel;
