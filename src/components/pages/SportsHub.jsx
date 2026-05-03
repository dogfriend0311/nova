import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchScoreboard,
  fetchStandings,
  fetchNews,
  fetchGameSummary,
  fetchAllAthletes,
  fetchAthleteProfile,
  fetchAthleteStats,
  normalizeGame,
  normalizeStandings,
  normalizeNews,
  normalizeGameSummary,
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
  { id: 'players',   label: 'Players',   icon: '🔍' },
];

const timeSince = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ────────────────────────────────────────────
   Score Card
   ──────────────────────────────────────────── */
const ScoreCard = ({ game, onSelectGame }) => {
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
    <div
      className={`sh-score-card ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isSched ? 'scheduled' : ''} ${isFinal || isLive ? 'clickable' : ''}`}
      onClick={() => (isFinal || isLive) && onSelectGame && onSelectGame(game)}
      title={(isFinal || isLive) ? 'Click for box score' : ''}
    >
      <div className="sh-card-header">
        {isLive && <><span className="sh-live-dot" /><span className="sh-live-text">LIVE</span></>}
        <span className="sh-status-detail">{game.statusDetail}</span>
        {game.broadcast && <span className="sh-broadcast">{game.broadcast}</span>}
        {(isFinal || isLive) && <span className="sh-detail-hint">Box Score →</span>}
      </div>
      <TeamRow team={game.awayTeam} winner={awayWins} />
      <TeamRow team={game.homeTeam} winner={homeWins} />
    </div>
  );
};

/* ────────────────────────────────────────────
   Scores Panel
   ──────────────────────────────────────────── */
