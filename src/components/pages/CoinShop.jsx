import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';
import db from '../../services/db';

// ── Original pixel-art icons ────────────────────────────────
// Small 8x8 grid icons, hand-drawn in-house — inspired by the vibe of
// each theme (wings, leaf, notebook, ring, bear, crown, owl) but NOT
// traced or copied from any franchise/artist's actual logo or artwork.
const PIXEL_ICONS = {
  titan: {
    palette: { 1: '#8a2f1f', 2: '#e8c07d', 3: '#3a1a12' },
    grid: [
      [0,0,1,0,0,1,0,0],
      [0,1,2,0,0,2,1,0],
      [1,2,2,0,0,2,2,1],
      [1,2,2,1,1,2,2,1],
      [0,1,2,2,2,2,1,0],
      [0,0,1,2,2,1,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,0,3,3,0,0,0],
    ],
  },
  naruto: {
    palette: { 1: '#8a5a1a', 2: '#e8842f', 3: '#f4b95a' },
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,2,2,2,2,1,0],
      [1,2,2,2,2,2,2,1],
      [1,2,2,3,3,2,2,1],
      [1,2,2,3,3,2,2,1],
      [0,1,2,2,2,2,1,0],
      [0,0,1,2,2,1,0,0],
      [0,0,0,1,1,0,0,0],
    ],
  },
  deathnote: {
    palette: { 1: '#000000', 2: '#1a1a1a', 3: '#8a2be2' },
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,1],
      [1,2,3,2,2,3,2,1],
      [1,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,1],
      [1,2,3,2,2,3,2,1],
      [1,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,1,1],
    ],
  },
  weeknd: {
    palette: { 1: '#b3001b', 2: '#ff0033' },
    grid: [
      [0,1,1,1,1,1,1,0],
      [1,1,2,2,2,2,1,1],
      [1,2,2,0,0,2,2,1],
      [1,2,0,0,0,0,2,1],
      [1,2,0,0,0,0,2,1],
      [1,2,2,0,0,2,2,1],
      [1,1,2,2,2,2,1,1],
      [0,1,1,1,1,1,1,0],
    ],
  },
  kanye: {
    palette: { 1: '#5a3a1a', 2: '#e8c07d', 3: '#2a1810' },
    grid: [
      [0,1,0,0,0,0,1,0],
      [1,1,1,0,0,1,1,1],
      [1,2,2,1,1,2,2,1],
      [1,2,3,2,2,3,2,1],
      [1,2,2,2,2,2,2,1],
      [0,1,2,2,2,2,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
    ],
  },
  kendrick: {
    palette: { 1: '#2fae4e', 2: '#f2b632', 3: '#0a3d1f' },
    grid: [
      [1,0,0,1,1,0,0,1],
      [1,1,0,1,1,0,1,1],
      [1,2,1,2,2,1,2,1],
      [1,2,2,2,2,2,2,1],
      [1,2,3,2,2,3,2,1],
      [1,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
    ],
  },
  drake: {
    palette: { 1: '#6b5010', 2: '#d4af37', 3: '#1a1a1a' },
    grid: [
      [0,1,1,0,0,1,1,0],
      [1,2,2,1,1,2,2,1],
      [1,2,3,2,2,3,2,1],
      [1,2,2,2,2,2,2,1],
      [0,1,2,2,2,2,1,0],
      [0,1,2,1,1,2,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,1,0,0,1,0,0],
    ],
  },
};

const PixelIcon = ({ theme, size = 4 }) => {
  const def = PIXEL_ICONS[theme];
  if (!def) return null;
  const { grid, palette } = def;
  const cols = grid[0].length;
  const rows = grid.length;
  return (
    <svg
      width={cols * size}
      height={rows * size}
      viewBox={`0 0 ${cols * size} ${rows * size}`}
      style={{ display: 'block', margin: '0 auto', imageRendering: 'pixelated' }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) =>
          cell === 0 ? null : (
            <rect
              key={`${x}-${y}`}
              x={x * size}
              y={y * size}
              width={size}
              height={size}
              fill={palette[cell]}
            />
          )
        )
      )}
    </svg>
  );
};

