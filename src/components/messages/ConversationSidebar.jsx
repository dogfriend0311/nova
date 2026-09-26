import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import messagingService from '../../services/messagingService';

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups' },
  { id: 'requests', label: 'Requests' },
];

const ConversationSidebar = ({ conversations, activeId, onSelect, currentUsername, onStartDm, onCreateGroup }) => {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');

  const filtered = messagingService.searchConversations(
    conversations.filter(c => {
      if (tab === 'unread') return c.unread;
      if (tab === 'groups') return c.type === 'group';
      if (tab === 'requests') return c.is_request;
      return !c.is_request; // All = accepted conversations
    }),
    query,
  );

  const submitDm = (e) => {
    e.preventDefault();
    const target = dmTarget.trim();
    if (!target) return;
    onStartDm(target);
    setDmTarget(''); setNewOpen(false);
  };

  const submitGroup = (e) => {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    const members = groupMembers.split(',').map(m => m.trim()).filter(Boolean);
    onCreateGroup(name, members);
    setGroupName(''); setGroupMembers(''); setNewOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <strong style={{ color: '#e2e5f0', fontSize: '0.95rem' }}>Messages</strong>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNewOpen(!newOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: 'var(--color-cyan, #5e81f4)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> New
          </button>
          {newOpen && (
            <div style={{
              position: 'absolute', top: '120%', right: 0, width: 220, zIndex: 20, padding: 12, borderRadius: 12,
              background: 'var(--color-bg-light, #131729)', border: '1px solid rgba(94,129,244,0.25)', boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>New message</span>
                <button onClick={() => setNewOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="rgba(158,165,196,0.5)" /></button>
              </div>
              <form onSubmit={submitDm} style={{ marginBottom: 12 }}>
                <input
                  value={dmTarget} onChange={(e) => setDmTarget(e.target.value)} placeholder="Username…"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', fontSize: '0.78rem', marginBottom: 6 }}
                />
                <button type="submit" className="neon-button" style={{ width: '100%', fontSize: '0.74rem', padding: '5px 0' }}>Start chat</button>
              </form>
              <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>New group</span>
              <form onSubmit={submitGroup} style={{ marginTop: 6 }}>
                <input
                  value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name…"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', fontSize: '0.78rem', marginBottom: 6 }}
                />
                <input
                  value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} placeholder="usernames, comma separated"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', fontSize: '0.78rem', marginBottom: 6 }}
                />
                <button type="submit" className="neon-button" style={{ width: '100%', fontSize: '0.74rem', padding: '5px 0' }}>Create group</button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.15)' }}>
          <Search size={13} color="rgba(158,165,196,0.5)" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e5f0', fontSize: '0.78rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 14px 10px', borderBottom: '1px solid rgba(94,129,244,0.1)' }}>
        {TABS.map(t => {
          const count = t.id === 'unread' ? conversations.filter(c => c.unread).length
            : t.id === 'requests' ? conversations.filter(c => c.is_request).length : null;
          return (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', padding: '5px 9px', borderRadius: 999, cursor: 'pointer',
                background: tab === t.id ? 'rgba(94,129,244,0.18)' : 'none',
                border: tab === t.id ? '1px solid rgba(94,129,244,0.3)' : '1px solid transparent',
                color: tab === t.id ? '#e2e5f0' : 'rgba(158,165,196,0.55)', fontWeight: tab === t.id ? 700 : 500,
              }}
            >
              {t.label}{!!count && <span style={{ color: 'var(--color-magenta, #ff9e57)' }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>
            {tab === 'requests' ? 'No message requests.' : 'No conversations yet.'}
          </div>
        ) : filtered.map(c => (
          <button
            key={c.conversation_id}
            onClick={() => onSelect(c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', width: '100%',
              background: activeId === c.conversation_id ? 'rgba(94,129,244,0.1)' : 'none',
              border: 'none', borderBottom: '1px solid rgba(94,129,244,0.06)', textAlign: 'left', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: 'var(--color-cyan, #5e81f4)', fontSize: c.type === 'group' ? '1rem' : '0.85rem',
            }}>
              {c.type !== 'group' && c.avatar_url
                ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (c.type === 'group' ? c.emoji : c.title.charAt(0).toUpperCase())}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontWeight: c.unread ? 800 : 600, color: '#e2e5f0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  {c.streak?.count > 0 && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ff6b4a', flexShrink: 0, opacity: c.streak.activeToday ? 1 : 0.55 }}>
                      🔥{c.streak.count}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.4)', flexShrink: 0 }}>{timeAgo(c.last_at)}</span>
              </div>
              <div style={{
                fontSize: '0.76rem', color: c.unread ? '#c9cee0' : 'rgba(158,165,196,0.45)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{c.muted ? '🔕 ' : ''}{c.last_message}</div>
            </div>
            {c.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-magenta, #ff9e57)', flexShrink: 0 }} />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConversationSidebar;
