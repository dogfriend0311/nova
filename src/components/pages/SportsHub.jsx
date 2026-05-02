import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchScoreboard,
  fetchStandings,
  fetchNews,
  normalizeGame,
  normalizeStandings,
  normalizeNews,
} from '../../services/sportsDataService';
import './SportsHub.css';

const SPORTS = [
  { id: 'mlb', label: 'MLB',              icon: '⚾' },
  { id: 'nfl', label: 'NFL',              icon: '🏈' },
  { id: 'nba', label: 'NBA',              icon: '🏀' },
  { id: 'nhl', label: 'NHL',              icon: '🏒' },
  { id: 'cfb', label: 'College Football', icon: '🎓' },
  { id: 'cbb', label: 'College Baseball', icon: '🎓' },
];

const SUB_TABS = [
  { id: 'scores',    label: 'Scores',    icon: '📅' },
  { id: 'standings', label: 'Standings', icon: '🏆' },
  { id: 'news',      label: 'News',      icon: '📰' },
];

const timeSince = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ────────────────────────────────────────────
   Score Card
   ──────────────────────────────────────────── */
const ScoreCard = ({ game }) => {
  const isLive  = game.status === 'in';
  const isFinal = game.status === 'post';
  const isSched = game.status === 'pre';

  const awayWins = isFinal && +game.awayTeam.score > +game.homeTeam.score;
  const homeWins = isFinal && +game.homeTeam.score > +game.awayTeam.score;

  const TeamRow = ({ team, winner }) => (
    <div className={`sh-team-row ${winner ? 'winner' : ''}`}>
      <div className="sh-team-left">
        {team.logo
          ? <img src={team.logo} alt={team.abbr} className="sh-team-logo" />
          : <span className="sh-team-logo-placeholder">?</span>
        }
        <div className="sh-team-info">
          <span className="sh-team-abbr">{team.abbr}</span>
          {team.record && <span className="sh-team-record">{team.record}</span>}
        </div>
        <span className="sh-team-name">{team.shortName}</span>
      </div>
      {!isSched && (
        <span className={`sh-team-score ${winner ? 'winner-score' : ''}`}>
          {team.score ?? '—'}
        </span>
      )}
    </div>
  );

  return (
    <div className={`sh-score-card ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isSched ? 'scheduled' : ''}`}>
      <div className="sh-card-header">
        {isLive && <><span className="sh-live-dot" /><span className="sh-live-text">LIVE</span></>}
        <span className="sh-status-detail">{game.statusDetail}</span>
        {game.broadcast && <span className="sh-broadcast">{game.broadcast}</span>}
      </div>
      <TeamRow team={game.awayTeam} winner={awayWins} />
      <TeamRow team={game.homeTeam} winner={homeWins} />
    </div>
  );
};

/* ────────────────────────────────────────────
   Scores Panel
   ──────────────────────────────────────────── */
const ScoresPanel = ({ sport, refreshKey }) => {
  const [games, setGames]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScoreboard(sport);
      const normalized = (data.events || [])
        .map(normalizeGame)
        .filter(Boolean);
      setGames(normalized);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load scores: {error}</div>;

  const live      = games.filter((g) => g.status === 'in');
  const final     = games.filter((g) => g.status === 'post');
  const scheduled = games.filter((g) => g.status === 'pre');

  if (!games.length) {
    return (
      <div className="sh-no-games">
        <div className="sh-no-games-icon">📅</div>
        <p>No games scheduled right now.</p>
        <p className="sh-no-games-sub">Check back later or view the Standings tab.</p>
      </div>
    );
  }

  const Section = ({ title, items }) =>
    items.length === 0 ? null : (
      <>
        <h3 className="sh-section-title">{title} <span className="sh-section-count">{items.length}</span></h3>
        <div className="sh-scores-grid">
          {items.map((g) => <ScoreCard key={g.id} game={g} />)}
        </div>
      </>
    );

  return (
    <div className="sh-scores-wrap">
      <Section title="🔴 Live"      items={live} />
      <Section title="✅ Final"     items={final} />
      <Section title="🕐 Upcoming" items={scheduled} />
    </div>
  );
};

/* ────────────────────────────────────────────
   Standings Panel
   ──────────────────────────────────────────── */
