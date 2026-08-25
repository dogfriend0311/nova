import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive, ArrowDown, ArrowUp, ArrowUpRight, Bookmark, Check, Database,
  Minus, Radio, Sparkles, Trophy, Users,
} from 'lucide-react';
import db from './services/db';
import { awardXP } from './services/reputationService';
import { computePowerRankings } from './services/powerRankingsService';
import './ViztaLeague.css';

const num = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const valueOrDash = (value, fmt = 'int') => {
  const parsed = num(value);
  if (parsed === null) return '—';
  if (fmt === 'avg3') return parsed.toFixed(3);
  if (fmt === 'avg2') return parsed.toFixed(2);
  if (fmt === 'avg1') return parsed.toFixed(1);
  return Math.round(parsed).toLocaleString();
};

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('nova_user') || 'null'); }
  catch { return null; }
};

const readList = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeList = (key, list) => localStorage.setItem(key, JSON.stringify(list));

const getPlayerLabel = (player) => player?.nickname || player?.player_name || 'Unknown player';

/* ── League Record Book ───────────────────────────────────────── */
export const LeagueRecordsTab = ({ sport, cfg }) => {
  const [players, setPlayers] = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getBoxScores(sport)])
      .then(([nextPlayers, nextScores]) => {
        setPlayers(Array.isArray(nextPlayers) ? nextPlayers : []);
        setBoxScores(Array.isArray(nextScores) ? nextScores : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sport]);

  const playerById = useMemo(() => new Map(players.map(player => [String(player.id), player])), [players]);
  const seasonRows = [...cfg.leadersA, ...cfg.leadersB].map(stat => {
    const leader = players
      .map(player => ({ player, value: num(player[stat.seasonField]) }))
      .filter(row => row.value !== null)
      .sort((a, b) => stat.hi ? b.value - a.value : a.value - b.value)[0];
    return leader ? { ...stat, leader, type: 'Season' } : null;
  }).filter(Boolean);
  const careerRows = [...cfg.leadersA, ...cfg.leadersB].map(stat => {
    const leader = players
      .map(player => ({ player, value: num(player[stat.careerField]) }))
      .filter(row => row.value !== null)
      .sort((a, b) => stat.hi ? b.value - a.value : a.value - b.value)[0];
    return leader ? { ...stat, leader, type: 'Career' } : null;
  }).filter(Boolean);
  const gameRows = cfg.boxFields.map(field => {
    const leader = boxScores
      .map(score => ({ score, value: num(score[field]) }))
      .filter(row => row.value !== null)
      .sort((a, b) => b.value - a.value)[0];
    if (!leader) return null;
    return {
      label: cfg.boxLabels[field] || field.toUpperCase(),
      leader: {
        player: playerById.get(String(leader.score.player_id)),
        value: leader.value,
      },
      fmt: 'int',
      type: 'Single Game',
    };
  }).filter(row => row?.leader?.player);

  if (loading) return <div className="lh-loading">Opening the record book…</div>;

  const RecordList = ({ rows, empty }) => (
    rows.length === 0 ? <div className="lh-empty">{empty}</div> : (
      <div className="lh-record-book-list">
        {rows.map((row, index) => (
          <div className="lh-record-book-row" key={`${row.type}-${row.label}`}>
            <span className="lh-record-rank">{String(index + 1).padStart(2, '0')}</span>
            <div className="lh-record-stat"><strong>{row.label}</strong><small>{row.type} record</small></div>
            <div className="lh-record-holder"><b>{getPlayerLabel(row.leader.player)}</b><small>{row.leader.player.team || 'Unassigned'}</small></div>
            <strong className="lh-record-value">{valueOrDash(row.leader.value, row.fmt)}</strong>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head">
        <div><h2>League Record Book</h2><p className="lh-section-note">The names attached to the biggest numbers in {cfg.label} history.</p></div>
        <span className="lh-section-tag"><Trophy size={12} /> {players.length} players indexed</span>
      </div>
      <div className="lh-feature-hero">
        <div className="lh-feature-hero-mark"><Trophy size={20} /></div>
        <div><span className="lh-panel-kicker">NOVA ARCHIVE / RECORDS</span><h3>Make the number matter.</h3><p>Season, career, and single-game marks are calculated from the league data already logged.</p></div>
        <div className="lh-feature-hero-count"><b>{seasonRows.length + careerRows.length + gameRows.length}</b><span>records surfaced</span></div>
      </div>
      <div className="lh-record-columns">
        <div className="lh-card lh-feature-panel"><div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">CURRENT CAMPAIGN</span><h3>Season records</h3></div><Radio size={16} color="var(--accent)" /></div><RecordList rows={seasonRows} empty="Season records appear once player stats are entered." /></div>
        <div className="lh-card lh-feature-panel"><div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">ALL TIME</span><h3>Career records</h3></div><Archive size={16} color="var(--accent)" /></div><RecordList rows={careerRows} empty="Career records appear once player history is entered." /></div>
      </div>
      <div className="lh-card lh-feature-panel"><div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">BOX SCORE VAULT</span><h3>Single-game records</h3></div><Database size={16} color="var(--accent)" /></div><RecordList rows={gameRows} empty="Single-game records appear once box scores are logged." /></div>
    </div>
  );
};

/* ── Transaction Wire ──────────────────────────────────────────── */
export const TransactionsTab = ({ sport, cfg }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [draft, setDraft] = useState({ playerId: '', type: 'Signing', fromTeam: '', toTeam: '', note: '' });
  const storageKey = `nova_transactions_${sport}`;

  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getTeams(sport)]).then(([p, t]) => {
      setPlayers(Array.isArray(p) ? p : []);
      setTeams(Array.isArray(t) ? t : []);
    });
    setTransactions(readList(storageKey));
  }, [sport, storageKey]);

  const saveTransaction = (event) => {
    event.preventDefault();
    const player = players.find(item => String(item.id) === String(draft.playerId));
    if (!player || !draft.toTeam) return;
    const transaction = {
      id: `${Date.now()}-${player.id}`,
      playerId: player.id,
      playerName: getPlayerLabel(player),
      type: draft.type,
      fromTeam: draft.fromTeam || player.team || 'Free Agent',
      toTeam: draft.toTeam,
      note: draft.note.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [transaction, ...transactions];
    setTransactions(next);
    writeList(storageKey, next);
    setDraft({ playerId: '', type: 'Signing', fromTeam: '', toTeam: '', note: '' });
  };

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head">
        <div><h2>Transaction Wire</h2><p className="lh-section-note">Roster movement, signings, trades, and call-ups in one clean feed.</p></div>
        <span className="lh-section-tag"><Radio size={12} /> {transactions.length} moves</span>
      </div>
      <div className="lh-transaction-layout">
        <form className="lh-card lh-transaction-form" onSubmit={saveTransaction}>
          <div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">COMMISSIONER ENTRY</span><h3>Log a move</h3></div><ArrowUpRight size={16} color="var(--accent)" /></div>
          <label>Player<select value={draft.playerId} onChange={event => setDraft({ ...draft, playerId: event.target.value })}><option value="">Choose player</option>{players.map(player => <option key={player.id} value={player.id}>{getPlayerLabel(player)}{player.team ? ` · ${player.team}` : ''}</option>)}</select></label>
          <label>Move type<select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}><option>Signing</option><option>Trade</option><option>Release</option><option>Call-up</option><option>Retirement</option></select></label>
          <div className="lh-form-two"><label>From<input value={draft.fromTeam} onChange={event => setDraft({ ...draft, fromTeam: event.target.value })} placeholder="Free Agent" /></label><label>To<select value={draft.toTeam} onChange={event => setDraft({ ...draft, toTeam: event.target.value })}><option value="">Choose team</option>{teams.map(team => <option key={team.id} value={team.team_name}>{team.team_name}</option>)}</select></label></div>
          <label>Note<input value={draft.note} onChange={event => setDraft({ ...draft, note: event.target.value })} placeholder="Optional context" /></label>
          <button className="lh-primary-action" type="submit">Publish to wire</button>
        </form>
        <div className="lh-card lh-feature-panel">
          <div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">{cfg.label.toUpperCase()}</span><h3>Latest movement</h3></div><Users size={16} color="var(--accent)" /></div>
          {transactions.length === 0 ? <div className="lh-empty">No moves logged yet. Add the first transaction from the commissioner entry panel.</div> : (
            <div className="lh-transaction-list">{transactions.map(item => <div className="lh-transaction-row" key={item.id}><div className="lh-transaction-badge">{item.type.slice(0, 3).toUpperCase()}</div><div className="lh-transaction-main"><strong>{item.playerName}</strong><span>{item.fromTeam} <b>→</b> {item.toTeam}</span>{item.note && <small>{item.note}</small>}</div><time>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></div>)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Power Rankings ───────────────────────────────────────────── */
const MovementBadge = ({ movement }) => {
  if (movement === null) return <span className="lh-pr-movement new">NEW</span>;
  if (movement > 0) return <span className="lh-pr-movement up"><ArrowUp size={12} />{movement}</span>;
  if (movement < 0) return <span className="lh-pr-movement down"><ArrowDown size={12} />{Math.abs(movement)}</span>;
  return <span className="lh-pr-movement same"><Minus size={12} /></span>;
};

export const PowerRankingsTab = ({ sport, cfg }) => {
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getTeams(sport), db.getGames(sport)]).then(([t, g]) => {
      setTeams(Array.isArray(t) ? t : []);
      setGames(Array.isArray(g) ? g : []);
      setLoading(false);
    });
  }, [sport]);

  const { weeks, currentWeek, previousWeek, rankings } = useMemo(
    () => computePowerRankings({ teams, games, week: selectedWeek }),
    [teams, games, selectedWeek]
  );

  if (loading) return <div className="lh-feature-page"><div className="lh-empty">Loading…</div></div>;

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head">
        <div>
          <h2>Power Rankings</h2>
          <p className="lh-section-note">An algorithm-generated 1–{rankings.length || 'N'} ranking, blending win rate, recent form, and scoring margin.</p>
        </div>
        {weeks.length > 0 && (
          <select className="lh-pr-week-select" value={currentWeek ?? ''} onChange={e => setSelectedWeek(Number(e.target.value))}>
            {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
        )}
      </div>

      {weeks.length === 0 ? (
        <div className="lh-empty">No power rankings yet — set a week number on a game (Owner Dashboard → {cfg.label} → Games) and mark it Final to start building rankings.</div>
      ) : (
        <>
          <div className="lh-power-list">
            {rankings.map(team => (
              <div className="lh-pr-row" key={team.id}>
                <span className={`lh-power-rank ${team.rank <= 3 ? 'top' : ''}`}>{String(team.rank).padStart(2, '0')}</span>
                {team.logo_url ? <img src={team.logo_url} alt="" /> : <span className="lh-power-logo" style={{ background: team.team_color || 'var(--accent)' }} />}
                <div className="lh-power-name">
                  <strong>{team.team_name}</strong>
                  <span className="lh-pr-record">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''} · {team.avgMargin >= 0 ? '+' : ''}{team.avgMargin.toFixed(1)} avg margin</span>
                </div>
                <MovementBadge movement={team.movement} />
                <div className="lh-power-score"><b>{(team.score * 100).toFixed(1)}</b><span>POWER SCORE</span></div>
              </div>
            ))}
          </div>
          <p className="lh-impact-footnote">
            Through Week {currentWeek}{previousWeek !== null ? ` · movement vs Week ${previousWeek}` : ' · first ranked week — no prior week to compare yet'}.
          </p>
        </>
      )}
    </div>
  );
};

