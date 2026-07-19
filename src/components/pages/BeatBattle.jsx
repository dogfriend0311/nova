import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';

const BATTLE_KEY = 'nova_beat_battle';
const VOTES_KEY  = 'nova_beat_votes';

function getBattle() {
  try { return JSON.parse(localStorage.getItem(BATTLE_KEY) || 'null'); }
  catch { return null; }
}

function getVotes() {
  try { return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'); }
  catch { return {}; }
}

// Build embed src from Spotify/YouTube URL
function toEmbedSrc(url) {
  if (!url) return null;
  if (url.includes('/embed/')) return url;
  if (url.includes('open.spotify.com')) return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

const BeatBattle = ({ user }) => {
  const [battle] = useState(getBattle);
  const [votes, setVotes]   = useState(getVotes);
  const [myVote, setMyVote] = useState(null);

  useEffect(() => {
    if (user?.username) {
      const v = getVotes();
      setMyVote(v[user.username] ?? null);
    }
  }, [user]);

  const totalVotes = Object.values(votes).length;
  const countFor   = (idx) => Object.values(votes).filter(v => v === idx).length;
  const pctFor     = (idx) => totalVotes === 0 ? 0 : Math.round((countFor(idx) / totalVotes) * 100);

  const isEnded = battle?.endsAt && new Date(battle.endsAt) < new Date();
  const winner  = isEnded ? (countFor(0) >= countFor(1) ? 0 : 1) : null;

  function vote(songIdx) {
    if (!user) { alert('Sign in to vote!'); return; }
    if (myVote !== null) { alert('You already voted!'); return; }
    if (isEnded) { alert('Voting has ended.'); return; }
    const v = getVotes();
    v[user.username] = songIdx;
    localStorage.setItem(VOTES_KEY, JSON.stringify(v));
    setVotes({ ...v });
    setMyVote(songIdx);
    awardBadge(user.username, 'beat_battle_vote');
    // Award win badge if user submitted the winning song (checked by admin action)
  }

  if (!battle) {
    return (
      <div className="page nf-page">
        <div className="nf-header">
          <h1>🎵 Beat Battle</h1>
          <p>Weekly community music vote — two songs enter, one wins</p>
        </div>
        <div className="nf-card nf-empty">
          No Beat Battle active right now.<br />
          <span style={{ fontSize: '0.78rem', marginTop: 8, display: 'block' }}>
            Check back soon — an admin will post the next matchup.
          </span>
        </div>
      </div>
    );
  }

  const songs = battle.songs || [];

  return (
    <div className="page nf-page">
      <div className="nf-header">
        <h1>🎵 Beat Battle</h1>
        <p>
          {isEnded
            ? `Battle ended · ${totalVotes} votes cast`
            : `Vote before ${battle.endsAt ? new Date(battle.endsAt).toLocaleDateString() : 'the deadline'} · ${totalVotes} votes so far`}
        </p>
      </div>

      {isEnded && winner !== null && (
        <div className="nf-card" style={{ textAlign: 'center', borderColor: '#ffd700', background: 'rgba(255,215,0,0.05)', marginBottom: 16 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🏆 Winner</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffd700' }}>{songs[winner]?.title}</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.6)', marginTop: 2 }}>{songs[winner]?.artist}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)', marginTop: 6 }}>
            {pctFor(winner)}% · {countFor(winner)} votes
          </div>
        </div>
      )}

      <div className="nf-vs-grid">
        {songs.map((song, idx) => {
          const embed = toEmbedSrc(song.url);
          const isWinner = isEnded && winner === idx;
          return (
            <div
              key={idx}
              className={`nf-song-card${myVote === idx ? ' voted' : ''}${isWinner ? ' leading' : ''}`}
              onClick={() => !isEnded && vote(idx)}
              style={{ borderColor: isWinner ? '#ffd700' : myVote === idx ? 'var(--color-cyan)' : undefined }}
            >
              <div className="nf-song-title">{song.title || `Song ${idx + 1}`}</div>
              <div className="nf-song-artist">{song.artist || 'Unknown Artist'}</div>

              {embed && (
                <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                  <iframe
                    src={embed}
                    width="100%"
                    height={song.url?.includes('spotify') ? 152 : 180}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen"
                    title={song.title}
                    style={{ display: 'block' }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}

              <div className="nf-vote-bar-track">
                <div className="nf-vote-bar-fill" style={{ width: `${pctFor(idx)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="nf-vote-pct">{pctFor(idx)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.45)' }}>{countFor(idx)} votes</span>
              </div>

              {!isEnded && myVote === null && (
                <button
                  className="nf-shop-btn"
                  style={{ marginTop: 10, borderColor: 'rgba(94,129,244,0.4)', color: 'var(--color-cyan)' }}
                  onClick={e => { e.stopPropagation(); vote(idx); }}
                >
                  Vote This One
                </button>
              )}
              {myVote === idx && (
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-cyan)' }}>
                  ✓ Your vote
                </div>
              )}
            </div>
          );
        })}

        <div className="nf-vs-label">VS</div>
      </div>

      {!user && (
        <div style={{ textAlign: 'center', color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginTop: 8 }}>
          Sign in to cast your vote.
        </div>
      )}
    </div>
  );
};

export default BeatBattle;