const StandingsPanel = ({ sport }) => {
  const [groups, setGroups]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const isNHL = sport === 'nhl';

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStandings(sport)
      .then((raw) => setGroups(normalizeStandings(raw)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Standings unavailable: {error}</div>;
  if (!groups?.length) return <div className="sh-empty">No standings data available.</div>;

  return (
    <div className="sh-standings-wrap">
      {groups.map((g, gi) => (
        <div key={gi} className="sh-standings-group">
          <h3 className="sh-division-title">{g.label}</h3>
          <div className="sh-table">
            <div className="sh-table-header">
              <span className="sh-col-team">Team</span>
              <span className="sh-col-num">W</span>
              <span className="sh-col-num">L</span>
              {isNHL && <span className="sh-col-num">OTL</span>}
              {isNHL && <span className="sh-col-num">PTS</span>}
              <span className="sh-col-num hide-xs">PCT</span>
              <span className="sh-col-num hide-sm">GB</span>
              <span className="sh-col-num hide-md">HOME</span>
              <span className="sh-col-num hide-md">AWAY</span>
              <span className="sh-col-num hide-sm">STRK</span>
            </div>
            {g.entries.map((t, i) => (
              <div key={i} className={`sh-table-row ${i === 0 ? 'leader' : ''}`}>
                <span className="sh-col-team">
                  <span className="sh-rank">{i + 1}</span>
                  {t.logo
                    ? <img src={t.logo} alt={t.team} className="sh-stand-logo" />
                    : <span className="sh-stand-logo-ph">{t.team[0]}</span>
                  }
                  <span className="sh-stand-abbr">{t.team}</span>
                  <span className="sh-stand-name">{t.name}</span>
                </span>
                <span className="sh-col-num">{t.wins}</span>
                <span className="sh-col-num">{t.losses}</span>
                {isNHL && <span className="sh-col-num">{t.otl ?? '—'}</span>}
                {isNHL && <span className="sh-col-num">{t.pts ?? '—'}</span>}
                <span className="sh-col-num hide-xs">{t.pct}</span>
                <span className="sh-col-num hide-sm">{t.gb}</span>
                <span className="sh-col-num hide-md">{t.home || '—'}</span>
                <span className="sh-col-num hide-md">{t.away || '—'}</span>
                <span className="sh-col-num hide-sm">{t.streak}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────
   News Panel
   ──────────────────────────────────────────── */
const NewsPanel = ({ sport }) => {
  const [articles, setArticles] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchNews(sport)
      .then((raw) => setArticles(normalizeNews(raw)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load news: {error}</div>;
  if (!articles?.length) return <div className="sh-empty">No news available right now.</div>;

  return (
    <div className="sh-news-grid">
      {articles.map((a) => (
        a.link
          ? (
            <a key={a.id} href={a.link} target="_blank" rel="noreferrer" className="sh-news-card">
              {a.image && <img src={a.image} alt="" className="sh-news-img" loading="lazy" />}
              <div className="sh-news-body">
                <h4 className="sh-news-headline">{a.headline}</h4>
                {a.description && <p className="sh-news-desc">{a.description}</p>}
                <span className="sh-news-meta">
                  {a.byline && <>{a.byline} &nbsp;·&nbsp; </>}
                  {timeSince(a.published)}
                </span>
              </div>
            </a>
          ) : (
            <div key={a.id} className="sh-news-card no-link">
              {a.image && <img src={a.image} alt="" className="sh-news-img" loading="lazy" />}
              <div className="sh-news-body">
                <h4 className="sh-news-headline">{a.headline}</h4>
                {a.description && <p className="sh-news-desc">{a.description}</p>}
                <span className="sh-news-meta">{timeSince(a.published)}</span>
              </div>
            </div>
          )
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────
   Main SportsHub Component
   ──────────────────────────────────────────── */
const SportsHub = () => {
  const [activeSport, setActiveSport] = useState('mlb');
  const [activeTab,   setActiveTab]   = useState('scores');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshKey,  setRefreshKey]  = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setLastUpdated(new Date());
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleSportChange = (id) => {
    setActiveSport(id);
    setActiveTab('scores');
  };

  return (
    <div className="page sh-page">
      {/* Header */}
      <div className="page-header sh-header">
        <h1 className="gradient-text">🏆 Sports Hub</h1>
        <p className="subtitle">
          Powered by ESPN &nbsp;·&nbsp; Live scores · Standings · News &nbsp;·&nbsp;
          <span className="sh-updated">
            {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </p>
      </div>

      {/* Sport Tabs */}
      <div className="sh-sport-tabs">
        {SPORTS.map((s) => (
          <button
            key={s.id}
            className={`sh-sport-tab ${activeSport === s.id ? 'active' : ''}`}
            onClick={() => handleSportChange(s.id)}
          >
            <span className="sh-sport-icon">{s.icon}</span>
            <span className="sh-sport-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="sh-sub-tabs">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            className={`sh-sub-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="sh-content">
        {activeTab === 'scores' && (
          <ScoresPanel
            key={`${activeSport}-scores`}
            sport={activeSport}
            refreshKey={refreshKey}
          />
        )}
        {activeTab === 'standings' && (
          <StandingsPanel key={`${activeSport}-standings`} sport={activeSport} />
        )}
        {activeTab === 'news' && (
          <NewsPanel key={`${activeSport}-news`} sport={activeSport} />
        )}
      </div>
    </div>
  );
};

export default SportsHub;
