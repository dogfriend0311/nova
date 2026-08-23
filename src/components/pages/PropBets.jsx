import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';
import { getCoins as getCoinsBalance, setCoins as setCoinsBalance } from '../../services/coinsStorage';

const PROPS_KEY = 'nova_prop_bets';
const BETS_KEY  = 'nova_user_bets';

function getProps() {
  try { return JSON.parse(localStorage.getItem(PROPS_KEY) || '[]'); }
  catch { return []; }
}

function getUserBets(username) {
  try { return JSON.parse(localStorage.getItem(`${BETS_KEY}_${username}`) || '{}'); }
  catch { return {}; }
}

function saveUserBets(username, bets) {
  localStorage.setItem(`${BETS_KEY}_${username}`, JSON.stringify(bets));
}

const PropBets = ({ user }) => {
  const [props, setProps] = useState(getProps);
  const [myBets, setMyBets] = useState({});
  const [betAmounts, setBetAmounts] = useState({});

  useEffect(() => {
    if (user?.username) setMyBets(getUserBets(user.username));
    setProps(getProps());
  }, [user]);

  function getCoins() {
    return getCoinsBalance(user?.username);
  }

  function setCoins(n) {
    setCoinsBalance(user?.username, n);
  }

  function placeBet(propId, optionIdx) {
    if (!user) { alert('Sign in to bet!'); return; }
    if (myBets[propId] !== undefined) { alert('Already placed a bet on this prop.'); return; }
    const amount = parseInt(betAmounts[propId] || '10');
    if (isNaN(amount) || amount < 1) { alert('Enter a valid bet amount.'); return; }
    const coins = getCoins();
    if (coins < amount) { alert(`Not enough coins! You have ${coins}.`); return; }

    setCoins(coins - amount);
    const updated = { ...myBets, [propId]: { optionIdx, amount } };
    setMyBets(updated);
    saveUserBets(user.username, updated);
  }

  const open     = props.filter(p => p.status === 'open');
  const resolved = props.filter(p => p.status === 'resolved');

  const winnings = (prop) => {
    const bet = myBets[prop.id];
    if (!bet || prop.status !== 'resolved') return null;
    if (bet.optionIdx === prop.winnerIdx) {
      const multiplier = prop.multiplier || 2;
      return { win: true, amount: Math.round(bet.amount * multiplier) };
    }
    return { win: false, amount: bet.amount };
  };

  // Credit winnings for newly resolved props
  useEffect(() => {
    if (!user?.username) return;
    const credited = JSON.parse(localStorage.getItem(`nova_props_credited_${user.username}`) || '[]');
    resolved.forEach(prop => {
      if (credited.includes(prop.id)) return;
      const result = winnings(prop);
      if (result?.win) {
        setCoins(getCoins() + result.amount);
        awardBadge(user.username, 'prop_bet_win');
        credited.push(prop.id);
      } else if (result?.win === false) {
        credited.push(prop.id); // mark as processed even for losses
      }
    });
    localStorage.setItem(`nova_props_credited_${user.username}`, JSON.stringify(credited));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props, user]);

  const Section = ({ title, items, resolved: isResolved }) => (
    <>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.45)', margin: '28px 0 12px' }}>
        {title}
      </div>
      {items.length === 0
        ? <div className="nf-card nf-empty" style={{ padding: '28px' }}>{isResolved ? 'No resolved props yet.' : 'No open props right now.'}</div>
        : items.map(prop => {
            const bet = myBets[prop.id];
            const result = winnings(prop);
            return (
              <div key={prop.id} className="nf-card nf-prop-card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '1rem', marginBottom: 4 }}>
                      {prop.question}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)' }}>
                      {prop.sport?.toUpperCase()} · {prop.multiplier || 2}× payout
                      {prop.deadline ? ` · Closes ${new Date(prop.deadline).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  {result && (
                    <div style={{
                      padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
                      background: result.win ? 'rgba(67,181,129,0.15)' : 'rgba(255,107,122,0.1)',
                      color: result.win ? '#43b581' : 'rgba(255,107,122,0.8)',
                      border: `1px solid ${result.win ? '#43b581' : 'rgba(255,107,122,0.3)'}`,
                      flexShrink: 0
                    }}>
                      {result.win ? `+${result.amount} 🪙` : `-${result.amount} 🪙`}
                    </div>
                  )}
                </div>

                <div className="nf-prop-options">
                  {(prop.options || []).map((opt, oi) => {
                    const isWinner = prop.status === 'resolved' && prop.winnerIdx === oi;
                    const isLoser  = prop.status === 'resolved' && prop.winnerIdx !== oi;
                    const isPicked = bet?.optionIdx === oi;
                    return (
                      <button
                        key={oi}
                        className={`nf-prop-option-btn${isPicked ? ' selected' : ''}${isWinner ? ' winner' : ''}${isLoser && !isPicked ? ' loser' : ''}`}
                        onClick={() => prop.status === 'open' && !bet && placeBet(prop.id, oi)}
                        disabled={prop.status !== 'open' || !!bet}
                      >
                        {opt}
                        {isWinner && ' ✓'}
                        {isPicked && !isWinner && prop.status === 'resolved' && ' ✗'}
                      </button>
                    );
                  })}
                </div>

                {prop.status === 'open' && !bet && user && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Coins to bet"
                      value={betAmounts[prop.id] || ''}
                      onChange={e => setBetAmounts(prev => ({ ...prev, [prop.id]: e.target.value }))}
                      style={{ width: 120, padding: '6px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 6, fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)' }}>coins · pick an option above to bet</span>
                  </div>
                )}
                {bet && prop.status === 'open' && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)' }}>
                    Bet {bet.amount} 🪙 on "{prop.options?.[bet.optionIdx]}"
                  </div>
                )}
              </div>
            );
          })
      }
    </>
  );

  return (
    <div className="page nf-page">
      <div className="nf-header">
        <h1>🎯 Prop Bets</h1>
        <p>Bet coins on sports propositions — admin posts, you pick, coins awarded on resolve</p>
        {user && (
          <div style={{ marginTop: 8, fontSize: '0.88rem', color: '#ffd700', fontWeight: 700 }}>
            Your balance: {getCoins().toLocaleString()} 🪙
          </div>
        )}
      </div>
      <Section title="Open Props" items={open} resolved={false} />
      <Section title="Resolved" items={resolved} resolved />
    </div>
  );
};

export default PropBets;
