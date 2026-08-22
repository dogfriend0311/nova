import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { CardShell, ScrollRow } from './ScrollCards';

// ── Anniversary & Birthday Shoutouts ─────────────────────────
// Two independent "today" checks, shown together in one scroll:
//  - Nova anniversary: member_profiles.created_at (signup date) —
//    automatic, nothing for the member to set.
//  - Birthday: member_profiles.birthday, an optional field the member
//    fills in themselves on their profile (Profile tab). Only the
//    month/day are ever compared or shown — the year, and therefore
//    age, is never surfaced here even if they entered one.

const isAnniversaryToday = (createdAt) => {
  if (!createdAt) return false;
  const joined = new Date(createdAt);
  const now = new Date();
  return joined.getMonth() === now.getMonth()
    && joined.getDate() === now.getDate()
    && joined.getFullYear() < now.getFullYear();
};

const isBirthdayToday = (birthday) => {
  if (!birthday) return false;
  const bday = new Date(`${birthday}T00:00:00`);
  const now = new Date();
  return bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate();
};

const yearsSince = (dateStr) => new Date().getFullYear() - new Date(dateStr).getFullYear();

const goToMember = (username) => { window.location.hash = `#members/${username}`; };

const AnniversaryShoutouts = () => {
  const [cards, setCards] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    db.getMemberProfiles().then((profiles) => {
      if (cancelled) return;
      const list = [];
      (profiles || []).forEach((p) => {
        if (isAnniversaryToday(p.created_at)) {
          const years = yearsSince(p.created_at);
          list.push({ key: `anniv-${p.username}`, username: p.username, kicker: `${years} year${years === 1 ? '' : 's'} on Nova`, icon: '🎉', label: 'Nova anniversary' });
        }
        if (isBirthdayToday(p.birthday)) {
          list.push({ key: `bday-${p.username}`, username: p.username, kicker: 'Birthday today', icon: '🎂', label: 'Happy birthday' });
        }
      });
      setCards(list);
    }).catch(() => { if (!cancelled) setCards([]); });
    return () => { cancelled = true; };
  }, []);

  if (cards === null || cards.length === 0) return null;

  return (
    <>
      <div className="home-section-label">🎉 Shoutouts Today</div>
      <ScrollRow>
        {cards.map((c) => (
          <CardShell key={c.key} kicker={c.kicker} onClick={() => goToMember(c.username)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
              <div>
                <div style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.92rem' }}>{c.username}</div>
                <div style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.72rem' }}>{c.label}</div>
              </div>
            </div>
          </CardShell>
        ))}
      </ScrollRow>
    </>
  );
};

export default AnniversaryShoutouts;
