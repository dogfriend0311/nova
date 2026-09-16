import React, { useEffect, useState } from 'react';
import {
  Archive, Award, BarChart3, Check, ChevronRight, Crown,
  Flame, Plus, Radio, ScrollText, ShieldHalf, Star, Trash2, Trophy, Users, X,
} from 'lucide-react';
import db from './services/db';
import { getAccoladeTypes, accoladeIcon } from './data/accolades';
import './SeasonHub.css';

/* ── Small local helpers (kept local like the rest of the league tabs
   — see the same pattern in ViztaLeague.jsx / LeagueFeatures.jsx) ── */
const getPlayerLabel = (p) => p?.nickname || p?.player_name || 'Unknown player';
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmtVal = (v, fmt) => {
  const n = num(v);
  if (n === null) return '—';
  if (fmt === 'avg3') return n.toFixed(3);
  if (fmt === 'avg2') return n.toFixed(2);
  if (fmt === 'avg1') return n.toFixed(1);
  return Math.round(n).toLocaleString();
};

// A season "matches" an accolade/archive record if its free-text label
// (e.g. "2026", "Season 7") shows up in the record's own text — accolades
// only ever had a loose text `season` field before this feature existed,
// so matching is intentionally forgiving rather than a strict foreign key.
const seasonMatches = (season, text) => {
  if (!season || !text) return false;
  const needle = String(text).toLowerCase();
  return needle.includes(String(season.season_number)) || needle.includes(String(season.label).toLowerCase());
};

const SECTIONS = [
  { id: 'standings',    label: 'Standings',    Icon: BarChart3 },
  { id: 'leaders',      label: 'Leaders',      Icon: Trophy },
  { id: 'awards',       label: 'Awards',       Icon: Award },
  { id: 'playoffs',     label: 'Playoffs',     Icon: ShieldHalf },
  { id: 'transactions', label: 'Transactions', Icon: Radio },
  { id: 'allstars',     label: 'All-Stars',    Icon: Star },
  { id: 'records',      label: 'Records',      Icon: ScrollText },
  { id: 'champions',    label: 'Champions',    Icon: Crown },
  { id: 'statistics',   label: 'Statistics',   Icon: Flame },
];

/* ── Root: season picker + section switcher ─────────────────────── */
export const SeasonHubTab = ({ sport, cfg }) => {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSeasonId, setActiveSeasonId] = useState(null);
  const [activeSection, setActiveSection] = useState('standings');
  const [showNewSeason, setShowNewSeason] = useState(false);

  const load = () => {
    db.getSeasons(sport).then(list => {
      const rows = Array.isArray(list) ? list : [];
      setSeasons(rows);
      setActiveSeasonId(prev => (prev && rows.some(s => s.id === prev)) ? prev : (rows[0]?.id || null));
      setLoading(false);
    });
  };
  useEffect(load, [sport]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSeason = seasons.find(s => s.id === activeSeasonId) || null;

  const createSeason = async (draft) => {
    const saved = await db.saveSeason(sport, draft);
    setShowNewSeason(false);
    setSeasons(prev => [saved, ...prev].sort((a, b) => (b.season_number || 0) - (a.season_number || 0)));
    setActiveSeasonId(saved.id);
  };

  if (loading) return <div className="lh-loading">Opening the season hub…</div>;

  return (
    <div className="lh-feature-page">
      <div className="lh-section-head">
        <div><h2>Season Hub</h2><p className="lh-section-note">Every season gets its own archive — standings, leaders, awards, the playoff bracket, transactions, and more, all frozen in place.</p></div>
        <span className="lh-section-tag"><Archive size={12} /> {seasons.length} season{seasons.length === 1 ? '' : 's'}</span>
      </div>

      <div className="sh-season-row">
        <div className="sh-season-pills">
          {seasons.map(s => (
            <button key={s.id} className={`sh-season-pill ${s.id === activeSeasonId ? 'active' : ''}`} onClick={() => setActiveSeasonId(s.id)}>
              <span>{s.label}</span>
              {s.status && <small className={`sh-status-dot sh-status-${s.status}`} />}
            </button>
          ))}
          <button className="sh-season-pill sh-season-add" onClick={() => setShowNewSeason(true)}><Plus size={13} /> New season</button>
        </div>
        {activeSeason && (
          <button className="sh-row-delete sh-season-delete" title={`Delete ${activeSeason.label}`} onClick={async () => {
            if (!window.confirm(`Delete ${activeSeason.label} and everything archived under it? This can't be undone.`)) return;
            await db.deleteSeason(sport, activeSeason.id);
            setSeasons(prev => prev.filter(s => s.id !== activeSeason.id));
            setActiveSeasonId(null);
          }}><Trash2 size={14} /></button>
        )}
      </div>

      {showNewSeason && (
        <NewSeasonForm
          nextNumber={(Math.max(0, ...seasons.map(s => s.season_number || 0)) || 0) + 1}
          onCancel={() => setShowNewSeason(false)}
          onSave={createSeason}
        />
      )}

      {!activeSeason ? (
        <div className="lh-empty">No seasons archived yet. Start with “New season” above — you can fill in real numbers later or just set up the template now.</div>
      ) : (
        <>
          <div className="sh-subnav">
            {SECTIONS.map(sec => (
              <button key={sec.id} className={`sh-subnav-btn ${activeSection === sec.id ? 'active' : ''}`} onClick={() => setActiveSection(sec.id)}>
                <sec.Icon size={14} /> {sec.label}
              </button>
            ))}
          </div>
          <SectionBody
            section={activeSection}
            sport={sport}
            cfg={cfg}
            season={activeSeason}
            onSeasonChange={(patch) => {
              const updated = { ...activeSeason, ...patch };
              setSeasons(prev => prev.map(s => (s.id === updated.id ? updated : s)));
            }}
          />
        </>
      )}
    </div>
  );
};

