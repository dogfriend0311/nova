import React, { useEffect, useState, useCallback } from 'react';
import { api, hasKey, normalizeGame, normalizeStandings, normalizeStats } from '../../services/sportsDataService';
import './SportsHub.css';

const SPORTS = [
  { id: 'mlb', label: 'MLB',              icon: '⚾', dateBased: true },
  { id: 'nfl', label: 'NFL',              icon: '🏈', dateBased: false },
  { id: 'nba', label: 'NBA',              icon: '🏀', dateBased: true },
  { id: 'nhl', label: 'NHL',              icon: '🏒', dateBased: true },
  { id: 'cfb', label: 'College Football', icon: '🏈', dateBased: false },
];

const SUB_TABS = [
  { id: 'scores',    label: 'Scores',    icon: '📅' },
  { id: 'standings', label: 'Standings', icon: '🏆' },
  { id: 'stats',     label: 'Stats',     icon: '📊' },
];

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
};

const fmtPct = (n) => {
  if (n == null) return '—';
  const v = parseFloat(n);
  return isNaN(v) ? '—' : v.toFixed(3).replace(/^0/, '');
};

/* ── Score Card ── */
const ScoreCard = ({ game }) => {
  const isLive  = game.status === 'InProgress';
  const isFinal = game.status === 'Final' || game.status === 'F';
  const isSched = !isLive && !isFinal;

  return (
    <div className={`sh-score-card ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isSched ? 'scheduled' : ''}`}>
      <div className="sh-card-header">
        {isLive && <><span className="sh-live-dot" />LIVE &nbsp;</>}
        {isLive && game.periodInfo && <span className="sh-period">{game.periodInfo}</span>}
        {isFinal && <span className="sh-status-label">FINAL</span>}
        {isSched && <span className="sh-status-label sched">{fmtTime(game.time) || 'TBD'}</span>}
        {game.channel && <span className="sh-channel">{game.channel}</span>}
      </div>

      <div className="sh-teams">
        <div className={`sh-team-row ${(game.awayScore != null && game.homeScore != null && game.awayScore > game.homeScore) ? 'winner' : ''}`}>
          <span className="sh-team-abbr">{game.awayTeam}</span>
          <span className="sh-team-name">{game.awayTeamName}</span>
          <span className="sh-team-score">{isSched ? '' : (game.awayScore ?? '—')}</span>
        </div>
        <div className={`sh-team-row ${(game.awayScore != null && game.homeScore != null && game.homeScore > game.awayScore) ? 'winner' : ''}`}>
          <span className="sh-team-abbr">{game.homeTeam}</span>
          <span className="sh-team-name">{game.homeTeamName}</span>
          <span className="sh-team-score">{isSched ? '' : (game.homeScore ?? '—')}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Standings Panel ── */
const StandingsPanel = ({ sport, isNHL }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api[sport].standings()
      .then((raw) => setData(normalizeStandings(sport, raw)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load standings: {error}</div>;
  if (!data || !Object.keys(data).length) return <div className="sh-empty">No standings data available.</div>;

  return (
    <div className="sh-standings-wrap">
      {Object.entries(data).map(([div, teams]) => (
        <div key={div} className="sh-standings-group">
          <h3 className="sh-division-title">{div}</h3>
          <div className="sh-standings-table">
            <div className="sh-standings-header">
              <span className="sh-st-team">Team</span>
              <span className="sh-st-num">W</span>
              <span className="sh-st-num">L</span>
              {isNHL && <span className="sh-st-num">PTS</span>}
              <span className="sh-st-num hide-xs">PCT</span>
              <span className="sh-st-num hide-sm">GB</span>
              <span className="sh-st-num hide-md">HOME</span>
              <span className="sh-st-num hide-md">AWAY</span>
              <span className="sh-st-num hide-sm">STRK</span>
            </div>
            {teams.map((t, i) => (
              <div key={i} className={`sh-standings-row ${i === 0 ? 'leader' : ''}`}>
                <span className="sh-st-team">
                  <span className="sh-st-rank">{i + 1}</span>
                  <span className="sh-st-abbr">{t.team}</span>
                  <span className="sh-st-name">{t.city ? `${t.city} ${t.name}` : t.name}</span>
                </span>
                <span className="sh-st-num">{t.wins}</span>
                <span className="sh-st-num">{t.losses}</span>
                {isNHL && <span className="sh-st-num">{t.pts ?? '—'}</span>}
                <span className="sh-st-num hide-xs">{fmtPct(t.pct)}</span>
                <span className="sh-st-num hide-sm">{t.gb != null ? t.gb : '—'}</span>
                <span className="sh-st-num hide-md">{t.home || '—'}</span>
                <span className="sh-st-num hide-md">{t.away || '—'}</span>
                <span className="sh-st-num hide-sm">{t.streak || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Stats Panel ── */
const StatsPanel = ({ sport }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    if (!api[sport].stats) {
      setData({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api[sport].stats()
      .then((raw) => {
        const norm = normalizeStats(sport, raw);
        setData(norm);
        setActiveGroup(Object.keys(norm)[0] || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load stats: {error}</div>;
  if (!data || !Object.keys(data).length) return <div className="sh-empty">No stats data available.</div>;

  const groups = Object.keys(data);

  return (
    <div className="sh-stats-wrap">
      {groups.length > 1 && (
        <div className="sh-stats-tabs">
          {groups.map((g) => (
            <button
              key={g}
              className={`sh-stats-tab ${activeGroup === g ? 'active' : ''}`}
              onClick={() => setActiveGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}
      {activeGroup && (
        <div className="sh-stat-list">
          {(data[activeGroup] || []).map((p, i) => (
            <div key={i} className="sh-stat-row">
              <span className="sh-stat-rank">#{i + 1}</span>
              <div className="sh-stat-player">
                <span className="sh-stat-name">{p.name}</span>
                <span className="sh-stat-team">{p.team}</span>
              </div>
              <div className="sh-stat-right">
                <span className="sh-stat-val">{p.stat}</span>
                <span className="sh-stat-label">{p.statLabel}</span>
              </div>
              <span className="sh-stat-sub hide-xs">{p.sub}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Scores Panel ── */
const ScoresPanel = ({ sport }) => {
  const [games, setGames]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [week, setWeek]       = useState(null);

  const loadScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let raw;
      if (sport === 'nfl' || sport === 'cfb') {
        let currentWeek = week;
        if (!currentWeek) {
          try {
            const cs = await api[sport].currentSeason();
            currentWeek = cs?.ApiSeason
              ? (cs.ApiWeek || cs.Week || 1)
              : (cs?.Week || 1);
          } catch {
            currentWeek = 1;
          }
          setWeek(currentWeek);
        }
        raw = await api[sport].scores(currentWeek);
      } else {
        raw = await api[sport].scores();
      }
      const normalized = Array.isArray(raw) ? raw.map((g) => normalizeGame(sport, g)) : [];
      setGames(normalized);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sport, week]);

  useEffect(() => {
    setWeek(null);
    setGames(null);
  }, [sport]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const isOffseason = sport === 'nfl' || sport === 'cfb';

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error === 'NO_KEY') return null;
  if (error)   return <div className="sh-error">Could not load scores: {error}</div>;

  return (
    <div>
      {isOffseason && week && (
        <p className="sh-week-label">
          {sport === 'nfl' ? 'NFL' : 'College Football'} — Week {week} &nbsp;·&nbsp;
          {[...new Array(3)].map((_, i) => (
            <button key={i} className={`sh-week-btn ${week === i + Math.max(1, week - 1) ? 'active' : ''}`}
              onClick={() => setWeek(Math.max(1, week - 1 + i))}>
              Wk {Math.max(1, week - 1 + i)}
            </button>
          ))}
        </p>
      )}
      {!games || games.length === 0 ? (
        <div className="sh-no-games">
          <div className="sh-no-games-icon">{isOffseason ? '🏕️' : '📅'}</div>
          <p>{isOffseason ? 'Offseason — no games this week.' : 'No games scheduled today.'}</p>
          <p className="sh-no-games-sub">Check the Standings tab for the latest standings.</p>
        </div>
      ) : (
        <div className="sh-scores-grid">
          {games.map((g) => <ScoreCard key={g.id} game={g} />)}
        </div>
      )}
    </div>
  );
};

/* ── No Key Banner ── */
const NoKeyBanner = () => (
  <div className="sh-no-key">
    <div className="sh-no-key-icon">🔑</div>
    <h3>API Key Required</h3>
    <p>
      To load live scores, standings, and stats, add your <strong>sportsdata.io</strong> API key
      as <code>REACT_APP_SPORTSDATA_KEY</code> in your Replit Secrets tab.
    </p>
    <p className="sh-no-key-sub">
      Sign up for a free developer account at{' '}
      <a href="https://sportsdata.io" target="_blank" rel="noreferrer">sportsdata.io</a>,
      then go to <strong>My Account → API Keys</strong> and copy your Subscription Key.
    </p>
  </div>
);

/* ── Main Component ── */
const SportsHub = () => {
  const [activeSport, setActiveSport] = useState('mlb');
  const [activeTab, setActiveTab]     = useState('scores');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshKey, setRefreshKey]   = useState(0);

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

  const sport = SPORTS.find((s) => s.id === activeSport);

  return (
    <div className="page sh-page">
      {/* Header */}
      <div className="page-header sh-header">
        <h1 className="gradient-text">🏆 Sports Hub</h1>
        <p className="subtitle">
          Live scores · Standings · Stats &nbsp;·&nbsp;
          <span className="sh-updated">
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </p>
      </div>

      {!hasKey() && <NoKeyBanner />}

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
          <ScoresPanel key={`${activeSport}-scores-${refreshKey}`} sport={activeSport} />
        )}
        {activeTab === 'standings' && (
          <StandingsPanel key={`${activeSport}-standings`} sport={activeSport} isNHL={activeSport === 'nhl'} />
        )}
        {activeTab === 'stats' && (
          <StatsPanel key={`${activeSport}-stats`} sport={activeSport} />
        )}
      </div>

      {/* Sport season note */}
      {(activeSport === 'nfl' || activeSport === 'cfb') && (
        <p className="sh-season-note">
          {activeSport === 'nfl' ? 'NFL' : 'College Football'} — season runs September through {activeSport === 'nfl' ? 'February' : 'January'}.
          Standings reflect the {sport && `${new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0)}`} season.
        </p>
      )}
    </div>
  );
};

export default SportsHub;
