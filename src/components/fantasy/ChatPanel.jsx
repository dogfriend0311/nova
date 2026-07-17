import React, { useState, useEffect, useRef, useCallback } from 'react';
import fantasyDb from '../../services/fantasyDb';

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

const ChatPanel = ({ league, username }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const channelRef = useRef(null);
  const pollRef = useRef(null);
  const bottomRef = useRef(null);
  const isFirstLoad = useRef(true);

  const fetchMessages = useCallback(async () => {
    if (!league) return;
    try {
      const msgs = await fantasyDb.getChatMessages(league.id);
      // Sort ascending by created_at
      msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(msgs);
    } catch {
      // silently fail on poll errors
    }
  }, [league]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isFirstLoad.current ? 'auto' : 'smooth' });
      isFirstLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!league) return;

    // Initial load
    fetchMessages();

    // Try Supabase real-time subscription
    const channel = fantasyDb.subscribeToChannel(
      `fantasy_chat_${league.id}`,
      'fantasy_chat_messages',
      'league_id',
      league.id,
      (payload) => {
        if (payload?.new) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
        }
      }
    );

    channelRef.current = channel;

    // If no Supabase, fall back to polling every 4 seconds
    if (!channel) {
      pollRef.current = setInterval(fetchMessages, 4000);
    }

    return () => {
      if (channelRef.current) {
        fantasyDb.unsubscribe(channelRef.current);
        channelRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [league, fetchMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !username) return;
    setSending(true);
    setError('');
    try {
      const msg = await fantasyDb.sendChatMessage(league.id, username, content);
      setInput('');
      // Optimistically add if not already present (real-time will dedupe)
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
    } catch {
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!league) return <div className="empty-state">No league selected.</div>;

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2 className="gradient-text-cyan">League Chat</h2>
        <span className="chat-league-name">{league.name}</span>
      </div>

      <div className="chat-messages-container">
        {messages.length === 0 && (
          <div className="empty-state chat-empty">
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.username === username;
          const showName = i === 0 || messages[i - 1].username !== msg.username;
          return (
            <div key={msg.id} className={`chat-message-row ${isMe ? 'chat-message-mine' : ''}`}>
              {!isMe && showName && (
                <div className="chat-username">{msg.username}</div>
              )}
              <div className={`chat-bubble ${isMe ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
                <span className="chat-content">{msg.content}</span>
                <span className="chat-time">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <div className="error-text" style={{ padding: '4px 12px', fontSize: '0.82rem' }}>{error}</div>}

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={500}
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="submit"
          className="neon-button chat-send-btn"
          disabled={sending || !input.trim()}
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
