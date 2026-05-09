import React, { useState } from 'react';
import './LeaguePlayerPage.css';

const toSpotifyEmbed = (url) => {
  if (!url) return url;
  if (url.includes('/embed/')) return url;
  return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
};

const safe = (n) => parseFloat(n) || 0;
const safeInt = (n) => parseInt(n) || 0;
const fmt = (n, decimals = 2) => isNaN(n) || !isFinite(n) ? 'â€”' : Number(n).toFixed(decimals);

// â”€â”€ Savant Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SavantCard = ({ player }) => {
  const pctColor = (p) => {
    const n = parseFloat(p);
    if (isNaN(n)) return 'rgba(192,208,255,0.3)';
    if (n >= 70) return '#00d4f5';
    if (n >= 30) return '#ffd700';
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
          <span className="sv-bar-val" style={{ color }}>{value || 'â€”'}</span>
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
        <h3 className="gradient-text-cyan">â­ Savant Card</h3>
        <span className="sv-subtitle">Percentile Rankings</span>
      </div>
      <div className="sv-legend">
        <span style={{ color: '#ff4d4d' }}>â— POOR</span>
        <span style={{ color: '#ffd700' }}>â— AVERAGE</span>
        <span style={{ color: '#00d4f5' }}>â— GREAT</span>
      </div>
      {batting.length > 0 && (
        <>
          <div className="sv-section-label">Batting</div>
          <div className="sv-bars">
            {batting.map((s, i) => <Bar key={i} {...s} />)}
          </div>
        </>
      )}
      {pitching.length > 0 && (
        <>
          <div className="sv-section-label">Pitching</div>
          <div className="sv-bars">
            {pitching.map((s, i) => <Bar key={i} {...s} />)}
          </div>
        </>
      )}
    </div>
  );
};

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

