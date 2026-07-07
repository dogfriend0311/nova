import React, { useRef, useState } from 'react';

/* ── Rarity tier system — driven entirely by overall rating ─────────
   Higher overall = more elaborate visual treatment, mirroring how
   trading card games (and this was explicitly modeled after Pokemon
   cards) use rarity tiers: plain common cards up through full holo /
   rainbow foil for the rarest pulls. */
function getTier(overall) {
  const ovr = parseInt(overall) || 0;
  if (ovr >= 95) return 'mythic';
  if (ovr >= 90) return 'legendary';
  if (ovr >= 85) return 'epic';
  if (ovr >= 80) return 'rare';
  if (ovr >= 70) return 'uncommon';
  return 'common';
}

const TIERS = {
  common: {
    label: 'Common',
    border: 'linear-gradient(160deg, #8a8f9e, #5e6580)',
    bg: 'linear-gradient(160deg, #1a1d29, #0d0f17)',
    ring: 'rgba(158,165,196,0.35)',
    glow: 'none',
    nameColor: '#e2e5f0',
    holo: false,
    sparkle: false,
  },
  uncommon: {
    label: 'Uncommon',
    border: 'linear-gradient(160deg, #7af0bd, #33c481)',
    bg: 'linear-gradient(160deg, #0d2818, #081810)',
    ring: 'rgba(94,230,168,0.45)',
    glow: '0 0 24px rgba(94,230,168,0.25)',
    nameColor: '#d4fbe8',
    holo: false,
    sparkle: false,
  },
  rare: {
    label: 'Rare',
    border: 'linear-gradient(160deg, #85a3f7, #3a5bc7)',
    bg: 'linear-gradient(160deg, #0d1530, #080b1c)',
    ring: 'rgba(94,129,244,0.5)',
    glow: '0 0 28px rgba(94,129,244,0.32)',
    nameColor: '#dbe4ff',
    holo: true,
    sparkle: false,
  },
  epic: {
    label: 'Epic',
    border: 'linear-gradient(160deg, #c7a8ff, #6c5ce7)',
    bg: 'linear-gradient(160deg, #1a0f33, #0d081c)',
    ring: 'rgba(167,139,250,0.55)',
    glow: '0 0 32px rgba(167,139,250,0.4)',
    nameColor: '#ecdfff',
    holo: true,
    sparkle: false,
  },
  legendary: {
    label: 'Legendary',
    border: 'linear-gradient(160deg, #ffc78a, #e0a13a)',
    bg: 'linear-gradient(160deg, #33210a, #1c1105)',
    ring: 'rgba(255,158,87,0.6)',
    glow: '0 0 40px rgba(255,158,87,0.48)',
    nameColor: '#ffe8d1',
    holo: true,
    sparkle: true,
  },
  mythic: {
    label: 'Mythic',
    border: 'linear-gradient(115deg, #ff7a9e, #ffc45c, #5ee6a8, #5e81f4, #c7a8ff, #ff7a9e)',
    bg: 'linear-gradient(160deg, #1f0a2e, #0a0512)',
    ring: 'rgba(255,255,255,0.7)',
    glow: '0 0 48px rgba(199,168,255,0.55)',
    nameColor: '#ffffff',
    holo: true,
    sparkle: true,
  },
};

const CARD_W = 340;
const CARD_H = 476;

/* Small inline sparkle icon — SVG, not emoji, so it survives copy/paste
   and canvas export identically on every platform. */
const Sparkle = ({ style }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={style}>
    <path d="M12 1l2.4 7.2L22 11l-7.6 2.8L12 21l-2.4-7.2L2 11l7.6-2.8L12 1z" fill="currentColor" />
  </svg>
);

