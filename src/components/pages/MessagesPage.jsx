import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkRateLimit, recordAction } from '../../services/rateLimiter';
import messagingService from '../../services/messagingService';
import ConversationSidebar from '../messages/ConversationSidebar';
import MessageBubble from '../messages/MessageBubble';
import MiniProfilePopover from '../messages/MiniProfilePopover';
import './Pages.css';

const GROUP_GAP_MS = 5 * 60 * 1000; // consecutive messages within 5 min from the same sender are grouped

const MessagesPage = ({ initialUsername, onSignIn }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState(null);
  const [active, setActive] = useState(null); // { conversation_id, type, other_username?, group_id?, title, ... }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [limitMsg, setLimitMsg] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [profilePopover, setProfilePopover] = useState(null); // username being viewed
  const bottomRef = useRef(null);

  const loadConversations = useCallback(() => {
    if (!user) return Promise.resolve([]);
    return messagingService.getConversations(user.username).then(list => { setConversations(list); return list; });
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Deep-link from e.g. a member profile's "Message" button (#messages/username)
  useEffect(() => {
    if (!user || !initialUsername || conversations === null) return;
    const existing = conversations.find(c => c.type === 'dm' && c.other_username === initialUsername);
    setActive(existing || {
      conversation_id: messagingService.dmConversationId(user.username, initialUsername),
      type: 'dm', other_username: initialUsername, title: initialUsername,
    });
  }, [initialUsername, conversations, user]);

  const loadMessages = useCallback(() => {
    if (!user || !active) return;
    messagingService.getMessages(active.conversation_id).then(setMessages);
    messagingService.markConversationRead(user.username, active.conversation_id).then(loadConversations);
  }, [active, user, loadConversations]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Lightweight polling — matches the rest of the app's "realtime via polling" approach
  useEffect(() => {
    if (!active) return;
    const id = setInterval(loadMessages, 8000);
    return () => clearInterval(id);
  }, [active, loadMessages]);

  useEffect(() => {
    const id = setInterval(loadConversations, 15000);
    return () => clearInterval(id);
  }, [loadConversations]);

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
    try {
      const saved = await messagingService.sendMessage({
        from: user.username,
        toUsername: active.type === 'dm' ? active.other_username : null,
        groupId: active.type === 'group' ? active.group_id : null,
        content,
        replyToId: replyTo ? replyTo.id : null,
      });
      if (saved.__failed) {
        setLimitMsg(`Couldn't send — ${saved.__error || 'server error'}. Your message wasn't cleared, try again.`);
        return; // keep the text so nothing gets lost
      }
      recordAction('dm', user.username);
      setText('');
      setReplyTo(null);
      loadMessages();
    } catch (err) {
      setLimitMsg(`Couldn't send — ${err?.message || 'unexpected error'}.`);
    } finally {
      setSending(false);
    }
  };

  const openThread = (convo) => {
    setActive(convo);
    setReplyTo(null);
    window.location.hash = convo.type === 'dm' ? `#messages/${convo.other_username}` : '#messages';
  };

  const startDm = (username) => {
    if (username === user.username) return;
    openThread({
      conversation_id: messagingService.dmConversationId(user.username, username),
      type: 'dm', other_username: username, title: username,
    });
  };

  const createGroup = async (name, members) => {
    const group = await messagingService.createGroup({ name, createdBy: user.username, memberUsernames: members });
    if (!group) return;
    await loadConversations();
    openThread({ conversation_id: messagingService.groupConversationId(group.id), type: 'group', group_id: group.id, title: group.name, emoji: group.emoji });
  };

  const handleReact = async (messageId, emoji) => {
    const result = await messagingService.toggleReaction(messageId, user.username, emoji);
    if (!result.ok) { setLimitMsg(`Couldn't react — ${result.error || 'server error'}.`); return; }
    loadMessages();
  };
  const handleEdit = async (messageId, content) => { await messagingService.editMessage(messageId, content); loadMessages(); };
  const handleDelete = async (messageId) => { await messagingService.deleteMessage(messageId); loadMessages(); };
  const openSharedObject = (payload) => { if (payload.link) window.location.hash = payload.link; };
  const openProfile = (username) => { window.location.hash = `#members/${username}`; };

  const handleBlocked = async (username) => {
    await messagingService.blockUser(user.username, username);
    setProfilePopover(null);
    setActive(null);
    loadConversations();
  };

  return (
    <div className="page-container">
      <h1 className="gradient-text" style={{ marginBottom: 16 }}>Messages</h1>
      <div style={{
        display: 'flex', gap: 0, border: '1px solid rgba(94,129,244,0.15)', borderRadius: 14,
        overflow: 'hidden', minHeight: 520, background: 'rgba(19,23,41,0.4)',
      }}>
        <div style={{
          width: active ? 0 : '100%', maxWidth: active ? 0 : 320, flexShrink: 0,
          borderRight: '1px solid rgba(94,129,244,0.12)', overflow: 'hidden',
        }} className="dm-conversation-list">
          {conversations === null ? (
            <div style={{ padding: 20, color: 'rgba(158,165,196,0.4)' }}>Loading…</div>
          ) : (
            <ConversationSidebar
              conversations={conversations}
              activeId={active?.conversation_id}
              onSelect={openThread}
              currentUsername={user.username}
              onStartDm={startDm}
              onCreateGroup={createGroup}
            />
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(158,165,196,0.35)' }}>
              Select a conversation
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(94,129,244,0.12)', position: 'relative' }}>
                <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.6)', cursor: 'pointer', display: 'flex' }}>
                  <ArrowLeft size={18} />
                </button>
                {active.type === 'dm' ? (
                  <button onClick={() => setProfilePopover(profilePopover === active.other_username ? null : active.other_username)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--color-cyan)', fontSize: '0.78rem' }}>
                      {active.other_username.charAt(0).toUpperCase()}
                    </span>
                    <strong style={{ color: '#e2e5f0' }}>{active.other_username}</strong>
                  </button>
                ) : (
                  <strong style={{ color: '#e2e5f0' }}>{active.emoji} {active.title}</strong>
                )}

                {profilePopover && active.type === 'dm' && (
                  <div style={{ position: 'absolute', top: '100%', left: 46, marginTop: 6 }}>
                    <MiniProfilePopover
                      username={profilePopover}
                      currentUsername={user.username}
                      conversationId={active.conversation_id}
                      onClose={() => setProfilePopover(null)}
                      onViewProfile={openProfile}
                      onBlocked={handleBlocked}
                    />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const sameSenderAsPrev = prev && prev.from_username === m.from_username && !prev.deleted_at;
                  const closeInTime = prev && (new Date(m.created_at) - new Date(prev.created_at)) < GROUP_GAP_MS;
                  const grouped = sameSenderAsPrev && closeInTime;

                  const next = messages[i + 1];
                  const nextGrouped = next && next.from_username === m.from_username && !m.deleted_at && (new Date(next.created_at) - new Date(m.created_at)) < GROUP_GAP_MS;

                  return (
                    <div key={m.id} style={{ marginTop: grouped ? 2 : 14 }}>
                      <MessageBubble
                        message={m}
                        isOwn={m.from_username === user.username}
                        showSender={active.type === 'group' && !grouped}
                        showTimestamp={!nextGrouped}
                        currentUsername={user.username}
                        onReply={setReplyTo}
                        onReact={handleReact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onOpenSharedObject={openSharedObject}
                        onOpenProfile={(u) => setProfilePopover(u)}
                      />
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: 12, borderTop: '1px solid rgba(94,129,244,0.12)' }}>
                {replyTo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', marginBottom: 8, borderRadius: 8, background: 'rgba(94,129,244,0.08)' }}>
                    <span style={{ fontSize: '0.76rem', color: 'rgba(158,165,196,0.7)' }}>
                      Replying to <strong style={{ color: '#c9cee0' }}>{replyTo.from_username}</strong>
                    </span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      <X size={13} color="rgba(158,165,196,0.5)" />
                    </button>
                  </div>
                )}
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
