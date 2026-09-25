// src/components/pages/MyCollection.jsx
//
// "My Collection" — a unified home for everything a member has earned or
// acquired, pulling together two systems that already existed separately
// (achievementsService's badges, CoinShop's cosmetics) rather than
// inventing a third parallel inventory store.
//
// Two sections below (Trophy Case, Cards) are intentionally shown as
// "coming soon": there's no existing data model for season/game results
// tied to a member (championships, player/team cards), so rather than
// fabricate placeholder trophies, this is left as an honest empty state.
// The natural home for that data is the league stats database work
// (item #7) — once games/seasons are tracked there, a member's real
// championships and cards can flow into this page.

import React, { useEffect, useState } from 'react';
import { BADGES, getEarnedBadgesWithDates } from '../../services/achievementsService';
import { COSMETICS, getOwnedCosmetics, getActiveCosmetic } from './CoinShop';
import { getCoins } from '../../services/coinsStorage';

const timeAgo = (iso) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const SectionHeader = ({ emoji, title, count, total }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '28px 0 14px' }}>
    <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#e2e5f0' }}>{emoji} {title}</h2>
    {total != null && <span style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', fontWeight: 700 }}>{count}/{total}</span>}
  </div>
);

const MyCollection = ({ user, onOpenShop }) => {
  const [earned, setEarned] = useState([]);
  const [owned, setOwned] = useState({});
  const [coins, setCoinsState] = useState(0);

  useEffect(() => {
    if (!user?.username) return;
    setEarned(getEarnedBadgesWithDates(user.username));
    setOwned(getOwnedCosmetics(user.username));
    setCoinsState(getCoins(user.username));
  }, [user]);

  if (!user) {
    return <div className="page nf-page" style={{ textAlign: 'center', padding: 60, color: 'rgba(158,165,196,0.5)' }}>Sign in to see your collection.</div>;
  }

  const earnedIds = new Set(earned.map(e => e.id));
  const earnedMap = Object.fromEntries(earned.map(e => [e.id, e.earned_at]));
  const ownedCosmeticIds = new Set(Object.keys(owned).filter(k => owned[k] === true));
  const cosmeticsByCategory = COSMETICS.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="page nf-page" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="nf-header" style={{ marginBottom: 0 }}>
        <h1>My <em>Collection</em></h1>
        <p>Every badge you've earned and every drop you've collected, in one place.</p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: '16px 0', borderBottom: '1px solid rgba(94,129,244,0.1)' }}>
        <Stat label="Badges" value={`${earned.length}/${BADGES.length}`} />
        <Stat label="Cosmetics" value={`${ownedCosmeticIds.size}/${COSMETICS.length}`} />
        <Stat label="Nova Coins" value={coins.toLocaleString()} />
      </div>

      {/* ── Badges ──────────────────────────────────────────── */}
      <SectionHeader emoji="🎖️" title="Badges" count={earned.length} total={BADGES.length} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {BADGES.map((b) => {
          const has = earnedIds.has(b.id);
          return (
            <div key={b.id} title={b.desc} style={{
              padding: '14px 10px', borderRadius: 12, textAlign: 'center',
              background: has ? `${b.color}14` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${has ? `${b.color}55` : 'rgba(158,165,196,0.1)'}`,
              opacity: has ? 1 : 0.45,
            }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6, filter: has ? 'none' : 'grayscale(1)' }}>{has ? b.emoji : '🔒'}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: has ? '#e2e5f0' : 'rgba(158,165,196,0.6)' }}>{b.name}</div>
              <div style={{ fontSize: '0.66rem', color: 'rgba(158,165,196,0.45)', marginTop: 2 }}>
                {has ? (earnedMap[b.id] ? `Earned ${timeAgo(earnedMap[b.id])}` : 'Earned') : b.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Cosmetics ───────────────────────────────────────── */}
      <SectionHeader emoji="🎒" title="Cosmetics" count={ownedCosmeticIds.size} total={COSMETICS.length} />
      {ownedCosmeticIds.size === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'rgba(158,165,196,0.45)', fontSize: '0.85rem', border: '1px dashed rgba(158,165,196,0.15)', borderRadius: 12 }}>
          Nothing collected yet. <button onClick={onOpenShop} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Visit the Coin Shop →</button>
        </div>
      ) : (
        Object.entries(cosmeticsByCategory).map(([category, items]) => {
          const ownedInCategory = items.filter(c => ownedCosmeticIds.has(c.id));
          if (!ownedInCategory.length) return null;
          const activeId = getActiveCosmetic(user.username, category);
          return (
            <div key={category} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'rgba(158,165,196,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>{category}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {ownedInCategory.map((item) => (
                  <div key={item.id} style={{
                    padding: '12px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                    border: activeId === item.id ? '1px solid var(--color-cyan)' : '1px solid rgba(158,165,196,0.12)',
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e5f0' }}>{item.emoji || '✨'} {item.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.5)', marginTop: 2 }}>{item.desc}</div>
                    {activeId === item.id && <div style={{ fontSize: '0.66rem', color: 'var(--color-cyan)', fontWeight: 700, marginTop: 6 }}>✓ Equipped</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
      {ownedCosmeticIds.size > 0 && (
        <button onClick={onOpenShop} style={{ background: 'none', border: '1px solid rgba(94,129,244,0.25)', color: 'var(--color-cyan)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, marginTop: 4 }}>
          Manage & equip in the Coin Shop →
        </button>
      )}

      {/* ── Trophy Case (empty state — see file header note) ── */}
      <SectionHeader emoji="🏆" title="Trophy Case" />
      <ComingSoon text="Championship trophies will show up here once league seasons and standings are tracked per member." />

      {/* ── Cards (empty state) ───────────────────────────────── */}
      <SectionHeader emoji="🃏" title="Player & Team Cards" />
      <ComingSoon text="Player and team cards need a card data model tied to the league database — coming with the stats database work." />
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e2e5f0' }}>{value}</div>
    <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
  </div>
);

const ComingSoon = ({ text }) => (
  <div style={{ padding: 24, textAlign: 'center', color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem', border: '1px dashed rgba(158,165,196,0.15)', borderRadius: 12, marginBottom: 8 }}>
    🚧 {text}
  </div>
);

export default MyCollection;
