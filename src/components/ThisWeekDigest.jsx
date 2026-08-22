import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { SPORTS, SPORT_ORDER } from '../data/sportsConfig';
import { HEADLINE_STAT } from './LeagueLeaders';
import { accoladeLabel, accoladeIcon } from '../data/accolades';

// ── This Week in Nova ────────────────────────────────────────
// A single horizontally-scrolling digest mixing three things that
// otherwise live in separate corners of the site: this week's game
// results (with a top performer pulled in), new staff picks & player
// awards, and the week's article headlines. Everything is built from
// data already entered elsewhere (box scores, POTM/accolades/HOF,
// staff of month, articles) — this just re-surfaces the last 7 days
// of it in one place.

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const withinWeek = (iso) => !!iso && (Date.now() - new Date(iso).getTime()) < ONE_WEEK_MS;

const goTo = (hash) => { window.location.hash = hash; };

const getPlayerLabel = (player) => player?.nickname || player?.player_name || 'Unknown player';

const CardShell = ({ kicker, onClick, children }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    style={{
      flex: '0 0 240px', scrollSnapAlign: 'start', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.14)',
      borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
    }}
  >
    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(158,165,196,0.4)' }}>{kicker}</span>
    {children}
  </button>
);

const ThisWeekDigest = () => {
  const [cards, setCards] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;

    const loadGames = async () => {
      const perLeague = await Promise.all(SPORT_ORDER.map(async (lg) => {
        try {
          const [games, boxScores, players] = await Promise.all([
            db.getBsGames(lg), db.getBoxScores(lg), db.getPlayers(lg),
          ]);
          const stat = HEADLINE_STAT[lg];
          const playerById = new Map((players || []).map(p => [String(p.id), p]));
          return (games || [])
            .filter(g => withinWeek(g.game_date || g.created_at))
            .map(g => {
              const gameScores = (boxScores || []).filter(b => b.game_id === g.id);
              const top = gameScores
                .map(b => ({ box: b, value: parseFloat(b[stat.field]) }))
                .filter(r => Number.isFinite(r.value) && r.value > 0)
                .sort((a, b) => b.value - a.value)[0];
              return {
                kind: 'game', ts: g.game_date || g.created_at, key: `game-${lg}-${g.id}`,
                league: lg, game: g, topPerformer: top ? { player: playerById.get(String(top.box.player_id)), value: top.value } : null,
              };
            });
        } catch { return []; }
      }));
      return perLeague.flat();
    };

    const loadAwards = async () => {
      try {
        const [sotm, ...perLeague] = await Promise.all([
          db.getStaffOfMonth().catch(() => null),
          ...SPORT_ORDER.map(lg => Promise.all([
            db.getPotmAwards(lg).then(l => (l || []).map(a => ({ ...a, _league: lg }))).catch(() => []),
            db.getAccolades(lg).then(l => (l || []).map(a => ({ ...a, _league: lg }))).catch(() => []),
            db.getHof(lg).then(l => (l || []).map(a => ({ ...a, _league: lg }))).catch(() => []),
          ])),
        ]);
        const cards = [];
        if (sotm?.username && withinWeek(sotm.created_at)) {
          cards.push({ kind: 'staff', ts: sotm.created_at, key: 'sotm', sotm });
        }
        perLeague.forEach(([potm, acc, hof]) => {
          potm.filter(a => withinWeek(a.created_at)).forEach(a => cards.push({ kind: 'potm', ts: a.created_at, key: `potm-${a.id}`, award: a }));
          acc.filter(a => withinWeek(a.created_at)).forEach(a => cards.push({ kind: 'accolade', ts: a.created_at, key: `acc-${a.id}`, award: a }));
          hof.filter(a => withinWeek(a.created_at)).forEach(a => cards.push({ kind: 'hof', ts: a.created_at, key: `hof-${a.id}`, award: a }));
        });
        return cards;
      } catch { return []; }
    };

    const loadArticles = async () => {
      try {
        const articles = await db.getArticles();
        return (articles || [])
          .filter(a => withinWeek(a.created_at))
          .map(a => ({ kind: 'article', ts: a.created_at, key: `article-${a.id}`, article: a }));
      } catch { return []; }
    };

    Promise.all([loadGames(), loadAwards(), loadArticles()]).then(([games, awards, articles]) => {
      if (cancelled) return;
      const merged = [...games, ...awards, ...articles].sort((a, b) => new Date(b.ts) - new Date(a.ts));
      setCards(merged);
    });
    return () => { cancelled = true; };
  }, []);

  if (cards === null) return null;
  if (cards.length === 0) return null;

  return (
    <>
      <div className="home-section-label">This Week in Nova</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8, marginBottom: 12 }}>
        {cards.map((c) => {
          if (c.kind === 'game') {
            const { game, league, topPerformer } = c;
            return (
              <CardShell key={c.key} kicker={`${SPORTS[league]?.icon || ''} ${SPORTS[league]?.shortLabel || league} · Game`}>
                <div style={{ color: '#e2e5f0', fontSize: '0.88rem', fontWeight: 700 }}>
                  {game.away_team || 'Away'} @ {game.home_team || 'Home'}
                </div>
                <div style={{ color: 'rgba(158,165,196,0.55)', fontSize: '0.78rem' }}>
                  {Number.isFinite(game.away_score) || game.away_score === 0 ? `${game.away_score} - ${game.home_score}` : (game.game_name || '')}
                </div>
                {topPerformer?.player && (
                  <div style={{ color: 'var(--color-cyan)', fontSize: '0.76rem', marginTop: 2 }}>
                    ⭐ {getPlayerLabel(topPerformer.player)} · {Math.round(topPerformer.value).toLocaleString()} {HEADLINE_STAT[league].label.toLowerCase()}
                  </div>
                )}
              </CardShell>
            );
          }
          if (c.kind === 'staff') {
            return (
              <CardShell key={c.key} kicker="Staff of the Month" onClick={() => goTo(`#members/${c.sotm.username}`)}>
                <div style={{ color: '#e2e5f0', fontSize: '0.88rem', fontWeight: 700 }}>🌟 {c.sotm.username}</div>
                {c.sotm.note && <div style={{ color: 'rgba(158,165,196,0.55)', fontSize: '0.78rem' }}>{c.sotm.note}</div>}
              </CardShell>
            );
          }
          if (c.kind === 'potm' || c.kind === 'accolade' || c.kind === 'hof') {
            const a = c.award;
            const icon = c.kind === 'potm' ? '🏆' : c.kind === 'hof' ? '⭐' : accoladeIcon(a);
            const title = c.kind === 'potm'
              ? `${a.player_name || 'A player'} — Player of the Month`
              : c.kind === 'hof'
                ? `${a.player_name || 'A legend'} — Hall of Fame`
                : `${a.player_name || 'A player'} earned ${accoladeLabel(a)}`;
            return (
              <CardShell key={c.key} kicker={`New Award · ${SPORTS[a._league]?.shortLabel || a._league}`} onClick={() => goTo(`#leagues/player/${a.player_id}`)}>
                <div style={{ color: '#e2e5f0', fontSize: '0.85rem', fontWeight: 700 }}>{icon} {title}</div>
              </CardShell>
            );
          }
          // article
          return (
            <CardShell key={c.key} kicker="Article" onClick={() => goTo(`#articles/${c.article.id}`)}>
              <div style={{ color: '#e2e5f0', fontSize: '0.88rem', fontWeight: 700 }}>📰 {c.article.title}</div>
              {c.article.author && <div style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.76rem' }}>By {c.article.author}</div>}
            </CardShell>
          );
        })}
      </div>
    </>
  );
};

export default ThisWeekDigest;
