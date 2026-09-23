import React, { useState } from 'react';
import { Reply, Smile, Copy, Pencil, Trash2, FileText, Download } from 'lucide-react';
import SharedObjectCard from './SharedObjectCard';
import VoiceMessagePlayer from './VoiceMessagePlayer';
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

const formatBytes = (bytes) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

// Full-screen viewer opened by tapping an image attachment.
const ImageLightbox = ({ url, alt, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(6,8,16,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 24,
    }}
  >
    <img src={url} alt={alt || ''} style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
    <button
      onClick={onClose}
      style={{
        position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.08)', border: 'none',
        color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem',
      }}
    >×</button>
  </div>
);

const MessageBubble = ({
  message, isOwn, showSender, showTimestamp, currentUsername,
  onReply, onReact, onEdit, onDelete, onOpenSharedObject, onOpenProfile,
}) => {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
          padding: ['shared_object', 'gif', 'voice', 'image', 'video'].includes(message.message_type) ? 4 : (message.message_type === 'file' ? 8 : '8px 12px'),
          borderRadius: 14,
          background: isOwn ? 'rgba(94,129,244,0.2)' : 'rgba(94,129,244,0.06)',
          border: '1px solid rgba(94,129,244,0.15)',
          minWidth: (message.message_type === 'shared_object' || message.message_type === 'file') ? 220 : 'auto',
        }}>
          {message.message_type === 'shared_object' ? (
            <SharedObjectCard payload={message.payload} onOpen={onOpenSharedObject} />
          ) : message.message_type === 'gif' ? (
            <img
              src={message.payload?.url}
              alt={message.content || 'GIF'}
              style={{ display: 'block', maxWidth: 220, maxHeight: 220, borderRadius: 10 }}
            />
          ) : message.message_type === 'image' ? (
            <>
              <img
                src={message.payload?.url}
                alt={message.content || 'Image'}
                onClick={() => setLightboxOpen(true)}
                style={{ display: 'block', maxWidth: 240, maxHeight: 300, borderRadius: 10, cursor: 'zoom-in' }}
              />
              {lightboxOpen && (
                <ImageLightbox url={message.payload?.url} alt={message.content} onClose={() => setLightboxOpen(false)} />
              )}
            </>
          ) : message.message_type === 'video' ? (
            <video src={message.payload?.url} controls style={{ display: 'block', maxWidth: 260, maxHeight: 300, borderRadius: 10 }} />
          ) : message.message_type === 'file' ? (
            <a
              href={message.payload?.url} target="_blank" rel="noreferrer" download={message.payload?.name}
              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={17} color="var(--color-cyan, #5e81f4)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {message.payload?.name || 'File'}
                </div>
                {message.payload?.size ? (
                  <div style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.7rem' }}>{formatBytes(message.payload.size)}</div>
                ) : null}
              </div>
              <Download size={15} color="rgba(158,165,196,0.5)" style={{ flexShrink: 0 }} />
            </a>
          ) : message.message_type === 'voice' ? (
            <VoiceMessagePlayer payload={message.payload} />
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

const BubbleActions = ({ isOwn, message, pickerOpen, setPickerOpen, onReply, onReact, onEdit, onDelete }) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');

  const submitCustom = (e) => {
    e.preventDefault();
    const val = customEmoji.trim();
    if (!val) return;
    onReact(message.id, val);
    setCustomEmoji(''); setCustomOpen(false); setPickerOpen(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
      <IconBtn title="Reply" onClick={() => onReply(message)}><Reply size={13} /></IconBtn>
      <IconBtn title="React" onClick={() => setPickerOpen(!pickerOpen)}><Smile size={13} /></IconBtn>
      <IconBtn title="Copy" onClick={() => navigator.clipboard?.writeText(message.content || '')}><Copy size={13} /></IconBtn>
      {isOwn && message.message_type === 'text' && <IconBtn title="Edit" onClick={onEdit}><Pencil size={13} /></IconBtn>}
      {isOwn && <IconBtn title="Delete" onClick={() => onDelete(message.id)}><Trash2 size={13} /></IconBtn>}

      {pickerOpen && (
        <div style={{
          position: 'absolute', bottom: '110%', [isOwn ? 'right' : 'left']: 0, zIndex: 10,
          background: 'var(--color-bg-light, #131729)', border: '1px solid rgba(94,129,244,0.25)', borderRadius: 10, padding: 6,
          display: 'flex', flexDirection: 'column', gap: 6, width: customOpen ? 170 : 'auto',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {messagingService.REACTION_SET.map(e => (
              <button key={e} onClick={() => { onReact(message.id, e); setPickerOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>{e}</button>
            ))}
            <button
              title="Other emoji" onClick={() => setCustomOpen(!customOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', color: 'rgba(158,165,196,0.6)' }}
            >+</button>
          </div>
          {customOpen && (
            <form onSubmit={submitCustom} style={{ display: 'flex', gap: 4 }}>
              <input
                autoFocus
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Paste any emoji…"
                style={{ flex: 1, minWidth: 0, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(94,129,244,0.3)', borderRadius: 6, color: '#e2e5f0', fontSize: '0.9rem', padding: '3px 6px' }}
              />
              <button type="submit" style={{ fontSize: '0.7rem', color: 'var(--color-cyan, #5e81f4)', background: 'none', border: 'none', cursor: 'pointer' }}>Add</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

const IconBtn = ({ children, title, onClick }) => (
  <button
    title={title} onClick={onClick}
    style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(19,23,41,0.7)', border: '1px solid rgba(94,129,244,0.2)', borderRadius: 6, cursor: 'pointer', color: 'rgba(158,165,196,0.7)' }}
  >{children}</button>
);

export default MessageBubble;
