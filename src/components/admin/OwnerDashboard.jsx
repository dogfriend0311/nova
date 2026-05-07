import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './OwnerDashboard.css';

/* ── Shared input style ───────────────────────────────────────── */
const SI = { padding: '10px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: '#c0d0ff', borderRadius: '4px', width: '100%' };
const selectStyle = { ...SI };

/* ═══════════════════════════════════════════════════════════════
   ROW 1 — NOVA STUFF
═══════════════════════════════════════════════════════════════ */

// MEMBER PAGES TAB
const MemberPagesTab = () => {
  const [profiles, setProfiles] = useState(JSON.parse(localStorage.getItem('member_profiles') || '[]'));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const startEdit = (p) => { setEditing(p.username); setForm({ ...p }); };
  const save = () => {
    const updated = profiles.map(p => p.username === editing ? { ...p, ...form } : p);
    setProfiles(updated);
    localStorage.setItem('member_profiles', JSON.stringify(updated));
    setEditing(null);
  };

  if (editing) return (
    <div className="tab-content">
      <button className="neon-button" style={{ marginBottom: '20px' }} onClick={() => setEditing(null)}>← Back</button>
      <h2 className="gradient-text-cyan">Edit: {editing}</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px' }}>
        <div className="edit-form">
          {['bio','top_banner_url','left_banner_url','right_banner_url','spotify_url','twitter_url','twitch_url','youtube_url','instagram_url'].map(field => (
            <div className="form-field" key={field}>
              <label>{field.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</label>
              <input type="text" value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})} style={SI} />
            </div>
          ))}
          <div className="form-actions">
            <button className="neon-button" onClick={save}>Save Changes</button>
            <button className="neon-button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Member Pages</h2>
      {profiles.length === 0 ? (
        <div className="neon-card p-3" style={{ marginTop: '20px' }}>
          <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No member profiles yet.</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
          {profiles.map(p => (
            <div key={p.username} className="neon-card p-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-cyan)', fontWeight: 700 }}>{p.username}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.5)' }}>{p.bio || 'No bio'}</p>
              </div>
              <button className="neon-button" onClick={() => startEdit(p)}>Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// USER ROLES TAB
const UserRolesTab = () => {
  const { updateUserRole } = useAuth();
  const [users, setUsers] = useState(JSON.parse(localStorage.getItem('nova_users') || '[]'));
  const roles = ['member', 'nabb_helper', 'rbml_helper', 'mod', 'cofounder', 'owner'];

  const changeRole = (username, newRole) => {
    updateUserRole(username, newRole);
    const updated = users.map(u => u.username === username ? { ...u, role: newRole } : u);
    setUsers(updated);
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">User Roles</h2>
      {users.length === 0 ? (
        <div className="neon-card p-3" style={{ marginTop: '20px' }}>
          <p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No registered users yet.</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
          {users.map(u => (
            <div key={u.username} className="neon-card p-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{u.username}</span>
              <select value={u.role || 'member'} onChange={e => changeRole(u.username, e.target.value)} style={{ ...selectStyle, width: 'auto' }}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   GENERIC LEAGUE TAB COMPONENTS
   All take a `prefix` prop: 'nabb' or 'rbml'
═══════════════════════════════════════════════════════════════ */

// LEAGUE PLAYERS TAB
const LeaguePlayersTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [players, setPlayers] = useState(JSON.parse(localStorage.getItem(`${prefix}_players`) || '[]'));
  const [form, setForm] = useState({ player_name: '', position: '', number: '', overall: 75, roblox_id: '', team: '' });
  const [editing, setEditing] = useState(null);

  const save = () => {
    let updated;
    if (editing) {
      updated = players.map(p => p.id === editing ? { ...p, ...form } : p);
    } else {
      updated = [...players, { id: Date.now().toString(), ...form }];
    }
    setPlayers(updated);
    localStorage.setItem(`${prefix}_players`, JSON.stringify(updated));
    setForm({ player_name: '', position: '', number: '', overall: 75, roblox_id: '', team: '' });
    setEditing(null);
  };

  const del = (id) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    localStorage.setItem(`${prefix}_players`, JSON.stringify(updated));
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({ player_name: p.player_name||'', position: p.position||'', number: p.number||'', overall: p.overall||75, roblox_id: p.roblox_id||'', team: p.team||'' });
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} League Players</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">{editing ? 'Edit Player' : 'Add Player'}</h3>
        <div className="edit-form">
          {[['player_name','Player Name','text'],['position','Position','text'],['number','Jersey #','number'],['overall','Overall Rating','number'],['roblox_id','Roblox User ID','text'],['team','Team','text']].map(([f,l,t]) => (
            <div className="form-field" key={f}>
              <label>{l}</label>
              <input type={t} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder={l} style={SI} />
            </div>
          ))}
          <div className="form-actions">
            <button className="neon-button" onClick={save}>{editing ? 'Save Changes' : 'Add Player'}</button>
            {editing && <button className="neon-button" onClick={() => { setEditing(null); setForm({ player_name:'',position:'',number:'',overall:75,roblox_id:'',team:'' }); }}>Cancel</button>}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {players.map(p => (
          <div key={p.id} className="neon-card p-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--color-cyan)', fontWeight: 700 }}>{p.player_name}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.6)' }}>{p.team || 'FA'} · {p.position || '—'} · OVR {p.overall}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="neon-button" style={{ padding: '6px 14px' }} onClick={() => startEdit(p)}>Edit</button>
              <button className="neon-button" style={{ padding: '6px 14px', borderColor: '#ff3333', color: '#ff3333' }} onClick={() => del(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// LEAGUE TEAMS TAB
const LeagueTeamsTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [teams, setTeams] = useState(JSON.parse(localStorage.getItem(`${prefix}_teams`) || '[]'));
  const [form, setForm] = useState({ team_name: '', team_color: '#00ffff', logo_url: '' });
  const [editing, setEditing] = useState(null);
  const [uploadMode, setUploadMode] = useState('url');

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(prev => ({ ...prev, logo_url: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.team_name) return;
    let updated;
    if (editing) {
      updated = teams.map(t => t.id === editing ? { ...t, ...form } : t);
    } else {
      updated = [...teams, { id: Date.now().toString(), ...form }];
    }
    setTeams(updated);
    localStorage.setItem(`${prefix}_teams`, JSON.stringify(updated));
    setForm({ team_name: '', team_color: '#00ffff', logo_url: '' });
    setEditing(null);
  };

  const del = (id) => {
    const updated = teams.filter(t => t.id !== id);
    setTeams(updated);
    localStorage.setItem(`${prefix}_teams`, JSON.stringify(updated));
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setForm({ team_name: t.team_name, team_color: t.team_color || '#00ffff', logo_url: t.logo_url || '' });
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Teams</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">{editing ? 'Edit Team' : 'Create New Team'}</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Team Name</label>
            <input type="text" value={form.team_name} onChange={e=>setForm({...form,team_name:e.target.value})} placeholder="Team name" style={SI} />
          </div>
          <div className="form-field">
            <label>Team Color</label>
            <input type="color" value={form.team_color} onChange={e=>setForm({...form,team_color:e.target.value})} />
          </div>
          <div className="form-field">
            <label>Team Logo</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              {['url','upload'].map(m => (
                <button key={m} type="button" onClick={() => setUploadMode(m)}
                  style={{ padding: '6px 14px', background: uploadMode === m ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--color-cyan)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  {m === 'url' ? 'URL' : 'Upload Image'}
                </button>
              ))}
            </div>
            {uploadMode === 'url' ? (
              <input type="text" value={form.logo_url} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="Logo URL" style={SI} />
            ) : (
              <div>
                <input type="file" accept="image/*" onChange={handleUpload} style={{ color: '#c0d0ff', padding: '8px 0' }} />
                {form.logo_url?.startsWith('data:') && <img src={form.logo_url} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'contain', marginTop: '8px', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.2)' }} />}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button className="neon-button" onClick={save}>{editing ? 'Save Changes' : 'Create Team'}</button>
            {editing && <button className="neon-button" onClick={() => { setEditing(null); setForm({ team_name:'', team_color:'#00ffff', logo_url:'' }); }}>Cancel</button>}
          </div>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="neon-button" style={{ flex: 1 }} onClick={() => startEdit(team)}>Edit</button>
              <button className="neon-button" style={{ flex: 1, borderColor: '#ff3333', color: '#ff3333' }} onClick={() => del(team.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// LEAGUE ROSTERS TAB
const LeagueRostersTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [teams] = useState(JSON.parse(localStorage.getItem(`${prefix}_teams`) || '[]'));
  const [players, setPlayers] = useState(JSON.parse(localStorage.getItem(`${prefix}_players`) || '[]'));
  const [selectedTeam, setSelectedTeam] = useState(null);

  const assignPlayer = (playerId, teamName) => {
    const updated = players.map(p => p.id === playerId ? { ...p, team: teamName } : p);
    setPlayers(updated);
    localStorage.setItem(`${prefix}_players`, JSON.stringify(updated));
  };

  const unassignPlayer = (playerId) => {
    const updated = players.map(p => p.id === playerId ? { ...p, team: '' } : p);
    setPlayers(updated);
    localStorage.setItem(`${prefix}_players`, JSON.stringify(updated));
  };

  if (!selectedTeam) return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Rosters</h2>
      <p style={{ color: 'rgba(192,208,255,0.6)', marginTop: '10px' }}>Select a team to manage its roster</p>
      <div className="teams-grid" style={{ marginTop: '20px' }}>
        {teams.length === 0 ? (
          <div className="neon-card p-3"><p style={{ color: 'rgba(192,208,255,0.5)' }}>No teams yet. Create teams first.</p></div>
        ) : teams.map(t => (
          <div key={t.id} className="neon-card p-3" style={{ cursor: 'pointer' }} onClick={() => setSelectedTeam(t)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {t.logo_url ? <img src={t.logo_url} alt={t.team_name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} /> : <div style={{ width: '40px', height: '40px', background: t.team_color, borderRadius: '4px' }} />}
              <span className="gradient-text-cyan" style={{ fontWeight: 700 }}>{t.team_name}</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.5)' }}>{players.filter(p => p.team === t.team_name).length} players</p>
          </div>
        ))}
      </div>
    </div>
  );

  const teamPlayers = players.filter(p => p.team === selectedTeam.team_name);
  const freePlayers = players.filter(p => !p.team || p.team === '');

  const clearRoster = () => {
    if (!window.confirm(`Remove all ${teamPlayers.length} players from ${selectedTeam.team_name}?`)) return;
    const updated = players.map(p => p.team === selectedTeam.team_name ? { ...p, team: '' } : p);
    setPlayers(updated);
    localStorage.setItem(`${prefix}_players`, JSON.stringify(updated));
  };

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className="neon-button" onClick={() => setSelectedTeam(null)}>← Back to Teams</button>
        {teamPlayers.length > 0 && (
          <button className="neon-button" style={{ borderColor: '#ff3333', color: '#ff3333' }} onClick={clearRoster}>
            🗑️ Clear Entire Roster
          </button>
        )}
      </div>
      <h2 className="gradient-text-cyan">{selectedTeam.team_name} Roster</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="neon-card p-3">
          <h4 className="gradient-text-cyan">On Roster ({teamPlayers.length})</h4>
          <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
            {teamPlayers.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(0,255,255,0.05)', borderRadius: '4px' }}>
                <span style={{ color: '#c0d0ff' }}>{p.player_name}</span>
                <button onClick={() => unassignPlayer(p.id)} style={{ background: 'none', border: '1px solid #ff3333', color: '#ff3333', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '0.8rem' }}>Remove</button>
              </div>
            ))}
            {teamPlayers.length === 0 && <p style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.85rem' }}>No players on this roster</p>}
          </div>
        </div>
        <div className="neon-card p-3">
          <h4 className="gradient-text-magenta">Free Agents ({freePlayers.length})</h4>
          <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
            {freePlayers.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,0,255,0.05)', borderRadius: '4px' }}>
                <span style={{ color: '#c0d0ff' }}>{p.player_name}</span>
                <button onClick={() => assignPlayer(p.id, selectedTeam.team_name)} style={{ background: 'none', border: '1px solid var(--color-cyan)', color: 'var(--color-cyan)', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '0.8rem' }}>Add</button>
              </div>
            ))}
            {freePlayers.length === 0 && <p style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.85rem' }}>No free agents</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// LEAGUE GAMES TAB
const LeagueGamesTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [games, setGames] = useState(JSON.parse(localStorage.getItem(`${prefix}_games`) || '[]'));
  const [teams] = useState(JSON.parse(localStorage.getItem(`${prefix}_teams`) || '[]'));
  const [newGame, setNewGame] = useState({ home_team: '', away_team: '', game_date: '', home_score: 0, away_score: 0 });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  const addGame = () => {
    if (!newGame.home_team || !newGame.away_team || newGame.home_team === newGame.away_team) return;
    const updated = [...games, {
      id: Date.now().toString(), ...newGame, status: 'scheduled',
      home_team_logo: teams.find(t => t.team_name === newGame.home_team)?.logo_url || '',
      away_team_logo: teams.find(t => t.team_name === newGame.away_team)?.logo_url || '',
      home_team_color: teams.find(t => t.team_name === newGame.home_team)?.team_color || '#00ffff',
      away_team_color: teams.find(t => t.team_name === newGame.away_team)?.team_color || '#00ffff',
    }];
    setGames(updated);
    localStorage.setItem(`${prefix}_games`, JSON.stringify(updated));
    setNewGame({ home_team: '', away_team: '', game_date: '', home_score: 0, away_score: 0 });
  };

  const updateGame = () => {
    const updated = games.map(g => g.id === editing ? { ...g, ...editForm } : g);
    setGames(updated);
    localStorage.setItem(`${prefix}_games`, JSON.stringify(updated));
    setEditing(null); setEditForm({});
  };

  const del = (id) => {
    const updated = games.filter(g => g.id !== id);
    setGames(updated);
    localStorage.setItem(`${prefix}_games`, JSON.stringify(updated));
  };

  const startEdit = (g) => {
    setEditing(g.id);
    setEditForm({ home_score: g.home_score||0, away_score: g.away_score||0, status: g.status||'scheduled' });
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Games</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">Schedule Game</h3>
        <div className="edit-form">
          {['home_team','away_team'].map(field => (
            <div className="form-field" key={field}>
              <label>{field === 'home_team' ? 'Home Team' : 'Away Team'}</label>
              <select value={newGame[field]} onChange={e=>setNewGame({...newGame,[field]:e.target.value})} style={selectStyle}>
                <option value="">Select team</option>
                {teams.map(t => <option key={t.id} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
          ))}
          <div className="form-field">
            <label>Game Date</label>
            <input type="datetime-local" value={newGame.game_date} onChange={e=>setNewGame({...newGame,game_date:e.target.value})} style={SI} />
          </div>
          <button className="neon-button" onClick={addGame}>Schedule Game</button>
        </div>
      </div>

      {editing && (
        <div className="neon-card p-3" style={{ marginBottom: '30px' }}>
          <h3 className="gradient-text-magenta">Edit Game</h3>
          <div className="edit-form">
            <div className="form-field">
              <label>Home Score</label>
              <input type="number" value={editForm.home_score||0} onChange={e=>setEditForm({...editForm,home_score:parseInt(e.target.value)||0})} style={SI} />
            </div>
            <div className="form-field">
              <label>Away Score</label>
              <input type="number" value={editForm.away_score||0} onChange={e=>setEditForm({...editForm,away_score:parseInt(e.target.value)||0})} style={SI} />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={editForm.status||'scheduled'} onChange={e=>setEditForm({...editForm,status:e.target.value})} style={selectStyle}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="neon-button" onClick={updateGame}>Save Changes</button>
              <button className="neon-button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="games-list">
        {games.length === 0 ? (
          <div className="neon-card p-3"><p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No games scheduled yet.</p></div>
        ) : [...games].reverse().map(game => (
          <div key={game.id} className="neon-card p-3" style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ margin: '0 0 4px', color: 'var(--color-cyan)', fontWeight: 700 }}>
                  {game.home_team} <span style={{ color: 'var(--color-magenta)' }}>{game.home_score}</span> — <span style={{ color: 'var(--color-magenta)' }}>{game.away_score}</span> {game.away_team}
                </p>
                {game.game_date && <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(192,208,255,0.4)' }}>{new Date(game.game_date).toLocaleString()}</p>}
                <span className={`badge badge-${game.status === 'live' ? 'active' : 'pending'}`} style={{ marginTop: '6px', display: 'inline-block' }}>{game.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="neon-button" style={{ padding: '6px 14px' }} onClick={() => startEdit(game)}>Edit</button>
                <button className="neon-button" style={{ padding: '6px 14px', borderColor: '#ff3333', color: '#ff3333' }} onClick={() => del(game.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// LEAGUE BOX SCORES TAB
const LeagueBoxScoresTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [bsGames, setBsGames] = useState(JSON.parse(localStorage.getItem(`${prefix}_bs_games`) || '[]'));
  const [boxScores, setBoxScores] = useState(JSON.parse(localStorage.getItem(`${prefix}_box_scores`) || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem(`${prefix}_players`) || '[]'));
  const [teams] = useState(JSON.parse(localStorage.getItem(`${prefix}_teams`) || '[]'));
  const [selectedGame, setSelectedGame] = useState(null);
  const [editingScore, setEditingScore] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newGame, setNewGame] = useState({ game_name:'', home_team:'', away_team:'', home_score:0, away_score:0, game_date:'' });
  const [formError, setFormError] = useState('');

  const statFields = ['hits','runs','rbis','home_runs','strike_outs','innings_pitched','strikeouts_pitched','hits_allowed','earned_runs'];
  const statLabels = { hits:'Hits', runs:'Runs', rbis:'RBIs', home_runs:'HR', strike_outs:'K(Bat)', innings_pitched:'IP', strikeouts_pitched:'K(Pit)', hits_allowed:'HA', earned_runs:'ER' };

  const createGame = () => {
    if (!newGame.game_name) { setFormError('Game name required'); return; }
    const updated = [...bsGames, { id: Date.now().toString(), ...newGame }];
    setBsGames(updated);
    localStorage.setItem(`${prefix}_bs_games`, JSON.stringify(updated));
    setNewGame({ game_name:'', home_team:'', away_team:'', home_score:0, away_score:0, game_date:'' });
    setShowCreate(false); setFormError('');
  };

  const deleteGame = (id) => {
    const updated = bsGames.filter(g => g.id !== id);
    setBsGames(updated);
    localStorage.setItem(`${prefix}_bs_games`, JSON.stringify(updated));
    const updatedScores = boxScores.filter(b => b.game_id !== id);
    setBoxScores(updatedScores);
    localStorage.setItem(`${prefix}_box_scores`, JSON.stringify(updatedScores));
  };

  const addPlayerScore = (playerId) => {
    const player = players.find(p => p.id === playerId);
    const newScore = { id: Date.now().toString(), game_id: selectedGame.id, player_id: playerId, team: player?.team||'', hits:0, runs:0, rbis:0, home_runs:0, strike_outs:0, strikeouts_pitched:0, hits_allowed:0, earned_runs:0, innings_pitched:0 };
    const updated = [...boxScores, newScore];
    setBoxScores(updated);
    localStorage.setItem(`${prefix}_box_scores`, JSON.stringify(updated));
  };

  const updateGameScore = (gameId, field, value) => {
    const updated = bsGames.map(g => g.id === gameId ? { ...g, [field]: value } : g);
    setBsGames(updated);
    localStorage.setItem(`${prefix}_bs_games`, JSON.stringify(updated));
    if (selectedGame?.id === gameId) setSelectedGame(prev => ({ ...prev, [field]: value }));
  };

  const saveScore = () => {
    const updated = boxScores.map(b => b.id === editingScore.id ? { ...b, ...editForm } : b);
    setBoxScores(updated);
    localStorage.setItem(`${prefix}_box_scores`, JSON.stringify(updated));
    setEditingScore(null); setEditForm({});
  };

  if (editingScore) return (
    <div className="tab-content">
      <button className="neon-button" style={{ marginBottom: '20px' }} onClick={() => { setEditingScore(null); setEditForm({}); }}>← Cancel</button>
      <h2 className="gradient-text-magenta">Edit Stats — {players.find(p => p.id === editingScore.player_id)?.player_name}</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px' }}>
        <div className="edit-form">
          {statFields.map(field => (
            <div className="form-field" key={field}>
              <label>{statLabels[field]}</label>
              <input type="number" step={field === 'innings_pitched' ? '0.1' : '1'} value={editForm[field]||0} onChange={e=>setEditForm({...editForm,[field]: field==='innings_pitched'?parseFloat(e.target.value)||0:parseInt(e.target.value)||0})} min="0" style={SI} />
            </div>
          ))}
          <div className="form-actions">
            <button className="neon-button" onClick={saveScore}>Save Stats</button>
            <button className="neon-button" onClick={() => { setEditingScore(null); setEditForm({}); }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (selectedGame) {
    const gameScores = boxScores.filter(b => b.game_id === selectedGame.id);
    const addedIds = new Set(gameScores.map(s => s.player_id));
    return (
      <div className="tab-content">
        <button className="neon-button" style={{ marginBottom: '20px' }} onClick={() => setSelectedGame(null)}>← Back</button>
        <h2 className="gradient-text-cyan">{selectedGame.game_name}</h2>
        <div className="neon-card p-3" style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'rgba(192,208,255,0.7)' }}>{selectedGame.home_team||'Home'}</span>
          <input type="number" value={selectedGame.home_score||0} onChange={e=>updateGameScore(selectedGame.id,'home_score',parseInt(e.target.value)||0)} style={{ width:'60px', padding:'6px', background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.2)', color:'var(--color-cyan)', borderRadius:'4px', textAlign:'center', fontWeight:'700', fontSize:'1.1rem' }} />
          <span style={{ color: 'rgba(192,208,255,0.4)' }}>—</span>
          <input type="number" value={selectedGame.away_score||0} onChange={e=>updateGameScore(selectedGame.id,'away_score',parseInt(e.target.value)||0)} style={{ width:'60px', padding:'6px', background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.2)', color:'var(--color-magenta)', borderRadius:'4px', textAlign:'center', fontWeight:'700', fontSize:'1.1rem' }} />
          <span style={{ color: 'rgba(192,208,255,0.7)' }}>{selectedGame.away_team||'Away'}</span>
        </div>
        <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.7)' }}>Add Player</label>
          <select style={selectStyle} onChange={e=>{ if(e.target.value){addPlayerScore(e.target.value);e.target.value='';} }}>
            <option value="">Select player...</option>
            {players.filter(p=>!addedIds.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.player_name} {p.team?`(${p.team})`:'(FA)'}</option>)}
          </select>
        </div>
        {gameScores.length > 0 && (
          <div className="neon-card p-3" style={{ overflowX: 'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr>{['Player','Team','H','R','RBI','HR','K','IP','KP','HA','ER',''].map(h=>(
                  <th key={h} style={{ padding:'8px', color:'rgba(192,208,255,0.6)', textAlign:'center', borderBottom:'1px solid rgba(0,255,255,0.1)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {gameScores.map(score => {
                  const player = players.find(p => p.id === score.player_id);
                  return (
                    <tr key={score.id} style={{ borderBottom:'1px solid rgba(0,255,255,0.05)' }}>
                      <td style={{ padding:'8px', color:'var(--color-cyan)' }}>{player?.player_name||'?'}</td>
                      <td style={{ padding:'8px', color:'rgba(192,208,255,0.6)', textAlign:'center' }}>{score.team||'—'}</td>
                      {[score.hits,score.runs,score.rbis,score.home_runs,score.strike_outs,score.innings_pitched,score.strikeouts_pitched,score.hits_allowed,score.earned_runs].map((v,i)=>(
                        <td key={i} style={{ padding:'8px', textAlign:'center', color:'rgba(192,208,255,0.85)' }}>{v||0}</td>
                      ))}
                      <td style={{ padding:'8px', textAlign:'center' }}>
                        <button onClick={()=>{setEditingScore(score);setEditForm(score);}} style={{ background:'none', border:'none', color:'var(--color-cyan)', cursor:'pointer', fontSize:'1rem' }}>✏️</button>
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

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2 className="gradient-text-cyan">📈 {label} Box Scores</h2>
        <button className="neon-button" onClick={()=>setShowCreate(!showCreate)}>{showCreate?'Cancel':'+ New Game'}</button>
      </div>
      {showCreate && (
        <div className="neon-card p-3" style={{ marginTop:'20px', marginBottom:'30px' }}>
          <h3 className="gradient-text-magenta">Create Box Score Game</h3>
          <div className="edit-form">
            <div className="form-field"><label>Game Name</label><input type="text" value={newGame.game_name} onChange={e=>setNewGame({...newGame,game_name:e.target.value})} placeholder="e.g. Week 3 - Game 2" style={SI} /></div>
            {['home_team','away_team'].map(f=>(
              <div className="form-field" key={f}><label>{f==='home_team'?'Home Team':'Away Team'}</label>
                <select value={newGame[f]} onChange={e=>setNewGame({...newGame,[f]:e.target.value})} style={selectStyle}>
                  <option value="">Select team</option>
                  {teams.map(t=><option key={t.id} value={t.team_name}>{t.team_name}</option>)}
                </select>
              </div>
            ))}
            {['home_score','away_score'].map(f=>(
              <div className="form-field" key={f}><label>{f==='home_score'?'Home Score':'Away Score'}</label><input type="number" value={newGame[f]} onChange={e=>setNewGame({...newGame,[f]:parseInt(e.target.value)||0})} min="0" style={SI} /></div>
            ))}
            <div className="form-field"><label>Date</label><input type="date" value={newGame.game_date} onChange={e=>setNewGame({...newGame,game_date:e.target.value})} style={SI} /></div>
            <button className="neon-button" onClick={createGame}>Create Game</button>
            {formError && <p style={{ color:'#ff5555', fontSize:'0.82rem', marginTop:'8px' }}>⚠️ {formError}</p>}
          </div>
        </div>
      )}
      <div style={{ marginTop:'20px' }}>
        {bsGames.length === 0 ? (
          <div className="neon-card p-3"><p style={{ color:'rgba(192,208,255,0.5)', textAlign:'center' }}>No box score games yet.</p></div>
        ) : [...bsGames].reverse().map(game => (
          <div key={game.id} className="neon-card p-3" style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>setSelectedGame(game)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ margin:'0 0 4px', color:'var(--color-cyan)', fontWeight:'700' }}>{game.game_name}</p>
                <p style={{ margin:0, color:'rgba(192,208,255,0.75)' }}>{game.home_team||'Home'} <strong>{game.home_score}</strong> — <strong>{game.away_score}</strong> {game.away_team||'Away'}</p>
                {game.game_date && <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(192,208,255,0.4)' }}>{new Date(game.game_date).toLocaleDateString()}</p>}
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span style={{ color:'rgba(0,255,255,0.5)', fontSize:'0.8rem' }}>Open →</span>
                <button onClick={e=>{e.stopPropagation();deleteGame(game.id);}} style={{ background:'none', border:'none', color:'#ff3333', cursor:'pointer', fontSize:'0.9rem', padding:'4px 8px' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// LEAGUE GAME FEED TAB (with edit/delete)
const LeagueGameFeedTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [games] = useState(JSON.parse(localStorage.getItem(`${prefix}_games`) || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem(`${prefix}_players`) || '[]'));
  const [feed, setFeed] = useState(JSON.parse(localStorage.getItem(`${prefix}_feed`) || '[]'));
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editNote, setEditNote] = useState('');

  const eventTypes = ['Single','Double','Triple','Home Run','Strike Out','Walk','Hit by Pitch',"Fielder's Choice",'Error','Stolen Base','Caught Stealing','Double Play','Pitching Change','Pinch Hitter','Scoring Play'];

  const logEvent = () => {
    if (!selectedPlayer || !selectedEvent) return;
    const player = players.find(p => p.id === selectedPlayer);
    const newEvent = { id: Date.now().toString(), game_id: selectedGame.id, player_id: selectedPlayer, player_name: player?.player_name, team: player?.team, event_type: selectedEvent, timestamp: new Date().toISOString() };
    const updated = [...feed, newEvent];
    setFeed(updated);
    localStorage.setItem(`${prefix}_feed`, JSON.stringify(updated));
    setSelectedPlayer(null); setSelectedEvent('');
  };

  const deleteEvent = (id) => {
    const updated = feed.filter(f => f.id !== id);
    setFeed(updated);
    localStorage.setItem(`${prefix}_feed`, JSON.stringify(updated));
  };

  const saveEdit = () => {
    const updated = feed.map(f => f.id === editingEvent ? { ...f, event_type: editNote } : f);
    setFeed(updated);
    localStorage.setItem(`${prefix}_feed`, JSON.stringify(updated));
    setEditingEvent(null); setEditNote('');
  };

  const liveGames = games.filter(g => g.status === 'live' || g.status === 'final');
  const gameFeed = selectedGame ? feed.filter(f => f.game_id === selectedGame.id) : [];
  const homeTeamPlayers = selectedGame ? players.filter(p => p.team === selectedGame.home_team) : [];
  const awayTeamPlayers = selectedGame ? players.filter(p => p.team === selectedGame.away_team) : [];

  if (!selectedGame) return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Game Feed</h2>
      <p style={{ color: 'rgba(192,208,255,0.7)', marginTop: '10px' }}>Select a live or final game to log events</p>
      <div style={{ marginTop: '20px' }}>
        {liveGames.length === 0 ? (
          <div className="neon-card p-3"><p style={{ color: 'rgba(192,208,255,0.5)', textAlign: 'center' }}>No live or final games. Set a game status to Live in Games tab.</p></div>
        ) : liveGames.map(game => (
          <div key={game.id} className="neon-card p-3" style={{ marginBottom: '15px', cursor: 'pointer' }} onClick={() => setSelectedGame(game)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, color: 'var(--color-cyan)' }}><strong>{game.home_team}</strong> {game.home_score} - {game.away_score} <strong>{game.away_team}</strong></p>
              <span className={`badge badge-${game.status === 'live' ? 'active' : 'pending'}`}>{game.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="tab-content">
      <button className="neon-button" onClick={() => setSelectedGame(null)} style={{ marginBottom: '20px' }}>← Back to Games</button>
      <h2 className="gradient-text-cyan">{selectedGame.home_team} vs {selectedGame.away_team}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {[{title: selectedGame.home_team, plist: homeTeamPlayers, color: 'cyan'}, {title: selectedGame.away_team, plist: awayTeamPlayers, color: 'magenta'}].map(({title, plist, color}) => (
          <div key={title} className="neon-card p-3">
            <h4 className={`gradient-text-${color}`}>{title}</h4>
            <div style={{ marginTop: '15px', maxHeight: '250px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
              {plist.map(player => (
                <button key={player.id} onClick={() => setSelectedPlayer(player.id)}
                  style={{ padding: '8px', background: selectedPlayer === player.id ? `rgba(${color==='cyan'?'0,255,255':'255,0,255'},0.2)` : `rgba(${color==='cyan'?'0,255,255':'255,0,255'},0.05)`, border: `${selectedPlayer===player.id?'2px':'1px'} solid ${color==='cyan'?'rgba(0,255,255,0.4)':'rgba(255,0,255,0.4)'}`, color: '#c0d0ff', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  {player.player_name}
                </button>
              ))}
              {plist.length === 0 && <p style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.85rem' }}>No players on roster</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="neon-card p-3" style={{ marginTop: '20px' }}>
        <h4 className="gradient-text-magenta">Log Event</h4>
        <label style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.7)', display: 'block', marginBottom: '8px', marginTop: '10px' }}>
          {selectedPlayer ? `Player: ${players.find(p=>p.id===selectedPlayer)?.player_name}` : 'Select a player first'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
          {eventTypes.map(event => (
            <button key={event} onClick={() => setSelectedEvent(event)}
              style={{ padding: '8px', background: selectedEvent===event?'rgba(0,255,255,0.2)':'rgba(0,255,255,0.05)', border: `${selectedEvent===event?'2':'1'}px solid rgba(0,255,255,0.3)`, color: selectedEvent===event?'var(--color-cyan)':'rgba(192,208,255,0.7)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', transition: 'all 0.2s' }}>
              {event}
            </button>
          ))}
        </div>
        <button className="neon-button" onClick={logEvent} disabled={!selectedPlayer||!selectedEvent} style={{ marginTop: '15px', width: '100%' }}>Log Event</button>
      </div>

      <div className="neon-card p-3" style={{ marginTop: '20px' }}>
        <h4 className="gradient-text-cyan">Live Feed ({gameFeed.length} events)</h4>
        <div style={{ marginTop: '15px', maxHeight: '400px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
          {gameFeed.length === 0 ? <p style={{ color: 'rgba(192,208,255,0.6)' }}>No events logged yet</p> :
            [...gameFeed].reverse().map(event => (
              <div key={event.id} style={{ padding: '12px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.1)', borderRadius: '4px' }}>
                {editingEvent === event.id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={editNote} onChange={e=>setEditNote(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                      {eventTypes.map(e=><option key={e} value={e}>{e}</option>)}
                    </select>
                    <button className="neon-button" style={{ padding: '4px 12px' }} onClick={saveEdit}>Save</button>
                    <button className="neon-button" style={{ padding: '4px 12px' }} onClick={()=>{setEditingEvent(null);setEditNote('');}}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: 0, color: 'var(--color-cyan)', fontWeight: 600 }}>{event.player_name}</p>
                      <p style={{ margin: '4px 0 0', color: 'rgba(192,208,255,0.8)' }}>{event.event_type}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(192,208,255,0.4)' }}>{new Date(event.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={()=>{setEditingEvent(event.id);setEditNote(event.event_type);}} style={{ background:'none', border:'none', color:'var(--color-cyan)', cursor:'pointer', fontSize:'0.9rem' }}>✏️</button>
                      <button onClick={()=>deleteEvent(event.id)} style={{ background:'none', border:'none', color:'#ff3333', cursor:'pointer', fontSize:'0.9rem' }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// LEAGUE HALL OF FAME TAB
const LeagueHofTab = ({ prefix }) => {
  const label = prefix.toUpperCase();
  const [hofMembers, setHofMembers] = useState(JSON.parse(localStorage.getItem(`${prefix}_hof`) || '[]'));
  const [players] = useState(JSON.parse(localStorage.getItem(`${prefix}_players`) || '[]'));
  const [form, setForm] = useState({ player_name: '', year: new Date().getFullYear() });

  const add = () => {
    if (!form.player_name) return;
    const updated = [...hofMembers, { id: Date.now().toString(), ...form }];
    setHofMembers(updated);
    localStorage.setItem(`${prefix}_hof`, JSON.stringify(updated));
    setForm({ player_name: '', year: new Date().getFullYear() });
  };

  const remove = (id) => {
    const updated = hofMembers.filter(m => m.id !== id);
    setHofMembers(updated);
    localStorage.setItem(`${prefix}_hof`, JSON.stringify(updated));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Hall of Fame</h2>
      <div className="neon-card p-3" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h3 className="gradient-text-magenta">Induct Player</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Player</label>
            <select value={form.player_name} onChange={e=>setForm({...form,player_name:e.target.value})} style={selectStyle}>
              <option value="">Select player</option>
              {players.map(p=><option key={p.id} value={p.player_name}>{p.player_name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Induction Year</label>
            <input type="number" value={form.year} onChange={e=>setForm({...form,year:parseInt(e.target.value)})} style={SI} />
          </div>
          <button className="neon-button" onClick={add}>Induct Player</button>
        </div>
      </div>
      <div className="hof-grid">
        {hofMembers.map(m => (
          <div key={m.id} className="neon-card p-3">
            <div style={{ textAlign: 'center' }}>
              <h4 className="gradient-text-magenta" style={{ marginBottom: '5px' }}>{m.player_name}</h4>
              <p style={{ margin: 0, color: 'rgba(192,208,255,0.7)', fontSize: '0.9rem' }}>Inducted: {m.year}</p>
            </div>
            <button className="neon-button" style={{ width: '100%', marginTop: '15px', borderColor: '#ff3333', color: '#ff3333' }} onClick={() => remove(m.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN OWNER DASHBOARD
═══════════════════════════════════════════════════════════════ */

const OwnerDashboard = ({ onExit }) => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState(null);

  const role = user?.role;
  const isOwnerLevel = ['owner', 'cofounder', 'mod'].includes(role);
  const isNABBHelper = role === 'nabb_helper';
  const isRBMLHelper = role === 'rbml_helper';

  // Set default tab based on role
  React.useEffect(() => {
    if (isOwnerLevel) setActiveTab('member-pages');
    else if (isNABBHelper) setActiveTab('nabb-teams');
    else if (isRBMLHelper) setActiveTab('rbml-teams');
  }, [role]); // eslint-disable-line

  const renderContent = () => {
    switch (activeTab) {
      // Row 1
      case 'member-pages': return <MemberPagesTab />;
      case 'user-roles':   return <UserRolesTab />;
      // Row 2 — NABB
      case 'nabb-players':    return <LeaguePlayersTab prefix="nabb" />;
      case 'nabb-teams':      return <LeagueTeamsTab prefix="nabb" />;
      case 'nabb-rosters':    return <LeagueRostersTab prefix="nabb" />;
      case 'nabb-games':      return <LeagueGamesTab prefix="nabb" />;
      case 'nabb-boxscores':  return <LeagueBoxScoresTab prefix="nabb" />;
      case 'nabb-feed':       return <LeagueGameFeedTab prefix="nabb" />;
      case 'nabb-hof':        return <LeagueHofTab prefix="nabb" />;
      // Row 3 — RBML
      case 'rbml-players':    return <LeaguePlayersTab prefix="rbml" />;
      case 'rbml-teams':      return <LeagueTeamsTab prefix="rbml" />;
      case 'rbml-rosters':    return <LeagueRostersTab prefix="rbml" />;
      case 'rbml-games':      return <LeagueGamesTab prefix="rbml" />;
      case 'rbml-boxscores':  return <LeagueBoxScoresTab prefix="rbml" />;
      case 'rbml-feed':       return <LeagueGameFeedTab prefix="rbml" />;
      case 'rbml-hof':        return <LeagueHofTab prefix="rbml" />;
      default: return <div className="tab-content"><p style={{ color: 'rgba(192,208,255,0.5)' }}>Select a section above.</p></div>;
    }
  };

  const TabBtn = ({ id, label }) => (
    <button className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
  );

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="gradient-text">Owner Dashboard</h1>
        <div className="header-actions">
          <span className="user-role" style={{ marginRight: '20px' }}>
            Role: <span style={{ color: 'var(--color-cyan)' }}>{role?.toUpperCase()}</span>
          </span>
          <button className="neon-button" onClick={onExit} style={{ marginRight: '10px' }}>Back to Nova</button>
          <button className="neon-button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-sections">

        {/* ── ROW 1: NOVA ── */}
        {isOwnerLevel && (
          <div className="dashboard-section">
            <div className="section-label">🌐 NOVA</div>
            <div className="dashboard-tabs">
              <TabBtn id="member-pages" label="👥 Member Pages" />
              <TabBtn id="user-roles"   label="🔐 User Roles" />
            </div>
          </div>
        )}

        {/* ── ROW 2: NABB ── */}
        {(isOwnerLevel || isNABBHelper) && (
          <div className="dashboard-section">
            <div className="section-label">⚾ NABB LEAGUE</div>
            <div className="dashboard-tabs">
              <TabBtn id="nabb-players"   label="🎮 Players" />
              <TabBtn id="nabb-teams"     label="🏟️ Teams" />
              <TabBtn id="nabb-rosters"   label="👥 Rosters" />
              <TabBtn id="nabb-games"     label="📅 Games" />
              <TabBtn id="nabb-boxscores" label="📈 Box Scores" />
              <TabBtn id="nabb-feed"      label="📰 Game Feed" />
              <TabBtn id="nabb-hof"       label="🏆 Hall of Fame" />
            </div>
          </div>
        )}

        {/* ── ROW 3: RBML ── */}
        {(isOwnerLevel || isRBMLHelper) && (
          <div className="dashboard-section">
            <div className="section-label">⚾ RBML LEAGUE</div>
            <div className="dashboard-tabs">
              <TabBtn id="rbml-players"   label="🎮 Players" />
              <TabBtn id="rbml-teams"     label="🏟️ Teams" />
              <TabBtn id="rbml-rosters"   label="👥 Rosters" />
              <TabBtn id="rbml-games"     label="📅 Games" />
              <TabBtn id="rbml-boxscores" label="📈 Box Scores" />
              <TabBtn id="rbml-feed"      label="📰 Game Feed" />
              <TabBtn id="rbml-hof"       label="🏆 Hall of Fame" />
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default OwnerDashboard;
