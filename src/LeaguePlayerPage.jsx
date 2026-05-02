import React, { useState, useEffect } from 'react';
import './LeaguePlayerPage.css';

const toSpotifyEmbed = (url) => {
  if (!url) return url;
  if (url.includes('/embed/')) return url;
  return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
};

const safe = (n) => parseFloat(n) || 0;
const safeInt = (n) => parseInt(n) || 0;
const fmt = (n, decimals = 2) => isNaN(n) || !isFinite(n) ? '—' : Number(n).toFixed(decimals);

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

const LeaguePlayerPage = ({ player, onBack }) => {
  const [toggles, setToggles] = useState({
    hitBasic: false,
    hitAdv: false,
    pitchBasic: false,
    pitchAdv: false,
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [player?.roblox_id]);

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  if (!player) {
    return (
      <div className="league-player-page">
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(192,208,255,0.6)' }}>No player selected.</p>
          {onBack && <button className="neon-button" style={{ marginTop: '15px' }} onClick={onBack}>← Back</button>}
        </div>
      </div>
    );
  }

  const boxScores = JSON.parse(localStorage.getItem('nabb_box_scores') || '[]');
  const playerScores = boxScores.filter(b => b.player_id === player.id);
  const gamesPlayed = playerScores.length;
  const gamesPitched = playerScores.filter(b => safe(b.innings_pitched) > 0).length;

  // Season aggregates (box scores only)
  const sH   = playerScores.reduce((s, b) => s + safeInt(b.hits), 0);
  const sR   = playerScores.reduce((s, b) => s + safeInt(b.runs), 0);
  const sRBI = playerScores.reduce((s, b) => s + safeInt(b.rbis), 0);
  const sHR  = playerScores.reduce((s, b) => s + safeInt(b.home_runs), 0);
  const sSO  = playerScores.reduce((s, b) => s + safeInt(b.strike_outs), 0);
  const sIP  = playerScores.reduce((s, b) => s + safe(b.innings_pitched), 0);
  const sKP  = playerScores.reduce((s, b) => s + safeInt(b.strikeouts_pitched), 0);
  const sHA  = playerScores.reduce((s, b) => s + safeInt(b.hits_allowed), 0);
  const sER  = playerScores.reduce((s, b) => s + safeInt(b.earned_runs), 0);

  // Career aggregates (box scores + player base stats)
  const cH   = sH   + safeInt(player.hits);
  const cR   = sR   + safeInt(player.runs);
  const cRBI = sRBI + safeInt(player.rbis);
  const cHR  = sHR  + safeInt(player.home_runs);
  const cSO  = sSO  + safeInt(player.strike_outs);
  const cIP  = sIP  + safe(player.innings_pitched);
  const cKP  = sKP  + safeInt(player.strikeouts_pitched);
  const cHA  = sHA  + safeInt(player.hits_allowed);
  const cER  = sER  + safeInt(player.earned_runs);

  // Build stat rows
  const hitBasicSeason = [
    { label: 'Games Played', value: gamesPlayed },
    { label: 'Hits',         value: sH },
    { label: 'Runs',         value: sR },
    { label: 'RBIs',         value: sRBI },
    { label: 'Home Runs',    value: sHR },
    { label: 'Strike Outs',  value: sSO },
  ];
  const hitBasicCareer = [
    { label: 'Games Played', value: gamesPlayed },
    { label: 'Hits',         value: cH },
    { label: 'Runs',         value: cR },
    { label: 'RBIs',         value: cRBI },
    { label: 'Home Runs',    value: cHR },
    { label: 'Strike Outs',  value: cSO },
  ];

  const hitAdvSeason = [
    { label: 'H / Game',   value: gamesPlayed ? fmt(sH / gamesPlayed) : '—' },
    { label: 'R / Game',   value: gamesPlayed ? fmt(sR / gamesPlayed) : '—' },
    { label: 'RBI / Game', value: gamesPlayed ? fmt(sRBI / gamesPlayed) : '—' },
    { label: 'HR / Game',  value: gamesPlayed ? fmt(sHR / gamesPlayed) : '—' },
    { label: 'K / Game',   value: gamesPlayed ? fmt(sSO / gamesPlayed) : '—' },
  ];
  const hitAdvCareer = [
    { label: 'H / Game',   value: gamesPlayed ? fmt(cH / gamesPlayed) : '—' },
    { label: 'R / Game',   value: gamesPlayed ? fmt(cR / gamesPlayed) : '—' },
    { label: 'RBI / Game', value: gamesPlayed ? fmt(cRBI / gamesPlayed) : '—' },
    { label: 'HR / Game',  value: gamesPlayed ? fmt(cHR / gamesPlayed) : '—' },
    { label: 'K / Game',   value: gamesPlayed ? fmt(cSO / gamesPlayed) : '—' },
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
    era:  ip > 0 ? fmt((er / ip) * 9) : '—',
    k9:   ip > 0 ? fmt((k  / ip) * 9) : '—',
    h9:   ip > 0 ? fmt((ha / ip) * 9) : '—',
    kPer: ip > 0 ? fmt(k / (ip / 9)) : '—',
  });

  const sAdv = calcAdv(sIP, sER, sKP, sHA);
  const cAdv = calcAdv(cIP, cER, cKP, cHA);

  const pitchAdvSeason = [
    { label: 'ERA',   value: sAdv.era },
    { label: 'K/9',   value: sAdv.k9 },
    { label: 'H/9',   value: sAdv.h9 },
    { label: 'K Per Game', value: gamesPitched ? fmt(sKP / gamesPitched) : '—' },
    { label: 'ER/9',  value: sIP > 0 ? fmt((sER / sIP) * 9) : '—' },
  ];
  const pitchAdvCareer = [
    { label: 'ERA',   value: cAdv.era },
    { label: 'K/9',   value: cAdv.k9 },
    { label: 'H/9',   value: cAdv.h9 },
    { label: 'K Per Game', value: gamesPitched ? fmt(cKP / gamesPitched) : '—' },
    { label: 'ER/9',  value: cIP > 0 ? fmt((cER / cIP) * 9) : '—' },
  ];

  const avatarSrc = player.roblox_id
    ? `https://www.roblox.com/headshot-thumbnail/image?userId=${player.roblox_id}&width=420&height=420&format=png`
    : null;

  return (
    <div className="league-player-page">
      {onBack && (
        <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={onBack}>
          ← Back to League
        </button>
      )}

      <div className="player-container">
        {/* LEFT — Trading Card */}
        <div className="player-card neon-card">
          <div className="card-avatar">
            {avatarSrc && !imgError ? (
              <img
                src={avatarSrc}
                alt={player.player_name}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="avatar-placeholder">🎮</div>
            )}
          </div>

          <div className="card-content">
            <h2 className="card-name">{player.player_name}</h2>
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

            <div className="card-divider"></div>

            {player.spotify_url && (
              <div className="card-spotify">
                <div className="spotify-label">🎵 Favorite Song</div>
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
          <StatSection
            title="⚾ Season Hitting Stats"
            color="cyan"
            stats={toggles.hitBasic ? hitBasicCareer : hitBasicSeason}
            isCareer={toggles.hitBasic}
            onToggle={() => toggle('hitBasic')}
          />
          <StatSection
            title="📊 Advanced Hitting Stats"
            color="magenta"
            stats={toggles.hitAdv ? hitAdvCareer : hitAdvSeason}
            isCareer={toggles.hitAdv}
            onToggle={() => toggle('hitAdv')}
          />
          <StatSection
            title="⚡ Season Pitching Stats"
            color="cyan"
            stats={toggles.pitchBasic ? pitchBasicCareer : pitchBasicSeason}
            isCareer={toggles.pitchBasic}
            onToggle={() => toggle('pitchBasic')}
          />
          <StatSection
            title="📈 Advanced Pitching Stats"
            color="magenta"
            stats={toggles.pitchAdv ? pitchAdvCareer : pitchAdvSeason}
            isCareer={toggles.pitchAdv}
            onToggle={() => toggle('pitchAdv')}
          />

          {/* Game Log */}
          {playerScores.length > 0 && (
            <div className="stats-section neon-card">
              <h3 className="gradient-text-cyan" style={{ marginBottom: '15px' }}>📋 Game Log</h3>
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
