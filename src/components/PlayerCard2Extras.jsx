import React from 'react';
import { computeDynamicRating, buildTeamHistory, buildHeadToHead, findComparablePlayers } from '../services/playerInsightsService';

const TREND_META = {
  hot:    { label: 'HOT',    color: '#ff9e57', arrow: '▲' },
  cold:   { label: 'COLD',   color: '#5ee6f4', arrow: '▼' },
  steady: { label: 'STEADY', color: 'rgba(158,165,196,0.7)', arrow: '●' },
};

// ── Dynamic Overall Rating ───────────────────────────────────────
// Same "OVR" badge language as the trading card, but nudged by recent
// form instead of frozen at the stored value.
export const DynamicRatingBadge = ({ baseOverall, recentPoints }) => {
  const { rating, delta, trend, base } = computeDynamicRating(baseOverall, recentPoints);
  const meta = TREND_META[trend];
  return (
    <div className="neon-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: '#e2e5f0' }}>{rating}</div>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.06em', color: 'rgba(158,165,196,0.5)' }}>DYNAMIC OVR</div>
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: meta.color }}>
          {meta.arrow} {meta.label}{delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.55)', marginTop: 2 }}>
          Base rating {base} · adjusted for recent form
        </div>
      </div>
    </div>
  );
};

// ── Team History ──────────────────────────────────────────────────
const TeamHistoryPanel = ({ seasonArchiveRows, currentTeam }) => {
  const stops = buildTeamHistory(seasonArchiveRows, currentTeam);
  return (
    <div className="neon-card" style={{ padding: '18px 20px' }}>
      <div className="player-panel-heading">
        <div><span className="player-panel-kicker">TENURE</span><h3>Team History</h3></div>
        <span className="player-panel-count">{stops.length}</span>
      </div>
      {stops.length === 0 ? (
        <div className="player-panel-empty">No team history recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {stops.map((s, i) => (
            <div key={`${s.team}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === stops.length - 1 ? '#5e81f4' : 'rgba(158,165,196,0.4)', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#e2e5f0' }}>{s.team}</strong>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)' }}>{s.season}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Head-to-Head ────────────────────────────────────────────────
const HeadToHeadPanel = ({ gameLogPoints, statLabel }) => {
  const rows = buildHeadToHead(gameLogPoints).slice(0, 8);
  const maxAvg = Math.max(1, ...rows.map((r) => r.avg));
  return (
    <div className="neon-card" style={{ padding: '18px 20px' }}>
      <div className="player-panel-heading">
        <div><span className="player-panel-kicker">MATCHUPS</span><h3>Head-to-Head</h3></div>
        <span className="player-panel-count">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="player-panel-empty">No opponent-by-opponent data yet — logged box scores will populate this.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {rows.map((r) => (
            <div key={r.opponent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                <span style={{ color: '#e2e5f0', fontWeight: 600 }}>vs {r.opponent}</span>
                <span style={{ color: 'rgba(158,165,196,0.6)' }}>{r.avg.toFixed(2)} {statLabel}/gm · {r.games}G</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(158,165,196,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${(r.avg / maxAvg) * 100}%`, background: 'linear-gradient(90deg,#5e81f4,#ff9e57)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Comparable Players ────────────────────────────────────────────
const ComparablePlayersPanel = ({ player, allPlayers, cfg, onSelect }) => {
  const comps = findComparablePlayers(player, allPlayers, cfg, 5);
  return (
    <div className="neon-card" style={{ padding: '18px 20px' }}>
      <div className="player-panel-heading">
        <div><span className="player-panel-kicker">SIMILAR PROFILES</span><h3>Comparable Players</h3></div>
        <span className="player-panel-count">{comps.length}</span>
      </div>
      {comps.length === 0 ? (
        <div className="player-panel-empty">Not enough league data yet to find comparable players.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {comps.map(({ player: p, similarity }) => (
            <button
              key={p.id}
              onClick={() => onSelect && onSelect(p)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)',
                borderRadius: 8, padding: '8px 12px', cursor: onSelect ? 'pointer' : 'default',
                color: 'inherit', font: 'inherit', textAlign: 'left', width: '100%',
              }}
            >
              <span>
                <strong style={{ color: '#e2e5f0' }}>{p.nickname || p.player_name}</strong>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'rgba(158,165,196,0.5)' }}>{p.team || 'Free Agent'} · OVR {p.overall || '—'}</span>
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5e81f4' }}>{similarity}% match</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Combined panel, rendered under the "Insights" tab ─────────────
const PlayerCard2Extras = ({ player, allPlayers, cfg, seasonArchiveRows, gameLogPoints, statLabel, onSelectComparable }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <DynamicRatingBadge baseOverall={player.overall} recentPoints={gameLogPoints} />
    <TeamHistoryPanel seasonArchiveRows={seasonArchiveRows} currentTeam={player.team} />
    <HeadToHeadPanel gameLogPoints={gameLogPoints} statLabel={statLabel} />
    <ComparablePlayersPanel player={player} allPlayers={allPlayers} cfg={cfg} onSelect={onSelectComparable} />
  </div>
);

export default PlayerCard2Extras;
