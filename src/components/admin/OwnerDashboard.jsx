import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import db from '../../services/db';
import fantasyDb from '../../services/fantasyDb';
import { ACCOLADE_TYPES, accoladeLabel, accoladeIcon } from '../../data/accolades';
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

const currentMonthLabel = () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

const LeaguePlayersTab = ({ prefix }) => {
  const { user } = useAuth();
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [players, setPlayers] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [potmMsg, setPotmMsg] = useState('');
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
  const [potmByPlayer, setPotmByPlayer] = useState({});

  useEffect(() => { db.getPlayers(prefix).then(d => { setPlayers(d); setLoading(false); }); }, [prefix]);

  const loadPotm = () => {
    const month = currentMonthLabel();
    db.getPotmAwards(prefix).then(all => {
      const map = {};
      all.filter(a => a.month_label === month).forEach(a => { map[String(a.player_id)] = a; });
      setPotmByPlayer(map);
    });
  };
  useEffect(loadPotm, [prefix]);

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

  const awardPotm = async (p) => {
    const monthLabel = currentMonthLabel();
    if (!window.confirm(`Award "Player of the Month — ${monthLabel}" to ${p.player_name}? This will be shown permanently on their stat page.`)) return;
    await db.addPotmAward(prefix, {
      player_id: p.id,
      player_name: p.player_name,
      month_label: monthLabel,
      awarded_by: user?.username || 'admin',
    });
    setPotmMsg(`🏆 ${p.player_name} is now Player of the Month for ${monthLabel}!`);
    setTimeout(() => setPotmMsg(''), 3500);
    loadPotm();
  };

  const removePotm = async (p) => {
    const award = potmByPlayer[String(p.id)];
    if (!award) return;
    if (!window.confirm(`Remove Player of the Month (${award.month_label}) from ${p.player_name}?`)) return;
    await db.deletePotmAward(prefix, award.id);
    setPotmMsg(`Removed Player of the Month from ${p.player_name}.`);
    setTimeout(() => setPotmMsg(''), 3500);
    loadPotm();
  };

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
          <div className="od-2col-grid">
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
          {potmMsg && (
            <div className="neon-card p-3" style={{ marginBottom:'12px', borderColor:'#ffd700', color:'#ffd700', textAlign:'center', fontWeight:700 }}>{potmMsg}</div>
          )}
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
                    {potmByPlayer[String(p.id)] ? (
                      <button className="neon-button" style={{ padding:'6px 14px', borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={() => removePotm(p)} title="Remove Player of the Month">🗑 Remove POTM</button>
                    ) : (
                      <button className="neon-button" style={{ padding:'6px 14px', borderColor:'#ffd700', color:'#ffd700' }} onClick={() => awardPotm(p)} title="Award Player of the Month">🏆 Player of the Month</button>
                    )}
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
      <div className="od-2col-grid" style={{ marginTop:'20px' }}>
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
      <div className="od-2col-grid" style={{ marginTop:'20px' }}>
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

const LeagueAwardsTab = ({ prefix }) => {
  const { user } = useAuth();
  const label = prefix === 'vizta' ? 'Vizta' : prefix.toUpperCase();
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [potmAwards, setPotmAwards] = useState([]);
  const [accolades, setAccolades] = useState([]);
  const [monthLabel, setMonthLabel] = useState(currentMonthLabel());
  const [potmNote, setPotmNote] = useState('');
  const [accType, setAccType] = useState(ACCOLADE_TYPES[0].key);
  const [accSeason, setAccSeason] = useState('S1');
  const [accCustomLabel, setAccCustomLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { db.getPlayers(prefix).then(d => { setPlayers(d); setLoading(false); }); }, [prefix]);

  const selectedPlayer = players.find(p => String(p.id) === String(selectedId));

  useEffect(() => {
    if (!selectedId) { setPotmAwards([]); setAccolades([]); return; }
    db.getPotmAwards(prefix, selectedId).then(setPotmAwards);
    db.getAccolades(prefix, selectedId).then(setAccolades);
  }, [prefix, selectedId]);

  const givePotm = async () => {
    if (!selectedPlayer || !monthLabel.trim()) return;
    const saved = await db.addPotmAward(prefix, {
      player_id: selectedPlayer.id,
      player_name: selectedPlayer.player_name,
      month_label: monthLabel.trim(),
      note: potmNote.trim(),
      awarded_by: user?.username || 'admin',
    });
    setPotmAwards(prev => [saved, ...prev]);
    setPotmNote('');
  };
  const removePotm = async (id) => { await db.deletePotmAward(prefix, id); setPotmAwards(prev => prev.filter(a => a.id !== id)); };

  const giveAccolade = async () => {
    if (!selectedPlayer || !accSeason.trim()) return;
    if (accType === 'custom' && !accCustomLabel.trim()) return;
    const saved = await db.addAccolade(prefix, {
      player_id: selectedPlayer.id,
      player_name: selectedPlayer.player_name,
      type: accType,
      season: accSeason.trim(),
      custom_label: accType === 'custom' ? accCustomLabel.trim() : '',
      awarded_by: user?.username || 'admin',
    });
    setAccolades(prev => [saved, ...prev]);
    setAccCustomLabel('');
  };
  const removeAccolade = async (id) => { await db.deleteAccolade(prefix, id); setAccolades(prev => prev.filter(a => a.id !== id)); };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Awards & Accolades</h2>
      <p style={{ color:'rgba(158, 165, 196,0.6)', marginTop:'6px', marginBottom:'20px', fontSize:'0.88rem' }}>
        Award Player of the Month and season accolades (Gold Glove, Silver Slugger, MVP, All-Star, etc.) — these show up permanently as a trophy card and tags on the player's stat page.
      </p>

      <div className="neon-card p-3" style={{ marginBottom:'24px' }}>
        <div className="form-field">
          <label>Player</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={SS}>
            <option value="">{loading ? 'Loading players...' : 'Select a player'}</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.player_name}{p.team ? ` — ${p.team}` : ''}</option>)}
          </select>
        </div>
      </div>

      {selectedPlayer && (
        <div style={{ display:'grid', gap:'24px', gridTemplateColumns:'1fr', maxWidth:'760px' }}>
          {/* Player of the Month */}
          <div className="neon-card p-3">
            <h3 style={{ color:'#ffd700', marginBottom:'12px' }}>🏆 Player of the Month</h3>
            <div className="od-2col-grid">
              <div className="form-field">
                <label>Month</label>
                <input type="text" value={monthLabel} onChange={e => setMonthLabel(e.target.value)} placeholder="e.g. July 2026" style={SI} />
              </div>
              <div className="form-field">
                <label>Note (optional)</label>
                <input type="text" value={potmNote} onChange={e => setPotmNote(e.target.value)} placeholder="e.g. Led the league in home runs" style={SI} />
              </div>
            </div>
            <button className="neon-button" style={{ marginTop:'12px', borderColor:'#ffd700', color:'#ffd700' }} onClick={givePotm}>Award Player of the Month</button>

            <div style={{ marginTop:'18px', display:'grid', gap:'8px' }}>
              {potmAwards.length === 0 && <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem' }}>No Player of the Month awards yet.</p>}
              {potmAwards.map(a => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.25)', borderRadius:'6px' }}>
                  <div>
                    <span style={{ color:'#ffd700', fontWeight:700 }}>{a.month_label}</span>
                    {a.note && <span style={{ marginLeft:'10px', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.6)' }}>{a.note}</span>}
                  </div>
                  <button onClick={() => removePotm(a.id)} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Accolades */}
          <div className="neon-card p-3">
            <h3 className="gradient-text-magenta" style={{ marginBottom:'12px' }}>Season Accolades</h3>
            <div className="od-2col-grid">
              <div className="form-field">
                <label>Award</label>
                <select value={accType} onChange={e => setAccType(e.target.value)} style={SS}>
                  {ACCOLADE_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Season</label>
                <input type="text" value={accSeason} onChange={e => setAccSeason(e.target.value)} placeholder="e.g. S1" style={SI} />
              </div>
            </div>
            {accType === 'custom' && (
              <div className="form-field" style={{ marginTop:'8px' }}>
                <label>Custom Award Name</label>
                <input type="text" value={accCustomLabel} onChange={e => setAccCustomLabel(e.target.value)} placeholder="e.g. Defensive Player of the Year" style={SI} />
              </div>
            )}
            <button className="neon-button" style={{ marginTop:'12px' }} onClick={giveAccolade}>Add Accolade</button>

            <div style={{ marginTop:'18px', display:'grid', gap:'8px' }}>
              {accolades.length === 0 && <p style={{ color:'rgba(158, 165, 196,0.4)', fontSize:'0.85rem' }}>No accolades yet.</p>}
              {accolades.map(a => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.15)', borderRadius:'6px' }}>
                  <span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{accoladeIcon(a)} {accoladeLabel(a)}</span>
                  <button onClick={() => removeAccolade(a.id)} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── FANTASY MANAGE TAB ─────────────────────────────────────── */

const FantasyManageTab = () => {
  const [leagues,        setLeagues]        = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [teams,          setTeams]          = useState([]);
  const [deleting,       setDeleting]       = useState(null);
  const [msg,            setMsg]            = useState('');

  const loadLeagues = () => fantasyDb.getAllLeagues().then(setLeagues).catch(() => {});

  useEffect(() => { loadLeagues(); }, []); // eslint-disable-line

  const loadTeams = async (league) => {
    setSelectedLeague(league);
    const t = await fantasyDb.getTeams(league.id).catch(() => []);
    setTeams(t);
  };

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const handleDeleteLeague = async (league) => {
    if (!window.confirm(`Delete league "${league.name}" and all its data? This cannot be undone.`)) return;
    setDeleting(league.id);
    await fantasyDb.deleteLeague(league.id);
    if (selectedLeague?.id === league.id) { setSelectedLeague(null); setTeams([]); }
    await loadLeagues();
    setDeleting(null);
    flash(`✓ League "${league.name}" deleted`);
  };

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Delete team "${team.team_name}"?`)) return;
    setDeleting(team.id);
    await fantasyDb.deleteTeam(team.id);
    setTeams(prev => prev.filter(t => t.id !== team.id));
    setDeleting(null);
    flash(`✓ Team "${team.team_name}" deleted`);
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Manage Fantasy Leagues &amp; Teams</h2>
      <p style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.85rem', margin:'4px 0 20px' }}>
        Delete leagues or individual teams. Deletions are permanent.
      </p>
      {msg && <p style={{ color:'#22c55e', fontSize:'0.85rem', marginBottom:12 }}>{msg}</p>}

      {/* Leagues list */}
      <div className="neon-card p-3" style={{ marginBottom:16 }}>
        <h3 style={{ color:'var(--color-cyan)', margin:'0 0 14px', fontSize:'0.95rem' }}>All Leagues ({leagues.length})</h3>
        {leagues.length === 0 && <p style={{ color:'rgba(158,165,196,0.35)', fontSize:'0.85rem' }}>No fantasy leagues found.</p>}
        {leagues.map(l => (
          <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(94,129,244,0.07)' }}>
            <div style={{ flex:1 }}>
              <span style={{ fontWeight:700, color:'#e2e5f0' }}>{l.name}</span>
              <span style={{ marginLeft:8, fontSize:'0.75rem', color:'rgba(158,165,196,0.4)' }}>{(l.sport||'').toUpperCase()} · {l.format||'redraft'} · {l.scoring_type||'h2h'}</span>
            </div>
            <button
              className="neon-button"
              style={{ borderColor:'rgba(94,129,244,0.3)', color:'var(--color-cyan)', fontSize:'0.78rem', padding:'4px 12px' }}
              onClick={() => selectedLeague?.id === l.id ? (setSelectedLeague(null), setTeams([])) : loadTeams(l)}
            >
              {selectedLeague?.id === l.id ? 'Collapse' : 'View Teams'}
            </button>
            <button
              className="neon-button"
              disabled={deleting === l.id}
              style={{ borderColor:'#ff6b7a', color:'#ff6b7a', fontSize:'0.78rem', padding:'4px 12px' }}
              onClick={() => handleDeleteLeague(l)}
            >
              {deleting === l.id ? '…' : 'Delete'}
            </button>
          </div>
        ))}
      </div>

      {/* Teams for selected league */}
      {selectedLeague && (
        <div className="neon-card p-3">
          <h3 style={{ color:'var(--color-cyan)', margin:'0 0 14px', fontSize:'0.95rem' }}>
            Teams in "{selectedLeague.name}" ({teams.length})
          </h3>
          {teams.length === 0 && <p style={{ color:'rgba(158,165,196,0.35)', fontSize:'0.85rem' }}>No teams yet.</p>}
          {teams.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(94,129,244,0.07)' }}>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:700, color:'#e2e5f0' }}>{t.team_name}</span>
                <span style={{ marginLeft:8, fontSize:'0.75rem', color:'rgba(158,165,196,0.4)' }}>owner: {t.owner_username}</span>
              </div>
              <button
                className="neon-button"
                disabled={deleting === t.id}
                style={{ borderColor:'#ff6b7a', color:'#ff6b7a', fontSize:'0.78rem', padding:'4px 12px' }}
                onClick={() => handleDeleteTeam(t)}
              >
                {deleting === t.id ? '…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── FANTASY SCHEDULE TAB ──────────────────────────────────── */

const FantasyScheduleTab = () => {
  const [leagues,        setLeagues]        = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [teams,          setTeams]          = useState([]);
  const [selectedTeam,   setSelectedTeam]   = useState(null);
  const [schedule,       setSchedule]       = useState([]);
  const [schedLoading,   setSchedLoading]   = useState(false);
  const [form,           setForm]           = useState({ week: '', opponent: '', is_home: 'true', game_date: '', result: '', score: '', notes: '' });
  const [saving,         setSaving]         = useState(false);
  const [msg,            setMsg]            = useState('');

  useEffect(() => {
    // Build league list: all fantasy leagues + a synthetic Vizta entry
    fantasyDb.getAllLeagues()
      .then(fl => setLeagues([
        { id: '__vizta__', name: 'Vizta Baseball League 🔵', sport: 'baseball' },
        ...fl,
      ]))
      .catch(() => setLeagues([{ id: '__vizta__', name: 'Vizta Baseball League 🔵', sport: 'baseball' }]));
  }, []);

  const pickLeague = async (league) => {
    setSelectedLeague(league);
    setSelectedTeam(null);
    setSchedule([]);
    // Vizta teams live in the generic db under prefix 'vizta', not in fantasyDb
    const t = league.id === '__vizta__'
      ? await db.getTeams('vizta').catch(() => [])
      : await fantasyDb.getTeams(league.id).catch(() => []);
    setTeams(t);
  };

  const pickTeam = async (team) => {
    setSelectedTeam(team);
    setSchedLoading(true);
    const entries = await db.getTeamSchedule(team.id);
    setSchedule(entries);
    setSchedLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setSaving(true);
    const entry = {
      ...form,
      team_id: selectedTeam.id,
      week:    form.week ? Number(form.week) : null,
      is_home: form.is_home === 'true' || form.is_home === true,
    };
    const saved = await db.saveScheduleEntry(entry);
    setSchedule(prev => [...prev, saved]);
    setForm({ week: '', opponent: '', is_home: 'true', game_date: '', result: '', score: '', notes: '' });
    setMsg('✓ Entry added');
    setTimeout(() => setMsg(''), 2500);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await db.deleteScheduleEntry(id);
    setSchedule(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Fantasy Schedule Manager</h2>
      <p style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.85rem', margin:'4px 0 20px' }}>
        Insert schedule entries for any fantasy team. Players see their schedule on the Roster tab.
      </p>

      {/* Step 1: League */}
      <div className="neon-card p-3" style={{ marginBottom:14 }}>
        <label style={{ fontWeight:700, color:'var(--color-cyan)', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>1. Select League</label>
        <select style={{ ...SI, marginTop:8 }} value={selectedLeague?.id || ''} onChange={e => { const l = leagues.find(x=>x.id===e.target.value); if(l) pickLeague(l); }}>
          <option value="">— pick a league —</option>
          {leagues.map(l => <option key={l.id} value={l.id}>{l.name} ({(l.sport||'').toUpperCase()})</option>)}
        </select>
        {leagues.length === 0 && <p style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.8rem', margin:'6px 0 0' }}>No fantasy leagues found yet.</p>}
      </div>

      {/* Step 2: Team */}
      {selectedLeague && (
        <div className="neon-card p-3" style={{ marginBottom:14 }}>
          <label style={{ fontWeight:700, color:'var(--color-cyan)', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>2. Select Team</label>
          <select style={{ ...SI, marginTop:8 }} value={selectedTeam?.id || ''} onChange={e => { const t = teams.find(x=>x.id===e.target.value); if(t) pickTeam(t); }}>
            <option value="">— pick a team —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.team_name} ({t.owner_username})</option>)}
          </select>
        </div>
      )}

      {/* Step 3: Add entry */}
      {selectedTeam && (
        <div className="neon-card p-3" style={{ marginBottom:14 }}>
          <label style={{ fontWeight:700, color:'var(--color-cyan)', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>
            3. Add Entry — {selectedTeam.team_name}
          </label>
          <form onSubmit={handleAdd} style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10 }}>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Week #</label>
              <input type="number" style={SI} value={form.week} min={1} placeholder="1" onChange={e=>setForm({...form,week:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Opponent</label>
              <input type="text" style={SI} value={form.opponent} placeholder="Team name" onChange={e=>setForm({...form,opponent:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Location</label>
              <select style={SI} value={form.is_home} onChange={e=>setForm({...form,is_home:e.target.value})}>
                <option value="true">Home</option>
                <option value="false">Away</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Date</label>
              <input type="date" style={SI} value={form.game_date} onChange={e=>setForm({...form,game_date:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Result</label>
              <select style={SI} value={form.result} onChange={e=>setForm({...form,result:e.target.value})}>
                <option value="">TBD</option>
                <option value="W">Win</option>
                <option value="L">Loss</option>
                <option value="T">Tie</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Score</label>
              <input type="text" style={SI} value={form.score} placeholder="120.5–98.2" onChange={e=>setForm({...form,score:e.target.value})} />
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', gap:10, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Notes (optional)</label>
                <input type="text" style={SI} value={form.notes} placeholder="Playoff game, bye week…" onChange={e=>setForm({...form,notes:e.target.value})} />
              </div>
              <button type="submit" className="neon-button" disabled={saving} style={{ flexShrink:0 }}>
                {saving ? 'Saving…' : '+ Add'}
              </button>
            </div>
          </form>
          {msg && <p style={{ color:'#22c55e', marginTop:8, fontSize:'0.85rem' }}>{msg}</p>}
        </div>
      )}

      {/* Existing entries */}
      {selectedTeam && (
        <div className="neon-card p-3">
          <h3 style={{ color:'var(--color-cyan)', margin:'0 0 12px', fontSize:'0.95rem' }}>
            {selectedTeam.team_name} — {schedule.length} entries
          </h3>
          {schedLoading ? (
            <p style={{ color:'rgba(158,165,196,0.4)', textAlign:'center', padding:'20px 0' }}>Loading…</p>
          ) : schedule.length === 0 ? (
            <p style={{ color:'rgba(158,165,196,0.4)', textAlign:'center', padding:'20px 0' }}>No entries yet.</p>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(94,129,244,0.2)' }}>
                  {['Wk','Opponent','Loc','Date','Score','Result','Notes',''].map(h => (
                    <th key={h} style={{ padding:'5px 8px', textAlign:'left', color:'rgba(158,165,196,0.45)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...schedule].sort((a,b)=>(a.week||999)-(b.week||999)).map(entry => (
                  <tr key={entry.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'7px 8px', fontWeight:700, color:'var(--color-cyan)' }}>{entry.week??'—'}</td>
                    <td style={{ padding:'7px 8px', color:'#e2e5f0' }}>{entry.opponent||'—'}</td>
                    <td style={{ padding:'7px 8px', color: entry.is_home?'var(--color-cyan)':'var(--color-magenta)', fontSize:'0.72rem', fontWeight:700 }}>{entry.is_home?'HOME':'AWAY'}</td>
                    <td style={{ padding:'7px 8px', color:'rgba(158,165,196,0.55)', fontSize:'0.78rem' }}>{entry.game_date||'—'}</td>
                    <td style={{ padding:'7px 8px' }}>{entry.score||'—'}</td>
                    <td style={{ padding:'7px 8px', fontWeight:700, color: entry.result==='W'?'#22c55e':entry.result==='L'?'#ef4444':'#eab308' }}>{entry.result||'TBD'}</td>
                    <td style={{ padding:'7px 8px', color:'rgba(158,165,196,0.45)', fontSize:'0.75rem', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.notes||'—'}</td>
                    <td style={{ padding:'7px 8px' }}>
                      <button className="neon-button" style={{ borderColor:'#ff6b7a', color:'#ff6b7a', fontSize:'0.72rem', padding:'3px 9px' }} onClick={()=>handleDelete(entry.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

/* ── RADIO ADMIN TAB ────────────────────────────────────────── */

const RadioAdminTab = () => {
  const { user } = useAuth();
  const load = () => { try { return JSON.parse(localStorage.getItem('nova_radio_config') || '{}'); } catch { return {}; } };
  const [form, setForm] = useState(load);
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem('nova_radio_config', JSON.stringify({ ...form, addedBy: user?.username }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  function clear() {
    localStorage.removeItem('nova_radio_config');
    setForm({});
  }

  const F = (label, key, placeholder) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>{label}</label>
      <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.88rem', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>📻 Nova Radio Config</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginBottom: 20 }}>
        Paste a Spotify playlist URL, Apple Music URL, or YouTube URL. Users will see it embedded on the Radio page.
      </p>
      {F('Playlist Name', 'name', 'e.g. Nova Vibes')}
      {F('Embed / Music URL', 'embedUrl', 'https://open.spotify.com/playlist/... or YouTube URL')}
      {F('Description (optional)', 'description', 'e.g. 24/7 community playlist')}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="neon-button" onClick={save} style={{ borderColor: saved ? '#43b581' : undefined, color: saved ? '#43b581' : undefined }}>
          {saved ? '✓ Saved!' : 'Save Config'}
        </button>
        <button className="neon-button" onClick={clear} style={{ borderColor: '#ff6b7a', color: '#ff6b7a' }}>Clear Radio</button>
      </div>
      {form.embedUrl && (
        <div style={{ marginTop: 20, padding: 14, background: 'rgba(94,129,244,0.05)', borderRadius: 8, border: '1px solid rgba(94,129,244,0.15)' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', marginBottom: 6 }}>Preview URL:</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-cyan)', wordBreak: 'break-all' }}>{form.embedUrl}</div>
        </div>
      )}
    </div>
  );
};

/* ── SONG OF DAY ADMIN TAB ──────────────────────────────────── */

const SongOfDayTab = () => {
  const { user } = useAuth();
  const [form, setForm]   = useState({ title: '', artist: '', url: '', description: '' });
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('nova_song_history') || '[]'); } catch { return []; } });
  const [msg, setMsg]     = useState(null);

  function post() {
    if (!form.title && !form.url) { setMsg({ ok: false, text: 'Title or URL required.' }); return; }
    const today = new Date().toISOString().slice(0, 10);
    const entry = { ...form, date: today, submittedBy: user?.username, id: Date.now().toString() };
    const updated = [entry, ...history];
    localStorage.setItem('nova_song_history', JSON.stringify(updated));
    localStorage.setItem('nova_song_of_day', JSON.stringify(entry));
    setHistory(updated);
    setForm({ title: '', artist: '', url: '', description: '' });
    setMsg({ ok: true, text: 'Song of the Day set! It will appear on the home page.' });
    setTimeout(() => setMsg(null), 3000);
  }

  function removeSotd() {
    localStorage.removeItem('nova_song_of_day');
    setMsg({ ok: true, text: 'Song of the Day removed from home page.' });
    setTimeout(() => setMsg(null), 2000);
  }

  const F = (label, key, placeholder) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>{label}</label>
      <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.88rem', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>🎶 Song of the Day</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginBottom: 18 }}>
        Pick a song — it shows as a featured card on the home page until you change it.
      </p>
      {F('Song Title', 'title', 'e.g. HUMBLE.')}
      {F('Artist', 'artist', 'e.g. Kendrick Lamar')}
      {F('Spotify / YouTube / Apple Music URL', 'url', 'https://open.spotify.com/track/... or YouTube link')}
      {F('Description (optional)', 'description', 'Why this song?')}
      {msg && <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 7, background: msg.ok ? 'rgba(67,181,129,0.12)' : 'rgba(255,107,122,0.12)', color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="neon-button" onClick={post}>Set as Song of the Day</button>
        <button className="neon-button" onClick={removeSotd} style={{ borderColor: '#ff6b7a', color: '#ff6b7a' }}>Remove</button>
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)', marginBottom: 10 }}>History</div>
          {history.slice(0, 10).map(s => (
            <div key={s.id} style={{ padding: '10px 14px', background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '0.9rem' }}>{s.title} {s.artist ? `— ${s.artist}` : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', marginTop: 2 }}>{s.date} · by @{s.submittedBy}</div>
              </div>
              <button className="neon-button" style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                onClick={() => { localStorage.setItem('nova_song_of_day', JSON.stringify(s)); setMsg({ ok: true, text: 'Restored!' }); setTimeout(() => setMsg(null), 2000); }}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── BEAT BATTLE ADMIN TAB ──────────────────────────────────── */

const BeatBattleAdminTab = () => {
  const { user } = useAuth();
  const load = () => { try { return JSON.parse(localStorage.getItem('nova_beat_battle') || 'null'); } catch { return null; } };
  const [current, setCurrent] = useState(load);
  const [songs, setSongs] = useState([
    { title: '', artist: '', url: '' },
    { title: '', artist: '', url: '' },
  ]);
  const [endsAt, setEndsAt] = useState('');
  const [msg, setMsg] = useState(null);

  function launch() {
    if (!songs[0].title || !songs[1].title) { setMsg({ ok: false, text: 'Both songs need a title.' }); return; }
    const battle = { songs, endsAt, createdBy: user?.username, createdAt: new Date().toISOString() };
    localStorage.setItem('nova_beat_battle', JSON.stringify(battle));
    localStorage.setItem('nova_beat_votes', '{}');
    setCurrent(battle);
    setSongs([{ title: '', artist: '', url: '' }, { title: '', artist: '', url: '' }]);
    setEndsAt('');
    setMsg({ ok: true, text: 'Beat Battle launched! Votes cleared.' });
    setTimeout(() => setMsg(null), 2500);
  }

  function end() {
    localStorage.removeItem('nova_beat_battle');
    localStorage.removeItem('nova_beat_votes');
    setCurrent(null);
    setMsg({ ok: true, text: 'Battle ended and cleared.' });
    setTimeout(() => setMsg(null), 2000);
  }

  const SongForm = ({ idx }) => (
    <div style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.12)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)', marginBottom: 8, fontWeight: 700 }}>Song {idx + 1}</div>
      {['title', 'artist', 'url'].map(k => (
        <input key={k} value={songs[idx][k]} placeholder={k === 'url' ? 'Spotify/YouTube URL (optional)' : k.charAt(0).toUpperCase() + k.slice(1)}
          onChange={e => setSongs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [k]: e.target.value }; return n; })}
          style={{ width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.15)', color: '#e2e5f0', borderRadius: 6, fontSize: '0.85rem', marginBottom: 7, boxSizing: 'border-box' }} />
      ))}
    </div>
  );

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>🎵 Beat Battle Manager</h3>
      {current && (
        <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 700, marginBottom: 6 }}>ACTIVE BATTLE</div>
          {current.songs?.map((s, i) => <div key={i} style={{ color: '#e2e5f0', fontSize: '0.9rem' }}>{i + 1}. {s.title} – {s.artist}</div>)}
          {current.endsAt && <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)', marginTop: 4 }}>Ends: {current.endsAt}</div>}
          <button className="neon-button" style={{ marginTop: 10, borderColor: '#ff6b7a', color: '#ff6b7a', fontSize: '0.8rem' }} onClick={end}>End &amp; Clear Battle</button>
        </div>
      )}
      {msg && <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 7, background: msg.ok ? 'rgba(67,181,129,0.12)' : 'rgba(255,107,122,0.12)', color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}
      <SongForm idx={0} />
      <SongForm idx={1} />
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', display: 'block', marginBottom: 4 }}>Voting Ends (optional)</label>
        <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)}
          style={{ padding: '8px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.88rem' }} />
      </div>
      <button className="neon-button" onClick={launch}>🚀 Launch Beat Battle</button>
    </div>
  );
};

/* ── PROP BETS ADMIN TAB ────────────────────────────────────── */

const PropBetsAdminTab = () => {
  const { user } = useAuth();
  const loadProps = () => { try { return JSON.parse(localStorage.getItem('nova_prop_bets') || '[]'); } catch { return []; } };
  const [props, setProps] = useState(loadProps);
  const [form, setForm] = useState({ question: '', sport: 'nfl', options: 'Yes,No', multiplier: '2', deadline: '' });
  const [msg, setMsg] = useState(null);

  function addProp() {
    if (!form.question) { setMsg({ ok: false, text: 'Question required.' }); return; }
    const options = form.options.split(',').map(s => s.trim()).filter(Boolean);
    if (options.length < 2) { setMsg({ ok: false, text: 'Need at least 2 options.' }); return; }
    const p = { id: Date.now().toString(), question: form.question, sport: form.sport, options, multiplier: parseFloat(form.multiplier) || 2, deadline: form.deadline, status: 'open', createdBy: user?.username };
    const updated = [...props, p];
    localStorage.setItem('nova_prop_bets', JSON.stringify(updated));
    setProps(updated);
    setForm({ question: '', sport: 'nfl', options: 'Yes,No', multiplier: '2', deadline: '' });
    setMsg({ ok: true, text: 'Prop created!' });
    setTimeout(() => setMsg(null), 2000);
  }

  function resolve(id, winnerIdx) {
    const updated = props.map(p => p.id === id ? { ...p, status: 'resolved', winnerIdx } : p);
    localStorage.setItem('nova_prop_bets', JSON.stringify(updated));
    setProps(updated);
  }

  function deleteProp(id) {
    const updated = props.filter(p => p.id !== id);
    localStorage.setItem('nova_prop_bets', JSON.stringify(updated));
    setProps(updated);
  }

  const F = (label, key, el, props2) => (
    <div style={{ marginBottom: 10, flex: 1 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(158,165,196,0.45)', marginBottom: 3 }}>{label}</label>
      {React.createElement(el || 'input', { value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })), style: { width: '100%', padding: '8px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.18)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.85rem', boxSizing: 'border-box' }, ...props2 })}
    </div>
  );

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>🎯 Prop Bets Manager</h3>
      <div style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.12)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        {F('Question', 'question', 'input', { placeholder: 'Will the Chiefs win the Super Bowl?' })}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {F('Sport', 'sport', 'select', { children: ['nfl','nba','mlb','nhl'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>) })}
          {F('Options (comma-separated)', 'options', 'input', { placeholder: 'Yes,No or Team A,Team B' })}
          {F('Payout Multiplier', 'multiplier', 'input', { type: 'number', placeholder: '2' })}
          {F('Deadline (optional)', 'deadline', 'input', { type: 'date' })}
        </div>
        {msg && <div style={{ marginBottom: 10, padding: '7px 12px', borderRadius: 7, background: msg.ok ? 'rgba(67,181,129,0.12)' : 'rgba(255,107,122,0.12)', color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}
        <button className="neon-button" onClick={addProp}>Add Prop</button>
      </div>
      {props.length === 0
        ? <div style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>No props yet.</div>
        : props.map(p => (
          <div key={p.id} style={{ padding: 14, background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.12)', borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#e2e5f0', marginBottom: 4 }}>{p.question}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)', marginBottom: 8 }}>
              {p.sport?.toUpperCase()} · {p.multiplier}× · Status: <span style={{ color: p.status === 'open' ? '#43b581' : '#ffd700' }}>{p.status}</span>
              {p.deadline ? ` · Deadline: ${p.deadline}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {p.status === 'open' && (p.options || []).map((opt, oi) => (
                <button key={oi} className="neon-button" style={{ fontSize: '0.78rem', padding: '4px 10px', borderColor: '#43b581', color: '#43b581' }}
                  onClick={() => resolve(p.id, oi)}>
                  ✓ Win: {opt}
                </button>
              ))}
              {p.status === 'resolved' && <span style={{ color: '#ffd700', fontSize: '0.82rem' }}>Winner: {p.options?.[p.winnerIdx]}</span>}
              <button className="neon-button" style={{ fontSize: '0.78rem', padding: '4px 10px', borderColor: '#ff6b7a', color: '#ff6b7a', marginLeft: 'auto' }}
                onClick={() => deleteProp(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))
      }
    </div>
  );
};

/* ── PLAYOFF POOLS ADMIN TAB ────────────────────────────────── */

const PlayoffPoolsAdminTab = () => {
  const loadPools = () => { try { return JSON.parse(localStorage.getItem('nova_playoff_pools') || '[]'); } catch { return []; } };
  const [pools, setPools]   = useState(loadPools);
  const [view, setView]     = useState('list'); // 'list' | 'create' | 'edit'
  const [form, setForm]     = useState({ name: '', sport: 'nfl', rounds: [] });
  const [msg, setMsg]       = useState(null);

  function save(target) {
    let updated;
    if (target.id && pools.find(p => p.id === target.id)) {
      updated = pools.map(p => p.id === target.id ? target : p);
    } else {
      updated = [...pools, { ...target, id: Date.now().toString() }];
    }
    localStorage.setItem('nova_playoff_pools', JSON.stringify(updated));
    setPools(updated);
    setMsg({ ok: true, text: 'Saved!' });
    setTimeout(() => setMsg(null), 2000);
    setView('list');
  }

  function deletePool(id) {
    const updated = pools.filter(p => p.id !== id);
    localStorage.setItem('nova_playoff_pools', JSON.stringify(updated));
    setPools(updated);
  }

  function toggleLock(pool) {
    save({ ...pool, status: pool.status === 'locked' ? 'open' : 'locked' });
  }

  function startNew() {
    setForm({ name: '', sport: 'nfl', rounds: [{ matchups: [{ teamA: '', teamB: '', result: '' }] }] });
    setView('create');
  }

  function addRound() {
    setForm(f => ({ ...f, rounds: [...f.rounds, { matchups: [{ teamA: '', teamB: '', result: '' }] }] }));
  }

  function addMatchup(ri) {
    setForm(f => {
      const rounds = f.rounds.map((r, i) => i === ri ? { ...r, matchups: [...r.matchups, { teamA: '', teamB: '', result: '' }] } : r);
      return { ...f, rounds };
    });
  }

  function setMatchupField(ri, mi, field, val) {
    setForm(f => {
      const rounds = f.rounds.map((r, i) => i !== ri ? r : {
        ...r,
        matchups: r.matchups.map((m, j) => j !== mi ? m : { ...m, [field]: val })
      });
      return { ...f, rounds };
    });
  }

  // For updating results in existing pool
  const [editPool, setEditPool] = useState(null);

  function setResult(pool, ri, mi, result) {
    const updated = {
      ...pool,
      rounds: pool.rounds.map((r, i) => i !== ri ? r : { ...r, matchups: r.matchups.map((m, j) => j !== mi ? m : { ...m, result }) })
    };
    save(updated);
    setEditPool(updated);
  }

  if (view === 'create') {
    return (
      <div>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', marginBottom: 16 }} onClick={() => setView('list')}>← Back</button>
        <h3 style={{ color: '#e2e5f0', marginBottom: 12 }}>New Playoff Pool</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Pool name (e.g. 2025 NFL Playoffs)"
            style={{ flex: 2, padding: '8px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7 }} />
          <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
            style={{ flex: 1, padding: '8px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7 }}>
            {['nfl','nba','mlb','nhl'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
        {form.rounds.map((round, ri) => (
          <div key={ri} style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(158,165,196,0.5)', marginBottom: 8 }}>ROUND {ri + 1}</div>
            {round.matchups.map((mu, mi) => (
              <div key={mi} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {['teamA', 'teamB'].map(f => (
                  <input key={f} value={mu[f]} onChange={e => setMatchupField(ri, mi, f, e.target.value)} placeholder={f === 'teamA' ? 'Team A' : 'Team B'}
                    style={{ flex: 1, minWidth: 100, padding: '6px 10px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.15)', color: '#e2e5f0', borderRadius: 6, fontSize: '0.85rem' }} />
                ))}
              </div>
            ))}
            <button className="neon-button" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => addMatchup(ri)}>+ Add Matchup</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="neon-button" onClick={addRound}>+ Add Round</button>
          <button className="neon-button" style={{ borderColor: '#43b581', color: '#43b581' }} onClick={() => save(form)}>Create Pool</button>
        </div>
        {msg && <div style={{ marginTop: 10, color: msg.ok ? '#43b581' : '#ff6b7a' }}>{msg.text}</div>}
      </div>
    );
  }

  if (editPool) {
    return (
      <div>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', marginBottom: 16 }} onClick={() => setEditPool(null)}>← Back</button>
        <h3 style={{ color: '#e2e5f0', marginBottom: 4 }}>{editPool.name}</h3>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginBottom: 16 }}>Set results for each matchup. Saves immediately.</p>
        {editPool.rounds?.map((round, ri) => (
          <div key={ri} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>Round {ri + 1}</div>
            {round.matchups?.map((mu, mi) => (
              <div key={mi} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8, padding: '8px 12px', background: 'rgba(94,129,244,0.04)', borderRadius: 7, border: '1px solid rgba(94,129,244,0.1)' }}>
                <span style={{ color: '#e2e5f0', fontSize: '0.88rem', flex: 1 }}>{mu.teamA} vs {mu.teamB}</span>
                {[mu.teamA, mu.teamB].map(team => (
                  <button key={team} className="neon-button"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', borderColor: mu.result === team ? '#43b581' : undefined, color: mu.result === team ? '#43b581' : undefined }}
                    onClick={() => setResult(editPool, ri, mi, team)}>
                    {mu.result === team ? '✓ ' : ''}{team} wins
                  </button>
                ))}
                {mu.result && <button className="neon-button" style={{ fontSize: '0.72rem', padding: '3px 8px', borderColor: '#ff6b7a', color: '#ff6b7a' }} onClick={() => setResult(editPool, ri, mi, '')}>Clear</button>}
              </div>
            ))}
          </div>
        ))}
        {msg && <div style={{ marginTop: 6, color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 12 }}>🏆 Playoff Pools Manager</h3>
      <button className="neon-button" style={{ marginBottom: 18 }} onClick={startNew}>+ Create New Pool</button>
      {msg && <div style={{ marginBottom: 10, color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}
      {pools.length === 0
        ? <div style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem' }}>No pools yet.</div>
        : pools.map(p => (
          <div key={p.id} style={{ padding: 14, background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.12)', borderRadius: 8, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#e2e5f0' }}>{p.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)', marginTop: 2 }}>
                {p.sport?.toUpperCase()} · {p.rounds?.length || 0} rounds · {p.status === 'locked' ? '🔒 Locked' : '🟢 Open'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="neon-button" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => setEditPool(p)}>Set Results</button>
              <button className="neon-button" style={{ fontSize: '0.78rem', padding: '5px 12px', borderColor: p.status === 'locked' ? '#43b581' : '#ffd700', color: p.status === 'locked' ? '#43b581' : '#ffd700' }} onClick={() => toggleLock(p)}>
                {p.status === 'locked' ? 'Unlock' : 'Lock Picks'}
              </button>
              <button className="neon-button" style={{ fontSize: '0.78rem', padding: '5px 12px', borderColor: '#ff6b7a', color: '#ff6b7a' }} onClick={() => deletePool(p.id)}>Del</button>
            </div>
          </div>
        ))
      }
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
      case 'member-pages':      return <MemberPagesTab />;
      case 'user-roles':        return <UserRolesTab />;
      case 'give-coins':        return <GiveCoinsTab />;
      case 'fantasy-manage':    return <FantasyManageTab />;
      case 'fantasy-schedule':  return <FantasyScheduleTab />;
      case 'admin-radio':      return <RadioAdminTab />;
      case 'admin-sotd':       return <SongOfDayTab />;
      case 'admin-beatbattle': return <BeatBattleAdminTab />;
      case 'admin-propbets':   return <PropBetsAdminTab />;
      case 'admin-playoffs':   return <PlayoffPoolsAdminTab />;
      case 'vizta-players':   return <LeaguePlayersTab prefix="vizta" />;
      case 'vizta-teams':     return <LeagueTeamsTab prefix="vizta" />;
      case 'vizta-rosters':   return <LeagueRostersTab prefix="vizta" />;
      case 'vizta-games':     return <LeagueGamesTab prefix="vizta" />;
      case 'vizta-boxscores': return <LeagueBoxScoresTab prefix="vizta" />;
      case 'vizta-feed':      return <LeagueGameFeedTab prefix="vizta" />;
      case 'vizta-hof':       return <LeagueHofTab prefix="vizta" />;
      case 'vizta-awards':    return <LeagueAwardsTab prefix="vizta" />;
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
              <Btn id="member-pages"     label="Member Pages" />
              <Btn id="user-roles"       label="User Roles" />
              <Btn id="give-coins"       label="Give Coins" />
              <Btn id="fantasy-manage"   label="Fantasy Manage" />
              <Btn id="fantasy-schedule" label="Fantasy Schedule" />
              <Btn id="admin-radio"      label="📻 Radio" />
              <Btn id="admin-sotd"       label="🎶 Song of Day" />
              <Btn id="admin-beatbattle" label="🎵 Beat Battle" />
              <Btn id="admin-propbets"   label="🎯 Prop Bets" />
              <Btn id="admin-playoffs"   label="🏆 Playoff Pools" />
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
              <Btn id="vizta-awards"    label="Awards" />
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-content">{renderContent()}</div>
    </div>
  );
};

export default OwnerDashboard;
