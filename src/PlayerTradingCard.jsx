import React, { useState } from 'react';

/* ── Rarity tier system - driven entirely by overall rating ─────────
   Higher overall = more elaborate visual treatment, mirroring how
   trading card games (this was explicitly modeled on Pokemon cards)
   use rarity tiers: plain common cards up through full holo / rainbow
   foil for the rarest pulls.

   Each tier carries BOTH a CSS gradient string (for the on-screen
   preview) and a parallel array of plain color stops (for the canvas
   export, which can't parse CSS gradient syntax and needs raw stops
   to build its own gradient). */
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
    borderStops: ['#8a8f9e', '#5e6580'],
    bg: 'linear-gradient(160deg, #1a1d29, #0d0f17)',
    bgStops: ['#1a1d29', '#0d0f17'],
    ring: 'rgba(158,165,196,0.35)',
    ringSolid: '#8a8f9e',
    glow: 'none',
    nameColor: '#e2e5f0',
    holo: false,
    sparkle: false,
  },
  uncommon: {
    label: 'Uncommon',
    border: 'linear-gradient(160deg, #7af0bd, #33c481)',
    borderStops: ['#7af0bd', '#33c481'],
    bg: 'linear-gradient(160deg, #0d2818, #081810)',
    bgStops: ['#0d2818', '#081810'],
    ring: 'rgba(94,230,168,0.45)',
    ringSolid: '#5ee6a8',
    glow: '0 0 24px rgba(94,230,168,0.25)',
    nameColor: '#d4fbe8',
    holo: false,
    sparkle: false,
  },
  rare: {
    label: 'Rare',
    border: 'linear-gradient(160deg, #85a3f7, #3a5bc7)',
    borderStops: ['#85a3f7', '#3a5bc7'],
    bg: 'linear-gradient(160deg, #0d1530, #080b1c)',
    bgStops: ['#0d1530', '#080b1c'],
    ring: 'rgba(94,129,244,0.5)',
    ringSolid: '#5e81f4',
    glow: '0 0 28px rgba(94,129,244,0.32)',
    nameColor: '#dbe4ff',
    holo: true,
    sparkle: false,
  },
  epic: {
    label: 'Epic',
    border: 'linear-gradient(160deg, #c7a8ff, #6c5ce7)',
    borderStops: ['#c7a8ff', '#6c5ce7'],
    bg: 'linear-gradient(160deg, #1a0f33, #0d081c)',
    bgStops: ['#1a0f33', '#0d081c'],
    ring: 'rgba(167,139,250,0.55)',
    ringSolid: '#a78bfa',
    glow: '0 0 32px rgba(167,139,250,0.4)',
    nameColor: '#ecdfff',
    holo: true,
    sparkle: false,
  },
  legendary: {
    label: 'Legendary',
    border: 'linear-gradient(160deg, #ffc78a, #e0a13a)',
    borderStops: ['#ffc78a', '#e0a13a'],
    bg: 'linear-gradient(160deg, #33210a, #1c1105)',
    bgStops: ['#33210a', '#1c1105'],
    ring: 'rgba(255,158,87,0.6)',
    ringSolid: '#ff9e57',
    glow: '0 0 40px rgba(255,158,87,0.48)',
    nameColor: '#ffe8d1',
    holo: true,
    sparkle: true,
  },
  mythic: {
    label: 'Mythic',
    border: 'linear-gradient(115deg, #ff7a9e, #ffc45c, #5ee6a8, #5e81f4, #c7a8ff, #ff7a9e)',
    borderStops: ['#ff7a9e', '#ffc45c', '#5ee6a8', '#5e81f4', '#c7a8ff', '#ff7a9e'],
    bg: 'linear-gradient(160deg, #1f0a2e, #0a0512)',
    bgStops: ['#1f0a2e', '#0a0512'],
    ring: 'rgba(255,255,255,0.7)',
    ringSolid: '#ffffff',
    glow: '0 0 48px rgba(199,168,255,0.55)',
    nameColor: '#ffffff',
    holo: true,
    sparkle: true,
  },
};

const CARD_W = 340;
const CARD_H = 560;

/* Small inline sparkle icon - SVG, not emoji, so it survives copy/paste
   and renders identically on every platform. */
const Sparkle = ({ style }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={style}>
    <path d="M12 1l2.4 7.2L22 11l-7.6 2.8L12 21l-2.4-7.2L2 11l7.6-2.8L12 1z" fill="currentColor" />
  </svg>
);

