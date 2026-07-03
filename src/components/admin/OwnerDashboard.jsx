import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import db from '../../services/db';
import './OwnerDashboard.css';

const SI = { padding:'10px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.2)', color:'#e2e5f0', borderRadius:'4px', width:'100%' };
const SS = { ...SI };

const S_HIT = [['season_g','G'],['season_ab','AB'],['season_avg','AVG'],['season_obp','OBP'],['season_slg','SLG'],['season_ops','OPS'],['season_hits','H'],['season_runs','R'],['season_2b','2B'],['season_3b','3B'],['season_home_runs','HR'],['season_rbis','RBI'],['season_bb','BB'],['season_strike_outs','K'],['season_sb','SB']];
const S_PIT = [['season_w','W'],['season_l','L'],['season_era','ERA'],['season_pg','G'],['season_gs','GS'],['season_innings_pitched','IP'],['season_strikeouts_pitched','K'],['season_pit_bb','BB'],['season_hits_allowed','H'],['season_earned_runs','ER'],['season_whip','WHIP'],['season_sv','SV'],['season_hld','HLD']];
const C_HIT = [['career_g','G'],['career_ab','AB'],['career_avg','AVG'],['career_obp','OBP'],['career_slg','SLG'],['career_ops','OPS'],['hits','H'],['runs','R'],['career_2b','2B'],['career_3b','3B'],['home_runs','HR'],['rbis','RBI'],['career_bb','BB'],['strike_outs','K'],['career_sb','SB']];
const C_PIT = [['career_w','W'],['career_l','L'],['career_era','ERA'],['career_pg','G'],['career_gs','GS'],['innings_pitched','IP'],['strikeouts_pitched','K'],['career_pit_bb','BB'],['hits_allowed','H'],['earned_runs','ER'],['career_whip','WHIP'],['career_sv','SV'],['career_hld','HLD']];

const emptyPlayer = {
  player_name:'', nickname:'', roblox_username:'', position:'', number:'', overall:75, avatar_data:'', spotify_url:'',
  season_g:'',season_ab:'',season_avg:'',season_obp:'',season_slg:'',season_ops:'',season_hits:'',season_runs:'',season_2b:'',season_3b:'',season_home_runs:'',season_rbis:'',season_bb:'',season_strike_outs:'',season_sb:'',
  season_w:'',season_l:'',season_era:'',season_pg:'',season_gs:'',season_innings_pitched:'',season_strikeouts_pitched:'',season_pit_bb:'',season_hits_allowed:'',season_earned_runs:'',season_whip:'',season_sv:'',season_hld:'',
  career_g:'',career_ab:'',career_avg:'',career_obp:'',career_slg:'',career_ops:'',hits:'',runs:'',career_2b:'',career_3b:'',home_runs:'',rbis:'',career_bb:'',strike_outs:'',career_sb:'',
  career_w:'',career_l:'',career_era:'',career_pg:'',career_gs:'',innings_pitched:'',strikeouts_pitched:'',career_pit_bb:'',hits_allowed:'',earned_runs:'',career_whip:'',career_sv:'',career_hld:'',
};

/* ── NOVA TABS ─────────────────────────────────────────────── */

