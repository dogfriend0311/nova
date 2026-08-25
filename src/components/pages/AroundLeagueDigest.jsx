/**
 * AroundLeagueDigest.jsx
 * Auto-generated summary card for the Sports Hub Scores tab — biggest
 * win, closest game, a possible upset (by comparing each side's record
 * going in), and a standout stat line pulled from the day's highest-
 * margin final. Built entirely from data the Scores tab already has
 * (plus one extra box-score fetch for the standout line), so it costs
 * at most one additional request per slate instead of one per game.
 */
import React, { useEffect, useState } from 'react';
import { fetchGameSummary, normalizeGameSummary } from '../../services/sportsDataService';

const parseRecord = (rec) => {
  if (!rec) return null;
  const m = String(rec).match(/(\d+)-(\d+)/);
  if (!m) return null;
  const w = +m[1], l = +m[2];
  const total = w + l;
  return total > 0 ? w / total : null;
};

const AroundLeagueDigest = ({ sport, finals, onSelectGame }) => {
  const [standout, setStandout] = useState(null); // { headline, team, name, stat, value }
  const [loading, setLoading]   = useState(false);

  const decided = (finals || []).filter(g =>
    Number.isFinite(+g.homeTeam.score) && Number.isFinite(+g.awayTeam.score));

  const withMargin = decided.map(g => {
    const home = +g.homeTeam.score, away = +g.awayTeam.score;
    const margin = Math.abs(home - away);
    const winner = home > away ? g.homeTeam : g.awayTeam;
    const loser  = home > away ? g.awayTeam : g.homeTeam;
    return { game: g, margin, winner, loser };
  });

  const biggestWin = [...withMargin].sort((a, b) => b.margin - a.margin)[0] || null;
  const closest     = [...withMargin].sort((a, b) => a.margin - b.margin)[0] || null;
  const upset = withMargin
    .map(x => ({ ...x, winPct: parseRecord(x.winner.record), loseWinPct: parseRecord(x.loser.record) }))
    .filter(x => x.winPct !== null && x.loseWinPct !== null && x.loseWinPct - x.winPct >= 0.15)
    .sort((a, b) => (b.loseWinPct - b.winPct) - (a.loseWinPct - a.winPct))[0] || null;

  useEffect(() => {
    if (!biggestWin) { setStandout(null); return; }
    let cancelled = false;
    setLoading(true);
    fetchGameSummary(sport, biggestWin.game.id)
      .then(raw => {
        if (cancelled) return;
        const summary = normalizeGameSummary(raw);
        for (const group of summary.playerGroups || []) {
          const cat = (group.categories || [])[0];
          const athlete = cat?.athletes?.[0];
          if (athlete && cat.keys?.length) {
            setStandout({
              team: group.teamName,
              name: athlete.name,
              photo: athlete.photo,
              statLabel: cat.keys[0],
              statValue: athlete.stats?.[0] || '—',
              catName: cat.name,
            });
            return;
          }
        }
        setStandout(null);
      })
      .catch(() => setStandout(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, biggestWin?.game.id]);

  if (!decided.length) return null;

  const Chip = ({ label, color }) => (
    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 7px' }}>{label}</span>
  );

  const Row = ({ chip, chipColor, onClick, children }) => (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(100,120,200,0.1)', cursor: onClick ? 'pointer' : 'default' }}
    >
      <Chip label={chip} color={chipColor} />
      <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', color: 'rgba(220,230,255,0.85)' }}>{children}</div>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(94,129,244,0.06), rgba(199,168,255,0.04))', border: '1px solid rgba(100,120,200,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 22 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800 }} className="gradient-text-cyan">Around the League</h3>
      <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'rgba(158,165,196,0.45)' }}>Auto-generated from today's finals</p>

      {biggestWin && (
        <Row chip="Biggest Win" chipColor="#ffd700" onClick={() => onSelectGame?.(biggestWin.game)}>
          <strong>{biggestWin.winner.abbr}</strong> beat <strong>{biggestWin.loser.abbr}</strong> by {biggestWin.margin} ({biggestWin.winner.score}-{biggestWin.loser.score})
        </Row>
      )}
      {closest && closest !== biggestWin && (
        <Row chip="Nail-Biter" chipColor="#43b581" onClick={() => onSelectGame?.(closest.game)}>
          <strong>{closest.winner.abbr}</strong> edged <strong>{closest.loser.abbr}</strong> by just {closest.margin} ({closest.winner.score}-{closest.loser.score})
        </Row>
      )}
      {upset && (
        <Row chip="Upset" chipColor="#ff6b6b" onClick={() => onSelectGame?.(upset.game.game)}>
          <strong>{upset.winner.abbr}</strong> ({upset.winner.record || '—'}) knocked off <strong>{upset.loser.abbr}</strong> ({upset.loser.record || '—'})
        </Row>
      )}
      {(loading || standout) && (
        <Row chip="Standout" chipColor="#c864dc">
          {loading ? 'Finding today\'s standout stat line...' : standout && (
            <>
              <strong>{standout.name}</strong> ({standout.team}) — {standout.statValue} {standout.statLabel} <span style={{ color: 'rgba(158,165,196,0.45)' }}>({standout.catName})</span>
            </>
          )}
        </Row>
      )}
    </div>
  );
};

export default AroundLeagueDigest;
