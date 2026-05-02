import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { supabaseHelpers } from './services/supabaseClient';
import './OwnerDashboard.css';

const OwnerDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('players');
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    // For now, mock data - will connect to Supabase
    const mockPlayers = [
      {
        id: '1',
        player_name: 'Player 1',
        team_id: 'team1',
        overall: 85,
        roblox_id: '123456',
        spotify_url: '',
        position: 'Pitcher',
        number: 1,
        bio: 'Elite pitcher',
      },
    ];
    setPlayers(mockPlayers);
    setLoading(false);
  };

  const handleSavePlayer = (playerData) => {
    // Mock save - will integrate with Supabase
    if (editingPlayer) {
      setPlayers(players.map((p) => (p.id === editingPlayer.id ? playerData : p)));
    } else {
      setPlayers([...players, { ...playerData, id: Date.now().toString() }]);
    }
    setEditingPlayer(null);
  };

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="gradient-text">Owner Dashboard</h1>
        <button className="neon-button" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          🎮 League Players
        </button>
        <button
          className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          👥 Teams
        </button>
        <button
          className={`tab ${activeTab === 'league' ? 'active' : ''}`}
          onClick={() => setActiveTab('league')}
        >
          ⚙️ League Settings
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'players' && (
          <PlayersTab
            players={players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelectedPlayer}
            editingPlayer={editingPlayer}
            onEditPlayer={setEditingPlayer}
            onSavePlayer={handleSavePlayer}
            loading={loading}
          />
        )}

        {activeTab === 'teams' && <TeamsTab />}

        {activeTab === 'league' && <LeagueSettingsTab />}
      </div>
    </div>
  );
};

const PlayersTab = ({
  players,
  selectedPlayer,
  onSelectPlayer,
  editingPlayer,
  onEditPlayer,
  onSavePlayer,
  loading,
}) => {
  return (
    <div className="dashboard-tab-content">
      <div className="players-list">
        <div className="list-header">
          <h3>League Players</h3>
          <button className="neon-button" onClick={() => onEditPlayer({})}>
            + Add Player
          </button>
        </div>

        {players.map((player) => (
          <div
            key={player.id}
            className={`player-item ${selectedPlayer?.id === player.id ? 'selected' : ''}`}
            onClick={() => onSelectPlayer(player)}
          >
            <div className="player-info">
              <div className="player-name">{player.player_name}</div>
              <div className="player-details">
                {player.position} • Overall {player.overall}
              </div>
            </div>
            <button
              className="edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEditPlayer(player);
              }}
            >
              ✏️
            </button>
          </div>
        ))}
      </div>

      {editingPlayer && (
        <PlayerEditForm player={editingPlayer} onSave={onSavePlayer} />
      )}
    </div>
  );
};

const PlayerEditForm = ({ player, onSave }) => {
  const [formData, setFormData] = useState(
    player || {
      player_name: '',
      team_id: '',
      overall: 75,
      roblox_id: '',
      spotify_url: '',
      position: '',
      number: '',
      bio: '',
    }
  );

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="player-edit-form neon-card p-3">
      <h3 className="gradient-text-cyan">Edit Player</h3>

      <div className="form-grid">
        <div className="form-field">
          <label>Player Name</label>
          <input
            type="text"
            value={formData.player_name}
            onChange={(e) => handleChange('player_name', e.target.value)}
            placeholder="Player name"
          />
        </div>

        <div className="form-field">
          <label>Roblox ID</label>
          <input
            type="text"
            value={formData.roblox_id}
            onChange={(e) => handleChange('roblox_id', e.target.value)}
            placeholder="Roblox user ID"
          />
        </div>

        <div className="form-field">
          <label>Overall Rating</label>
          <input
            type="number"
            value={formData.overall}
            onChange={(e) => handleChange('overall', e.target.value)}
            min="0"
            max="100"
          />
        </div>

        <div className="form-field">
          <label>Position</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => handleChange('position', e.target.value)}
            placeholder="e.g. Pitcher, Batter"
          />
        </div>

        <div className="form-field">
          <label>Jersey Number</label>
          <input
            type="number"
            value={formData.number}
            onChange={(e) => handleChange('number', e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Spotify URL</label>
          <input
            type="text"
            value={formData.spotify_url}
            onChange={(e) => handleChange('spotify_url', e.target.value)}
            placeholder="Spotify song/artist link"
          />
        </div>

        <div className="form-field full-width">
          <label>Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            placeholder="Player bio"
            rows="3"
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="neon-button" onClick={() => onSave(formData)}>
          Save Player
        </button>
      </div>
    </div>
  );
};

const TeamsTab = () => {
  return (
    <div className="dashboard-tab-content">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">Teams Management</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          Coming soon - Manage NABB teams here
        </p>
      </div>
    </div>
  );
};

const LeagueSettingsTab = () => {
  return (
    <div className="dashboard-tab-content">
      <div className="neon-card p-3">
        <h3 className="gradient-text-cyan">League Settings</h3>
        <p style={{ marginTop: '15px', color: 'rgba(192, 208, 255, 0.7)' }}>
          Coming soon - Configure league settings here
        </p>
      </div>
    </div>
  );
};

export default OwnerDashboard;
