import React, { useEffect, useState } from 'react';
import { Share2, Search, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import messagingService from '../../services/messagingService';

// Drop this on any page that represents a shareable Nova object:
//   <ShareToMessagesButton object={{
//     objectType: 'Player',           // Player | Game Result | Team | League | Article | Clip | Award | Post
//     title: player.name,
//     subtitle: `.${battingAvg} / ${hr} HR / ${rbi} RBI`,
//     meta: player.team_name,
//     imageUrl: player.headshot_url,  // optional
//     link: `#player/${player.id}`,   // used by MessagesPage to deep-link on click
//   }} />
const ShareToMessagesButton = ({ object, label = 'Share' }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [sentTo, setSentTo] = useState(null);

  useEffect(() => {
    if (!open || !user) return;
    messagingService.getConversations(user.username).then(cs => setConversations(cs.filter(c => !c.is_request)));
  }, [open, user]);

  if (!user) return null;

  const send = async (target) => {
    if (target.type === 'group') {
      await messagingService.shareObject({ from: user.username, groupId: target.group_id, objectType: object.objectType, title: object.title, subtitle: object.subtitle, meta: object.meta, imageUrl: object.imageUrl, link: object.link });
    } else {
      await messagingService.shareObject({ from: user.username, toUsername: target.other_username, objectType: object.objectType, title: object.title, subtitle: object.subtitle, meta: object.meta, imageUrl: object.imageUrl, link: object.link });
    }
    setSentTo(target.title);
    setTimeout(() => { setOpen(false); setSentTo(null); }, 900);
  };

  const filtered = messagingService.searchConversations(conversations, query);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
          background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.2)', color: '#c9cee0',
          fontSize: '0.8rem', cursor: 'pointer',
        }}
      >
        <Share2 size={14} /> {label}
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,7,13,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 340, maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-light, #131729)', border: '1px solid rgba(94,129,244,0.2)', borderRadius: 14, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(94,129,244,0.12)' }}>
              <strong style={{ color: '#e2e5f0', fontSize: '0.9rem' }}>Share to Messages</strong>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={16} color="rgba(158,165,196,0.6)" />
              </button>
            </div>

            <div style={{ padding: 10, borderBottom: '1px solid rgba(94,129,244,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.15)' }}>
                <Search size={14} color="rgba(158,165,196,0.5)" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e5f0', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem' }}>No conversations yet.</div>
              ) : filtered.map(c => (
                <button
                  key={c.conversation_id}
                  onClick={() => send(c)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid rgba(94,129,244,0.06)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--color-cyan, #5e81f4)', fontSize: '0.8rem', flexShrink: 0 }}>
                    {c.type === 'group' ? c.emoji : c.title.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, color: '#e2e5f0', fontSize: '0.84rem' }}>{c.title}</span>
                  {sentTo === c.title && <Check size={16} color="var(--color-cyan, #5e81f4)" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareToMessagesButton;