const ScoresPanel = ({ sport, refreshKey, onSelectGame }) => {
  const [games, setGames]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScoreboard(sport);
      const normalized = (data.events || []).map(normalizeGame).filter(Boolean);
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
          {items.map((g) => <ScoreCard key={g.id} game={g} onSelectGame={onSelectGame} />)}
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
   Game Detail View
   ──────────────────────────────────────────── */
const GameDetailView = ({ game, sport, onBack }) => {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchGameSummary(sport, game.id)
      .then(raw => setSummary(normalizeGameSummary(raw)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [game.id, sport]);

  const thStyle = { padding: '8px 10px', color: 'rgba(192,208,255,0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(100,120,200,0.18)', textAlign: 'center' };
  const tdStyle = { padding: '8px 10px', textAlign: 'center', color: 'rgba(192,208,255,0.85)', fontSize: '0.85rem', borderBottom: '1px solid rgba(100,120,200,0.07)' };

  return (
    <div className="sh-detail-view">
      <button className="neon-button" style={{ marginBottom: '20px' }} onClick={onBack}>← Back to Scores</button>

      {/* Game header */}
      <div className="sh-detail-header">
        <div className="sh-detail-team">
          {game.awayTeam.logo
            ? <img src={game.awayTeam.logo} alt={game.awayTeam.abbr} className="sh-detail-logo" />
            : <div className="sh-detail-logo-ph">{game.awayTeam.abbr[0]}</div>
          }
          <span className="sh-detail-abbr">{game.awayTeam.abbr}</span>
          {game.awayTeam.record && <span className="sh-detail-record">{game.awayTeam.record}</span>}
        </div>
        <div className="sh-detail-score-block">
          <div className="sh-detail-scores">
            <span className={`sh-detail-score ${+game.awayTeam.score > +game.homeTeam.score ? 'winner-score' : ''}`}>{game.awayTeam.score}</span>
            <span className="sh-detail-dash">—</span>
            <span className={`sh-detail-score ${+game.homeTeam.score > +game.awayTeam.score ? 'winner-score' : ''}`}>{game.homeTeam.score}</span>
          </div>
          <span className="sh-detail-status">{loading ? '…' : (summary?.status || game.statusDetail)}</span>
        </div>
        <div className="sh-detail-team">
          {game.homeTeam.logo
            ? <img src={game.homeTeam.logo} alt={game.homeTeam.abbr} className="sh-detail-logo" />
            : <div className="sh-detail-logo-ph">{game.homeTeam.abbr[0]}</div>
          }
          <span className="sh-detail-abbr">{game.homeTeam.abbr}</span>
          {game.homeTeam.record && <span className="sh-detail-record">{game.homeTeam.record}</span>}
        </div>
      </div>

      {loading && <div className="sh-loading" style={{ marginTop: '30px' }}><div className="sh-spinner" /></div>}
      {error && <div className="sh-error" style={{ marginTop: '20px' }}>Box score unavailable: {error}</div>}

      {summary && (
        <>
          {/* Line Score */}
          {summary.lineScore && (
            <div className="sh-detail-section">
              <h3 className="sh-detail-section-title">Line Score</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'left', width: '80px' }}>Team</th>
                      {summary.lineScore.periods.map((p, i) => (
                        <th key={i} style={thStyle}>{p.label}</th>
                      ))}
                      {summary.lineScore.extras.map((e, i) => (
                        <th key={`ex-${i}`} style={{ ...thStyle, color: 'var(--color-cyan)' }}>{e.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: game.awayTeam.abbr, key: 'away' },
                      { label: game.homeTeam.abbr, key: 'home' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: '700', color: 'var(--color-cyan)' }}>{row.label}</td>
                        {summary.lineScore.periods.map((p, i) => (
                          <td key={i} style={tdStyle}>{p[row.key]}</td>
                        ))}
                        {summary.lineScore.extras.map((e, i) => (
                          <td key={`ex-${i}`} style={{ ...tdStyle, fontWeight: '700', color: 'var(--color-cyan)' }}>{e[row.key]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Team Stats */}
          {summary.teamStats.length === 2 && summary.teamStats[0].stats.length > 0 && (
            <div className="sh-detail-section">
              <h3 className="sh-detail-section-title">Team Stats</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Stat</th>
                      <th style={thStyle}>{summary.teamStats[0].abbr || summary.teamStats[0].name}</th>
                      <th style={thStyle}>{summary.teamStats[1].abbr || summary.teamStats[1].name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.teamStats[0].stats.slice(0, 12).map((s, i) => {
                      const s2 = summary.teamStats[1].stats[i];
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, color: 'rgba(192,208,255,0.5)', fontSize: '0.78rem' }}>{s.label}</td>
                          <td style={tdStyle}>{s.value}</td>
                          <td style={tdStyle}>{s2?.value || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Player Stats */}
          {summary.playerGroups.map((group, gi) => (
            group.categories.length > 0 && (
              <div key={gi} className="sh-detail-section">
                <h3 className="sh-detail-section-title">{group.teamName}</h3>
                {group.categories.map((cat, ci) => (
                  cat.athletes.length > 0 && (
                    <div key={ci} style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{cat.name}</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + cat.keys.length * 60}px` }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, textAlign: 'left' }}>Player</th>
                              {cat.keys.map((k, ki) => <th key={ki} style={thStyle}>{k}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {cat.athletes.map((a, ai) => (
                              <tr key={ai}>
                                <td style={{ ...tdStyle, textAlign: 'left' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {a.photo && <img src={a.photo} alt={a.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                                    <span style={{ color: 'rgba(192,208,255,0.9)' }}>{a.name}</span>
                                    {a.position && <span style={{ fontSize: '0.72rem', color: 'rgba(192,208,255,0.35)' }}>{a.position}</span>}
                                  </div>
                                </td>
                                {a.stats.map((v, vi) => <td key={vi} style={tdStyle}>{v || '—'}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )
          ))}

          {summary.playerGroups.length === 0 && summary.teamStats.length === 0 && !summary.lineScore && (
            <div className="sh-empty" style={{ marginTop: '24px' }}>Detailed stats not available for this game.</div>
          )}
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────
   Player Search Panel
   ──────────────────────────────────────────── */
const PlayerSearchPanel = ({ sport }) => {
  const [query, setQuery]                 = useState('');
  const [results, setResults]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [selectedId, setSelectedId]       = useState(null);
  const [playerData, setPlayerData]       = useState(null);
  const [statsLoading, setStatsLoading]   = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedId(null);
    setPlayerData(null);
    try {
      const all = await fetchAllAthletes(sport);
      const q = query.trim().toLowerCase();
      const filtered = all.filter(a => (a.displayName || '').toLowerCase().includes(q));
      setResults(filtered.slice(0, 10));
      if (!filtered.length) setError('No players found. Try a different name.');
    } catch (e2) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAthlete = async (athlete) => {
    if (selectedId === athlete.id) { setSelectedId(null); setPlayerData(null); return; }
    setSelectedId(athlete.id);
    setPlayerData(null);
    setStatsLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.allSettled([
        fetchAthleteProfile(sport, athlete.id),
        fetchAthleteStats(sport, athlete.id),
      ]);
      const profile  = profileRes.status === 'fulfilled' ? profileRes.value?.athlete : null;
      const statsCat = statsRes.status  === 'fulfilled'
        ? (statsRes.value?.categories || [])
        : [];
      setPlayerData({ profile, statsCat });
    } catch (_) {
      setPlayerData({ profile: null, statsCat: [] });
    } finally {
      setStatsLoading(false);
    }
  };

  const thS = { padding: '7px 10px', color: 'rgba(192,208,255,0.45)', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(100,120,200,0.18)', textAlign: 'center' };
  const tdS = { padding: '7px 10px', textAlign: 'center', color: 'rgba(192,208,255,0.82)', fontSize: '0.83rem', borderBottom: '1px solid rgba(100,120,200,0.07)' };

  return (
    <div className="sh-players-panel">
      <div className="sh-players-header">
        <h3 className="gradient-text-cyan">🔍 Player Lookup</h3>
        <p style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.85rem', marginTop: '6px' }}>Search for any player across all ESPN sports</p>
      </div>

      <form className="sh-search-form" onSubmit={handleSearch}>
        <input
          className="sh-search-input"
          type="text"
          placeholder="Search player name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="neon-button sh-search-btn" type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Search'}
        </button>
      </form>

      {error && <div className="sh-error" style={{ marginTop: '14px' }}>{error}</div>}

      {results.length > 0 && (
        <div className="sh-search-results">
          <p style={{ fontSize: '0.78rem', color: 'rgba(192,208,255,0.4)', marginBottom: '10px' }}>{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          {results.map((athlete) => (
            <div key={athlete.id} className="sh-athlete-result">
              <button
                className={`sh-athlete-btn ${selectedId === athlete.id ? 'selected' : ''}`}
                onClick={() => handleSelectAthlete(athlete)}
              >
                <div className="sh-athlete-left">
                  <img
                    src={athlete.headshotUrl}
                    alt={athlete.displayName}
                    className="sh-athlete-photo"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="sh-athlete-info">
                    <span className="sh-athlete-name">{athlete.displayName || '—'}</span>
                    <span className="sh-athlete-meta">
                      {[athlete.teamName, athlete.position && `#${athlete.jersey || ''} ${athlete.position}`].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
                <span className="sh-athlete-toggle">{selectedId === athlete.id ? '▲' : '▼'}</span>
              </button>

              {selectedId === athlete.id && (
                <div className="sh-athlete-detail">
                  {statsLoading && <div className="sh-loading" style={{ padding: '20px 0' }}><div className="sh-spinner" /></div>}

                  {!statsLoading && playerData && (
                    <>
                      {playerData.profile && (
                        <div className="sh-athlete-profile">
                          {playerData.profile.headshot?.href && (
                            <img src={playerData.profile.headshot.href} alt={playerData.profile.displayName} className="sh-profile-photo" />
                          )}
                          <div className="sh-profile-info">
                            <h4 style={{ color: 'var(--color-cyan)', margin: '0 0 6px', fontSize: '1rem' }}>{playerData.profile.displayName}</h4>
                            {playerData.profile.team?.displayName && (
                              <p style={{ margin: '0 0 4px', color: 'rgba(192,208,255,0.7)', fontSize: '0.85rem' }}>{playerData.profile.team.displayName}</p>
                            )}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {playerData.profile.position?.displayName && (
                                <span className="sh-profile-badge">{playerData.profile.position.displayName}</span>
                              )}
                              {playerData.profile.jersey && (
                                <span className="sh-profile-badge">#{playerData.profile.jersey}</span>
                              )}
                              {playerData.profile.age && (
                                <span className="sh-profile-badge">Age {playerData.profile.age}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {playerData.statsCat.length > 0 ? (
                        <div style={{ marginTop: '16px' }}>
                          <h4 style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Stats</h4>
                          {playerData.statsCat.slice(0, 1).map((cat, ci) => (
                            <div key={ci} style={{ marginBottom: '16px' }}>
                              <h5 style={{ fontSize: '0.75rem', color: 'rgba(192,208,255,0.35)', marginBottom: '8px' }}>{cat.displayName || cat.name}</h5>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      <th style={thS}>Year</th>
                                      {(cat.labels || []).map((lbl, li) => (
                                        <th key={li} style={thS}>{lbl}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.values(cat.statistics || {}).slice(0, 5).map((row, ri) => (
                                      <tr key={ri}>
                                        <td style={tdS}>{row.season?.year || '—'}</td>
                                        {(row.stats || []).map((val, vi) => (
                                          <td key={vi} style={tdS}>{val}</td>
                                        ))}
                                      </tr>
                                    ))}
                                    {cat.totals?.length > 0 && (
                                      <tr style={{ borderTop: '1px solid rgba(100,120,200,0.2)' }}>
                                        <td style={{ ...tdS, color: 'var(--color-cyan)', fontWeight: '700' }}>Career</td>
                                        {cat.totals.map((val, vi) => (
                                          <td key={vi} style={{ ...tdS, fontWeight: '600' }}>{val}</td>
                                        ))}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.85rem', marginTop: '14px' }}>
                          No stats available for this player.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="sh-no-games" style={{ marginTop: '30px' }}>
          <div className="sh-no-games-icon">🔍</div>
          <p>Search for a player to see their profile and season stats.</p>
          <p className="sh-no-games-sub">Try "Aaron Judge", "Patrick Mahomes", or any player name.</p>
        </div>
      )}
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
        a.link ? (
          <a key={a.id} href={a.link} target="_blank" rel="noreferrer" className="sh-news-card">
            {a.image && <img src={a.image} alt="" className="sh-news-img" loading="lazy" />}
            <div className="sh-news-body">
              <h4 className="sh-news-headline">{a.headline}</h4>
              {a.description && <p className="sh-news-desc">{a.description}</p>}
              <span className="sh-news-meta">{a.byline && <>{a.byline} &nbsp;·&nbsp; </>}{timeSince(a.published)}</span>
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
  const [selectedGame, setSelectedGame] = useState(null);

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
    setSelectedGame(null);
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSelectedGame(null);
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
  };

  return (
    <div className="page sh-page">
      <div className="page-header sh-header">
        <h1 className="gradient-text">🏆 Sports Hub</h1>
        <p className="subtitle">
          Powered by ESPN &nbsp;·&nbsp; Live scores · Standings · News &nbsp;·&nbsp;
          <span className="sh-updated">
            {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </p>
      </div>

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

      <div className="sh-sub-tabs">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            className={`sh-sub-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="sh-content">
        {selectedGame ? (
          <GameDetailView game={selectedGame} sport={activeSport} onBack={() => setSelectedGame(null)} />
        ) : (
          <>
            {activeTab === 'scores' && (
              <ScoresPanel key={`${activeSport}-scores`} sport={activeSport} refreshKey={refreshKey} onSelectGame={handleSelectGame} />
            )}
            {activeTab === 'standings' && (
              <StandingsPanel key={`${activeSport}-standings`} sport={activeSport} />
            )}
            {activeTab === 'news' && (
              <NewsPanel key={`${activeSport}-news`} sport={activeSport} />
            )}
            {activeTab === 'players' && (
              <PlayerSearchPanel key={`${activeSport}-players`} sport={activeSport} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SportsHub;