/* ── Canvas drawing helpers ───────────────────────────────────────── */
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeDiagonalGradient(ctx, stops, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const n = stops.length;
  stops.forEach((color, i) => grad.addColorStop(n === 1 ? 0 : i / (n - 1), color));
  return grad;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawStar(ctx, cx, cy, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const x1 = cx + Math.cos(angle) * size;
    const y1 = cy + Math.sin(angle) * size;
    const x2 = cx + Math.cos(angle + Math.PI / 4) * (size * 0.35);
    const y2 = cy + Math.sin(angle + Math.PI / 4) * (size * 0.35);
    if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStatRow(ctx, stats, y, tier, monoFont, displayFont) {
  const statW = (CARD_W - 28 - 18) / 4;
  stats.forEach((s, i) => {
    const sx = 14 + i * (statW + 6);
    roundRectPath(ctx, sx, y, statW, 42, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = tier.nameColor;
    ctx.font = `700 12px ${monoFont}`;
    ctx.fillText(String(s.value), sx + statW / 2, y + 19);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `700 7.5px ${displayFont}`;
    ctx.fillText(String(s.label).toUpperCase(), sx + statW / 2, y + 33);
  });
}

const PlayerTradingCard = ({ player, hittingStats, pitchingStats, catALabel, catBLabel, leagueLabel, onClose }) => {
  const statALabel = (catALabel || 'Hitting').toUpperCase();
  const statBLabel = (catBLabel || 'Pitching').toUpperCase();
  const footerLabel = `NOVA \u00b7 ${(leagueLabel || 'ROBLOX BASEBALL').toUpperCase()}`;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  const tierKey = getTier(player.overall);
  const tier = TIERS[tierKey];
  const name = player.nickname || player.player_name;
  const realName = player.nickname && player.player_name ? player.player_name : null;
  const avatarSrc = player.avatar_data || null;
  const initial = (player.player_name || '?').trim()[0]?.toUpperCase() || '?';

  const [sharing, setSharing] = useState(false);
  const [shareUnsupported, setShareUnsupported] = useState(false);

  /* Draws the entire card from scratch using plain Canvas 2D primitives -
     no SVG, no foreignObject, no DOM snapshotting. That approach can
     silently fail (or "taint" the canvas so export is blocked) depending
     on the browser; drawing directly like this works the same way
     everywhere. Both the download button and the native-share button
     below reuse this same renderer so the exported/shared image is always
     identical to the preview. */
  const renderCardCanvas = async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const scale = 2; // export at 2x for a crisp, print-quality PNG
      const canvas = document.createElement('canvas');
      canvas.width = CARD_W * scale;
      canvas.height = CARD_H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      const displayFont = "'Space Grotesk', 'Segoe UI', sans-serif";
      const monoFont = "'IBM Plex Mono', 'Consolas', monospace";

      // 1) Outer border frame
      roundRectPath(ctx, 0, 0, CARD_W, CARD_H, 18);
      ctx.fillStyle = makeDiagonalGradient(ctx, tier.borderStops, CARD_W, CARD_H);
      ctx.fill();

      // 2) Inner face, inset by 5px to reveal the border frame
      const inset = 5;
      roundRectPath(ctx, inset, inset, CARD_W - inset * 2, CARD_H - inset * 2, 14);
      ctx.fillStyle = makeDiagonalGradient(ctx, tier.bgStops, CARD_W, CARD_H);
      ctx.fill();

      // Clip everything else to the inner card face
      ctx.save();
      roundRectPath(ctx, inset, inset, CARD_W - inset * 2, CARD_H - inset * 2, 14);
      ctx.clip();

      // 3) Holo sheen band for rare+ tiers
      if (tier.holo) {
        const sheen = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
        if (tierKey === 'mythic') {
          sheen.addColorStop(0.2, 'rgba(255,255,255,0)');
          sheen.addColorStop(0.4, 'rgba(255,122,158,0.16)');
          sheen.addColorStop(0.5, 'rgba(94,230,168,0.16)');
          sheen.addColorStop(0.6, 'rgba(94,129,244,0.16)');
          sheen.addColorStop(0.8, 'rgba(255,255,255,0)');
        } else {
          sheen.addColorStop(0.3, 'rgba(255,255,255,0)');
          sheen.addColorStop(0.48, 'rgba(255,255,255,0.14)');
          sheen.addColorStop(0.5, 'rgba(255,255,255,0.22)');
          sheen.addColorStop(0.52, 'rgba(255,255,255,0.14)');
          sheen.addColorStop(0.7, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
      }

      // 4) Sparkles for top tiers
      if (tier.sparkle) {
        drawStar(ctx, 24, 24, 7, tier.nameColor, 0.8);
        drawStar(ctx, CARD_W - 30, 40, 5, tier.nameColor, 0.5);
        drawStar(ctx, 34, CARD_H - 96, 5.5, tier.nameColor, 0.4);
      }

      // 5) Header row: OVR badge + team/position
      const badgeX = 14, badgeY = 12, badgeSize = 46;
      roundRectPath(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
      ctx.fillStyle = makeDiagonalGradient(ctx, tier.borderStops, badgeSize, badgeSize);
      ctx.fill();
      ctx.fillStyle = '#0a0d1a';
      ctx.textAlign = 'center';
      ctx.font = `800 18px ${displayFont}`;
      ctx.fillText(String(player.overall || '\u2014'), badgeX + badgeSize / 2, badgeY + 26);
      ctx.font = `700 7px ${displayFont}`;
      ctx.fillText('OVR', badgeX + badgeSize / 2, badgeY + 38);

      ctx.textAlign = 'right';
      ctx.fillStyle = tier.nameColor;
      ctx.font = `700 13px ${displayFont}`;
      ctx.fillText(player.team || 'Free Agent', CARD_W - 14, badgeY + 16);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `400 10px ${displayFont}`;
      const posLine = `${player.position || '\u2014'}${player.number ? ` \u00b7 #${player.number}` : ''}`;
      ctx.fillText(posLine, CARD_W - 14, badgeY + 30);

      // 6) Player photo (circular)
      const photoR = 62;
      const photoCx = CARD_W / 2;
      const photoCy = 130;
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.clip();
      if (avatarSrc) {
        try {
          const img = await loadImage(avatarSrc);
          ctx.drawImage(img, photoCx - photoR, photoCy - photoR, photoR * 2, photoR * 2);
        } catch {
          ctx.fillStyle = tier.nameColor;
          ctx.globalAlpha = 0.5;
          ctx.font = `800 44px ${displayFont}`;
          ctx.textAlign = 'center';
          ctx.fillText(initial, photoCx, photoCy + 15);
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.fillStyle = tier.nameColor;
        ctx.globalAlpha = 0.5;
        ctx.font = `800 44px ${displayFont}`;
        ctx.textAlign = 'center';
        ctx.fillText(initial, photoCx, photoCy + 15);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Ring around the photo
      ctx.beginPath();
      ctx.arc(photoCx, photoCy, photoR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = tier.ringSolid;
      ctx.lineWidth = 3;
      ctx.stroke();

      // 7) Name block
      let ny = 214;
      ctx.textAlign = 'center';
      ctx.fillStyle = tier.nameColor;
      ctx.font = `700 19px ${displayFont}`;
      ctx.fillText(name, CARD_W / 2, ny);

      if (realName) {
        ny += 16;
        ctx.font = `italic 400 10.5px ${displayFont}`;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(realName, CARD_W / 2, ny);
      }
      if (player.roblox_username) {
        ny += 15;
        ctx.font = `400 9.5px ${displayFont}`;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText(`@${player.roblox_username}`, CARD_W / 2, ny);
      }

      // 8) Hitting stats
      let statsY = ny + 20;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `700 8px ${displayFont}`;
      ctx.fillText(statALabel, 14, statsY);
      statsY += 8;
      drawStatRow(ctx, hittingStats || [], statsY, tier, monoFont, displayFont);

      // 9) Pitching stats
      statsY += 42 + 16;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `700 8px ${displayFont}`;
      ctx.fillText(statBLabel, 14, statsY);
      statsY += 8;
      drawStatRow(ctx, pitchingStats || [], statsY, tier, monoFont, displayFont);

      // 10) Footer: rarity + branding
      ctx.textAlign = 'center';
      ctx.fillStyle = tier.nameColor;
      ctx.font = `700 10px ${displayFont}`;
      ctx.fillText(tier.label.toUpperCase(), CARD_W / 2, CARD_H - inset - 30);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `400 8px ${displayFont}`;
      ctx.fillText(footerLabel, CARD_W / 2, CARD_H - inset - 14);

      ctx.restore(); // undo the inner-face clip

      return canvas;
  };

  const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  const handleDownload = async () => {
    setDownloading(true);
    setError(false);
    try {
      const canvas = await renderCardCanvas();
      const blob = await canvasToBlob(canvas);
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
    } catch (e) {
      setError(true);
      setDownloading(false);
    }
  };

  /* Native share sheet (mobile Safari/Chrome, some desktop browsers) — lets
     someone share the card image directly to Discord, Messages, Instagram,
     etc. without a separate download-then-attach step. Falls back to the
     regular download when the Web Share API or file sharing isn't
     supported (older browsers, most desktop Chrome/Firefox). */
  const handleShare = async () => {
    const safeName = (player.player_name || 'player').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const canShareFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
    if (!canShareFiles) { setShareUnsupported(true); handleDownload(); return; }

    setSharing(true);
    setError(false);
    try {
      const canvas = await renderCardCanvas();
      const blob = await canvasToBlob(canvas);
      if (!blob) { setError(true); setSharing(false); return; }
      const file = new File([blob], `nova-${safeName}-card.png`, { type: 'image/png' });

      if (!navigator.canShare({ files: [file] })) {
        setShareUnsupported(true);
        setSharing(false);
        handleDownload();
        return;
      }

      await navigator.share({
        files: [file],
        title: `${name} — Nova trading card`,
        text: `Check out ${name}'s Nova stat card!`,
      });
      setSharing(false);
    } catch (e) {
      setSharing(false);
      // AbortError just means the user closed the native share sheet —
      // that's not a real failure, don't show an error for it.
      if (e && e.name !== 'AbortError') setError(true);
    }
  };

  const StatBox = ({ s }) => (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '5px 4px',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 700, color: tier.nameColor }}>{s.value}</div>
      <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(5,7,13,0.82)', backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '20px', padding: '20px', overflowY: 'auto',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        {/* On-screen preview only - the download is drawn separately
            on a canvas, see handleDownload. */}
        <div
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

            {/* Photo - a plain solid-color border is used for the ring
                (border-image doesn't respect border-radius in CSS, so
                using it here would break the circular shape). */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', zIndex: 3, position: 'relative' }}>
              <div style={{
                width: '124px', height: '124px', borderRadius: '50%',
                border: `3px solid ${tier.ringSolid}`,
                boxShadow: `0 0 0 4px ${tier.ring}, 0 8px 24px rgba(0,0,0,0.4)`,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '44px', fontWeight: 800, color: tier.nameColor, opacity: 0.5 }}>{initial}</span>
                }
              </div>
            </div>

            {/* Name block */}
            <div style={{ textAlign: 'center', padding: '8px 12px 0', zIndex: 3, position: 'relative' }}>
              <div style={{ fontSize: '19px', fontWeight: 700, color: tier.nameColor, letterSpacing: '0.01em', lineHeight: 1.15 }}>
                {name}
              </div>
              {realName && (
                <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginTop: '2px' }}>{realName}</div>
              )}
              {player.roblox_username && (
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>@{player.roblox_username}</div>
              )}
            </div>

            {/* Hitting stats */}
            <div style={{ padding: '12px 14px 0', zIndex: 3, position: 'relative' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: '5px', letterSpacing: '0.04em' }}>{statALabel}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {(hittingStats || []).slice(0, 4).map((s) => <StatBox key={s.label} s={s} />)}
              </div>
            </div>

            {/* Pitching stats */}
            <div style={{ padding: '12px 14px 0', zIndex: 3, position: 'relative' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: '5px', letterSpacing: '0.04em' }}>{statBLabel}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {(pitchingStats || []).slice(0, 4).map((s) => <StatBox key={s.label} s={s} />)}
              </div>
            </div>

            {/* Footer: rarity + branding */}
            <div style={{ marginTop: 'auto', padding: '14px 14px 12px', zIndex: 3, position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: tier.nameColor, marginBottom: '4px',
              }}>
                {tier.label}
              </div>
              <div style={{ textAlign: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {footerLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              padding: '10px 22px', borderRadius: '10px',
              border: '1px solid rgba(94,129,244,0.4)', background: 'rgba(94,129,244,0.1)',
              color: '#e2e5f0', fontWeight: 700, fontSize: '0.9rem',
              cursor: sharing ? 'default' : 'pointer', opacity: sharing ? 0.7 : 1,
            }}
          >
            {sharing ? 'Preparing...' : '\u2197 Share Card'}
          </button>
        )}
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
          Couldn't generate the download. Try again in a moment.
        </p>
      )}
      {!error && shareUnsupported && (
        <p style={{ color: 'rgba(226,229,240,0.5)', fontSize: '0.78rem' }}>
          Sharing isn't supported in this browser — downloaded the card instead.
        </p>
      )}
    </div>
  );
};

export default PlayerTradingCard;
