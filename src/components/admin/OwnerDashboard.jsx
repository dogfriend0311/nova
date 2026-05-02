import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './OwnerDashboard.css';

const OwnerDashboard = ({ onExit }) => {
  const { logout, user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('players');

  // Role check
  const canAccessNABB = hasPermission('nabb_helper');
  const canAccessAll = user?.role === 'owner' || user?.role === 'cofounder' || user?.role === 'mod';

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="gradient-text">Owner Dashboard</h1>
        <div className="header-actions">
          <span className="user-role" style={{ marginRight: '20px' }}>
            Role: <span style={{ color: 'var(--color-cyan)' }}>{user?.role?.toUpperCase()}</span>
          </span>
          <button className="neon-button" onClick={onExit} style={{ marginRight: '10px' }}>
            Back to Nova
          </button>
          <button className="neon-button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        {canAccessAll && (
          <>
            <button
              className={`tab ${activeTab === 'league-players' ? 'active' : ''}`}
              onClick={() => setActiveTab('league-players')}
            >
              🎮 League Players
            </button>
            <button
              className={`tab ${activeTab === 'member-pages' ? 'active' : ''}`}
              onClick={() => setActiveTab('member-pages')}
            >
              👥 Member Pages
            </button>
            <button
              className={`tab ${activeTab === 'user-roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('user-roles')}
            >
              🔐 User Roles
            </button>
          </>
        )}
        
        {canAccessNABB && (
          <>
            <button
              className={`tab ${activeTab === 'nabb-teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('nabb-teams')}
            >
              ⚾ NABB Teams
            </button>
            <button
              className={`tab ${activeTab === 'nabb-rosters' ? 'active' : ''}`}
              onClick={() => setActiveTab('nabb-rosters')}
            >
              👥 NABB Rosters
            </button>
            <button
              className={`tab ${activeTab === 'nabb-games' ? 'active' : ''}`}
              onClick={() => setActiveTab('nabb-games')}
            >
              📊 NABB Games
            </button>
            <button
              className={`tab ${activeTab === 'nabb-boxscores' ? 'active' : ''}`}
              onClick={() => setActiveTab('nabb-boxscores')}
            >
              📈 Box Scores
            </button>
            <button
              className={`tab ${activeTab === 'nabb-feed' ? 'active' : ''}`}
              onClick={() => setActiveTab('nabb-feed')}
            >
              📰 Game Feed
            </button>
            <button
              className={`tab ${activeTab === 'nabb-hof' ? 'active' : ''}`}
              onClick={() => setActiveTab('nabb-hof')}
            >
              🏆 Hall of Fame
            </button>
          </>
        )}
      </div>

      <div className="dashboard-content">
        {activeTab === 'league-players' && <LeaguePlayersTab />}
        {activeTab === 'member-pages' && <MemberPagesTab />}
        {activeTab === 'user-roles' && <UserRolesTab />}
        {activeTab === 'nabb-teams' && <NABBTeamsTab />}
        {activeTab === 'nabb-rosters' && <NABBRostersTab />}
        {activeTab === 'nabb-games' && <NABBGamesTab />}
        {activeTab === 'nabb-boxscores' && <NABBBoxScoresTab />}
        {activeTab === 'nabb-feed' && <NABBGameFeedTab />}
        {activeTab === 'nabb-hof' && <NABBHallOfFameTab />}
      </div>
    </div>
  );
};

