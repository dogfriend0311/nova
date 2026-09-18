import React, { useEffect, useState } from 'react';
import db from '../../services/db';
import { fetchNews, normalizeNews, fetchAthleteNews } from '../../services/sportsDataService';
import { accoladeLabel, accoladeIcon } from '../../data/accolades';
import { SPORTS as ROBLOX_SPORTS } from '../../data/sportsConfig';
import { currentUsername, getAllFollowing, FOLLOW_TYPES, onFollowChange } from '../../services/followService';
import FollowButton from '../FollowButton';

// ── Nova Feed ─────────────────────────────────────────────────────
// "Nova builds your personalized feed" — pulls together everything
// relevant to what a member follows (Roblox league players/teams/
// leagues, Sports Hub players/teams/leagues, and other members) into
// one timeline, instead of them having to check each place separately.
// Reuses the same underlying data ActivityFeed.jsx already shows
// site-wide on Home, but filtered down to what *this* member follows,
// plus Sports Hub news for any real-world follows.

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const goTo = (hash) => { window.location.hash = hash; };

// Bounded, so a member who follows a lot of real-world players doesn't
// trigger a huge burst of requests.
const MAX_SPORTS_PLAYER_NEWS_FETCHES = 6;

const FeedPage = ({ onSignIn }) => {
  const username = currentUsername();
  const [following, setFollowing] = useState(null); // null = loading
  const [items, setItems] = useState(null); // null = loading

  useEffect(() => {
    if (!username) { setFollowing(null); setItems([]); return; }
    let cancelled = false;

    const load = () => {
      getAllFollowing(username).then((byType) => {
        if (cancelled) return;
        setFollowing(byType);
        buildFeed(byType).then((feed) => { if (!cancelled) setItems(feed); });
      });
    };
    load();
    return onFollowChange(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  if (!username) {
    return (
      <div className="page" style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📡</div>
        <h2 className="gradient-text" style={{ marginBottom: 8 }}>Your Feed</h2>
        <p style={{ color: 'rgba(158,165,196,0.6)', marginBottom: 18 }}>
          Sign in and follow players, teams, leagues, or other members to build a feed of what matters to you.
        </p>
        <button className="neon-button" onClick={onSignIn}>Sign In</button>
      </div>
    );
  }

  const totalFollows = following ? Object.values(following).reduce((s, l) => s + l.length, 0) : 0;

  return (
    <div className="page" style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
      <div className="page-header">
        <h1 className="gradient-text">Your Feed</h1>
        <p className="subtitle">Built from everyone and everything you follow.</p>
      </div>

      {following && <FollowingSummary following={following} />}

      {items === null ? (
        <div className="sh-loading" style={{ padding: '40px 0' }}><div className="sh-spinner" /></div>
      ) : items.length === 0 ? (
        totalFollows === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(158,165,196,0.5)' }}>
            You're not following anything yet. Follow a player, team, league, or member to start building your feed.
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(158,165,196,0.5)' }}>
            Nothing new yet from what you follow — check back soon.
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              disabled={!item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)',
                borderRadius: 10, padding: '10px 14px', cursor: item.onClick ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e2e5f0', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.72rem' }}>{item.meta}</div>
              </span>
              <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.7rem', flexShrink: 0 }}>{timeAgo(item.ts)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── "Following" chips — quick overview + one-click unfollow ────────
const FollowingSummary = ({ following }) => {
  const rows = [
    { type: FOLLOW_TYPES.ROBLOX_LEAGUE, label: 'Roblox Leagues', list: following.roblox_league, id: (f) => f.item_id, name: (f) => f.item_label, league: (f) => f.item_id },
    { type: FOLLOW_TYPES.ROBLOX_PLAYER, label: 'Roblox Players', list: following.roblox_player, id: (f) => f.player_id, name: (f) => f.player_name, league: (f) => f.league },
    { type: FOLLOW_TYPES.ROBLOX_TEAM, label: 'Roblox Teams', list: following.roblox_team, id: (f) => f.team_id, name: (f) => f.team_name, league: (f) => f.league },
    { type: FOLLOW_TYPES.SPORTS_LEAGUE, label: 'Sports Hub Leagues', list: following.sports_league, id: (f) => f.item_id, name: (f) => f.item_label },
    { type: FOLLOW_TYPES.SPORTS_TEAM, label: 'Sports Hub Teams', list: following.sports_team, id: (f) => f.item_id, name: (f) => f.item_label },
    { type: FOLLOW_TYPES.SPORTS_PLAYER, label: 'Sports Hub Players', list: following.sports_player, id: (f) => f.item_id, name: (f) => f.item_label },
    { type: FOLLOW_TYPES.USER, label: 'Members', list: following.user, id: (f) => f.item_id, name: (f) => f.item_label },
  ].filter((r) => r.list && r.list.length > 0);

  if (rows.length === 0) return null;

  return (
    <div style={{ margin: '14px 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <div key={r.type}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(158,165,196,0.45)', marginBottom: 6 }}>{r.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {r.list.map((f, i) => (
              <FollowButton
                key={`${r.type}-${r.id(f)}-${i}`}
                type={r.type}
                id={r.id(f)}
                label={r.name(f)}
                league={r.league ? r.league(f) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Feed assembly ───────────────────────────────────────────────
async function buildFeed(following) {
  const robloxLeagues = new Set(following.roblox_league.map((f) => f.item_id));
  following.roblox_player.forEach((f) => robloxLeagues.add(f.league));
  following.roblox_team.forEach((f) => robloxLeagues.add(f.league));

  const followedPlayerIds = new Set(following.roblox_player.map((f) => `${f.league}:${f.player_id}`));
  const followedTeamIds = new Set(following.roblox_team.map((f) => `${f.league}:${f.team_id}`));
  const followedUsers = new Set(following.user.map((f) => f.item_id));

  const leagueList = [...robloxLeagues].filter((lg) => ROBLOX_SPORTS[lg]);

  const [articles, potmLists, accLists, hofLists, kudos, badgeAssignments, badgeTypes] = await Promise.all([
    db.getArticles().catch(() => []),
    Promise.all(leagueList.map((lg) => db.getPotmAwards(lg).then((l) => (l || []).map((a) => ({ ...a, _league: lg }))).catch(() => []))),
    Promise.all(leagueList.map((lg) => db.getAccolades(lg).then((l) => (l || []).map((a) => ({ ...a, _league: lg }))).catch(() => []))),
    Promise.all(leagueList.map((lg) => db.getHof(lg).then((l) => (l || []).map((h) => ({ ...h, _league: lg }))).catch(() => []))),
    followedUsers.size ? db.getAllKudos().catch(() => []) : Promise.resolve([]),
    followedUsers.size ? db.getMemberBadges().catch(() => []) : Promise.resolve([]),
    followedUsers.size ? db.getBadgeTypes().catch(() => []) : Promise.resolve([]),
  ]);

  const relevantToFollowedLeagueOrPlayer = (leagueKey, playerId) =>
    robloxLeagues.has(leagueKey) || followedPlayerIds.has(`${leagueKey}:${playerId}`);

  // Articles — only ones tagged with something this member follows.
  const articleItems = (articles || [])
    .filter((a) => (a.tags || []).some((t) =>
      (t.type === 'league' && robloxLeagues.has(t.league)) ||
      (t.type === 'player' && followedPlayerIds.has(`${t.league}:${t.id}`)) ||
      (t.type === 'team' && followedTeamIds.has(`${t.league}:${t.id}`))
    ))
    .map((a) => ({
      key: `article-${a.id}`, ts: a.created_at, icon: '📰', title: a.title,
      meta: a.author ? `By ${a.author}` : 'New article', onClick: () => goTo(`#articles/${a.id}`),
    }));

  const potmItems = potmLists.flat()
    .filter((a) => relevantToFollowedLeagueOrPlayer(a._league, a.player_id))
    .map((a) => ({
      key: `potm-${a.id}`, ts: a.created_at, icon: '🏆',
      title: `${a.player_name || 'A player'} won Player of the Month`,
      meta: `${ROBLOX_SPORTS[a._league]?.shortLabel || a._league}${a.month_label ? ` · ${a.month_label}` : ''}`,
      onClick: () => goTo(`#leagues/player/${a.player_id}`),
    }));

  const accItems = accLists.flat()
    .filter((a) => relevantToFollowedLeagueOrPlayer(a._league, a.player_id))
    .map((a) => ({
      key: `acc-${a.id}`, ts: a.created_at, icon: accoladeIcon(a),
      title: `${a.player_name || 'A player'} earned ${accoladeLabel(a)}`,
      meta: ROBLOX_SPORTS[a._league]?.shortLabel || a._league,
      onClick: () => goTo(`#leagues/player/${a.player_id}`),
    }));

  const hofItems = hofLists.flat()
    .filter((h) => relevantToFollowedLeagueOrPlayer(h._league, h.player_id))
    .map((h) => ({
      key: `hof-${h.id}`, ts: h.created_at, icon: '⭐',
      title: `${h.player_name || 'A legend'} inducted into the Hall of Fame`,
      meta: ROBLOX_SPORTS[h._league]?.shortLabel || h._league,
      onClick: () => goTo(`#leagues/player/${h.player_id}`),
    }));

  const kudosItems = (kudos || [])
    .filter((k) => followedUsers.has(k.to_username) || followedUsers.has(k.from_username))
    .map((k) => ({
      key: `kudos-${k.id}`, ts: k.created_at, icon: '👍',
      title: `${k.from_username} gave kudos to ${k.to_username}`,
      meta: k.note || 'Kudos', onClick: () => goTo(`#members/${k.to_username}`),
    }));

  const typeById = new Map((badgeTypes || []).map((t) => [String(t.id), t]));
  const badgeItems = (badgeAssignments || [])
    .filter((a) => followedUsers.has(a.username))
    .map((a) => {
      const type = typeById.get(String(a.badge_id));
      return {
        key: `badge-${a.username}-${a.badge_id}`, ts: a.created_at, icon: type?.icon || '🏅',
        title: `${a.username} earned the "${type?.name || 'a'}" badge`,
        meta: 'Badge Earned', onClick: () => goTo(`#members/${a.username}`),
      };
    });

  // Sports Hub — news for followed real-world leagues/teams, plus a
  // bounded number of individual followed players.
  const sportsLeagueCodes = new Set(following.sports_league.map((f) => f.item_id));
  following.sports_team.forEach((f) => sportsLeagueCodes.add(f.item_id.split('-')[0]));

  const newsBySport = {};
  await Promise.all([...sportsLeagueCodes].map(async (sport) => {
    try { newsBySport[sport] = normalizeNews(await fetchNews(sport)); } catch { newsBySport[sport] = []; }
  }));

  const sportsLeagueNewsItems = [...sportsLeagueCodes].flatMap((sport) =>
    (newsBySport[sport] || []).slice(0, 3).map((n) => ({
      key: `sport-news-${sport}-${n.id}`, ts: n.published, icon: '📰',
      title: n.headline, meta: `${sport.toUpperCase()} News`,
      onClick: n.link ? () => window.open(n.link, '_blank', 'noreferrer') : undefined,
    }))
  );

  const sportsTeamNewsItems = following.sports_team.flatMap((f) => {
    const sport = f.item_id.split('-')[0];
    const teamLabel = (f.item_label || '').toLowerCase();
    return (newsBySport[sport] || [])
      .filter((n) => teamLabel && n.headline?.toLowerCase().includes(teamLabel))
      .slice(0, 2)
      .map((n) => ({
        key: `team-news-${f.item_id}-${n.id}`, ts: n.published, icon: '📰',
        title: n.headline, meta: `${f.item_label} News`,
        onClick: n.link ? () => window.open(n.link, '_blank', 'noreferrer') : undefined,
      }));
  });

  const sportsPlayerNewsItems = [];
  const boundedPlayers = following.sports_player.slice(0, MAX_SPORTS_PLAYER_NEWS_FETCHES);
  await Promise.all(boundedPlayers.map(async (f) => {
    const [sport, athleteId] = f.item_id.split('-');
    try {
      const news = await fetchAthleteNews(sport, athleteId);
      (news?.articles || news?.results || []).slice(0, 2).forEach((n, i) => {
        sportsPlayerNewsItems.push({
          key: `player-news-${f.item_id}-${i}`, ts: n.published || n.date, icon: '📰',
          title: n.headline || n.title, meta: `${f.item_label} News`,
          onClick: (n.links?.web?.href || n.link) ? () => window.open(n.links?.web?.href || n.link, '_blank', 'noreferrer') : undefined,
        });
      });
    } catch { /* skip a player whose news can't be loaded */ }
  }));

  return [
    ...articleItems, ...potmItems, ...accItems, ...hofItems,
    ...kudosItems, ...badgeItems,
    ...sportsLeagueNewsItems, ...sportsTeamNewsItems, ...sportsPlayerNewsItems,
  ]
    .filter((i) => i.ts)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 30);
}

export default FeedPage;
