import React, { useState, useEffect } from 'react';
import { lastfmService } from '../../services/lastfmService';
import '../pages/Pages.css';

const LastFmPage = () => {
  const [username, setUsername] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tracks');

  const handleSearch = async () => {
    if (!searchInput.trim()) return;

    setLoading(true);
    setUsername(searchInput);

    try {
      const [tracks, artists, info] = await Promise.all([
        lastfmService.getTopTracks(searchInput, 20),
        lastfmService.getTopArtists(searchInput, 20),
        lastfmService.getUserInfo(searchInput)
      ]);

      setTopTracks(tracks);
      setTopArtists(artists);
      setUserInfo(info);
    } catch (error) {
      console.error('Error fetching Last.fm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="gradient-text">🎵 Last.fm Music Stats</h1>
        <p style={{ color: 'rgba(192, 208, 255, 0.7)', marginTop: '10px' }}>
          Discover your music taste and see what you've been listening to
        </p>
      </div>

      <div className="search-section" style={{ marginTop: '30px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter Last.fm username..."
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#c0d0ff',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="neon-button"
            style={{ minWidth: '120px' }}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {userInfo && (
        <div className="neon-card p-3" style={{ marginBottom: '30px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {userInfo.image?.[2]?.['#text'] && (
              <img
                src={userInfo.image[2]['#text']}
                alt={userInfo.name}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  border: '2px solid var(--color-cyan)'
                }}
              />
            )}
            <div>
              <h3 className="gradient-text-cyan" style={{ marginBottom: '10px' }}>
                {userInfo.name}
              </h3>
              <div style={{ color: 'rgba(192, 208, 255, 0.7)', fontSize: '0.9rem' }}>
                <div>📊 Total Scrobbles: <span style={{ color: 'var(--color-cyan)' }}>{userInfo.playcount}</span></div>
                <div>👥 Followers: <span style={{ color: 'var(--color-cyan)' }}>{userInfo.subscriber === '1' ? 'Subscriber' : 'Free User'}</span></div>
                {userInfo.registered && (
                  <div>
                    📅 Member Since:{' '}
                    <span style={{ color: 'var(--color-cyan)' }}>
                      {new Date(parseInt(userInfo.registered['#text']) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(topTracks.length > 0 || topArtists.length > 0) && (
        <div>
          <div className="tabs-container" style={{ marginBottom: '30px' }}>
            <button
              className={`tab ${activeTab === 'tracks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracks')}
            >
              🎵 Top Tracks
            </button>
            <button
              className={`tab ${activeTab === 'artists' ? 'active' : ''}`}
              onClick={() => setActiveTab('artists')}
            >
              🎤 Top Artists
            </button>
          </div>

          {activeTab === 'tracks' && (
            <div className="tracks-grid">
              {topTracks.map((track, index) => (
                <div key={`${track.artist.name}-${track.name}`} className="neon-card p-3">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--color-magenta)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      #{index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 className="gradient-text-cyan" style={{ margin: '0 0 5px 0', fontSize: '0.95rem' }}>
                        {track.name}
                      </h4>
                      <p style={{ margin: 0, color: 'rgba(192, 208, 255, 0.7)', fontSize: '0.85rem' }}>
                        {track.artist.name}
                      </p>
                    </div>
                  </div>
                  {track.image?.[2]?.['#text'] && (
                    <img
                      src={track.image[2]['#text']}
                      alt={track.name}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}
                    />
                  )}
                  <div style={{ color: 'rgba(192, 208, 255, 0.7)', fontSize: '0.85rem' }}>
                    🔥 {track.playcount} plays
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'artists' && (
            <div className="artists-grid">
              {topArtists.map((artist, index) => (
                <div key={artist.name} className="neon-card p-3">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div
                      style={{
                        width: '45px',
                        height: '45px',
                        background: 'var(--color-magenta)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      #{index + 1}
                    </div>
                    <h4 className="gradient-text-cyan" style={{ margin: 0 }}>
                      {artist.name}
                    </h4>
                  </div>
                  {artist.image?.[2]?.['#text'] && (
                    <img
                      src={artist.image[2]['#text']}
                      alt={artist.name}
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}
                    />
                  )}
                  <div style={{ color: 'rgba(192, 208, 255, 0.7)', fontSize: '0.85rem' }}>
                    🔥 {artist.playcount} plays
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!username && !loading && (
        <div className="empty-state" style={{ textAlign: 'center', marginTop: '60px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎵</div>
          <p style={{ color: 'rgba(192, 208, 255, 0.7)', fontSize: '1.1rem' }}>
            Search for a Last.fm username to see music stats
          </p>
        </div>
      )}
    </div>
  );
};

export default LastFmPage;
