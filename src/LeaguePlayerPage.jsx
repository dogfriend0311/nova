import React, { useState, useEffect } from 'react';
import './LeaguePlayerPage.css';
import PlayerTradingCard from './PlayerTradingCard';
import db from './services/db';
import { accoladeLabel, accoladeIcon } from './data/accolades';
import { getSport } from './data/sportsConfig';
import PlayerComments from './components/PlayerComments';
import { LeagueImpactMap } from './LeagueFeatures';

// Converts any Spotify link to an embed URL and appends autoplay=1
// so the song starts automatically when a player's page opens.
const toSpotifyEmbed = (url) => {
  if (!url) return url;
  const embed = url.includes('/embed/')
    ? url
    : url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  // autoplay=1 works when the page is reached via user navigation
  return embed.includes('autoplay=') ? embed : embed + (embed.includes('?') ? '&' : '?') + 'autoplay=1';
};

const safe    = (n) => parseFloat(n) || 0;
const safeInt = (n) => parseInt(n)   || 0;
const fmt     = (n, decimals = 2) =>
  isNaN(n) || !isFinite(n) ? '—' : Number(n).toFixed(decimals);

// ── Savant Card ──────────────────────────────────────────────
const SavantCard = ({ player }) => {
  const pctColor = (p) => {
    const n = parseFloat(p);
    if (isNaN(n)) return 'rgba(158, 165, 196,0.3)';
    if (n >= 70)  return '#5e81f4';
    if (n >= 30)  return '#ffd700';
    return '#ff6b7a';
  };

  const Bar = ({ label, value, pct }) => {
    const p = parseFloat(pct);
    if (pct === '' || pct === undefined || pct === null || isNaN(p)) return null;
    const color = pctColor(p);
    return (
      <div className="sv-bar-item">
        <div className="sv-bar-header">
          <span className="sv-bar-label">{label}</span>
          <span className="sv-bar-val" style={{ color }}>{value || '—'}</span>
        </div>
        <div className="sv-bar-track">
          <div className="sv-bar-fill" style={{ width: `${Math.min(Math.max(p, 0), 100)}%`, background: color }} />
        </div>
        <span className="sv-bar-pct" style={{ color }}>{Math.round(p)}th %ile</span>
      </div>
    );
  };

  const batting = [
    { label: 'H / Game',   value: player.adv_h_per_game,   pct: player.sv_h_per_game },
    { label: 'R / Game',   value: player.adv_r_per_game,   pct: player.sv_r_per_game },
    { label: 'RBI / Game', value: player.adv_rbi_per_game, pct: player.sv_rbi_per_game },
    { label: 'HR / Game',  value: player.adv_hr_per_game,  pct: player.sv_hr_per_game },
    { label: 'K / Game',   value: player.adv_k_per_game,   pct: player.sv_k_per_game },
  ].filter(s => s.pct !== '' && s.pct !== undefined && s.pct !== null);

  const pitching = [
    { label: 'ERA', value: player.adv_era, pct: player.sv_era },
    { label: 'K/9', value: player.adv_k9,  pct: player.sv_k9 },
    { label: 'H/9', value: player.adv_h9,  pct: player.sv_h9 },
  ].filter(s => s.pct !== '' && s.pct !== undefined && s.pct !== null);

  if (batting.length === 0 && pitching.length === 0) return null;

  return (
    <div className="savant-card neon-card">
      <div className="sv-header">
        <h3 className="gradient-text-cyan">Savant Card</h3>
        <span className="sv-subtitle">Percentile Rankings</span>
      </div>
      <div className="sv-legend">
        <span style={{ color: '#ff6b7a' }}>POOR</span>
        <span style={{ color: '#ffd700' }}>AVERAGE</span>
        <span style={{ color: '#5e81f4' }}>GREAT</span>
      </div>
      {batting.length > 0 && (
        <>
          <div className="sv-section-label">Batting</div>
          <div className="sv-bars">{batting.map((s, i) => <Bar key={i} {...s} />)}</div>
        </>
      )}
      {pitching.length > 0 && (
        <>
          <div className="sv-section-label">Pitching</div>
          <div className="sv-bars">{pitching.map((s, i) => <Bar key={i} {...s} />)}</div>
        </>
      )}
    </div>
  );
};

