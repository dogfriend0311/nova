import React, { useState, useEffect, useMemo } from 'react';
import db, { sortByDisplayOrder } from '../services/db';
import { accoladeLabel, accoladeIcon } from '../data/accolades';
import { RowsSkeleton } from './Skeleton';

// A small, fixed palette so each selected player gets a stable, readable
// color regardless of team colors (unlike the 2-player Comparison Lab,
// this tool can have 4 players on screen at once, so team colors alone
// would get muddy/duplicated too often).
const PALETTE = ['#5e81f4', '#ff9e57', '#5ee6a8', '#e089ff'];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const toRad = (deg) => (deg * Math.PI) / 180;
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const normalize = (value, max, lowerBetter) => {
  const v = Number.isFinite(value) ? value : 0;
  const m = Number.isFinite(max) && max > 0 ? max : 1;
  return lowerBetter ? clamp01(1 - v / m) : clamp01(v / m);
};

/** Generalized N-player radar chart — same visual language as
 *  components/RadarChart.jsx (which is locked to exactly 2 series for the
 *  existing Comparison Lab), but built to take an arbitrary list of
 *  { name, color, values } series instead. */
const MultiRadarChart = ({ axes, series, size = 300 }) => {
  if (!axes || axes.length < 3 || !series || series.length === 0) return null;
  const cx = size / 2, cy = size / 2, radius = size * 0.34;
  const n = axes.length;
  const angleStep = 360 / n;
  const pointFor = (i, frac) => {
    const angle = toRad(-90 + i * angleStep);
    return [cx + Math.cos(angle) * radius * frac, cy + Math.sin(angle) * radius * frac];
  };
  const seriesPoints = (values) => axes
    .map((ax, i) => pointFor(i, normalize(values[i], ax.max, ax.lowerBetter)))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <polygon key={frac} points={axes.map((_, i) => pointFor(i, frac).join(',')).join(' ')} fill="none" stroke="rgba(158,165,196,0.15)" strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pointFor(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(158,165,196,0.15)" strokeWidth="1" />;
        })}
        {axes.map((ax, i) => {
          const [x, y] = pointFor(i, 1.2);
          return (
            <text key={ax.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.038} fill="rgba(158,165,196,0.65)">
              {ax.label}
            </text>
          );
        })}
        {/* reversed so the first-picked player draws on top */}
        {[...series].reverse().map((s) => (
          <polygon key={s.name} points={seriesPoints(s.values)} fill={s.color} fillOpacity="0.15" stroke={s.color} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 4 }}>
        {series.map((s) => (
          <span key={s.name} style={{ fontSize: '0.75rem', color: s.color }}>&#9679; {s.name}</span>
        ))}
      </div>
    </div>
  );
};

const CATEGORIES = [
  { id: 'batting',  label: 'Batting' },
  { id: 'pitching', label: 'Pitching' },
  { id: 'fielding', label: 'Fielding' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'career',   label: 'Career' },
  { id: 'awards',   label: 'Awards' },
];

/**
 * Player Comparison Tool — pick 2 to 4 players from a league and compare
 * them across category tabs, with a radar chart + stat table per tab.
 * Generalized across every sport in sportsConfig: Batting/Pitching map to
 * cfg.compareA/compareB, Advanced maps to cfg.leadersA/leadersB (the same
 * fields the Savant/percentile card uses), Fielding uses cfg.compareF if a
 * league defines one (most don't yet — shown as "not tracked" rather than
 * fabricated), Career re-runs Batting+Pitching against career fields, and
 * Awards pulls POTM + season accolade counts from the awards tables.
 *
 * Props:
 *   sport            — league key (e.g. 'vizta')
 *   cfg              — sportsConfig entry for that league
 *   presetPlayerIds  — optional array of player ids to preload (e.g. handed
 *                      off from a player page's "Comparable Players" panel)
 */