const LeaguePlayerPage = ({ player, onBack, leaguePrefix }) => {
  const [toggles, setToggles] = useState({
    hitBasic: false,
    hitAdv: false,
    pitchBasic: false,
    pitchAdv: false,
  });

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  if (!player) {
    return (
      <div className="league-player-page">
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(192,208,255,0.6)' }}>No player selected.</p>
          {onBack && <button className="neon-button" style={{ marginTop: '15px' }} onClick={onBack}>â† Back</button>}
        </div>
      </div>
    );
  }

  
  const boxScores = JSON.parse(localStorage.getItem(`${leaguePrefix || 'nabb'}_box_scores`) || '[]');
  const playerScores = boxScores.filter(b => b.player_id === player.id);
  const gamesPlayed = playerScores.length;
  const gamesPitched = playerScores.filter(b => safe(b.innings_pitched) > 0).length;

  // Season aggregates (box scores + editable season base stats from dashboard)
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
  const sAVG = player.season_avg || (sAB > 0 ? (sH/sAB).toFixed(3) : 'â€”');
  const sOBP = player.season_obp || 'â€”';
  const sSLG = player.season_slg || 'â€”';
  const sOPS = player.season_ops || 'â€”';

  // Career aggregates (career base stats from dashboard)
  const cH   = safeInt(player.hits)   || sH;
  const cR   = safeInt(player.runs)   || sR;
  const cRBI = safeInt(player.rbis)   || sRBI;
  const cHR  = safeInt(player.home_runs) || sHR;
  const cSO  = safeInt(player.strike_outs) || sSO;
  const cIP  = safe(player.innings_pitched) || sIP;
  const cKP  = safeInt(player.strikeouts_pitched) || sKP;
  const cHA  = safeInt(player.hits_allowed) || sHA;
  const cER  = safeInt(player.earned_runs) || sER;
  const cG   = safeInt(player.career_g) || sG;
  const cAB  = safeInt(player.career_ab) || sAB;
  const cAVG = player.career_avg || (cAB > 0 ? (cH/cAB).toFixed(3) : 'â€”');
  const cOBP = player.career_obp || 'â€”';
  const cSLG = player.career_slg || 'â€”';
  const cOPS = player.career_ops || 'â€”';

  // Build stat rows
  const hitBasicSeason = [
    { label: 'G',   value: sG },
    { label: 'AB',  value: sAB || 'â€”' },
    { label: 'AVG', value: sAVG },
    { label: 'OBP', value: sOBP },
    { label: 'SLG', value: sSLG },
    { label: 'OPS', value: sOPS },
    { label: 'H',   value: sH },
    { label: 'R',   value: sR },
    { label: 'RBI', value: sRBI },
    { label: 'HR',  value: sHR },
    { label: 'K',   value: sSO },
    { label: 'BB',  value: player.season_bb || 'â€”' },
    { label: 'SB',  value: player.season_sb || 'â€”' },
  ];
  const hitBasicCareer = [
    { label: 'G',   value: cG },
    { label: 'AB',  value: cAB || 'â€”' },
    { label: 'AVG', value: cAVG },
    { label: 'OBP', value: cOBP },
    { label: 'SLG', value: cSLG },
    { label: 'OPS', value: cOPS },
    { label: 'H',   value: cH },
    { label: 'R',   value: cR },
    { label: 'RBI', value: cRBI },
    { label: 'HR',  value: cHR },
    { label: 'K',   value: cSO },
    { label: 'BB',  value: player.career_bb || 'â€”' },
    { label: 'SB',  value: player.career_sb || 'â€”' },
  ];

  const sGP = Math.max(gamesPlayed, sH > 0 || sR > 0 || sHR > 0 ? 1 : 0);
  const hitAdvSeason = [
    { label: 'H / Game',   value: player.adv_s_h_per_game   || (sGP ? fmt(sH   / sGP) : 'â€”') },
    { label: 'R / Game',   value: player.adv_s_r_per_game   || (sGP ? fmt(sR   / sGP) : 'â€”') },
    { label: 'RBI / Game', value: player.adv_s_rbi_per_game || (sGP ? fmt(sRBI / sGP) : 'â€”') },
    { label: 'HR / Game',  value: player.adv_s_hr_per_game  || (sGP ? fmt(sHR  / sGP) : 'â€”') },
    { label: 'K / Game',   value: player.adv_s_k_per_game   || (sGP ? fmt(sSO  / sGP) : 'â€”') },
  ];
  const hitAdvCareer = [
    { label: 'H / Game',   value: player.adv_h_per_game   || (gamesPlayed ? fmt(cH   / gamesPlayed) : 'â€”') },
    { label: 'R / Game',   value: player.adv_r_per_game   || (gamesPlayed ? fmt(cR   / gamesPlayed) : 'â€”') },
    { label: 'RBI / Game', value: player.adv_rbi_per_game || (gamesPlayed ? fmt(cRBI / gamesPlayed) : 'â€”') },
    { label: 'HR / Game',  value: player.adv_hr_per_game  || (gamesPlayed ? fmt(cHR  / gamesPlayed) : 'â€”') },
    { label: 'K / Game',   value: player.adv_k_per_game   || (gamesPlayed ? fmt(cSO  / gamesPlayed) : 'â€”') },
  ];

  const pitchBasicSeason = [
    { label: 'Games Pitched',  value: gamesPitched },
    { label: 'Innings Pitched', value: sIP.toFixed(1) },
    { label: 'Strikeouts',     value: sKP },
    { label: 'Hits Allowed',   value: sHA },
    { label: 'Earned Runs',    value: sER },
  ];
  const pitchBasicCareer = [
    { label: 'Games Pitched',  value: gamesPitched },
    { label: 'Innings Pitched', value: cIP.toFixed(1) },
    { label: 'Strikeouts',     value: cKP },
    { label: 'Hits Allowed',   value: cHA },
    { label: 'Earned Runs',    value: cER },
  ];

  const calcAdv = (ip, er, k, ha) => ({
    era:  ip > 0 ? fmt((er / ip) * 9) : 'â€”',
    k9:   ip > 0 ? fmt((k  / ip) * 9) : 'â€”',
    h9:   ip > 0 ? fmt((ha / ip) * 9) : 'â€”',
    kPer: ip > 0 ? fmt(k / (ip / 9)) : 'â€”',
  });

  const sAdv = calcAdv(sIP, sER, sKP, sHA);
  const cAdv = calcAdv(cIP, cER, cKP, cHA);

  const pitchAdvSeason = [
    { label: 'ERA',        value: player.adv_s_era || sAdv.era },
    { label: 'K/9',        value: player.adv_s_k9  || sAdv.k9 },
    { label: 'H/9',        value: player.adv_s_h9  || sAdv.h9 },
    { label: 'K Per Game', value: gamesPitched ? fmt(sKP / gamesPitched) : 'â€”' },
    { label: 'ER/9',       value: player.adv_s_er9 || (sIP > 0 ? fmt((sER / sIP) * 9) : 'â€”') },
  ];
  const pitchAdvCareer = [
    { label: 'ERA',        value: player.adv_era || cAdv.era },
    { label: 'K/9',        value: player.adv_k9  || cAdv.k9 },
    { label: 'H/9',        value: player.adv_h9  || cAdv.h9 },
    { label: 'K Per Game', value: gamesPitched ? fmt(cKP / gamesPitched) : 'â€”' },
    { label: 'ER/9',       value: player.adv_er9 || (cIP > 0 ? fmt((cER / cIP) * 9) : 'â€”') },
  ];

  const avatarSrc = player.avatar_data || null;

  return (
    <div className="league-player-page">
      {onBack && (
        <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={onBack}>
          â† Back to League
        </button>
      )}

      <div className="player-container">
        {/* LEFT â€” Trading Card */}
        <div className="player-card neon-card">
          <div className="card-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt={player.player_name} />
            ) : (
              <div className="avatar-placeholder">ðŸŽ®</div>
            )}
          </div>

          <div className="card-content">
            <h2 className="card-name">{player.player_name}</h2>
            <div className="card-team">{player.team || 'Free Agent'}</div>
            <div className="card-position">{player.position || 'â€”'}</div>

            <div className="card-overall">
              <span className="label">Overall</span>
              <span className="value">{player.overall || 'â€”'}</span>
            </div>

            {player.number && (
              <div className="card-overall">
                <span className="label">Number</span>
                <span className="value">#{player.number}</span>
              </div>
            )}

            <div className="card-divider"></div>

            {player.spotify_url && (
              <div className="card-spotify">
                <div className="spotify-label">ðŸŽµ Favorite Song</div>
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

        {/* RIGHT â€” Stats */}
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
              <h3 className="gradient-text-cyan" style={{ marginBottom: '15px' }}>ðŸ“‹ Game Log</h3>
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
