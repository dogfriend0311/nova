import React, { useEffect, useState } from 'react';
import { currentUsername, isFollowing, toggleFollow, onFollowChange } from '../services/followService';

/**
 * Drop-in Follow button for any followable thing in Nova.
 *
 *   <FollowButton type={FOLLOW_TYPES.SPORTS_TEAM} id="nfl-KC" label="Kansas City Chiefs" />
 *   <FollowButton type={FOLLOW_TYPES.ROBLOX_LEAGUE} id="hockey" label="Roblox Hockey" />
 *   <FollowButton type={FOLLOW_TYPES.USER} id={member.username} label={member.username} />
 *
 * `league` is only needed for the two Roblox-player/Roblox-team types
 * (they're keyed by league + id under the hood). `onSignIn` opens the
 * login modal if a signed-out visitor clicks Follow.
 */
const FollowButton = ({ type, id, label, league, meta, onSignIn, size = 'sm', style }) => {
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const username = currentUsername();

  useEffect(() => {
    if (!username || !id) { setReady(true); return; }
    let active = true;
    const load = () => isFollowing(username, type, id, { league }).then((f) => { if (active) { setFollowing(f); setReady(true); } });
    load();
    return onFollowChange(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, type, id, league]);

  if (!id) return null;

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!username) {
      if (onSignIn) onSignIn();
      else alert('Sign in to follow.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const now = await toggleFollow(username, type, id, label, { league, meta });
      setFollowing(!!now);
    } finally {
      setBusy(false);
    }
  };

  const small = size === 'sm';

  return (
    <button
      onClick={handleClick}
      disabled={busy || !ready}
      className={`nova-follow-btn ${following ? 'following' : ''}`}
      style={{
        padding: small ? '4px 11px' : '7px 16px',
        fontSize: small ? '0.72rem' : '0.82rem',
        ...style,
      }}
      title={following ? 'Unfollow' : 'Follow'}
    >
      {following ? '✓ Following' : '+ Follow'}
    </button>
  );
};

export default FollowButton;
