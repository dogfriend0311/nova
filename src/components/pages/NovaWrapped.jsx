import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { getCoins } from '../../services/coinsStorage';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2,'0'); }

function buildWrapped(username, year, month) {
  // Coins
  const coins = getCoins(username);

  // Pick'ems record from localStorage
  const picks = JSON.parse(localStorage.getItem(`nova_pickems_picks_${username}`) || '[]');
  const monthKey = `${year}-${pad(month+1)}`;
  const monthPicks = picks.filter(p => p.ts?.startsWith(monthKey));
  const correct = monthPicks.filter(p => p.correct).length;
  const total   = monthPicks.length;

  // Fantasy record
  const fantasyTeams = JSON.parse(localStorage.getItem('fantasy_teams') || '[]').filter(t => t.owner_username === username);
  const wins   = fantasyTeams.reduce((a,t) => a + (t.wins||0), 0);
  const losses = fantasyTeams.reduce((a,t) => a + (t.losses||0), 0);

  // Badges
  const badges = JSON.parse(localStorage.getItem(`nova_badges_${username}`) || '[]');

  // Song of day submissions
  const songs = JSON.parse(localStorage.getItem('nova_song_history') || '[]');
  const mySongs = songs.filter(s => s.submittedBy === username && s.date?.startsWith(monthKey));

  // Beat battle votes
  const voted = JSON.parse(localStorage.getItem('nova_beat_votes') || '{}');
  const didVote = Object.keys(voted).includes(username);

  // Prop bet wins
  const credited = JSON.parse(localStorage.getItem(`nova_props_credited_${username}`) || '[]');
  const props = JSON.parse(localStorage.getItem('nova_prop_bets') || '[]');
  const propWins = props.filter(p => credited.includes(p.id) && p.status === 'resolved').length;

  // Top sport (from pick'ems)
  const sportCounts = {};
  monthPicks.forEach(p => { sportCounts[p.sport] = (sportCounts[p.sport]||0) + 1; });
  const topSport = Object.entries(sportCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

  // Join date
  const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
  const me = users.find(u => u.username === username);
  const joinDate = me?.createdAt || me?.created_at || null;
  const daysActive = joinDate ? Math.floor((Date.now() - new Date(joinDate).getTime()) / (1000*60*60*24)) : null;

  return { coins, correct, total, wins, losses, badges: badges.length, mySongs: mySongs.length, didVote, propWins, topSport, daysActive };
}

const SPORT_EMOJI = { nfl:'🏈', nba:'🏀', mlb:'⚾', nhl:'🏒' };

const NovaWrapped = ({ user }) => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data,  setData]  = useState(null);

  useEffect(() => {
    if (user?.username) setData(buildWrapped(user.username, year, month));
  }, [user, year, month]);

  if (!user) {
    return (
      <div className="page nf-page">
        <div className="nf-header"><h1>✨ Nova Wrapped</h1><p>Your monthly stats recap</p></div>
        <div className="nf-card nf-empty">Sign in to see your Nova Wrapped.</div>
      </div>
    );
  }

  return (
    <div className="page nf-page">
      <div className="nf-header">
        <h1>✨ Nova Wrapped</h1>
        <p>Your monthly recap on Nova</p>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          style={{ padding: '8px 14px', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.88rem' }}
        >
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '8px 14px', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.88rem' }}
        >
          {[now.getFullYear(), now.getFullYear()-1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {data && (
        <div className="nf-wrapped-card">
          {/* Header */}
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)', marginBottom: 6 }}>
            {MONTHS[month]} {year}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e2e5f0', marginBottom: 4 }}>
            @{user.username}'s Wrapped
          </div>
          {data.topSport && (
            <div style={{ fontSize: '0.88rem', color: 'rgba(158,165,196,0.6)', marginBottom: 20 }}>
              Top sport: {SPORT_EMOJI[data.topSport] || '🏆'} {data.topSport?.toUpperCase()}
            </div>
          )}

          <div className="nf-wrapped-grid">
            <div className="nf-wrapped-stat">
              <div className="nf-wrapped-stat-val" style={{ color: '#ffd700' }}>{data.coins.toLocaleString()}</div>
              <div className="nf-wrapped-stat-label">Total Coins</div>
            </div>
            <div className="nf-wrapped-stat">
              <div className="nf-wrapped-stat-val" style={{ color: data.total > 0 ? 'var(--color-cyan)' : 'rgba(158,165,196,0.4)' }}>
                {data.total > 0 ? `${data.correct}/${data.total}` : '—'}
              </div>
              <div className="nf-wrapped-stat-label">Pick'em Record</div>
            </div>
            <div className="nf-wrapped-stat">
              <div className="nf-wrapped-stat-val" style={{ color: data.wins+data.losses > 0 ? '#43b581' : 'rgba(158,165,196,0.4)' }}>
                {data.wins+data.losses > 0 ? `${data.wins}W-${data.losses}L` : '—'}
              </div>
              <div className="nf-wrapped-stat-label">Fantasy Record</div>
            </div>
            <div className="nf-wrapped-stat">
              <div className="nf-wrapped-stat-val" style={{ color: '#c864dc' }}>{data.badges}</div>
              <div className="nf-wrapped-stat-label">Badges Earned</div>
            </div>
            <div className="nf-wrapped-stat">
              <div className="nf-wrapped-stat-val" style={{ color: '#ff9e57' }}>{data.propWins}</div>
              <div className="nf-wrapped-stat-label">Prop Bet Wins</div>
            </div>
            <div className="nf-wrapped-stat">
              <div className="nf-wrapped-stat-val" style={{ color: 'rgba(158,165,196,0.6)' }}>
                {data.daysActive !== null ? data.daysActive : '—'}
              </div>
              <div className="nf-wrapped-stat-label">Days on Nova</div>
            </div>
          </div>

          {/* Fun callouts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            {data.didVote && <span style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(94,129,244,0.12)', border: '1px solid rgba(94,129,244,0.25)', fontSize: '0.78rem', color: 'rgba(158,165,196,0.8)' }}>🗳️ Voted in Beat Battle</span>}
            {data.mySongs > 0 && <span style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(200,100,220,0.12)', border: '1px solid rgba(200,100,220,0.25)', fontSize: '0.78rem', color: 'rgba(158,165,196,0.8)' }}>🎶 {data.mySongs} Song suggestion{data.mySongs > 1 ? 's' : ''}</span>}
            {data.total > 0 && data.correct / data.total >= 0.7 && <span style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', fontSize: '0.78rem', color: '#ffd700' }}>🎯 Hot streak!</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default NovaWrapped;