// All available cosmetics
export const COSMETICS = [
  // Name glow — anime & artist inspired
  { id: 'glow_titan',     category: 'Name Glow', pixelIcon: 'titan',     name: 'Titan Shifter',  desc: 'Steam-red glow inspired by Attack on Titan', price: 125, css: { color: '#e2432b', textShadow: '0 0 10px #e2432b, 0 0 2px #f4c542' } },
  { id: 'glow_sharingan', category: 'Name Glow', pixelIcon: 'naruto',    name: 'Sharingan',      desc: 'Blazing red glow inspired by Naruto',         price: 125, css: { color: '#e30016', textShadow: '0 0 10px #e30016' } },
  { id: 'glow_shinigami', category: 'Name Glow', pixelIcon: 'deathnote', name: 'Shinigami Eyes', desc: 'Eerie violet glow inspired by Death Note',    price: 125, css: { color: '#8a2be2', textShadow: '0 0 10px #8a2be2' } },
  { id: 'glow_afterhours',category: 'Name Glow', pixelIcon: 'weeknd',    name: 'After Hours',    desc: 'Neon red glow inspired by The Weeknd',        price: 125, css: { color: '#ff0033', textShadow: '0 0 10px #ff0033' } },
  { id: 'glow_dropout',   category: 'Name Glow', pixelIcon: 'kanye',     name: 'Dropout Gold',   desc: 'Warm gold glow inspired by Kanye West',       price: 125, css: { color: '#f2b632', textShadow: '0 0 10px #f2b632' } },
  { id: 'glow_compton',   category: 'Name Glow', pixelIcon: 'kendrick',  name: 'Compton Crown',  desc: 'Green & gold glow inspired by Kendrick Lamar',price: 125, css: { color: '#2fae4e', textShadow: '0 0 10px #2fae4e, 0 0 2px #f2b632' } },
  { id: 'glow_ovo',       category: 'Name Glow', pixelIcon: 'drake',     name: 'OVO Nights',     desc: 'Owl-gold glow inspired by Drake',             price: 125, css: { color: '#d4af37', textShadow: '0 0 10px #d4af37' } },
  // Profile borders
  // Avatar borders — anime & artist inspired
  { id: 'border_survey',   category: 'Avatar Border', pixelIcon: 'titan',     name: 'Survey Corps',  desc: 'Forest-green ring inspired by Attack on Titan', price: 175, css: { border: '3px solid #2e5339' } },
  { id: 'border_leaf',     category: 'Avatar Border', pixelIcon: 'naruto',    name: 'Hidden Leaf',   desc: 'Burnt-orange ring inspired by Naruto',           price: 175, css: { border: '3px solid #e07a2f' } },
  { id: 'border_notebook', category: 'Avatar Border', pixelIcon: 'deathnote', name: 'Death Note',    desc: 'Black & red ring inspired by Death Note',        price: 175, css: { border: '3px solid #1a1a1a', boxShadow: '0 0 8px #e30016' } },
  { id: 'border_xo',       category: 'Avatar Border', pixelIcon: 'weeknd',    name: 'XO',            desc: 'Crimson ring inspired by The Weeknd',            price: 175, css: { border: '3px solid #b3001b' } },
  { id: 'border_graduate', category: 'Avatar Border', pixelIcon: 'kanye',     name: 'Graduation',    desc: 'Beige & pink ring inspired by Kanye West',       price: 175, css: { border: '3px solid #e8c9a0' } },
  { id: 'border_tde',      category: 'Avatar Border', pixelIcon: 'kendrick',  name: 'TDE Purple',    desc: 'Deep purple ring inspired by Kendrick Lamar',    price: 175, css: { border: '3px solid #5c2d91' } },
  { id: 'border_ovoowl',   category: 'Avatar Border', pixelIcon: 'drake',     name: 'OVO Owl',       desc: 'Gold ring inspired by Drake',                    price: 175, css: { border: '3px solid #d4af37' } },
  // Chat badges
  // Chat badges — anime & artist inspired
  { id: 'badge_wings',    category: 'Chat Badge', pixelIcon: 'titan',     name: 'Wings of Freedom', desc: 'Attack on Titan inspired badge', price: 100 },
  { id: 'badge_headband', category: 'Chat Badge', pixelIcon: 'naruto',    name: 'Leaf Headband',    desc: 'Naruto inspired badge',          price: 100 },
  { id: 'badge_notebook', category: 'Chat Badge', pixelIcon: 'deathnote', name: 'Death Note',       desc: 'Death Note inspired badge',      price: 100 },
  { id: 'badge_xo',       category: 'Chat Badge', pixelIcon: 'weeknd',    name: 'XO',               desc: 'The Weeknd inspired badge',      price: 100 },
  { id: 'badge_bear',     category: 'Chat Badge', pixelIcon: 'kanye',     name: 'Dropout Bear',     desc: 'Kanye West inspired badge',      price: 100 },
  { id: 'badge_kkenny',   category: 'Chat Badge', pixelIcon: 'kendrick',  name: 'Kung Fu Kenny',    desc: 'Kendrick Lamar inspired badge',  price: 100 },
  { id: 'badge_owl',      category: 'Chat Badge', pixelIcon: 'drake',     name: 'OVO Owl',          desc: 'Drake inspired badge',           price: 100 },
  // Profile themes — reskins the whole profile page card, visible to
  // anyone who visits (synced via nova_user_stats.equipped_theme, not
  // just this browser's cosmetics list — see equip() below).
  { id: 'theme_cyan',    category: 'Profile Theme', emoji: '🩵', name: 'Neon Cyan',    desc: 'The default Nova look, made official on your card', price: 60,  css: { accent: '#5e81f4', cardBg: 'linear-gradient(160deg, #131729 0%, #0a0d1a 100%)' } },
  { id: 'theme_magenta', category: 'Profile Theme', emoji: '💜', name: 'Magenta Pulse',desc: 'Bold magenta gradient card background',              price: 150, css: { accent: '#e0339f', cardBg: 'linear-gradient(160deg, #2a1030 0%, #150a1a 100%)' } },
  { id: 'theme_gold',    category: 'Profile Theme', emoji: '🟡', name: 'Gold Rush',    desc: 'Warm gold accent for a champion feel',                price: 150, css: { accent: '#d4af37', cardBg: 'linear-gradient(160deg, #2a2010 0%, #17120a 100%)' } },
  { id: 'theme_ice',     category: 'Profile Theme', emoji: '🧊', name: 'Ice Blue',     desc: 'Cool blue-white gradient card',                       price: 150, css: { accent: '#7fd4ff', cardBg: 'linear-gradient(160deg, #0e1f2e 0%, #071219 100%)' } },
  { id: 'theme_toxic',   category: 'Profile Theme', emoji: '☣️', name: 'Toxic Green',  desc: 'High-contrast green-on-black card',                   price: 150, css: { accent: '#39ff8a', cardBg: 'linear-gradient(160deg, #0f2a17 0%, #08150c 100%)' } },
  { id: 'theme_sunset',  category: 'Profile Theme', emoji: '🌅', name: 'Sunset Orange',desc: 'Warm orange-red gradient card',                       price: 150, css: { accent: '#ff8a3d', cardBg: 'linear-gradient(160deg, #2a160a 0%, #180b05 100%)' } },
];