/* ── Season Archive ────────────────────────────────────────────── */
export const SeasonArchiveTab = ({ sport, cfg }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [archive, setArchive] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([db.getPlayers(sport), db.getTeams(sport), db.getBsGames(sport), db.getSeasonArchive(sport)])
      .then(([p, t, g, a]) => {
        setPlayers(Array.isArray(p) ? p : []);
        setTeams(Array.isArray(t) ? t : []);
        setGames(Array.isArray(g) ? g : []);
        setArchive(Array.isArray(a) ? a : []);
      });
  };
  useEffect(load, [sport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot every numeric season field this sport tracks (see
  // sportsConfig.js seasonA/seasonB) for every player, so any of those
  // stats can be charted season-over-season later on the player page
  // (PlayerDevelopmentArcPanel's "Career Arc" view), not just one
  // predetermined "key stat".
  const seasonFields = [...cfg.seasonA, ...cfg.seasonB].map(([f]) => f);

  const snapshot = async () => {
    setSaving(true);
    const topPlayer = [...players].sort((a, b) => (num(b.overall) || 0) - (num(a.overall) || 0))[0];
    const item = {
      season: new Date().getFullYear(),
      teams_count: teams.length,
      players_count: players.length,
      games_count: games.length,
      top_player: topPlayer ? getPlayerLabel(topPlayer) : 'No leader yet',
      league_label: cfg.label,
    };
    const playerSnapshots = players.map(p => {
      const stats = {};
      seasonFields.forEach(f => { const v = num(p[f]); if (v !== null) stats[f] = v; });
      return { player_id: p.id, player_name: getPlayerLabel(p), stats };
    }).filter(p => Object.keys(p.stats).length > 0);

    await db.saveSeasonArchive(sport, item, playerSnapshots);
    setSaving(false);
    load();
  };

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head"><div><h2>Season Archive</h2><p className="lh-section-note">Freeze a season so the league’s story stays browsable after the standings move on — and so each player's stat history builds up over time.</p></div><span className="lh-section-tag"><Archive size={12} /> {archive.length} snapshots</span></div>
      <div className="lh-archive-current lh-card"><div><span className="lh-panel-kicker">CURRENT SNAPSHOT</span><h3>{cfg.label} / {new Date().getFullYear()}</h3><p>{teams.length} teams · {players.length} players · {games.length} logged games</p></div><button className="lh-primary-action" onClick={snapshot} disabled={saving}><Archive size={15} /> {saving ? 'Saving…' : 'Save season snapshot'}</button></div>
      {archive.length === 0 ? <div className="lh-empty">No seasons archived yet. Save a snapshot when you want to preserve this league state.</div> : (
        <div className="lh-archive-grid">{archive.map(item => <div className="lh-card lh-archive-card" key={item.id}><div className="lh-archive-card-top"><span>{item.season}</span><small>{new Date(item.captured_at).toLocaleDateString()}</small></div><strong>{item.league_label}</strong><div className="lh-archive-stats"><span><b>{item.teams_count}</b> teams</span><span><b>{item.players_count}</b> players</span><span><b>{item.games_count}</b> games</span></div><div className="lh-archive-leader">Top rated <b>{item.top_player}</b></div></div>)}</div>
      )}
    </div>
  );
};

/* ── Community Predictions ────────────────────────────────────── */
export const CommunityPredictionsTab = ({ sport, cfg }) => {
  const [games, setGames] = useState([]);
  const [predictions, setPredictions] = useState({});
  const user = readUser();
  const username = user?.username;
  const storageKey = `nova_predictions_${sport}_${username || 'guest'}`;

  useEffect(() => {
    db.getBsGames(sport).then(next => setGames(Array.isArray(next) ? next : []));
    setPredictions(readList(storageKey).reduce((map, item) => ({ ...map, [item.gameId]: item }), {}));
  }, [sport, storageKey]);

  const isOpen = (game) => {
    const status = String(game.status || game.game_status || '').toLowerCase();
    if (status) return !['final', 'completed', 'complete'].includes(status);
    return game.home_score === null || game.home_score === undefined || game.away_score === null || game.away_score === undefined;
  };
  const openGames = games.filter(isOpen).slice(0, 8);
  const vote = (game, choice) => {
    if (!username) return;
    const item = { gameId: game.id, choice, home: game.home_team, away: game.away_team, createdAt: new Date().toISOString() };
    const list = Object.values({ ...predictions, [game.id]: item });
    setPredictions({ ...predictions, [game.id]: item });
    writeList(storageKey, list);
    awardXP(username, 2);
  };

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head"><div><h2>Community Predictions</h2><p className="lh-section-note">Make your call before the scoreboard updates, then build an accuracy history.</p></div><span className="lh-section-tag"><Sparkles size={12} /> Fan forecast</span></div>
      {!username && <div className="lh-feature-notice">Sign in to save predictions to your profile. You can still see which games are open.</div>}
      {openGames.length === 0 ? <div className="lh-empty">No open games are available for predictions right now.</div> : (
        <div className="lh-prediction-grid">{openGames.map(game => {
          const selected = predictions[game.id]?.choice;
          return <div className="lh-card lh-prediction-card" key={game.id}><div className="lh-prediction-top"><span>OPEN PICK</span><time>{game.game_date ? new Date(game.game_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Date TBD'}</time></div><h3>{game.game_name || 'Upcoming matchup'}</h3><div className="lh-prediction-teams"><button className={selected === 'home' ? 'selected' : ''} onClick={() => vote(game, 'home')} disabled={!username}><b>{game.home_team || 'Home'}</b><span>HOME</span></button><i>VS</i><button className={selected === 'away' ? 'selected' : ''} onClick={() => vote(game, 'away')} disabled={!username}><b>{game.away_team || 'Away'}</b><span>AWAY</span></button></div>{selected && <div className="lh-prediction-saved"><Check size={13} /> Pick saved</div>}</div>;
        })}</div>
      )}
      <div className="lh-card lh-prediction-footnote"><Database size={16} /><span>Predictions are community picks, not wagers. Your saved history stays attached to your Nova username.</span></div>
    </div>
  );
};

/* ── Player Watchlists ─────────────────────────────────────────── */
export const WatchlistsTab = ({ sport, cfg, onSelectPlayer }) => {
  const [players, setPlayers] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [search, setSearch] = useState('');
  const user = readUser();
  const username = user?.username;

  useEffect(() => {
    db.getPlayers(sport).then(next => setPlayers(Array.isArray(next) ? next : []));
    if (username) db.getWatchlist(username).then(next => setWatchlist(Array.isArray(next) ? next.filter(item => item.league === sport) : []));
  }, [sport, username]);

  const watchedIds = new Set(watchlist.map(item => String(item.player_id || item.playerId)));
  const visiblePlayers = players.filter(player => `${getPlayerLabel(player)} ${player.team || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30);
  const toggle = async (player) => {
    if (!username) return;
    const exists = watchedIds.has(String(player.id));
    const next = exists
      ? watchlist.filter(item => String(item.player_id || item.playerId) !== String(player.id))
      : [...watchlist, { player_id: player.id, player_name: getPlayerLabel(player), team: player.team || '', league: sport }];
    setWatchlist(next);
    const all = await db.getWatchlist(username);
    const otherLeagues = (all || []).filter(item => item.league !== sport);
    await db.saveWatchlist(username, [...otherLeagues, ...next]);
  };

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head"><div><h2>Player Watchlists</h2><p className="lh-section-note">Keep the players you care about one click away across every league day.</p></div><span className="lh-section-tag"><Bookmark size={12} /> {watchlist.length} followed</span></div>
      {!username ? <div className="lh-feature-notice">Sign in to create a personal watchlist and keep it synced across devices.</div> : (
        <>
          <div className="lh-watchlist-toolbar"><div className="lh-watchlist-search"><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${cfg.shortLabel} players`} /><span>{visiblePlayers.length} shown</span></div><div className="lh-watchlist-sync"><span /> SYNCED TO PROFILE</div></div>
          <div className="lh-watchlist-grid">{visiblePlayers.map(player => { const watched = watchedIds.has(String(player.id)); return <div className={`lh-watchlist-row ${watched ? 'watched' : ''}`} key={player.id}><button className="lh-watchlist-player" onClick={() => onSelectPlayer?.(player)}><span className="lh-watchlist-avatar">{player.avatar_data ? <img src={player.avatar_data} alt="" /> : (getPlayerLabel(player)[0] || '?')}</span><span><strong>{getPlayerLabel(player)}</strong><small>{player.team || 'Free Agent'} · OVR {player.overall || '—'}</small></span></button><button className="lh-watchlist-action" onClick={() => toggle(player)} aria-pressed={watched}>{watched ? <><Check size={14} /> Watching</> : <><Bookmark size={14} /> Watch</>}</button></div>; })}</div>
        </>
      )}
    </div>
  );
};

