import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchScoreboard,
  fetchStandings,
  fetchNews,
  fetchTeamRoster,
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
  { id: 'cfb', label: 'College Football', icon: '🏈' },
  { id: 'cbb', label: 'College Baseball', icon: '⚾' },
];

const SUB_TABS = [
  { id: 'scores',    label: 'Scores',    icon: '📅' },
  { id: 'standings', label: 'Standings', icon: '🏆' },
  { id: 'news',      label: 'News',      icon: '📰' },
];

const timeSince = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* Brightness check — determines whether to put white or black text on team color */
const isColorDark = (hex) => {
  if (!hex || hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 165;
};

/* ────────────────────────────────────────────
   Team Roster View
   ──────────────────────────────────────────── */
const TeamRosterView = ({ team, sport, onBack }) => {
  const [roster,  setRoster]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const primary   = team.color    ? `#${team.color}`    : '#00c8ff';
  const onPrimary = isColorDark(team.color) ? '#ffffff' : '#111111';

  useEffect(() => {
    if (!team.id) { setLoading(false); setError('No team ID available.'); return; }
    setLoading(true);
    setError(null);
    fetchTeamRoster(sport, team.id)
      .then(setRoster)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [team.id, sport]);

  const groups = roster?.athletes?.filter((g) => g.items?.length > 0) || [];

  return (
    <div className="sh-roster-page">
      {/* ── Banner header ── */}
      <div
        className="sh-roster-banner"
        style={{
          background: `linear-gradient(135deg, ${primary}28 0%, #07071a 70%)`,
          borderBottom: `3px solid ${primary}`,
          boxShadow: `0 4px 32px ${primary}1a`,
        }}
      >
        <button
          className="sh-roster-back"
          onClick={onBack}
          style={{ borderColor: `${primary}66`, color: primary }}
        >
          ← Standings
        </button>

        <div className="sh-roster-identity">
          {team.logo
            ? <img src={team.logo} alt={team.name} className="sh-roster-big-logo" />
            : <div className="sh-roster-logo-ph" style={{ background: `${primary}22`, color: primary }}>?</div>
          }
          <div className="sh-roster-meta">
            <h2 className="sh-roster-team-name" style={{ color: primary }}>{team.name}</h2>
            {(team.record || (team.wins != null)) && (
              <span className="sh-roster-record">
                {team.record || `${team.wins}–${team.losses}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {loading && (
        <div className="sh-loading">
          <div className="sh-spinner" style={{ borderTopColor: primary }} />
        </div>
      )}
      {error && <div className="sh-error">Could not load roster: {error}</div>}

      {!loading && !error && groups.length === 0 && (
        <div className="sh-empty">No roster data available for this team.</div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="sh-roster-groups">
          {groups.map((group) => (
            <div key={group.position} className="sh-roster-group">
              <h3
                className="sh-roster-pos-label"
                style={{ color: primary, borderBottomColor: `${primary}44` }}
              >
                {group.position}
                <span className="sh-roster-pos-count" style={{ background: `${primary}22`, color: primary }}>
                  {group.items.length}
                </span>
              </h3>

              <div className="sh-player-grid">
                {group.items.map((player) => (
                  <div
                    key={player.id}
                    className="sh-player-card"
                    style={{
                      borderTop: `3px solid ${primary}`,
                      background: `linear-gradient(160deg, ${primary}0e 0%, rgba(8,8,26,0.95) 100%)`,
                      boxShadow: `0 2px 12px ${primary}0d`,
                    }}
                  >
                    <div className="sh-player-photo-wrap">
                      {player.headshot?.href ? (
                        <img
                          src={player.headshot.href}
                          alt={player.displayName}
                          className="sh-player-headshot"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="sh-player-ph"
                          style={{ background: `${primary}1a`, color: primary }}
                        >
                          {player.jersey || '?'}
                        </div>
                      )}
                      {player.jersey && (
                        <span
                          className="sh-player-jersey"
                          style={{ background: primary, color: onPrimary }}
                        >
                          #{player.jersey}
                        </span>
                      )}
                    </div>

                    <div className="sh-player-details">
                      <span className="sh-player-name">{player.displayName}</span>
                      <span className="sh-player-pos-age">
                        {player.position?.abbreviation || '—'}
                        {player.age ? ` · ${player.age} yrs` : ''}
                        {player.experience?.years != null ? ` · Yr ${player.experience.years + 1}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────
   Score Card
   ──────────────────────────────────────────── */
const ScoreCard = ({ game, onSelectTeam }) => {
  const isLive  = game.status === 'in';
  const isFinal = game.status === 'post';
  const isSched = game.status === 'pre';

  const awayWins = isFinal && +game.awayTeam.score > +game.homeTeam.score;
  const homeWins = isFinal && +game.homeTeam.score > +game.awayTeam.score;

  const TeamRow = ({ team, winner }) => (
    <div
      className={`sh-team-row ${winner ? 'winner' : ''} ${team.id ? 'clickable' : ''}`}
      onClick={team.id ? () => onSelectTeam(team) : undefined}
      title={team.id ? `View ${team.shortName} roster` : undefined}
    >
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
const ScoresPanel = ({ sport, refreshKey, onSelectTeam }) => {
  const [games,   setGames]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScoreboard(sport);
      setGames((data.events || []).map(normalizeGame).filter(Boolean));
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
          {items.map((g) => <ScoreCard key={g.id} game={g} onSelectTeam={onSelectTeam} />)}
        </div>
      </>
    );

  return (
    <div className="sh-scores-wrap">
      <p className="sh-roster-hint">💡 Click any team to view their roster</p>
      <Section title="🔴 Live"      items={live} />
      <Section title="✅ Final"     items={final} />
      <Section title="🕐 Upcoming" items={scheduled} />
    </div>
  );
};

/* ────────────────────────────────────────────
   Standings Panel
   ──────────────────────────────────────────── */
const StandingsPanel = ({ sport, onSelectTeam }) => {
  const [groups,  setGroups]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
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
      <p className="sh-roster-hint">💡 Click any team row to view their roster</p>
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
              <div
                key={i}
                className={`sh-table-row ${i === 0 ? 'leader' : ''} ${t.id ? 'sh-row-clickable' : ''}`}
                onClick={t.id ? () => onSelectTeam(t) : undefined}
                title={t.id ? `View ${t.name} roster` : undefined}
              >
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
        a.link ? (
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
  const [activeSport,   setActiveSport]   = useState('mlb');
  const [activeTab,     setActiveTab]     = useState('scores');
  const [lastUpdated,   setLastUpdated]   = useState(new Date());
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [selectedTeam,  setSelectedTeam]  = useState(null);

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
    setSelectedTeam(null);
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam({ ...team, sport: activeSport });
  };

  /* ── Roster drill-down ── */
  if (selectedTeam) {
    return (
      <div className="page sh-page">
        <div className="sh-sport-tabs" style={{ marginBottom: 0 }}>
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
        <TeamRosterView
          team={selectedTeam}
          sport={activeSport}
          onBack={() => setSelectedTeam(null)}
        />
      </div>
    );
  }

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
            onSelectTeam={handleSelectTeam}
          />
        )}
        {activeTab === 'standings' && (
          <StandingsPanel
            key={`${activeSport}-standings`}
            sport={activeSport}
            onSelectTeam={handleSelectTeam}
          />
        )}
        {activeTab === 'news' && (
          <NewsPanel key={`${activeSport}-news`} sport={activeSport} />
        )}
      </div>
    </div>
  );
};

export default SportsHub;
