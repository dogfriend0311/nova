import React, { useEffect, useState } from 'react';
import db from '../../services/db';
import { roleLabel, roleColor, roleGlow } from './MemberPages';

// ── Staff Directory ─────────────────────────────────────────
// A standing page listing every mod/cofounder/owner/helper with their
// role, avatar, and bio — complements the rotating "Staff of the Month"
// spotlight on Home instead of replacing it. Built from the same
// profiles + users data MemberPages already joins, just filtered down
// to staff roles and sorted by rank.

const STAFF_ROLES = ['owner', 'cofounder', 'mod', 'vizta_helper', 'football_helper'];
const ROLE_ORDER = { owner: 0, cofounder: 1, mod: 2, vizta_helper: 3, football_helper: 4 };

const StaffDirectory = ({ onSelectMember }) => {
  const [staff, setStaff] = useState(null); // null = loading
  const [sotm, setSotm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.getMemberProfiles().catch(() => []),
      db.getUsers().catch(() => []),
      db.getStaffOfMonth().catch(() => null),
    ]).then(([profiles, users, staffOfMonth]) => {
      if (cancelled) return;
      const enriched = (users || [])
        .filter((u) => STAFF_ROLES.includes(u.role))
        .map((u) => {
          const profile = (profiles || []).find((p) => p.username === u.username) || {};
          return { ...profile, username: u.username, role: u.role };
        })
        .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
      setStaff(enriched);
      setSotm(staffOfMonth);
    });
    return () => { cancelled = true; };
  }, []);

  const goToMember = (username) => {
    if (onSelectMember) onSelectMember(username);
    else window.location.hash = `#members/${username}`;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 12px' }}>
      <div style={{ textAlign: 'center', padding: '32px 0 36px' }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900,
          background: 'linear-gradient(135deg, #e2e5f0 0%, #5e81f4 50%, #ff9e57 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 8, letterSpacing: '-0.02em',
        }}>
          Staff Directory
        </h1>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.95rem' }}>
          {staff === null ? 'Loading…' : `${staff.length} staff members keeping Nova running`}
        </p>
      </div>

      {staff !== null && staff.length === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(158,165,196,0.4)', padding: '40px 0' }}>
          No staff roles have been assigned yet.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {(staff || []).map((member) => {
          const isSotm = !!sotm?.username && sotm.username === member.username;
          const color = roleColor(member.role);
          const glow = roleGlow(member.role);
          return (
            <button
              key={member.username}
              onClick={() => goToMember(member.username)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                gap: 10, padding: '22px 16px', borderRadius: 14, cursor: 'pointer',
                background: `linear-gradient(180deg, ${glow} 0%, rgba(13,21,53,0.4) 60%)`,
                border: `1px solid ${color}55`,
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${color}22`, border: `2px solid ${color}`,
                fontSize: '1.4rem', fontWeight: 800, color,
              }}>
                {member.avatar_url
                  ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (member.username?.[0]?.toUpperCase() || '?')}
              </div>
              <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#e2e5f0' }}>{member.username}</div>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '3px 10px', borderRadius: 999, color, background: `${color}18`, border: `1px solid ${color}55`,
              }}>
                {roleLabel(member.role)}
              </span>
              {isSotm && (
                <span style={{ fontSize: '0.72rem', color: '#ffd700' }}>🌟 Staff of the Month</span>
              )}
              {member.bio && (
                <p style={{
                  margin: 0, fontSize: '0.78rem', color: 'rgba(158,165,196,0.55)', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {member.bio}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StaffDirectory;
