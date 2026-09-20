import React, { useState, useEffect } from 'react';
import { checkRateLimit, recordAction } from '../../services/rateLimiter';
import { awardXP } from '../../services/reputationService';

// Shared "3h ago" / "2d ago" label used by comments, kudos, and the
// per-member activity timeline below.
export const formatTimeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// ── Member leaderboard ranks — Overall Nova / Prediction / Fantasy /
// League, side by side. Pulled from leaderboardService, which fans out
// to each rank's own existing all-time leaderboard query. Any category
// the member has no standing in (never made a pick'em pick, doesn't
// follow a league team, etc.) is simply omitted rather than shown as
// "unranked" — an empty grid renders nothing at all. ─────────────────
export const MemberRankGrid = ({ username }) => {
  const [ranks, setRanks] = useState(null); // null = loading

  useEffect(() => {
    if (!username) { setRanks(null); return; }
    let cancelled = false;
    import('../../services/leaderboardService').then(({ getMemberRanks }) => {
      getMemberRanks(username).then((r) => { if (!cancelled) setRanks(r); });
    });
    return () => { cancelled = true; };
  }, [username]);

  if (!ranks) return null;
  const cards = [
    ranks.overall    && { key: 'overall',    label: 'OVERALL NOVA RANK', rank: ranks.overall.rank,    total: ranks.overall.total,    sub: `${ranks.overall.xp} XP` },
    ranks.prediction && { key: 'prediction', label: 'PREDICTION RANK',   rank: ranks.prediction.rank, total: ranks.prediction.total, sub: `${ranks.prediction.correctPicks}/${ranks.prediction.totalPicks} correct` },
    ranks.fantasy    && { key: 'fantasy',    label: 'FANTASY RANK',      rank: ranks.fantasy.rank,    total: ranks.fantasy.total,    sub: `${ranks.fantasy.wins}-${ranks.fantasy.losses}` },
    ranks.league     && { key: 'league',     label: 'LEAGUE RANK',       rank: ranks.league.rank,     total: ranks.league.total,     sub: ranks.league.teamName },
  ].filter(Boolean);

  if (cards.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <span className="member-overview-kicker">LEADERBOARD RANKS</span>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {cards.map(c => (
          <div key={c.key} style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.14)',
          }}>
            <div style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.06em' }}>{c.label}</div>
            <div style={{ color: 'var(--color-cyan)', fontWeight: 800, fontSize: '1.1rem', marginTop: 2 }}>
              {ordinal(c.rank)} <span style={{ color: 'rgba(158,165,196,0.4)', fontWeight: 600, fontSize: '0.72rem' }}>of {c.total}</span>
            </div>
            {c.sub && <div style={{ color: 'rgba(200,210,240,0.55)', fontSize: '0.72rem', marginTop: 1 }}>{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Per-member activity timeline ─────────────────────────────
// A filtered, member-scoped cousin of the site-wide ActivityFeed.jsx on
// Home. That feed is built from site content (articles, league POTM/
// accolades/HOF, fantasy trades) that isn't tied to a specific member, so
// it isn't reused here directly — instead this pulls only the events that
// genuinely belong to *this* member and carry a real timestamp: kudos
// given/received and badges earned. Favorite games are also included,
// labeled as "added to favorites" (the date a member favorited a game is
// the only game-related timestamp this app stores — there's no play-
// session tracking, so this deliberately doesn't claim to show "last
// active game").
export const MemberActivityTimeline = ({ username, favGames, limit = 8, emptyLabel }) => {
  const [items, setItems] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../../services/db'),
      import('../../services/achievementsService'),
    ]).then(([{ default: db }, { BADGES: ACH_BADGES, getEarnedBadgesWithDates }]) => {
      db.getAllKudos().then((allKudos) => {
        if (cancelled) return;
        const kudosReceived = (allKudos || []).filter(k => k.to_username === username).map(k => ({
          key: `kr-${k.id}`, ts: k.created_at, icon: '👍',
          title: `Received kudos from ${k.from_username}`, meta: k.note || 'Kudos',
        }));
        const kudosGiven = (allKudos || []).filter(k => k.from_username === username).map(k => ({
          key: `kg-${k.id}`, ts: k.created_at, icon: '🙌',
          title: `Gave kudos to ${k.to_username}`, meta: k.note || 'Kudos',
        }));
        const badgeMap = Object.fromEntries(ACH_BADGES.map(b => [b.id, b]));
        const badgesEarned = getEarnedBadgesWithDates(username).filter(e => e.earned_at).map(e => ({
          key: `b-${e.id}`, ts: e.earned_at, icon: badgeMap[e.id]?.emoji || '🏅',
          title: `Earned the "${badgeMap[e.id]?.name || e.id}" badge`, meta: 'Badge',
        }));
        const gamesAdded = (favGames || []).filter(g => g.date).map(g => ({
          key: `g-${g.id}`, ts: g.date, icon: g.placeId ? '🎮' : '🏟️',
          title: `Added "${g.text}" to favorite games`, meta: 'Favorite Game',
        }));
        const feed = [...kudosReceived, ...kudosGiven, ...badgesEarned, ...gamesAdded]
          .filter(i => i.ts)
          .sort((a, b) => new Date(b.ts) - new Date(a.ts))
          .slice(0, limit);
        setItems(feed);
      }).catch(() => { if (!cancelled) setItems([]); });
    });
    return () => { cancelled = true; };
  }, [username, favGames, limit]);

  if (items === null) return null;
  if (items.length === 0) {
    return emptyLabel
      ? <p style={{ color: 'rgba(158,165,196,0.25)', textAlign: 'center', padding: 30, fontStyle: 'italic' }}>{emptyLabel}</p>
      : null;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <span className="member-overview-kicker">RECENT ACTIVITY</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {items.map(item => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e5f0', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              {item.meta && <div style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.72rem' }}>{item.meta}</div>}
            </span>
            <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.7rem', flexShrink: 0 }}>{formatTimeAgo(item.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢'];

