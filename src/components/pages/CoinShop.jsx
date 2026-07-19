import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';

// All available cosmetics
export const COSMETICS = [
  // Name glow colors
  { id: 'glow_cyan',    category: 'Name Glow',    emoji: '💙', name: 'Ion Blue',      desc: 'Cyan glow on your username',     price: 50,  css: { color: '#5e81f4', textShadow: '0 0 8px #5e81f4' } },
  { id: 'glow_purple',  category: 'Name Glow',    emoji: '💜', name: 'Cosmic Purple', desc: 'Purple glow on your username',   price: 75,  css: { color: '#c864dc', textShadow: '0 0 8px #c864dc' } },
  { id: 'glow_gold',    category: 'Name Glow',    emoji: '💛', name: 'Solar Gold',    desc: 'Gold glow on your username',     price: 100, css: { color: '#ffd700', textShadow: '0 0 8px #ffd700' } },
  { id: 'glow_pink',    category: 'Name Glow',    emoji: '🩷', name: 'Neon Pink',     desc: 'Pink glow on your username',     price: 75,  css: { color: '#ff6ec7', textShadow: '0 0 8px #ff6ec7' } },
  { id: 'glow_green',   category: 'Name Glow',    emoji: '💚', name: 'Matrix Green',  desc: 'Green glow on your username',    price: 50,  css: { color: '#43b581', textShadow: '0 0 8px #43b581' } },
  // Profile borders
  { id: 'border_nebula',  category: 'Avatar Border', emoji: '🌌', name: 'Nebula',     desc: 'Purple/blue gradient ring',      price: 100, css: { border: '3px solid #6c3ce7' } },
  { id: 'border_galaxy',  category: 'Avatar Border', emoji: '🌠', name: 'Galaxy',     desc: 'Animated rainbow border',        price: 200, css: { border: '3px solid #ff9e57' } },
  { id: 'border_fire',    category: 'Avatar Border', emoji: '🔥', name: 'Fire',        desc: 'Orange-red fire ring',           price: 150, css: { border: '3px solid #ff6b2b' } },
  { id: 'border_ice',     category: 'Avatar Border', emoji: '❄️', name: 'Ice',         desc: 'Icy blue ring',                  price: 150, css: { border: '3px solid #aee6ff' } },
  // Chat badges
  { id: 'badge_star',     category: 'Chat Badge',    emoji: '⭐', name: 'Star',        desc: 'Star icon next to your name',    price: 75  },
  { id: 'badge_crown',    category: 'Chat Badge',    emoji: '👑', name: 'Crown',       desc: 'Crown icon next to your name',   price: 150 },
  { id: 'badge_rocket',   category: 'Chat Badge',    emoji: '🚀', name: 'Rocket',      desc: 'Rocket icon next to your name',  price: 50  },
  { id: 'badge_gem',      category: 'Chat Badge',    emoji: '💎', name: 'Gem',         desc: 'Gem icon next to your name',     price: 200 },
];

const CATEGORIES = [...new Set(COSMETICS.map(c => c.category))];

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
    showToast(isAlreadyActive ? 'Unequipped.' : `${item.name} equipped!`);
  }

  const items = COSMETICS.filter(c => c.category === activeTab);

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

      <div className="nf-header">
        <h1>🛍️ Coin Shop</h1>
        <p>Spend your coins on profile cosmetics</p>
        {user
          ? <div style={{ marginTop: 8, fontSize: '0.92rem', fontWeight: 700, color: '#ffd700' }}>Balance: {coins.toLocaleString()} 🪙</div>
          : <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'rgba(158,165,196,0.5)' }}>Sign in to purchase</div>
        }
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)} style={{
            padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: activeTab === cat ? 'rgba(94,129,244,0.2)' : 'rgba(94,129,244,0.06)',
            color: activeTab === cat ? 'var(--color-cyan)' : 'rgba(158,165,196,0.6)',
            fontWeight: 700, fontSize: '0.82rem',
            boxShadow: activeTab === cat ? '0 0 10px rgba(94,129,244,0.2)' : 'none',
          }}>
            {cat}
          </button>
        ))}
      </div>

      <div className="nf-shop-grid">
        {items.map(item => {
          const isOwned  = !!owned[item.id];
          const isActive = owned[`active_${item.category}`] === item.id;
          return (
            <div key={item.id} className={`nf-shop-item${isOwned ? ' owned' : ''}`}>
              <div className="nf-shop-emoji">{item.emoji}</div>
              <div className="nf-shop-name" style={isActive && item.css ? item.css : {}}>{item.name}</div>
              <div className="nf-shop-desc">{item.desc}</div>
              <div className="nf-shop-price">{item.price} 🪙</div>
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
    </div>
  );
};

export default CoinShop;
