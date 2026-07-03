import React, { useState } from 'react';
import './LeaguePlayerPage.css';

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
    if (isNaN(n)) return 'rgba(192,208,255,0.3)';
    if (n >= 70)  return '#00d4f5';
    if (n >= 30)  return '#ffd700';
    return '#ff4d4d';
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
        <span style={{ color: '#ff4d4d' }}>POOR</span>
        <span style={{ color: '#ffd700' }}>AVERAGE</span>
        <span style={{ color: '#00d4f5' }}>GREAT</span>
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
  <div className="stats-section neon-card">
    <div className="stats-header">
      <h3 className={color === 'cyan' ? 'gradient-text-cyan' : 'gradient-text-magenta'}>{title}</h3>
      <button className="career-toggle" onClick={onToggle}>
        {isCareer ? 'Season' : 'Career'}
      </button>
    </div>
    <div className="stats-grid">
      {stats.map(({ label, value }) => (
        <div key={label} className="stat-item">
          <span className="stat-label">{label}</span>
          <span className="stat-value">{value}</span>
        </div>
      ))}
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

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  if (!player) {
    return (
      <div className="league-player-page">
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(192,208,255,0.6)' }}>No player selected.</p>
          {onBack && (
            <button className="neon-button" style={{ marginTop: '15px' }} onClick={onBack}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const boxScores    = JSON.parse(localStorage.getItem(`${(leaguePrefix || 'vizta')}_box_scores`) || '[]');
  const playerScores = boxScores.filter(b => b.player_id === player.id);
  const gamesPlayed  = playerScores.length;
  const gamesPitched = playerScores.filter(b => safe(b.innings_pitched) > 0).length;

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

  // Build a shareable link for this player page
  const sharePlayer = () => {
    const url = `${window.location.origin}${window.location.pathname}#leagues/player/${player.id}`;
    navigator.clipboard.writeText(url).then(() => alert('Player link copied!')).catch(() => alert(url));
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
            style={{ padding: '8px 16px', background: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.25)', color: 'var(--color-cyan)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
          >
            Share Link
          </button>
        </div>
      )}

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
                <div style={{ fontSize: '0.82rem', color: 'rgba(192,208,255,0.45)', marginBottom: '4px', marginTop: '-6px', fontStyle: 'italic' }}>
                  {player.player_name}
                </div>
              </>
            ) : (
              <h2 className="card-name">{player.player_name}</h2>
            )}
            {/* Roblox username in small print */}
            {player.roblox_username && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(192,208,255,0.35)', marginBottom: '6px' }}>
                @{player.roblox_username} on Roblox
              </div>
            )}
            <div className="card-team">{player.team || 'Free Agent'}</div>
            <div className="card-position">{player.position || '—'}</div>

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
          <SavantCard player={player} />

          <StatSection
            title="Season Hitting Stats"
            color="cyan"
            stats={toggles.hitBasic ? hitBasicCareer : hitBasicSeason}
            isCareer={toggles.hitBasic}
            onToggle={() => toggle('hitBasic')}
          />
          <StatSection
            title="Advanced Hitting Stats"
            color="magenta"
            stats={toggles.hitAdv ? hitAdvCareer : hitAdvSeason}
            isCareer={toggles.hitAdv}
            onToggle={() => toggle('hitAdv')}
          />
          <StatSection
            title="Pitching Stats"
            color="cyan"
            stats={toggles.pitchBasic ? pitchBasicCareer : pitchBasicSeason}
            isCareer={toggles.pitchBasic}
            onToggle={() => toggle('pitchBasic')}
          />
          <StatSection
            title="Advanced Pitching Stats"
            color="magenta"
            stats={toggles.pitchAdv ? pitchAdvCareer : pitchAdvSeason}
            isCareer={toggles.pitchAdv}
            onToggle={() => toggle('pitchAdv')}
          />

          {/* Game Log */}
          {playerScores.length > 0 && (
            <div className="stats-section neon-card">
              <h3 className="gradient-text-cyan" style={{ marginBottom: '15px' }}>Game Log</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {['H', 'R', 'RBI', 'HR', 'K', 'IP', 'KP', 'HA', 'ER'].map(h => (
                        <th key={h} style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', textAlign: 'center', borderBottom: '1px solid rgba(0,255,255,0.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playerScores.map((score, i) => (
                      <tr key={i}>
                        {[score.hits, score.runs, score.rbis, score.home_runs, score.strike_outs,
                          score.innings_pitched, score.strikeouts_pitched, score.hits_allowed, score.earned_runs
                        ].map((v, j) => (
                          <td key={j} style={{ padding: '8px', textAlign: 'center', color: 'var(--color-cyan)', borderBottom: '1px solid rgba(0,255,255,0.05)' }}>{v || 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaguePlayerPage;
