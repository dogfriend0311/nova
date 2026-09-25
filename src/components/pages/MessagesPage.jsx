import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, ArrowLeft, X, Paperclip } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkRateLimit, recordAction } from '../../services/rateLimiter';
import messagingService from '../../services/messagingService';
import { awardBadge } from '../../services/achievementsService';
import db from '../../services/db';
import ConversationSidebar from '../messages/ConversationSidebar';
import MessageBubble from '../messages/MessageBubble';
import MiniProfilePopover from '../messages/MiniProfilePopover';
import GifPicker from '../messages/GifPicker';
import VoiceRecorderButton from '../messages/VoiceRecorderButton';
import { uploadToBlob } from '../../services/blobUpload';
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
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [otherOnline, setOtherOnline] = useState(null); // null = unknown, true/false — DMs only
  const [typingUsers, setTypingUsers] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const messageRefs = useRef({});

  const loadConversations = useCallback(() => {
    if (!user) return Promise.resolve([]);
    return messagingService.getConversations(user.username).then(list => { setConversations(list); return list; });
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Streak badges — checked opportunistically whenever the conversation
  // list refreshes, same "recheck on load, idempotent" pattern the rest of
  // the app uses for badges (e.g. syncBadges on profile load).
  useEffect(() => {
    if (!user || !conversations) return;
    const best = Math.max(0, ...conversations.filter(c => c.type === 'dm').map(c => c.streak?.count || 0));
    if (best >= 7) awardBadge(user.username, 'streak_7');
    if (best >= 30) awardBadge(user.username, 'streak_30');
  }, [conversations, user]);

  // Keep the open thread's streak fresh as the conversation list re-polls,
  // without touching any of the thread's other (poll-independent) state.
  // Reads the current `active` via the setState updater (prev) rather than
  // from the outer closure, so the effect only needs `conversations` as a
  // dependency — avoids a stale closure without pulling `active` in and
  // re-running this on every unrelated active-thread change.
  useEffect(() => {
    if (!conversations) return;
    setActive((prev) => {
      if (!prev || prev.type !== 'dm') return prev;
      const fresh = conversations.find(c => c.conversation_id === prev.conversation_id);
      if (fresh?.streak && fresh.streak.count !== prev.streak?.count) {
        return { ...prev, streak: fresh.streak };
      }
      return prev;
    });
  }, [conversations]);

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
    messagingService.getPinnedMessages(active.conversation_id).then(setPinnedMessages);
    messagingService.markConversationRead(user.username, active.conversation_id).then(loadConversations);
  }, [active, user, loadConversations]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Reset pinned-panel UI state when switching threads.
  useEffect(() => { setPinnedOpen(false); messageRefs.current = {}; }, [active?.conversation_id]);

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

  // Online presence for the DM's other member — reuses the same cross-device
  // last_seen heartbeat (db.updateLastSeen, already running app-wide from
  // AuthContext) that already powers the "online" dot on member profiles.
  useEffect(() => {
    if (!active || active.type !== 'dm') { setOtherOnline(null); return; }
    let cancelled = false;
    const check = () => {
      db.getOnlineUsers().then((online) => {
        if (!cancelled) setOtherOnline(online.includes(active.other_username));
      }).catch(() => { if (!cancelled) setOtherOnline(null); });
    };
    check();
    const id = setInterval(check, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [active]);

  // Typing indicator — polled, matching the rest of the app's realtime
  // approach. 3s is faster than the 8s message poll since "is typing"
  // needs to feel responsive; the query itself is a single small table.
  useEffect(() => {
    if (!active || !user) { setTypingUsers([]); return; }
    let cancelled = false;
    const poll = () => {
      messagingService.getTypingUsers(active.conversation_id, user.username)
        .then((list) => { if (!cancelled) setTypingUsers(list); })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); setTypingUsers([]); };
  }, [active, user]);

  // Throttled so every keystroke doesn't fire a request — one write per
  // ~2.5s while actively typing is plenty to keep the indicator alive
  // against the 6s freshness window in messagingService.
  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (!active || !user || !value.trim()) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      lastTypingSentRef.current = now;
      messagingService.setTyping(active.conversation_id, user.username);
    }
  };

  const typingLabel = (() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing…`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing…`;
    return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing…`;
  })();

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
      messagingService.clearTyping(active.conversation_id, user.username);
      loadMessages();
    } catch (err) {
      setLimitMsg(`Couldn't send — ${err?.message || 'unexpected error'}.`);
    } finally {
      setSending(false);
    }
  };

  const sendGif = async (gif) => {
    if (!active) return;
    setGifPickerOpen(false);
    const verdict = checkRateLimit('dm', user.username);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    try {
      const saved = await messagingService.sendMessage({
        from: user.username,
        toUsername: active.type === 'dm' ? active.other_username : null,
        groupId: active.type === 'group' ? active.group_id : null,
        content: gif.description || 'GIF',
        messageType: 'gif',
        payload: { url: gif.url, width: gif.width, height: gif.height },
        replyToId: replyTo ? replyTo.id : null,
      });
      if (saved.__failed) { setLimitMsg(`Couldn't send — ${saved.__error || 'server error'}.`); return; }
      recordAction('dm', user.username);
      setReplyTo(null);
      loadMessages();
    } catch (err) {
      setLimitMsg(`Couldn't send — ${err?.message || 'unexpected error'}.`);
    }
  };

  const sendVoice = async ({ blob, durationMs, peaks }) => {
    if (!active) return;
    const verdict = checkRateLimit('dm', user.username);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
      const path = `voice/${user.username}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const url = await uploadToBlob(file, path);
      const saved = await messagingService.sendMessage({
        from: user.username,
        toUsername: active.type === 'dm' ? active.other_username : null,
        groupId: active.type === 'group' ? active.group_id : null,
        content: 'Voice message',
        messageType: 'voice',
        payload: { url, duration_ms: durationMs, peaks },
        replyToId: replyTo ? replyTo.id : null,
      });
      if (saved.__failed) { setLimitMsg(`Couldn't send — ${saved.__error || 'server error'}.`); return; }
      recordAction('dm', user.username);
      setReplyTo(null);
      loadMessages();
    } catch (err) {
      setLimitMsg(`Couldn't send voice message — ${err?.message || 'unexpected error'}.`);
    }
  };

  const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50MB

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !active) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setLimitMsg("Couldn't attach — that file is over the 50MB limit.");
      return;
    }
    const verdict = checkRateLimit('dm', user.username);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    setAttaching(true);
    try {
      const messageType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${messageType}/${user.username}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const url = await uploadToBlob(file, path);
      const saved = await messagingService.sendMessage({
        from: user.username,
        toUsername: active.type === 'dm' ? active.other_username : null,
        groupId: active.type === 'group' ? active.group_id : null,
        content: file.name,
        messageType,
        payload: { url, name: file.name, size: file.size },
        replyToId: replyTo ? replyTo.id : null,
      });
      if (saved.__failed) { setLimitMsg(`Couldn't send — ${saved.__error || 'server error'}.`); return; }
      recordAction('dm', user.username);
      setReplyTo(null);
      loadMessages();
    } catch (err) {
      setLimitMsg(`Couldn't attach — ${err?.message || 'unexpected error'}.`);
    } finally {
      setAttaching(false);
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
  const handleTogglePin = async (messageId) => {
    if (!user || !active) return;
    const result = await messagingService.togglePinMessage(active.conversation_id, messageId, user.username);
    if (!result.ok) { setLimitMsg(`Couldn't update pin — ${result.error || 'server error'}.`); return; }
    loadMessages();
  };
  const scrollToMessage = (messageId) => {
    setPinnedOpen(false);
    messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const openSharedObject = (payload) => { if (payload.link) window.location.hash = payload.link; };
  const openProfile = (username) => { window.location.hash = `#members/${username}`; };

  const handleBlocked = async (username) => {
    await messagingService.blockUser(user.username, username);
    setProfilePopover(null);
    setActive(null);
    loadConversations();
  };

  // Reporting doesn't block/hide anything client-side — it's a distinct
  // action from Block, just logging the complaint for staff to review.
  // The popover shows its own "Reported" confirmation, so there's nothing
  // else to do here besides letting the member keep browsing the thread.
  const handleReported = () => {};

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
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ color: '#e2e5f0' }}>{active.other_username}</strong>
                        {active.streak?.count > 0 && (
                          <span
                            title={active.streak.activeToday ? 'Streak active today' : 'Message today to keep it going'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.68rem', fontWeight: 700,
                              padding: '1px 6px', borderRadius: 999, background: 'rgba(255,107,74,0.12)',
                              color: '#ff6b4a', opacity: active.streak.activeToday ? 1 : 0.6,
                            }}
                          >🔥{active.streak.count}</span>
                        )}
                      </span>
                      {typingLabel ? (
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-cyan, #5e81f4)', fontStyle: 'italic' }}>{typingLabel}</span>
                      ) : otherOnline !== null ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: otherOnline ? '#43b581' : 'rgba(158,165,196,0.45)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: otherOnline ? '#43b581' : 'rgba(158,165,196,0.35)', boxShadow: otherOnline ? '0 0 4px #43b581' : 'none' }} />
                          {otherOnline ? 'Online' : 'Offline'}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : (
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ color: '#e2e5f0' }}>{active.emoji} {active.title}</strong>
                    {typingLabel && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-cyan, #5e81f4)', fontStyle: 'italic' }}>{typingLabel}</span>
                    )}
                  </span>
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
                      onReported={handleReported}
                    />
                  </div>
                )}
              </div>

              {pinnedMessages.length > 0 && (
                <div style={{ borderBottom: '1px solid rgba(94,129,244,0.12)', background: 'rgba(255,215,0,0.04)' }}>
                  <button
                    onClick={() => setPinnedOpen(!pinnedOpen)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.76rem', color: '#ffd700', fontWeight: 700,
                    }}
                  >
                    📌 PINNED ({pinnedMessages.length})
                    <span style={{ marginLeft: 'auto', color: 'rgba(158,165,196,0.5)', fontWeight: 400 }}>{pinnedOpen ? 'Hide' : 'Show'}</span>
                  </button>
                  {pinnedOpen && (
                    <div style={{ maxHeight: 180, overflowY: 'auto', padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pinnedMessages.map((p) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                          <button
                            onClick={() => scrollToMessage(p.message_id)}
                            style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <span style={{ color: 'var(--color-cyan, #5e81f4)', fontWeight: 700, fontSize: '0.76rem' }}>{p.message.from_username}: </span>
                            <span style={{ color: '#c9cee0', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.message.message_type === 'text' ? p.message.content : `📎 ${p.message.message_type}`}
                            </span>
                          </button>
                          <button
                            title="Unpin" onClick={() => handleTogglePin(p.message_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(158,165,196,0.5)', flexShrink: 0 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const sameSenderAsPrev = prev && prev.from_username === m.from_username && !prev.deleted_at;
                  const closeInTime = prev && (new Date(m.created_at) - new Date(prev.created_at)) < GROUP_GAP_MS;
                  const grouped = sameSenderAsPrev && closeInTime;

                  const next = messages[i + 1];
                  const nextGrouped = next && next.from_username === m.from_username && !m.deleted_at && (new Date(next.created_at) - new Date(m.created_at)) < GROUP_GAP_MS;

                  return (
                    <div key={m.id} ref={(el) => { messageRefs.current[m.id] = el; }} style={{ marginTop: grouped ? 2 : 14 }}>
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
                        onTogglePin={handleTogglePin}
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
                <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  {!voiceRecording && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelected}
                        style={{ display: 'none' }}
                      />
                      <button
                        title="Attach an image, video, or file"
                        disabled={attaching}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0,
                          borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)',
                          cursor: 'pointer', color: 'rgba(158,165,196,0.8)', opacity: attaching ? 0.5 : 1,
                        }}
                      >
                        <Paperclip size={15} />
                      </button>
                    </>
                  )}
                  {!voiceRecording && (
                    <button
                      title="Send a GIF"
                      onClick={() => setGifPickerOpen(o => !o)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0,
                        borderRadius: 8, background: gifPickerOpen ? 'rgba(94,129,244,0.2)' : 'rgba(94,129,244,0.06)',
                        border: '1px solid rgba(94,129,244,0.2)', cursor: 'pointer', color: 'rgba(158,165,196,0.8)',
                        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.02em',
                      }}
                    >
                      GIF
                    </button>
                  )}
                  {gifPickerOpen && <GifPicker onSelect={sendGif} onClose={() => setGifPickerOpen(false)} />}

                  <VoiceRecorderButton onSend={sendVoice} onRecordingChange={setVoiceRecording} disabled={sending} />

                  {!voiceRecording && (
                    <>
                      <input
                        value={text}
                        onChange={(e) => handleTextChange(e)}
                        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                        placeholder="Type a message…"
                        style={{ flex: 1, padding: '9px 12px', borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', fontSize: '0.86rem' }}
                      />
                      <button className="neon-button" disabled={sending || !text.trim()} onClick={send} style={{ padding: '9px 14px', opacity: (!text.trim() || sending) ? 0.5 : 1 }}>
                        <Send size={16} />
                      </button>
                    </>
                  )}
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