// Accepts a direct .gif link, or a Giphy/Tenor "share" page link (best-effort
// extraction of the actual media URL so pasted share links still render).
// Mirrors the same helper in PlayerComments.jsx so GIFs behave identically
// on profile comments and player-page comments.
const normalizeGifUrl = (url) => {
  if (!url) return '';
  return url.trim();
};

// ── Comments (used on both the self-view profile and the public
// member page — same thread, same moderation rules either way) ────
export const CommentsSection = ({ toUsername, currentUser, isOwner, pinnedCommentId, onPin }) => {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [posting, setPosting]   = useState(false);
  const [limitMsg, setLimitMsg] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText,  setReplyText]  = useState('');
  const [editingId,  setEditingId]  = useState(null);
  const [editText,   setEditText]   = useState('');
  const [openReactionPickerId, setOpenReactionPickerId] = useState(null);
  const [showGif,    setShowGif]    = useState(false);
  const [gifUrl,     setGifUrl]     = useState('');

  const loadComments = async () => {
    setLoading(true);
    try {
      const { default: db } = await import('../../services/db');
      const data = await db.getComments(toUsername);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      setComments(all[toUsername] || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadComments(); }, [toUsername]); // eslint-disable-line

  const postComment = async (content, replyToId, gif) => {
    const nc = {
      id: Date.now().toString(), from_username: currentUser, to_username: toUsername,
      content, created_at: new Date().toISOString(), reply_to_id: replyToId || null, reactions: {},
      gif_url: gif || null,
    };
    try {
      const { default: db } = await import('../../services/db');
      const saved = await db.addComment(nc);
      setComments(p => [saved || nc, ...p]);
    } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[toUsername] = [nc, ...(all[toUsername] || [])];
      localStorage.setItem('nova_comments', JSON.stringify(all));
      setComments(p => [nc, ...p]);
    }
    recordAction('comment', currentUser);
    awardXP(currentUser, 5);
  };

  const handlePost = async () => {
    const gif = normalizeGifUrl(gifUrl);
    if ((!text.trim() && !gif) || !currentUser) return;
    const verdict = checkRateLimit('comment', currentUser);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    setPosting(true);
    await postComment(text.trim(), null, gif);
    setText(''); setGifUrl(''); setShowGif(false); setPosting(false);
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim() || !currentUser) return;
    const verdict = checkRateLimit('comment', currentUser);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
    await postComment(replyText.trim(), parentId);
    setReplyText(''); setReplyingId(null);
  };

  const handleDelete = async (commentId, fromUsername) => {
    if (currentUser !== fromUsername && currentUser !== toUsername) return;
    try { const { default: db } = await import('../../services/db'); await db.deleteComment(commentId); } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[toUsername] = (all[toUsername] || []).filter(c => c.id !== commentId);
      localStorage.setItem('nova_comments', JSON.stringify(all));
    }
    // Also drop any replies to this comment so the thread doesn't leave
    // orphaned replies hanging under a deleted parent.
    setComments(p => p.filter(c => c.id !== commentId && String(c.reply_to_id) !== String(commentId)));
    // Don't leave a profile pinned to a comment that no longer exists.
    if (onPin && String(commentId) === String(pinnedCommentId)) onPin(commentId);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return;
    const patch = { content: editText.trim(), edited_at: new Date().toISOString() };
    try {
      const { default: db } = await import('../../services/db');
      await db.updateComment(commentId, patch);
    } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      const list = all[toUsername] || [];
      const idx = list.findIndex(c => c.id === commentId);
      if (idx >= 0) { list[idx] = { ...list[idx], ...patch }; all[toUsername] = list; localStorage.setItem('nova_comments', JSON.stringify(all)); }
    }
    setComments(p => p.map(c => c.id === commentId ? { ...c, ...patch } : c));
    setEditingId(null); setEditText('');
  };

  const handleReact = async (comment, emoji) => {
    if (!currentUser) return;
    // Optimistic local update so it feels instant; toggleCommentReaction
    // does the same read-modify-write server-side.
    const reactions = { ...(comment.reactions || {}) };
    const users = new Set(reactions[emoji] || []);
    if (users.has(currentUser)) users.delete(currentUser); else users.add(currentUser);
    if (users.size) reactions[emoji] = Array.from(users); else delete reactions[emoji];
    setComments(p => p.map(c => c.id === comment.id ? { ...c, reactions } : c));
    setOpenReactionPickerId(null);
    try {
      const { default: db } = await import('../../services/db');
      await db.toggleCommentReaction(comment.id, emoji, currentUser, comment.reactions || {});
    } catch {}
  };

  const timeAgo = iso => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  };

  const topLevel = comments.filter(c => !c.reply_to_id);
  const repliesFor = (id) => comments.filter(c => String(c.reply_to_id) === String(id))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const ReactionRow = ({ comment }) => {
    const entries = Object.entries(comment.reactions || {}).filter(([, users]) => users?.length);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap', position: 'relative' }}>
        {entries.map(([emoji, users]) => (
          <button key={emoji} onClick={() => handleReact(comment, emoji)}
            title={users.join(', ')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem',
              cursor: currentUser ? 'pointer' : 'default',
              background: users.includes(currentUser) ? 'rgba(108,92,231,0.18)' : 'rgba(158,165,196,0.08)',
              border: users.includes(currentUser) ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(158,165,196,0.15)',
              color: '#e2e5f0',
            }}>
            {emoji} {users.length}
          </button>
        ))}
        {currentUser && (
          <span style={{ position: 'relative' }}>
            <button onClick={() => setOpenReactionPickerId(openReactionPickerId === comment.id ? null : comment.id)} className="tap44"
              style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
              ＋😊
            </button>
            {openReactionPickerId === comment.id && (
              <div style={{ position: 'absolute', bottom: '120%', left: 0, display: 'flex', gap: 4, padding: '6px 8px', background: '#12162b', border: '1px solid rgba(94,129,244,0.25)', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.5)', zIndex: 20 }}>
                {REACTION_EMOJIS.map(e => (
                  <button key={e} onClick={() => handleReact(comment, e)} className="tap44"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 2 }}>{e}</button>
                ))}
              </div>
            )}
          </span>
        )}
      </div>
    );
  };

  const CommentCard = ({ c, isReply }) => {
    const pinned = !isReply && String(c.id) === String(pinnedCommentId);
    const isEditing = editingId === c.id;
    return (
      <div style={{ padding: '12px 14px', background: pinned ? 'rgba(108,92,231,0.08)' : 'rgba(94,129,244,0.04)', border: pinned ? '1px solid rgba(108,92,231,0.35)' : '1px solid rgba(94,129,244,0.1)', borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.88rem' }}>{pinned && '📌 '}{c.from_username}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.72rem' }}>{timeAgo(c.created_at)}{c.edited_at ? ' · edited' : ''}</span>
            {!isReply && isOwner && onPin && (
              <button onClick={() => onPin(c.id)} className="tap44"
                style={{ background: 'none', border: 'none', color: pinned ? 'var(--gl-accent, #6c5ce7)' : 'rgba(158,165,196,0.4)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                {pinned ? 'Unpin' : '📌 Pin'}
              </button>
            )}
            {!isReply && currentUser && (
              <button onClick={() => { setReplyingId(replyingId === c.id ? null : c.id); setReplyText(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                Reply
              </button>
            )}
            {currentUser === c.from_username && (
              <button onClick={() => { setEditingId(c.id); setEditText(c.content); }}
                style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                Edit
              </button>
            )}
            {(currentUser === c.from_username || currentUser === toUsername) && (
              <button onClick={() => handleDelete(c.id, c.from_username)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,107,122,0.5)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                Delete
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div>
            <textarea rows={2} value={editText} onChange={e => setEditText(e.target.value)} className="focus-ring"
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="neon-button" onClick={() => handleSaveEdit(c.id)} disabled={!editText.trim()} style={{ padding: '5px 14px', fontSize: '0.78rem' }}>Save</button>
              <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.5)', cursor: 'pointer', fontSize: '0.78rem' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {c.content && <p style={{ margin: 0, color: 'rgba(220,230,255,0.85)', fontSize: '0.88rem', lineHeight: 1.5 }}>{c.content}</p>}
            {c.gif_url && (
              <img src={normalizeGifUrl(c.gif_url)} alt="Comment GIF" style={{ marginTop: c.content ? 8 : 0, maxWidth: 260, maxHeight: 200, borderRadius: 8, display: 'block' }} />
            )}
          </>
        )}

        <ReactionRow comment={c} />

        {replyingId === c.id && (
          <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid rgba(94,129,244,0.15)' }}>
            <textarea rows={2} placeholder={`Reply to ${c.from_username}...`} value={replyText} onChange={e => setReplyText(e.target.value)} className="focus-ring"
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="neon-button" onClick={() => handleReply(c.id)} disabled={!replyText.trim()} style={{ padding: '5px 14px', fontSize: '0.78rem' }}>Reply</button>
              <button onClick={() => { setReplyingId(null); setReplyText(''); }} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.5)', cursor: 'pointer', fontSize: '0.78rem' }}>Cancel</button>
            </div>
          </div>
        )}

        {!isReply && repliesFor(c.id).length > 0 && (
          <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: '2px solid rgba(94,129,244,0.12)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {repliesFor(c.id).map(r => <CommentCard key={r.id} c={r} isReply />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {currentUser ? (
        <div style={{ marginBottom: 20 }}>
          <textarea rows={2} placeholder={`Leave a comment on ${toUsername}'s profile...`} value={text}
            onChange={e => setText(e.target.value)}
            className="focus-ring"
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />

          {showGif && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Paste a GIF link (Giphy, Tenor, or any .gif URL)"
                value={gifUrl}
                onChange={e => setGifUrl(e.target.value)}
                className="focus-ring"
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              {gifUrl.trim() && (
                <div style={{ marginTop: 8 }}>
                  <img src={normalizeGifUrl(gifUrl)} alt="GIF preview" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, border: '1px solid rgba(94,129,244,0.2)' }} />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="neon-button" onClick={handlePost} disabled={posting || (!text.trim() && !gifUrl.trim())}
              style={{ padding: '8px 20px', opacity: (posting || (!text.trim() && !gifUrl.trim())) ? 0.4 : 1 }}>
              {posting ? 'Posting...' : 'Post Comment'}
            </button>
            <button
              type="button"
              onClick={() => setShowGif(s => !s)}
              style={{ background: 'none', border: '1px solid rgba(94,129,244,0.25)', color: showGif ? 'var(--color-magenta)' : 'rgba(158,165,196,0.6)', borderRadius: 6, padding: '7px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              🎬 GIF
            </button>
          </div>
          {limitMsg && <p style={{ color: '#ff9e57', fontSize: '0.78rem', marginTop: 8, marginBottom: 0 }}>{limitMsg}</p>}
        </div>
      ) : (
        <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem', marginBottom: 16 }}>Sign in to leave a comment.</p>
      )}

      {loading ? (
        <p style={{ color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem' }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...topLevel].sort((a, b) => (String(a.id) === String(pinnedCommentId) ? -1 : String(b.id) === String(pinnedCommentId) ? 1 : 0)).map(c => (
            <CommentCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
};
