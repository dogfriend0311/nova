import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { SPORTS, SPORT_ORDER } from '../data/sportsConfig';
import { HEADLINE_STAT } from './LeagueLeaders';
import { accoladeLabel, accoladeIcon } from '../data/accolades';
import { CardShell, ScrollRow } from './ScrollCards';

// ── On This Day ──────────────────────────────────────────────
// Surfaces games and awards from past seasons that fall on today's
// calendar date (same month + day, any earlier year) — a lightweight
// "history repeats" callback built entirely from data already entered
// via box scores and player awards, no separate archive to maintain.

const sameMonthDay = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() < now.getFullYear();
};

const yearsAgo = (iso) => new Date().getFullYear() - new Date(iso).getFullYear();

const goTo = (hash) => { window.location.hash = hash; };
const getPlayerLabel = (player) => player?.nickname || player?.player_name || 'Unknown player';

const OnThisDay = () => {
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
            .filter(g => sameMonthDay(g.game_date))
            .map(g => {
              const gameScores = (boxScores || []).filter(b => b.game_id === g.id);
              const top = gameScores
                .map(b => ({ box: b, value: parseFloat(b[stat.field]) }))
                .filter(r => Number.isFinite(r.value) && r.value > 0)
                .sort((a, b) => b.value - a.value)[0];
              return {
                kind: 'game', ts: g.game_date, key: `otd-game-${lg}-${g.id}`,
                league: lg, game: g,
                topPerformer: top ? { player: playerById.get(String(top.box.player_id)), value: top.value } : null,
              };
            });
        } catch { return []; }
      }));
      return perLeague.flat();
    };

    const loadAwards = async () => {
      try {
        const perLeague = await Promise.all(SPORT_ORDER.map(lg => Promise.all([
          db.getPotmAwards(lg).then(l => (l || []).map(a => ({ ...a, _league: lg }))).catch(() => []),
          db.getAccolades(lg).then(l => (l || []).map(a => ({ ...a, _league: lg }))).catch(() => []),
          db.getHof(lg).then(l => (l || []).map(a => ({ ...a, _league: lg }))).catch(() => []),
        ])));
        const cards = [];
        perLeague.forEach(([potm, acc, hof]) => {
          potm.filter(a => sameMonthDay(a.created_at)).forEach(a => cards.push({ kind: 'potm', ts: a.created_at, key: `otd-potm-${a.id}`, award: a }));
          acc.filter(a => sameMonthDay(a.created_at)).forEach(a => cards.push({ kind: 'accolade', ts: a.created_at, key: `otd-acc-${a.id}`, award: a }));
          hof.filter(a => sameMonthDay(a.created_at)).forEach(a => cards.push({ kind: 'hof', ts: a.created_at, key: `otd-hof-${a.id}`, award: a }));
        });
        return cards;
      } catch { return []; }
    };

    Promise.all([loadGames(), loadAwards()]).then(([games, awards]) => {
      if (cancelled) return;
      const merged = [...games, ...awards].sort((a, b) => new Date(b.ts) - new Date(a.ts)); // most recent past year first
      setCards(merged);
    });
    return () => { cancelled = true; };
  }, []);

  if (cards === null) return null;
  if (cards.length === 0) return null;

  return (
    <>
      <div className="home-section-label">On This Day</div>
      <ScrollRow>
        {cards.map((c) => {
          const ago = yearsAgo(c.ts);
          const agoLabel = `${ago} year${ago === 1 ? '' : 's'} ago`;
          if (c.kind === 'game') {
            const { game, league, topPerformer } = c;
            return (
              <CardShell key={c.key} kicker={`${SPORTS[league]?.icon || ''} ${SPORTS[league]?.shortLabel || league} · ${agoLabel}`}>
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
          const a = c.award;
          const icon = c.kind === 'potm' ? '🏆' : c.kind === 'hof' ? '⭐' : accoladeIcon(a);
          const title = c.kind === 'potm'
            ? `${a.player_name || 'A player'} — Player of the Month`
            : c.kind === 'hof'
              ? `${a.player_name || 'A legend'} — Hall of Fame`
              : `${a.player_name || 'A player'} earned ${accoladeLabel(a)}`;
          return (
            <CardShell key={c.key} kicker={`${SPORTS[a._league]?.shortLabel || a._league} · ${agoLabel}`} onClick={() => goTo(`#leagues/player/${a.player_id}`)}>
              <div style={{ color: '#e2e5f0', fontSize: '0.85rem', fontWeight: 700 }}>{icon} {title}</div>
            </CardShell>
          );
        })}
      </ScrollRow>
    </>
  );
};

export default OnThisDay;
