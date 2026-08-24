import React, { useEffect, useState } from 'react';
import db from '../services/db';
import './BeatWireFeed.css';

// ── Beat Wire ────────────────────────────────────────────────────
// A Twitter/X-style feed of auto-generated recap blurbs — one per
// finalized game, written by the "Nova Beat Writer" bot the instant a
// game is marked Final in the owner dashboard (see
// src/services/beatWriterService.js + db.js:saveGame/_maybeAutoBeatPost).

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const BeatWireFeed = ({ league, limit = 25 }) => {
  const [posts, setPosts] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    db.getBeatPosts(league, limit).then(rows => { if (!cancelled) setPosts(rows || []); });
    return () => { cancelled = true; };
  }, [league, limit]);

  return (
    <div className="bwf-root">
      <div className="bwf-head">
        <div className="bwf-avatar">📰</div>
        <div>
          <div className="bwf-handle">Nova Beat Writer</div>
          <div className="bwf-sub">Auto-recaps · posted right after the final whistle</div>
        </div>
      </div>

      {posts === null && <div className="bwf-empty">Loading the wire…</div>}
      {posts !== null && posts.length === 0 && (
        <div className="bwf-empty">No recaps yet — they'll show up here as soon as a game is marked Final.</div>
      )}

      <div className="bwf-list">
        {(posts || []).map(post => (
          <article key={post.id} className="bwf-post">
            <div className="bwf-post-avatar">📰</div>
            <div className="bwf-post-body">
              <div className="bwf-post-top">
                <span className="bwf-post-name">Nova Beat Writer</span>
                <span className="bwf-post-tag-inline">@novabeatwriter</span>
                <span className="bwf-post-dot">·</span>
                <span className="bwf-post-time">{timeAgo(post.created_at)}</span>
              </div>
              <div className="bwf-post-headline">{post.headline}</div>
              <div className="bwf-post-text">{post.body}</div>
              <div className="bwf-post-footer">
                {post.tag && <span className={`bwf-tag bwf-tag-${post.kind || 'standard'}`}>{post.tag}</span>}
                {(post.home_team || post.away_team) && (
                  <span className="bwf-score">
                    {post.home_team} {post.home_score} — {post.away_score} {post.away_team}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default BeatWireFeed;