const PlayerComparisonTool = ({ sport, cfg, presetPlayerIds }) => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pickerValue, setPickerValue] = useState('');
  const [mode, setMode] = useState('season');
  const [category, setCategory] = useState('batting');
  const [potmAwards, setPotmAwards] = useState([]);
  const [accolades, setAccolades] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([db.getPlayers(sport), db.getTeams(sport), db.getPotmAwards(sport), db.getAccolades(sport)])
      .then(([p, t, potm, acc]) => {
        setPlayers(p || []);
        setTeams(t || []);
        setPotmAwards(potm || []);
        setAccolades(acc || []);
        setLoading(false);
      });
  }, [sport]);

  useEffect(() => {
    if (presetPlayerIds && presetPlayerIds.length) {
      setSelectedIds(presetPlayerIds.map(String).slice(0, 4));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPlayerIds]);

  const getTeamColor = (name) => teams.find((t) => t.team_name === name)?.team_color || null;

  const selected = useMemo(
    () => selectedIds.map((id) => players.find((p) => String(p.id) === String(id))).filter(Boolean),
    [selectedIds, players]
  );

  const colorFor = (playerId, i) => {
    const p = players.find((pl) => String(pl.id) === String(playerId));
    return (p && getTeamColor(p.team)) || PALETTE[i % PALETTE.length];
  };

  const addPlayer = (id) => {
    if (!id || selectedIds.includes(id) || selectedIds.length >= 4) return;
    setSelectedIds((prev) => [...prev, id]);
    setPickerValue('');
  };
  const removePlayer = (id) => setSelectedIds((prev) => prev.filter((x) => x !== id));

  if (loading) return <RowsSkeleton rows={6} />;

  // ── Stat lists per category ─────────────────────────────────────
  const STAT_LIST =
    category === 'batting' ? cfg.compareA :
    category === 'pitching' ? cfg.compareB :
    category === 'fielding' ? (cfg.compareF || []) :
    category === 'career' ? [...cfg.compareA, ...cfg.compareB] :
    []; // advanced/awards render their own layout below

  const effectiveMode = category === 'career' ? 'career' : mode;
  const lowerBetter = new Set(cfg.lowerBetter);

  const leagueMaxFor = (field) => players.reduce((max, p) => {
    const v = num(p[field]);
    return v !== null && v > max ? v : max;
  }, 0);

  const LEADER_LIST = [...(cfg.leadersA || []), ...(cfg.leadersB || [])];

  const radarAxes = (category === 'batting' || category === 'pitching')
    ? (category === 'batting' ? cfg.leadersA : cfg.leadersB).map((l) => ({
        label: l.label,
        max: leagueMaxFor(effectiveMode === 'season' ? l.seasonField : l.careerField),
        lowerBetter: !l.hi,
      }))
    : category === 'advanced'
      ? LEADER_LIST.map((l) => ({ label: l.label, max: leagueMaxFor(l.seasonField), lowerBetter: !l.hi }))
      : null;

  const radarSeries = radarAxes ? selected.map((p, i) => ({
      name: p.nickname || p.player_name,
      color: colorFor(p.id, i),
      values: (category === 'advanced' ? LEADER_LIST : (category === 'batting' ? cfg.leadersA : cfg.leadersB)).map((l) => {
        const field = category === 'advanced' || effectiveMode === 'season' ? l.seasonField : l.careerField;
        return num(p[field]) || 0;
      }),
    })) : null;

  const getVal = (p, sKey, cKey) => {
    const raw = effectiveMode === 'season' ? p[sKey] : p[cKey];
    return raw === null || raw === undefined || raw === '' ? '--' : String(raw);
  };
  const bestIndex = (row) => {
    const vals = selected.map((p) => { const n = num(getVal(p, row[1], row[2])); return n; });
    const known = vals.filter((v) => v !== null);
    if (known.length < 2) return -1;
    const wantLow = lowerBetter.has(row[0]);
    const best = wantLow ? Math.min(...known) : Math.max(...known);
    // -1 if it's a tie across everyone (nothing to highlight)
    return vals.filter((v) => v === best).length === 1 ? vals.indexOf(best) : -1;
  };

  // ── Awards tallies ───────────────────────────────────────────────
  const awardsFor = (p) => ({
    potm: potmAwards.filter((a) => String(a.player_id) === String(p.id)),
    accolades: sortByDisplayOrder(accolades.filter((a) => String(a.player_id) === String(p.id))),
  });

  return (
    <div>
      {/* Player picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        {selected.map((p, i) => (
          <span
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 12px',
              borderRadius: 999, background: `${colorFor(p.id, i)}22`,
              border: `1px solid ${colorFor(p.id, i)}55`, color: colorFor(p.id, i), fontSize: '0.82rem', fontWeight: 700,
            }}
          >
            {p.nickname || p.player_name}
            <button
              onClick={() => removePlayer(String(p.id))}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, padding: 0 }}
              aria-label={`Remove ${p.player_name}`}
            >
              ×
            </button>
          </span>
        ))}
        {selected.length < 4 && (
          <select
            className="lh-vs-select"
            value={pickerValue}
            onChange={(e) => addPlayer(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">+ Add player…</option>
            {players.filter((p) => !selectedIds.includes(String(p.id))).map((p) => (
              <option key={p.id} value={String(p.id)}>{p.player_name}{p.team ? ` (${p.team})` : ''} OVR {p.overall}</option>
            ))}
          </select>
        )}
      </div>

      {selected.length < 2 ? (
        <div className="lh-empty">Select at least two players to compare.</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div className="lh-toggle-group">
              {CATEGORIES.map((c) => (
                <button key={c.id} className={`lh-toggle-btn ${category === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>

          {category !== 'career' && category !== 'awards' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div className="lh-toggle-group">
                {['season', 'career'].map((m) => (
                  <button key={m} className={`lh-toggle-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{m}</button>
                ))}
              </div>
            </div>
          )}

          {category === 'awards' ? (
            <div className="lh-compare-table" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
              {selected.map((p, i) => {
                const a = awardsFor(p);
                return (
                  <div key={p.id} className="neon-card" style={{ padding: 14 }}>
                    <div style={{ color: colorFor(p.id, i), fontWeight: 700, marginBottom: 8 }}>{p.nickname || p.player_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.7)', marginBottom: 6 }}>
                      🏆 Player of the Month × {a.potm.length}
                    </div>
                    {a.accolades.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)' }}>No season accolades yet.</div>
                    ) : (
                      <div className="player-accolade-list">
                        {a.accolades.map((award) => (
                          <span className="player-accolade-chip" key={award.id}>{accoladeIcon(award)} {accoladeLabel(award)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : category === 'fielding' && STAT_LIST.length === 0 ? (
            <div className="lh-empty">Fielding stats aren't tracked for this league yet.</div>
          ) : (
            <>
              {radarSeries && <div style={{ marginBottom: 24 }}><MultiRadarChart axes={radarAxes} series={radarSeries} /></div>}

              {category === 'advanced' ? (
                <div className="lh-compare-table">
                  <div className="lh-compare-head" style={{ gridTemplateColumns: `160px repeat(${selected.length}, 1fr)` }}>
                    <span>STAT</span>
                    {selected.map((p, i) => <span key={p.id} style={{ color: colorFor(p.id, i) }}>{p.nickname || p.player_name}</span>)}
                  </div>
                  {LEADER_LIST.map((l) => (
                    <div key={l.label} className="lh-compare-row" style={{ gridTemplateColumns: `160px repeat(${selected.length}, 1fr)` }}>
                      <span className="lh-compare-label" style={{ textAlign: 'left' }}>{l.label}</span>
                      {selected.map((p, i) => (
                        <span key={p.id} style={{ color: colorFor(p.id, i) }}>{p[l.seasonField] ?? '--'}</span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="lh-compare-table">
                  <div className="lh-compare-head" style={{ gridTemplateColumns: `160px repeat(${selected.length}, 1fr)` }}>
                    <span>STAT</span>
                    {selected.map((p, i) => <span key={p.id} style={{ color: colorFor(p.id, i) }}>{p.nickname || p.player_name}</span>)}
                  </div>
                  {STAT_LIST.map((row) => {
                    const best = bestIndex(row);
                    return (
                      <div key={row[0]} className="lh-compare-row" style={{ gridTemplateColumns: `160px repeat(${selected.length}, 1fr)` }}>
                        <span className="lh-compare-label" style={{ textAlign: 'left' }}>{row[0]}</span>
                        {selected.map((p, i) => (
                          <span
                            key={p.id}
                            className={`lh-compare-val ${best === i ? 'better' : ''}`}
                            style={best === i ? { color: colorFor(p.id, i), background: `${colorFor(p.id, i)}22` } : undefined}
                          >
                            {getVal(p, row[1], row[2])}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PlayerComparisonTool;
