import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import db, { sortByDisplayOrder } from '../../services/db';
import fantasyDb from '../../services/fantasyDb';
import { accoladeLabel, accoladeIcon, getAccoladeTypes, setCustomAwardTypes } from '../../data/accolades';
import { BadgeChip, DiscordVerifiedChip } from '../BadgeDisplay';
import { BADGES as ACHIEVEMENT_BADGES } from '../../services/achievementsService';
import { getSport, setCustomStats } from '../../data/sportsConfig';
import { PERFECT_ATHLETE_SPORTS } from '../../data/perfectAthleteData';
import perfectAthleteService from '../../services/perfectAthleteService';
import { addCoins as addCoinsBalance } from '../../services/coinsStorage';
import { generateBeatPost } from '../../services/beatWriterService';
import './OwnerDashboard.css';

const SI = { padding:'10px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.2)', color:'#e2e5f0', borderRadius:'4px', width:'100%' };
const SS = { ...SI };

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

  const removeAllMedia = async (p, kind) => {
    const label = kind === 'audio' ? 'all audio tracks' : 'all backgrounds';
    if (!window.confirm(`Remove ${label} for ${p.username}?`)) return;
    const cleared = { ...p };
    if (kind === 'audio') { cleared.audio_tracks = []; cleared.audio_url = ''; cleared.audio_title = ''; }
    else { cleared.bg_media = []; cleared.bg_media_url = ''; cleared.bg_media_type = ''; }
    await db.saveMemberProfile(cleared);
    setProfiles(prev => prev.map(x => x.username === p.username ? cleared : x));
  };

  const removeOneMedia = async (p, kind, id) => {
    const label = kind === 'audio' ? 'this track' : 'this background';
    if (!window.confirm(`Remove ${label} for ${p.username}?`)) return;
    const cleared = { ...p };
    if (kind === 'audio') cleared.audio_tracks = (p.audio_tracks || []).filter(t => t.id !== id);
    else cleared.bg_media = (p.bg_media || []).filter(b => b.id !== id);
    await db.saveMemberProfile(cleared);
    setProfiles(prev => prev.map(x => x.username === p.username ? cleared : x));
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
        {profiles.map(p => {
          const bgList    = (p.bg_media && p.bg_media.length) ? p.bg_media : (p.bg_media_url ? [{ id: 'legacy', url: p.bg_media_url, type: p.bg_media_type }] : []);
          const audioList = (p.audio_tracks && p.audio_tracks.length) ? p.audio_tracks : (p.audio_url ? [{ id: 'legacy', url: p.audio_url, title: p.audio_title, artist: '' }] : []);
          return (
          <div key={p.username} className="neon-card p-3">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <p style={{ margin:0, color:'var(--color-cyan)', fontWeight:700 }}>{p.username}</p>
                <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.5)' }}>{p.bio||'No bio'}</p>
                <p style={{ margin:'4px 0 0', fontSize:'0.72rem', color:'rgba(158, 165, 196,0.35)' }}>
                  {bgList.length ? `🖼 ${bgList.length} background${bgList.length > 1 ? 's' : ''}` : 'No background'}
                  {' · '}
                  {audioList.length ? `🎵 ${audioList.length} track${audioList.length > 1 ? 's' : ''}` : 'No audio'}
                </p>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
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
            {(bgList.length > 0 || audioList.length > 0) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(94,129,244,0.12)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bgList.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Backgrounds</span>
                      {bgList.length > 1 && (
                        <button className="neon-button" style={{ fontSize: '0.68rem', padding: '2px 8px', borderColor:'#ff8800', color:'#ff8800' }} onClick={() => removeAllMedia(p, 'bg')}>Remove All</button>
                      )}
                    </div>
                    {bgList.map((b, i) => (
                      <div key={b.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: 'rgba(158,165,196,0.55)', padding: '3px 0' }}>
                        <span>{b.type === 'video' ? '🎬' : '🖼️'} Background {i + 1}</span>
                        <button onClick={() => removeOneMedia(p, 'bg', b.id)} style={{ background: 'none', border: 'none', color: '#ff6b7a', cursor: 'pointer', fontSize: '0.72rem' }}>✕ remove</button>
                      </div>
                    ))}
                  </div>
                )}
                {audioList.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Audio Tracks</span>
                      {audioList.length > 1 && (
                        <button className="neon-button" style={{ fontSize: '0.68rem', padding: '2px 8px', borderColor:'#ff8800', color:'#ff8800' }} onClick={() => removeAllMedia(p, 'audio')}>Remove All</button>
                      )}
                    </div>
                    {audioList.map((t, i) => (
                      <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: 'rgba(158,165,196,0.55)', padding: '3px 0' }}>
                        <span>🎵 {t.title || 'Untitled'}{t.artist ? ` — ${t.artist}` : ''}</span>
                        <button onClick={() => removeOneMedia(p, 'audio', t.id)} style={{ background: 'none', border: 'none', color: '#ff6b7a', cursor: 'pointer', fontSize: '0.72rem' }}>✕ remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );})}
      </div>
    </div>
  );
};

const STAT_LEAGUES = [
  { prefix: 'vizta',    name: 'Roblox Baseball' },
  { prefix: 'hockey',   name: 'Roblox Hockey' },
  { prefix: 'football', name: 'Heavenly Football' },
];

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(?=[0-9])/, '_');

