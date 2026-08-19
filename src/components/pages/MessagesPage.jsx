import React, { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import db from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { checkRateLimit, recordAction } from '../../services/rateLimiter';
import './Pages.css';

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const MessagesPage = ({ initialUsername, onSignIn }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState(null);
  const [active, setActive] = useState(initialUsername || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [limitMsg, setLimitMsg] = useState('');
  const bottomRef = useRef(null);

  const loadConversations = () => {
    if (!user) return;
    db.getConversations(user.username).then(setConversations);
  };

  useEffect(() => { loadConversations(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !active) return;
    db.getMessages(user.username, active).then(setMessages);
    db.markConversationRead(user.username, active).then(loadConversations);
  }, [active, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!user) {
    return (
      <div className="page-container">
        <h1 className="gradient-text">Messages</h1>
        <p style={{ color: 'rgba(158,165,196,0.6)' }}>Sign in to send and receive messages.</p>
        <button className="neon-button" onClick={onSignIn}>Sign In</button>
      </div>
    );
  }

  const send = async () => {
    const content = text.trim();
    if (!content || !active) return;
    const verdict = checkRateLimit('dm', user.username);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    setSending(true);
    const saved = await db.sendMessage(user.username, active, content);
    recordAction('dm', user.username);
    setMessages(prev => [...prev, saved]);
    setText('');
    setSending(false);
    loadConversations();
  };

  return (
    <div className="page-container">
      <h1 className="gradient-text" style={{ marginBottom: 16 }}>Messages</h1>
      <div style={{
        display: 'flex', gap: 0, border: '1px solid rgba(94,129,244,0.15)', borderRadius: 14,
        overflow: 'hidden', minHeight: 480, background: 'rgba(19,23,41,0.4)',
      }}>
        {/* Conversation list */}
        <div style={{
          width: active ? 0 : '100%', maxWidth: active ? 0 : 320, flexShrink: 0,
          borderRight: '1px solid rgba(94,129,244,0.12)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }} className="dm-conversation-list">
          {conversations === null ? (
            <div style={{ padding: 20, color: 'rgba(158,165,196,0.4)' }}>Loading…</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20, color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>
              No conversations yet. Visit a member's page and start one.
            </div>
          ) : conversations.map(c => (
            <button
              key={c.conversation_id}
              onClick={() => setActive(c.other_username)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: active === c.other_username ? 'rgba(94,129,244,0.1)' : 'none',
                border: 'none', borderBottom: '1px solid rgba(94,129,244,0.06)', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--color-cyan)', fontSize: '0.85rem',
              }}>{c.other_username.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontWeight: c.unread ? 800 : 600, color: '#e2e5f0', fontSize: '0.85rem' }}>{c.other_username}</span>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.4)', flexShrink: 0 }}>{timeAgo(c.last_at)}</span>
                </div>
                <div style={{
                  fontSize: '0.76rem', color: c.unread ? '#c9cee0' : 'rgba(158,165,196,0.45)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{c.last_message}</div>
              </div>
              {c.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-magenta)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Thread */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(158,165,196,0.35)' }}>
              Select a conversation
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(94,129,244,0.12)' }}>
                <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.6)', cursor: 'pointer', display: 'flex' }}>
                  <ArrowLeft size={18} />
                </button>
                <strong style={{ color: '#e2e5f0' }}>{active}</strong>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    alignSelf: m.from_username === user.username ? 'flex-end' : 'flex-start',
                    maxWidth: '72%', padding: '8px 12px', borderRadius: 14,
                    background: m.from_username === user.username ? 'rgba(94,129,244,0.2)' : 'rgba(94,129,244,0.06)',
                    border: '1px solid rgba(94,129,244,0.15)',
                  }}>
                    <div style={{ color: '#e2e5f0', fontSize: '0.86rem' }}>{m.content}</div>
                    <div style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.65rem', marginTop: 2 }}>{timeAgo(m.created_at)}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: 12, borderTop: '1px solid rgba(94,129,244,0.12)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                    placeholder="Type a message…"
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', fontSize: '0.86rem' }}
                  />
                  <button className="neon-button" disabled={sending || !text.trim()} onClick={send} style={{ padding: '9px 14px', opacity: (!text.trim() || sending) ? 0.5 : 1 }}>
                    <Send size={16} />
                  </button>
                </div>
                {limitMsg && <p style={{ color: '#ff9e57', fontSize: '0.76rem', marginTop: 6, marginBottom: 0 }}>{limitMsg}</p>}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .dm-conversation-list { max-width: none !important; width: 100% !important; } }`}</style>
    </div>
  );
};

export default MessagesPage;