const NewSeasonForm = ({ nextNumber, onCancel, onSave }) => {
  const [draft, setDraft] = useState({ season_number: nextNumber, label: `Season ${nextNumber}`, status: 'upcoming' });
  return (
    <form className="lh-card sh-new-season-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); }}>
      <div className="lh-form-two">
        <label>Season #<input type="number" value={draft.season_number} onChange={e => setDraft({ ...draft, season_number: parseInt(e.target.value, 10) || 0 })} /></label>
        <label>Label<input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="Season 7" /></label>
      </div>
      <label>Status
        <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <div className="sh-form-actions">
        <button className="lh-primary-action" type="submit"><Check size={14} /> Save season</button>
        <button type="button" className="sh-ghost-btn" onClick={onCancel}><X size={14} /> Cancel</button>
      </div>
    </form>
  );
};

const SectionBody = (props) => {
  switch (props.section) {
    case 'standings':    return <StandingsSection {...props} />;
    case 'leaders':      return <LeadersSection {...props} />;
    case 'awards':       return <AccoladesSection {...props} kind="awards" />;
    case 'playoffs':     return <PlayoffsSection {...props} />;
    case 'transactions': return <TransactionsSection {...props} />;
    case 'allstars':     return <AccoladesSection {...props} kind="allstars" />;
    case 'records':      return <RecordsSection {...props} section="records" />;
    case 'champions':    return <ChampionsSection {...props} />;
    case 'statistics':   return <StatisticsSection {...props} />;
    default:              return null;
  }
};

