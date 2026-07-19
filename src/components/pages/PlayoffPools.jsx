import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';

const POOLS_KEY = 'nova_playoff_pools';
const PICKS_KEY = 'nova_playoff_picks';

function getPools() {
  try { return JSON.parse(localStorage.getItem(POOLS_KEY) || '[]'); }
  catch { return []; }
}

function getUserPicks(username) {
  try { return JSON.parse(localStorage.getItem(`${PICKS_KEY}_${username}`) || '{}'); }
  catch { return {}; }
}

function saveUserPicks(username, picks) {
  localStorage.setItem(`${PICKS_KEY}_${username}`, JSON.stringify(picks));
}

function scorePool(pool, userPicks) {
  let score = 0;
  (pool.rounds || []).forEach((round, ri) => {
    const pointsPerWin = (ri + 1) * 2; // later rounds worth more
    (round.matchups || []).forEach((mu, mi) => {
      if (!mu.result) return;
      const key = `${pool.id}_${ri}_${mi}`;
      if (userPicks[key] === mu.result) score += pointsPerWin;
    });
  });
  return score;
}

const PlayoffPools = ({ user }) => {
  const [pools, setPools]       = useState(getPools);
  const [myPicks, setMyPicks]   = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (user?.username) setMyPicks(getUserPicks(user.username));
    setPools(getPools());
  }, [user]);

  function pick(poolId, roundIdx, matchupIdx, team) {
    if (!user) { alert('Sign in to submit picks!'); return; }
    const pool = pools.find(p => p.id === poolId);
    if (!pool || pool.status === 'locked') { alert('Picks are locked.'); return; }
    const key = `${poolId}_${roundIdx}_${matchupIdx}`;
    const updated = { ...myPicks, [key]: team };
    setMyPicks(updated);
    saveUserPicks(user.username, updated);

    // Check perfect first round
    const round0 = pool.rounds?.[0]?.matchups || [];
    const allCorrect = round0.every((mu, mi) => {
      const k = `${poolId}_0_${mi}`;
      return mu.result && updated[k] === mu.result;
    });
    if (allCorrect && round0.length > 0) awardBadge(user.username, 'bracket_perfect');
  }

  // Leaderboard
  function getLeaderboard(pool) {
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
    return users
      .map(u => ({ username: u.username, score: scorePool(pool, getUserPicks(u.username)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  if (pools.length === 0) {
    return (
      <div className="page nf-page">
        <div className="nf-header">
          <h1>🏆 Playoff Bracket Pools</h1>
          <p>Pick playoff winners for each round — earn points for correct predictions</p>
        </div>
        <div className="nf-card nf-empty">
          No bracket pools open yet.<br />
          <span style={{ fontSize: '0.78rem', marginTop: 8, display: 'block' }}>
            An admin will create a pool when the playoffs start.
          </span>
        </div>
      </div>
    );
  }

  const pool = selected ? pools.find(p => p.id === selected) : null;

  return (
    <div className="page nf-page">
      <div className="nf-header">
        <h1>🏆 Playoff Bracket Pools</h1>
        <p>Pick winners each round — later rounds are worth more points</p>
      </div>

      {/* Pool list */}
      {!pool && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pools.map(p => {
            const myScore = user ? scorePool(p, myPicks) : 0;
            return (
              <div key={p.id} className="nf-card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelected(p.id)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e5f0' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)', marginTop: 2 }}>
                    {p.sport?.toUpperCase()} · {p.status === 'locked' ? '🔒 Picks locked' : '🟢 Open'}
                    · {p.rounds?.length || 0} rounds
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {user && <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-cyan)' }}>{myScore} pts</div>}
                  <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', marginTop: 2 }}>→ Enter</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pool detail */}
      {pool && (
        <>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 16, padding: 0 }}
          >
            ← Back to pools
          </button>

          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#e2e5f0', marginBottom: 4 }}>{pool.name}</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.5)', marginBottom: 20 }}>
            {pool.sport?.toUpperCase()} · {pool.status === 'locked' ? '🔒 Picks locked — viewing only' : '🟢 Picks open'}
            {user && <> · Your score: <strong style={{ color: 'var(--color-cyan)' }}>{scorePool(pool, myPicks)} pts</strong></>}
          </div>

          {(pool.rounds || []).map((round, ri) => (
            <div key={ri} style={{ marginBottom: 24 }}>
              <div className="nf-card-title">Round {ri + 1} — {(ri + 1) * 2} pts per correct pick</div>
              <div className="nf-bracket-grid">
                {(round.matchups || []).map((mu, mi) => {
                  const key = `${pool.id}_${ri}_${mi}`;
                  const myPick = myPicks[key];
                  return (
                    <div key={mi} className="nf-matchup-card">
                      {[mu.teamA, mu.teamB].map((team, ti) => {
                        const isResult  = mu.result === team;
                        const isPicked  = myPick === team;
                        const isCorrect = isResult && isPicked && mu.result;
                        const isWrong   = isPicked && mu.result && !isResult;
                        return (
                          <React.Fragment key={ti}>
                            {ti === 1 && <div className="nf-matchup-div" />}
                            <div
                              className={`nf-matchup-team${isPicked ? (isCorrect ? ' correct' : isWrong ? ' wrong' : ' picked') : ''}`}
                              onClick={() => pick(pool.id, ri, mi, team)}
                              title={pool.status === 'locked' ? 'Picks locked' : 'Pick this team'}
                            >
                              <span>{team}</span>
                              {isResult && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>✓ Won</span>}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Leaderboard */}
          <div className="nf-card" style={{ marginTop: 8 }}>
            <div className="nf-card-title">Leaderboard</div>
            {getLeaderboard(pool).map((row, i) => (
              <div key={row.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(94,129,244,0.06)' }}>
                <span style={{ width: 24, textAlign: 'right', fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: '0.88rem', color: '#e2e5f0' }}>{row.username}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.88rem' }}>{row.score} pts</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayoffPools;
