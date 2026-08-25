/**
 * GameChat.jsx
 * Lightweight "watch party" comment thread scoped to a single live/
 * completed Sports Hub game — lets members talk trash in real time
 * while watching. Distinct from PlayerComments.jsx, which is a
 * per-league-player thread, not per real-world game.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import db from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { awardXP } from '../../services/reputationService';

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const GameChat = ({ sport, gameId, isLive }) => {
  const { user, hasPermission } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const load = useCallback((silent) => {
    if (!silent) setLoading(true);
    db.getGameChat(sport, gameId).then(data => {
      setMessages(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [sport, gameId]);

  useEffect(() => {
    load(false);
    if (isLive) {
      pollRef.current = setInterval(() => load(true), 8000);
      return () => clearInterval(pollRef.current);
    }
  }, [load, isLive]);

  const canModerate = hasPermission('mod');

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    const saved = await db.addGameChatMessage(sport, {
      game_id: gameId,
      from_username: user.username,
      content,
    });
    awardXP(user.username, 2);
    setMessages(prev => [...prev, saved]);
    setText('');
    setPosting(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleDelete = async (m) => {
    if (!(user?.username === m.from_username || canModerate)) return;
    await db.deleteGameChatMessage(sport, m.id);
    setMessages(prev => prev.filter(x => x.id !== m.id));
  };

  return (
    <div className="stats-section neon-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <h3 className="gradient-text-cyan" style={{ margin: 0 }}>Watch Party</h3>
        {isLive && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 800, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span className="sh-live-dot" /> Live
        </span>}
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, paddingRight: 4 }}>
        {loading ? (
          <p style={{ color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem' }}>Loading chat...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
            No messages yet. Say something first!
          </p>
        ) : messages.map(m => (
          <div key={m.id} style={{ padding: '8px 12px', background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.82rem' }}>{m.from_username}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.68rem' }}>{timeAgo(m.created_at)}</span>
                {(user?.username === m.from_username || canModerate) && (
                  <button onClick={() => handleDelete(m)} style={{ background: 'none', border: 'none', color: 'rgba(255,107,122,0.5)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>Delete</button>
                )}
              </div>
            </div>
            <p style={{ margin: '2px 0 0', color: 'rgba(220,230,255,0.85)', fontSize: '0.85rem', lineHeight: 1.4, wordBreak: 'break-word' }}>{m.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {user && user.role !== 'guest' ? (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !posting) handleSend(); }}
              placeholder="Say something about the game..."
              maxLength={280}
              className="focus-ring"
              style={{ flex: 1, padding: '9px 12px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.85rem' }}
            />
            <button className="neon-button" onClick={handleSend} disabled={posting || !text.trim()} style={{ padding: '8px 18px', opacity: (posting || !text.trim()) ? 0.4 : 1 }}>
              {posting ? '...' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem', margin: 0 }}>Sign in to join the watch party.</p>
      )}
    </div>
  );
};

export default GameChat;