const MemberPagesTab = () => {
  const [profiles, setProfiles] = useState([]);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({});
  useEffect(() => { db.getMemberProfiles().then(setProfiles); }, []);

  const startEdit = (p) => { setEditing(p.username); setForm({ ...p }); };
  const save = async () => {
    await db.saveMemberProfile(form);
    setProfiles(prev => prev.map(p => p.username === editing ? { ...p, ...form } : p));
    setEditing(null);
  };

  if (editing) return (
    <div className="tab-content">
      <button className="neon-button" style={{ marginBottom:'20px' }} onClick={() => setEditing(null)}>Back</button>
      <h2 className="gradient-text-cyan">Edit: {editing}</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px' }}>
        <div className="edit-form">
          {['bio','top_banner_url','left_banner_url','right_banner_url','spotify_url','twitter_url','twitch_url','youtube_url','instagram_url','discord_tag'].map(f => (
            <div className="form-field" key={f}>
              <label>{f.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</label>
              <input type="text" value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} style={SI} />
            </div>
          ))}
          <div className="form-actions">
            <button className="neon-button" onClick={save}>Save</button>
            <button className="neon-button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Member Pages</h2>
      <div style={{ marginTop:'20px', display:'grid', gap:'12px' }}>
        {profiles.length === 0 && <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)', textAlign:'center' }}>No profiles yet.</p></div>}
        {profiles.map(p => (
          <div key={p.username} className="neon-card p-3" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:700 }}>{p.username}</p>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.5)' }}>{p.bio||'No bio'}</p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="neon-button" onClick={() => startEdit(p)}>Edit</button>
              <button className="neon-button" style={{ borderColor:'#ff8800', color:'#ff8800' }} onClick={() => {
                if (!window.confirm(`Delete profile for ${p.username}?`)) return;
                const updated = profiles.filter(x => x.username !== p.username);
                setProfiles(updated);
                localStorage.setItem('member_profiles', JSON.stringify(updated));
              }}>Del Profile</button>
              <button className="neon-button" style={{ borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={() => {
                if (!window.confirm(`DELETE ACCOUNT for ${p.username}? Cannot be undone.`)) return;
                const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
                localStorage.setItem('nova_users', JSON.stringify(users.filter(u => u.username !== p.username)));
                const updated = profiles.filter(x => x.username !== p.username);
                setProfiles(updated);
                localStorage.setItem('member_profiles', JSON.stringify(updated));
              }}>Del Account</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserRolesTab = () => {
  const { updateUserRole } = useAuth();
  const [users, setUsers] = useState([]);
  useEffect(() => {
    import('../../services/db').then(({ default: db }) => {
      db.getUsers().then(setUsers);
    });
  }, []);
  const roles = ['member','vizta_helper','mod','cofounder','owner'];
  const roleLabel = (r) => ({ member:'Member', vizta_helper:'Vizta Helper', mod:'Moderator', cofounder:'Co-Founder', owner:'Owner' }[r] || r);
  const changeRole = (username, role) => {
    updateUserRole(username, role);
    setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u));
  };
  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">User Roles</h2>
      <div style={{ marginTop:'20px', display:'grid', gap:'12px' }}>
        {users.length === 0 && <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)', textAlign:'center' }}>No registered users.</p></div>}
        {users.map(u => (
          <div key={u.username} className="neon-card p-3" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{u.username}</span>
              <span style={{ marginLeft:'10px', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.5)' }}>{roleLabel(u.role||'member')}</span>
            </div>
            <select value={u.role||'member'} onChange={e=>changeRole(u.username, e.target.value)} style={{ ...SS, width:'auto' }}>
              {roles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

const GiveCoinsTab = () => {
  const [users] = useState(JSON.parse(localStorage.getItem('nova_users') || '[]'));
  const [username, setUsername] = useState('');
  const [amount, setAmount]     = useState(100);
  const [msg, setMsg]           = useState('');
  const SI2 = { padding:'10px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.2)', color:'#e2e5f0', borderRadius:'4px', width:'100%' };
  const give = () => {
    if (!username) { setMsg('Select a user first.'); return; }
    const key = `nova_coins_${username}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, current + amount);
    setMsg(`Gave ${amount} coins to ${username}. New total: ${current + amount}`);
    setTimeout(() => setMsg(''), 3000);
  };
  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Give Coins</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px', maxWidth:'400px' }}>
        <div className="edit-form">
          <div className="form-field">
            <label>Select User</label>
            <select value={username} onChange={e=>setUsername(e.target.value)} style={SI2}>
              <option value="">Choose user...</option>
              <option value="x0afterhoursx0">x0afterhoursx0 (owner)</option>
              {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Amount</label>
            <input type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value)||0)} min="1" style={SI2} />
          </div>
          <button className="neon-button" onClick={give}>Give Coins</button>
          {msg && <p style={{ color:'var(--color-cyan)', marginTop:'10px', fontSize:'0.88rem' }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
};

/* ── VIZTA LEAGUE TABS ─────────────────────────────────────── */

const LeaguePlayersTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [players, setPlayers] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [form, setForm]       = useState(emptyPlayer);
  const [editing, setEditing] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [zoom, setZoom]       = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x:0, y:0 });
  const [statTab, setStatTab] = useState({ period:'season', type:'hitting' });
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { db.getPlayers(prefix).then(d => { setPlayers(d); setLoading(false); }); }, [prefix]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setAvatarPreview(ev.target.result); setZoom(1); setOffsetX(0); setOffsetY(0); };
    reader.readAsDataURL(file);
  };

  const bakeAvatar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !avatarPreview) return null;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    const size = 120;
    canvas.width = size; canvas.height = size;
    ctx.clearRect(0,0,size,size);
    const iw = img.naturalWidth * zoom, ih = img.naturalHeight * zoom;
    ctx.drawImage(img, (size-iw)/2+offsetX, (size-ih)/2+offsetY, iw, ih);
    return canvas.toDataURL('image/png');
  };

  const handleMouseDown = (e) => { setDragging(true); setDragStart({ x:e.clientX-offsetX, y:e.clientY-offsetY }); };
  const handleMouseMove = (e) => { if (!dragging) return; setOffsetX(e.clientX-dragStart.x); setOffsetY(e.clientY-dragStart.y); };
  const handleMouseUp   = () => setDragging(false);

  const save = async () => {
    const avatarData = bakeAvatar() || form.avatar_data;
    const finalForm  = { ...form, avatar_data: avatarData || '' };
    if (editing) finalForm.id = editing;
    const saved = await db.savePlayer(prefix, finalForm);
    setPlayers(prev => editing ? prev.map(p => p.id===editing ? saved : p) : [...prev, saved]);
    setForm(emptyPlayer); setEditing(null); setAvatarPreview(null); setZoom(1); setOffsetX(0); setOffsetY(0);
  };

  const del = async (id) => { await db.deletePlayer(prefix, id); setPlayers(prev => prev.filter(p => p.id !== id)); };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...emptyPlayer, ...p }); if (p.avatar_data) setAvatarPreview(p.avatar_data); setZoom(1); setOffsetX(0); setOffsetY(0); };
  const cancel = () => { setEditing(null); setForm(emptyPlayer); setAvatarPreview(null); };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Players</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px', marginBottom:'30px' }}>
        <h3 className="gradient-text-magenta">{editing ? 'Edit Player' : 'Add Player'}</h3>
        <div className="edit-form">
          <h4 style={{ color:'rgba(158, 165, 196,0.7)', margin:'10px 0 8px', fontSize:'0.85rem', textTransform:'uppercase' }}>Basic Info</h4>
          {[['player_name','Player Name','text'],['position','Position','text'],['number','Jersey #','number'],['overall','Overall Rating','number']].map(([f,l,t]) => (
            <div className="form-field" key={f}>
              <label>{l}</label>
              <input type={t} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder={l} style={SI} />
            </div>
          ))}
          {/* Nickname + Roblox username side-by-side */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div className="form-field">
              <label>Nickname</label>
              <input type="text" value={form.nickname||''} onChange={e=>setForm({...form,nickname:e.target.value})} placeholder='e.g. "The Machine"' style={SI} />
            </div>
            <div className="form-field">
              <label>Roblox Username</label>
              <input type="text" value={form.roblox_username||''} onChange={e=>setForm({...form,roblox_username:e.target.value})} placeholder="e.g. coolplayer123" style={SI} />
            </div>
          </div>
          <div className="form-field">
            <label>Player Avatar Photo</label>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ color:'#e2e5f0', padding:'8px 0' }} />
            {avatarPreview && (
              <div style={{ marginTop:'12px' }}>
                <div style={{ width:'120px', height:'120px', overflow:'hidden', border:'2px solid rgba(94, 129, 244,0.3)', borderRadius:'8px', cursor:dragging?'grabbing':'grab', position:'relative', background:'#0a0d1a', userSelect:'none' }}
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                  <img ref={imgRef} src={avatarPreview} alt="preview"
                    style={{ position:'absolute', width:`${120*zoom}px`, left:`${(120-120*zoom)/2+offsetX}px`, top:`${(120-120*zoom)/2+offsetY}px`, pointerEvents:'none' }}
                    onLoad={() => { const d=bakeAvatar(); if(d) setForm(f=>({...f,avatar_data:d})); }} />
                </div>
                <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <label style={{ fontSize:'0.8rem', color:'rgba(158, 165, 196,0.7)' }}>Zoom</label>
                  <input type="range" min="0.5" max="3" step="0.05" value={zoom}
                    onChange={e=>{ setZoom(parseFloat(e.target.value)); setTimeout(()=>{ const d=bakeAvatar(); if(d) setForm(f=>({...f,avatar_data:d})); },50); }} style={{ flex:1 }} />
                  <span style={{ fontSize:'0.8rem', color:'var(--color-cyan)', minWidth:'35px' }}>{Math.round(zoom*100)}%</span>
                </div>
                <canvas ref={canvasRef} style={{ display:'none' }} />
              </div>
            )}
          </div>
          <div className="form-field" style={{ gridColumn:'1 / -1' }}>
            <label>Spotify Song URL</label>
            <input type="text" value={form.spotify_url||''} onChange={e=>setForm({...form,spotify_url:e.target.value})} placeholder="https://open.spotify.com/track/..." style={SI} />
          </div>
          <h4 style={{ color:'rgba(158, 165, 196,0.7)', margin:'18px 0 8px', fontSize:'0.85rem', textTransform:'uppercase' }}>Stats</h4>
          <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            {['season','career'].map(t => (
              <button key={t} type="button" onClick={()=>setStatTab(prev=>({...prev,period:t}))}
                style={{ padding:'6px 16px', background:statTab.period===t?'rgba(94, 129, 244,0.15)':'rgba(94, 129, 244,0.05)', border:`1px solid ${statTab.period===t?'var(--color-cyan)':'rgba(94, 129, 244,0.2)'}`, color:statTab.period===t?'var(--color-cyan)':'rgba(158, 165, 196,0.6)', borderRadius:'4px', cursor:'pointer', textTransform:'capitalize', fontWeight:600, fontSize:'0.85rem' }}>{t}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap' }}>
            {['hitting','pitching'].map(t => (
              <button key={t} type="button" onClick={()=>setStatTab(prev=>({...prev,type:t}))}
                style={{ padding:'5px 14px', background:statTab.type===t?'rgba(255, 158, 87,0.15)':'rgba(94, 129, 244,0.05)', border:`1px solid ${statTab.type===t?'var(--color-magenta)':'rgba(94, 129, 244,0.15)'}`, color:statTab.type===t?'var(--color-magenta)':'rgba(158, 165, 196,0.5)', borderRadius:'4px', cursor:'pointer', textTransform:'capitalize', fontWeight:600, fontSize:'0.8rem' }}>{t}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:'8px' }}>
            {(statTab.period==='season'?(statTab.type==='hitting'?S_HIT:S_PIT):(statTab.type==='hitting'?C_HIT:C_PIT)).map(([f,l]) => (
              <div key={f}>
                <label style={{ fontSize:'0.75rem', color:'rgba(158, 165, 196,0.6)', display:'block', marginBottom:'3px' }}>{l}</label>
                <input type="text" value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder="--" style={{ ...SI, padding:'7px', fontSize:'0.9rem' }} />
              </div>
            ))}
          </div>
          <div className="form-actions" style={{ marginTop:'18px' }}>
            <button className="neon-button" onClick={save}>{editing ? 'Save Changes' : 'Add Player'}</button>
            {editing && <button className="neon-button" onClick={cancel}>Cancel</button>}
          </div>
        </div>
      </div>
      {loading ? <p style={{ color:'rgba(158, 165, 196,0.5)' }}>Loading...</p> : (
        <>
          {/* Player search */}
          <div style={{ marginBottom:'12px' }}>
            <input
              type="text"
              placeholder="Search players by name, team, or position..."
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              style={{ ...SI, maxWidth:'420px' }}
            />
          </div>
          <div style={{ display:'grid', gap:'10px' }}>
            {players
              .filter(p => {
                const q = playerSearch.toLowerCase();
                return !q ||
                  (p.player_name||'').toLowerCase().includes(q) ||
                  (p.team||'').toLowerCase().includes(q) ||
                  (p.position||'').toLowerCase().includes(q) ||
                  (p.nickname||'').toLowerCase().includes(q);
              })
              .map(p => (
                <div key={p.id} className="neon-card p-3" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    {p.avatar_data ? <img src={p.avatar_data} alt={p.player_name} style={{ width:'44px', height:'44px', borderRadius:'6px', objectFit:'cover', border:'1px solid rgba(94, 129, 244,0.2)' }} /> : <div style={{ width:'44px', height:'44px', borderRadius:'6px', background:'rgba(94, 129, 244,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>G</div>}
                    <div>
                      <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:700 }}>{p.player_name}{p.nickname ? <span style={{ color:'rgba(158, 165, 196,0.45)', fontWeight:400, fontSize:'0.82rem', marginLeft:'6px' }}>"{p.nickname}"</span> : null}</p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.6)' }}>{p.team||'FA'} · {p.position||'--'} · OVR {p.overall}{p.roblox_username ? <span style={{ color:'rgba(158, 165, 196,0.35)', marginLeft:'6px' }}>@{p.roblox_username}</span> : null}</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button className="neon-button" style={{ padding:'6px 14px' }} onClick={() => startEdit(p)}>Edit</button>
                    <button className="neon-button" style={{ padding:'6px 14px', borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={() => del(p.id)}>Delete</button>
                  </div>
                </div>
              ))
            }
            {players.filter(p => {
              const q = playerSearch.toLowerCase();
              return !q || (p.player_name||'').toLowerCase().includes(q) || (p.team||'').toLowerCase().includes(q) || (p.position||'').toLowerCase().includes(q) || (p.nickname||'').toLowerCase().includes(q);
            }).length === 0 && (
              <div className="neon-card p-3">
                <p style={{ color:'rgba(158, 165, 196,0.4)', textAlign:'center' }}>No players match "{playerSearch}"</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const LeagueTeamsTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [teams, setTeams]   = useState([]);
  const [form, setForm]     = useState({ team_name:'', team_color:'#5e81f4', logo_url:'' });
  const [editing, setEditing] = useState(null);
  const [uploadMode, setUploadMode] = useState('url');
  const [loading, setLoading] = useState(true);

  useEffect(() => { db.getTeams(prefix).then(d => { setTeams(d); setLoading(false); }); }, [prefix]);

  const handleUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(prev => ({ ...prev, logo_url: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.team_name) return;
    const payload = editing ? { ...form, id:editing } : form;
    const saved = await db.saveTeam(prefix, payload);
    setTeams(prev => editing ? prev.map(t => t.id===editing ? saved : t) : [...prev, saved]);
    setForm({ team_name:'', team_color:'#5e81f4', logo_url:'' }); setEditing(null);
  };
  const del = async (id) => { await db.deleteTeam(prefix, id); setTeams(prev => prev.filter(t => t.id !== id)); };
  const startEdit = (t) => { setEditing(t.id); setForm({ team_name:t.team_name, team_color:t.team_color||'#5e81f4', logo_url:t.logo_url||'' }); };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Teams</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px', marginBottom:'30px' }}>
        <h3 className="gradient-text-magenta">{editing ? 'Edit Team' : 'Create Team'}</h3>
        <div className="edit-form">
          <div className="form-field"><label>Team Name</label><input type="text" value={form.team_name} onChange={e=>setForm({...form,team_name:e.target.value})} placeholder="Team name" style={SI} /></div>
          <div className="form-field"><label>Team Color</label><input type="color" value={form.team_color} onChange={e=>setForm({...form,team_color:e.target.value})} /></div>
          <div className="form-field">
            <label>Team Logo</label>
            <div style={{ display:'flex', gap:'10px', marginBottom:'10px' }}>
              {['url','upload'].map(m => <button key={m} type="button" onClick={()=>setUploadMode(m)} style={{ padding:'6px 14px', background:uploadMode===m?'rgba(94, 129, 244,0.2)':'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.3)', color:'var(--color-cyan)', borderRadius:'4px', cursor:'pointer', fontSize:'0.85rem' }}>{m==='url'?'URL':'Upload'}</button>)}
            </div>
            {uploadMode==='url'
              ? <input type="text" value={form.logo_url} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="Logo URL" style={SI} />
              : <div>
                  <input type="file" accept="image/*" onChange={handleUpload} style={{ color:'#e2e5f0', padding:'8px 0' }} />
                  {form.logo_url?.startsWith('data:') && <img src={form.logo_url} alt="Preview" style={{ width:'60px', height:'60px', objectFit:'contain', marginTop:'8px', borderRadius:'6px', border:'1px solid rgba(94, 129, 244,0.2)' }} />}
                </div>}
          </div>
          <div className="form-actions">
            <button className="neon-button" onClick={save}>{editing ? 'Save' : 'Create Team'}</button>
            {editing && <button className="neon-button" onClick={()=>{ setEditing(null); setForm({ team_name:'', team_color:'#5e81f4', logo_url:'' }); }}>Cancel</button>}
          </div>
        </div>
      </div>
      {loading ? <p style={{ color:'rgba(158, 165, 196,0.5)' }}>Loading...</p> : (
        <div className="teams-grid">
          {teams.map(team => (
            <div key={team.id} className="neon-card p-3">
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'15px' }}>
                {team.logo_url ? <img src={team.logo_url} alt={team.team_name} style={{ width:'48px', height:'48px', objectFit:'contain', borderRadius:'6px', border:'1px solid rgba(94, 129, 244,0.2)' }} /> : <div style={{ width:'48px', height:'48px', background:team.team_color, borderRadius:'6px' }} />}
                <h4 className="gradient-text-cyan" style={{ margin:0 }}>{team.team_name}</h4>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button className="neon-button" style={{ flex:1 }} onClick={() => startEdit(team)}>Edit</button>
                <button className="neon-button" style={{ flex:1, borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={() => del(team.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LeagueRostersTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => { db.getTeams(prefix).then(setTeams); db.getPlayers(prefix).then(setPlayers); }, [prefix]);

  const assign = async (playerId, teamName) => {
    const p = players.find(x=>x.id===playerId);
    await db.savePlayer(prefix, { ...p, team:teamName });
    setPlayers(prev => prev.map(x => x.id===playerId ? { ...x, team:teamName } : x));
  };
  const unassign = async (playerId) => {
    const p = players.find(x=>x.id===playerId);
    await db.savePlayer(prefix, { ...p, team:'' });
    setPlayers(prev => prev.map(x => x.id===playerId ? { ...x, team:'' } : x));
  };
  const clearRoster = async () => {
    const tp = players.filter(p=>p.team===selectedTeam.team_name);
    if (!window.confirm(`Remove all ${tp.length} players from ${selectedTeam.team_name}?`)) return;
    for (const p of tp) await db.savePlayer(prefix, { ...p, team:'' });
    setPlayers(prev => prev.map(p => p.team===selectedTeam.team_name ? { ...p, team:'' } : p));
  };

  if (!selectedTeam) return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Rosters</h2>
      <div className="teams-grid" style={{ marginTop:'20px' }}>
        {teams.length===0 && <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)' }}>No teams yet.</p></div>}
        {teams.map(t => (
          <div key={t.id} className="neon-card p-3" style={{ cursor:'pointer' }} onClick={()=>setSelectedTeam(t)}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              {t.logo_url ? <img src={t.logo_url} alt={t.team_name} style={{ width:'40px', height:'40px', objectFit:'contain', borderRadius:'4px' }} /> : <div style={{ width:'40px', height:'40px', background:t.team_color, borderRadius:'4px' }} />}
              <span className="gradient-text-cyan" style={{ fontWeight:700 }}>{t.team_name}</span>
            </div>
            <p style={{ margin:'8px 0 0', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.5)' }}>{players.filter(p=>p.team===t.team_name).length} players</p>
          </div>
        ))}
      </div>
    </div>
  );

  const teamPlayers = players.filter(p=>p.team===selectedTeam.team_name);
  const freePlayers = players.filter(p=>!p.team||p.team==='');

  return (
    <div className="tab-content">
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
        <button className="neon-button" onClick={()=>setSelectedTeam(null)}>Back</button>
        {teamPlayers.length>0 && <button className="neon-button" style={{ borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={clearRoster}>Clear Roster</button>}
      </div>
      <h2 className="gradient-text-cyan">{selectedTeam.team_name} Roster</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'20px' }}>
        <div className="neon-card p-3">
          <h4 className="gradient-text-cyan">On Roster ({teamPlayers.length})</h4>
          <div style={{ marginTop:'10px', display:'grid', gap:'8px' }}>
            {teamPlayers.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', background:'rgba(94, 129, 244,0.05)', borderRadius:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {p.avatar_data && <img src={p.avatar_data} alt="" style={{ width:'28px', height:'28px', borderRadius:'4px', objectFit:'cover' }} />}
                  <span style={{ color:'#e2e5f0' }}>{p.player_name}</span>
                </div>
                <button onClick={()=>unassign(p.id)} style={{ background:'none', border:'1px solid #ff6b7a', color:'#ff6b7a', borderRadius:'4px', cursor:'pointer', padding:'2px 8px', fontSize:'0.8rem' }}>Remove</button>
              </div>
            ))}
            {teamPlayers.length===0 && <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem' }}>No players on this roster</p>}
          </div>
        </div>
        <div className="neon-card p-3">
          <h4 className="gradient-text-magenta">Free Agents ({freePlayers.length})</h4>
          <div style={{ marginTop:'10px', display:'grid', gap:'8px' }}>
            {freePlayers.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', background:'rgba(255, 158, 87,0.05)', borderRadius:'4px' }}>
                <span style={{ color:'#e2e5f0' }}>{p.player_name}</span>
                <button onClick={()=>assign(p.id, selectedTeam.team_name)} style={{ background:'none', border:'1px solid var(--color-cyan)', color:'var(--color-cyan)', borderRadius:'4px', cursor:'pointer', padding:'2px 8px', fontSize:'0.8rem' }}>Add</button>
              </div>
            ))}
            {freePlayers.length===0 && <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem' }}>No free agents</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const LeagueGamesTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [games, setGames]   = useState([]);
  const [teams, setTeams]   = useState([]);
  const [newGame, setNewGame] = useState({ home_team:'', away_team:'', game_date:'', home_score:0, away_score:0 });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { db.getGames(prefix).then(d=>{setGames(d);setLoading(false);}); db.getTeams(prefix).then(setTeams); }, [prefix]);

  const addGame = async () => {
    if (!newGame.home_team||!newGame.away_team||newGame.home_team===newGame.away_team) return;
    const ht=teams.find(t=>t.team_name===newGame.home_team), at=teams.find(t=>t.team_name===newGame.away_team);
    const saved = await db.saveGame(prefix, { ...newGame, status:'scheduled', home_team_logo:ht?.logo_url||'', away_team_logo:at?.logo_url||'', home_team_color:ht?.team_color||'#5e81f4', away_team_color:at?.team_color||'#5e81f4' });
    setGames(prev=>[saved,...prev]); setNewGame({ home_team:'', away_team:'', game_date:'', home_score:0, away_score:0 });
  };
  const updateGame = async () => {
    const saved = await db.saveGame(prefix, { ...games.find(g=>g.id===editing), ...editForm, id:editing });
    setGames(prev=>prev.map(g=>g.id===editing?saved:g)); setEditing(null); setEditForm({});
  };
  const del = async (id) => { await db.deleteGame(prefix, id); setGames(prev=>prev.filter(g=>g.id!==id)); };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Games</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px', marginBottom:'30px' }}>
        <h3 className="gradient-text-magenta">Schedule Game</h3>
        <div className="edit-form">
          {['home_team','away_team'].map(f => (
            <div className="form-field" key={f}>
              <label>{f==='home_team'?'Home Team':'Away Team'}</label>
              <select value={newGame[f]} onChange={e=>setNewGame({...newGame,[f]:e.target.value})} style={SS}>
                <option value="">Select team</option>
                {teams.map(t=><option key={t.id} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
          ))}
          <div className="form-field"><label>Date and Time</label><input type="datetime-local" value={newGame.game_date} onChange={e=>setNewGame({...newGame,game_date:e.target.value})} style={SI} /></div>
          <button className="neon-button" onClick={addGame}>Schedule Game</button>
        </div>
      </div>
      {editing && (
        <div className="neon-card p-3" style={{ marginBottom:'30px' }}>
          <h3 className="gradient-text-magenta">Edit Game</h3>
          <div className="edit-form">
            <div className="form-field"><label>Home Score</label><input type="number" value={editForm.home_score??0} onChange={e=>setEditForm({...editForm,home_score:+e.target.value})} style={SI} /></div>
            <div className="form-field"><label>Away Score</label><input type="number" value={editForm.away_score??0} onChange={e=>setEditForm({...editForm,away_score:+e.target.value})} style={SI} /></div>
            <div className="form-field">
              <label>Status</label>
              <select value={editForm.status||'scheduled'} onChange={e=>setEditForm({...editForm,status:e.target.value})} style={SS}>
                <option value="scheduled">Scheduled</option><option value="live">Live</option><option value="final">Final</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="neon-button" onClick={updateGame}>Save</button>
              <button className="neon-button" onClick={()=>setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <p style={{ color:'rgba(158, 165, 196,0.5)' }}>Loading...</p> : games.map(game => (
        <div key={game.id} className="neon-card p-3" style={{ marginBottom:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <p style={{ margin:'0 0 4px', color:'var(--color-cyan)', fontWeight:700 }}>{game.home_team} <span style={{ color:'var(--color-magenta)' }}>{game.home_score}</span> - <span style={{ color:'var(--color-magenta)' }}>{game.away_score}</span> {game.away_team}</p>
              {game.game_date && <p style={{ margin:0, fontSize:'0.8rem', color:'rgba(158, 165, 196,0.4)' }}>{new Date(game.game_date).toLocaleString()}</p>}
              <span className={`badge badge-${game.status==='live'?'active':'pending'}`} style={{ marginTop:'6px', display:'inline-block' }}>{game.status}</span>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="neon-button" style={{ padding:'6px 14px' }} onClick={()=>{ setEditing(game.id); setEditForm({ home_score:game.home_score||0, away_score:game.away_score||0, status:game.status||'scheduled' }); }}>Edit</button>
              <button className="neon-button" style={{ padding:'6px 14px', borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={()=>del(game.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LeagueBoxScoresTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [bsGames, setBsGames]     = useState([]);
  const [boxScores, setBoxScores] = useState([]);
  const [players, setPlayers]     = useState([]);
  const [teams, setTeams]         = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [editingScore, setEditingScore] = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [showCreate, setShowCreate]     = useState(false);
  const [newGame, setNewGame] = useState({ game_name:'', home_team:'', away_team:'', home_score:0, away_score:0, game_date:'' });

  useEffect(() => { db.getBsGames(prefix).then(setBsGames); db.getBoxScores(prefix).then(setBoxScores); db.getPlayers(prefix).then(setPlayers); db.getTeams(prefix).then(setTeams); }, [prefix]);

  const statFields = ['hits','runs','rbis','home_runs','strike_outs','innings_pitched','strikeouts_pitched','hits_allowed','earned_runs'];
  const statLabels = { hits:'H',runs:'R',rbis:'RBI',home_runs:'HR',strike_outs:'K',innings_pitched:'IP',strikeouts_pitched:'KP',hits_allowed:'HA',earned_runs:'ER' };

  const createGame = async () => {
    if (!newGame.game_name) return;
    const saved = await db.saveBsGame(prefix, newGame);
    setBsGames(prev=>[saved,...prev]); setNewGame({ game_name:'', home_team:'', away_team:'', home_score:0, away_score:0, game_date:'' }); setShowCreate(false);
  };
  const deleteGame = async (id) => { await db.deleteBsGame(prefix, id); setBsGames(prev=>prev.filter(g=>g.id!==id)); setBoxScores(prev=>prev.filter(b=>b.game_id!==id)); };
  const addPlayerScore = async (playerId) => {
    const player = players.find(p=>p.id===playerId);
    const newScore = { game_id:selectedGame.id, player_id:playerId, team:player?.team||'', hits:0, runs:0, rbis:0, home_runs:0, strike_outs:0, strikeouts_pitched:0, hits_allowed:0, earned_runs:0, innings_pitched:0 };
    const saved = await db.saveBoxScore(prefix, newScore);
    setBoxScores(prev=>[...prev, saved]);
  };
  const updateBsScore = async (gameId, field, value) => {
    const game = bsGames.find(g=>g.id===gameId);
    await db.saveBsGame(prefix, { ...game, [field]:value });
    setBsGames(prev=>prev.map(g=>g.id===gameId?{...g,[field]:value}:g));
    if (selectedGame?.id===gameId) setSelectedGame(prev=>({...prev,[field]:value}));
  };
  const saveScore = async () => {
    const saved = await db.saveBoxScore(prefix, { ...editingScore, ...editForm });
    setBoxScores(prev=>prev.map(b=>b.id===editingScore.id?saved:b)); setEditingScore(null); setEditForm({});
  };

  if (editingScore) return (
    <div className="tab-content">
      <button className="neon-button" style={{ marginBottom:'20px' }} onClick={()=>{ setEditingScore(null); setEditForm({}); }}>Cancel</button>
      <h2 className="gradient-text-magenta">Edit Stats - {players.find(p=>p.id===editingScore.player_id)?.player_name}</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px' }}>
        <div className="edit-form">
          {statFields.map(field => (
            <div className="form-field" key={field}>
              <label>{statLabels[field]}</label>
              <input type="number" step={field==='innings_pitched'?'0.1':'1'} value={editForm[field]||0} onChange={e=>setEditForm({...editForm,[field]:field==='innings_pitched'?parseFloat(e.target.value)||0:parseInt(e.target.value)||0})} min="0" style={SI} />
            </div>
          ))}
          <div className="form-actions">
            <button className="neon-button" onClick={saveScore}>Save Stats</button>
            <button className="neon-button" onClick={()=>{ setEditingScore(null); setEditForm({}); }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (selectedGame) {
    const gameScores = boxScores.filter(b=>b.game_id===selectedGame.id);
    const addedIds   = new Set(gameScores.map(s=>String(s.player_id)));
    return (
      <div className="tab-content">
        <button className="neon-button" style={{ marginBottom:'20px' }} onClick={()=>setSelectedGame(null)}>Back</button>
        <h2 className="gradient-text-cyan">{selectedGame.game_name}</h2>
        <div className="neon-card p-3" style={{ marginBottom:'20px', display:'flex', gap:'20px', alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ color:'rgba(158, 165, 196,0.7)' }}>{selectedGame.home_team||'Home'}</span>
          <input type="number" value={selectedGame.home_score||0} onChange={e=>updateBsScore(selectedGame.id,'home_score',+e.target.value)} style={{ width:'60px', padding:'6px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.2)', color:'var(--color-cyan)', borderRadius:'4px', textAlign:'center', fontWeight:'700', fontSize:'1.1rem' }} />
          <span style={{ color:'rgba(158, 165, 196,0.4)' }}>-</span>
          <input type="number" value={selectedGame.away_score||0} onChange={e=>updateBsScore(selectedGame.id,'away_score',+e.target.value)} style={{ width:'60px', padding:'6px', background:'rgba(255, 158, 87,0.05)', border:'1px solid rgba(255, 158, 87,0.2)', color:'var(--color-magenta)', borderRadius:'4px', textAlign:'center', fontWeight:'700', fontSize:'1.1rem' }} />
          <span style={{ color:'rgba(158, 165, 196,0.7)' }}>{selectedGame.away_team||'Away'}</span>
        </div>
        <div className="neon-card p-3" style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'0.8rem', color:'rgba(158, 165, 196,0.7)' }}>Add Player</label>
          <select style={SS} onChange={e=>{ if(e.target.value){ addPlayerScore(e.target.value); e.target.value=''; } }}>
            <option value="">Select player...</option>
            {players.filter(p=>!addedIds.has(String(p.id))).map(p=><option key={p.id} value={p.id}>{p.player_name} {p.team?`(${p.team})`:''}</option>)}
          </select>
        </div>
        {gameScores.length>0 && (
          <div className="neon-card p-3" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead><tr>{['Player','Team','H','R','RBI','HR','K','IP','KP','HA','ER',''].map(h=><th key={h} style={{ padding:'8px', color:'rgba(158, 165, 196,0.6)', textAlign:'center', borderBottom:'1px solid rgba(94, 129, 244,0.1)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {gameScores.map(score => {
                  const player = players.find(p=>String(p.id)===String(score.player_id));
                  return (
                    <tr key={score.id} style={{ borderBottom:'1px solid rgba(94, 129, 244,0.05)' }}>
                      <td style={{ padding:'8px', color:'var(--color-cyan)' }}>{player?.player_name||'?'}</td>
                      <td style={{ padding:'8px', textAlign:'center', color:'rgba(158, 165, 196,0.6)' }}>{score.team||'--'}</td>
                      {[score.hits,score.runs,score.rbis,score.home_runs,score.strike_outs,score.innings_pitched,score.strikeouts_pitched,score.hits_allowed,score.earned_runs].map((v,i)=>(
                        <td key={i} style={{ padding:'8px', textAlign:'center', color:'rgba(158, 165, 196,0.85)' }}>{v||0}</td>
                      ))}
                      <td style={{ padding:'8px', textAlign:'center' }}>
                        <button onClick={()=>{ setEditingScore(score); setEditForm({...score}); }} style={{ background:'none', border:'none', color:'var(--color-cyan)', cursor:'pointer' }}>Edit</button>
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
        <h2 className="gradient-text-cyan">{label} Box Scores</h2>
        <button className="neon-button" onClick={()=>setShowCreate(!showCreate)}>{showCreate?'Cancel':'+ New Game'}</button>
      </div>
      {showCreate && (
        <div className="neon-card p-3" style={{ marginTop:'20px', marginBottom:'30px' }}>
          <h3 className="gradient-text-magenta">Create Box Score Game</h3>
          <div className="edit-form">
            <div className="form-field"><label>Game Name</label><input type="text" value={newGame.game_name} onChange={e=>setNewGame({...newGame,game_name:e.target.value})} placeholder="e.g. Week 3 - Game 2" style={SI} /></div>
            {['home_team','away_team'].map(f=>(
              <div className="form-field" key={f}><label>{f==='home_team'?'Home Team':'Away Team'}</label>
                <select value={newGame[f]} onChange={e=>setNewGame({...newGame,[f]:e.target.value})} style={SS}>
                  <option value="">Select team</option>
                  {teams.map(t=><option key={t.id} value={t.team_name}>{t.team_name}</option>)}
                </select>
              </div>
            ))}
            {['home_score','away_score'].map(f=>(
              <div className="form-field" key={f}><label>{f==='home_score'?'Home Score':'Away Score'}</label><input type="number" value={newGame[f]} onChange={e=>setNewGame({...newGame,[f]:+e.target.value})} min="0" style={SI} /></div>
            ))}
            <div className="form-field"><label>Date</label><input type="date" value={newGame.game_date} onChange={e=>setNewGame({...newGame,game_date:e.target.value})} style={SI} /></div>
            <button className="neon-button" onClick={createGame}>Create Game</button>
          </div>
        </div>
      )}
      <div style={{ marginTop:'20px' }}>
        {bsGames.map(game => (
          <div key={game.id} className="neon-card p-3" style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>setSelectedGame(game)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ margin:'0 0 4px', color:'var(--color-cyan)', fontWeight:'700' }}>{game.game_name}</p>
                <p style={{ margin:0, color:'rgba(158, 165, 196,0.75)' }}>{game.home_team||'Home'} <strong>{game.home_score}</strong> - <strong>{game.away_score}</strong> {game.away_team||'Away'}</p>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span style={{ color:'rgba(94, 129, 244,0.5)', fontSize:'0.8rem' }}>Open</span>
                <button onClick={e=>{e.stopPropagation();deleteGame(game.id);}} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer', fontSize:'0.9rem', padding:'4px 8px' }}>X</button>
              </div>
            </div>
          </div>
        ))}
        {bsGames.length===0 && <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)', textAlign:'center' }}>No box score games yet.</p></div>}
      </div>
    </div>
  );
};

const LeagueGameFeedTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [games, setGames]   = useState([]);
  const [players, setPlayers] = useState([]);
  const [feed, setFeed]     = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedEvent, setSelectedEvent]   = useState('');
  const [editingEvent, setEditingEvent]     = useState(null);
  const [editNote, setEditNote]             = useState('');

  useEffect(() => { db.getGames(prefix).then(setGames); db.getPlayers(prefix).then(setPlayers); db.getFeed(prefix).then(setFeed); }, [prefix]);

  const eventTypes = ['Single','Double','Triple','Home Run','Strike Out','Walk','Hit by Pitch',"Fielder's Choice",'Error','Stolen Base','Caught Stealing','Double Play','Pitching Change','Pinch Hitter','Scoring Play'];
  const liveGames = games.filter(g=>g.status==='live'||g.status==='final');
  const gameFeed  = selectedGame ? feed.filter(f=>f.game_id===selectedGame.id) : [];

  const logEvent = async () => {
    if (!selectedPlayer||!selectedEvent) return;
    const player = players.find(p=>String(p.id)===String(selectedPlayer));
    const saved = await db.addFeedEvent(prefix, { game_id:selectedGame.id, player_id:selectedPlayer, player_name:player?.player_name, team:player?.team, event_type:selectedEvent });
    setFeed(prev=>[...prev,saved]); setSelectedPlayer(null); setSelectedEvent('');
  };
  const deleteEvent = async (id) => { await db.deleteFeedEvent(prefix, id); setFeed(prev=>prev.filter(f=>f.id!==id)); };
  const saveEdit = async () => {
    const saved = await db.updateFeedEvent(prefix, editingEvent, { event_type:editNote });
    setFeed(prev=>prev.map(f=>f.id===editingEvent?{...f,...saved}:f)); setEditingEvent(null); setEditNote('');
  };

  if (!selectedGame) return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Game Feed</h2>
      <p style={{ color:'rgba(158, 165, 196,0.7)', marginTop:'10px' }}>Select a live or final game</p>
      <div style={{ marginTop:'20px' }}>
        {liveGames.length===0
          ? <div className="neon-card p-3"><p style={{ color:'rgba(158, 165, 196,0.5)', textAlign:'center' }}>No live or final games. Set a game status to Live in the Games tab.</p></div>
          : liveGames.map(game=>(
            <div key={game.id} className="neon-card p-3" style={{ marginBottom:'15px', cursor:'pointer' }} onClick={()=>setSelectedGame(game)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ margin:0, color:'var(--color-cyan)' }}><strong>{game.home_team}</strong> {game.home_score} - {game.away_score} <strong>{game.away_team}</strong></p>
                <span className={`badge badge-${game.status==='live'?'active':'pending'}`}>{game.status}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const homeTeamPlayers = players.filter(p=>p.team===selectedGame.home_team);
  const awayTeamPlayers = players.filter(p=>p.team===selectedGame.away_team);

  return (
    <div className="tab-content">
      <button className="neon-button" onClick={()=>setSelectedGame(null)} style={{ marginBottom:'20px' }}>Back</button>
      <h2 className="gradient-text-cyan">{selectedGame.home_team} vs {selectedGame.away_team}</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'20px' }}>
        {[{title:selectedGame.home_team,plist:homeTeamPlayers,color:'cyan'},{title:selectedGame.away_team,plist:awayTeamPlayers,color:'magenta'}].map(({title,plist,color})=>(
          <div key={title} className="neon-card p-3">
            <h4 className={`gradient-text-${color}`}>{title}</h4>
            <div style={{ marginTop:'15px', maxHeight:'250px', overflowY:'auto', display:'grid', gap:'6px' }}>
              {plist.map(player=>(
                <button key={player.id} onClick={()=>setSelectedPlayer(player.id)}
                  style={{ padding:'8px', background:selectedPlayer===player.id?`rgba(${color==='cyan'?'94, 129, 244':'255, 158, 87'},0.2)`:`rgba(${color==='cyan'?'94, 129, 244':'255, 158, 87'},0.05)`, border:`${selectedPlayer===player.id?'2px':'1px'} solid ${color==='cyan'?'rgba(94, 129, 244,0.4)':'rgba(255, 158, 87,0.4)'}`, color:'#e2e5f0', borderRadius:'4px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'8px' }}>
                  {player.avatar_data && <img src={player.avatar_data} alt="" style={{ width:'24px', height:'24px', borderRadius:'3px', objectFit:'cover' }} />}
                  {player.player_name}
                </button>
              ))}
              {plist.length===0 && <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem' }}>No players on roster</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="neon-card p-3" style={{ marginTop:'20px' }}>
        <h4 className="gradient-text-magenta">Log Event</h4>
        <label style={{ fontSize:'0.8rem', color:'rgba(158, 165, 196,0.7)', display:'block', marginBottom:'8px', marginTop:'10px' }}>
          {selectedPlayer ? `Player: ${players.find(p=>p.id===selectedPlayer)?.player_name}` : 'Select a player first'}
        </label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))', gap:'8px' }}>
          {eventTypes.map(event=>(
            <button key={event} onClick={()=>setSelectedEvent(event)}
              style={{ padding:'8px', background:selectedEvent===event?'rgba(94, 129, 244,0.2)':'rgba(94, 129, 244,0.05)', border:`${selectedEvent===event?'2':'1'}px solid rgba(94, 129, 244,0.3)`, color:selectedEvent===event?'var(--color-cyan)':'rgba(158, 165, 196,0.7)', borderRadius:'4px', cursor:'pointer', fontSize:'0.78rem', fontWeight:'600' }}>
              {event}
            </button>
          ))}
        </div>
        <button className="neon-button" onClick={logEvent} disabled={!selectedPlayer||!selectedEvent} style={{ marginTop:'15px', width:'100%' }}>Log Event</button>
      </div>
      <div className="neon-card p-3" style={{ marginTop:'20px' }}>
        <h4 className="gradient-text-cyan">Live Feed ({gameFeed.length} events)</h4>
        <div style={{ marginTop:'15px', maxHeight:'400px', overflowY:'auto', display:'grid', gap:'8px' }}>
          {gameFeed.length===0 ? <p style={{ color:'rgba(158, 165, 196,0.6)' }}>No events logged yet</p> :
            [...gameFeed].reverse().map(event=>(
              <div key={event.id} style={{ padding:'12px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.1)', borderRadius:'4px' }}>
                {editingEvent===event.id ? (
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <select value={editNote} onChange={e=>setEditNote(e.target.value)} style={{ ...SS, flex:1 }}>
                      {eventTypes.map(e=><option key={e} value={e}>{e}</option>)}
                    </select>
                    <button className="neon-button" style={{ padding:'4px 12px' }} onClick={saveEdit}>Save</button>
                    <button className="neon-button" style={{ padding:'4px 12px' }} onClick={()=>{setEditingEvent(null);setEditNote('');}}>X</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:600 }}>{event.player_name}</p>
                      <p style={{ margin:'4px 0 0', color:'rgba(158, 165, 196,0.8)' }}>{event.event_type}</p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'rgba(158, 165, 196,0.4)' }}>{new Date(event.created_at||event.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={()=>{setEditingEvent(event.id);setEditNote(event.event_type);}} style={{ background:'none', border:'none', color:'var(--color-cyan)', cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>deleteEvent(event.id)} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer' }}>X</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const LeagueHofTab = ({ prefix }) => {
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [hofMembers, setHofMembers] = useState([]);
  const [players, setPlayers]       = useState([]);
  const [form, setForm] = useState({ player_name:'', year:new Date().getFullYear() });

  useEffect(() => { db.getHof(prefix).then(setHofMembers); db.getPlayers(prefix).then(setPlayers); }, [prefix]);

  const add = async () => {
    if (!form.player_name) return;
    const saved = await db.addHof(prefix, form);
    setHofMembers(prev=>[...prev,saved]); setForm({ player_name:'', year:new Date().getFullYear() });
  };
  const remove = async (id) => { await db.deleteHof(prefix, id); setHofMembers(prev=>prev.filter(m=>m.id!==id)); };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Hall of Fame</h2>
      <div className="neon-card p-3" style={{ marginTop:'20px', marginBottom:'30px' }}>
        <h3 className="gradient-text-magenta">Induct Player</h3>
        <div className="edit-form">
          <div className="form-field">
            <label>Player</label>
            <select value={form.player_name} onChange={e=>setForm({...form,player_name:e.target.value})} style={SS}>
              <option value="">Select player</option>
              {players.map(p=><option key={p.id} value={p.player_name}>{p.player_name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Induction Year</label><input type="number" value={form.year} onChange={e=>setForm({...form,year:+e.target.value})} style={SI} /></div>
          <button className="neon-button" onClick={add}>Induct Player</button>
        </div>
      </div>
      <div className="hof-grid">
        {hofMembers.map(m=>(
          <div key={m.id} className="neon-card p-3">
            <div style={{ textAlign:'center' }}>
              <h4 className="gradient-text-magenta" style={{ marginBottom:'5px' }}>{m.player_name}</h4>
              <p style={{ margin:0, color:'rgba(158, 165, 196,0.7)', fontSize:'0.9rem' }}>Class of {m.year}</p>
            </div>
            <button className="neon-button" style={{ width:'100%', marginTop:'15px', borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={()=>remove(m.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── MAIN DASHBOARD ────────────────────────────────────────── */

const OwnerDashboard = ({ onExit }) => {
  const { logout, user } = useAuth();
  const role = user?.role;
  const isOwnerLevel  = ['owner','cofounder','mod'].includes(role);
  const isViztaHelper = role === 'vizta_helper';

  const [activeTab, setActiveTab] = useState(
    isOwnerLevel ? 'member-pages' : 'vizta-players'
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'member-pages':    return <MemberPagesTab />;
      case 'user-roles':      return <UserRolesTab />;
      case 'give-coins':      return <GiveCoinsTab />;
      case 'vizta-players':   return <LeaguePlayersTab prefix="vizta" />;
      case 'vizta-teams':     return <LeagueTeamsTab prefix="vizta" />;
      case 'vizta-rosters':   return <LeagueRostersTab prefix="vizta" />;
      case 'vizta-games':     return <LeagueGamesTab prefix="vizta" />;
      case 'vizta-boxscores': return <LeagueBoxScoresTab prefix="vizta" />;
      case 'vizta-feed':      return <LeagueGameFeedTab prefix="vizta" />;
      case 'vizta-hof':       return <LeagueHofTab prefix="vizta" />;
      default: return null;
    }
  };

  const Btn = ({ id, label }) => (
    <button className={`tab ${activeTab===id?'active':''}`} onClick={()=>setActiveTab(id)}>{label}</button>
  );

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="gradient-text">Owner Dashboard</h1>
        <div className="header-actions">
          <span style={{ color:'var(--color-cyan)', marginRight:'20px', fontSize:'0.85rem' }}>{role?.toUpperCase()}</span>
          <button className="neon-button" onClick={onExit} style={{ marginRight:'10px' }}>Back to Nova</button>
          <button className="neon-button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-sections">
        {isOwnerLevel && (
          <div className="dashboard-section">
            <div className="section-label">NOVA</div>
            <div className="dashboard-tabs">
              <Btn id="member-pages" label="Member Pages" />
              <Btn id="user-roles"   label="User Roles" />
              <Btn id="give-coins"   label="Give Coins" />
            </div>
          </div>
        )}
        {(isOwnerLevel || isViztaHelper) && (
          <div className="dashboard-section">
            <div className="section-label">VIZTA</div>
            <div className="dashboard-tabs">
              <Btn id="vizta-players"   label="Players" />
              <Btn id="vizta-teams"     label="Teams" />
              <Btn id="vizta-rosters"   label="Rosters" />
              <Btn id="vizta-games"     label="Games" />
              <Btn id="vizta-boxscores" label="Box Scores" />
              <Btn id="vizta-feed"      label="Feed" />
              <Btn id="vizta-hof"       label="HoF" />
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-content">{renderContent()}</div>
    </div>
  );
};

export default OwnerDashboard;
