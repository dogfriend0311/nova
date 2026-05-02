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
  const [teams] = useState(
    JSON.parse(localStorage.getItem('nabb_teams') || '[]')
  );
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({});
  const [imgPreview, setImgPreview] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);

  const blankForm = {
    player_name: '', team: '', overall: 75, position: '', number: '', spotify_url: '',
    avatar_data: '',
    hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
    adv_h_per_game: '', adv_r_per_game: '', adv_rbi_per_game: '', adv_hr_per_game: '', adv_k_per_game: '',
    innings_pitched: 0, strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0,
    adv_era: '', adv_k9: '', adv_h9: '', adv_er9: '',
    sv_h_per_game: '', sv_r_per_game: '', sv_rbi_per_game: '', sv_hr_per_game: '', sv_k_per_game: '',
    sv_era: '', sv_k9: '', sv_h9: '',
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImgPreview(ev.target.result); setAvatarZoom(1); };
    reader.readAsDataURL(file);
  };

  const doSave = (data) => {
    const newData = { ...data, id: editingPlayer?.id || Date.now().toString() };
    const updatedPlayers = editingPlayer?.id
      ? players.map(p => p.id === editingPlayer.id ? newData : p)
      : [...players, newData];
    setPlayers(updatedPlayers);
    localStorage.setItem('nabb_players', JSON.stringify(updatedPlayers));
    setEditingPlayer(null);
    setFormData({});
    setImgPreview(null);
    setAvatarZoom(1);
  };

  const handleSavePlayer = () => {
    if (imgPreview) {
      const canvas = document.createElement('canvas');
      canvas.width = 420; canvas.height = 420;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const zoomedSize = size / avatarZoom;
        const srcX = (img.width - zoomedSize) / 2;
        const srcY = (img.height - zoomedSize) / 2;
        ctx.drawImage(img, srcX, srcY, zoomedSize, zoomedSize, 0, 0, 420, 420);
        doSave({ ...formData, avatar_data: canvas.toDataURL('image/jpeg', 0.88) });
      };
      img.src = imgPreview;
    } else {
      doSave(formData);
    }
  };

  const handleDeletePlayer = (id) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    localStorage.setItem('nabb_players', JSON.stringify(updated));
  };

  const startEdit = (player) => {
    setEditingPlayer(player);
    setFormData(player);
    setImgPreview(player.avatar_data || null);
    setAvatarZoom(1);
  };

  const selectStyle = { padding: '10px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: '#c0d0ff', borderRadius: '4px', width: '100%' };
  const secHead = (icon, text, color = 'cyan') => (
    <h4 style={{ color: color === 'cyan' ? 'var(--color-cyan)' : 'var(--color-magenta)', margin: '20px 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderTop: `1px solid rgba(${color === 'cyan' ? '0,255,255' : '255,0,255'},0.1)`, paddingTop: '18px' }}>{icon} {text}</h4>
  );
  const numField = (label, key, step = 1) => (
    <div className="form-field">
      <label>{label}</label>
      <input type="number" step={step} value={formData[key] ?? 0}
        onChange={(e) => set(key, step < 1 ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)} min="0" />
    </div>
  );
  const advField = (label, key) => (
    <div className="form-field">
      <label>{label}</label>
      <input type="text" value={formData[key] || ''} onChange={(e) => set(key, e.target.value)} placeholder="Leave blank to auto-calculate" />
    </div>
  );

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2 className="gradient-text-cyan">League Players</h2>
        <button className="neon-button" onClick={() => { setEditingPlayer({ id: null }); setFormData(blankForm); setImgPreview(null); setAvatarZoom(1); }}>
          + Add Player
        </button>
      </div>

      {editingPlayer !== null && (
        <div className="neon-card p-3" style={{ marginBottom: '30px' }}>
          <h3 className="gradient-text-magenta">{editingPlayer.id ? 'Edit Player' : 'Create New Player'}</h3>
          <div className="edit-form">

            <h4 style={{ color: 'var(--color-cyan)', margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Basic Info</h4>
            <div className="form-field">
              <label>Player Name</label>
              <input type="text" value={formData.player_name || ''} onChange={(e) => set('player_name', e.target.value)} placeholder="Player name" />
            </div>
            <div className="form-field">
              <label>Team</label>
              <select value={formData.team || ''} onChange={(e) => set('team', e.target.value)} style={selectStyle}>
                <option value="">Free Agent</option>
                {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Overall Rating</label>
              <input type="number" value={formData.overall || 75} onChange={(e) => set('overall', parseInt(e.target.value))} min="0" max="100" />
            </div>
            <div className="form-field">
              <label>Jersey Number</label>
              <input type="number" value={formData.number || ''} onChange={(e) => set('number', e.target.value)} placeholder="Jersey number" />
            </div>
            <div className="form-field">
              <label>Position</label>
              <input type="text" value={formData.position || ''} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Pitcher, Batter" />
            </div>
            <div className="form-field">
              <label>Spotify Embed URL</label>
              <input type="text" value={formData.spotify_url || ''} onChange={(e) => set('spotify_url', e.target.value)} placeholder="https://open.spotify.com/embed/..." />
            </div>

            {secHead('🖼️', 'Player Avatar', 'cyan')}
            <div className="form-field">
              <label>Upload Photo</label>
              <input type="file" accept="image/*" onChange={handleFileChange}
                style={{ color: '#c0d0ff', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '4px', padding: '8px' }} />
            </div>
            {imgPreview && (
              <>
                <div style={{ width: '160px', height: '160px', overflow: 'hidden', borderRadius: '8px', border: '2px solid rgba(0,255,255,0.3)', background: '#0a0a23', margin: '10px auto' }}>
                  <img src={imgPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${avatarZoom})`, transformOrigin: 'center', display: 'block' }} />
                </div>
                <div className="form-field">
                  <label>Zoom: {avatarZoom.toFixed(1)}x</label>
                  <input type="range" min="1" max="3" step="0.05" value={avatarZoom}
                    onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-cyan)' }} />
                </div>
              </>
            )}

            {secHead('⚾', 'Career Batting Stats', 'cyan')}
            {numField('Hits', 'hits')}
            {numField('Runs', 'runs')}
            {numField('RBIs', 'rbis')}
            {numField('Home Runs', 'home_runs')}
            {numField('Strike Outs (Batting)', 'strike_outs')}

            {secHead('📊', 'Advanced Batting — Career Override', 'magenta')}
            <p style={{ color: 'rgba(192,208,255,0.45)', fontSize: '0.8rem', margin: '-6px 0 10px' }}>Leave blank to auto-calculate from career totals</p>
            {advField('H / Game', 'adv_h_per_game')}
            {advField('R / Game', 'adv_r_per_game')}
            {advField('RBI / Game', 'adv_rbi_per_game')}
            {advField('HR / Game', 'adv_hr_per_game')}
            {advField('K / Game (Batting)', 'adv_k_per_game')}

            {secHead('⚡', 'Career Pitching Stats', 'cyan')}
            {numField('Innings Pitched', 'innings_pitched', 0.1)}
            {numField('Strikeouts (Pitching)', 'strikeouts_pitched')}
            {numField('Hits Allowed', 'hits_allowed')}
            {numField('Earned Runs', 'earned_runs')}

            {secHead('📈', 'Advanced Pitching — Career Override', 'magenta')}
            <p style={{ color: 'rgba(192,208,255,0.45)', fontSize: '0.8rem', margin: '-6px 0 10px' }}>Leave blank to auto-calculate from career totals</p>
            {advField('ERA', 'adv_era')}
            {advField('K/9', 'adv_k9')}
            {advField('H/9', 'adv_h9')}
            {advField('ER/9', 'adv_er9')}

            {secHead('🎯', 'Baseball Savant — Percentile Ranks', 'cyan')}
            <p style={{ color: 'rgba(192,208,255,0.45)', fontSize: '0.8rem', margin: '-6px 0 10px' }}>
              Enter a 0–100 percentile for each stat. The colored gauge bar will appear on the player's page. Leave blank to hide that row.
            </p>
            <div className="form-field">
              <label>H / Game Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_h_per_game || ''} onChange={e => set('sv_h_per_game', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>R / Game Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_r_per_game || ''} onChange={e => set('sv_r_per_game', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>RBI / Game Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_rbi_per_game || ''} onChange={e => set('sv_rbi_per_game', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>HR / Game Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_hr_per_game || ''} onChange={e => set('sv_hr_per_game', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>K / Game Percentile (batting)</label>
              <input type="number" min="0" max="100" value={formData.sv_k_per_game || ''} onChange={e => set('sv_k_per_game', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>ERA Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_era || ''} onChange={e => set('sv_era', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>K/9 Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_k9 || ''} onChange={e => set('sv_k9', e.target.value)} placeholder="0 – 100" />
            </div>
            <div className="form-field">
              <label>H/9 Allowed Percentile</label>
              <input type="number" min="0" max="100" value={formData.sv_h9 || ''} onChange={e => set('sv_h9', e.target.value)} placeholder="0 – 100" />
            </div>

            <div className="form-actions">
              <button className="neon-button" onClick={handleSavePlayer}>Save Player</button>
              <button className="neon-button" onClick={() => { setEditingPlayer(null); setImgPreview(null); setAvatarZoom(1); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="players-grid">
        {players.map(player => (
          <div key={player.id} className="neon-card p-3" style={{ textAlign: 'center' }}>
            {player.avatar_data ? (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 10px', border: '2px solid rgba(0,255,255,0.35)' }}>
                <img src={player.avatar_data} alt={player.player_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,255,255,0.08)', border: '2px solid rgba(0,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '24px' }}>🎮</div>
            )}
            <h4 className="gradient-text-cyan">{player.player_name}</h4>
            <div style={{ marginTop: '10px', textAlign: 'left' }}>
              <div className="data-row"><span className="data-label">Team</span><span className="data-value">{player.team || 'Free Agent'}</span></div>
              <div className="data-row"><span className="data-label">Position</span><span className="data-value">{player.position || '—'}</span></div>
              <div className="data-row"><span className="data-label">Overall</span><span className="data-value">{player.overall}</span></div>
              <div className="data-row"><span className="data-label">HR / H / RBI</span><span className="data-value">{player.home_runs || 0} / {player.hits || 0} / {player.rbis || 0}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button className="neon-button" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => startEdit(player)}>Edit</button>
              <button className="neon-button" style={{ flex: 1, fontSize: '0.8rem', borderColor: '#ff3333', color: '#ff3333' }} onClick={() => handleDeletePlayer(player.id)}>Delete</button>
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
            <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Current Role</th>
            <th style={{ textAlign: 'left', padding: '12px', color: 'var(--color-cyan)' }}>Change Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.username} style={{ borderBottom: '1px solid rgba(0, 255, 255, 0.1)' }}>
              <td style={{ padding: '12px' }}>{user.username}</td>
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
  const [newTeam, setNewTeam] = useState({ team_name: '', team_color: '#00ffff', logo_url: '' });
  const [uploadMode, setUploadMode] = useState('url');

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewTeam(prev => ({ ...prev, logo_url: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const addTeam = () => {
    if (newTeam.team_name) {
      const updated = [...teams, { id: Date.now().toString(), ...newTeam }];
      setTeams(updated);
      localStorage.setItem('nabb_teams', JSON.stringify(updated));
      setNewTeam({ team_name: '', team_color: '#00ffff', logo_url: '' });
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
            <input type="text" value={newTeam.team_name} onChange={(e) => setNewTeam({...newTeam, team_name: e.target.value})} placeholder="Team name" />
          </div>

          <div className="form-field">
            <label>Team Color</label>
            <input type="color" value={newTeam.team_color} onChange={(e) => setNewTeam({...newTeam, team_color: e.target.value})} />
          </div>

          <div className="form-field">
            <label>Team Logo</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                style={{ padding: '6px 14px', background: uploadMode === 'url' ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--color-cyan)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('upload')}
                style={{ padding: '6px 14px', background: uploadMode === 'upload' ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--color-cyan)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Upload Image
              </button>
            </div>

            {uploadMode === 'url' ? (
              <input type="text" value={newTeam.logo_url} onChange={(e) => setNewTeam({...newTeam, logo_url: e.target.value})} placeholder="Logo image URL" />
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ color: '#c0d0ff', padding: '8px 0' }}
                />
                {newTeam.logo_url && newTeam.logo_url.startsWith('data:') && (
                  <img src={newTeam.logo_url} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'contain', marginTop: '8px', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.2)' }} />
                )}
              </div>
            )}
          </div>

          <button className="neon-button" onClick={addTeam}>Create Team</button>
        </div>
      </div>

      <div className="teams-grid">
        {teams.map(team => (
          <div key={team.id} className="neon-card p-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.team_name} style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.2)' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', background: team.team_color, borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} />
              )}
              <h4 className="gradient-text-cyan" style={{ margin: 0 }}>{team.team_name}</h4>
            </div>
            <button className="neon-button" style={{ width: '100%', borderColor: '#ff3333', color: '#ff3333' }} onClick={() => deleteTeam(team.id)}>
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
  const [teams] = useState(JSON.parse(localStorage.getItem('nabb_teams') || '[]'));
  const [players, setPlayers] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const updatePlayerTeam = (playerId, teamName) => {
    const updated = players.map(p => p.id === playerId ? {...p, team: teamName} : p);
    setPlayers(updated);
    localStorage.setItem('nabb_players', JSON.stringify(updated));
  };

  const selectStyle = { width: '100%', padding: '8px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: '#c0d0ff', borderRadius: '4px', marginTop: '5px' };

  // Player stats view
  if (selectedPlayer) {
    return (
      <div className="tab-content">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button className="neon-button" onClick={() => setSelectedPlayer(null)}>← Back to Roster</button>
        </div>
        <h2 className="gradient-text-cyan">{selectedPlayer.player_name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
          <div className="neon-card p-3">
            <h4 className="gradient-text-cyan" style={{ marginBottom: '12px' }}>Info</h4>
            {[['Team', selectedPlayer.team || 'Free Agent'], ['Position', selectedPlayer.position || '—'], ['Overall', selectedPlayer.overall], ['Number', selectedPlayer.number ? `#${selectedPlayer.number}` : '—'], ['Roblox ID', selectedPlayer.roblox_id || '—']].map(([k, v]) => (
              <div key={k} className="data-row"><span className="data-label">{k}</span><span className="data-value">{v}</span></div>
            ))}
          </div>
          <div className="neon-card p-3">
            <h4 className="gradient-text-cyan" style={{ marginBottom: '12px' }}>⚾ Batting</h4>
            {[['Hits', selectedPlayer.hits || 0], ['Runs', selectedPlayer.runs || 0], ['RBIs', selectedPlayer.rbis || 0], ['Home Runs', selectedPlayer.home_runs || 0], ['Strike Outs', selectedPlayer.strike_outs || 0]].map(([k, v]) => (
              <div key={k} className="data-row"><span className="data-label">{k}</span><span className="data-value">{v}</span></div>
            ))}
          </div>
          <div className="neon-card p-3">
            <h4 className="gradient-text-magenta" style={{ marginBottom: '12px' }}>⚡ Pitching</h4>
            {[['Innings Pitched', selectedPlayer.innings_pitched || 0], ['Strikeouts', selectedPlayer.strikeouts_pitched || 0], ['Hits Allowed', selectedPlayer.hits_allowed || 0], ['Earned Runs', selectedPlayer.earned_runs || 0]].map(([k, v]) => (
              <div key={k} className="data-row"><span className="data-label">{k}</span><span className="data-value">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Team roster view
  if (selectedTeam) {
    const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);
    return (
      <div className="tab-content">
        <button className="neon-button" style={{ marginBottom: '20px' }} onClick={() => setSelectedTeam(null)}>← Back to Teams</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          {selectedTeam.logo_url && <img src={selectedTeam.logo_url} alt="" style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '6px' }} />}
          <div>
            <h2 className="gradient-text-cyan" style={{ margin: 0 }}>{selectedTeam.team_name}</h2>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(192,208,255,0.6)', fontSize: '0.9rem' }}>{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.7)' }}>Add Player to Roster</label>
          <select onChange={(e) => { if (e.target.value) { updatePlayerTeam(e.target.value, selectedTeam.team_name); e.target.value = ''; } }} style={selectStyle}>
            <option value="">Select player to add...</option>
            {players.filter(p => p.team !== selectedTeam.team_name).map(p => (
              <option key={p.id} value={p.id}>{p.player_name} {p.team ? `(${p.team})` : '(FA)'}</option>
            ))}
          </select>
        </div>

        <div>
          {teamPlayers.length === 0 ? (
            <div className="neon-card p-3"><p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No players on this roster</p></div>
          ) : (
            teamPlayers.map(player => (
              <div key={player.id} className="neon-card p-3" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setSelectedPlayer(player)}>
                <div>
                  <span style={{ color: 'var(--color-cyan)', fontWeight: '600' }}>
                    {player.number ? `#${player.number} ` : ''}{player.player_name}
                  </span>
                  <span style={{ marginLeft: '12px', color: 'rgba(192,208,255,0.6)', fontSize: '0.85rem' }}>{player.position || '—'}</span>
                  <span style={{ marginLeft: '12px', color: 'rgba(192,208,255,0.4)', fontSize: '0.8rem' }}>HR: {player.home_runs || 0} | H: {player.hits || 0} | RBI: {player.rbis || 0}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(0,255,255,0.5)', fontSize: '0.8rem' }}>View Stats →</span>
                  <button onClick={(e) => { e.stopPropagation(); updatePlayerTeam(player.id, ''); }} style={{ background: 'none', border: 'none', color: '#ff3333', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px' }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Teams list view
  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">NABB Rosters</h2>
      {teams.length === 0 ? (
        <div className="neon-card p-3" style={{ marginTop: '20px' }}>
          <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No teams created yet. Go to NABB Teams to create one.</p>
        </div>
      ) : (
        <div className="teams-grid" style={{ marginTop: '20px' }}>
          {teams.map(team => {
            const count = players.filter(p => p.team === team.team_name).length;
            return (
              <div key={team.id} className="neon-card p-3" style={{ cursor: 'pointer' }} onClick={() => setSelectedTeam(team)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  {team.logo_url ? <img src={team.logo_url} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '6px' }} /> : <div style={{ width: '44px', height: '44px', background: team.team_color, borderRadius: '6px' }} />}
                  <h4 className="gradient-text-cyan" style={{ margin: 0 }}>{team.team_name}</h4>
                </div>
                <div className="data-row">
                  <span className="data-label">Players on Roster</span>
                  <span className="data-value">{count}</span>
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'rgba(0,255,255,0.6)', textAlign: 'center' }}>Click to manage roster →</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [editingGame, setEditingGame] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const addGame = () => {
    if (newGame.home_team && newGame.away_team && newGame.home_team !== newGame.away_team) {
      const updated = [...games, { 
        id: Date.now().toString(), 
        ...newGame, 
        status: 'scheduled',
        home_team_logo: teams.find(t => t.team_name === newGame.home_team)?.logo_url || '',
        away_team_logo: teams.find(t => t.team_name === newGame.away_team)?.logo_url || '',
        home_team_color: teams.find(t => t.team_name === newGame.home_team)?.team_color || '#00ffff',
        away_team_color: teams.find(t => t.team_name === newGame.away_team)?.team_color || '#00ffff'
      }];
      setGames(updated);
      localStorage.setItem('nabb_games', JSON.stringify(updated));
      setNewGame({ home_team: '', away_team: '', game_date: '', home_score: 0, away_score: 0 });
    }
  };

  const updateGame = () => {
    const updated = games.map(g => 
      g.id === editingGame.id ? { ...g, ...editFormData } : g
    );
    setGames(updated);
    localStorage.setItem('nabb_games', JSON.stringify(updated));
    setEditingGame(null);
    setEditFormData({});
  };

  const deleteGame = (id) => {
    const updated = games.filter(g => g.id !== id);
    setGames(updated);
    localStorage.setItem('nabb_games', JSON.stringify(updated));
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

      {editingGame && (
        <div className="neon-card p-3" style={{ marginBottom: '30px' }}>
          <h3 className="gradient-text-magenta">Edit Game</h3>
          <div className="edit-form">
            <div className="form-field">
              <label>Home Score</label>
              <input
                type="number"
                value={editFormData.home_score || 0}
                onChange={(e) => setEditFormData({...editFormData, home_score: parseInt(e.target.value)})}
                style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
              />
            </div>

            <div className="form-field">
              <label>Away Score</label>
              <input
                type="number"
                value={editFormData.away_score || 0}
                onChange={(e) => setEditFormData({...editFormData, away_score: parseInt(e.target.value)})}
                style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
              />
            </div>

            <div className="form-field">
              <label>Status</label>
              <select
                value={editFormData.status || 'scheduled'}
                onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                style={{ padding: '10px', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', color: '#c0d0ff', borderRadius: '4px' }}
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="final">Final</option>
              </select>
            </div>

            <div className="form-actions">
              <button className="neon-button" onClick={updateGame}>Save Changes</button>
              <button className="neon-button" onClick={() => setEditingGame(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="games-list">
        {games.map(game => (
          <div key={game.id} className="neon-card p-3" style={{ marginBottom: '15px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '20px',
              alignItems: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                  {game.home_team_logo && (
                    <img src={game.home_team_logo} alt={game.home_team} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  )}
                  {!game.home_team_logo && (
                    <div style={{ width: '40px', height: '40px', background: game.home_team_color, borderRadius: '50%' }} />
                  )}
                </div>
                <p style={{ margin: '0', color: 'var(--color-cyan)', fontWeight: '600' }}>{game.home_team}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '1.5rem', color: 'var(--color-cyan)', fontWeight: '700' }}>{game.home_score}</p>
              </div>

              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <span className="badge badge-pending">{game.status}</span>
                <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: 'rgba(192, 208, 255, 0.7)' }}>
                  {new Date(game.game_date).toLocaleDateString()}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                  {game.away_team_logo && (
                    <img src={game.away_team_logo} alt={game.away_team} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  )}
                  {!game.away_team_logo && (
                    <div style={{ width: '40px', height: '40px', background: game.away_team_color, borderRadius: '50%' }} />
                  )}
                </div>
                <p style={{ margin: '0', color: 'var(--color-magenta)', fontWeight: '600' }}>{game.away_team}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '1.5rem', color: 'var(--color-magenta)', fontWeight: '700' }}>{game.away_score}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                className="neon-button"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => {
                  setEditingGame(game);
                  setEditFormData({
                    home_score: game.home_score,
                    away_score: game.away_score,
                    status: game.status
                  });
                }}
              >
                Edit Score
              </button>
              <button
                className="neon-button"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => {}}
              >
                Box Score
              </button>
              <button
                className="neon-button"
                style={{ flex: 1, fontSize: '0.85rem', borderColor: '#ff3333', color: '#ff3333' }}
                onClick={() => deleteGame(game.id)}
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

// NABB BOX SCORES TAB — standalone (uses nabb_bs_games key)
const NABBBoxScoresTab = () => {
  const [bsGames, setBsGames] = useState(JSON.parse(localStorage.getItem('nabb_bs_games') || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem('nabb_players') || '[]'));
  const [teams] = useState(JSON.parse(localStorage.getItem('nabb_teams') || '[]'));
  const [boxScores, setBoxScores] = useState(JSON.parse(localStorage.getItem('nabb_box_scores') || '[]'));
  const [selectedGame, setSelectedGame] = useState(null);
  const [editingScore, setEditingScore] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [newGame, setNewGame] = useState({ game_name: '', home_team: '', away_team: '', home_score: 0, away_score: 0, game_date: '' });
  const [showCreateGame, setShowCreateGame] = useState(false);

  const selectStyle = { padding: '8px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: '#c0d0ff', borderRadius: '4px', width: '100%' };

  const createGame = () => {
    if (!newGame.game_name) return;
    const game = { id: Date.now().toString(), ...newGame };
    const updated = [...bsGames, game];
    setBsGames(updated);
    localStorage.setItem('nabb_bs_games', JSON.stringify(updated));
    setNewGame({ game_name: '', home_team: '', away_team: '', home_score: 0, away_score: 0, game_date: '' });
    setShowCreateGame(false);
  };

  const deleteGame = (id) => {
    const updated = bsGames.filter(g => g.id !== id);
    setBsGames(updated);
    localStorage.setItem('nabb_bs_games', JSON.stringify(updated));
    const updatedScores = boxScores.filter(b => b.game_id !== id);
    setBoxScores(updatedScores);
    localStorage.setItem('nabb_box_scores', JSON.stringify(updatedScores));
  };

  const handleSaveScore = () => {
    const updated = boxScores.filter(b => b.id !== editingScore.id);
    const saved = [...updated, { ...editingScore, ...editFormData }];
    setBoxScores(saved);
    localStorage.setItem('nabb_box_scores', JSON.stringify(saved));
    setEditingScore(null);
    setEditFormData({});
  };

  const addPlayerScore = (playerId) => {
    const player = players.find(p => p.id === playerId);
    const newScore = {
      id: Date.now().toString(),
      game_id: selectedGame.id,
      player_id: playerId,
      team: player?.team || '',
      hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
      strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0, innings_pitched: 0
    };
    const updated = [...boxScores, newScore];
    setBoxScores(updated);
    localStorage.setItem('nabb_box_scores', JSON.stringify(updated));
  };

  const updateGameScore = (gameId, field, value) => {
    const updated = bsGames.map(g => g.id === gameId ? { ...g, [field]: value } : g);
    setBsGames(updated);
    localStorage.setItem('nabb_bs_games', JSON.stringify(updated));
    if (selectedGame?.id === gameId) setSelectedGame(prev => ({ ...prev, [field]: value }));
  };

  const statFields = ['hits', 'runs', 'rbis', 'home_runs', 'strike_outs', 'innings_pitched', 'strikeouts_pitched', 'hits_allowed', 'earned_runs'];
  const statLabels = { hits: 'Hits', runs: 'Runs', rbis: 'RBIs', home_runs: 'Home Runs', strike_outs: 'K (Bat)', innings_pitched: 'IP', strikeouts_pitched: 'K (Pit)', hits_allowed: 'HA', earned_runs: 'ER' };

  // Editing score form
  if (editingScore) {
    return (
      <div className="tab-content">
        <button className="neon-button" style={{ marginBottom: '20px' }} onClick={() => { setEditingScore(null); setEditFormData({}); }}>← Cancel</button>
        <h2 className="gradient-text-magenta">Edit Player Stats — {players.find(p => p.id === editingScore.player_id)?.player_name}</h2>
        <div className="neon-card p-3" style={{ marginTop: '20px' }}>
          <div className="edit-form">
            {statFields.map(field => (
              <div className="form-field" key={field}>
                <label>{statLabels[field]}</label>
                <input type="number" step={field === 'innings_pitched' ? '0.1' : '1'} value={editFormData[field] || 0}
                  onChange={(e) => setEditFormData({...editFormData, [field]: field === 'innings_pitched' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0})} min="0" />
              </div>
            ))}
            <div className="form-actions">
              <button className="neon-button" onClick={handleSaveScore}>Save Stats</button>
              <button className="neon-button" onClick={() => { setEditingScore(null); setEditFormData({}); }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game detail view
  if (selectedGame) {
    const gameScores = boxScores.filter(b => b.game_id === selectedGame.id);
    const addedIds = new Set(gameScores.map(s => s.player_id));

    return (
      <div className="tab-content">
        <button className="neon-button" style={{ marginBottom: '20px' }} onClick={() => setSelectedGame(null)}>← Back to Box Scores</button>

        <h2 className="gradient-text-cyan" style={{ marginBottom: '6px' }}>{selectedGame.game_name}</h2>

        {/* Score editor */}
        <div className="neon-card p-3" style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'rgba(192,208,255,0.7)' }}>{selectedGame.home_team || 'Home'}</span>
            <input type="number" value={selectedGame.home_score || 0} onChange={(e) => updateGameScore(selectedGame.id, 'home_score', parseInt(e.target.value) || 0)}
              style={{ width: '60px', padding: '6px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: 'var(--color-cyan)', borderRadius: '4px', textAlign: 'center', fontWeight: '700', fontSize: '1.1rem' }} />
            <span style={{ color: 'rgba(192,208,255,0.4)' }}>—</span>
            <input type="number" value={selectedGame.away_score || 0} onChange={(e) => updateGameScore(selectedGame.id, 'away_score', parseInt(e.target.value) || 0)}
              style={{ width: '60px', padding: '6px', background: 'rgba(255,0,255,0.05)', border: '1px solid rgba(255,0,255,0.2)', color: 'var(--color-magenta)', borderRadius: '4px', textAlign: 'center', fontWeight: '700', fontSize: '1.1rem' }} />
            <span style={{ color: 'rgba(192,208,255,0.7)' }}>{selectedGame.away_team || 'Away'}</span>
          </div>
        </div>

        {/* Add player */}
        <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.7)' }}>Add Player to Box Score</label>
          <select style={selectStyle} onChange={(e) => { if (e.target.value) { addPlayerScore(e.target.value); e.target.value = ''; } }}>
            <option value="">Select player...</option>
            {players.filter(p => !addedIds.has(p.id)).map(p => (
              <option key={p.id} value={p.id}>{p.player_name} {p.team ? `(${p.team})` : '(FA)'}</option>
            ))}
          </select>
        </div>

        {/* Player stats table */}
        {gameScores.length > 0 && (
          <div className="neon-card p-3" style={{ overflowX: 'auto' }}>
            <h4 className="gradient-text-cyan" style={{ marginBottom: '15px' }}>Player Stats</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {['Player', 'Team', 'H', 'R', 'RBI', 'HR', 'K', 'IP', 'KP', 'HA', 'ER', ''].map(h => (
                    <th key={h} style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', textAlign: 'center', borderBottom: '1px solid rgba(0,255,255,0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gameScores.map(score => {
                  const player = players.find(p => p.id === score.player_id);
                  return (
                    <tr key={score.id} style={{ borderBottom: '1px solid rgba(0,255,255,0.05)' }}>
                      <td style={{ padding: '8px', color: 'var(--color-cyan)' }}>{player?.player_name || '?'}</td>
                      <td style={{ padding: '8px', color: 'rgba(192,208,255,0.6)', textAlign: 'center' }}>{score.team || '—'}</td>
                      {[score.hits, score.runs, score.rbis, score.home_runs, score.strike_outs,
                        score.innings_pitched, score.strikeouts_pitched, score.hits_allowed, score.earned_runs].map((v, i) => (
                        <td key={i} style={{ padding: '8px', textAlign: 'center', color: 'rgba(192,208,255,0.85)' }}>{v || 0}</td>
                      ))}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => { setEditingScore(score); setEditFormData(score); }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Games list view
  return (
    <div className="tab-content">
      <div className="content-header">
        <h2 className="gradient-text-cyan">📈 Box Scores</h2>
        <button className="neon-button" onClick={() => setShowCreateGame(!showCreateGame)}>
          {showCreateGame ? 'Cancel' : '+ New Game'}
        </button>
      </div>

      {showCreateGame && (
        <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
          <h3 className="gradient-text-magenta">Create Box Score Game</h3>
          <div className="edit-form">
            <div className="form-field">
              <label>Game Name</label>
              <input type="text" value={newGame.game_name} onChange={(e) => setNewGame({...newGame, game_name: e.target.value})} placeholder="e.g. Week 3 - Game 2" />
            </div>
            <div className="form-field">
              <label>Home Team</label>
              <select value={newGame.home_team} onChange={(e) => setNewGame({...newGame, home_team: e.target.value})} style={selectStyle}>
                <option value="">Select team (optional)</option>
                {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Away Team</label>
              <select value={newGame.away_team} onChange={(e) => setNewGame({...newGame, away_team: e.target.value})} style={selectStyle}>
                <option value="">Select team (optional)</option>
                {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Home Score</label>
              <input type="number" value={newGame.home_score} onChange={(e) => setNewGame({...newGame, home_score: parseInt(e.target.value) || 0})} min="0" />
            </div>
            <div className="form-field">
              <label>Away Score</label>
              <input type="number" value={newGame.away_score} onChange={(e) => setNewGame({...newGame, away_score: parseInt(e.target.value) || 0})} min="0" />
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={newGame.game_date} onChange={(e) => setNewGame({...newGame, game_date: e.target.value})}
                style={{ padding: '10px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: '#c0d0ff', borderRadius: '4px' }} />
            </div>
            <button className="neon-button" onClick={createGame}>Create Game</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        {bsGames.length === 0 ? (
          <div className="neon-card p-3">
            <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No box score games yet. Create one above.</p>
          </div>
        ) : (
          [...bsGames].reverse().map(game => (
            <div key={game.id} className="neon-card p-3" style={{ marginBottom: '12px', cursor: 'pointer' }} onClick={() => setSelectedGame(game)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--color-cyan)', fontWeight: '700' }}>{game.game_name}</p>
                  <p style={{ margin: '0', color: 'rgba(192,208,255,0.75)' }}>
                    {game.home_team || 'Home'} <strong>{game.home_score}</strong> — <strong>{game.away_score}</strong> {game.away_team || 'Away'}
                  </p>
                  {game.game_date && <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.4)' }}>{new Date(game.game_date).toLocaleDateString()}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(0,255,255,0.5)', fontSize: '0.8rem' }}>Open →</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteGame(game.id); }}
                    style={{ background: 'none', border: 'none', color: '#ff3333', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 8px' }}>✕</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// NABB GAME FEED TAB
const NABBGameFeedTab = () => {
  const [games] = useState(
    JSON.parse(localStorage.getItem('nabb_games') || '[]')
  );
  const [players] = useState(
    JSON.parse(localStorage.getItem('nabb_players') || '[]')
  );
  const [feed, setFeed] = useState(
    JSON.parse(localStorage.getItem('nabb_feed') || '[]')
  );
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('');

  const liveGame = selectedGame 
    ? games.find(g => g.id === selectedGame.id)
    : null;

  const homeTeamPlayers = selectedGame
    ? players.filter(p => p.team === selectedGame.home_team)
    : [];

  const awayTeamPlayers = selectedGame
    ? players.filter(p => p.team === selectedGame.away_team)
    : [];

  const eventTypes = [
    'Single',
    'Double',
    'Triple',
    'Home Run',
    'Strike Out',
    'Walk',
    'Hit by Pitch',
    "Fielder's Choice",
    'Error',
    'Stolen Base',
    'Caught Stealing',
    'Double Play',
    'Pitching Change',
    'Pinch Hitter',
    'Scoring Play'
  ];

  const handleLogEvent = () => {
    if (selectedPlayer && selectedEvent) {
      const player = players.find(p => p.id === selectedPlayer);
      const newEvent = {
        id: Date.now().toString(),
        game_id: selectedGame.id,
        player_id: selectedPlayer,
        player_name: player?.player_name,
        team: player?.team,
        event_type: selectedEvent,
        timestamp: new Date().toISOString()
      };
      const updated = [...feed, newEvent];
      setFeed(updated);
      localStorage.setItem('nabb_feed', JSON.stringify(updated));
      setSelectedPlayer(null);
      setSelectedEvent('');
    }
  };

  const gameFeed = selectedGame
    ? feed.filter(f => f.game_id === selectedGame.id)
    : [];

  if (!selectedGame) {
    return (
      <div className="tab-content">
        <h2 className="gradient-text-cyan">NABB Game Feed</h2>
        <p style={{ color: 'rgba(192, 208, 255, 0.7)', marginTop: '10px' }}>Select a game to log events</p>
        <div style={{ marginTop: '20px' }}>
          {games.filter(g => g.status === 'live' || g.status === 'final').map(game => (
            <div key={game.id} className="neon-card p-3" style={{ marginBottom: '15px', cursor: 'pointer' }} onClick={() => setSelectedGame(game)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: 'var(--color-cyan)' }}>
                    <strong>{game.home_team}</strong> {game.home_score} - {game.away_score} <strong>{game.away_team}</strong>
                  </p>
                </div>
                <span className="badge badge-pending">{game.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <button className="neon-button" onClick={() => setSelectedGame(null)} style={{ marginBottom: '20px' }}>
        ← Back to Games
      </button>

      <h2 className="gradient-text-cyan">
        {liveGame.home_team} vs {liveGame.away_team}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="neon-card p-3">
          <h4 className="gradient-text-cyan">{liveGame.home_team}</h4>
          <div style={{ marginTop: '15px', maxHeight: '300px', overflowY: 'auto' }}>
            {homeTeamPlayers.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.id)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: selectedPlayer === player.id ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.05)',
                  border: selectedPlayer === player.id ? '2px solid var(--color-cyan)' : '1px solid rgba(0, 255, 255, 0.2)',
                  color: '#c0d0ff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                {player.player_name}
              </button>
            ))}
          </div>
        </div>

        <div className="neon-card p-3">
          <h4 className="gradient-text-magenta">{liveGame.away_team}</h4>
          <div style={{ marginTop: '15px', maxHeight: '300px', overflowY: 'auto' }}>
            {awayTeamPlayers.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.id)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: selectedPlayer === player.id ? 'rgba(255, 0, 255, 0.2)' : 'rgba(255, 0, 255, 0.05)',
                  border: selectedPlayer === player.id ? '2px solid var(--color-magenta)' : '1px solid rgba(255, 0, 255, 0.2)',
                  color: '#c0d0ff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                {player.player_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h4 className="gradient-text-magenta">Log Event</h4>
        <div style={{ marginTop: '15px' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(192, 208, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
            {selectedPlayer ? `Selected Player: ${players.find(p => p.id === selectedPlayer)?.player_name}` : 'Select a player first'}
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
            {eventTypes.map(event => (
              <button
                key={event}
                onClick={() => setSelectedEvent(event)}
                style={{
                  padding: '10px',
                  background: selectedEvent === event ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.05)',
                  border: selectedEvent === event ? '2px solid var(--color-cyan)' : '1px solid rgba(0, 255, 255, 0.2)',
                  color: selectedEvent === event ? 'var(--color-cyan)' : 'rgba(192, 208, 255, 0.7)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                {event}
              </button>
            ))}
          </div>

          <button 
            className="neon-button" 
            onClick={handleLogEvent}
            disabled={!selectedPlayer || !selectedEvent}
            style={{ marginTop: '15px', width: '100%' }}
          >
            Log Event
          </button>
        </div>
      </div>

      <div className="neon-card p-3">
        <h4 className="gradient-text-cyan">Live Feed</h4>
        <div style={{ marginTop: '15px', maxHeight: '400px', overflowY: 'auto' }}>
          {gameFeed.length === 0 ? (
            <p style={{ color: 'rgba(192, 208, 255, 0.6)' }}>No events logged yet</p>
          ) : (
            gameFeed.map(event => (
              <div key={event.id} style={{
                padding: '12px',
                background: 'rgba(0, 255, 255, 0.05)',
                border: '1px solid rgba(0, 255, 255, 0.1)',
                borderRadius: '4px',
                marginBottom: '10px'
              }}>
                <p style={{ margin: '0', color: 'var(--color-cyan)', fontWeight: '600' }}>
                  {event.player_name}
                </p>
                <p style={{ margin: '5px 0 0 0', color: 'rgba(192, 208, 255, 0.8)' }}>
                  {event.event_type}
                </p>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'rgba(192, 208, 255, 0.5)' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
        </div>
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
