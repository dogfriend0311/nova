/**
 * PlayerOfGame.jsx
 * Community voting on the standout performance of a Sports Hub game.
 * Every member gets one pick per game (re-voting replaces their prior
 * pick); the running tally is shown as a simple bar list. Casting a
 * vote awards the "Talent Scout" badge via achievementsService, tying
 * this into the site's existing badge/achievement system.
 */
import React, { useState, useEffect, useCallback } from 'react';
import db from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { awardBadge } from '../../services/achievementsService';

const ESPN       = 'https://site.api.espn.com';
const ESPN_PROXY = '/espn-proxy';

const SPORT_PATH = {
  mlb: 'baseball/mlb', nfl: 'football/nfl', nba: 'basketball/nba',
  nhl: 'hockey/nhl', cfb: 'football/college-football', cbb: 'baseball/college-baseball',
};

const PlayerOfGame = ({ sport, gameId, homeAbbr, awayAbbr }) => {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState(null); // [{id,name,photo,teamAbbr}]
  const [votes, setVotes]       = useState([]);
  const [myPick, setMyPick]     = useState('');
  const [voting, setVoting]     = useState(false);
  const [error, setError]       = useState(null);

  const loadVotes = useCallback(() => {
    db.getGameVotes(sport, gameId).then(v => {
      setVotes(Array.isArray(v) ? v : []);
      const mine = (v || []).find(x => x.from_username === user?.username);
      if (mine) setMyPick(mine.athlete_id);
    });
  }, [sport, gameId, user]);

  useEffect(() => {
    let cancelled = false;
    const apiBase = process.env.NODE_ENV === 'production' ? ESPN_PROXY : ESPN;
    fetch(`${apiBase}/apis/site/v2/sports/${SPORT_PATH[sport]}/summary?event=${gameId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const byId = new Map();
        (d.boxscore?.players || []).forEach(group => {
          const teamAbbr = group.team?.abbreviation || '?';
          (group.statistics || []).forEach(cat => {
            (cat.athletes || []).forEach(a => {
              const ath = a.athlete;
              if (!ath?.id || byId.has(ath.id)) return;
              byId.set(ath.id, {
                id: ath.id,
                name: ath.displayName || 'Unknown',
                photo: ath.headshot?.href || null,
                teamAbbr,
              });
            });
          });
        });
        setAthletes(Array.from(byId.values()));
      })
      .catch(e => !cancelled && setError(e.message));
    loadVotes();
    return () => { cancelled = true; };
  }, [sport, gameId, loadVotes]);

  const handleVote = async () => {
    if (!myPick || !user) return;
    const athlete = athletes.find(a => String(a.id) === String(myPick));
    if (!athlete) return;
    setVoting(true);
    await db.castGameVote(sport, {
      game_id: gameId,
      from_username: user.username,
      athlete_id: athlete.id,
      athlete_name: athlete.name,
      team_abbr: athlete.teamAbbr,
    });
    awardBadge(user.username, 'potg_voter');
    loadVotes();
    setVoting(false);
  };

  const tally = {};
  votes.forEach(v => { tally[v.athlete_id] = (tally[v.athlete_id] || 0) + 1; });
  const total = votes.length;
  const ranked = Object.entries(tally)
    .map(([athleteId, count]) => {
      const sample = votes.find(v => v.athlete_id === athleteId);
      return { athleteId, count, name: sample?.athlete_name || 'Unknown', team: sample?.team_abbr };
    })
    .sort((a, b) => b.count - a.count);

  if (error) return <div className="sh-error">Could not load roster for voting: {error}</div>;

  return (
    <div className="stats-section neon-card" style={{ padding: '18px 20px' }}>
      <h3 className="gradient-text-cyan" style={{ marginBottom: 6 }}>Player of the Game</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.82rem', marginTop: 0, marginBottom: 16 }}>
        {total > 0 ? `${total} vote${total !== 1 ? 's' : ''} so far` : 'No votes yet — be the first to pick a standout performer.'}
      </p>

      {ranked.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {ranked.slice(0, 6).map((r, i) => (
            <div key={r.athleteId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
                <span style={{ color: i === 0 ? '#ffd700' : 'rgba(158,165,196,0.85)', fontWeight: i === 0 ? 800 : 600 }}>
                  {i === 0 && '🏆 '}{r.name} <span style={{ color: 'rgba(158,165,196,0.4)' }}>({r.team})</span>
                </span>
                <span style={{ color: 'rgba(158,165,196,0.5)' }}>{r.count} vote{r.count !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'rgba(94,129,244,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${total ? (r.count / total) * 100 : 0}%`, background: i === 0 ? 'linear-gradient(90deg,#ffd700,#ff9e57)' : 'linear-gradient(90deg,#5e81f4,#c864dc)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {user && user.role !== 'guest' ? (
        athletes === null ? (
          <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem' }}>Loading players...</p>
        ) : athletes.length === 0 ? (
          <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem' }}>No player stats available to vote on yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={myPick}
              onChange={e => setMyPick(e.target.value)}
              style={{ flex: '1 1 220px', padding: '8px 10px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.25)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.85rem' }}
            >
              <option value="">Choose a player...</option>
              {[awayAbbr, homeAbbr].map(teamAbbr => (
                <optgroup key={teamAbbr} label={teamAbbr}>
                  {athletes.filter(a => a.teamAbbr === teamAbbr).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button className="neon-button" onClick={handleVote} disabled={!myPick || voting} style={{ padding: '8px 18px', opacity: (!myPick || voting) ? 0.4 : 1 }}>
              {voting ? 'Voting...' : (myPick && votes.some(v => v.from_username === user.username && v.athlete_id === myPick)) ? 'Voted ✓' : 'Vote'}
            </button>
          </div>
        )
      ) : (
        <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem', margin: 0 }}>Sign in to vote.</p>
      )}
    </div>
  );
};

export default PlayerOfGame;
