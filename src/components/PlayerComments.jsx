import React, { useState, useEffect } from 'react';
import db from '../services/db';
import { useAuth } from '../context/AuthContext';
import { checkRateLimit, recordAction } from '../services/rateLimiter';
import { awardXP } from '../services/reputationService';

// Accepts a direct .gif link, or a Giphy/Tenor "share" page link (best-effort
// extraction of the actual media URL so pasted share links still render).
const normalizeGifUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/\.(gif|webp|mp4)$/i.test(trimmed)) return trimmed;
  return trimmed; // fall back to whatever was pasted — <img> will just fail to load silently if it's not an image
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const PlayerComments = ({ league, playerId, playerName }) => {
  const { user, hasPermission } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [showGif, setShowGif]   = useState(false);
  const [gifUrl, setGifUrl]     = useState('');
  const [posting, setPosting]   = useState(false);
  const [limitMsg, setLimitMsg] = useState('');

  const load = () => {
    setLoading(true);
    db.getPlayerComments(league, playerId).then(data => {
      setComments(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(load, [league, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canModerate = hasPermission('mod'); // owner/cofounder/mod can moderate any comment

  const handlePost = async () => {
    const content = text.trim();
    const gif = normalizeGifUrl(gifUrl);
    if (!content && !gif) return;
    const verdict = checkRateLimit('comment', user?.username);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    setPosting(true);
    const saved = await db.addPlayerComment(league, {
      player_id: playerId,
      player_name: playerName,
      from_username: user.username,
      content,
      gif_url: gif,
    });
    recordAction('comment', user.username);
    awardXP(user.username, 5);
    setComments(prev => [saved, ...prev]);
    setText(''); setGifUrl(''); setShowGif(false);
    setPosting(false);
  };

  const handleDelete = async (c) => {
    if (!(user?.username === c.from_username || canModerate)) return;
    await db.deletePlayerComment(league, c.id);
    setComments(prev => prev.filter(x => x.id !== c.id));
  };

  return (
    <div className="stats-section neon-card player-comments">
      <h3 className="gradient-text-cyan" style={{ marginBottom: '15px' }}>Comments</h3>

      {user && user.role !== 'guest' ? (
        <div style={{ marginBottom: '20px' }}>
          <textarea
            rows={2}
            placeholder={`Leave a comment on ${playerName || 'this player'}'s stat page...`}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(94, 129, 244,0.05)', border: '1px solid rgba(94, 129, 244,0.2)', color: '#e2e5f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />

          {showGif && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Paste a GIF link (Giphy, Tenor, or any .gif URL)"
                value={gifUrl}
                onChange={e => setGifUrl(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(94, 129, 244,0.05)', border: '1px solid rgba(94, 129, 244,0.2)', color: '#e2e5f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
              {gifUrl.trim() && (
                <div style={{ marginTop: '8px' }}>
                  <img src={normalizeGifUrl(gifUrl)} alt="GIF preview" style={{ maxWidth: '220px', maxHeight: '160px', borderRadius: '8px', border: '1px solid rgba(94, 129, 244,0.2)' }} />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="neon-button"
              onClick={handlePost}
              disabled={posting || (!text.trim() && !gifUrl.trim())}
              style={{ padding: '8px 20px', opacity: (posting || (!text.trim() && !gifUrl.trim())) ? 0.4 : 1 }}
            >
              {posting ? 'Posting...' : 'Post Comment'}
            </button>
            <button
              type="button"
              onClick={() => setShowGif(s => !s)}
              style={{ background: 'none', border: '1px solid rgba(94, 129, 244,0.25)', color: showGif ? 'var(--color-magenta)' : 'rgba(158, 165, 196,0.6)', borderRadius: '6px', padding: '7px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              🎬 GIF
            </button>
          </div>
          {limitMsg && (
            <p style={{ color: '#ff9e57', fontSize: '0.78rem', marginTop: '8px', marginBottom: 0 }}>{limitMsg}</p>
          )}
        </div>
      ) : (
        <p style={{ color: 'rgba(158, 165, 196,0.4)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Sign in to leave a comment.
        </p>
      )}

      {loading ? (
        <p style={{ color: 'rgba(158, 165, 196,0.3)', fontSize: '0.85rem' }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: 'rgba(158, 165, 196,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '12px 14px', background: 'rgba(94, 129, 244,0.04)', border: '1px solid rgba(94, 129, 244,0.1)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.88rem' }}>{c.from_username}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'rgba(158, 165, 196,0.35)', fontSize: '0.72rem' }}>{timeAgo(c.created_at)}</span>
                  {(user?.username === c.from_username || canModerate) && (
                    <button onClick={() => handleDelete(c)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255, 107, 122,0.5)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {c.content && <p style={{ margin: 0, color: 'rgba(220,230,255,0.85)', fontSize: '0.88rem', lineHeight: 1.5 }}>{c.content}</p>}
              {c.gif_url && (
                <img src={normalizeGifUrl(c.gif_url)} alt="Comment GIF" style={{ marginTop: c.content ? '8px' : 0, maxWidth: '260px', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerComments;
