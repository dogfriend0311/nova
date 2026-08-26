import React, { useState, useEffect, useRef, useCallback } from 'react';
import db from './services/db';
import { getCoins as getCoinsBalance, setCoins as setCoinsBalance } from './services/coinsStorage';
import { getAllProps, getUserBets, saveUserBets, tryPlaceBet } from './services/propBetsStorage';
import { getSport } from './data/sportsConfig';
import {
  LayoutDashboard, Users, Search, Trophy, CalendarDays, ScrollText,
  GitCompare, Target, Award, ArrowLeft, ChevronLeft, ChevronRight, Medal,
  Activity, BarChart3, Database, TrendingUp,
  Archive, BookOpen, Bookmark, Radio, Repeat, Sparkles, Star, Newspaper, Flame,
} from 'lucide-react';
import {
  AllStarVoteTab,
  CommunityPredictionsTab,
  LeagueNewsFeed,
  LeagueRecordsTab,
  PowerRankingsTab,
  SeasonArchiveTab,
  TradeMachineTab,
  TransactionsTab,
  WatchlistsTab,
} from './LeagueFeatures';
import RadarChart from './components/RadarChart';
import TeamDepthChart from './components/pages/TeamDepthChart';
import BeatWireFeed from './components/BeatWireFeed';
import {
  currentUsername,
  getFavoritePlayers,
  getFollowedTeams,
  toggleFavoritePlayer,
  toggleFollowedTeam,
} from './services/favoritesService';
import './ViztaLeague.css';
import { RowsSkeleton } from './components/Skeleton';

/* Small starred/unstarred toggle used next to players and teams
   throughout the league tabs. Stops click propagation so it never
   also triggers the row/card/tile's own onClick navigation. */
const StarButton = ({ active, onToggle, size = 15, title }) => (
  <button
    type="button"
    className={`lh-star-btn ${active ? 'active' : ''}`}
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    title={title || (active ? 'Remove from favorites' : 'Add to favorites')}
    aria-pressed={active}
  >
    <Star size={size} fill={active ? 'currentColor' : 'none'} />
  </button>
);

const fmtVal = (v, fmt) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '--';
  if (fmt === 'avg3') return n.toFixed(3);
  if (fmt === 'avg2') return n.toFixed(2);
  if (fmt === 'avg1') return n.toFixed(1);
  return Math.round(n) || 0;
};

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const bigint = parseInt(full, 16);
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`;
};

const TABS = [
  { id: 'overview',   label: 'Overview',    Icon: LayoutDashboard },
  { id: 'rosters',    label: 'Rosters',     Icon: Users },
  { id: 'depthchart', label: 'Depth Chart', Icon: TrendingUp },
  { id: 'players',    label: 'Players',     Icon: Search },
  { id: 'leaders',    label: 'Leaders',     Icon: Trophy },
  { id: 'schedule',   label: 'Schedule',    Icon: CalendarDays },
  { id: 'scores',     label: 'Box Scores',  Icon: ScrollText },
  { id: 'beatwire',   label: 'Beat Wire',   Icon: Newspaper },
  { id: 'compare',    label: 'Comparison Lab', Icon: GitCompare },
  { id: 'powerrankings', label: 'Power Rankings', Icon: Flame },
  { id: 'analytics',  label: 'Analytics',   Icon: BarChart3 },
  { id: 'records',    label: 'Record Book', Icon: BookOpen },
  { id: 'transactions', label: 'Transactions', Icon: Radio },
  { id: 'trademachine', label: 'Trade Machine', Icon: Repeat },
  { id: 'predictions', label: 'Predictions', Icon: Sparkles },
  { id: 'allstar',    label: 'All-Star Vote', Icon: Star },
  { id: 'watchlist',  label: 'Watchlist',   Icon: Bookmark },
  { id: 'archive',    label: 'Season Archive', Icon: Archive },
  { id: 'propbets',   label: 'Prop Bets',   Icon: Target },
  { id: 'halloffame', label: 'Hall of Fame',Icon: Award },
];

const ViztaLeague = ({ onSelectPlayer, sport = 'vizta', initialTab = 'overview', initialTeam = null }) => {
  const cfg = getSport(sport);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [counts, setCounts] = useState({ teams: 0, players: 0, games: 0 });
  const tabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Cross-tab handoff for the Overview tab's Player Spotlight card — lets a
  // single click jump straight into Rosters (that player's team), Leaders,
  // or the Comparison Lab (that player preloaded as Player A) without the
  // user having to re-find the player once they land on the tab.
  const [spotlightTarget, setSpotlightTarget] = useState(null);
  const jumpToSpotlightTarget = (tab, extra) => {
    setSpotlightTarget({ tab, ...extra, nonce: Date.now() });
    setActiveTab(tab);
  };
  const rosterSpotlightTeam = spotlightTarget?.tab === 'rosters' ? spotlightTarget.team : null;
  const compareSpotlightPlayerId = spotlightTarget?.tab === 'compare' ? spotlightTarget.playerId : null;

  useEffect(() => {
    Promise.all([db.getTeams(sport), db.getPlayers(sport), db.getBsGames(sport)])
      .then(([t, p, g]) => setCounts({ teams: t.length, players: p.length, games: g.length }));
  }, [sport]);

  const updateTabScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateTabScrollState();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateTabScrollState, { passive: true });
    window.addEventListener('resize', updateTabScrollState);
    return () => {
      el.removeEventListener('scroll', updateTabScrollState);
      window.removeEventListener('resize', updateTabScrollState);
    };
  }, [updateTabScrollState]);

  const scrollTabs = (dir) => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':   return <OverviewTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} onJumpToTab={jumpToSpotlightTarget} />;
      case 'rosters':    return <RostersTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} initialTeam={rosterSpotlightTeam || (initialTab === 'rosters' ? initialTeam : null)} />;
      case 'depthchart': return <TeamDepthChart league={sport} />;
      case 'players':    return <PlayersTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} />;
      case 'leaders':    return <LeagueLeadersTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} />;
      case 'schedule':    return <ScheduleTab sport={sport} cfg={cfg} />;
      case 'scores':     return <BoxScoresTab sport={sport} cfg={cfg} />;
      case 'beatwire':   return <BeatWireTab sport={sport} />;
      case 'compare':    return <CompareTab sport={sport} cfg={cfg} presetPlayerId={compareSpotlightPlayerId} />;
      case 'powerrankings': return <PowerRankingsTab sport={sport} cfg={cfg} />;
      case 'analytics':  return <AnalyticsTab sport={sport} cfg={cfg} />;
      case 'records':    return <LeagueRecordsTab sport={sport} cfg={cfg} />;
      case 'transactions': return <TransactionsTab sport={sport} cfg={cfg} />;
      case 'trademachine': return <TradeMachineTab sport={sport} cfg={cfg} />;
      case 'predictions': return <CommunityPredictionsTab sport={sport} cfg={cfg} />;
      case 'allstar':    return <AllStarVoteTab sport={sport} cfg={cfg} />;
      case 'watchlist':  return <WatchlistsTab sport={sport} cfg={cfg} onSelectPlayer={onSelectPlayer} />;
      case 'archive':    return <SeasonArchiveTab sport={sport} cfg={cfg} />;
      case 'propbets':   return <PropBetsTab sport={sport} cfg={cfg} />;
      case 'halloffame': return <HallOfFameTab sport={sport} cfg={cfg} />;
      default:           return <OverviewTab sport={sport} cfg={cfg} />;
    }
  };

  const accentRgb = hexToRgb(cfg.accent) || '94,129,244';

  return (
    <div className="lh-page" style={{ '--accent': cfg.accent, '--accent-rgb': accentRgb }}>
      <div className="lh-hero">
        <div className="lh-hero-grid" />
        <span className="lh-hero-icon" aria-hidden="true">{cfg.icon}</span>
        <div className="lh-hero-topline">
          <div className="lh-hero-eyebrow"><span className="lh-live-dot" /> Nova League Desk</div>
          <span className="lh-hero-code">NOVA / {cfg.key.toUpperCase()} / 01</span>
        </div>
        <div className="lh-hero-layout">
          <div className="lh-hero-content">
            <h1 className="lh-hero-title">{cfg.label}</h1>
            <p className="lh-hero-sub">The numbers behind every {cfg.shortLabel.toLowerCase()} matchup.</p>
            <div className="lh-hero-meta">
              <span><Activity size={13} /> LIVE FEED</span>
              <span><Database size={13} /> VERIFIED DATA</span>
              <span><TrendingUp size={13} /> DEEP STATS</span>
            </div>
            <div className="lh-hero-stats">
              <div className="lh-hero-stat"><b>{counts.teams}</b><span>Teams</span></div>
              <div className="lh-hero-stat"><b>{counts.players}</b><span>Players</span></div>
              <div className="lh-hero-stat"><b>{counts.games}</b><span>Games Logged</span></div>
            </div>
          </div>
          <aside className="lh-hero-sidecar">
            <div className="lh-sidecar-head"><span>SEASON MONITOR</span><b><i /> LIVE</b></div>
            <div className="lh-sidecar-total">{counts.games.toLocaleString()}</div>
            <div className="lh-sidecar-caption">games logged this cycle</div>
            <div className="lh-sidecar-list">
              <div><span>Teams in rotation</span><strong>{String(counts.teams).padStart(2, '0')}</strong></div>
              <div><span>Player pool</span><strong>{String(counts.players).padStart(2, '0')}</strong></div>
              <div><span>Desk status</span><strong className="ready">READY</strong></div>
            </div>
          </aside>
        </div>
      </div>

      <div className="lh-tabs-wrap">
        <button
          type="button"
          className={`lh-tabs-arrow lh-tabs-arrow-left ${canScrollLeft ? 'visible' : ''}`}
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll tabs left"
          tabIndex={canScrollLeft ? 0 : -1}
        >
          <ChevronLeft size={16} strokeWidth={2.6} />
        </button>

        <div className={`lh-tabs-fade lh-tabs-fade-left ${canScrollLeft ? 'visible' : ''}`} />

        <div className="lh-tabs" ref={tabsRef}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`lh-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.Icon size={15} strokeWidth={2.4} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className={`lh-tabs-fade lh-tabs-fade-right ${canScrollRight ? 'visible' : ''}`} />

        <button
          type="button"
          className={`lh-tabs-arrow lh-tabs-arrow-right ${canScrollRight ? 'visible' : ''}`}
          onClick={() => scrollTabs(1)}
          aria-label="Scroll tabs right"
          tabIndex={canScrollRight ? 0 : -1}
        >
          <ChevronRight size={16} strokeWidth={2.6} />
        </button>
      </div>

      <div className="lh-content">{renderTabContent()}</div>
    </div>
  );
};

