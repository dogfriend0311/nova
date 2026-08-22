import React, { useEffect, useState } from 'react';
import db from '../../services/db';
import { roleColor, roleGlow } from './MemberPages';

// ── Streak Leaderboard ───────────────────────────────────────
// Ranks members by nova_user_stats.login_streak — the same counter
// reputationService.checkDailyLogin() already maintains every time
// someone logs in (see AuthContext). This page doesn't track anything
// new; it's just the first place that surfaces that number for
// everyone at once instead of one profile at a time.

const StreakLeaderboard = ({ onSelectMember }) => {
  const [rows, setRows] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    Promise.all([db.getAllUserStats(), db.getMemberProfiles(), db.getUsers()]).then(([stats, profiles, users]) => {
      if (cancelled) return;
      const profileByUsername = new Map((profiles || []).map(p => [p.username, p]));
      const roleByUsername = new Map((users || []).map(u => [u.username, u.role]));
      const ranked = (stats || [])
        .filter(s => (s.login_streak || 0) > 0)
        .map(s => ({
          username: s.username,
          streak: s.login_streak || 0,
          avatar_url: profileByUsername.get(s.username)?.avatar_url,
          role: roleByUsername.get(s.username) || 'member',
        }))
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 50);
      setRows(ranked);
    }).catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, []);

  const goToMember = (username) => {
    if (onSelectMember) onSelectMember(username);
    else window.location.hash = `#members/${username}`;
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 12px' }}>
      <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900,
          background: 'linear-gradient(135deg, #e2e5f0 0%, #ff9e57 50%, #5e81f4 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 8, letterSpacing: '-0.02em',
        }}>
          🔥 Activity Streaks
        </h1>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.95rem' }}>
          Ranked by consecutive days logged in
        </p>
      </div>

      {rows === null ? (
        <div style={{ textAlign: 'center', color: 'rgba(158,165,196,0.4)', padding: '40px 0' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(158,165,196,0.4)', padding: '40px 0' }}>
          No active streaks yet — come back tomorrow to start one!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => {
            const color = roleColor(r.role);
            const glow = roleGlow(r.role);
            return (
              <button
                key={r.username}
                onClick={() => goToMember(r.username)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
                  padding: '10px 16px', borderRadius: 12,
                  background: i < 3 ? `linear-gradient(90deg, ${glow} 0%, rgba(13,21,53,0.3) 100%)` : 'rgba(94,129,244,0.03)',
                  border: `1px solid ${i < 3 ? `${color}55` : 'rgba(94,129,244,0.1)'}`,
                }}
              >
                <span style={{ width: 28, textAlign: 'center', fontWeight: 800, color: i < 3 ? color : 'rgba(158,165,196,0.4)', fontSize: i < 3 ? '1.1rem' : '0.9rem' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: `${color}22`, border: `1.5px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color,
                }}>
                  {r.avatar_url
                    ? <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : r.username?.[0]?.toUpperCase()}
                </div>
                <span style={{ flex: 1, color: '#e2e5f0', fontWeight: 700, fontSize: '0.92rem' }}>{r.username}</span>
                <span style={{ color: '#ff9e57', fontWeight: 800, fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                  🔥 {r.streak} day{r.streak === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StreakLeaderboard;
