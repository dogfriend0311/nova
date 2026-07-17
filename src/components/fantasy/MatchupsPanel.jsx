import React, { useEffect, useState } from 'react';
import fantasyDb from '../../services/fantasyDb';

const MatchupsPanel = ({ league, teams, isCommissioner }) => {
  const [week, setWeek] = useState(league.current_week || 1);
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);

  const teamById = (id) => teams.find(t => t.id === id);

  const load = async (w) => {
    setLoading(true);
    setMatchups(await fantasyDb.getMatchups(league.id, w));
    setLoading(false);
  };

  useEffect(() => { load(week); }, [week, league.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateWeek = async () => {
    // Simple round-robin-ish random pairing for this week if none exist yet.
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const pairs = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1] || null]);
    }
    for (const [a, b] of pairs) {
      await fantasyDb.createMatchup({
        league_id: league.id, week, team_a_id: a.id, team_b_id: b ? b.id : null,
        team_a_score: 0, team_b_score: 0, is_playoff: false,
      });
    }
    load(week);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Matchups — Week {week}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setWeek(w => Math.max(1, w - 1))}>‹ Prev</button>
          <button className="btn-ghost" onClick={() => setWeek(w => w + 1)}>Next ›</button>
          {isCommissioner && matchups.length === 0 && !loading && (
            <button className="neon-button" onClick={generateWeek}>Generate Matchups</button>
          )}
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--color-text-tertiary)' }}>Loading…</p> : (
        matchups.length === 0 ? (
          <div className="empty-state">No matchups scheduled for this week yet.</div>
        ) : matchups.map(m => {
          const a = teamById(m.team_a_id);
          const b = m.team_b_id ? teamById(m.team_b_id) : null;
          return (
            <div key={m.id} className="neon-card matchup-card">
              <div className="matchup-team">
                <div>{a?.team_name || '—'}</div>
                <div className="matchup-score">{Number(m.team_a_score).toFixed(1)}</div>
              </div>
              <div className="matchup-vs">{b ? 'VS' : 'BYE'}</div>
              <div className="matchup-team">
                <div>{b?.team_name || 'BYE'}</div>
                <div className="matchup-score">{b ? Number(m.team_b_score).toFixed(1) : ''}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default MatchupsPanel;
