import React, { useState } from 'react';
import { Reply, Smile, Copy, Pencil, Trash2 } from 'lucide-react';
import SharedObjectCard from './SharedObjectCard';
import messagingService from '../../services/messagingService';

const EMOJI_SHORTCODES = {
  ':fire:': '🔥', ':joy:': '😂', ':heart:': '❤️', ':skull:': '💀',
  ':thumbsup:': '👍', ':thumbsdown:': '👎', ':baseball:': '⚾', ':100:': '💯',
};

const renderContent = (content) => {
  if (!content) return null;
  let text = content;
  Object.entries(EMOJI_SHORTCODES).forEach(([code, emoji]) => {
    text = text.split(code).join(emoji);
  });
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) => (
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: 'var(--color-cyan, #5e81f4)', wordBreak: 'break-all' }}>{part}</a>
      : <React.Fragment key={i}>{part}</React.Fragment>
  ));
};

const timeLabel = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const MessageBubble = ({
  message, isOwn, showSender, showTimestamp, currentUsername,
  onReply, onReact, onEdit, onDelete, onOpenSharedObject, onOpenProfile,
}) => {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  if (message.deleted_at) {
    return (
      <div style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '72%', padding: '6px 12px', fontStyle: 'italic', color: 'rgba(158,165,196,0.35)', fontSize: '0.8rem' }}>
        Message deleted
      </div>
    );
  }

  const submitEdit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) await onEdit(message.id, trimmed);
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '76%' }}>
      {showSender && !isOwn && (
        <button
          onClick={() => onOpenProfile(message.from_username)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 2, alignSelf: 'flex-start' }}
        >
          <span style={{ color: 'var(--color-cyan, #5e81f4)', fontSize: '0.72rem', fontWeight: 700 }}>{message.from_username}</span>
        </button>
      )}

      {message.reply_to && (
        <div style={{
          fontSize: '0.72rem', color: 'rgba(158,165,196,0.5)', padding: '4px 10px', marginBottom: 2,
          borderLeft: '2px solid rgba(94,129,244,0.3)', background: 'rgba(94,129,244,0.04)', borderRadius: '6px 6px 0 0',
        }}>
          Replying to <strong>{message.reply_to.from_username}</strong>: {(message.reply_to.content || '').slice(0, 60)}
        </div>
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPickerOpen(false); }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {isOwn && hovered && !editing && (
          <BubbleActions
            isOwn message={message} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen}
            onReply={onReply} onReact={onReact} onEdit={() => setEditing(true)} onDelete={onDelete}
          />
        )}

        <div style={{
          padding: message.message_type === 'shared_object' ? 6 : '8px 12px',
          borderRadius: 14,
          background: isOwn ? 'rgba(94,129,244,0.2)' : 'rgba(94,129,244,0.06)',
          border: '1px solid rgba(94,129,244,0.15)',
          minWidth: message.message_type === 'shared_object' ? 220 : 'auto',
        }}>
          {message.message_type === 'shared_object' ? (
            <SharedObjectCard payload={message.payload} onOpen={onOpenSharedObject} />
          ) : editing ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') setEditing(false); }}
                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(94,129,244,0.3)', borderRadius: 6, color: '#e2e5f0', fontSize: '0.85rem', padding: '4px 8px' }}
              />
              <button onClick={submitEdit} style={{ fontSize: '0.72rem', color: 'var(--color-cyan, #5e81f4)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
            </div>
          ) : (
            <div style={{ color: '#e2e5f0', fontSize: '0.86rem', wordBreak: 'break-word' }}>
              {renderContent(message.content)}
              {message.edited_at && <span style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.65rem', marginLeft: 6 }}>(edited)</span>}
            </div>
          )}
        </div>

        {!isOwn && hovered && !editing && (
          <BubbleActions
            isOwn={false} message={message} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen}
            onReply={onReply} onReact={onReact}
          />
        )}
      </div>

      {message.reactions?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {message.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(message.id, r.emoji)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', padding: '2px 7px', borderRadius: 999, cursor: 'pointer',
                background: r.usernames.includes(currentUsername) ? 'rgba(94,129,244,0.2)' : 'rgba(94,129,244,0.06)',
                border: '1px solid rgba(94,129,244,0.2)', color: '#c9cee0',
              }}
            >
              <span>{r.emoji}</span><span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {showTimestamp && (
        <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.65rem', marginTop: 3, alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
          {timeLabel(message.created_at)}
        </span>
      )}
    </div>
  );
};

const BubbleActions = ({ isOwn, message, pickerOpen, setPickerOpen, onReply, onReact, onEdit, onDelete }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
    <IconBtn title="Reply" onClick={() => onReply(message)}><Reply size={13} /></IconBtn>
    <IconBtn title="React" onClick={() => setPickerOpen(!pickerOpen)}><Smile size={13} /></IconBtn>
    <IconBtn title="Copy" onClick={() => navigator.clipboard?.writeText(message.content || '')}><Copy size={13} /></IconBtn>
    {isOwn && message.message_type !== 'shared_object' && <IconBtn title="Edit" onClick={onEdit}><Pencil size={13} /></IconBtn>}
    {isOwn && <IconBtn title="Delete" onClick={() => onDelete(message.id)}><Trash2 size={13} /></IconBtn>}

    {pickerOpen && (
      <div style={{
        position: 'absolute', bottom: '110%', [isOwn ? 'right' : 'left']: 0, display: 'flex', gap: 4,
        background: 'var(--color-bg-light, #131729)', border: '1px solid rgba(94,129,244,0.25)', borderRadius: 10, padding: 6, zIndex: 10,
      }}>
        {messagingService.REACTION_SET.map(e => (
          <button key={e} onClick={() => { onReact(message.id, e); setPickerOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>{e}</button>
        ))}
      </div>
    )}
  </div>
);

const IconBtn = ({ children, title, onClick }) => (
  <button
    title={title} onClick={onClick}
    style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(19,23,41,0.7)', border: '1px solid rgba(94,129,244,0.2)', borderRadius: 6, cursor: 'pointer', color: 'rgba(158,165,196,0.7)' }}
  >{children}</button>
);

export default MessageBubble;