/* ── Standings ───────────────────────────────────────────────────── */
const StandingsSection = ({ sport, season }) => {
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pulling, setPulling] = useState(false);
  const [editing, setEditing] = useState(null); // row being added/edited

  const load = () => { db.getSeasonStandings(sport, season.id).then(r => setRows(Array.isArray(r) ? r : [])); };
  useEffect(load, [sport, season.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { db.getTeams(sport).then(t => setTeams(Array.isArray(t) ? t : [])); }, [sport]);

  // Computes W-L-T-PF-PA for every team from every final game currently
  // logged, the same math powerRankingsService uses for Power Rankings —
  // this is the "auto" half of standings; nothing here is season-tagged
  // yet, so it reflects the league's current game log as a whole.
  const pullLive = async () => {
    setPulling(true);
    const games = await db.getBsGames(sport);
    const records = new Map();
    const ensure = (name) => { if (!records.has(name)) records.set(name, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 }); return records.get(name); };
    (Array.isArray(games) ? games : []).filter(g => g.status === 'final').forEach(g => {
      const hs = num(g.home_score), as = num(g.away_score);
      if (hs === null || as === null || !g.home_team || !g.away_team) return;
      const home = ensure(g.home_team), away = ensure(g.away_team);
      home.pf += hs; home.pa += as; away.pf += as; away.pa += hs;
      if (hs === as) { home.ties++; away.ties++; }
      else if (hs > as) { home.wins++; away.losses++; }
      else { away.wins++; home.losses++; }
    });
    const computed = [...records.entries()].map(([team_name, r]) => ({
      team_name, wins: r.wins, losses: r.losses, ties: r.ties,
      points_for: r.pf, points_against: r.pa, source: 'auto',
    }));
    if (computed.length) await db.saveSeasonStandingRows(sport, season.id, computed);
    setPulling(false);
    load();
  };

  const saveRow = async (row) => {
    await db.saveSeasonStandingRows(sport, season.id, [{ ...row, source: 'manual' }]);
    setEditing(null);
    load();
  };
  const removeRow = async (id) => { await db.deleteSeasonStanding(sport, id); load(); };

  const sorted = [...rows].sort((a, b) => {
    const aPct = (a.wins + a.ties * 0.5) / Math.max(1, a.wins + a.losses + a.ties);
    const bPct = (b.wins + b.ties * 0.5) / Math.max(1, b.wins + b.losses + b.ties);
    return bPct - aPct;
  });
  const leaderWins = sorted[0] ? sorted[0].wins - sorted[0].losses : 0;

  return (
    <div className="sh-section">
      <div className="sh-section-toolbar">
        <button className="lh-primary-action" onClick={pullLive} disabled={pulling}><BarChart3 size={14} /> {pulling ? 'Pulling…' : 'Pull live records'}</button>
        <button className="sh-ghost-btn" onClick={() => setEditing({ team_name: '', wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 })}><Plus size={14} /> Add / edit team row</button>
      </div>
      {editing && <StandingRowForm teams={teams} draft={editing} onCancel={() => setEditing(null)} onSave={saveRow} />}
      {sorted.length === 0 ? <div className="lh-empty">No standings logged for {season.label} yet. Pull live records or add rows manually.</div> : (
        <div className="lh-card sh-table-wrap">
          <table className="sh-table">
            <thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>GB</th><th>PF</th><th>PA</th><th /></tr></thead>
            <tbody>
              {sorted.map((r, i) => {
                const games = r.wins + r.losses + r.ties;
                const pct = games ? (r.wins + r.ties * 0.5) / games : 0;
                const gb = i === 0 ? '—' : (((leaderWins - (r.wins - r.losses)) / 2)).toFixed(1);
                return (
                  <tr key={r.id || r.team_name} onClick={() => setEditing(r)}>
                    <td className="sh-team-cell">{i === 0 && <Crown size={12} color="var(--accent)" />} {r.team_name}</td>
                    <td>{r.wins}</td><td>{r.losses}</td><td>{r.ties || 0}</td>
                    <td>{pct.toFixed(3)}</td><td>{gb}</td>
                    <td>{r.points_for ?? '—'}</td><td>{r.points_against ?? '—'}</td>
                    <td><button className="sh-row-delete" onClick={(e) => { e.stopPropagation(); removeRow(r.id); }}><Trash2 size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StandingRowForm = ({ teams, draft, onCancel, onSave }) => {
  const [row, setRow] = useState(draft);
  return (
    <form className="lh-card sh-inline-form" onSubmit={(e) => { e.preventDefault(); onSave(row); }}>
      <div className="lh-form-two">
        <label>Team
          <select value={row.team_name} onChange={e => setRow({ ...row, team_name: e.target.value })}>
            <option value="">Choose team</option>
            {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
          </select>
        </label>
        <label>Seed<input type="number" value={row.seed || ''} onChange={e => setRow({ ...row, seed: parseInt(e.target.value, 10) || null })} /></label>
      </div>
      <div className="sh-stat-grid">
        <label>W<input type="number" value={row.wins} onChange={e => setRow({ ...row, wins: parseInt(e.target.value, 10) || 0 })} /></label>
        <label>L<input type="number" value={row.losses} onChange={e => setRow({ ...row, losses: parseInt(e.target.value, 10) || 0 })} /></label>
        <label>T<input type="number" value={row.ties} onChange={e => setRow({ ...row, ties: parseInt(e.target.value, 10) || 0 })} /></label>
        <label>PF<input type="number" value={row.points_for} onChange={e => setRow({ ...row, points_for: parseFloat(e.target.value) || 0 })} /></label>
        <label>PA<input type="number" value={row.points_against} onChange={e => setRow({ ...row, points_against: parseFloat(e.target.value) || 0 })} /></label>
      </div>
      <div className="sh-form-actions">
        <button className="lh-primary-action" type="submit" disabled={!row.team_name}><Check size={14} /> Save row</button>
        <button type="button" className="sh-ghost-btn" onClick={onCancel}><X size={14} /> Cancel</button>
      </div>
    </form>
  );
};

/* ── Leaders (live, auto) ────────────────────────────────────────── */
const LeadersSection = ({ sport, cfg }) => {
  const [players, setPlayers] = useState([]);
  useEffect(() => { db.getPlayers(sport).then(p => setPlayers(Array.isArray(p) ? p : [])); }, [sport]);

  const groups = [{ label: cfg.catA.label, cats: cfg.leadersA }, { label: cfg.catB.label, cats: cfg.leadersB }];

  return (
    <div className="sh-section">
      <div className="lh-feature-notice">Pulled live from current player stats — this will keep reflecting whoever's leading until the season is marked completed.</div>
      {groups.map(group => (
        <div key={group.label} className="sh-leader-group">
          <span className="lh-panel-kicker">{group.label.toUpperCase()}</span>
          <div className="sh-leader-cards">
            {group.cats.map(cat => {
              const top = [...players]
                .filter(p => num(p[cat.seasonField]) !== null)
                .sort((a, b) => cat.hi ? (num(b[cat.seasonField]) - num(a[cat.seasonField])) : (num(a[cat.seasonField]) - num(b[cat.seasonField])))
                .slice(0, 3);
              return (
                <div key={cat.label} className="lh-card sh-leader-card">
                  <div className="lh-feature-panel-head"><div><h3>{cat.label}</h3></div><Trophy size={14} color="var(--accent)" /></div>
                  {top.length === 0 ? <div className="lh-empty">No data yet.</div> : top.map((p, i) => (
                    <div key={p.id} className="sh-leader-row-mini">
                      <span className={`lh-record-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</span>
                      <span className="sh-leader-name">{getPlayerLabel(p)}</span>
                      <strong>{fmtVal(p[cat.seasonField], cat.fmt)}</strong>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Awards / All-Stars (reuse the existing accolades table) ──────── */
const AccoladesSection = ({ sport, season, kind }) => {
  const [accolades, setAccolades] = useState([]);
  useEffect(() => { db.getAccolades(sport).then(a => setAccolades(Array.isArray(a) ? a : [])); }, [sport]);

  const types = getAccoladeTypes(sport);
  const typeLabel = (a) => a.type === 'custom' ? (a.custom_label || 'Custom Award') : (types.find(t => t.key === a.type)?.label || a.type);

  const filtered = accolades.filter(a => {
    const isAllStar = a.type === 'all_star';
    if (kind === 'allstars' && !isAllStar) return false;
    if (kind === 'awards' && isAllStar) return false;
    return seasonMatches(season, a.season);
  });

  const grouped = filtered.reduce((map, a) => {
    const key = typeLabel(a);
    (map[key] = map[key] || []).push(a);
    return map;
  }, {});

  return (
    <div className="sh-section">
      {Object.keys(grouped).length === 0 ? (
        <div className="lh-empty">
          No {kind === 'allstars' ? 'All-Star selections' : 'awards'} tagged “{season.label}” yet.
          Add them from a player's page or the Owner Dashboard awards panel — just tag the season as “{season.label}” (or “{season.season_number}”) so it shows up here.
        </div>
      ) : (
        <div className="lh-archive-grid">
          {Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="lh-card sh-award-card">
              <div className="lh-feature-panel-head"><div><h3>{label}</h3></div><Award size={15} color="var(--accent)" /></div>
              <div className="lh-record-book-list">
                {items.map(a => (
                  <div className="lh-record-book-row" key={a.id}>
                    <span className="sh-award-icon">{accoladeIcon(a)}</span>
                    <div className="lh-record-stat"><strong>{a.player_name}</strong>{a.custom_label && a.type === 'custom' && <small>{a.custom_label}</small>}</div>
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

/* ── Playoffs ────────────────────────────────────────────────────── */
const PlayoffsSection = ({ sport, season, onSeasonChange }) => {
  const [teams, setTeams] = useState([]);
  const [bracket, setBracket] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { db.getTeams(sport).then(t => setTeams(Array.isArray(t) ? t : [])); }, [sport]);
  useEffect(() => {
    db.getSeasonPlayoffs(sport, season.id).then(row => setBracket(row?.bracket || []));
  }, [sport, season.id]);

  const save = async (next) => {
    setBracket(next);
    setSaving(true);
    await db.saveSeasonPlayoffs(sport, season.id, next);
    setSaving(false);
  };

  const addRound = () => save([...bracket, { name: `Round ${bracket.length + 1}`, matchups: [] }]);
  const addMatchup = (ri) => save(bracket.map((r, i) => i === ri ? { ...r, matchups: [...r.matchups, { id: Date.now().toString(), teamA: '', teamB: '', scoreA: '', scoreB: '' }] } : r));
  const updateMatchup = (ri, mi, patch) => save(bracket.map((r, i) => i === ri ? { ...r, matchups: r.matchups.map((m, j) => j === mi ? { ...m, ...patch } : m) } : r));
  const removeMatchup = (ri, mi) => save(bracket.map((r, i) => i === ri ? { ...r, matchups: r.matchups.filter((_, j) => j !== mi) } : r));
  const removeRound = (ri) => save(bracket.filter((_, i) => i !== ri));

  const winnerOf = (m) => {
    if (m.winner) return m.winner;
    const a = num(m.scoreA), b = num(m.scoreB);
    if (a === null || b === null || a === b) return null;
    return a > b ? m.teamA : m.teamB;
  };

  const finalRound = bracket[bracket.length - 1];
  const finalMatch = finalRound?.matchups?.[finalRound.matchups.length - 1];
  const finalWinner = finalMatch ? winnerOf(finalMatch) : null;

  const useAsChampion = async () => {
    if (!finalWinner) return;
    const loser = finalMatch.teamA === finalWinner ? finalMatch.teamB : finalMatch.teamA;
    await db.saveSeason(sport, { ...season, champion_team: finalWinner, runner_up_team: loser, champion_source: 'bracket' });
    onSeasonChange({ champion_team: finalWinner, runner_up_team: loser, champion_source: 'bracket' });
  };

  return (
    <div className="sh-section">
      <div className="sh-section-toolbar">
        <button className="lh-primary-action" onClick={addRound} disabled={saving}><Plus size={14} /> Add round</button>
        {finalWinner && <button className="sh-ghost-btn" onClick={useAsChampion}><Crown size={14} /> Use {finalWinner} as season champion</button>}
      </div>
      {bracket.length === 0 ? <div className="lh-empty">No bracket set up yet for {season.label}. Add a round to get started.</div> : (
        <div className="sh-bracket">
          {bracket.map((round, ri) => (
            <div key={ri} className="lh-card sh-bracket-round">
              <div className="lh-feature-panel-head"><div><h3>{round.name}</h3></div><button className="sh-row-delete" onClick={() => removeRound(ri)}><Trash2 size={13} /></button></div>
              {round.matchups.map((m, mi) => {
                const w = winnerOf(m);
                return (
                  <div key={m.id} className="sh-matchup-row">
                    <input placeholder="Team A" list="sh-team-names" value={m.teamA} onChange={e => updateMatchup(ri, mi, { teamA: e.target.value })} className={w && w === m.teamA ? 'sh-winner' : ''} />
                    <input placeholder="Score" type="number" value={m.scoreA} onChange={e => updateMatchup(ri, mi, { scoreA: e.target.value })} />
                    <ChevronRight size={13} color="rgba(158,165,196,0.4)" />
                    <input placeholder="Team B" list="sh-team-names" value={m.teamB} onChange={e => updateMatchup(ri, mi, { teamB: e.target.value })} className={w && w === m.teamB ? 'sh-winner' : ''} />
                    <input placeholder="Score" type="number" value={m.scoreB} onChange={e => updateMatchup(ri, mi, { scoreB: e.target.value })} />
                    <button className="sh-row-delete" onClick={() => removeMatchup(ri, mi)}><Trash2 size={13} /></button>
                  </div>
                );
              })}
              <button className="sh-ghost-btn sh-add-matchup" onClick={() => addMatchup(ri)}><Plus size={13} /> Add matchup</button>
            </div>
          ))}
        </div>
      )}
      <datalist id="sh-team-names">{teams.map(t => <option key={t.id} value={t.team_name} />)}</datalist>
    </div>
  );
};

/* ── Transactions (season-scoped) ───────────────────────────────── */
const TransactionsSection = ({ sport, cfg, season }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [draft, setDraft] = useState({ playerName: '', type: 'Signing', fromTeam: '', toTeam: '', note: '' });

  const load = () => { db.getSeasonTransactions(sport, season.id).then(t => setTransactions(Array.isArray(t) ? t : [])); };
  useEffect(load, [sport, season.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([db.getPlayers(sport), db.getTeams(sport)]).then(([p, t]) => {
      setPlayers(Array.isArray(p) ? p : []); setTeams(Array.isArray(t) ? t : []);
    });
  }, [sport]);

  const save = async (e) => {
    e.preventDefault();
    if (!draft.playerName || !draft.toTeam) return;
    await db.addSeasonTransaction(sport, { season_id: season.id, ...draft });
    setDraft({ playerName: '', type: 'Signing', fromTeam: '', toTeam: '', note: '' });
    load();
  };
  const remove = async (id) => { await db.deleteSeasonTransaction(sport, id); load(); };

  return (
    <div className="sh-section">
      <div className="lh-transaction-layout">
        <form className="lh-card lh-transaction-form" onSubmit={save}>
          <div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">{season.label.toUpperCase()}</span><h3>Log a move</h3></div><Radio size={16} color="var(--accent)" /></div>
          <label>Player<input list="sh-player-names" value={draft.playerName} onChange={e => setDraft({ ...draft, playerName: e.target.value })} placeholder="Player name" /></label>
          <datalist id="sh-player-names">{players.map(p => <option key={p.id} value={getPlayerLabel(p)} />)}</datalist>
          <label>Move type<select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}><option>Signing</option><option>Trade</option><option>Release</option><option>Call-up</option><option>Retirement</option></select></label>
          <div className="lh-form-two">
            <label>From<input value={draft.fromTeam} onChange={e => setDraft({ ...draft, fromTeam: e.target.value })} placeholder="Free Agent" /></label>
            <label>To<select value={draft.toTeam} onChange={e => setDraft({ ...draft, toTeam: e.target.value })}><option value="">Choose team</option>{teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}</select></label>
          </div>
          <label>Note<input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="Optional context" /></label>
          <button className="lh-primary-action" type="submit">Publish to {season.label} wire</button>
        </form>
        <div className="lh-card lh-feature-panel">
          <div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">{cfg.label.toUpperCase()}</span><h3>{season.label} movement</h3></div><Users size={16} color="var(--accent)" /></div>
          {transactions.length === 0 ? <div className="lh-empty">No moves logged for {season.label} yet.</div> : (
            <div className="lh-transaction-list">
              {transactions.map(item => (
                <div className="lh-transaction-row" key={item.id}>
                  <div className="lh-transaction-badge">{(item.type || '').slice(0, 3).toUpperCase()}</div>
                  <div className="lh-transaction-main"><strong>{item.player_name || item.playerName}</strong><span>{item.from_team || item.fromTeam || 'Free Agent'} <b>→</b> {item.to_team || item.toTeam}</span>{item.note && <small>{item.note}</small>}</div>
                  <time>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                  <button className="sh-row-delete" onClick={() => remove(item.id)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Records / Statistics highlights (shared shape, different section) */
const RecordsSection = ({ sport, season, section }) => {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({ category: '', player_name: '', team_name: '', value: '', note: '' });

  const load = () => { db.getSeasonRecords(sport, season.id, section).then(r => setRows(Array.isArray(r) ? r : [])); };
  useEffect(load, [sport, season.id, section]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    if (!draft.category || !draft.player_name) return;
    await db.addSeasonRecord(sport, { season_id: season.id, section, ...draft });
    setDraft({ category: '', player_name: '', team_name: '', value: '', note: '' });
    load();
  };
  const remove = async (id) => { await db.deleteSeasonRecord(sport, id); load(); };

  return (
    <div className="sh-section">
      <form className="lh-card sh-inline-form" onSubmit={save}>
        <div className="lh-feature-panel-head"><div><span className="lh-panel-kicker">{season.label.toUpperCase()}</span><h3>Log a {section === 'records' ? 'record' : 'stat line'}</h3></div><ScrollText size={16} color="var(--accent)" /></div>
        <div className="lh-form-two">
          <label>Category<input value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="Most home runs" /></label>
          <label>Value<input value={draft.value} onChange={e => setDraft({ ...draft, value: e.target.value })} placeholder="41" /></label>
        </div>
        <div className="lh-form-two">
          <label>Player<input value={draft.player_name} onChange={e => setDraft({ ...draft, player_name: e.target.value })} /></label>
          <label>Team<input value={draft.team_name} onChange={e => setDraft({ ...draft, team_name: e.target.value })} /></label>
        </div>
        <label>Note<input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="Optional context" /></label>
        <button className="lh-primary-action" type="submit"><Plus size={14} /> Add</button>
      </form>
      {rows.length === 0 ? <div className="lh-empty">Nothing logged for {season.label} yet.</div> : (
        <div className="lh-card lh-feature-panel">
          <div className="lh-record-book-list">
            {rows.map(r => (
              <div className="lh-record-book-row" key={r.id}>
                <span className="lh-record-rank">{r.value || '—'}</span>
                <div className="lh-record-stat"><strong>{r.category}</strong>{r.note && <small>{r.note}</small>}</div>
                <div className="lh-record-holder"><b>{r.player_name}</b><small>{r.team_name || 'Unassigned'}</small></div>
                <button className="sh-row-delete" onClick={() => remove(r.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatisticsSection = (props) => {
  const { sport, cfg } = props;
  const [players, setPlayers] = useState([]);
  useEffect(() => { db.getPlayers(sport).then(p => setPlayers(Array.isArray(p) ? p : [])); }, [sport]);
  const fields = [...cfg.leadersA, ...cfg.leadersB];

  return (
    <div className="sh-section">
      <div className="lh-feature-notice">Full stat sheet, pulled live from current player data.</div>
      {players.length === 0 ? <div className="lh-empty">No players yet.</div> : (
        <div className="lh-card sh-table-wrap">
          <table className="sh-table">
            <thead><tr><th>Player</th><th>Team</th>{fields.map(f => <th key={f.label}>{f.label}</th>)}</tr></thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td>{getPlayerLabel(p)}</td><td>{p.team || 'FA'}</td>
                  {fields.map(f => <td key={f.label}>{fmtVal(p[f.seasonField], f.fmt)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <RecordsSection {...props} section="statistics" />
    </div>
  );
};

/* ── Champions ───────────────────────────────────────────────────── */
const ChampionsSection = ({ sport, season, onSeasonChange }) => {
  const [draft, setDraft] = useState({ champion_team: season.champion_team || '', runner_up_team: season.runner_up_team || '', notes: season.notes || '' });
  useEffect(() => { setDraft({ champion_team: season.champion_team || '', runner_up_team: season.runner_up_team || '', notes: season.notes || '' }); }, [season.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const patch = { ...draft, champion_source: 'manual' };
    await db.saveSeason(sport, { ...season, ...patch });
    onSeasonChange(patch);
  };

  return (
    <div className="sh-section">
      <div className="lh-card sh-champion-card">
        <Crown size={34} color="var(--accent)" />
        {season.champion_team ? (
          <>
            <h3>{season.champion_team}</h3>
            <p>{season.label} Champion{season.champion_source === 'bracket' ? ' · set from the playoff bracket' : ''}</p>
            {season.runner_up_team && <small>Runner-up: {season.runner_up_team}</small>}
          </>
        ) : (
          <p className="lh-empty" style={{ marginTop: 10 }}>No champion crowned for {season.label} yet.</p>
        )}
      </div>
      <form className="lh-card sh-inline-form" onSubmit={save}>
        <div className="lh-form-two">
          <label>Champion<input value={draft.champion_team} onChange={e => setDraft({ ...draft, champion_team: e.target.value })} /></label>
          <label>Runner-up<input value={draft.runner_up_team} onChange={e => setDraft({ ...draft, runner_up_team: e.target.value })} /></label>
        </div>
        <label>Notes<input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="How the title was won" /></label>
        <button className="lh-primary-action" type="submit"><Check size={14} /> Save</button>
      </form>
      <p className="sh-hint">Tip: set the winning matchup on the Playoffs tab and use “Use as season champion” there to fill this in automatically.</p>
    </div>
  );
};

export default SeasonHubTab;