// ── Stat Section ─────────────────────────────────────────────
const StatSection = ({ title, color, stats, isCareer, onToggle }) => (
  <div className="stats-section neon-card fx-statcard">
    <div className="stats-header">
      <h3 className={color === 'cyan' ? 'gradient-text-cyan' : 'gradient-text-magenta'}>{title}</h3>
      <div className="fx-toggle-track" onClick={onToggle} data-active={isCareer ? 'career' : 'season'}>
        <span className="fx-toggle-pill" />
        <span className="fx-toggle-opt">Season</span>
        <span className="fx-toggle-opt">Career</span>
      </div>
    </div>
    <div className="stats-grid">
      {stats.map(({ label, value }, i) => {
        const isEmpty = value === '—' || value === undefined || value === null || value === '';
        return (
          <div key={label} className={`stat-item fx-stat-item${isEmpty ? ' fx-empty' : ''}`} style={{ animationDelay: `${i * 25}ms` }}>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
          </div>
        );
      })}
    </div>
  </div>
);

const PlayerGameLog = ({ playerScores, cfg }) => (
  <div className="stats-section neon-card player-panel-card">
    <div className="player-panel-heading">
      <div>
        <span className="player-panel-kicker">GAME CENTER</span>
        <h3>Game Log</h3>
      </div>
      <span className="player-panel-count">{playerScores.length} logged</span>
    </div>
    {playerScores.length === 0 ? (
      <div className="player-panel-empty">No game-level data has been logged for this player yet.</div>
    ) : (
      <div className="player-game-log-wrap">
        <table className="player-game-log">
          <thead>
            <tr>
              <th>#</th>
              {cfg.boxFields.map(field => <th key={field}>{cfg.boxLabels[field]}</th>)}
            </tr>
          </thead>
          <tbody>
            {playerScores.map((score, index) => (
              <tr key={score.id || index}>
                <td>{index + 1}</td>
                {cfg.boxFields.map(field => <td key={field}>{score[field] || 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const PlayerAwardsPanel = ({ player, potmAwards, accolades }) => (
  <div className="player-awards-panel">
    <div className="player-awards-intro">
      <span className="player-panel-kicker">CAREER ARCHIVE</span>
      <h3>Honors & recognition</h3>
      <p>Every award attached to this player is collected here so the stat page tells the full story.</p>
    </div>
    <div className="player-awards-grid">
      <div className="player-award-list neon-card">
        <div className="player-panel-heading">
          <div><span className="player-panel-kicker">MONTHLY HONORS</span><h3>Player of the Month</h3></div>
          <span className="player-panel-count">{potmAwards.length}</span>
        </div>
        {potmAwards.length === 0 ? <div className="player-panel-empty">No monthly honors recorded yet.</div> : (
          <div className="player-honor-rows">
            {potmAwards.map(award => (
              <div className="player-honor-row" key={award.id}>
                <span className="player-honor-mark">POTM</span>
                <div><strong>{award.month_label || 'Monthly award'}</strong><small>{award.note || `${player.nickname || player.player_name} led the league.`}</small></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="player-award-list neon-card">
        <div className="player-panel-heading">
          <div><span className="player-panel-kicker">SEASON HONORS</span><h3>Accolades</h3></div>
          <span className="player-panel-count">{accolades.length}</span>
        </div>
        {accolades.length === 0 ? <div className="player-panel-empty">No season accolades recorded yet.</div> : (
          <div className="player-accolade-list">
            {accolades.map(award => <span className="player-accolade-chip" key={award.id}>{accoladeIcon(award)} {accoladeLabel(award)}</span>)}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────
const LeaguePlayerPage = ({ player, onBack, leaguePrefix }) => {
  const [toggles, setToggles] = useState({
    hitBasic:   false,
    hitAdv:     false,
    pitchBasic: false,
    pitchAdv:   false,
  });
  const [showTradingCard, setShowTradingCard] = useState(false);
  const [activePanel, setActivePanel] = useState('overview');
  const [isWatched, setIsWatched] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [potmAwards, setPotmAwards] = useState([]);
  const [accolades, setAccolades] = useState([]);

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!player?.id) { setPotmAwards([]); setAccolades([]); return; }
    const league = leaguePrefix || 'vizta';
    db.getPotmAwards(league, player.id).then(setPotmAwards);
    db.getAccolades(league, player.id).then(setAccolades);
  }, [player?.id, leaguePrefix]);

  useEffect(() => {
    const rawUser = localStorage.getItem('nova_user');
    if (!player?.id || !rawUser) { setIsWatched(false); return; }
    try {
      const username = JSON.parse(rawUser)?.username;
      if (!username) { setIsWatched(false); return; }
      db.getWatchlist(username).then(list => setIsWatched((list || []).some(item =>
        String(item.player_id || item.playerId) === String(player.id) &&
        item.league === (leaguePrefix || 'vizta')
      )));
    } catch { setIsWatched(false); }
  }, [player?.id, leaguePrefix]);

  if (!player) {
    return (
      <div className="league-player-page">
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(158, 165, 196,0.6)' }}>No player selected.</p>
          {onBack && (
            <button className="neon-button" style={{ marginTop: '15px' }} onClick={onBack}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const cfg = getSport(leaguePrefix || 'vizta');
  const isBaseball = cfg.key === 'vizta';

  const boxScores    = JSON.parse(localStorage.getItem(`${(leaguePrefix || 'vizta')}_box_scores`) || '[]');
  const playerScores = boxScores.filter(b => b.player_id === player.id);
  const gamesPlayed  = playerScores.length;
  const gamesPitched = playerScores.filter(b => safe(b.innings_pitched) > 0).length;

  // Generic (config-driven) stat sections for non-baseball leagues
  const genericSeasonA = cfg.seasonA.map(([f, l]) => ({ label: l, value: player[f] || '—' }));
  const genericCareerA = cfg.careerA.map(([f, l]) => ({ label: l, value: player[f] || '—' }));
  const genericSeasonB = cfg.seasonB.map(([f, l]) => ({ label: l, value: player[f] || '—' }));
  const genericCareerB = cfg.careerB.map(([f, l]) => ({ label: l, value: player[f] || '—' }));
  const genericCardA = genericSeasonA.slice(0, 4);
  const genericCardB = genericSeasonB.slice(0, 4);

  // Season aggregates
  const sH   = playerScores.reduce((s, b) => s + safeInt(b.hits), 0)               + safeInt(player.season_hits);
  const sR   = playerScores.reduce((s, b) => s + safeInt(b.runs), 0)               + safeInt(player.season_runs);
  const sRBI = playerScores.reduce((s, b) => s + safeInt(b.rbis), 0)               + safeInt(player.season_rbis);
  const sHR  = playerScores.reduce((s, b) => s + safeInt(b.home_runs), 0)          + safeInt(player.season_home_runs);
  const sSO  = playerScores.reduce((s, b) => s + safeInt(b.strike_outs), 0)        + safeInt(player.season_strike_outs);
  const sIP  = playerScores.reduce((s, b) => s + safe(b.innings_pitched), 0)       + safe(player.season_innings_pitched);
  const sKP  = playerScores.reduce((s, b) => s + safeInt(b.strikeouts_pitched), 0) + safeInt(player.season_strikeouts_pitched);
  const sHA  = playerScores.reduce((s, b) => s + safeInt(b.hits_allowed), 0)       + safeInt(player.season_hits_allowed);
  const sER  = playerScores.reduce((s, b) => s + safeInt(b.earned_runs), 0)        + safeInt(player.season_earned_runs);
  const sG   = safeInt(player.season_g) || playerScores.length;
  const sAB  = safeInt(player.season_ab);
  const sAVG = player.season_avg || (sAB > 0 ? (sH / sAB).toFixed(3) : '—');
  const sOBP = player.season_obp || '—';
  const sSLG = player.season_slg || '—';
  const sOPS = player.season_ops || '—';

  // Career aggregates
  const cH   = safeInt(player.hits)               || sH;
  const cR   = safeInt(player.runs)               || sR;
  const cRBI = safeInt(player.rbis)               || sRBI;
  const cHR  = safeInt(player.home_runs)          || sHR;
  const cSO  = safeInt(player.strike_outs)        || sSO;
  const cIP  = safe(player.innings_pitched)       || sIP;
  const cKP  = safeInt(player.strikeouts_pitched) || sKP;
  const cHA  = safeInt(player.hits_allowed)       || sHA;
  const cER  = safeInt(player.earned_runs)        || sER;
  const cG   = safeInt(player.career_g)           || sG;
  const cAB  = safeInt(player.career_ab)          || sAB;
  const cAVG = player.career_avg || (cAB > 0 ? (cH / cAB).toFixed(3) : '—');
  const cOBP = player.career_obp || '—';
  const cSLG = player.career_slg || '—';
  const cOPS = player.career_ops || '—';

  const hitBasicSeason = [
    { label: 'G',   value: sG },
    { label: 'AB',  value: sAB || '—' },
    { label: 'AVG', value: sAVG },
    { label: 'OBP', value: sOBP },
    { label: 'SLG', value: sSLG },
    { label: 'OPS', value: sOPS },
    { label: 'H',   value: sH },
    { label: 'R',   value: sR },
    { label: 'RBI', value: sRBI },
    { label: 'HR',  value: sHR },
    { label: 'K',   value: sSO },
    { label: 'BB',  value: player.season_bb || '—' },
    { label: 'SB',  value: player.season_sb || '—' },
  ];
  const hitBasicCareer = [
    { label: 'G',   value: cG },
    { label: 'AB',  value: cAB || '—' },
    { label: 'AVG', value: cAVG },
    { label: 'OBP', value: cOBP },
    { label: 'SLG', value: cSLG },
    { label: 'OPS', value: cOPS },
    { label: 'H',   value: cH },
    { label: 'R',   value: cR },
    { label: 'RBI', value: cRBI },
    { label: 'HR',  value: cHR },
    { label: 'K',   value: cSO },
    { label: 'BB',  value: player.career_bb || '—' },
    { label: 'SB',  value: player.career_sb || '—' },
  ];

  const sGP = Math.max(gamesPlayed, sH > 0 || sR > 0 || sHR > 0 ? 1 : 0);
  const hitAdvSeason = [
    { label: 'H / Game',   value: player.adv_s_h_per_game   || (sGP ? fmt(sH   / sGP) : '—') },
    { label: 'R / Game',   value: player.adv_s_r_per_game   || (sGP ? fmt(sR   / sGP) : '—') },
    { label: 'RBI / Game', value: player.adv_s_rbi_per_game || (sGP ? fmt(sRBI / sGP) : '—') },
    { label: 'HR / Game',  value: player.adv_s_hr_per_game  || (sGP ? fmt(sHR  / sGP) : '—') },
    { label: 'K / Game',   value: player.adv_s_k_per_game   || (sGP ? fmt(sSO  / sGP) : '—') },
  ];
  const hitAdvCareer = [
    { label: 'H / Game',   value: player.adv_h_per_game   || (gamesPlayed ? fmt(cH   / gamesPlayed) : '—') },
    { label: 'R / Game',   value: player.adv_r_per_game   || (gamesPlayed ? fmt(cR   / gamesPlayed) : '—') },
    { label: 'RBI / Game', value: player.adv_rbi_per_game || (gamesPlayed ? fmt(cRBI / gamesPlayed) : '—') },
    { label: 'HR / Game',  value: player.adv_hr_per_game  || (gamesPlayed ? fmt(cHR  / gamesPlayed) : '—') },
    { label: 'K / Game',   value: player.adv_k_per_game   || (gamesPlayed ? fmt(cSO  / gamesPlayed) : '—') },
  ];

  const pitchBasicSeason = [
    { label: 'Games Pitched',   value: gamesPitched },
    { label: 'Innings Pitched', value: sIP.toFixed(1) },
    { label: 'Strikeouts',      value: sKP },
    { label: 'Hits Allowed',    value: sHA },
    { label: 'Earned Runs',     value: sER },
  ];
  const pitchBasicCareer = [
    { label: 'Games Pitched',   value: gamesPitched },
    { label: 'Innings Pitched', value: cIP.toFixed(1) },
    { label: 'Strikeouts',      value: cKP },
    { label: 'Hits Allowed',    value: cHA },
    { label: 'Earned Runs',     value: cER },
  ];

  const calcAdv = (ip, er, k, ha) => ({
    era:  ip > 0 ? fmt((er / ip) * 9) : '—',
    k9:   ip > 0 ? fmt((k  / ip) * 9) : '—',
    h9:   ip > 0 ? fmt((ha / ip) * 9) : '—',
  });
  const sAdv = calcAdv(sIP, sER, sKP, sHA);
  const cAdv = calcAdv(cIP, cER, cKP, cHA);

  const pitchAdvSeason = [
    { label: 'ERA',        value: player.adv_s_era || sAdv.era },
    { label: 'K/9',        value: player.adv_s_k9  || sAdv.k9 },
    { label: 'H/9',        value: player.adv_s_h9  || sAdv.h9 },
    { label: 'K Per Game', value: gamesPitched ? fmt(sKP / gamesPitched) : '—' },
    { label: 'ER/9',       value: player.adv_s_er9 || (sIP > 0 ? fmt((sER / sIP) * 9) : '—') },
  ];
  const pitchAdvCareer = [
    { label: 'ERA',        value: player.adv_era || cAdv.era },
    { label: 'K/9',        value: player.adv_k9  || cAdv.k9 },
    { label: 'H/9',        value: player.adv_h9  || cAdv.h9 },
    { label: 'K Per Game', value: gamesPitched ? fmt(cKP / gamesPitched) : '—' },
    { label: 'ER/9',       value: player.adv_er9 || (cIP > 0 ? fmt((cER / cIP) * 9) : '—') },
  ];

  const avatarSrc = player.avatar_data || null;
  const playerTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'stats', label: 'Full Stats' },
    { id: 'visuals', label: 'Spray / Shot Map' },
    { id: 'gamelog', label: 'Game Log' },
    { id: 'awards', label: 'Awards' },
  ];
  const snapshotStats = isBaseball
    ? [
        { label: 'OVR', value: player.overall || '—' },
        { label: 'GP', value: sG || '—' },
        { label: 'AVG', value: sAVG },
        { label: 'OPS', value: sOPS },
        { label: 'ERA', value: player.adv_s_era || sAdv.era },
      ]
    : [
        { label: 'OVR', value: player.overall || '—' },
        { label: 'GP', value: player.season_gp || player.season_g || '—' },
        ...genericSeasonA.slice(1, 4),
      ];

  // Featured stats for the trading card - both hitting and pitching are
  // always shown (players in this league can have both, not just one
  // or the other based on position).
  const hittingCardStats = isBaseball ? [
    { label: 'AVG', value: sAVG },
    { label: 'HR',  value: sHR },
    { label: 'RBI', value: sRBI },
    { label: 'OPS', value: sOPS },
  ] : genericCardA;
  const pitchingCardStats = isBaseball ? [
    { label: 'ERA', value: player.adv_s_era || sAdv.era },
    { label: 'W',   value: player.season_w || 0 },
    { label: 'K',   value: sKP },
    { label: 'IP',  value: sIP.toFixed(1) },
  ] : genericCardB;

  // Build a shareable link for this player page — path-based (not #hash)
  // so link-preview bots (Discord, iMessage, Slack, etc.) can see this
  // specific player's name/team/stats via /api/preview-player.
  const sharePlayer = () => {
    const url = `${window.location.origin}/players/${player.id}`;
    navigator.clipboard.writeText(url).then(() => alert('Player link copied!')).catch(() => alert(url));
  };

  const toggleWatchlist = async () => {
    const rawUser = localStorage.getItem('nova_user');
    if (!rawUser) { alert('Sign in to use player watchlists.'); return; }
    try {
      const username = JSON.parse(rawUser)?.username;
      if (!username) return;
      const league = leaguePrefix || 'vizta';
      const list = await db.getWatchlist(username);
      const watched = (list || []).some(item => String(item.player_id || item.playerId) === String(player.id) && item.league === league);
      const next = watched
        ? list.filter(item => !(String(item.player_id || item.playerId) === String(player.id) && item.league === league))
        : [...list, { player_id: player.id, player_name: player.nickname || player.player_name, team: player.team || '', league }];
      await db.saveWatchlist(username, next);
      setIsWatched(!watched);
    } catch { /* keep the page usable if the watchlist service is unavailable */ }
  };

  const copyEmbedCard = () => {
    // Points at the standalone, no-login embed route (App.jsx renders
    // EmbedPlayerCard directly for #embed/player/... instead of the full
    // authenticated app), so this actually works when pasted into an
    // external site rather than loading a login wall in the iframe.
    const embedUrl = `${window.location.origin}${window.location.pathname}#embed/player/${leaguePrefix || 'vizta'}/${player.id}`;
    const snippet = `<iframe src="${embedUrl}" title="${player.nickname || player.player_name} — Nova stat card" width="380" height="300" loading="lazy" style="border:0;border-radius:16px;max-width:100%;"></iframe>`;
    const done = () => { setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2200); };
    if (navigator.clipboard) navigator.clipboard.writeText(snippet).then(done).catch(() => alert(snippet));
    else alert(snippet);
  };

  return (
    <div className="league-player-page">
      {onBack && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="neon-button" style={{ fontSize: '0.9rem' }} onClick={onBack}>
            Back to League
          </button>
          <button
            onClick={sharePlayer}
            style={{ padding: '8px 16px', background: 'rgba(94, 129, 244,0.06)', border: '1px solid rgba(94, 129, 244,0.25)', color: 'var(--color-cyan)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
          >
            Share Link
          </button>
          <button
            onClick={() => setShowTradingCard(true)}
            style={{ padding: '8px 16px', background: 'linear-gradient(135deg, rgba(94,129,244,0.15), rgba(255,158,87,0.15))', border: '1px solid rgba(255,158,87,0.35)', color: '#ff9e57', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
          >
            View Trading Card
          </button>
          <button
            onClick={toggleWatchlist}
            style={{ padding: '8px 16px', background: isWatched ? 'rgba(94,230,168,0.12)' : 'rgba(94,129,244,0.06)', border: `1px solid ${isWatched ? 'rgba(94,230,168,0.4)' : 'rgba(94,129,244,0.25)'}`, color: isWatched ? '#5ee6a8' : 'var(--color-cyan)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
            aria-pressed={isWatched}
          >
            {isWatched ? 'Watching Player' : 'Watch Player'}
          </button>
          <button
            onClick={copyEmbedCard}
            style={{ padding: '8px 16px', background: 'rgba(255,158,87,0.06)', border: '1px solid rgba(255,158,87,0.25)', color: '#ffb477', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
          >
            {embedCopied ? 'Embed Code Copied' : 'Copy Embed Card'}
          </button>
        </div>
      )}

      {showTradingCard && (
        <PlayerTradingCard
          player={player}
          hittingStats={hittingCardStats}
          pitchingStats={pitchingCardStats}
          catALabel={cfg.catA.label}
          catBLabel={cfg.catB.label}
          leagueLabel={cfg.label}
          onClose={() => setShowTradingCard(false)}
        />
      )}

      <div className="player-command-header">
        <div>
          <span className="player-command-kicker">{cfg.label.toUpperCase()} / PLAYER PROFILE</span>
          <h1>{player.nickname || player.player_name}</h1>
          <p>{player.team || 'Free Agent'} <span /> {player.position || 'Multi-category player'} <span /> Official Nova stat page</p>
        </div>
        <div className="player-command-status"><span /> ACTIVE PROFILE</div>
      </div>
      <div className="player-snapshot">
        {snapshotStats.map(stat => (
          <div className="player-snapshot-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="player-panel-tabs" role="tablist" aria-label="Player page sections">
        {playerTabs.map(tab => (
          <button
            key={tab.id}
            className={activePanel === tab.id ? 'active' : ''}
            onClick={() => setActivePanel(tab.id)}
            role="tab"
            aria-selected={activePanel === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="player-container">
        {/* LEFT — Trading Card */}
        <div className="player-card neon-card">
          <div className="card-avatar">
            {avatarSrc
              ? <img src={avatarSrc} alt={player.player_name} />
              : <div className="avatar-placeholder">🎮</div>
            }
          </div>

          <div className="card-content">
            {/* Nickname (large) + real name below it */}
            {player.nickname ? (
              <>
                <h2 className="card-name">{player.nickname}</h2>
                <div style={{ fontSize: '0.82rem', color: 'rgba(158, 165, 196,0.45)', marginBottom: '4px', marginTop: '-6px', fontStyle: 'italic' }}>
                  {player.player_name}
                </div>
              </>
            ) : (
              <h2 className="card-name">{player.player_name}</h2>
            )}
            {/* Roblox username in small print */}
            {player.roblox_username && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(158, 165, 196,0.35)', marginBottom: '6px' }}>
                @{player.roblox_username} on Roblox
              </div>
            )}
            <div className="card-team">{player.team || 'Free Agent'}</div>
            <div className="card-position">{player.position || '—'}</div>

            {accolades.length > 0 && (
              <div className="accolade-tags">
                {accolades.map(a => (
                  <span key={a.id} className="accolade-tag">{accoladeIcon(a)} {accoladeLabel(a)}</span>
                ))}
              </div>
            )}

            <div className="card-overall">
              <span className="label">Overall</span>
              <span className="value">{player.overall || '—'}</span>
            </div>

            {player.number && (
              <div className="card-overall">
                <span className="label">Number</span>
                <span className="value">#{player.number}</span>
              </div>
            )}

            <div className="card-divider" />

            {/* Spotify embed — autoplay=1 is baked into the URL by toSpotifyEmbed */}
            {player.spotify_url && (
              <div className="card-spotify">
                <div className="spotify-label">Favorite Song</div>
                <iframe
                  title="Spotify player"
                  src={toSpotifyEmbed(player.spotify_url)}
                  width="100%"
                  height="90"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  style={{ marginTop: '10px', borderRadius: '4px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Stats */}
        <div className="player-stats">
          {activePanel === 'overview' && (
            <>
              {isBaseball && <SavantCard player={player} />}
              <div className="player-overview-grid">
                <StatSection title={isBaseball ? 'Season Hitting' : `${cfg.catA.label} Snapshot`} color="cyan" stats={isBaseball ? hitBasicSeason.slice(0, 8) : genericSeasonA.slice(0, 8)} isCareer={false} onToggle={() => setActivePanel('stats')} />
                <StatSection title={isBaseball ? 'Season Pitching' : `${cfg.catB.label} Snapshot`} color="magenta" stats={isBaseball ? pitchBasicSeason : genericSeasonB.slice(0, 8)} isCareer={false} onToggle={() => setActivePanel('stats')} />
              </div>
            </>
          )}

          {activePanel === 'stats' && (
            <>
              {isBaseball && <SavantCard player={player} />}
              {isBaseball ? (
                <>
                  <StatSection title="Season Hitting Stats" color="cyan" stats={toggles.hitBasic ? hitBasicCareer : hitBasicSeason} isCareer={toggles.hitBasic} onToggle={() => toggle('hitBasic')} />
                  <StatSection title="Advanced Hitting Stats" color="magenta" stats={toggles.hitAdv ? hitAdvCareer : hitAdvSeason} isCareer={toggles.hitAdv} onToggle={() => toggle('hitAdv')} />
                  <StatSection title="Pitching Stats" color="cyan" stats={toggles.pitchBasic ? pitchBasicCareer : pitchBasicSeason} isCareer={toggles.pitchBasic} onToggle={() => toggle('pitchBasic')} />
                  <StatSection title="Advanced Pitching Stats" color="magenta" stats={toggles.pitchAdv ? pitchAdvCareer : pitchAdvSeason} isCareer={toggles.pitchAdv} onToggle={() => toggle('pitchAdv')} />
                </>
              ) : (
                <>
                  <StatSection title={`${cfg.catA.label} Stats`} color="cyan" stats={toggles.hitBasic ? genericCareerA : genericSeasonA} isCareer={toggles.hitBasic} onToggle={() => toggle('hitBasic')} />
                  <StatSection title={`${cfg.catB.label} Stats`} color="magenta" stats={toggles.pitchBasic ? genericCareerB : genericSeasonB} isCareer={toggles.pitchBasic} onToggle={() => toggle('pitchBasic')} />
                </>
              )}
            </>
          )}

          {activePanel === 'visuals' && <LeagueImpactMap player={player} playerScores={playerScores} cfg={cfg} />}
          {activePanel === 'gamelog' && <PlayerGameLog playerScores={playerScores} cfg={cfg} />}
          {activePanel === 'awards' && <PlayerAwardsPanel player={player} potmAwards={potmAwards} accolades={accolades} />}

          {activePanel === 'overview' && potmAwards.length > 0 && (
            <div className="potm-trophy-case">
              <div className="potm-trophy-header">
                <span className="potm-trophy-title">🏆 Player of the Month</span>
                <span className="potm-trophy-count">{potmAwards.length} time{potmAwards.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="potm-cards">
                {potmAwards.map(a => (
                  <div key={a.id} className="potm-card">
                    <div className="potm-shine" />
                    <div className="potm-card-inner">
                      <div className="potm-medal">🏆</div>
                      <div className="potm-card-name">{player.nickname || player.player_name}</div>
                      <div className="potm-card-label">PLAYER OF THE MONTH</div>
                      <div className="potm-card-month">{a.month_label}</div>
                      {a.note && <div className="potm-card-note">{a.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PlayerComments league={leaguePrefix || 'vizta'} playerId={player.id} playerName={player.nickname || player.player_name} />
        </div>
      </div>
    </div>
  );
};

export default LeaguePlayerPage;