/* ── Savant Spray / Shot Map ───────────────────────────────────── */
const mapPoints = {
  vizta: [[50, 20], [28, 38], [72, 38], [19, 68], [50, 78], [81, 68]],
  hockey: [[50, 20], [23, 35], [77, 35], [24, 68], [76, 68], [50, 80]],
  football: [[50, 15], [25, 32], [75, 32], [19, 67], [81, 67], [50, 84]],
};

export const LeagueImpactMap = ({ player, playerScores, cfg }) => {
  const metrics = cfg.boxFields.map(field => ({
    field,
    label: cfg.boxLabels[field] || field.toUpperCase(),
    value: playerScores.reduce((total, score) => total + (num(score[field]) || 0), 0),
  })).filter(metric => metric.value > 0);
  const coordinates = playerScores.map(score => {
    const x = num(score.x ?? score.location_x ?? score.shot_x ?? score.zone_x);
    const y = num(score.y ?? score.location_y ?? score.shot_y ?? score.zone_y);
    return x === null || y === null ? null : { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  }).filter(Boolean);
  const points = coordinates.length ? coordinates : metrics.slice(0, 6).map((metric, index) => ({ x: mapPoints[cfg.key]?.[index]?.[0] || 50, y: mapPoints[cfg.key]?.[index]?.[1] || 50, metric }));
  const maxMetric = Math.max(1, ...metrics.map(metric => metric.value));
  const variant = cfg.key === 'vizta' ? 'baseball' : cfg.key === 'hockey' ? 'hockey' : 'football';

  return (
    <div className="lh-impact-map-card">
      <div className="lh-impact-map-head"><div><span className="lh-panel-kicker">{variant === 'baseball' ? 'SAVANT SPRAY' : 'SHOT / IMPACT MAP'}</span><h3>{getPlayerLabel(player)}</h3></div><span className="lh-impact-map-note">{coordinates.length ? `${coordinates.length} plotted events` : 'Derived from logged stats'}</span></div>
      <div className={`lh-impact-map ${variant}`}>
        <svg viewBox="0 0 100 100" role="img" aria-label={`${variant} impact map for ${getPlayerLabel(player)}`}>
          {variant === 'baseball' && <><path d="M50 85 L12 50 L50 15 L88 50 Z" className="lh-map-field-line" /><path d="M50 85 L50 15 M12 50 L88 50" className="lh-map-field-line faint" /><circle cx="50" cy="50" r="15" className="lh-map-ring" /><path d="M50 85 l-3 -3 m3 3 l3 -3" className="lh-map-home" /></>}
          {variant === 'hockey' && <><rect x="8" y="12" width="84" height="76" rx="17" className="lh-map-rink" /><line x1="50" y1="12" x2="50" y2="88" className="lh-map-field-line" /><circle cx="50" cy="50" r="14" className="lh-map-ring" /><circle cx="50" cy="50" r="2" className="lh-map-dot" /></>}
          {variant === 'football' && <><rect x="10" y="8" width="80" height="84" className="lh-map-football" />{[20, 32, 44, 56, 68, 80].map(line => <line key={line} x1="10" y1={line} x2="90" y2={line} className="lh-map-field-line faint" />)}<line x1="50" y1="8" x2="50" y2="92" className="lh-map-field-line" /></>}
          {points.map((point, index) => {
            const radius = point.metric ? 3 + (point.metric.value / maxMetric) * 6 : 4;
            return <g key={`${point.x}-${point.y}-${index}`}><circle cx={point.x} cy={point.y} r={radius} className="lh-map-point" /><circle cx={point.x} cy={point.y} r="1.5" className="lh-map-point-core" /></g>;
          })}
        </svg>
        {!points.length && <div className="lh-impact-map-empty">Log box-score events to populate the map.</div>}
      </div>
      <div className="lh-impact-legend">{metrics.length ? metrics.slice(0, 6).map(metric => <span key={metric.field}><i style={{ '--metric-size': `${3 + (metric.value / maxMetric) * 6}px` }} />{metric.label} <b>{metric.value}</b></span>) : <span>No logged event metrics yet.</span>}</div>
      <p className="lh-impact-footnote">{coordinates.length ? 'Plotted from coordinate fields on logged events.' : 'This view uses logged event totals until location coordinates are added to box scores.'}</p>
    </div>
  );
};