// LEAGUE PLAYERS TAB
const LeaguePlayersTab = () => {
  const [players, setPlayers] = useState(
    JSON.parse(localStorage.getItem('nabb_players') || '[]')
  );
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({});

  const handleSavePlayer = () => {
    const updatedPlayers = editingPlayer
      ? players.map(p => p.id === editingPlayer.id ? { ...editingPlayer, ...formData } : p)
      : [...players, { id: Date.now().toString(), ...formData }];
    
    setPlayers(updatedPlayers);
    localStorage.setItem('nabb_players', JSON.stringify(updatedPlayers));
    setEditingPlayer(null);
    setFormData({});
  };

  const handleDeletePlayer = (id) => {
    const updatedPlayers = players.filter(p => p.id !== id);
    setPlayers(updatedPlayers);
    localStorage.setItem('nabb_players', JSON.stringify(updatedPlayers));
  };

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2 className="gradient-text-cyan">Create League Players</h2>
        <button className="neon-button" onClick={() => {
          setEditingPlayer({});
          setFormData({
            player_name: '',
            team: '',
            overall: 75,
            roblox_id: '',
            position: '',
            spotify_url: ''
          });
        }}>
          + Add Player
        </button>
      </div>

      {editingPlayer !== null && (
        <div className="neon-card p-3" style={{ marginBottom: '30px' }}>
          <h3 className="gradient-text-magenta">
            {editingPlayer.id ? 'Edit Player' : 'Create New Player'}
          </h3>
          <div className="edit-form">
            <div className="form-field">
              <label>Player Name</label>
              <input
                type="text"
                value={formData.player_name || ''}
                onChange={(e) => setFormData({...formData, player_name: e.target.value})}
                placeholder="Player name"
              />
            </div>

            <div className="form-field">
              <label>Team</label>
              <input
                type="text"
                value={formData.team || ''}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                placeholder="Team name"
              />
            </div>

            <div className="form-field">
              <label>Overall Rating</label>
              <input
                type="number"
                value={formData.overall || 75}
                onChange={(e) => setFormData({...formData, overall: parseInt(e.target.value)})}
                min="0"
                max="100"
              />
            </div>

            <div className="form-field">
              <label>Roblox ID</label>
              <input
                type="text"
                value={formData.roblox_id || ''}
                onChange={(e) => setFormData({...formData, roblox_id: e.target.value})}
                placeholder="Roblox user ID"
              />
            </div>

            <div className="form-field">
              <label>Position</label>
              <input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                placeholder="e.g. Pitcher, Batter"
              />
            </div>

            <div className="form-field">
              <label>Spotify URL</label>
              <input
                type="text"
                value={formData.spotify_url || ''}
                onChange={(e) => setFormData({...formData, spotify_url: e.target.value})}
                placeholder="Spotify link"
              />
            </div>

            <div className="form-actions">
              <button className="neon-button" onClick={handleSavePlayer}>Save Player</button>
              <button className="neon-button" onClick={() => setEditingPlayer(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="players-grid">
        {players.map(player => (
          <div key={player.id} className="neon-card p-3">
            <h4 className="gradient-text-cyan">{player.player_name}</h4>
            <div style={{ marginTop: '15px' }}>
              <div className="data-row">
                <span className="data-label">Team</span>
                <span className="data-value">{player.team}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Position</span>
                <span className="data-value">{player.position}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Overall</span>
                <span className="data-value">{player.overall}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                className="neon-button" 
                style={{ flex: 1, fontSize: '0.8rem' }}
                onClick={() => {
                  setEditingPlayer(player);
                  setFormData(player);
                }}
              >
                Edit
              </button>
              <button 
                className="neon-button" 
                style={{ flex: 1, fontSize: '0.8rem', borderColor: '#ff3333', color: '#ff3333' }}
                onClick={() => handleDeletePlayer(player.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// MEMBER PAGES TAB
const MemberPagesTab = () => {
  const [members, setMembers] = useState(
    JSON.parse(localStorage.getItem('member_profiles') || '[]')
  );
  const [editingMember, setEditingMember] = useState(null);

  const handleEditMember = (member) => {
    setEditingMember(member);
  };

  const handleSaveMember = (updatedMember) => {
    const updated = members.map(m => 
      m.username === updatedMember.username ? updatedMember : m
    );
    setMembers(updated);
    localStorage.setItem('member_profiles', JSON.stringify(updated));
    setEditingMember(null);
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Edit Member Pages</h2>
      
      <div className="members-grid" style={{ marginTop: '20px' }}>
        {members.map(member => (
          <div key={member.username} className="neon-card p-3">
            <h4 className="gradient-text-cyan">{member.username}</h4>
            <p style={{ marginTop: '10px', color: 'rgba(192, 208, 255, 0.7)', fontSize: '0.9rem' }}>
              {member.bio || 'No bio'}
            </p>
            <button 
              className="neon-button" 
              style={{ width: '100%', marginTop: '15px' }}
              onClick={() => handleEditMember(member)}
            >
              Edit Profile
            </button>
          </div>
        ))}
      </div>

      {editingMember && (
        <MemberProfileEditor 
          member={editingMember} 
          onSave={handleSaveMember}
          onCancel={() => setEditingMember(null)}
        />
      )}
    </div>
  );
};

// MEMBER PROFILE EDITOR
const MemberProfileEditor = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState(member);

  return (
    <div className="neon-card p-3" style={{ marginTop: '30px', maxWidth: '600px' }}>
      <h3 className="gradient-text-magenta">Edit {member.username}</h3>
      <div className="edit-form">
        <div className="form-field">
          <label>Bio</label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            placeholder="Bio"
            rows="3"
          />
        </div>

        <div className="form-field">
          <label>Spotify URL</label>
          <input
            type="text"
            value={formData.spotify_url || ''}
            onChange={(e) => setFormData({...formData, spotify_url: e.target.value})}
            placeholder="Spotify link"
          />
        </div>

        <div className="form-field">
          <label>Top Banner URL</label>
          <input
            type="text"
            value={formData.top_banner_url || ''}
            onChange={(e) => setFormData({...formData, top_banner_url: e.target.value})}
            placeholder="Image URL"
          />
        </div>

        <div className="form-actions">
          <button className="neon-button" onClick={() => onSave(formData)}>Save</button>
          <button className="neon-button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// USER ROLES TAB
const UserRolesTab = () => {
  const [users, setUsers] = useState(
    JSON.parse(localStorage.getItem('nova_users') || '[]')
  );

  const updateRole = (username, newRole) => {
    const updated = users.map(u =>
      u.username === username ? {...u, role: newRole} : u
    );
    setUsers(updated);
    localStorage.setItem('nova_users', JSON.stringify(updated));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Manage User Roles</h2>
      
      <table style={{ width: '100%', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(0, 255, 255, 0.2)' }}>
            <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Username</th>
            <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Email</th>
            <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Current Role</th>
            <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Change Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.username} style={{ borderBottom: '1px solid rgba(0, 255, 255, 0.1)' }}>
              <td style={{ padding: '12px' }}>{user.username}</td>
              <td style={{ padding: '12px', fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.7)' }}>{user.email}</td>
              <td style={{ padding: '12px' }}>
                <span className="badge badge-active">{user.role || 'member'}</span>
              </td>
              <td style={{ padding: '12px' }}>
                <select
                  value={user.role || 'member'}
                  onChange={(e) => updateRole(user.username, e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(0, 255, 255, 0.05)',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    color: '#c0d0ff',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="member">Member</option>
                  <option value="nabb_helper">NABB Helper</option>
                  <option value="mod">Mod</option>
                  <option value="cofounder">Co Founder</option>
                  <option value="owner">Owner</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// NABB TEAMS TAB
const NABBTeamsTab = () => {
  const [teams, setTeams] = useState(
    JSON.parse(localStorage.getItem('nabb_teams') || '[]')
  );
  const [newTeam, setNewTeam] = useState({ team_name: '', team_color: '#00ffff' });

  const addTeam = () => {
    if (newTeam.team_name) {
      const updated = [...teams, { id: Date.now().toString(), ...newTeam }];
      setTeams(updated);
      localStorage.setItem('nabb_teams', JSON.stringify(updated));
      setNewTeam({ team_name: '', team_color: '#00ffff' });
    }
  };

  const deleteTeam = (id) => {
    const updated = teams.filter(t => t.id !== id);
    setTeams(updated);
    localStorage.setItem('nabb_teams', JSON.stringify(updated));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Teams</h2>

      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">Create New Team</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Team Name</label>
            <input
              type="text"
              value={newTeam.team_name}
              onChange={(e) => setNewTeam({...newTeam, team_name: e.target.value})}
              placeholder="Team name"
            />
          </div>

          <div className="form-field">
            <label>Team Color</label>
            <input
              type="color"
              value={newTeam.team_color}
              onChange={(e) => setNewTeam({...newTeam, team_color: e.target.value})}
            />
          </div>

          <button className="neon-button" onClick={addTeam}>Create Team</button>
        </div>
      </div>

      <div className="teams-grid">
        {teams.map(team => (
          <div key={team.id} className="neon-card p-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  background: team.team_color,
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              />
              <h4 className="gradient-text-cyan" style={{ margin: 0 }}>{team.team_name}</h4>
            </div>
            <button
              className="neon-button"
              style={{ width: '100%', borderColor: '#ff3333', color: '#ff3333' }}
              onClick={() => deleteTeam(team.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// NABB ROSTERS TAB
const NABBRostersTab = () => {
  const [teams] = useState(
    JSON.parse(localStorage.getItem('nabb_teams') || '[]')
  );
  const [players] = useState(
    JSON.parse(localStorage.getItem('nabb_players') || '[]')
  );

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Rosters</h2>

      <div className="rosters-grid" style={{ marginTop: '20px' }}>
        {teams.map(team => (
          <div key={team.id} className="neon-card p-3">
            <h4 className="gradient-text-cyan">{team.team_name}</h4>
            <div style={{ marginTop: '15px' }}>
              {players.filter(p => p.team === team.team_name).length === 0 ? (
                <p style={{ color: 'rgba(192, 208, 255, 0.6)' }}>No players yet</p>
              ) : (
                <ul style={{ listStyle: 'none' }}>
                  {players.filter(p => p.team === team.team_name).map(player => (
                    <li key={player.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0, 255, 255, 0.1)' }}>
                      <span style={{ color: 'var(--color-cyan)' }}>{player.player_name}</span>
                      <span style={{ marginLeft: '10px', color: 'rgba(192, 208, 255, 0.6)', fontSize: '0.9rem' }}>
                        {player.position}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// NABB GAMES TAB
const NABBGamesTab = () => {
  const [games, setGames] = useState(
    JSON.parse(localStorage.getItem('nabb_games') || '[]')
  );
  const [teams] = useState(
    JSON.parse(localStorage.getItem('nabb_teams') || '[]')
  );
  const [newGame, setNewGame] = useState({
    home_team: '',
    away_team: '',
    game_date: '',
    home_score: 0,
    away_score: 0
  });

  const addGame = () => {
    if (newGame.home_team && newGame.away_team) {
      const updated = [...games, { id: Date.now().toString(), ...newGame, status: 'scheduled' }];
      setGames(updated);
      localStorage.setItem('nabb_games', JSON.stringify(updated));
      setNewGame({ home_team: '', away_team: '', game_date: '', home_score: 0, away_score: 0 });
    }
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Games</h2>

      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">Schedule Game</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Home Team</label>
            <select
              value={newGame.home_team}
              onChange={(e) => setNewGame({...newGame, home_team: e.target.value})}
              style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
            >
              <option value="">Select team</option>
              {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Away Team</label>
            <select
              value={newGame.away_team}
              onChange={(e) => setNewGame({...newGame, away_team: e.target.value})}
              style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
            >
              <option value="">Select team</option>
              {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Game Date</label>
            <input
              type="datetime-local"
              value={newGame.game_date}
              onChange={(e) => setNewGame({...newGame, game_date: e.target.value})}
              style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
            />
          </div>

          <button className="neon-button" onClick={addGame}>Schedule Game</button>
        </div>
      </div>

      <div className="games-list">
        {games.map(game => (
          <div key={game.id} className="neon-card p-3" style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', color: 'var(--color-cyan)' }}>
                  <strong>{game.home_team}</strong> vs <strong>{game.away_team}</strong>
                </p>
                <p style={{ margin: '0', fontSize: '0.9rem', color: 'rgba(192, 208, 255, 0.6)' }}>
                  {new Date(game.game_date).toLocaleDateString()} {new Date(game.game_date).toLocaleTimeString()}
                </p>
              </div>
              <span className="badge badge-pending">{game.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// NABB BOX SCORES TAB
const NABBBoxScoresTab = () => {
  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Box Scores</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px' }}>
        <p style={{ color: 'rgba(192, 208, 255, 0.7)' }}>
          Box scores will be generated automatically when games are created and scores are updated.
        </p>
      </div>
    </div>
  );
};

// NABB GAME FEED TAB
const NABBGameFeedTab = () => {
  const [feed, setFeed] = useState(
    JSON.parse(localStorage.getItem('nabb_feed') || '[]')
  );
  const [newFeed, setNewFeed] = useState({ event: '' });

  const addFeedItem = () => {
    if (newFeed.event) {
      const updated = [...feed, { id: Date.now().toString(), ...newFeed, timestamp: new Date().toISOString() }];
      setFeed(updated);
      localStorage.setItem('nabb_feed', JSON.stringify(updated));
      setNewFeed({ event: '' });
    }
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Game Feed</h2>

      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">Post Update</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Event/Update</label>
            <textarea
              value={newFeed.event}
              onChange={(e) => setNewFeed({...newFeed, event: e.target.value})}
              placeholder="What's happening in the league?"
              rows="3"
              style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
            />
          </div>

          <button className="neon-button" onClick={addFeedItem}>Post Update</button>
        </div>
      </div>

      <div className="feed-list">
        {feed.map(item => (
          <div key={item.id} className="neon-card p-3" style={{ marginBottom: '15px' }}>
            <p style={{ margin: '0 0 10px 0', color: '#c0d0ff' }}>{item.event}</p>
            <p style={{ margin: '0', fontSize: '0.85rem', color: 'rgba(192, 208, 255, 0.5)' }}>
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// NABB HALL OF FAME TAB
const NABBHallOfFameTab = () => {
  const [hofMembers, setHofMembers] = useState(
    JSON.parse(localStorage.getItem('nabb_hof') || '[]')
  );
  const [players] = useState(
    JSON.parse(localStorage.getItem('nabb_players') || '[]')
  );
  const [newHof, setNewHof] = useState({ player_name: '', year: new Date().getFullYear() });

  const addHofMember = () => {
    if (newHof.player_name) {
      const updated = [...hofMembers, { id: Date.now().toString(), ...newHof }];
      setHofMembers(updated);
      localStorage.setItem('nabb_hof', JSON.stringify(updated));
      setNewHof({ player_name: '', year: new Date().getFullYear() });
    }
  };

  const removeHofMember = (id) => {
    const updated = hofMembers.filter(m => m.id !== id);
    setHofMembers(updated);
    localStorage.setItem('nabb_hof', JSON.stringify(updated));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Hall of Fame</h2>

      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">Induct Player</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Player</label>
            <select
              value={newHof.player_name}
              onChange={(e) => setNewHof({...newHof, player_name: e.target.value})}
              style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
            >
              <option value="">Select player</option>
              {players.map(p => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Induction Year</label>
            <input
              type="number"
              value={newHof.year}
              onChange={(e) => setNewHof({...newHof, year: parseInt(e.target.value)})}
              style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
            />
          </div>

          <button className="neon-button" onClick={addHofMember}>Induct Player</button>
        </div>
      </div>

      <div className="hof-grid">
        {hofMembers.map(member => (
          <div key={member.id} className="neon-card p-3">
            <div style={{ textAlign: 'center' }}>
              <h4 className="gradient-text-magenta" style={{ marginBottom: '5px' }}>{member.player_name}</h4>
              <p style={{ margin: '0', color: 'rgba(192, 208, 255, 0.7)', fontSize: '0.9rem' }}>
                Inducted: {member.year}
              </p>
            </div>
            <button
              className="neon-button"
              style={{ width: '100%', marginTop: '15px', borderColor: '#ff3333', color: '#ff3333' }}
              onClick={() => removeHofMember(member.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerDashboard;