const CATEGORIES = [...new Set(COSMETICS.map(c => c.category))];
const COLLECTIONS = [
  { id: 'all', label: 'All drops' },
  { id: 'anime', label: 'Anime worlds' },
  { id: 'artists', label: 'Artist eras' },
];
const ANIME_IDS = new Set(['titan', 'naruto', 'deathnote']);

function getCollection(item) {
  return ANIME_IDS.has(item.pixelIcon) ? 'anime' : 'artists';
}

export function getOwnedCosmetics(username) {
  try { return JSON.parse(localStorage.getItem(`nova_cosmetics_${username}`) || '{}'); }
  catch { return {}; }
}

export function getActiveCosmetic(username, category) {
  const owned = getOwnedCosmetics(username);
  const key = `active_${category}`;
  return owned[key] || null;
}

function saveOwned(username, owned) {
  localStorage.setItem(`nova_cosmetics_${username}`, JSON.stringify(owned));
}

const CoinShop = ({ user }) => {
  const [owned, setOwned]     = useState({});
  const [coins, setCoinsState] = useState(0);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [activeCollection, setActiveCollection] = useState('all');
  const [toast, setToast] = useState(null);

  function refreshCoins() {
    if (!user?.username) return;
    setCoinsState(parseInt(localStorage.getItem(`nova_coins_${user.username}`) || '0'));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user?.username) {
      setOwned(getOwnedCosmetics(user.username));
      refreshCoins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  function buy(item) {
    if (!user) { alert('Sign in first!'); return; }
    if (coins < item.price) { showToast('Not enough coins! 🪙', false); return; }
    const newCoins = coins - item.price;
    localStorage.setItem(`nova_coins_${user.username}`, String(newCoins));
    setCoinsState(newCoins);

    const updated = { ...owned, [item.id]: true };
    saveOwned(user.username, updated);
    setOwned(updated);
    awardBadge(user.username, 'shop_buyer');
    showToast(`Purchased ${item.name}! ✨`);
  }

  function equip(item) {
    if (!user || !owned[item.id]) return;
    const catKey = `active_${item.category}`;
    const isAlreadyActive = owned[catKey] === item.id;
    const updated = { ...owned, [catKey]: isAlreadyActive ? null : item.id };
    saveOwned(user.username, updated);
    setOwned(updated);
    // Profile Theme is special: it needs to be visible to anyone who
    // visits this member's profile, not just readable from this one
    // browser's localStorage — so it also gets written to the synced
    // nova_user_stats table (falls back to localStorage-only, same as
    // everywhere else, if that table/route isn't set up yet).
    if (item.category === 'Profile Theme') {
      db.updateUserStats(user.username, { equipped_theme: isAlreadyActive ? null : item.id }).catch(() => {});
    }
    showToast(isAlreadyActive ? 'Unequipped.' : `${item.name} equipped!`);
  }

  const items = COSMETICS.filter(c =>
    c.category === activeTab && (c.category === 'Profile Theme' || activeCollection === 'all' || getCollection(c) === activeCollection)
  );

  return (
    <div className="page nf-page">
      {toast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 22px', borderRadius: 999, fontWeight: 700, fontSize: '0.88rem',
          background: toast.ok ? 'rgba(67,181,129,0.9)' : 'rgba(255,107,122,0.9)',
          color: '#fff', zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {toast.msg}
        </div>
      )}

      <div className="nf-header nf-shop-header">
        <div className="nf-shop-collection-mark">NOVA / CULTURE PACK 01 <span>•</span> COSMETICS</div>
        <h1>Make your name <em>recognizable.</em></h1>
        <p>Artist eras and anime worlds, translated into the glow, border, and badge you carry through Nova.</p>
        {user
          ? <div className="nf-shop-balance"><span>YOUR NOVA BALANCE</span><strong>{coins.toLocaleString()} <i>COINS</i></strong></div>
          : <div className="nf-shop-signin">Sign in to collect a drop</div>
        }
      </div>

      <div className="nf-shop-intro">
        <div><span className="nf-shop-intro-kicker">THE ARCHIVE</span><strong>No generic cosmetics.</strong><p>Every drop has a world behind it. Pick the one that feels like you.</p></div>
        <div className="nf-shop-intro-count"><b>{COSMETICS.length}</b><span>curated drops</span></div>
      </div>

      <div className="nf-shop-filter-row">
        <div className="nf-shop-collection-tabs">
          {COLLECTIONS.map(collection => (
            <button key={collection.id} className={activeCollection === collection.id ? 'active' : ''} onClick={() => setActiveCollection(collection.id)}>
              {collection.label}
            </button>
          ))}
        </div>
        <div className="nf-shop-category-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={activeTab === cat ? 'active' : ''}>
            {cat}
          </button>
        ))}
        </div>
      </div>

      <div className="nf-shop-grid">
        {items.map(item => {
          const isOwned  = !!owned[item.id];
          const isActive = owned[`active_${item.category}`] === item.id;
          const collectionLabel = getCollection(item) === 'anime' ? 'ANIME WORLD' : 'ARTIST ERA';
          return (
            <div key={item.id} className={`nf-shop-item ${getCollection(item)}${isOwned ? ' owned' : ''}`} style={{ '--shop-accent': item.css?.color || '#d4af37' }}>
              <div className="nf-shop-item-topline"><span>{collectionLabel}</span><b>{item.category}</b></div>
              <div className="nf-shop-emoji">
                {item.pixelIcon ? <PixelIcon theme={item.pixelIcon} size={6} /> : item.emoji}
              </div>
              <div className="nf-shop-name" style={isActive && item.css ? item.css : {}}>{item.name}</div>
              <div className="nf-shop-desc">{item.desc}</div>
              <div className="nf-shop-price"><span>{item.price}</span> NOVA COINS</div>
              {!isOwned ? (
                <button
                  className="nf-shop-btn"
                  onClick={() => buy(item)}
                  disabled={!user || coins < item.price}
                >
                  {!user ? 'Sign in' : coins < item.price ? 'Need more coins' : 'Buy'}
                </button>
              ) : (
                <button
                  className={`nf-shop-btn owned-btn${isActive ? '' : ''}`}
                  onClick={() => equip(item)}
                  style={isActive ? { borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)', background: 'rgba(94,129,244,0.12)' } : {}}
                >
                  {isActive ? '✓ Equipped' : 'Equip'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {items.length === 0 && <div className="nf-shop-empty">No drops in this filter yet.</div>}
    </div>
  );
};

export default CoinShop;
