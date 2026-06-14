import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TEAMS, SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import { getWatchList } from '../../services/mediaService';
import * as lfm from '../../services/lastfmService';
import './MemberProfile.css';

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', nabb_helper: 'NABB Helper', member: 'Member', guest: 'Guest' };
  return map[role] || role || 'Member';
};

const TYPE_ICONS = { anime: '🎌', movie: '🎬', tv: '📺' };
const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];
const DEFAULT_FAV_TEAMS = { mlb: [], nfl: [], nba: [], nhl: [], cfb: [], cbb: [] };

const DEFAULT_PROFILE = {
  bio: '', top_banner_url: '', avatar_url: '', lastfm_username: '',
  twitter_url: '', twitch_url: '', youtube_url: '', instagram_url: '',
  discord_tag: '', fav_teams: DEFAULT_FAV_TEAMS,
};

/* -- Image upload field ---------------------------------------- */
const ImageField = ({ label, fieldKey, value, onChange }) => {
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Image must be under 3 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => onChange(fieldKey, reader.result);
    reader.readAsDataURL(file);
  };
  const isBase64 = value && value.startsWith('data:');
  const hasImage = !!value;
  return (
    <div className="form-group mp-image-field">
      <label>{label}</label>
      <div className="mp-image-upload-row">
        <input type="text" value={isBase64 ? '' : (value || '')} onChange={(e) => onChange(fieldKey, e.target.value)} placeholder={isBase64 ? '(uploaded file)' : 'Paste image URL...'} style={{ flex: 1 }} />
        <label className="mp-upload-btn" title="Upload from device">
          Upload
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {hasImage && <button className="mp-upload-clear" onClick={() => onChange(fieldKey, '')} title="Remove image">x</button>}
      </div>
      {hasImage && (
        <div className="mp-image-preview-wrap">
          <img src={value} alt="preview" className="mp-image-preview" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
};

/* -- Team Selector --------------------------------------------- */
const TeamSelector = ({ favTeams, onChange }) => {
  const [activeSport, setActiveSport] = useState('mlb');
  const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(activeSport);
  const toggle = (sport, abbr) => {
    const current = favTeams[sport] || [];
    const next = current.includes(abbr) ? current.filter((a) => a !== abbr) : [...current, abbr];
    onChange({ ...favTeams, [sport]: next });
  };
  return (
    <div className="mp-team-selector">
      <div className="mp-sport-tabs">
        {SPORT_KEYS.map((s) => {
          const count = (favTeams[s] || []).length;
          return (
            <button key={s} className={`mp-sport-tab ${activeSport === s ? 'active' : ''}`} onClick={() => setActiveSport(s)}>
              <span>{SPORT_ICONS[s]}</span><span>{SPORT_SHORT[s]}</span>
              {count > 0 && <span className="mp-sport-count">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="mp-team-grid">
        {Object.entries(TEAMS[activeSport] || {}).map(([div, teams]) => (
          <div key={div} className="mp-team-division">
            <div className="mp-div-label">{div}</div>
            <div className="mp-team-row">
              {teams.map((t) => {
                const selected = (favTeams[activeSport] || []).includes(t.abbr);
                const logo = hasLogos ? getTeamLogoUrl(activeSport, t.abbr) : null;
                return (
                  <button key={t.abbr} className={`mp-team-btn ${selected ? 'selected' : ''}`} onClick={() => toggle(activeSport, t.abbr)} title={t.name}>
                    {logo && <img src={logo} alt="" className="mp-team-logo" onError={(e) => { e.target.style.display = 'none'; }} />}
                    {t.abbr}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -- Favorite Teams Display ------------------------------------ */
const FavTeamsDisplay = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div className="discord-section">
      <div className="discord-section-title">Favorite Teams</div>
      {SPORT_KEYS.map((sport) => {
        const picked = favTeams?.[sport] || [];
        if (!picked.length) return null;
        const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(sport);
        return (
          <div key={sport} className="mp-fav-sport-row">
            <span className="mp-fav-sport-label">{SPORT_ICONS[sport]} {SPORT_SHORT[sport]}</span>
            <div className="mp-fav-teams">
              {picked.map((abbr) => {
                const logo = hasLogos ? getTeamLogoUrl(sport, abbr) : null;
                return (
                  <span key={abbr} className="mp-fav-team-badge">
                    {logo && <img src={logo} alt="" className="mp-badge-logo" onError={(e) => { e.target.style.display = 'none'; }} />}
                    {abbr}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* -- Watch List Preview ---------------------------------------- */
const WatchListPreview = ({ username }) => {
  const list = getWatchList(username);
  if (!list.length) return null;
  const pinned   = list.filter((i) => i.pinned);
  const watched  = list.filter((i) => i.status === 'watched').length;
  const watching = list.filter((i) => i.status === 'watching').length;
  const plan     = list.filter((i) => i.status === 'plan').length;
  return (
    <div className="discord-section">
      <div className="discord-section-title">Watch List</div>
      <div className="mp-wl-stats">
        <span className="mp-wl-stat"><span style={{ color: '#a5d6a7' }}>checked</span> {watched} watched</span>
        <span className="mp-wl-stat"><span style={{ color: '#66bb6a' }}>playing</span> {watching} watching</span>
        <span className="mp-wl-stat"><span style={{ color: '#64b5f6' }}>planned</span> {plan} planned</span>
      </div>
      {pinned.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', color: 'rgba(192,208,255,0.35)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '10px', marginBottom: '8px' }}>
            Pinned
          </div>
          <div className="mp-pinned-grid">
            {pinned.slice(0, 6).map((item) => (
              <div key={item.id} className="mp-pinned-card" title={item.title}>
                {item.poster ? <img src={item.poster} alt={item.title} /> : <div className="mp-pinned-ph">{TYPE_ICONS[item.type] || '?'}</div>}
                {item.rating != null && <div className="mp-pinned-rating">star{item.rating}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* -- Last.fm Now Playing Widget -------------------------------- */
const LastFmWidget = ({ lastfmUsername }) => {
  const [track, setTrack] = useState(undefined);
  useEffect(() => {
    if (!lastfmUsername || !lfm.hasApiKey()) { setTrack(null); return; }
    let active = true;
    const poll = async () => {
      const t = await lfm.getNowPlaying(lastfmUsername);
      if (active) setTrack(t);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [lastfmUsername]);
  if (!lastfmUsername || !lfm.hasApiKey() || track === null || track === undefined) return null;
  return (
    <div className="discord-section">
      <div className="discord-section-title-row">
        <span className="discord-section-title">
          {track.isPlaying ? 'Now Playing' : 'Last Scrobbled'}
        </span>
        <a className="lfm-mini-link" href={track.userUrl} target="_blank" rel="noreferrer">Last.fm</a>
      </div>
      <a className={`sp-track ${track.isPlaying ? 'playing' : 'paused'}`} href={track.trackUrl || '#'} target="_blank" rel="noreferrer" style={{ '--sp-color': '#d51007' }}>
        {track.albumArt
          ? <img className="sp-art" src={track.albumArt} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          : <div className="sp-art sp-art-placeholder">music</div>}
        <div className="sp-info">
          <div className="sp-track-name">{track.trackName}</div>
          <div className="sp-artist-name">{track.artistName}</div>
          <div className="sp-status" style={{ color: track.isPlaying ? '#d51007' : undefined }}>
            {track.isPlaying ? 'Playing' : 'Last played'}
          </div>
        </div>
      </a>
    </div>
  );
};

/* -- Roblox Games Tab ----------------------------------------- */
const parsePlaceId = (url) => {
  const match = url.match(/roblox\.com\/games\/(\d+)/);
  return match ? match[1] : null;
};

const extractGameName = (url) => {
  const match = url.match(/roblox\.com\/games\/\d+\/([^/?#]+)/);
  if (!match || !match[1]) return 'Roblox Game';
  return decodeURIComponent(match[1]).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const fetchRobloxThumbnail = async (placeId) => {
  try {
    const r = await fetch(
      `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=256x256&format=Png&isCircular=false`
    );
    const d = await r.json();
    return d.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
};

const RobloxGamesTab = ({ username, editable = false }) => {
  const storageKey = `nova_roblox_games_${username}`;
  const [games, setGames]     = useState(() => JSON.parse(localStorage.getItem(storageKey) || '[]'));
  const [urlInput, setUrlInput] = useState('');
  const [adding, setAdding]   = useState(false);
  const [errMsg, setErrMsg]   = useState('');

  const addGame = async () => {
    const url = urlInput.trim();
    if (!url) return;
    const placeId = parsePlaceId(url);
    if (!placeId) {
      setErrMsg('Paste a Roblox game URL like: roblox.com/games/123456/...');
      return;
    }
    if (games.some(g => g.placeId === placeId)) {
      setErrMsg('That game is already in your list.');
      return;
    }
    setAdding(true);
    setErrMsg('');
    const thumbnail = await fetchRobloxThumbnail(placeId);
    const name = extractGameName(url);
    const gameUrl = url.startsWith('http') ? url : `https://www.roblox.com/games/${placeId}`;
    const newGame = { id: Date.now().toString(), placeId, url: gameUrl, name, thumbnail, addedAt: new Date().toLocaleDateString() };
    const updated = [...games, newGame];
    setGames(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setUrlInput('');
    setAdding(false);
  };

  const removeGame = (id) => {
    const updated = games.filter(g => g.id !== id);
    setGames(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return (
    <div className="tw-section">
      {editable && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <input
              type="text"
              placeholder="Paste Roblox game URL..."
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setErrMsg(''); }}
              onKeyDown={e => e.key === 'Enter' && addGame()}
              style={{ flex: 1, padding: '9px 12px', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)', color: '#c0d0ff', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
            />
            <button
              onClick={addGame}
              disabled={adding}
              style={{ padding: '9px 16px', background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', color: 'var(--color-cyan)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', opacity: adding ? 0.6 : 1 }}
            >
              {adding ? 'Adding...' : '+ Add'}
            </button>
          </div>
          {errMsg && <p style={{ color: '#ff8080', fontSize: '0.78rem', margin: 0 }}>{errMsg}</p>}
          <p style={{ color: 'rgba(192,208,255,0.35)', fontSize: '0.72rem', margin: '4px 0 0' }}>
            e.g. https://www.roblox.com/games/6978052/MurderMystery2
          </p>
        </div>
      )}

      {games.length === 0 ? (
        <div className="tw-empty">
          {editable ? 'No games yet. Paste a Roblox game URL above.' : 'No favorite Roblox games yet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
          {games.map(g => (
            <div key={g.id} style={{ position: 'relative', background: 'rgba(10,10,30,0.85)', border: '1px solid rgba(100,120,200,0.2)', borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.15s, transform 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(100,120,200,0.2)'; e.currentTarget.style.transform = 'none'; }}
            >
              {editable && (
                <button
                  onClick={() => removeGame(g.id)}
                  style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 5, background: 'rgba(0,0,0,0.75)', border: 'none', color: 'rgba(255,100,100,0.9)', borderRadius: '4px', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >
                  x
                </button>
              )}
              <a href={g.url} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(20,20,50,0.9)', overflow: 'hidden' }}>
                  {g.thumbnail
                    ? <img src={g.thumbnail} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', opacity: 0.35 }}>🎮</div>
                  }
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ margin: 0, fontSize: '0.76rem', fontWeight: 700, color: 'rgba(192,208,255,0.9)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {g.name}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.66rem', color: 'rgba(0,200,255,0.55)' }}>
                    Play on Roblox
                  </p>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* -- Main MemberProfile --------------------------------------- */
const MemberProfile = () => {
  const { user } = useAuth();
  const [profile,   setProfile]  = useState(null);
  const [editing,   setEditing]  = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [formData,  setFormData] = useState({});
  const [favTab,    setFavTab]   = useState(false);
  const [presence,  setPresence] = useState(() => localStorage.getItem(`nova_presence_${user?.username}`) || 'online');
  const [coins,     setCoins]    = useState(() => parseInt(localStorage.getItem(`nova_coins_${user?.username}`) || '0'));
  const coinsRef = useRef(null);
  const [favGames,  setFavGames] = useState(() => JSON.parse(localStorage.getItem(`nova_favgames_${user?.username}`) || '[]'));
  const [showAddGame, setShowAddGame] = useState(false);
  const [newGameText, setNewGameText] = useState('');
  const [newGameNote, setNewGameNote] = useState('');

  useEffect(() => {
    if (!user?.username) return;
    coinsRef.current = setInterval(() => {
      setCoins(prev => {
        const next = prev + 1;
        localStorage.setItem(`nova_coins_${user.username}`, next);
        return next;
      });
    }, 120000);
    return () => clearInterval(coinsRef.current);
  }, [user]);

  const changePresence = (p) => {
    setPresence(p);
    localStorage.setItem(`nova_presence_${user?.username}`, p);
  };

  useEffect(() => {
    if (!user?.username) return;
    import('../../services/db').then(({ default: db }) => {
      db.getMemberProfiles().then(profiles => {
        const found = profiles.find(p => p.username === user.username);
        if (!found) {
          const lsProfiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
          const lsFound = lsProfiles.find(p => p.username === user.username);
          const p = { ...DEFAULT_PROFILE, username: user.username, ...(lsFound || {}), fav_teams: { ...DEFAULT_FAV_TEAMS, ...(lsFound?.fav_teams || {}) } };
          setProfile(p); setFormData(p);
          if (lsFound) db.saveMemberProfile(p).catch(() => {});
        } else {
          const p = { ...DEFAULT_PROFILE, ...found, fav_teams: { ...DEFAULT_FAV_TEAMS, ...(found.fav_teams || {}) } };
          setProfile(p); setFormData(p);
        }
      }).catch(() => {
        const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
        const found = profiles.find(p => p.username === user.username);
        const p = { ...DEFAULT_PROFILE, username: user.username, ...(found || {}), fav_teams: { ...DEFAULT_FAV_TEAMS, ...(found?.fav_teams || {}) } };
        setProfile(p); setFormData(p);
      });
    });
  }, [user]);

  const handleField = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const idx = profiles.findIndex((p) => p.username === user?.username);
    if (idx !== -1) profiles[idx] = formData; else profiles.push(formData);
    localStorage.setItem('member_profiles', JSON.stringify(profiles));
    import('../../services/db').then(({ default: db }) => { db.saveMemberProfile(formData).catch(() => {}); });
    setProfile(formData);
    setEditing(false);
    setFavTab(false);
  };

  if (!profile) return <div>Loading...</div>;

  if (editing) {
    return (
      <div className="page discord-edit-page">
        <div className="page-header">
          <h1 className="gradient-text">Edit Profile</h1>
          <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
        </div>
        <div className="mp-edit-tabs">
          <button className={`sh-sub-tab ${!favTab ? 'active' : ''}`} onClick={() => setFavTab(false)}>Profile</button>
          <button className={`sh-sub-tab ${favTab ? 'active' : ''}`} onClick={() => setFavTab(true)}>Favorite Teams</button>
        </div>
        {!favTab ? (
          <div className="neon-card p-3">
            <ImageField label="Banner Image" fieldKey="top_banner_url" value={formData.top_banner_url || ''} onChange={handleField} />
            <ImageField label="Avatar / Profile Picture" fieldKey="avatar_url" value={formData.avatar_url || ''} onChange={handleField} />
            <div className="form-group">
              <label>About Me</label>
              <textarea rows="4" value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." />
            </div>
            <div className="form-group">
              <label>Discord Tag</label>
              <input type="text" value={formData.discord_tag || ''} onChange={(e) => setFormData({ ...formData, discord_tag: e.target.value })} placeholder="username#0000" />
            </div>
            <div className="form-group">
              <label>Last.fm Username</label>
              <input type="text" value={formData.lastfm_username || ''} onChange={(e) => setFormData({ ...formData, lastfm_username: e.target.value })} placeholder="your-lastfm-username" />
              <small style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.75rem' }}>Shows your now-playing track on your profile. Free at last.fm</small>
            </div>
            <div className="form-group">
              <label>Spotify Song / Playlist URL</label>
              <input type="text" value={formData.spotify_url || ''} onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })} placeholder="https://open.spotify.com/track/..." />
            </div>
            <h4 className="gradient-text-cyan" style={{ margin: '20px 0 10px' }}>Socials</h4>
            {[
              { key: 'twitter_url',   label: 'Twitter URL' },
              { key: 'twitch_url',    label: 'Twitch URL' },
              { key: 'youtube_url',   label: 'YouTube URL' },
              { key: 'instagram_url', label: 'Instagram URL' },
            ].map(({ key, label }) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type="text" value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} placeholder="https://..." />
              </div>
            ))}
            <div className="form-actions">
              <button className="neon-button" onClick={handleSave}>Save Profile</button>
              <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="neon-card p-3">
            <p style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Pick your favorite teams. You can select multiple.
            </p>
            <TeamSelector favTeams={formData.fav_teams || DEFAULT_FAV_TEAMS} onChange={(ft) => setFormData({ ...formData, fav_teams: ft })} />
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button className="neon-button" onClick={handleSave}>Save</button>
              <button className="neon-button" onClick={() => { setEditing(false); setFavTab(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: 'Twitter' },
    { key: 'twitch_url',    label: 'Twitch',    icon: 'Twitch'  },
    { key: 'youtube_url',   label: 'YouTube',   icon: 'YouTube' },
    { key: 'instagram_url', label: 'Instagram', icon: 'Insta'   },
  ].filter((s) => profile[s.key]);

  const addFavGame = () => {
    if (!newGameText.trim()) return;
    const newG = { id: Date.now().toString(), text: newGameText.trim(), note: newGameNote, date: new Date().toLocaleDateString() };
    const updated = [...favGames, newG];
    setFavGames(updated);
    localStorage.setItem(`nova_favgames_${user?.username}`, JSON.stringify(updated));
    setNewGameText('');
    setNewGameNote('');
    setShowAddGame(false);
  };

  const removeFavGame = (id) => {
    const updated = favGames.filter(g => g.id !== id);
    setFavGames(updated);
    localStorage.setItem(`nova_favgames_${user?.username}`, JSON.stringify(updated));
  };

  const TABS = [
    { id: 'about',     label: 'About'         },
    { id: 'music',     label: 'Music'         },
    { id: 'favgames',  label: 'Fav Games'     },
    { id: 'roblox',    label: 'Roblox Games'  },
    { id: 'teams',     label: 'Teams'         },
    { id: 'watchlist', label: 'Watch List'    },
  ];

  const SI = { padding:'10px', background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.2)', color:'#c0d0ff', borderRadius:'6px', width:'100%', marginBottom:'8px' };

  return (
    <div className="tw-page">
      {/* Banner */}
      <div className="tw-banner" style={{ backgroundImage: profile.top_banner_url ? `url(${profile.top_banner_url})` : undefined }}>
        <div className="tw-avatar-wrap">
          <div className="tw-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" /> : 'N'}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="tw-action-row">
        <button className="neon-button" onClick={() => setEditing(true)}>Edit Profile</button>
      </div>

      {/* Info */}
      <div className="tw-info">
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <h2 className="tw-name">{profile.username}</h2>
          <span className={`tw-role-badge ${user?.role || 'member'}`}>{roleLabel(user?.role)}</span>
        </div>
        <p className="tw-handle">@{profile.username}</p>

        {profile.bio && <p className="tw-bio">{profile.bio}</p>}

        {/* Presence toggle */}
        <div className="tw-status-row">
          {[
            { key:'online',  label:'Online',         color:'#43b581' },
            { key:'idle',    label:'Do Not Disturb', color:'#f04747' },
            { key:'offline', label:'Invisible',      color:'#747f8d' },
          ].map(({ key, label, color }) => (
            <button key={key} className="tw-presence-btn"
              onClick={() => changePresence(key)}
              style={{ borderColor: presence===key ? color : 'rgba(100,120,200,0.2)', color: presence===key ? color : 'rgba(192,208,255,0.4)', background: presence===key ? `${color}18` : 'transparent' }}>
              <span className="tw-presence-dot" style={{ background: presence===key ? color : 'rgba(100,120,200,0.3)' }} />
              {label}
            </button>
          ))}
          <div className="tw-coins">
            <span>Coins:</span>
            <span>{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Socials */}
        {socials.length > 0 && (
          <div className="tw-socials">
            {socials.map(s => (
              <a key={s.key} href={profile[s.key]} target="_blank" rel="noreferrer" className="tw-social-link">
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tw-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tw-tab ${activeTab===t.id?'active':''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tw-feed">

        {/* ABOUT */}
        {activeTab === 'about' && (
          <>
            {profile.bio
              ? <div className="tw-section"><p style={{ color:'rgba(192,208,255,0.85)', lineHeight:1.6, margin:0 }}>{profile.bio}</p></div>
              : <div className="tw-empty">No bio yet. Click Edit Profile to add one.</div>
            }
          </>
        )}

        {/* MUSIC */}
        {activeTab === 'music' && (
          <div className="tw-section">
            <LastFmWidget lastfmUsername={profile.lastfm_username} />
            {profile.spotify_url && (
              <>
                <div className="tw-section-title" style={{ marginTop:'16px' }}>Spotify</div>
                <iframe
                  src={profile.spotify_url.includes('/embed/') ? profile.spotify_url : profile.spotify_url.replace('open.spotify.com/','open.spotify.com/embed/')}
                  width="100%" height="80" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  title="Spotify" style={{ borderRadius:'10px', display:'block' }}
                />
              </>
            )}
            {!profile.lastfm_username && !profile.spotify_url && (
              <div className="tw-empty">No music linked. Edit your profile to add Last.fm or Spotify.</div>
            )}
          </div>
        )}

        {/* FAV GAMES (sports) */}
        {activeTab === 'favgames' && (
          <div className="tw-section">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div className="tw-section-title" style={{ margin:0 }}>Favorite Sports Games</div>
              <button className="neon-button" style={{ padding:'5px 14px', fontSize:'0.8rem' }} onClick={() => setShowAddGame(s => !s)}>
                {showAddGame ? 'Cancel' : '+ Add Game'}
              </button>
            </div>
            {showAddGame && (
              <div style={{ marginBottom:'16px', padding:'14px', background:'rgba(0,255,255,0.04)', borderRadius:'10px', border:'1px solid rgba(0,255,255,0.12)' }}>
                <input
                  type="text"
                  placeholder="Game name (e.g. Yankees vs Red Sox, April 20 2024)"
                  value={newGameText}
                  onChange={e => setNewGameText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFavGame()}
                  style={SI}
                />
                <input
                  type="text"
                  placeholder="Why is it your favorite? (optional)"
                  value={newGameNote}
                  onChange={e => setNewGameNote(e.target.value)}
                  style={SI}
                />
                <button className="neon-button" style={{ width:'100%' }} onClick={addFavGame}>
                  Add to Favorites
                </button>
              </div>
            )}
            {favGames.length === 0 ? (
              <div className="tw-empty">No favorite games yet. Add your most memorable games!</div>
            ) : (
              favGames.map(g => (
                <div key={g.id} className="tw-fav-game">
                  <div className="tw-fav-game-title">{g.text}</div>
                  {g.note && <div className="tw-fav-game-note">"{g.note}"</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span className="tw-fav-game-meta">{g.date}</span>
                    <button onClick={() => removeFavGame(g.id)} style={{ background:'none', border:'none', color:'rgba(255,60,60,0.6)', cursor:'pointer', fontSize:'0.82rem' }}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ROBLOX GAMES */}
        {activeTab === 'roblox' && (
          <RobloxGamesTab username={profile.username} editable={true} />
        )}

        {/* TEAMS */}
        {activeTab === 'teams' && (
          <div className="tw-section">
            <FavTeamsDisplay favTeams={profile.fav_teams} />
          </div>
        )}

        {/* WATCH LIST */}
        {activeTab === 'watchlist' && (
          <div className="tw-section">
            <WatchListPreview username={profile.username} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