const ManageStatsTab = () => {
  const [league, setLeague] = useState('vizta');
  const [stats, setStats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel]   = useState('');
  const [key, setKey]       = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [target, setTarget] = useState('seasonA');
  const [dataType, setDataType] = useState('numeric');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const cfg = getSport(league);

  const loadStats = () => {
    setLoading(true);
    db.getCustomStats(league).then(list => { setStats(list); setLoading(false); });
  };
  useEffect(() => { loadStats(); }, [league]); // eslint-disable-line

  const onLabelChange = (v) => {
    setLabel(v);
    if (!keyEdited) setKey(slugify(v));
  };

  const sqlType = { numeric: 'NUMERIC', integer: 'INTEGER', text: 'TEXT' }[dataType] || 'NUMERIC';
  const alterSql = key ? `ALTER TABLE nova_players ADD COLUMN IF NOT EXISTS "${key}" ${sqlType};` : '';

  const targetLabel = (t) => {
    const map = {
      seasonA: `Season · ${cfg.catA.label}`,
      seasonB: `Season · ${cfg.catB.label}`,
      careerA: `Career · ${cfg.catA.label}`,
      careerB: `Career · ${cfg.catB.label}`,
    };
    return map[t] || t;
  };

  const addStat = async () => {
    setErr(''); setMsg('');
    if (!label.trim()) { setErr('Enter a display label (e.g. "Clutch Hits").'); return; }
    if (!/^[a-z_][a-z0-9_]*$/.test(key)) { setErr('Column name must be lowercase letters, numbers, and underscores only, and can\'t start with a number.'); return; }
    if (stats.some(s => s.stat_key === key)) { setErr('A stat with that column name already exists for this league.'); return; }
    try {
      await db.addCustomStat({ league, target, stat_key: key, label: label.trim(), data_type: dataType });
      const fresh = await db.getCustomStats(league);
      setStats(fresh);
      setCustomStats(league, fresh);
      setLabel(''); setKey(''); setKeyEdited(false);
      setMsg(`"${label}" added. Make sure you've run the ALTER TABLE statement above against Rivestack, or the field will save as empty.`);
    } catch (e) {
      setErr(e.message || 'Failed to save stat.');
    }
  };

  const removeStat = async (s) => {
    if (!window.confirm(`Remove "${s.label}" from ${STAT_LEAGUES.find(l=>l.prefix===league)?.name}? This only hides it from the app — the database column and any data already in it are untouched.`)) return;
    try {
      await db.deleteCustomStat(s.id, league, s.label);
      const fresh = await db.getCustomStats(league);
      setStats(fresh);
      setCustomStats(league, fresh);
    } catch (e) {
      setErr(e.message || 'Failed to remove stat.');
    }
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Manage Stats</h2>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginTop: '4px', maxWidth: '640px' }}>
        Add a brand-new stat the site doesn't track yet, for a specific league. Since stats are real database
        columns (not free-form data), adding one takes two steps: run the generated SQL once against Rivestack,
        then save the stat here so the app knows about it. Removing a stat here only hides it — it never touches
        the database column or its data.
      </p>

      <div style={{ margin: '16px 0' }}>
        <select value={league} onChange={e => setLeague(e.target.value)} style={{ ...SS, width: 'auto' }}>
          {STAT_LEAGUES.map(l => <option key={l.prefix} value={l.prefix}>{l.name}</option>)}
        </select>
      </div>

      <div className="neon-card p-3" style={{ marginBottom: '20px' }}>
        <div className="edit-form" style={{ display: 'grid', gap: '12px' }}>
          <div className="form-field">
            <label>Display Label (shown on player pages/cards)</label>
            <input style={SI} value={label} onChange={e => onLabelChange(e.target.value)} placeholder="e.g. Clutch Hits" maxLength={20} />
          </div>
          <div className="form-field">
            <label>Database Column Name</label>
            <input style={SI} value={key} onChange={e => { setKey(slugify(e.target.value)); setKeyEdited(true); }} placeholder="e.g. clutch_hits" />
          </div>
          <div className="form-field">
            <label>Where It Appears</label>
            <select value={target} onChange={e => setTarget(e.target.value)} style={SS}>
              {['seasonA', 'seasonB', 'careerA', 'careerB'].map(t => <option key={t} value={t}>{targetLabel(t)}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Data Type</label>
            <select value={dataType} onChange={e => setDataType(e.target.value)} style={SS}>
              <option value="numeric">Decimal number (e.g. 2.35)</option>
              <option value="integer">Whole number (e.g. 14)</option>
              <option value="text">Text</option>
            </select>
          </div>
          {alterSql && (
            <div className="form-field">
              <label>1. Run this once in Rivestack</label>
              <div style={{ ...SI, fontFamily: 'monospace', fontSize: '0.8rem', userSelect: 'all', background: 'rgba(0,0,0,0.3)' }}>{alterSql}</div>
            </div>
          )}
          {err && <p style={{ color: '#ff6464', fontSize: '0.85rem' }}>{err}</p>}
          {msg && <p style={{ color: '#5ee6a8', fontSize: '0.85rem' }}>{msg}</p>}
          <button className="neon-button" onClick={addStat}>2. Save Stat</button>
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', color: 'rgba(158,165,196,0.7)' }}>Custom Stats — {STAT_LEAGUES.find(l=>l.prefix===league)?.name}</h3>
      {loading && <p style={{ color: 'rgba(158,165,196,0.5)' }}>Loading…</p>}
      {!loading && stats.length === 0 && <p style={{ color: 'rgba(158,165,196,0.5)' }}>No custom stats added for this league yet.</p>}
      <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
        {stats.map(s => (
          <div key={s.id} className="neon-card p-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{s.label}</span>
              <span style={{ color: 'rgba(158,165,196,0.5)', marginLeft: '8px', fontSize: '0.8rem' }}>{s.stat_key} · {targetLabel(s.target)}</span>
            </div>
            <button className="neon-button" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => removeStat(s)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuditLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLeague, setFilterLeague] = useState('all');

  useEffect(() => {
    db.getAuditLog(300).then(rows => { setLogs(rows); setLoading(false); });
  }, []);

  const leagueLabel = (l) => ({ vizta: 'Roblox Baseball', hockey: 'Roblox Hockey', football: 'Heavenly Football' }[l] || l || '—');
  const actionLabel = (a) => {
    const [entity, verb] = (a || '').split('.');
    const verbMap = { create: 'created', update: 'edited', delete: 'deleted', add: 'added' };
    return `${verbMap[verb] || verb || a} a ${entity || 'record'}`;
  };

  const filtered = filterLeague === 'all' ? logs : logs.filter(l => l.league === filterLeague);

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Audit Log</h2>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginTop: '4px' }}>
        Every player/team/game/HoF add, edit, or delete across all leagues. Visible to owner and co-founder only.
      </p>
      <div style={{ margin: '16px 0' }}>
        <select value={filterLeague} onChange={e => setFilterLeague(e.target.value)} style={{ ...SS, width: 'auto' }}>
          <option value="all">All Leagues</option>
          <option value="vizta">Roblox Baseball</option>
          <option value="hockey">Roblox Hockey</option>
          <option value="football">Heavenly Football</option>
        </select>
      </div>
      {loading && <div className="neon-card p-3"><p style={{ color: 'rgba(158,165,196,0.5)', textAlign: 'center' }}>Loading…</p></div>}
      {!loading && filtered.length === 0 && (
        <div className="neon-card p-3"><p style={{ color: 'rgba(158,165,196,0.5)', textAlign: 'center' }}>
          No log entries yet. (If this stays empty after edits are made, the <code>nova_audit_log</code> table may not exist yet in your database — run <code>supabase/nova_audit_log.sql</code> against it.)
        </p></div>
      )}
      <div style={{ display: 'grid', gap: '8px' }}>
        {filtered.map(l => (
          <div key={l.id} className="neon-card p-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{l.actor}</span>
              <span style={{ color: 'rgba(158,165,196,0.7)' }}> {actionLabel(l.action)}</span>
              {l.entity_name && <span style={{ color: 'rgba(158,165,196,0.5)' }}> — {l.entity_name}</span>}
              <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', marginTop: '2px' }}>{leagueLabel(l.league)}</div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</span>
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
  const roles = ['member','vizta_helper','football_helper','mod','cofounder','owner'];
  const roleLabel = (r) => ({ member:'Member', vizta_helper:'Roblox Baseball Helper', football_helper:'Heavenly Football Stat Helper', mod:'Moderator', cofounder:'Co-Founder', owner:'Owner' }[r] || r);
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
    const next = addCoinsBalance(username, amount);
    db.createNotification(username, {
      type: 'coins',
      title: `💰 You received ${amount} coins`,
      body: 'Awarded by a staff member.',
      link: '#store',
    }).catch(() => {});
    setMsg(`Gave ${amount} coins to ${username}. New total: ${next}`);
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

const BadgesAdminTab = () => {
  const { user } = useAuth();
  const [badgeTypes,  setBadgeTypes]  = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [msg,         setMsg]         = useState('');

  // Create-badge form
  const [name,        setName]        = useState('');
  const [icon,        setIcon]        = useState('🏅');
  const [color,       setColor]       = useState('#5e81f4');
  const [description, setDescription] = useState('');

  // Assign form
  const [assignUsername, setAssignUsername] = useState('');
  const [assignBadgeId,  setAssignBadgeId]  = useState('');
  const [memberBadges,   setMemberBadges]   = useState([]); // assignments for assignUsername

  // Discord verification override — reuses the same member picker above.
  const [memberProfiles,     setMemberProfiles]     = useState([]); // for looking up discord_verified_at
  const [discordBusy,        setDiscordBusy]        = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([db.getBadgeTypes(), db.getUsers(), db.getMemberProfiles()]).then(([badges, u, profiles]) => {
      setBadgeTypes(badges || []);
      setUsers(u || []);
      setMemberProfiles(profiles || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!assignUsername) { setMemberBadges([]); return; }
    db.getMemberBadges(assignUsername).then(setMemberBadges);
  }, [assignUsername]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  // Copies the automatic "earned" achievement badges (Early Adopter, Coin
  // Collector, etc. — from achievementsService.js) into this manageable
  // catalog, so they can be assigned/removed like any admin-created badge.
  // Skips ones that already exist (matched by name) so it's safe to click twice.
  const seedAchievementBadges = () => {
    const existingNames = new Set(badgeTypes.map(b => b.name.toLowerCase()));
    const toAdd = ACHIEVEMENT_BADGES.filter(b => !existingNames.has(b.name.toLowerCase()));
    if (toAdd.length === 0) { flash('Those are already in your badge list.'); return; }
    Promise.all(toAdd.map(b => db.createBadgeType({
      name: b.name, icon: b.emoji, color: b.color, description: b.desc, created_by: user?.username,
    }))).then(() => {
      flash(`Added ${toAdd.length} badge${toAdd.length === 1 ? '' : 's'}.`);
      loadAll();
    }).catch(() => flash('Failed to import badges.'));
  };

  const createBadge = () => {
    if (!name.trim()) { flash('Give the badge a name first.'); return; }
    db.createBadgeType({ name: name.trim(), icon: icon.trim() || '🏅', color, description: description.trim(), created_by: user?.username }).then(() => {
      setName(''); setIcon('🏅'); setColor('#5e81f4'); setDescription('');
      flash('Badge created.');
      loadAll();
    }).catch(() => flash('Failed to create badge.'));
  };

  const removeBadge = (id) => {
    if (!window.confirm('Delete this badge? It will be removed from every member it was assigned to.')) return;
    db.deleteBadgeType(id).then(() => { flash('Badge deleted.'); loadAll(); if (assignUsername) db.getMemberBadges(assignUsername).then(setMemberBadges); });
  };

  const assign = () => {
    if (!assignUsername || !assignBadgeId) { flash('Pick a member and a badge first.'); return; }
    db.assignBadge(assignUsername, assignBadgeId, user?.username).then(() => {
      flash('Badge assigned.');
      db.getMemberBadges(assignUsername).then(setMemberBadges);
    }).catch(() => flash('Failed to assign badge.'));
  };

  const unassign = (badgeId) => {
    db.unassignBadge(assignUsername, badgeId).then(() => {
      setMemberBadges(prev => prev.filter(a => String(a.badge_id) !== String(badgeId)));
    });
  };

  const assignedProfile = memberProfiles.find(p => p.username === assignUsername);

  const markDiscordVerified = () => {
    if (!assignUsername) { flash('Pick a member first.'); return; }
    setDiscordBusy(true);
    db.setDiscordVerified(assignUsername).then(() => {
      setMemberProfiles(prev => prev.map(p => p.username === assignUsername ? { ...p, discord_verified_at: new Date().toISOString() } : p));
      flash('Marked as verified in Discord.');
    }).catch(() => flash('Failed to update.')).finally(() => setDiscordBusy(false));
  };

  const clearDiscordVerified = () => {
    if (!assignUsername) return;
    setDiscordBusy(true);
    db.clearDiscordVerified(assignUsername).then(() => {
      setMemberProfiles(prev => prev.map(p => p.username === assignUsername ? { ...p, discord_verified_at: null } : p));
      flash('Removed Discord verification.');
    }).catch(() => flash('Failed to update.')).finally(() => setDiscordBusy(false));
  };

  const badgeById = (id) => badgeTypes.find(b => String(b.id) === String(id));

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Badges</h2>
      <p style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.85rem', marginTop:'-6px', marginBottom:'20px' }}>
        Create badges, assign them to members, and remove ones you no longer want. Members choose which of their
        assigned badges show up next to their name from their own profile editor.
      </p>
      {msg && <p style={{ color:'var(--color-cyan)', marginBottom:'14px', fontSize:'0.88rem' }}>{msg}</p>}

      {/* Create badge */}
      <div className="neon-card p-3" style={{ marginBottom:'24px' }}>
        <h4 className="gradient-text-cyan" style={{ marginTop:0 }}>Create a Badge</h4>
        <div className="edit-form" style={{ display:'grid', gap:'10px', maxWidth:'480px' }}>
          <div className="form-field">
            <label>Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Verified" style={SS} />
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <div className="form-field" style={{ flex:1 }}>
              <label>Icon (emoji)</label>
              <input type="text" value={icon} onChange={e=>setIcon(e.target.value)} placeholder="🏅" style={SS} />
            </div>
            <div className="form-field" style={{ flex:1 }}>
              <label>Color</label>
              <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ ...SS, padding:'4px', height:'42px' }} />
            </div>
          </div>
          <div className="form-field">
            <label>Description (shown on hover)</label>
            <input type="text" value={description} onChange={e=>setDescription(e.target.value)} placeholder="What this badge means…" style={SS} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.8rem' }}>Preview:</span>
            <BadgeChip badge={{ name: name || 'Badge Name', icon, color, description }} size={20} />
          </div>
          <button className="neon-button" onClick={createBadge}>Create Badge</button>
        </div>
      </div>

      {/* Existing badges */}
      <div className="neon-card p-3" style={{ marginBottom:'24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
          <h4 className="gradient-text-cyan" style={{ marginTop:0, marginBottom:0 }}>Existing Badges</h4>
          <button className="neon-button" onClick={seedAchievementBadges} style={{ fontSize:'0.78rem', padding:'8px 14px' }}>
            Import Achievement Badges
          </button>
        </div>
        <p style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.78rem', margin:'8px 0 14px' }}>
          Adds the 14 auto-earned badges (Early Adopter, Coin Collector, Veteran, etc.) to this list so you can
          assign or delete them manually too. They stay separate from members' automatic progress on the earned/locked list.
        </p>
        {loading ? (
          <p style={{ color:'rgba(158,165,196,0.5)' }}>Loading…</p>
        ) : badgeTypes.length === 0 ? (
          <p style={{ color:'rgba(158,165,196,0.5)' }}>No badges created yet.</p>
        ) : (
          <div style={{ display:'grid', gap:'10px' }}>
            {badgeTypes.map(b => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', padding:'10px 14px', background:'rgba(94,129,244,0.05)', border:'1px solid rgba(94,129,244,0.15)', borderRadius:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <BadgeChip badge={b} size={20} />
                  <div>
                    <div style={{ color:'#e2e5f0', fontWeight:700 }}>{b.name}</div>
                    {b.description && <div style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.78rem' }}>{b.description}</div>}
                  </div>
                </div>
                <button className="neon-button" onClick={() => removeBadge(b.id)} style={{ fontSize:'0.78rem', padding:'6px 12px' }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign to member */}
      <div className="neon-card p-3">
        <h4 className="gradient-text-cyan" style={{ marginTop:0 }}>Assign to a Member</h4>
        <div className="edit-form" style={{ display:'grid', gap:'10px', maxWidth:'480px', marginBottom:'16px' }}>
          <div className="form-field">
            <label>Member</label>
            <select value={assignUsername} onChange={e=>setAssignUsername(e.target.value)} style={SS}>
              <option value="">Choose member…</option>
              {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <select value={assignBadgeId} onChange={e=>setAssignBadgeId(e.target.value)} style={{ ...SS, flex:1 }}>
              <option value="">Choose badge…</option>
              {badgeTypes.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
            <button className="neon-button" onClick={assign}>Assign</button>
          </div>
        </div>

        {assignUsername && (
          <>
            <div style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.8rem', marginBottom:'8px' }}>
              {assignUsername}'s badges:
            </div>
            {memberBadges.length === 0 ? (
              <p style={{ color:'rgba(158,165,196,0.35)', fontSize:'0.82rem' }}>No badges assigned yet.</p>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                {memberBadges.map(a => {
                  const b = badgeById(a.badge_id);
                  if (!b) return null;
                  return (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', background:'rgba(94,129,244,0.05)', border:'1px solid rgba(94,129,244,0.15)', borderRadius:20 }}>
                      <BadgeChip badge={b} size={16} />
                      <span style={{ color:'#e2e5f0', fontSize:'0.82rem' }}>{b.name}</span>
                      <button onClick={() => unassign(a.badge_id)} style={{ background:'none', border:'none', color:'rgba(255,107,122,0.8)', cursor:'pointer', fontSize:'0.9rem', lineHeight:1 }} title="Remove badge">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Discord verification override */}
      <div className="neon-card p-3" style={{ marginTop: '24px' }}>
        <h4 className="gradient-text-cyan" style={{ marginTop: 0 }}>Discord Verification</h4>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.8rem', margin: '0 0 14px' }}>
          The "💬 In Discord" flair is normally auto-detected by matching a member's Discord Tag against who's
          online in the server — which can miss members who weren't online when the check ran. Use this to
          mark or remove it by hand for whoever's picked in the member dropdown above.
        </p>
        {!assignUsername ? (
          <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.82rem' }}>Pick a member above to manage this.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.8rem' }}>{assignUsername}:</span>
            {assignedProfile?.discord_verified_at
              ? <DiscordVerifiedChip verifiedAt={assignedProfile.discord_verified_at} size="lg" />
              : <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.82rem' }}>Not verified</span>}
            {assignedProfile?.discord_verified_at ? (
              <button className="neon-button" disabled={discordBusy} onClick={clearDiscordVerified} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                Remove Verification
              </button>
            ) : (
              <button className="neon-button" disabled={discordBusy} onClick={markDiscordVerified} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                Mark Verified
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── BUILD THE PERFECT ATHLETE: RATINGS EDITOR (owner/co-owner only) ── */

const PerfectAthleteRatingsTab = () => {
  const [sportKey, setSportKey] = useState(PERFECT_ATHLETE_SPORTS[0].key);
  const [, forceRerender] = useState(0);
  const [msg, setMsg] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const sport = PERFECT_ATHLETE_SPORTS.find((s) => s.key === sportKey);
  const players = perfectAthleteService.getPlayers(sportKey);
  const overridesForSport = perfectAthleteService.getOverrides()[sportKey] || {};
  const hasAnyOverrides = Object.keys(overridesForSport).length > 0;

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const updateAttribute = (playerId, attrId, rawValue) => {
    if (rawValue === '') return;
    perfectAthleteService.setPlayerAttribute(sportKey, playerId, attrId, rawValue);
    forceRerender((n) => n + 1);
  };

  const resetPlayer = (playerId) => {
    perfectAthleteService.resetPlayer(sportKey, playerId);
    forceRerender((n) => n + 1);
    flash('Player reset to default ratings.');
  };

  const resetSport = () => {
    if (!window.confirm(`Reset every ${sport.unit} player back to default ratings? This clears all tweaks for this sport.`)) return;
    perfectAthleteService.resetSport(sportKey);
    forceRerender((n) => n + 1);
    flash(`${sport.unit} ratings reset to default.`);
  };

  return (
    <div className="tab-content">
      <div className="content-header">
        <h2>🐐 Build the Perfect Athlete — Ratings</h2>
        <span style={{ color:'rgba(158,165,196,0.6)', fontSize:'0.82rem' }}>Owners &amp; co-owners can nudge any pro's attribute rating here.</span>
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
        {PERFECT_ATHLETE_SPORTS.map((s) => (
          <button
            key={s.key}
            className={`neon-button ${s.key === sportKey ? 'active' : ''}`}
            style={{ opacity: s.key === sportKey ? 1 : 0.55 }}
            onClick={() => setSportKey(s.key)}
          >
            {s.emoji} {s.unit}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <span style={{ color:'rgba(158,165,196,0.6)', fontSize:'0.8rem' }}>
          {players.length} players • {hasAnyOverrides ? `${Object.keys(overridesForSport).length} with tweaked ratings` : 'all on default ratings'}
        </span>
        {hasAnyOverrides && <button className="neon-button" onClick={resetSport} style={{ fontSize:'0.78rem' }}>Reset all {sport.unit} tweaks</button>}
      </div>

      {msg && <div style={{ padding:'10px', marginBottom:'12px', background:'rgba(94,230,168,0.1)', border:'1px solid rgba(94,230,168,0.3)', color:'#5ee6a8', borderRadius:'6px', fontSize:'0.82rem' }}>{msg}</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {players.map((p) => {
          const isTweaked = !!overridesForSport[p.id];
          const isOpen = expandedId === p.id;
          return (
            <div key={p.id} style={{ border:'1px solid rgba(94,129,244,0.15)', borderRadius:'8px', background:'rgba(94,129,244,0.03)' }}>
              <div
                onClick={() => setExpandedId(isOpen ? null : p.id)}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', cursor:'pointer' }}
              >
                <div>
                  <strong style={{ color:'#e2e5f0' }}>{p.name}</strong>
                  <span style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.78rem', marginLeft:'10px' }}>{p.team}</span>
                  {isTweaked && <span className="badge badge-active" style={{ marginLeft:'10px' }}>Edited</span>}
                </div>
                <span style={{ color:'rgba(158,165,196,0.5)' }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ padding:'0 14px 14px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'12px' }}>
                  {sport.attributes.map((attr) => (
                    <div key={attr.id} className="form-field">
                      <label>{attr.label}</label>
                      <input
                        type="number"
                        min={40}
                        max={99}
                        defaultValue={p.ratings[attr.id]}
                        key={`${p.id}-${attr.id}-${p.ratings[attr.id]}`}
                        onBlur={(e) => updateAttribute(p.id, attr.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </div>
                  ))}
                  <div style={{ display:'flex', alignItems:'flex-end' }}>
                    <button className="neon-button" onClick={() => resetPlayer(p.id)} disabled={!isTweaked} style={{ fontSize:'0.78rem', opacity: isTweaked ? 1 : 0.4 }}>
                      Reset player
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── ROBLOX BASEBALL TABS ──────────────────────────────────── */

const currentMonthLabel = () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

const LeaguePlayersTab = ({ prefix }) => {
  const { user } = useAuth();
  const cfg = getSport(prefix);
  const label = cfg.label;
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
  const [statTab, setStatTab] = useState({ period:'season', type:cfg.catA.id });
  useEffect(() => { setStatTab({ period:'season', type:cfg.catA.id }); }, [cfg]);
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
            {[cfg.catA, cfg.catB].map(c => (
              <button key={c.id} type="button" onClick={()=>setStatTab(prev=>({...prev,type:c.id}))}
                style={{ padding:'5px 14px', background:statTab.type===c.id?'rgba(255, 158, 87,0.15)':'rgba(94, 129, 244,0.05)', border:`1px solid ${statTab.type===c.id?'var(--color-magenta)':'rgba(94, 129, 244,0.15)'}`, color:statTab.type===c.id?'var(--color-magenta)':'rgba(158, 165, 196,0.5)', borderRadius:'4px', cursor:'pointer', fontWeight:600, fontSize:'0.8rem' }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:'8px' }}>
            {(statTab.period==='season'?(statTab.type===cfg.catA.id?cfg.seasonA:cfg.seasonB):(statTab.type===cfg.catA.id?cfg.careerA:cfg.careerB)).map(([f,l]) => (
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
  const label = getSport(prefix).label;
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
  const label = getSport(prefix).label;
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
  const label = getSport(prefix).label;
  const [games, setGames]   = useState([]);
  const [teams, setTeams]   = useState([]);
  const [newGame, setNewGame] = useState({ home_team:'', away_team:'', game_date:'', home_score:0, away_score:0, week:'' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { db.getGames(prefix).then(d=>{setGames(d);setLoading(false);}); db.getTeams(prefix).then(setTeams); }, [prefix]);

  const addGame = async () => {
    if (!newGame.home_team||!newGame.away_team||newGame.home_team===newGame.away_team) return;
    const ht=teams.find(t=>t.team_name===newGame.home_team), at=teams.find(t=>t.team_name===newGame.away_team);
    const saved = await db.saveGame(prefix, { ...newGame, week: newGame.week===''?null:parseInt(newGame.week), status:'scheduled', home_team_logo:ht?.logo_url||'', away_team_logo:at?.logo_url||'', home_team_color:ht?.team_color||'#5e81f4', away_team_color:at?.team_color||'#5e81f4' });
    setGames(prev=>[saved,...prev]); setNewGame({ home_team:'', away_team:'', game_date:'', home_score:0, away_score:0, week:'' });
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
          <div className="form-field"><label>Week (for Power Rankings)</label><input type="number" min="1" value={newGame.week} onChange={e=>setNewGame({...newGame,week:e.target.value})} placeholder="e.g. 3" style={SI} /></div>
          <button className="neon-button" onClick={addGame}>Schedule Game</button>
        </div>
      </div>
      {editing && (
        <div className="neon-card p-3" style={{ marginBottom:'30px' }}>
          <h3 className="gradient-text-magenta">Edit Game</h3>
          <div className="edit-form">
            <div className="form-field"><label>Home Score</label><input type="number" value={editForm.home_score??0} onChange={e=>setEditForm({...editForm,home_score:+e.target.value})} style={SI} /></div>
            <div className="form-field"><label>Away Score</label><input type="number" value={editForm.away_score??0} onChange={e=>setEditForm({...editForm,away_score:+e.target.value})} style={SI} /></div>
            <div className="form-field"><label>Week (for Power Rankings)</label><input type="number" min="1" value={editForm.week??''} onChange={e=>setEditForm({...editForm,week:e.target.value===''?null:+e.target.value})} placeholder="e.g. 3" style={SI} /></div>
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
              <span style={{ marginTop:'6px', marginLeft:'8px', display:'inline-block', fontSize:'0.72rem', fontWeight:700, color: game.week ? 'var(--color-cyan)' : 'rgba(158,165,196,0.35)' }}>{game.week ? `Week ${game.week}` : 'No week set'}</span>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="neon-button" style={{ padding:'6px 14px' }} onClick={()=>{ setEditing(game.id); setEditForm({ home_score:game.home_score||0, away_score:game.away_score||0, status:game.status||'scheduled', week:game.week??'' }); }}>Edit</button>
              <button className="neon-button" style={{ padding:'6px 14px', borderColor:'#ff6b7a', color:'#ff6b7a' }} onClick={()=>del(game.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LeagueBeatWireTab = ({ prefix }) => {
  const label = getSport(prefix).label;
  const [games, setGames]     = useState([]);
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([db.getGames(prefix), db.getBeatPosts(prefix, 100)])
      .then(([g, p]) => { setGames(g); setPosts(p); setLoading(false); });
  };
  useEffect(load, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  const postByGameId = new Map(posts.map(p => [String(p.game_id), p]));
  const finalGamesWithoutPost = games.filter(g => g.status === 'final' && !postByGameId.has(String(g.id)));

  const generateFor = async (game) => {
    const post = generateBeatPost({ league: prefix, game });
    if (!post) return;
    const saved = await db.addBeatPost(prefix, {
      ...post, game_id: game.id, home_team: game.home_team, away_team: game.away_team,
      home_score: game.home_score, away_score: game.away_score,
    });
    setPosts(prev => [saved, ...prev]);
  };

  const regenerate = async (post) => {
    const game = games.find(g => String(g.id) === String(post.game_id)) || post;
    await db.deleteBeatPost(prefix, post.id);
    await generateFor(game);
  };

  const remove = async (post) => {
    await db.deleteBeatPost(prefix, post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Beat Wire</h2>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginTop: '4px', maxWidth: '640px' }}>
        Recaps are generated automatically the moment a game under Games is saved with Status set to
        Final — nothing to do here in the normal case. Use this tab to backfill a recap for an older Final
        game, regenerate one with fresh wording, or take a bad one down. "🔥 Blowout" and "😱 Nail-biter"
        recaps also auto-post live to Discord; routine "📋 Final" recaps stay in-app only.
      </p>

      {!loading && finalGamesWithoutPost.length > 0 && (
        <div className="neon-card p-3" style={{ margin: '16px 0' }}>
          <h3 style={{ fontSize: '1rem', color: 'rgba(158,165,196,0.7)', marginTop: 0 }}>
            Final games without a recap
          </h3>
          <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
            {finalGamesWithoutPost.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: 'rgba(158,165,196,0.85)', fontSize: '0.85rem' }}>
                  {g.home_team} <strong style={{ color: 'var(--color-cyan)' }}>{g.home_score}</strong> - <strong style={{ color: 'var(--color-cyan)' }}>{g.away_score}</strong> {g.away_team}
                </span>
                <button className="neon-button" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => generateFor(g)}>📰 Generate Recap</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '1rem', color: 'rgba(158,165,196,0.7)' }}>Posted Recaps</h3>
      {loading && <p style={{ color: 'rgba(158,165,196,0.5)' }}>Loading…</p>}
      {!loading && posts.length === 0 && <p style={{ color: 'rgba(158,165,196,0.5)' }}>No recaps yet.</p>}
      <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
        {posts.map(p => (
          <div key={p.id} className="neon-card p-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{p.headline}</span>
                {p.tag && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'rgba(158,165,196,0.6)' }}>{p.tag}</span>}
                <p style={{ margin: '6px 0 0', color: 'rgba(158,165,196,0.85)', fontSize: '0.85rem' }}>{p.body}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button className="neon-button" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={() => regenerate(p)}>🔄 Regenerate</button>
                <button className="neon-button" style={{ fontSize: '0.78rem', padding: '5px 10px', borderColor: '#ff6b7a', color: '#ff6b7a' }} onClick={() => remove(p)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeagueBoxScoresTab = ({ prefix }) => {
  const cfg = getSport(prefix);
  const label = cfg.label;
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

  const statFields = cfg.boxFields;
  const statLabels = cfg.boxLabels;

  const createGame = async () => {
    if (!newGame.game_name) return;
    const saved = await db.saveBsGame(prefix, newGame);
    setBsGames(prev=>[saved,...prev]); setNewGame({ game_name:'', home_team:'', away_team:'', home_score:0, away_score:0, game_date:'' }); setShowCreate(false);
  };
  const deleteGame = async (id) => { await db.deleteBsGame(prefix, id); setBsGames(prev=>prev.filter(g=>g.id!==id)); setBoxScores(prev=>prev.filter(b=>b.game_id!==id)); };
  const addPlayerScore = async (playerId) => {
    const player = players.find(p=>p.id===playerId);
    const blankStats = {}; statFields.forEach(f => { blankStats[f] = 0; });
    const newScore = { game_id:selectedGame.id, player_id:playerId, team:player?.team||'', ...blankStats };
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
              <thead><tr>{['Player','Team',...statFields.map(f=>statLabels[f]),''].map((h,hi)=><th key={hi} style={{ padding:'8px', color:'rgba(158, 165, 196,0.6)', textAlign:'center', borderBottom:'1px solid rgba(94, 129, 244,0.1)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {gameScores.map(score => {
                  const player = players.find(p=>String(p.id)===String(score.player_id));
                  return (
                    <tr key={score.id} style={{ borderBottom:'1px solid rgba(94, 129, 244,0.05)' }}>
                      <td style={{ padding:'8px', color:'var(--color-cyan)' }}>{player?.player_name||'?'}</td>
                      <td style={{ padding:'8px', textAlign:'center', color:'rgba(158, 165, 196,0.6)' }}>{score.team||'--'}</td>
                      {statFields.map((f,i)=>(
                        <td key={i} style={{ padding:'8px', textAlign:'center', color:'rgba(158, 165, 196,0.85)' }}>{score[f]||0}</td>
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

const LeagueHofTab = ({ prefix }) => {
  const label = getSport(prefix).label;
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

const awardCatSlugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(?=[0-9])/, '_');

const LeagueAwardsTab = ({ prefix }) => {
  const { user } = useAuth();
  const label = getSport(prefix).label;
  const [awardCategories, setAwardCategories] = useState([]);
  const accoladeTypes = getAccoladeTypes(prefix);
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [potmAwards, setPotmAwards] = useState([]);
  const [accolades, setAccolades] = useState([]);
  const [monthLabel, setMonthLabel] = useState(currentMonthLabel());
  const [potmNote, setPotmNote] = useState('');
  const [accType, setAccType] = useState(accoladeTypes[0].key);
  const [accSeason, setAccSeason] = useState('S1');
  const [accCustomLabel, setAccCustomLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎖️');
  const [catErr, setCatErr] = useState('');

  useEffect(() => { setAccType(accoladeTypes[0].key); }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { db.getPlayers(prefix).then(d => { setPlayers(d); setLoading(false); }); }, [prefix]);

  const loadAwardCategories = () => {
    db.getCustomAwardTypes(prefix).then(list => {
      setAwardCategories(list);
      setCustomAwardTypes(prefix, list);
    });
  };
  useEffect(() => { loadAwardCategories(); }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  const addAwardCategory = async () => {
    setCatErr('');
    const key = `custom_${awardCatSlugify(newCatLabel)}`;
    if (!newCatLabel.trim()) { setCatErr('Enter a name for the award (e.g. "Hustle Award").'); return; }
    if (accoladeTypes.some(t => t.key === key)) { setCatErr('An award with that name already exists for this league.'); return; }
    try {
      await db.addCustomAwardType({ league: prefix, key, label: newCatLabel.trim(), icon: newCatIcon.trim() || '🎖️' });
      loadAwardCategories();
      setNewCatLabel(''); setNewCatIcon('🎖️');
    } catch (e) {
      setCatErr(e.message || 'Failed to save award category.');
    }
  };

  const removeAwardCategory = async (cat) => {
    if (!window.confirm(`Remove "${cat.label}" from ${label}'s award list? Accolades already given using this category will keep showing correctly, but it won't be selectable for new ones.`)) return;
    try {
      await db.deleteCustomAwardType(cat.id, prefix, cat.label);
      loadAwardCategories();
    } catch (e) {
      setCatErr(e.message || 'Failed to remove award category.');
    }
  };

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

  /* Reordering assigns a fresh sequential sort_index to every award based
     on the new order (not just the two that moved), so the trophy case
     always has an unambiguous, fully-specified order once staff have
     touched it at all. */
  const movePotm = async (id, direction) => {
    const sorted = sortByDisplayOrder(potmAwards);
    const idx = sorted.findIndex(a => a.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setPotmAwards(reordered.map((a, i) => ({ ...a, sort_index: i })));
    await Promise.all(reordered.map((a, i) => db.reorderPotmAward(prefix, a.id, i)));
  };

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

  const moveAccolade = async (id, direction) => {
    const sorted = sortByDisplayOrder(accolades);
    const idx = sorted.findIndex(a => a.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setAccolades(reordered.map((a, i) => ({ ...a, sort_index: i })));
    await Promise.all(reordered.map((a, i) => db.reorderAccolade(prefix, a.id, i)));
  };

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} Awards & Accolades</h2>
      <p style={{ color:'rgba(158, 165, 196,0.6)', marginTop:'6px', marginBottom:'20px', fontSize:'0.88rem' }}>
        Award Player of the Month and season accolades (Gold Glove, Silver Slugger, MVP, All-Star, etc.) — these show up permanently as a trophy card and tags on the player's stat page.
      </p>

      <div className="neon-card p-3" style={{ marginBottom:'24px' }}>
        <h3 style={{ color:'rgba(158,165,196,0.9)', marginBottom:'6px', fontSize:'0.95rem' }}>🏅 Custom Award Categories</h3>
        <p style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.82rem', marginTop:0, marginBottom:'14px', maxWidth:'640px' }}>
          Define your own end-of-season award for {label} — beyond MVP, Rookie of the Year, and the built-in sport
          awards. Once saved, it appears as a normal option in the "Award" dropdown below for any player.
        </p>
        <div className="od-2col-grid">
          <div className="form-field">
            <label>Award Name</label>
            <input style={SI} value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="e.g. Hustle Award" maxLength={30} />
          </div>
          <div className="form-field">
            <label>Icon (optional emoji)</label>
            <input style={SI} value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} placeholder="🎖️" maxLength={4} />
          </div>
        </div>
        {catErr && <p style={{ color:'#ff6464', fontSize:'0.85rem', marginTop:'8px' }}>{catErr}</p>}
        <button className="neon-button" style={{ marginTop:'10px' }} onClick={addAwardCategory}>Add Award Category</button>
        {awardCategories.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'16px' }}>
            {awardCategories.map(cat => (
              <span key={cat.id} style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 10px', background:'rgba(94, 129, 244,0.08)', border:'1px solid rgba(94, 129, 244,0.25)', borderRadius:'20px', fontSize:'0.85rem', color:'#e2e5f0' }}>
                {cat.icon} {cat.label}
                <button onClick={() => removeAwardCategory(cat)} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer', fontSize:'0.8rem', padding:0 }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

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
              {sortByDisplayOrder(potmAwards).map((a, i, arr) => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.25)', borderRadius:'6px' }}>
                  <div>
                    <span style={{ color:'#ffd700', fontWeight:700 }}>{a.month_label}</span>
                    {a.note && <span style={{ marginLeft:'10px', fontSize:'0.8rem', color:'rgba(158, 165, 196,0.6)' }}>{a.note}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <button
                      onClick={() => movePotm(a.id, -1)}
                      disabled={i === 0}
                      aria-label="Move up in trophy case"
                      title="Move up"
                      style={{ background:'none', border:'none', color: i === 0 ? 'rgba(255,215,0,0.25)' : '#ffd700', cursor: i === 0 ? 'default' : 'pointer', fontSize:'0.95rem', padding:'2px 6px' }}
                    >▲</button>
                    <button
                      onClick={() => movePotm(a.id, 1)}
                      disabled={i === arr.length - 1}
                      aria-label="Move down in trophy case"
                      title="Move down"
                      style={{ background:'none', border:'none', color: i === arr.length - 1 ? 'rgba(255,215,0,0.25)' : '#ffd700', cursor: i === arr.length - 1 ? 'default' : 'pointer', fontSize:'0.95rem', padding:'2px 6px' }}
                    >▼</button>
                    <button onClick={() => removePotm(a.id)} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer', marginLeft:'6px' }}>Remove</button>
                  </div>
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
                  {accoladeTypes.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
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
              {sortByDisplayOrder(accolades).map((a, i, arr) => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'rgba(94, 129, 244,0.05)', border:'1px solid rgba(94, 129, 244,0.15)', borderRadius:'6px' }}>
                  <span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{accoladeIcon(a)} {accoladeLabel(a)}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <button
                      onClick={() => moveAccolade(a.id, -1)}
                      disabled={i === 0}
                      aria-label="Move up in trophy case"
                      title="Move up"
                      style={{ background:'none', border:'none', color: i === 0 ? 'rgba(94,129,244,0.25)' : 'var(--color-cyan)', cursor: i === 0 ? 'default' : 'pointer', fontSize:'0.95rem', padding:'2px 6px' }}
                    >▲</button>
                    <button
                      onClick={() => moveAccolade(a.id, 1)}
                      disabled={i === arr.length - 1}
                      aria-label="Move down in trophy case"
                      title="Move down"
                      style={{ background:'none', border:'none', color: i === arr.length - 1 ? 'rgba(94,129,244,0.25)' : 'var(--color-cyan)', cursor: i === arr.length - 1 ? 'default' : 'pointer', fontSize:'0.95rem', padding:'2px 6px' }}
                    >▼</button>
                    <button onClick={() => removeAccolade(a.id)} style={{ background:'none', border:'none', color:'#ff6b7a', cursor:'pointer', marginLeft:'6px' }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── ALL-STAR VOTE ADMIN TAB ───────────────────────────────────
   Mid-season fan/member All-Star voting — separate from the
   end-of-season Awards tab above. One round is "live" per league at a
   time; commissioners open/close/finalize it here and can grant the
   category leaders an All-Star accolade with one click once finalized. */
const AllStarAdminTab = ({ prefix }) => {
  const { user } = useAuth();
  const cfg = getSport(prefix);
  const label = cfg.label;
  const categories = [cfg.catA, cfg.catB];
  const [players, setPlayers] = useState([]);
  const [ballot, setBallot] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundLabel, setRoundLabel] = useState(`${new Date().getFullYear()} Midseason All-Star Vote`);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [granted, setGranted] = useState({});

  const loadBallot = () => {
    db.getAllStarBallot(prefix).then(b => {
      setBallot(b);
      setLoading(false);
      if (b) db.getAllStarVotes(prefix, b.id).then(setVotes);
      else setVotes([]);
    });
  };
  useEffect(() => { db.getPlayers(prefix).then(setPlayers); }, [prefix]);
  useEffect(() => { setLoading(true); setMsg(''); setErr(''); setGranted({}); loadBallot(); }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRound = async () => {
    setErr(''); setMsg('');
    if (!roundLabel.trim()) { setErr('Give this round a name (e.g. "2026 Midseason All-Star Vote").'); return; }
    await db.startAllStarVote(prefix, roundLabel.trim(), user?.username);
    setMsg('New All-Star round is open for voting.');
    loadBallot();
  };
  const closeRound = async () => {
    await db.closeAllStarVote(ballot.id, prefix);
    setMsg('Voting closed. You can now finalize and publish the results.');
    loadBallot();
  };
  const finalizeRound = async () => {
    await db.finalizeAllStarVote(ballot.id, prefix);
    setMsg('Results finalized and published to the site.');
    loadBallot();
  };

  const tallyFor = (category) => {
    const counts = new Map();
    votes.filter(v => v.category === category).forEach(v => {
      const key = String(v.player_id);
      const entry = counts.get(key) || { player_id: v.player_id, player_name: v.player_name, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  const grantAllStar = async (row) => {
    if (!ballot) return;
    const player = players.find(p => String(p.id) === String(row.player_id));
    await db.addAccolade(prefix, {
      player_id: row.player_id,
      player_name: player?.player_name || row.player_name,
      type: 'all_star',
      season: ballot.round_label,
      awarded_by: user?.username || 'admin',
    });
    setGranted(prev => ({ ...prev, [row.player_id]: true }));
  };

  const statusColor = { open: '#5ee6a8', closed: '#ffd700', final: '#5e81f4' }[ballot?.status] || 'rgba(158,165,196,0.5)';
  const totalVotes = votes.length;

  if (loading) return <div className="tab-content"><p style={{ color:'rgba(158,165,196,0.5)' }}>Loading…</p></div>;

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">{label} All-Star Vote</h2>
      <p style={{ color:'rgba(158,165,196,0.6)', marginTop:'6px', marginBottom:'20px', fontSize:'0.88rem', maxWidth:'640px' }}>
        Run a mid-season fan/member vote for the {label} All-Star team — separate from end-of-season awards.
        Members cast one vote per category from the league's public pages while a round is open.
      </p>

      <div className="neon-card p-3" style={{ marginBottom:'20px', maxWidth:'640px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <span style={{ color:'rgba(158,165,196,0.6)', fontSize:'0.8rem' }}>CURRENT ROUND</span>
            <h3 style={{ margin:'2px 0 0', color:'#e2e5f0' }}>{ballot ? ballot.round_label : 'No round yet'}</h3>
          </div>
          {ballot && (
            <span style={{ padding:'4px 12px', borderRadius:'20px', border:`1px solid ${statusColor}`, color:statusColor, fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase' }}>
              {ballot.status} · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div style={{ display:'flex', gap:'10px', marginTop:'16px', flexWrap:'wrap' }}>
          {ballot?.status === 'open' && <button className="neon-button" onClick={closeRound}>Close Voting</button>}
          {ballot?.status === 'closed' && <button className="neon-button" style={{ borderColor:'#5e81f4', color:'#5e81f4' }} onClick={finalizeRound}>Finalize &amp; Publish Results</button>}
        </div>

        <div style={{ marginTop:'20px', paddingTop:'16px', borderTop:'1px solid rgba(158,165,196,0.15)' }}>
          <div className="form-field">
            <label>{ballot?.status === 'open' ? 'Start a different round instead (closes the current one)' : 'Round Name'}</label>
            <input style={SI} value={roundLabel} onChange={e => setRoundLabel(e.target.value)} placeholder="e.g. 2026 Midseason All-Star Vote" />
          </div>
          <button className="neon-button" style={{ marginTop:'10px' }} onClick={openRound}>Open New Round</button>
        </div>

        {err && <p style={{ color:'#ff6464', fontSize:'0.85rem', marginTop:'10px' }}>{err}</p>}
        {msg && <p style={{ color:'#5ee6a8', fontSize:'0.85rem', marginTop:'10px' }}>{msg}</p>}
      </div>

      {ballot && (
        <div style={{ display:'grid', gap:'16px', maxWidth:'640px' }}>
          {categories.map(cat => {
            const rows = tallyFor(cat.id);
            return (
              <div className="neon-card p-3" key={cat.id}>
                <h3 className="gradient-text-magenta" style={{ marginBottom:'12px' }}>{cat.label}</h3>
                {rows.length === 0 ? <p style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.85rem' }}>No votes yet.</p> : (
                  <div style={{ display:'grid', gap:'8px' }}>
                    {rows.map((row, i) => (
                      <div key={row.player_id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background: i === 0 ? 'rgba(94, 129, 244,0.08)' : 'rgba(94, 129, 244,0.03)', border:'1px solid rgba(94, 129, 244,0.15)', borderRadius:'6px' }}>
                        <span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{i === 0 ? '⭐ ' : ''}{row.player_name}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <span style={{ color:'rgba(158,165,196,0.7)', fontSize:'0.85rem' }}>{row.count} vote{row.count === 1 ? '' : 's'}</span>
                          {ballot.status === 'final' && (
                            granted[row.player_id]
                              ? <span style={{ color:'#5ee6a8', fontSize:'0.8rem' }}>✓ Accolade given</span>
                              : <button className="neon-button" style={{ fontSize:'0.75rem', padding:'4px 10px' }} onClick={() => grantAllStar(row)}>🏅 Grant All-Star</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

// Roblox leagues use the generic `db` under a sport prefix; fantasy leagues use fantasyDb.
const ROBLOX_LEAGUES = [
  { id: '__vizta__',    name: 'Roblox Baseball League', prefix: 'vizta',    sport: 'baseball' },
  { id: '__hockey__',   name: 'Roblox Hockey League',   prefix: 'hockey',   sport: 'hockey' },
  { id: '__football__', name: 'Heavenly Football League', prefix: 'football', sport: 'football' },
];

const FantasyScheduleTab = () => {
  const [leagues,        setLeagues]        = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [teams,          setTeams]          = useState([]);
  const [selectedTeam,   setSelectedTeam]   = useState(null);
  const [schedule,       setSchedule]       = useState([]);
  const [schedLoading,   setSchedLoading]   = useState(false);
  const [bsGames,        setBsGames]        = useState([]); // box score games available to link, for Roblox leagues
  const [form,           setForm]           = useState({ week: '', opponent: '', is_home: 'true', game_date: '', result: '', score: '', notes: '', game_id: '' });
  const [saving,         setSaving]         = useState(false);
  const [msg,            setMsg]            = useState('');

  useEffect(() => {
    // Build league list: the 3 Roblox leagues + all fantasy leagues
    fantasyDb.getAllLeagues()
      .then(fl => setLeagues([...ROBLOX_LEAGUES, ...fl]))
      .catch(() => setLeagues([...ROBLOX_LEAGUES]));
  }, []);

  const robloxPrefix = (league) => ROBLOX_LEAGUES.find(r => r.id === league.id)?.prefix || null;

  const pickLeague = async (league) => {
    setSelectedLeague(league);
    setSelectedTeam(null);
    setSchedule([]);
    setForm(f => ({ ...f, game_id: '' }));
    const prefix = robloxPrefix(league);
    if (prefix) {
      const [t, g] = await Promise.all([
        db.getTeams(prefix).catch(() => []),
        db.getBsGames(prefix).catch(() => []),
      ]);
      setTeams(t);
      setBsGames(g || []);
    } else {
      const t = await fantasyDb.getTeams(league.id).catch(() => []);
      setTeams(t);
      setBsGames([]);
    }
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
      game_id: form.game_id || null,
    };
    const saved = await db.saveScheduleEntry(entry);
    setSchedule(prev => [...prev, saved]);
    setForm({ week: '', opponent: '', is_home: 'true', game_date: '', result: '', score: '', notes: '', game_id: '' });
    setMsg('✓ Entry added');
    setTimeout(() => setMsg(''), 2500);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await db.deleteScheduleEntry(id);
    setSchedule(prev => prev.filter(e => e.id !== id));
  };

  const isRoblox = selectedLeague && !!robloxPrefix(selectedLeague);

  return (
    <div className="tab-content">
      <h2 className="gradient-text-cyan">Schedule Manager</h2>
      <p style={{ color:'rgba(158,165,196,0.5)', fontSize:'0.85rem', margin:'4px 0 20px' }}>
        Insert schedule entries for any Roblox league or fantasy team — set the result (win/loss/tie) and, for
        Roblox leagues, link the game to a Box Score so the public Schedule tab can open it.
      </p>

      {/* Step 1: League */}
      <div className="neon-card p-3" style={{ marginBottom:14 }}>
        <label style={{ fontWeight:700, color:'var(--color-cyan)', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>1. Select League</label>
        <select style={{ ...SI, marginTop:8 }} value={selectedLeague?.id || ''} onChange={e => { const l = leagues.find(x=>x.id===e.target.value); if(l) pickLeague(l); }}>
          <option value="">— pick a league —</option>
          <optgroup label="Roblox Leagues">
            {ROBLOX_LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </optgroup>
          {leagues.some(l => !robloxPrefix(l)) && (
            <optgroup label="Fantasy Leagues">
              {leagues.filter(l => !robloxPrefix(l)).map(l => <option key={l.id} value={l.id}>{l.name} ({(l.sport||'').toUpperCase()})</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {/* Step 2: Team */}
      {selectedLeague && (
        <div className="neon-card p-3" style={{ marginBottom:14 }}>
          <label style={{ fontWeight:700, color:'var(--color-cyan)', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>2. Select Team</label>
          <select style={{ ...SI, marginTop:8 }} value={selectedTeam?.id || ''} onChange={e => { const t = teams.find(x=>x.id===e.target.value); if(t) pickTeam(t); }}>
            <option value="">— pick a team —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}{t.owner_username ? ` (${t.owner_username})` : ''}</option>)}
          </select>
          {teams.length === 0 && <p style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.8rem', margin:'6px 0 0' }}>No teams found for this league yet.</p>}
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
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Result (Won/Lost)</label>
              <select style={SI} value={form.result} onChange={e=>setForm({...form,result:e.target.value})}>
                <option value="">TBD</option>
                <option value="W">Win</option>
                <option value="L">Loss</option>
                <option value="T">Tie</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Score</label>
              <input type="text" style={SI} value={form.score} placeholder="e.g. 7-3" onChange={e=>setForm({...form,score:e.target.value})} />
            </div>
            {isRoblox && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'0.75rem', color:'rgba(158,165,196,0.55)' }}>Link Box Score Game (optional — lets fans click into full stats)</label>
                <select style={SI} value={form.game_id} onChange={e=>setForm({...form,game_id:e.target.value})}>
                  <option value="">— no linked box score —</option>
                  {bsGames.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.game_name} — {g.home_team||'Home'} {g.home_score} - {g.away_score} {g.away_team||'Away'}{g.game_date ? ` (${g.game_date})` : ''}
                    </option>
                  ))}
                </select>
                {bsGames.length === 0 && <p style={{ color:'rgba(158,165,196,0.4)', fontSize:'0.75rem', margin:'6px 0 0' }}>No box score games created yet — add one under Box Scores first, then link it here.</p>}
              </div>
            )}
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
                  {['Wk','Opponent','Loc','Date','Score','Result','Box Score','Notes',''].map(h => (
                    <th key={h} style={{ padding:'5px 8px', textAlign:'left', color:'rgba(158,165,196,0.45)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...schedule].sort((a,b)=>(a.week||999)-(b.week||999)).map(entry => {
                  const linkedGame = entry.game_id ? bsGames.find(g => String(g.id) === String(entry.game_id)) : null;
                  return (
                    <tr key={entry.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'7px 8px', fontWeight:700, color:'var(--color-cyan)' }}>{entry.week??'—'}</td>
                      <td style={{ padding:'7px 8px', color:'#e2e5f0' }}>{entry.opponent||'—'}</td>
                      <td style={{ padding:'7px 8px', color: entry.is_home?'var(--color-cyan)':'var(--color-magenta)', fontSize:'0.72rem', fontWeight:700 }}>{entry.is_home?'HOME':'AWAY'}</td>
                      <td style={{ padding:'7px 8px', color:'rgba(158,165,196,0.55)', fontSize:'0.78rem' }}>{entry.game_date||'—'}</td>
                      <td style={{ padding:'7px 8px' }}>{entry.score||'—'}</td>
                      <td style={{ padding:'7px 8px', fontWeight:700, color: entry.result==='W'?'#22c55e':entry.result==='L'?'#ef4444':'#eab308' }}>{entry.result||'TBD'}</td>
                      <td style={{ padding:'7px 8px', fontSize:'0.75rem' }}>{linkedGame ? <span style={{ color:'var(--color-cyan)' }}>✓ linked</span> : <span style={{ color:'rgba(158,165,196,0.3)' }}>—</span>}</td>
                      <td style={{ padding:'7px 8px', color:'rgba(158,165,196,0.45)', fontSize:'0.75rem', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.notes||'—'}</td>
                      <td style={{ padding:'7px 8px' }}>
                        <button className="neon-button" style={{ borderColor:'#ff6b7a', color:'#ff6b7a', fontSize:'0.72rem', padding:'3px 9px' }} onClick={()=>handleDelete(entry.id)}>Del</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
/* ── ANNOUNCEMENTS / UPDATE LOG ADMIN TAB ───────────────────── */

const AnnouncementsAdminTab = () => {
  const { user } = useAuth();
  const [items,   setItems]   = useState([]);
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [loaded,  setLoaded]  = useState(false);

  const load = () => {
    import('../../services/db').then(({ default: dbMod }) => {
      dbMod.getAnnouncements().then(list => { setItems(list); setLoaded(true); });
    });
  };
  useEffect(load, []);

  const post = async () => {
    if (!message.trim()) return;
    setPosting(true);
    const dbMod = (await import('../../services/db')).default;
    await dbMod.postAnnouncement(message.trim(), user?.username);
    setMessage('');
    setPosting(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    const dbMod = (await import('../../services/db')).default;
    await dbMod.deleteAnnouncement(id);
    load();
  };

  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ color: '#e2e5f0', marginBottom: 4 }}>📢 Announcements &amp; Update Log</h3>
      <p style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.82rem', marginBottom: 20 }}>
        Posts here show on the Home page for everyone and get added to the scrollable update log with the date and time.
      </p>

      <div className="neon-card p-3" style={{ marginBottom: 16 }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What's new? e.g. 'Fixed the Roblox tracker, added a mini radio to profile pages...'"
          rows={4}
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <button className="neon-button" onClick={post} disabled={posting || !message.trim()} style={{ marginTop: 10, opacity: posting || !message.trim() ? 0.5 : 1 }}>
          {posting ? 'Posting…' : '📢 Post Announcement'}
        </button>
      </div>

      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(158,165,196,0.35)', marginBottom: 10 }}>
        Update Log · {items.length} post{items.length !== 1 ? 's' : ''}
      </div>
      {!loaded ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.85rem' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.85rem' }}>No announcements yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
          {items.map(a => (
            <div key={a.id} className="neon-card p-3" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', color: '#e2e5f0', whiteSpace: 'pre-wrap' }}>{a.message}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)', marginTop: 6 }}>
                  {fmt(a.created_at)}{a.posted_by ? ` · ${a.posted_by}` : ''}
                </div>
              </div>
              <button onClick={() => remove(a.id)} style={{ flexShrink: 0, background: 'none', border: '1px solid rgba(255,107,122,0.3)', color: '#ff6b7a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', height: 'fit-content' }}>
                🗑 Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── SONG OF DAY ADMIN TAB ──────────────────────────────────── */

/* ── SITE SETTINGS TAB (Roblox live status widget, etc.) ─────── */
/* ── ANALYTICS TAB (DAU/WAU + trend) ─────────────────────────── */
const AnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [onlineNow, setOnlineNow] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [dau, setDau] = useState(0);
  const [wau, setWau] = useState(0);
  const [newArticlesWeek, setNewArticlesWeek] = useState(0);
  const [visitCounts, setVisitCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.getOnlineUsers(),
      db.getMemberProfiles(),
      db.getAllUserStats(),
      db.getArticles(),
      db.getDailyVisitCounts(14),
    ]).then(([online, members, stats, articles, counts]) => {
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setOnlineNow((online || []).length);
      setTotalMembers((members || []).length);
      setDau((stats || []).filter(s => s.last_login_date === today).length);
      setWau((stats || []).filter(s => s.last_login_date && s.last_login_date >= weekAgo).length);
      setNewArticlesWeek((articles || []).filter(a => a.created_at && a.created_at.slice(0, 10) >= weekAgo).length);
      setVisitCounts(counts || {});
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const maxCount = Math.max(1, ...days.map(d => visitCounts[d] || 0));

  const StatCard = ({ label, value }) => (
    <div style={{ flex: '1 1 140px', padding: '16px', borderRadius: 10, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.15)' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-cyan)' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
    </div>
  );

  if (loading) return <div style={{ color: 'rgba(158,165,196,0.5)' }}>Loading analytics…</div>;

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>📈 Analytics</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginBottom: 18 }}>
        DAU/WAU are based on registered members with an account (via the daily login streak system) — this doesn't capture anonymous/guest traffic.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Online Now" value={onlineNow} />
        <StatCard label="Daily Active" value={dau} />
        <StatCard label="Weekly Active" value={wau} />
        <StatCard label="Total Members" value={totalMembers} />
        <StatCard label="Articles (7d)" value={newArticlesWeek} />
      </div>

      <div style={{ marginBottom: 8, fontSize: '0.78rem', fontWeight: 700, color: 'rgba(158,165,196,0.6)' }}>Daily active members — last 14 days</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, padding: '8px 4px', background: 'rgba(94,129,244,0.04)', borderRadius: 8, border: '1px solid rgba(94,129,244,0.1)' }}>
        {days.map(d => {
          const count = visitCounts[d] || 0;
          const h = Math.max(3, Math.round((count / maxCount) * 84));
          return (
            <div key={d} title={`${d}: ${count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ width: '70%', height: h, background: count > 0 ? 'var(--color-cyan)' : 'rgba(94,129,244,0.15)', borderRadius: '3px 3px 0 0' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(158,165,196,0.35)', marginTop: 4 }}>
        <span>{days[0].slice(5)}</span>
        <span>{days[days.length - 1].slice(5)}</span>
      </div>
    </div>
  );
};

const SiteSettingsTab = () => {
  const [games, setGames] = useState(null); // null = loading
  const [placeId, setPlaceId] = useState('');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    db.getSiteSetting('roblox_games').then(val => setGames(Array.isArray(val) ? val : []));
  }, []);

  const save = async (next) => {
    setGames(next);
    await db.setSiteSetting('roblox_games', next);
  };

  const addGame = () => {
    const id = placeId.trim();
    if (!id || !/^\d+$/.test(id)) { setMsg({ ok: false, text: 'Place ID must be numeric — find it in the game\'s roblox.com URL.' }); return; }
    save([...(games || []), { placeId: id, label: label.trim() }]);
    setPlaceId(''); setLabel('');
    setMsg({ ok: true, text: 'Game added to the homepage status widget.' });
    setTimeout(() => setMsg(null), 2500);
  };

  const removeGame = (id) => save((games || []).filter(g => g.placeId !== id));

  if (games === null) return <div style={{ color: 'rgba(158,165,196,0.5)' }}>Loading…</div>;

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>⚙️ Site Settings</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginBottom: 18 }}>
        Configure the Roblox games shown as a "Live Now" player-count widget on the home page.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <input value={placeId} onChange={e => setPlaceId(e.target.value)} placeholder="Roblox place ID (numeric)"
          style={{ flex: '1 1 200px', padding: '9px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.88rem' }} />
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Display name (optional)"
          style={{ flex: '1 1 200px', padding: '9px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.88rem' }} />
        <button className="neon-button" onClick={addGame}>Add Game</button>
      </div>
      {msg && <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 7, background: msg.ok ? 'rgba(67,181,129,0.12)' : 'rgba(255,107,122,0.12)', color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}
      {(games || []).length === 0 ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.85rem' }}>No games configured yet — the widget stays hidden on the homepage until you add one.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {games.map(g => (
            <div key={g.placeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '0.88rem' }}>{g.label || `Place ${g.placeId}`}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.4)' }}>ID: {g.placeId}</div>
              </div>
              <button className="neon-button" style={{ fontSize: '0.72rem', padding: '4px 10px', borderColor: '#ff6b7a', color: '#ff6b7a' }} onClick={() => removeGame(g.placeId)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SongOfDayTab = () => {
  const { user } = useAuth();
  const [form, setForm]   = useState({ title: '', artist: '', url: '', description: '' });
  const [history, setHistory] = useState([]);
  const [msg, setMsg]     = useState(null);

  const loadHistory = () => {
    import('../../services/db').then(({ default: dbMod }) => {
      dbMod.getSongHistory(10).then(setHistory);
    });
  };
  useEffect(loadHistory, []);

  async function post() {
    if (!form.title && !form.url) { setMsg({ ok: false, text: 'Title or URL required.' }); return; }
    const dbMod = (await import('../../services/db')).default;
    await dbMod.postSongOfDay(form, user?.username);
    loadHistory();
    setForm({ title: '', artist: '', url: '', description: '' });
    setMsg({ ok: true, text: 'Song of the Day set! It will appear on the home page and in the weekly Discord digest.' });
    setTimeout(() => setMsg(null), 3000);
  }

  async function removeSotd(id) {
    const dbMod = (await import('../../services/db')).default;
    await dbMod.deleteSongOfDay(id);
    loadHistory();
    setMsg({ ok: true, text: 'Removed.' });
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
        {history[0] && (
          <button className="neon-button" onClick={() => removeSotd(history[0].id)} style={{ borderColor: '#ff6b7a', color: '#ff6b7a' }}>Remove current</button>
        )}
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)', marginBottom: 10 }}>History</div>
          {history.slice(0, 10).map((s, i) => (
            <div key={s.id} style={{ padding: '10px 14px', background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '0.9rem' }}>{s.title} {s.artist ? `— ${s.artist}` : ''} {i === 0 && <span style={{ fontSize: '0.68rem', color: '#43b581', marginLeft: 6 }}>CURRENT</span>}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.4)', marginTop: 2 }}>{new Date(s.created_at).toLocaleDateString()} · by @{s.submitted_by}</div>
              </div>
              {i !== 0 && (
                <button className="neon-button" style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={async () => { const dbMod = (await import('../../services/db')).default; await dbMod.postSongOfDay(s, s.submitted_by); loadHistory(); setMsg({ ok: true, text: 'Restored!' }); setTimeout(() => setMsg(null), 2000); }}>
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StaffOfMonthTab = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({ username: '', note: '', month_label: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getMemberProfiles(), db.getStaffOfMonth()]).then(([p, sotm]) => {
      setProfiles((p || []).slice().sort((a, b) => a.username.localeCompare(b.username)));
      setCurrent(sotm || null);
      if (sotm) setForm({ username: sotm.username || '', note: sotm.note || '', month_label: sotm.month_label || '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const defaultMonthLabel = () => new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  async function post() {
    if (!form.username) { setMsg({ ok: false, text: 'Pick a member first.' }); return; }
    const saved = await db.setStaffOfMonth({
      username: form.username,
      note: form.note,
      month_label: form.month_label || defaultMonthLabel(),
      set_by: user?.username,
    });
    setCurrent(saved);
    setMsg({ ok: true, text: 'Staff of the Month set! It will appear on the home page.' });
    setTimeout(() => setMsg(null), 3000);
  }

  async function remove() {
    await db.clearStaffOfMonth();
    setCurrent(null);
    setForm({ username: '', note: '', month_label: '' });
    setMsg({ ok: true, text: 'Staff of the Month removed from home page.' });
    setTimeout(() => setMsg(null), 2000);
  }

  const inputStyle = { width: '100%', padding: '9px 12px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 7, fontSize: '0.88rem', boxSizing: 'border-box' };

  if (loading) return <div style={{ color: 'rgba(158,165,196,0.5)' }}>Loading…</div>;

  return (
    <div>
      <h3 style={{ color: '#e2e5f0', marginBottom: 6 }}>🌟 Staff of the Month</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.85rem', marginBottom: 18 }}>
        Spotlight a member on the home page and with a badge on their profile / member card.
      </p>

      {current && (
        <div style={{ marginBottom: 18, padding: '10px 14px', background: 'rgba(255,158,87,0.08)', border: '1px solid rgba(255,158,87,0.25)', borderRadius: 8, fontSize: '0.85rem', color: '#e2e5f0' }}>
          Currently: <strong>{current.username}</strong>{current.month_label ? ` — ${current.month_label}` : ''}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>Member</label>
        <select value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={inputStyle}>
          <option value="">Select a member…</option>
          {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>Month label (optional)</label>
        <input value={form.month_label} onChange={e => setForm(f => ({ ...f, month_label: e.target.value }))}
          placeholder={defaultMonthLabel()} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(158,165,196,0.5)', marginBottom: 4 }}>Note (optional)</label>
        <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder="Why they earned it" style={inputStyle} />
      </div>

      {msg && <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 7, background: msg.ok ? 'rgba(67,181,129,0.12)' : 'rgba(255,107,122,0.12)', color: msg.ok ? '#43b581' : '#ff6b7a', fontSize: '0.85rem' }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="neon-button" onClick={post}>Set as Staff of the Month</button>
        {current && (
          <button className="neon-button" onClick={remove} style={{ borderColor: '#ff6b7a', color: '#ff6b7a' }}>Remove</button>
        )}
      </div>
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
  const [form, setForm] = useState({ question: '', sport: 'baseball', options: 'Yes,No', multiplier: '2', deadline: '' });
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
          {F('Sport', 'sport', 'select', { children: [
            <option key="grp-roblox" disabled>── Roblox Leagues ──</option>,
            <option key="baseball" value="baseball">⚾ Roblox Baseball</option>,
            <option key="hockey" value="hockey">🏒 Roblox Hockey</option>,
            <option key="football" value="football">🏈 Heavenly Football</option>,
            <option key="grp-other" disabled>── Real Sports ──</option>,
            ...['nfl','nba','mlb','nhl'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>),
          ] })}
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
  const isOwner       = role === 'owner';
  const isOwnerLevel  = ['owner','cofounder','mod'].includes(role);
  const isBadgeManager = ['owner','cofounder'].includes(role);
  const isAuditViewer  = ['owner','cofounder'].includes(role);
  const isAthleteRatingsEditor = ['owner','cofounder'].includes(role);
  const isViztaHelper = role === 'vizta_helper';
  const isFootballHelper = role === 'football_helper';

  const [activeTab, setActiveTab] = useState(
    isOwnerLevel ? 'member-pages' : isFootballHelper ? 'football-players' : 'vizta-players'
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'member-pages':      return <MemberPagesTab />;
      case 'user-roles':        return <UserRolesTab />;
      case 'audit-log':        return isAuditViewer ? <AuditLogTab /> : null;
      case 'manage-stats':     return <ManageStatsTab />;
      case 'give-coins':        return <GiveCoinsTab />;
      case 'fantasy-manage':    return <FantasyManageTab />;
      case 'fantasy-schedule':  return <FantasyScheduleTab />;
      case 'admin-announcements': return isOwner ? <AnnouncementsAdminTab /> : null;
      case 'analytics':        return isOwner ? <AnalyticsTab /> : null;
      case 'site-settings':    return isOwner ? <SiteSettingsTab /> : null;
      case 'admin-sotd':       return <SongOfDayTab />;
      case 'admin-sotm':       return isBadgeManager ? <StaffOfMonthTab /> : null;
      case 'admin-beatbattle': return <BeatBattleAdminTab />;
      case 'admin-propbets':   return <PropBetsAdminTab />;
      case 'admin-playoffs':   return <PlayoffPoolsAdminTab />;
      case 'admin-badges':    return isBadgeManager ? <BadgesAdminTab /> : null;
      case 'perfect-athlete-ratings': return isAthleteRatingsEditor ? <PerfectAthleteRatingsTab /> : null;
      case 'vizta-players':   return <LeaguePlayersTab prefix="vizta" />;
      case 'vizta-teams':     return <LeagueTeamsTab prefix="vizta" />;
      case 'vizta-rosters':   return <LeagueRostersTab prefix="vizta" />;
      case 'vizta-games':     return <LeagueGamesTab prefix="vizta" />;
      case 'vizta-boxscores': return <LeagueBoxScoresTab prefix="vizta" />;
      case 'vizta-hof':       return <LeagueHofTab prefix="vizta" />;
      case 'vizta-awards':    return <LeagueAwardsTab prefix="vizta" />;
      case 'vizta-allstar':   return <AllStarAdminTab prefix="vizta" />;
      case 'vizta-beatwire':   return <LeagueBeatWireTab prefix="vizta" />;
      case 'hockey-players':   return <LeaguePlayersTab prefix="hockey" />;
      case 'hockey-teams':     return <LeagueTeamsTab prefix="hockey" />;
      case 'hockey-rosters':   return <LeagueRostersTab prefix="hockey" />;
      case 'hockey-games':     return <LeagueGamesTab prefix="hockey" />;
      case 'hockey-boxscores': return <LeagueBoxScoresTab prefix="hockey" />;
      case 'hockey-hof':       return <LeagueHofTab prefix="hockey" />;
      case 'hockey-awards':    return <LeagueAwardsTab prefix="hockey" />;
      case 'hockey-allstar':   return <AllStarAdminTab prefix="hockey" />;
      case 'hockey-beatwire':   return <LeagueBeatWireTab prefix="hockey" />;
      case 'football-players':   return <LeaguePlayersTab prefix="football" />;
      case 'football-teams':     return <LeagueTeamsTab prefix="football" />;
      case 'football-rosters':   return <LeagueRostersTab prefix="football" />;
      case 'football-games':     return <LeagueGamesTab prefix="football" />;
      case 'football-boxscores': return <LeagueBoxScoresTab prefix="football" />;
      case 'football-hof':       return <LeagueHofTab prefix="football" />;
      case 'football-awards':    return <LeagueAwardsTab prefix="football" />;
      case 'football-allstar':   return <AllStarAdminTab prefix="football" />;
      case 'football-beatwire':   return <LeagueBeatWireTab prefix="football" />;
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
          <span style={{ color:'var(--color-cyan)', marginRight:'20px', fontSize:'0.85rem' }}>{isFootballHelper ? 'HEAVENLY FOOTBALL STAT HELPER' : isViztaHelper ? 'ROBLOX BASEBALL HELPER' : role?.toUpperCase()}</span>
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
              {isAuditViewer && <Btn id="audit-log" label="📜 Audit Log" />}
              {isOwner && <Btn id="manage-stats" label="📊 Manage Stats" />}
              <Btn id="give-coins"       label="Give Coins" />
              {isOwner && <Btn id="admin-announcements" label="📢 Announcements" />}
              {isOwner && <Btn id="analytics" label="📈 Analytics" />}
              {isOwner && <Btn id="site-settings" label="⚙️ Site Settings" />}
              <Btn id="admin-sotd"       label="🎶 Song of Day" />
              <Btn id="admin-beatbattle" label="🎵 Beat Battle" />
              <Btn id="admin-propbets"   label="🎯 Prop Bets" />
              <Btn id="admin-playoffs"   label="🏆 Playoff Pools" />
              {isBadgeManager && <Btn id="admin-badges" label="🏅 Badges" />}
              {isBadgeManager && <Btn id="admin-sotm" label="🌟 Staff of the Month" />}
              {isAthleteRatingsEditor && <Btn id="perfect-athlete-ratings" label="🐐 Perfect Athlete Ratings" />}
            </div>
          </div>
        )}
        {isOwnerLevel && (
          <div className="dashboard-section">
            <div className="section-label">FANTASY</div>
            <div className="dashboard-tabs">
              <Btn id="fantasy-manage"   label="Manage" />
            </div>
          </div>
        )}
        {(isOwnerLevel || isViztaHelper) && (
          <div className="dashboard-section">
            <div className="section-label">SCHEDULES</div>
            <div className="dashboard-tabs">
              <Btn id="fantasy-schedule" label="📅 All Leagues Schedule" />
            </div>
          </div>
        )}
        {(isOwnerLevel || isViztaHelper) && (
          <div className="dashboard-section">
            <div className="section-label">ROBLOX BASEBALL</div>
            <div className="dashboard-tabs">
              <Btn id="vizta-players"   label="Players" />
              <Btn id="vizta-teams"     label="Teams" />
              <Btn id="vizta-rosters"   label="Rosters" />
              <Btn id="vizta-games"     label="Games" />
              <Btn id="vizta-boxscores" label="Box Scores" />
              <Btn id="vizta-hof"       label="HoF" />
              <Btn id="vizta-awards"    label="Awards" />
              <Btn id="vizta-allstar"   label="⭐ All-Star Vote" />
              <Btn id="vizta-beatwire"  label="📰 Beat Wire" />
            </div>
          </div>
        )}
        {(isOwnerLevel || isViztaHelper) && (
          <div className="dashboard-section">
            <div className="section-label">ROBLOX HOCKEY</div>
            <div className="dashboard-tabs">
              <Btn id="hockey-players"   label="Players" />
              <Btn id="hockey-teams"     label="Teams" />
              <Btn id="hockey-rosters"   label="Rosters" />
              <Btn id="hockey-games"     label="Games" />
              <Btn id="hockey-boxscores" label="Box Scores" />
              <Btn id="hockey-hof"       label="HoF" />
              <Btn id="hockey-awards"    label="Awards" />
              <Btn id="hockey-allstar"   label="⭐ All-Star Vote" />
              <Btn id="hockey-beatwire"  label="📰 Beat Wire" />
            </div>
          </div>
        )}
        {(isOwnerLevel || isViztaHelper || isFootballHelper) && (
          <div className="dashboard-section">
            <div className="section-label">HEAVENLY FOOTBALL</div>
            <div className="dashboard-tabs">
              <Btn id="football-players"   label="Players" />
              <Btn id="football-teams"     label="Teams" />
              <Btn id="football-rosters"   label="Rosters" />
              <Btn id="football-games"     label="Games" />
              <Btn id="football-boxscores" label="Box Scores" />
              <Btn id="football-hof"       label="HoF" />
              <Btn id="football-awards"    label="Awards" />
              <Btn id="football-allstar"   label="⭐ All-Star Vote" />
              <Btn id="football-beatwire"  label="📰 Beat Wire" />
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-content">{renderContent()}</div>
    </div>
  );
};

export default OwnerDashboard;