const PlayerTradingCard = ({ player, displayStats, onClose }) => {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  const tierKey = getTier(player.overall);
  const tier = TIERS[tierKey];
  const name = player.nickname || player.player_name;
  const realName = player.nickname && player.player_name ? player.player_name : null;
  const avatarSrc = player.avatar_data || null;
  const initial = (player.player_name || '?').trim()[0]?.toUpperCase() || '?';

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    setError(false);
    try {
      // Wait for web fonts to be ready so the exported PNG doesn't render
      // with a fallback font while the on-screen version looks correct.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const scale = 2; // export at 2x for a crisp, print-quality PNG
      const node = cardRef.current;
      const htmlString = node.outerHTML.replace(
        '<div',
        '<div xmlns="http://www.w3.org/1999/xhtml"'
      );

      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">
          <foreignObject width="100%" height="100%">
            ${htmlString}
          </foreignObject>
        </svg>
      `;

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = CARD_W * scale;
      canvas.height = CARD_H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) { setError(true); setDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (player.player_name || 'player').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        a.href = url;
        a.download = `nova-${safeName}-card.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, 'image/png');
    } catch (e) {
      setError(true);
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(5,7,13,0.82)', backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '20px', padding: '20px',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        {/* ── The card itself ─────────────────────────────────── */}
        <div
          ref={cardRef}
          style={{
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            borderRadius: '18px',
            padding: '5px',
            background: tier.border,
            boxShadow: tier.glow,
            position: 'relative',
            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          }}
        >
          <div
            style={{
              width: '100%', height: '100%',
              borderRadius: '14px',
              background: tier.bg,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Holo sheen overlay for rare+ tiers */}
            {tier.holo && (
              <div style={{
                position: 'absolute', inset: 0,
                background: tierKey === 'mythic'
                  ? 'linear-gradient(120deg, transparent 20%, rgba(255,122,158,0.18) 35%, rgba(94,230,168,0.18) 45%, rgba(94,129,244,0.18) 55%, rgba(199,168,255,0.18) 65%, transparent 80%)'
                  : 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.14) 47%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.14) 53%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />
            )}

            {/* Sparkle decorations for top tiers */}
            {tier.sparkle && (
              <>
                <Sparkle style={{ position: 'absolute', top: '14px', left: '14px', color: tier.nameColor, opacity: 0.8, zIndex: 3 }} />
                <Sparkle style={{ position: 'absolute', top: '30px', right: '20px', color: tier.nameColor, opacity: 0.5, zIndex: 3, width: 10, height: 10 }} />
                <Sparkle style={{ position: 'absolute', bottom: '86px', left: '24px', color: tier.nameColor, opacity: 0.4, zIndex: 3, width: 11, height: 11 }} />
              </>
            )}

            {/* Header: overall badge + team */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 14px 0', zIndex: 3, position: 'relative' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '10px',
                background: tier.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', flexShrink: 0,
              }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0a0d1a', lineHeight: 1 }}>{player.overall || '\u2014'}</span>
                <span style={{ fontSize: '7px', fontWeight: 700, color: '#0a0d1a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>OVR</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: tier.nameColor, letterSpacing: '0.02em' }}>{player.team || 'Free Agent'}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{player.position || '\u2014'}{player.number ? ` \u00b7 #${player.number}` : ''}</div>
              </div>
            </div>

            {/* Photo */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', zIndex: 3, position: 'relative' }}>
              <div style={{
                width: '150px', height: '150px', borderRadius: '50%',
                border: `3px solid`, borderImage: `${tier.border} 1`,
                boxShadow: `0 0 0 4px ${tier.ring}, 0 8px 24px rgba(0,0,0,0.4)`,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '52px', fontWeight: 800, color: tier.nameColor, opacity: 0.5 }}>{initial}</span>
                }
              </div>
            </div>

            {/* Name block */}
            <div style={{ textAlign: 'center', padding: '10px 12px 0', zIndex: 3, position: 'relative' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: tier.nameColor, letterSpacing: '0.01em', lineHeight: 1.15 }}>
                {name}
              </div>
              {realName && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginTop: '2px' }}>{realName}</div>
              )}
              {player.roblox_username && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>@{player.roblox_username}</div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px',
              padding: '14px 14px 0', zIndex: 3, position: 'relative',
            }}>
              {(displayStats || []).slice(0, 4).map((s) => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '6px 4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 700, color: tier.nameColor }}>{s.value}</div>
                  <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Footer: rarity + branding */}
            <div style={{ marginTop: 'auto', padding: '10px 14px 12px', zIndex: 3, position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: tier.nameColor, marginBottom: '4px',
              }}>
                {tier.label}
              </div>
              <div style={{ textAlign: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Nova &middot; Vizta League
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls (outside the card so they never appear in the exported PNG) */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '10px 22px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #5e81f4, #ff9e57)',
            color: '#0a0d1a', fontWeight: 700, fontSize: '0.9rem',
            cursor: downloading ? 'default' : 'pointer', opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? 'Preparing...' : 'Download Card'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 22px', borderRadius: '10px',
            background: 'transparent', border: '1px solid rgba(226,229,240,0.3)',
            color: '#e2e5f0', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
      {error && (
        <p style={{ color: '#ff8f9e', fontSize: '0.82rem' }}>
          Couldn't generate the download. Try again, or right-click the card and save it as an image.
        </p>
      )}
    </div>
  );
};

export default PlayerTradingCard;
