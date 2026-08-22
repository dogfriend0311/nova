import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { CardShell, ScrollRow } from './ScrollCards';

// ── Anniversary Shoutouts ────────────────────────────────────
// "Joined Nova N years ago today" — built entirely from
// member_profiles.created_at, no extra data entry required. Only
// shows members whose join date is exactly a whole number of years
// before today (so brand-new signups don't show up as "0 years ago").

const isAnniversaryToday = (createdAt) => {
  if (!createdAt) return false;
  const joined = new Date(createdAt);
  const now = new Date();
  return joined.getMonth() === now.getMonth()
    && joined.getDate() === now.getDate()
    && joined.getFullYear() < now.getFullYear();
};

const yearsSince = (createdAt) => new Date().getFullYear() - new Date(createdAt).getFullYear();

const goToMember = (username) => { window.location.hash = `#members/${username}`; };

const AnniversaryShoutouts = () => {
  const [members, setMembers] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    db.getMemberProfiles().then((profiles) => {
      if (cancelled) return;
      setMembers((profiles || []).filter(p => isAnniversaryToday(p.created_at)));
    }).catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, []);

  if (members === null || members.length === 0) return null;

  return (
    <>
      <div className="home-section-label">🎉 Nova Anniversaries Today</div>
      <ScrollRow>
        {members.map((m) => {
          const years = yearsSince(m.created_at);
          return (
            <CardShell key={m.username} kicker={`${years} year${years === 1 ? '' : 's'} on Nova`} onClick={() => goToMember(m.username)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🎂</span>
                <span style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.92rem' }}>{m.username}</span>
              </div>
            </CardShell>
          );
        })}
      </ScrollRow>
    </>
  );
};

export default AnniversaryShoutouts;