/* ── Player Spotlight (Overview) ─────────────────────────────────
   Rotating featured-player card. Cycles automatically through a pool
   of headline players (top by overall rating) and links out to the
   other league tabs for that same player — no re-searching required. */
const PlayerSpotlight = ({ sport, cfg, players, teams, onSelectPlayer, onJumpToTab }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Headline pool = top 12 by overall rating (falls back to the full
  // list if `overall` isn't populated for this league yet).
  const pool = [...players]
    .filter(p => p.player_name)
    .sort((a, b) => (parseFloat(b.overall) || 0) - (parseFloat(a.overall) || 0))
    .slice(0, 12);

  useEffect(() => { setIdx(0); }, [sport]);

  useEffect(() => {
    if (paused || pool.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % pool.length), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, pool.length, sport]);

  if (pool.length === 0) return null;
  const player = pool[idx % pool.length];
  const teamColor = teams.find(t => t.team_name === player.team)?.team_color || cfg.accent;
  const teamLogo = teams.find(t => t.team_name === player.team)?.logo_url || null;

  const step = (dir) => setIdx(i => (i + dir + pool.length) % pool.length);

  return (
    <div
      className="lh-spotlight-card"
      style={{ '--spot-rgb': hexToRgb(teamColor) || accentRgbFromCfg(cfg) }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="lh-spotlight-head">
        <span className="lh-spotlight-eyebrow"><Sparkles size={13} /> Player Spotlight</span>
        {pool.length > 1 && (
          <div className="lh-spotlight-nav">
            <button type="button" onClick={() => step(-1)} aria-label="Previous player"><ChevronLeft size={14} /></button>
            <span>{(idx % pool.length) + 1}/{pool.length}</span>
            <button type="button" onClick={() => step(1)} aria-label="Next player"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
      <div className="lh-spotlight-body" onClick={() => onSelectPlayer && onSelectPlayer(player)}>
        {player.avatar_data
          ? <img className="lh-spotlight-avatar" src={player.avatar_data} alt="" />
          : (teamLogo
              ? <img className="lh-spotlight-avatar lh-spotlight-avatar-fallback" src={teamLogo} alt="" />
              : <div className="lh-spotlight-avatar lh-spotlight-avatar-fallback" />)}
        <div className="lh-spotlight-info">
          <h4>{player.player_name}</h4>
          <p>{player.team || 'Free Agent'} · {player.position || '--'}{player.overall ? ` · OVR ${player.overall}` : ''}</p>
        </div>
      </div>
      <div className="lh-spotlight-actions">
        <button type="button" onClick={() => onJumpToTab && onJumpToTab('rosters', { team: player.team })}>
          <Users size={13} /> Roster
        </button>
        <button type="button" onClick={() => onJumpToTab && onJumpToTab('leaders', {})}>
          <Trophy size={13} /> Leaders
        </button>
        <button type="button" onClick={() => onJumpToTab && onJumpToTab('compare', { playerId: player.id })}>
          <GitCompare size={13} /> Compare
        </button>
      </div>
    </div>
  );
};

/* ── Overview ─────────────────────────────────────────────────── */
const OverviewTab = ({ sport, cfg, onSelectPlayer, onJumpToTab }) => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bsGames, setBsGames] = useState([]);
  const [favTeamNames, setFavTeamNames] = useState(new Set());
  const username = currentUsername();
  useEffect(() => {
    db.getTeams(sport).then(setTeams);
    db.getPlayers(sport).then(setPlayers);
    db.getBsGames(sport).then(setBsGames);
    if (username) getFollowedTeams(username, sport).then(list => setFavTeamNames(new Set(list.map(t => t.team_name))));
    else setFavTeamNames(new Set());
  }, [sport, username]);
  const recentGames = [...bsGames].reverse().slice(0, 8);

  const toggleTeamFav = async (team) => {
    if (!username) return;
    const nowFav = await toggleFollowedTeam(username, sport, team);
    setFavTeamNames(prev => {
      const next = new Set(prev);
      if (nowFav) next.add(team.team_name); else next.delete(team.team_name);
      return next;
    });
  };

  const getTeamColor = (name) => teams.find(t => t.team_name === name)?.team_color || null;
  const getTeamLogo  = (name) => teams.find(t => t.team_name === name)?.logo_url || null;

  return (
    <div>
      <PlayerSpotlight sport={sport} cfg={cfg} players={players} teams={teams} onSelectPlayer={onSelectPlayer} onJumpToTab={onJumpToTab} />

      <div className="lh-pulse-row">
        <div className="lh-pulse-card">
          <span className="lh-pulse-label">Teams</span>
          <span className="lh-pulse-value">{teams.length}</span>
        </div>
        <div className="lh-pulse-card">
          <span className="lh-pulse-label">Players</span>
          <span className="lh-pulse-value">{players.length}</span>
        </div>
        <div className="lh-pulse-card">
          <span className="lh-pulse-label">Games Played</span>
          <span className="lh-pulse-value">{bsGames.length}</span>
        </div>
        <div className="lh-pulse-card">
          <span className="lh-pulse-label">Status</span>
          <span className="lh-pulse-value lh-status-live"><span className="lh-live-dot" />Ongoing</span>
        </div>
      </div>

      <div className="lh-section-head">
        <h3>Recent Results</h3>
        <span className="lh-section-tag">Scoreboard</span>
      </div>
      {recentGames.length === 0 ? (
        <div className="lh-empty">No games played yet — check back once the season kicks off.</div>
      ) : (
        <div className="lh-scoreboard-strip">
          {recentGames.map(game => {
            const homeWin = game.home_score > game.away_score;
            const awayWin = game.away_score > game.home_score;
            return (
              <div key={game.id} className="lh-score-card">
                <div className="lh-score-card-tag">FINAL</div>
                <div className="lh-score-row">
                  {getTeamLogo(game.home_team)
                    ? <img className="lh-score-logo" src={getTeamLogo(game.home_team)} alt="" />
                    : <div className="lh-score-logo lh-score-logo-fallback" style={{ background: getTeamColor(game.home_team) || 'var(--accent)' }} />}
                  <span className={`lh-score-team ${homeWin ? 'win' : ''}`}>{game.home_team || 'Home'}</span>
                  <span className={`lh-score-num ${homeWin ? 'win' : ''}`}>{game.home_score}</span>
                </div>
                <div className="lh-score-row">
                  {getTeamLogo(game.away_team)
                    ? <img className="lh-score-logo" src={getTeamLogo(game.away_team)} alt="" />
                    : <div className="lh-score-logo lh-score-logo-fallback" style={{ background: getTeamColor(game.away_team) || 'var(--accent)' }} />}
                  <span className={`lh-score-team ${awayWin ? 'win' : ''}`}>{game.away_team || 'Away'}</span>
                  <span className={`lh-score-num ${awayWin ? 'win' : ''}`}>{game.away_score}</span>
                </div>
                <div className="lh-score-card-name">{game.game_name}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="lh-section-head" style={{ marginTop: '32px' }}>
        <h3>League Teams</h3>
        <span className="lh-section-tag">{teams.length} Total</span>
      </div>
      {teams.length === 0 ? (
        <div className="lh-empty">No teams added yet.</div>
      ) : (
        <div className="lh-teamstrip">
          {teams.map(team => (
            <div key={team.id} className="lh-team-chip">
              {team.logo_url
                ? <img src={team.logo_url} alt="" />
                : <div className="lh-team-chip-fallback" style={{ '--tc': team.team_color || 'var(--accent)' }} />}
              <span>{team.team_name}</span>
              {username && (
                <StarButton
                  active={favTeamNames.has(team.team_name)}
                  onToggle={() => toggleTeamFav(team)}
                  size={13}
                  title={favTeamNames.has(team.team_name) ? 'Unfollow this team' : 'Follow this team'}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <LeagueNewsFeed sport={sport} cfg={cfg} />
    </div>
  );
};

/* ── Rosters ──────────────────────────────────────────────────── */
const RostersTab = ({ sport, cfg, onSelectPlayer, initialTeam }) => {
  const [teams, setTeams]         = useState([]);
  const [players, setPlayers]     = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [rightPanel, setRightPanel] = useState('stats');
  const [schedule, setSchedule]   = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [favTeamNames, setFavTeamNames] = useState(new Set());
  const [favPlayerIds, setFavPlayerIds] = useState(new Set());
  const username = currentUsername();

  useEffect(() => {
    Promise.all([db.getTeams(sport), db.getPlayers(sport)])
      .then(([t, p]) => {
        setTeams(t); setPlayers(p); setLoading(false);
        if (initialTeam) {
          const match = t.find(team => team.team_name === initialTeam);
          if (match) setSelectedTeam(match);
        }
      });
  }, [sport, initialTeam]);

  useEffect(() => {
    if (!username) { setFavTeamNames(new Set()); setFavPlayerIds(new Set()); return; }
    getFollowedTeams(username, sport).then(list => setFavTeamNames(new Set(list.map(t => t.team_name))));
    getFavoritePlayers(username, sport).then(list => setFavPlayerIds(new Set(list.map(p => String(p.player_id || p.playerId)))));
  }, [sport, username]);

  useEffect(() => {
    if (!selectedTeam) return;
    setSchedLoading(true);
    db.getTeamSchedule(selectedTeam.id)
      .then(entries => { setSchedule(entries || []); setSchedLoading(false); })
      .catch(() => { setSchedule([]); setSchedLoading(false); });
  }, [selectedTeam]);

  const toggleTeamFav = async (team) => {
    if (!username) return;
    const nowFav = await toggleFollowedTeam(username, sport, team);
    setFavTeamNames(prev => {
      const next = new Set(prev);
      if (nowFav) next.add(team.team_name); else next.delete(team.team_name);
      return next;
    });
  };

  const togglePlayerFav = async (player) => {
    if (!username) return;
    const nowFav = await toggleFavoritePlayer(username, sport, player);
    setFavPlayerIds(prev => {
      const next = new Set(prev);
      if (nowFav) next.add(String(player.id)); else next.delete(String(player.id));
      return next;
    });
  };

  if (loading) return <RowsSkeleton rows={5} />;

  if (!selectedTeam) {
    // Followed teams surface first so they're easy to find every time
    // the Rosters tab is opened, instead of scrolling the full list.
    const favTeams = teams.filter(t => favTeamNames.has(t.team_name));
    const restTeams = teams.filter(t => !favTeamNames.has(t.team_name));
    const orderedTeams = username ? [...favTeams, ...restTeams] : teams;

    return (
      <div>
        <div className="lh-section-head"><h2>Rosters</h2><span className="lh-section-tag">Pick a team</span></div>
        {teams.length === 0 ? (
          <div className="lh-empty">No teams yet.</div>
        ) : (
          <div className="lh-team-grid">
            {orderedTeams.map(team => {
              const rgb = hexToRgb(team.team_color) || accentRgbFromCfg(cfg);
              const isFav = favTeamNames.has(team.team_name);
              return (
                <div
                  key={team.id}
                  className={`lh-team-tile ${isFav ? 'favorited' : ''}`}
                  style={{ '--tc': team.team_color || 'var(--accent)', '--tc-rgb': rgb }}
                  onClick={() => setSelectedTeam(team)}
                >
                  {username && (
                    <StarButton
                      active={isFav}
                      onToggle={() => toggleTeamFav(team)}
                      title={isFav ? 'Unfollow this team' : 'Follow this team'}
                    />
                  )}
                  {team.logo_url
                    ? <img className="lh-team-tile-logo" src={team.logo_url} alt={team.team_name} />
                    : <div className="lh-team-tile-fallback" />}
                  <span className="lh-team-tile-name">{team.team_name}</span>
                  <span className="lh-team-tile-count">{players.filter(p => p.team === team.team_name).length} players</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);
  const sum = (key) => teamPlayers.reduce((s,p) => s + (parseFloat(p[key])||0), 0);
  const avg = (key) => {
    const vals = teamPlayers.map(p=>parseFloat(p[key])).filter(v=>!isNaN(v)&&v>0);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3) : '--';
  };
  const teamStats = [
    {label:'Players', value: teamPlayers.length},
    {label:'Avg OVR', value: teamPlayers.length ? Math.round(teamPlayers.reduce((s,p)=>s+(parseInt(p.overall)||0),0)/teamPlayers.length) : '--'},
    ...cfg.teamStats.map(ts => ({ label: ts.label, value: ts.agg === 'avg' ? avg(ts.field) : sum(ts.field) })),
  ];
  const teamColor = selectedTeam.team_color || cfg.accent;
  const teamRgb = hexToRgb(teamColor) || accentRgbFromCfg(cfg);

  const wins   = schedule.filter(e => e.result === 'W').length;
  const losses = schedule.filter(e => e.result === 'L').length;
  const ties   = schedule.filter(e => e.result === 'T').length;

  return (
    <div style={{ '--tc': teamColor, '--tc-rgb': teamRgb }}>
      <button className="lh-back-btn" onClick={() => { setSelectedTeam(null); setRightPanel('stats'); }}>
        <ArrowLeft size={14} /> Back to Teams
      </button>
      <div className="lh-team-header">
        {selectedTeam.logo_url
          ? <img className="lh-team-header-logo" src={selectedTeam.logo_url} alt={selectedTeam.team_name} />
          : <div className="lh-team-header-fallback" />}
        <h2 className="lh-team-header-name">{selectedTeam.team_name}</h2>
      </div>

      <div className="lh-split">
        <div className="lh-card">
          <div className="lh-section-head" style={{ marginBottom: '12px' }}>
            <h3>Roster ({teamPlayers.length})</h3>
          </div>
          {teamPlayers.length === 0 ? (
            <div className="lh-empty">No players assigned</div>
          ) : (
            <div className="lh-roster-list">
              {teamPlayers.map(p => {
                const isFav = favPlayerIds.has(String(p.id));
                return (
                  <div
                    key={p.id}
                    className={`lh-roster-row ${onSelectPlayer ? 'clickable' : ''}`}
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                  >
                    {p.avatar_data
                      ? <img className="lh-roster-avatar" src={p.avatar_data} alt={p.player_name} />
                      : <div className="lh-roster-avatar-fallback">🎮</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="lh-roster-name">{p.player_name}</p>
                      <p className="lh-roster-meta">{p.position||'--'} · OVR {p.overall||'?'}</p>
                    </div>
                    {username && (
                      <StarButton
                        active={isFav}
                        onToggle={() => togglePlayerFav(p)}
                        title={isFav ? 'Remove from favorite players' : 'Star as a favorite player'}
                      />
                    )}
                    {onSelectPlayer && <ChevronRight size={15} color={`rgba(${teamRgb},0.6)`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lh-card">
          <div className="lh-toggle-group">
            {['stats','schedule'].map(id => (
              <button key={id} className={`lh-toggle-btn ${rightPanel===id?'active':''}`} onClick={() => setRightPanel(id)}>
                {id === 'stats' ? <><Trophy size={13}/> Team Stats</> : <><CalendarDays size={13}/> Schedule</>}
              </button>
            ))}
          </div>

          {rightPanel === 'stats' && (
            <div className="lh-percentile-grid">
              {teamStats.map(({label,value}, i) => {
                const numeric = parseFloat(value);
                const hasVal = value !== '--' && !isNaN(numeric);
                return (
                  <div key={label} className="lh-percentile-tile" style={{ animationDelay:`${i*30}ms` }}>
                    <span className="lh-percentile-label">{label}</span>
                    <span className="lh-percentile-value" style={{ color: hasVal ? teamColor : 'rgba(158,165,196,0.25)' }}>{value}</span>
                    <div className="lh-percentile-bar"><div className="lh-percentile-fill" style={{ width: hasVal ? '100%' : '0%' }} /></div>
                  </div>
                );
              })}
            </div>
          )}

          {rightPanel === 'schedule' && (
            <>
              <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
                {wins > 0 && <span className="lh-record-pill w">{wins}W</span>}
                {losses > 0 && <span className="lh-record-pill l">{losses}L</span>}
                {ties > 0 && <span className="lh-record-pill t">{ties}T</span>}
                {schedule.filter(e=>!e.result).length > 0 && (
                  <span style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.82rem' }}>{schedule.filter(e=>!e.result).length} upcoming</span>
                )}
              </div>
              {schedLoading ? (
                <RowsSkeleton rows={3} />
              ) : schedule.length === 0 ? (
                <div className="lh-empty">No schedule yet.<br/>An admin can add games via Admin → Fantasy Schedule.</div>
              ) : (
                <div className="lh-boxtable-wrap">
                  <table className="lh-boxtable">
                    <thead>
                      <tr>{['Wk','Opponent','Loc','Date','Score','Result'].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...schedule].sort((a,b)=>(a.week||999)-(b.week||999)).map(entry=>(
                        <tr key={entry.id}>
                          <td style={{ fontWeight:700, color:'var(--tc, var(--accent))' }}>{entry.week??'—'}</td>
                          <td>{entry.opponent||'—'}</td>
                          <td style={{ fontSize:'0.7rem', fontWeight:700, color: entry.is_home ? 'var(--tc, var(--accent))' : '#d946ef' }}>{entry.is_home?'HOME':'AWAY'}</td>
                          <td style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.75rem' }}>{entry.game_date||'—'}</td>
                          <td>{entry.score||'—'}</td>
                          <td style={{ fontWeight:700, color: entry.result==='W'?'#22c55e':entry.result==='L'?'#ef4444':entry.result==='T'?'#eab308':'rgba(158,165,196,0.3)' }}>{entry.result || 'TBD'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const accentRgbFromCfg = (cfg) => hexToRgb(cfg.accent) || '94,129,244';

/* ── Players ──────────────────────────────────────────────────── */
const PlayersTab = ({ sport, onSelectPlayer }) => {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [favPlayerIds, setFavPlayerIds] = useState(new Set());
  const username = currentUsername();
  useEffect(() => { db.getPlayers(sport).then(setPlayers); }, [sport]);
  useEffect(() => {
    if (!username) { setFavPlayerIds(new Set()); return; }
    getFavoritePlayers(username, sport).then(list => setFavPlayerIds(new Set(list.map(p => String(p.player_id || p.playerId)))));
  }, [sport, username]);

  const togglePlayerFav = async (player) => {
    if (!username) return;
    const nowFav = await toggleFavoritePlayer(username, sport, player);
    setFavPlayerIds(prev => {
      const next = new Set(prev);
      if (nowFav) next.add(String(player.id)); else next.delete(String(player.id));
      return next;
    });
  };

  const filtered = players.filter(p =>
    p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.team?.toLowerCase().includes(search.toLowerCase())
  );
  // Favorited players surface first so it's easy to jump straight to
  // them instead of searching every time the Players tab is opened.
  const orderedFiltered = username
    ? [...filtered.filter(p => favPlayerIds.has(String(p.id))), ...filtered.filter(p => !favPlayerIds.has(String(p.id)))]
    : filtered;

  return (
    <div>
      <div className="lh-search-wrap">
        <Search size={16} />
        <input
          type="text" className="lh-search-input"
          placeholder="Search players or teams…" value={search}
          onChange={e=>setSearch(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="lh-empty">{players.length === 0 ? 'No players added yet' : 'No players match your search'}</div>
      ) : (
        <div className="lh-player-grid">
          {orderedFiltered.map((player, i) => {
            const isFav = favPlayerIds.has(String(player.id));
            return (
              <div key={player.id} className={`lh-player-card ${isFav ? 'favorited' : ''}`} style={{ animationDelay:`${Math.min(i,20)*25}ms` }} onClick={() => onSelectPlayer && onSelectPlayer(player)}>
                {username && (
                  <StarButton
                    active={isFav}
                    onToggle={() => togglePlayerFav(player)}
                    title={isFav ? 'Remove from favorite players' : 'Star as a favorite player'}
                  />
                )}
                <div className="lh-player-card-top">
                  {player.avatar_data
                    ? <img className="lh-player-avatar" src={player.avatar_data} alt={player.player_name} />
                    : <div className="lh-player-avatar-fallback">{(player.player_name||'?')[0]}</div>}
                  <div style={{ minWidth: 0 }}>
                    <p className="lh-player-name">{player.player_name}</p>
                    <p className="lh-player-team">{player.team || 'Free Agent'}</p>
                  </div>
                  {player.number && <span className="lh-player-num">#{player.number}</span>}
                </div>
                <div className="lh-player-badges">
                  <span className="lh-player-badge">{player.position || '--'}</span>
                  <span className="lh-player-badge">OVR {player.overall || '--'}</span>
                </div>
                <p className="lh-player-cta">View Stat Page →</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── League Leaders ───────────────────────────────────────────── */
const LeagueLeadersTab = ({ sport, cfg, onSelectPlayer }) => {
  const [players, setPlayers]   = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState('season');
  const [statType, setStatType] = useState(cfg.catA.id);

  useEffect(() => { setStatType(cfg.catA.id); }, [cfg]);

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getBoxScores(sport)])
      .then(([p, b]) => { setPlayers(p); setBoxScores(Array.isArray(b)?b:[]); setLoading(false); });
  }, [sport]);

  if (loading) return <RowsSkeleton rows={6} />;

  const CATS = statType === cfg.catA.id ? cfg.leadersA : cfg.leadersB;

  const withStats = players.map(p => {
    const scores = boxScores.filter(b => String(b.player_id) === String(p.id));
    const sumBox = (key) => key ? scores.reduce((s,b) => s + (parseFloat(b[key])||0), 0) : 0;
    const vals = {};
    CATS.forEach(cat => {
      const seasonRaw = sumBox(cat.box) + (parseFloat(p[cat.seasonField])||0);
      const careerRaw = parseFloat(p[cat.careerField]) || seasonRaw;
      vals[cat.label + '_season'] = seasonRaw;
      vals[cat.label + '_career'] = careerRaw;
    });
    return { ...p, _vals: vals };
  });

  const rankClass = (i) => i===0?'gold':i===1?'silver':i===2?'bronze':'';

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:'14px' }}>
        <div className="lh-toggle-group">
          {['season','career'].map(m2 => (
            <button key={m2} className={`lh-toggle-btn ${mode===m2?'active':''}`} onClick={()=>setMode(m2)}>{m2}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:'26px' }}>
        <div className="lh-toggle-group">
          {[cfg.catA, cfg.catB].map(c => (
            <button key={c.id} className={`lh-toggle-btn ${statType===c.id?'active':''}`} onClick={()=>setStatType(c.id)}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="lh-leader-board">
        {CATS.map((cat) => {
          const key = cat.label + '_' + mode;
          const sorted = [...withStats].filter(p=>p._vals[key]!==undefined).sort((a,b)=>cat.hi?(b._vals[key]||0)-(a._vals[key]||0):(a._vals[key]||9999)-(b._vals[key]||9999)).slice(0,10);
          if (!sorted.length) return null;
          const maxVal = Math.max(...sorted.map(p => Math.abs(p._vals[key]||0)), 1);
          return (
            <div key={cat.label} className="lh-leader-card">
              <div className="lh-leader-head"><h4>{cat.label}</h4><Trophy size={15} color="var(--accent)" /></div>
              {sorted.map((p,i) => (
                <div key={p.id} className="lh-leader-row" onClick={()=>onSelectPlayer&&onSelectPlayer(p)}>
                  <span className={`lh-leader-rank ${rankClass(i)}`}>{i+1}</span>
                  {p.avatar_data
                    ? <img className="lh-leader-avatar" src={p.avatar_data} alt="" />
                    : <Medal size={16} color="rgba(158,165,196,0.3)" />}
                  <div className="lh-leader-info">
                    <p className="lh-leader-name">{p.player_name}</p>
                    <p className="lh-leader-sub">{p.team||'FA'} · {p.position||'--'}</p>
                  </div>
                  <div className="lh-leader-value-wrap">
                    <div className="lh-leader-bar-track"><div className="lh-leader-bar-fill" style={{ width: `${Math.min(100, Math.abs(p._vals[key]||0)/maxVal*100)}%` }} /></div>
                    <span className="lh-leader-value">{fmtVal(p._vals[key], cat.fmt)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {withStats.length === 0 && <div className="lh-empty">No players yet.</div>}
      </div>
    </div>
  );
};

/* ── Shared game box-score detail ────────────────────────────── */
const GameBoxScoreDetail = ({ game, boxScores, players, teams, cfg, onBack, backLabel = 'Back' }) => {
  const getTeamColor = (name) => teams.find(t => t.team_name === name)?.team_color || null;
  const getTeamLogo  = (name) => teams.find(t => t.team_name === name)?.logo_url || null;
  const getPlayer    = (id)   => players.find(p => p.id === id);

  const TeamTable = ({ teamName, scores, accent }) => {
    const color = getTeamColor(teamName) || accent;
    const logo  = getTeamLogo(teamName);
    const rgb = hexToRgb(color) || accentRgbFromCfg(cfg);
    if (!scores.length) return null;
    return (
      <div className="lh-card lh-boxtable-card" style={{ '--tc': color, '--tc-rgb': rgb }}>
        <div className="lh-boxtable-head">
          {logo ? <img src={logo} alt={teamName} /> : <div className="lh-boxtable-head-fallback" />}
          <h4>{teamName || 'Unknown Team'}</h4>
        </div>
        <div className="lh-boxtable-wrap">
          <table className="lh-boxtable">
            <thead><tr>
              <th style={{ minWidth:'130px' }}>Player</th>
              {cfg.boxFields.map(f => <th key={f}>{cfg.boxLabels[f]}</th>)}
            </tr></thead>
            <tbody>
              {scores.map((score,i) => {
                const p = getPlayer(score.player_id);
                return (
                  <tr key={i}>
                    <td>
                      <div className="lh-boxplayer">
                        {p?.avatar_data ? <img src={p.avatar_data} alt="" /> : <div className="lh-boxplayer-fallback">🎮</div>}
                        <span style={{ color: color || 'var(--accent)', fontWeight: 600 }}>{p?.player_name||'?'}</span>
                      </div>
                    </td>
                    {cfg.boxFields.map((f,j)=>(<td key={j}>{score[f]||0}</td>))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const gameScores  = boxScores.filter(b => b.game_id === game.id);
  const homeScores  = gameScores.filter(s => s.team === game.home_team);
  const awayScores  = gameScores.filter(s => s.team === game.away_team);
  const otherScores = gameScores.filter(s => s.team !== game.home_team && s.team !== game.away_team);
  const homeWin = game.home_score > game.away_score;
  const awayWin = game.away_score > game.home_score;

  return (
    <div>
      {onBack && <button className="lh-back-btn" onClick={onBack}><ArrowLeft size={14}/> {backLabel}</button>}
      <div className="lh-matchup-card">
        <div className="lh-matchup-tag">{game.game_name}</div>
        <div className="lh-matchup-grid">
          <div className="lh-matchup-side">
            {getTeamLogo(game.home_team) && <img className="lh-matchup-logo" src={getTeamLogo(game.home_team)} alt="" />}
            <p className="lh-matchup-team" style={{ color: getTeamColor(game.home_team) || 'var(--accent)' }}>{game.home_team||'Home'}</p>
            <p className={`lh-matchup-score ${homeWin?'win':''}`}>{game.home_score}</p>
            {homeWin && <span className="lh-matchup-win-chip">WIN</span>}
          </div>
          <div className="lh-matchup-center">
            VS
            {game.game_date && <div className="lh-matchup-date">{new Date(game.game_date).toLocaleDateString()}</div>}
          </div>
          <div className="lh-matchup-side">
            {getTeamLogo(game.away_team) && <img className="lh-matchup-logo" src={getTeamLogo(game.away_team)} alt="" />}
            <p className="lh-matchup-team" style={{ color: getTeamColor(game.away_team) || 'var(--accent)' }}>{game.away_team||'Away'}</p>
            <p className={`lh-matchup-score ${awayWin?'win':''}`}>{game.away_score}</p>
            {awayWin && <span className="lh-matchup-win-chip">WIN</span>}
          </div>
        </div>
      </div>
      {gameScores.length===0 ? (
        <div className="lh-empty">No player stats logged for this game</div>
      ) : (
        <>
          <TeamTable teamName={game.home_team} scores={homeScores} accent="var(--accent)" />
          <TeamTable teamName={game.away_team} scores={awayScores} accent="var(--accent)" />
          {otherScores.length>0 && <TeamTable teamName="Other" scores={otherScores} accent="var(--accent)" />}
        </>
      )}
    </div>
  );
};

/* ── Schedule ─────────────────────────────────────────────────── */
const ScheduleTab = ({ sport, cfg }) => {
  const [teams, setTeams]       = useState([]);
  const [players, setPlayers]   = useState([]);
  const [bsGames, setBsGames]   = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    Promise.all([db.getTeams(sport), db.getPlayers(sport), db.getBsGames(sport), db.getBoxScores(sport)])
      .then(([t, p, g, b]) => { setTeams(t); setPlayers(p); setBsGames(g); setBoxScores(Array.isArray(b)?b:[]); setLoading(false); });
  }, [sport]);

  useEffect(() => {
    if (!selectedTeam) return;
    setSchedLoading(true);
    setSelectedGame(null);
    db.getTeamSchedule(selectedTeam.id)
      .then(entries => { setSchedule(entries || []); setSchedLoading(false); })
      .catch(() => { setSchedule([]); setSchedLoading(false); });
  }, [selectedTeam]);

  if (loading) return <RowsSkeleton rows={6} />;

  if (selectedGame) {
    return (
      <GameBoxScoreDetail
        game={selectedGame} boxScores={boxScores} players={players} teams={teams} cfg={cfg}
        onBack={() => setSelectedGame(null)} backLabel="Back to Schedule"
      />
    );
  }

  if (!selectedTeam) {
    return (
      <div>
        <div className="lh-section-head"><h2>Schedule</h2><span className="lh-section-tag">Pick a team</span></div>
        <p style={{ color:'rgba(158,165,196,0.5)', margin:'-8px 0 20px', fontSize:'0.88rem' }}>See which games a team has won, lost, and when they were played.</p>
        {teams.length === 0 ? (
          <div className="lh-empty">No teams yet.</div>
        ) : (
          <div className="lh-team-grid">
            {teams.map(team => {
              const rgb = hexToRgb(team.team_color) || accentRgbFromCfg(cfg);
              return (
                <div key={team.id} className="lh-team-tile" style={{ '--tc': team.team_color || 'var(--accent)', '--tc-rgb': rgb }} onClick={() => setSelectedTeam(team)}>
                  {team.logo_url
                    ? <img className="lh-team-tile-logo" src={team.logo_url} alt={team.team_name} />
                    : <div className="lh-team-tile-fallback" />}
                  <span className="lh-team-tile-name">{team.team_name}</span>
                  <span className="lh-team-tile-count">View schedule →</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const teamColor = selectedTeam.team_color || cfg.accent;
  const teamRgb = hexToRgb(teamColor) || accentRgbFromCfg(cfg);
  const wins   = schedule.filter(e => e.result === 'W').length;
  const losses = schedule.filter(e => e.result === 'L').length;
  const ties   = schedule.filter(e => e.result === 'T').length;
  const sorted = [...schedule].sort((a,b) => {
    if (a.game_date && b.game_date) return new Date(a.game_date) - new Date(b.game_date);
    return (a.week||999) - (b.week||999);
  });

  const openGame = (entry) => {
    if (!entry.game_id) return;
    const g = bsGames.find(g => String(g.id) === String(entry.game_id));
    if (g) setSelectedGame(g);
  };

  return (
    <div style={{ '--tc': teamColor, '--tc-rgb': teamRgb }}>
      <button className="lh-back-btn" onClick={() => setSelectedTeam(null)}><ArrowLeft size={14}/> Back to Teams</button>
      <div className="lh-team-header">
        {selectedTeam.logo_url
          ? <img className="lh-team-header-logo" src={selectedTeam.logo_url} alt={selectedTeam.team_name} />
          : <div className="lh-team-header-fallback" />}
        <h2 className="lh-team-header-name">{selectedTeam.team_name}</h2>
        <div className="lh-record-pills">
          {wins > 0 && <span className="lh-record-pill w">{wins}W</span>}
          {losses > 0 && <span className="lh-record-pill l">{losses}L</span>}
          {ties > 0 && <span className="lh-record-pill t">{ties}T</span>}
        </div>
      </div>

      <div className="lh-card">
        {schedLoading ? (
          <RowsSkeleton rows={4} />
        ) : sorted.length === 0 ? (
          <div className="lh-empty">No schedule yet.<br/>An admin can add games via Admin → Schedule.</div>
        ) : (
          <div className="lh-game-log">
            {sorted.map(entry => {
              const hasGame = !!entry.game_id && bsGames.some(g => String(g.id) === String(entry.game_id));
              const resultColor = entry.result==='W' ? '#22c55e' : entry.result==='L' ? '#ef4444' : entry.result==='T' ? '#eab308' : 'rgba(158,165,196,0.35)';
              return (
                <div key={entry.id} className={`lh-glr ${hasGame ? 'clickable' : ''}`} onClick={() => hasGame && openGame(entry)} style={{ '--rc': resultColor }}>
                  <div className="lh-glr-result">{entry.result || (entry.game_date && new Date(entry.game_date) < new Date() ? '—' : 'TBD')}</div>
                  <div className="lh-glr-main">
                    <span className="lh-glr-opp">{entry.is_home ? 'vs' : '@'} {entry.opponent || 'TBD'}</span>
                    <span className="lh-glr-meta">
                      {entry.game_date ? new Date(entry.game_date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : 'Date TBD'}
                      {entry.week ? ` · Wk ${entry.week}` : ''}
                    </span>
                  </div>
                  <div className="lh-glr-score">{entry.score || '—'}</div>
                  {hasGame && <div className="lh-glr-cta">Box Score →</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Beat Wire ────────────────────────────────────────────────── */
// Auto-generated recap blurbs, one per finalized game — see
// components/BeatWireFeed.jsx + services/beatWriterService.js.
const BeatWireTab = ({ sport }) => (
  <div>
    <div className="lh-section-head"><h2>Beat Wire</h2><span className="lh-section-tag">Auto-Recaps</span></div>
    <BeatWireFeed league={sport} />
  </div>
);

/* ── Box Scores ───────────────────────────────────────────────── */
const BoxScoresTab = ({ sport, cfg }) => {
  const [bsGames, setBsGames]     = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [players, setPlayers]     = useState([]);
  const [teams, setTeams]         = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    db.getBsGames(sport).then(setBsGames);
    db.getBoxScores(sport).then(setBoxScores);
    db.getPlayers(sport).then(setPlayers);
    db.getTeams(sport).then(setTeams);
  }, [sport]);

  if (selectedGame) {
    return (
      <GameBoxScoreDetail
        game={selectedGame} boxScores={boxScores} players={players} teams={teams} cfg={cfg}
        onBack={() => setSelectedGame(null)} backLabel="Back to Box Scores"
      />
    );
  }

  return (
    <div>
      <div className="lh-section-head"><h2>Box Scores</h2><span className="lh-section-tag">{bsGames.length} Games</span></div>
      {bsGames.length===0 ? (
        <div className="lh-empty">No box scores logged yet</div>
      ) : (
        <div className="lh-scores-list">
          {[...bsGames].reverse().map(game => (
            <div key={game.id} className="lh-scores-row" onClick={()=>setSelectedGame(game)}>
              <div>
                <p className="lh-scores-row-name">{game.game_name}</p>
                <p className="lh-scores-row-line">{game.home_team} <strong>{game.home_score}</strong> — <strong>{game.away_score}</strong> {game.away_team}</p>
                {game.game_date && <p className="lh-scores-row-date">{new Date(game.game_date).toLocaleDateString()}</p>}
              </div>
              <ChevronRight size={18} color="var(--accent)" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Compare ──────────────────────────────────────────────────── */
const CompareTab = ({ sport, cfg, presetPlayerId }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState('player');
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [mode, setMode]         = useState('season');
  const [statFilter, setStatFilter] = useState(cfg.catA.id);

  useEffect(() => { setStatFilter(cfg.catA.id); }, [cfg]);

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getTeams(sport)])
      .then(([p, t]) => { setPlayers(p); setTeams(t); setLoading(false); });
  }, [sport]);

  // A player handed off from elsewhere (e.g. the Overview tab's Player
  // Spotlight card) preloads as Player A so the visitor lands on a ready
  // comparison instead of an empty picker.
  useEffect(() => {
    if (presetPlayerId) {
      setCompareMode('player');
      setIdA(String(presetPlayerId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPlayerId]);

  if (loading) return <RowsSkeleton rows={6} />;

  const getTeamColor = (name) => teams.find(t=>t.team_name===name)?.team_color||null;
  const pA = players.find(p=>String(p.id)===String(idA));
  const pB = players.find(p=>String(p.id)===String(idB));
  const colorA = (pA&&getTeamColor(pA.team))||cfg.accent;
  const colorB = (pB&&getTeamColor(pB.team))||'#ff9e57';
  const rgbA = hexToRgb(colorA) || accentRgbFromCfg(cfg);
  const rgbB = hexToRgb(colorB) || '255,158,87';

  const STAT_LIST = statFilter===cfg.catA.id ? cfg.compareA : cfg.compareB;
  const LEADER_LIST = statFilter===cfg.catA.id ? cfg.leadersA : cfg.leadersB;
  const lowerBetter = new Set(cfg.lowerBetter);

  // League-wide max for each headline stat (in the current season/career
  // mode) — used to scale the radar chart so it shows absolute standing,
  // not just how the two selected players stack up against each other.
  const leagueMaxFor = (field) => players.reduce((max, p) => {
    const v = parseFloat(p[field]);
    return Number.isFinite(v) && v > max ? v : max;
  }, 0);
  const radarAxes = (pA && pB) ? LEADER_LIST.map((l) => {
    const field = mode === 'season' ? l.seasonField : l.careerField;
    return {
      label: l.label,
      a: parseFloat(pA[field]) || 0,
      b: parseFloat(pB[field]) || 0,
      max: leagueMaxFor(field),
      lowerBetter: !l.hi,
    };
  }) : null;

  const getVal = (p, label, sKey, cKey) => {
    if (!p) return null;
    const raw = mode==='season'?p[sKey]:p[cKey];
    if (raw===null||raw===undefined||raw==='') return '--';
    return String(raw);
  };
  const numVal = (v) => { if (v==='--'||v===null||v===undefined) return null; return parseFloat(v); };
  const isBetter = (key, a, b) => {
    const na=numVal(a), nb=numVal(b);
    if (na===null||nb===null||na===nb) return null;
    return lowerBetter.has(key)?na<nb:na>nb;
  };

  const teamA_obj = teams.find(t=>String(t.id)===String(idA));
  const teamB_obj = teams.find(t=>String(t.id)===String(idB));
  const colorTA = teamA_obj?.team_color||cfg.accent;
  const colorTB = teamB_obj?.team_color||'#ff9e57';

  const aggregateTeam = (teamName) => {
    const roster = players.filter(p=>p.team===teamName);
    if (!roster.length) return null;
    const sum = (key) => roster.reduce((s,p)=>s+(parseFloat(p[key])||0),0);
    const avg = (key) => { const vals=roster.map(p=>parseFloat(p[key])).filter(v=>!isNaN(v)); return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3):'--'; };
    const out = { 'Players': roster.length };
    cfg.teamStats.forEach(ts => { out[ts.label] = ts.agg==='avg' ? avg(ts.field) : sum(ts.field); });
    return out;
  };
  const tA = compareMode==='team'?aggregateTeam(teamA_obj?.team_name):null;
  const tB = compareMode==='team'?aggregateTeam(teamB_obj?.team_name):null;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:'20px' }}>
        <div className="lh-toggle-group">
          <button className={`lh-toggle-btn ${compareMode==='player'?'active':''}`} onClick={()=>{setCompareMode('player');setIdA('');setIdB('');}}>Players</button>
          <button className={`lh-toggle-btn ${compareMode==='team'?'active':''}`} onClick={()=>{setCompareMode('team');setIdA('');setIdB('');}}>Teams</button>
        </div>
      </div>

      <div className="lh-vs-picker">
        <div style={{ '--side-rgb': compareMode==='player'?rgbA:hexToRgb(colorTA)||accentRgbFromCfg(cfg) }}>
          <label className="lh-vs-label">{compareMode==='player'?'Player A':'Team A'}</label>
          {compareMode==='player' ? (
            <select className="lh-vs-select" value={idA} onChange={e=>setIdA(e.target.value)}>
              <option value="">Select player...</option>
              {players.map(p=><option key={p.id} value={String(p.id)}>{p.player_name}{p.team?` (${p.team})`:''} OVR {p.overall}</option>)}
            </select>
          ) : (
            <select className="lh-vs-select" value={idA} onChange={e=>setIdA(e.target.value)}>
              <option value="">Select team...</option>
              {teams.map(t=><option key={t.id} value={String(t.id)}>{t.team_name}</option>)}
            </select>
          )}
        </div>
        <span className="lh-vs-badge">VS</span>
        <div style={{ '--side-rgb': compareMode==='player'?rgbB:hexToRgb(colorTB)||'255,158,87' }}>
          <label className="lh-vs-label">{compareMode==='player'?'Player B':'Team B'}</label>
          {compareMode==='player' ? (
            <select className="lh-vs-select" value={idB} onChange={e=>setIdB(e.target.value)}>
              <option value="">Select player...</option>
              {players.map(p=><option key={p.id} value={String(p.id)}>{p.player_name}{p.team?` (${p.team})`:''} OVR {p.overall}</option>)}
            </select>
          ) : (
            <select className="lh-vs-select" value={idB} onChange={e=>setIdB(e.target.value)}>
              <option value="">Select team...</option>
              {teams.map(t=><option key={t.id} value={String(t.id)}>{t.team_name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'center', marginBottom:'10px' }}>
        <div className="lh-toggle-group">
          {['season','career'].map(m=><button key={m} className={`lh-toggle-btn ${mode===m?'active':''}`} onClick={()=>setMode(m)}>{m}</button>)}
        </div>
      </div>
      {compareMode==='player' && (
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'22px' }}>
          <div className="lh-toggle-group">
            {[cfg.catA, cfg.catB].map(c=>(
              <button key={c.id} className={`lh-toggle-btn ${statFilter===c.id?'active':''}`} onClick={()=>setStatFilter(c.id)}>{c.label}</button>
            ))}
          </div>
        </div>
      )}

      {compareMode==='player' && pA && pB && (
        <>
          {radarAxes && (
            <div style={{ marginBottom: 20 }}>
              <RadarChart axes={radarAxes} colorA={colorA} colorB={colorB} nameA={pA.player_name} nameB={pB.player_name} />
            </div>
          )}
          <div className="lh-compare-table">
            <div className="lh-compare-head">
              <span style={{ color: colorA }}>{pA.player_name}</span>
              <span>STAT</span>
              <span style={{ color: colorB }}>{pB.player_name}</span>
            </div>
            {STAT_LIST.map(([label,sKey,cKey]) => {
              const valA=getVal(pA,label,sKey,cKey), valB=getVal(pB,label,sKey,cKey);
              const aBetter=isBetter(label,valA,valB), bBetter=isBetter(label,valB,valA);
              return (
                <div key={label} className="lh-compare-row">
                  <span className={`lh-compare-val ${aBetter?'better':''}`} style={{ color: aBetter?colorA:undefined, background: aBetter?`rgba(${rgbA},0.15)`:undefined }}>{valA}</span>
                  <span className="lh-compare-label">{label}</span>
                  <div className="lh-compare-right">
                    <span className={`lh-compare-val ${bBetter?'better':''}`} style={{ color: bBetter?colorB:undefined, background: bBetter?`rgba(${rgbB},0.15)`:undefined }}>{valB}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {compareMode==='player' && (!pA||!pB) && <div className="lh-empty">Select two players to compare</div>}

      {compareMode==='team' && teamA_obj && teamB_obj && tA && tB && (
        <div className="lh-compare-table">
          <div className="lh-compare-head">
            <span style={{ color: colorTA }}>{teamA_obj.team_name}</span>
            <span>STAT</span>
            <span style={{ color: colorTB }}>{teamB_obj.team_name}</span>
          </div>
          {Object.entries(tA).map(([key,valA]) => {
            const valB=tB[key], na=parseFloat(valA), nb=parseFloat(valB);
            const lk=new Set(cfg.teamStats.filter(ts=>cfg.lowerBetter.some(lb=>ts.label.endsWith(lb))).map(ts=>ts.label));
            const aBetter=!isNaN(na)&&!isNaN(nb)&&na!==nb?(lk.has(key)?na<nb:na>nb):null;
            const bBetter=!isNaN(na)&&!isNaN(nb)&&na!==nb?(lk.has(key)?nb<na:nb>na):null;
            const hasDiff = !isNaN(na) && !isNaN(nb);
            const diff = hasDiff ? na - nb : null;
            const diffLabel = hasDiff
              ? `${diff === 0 ? '±' : diff > 0 ? '+' : ''}${Number.isInteger(diff) ? diff : diff.toFixed(2)}`
              : null;
            return (
              <div key={key} className="lh-compare-row">
                <span className={`lh-compare-val ${aBetter?'better':''}`} style={{ color: aBetter?colorTA:undefined, background: aBetter?`rgba(${hexToRgb(colorTA)||accentRgbFromCfg(cfg)},0.15)`:undefined }}>{valA}</span>
                <span className="lh-compare-label">
                  {key}
                  {diffLabel !== null && (
                    <span style={{ display: 'block', fontSize: '0.68rem', color: aBetter ? colorTA : bBetter ? colorTB : 'rgba(158,165,196,0.5)' }}>
                      diff {diffLabel}
                    </span>
                  )}
                </span>
                <div className="lh-compare-right">
                  <span className={`lh-compare-val ${bBetter?'better':''}`} style={{ color: bBetter?colorTB:undefined, background: bBetter?`rgba(${hexToRgb(colorTB)||'255,158,87'},0.15)`:undefined }}>{valB}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {compareMode==='team' && (!teamA_obj||!teamB_obj) && <div className="lh-empty">Select two teams to compare</div>}
    </div>
  );
};

/* ── Analytics / league intelligence ───────────────────────────── */
const AnalyticsTab = ({ sport, cfg }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getTeams(sport), db.getBoxScores(sport)])
      .then(([p, t, b]) => {
        setPlayers(Array.isArray(p) ? p : []);
        setTeams(Array.isArray(t) ? t : []);
        setBoxScores(Array.isArray(b) ? b : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sport]);

  if (loading) return <RowsSkeleton rows={7} />;

  const numeric = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  };
  const average = (values) => {
    const clean = values.map(numeric).filter(v => v !== null);
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
  };
  const formatMetric = (value, fmt = 'int') => {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    if (fmt === 'avg3') return value.toFixed(3);
    if (fmt === 'avg2') return value.toFixed(2);
    if (fmt === 'avg1') return value.toFixed(1);
    return Math.round(value).toLocaleString();
  };

  const rosteredPlayers = players.filter(player => player.team);
  const ratedPlayers = players.filter(player => numeric(player.overall) !== null);
  const statFields = [...cfg.seasonA.slice(0, 6), ...cfg.seasonB.slice(0, 6)].map(([field]) => field);
  const coveredStatCells = players.reduce((count, player) => count + statFields.filter(field => player[field] !== '' && player[field] !== null && player[field] !== undefined).length, 0);
  const statCoverage = players.length && statFields.length
    ? Math.round((coveredStatCells / (players.length * statFields.length)) * 100)
    : 0;

  const teamRows = teams.map(team => {
    const roster = players.filter(player => player.team === team.team_name);
    return {
      ...team,
      rosterCount: roster.length,
      avgOverall: average(roster.map(player => player.overall)),
      topOverall: Math.max(0, ...roster.map(player => numeric(player.overall) || 0)),
    };
  }).sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0));

  const leaderGroups = [
    { label: cfg.catA.label, stats: cfg.leadersA },
    { label: cfg.catB.label, stats: cfg.leadersB },
  ].map(group => ({
    ...group,
    rows: group.stats.map(stat => {
      const leader = [...players]
        .map(player => {
          const raw = numeric(player[stat.seasonField]);
          return raw === null ? null : { player, value: raw };
        })
        .filter(Boolean)
        .sort((a, b) => stat.hi ? b.value - a.value : a.value - b.value)[0];
      return { ...stat, leader };
    }).filter(row => row.leader),
  }));

  return (
    <div className="lh-analytics">
      <div className="lh-section-head">
        <div>
          <h2>League Analytics</h2>
          <p className="lh-section-note">A decision-ready view of the current {cfg.shortLabel.toLowerCase()} data set.</p>
        </div>
        <span className="lh-section-tag">Advanced Center</span>
      </div>

      <div className="lh-analytics-kpis">
        <div className="lh-analytics-kpi"><span>Rated players</span><b>{ratedPlayers.length}<small> / {players.length}</small></b><em>Overall coverage</em></div>
        <div className="lh-analytics-kpi"><span>Rostered</span><b>{rosteredPlayers.length}<small> players</small></b><em>{teams.length} teams tracked</em></div>
        <div className="lh-analytics-kpi"><span>Box score rows</span><b>{boxScores.length.toLocaleString()}</b><em>Logged league events</em></div>
        <div className="lh-analytics-kpi"><span>Stat coverage</span><b>{statCoverage}%</b><em>Core fields populated</em></div>
      </div>

      <div className="lh-analytics-columns">
        <div className="lh-card lh-analytics-panel">
          <div className="lh-analytics-panel-head">
            <div><span className="lh-panel-kicker">POWER INDEX</span><h3>Team strength board</h3></div>
            <TrendingUp size={17} color="var(--accent)" />
          </div>
          {teamRows.length === 0 ? <div className="lh-empty">Add teams and rosters to build the power index.</div> : (
            <div className="lh-power-list">
              {teamRows.map((team, index) => (
                <div className="lh-power-row" key={team.id || team.team_name}>
                  <span className={`lh-power-rank ${index < 3 ? 'top' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
                  {team.logo_url ? <img src={team.logo_url} alt="" /> : <span className="lh-power-logo" style={{ background: team.team_color || 'var(--accent)' }} />}
                  <div className="lh-power-name"><strong>{team.team_name}</strong><small>{team.rosterCount} rostered players</small></div>
                  <div className="lh-power-score"><b>{formatMetric(team.avgOverall, 'avg1')}</b><span>AVG OVR</span></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lh-card lh-analytics-panel">
          <div className="lh-analytics-panel-head">
            <div><span className="lh-panel-kicker">LIVE LEADERS</span><h3>Category leaders</h3></div>
            <Trophy size={17} color="var(--accent)" />
          </div>
          <div className="lh-analytics-leader-groups">
            {leaderGroups.map(group => (
              <div key={group.label} className="lh-analytics-leader-group">
                <span className="lh-panel-subhead">{group.label}</span>
                {group.rows.slice(0, 5).map(row => (
                  <div className="lh-mini-leader-row" key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.leader.player.player_name}</strong>
                    <b>{formatMetric(row.leader.value, row.fmt)}</b>
                  </div>
                ))}
                {group.rows.length === 0 && <small className="lh-muted">Waiting for stat entries.</small>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lh-card lh-analytics-signal">
        <div className="lh-signal-icon"><Database size={18} /></div>
        <div><span className="lh-panel-kicker">DATA SIGNAL</span><h3>{boxScores.length ? 'The league is producing usable game data.' : 'The data layer is ready for the season.'}</h3><p>{boxScores.length ? `${boxScores.length.toLocaleString()} box-score rows are available for deeper game-log analysis, player trends, and record tracking.` : 'Once box scores are logged, this panel will power game-level trends, rolling form, and record books without changing the league UI.'}</p></div>
        <span className="lh-signal-status"><span /> {boxScores.length ? 'ACTIVE' : 'READY'}</span>
      </div>
    </div>
  );
};

/* ── Prop Bets (scoped to this league's sport) ──────────────────── */
const PropBetsTab = ({ cfg }) => {
  const [user, setUser] = useState(null);
  const [props, setProps] = useState(getAllProps);
  const [myBets, setMyBets] = useState({});
  const [betAmounts, setBetAmounts] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nova_user') || 'null');
      setUser(stored);
      if (stored?.username) setMyBets(getUserBets(stored.username));
    } catch { /* no-op */ }
    setProps(getAllProps());
  }, []);

  const getCoins = () => getCoinsBalance(user?.username);
  const setCoins = (n) => setCoinsBalance(user?.username, n);

  function placeBet(propId, optionIdx) {
    if (!user) { alert('Sign in to bet!'); return; }
    const result = tryPlaceBet({ myBets, propId, optionIdx, rawAmount: betAmounts[propId], coinsBalance: getCoins() });
    if (!result.ok) { alert(result.error); return; }
    setCoins(getCoins() - result.amount);
    setMyBets(result.updatedBets);
    saveUserBets(user.username, result.updatedBets);
  }

  const sportProps = props.filter(p => p.sport === cfg.propSport);
  const open     = sportProps.filter(p => p.status === 'open');
  const resolved = sportProps.filter(p => p.status === 'resolved');

  const winnings = (prop) => {
    const bet = myBets[prop.id];
    if (!bet || prop.status !== 'resolved') return null;
    if (bet.optionIdx === prop.winnerIdx) return { win: true, amount: Math.round(bet.amount * (prop.multiplier || 2)) };
    return { win: false, amount: bet.amount };
  };

  const Section = ({ title, items }) => (
    <>
      <div className="lh-section-head" style={{ marginTop: '22px' }}><h3 style={{ fontSize:'0.85rem' }}>{title}</h3></div>
      {items.length === 0
        ? <div className="lh-empty">{title === 'Open Props' ? 'No open props right now.' : 'No resolved props yet.'}</div>
        : items.map(prop => {
            const bet = myBets[prop.id];
            const result = winnings(prop);
            return (
              <div key={prop.id} className="lh-card lh-prop-card">
                <div className="lh-prop-top">
                  <div>
                    <div className="lh-prop-question">{prop.question}</div>
                    <div className="lh-prop-meta">
                      {cfg.icon} {cfg.shortLabel} · {prop.multiplier || 2}× payout
                      {prop.deadline ? ` · Closes ${new Date(prop.deadline).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  {result && (
                    <div className={`lh-prop-result-chip ${result.win?'win':'lose'}`}>
                      {result.win ? `+${result.amount} 🪙` : `-${result.amount} 🪙`}
                    </div>
                  )}
                </div>
                <div className="lh-prop-options">
                  {(prop.options || []).map((opt, oi) => {
                    const isWinner = prop.status === 'resolved' && prop.winnerIdx === oi;
                    const isLoser  = prop.status === 'resolved' && prop.winnerIdx !== oi;
                    const isPicked = bet?.optionIdx === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => prop.status === 'open' && !bet && placeBet(prop.id, oi)}
                        disabled={prop.status !== 'open' || !!bet}
                        className={`lh-prop-option ${isWinner?'winner':''} ${isPicked&&!isWinner?'picked':''} ${isLoser&&isPicked?'loser':''}`}
                        style={{ cursor: prop.status==='open'&&!bet ? 'pointer':'default' }}
                      >
                        {opt}{isWinner && ' ✓'}{isPicked && !isWinner && prop.status === 'resolved' && ' ✗'}
                      </button>
                    );
                  })}
                </div>
                {prop.status === 'open' && !bet && user && (
                  <div className="lh-prop-bet-row">
                    <input
                      type="number" min={1} placeholder="Coins to bet" className="lh-prop-input"
                      value={betAmounts[prop.id] || ''}
                      onChange={e => setBetAmounts(prev => ({ ...prev, [prop.id]: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)' }}>coins · pick an option above to bet</span>
                  </div>
                )}
                {bet && prop.status === 'open' && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)' }}>Bet {bet.amount} 🪙 on "{prop.options?.[bet.optionIdx]}"</div>
                )}
              </div>
            );
          })
      }
    </>
  );

  return (
    <div>
      <div className="lh-card" style={{ marginBottom:'8px' }}>
        <div className="lh-section-head" style={{ marginBottom: user ? '4px' : 0 }}>
          <h3>{cfg.icon} {cfg.label} Prop Bets</h3>
          <Target size={16} color="var(--accent)" />
        </div>
        <p style={{ margin:0, color:'rgba(158,165,196,0.6)', fontSize:'0.85rem' }}>Bet coins on props for this league — admin posts, you pick, coins awarded on resolve</p>
        {user && <div className="lh-balance-chip">🪙 {getCoins().toLocaleString()} coins</div>}
      </div>
      <Section title="Open Props" items={open} />
      <Section title="Resolved" items={resolved} />
    </div>
  );
};

/* ── Hall of Fame ─────────────────────────────────────────────── */
const HallOfFameTab = ({ sport }) => {
  const [hof, setHof] = useState([]);
  useEffect(() => { db.getHof(sport).then(setHof); }, [sport]);
  return (
    <div>
      <div className="lh-section-head"><h2>Hall of Fame</h2><span className="lh-section-tag">{hof.length} Inducted</span></div>
      {hof.length===0 ? (
        <div className="lh-empty">Hall of Fame players will appear here</div>
      ) : (
        <div className="lh-hof-grid">
          {hof.map((entry,i) => (
            <div key={i} className="lh-hof-card" style={{ animationDelay:`${i*40}ms` }}>
              <div className="lh-hof-icon">🏆</div>
              <p className="lh-hof-name">{entry.player_name}</p>
              {entry.team && <p className="lh-hof-team">{entry.team}</p>}
              {entry.description && <p className="lh-hof-desc">{entry.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViztaLeague;
