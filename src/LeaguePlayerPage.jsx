import React, { useState } from 'react';
import './LeaguePlayerPage.css';

// Mock player data - will be replaced with Supabase data
const mockPlayer = {
  id: '1',
  player_name: 'Sample Player',
  overall: 88,
  team: 'Team 1',
  position: 'Pitcher',
  roblox_id: '123456789',
  spotify_url: 'https://open.spotify.com/artist/...',
  bio: 'Elite pitcher with amazing control',
  hitting_stats: {
    season: {
      games_played: 45,
      at_bats: 120,
      hits: 35,
      doubles: 8,
      triples: 1,
      home_runs: 5,
      runs_batted_in: 22,
      runs: 18,
      stolen_bases: 3,
      strike_outs: 25,
    },
    career: {
      games_played: 150,
      at_bats: 450,
      hits: 125,
      home_runs: 18,
    },
  },
  advanced_hitting_stats: {
    season: {
      batting_average: 0.292,
      on_base_percentage: 0.351,
      slugging_percentage: 0.425,
      ops: 0.776,
      war: 2.5,
    },
    career: {
      batting_average: 0.278,
      ops: 0.742,
      war: 7.3,
    },
  },
  pitching_stats: {
    season: {
      games_played: 25,
      innings_pitched: 185.2,
      wins: 14,
      losses: 6,
      earned_run_average: 2.85,
      strikeouts: 198,
      walks: 52,
      hits_allowed: 142,
      home_runs_allowed: 12,
      saves: 0,
    },
    career: {
      wins: 45,
      losses: 18,
      era: 3.12,
    },
  },
  advanced_pitching_stats: {
    season: {
      whip: 1.05,
      strikeout_to_walk_ratio: 3.81,
      fip: 2.95,
      war: 4.2,
    },
    career: {
      whip: 1.08,
      fip: 3.18,
      war: 12.5,
    },
  },
};

const LeaguePlayerPage = ({ playerId }) => {
  const [careerToggles, setCareerToggles] = useState({
    hitting: false,
    advancedHitting: false,
    pitching: false,
    advancedPitching: false,
  });

  const player = mockPlayer;

  const toggleCareer = (stat) => {
    setCareerToggles({
      ...careerToggles,
      [stat]: !careerToggles[stat],
    });
  };

  return (
    <div className="league-player-page">
      <div className="player-container">
        {/* LEFT SIDE - TRADING CARD */}
        <div className="player-card neon-card">
          <div className="card-avatar">
            {player.roblox_id ? (
              <img
                src={`https://www.roblox.com/bust-thumbnails/json?userIds=${player.roblox_id}&size=420x420&format=Png&isCircular=false`}
                alt={player.player_name}
                onError={(e) => {
                  e.target.src = '🎮';
                }}
              />
            ) : (
              <div className="avatar-placeholder">🎮</div>
            )}
          </div>

          <div className="card-content">
            <h2 className="card-name">{player.player_name}</h2>
            <div className="card-team">{player.team}</div>
            <div className="card-position">{player.position}</div>

            <div className="card-overall">
              <span className="label">Overall</span>
              <span className="value">{player.overall}</span>
            </div>

            <div className="card-divider"></div>

            {player.spotify_url && (
              <div className="card-spotify">
                <div className="spotify-label">🎵 Favorite Song</div>
                <iframe
                  title="Spotify player"
                  src={`https://open.spotify.com/embed?utm_source=generator`}
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

        {/* RIGHT SIDE - STATS */}
        <div className="player-stats">
          {/* HITTING STATS */}
          <div className="stats-section neon-card">
            <div className="stats-header">
              <h3 className="gradient-text-cyan">Season Hitting Stats</h3>
              <button
                className="career-toggle"
                onClick={() => toggleCareer('hitting')}
              >
                {careerToggles.hitting ? 'Career' : 'Season'}
              </button>
            </div>

            <div className="stats-grid">
              {careerToggles.hitting
                ? Object.entries(player.hitting_stats.career).map(([key, value]) => (
                    <div key={key} className="stat-item">
                      <span className="stat-label">{formatStatName(key)}</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))
                : Object.entries(player.hitting_stats.season).map(([key, value]) => (
                    <div key={key} className="stat-item">
                      <span className="stat-label">{formatStatName(key)}</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
            </div>
          </div>

          {/* ADVANCED HITTING STATS */}
          <div className="stats-section neon-card">
            <div className="stats-header">
              <h3 className="gradient-text-magenta">Advanced Hitting Stats</h3>
              <button
                className="career-toggle"
                onClick={() => toggleCareer('advancedHitting')}
              >
                {careerToggles.advancedHitting ? 'Career' : 'Season'}
              </button>
            </div>

            <div className="stats-grid">
              {careerToggles.advancedHitting
                ? Object.entries(player.advanced_hitting_stats.career).map(
                    ([key, value]) => (
                      <div key={key} className="stat-item">
                        <span className="stat-label">{formatStatName(key)}</span>
                        <span className="stat-value">
                          {typeof value === 'number' && value < 10
                            ? value.toFixed(3)
                            : value}
                        </span>
                      </div>
                    )
                  )
                : Object.entries(player.advanced_hitting_stats.season).map(
                    ([key, value]) => (
                      <div key={key} className="stat-item">
                        <span className="stat-label">{formatStatName(key)}</span>
                        <span className="stat-value">
                          {typeof value === 'number' && value < 10
                            ? value.toFixed(3)
                            : value}
                        </span>
                      </div>
                    )
                  )}
            </div>
          </div>

          {/* PITCHING STATS */}
          <div className="stats-section neon-card">
            <div className="stats-header">
              <h3 className="gradient-text-cyan">Season Pitching Stats</h3>
              <button
                className="career-toggle"
                onClick={() => toggleCareer('pitching')}
              >
                {careerToggles.pitching ? 'Career' : 'Season'}
              </button>
            </div>

            <div className="stats-grid">
              {careerToggles.pitching
                ? Object.entries(player.pitching_stats.career).map(([key, value]) => (
                    <div key={key} className="stat-item">
                      <span className="stat-label">{formatStatName(key)}</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))
                : Object.entries(player.pitching_stats.season).map(([key, value]) => (
                    <div key={key} className="stat-item">
                      <span className="stat-label">{formatStatName(key)}</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
            </div>
          </div>

          {/* ADVANCED PITCHING STATS */}
          <div className="stats-section neon-card">
            <div className="stats-header">
              <h3 className="gradient-text-magenta">Advanced Pitching Stats</h3>
              <button
                className="career-toggle"
                onClick={() => toggleCareer('advancedPitching')}
              >
                {careerToggles.advancedPitching ? 'Career' : 'Season'}
              </button>
            </div>

            <div className="stats-grid">
              {careerToggles.advancedPitching
                ? Object.entries(player.advanced_pitching_stats.career).map(
                    ([key, value]) => (
                      <div key={key} className="stat-item">
                        <span className="stat-label">{formatStatName(key)}</span>
                        <span className="stat-value">
                          {typeof value === 'number' && value < 10
                            ? value.toFixed(2)
                            : value}
                        </span>
                      </div>
                    )
                  )
                : Object.entries(player.advanced_pitching_stats.season).map(
                    ([key, value]) => (
                      <div key={key} className="stat-item">
                        <span className="stat-label">{formatStatName(key)}</span>
                        <span className="stat-value">
                          {typeof value === 'number' && value < 10
                            ? value.toFixed(2)
                            : value}
                        </span>
                      </div>
                    )
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to format stat names
const formatStatName = (key) => {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default LeaguePlayerPage;
