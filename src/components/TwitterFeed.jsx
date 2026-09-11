import React, { useEffect, useRef, useState } from 'react';
import db from '../services/db';
import './TwitterFeed.css';

// ── Twitter/X Feed (FREE — no API key, no paid tier) ────────────────
// Uses X's own official embedded-timeline widget (the same script
// news sites use — see https://publish.twitter.com), one per tracked
// account. X hosts and refreshes these itself, so there's nothing to
// poll, cache, or pay for. The trade-off vs. a paid-API approach:
// each account renders in its own box (X's widget doesn't support
// merging several accounts into one interleaved feed unless you embed
// a whole X List instead of individual profiles), and it looks like
// stock X styling rather than Nova's own card design.
//
// Account management still goes through Owner Dashboard -> Twitter/X
// Feed, which just adds/removes rows in nova_twitter_accounts.

const WIDGETS_SRC = 'https://platform.twitter.com/widgets.js';

function useTwitterWidgets(deps) {
  useEffect(() => {
    let cancelled = false;

    function load() {
      if (cancelled) return;
      if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load();
        return;
      }
      // Only inject the script once, even if this component remounts.
      if (!document.querySelector(`script[src="${WIDGETS_SRC}"]`)) {
        const script = document.createElement('script');
        script.src = WIDGETS_SRC;
        script.async = true;
        script.onload = () => { if (!cancelled) window.twttr?.widgets?.load(); };
        document.body.appendChild(script);
      } else {
        // Script tag exists but twttr global isn't ready yet — try again shortly.
        setTimeout(load, 300);
      }
    }
    load();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const TwitterFeed = () => {
  const [accounts, setAccounts] = useState(null); // null = loading
  const containerRef = useRef(null);

  useEffect(() => {
    db.getTwitterAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  useTwitterWidgets([accounts]);

  return (
    <div className="twf-root">
      <div className="twf-head">
        <div className="twf-avatar">🐦</div>
        <div>
          <div className="twf-title">Tweets</div>
          <div className="twf-sub">Live from tracked accounts, via X's own embed</div>
        </div>
      </div>

      {accounts === null && <div className="twf-empty">Loading…</div>}
      {accounts !== null && accounts.length === 0 && (
        <div className="twf-empty">No accounts are being tracked yet — an owner can add some from Owner Dashboard → Twitter/X Feed.</div>
      )}

      <div className="twf-embed-grid" ref={containerRef}>
        {(accounts || []).map((acc) => (
          <div className="twf-embed-card" key={acc.id}>
            <div className="twf-embed-label">@{acc.handle}</div>
            <a
              className="twitter-timeline"
              data-height="500"
              data-theme="dark"
              data-chrome="noheader nofooter transparent"
              href={`https://twitter.com/${acc.handle}?ref_src=twsrc%5Etfw`}
            >
              Tweets by @{acc.handle}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TwitterFeed;
