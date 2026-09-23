import React from 'react';
import { ChevronRight } from 'lucide-react';

// payload shape (see messagingService.shareObject):
// { object_type, title, subtitle, meta, image_url, link }
const SharedObjectCard = ({ payload, onOpen }) => {
  if (!payload) return null;
  const { object_type, title, subtitle, meta, image_url } = payload;

  return (
    <button
      onClick={() => onOpen && onOpen(payload)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        padding: 10, borderRadius: 12, cursor: 'pointer',
        background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)',
      }}
    >
      {image_url ? (
        <img src={image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: 'rgba(94,129,244,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
        }}>🪐</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-cyan, #5e81f4)', fontWeight: 700 }}>
          {object_type}
        </div>
        <div style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle && <div style={{ color: 'rgba(158,165,196,0.7)', fontSize: '0.76rem' }}>{subtitle}</div>}
        {meta && <div style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.7rem', marginTop: 2 }}>{meta}</div>}
      </div>
      <ChevronRight size={16} color="rgba(158,165,196,0.4)" style={{ flexShrink: 0 }} />
    </button>
  );
};

export default SharedObjectCard;
