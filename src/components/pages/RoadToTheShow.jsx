import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

/* ── Coin helpers ──────────────────────────────────────────── */
const getCoins  = (u) => parseInt(localStorage.getItem(`nova_coins_${u}`) || '0');
const addCoins  = (u, n) => localStorage.setItem(`nova_coins_${u}`, getCoins(u) + n);
const spendCoins= (u, n) => { const c=getCoins(u); if(c<n) return false; localStorage.setItem(`nova_coins_${u}`, c-n); return true; };

/* ── Save/load career ──────────────────────────────────────── */
const saveCareer= (u,d) => localStorage.setItem(`nova_rtts_${u}`, JSON.stringify(d));
const loadCareer= (u)   => { try { return JSON.parse(localStorage.getItem(`nova_rtts_${u}`)); } catch { return null; } };

/* ── Constants ─────────────────────────────────────────────── */
const POSITIONS = ['C','1B','2B','3B','SS','LF','CF','RF','SP','RP'];
const COLLEGES  = ['Alabama','Arizona St','Arkansas','Cal State Fullerton','Clemson','Florida','Florida St','Georgia','LSU','Miami','Michigan','Mississippi St','NC State','Oklahoma','Ole Miss','Oregon','South Carolina','Stanford','TCU','Tennessee','Texas','Texas A&M','UCLA','USC','Vanderbilt','Virginia','Wake Forest','Other'];
const SKIN_TONES= ['#FDDBB4','#F0C27F','#D4A574','#C68642','#8D5524','#4A2912'];
const HAIR_COLORS=['#1a1a1a','#3d2b1f','#6b3a2a','#8B4513','#A0522D','#c49a2c','#d4a017','#e8d5b7','#888','#cc4444'];
const TEAMS_BY_DIV = {
  'AL East':  ['Yankees','Red Sox','Blue Jays','Rays','Orioles'],
  'AL Central':['Guardians','White Sox','Tigers','Twins','Royals'],
  'AL West':  ['Astros','Athletics','Angels','Mariners','Rangers'],
  'NL East':  ['Mets','Braves','Phillies','Marlins','Nationals'],
  'NL Central':['Cubs','Cardinals','Brewers','Reds','Pirates'],
  'NL West':  ['Dodgers','Giants','Padres','Rockies','Diamondbacks'],
};
const ALL_TEAMS = Object.values(TEAMS_BY_DIV).flat();
const ATTR_LIST = [
  { key:'speed',    label:'Speed',       desc:'Stolen bases, triples' },
  { key:'power',    label:'Power',       desc:'Home runs, extra bases' },
  { key:'contact',  label:'Contact',     desc:'Batting average, hits' },
  { key:'fielding', label:'Fielding',    desc:'Defense, errors' },
  { key:'arm',      label:'Arm Strength',desc:'Throws, runners tagged' },
  { key:'stamina',  label:'Stamina',     desc:'Games played, injury resist' },
  { key:'pitching', label:'Pitching',    desc:'ERA, strikeouts (pitchers)' },
];
const DRAMA_EVENTS = [
  { id:1, title:'Teammate Blames You', text:'After a tough loss, your veteran teammate points the finger at you in front of the press.', choices:[{label:'Apologize publicly',effect:{morale:-5,coins:0,contact:0}},{label:'Clap back',effect:{morale:+10,coins:0,arm:+1}},{label:'Stay silent',effect:{morale:0,coins:50}}] },
  { id:2, title:'Trade Rumors', text:'Your agent calls — three teams are interested. The press is at your locker every day.', choices:[{label:'Request trade',effect:{coins:500,morale:+10}},{label:'Pledge loyalty',effect:{morale:+15,speed:+1}},{label:'No comment',effect:{coins:200}}] },
  { id:3, title:'Social Media Beef', text:'A pitcher you K\'d posts a meme mocking you. It goes viral.', choices:[{label:'Post highlight reel',effect:{coins:300,power:+1}},{label:'Challenge him to HR derby',effect:{morale:+20,coins:100}},{label:'Ignore it',effect:{contact:+1}}] },
  { id:4, title:'Stolen Equipment', text:'Your custom bat is missing before a big game. Clubhouse is tense.', choices:[{label:'Use backup bat',effect:{power:-2,coins:0}},{label:'Accuse clubhouse staff',effect:{morale:-15}},{label:'Buy new bat (500 coins)',effect:{power:0},cost:500}] },
  { id:5, title:'Rookie Hazing', text:'Veterans demand you sing at dinner. It\'s tradition — or is it?', choices:[{label:'Sing with pride',effect:{morale:+20,coins:100}},{label:'Refuse',effect:{morale:-10,arm:+1}},{label:'Do it but roast them back',effect:{morale:+30}}] },
  { id:6, title:'Slump', text:'You\'re 2-for-30. The coach pulls you aside.', choices:[{label:'Extra BP every day',effect:{contact:+2,stamina:-1}},{label:'Mental coach sessions',effect:{morale:+15,contact:+1}},{label:'Trust the process',effect:{coins:0}}] },
];

/* ── Style tokens ──────────────────────────────────────────── */
const S = {
  page:  { padding:'20px', maxWidth:'800px', margin:'0 auto', color:'#c0d0ff', fontFamily:"'Space Mono', monospace" },
  card:  { background:'rgba(0,0,40,0.7)', border:'1px solid rgba(0,255,255,0.18)', borderRadius:'12px', padding:'20px', marginBottom:'16px' },
  hdr:   { color:'var(--color-cyan)', fontWeight:900, fontSize:'1.15rem', margin:'0 0 14px' },
  btn:   { padding:'10px 20px', background:'rgba(0,255,255,0.1)', border:'1px solid rgba(0,255,255,0.4)', color:'var(--color-cyan)', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'0.88rem', transition:'all 0.15s' },
  btnRed:{ padding:'10px 20px', background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.4)', color:'#ff8080', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'0.88rem' },
  btnGold:{padding:'10px 20px', background:'rgba(255,215,0,0.12)', border:'1px solid rgba(255,215,0,0.5)', color:'#ffd700', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'0.88rem' },
  inp:   { padding:'10px', background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.2)', color:'#c0d0ff', borderRadius:'6px', width:'100%', boxSizing:'border-box', fontSize:'0.9rem' },
  sel:   { padding:'10px', background:'rgba(0,0,40,0.8)', border:'1px solid rgba(0,255,255,0.2)', color:'#c0d0ff', borderRadius:'6px', width:'100%', boxSizing:'border-box', fontSize:'0.9rem' },
  row:   { display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'12px' },
  label: { display:'block', fontSize:'0.72rem', color:'rgba(192,208,255,0.55)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' },
  stat:  { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(0,255,255,0.07)', fontSize:'0.85rem' },
  bar:   (pct,col='#00ffff') => ({ height:'8px', background:col, borderRadius:'4px', width:`${pct}%`, transition:'width 0.4s' }),
  barBg: { height:'8px', background:'rgba(0,255,255,0.1)', borderRadius:'4px', flex:1, overflow:'hidden', margin:'0 10px' },
};

/* ── Attr bar ──────────────────────────────────────────────── */
const AttrBar = ({ label, val, max=99, color='#00ffff', extra }) => (
  <div style={{ marginBottom:'10px' }}>
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
      <span style={{ fontSize:'0.8rem', color:'rgba(192,208,255,0.7)' }}>{label}</span>
      <span style={{ fontSize:'0.8rem', color:color, fontWeight:700 }}>{val}{extra}</span>
    </div>
    <div style={S.barBg}><div style={S.bar((val/max)*100, color)} /></div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   SCREEN: HOME
══════════════════════════════════════════════════════════ */
const HomeScreen = ({ onNew, onContinue, hasSave }) => (
  <div style={{ textAlign:'center', padding:'40px 20px' }}>
    <div style={{ fontSize:'3rem', marginBottom:'10px' }}>⚾</div>
    <h1 style={{ fontSize:'2rem', fontWeight:900, color:'var(--color-cyan)', margin:'0 0 6px' }}>Road to the Show</h1>
    <p style={{ color:'rgba(192,208,255,0.5)', marginBottom:'40px' }}>Your career. Your legacy.</p>
    <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
      {hasSave && <button style={S.btn} onClick={onContinue}>Continue Career</button>}
      <button style={S.btnGold} onClick={onNew}>{hasSave ? 'New Career' : 'Start Career'}</button>
    </div>
    {hasSave && <p style={{ color:'rgba(192,208,255,0.3)', fontSize:'0.75rem', marginTop:'20px' }}>Starting a new career will overwrite your current save.</p>}
  </div>
);

/* ══════════════════════════════════════════════════════════
   SCREEN: PLAYER CREATION
══════════════════════════════════════════════════════════ */
const CreationScreen = ({ onDone }) => {
  const [form, setForm] = useState({ name:'', position:'SS', college:'Florida', jersey:24, weight:185, skinTone:'#D4A574', hairColor:'#1a1a1a' });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const valid = form.name.trim().length >= 2;
  return (
    <div>
      <div style={S.card}>
        <h2 style={S.hdr}>Create Your Player</h2>
        <div style={S.row}>
          <div style={{ flex:2 }}>
            <label style={S.label}>Player Name</label>
            <input style={S.inp} value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. Marcus Rivera" />
          </div>
          <div style={{ flex:1 }}>
            <label style={S.label}>Jersey #</label>
            <input style={S.inp} type="number" min={1} max={99} value={form.jersey} onChange={e=>f('jersey',parseInt(e.target.value)||1)} />
          </div>
        </div>
        <div style={S.row}>
          <div style={{ flex:1 }}>
            <label style={S.label}>Position</label>
            <select style={S.sel} value={form.position} onChange={e=>f('position',e.target.value)}>
              {POSITIONS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label style={S.label}>Weight (lbs)</label>
            <input style={S.inp} type="number" min={140} max={280} value={form.weight} onChange={e=>f('weight',parseInt(e.target.value)||185)} />
          </div>
          <div style={{ flex:2 }}>
            <label style={S.label}>College</label>
            <select style={S.sel} value={form.college} onChange={e=>f('college',e.target.value)}>
              {COLLEGES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={S.row}>
          <div style={{ flex:1 }}>
            <label style={S.label}>Skin Tone</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {SKIN_TONES.map(c=>(
                <button key={c} onClick={()=>f('skinTone',c)} style={{ width:'32px', height:'32px', borderRadius:'50%', background:c, border:`3px solid ${form.skinTone===c?'var(--color-cyan)':'transparent'}`, cursor:'pointer', flexShrink:0 }} />
              ))}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <label style={S.label}>Hair Color</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {HAIR_COLORS.map(c=>(
                <button key={c} onClick={()=>f('hairColor',c)} style={{ width:'32px', height:'32px', borderRadius:'50%', background:c, border:`3px solid ${form.hairColor===c?'var(--color-cyan)':'transparent'}`, cursor:'pointer', flexShrink:0 }} />
              ))}
            </div>
          </div>
        </div>
        {/* Player preview */}
        <div style={{ textAlign:'center', margin:'16px 0' }}>
          <svg width="80" height="100" viewBox="0 0 80 100">
            <circle cx="40" cy="22" r="16" fill={form.skinTone} />
            <ellipse cx="40" cy="18" rx="16" ry="8" fill={form.hairColor} />
            <rect x="18" y="38" width="44" height="40" rx="6" fill="#0033aa" />
            <text x="40" y="64" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">#{form.jersey}</text>
            <rect x="22" y="78" width="14" height="22" rx="4" fill="#1a1a3a" />
            <rect x="44" y="78" width="14" height="22" rx="4" fill="#1a1a3a" />
          </svg>
          <p style={{ margin:'6px 0 0', color:'rgba(192,208,255,0.6)', fontSize:'0.8rem' }}>{form.name||'Player'} • #{form.jersey} • {form.position}</p>
        </div>
        <button style={{ ...S.btnGold, width:'100%', padding:'14px', marginTop:'8px', opacity:valid?1:0.4 }}
          onClick={() => valid && onDone(form)}>
          Proceed to MLB Combine →
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MINI GAME: KEY SPAM
══════════════════════════════════════════════════════════ */
const KeySpamGame = ({ duration=5, label='Spam any key!', onDone }) => {
  const [count, setCount]     = useState(0);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft]= useState(duration);
  const [done, setDone]       = useState(false);
  const countRef  = useRef(0);
  const timerRef  = useRef(null);

  const start = () => {
    setCount(0); countRef.current=0; setTimeLeft(duration); setRunning(true); setDone(false);
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{ if(t<=1){ clearInterval(timerRef.current); setRunning(false); setDone(true); return 0; } return t-1; });
    },1000);
  };

  useEffect(()=>{
    if(!running) return;
    const handler = ()=>{ countRef.current++; setCount(countRef.current); };
    window.addEventListener('keydown', handler);
    window.addEventListener('pointerdown', handler);
    return ()=>{ window.removeEventListener('keydown',handler); window.removeEventListener('pointerdown',handler); };
  },[running]);

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const pct = Math.min(100,(count/200)*100);
  const grade = count>160?'S':count>130?'A':count>100?'B':count>70?'C':'D';
  const gradeColor = {S:'#ffd700',A:'#00ff88',B:'#00ffff',C:'#ff9900',D:'#ff4444'}[grade];

  return (
    <div style={{ textAlign:'center' }}>
      <p style={{ color:'rgba(192,208,255,0.7)', marginBottom:'16px' }}>{label}</p>
      {!running && !done && <button style={{...S.btnGold, padding:'16px 40px', fontSize:'1rem'}} onClick={start}>Start!</button>}
      {running && (
        <>
          <div style={{ fontSize:'4rem', fontWeight:900, color:'var(--color-cyan)', lineHeight:1 }}>{count}</div>
          <div style={{ fontSize:'1.2rem', color:'#ff9900', marginBottom:'16px' }}>{timeLeft}s</div>
          <div style={S.barBg}><div style={S.bar(pct)} /></div>
          <p style={{ color:'rgba(192,208,255,0.4)', marginTop:'12px', fontSize:'0.8rem' }}>Tap anywhere or press any key!</p>
        </>
      )}
      {done && (
        <>
          <div style={{ fontSize:'4rem', fontWeight:900, color:gradeColor }}>{count}</div>
          <div style={{ fontSize:'2rem', color:gradeColor, marginBottom:'8px' }}>Grade: {grade}</div>
          <p style={{ color:'rgba(192,208,255,0.5)', marginBottom:'20px' }}>keystrokes in {duration} seconds</p>
          <button style={S.btn} onClick={()=>onDone(count, grade)}>Continue</button>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SCREEN: COMBINE
══════════════════════════════════════════════════════════ */
const CombineScreen = ({ player, onDone }) => {
  const [drill, setDrill] = useState(0); // 0=60yd 1=batting 2=throwing 3=done
  const [results, setResults] = useState([]);

  const drills = [
    { name:'60-Yard Dash', desc:'Sprint — spam to run faster!', duration:5, attr:'speed', label:'Sprint! Press any key as fast as you can!' },
    { name:'Batting Cage', desc:'Time your swings — spam for contact!', duration:5, attr:'contact', label:'Swing! Time your reps in the cage!' },
    { name:'Throwing Accuracy', desc:'Fire strikes — spam for arm strength!', duration:5, attr:'arm', label:'Fire it! Throw as many as you can!' },
  ];

  const handleDrillDone = (count, grade) => {
    const gradeVal = {S:95,A:85,B:75,C:65,D:55}[grade];
    const newResults = [...results, { drill:drills[drill].name, count, grade, val:gradeVal }];
    setResults(newResults);
    if (drill < drills.length-1) setDrill(d=>d+1);
    else setDrill(3);
  };

  if (drill === 3) {
    const overall = Math.round(results.reduce((s,r)=>s+r.val,0)/results.length);
    const draftPos = overall>90?1:overall>82?5:overall>75?15:overall>68?50:100;
    return (
      <div style={S.card}>
        <h2 style={S.hdr}>Combine Results</h2>
        {results.map(r=>(
          <div key={r.drill} style={S.stat}>
            <span>{r.drill}</span>
            <span style={{ color:{S:'#ffd700',A:'#00ff88',B:'#00ffff',C:'#ff9900',D:'#ff4444'}[r.grade], fontWeight:700 }}>{r.grade} ({r.count} reps)</span>
          </div>
        ))}
        <div style={{ ...S.card, marginTop:'16px', textAlign:'center', background:'rgba(0,255,200,0.05)', border:'1px solid rgba(0,255,200,0.2)' }}>
          <div style={{ fontSize:'2.5rem', fontWeight:900, color:'var(--color-cyan)' }}>{overall}</div>
          <div style={{ color:'rgba(192,208,255,0.6)' }}>Starting Overall</div>
          <div style={{ marginTop:'10px', color:'#ffd700', fontWeight:700 }}>Draft Position #{draftPos}</div>
          <div style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.8rem', marginTop:'4px' }}>
            {draftPos===1?'#1 Pick!':draftPos<=5?'Top 5 pick!':draftPos<=15?'Lottery pick':draftPos<=50?'First round':'Late round gem'}
          </div>
        </div>
        <button style={{...S.btnGold, width:'100%', marginTop:'12px'}} onClick={()=>onDone(overall, draftPos, results)}>
          Draft Day →
        </button>
      </div>
    );
  }

  const d = drills[drill];
  return (
    <div style={S.card}>
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {drills.map((dr,i)=>(
          <div key={i} style={{ flex:1, textAlign:'center', padding:'8px', borderRadius:'6px', background:i<drill?'rgba(0,255,100,0.1)':i===drill?'rgba(0,255,255,0.1)':'rgba(0,0,0,0.2)', border:`1px solid ${i<drill?'rgba(0,255,100,0.3)':i===drill?'rgba(0,255,255,0.3)':'rgba(100,120,200,0.15)'}`, fontSize:'0.75rem', color: i<=drill?'#c0d0ff':'rgba(192,208,255,0.3)' }}>
            {i<drill?'Done':i===drill?'NOW':dr.name.split(' ')[0]}
          </div>
        ))}
      </div>
      <h3 style={{ color:'var(--color-cyan)', marginBottom:'4px' }}>Drill {drill+1}: {d.name}</h3>
      <p style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.85rem', marginBottom:'20px' }}>{d.desc}</p>
      <KeySpamGame duration={d.duration} label={d.label} onDone={handleDrillDone} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SCREEN: DRAFT DAY
══════════════════════════════════════════════════════════ */
const DraftScreen = ({ player, draftPos, overall, combineResults, onDone }) => {
  const [revealed, setRevealed] = useState(false);
  const team = ALL_TEAMS[(draftPos - 1) % ALL_TEAMS.length];

  const initAttrs = () => {
    const base = Math.max(50, overall - 20);
    const isPitcher = ['SP','RP'].includes(player.position);
    return {
      speed:   Math.min(99, base + Math.round(Math.random()*10) + (combineResults[0]?.val||70)/10),
      power:   Math.min(99, base + Math.round(Math.random()*10)),
      contact: Math.min(99, base + Math.round(Math.random()*10) + (combineResults[1]?.val||70)/10),
      fielding:Math.min(99, base + Math.round(Math.random()*10)),
      arm:     Math.min(99, base + Math.round(Math.random()*10) + (combineResults[2]?.val||70)/10),
      stamina: Math.min(99, base + Math.round(Math.random()*10)),
      pitching:isPitcher ? Math.min(99, base + 15 + Math.round(Math.random()*10)) : Math.min(60, base - 10),
    };
  };

  return (
    <div style={{ textAlign:'center' }}>
      <div style={S.card}>
        {!revealed ? (
          <>
            <div style={{ fontSize:'4rem', marginBottom:'16px' }}>🎙️</div>
            <p style={{ color:'var(--color-cyan)', fontSize:'1.1rem', fontWeight:700, marginBottom:'8px' }}>
              "With the #{draftPos} pick in the MLB Draft..."
            </p>
            <p style={{ color:'rgba(192,208,255,0.6)', marginBottom:'24px' }}>
              ...the organization selects...
            </p>
            <button style={{...S.btnGold, padding:'16px 40px', fontSize:'1rem'}} onClick={()=>setRevealed(true)}>
              Reveal
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:'3rem', marginBottom:'10px' }}>🎊</div>
            <div style={{ fontSize:'1.8rem', fontWeight:900, color:'#ffd700', marginBottom:'4px' }}>{player.name}</div>
            <div style={{ color:'var(--color-cyan)', fontSize:'1.1rem', marginBottom:'16px' }}>#{draftPos} Pick • {player.position} • {team}</div>
            <div style={{ ...S.card, background:'rgba(0,50,0,0.2)', border:'1px solid rgba(0,255,100,0.2)', textAlign:'left' }}>
              <div style={{ textAlign:'center', marginBottom:'10px', fontSize:'1.4rem', fontWeight:900, color:'#00ff88' }}>{overall} OVR</div>
              {initAttrs && Object.entries(initAttrs()).map(([k,v])=>(
                <AttrBar key={k} label={ATTR_LIST.find(a=>a.key===k)?.label||k} val={Math.round(v)} />
              ))}
            </div>
            <button style={{...S.btnGold, width:'100%', marginTop:'8px'}}
              onClick={()=>onDone(team, Math.round(overall), initAttrs())}>
              Begin Your Career →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SCREEN: CAREER HUB
══════════════════════════════════════════════════════════ */
const CareerHub = ({ career, setCareer, username, coins, setCoins, onGame }) => {
  const [tab, setTab] = useState('home');
  const p = career.player;
  const s = career.seasonStats;
  const upgradeAttr = (attr) => {
    const cost = 100;
    if (!spendCoins(username, cost)) { alert('Not enough coins!'); return; }
    setCoins(getCoins(username));
    setCareer(prev => {
      const updated = { ...prev, player: { ...prev.player, attrs: { ...prev.player.attrs, [attr]: Math.min(99, (prev.player.attrs[attr]||60)+1) } } };
      saveCareer(username, updated);
      return updated;
    });
  };

  const tabs = [
    { id:'home',    label:'Home'       },
    { id:'attrs',   label:'Upgrades'   },
    { id:'stats',   label:'Stats'      },
    { id:'quickness',label:'Quickness' },
    { id:'schedule',label:'Schedule'   },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ ...S.card, background:'linear-gradient(135deg,rgba(0,20,60,0.9),rgba(0,0,40,0.9))', display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
        <svg width="60" height="70" viewBox="0 0 80 100" style={{ flexShrink:0 }}>
          <circle cx="40" cy="22" r="16" fill={p.skinTone} />
          <ellipse cx="40" cy="18" rx="16" ry="8" fill={p.hairColor} />
          <rect x="18" y="38" width="44" height="40" rx="6" fill="#0033aa" />
          <text x="40" y="64" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">#{p.jersey}</text>
          <rect x="22" y="78" width="14" height="22" rx="4" fill="#1a1a3a" />
          <rect x="44" y="78" width="14" height="22" rx="4" fill="#1a1a3a" />
        </svg>
        <div>
          <div style={{ fontSize:'1.2rem', fontWeight:900, color:'#e7e9ea' }}>{p.name}</div>
          <div style={{ color:'rgba(192,208,255,0.55)', fontSize:'0.85rem' }}>#{p.jersey} • {p.position} • {career.team}</div>
          <div style={{ display:'flex', gap:'16px', marginTop:'6px', flexWrap:'wrap' }}>
            <span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{career.overall} OVR</span>
            <span style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.82rem' }}>Year {career.year} • Age {20+career.year}</span>
            <span style={{ color:'#ffd700', fontSize:'0.82rem' }}>Coins: {coins}</span>
          </div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'right' }}>
          <div style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.72rem' }}>SEASON</div>
          <div style={{ fontSize:'0.85rem' }}>{career.wins}W – {career.losses}L</div>
          <div style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.72rem', marginTop:'4px' }}>
            Game {career.gamesPlayed || 0} / 162
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', overflowX:'auto' }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ ...S.btn, flex:1, minWidth:'80px', borderColor: tab===t.id?'var(--color-cyan)':'rgba(0,255,255,0.15)', background: tab===t.id?'rgba(0,255,255,0.12)':'rgba(0,255,255,0.04)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Home tab */}
      {tab==='home' && (
        <div>
          <div style={{ ...S.card, textAlign:'center' }}>
            <h3 style={{ color:'var(--color-cyan)', marginBottom:'16px' }}>Next Game</h3>
            <div style={{ fontSize:'1rem', color:'#c0d0ff', marginBottom:'4px' }}>
              {career.team} vs {career.nextOpponent || ALL_TEAMS[Math.floor(Math.random()*30)]}
            </div>
            <div style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.8rem', marginBottom:'20px' }}>
              Game {(career.gamesPlayed||0)+1} — Regular Season
            </div>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
              <button style={{...S.btnGold, padding:'14px 28px'}} onClick={()=>onGame('play')}>Play Game</button>
              <button style={S.btn} onClick={()=>onGame('simulate')}>Simulate</button>
            </div>
          </div>
          {career.lastRecap && (
            <div style={S.card}>
              <h3 style={{ color:'rgba(192,208,255,0.6)', marginBottom:'12px', fontSize:'0.9rem' }}>Last Game Recap</h3>
              <div style={{ display:'flex', gap:'16px', marginBottom:'12px', fontSize:'0.85rem', flexWrap:'wrap' }}>
                <span>{career.lastRecap.result}</span>
                <span style={{ color:'rgba(192,208,255,0.4)' }}>{career.lastRecap.score}</span>
              </div>
              <p style={{ color:'rgba(192,208,255,0.6)', fontSize:'0.83rem', lineHeight:1.6, margin:0 }}>{career.lastRecap.narrative}</p>
            </div>
          )}
        </div>
      )}

      {/* Attrs/upgrades tab */}
      {tab==='attrs' && (
        <div style={S.card}>
          <h3 style={S.hdr}>Upgrade Attributes</h3>
          <p style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.8rem', marginBottom:'16px' }}>100 coins per +1 • Max 99</p>
          {ATTR_LIST.map(a=>(
            <div key={a.key} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
              <span style={{ minWidth:'100px', fontSize:'0.8rem', color:'rgba(192,208,255,0.7)' }}>{a.label}</span>
              <div style={S.barBg}><div style={S.bar(((p.attrs[a.key]||60)/99)*100)} /></div>
              <span style={{ minWidth:'28px', textAlign:'center', color:'var(--color-cyan)', fontWeight:700, fontSize:'0.85rem' }}>{p.attrs[a.key]||60}</span>
              <button
                onClick={()=>upgradeAttr(a.key)}
                disabled={p.attrs[a.key]>=99 || coins<100}
                style={{ ...S.btn, padding:'4px 10px', fontSize:'0.75rem', opacity:(p.attrs[a.key]>=99||coins<100)?0.4:1, minWidth:'60px' }}>
                +1 (100)
              </button>
            </div>
          ))}
          <div style={{ marginTop:'16px', color:'#ffd700', textAlign:'right', fontWeight:700 }}>
            Your Coins: {coins}
          </div>
        </div>
      )}

      {/* Stats tab */}
      {tab==='stats' && (
        <div style={S.card}>
          <h3 style={S.hdr}>Season Stats — Year {career.year}</h3>
          {['SP','RP'].includes(p.position) ? (
            <>
              {[['W-L',`${s.wins||0}-${s.losses||0}`],['ERA',(s.era||0).toFixed(2)],['IP',(s.ip||0).toFixed(1)],['K',s.k||0],['BB',s.bb||0],['WHIP',(s.whip||0).toFixed(2)]].map(([l,v])=>(
                <div key={l} style={S.stat}><span>{l}</span><span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{v}</span></div>
              ))}
            </>
          ) : (
            <>
              {[['AVG',(s.avg||0).toFixed(3)],['HR',s.hr||0],['RBI',s.rbi||0],['R',s.runs||0],['H',s.h||0],['SB',s.sb||0],['K',s.ks||0],['G',s.g||0]].map(([l,v])=>(
                <div key={l} style={S.stat}><span>{l}</span><span style={{ color:'var(--color-cyan)', fontWeight:700 }}>{v}</span></div>
              ))}
            </>
          )}
          <div style={{ marginTop:'16px', borderTop:'1px solid rgba(0,255,255,0.1)', paddingTop:'12px' }}>
            <div style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.72rem', marginBottom:'8px' }}>CAREER TOTALS</div>
            {['SP','RP'].includes(p.position) ? (
              <>
                {[['W',career.careerStats?.wins||0],['ERA',(career.careerStats?.era||0).toFixed(2)],['K',career.careerStats?.k||0]].map(([l,v])=>(
                  <div key={l} style={S.stat}><span>{l}</span><span style={{ color:'#ffd700', fontWeight:700 }}>{v}</span></div>
                ))}
              </>
            ) : (
              <>
                {[['HR',career.careerStats?.hr||0],['RBI',career.careerStats?.rbi||0],['AVG',(career.careerStats?.avg||0).toFixed(3)],['G',career.careerStats?.g||0]].map(([l,v])=>(
                  <div key={l} style={S.stat}><span>{l}</span><span style={{ color:'#ffd700', fontWeight:700 }}>{v}</span></div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Quickness mini-game */}
      {tab==='quickness' && (
        <div style={S.card}>
          <h3 style={S.hdr}>Test Your Quickness</h3>
          <p style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.85rem', marginBottom:'16px' }}>
            Score big to earn bonus coins and a speed boost for your next game!
          </p>
          <KeySpamGame duration={5} label="Spam to earn coins!" onDone={(count,grade)=>{
            const bonus = {S:300,A:200,B:100,C:50,D:25}[grade];
            addCoins(username, bonus);
            setCoins(getCoins(username));
            alert(`Grade ${grade}! You earned ${bonus} coins!`);
          }} />
        </div>
      )}

      {/* Schedule tab */}
      {tab==='schedule' && (
        <div style={S.card}>
          <h3 style={S.hdr}>Season Schedule</h3>
          <p style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.8rem', marginBottom:'12px' }}>
            {career.gamesPlayed||0} games played • {162-(career.gamesPlayed||0)} remaining
          </p>
          {Array.from({length:10},(_,i)=>{
            const gn = (career.gamesPlayed||0)+i+1;
            if(gn>162) return null;
            const opp = ALL_TEAMS[((career.gamesPlayed||0)+i+3)%30];
            return (
              <div key={i} style={{ ...S.stat, opacity: i===0?1:0.6 }}>
                <span style={{ color:i===0?'var(--color-cyan)':'rgba(192,208,255,0.6)' }}>Game {gn}</span>
                <span>vs {opp}</span>
                {i===0 && <span style={{ color:'#ffd700', fontSize:'0.75rem' }}>NEXT</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SCREEN: GAME PLAY
══════════════════════════════════════════════════════════ */
const GamePlayScreen = ({ career, mode, onDone }) => {
  const isPitcher = ['SP','RP'].includes(career.player.position);
  const attrs = career.player.attrs;

  if (mode === 'simulate') {
    const result = simulateGame(attrs, career.nextOpponent);
    return (
      <div style={{ textAlign:'center' }}>
        <div style={S.card}>
          <h2 style={{ color: result.win?'#00ff88':'#ff4444', fontWeight:900, fontSize:'1.8rem', margin:'0 0 8px' }}>
            {result.win ? 'W' : 'L'}
          </h2>
          <div style={{ fontSize:'1.2rem', color:'#c0d0ff', marginBottom:'20px' }}>{result.score}</div>
          <GameRecap recap={result} career={career} />
          <button style={{...S.btn, marginTop:'16px'}} onClick={()=>onDone(result)}>Continue</button>
        </div>
      </div>
    );
  }

  // Play mode: key spam game
  const [phase, setPhase] = useState('spam'); // spam → recap
  const [gameResult, setGameResult] = useState(null);

  const handleSpamDone = (count, grade) => {
    const result = simulateGame(attrs, career.nextOpponent, count);
    setGameResult(result);
    setPhase('recap');
  };

  return (
    <div style={S.card}>
      {phase === 'spam' ? (
        <>
          <h3 style={S.hdr}>{isPitcher ? 'Take the Mound' : 'Step to the Plate'}</h3>
          <p style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.85rem', marginBottom:'16px' }}>
            {isPitcher ? 'Spam to fire your best stuff!' : 'Spam to get your best cuts in!'}
          </p>
          <KeySpamGame duration={5} label={isPitcher?'Throw heat!':'Swing!'} onDone={handleSpamDone} />
        </>
      ) : (
        <>
          <GameRecap recap={gameResult} career={career} />
          <button style={{...S.btn, marginTop:'16px', width:'100%'}} onClick={()=>onDone(gameResult)}>Continue</button>
        </>
      )}
    </div>
  );
};

const GameRecap = ({ recap, career }) => (
  <div>
    <div style={{ display:'flex', justifyContent:'space-around', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
      {Object.entries(recap.playerStats||{}).map(([k,v])=>(
        <div key={k} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'1.3rem', fontWeight:900, color:'var(--color-cyan)' }}>{v}</div>
          <div style={{ fontSize:'0.7rem', color:'rgba(192,208,255,0.5)', textTransform:'uppercase' }}>{k}</div>
        </div>
      ))}
    </div>
    <p style={{ color:'rgba(192,208,255,0.65)', fontSize:'0.88rem', lineHeight:1.65, textAlign:'left', margin:0 }}>{recap.narrative}</p>
  </div>
);

function simulateGame(attrs, opponent, spamBonus=0) {
  const isPitcher = attrs.pitching > attrs.contact;
  const spamMult  = 1 + spamBonus/200;
  const skill     = isPitcher ? (attrs.pitching||70) : (attrs.contact||70);
  const eff       = Math.min(99, skill * spamMult);
  const win       = Math.random() < (eff/180 + 0.3);
  const myScore   = Math.floor(Math.random()*6) + (win?2:0);
  const theirScore= win ? Math.max(0,myScore-Math.floor(Math.random()*4)-1) : myScore + Math.floor(Math.random()*4)+1;
  const hr  = win&&Math.random()<0.3?Math.ceil(Math.random()*2):0;
  const rbi = hr + Math.floor(Math.random()*4);
  const sb  = Math.random()<(attrs.speed||70)/150?Math.ceil(Math.random()*2):0;
  const ks  = Math.floor(Math.random()*3);
  const h   = Math.floor(Math.random()*4)+(win?1:0);
  const narratives = win ? [
    `${hr>0?`You went deep ${hr===2?'twice':'once'} and `:''}drove in ${rbi} runs to help clinch the win.`,
    `A clutch hit in the 7th broke the tie. Your team never looked back.`,
    `${sb>0?`Your speed was on full display — ${sb} stolen base${sb>1?'s':''} and `:''}you sparked the offense early.`,
  ] : [
    `A tough outing. Left ${rbi} runners stranded and couldn't get the key hit.`,
    `Despite ${h>0?`going ${h}-for-4`:'a hitless game'}, the team fell short in the late innings.`,
    `The bullpen struggled to hold the lead. On to the next one.`,
  ];
  const pitchStats = {K: 5+Math.floor(Math.random()*7), IP: (5+Math.random()*3).toFixed(1), BB: Math.floor(Math.random()*3), ER: Math.floor(Math.random()*4)};
  const hitStats   = {HR:hr, RBI:rbi, H:h, SB:sb, K:ks};
  return {
    win, score:`${myScore}-${theirScore}`, opponent,
    playerStats: isPitcher ? pitchStats : hitStats,
    narrative: narratives[Math.floor(Math.random()*narratives.length)],
    isPitcher,
    raw:{hr,rbi,h,sb,ks,win,myScore,theirScore,...pitchStats},
  };
}

/* ══════════════════════════════════════════════════════════
   SCREEN: DRAMA EVENT
══════════════════════════════════════════════════════════ */
const DramaScreen = ({ event, username, career, onDone }) => {
  const [chosen, setChosen] = useState(null);
  const choose = (choice) => {
    if (choice.cost && !spendCoins(username, choice.cost)) { alert('Not enough coins!'); return; }
    if (choice.effect.coins > 0) addCoins(username, choice.effect.coins);
    setChosen(choice);
  };
  const effectSummary = (e) => Object.entries(e).filter(([k])=>k!=='coins').map(([k,v])=>`${v>0?'+':''} ${v} ${k}`).join(', ');
  return (
    <div style={S.card}>
      <div style={{ fontSize:'2rem', marginBottom:'8px' }}>⚡</div>
      <h2 style={{ color:'#ff9900', fontWeight:900, marginBottom:'8px' }}>{event.title}</h2>
      <p style={{ color:'rgba(192,208,255,0.75)', lineHeight:1.6, marginBottom:'20px' }}>{event.text}</p>
      {!chosen ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {event.choices.map((c,i)=>(
            <button key={i} onClick={()=>choose(c)} style={{ ...S.btn, textAlign:'left', padding:'14px 16px' }}>
              {String.fromCharCode(65+i)}) {c.label}{c.cost?` (-${c.cost} coins)`:''}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'1.5rem', marginBottom:'8px' }}>Done</div>
          <p style={{ color:'rgba(192,208,255,0.6)', marginBottom:'8px' }}>You chose: <strong style={{ color:'var(--color-cyan)' }}>{chosen.label}</strong></p>
          {Object.entries(chosen.effect).filter(([k,v])=>v!==0).length > 0 && (
            <p style={{ color:'#ffd700', fontSize:'0.85rem' }}>
              {chosen.effect.coins>0?`+${chosen.effect.coins} coins `:''}{effectSummary(chosen.effect)}
            </p>
          )}
          <button style={{...S.btn, marginTop:'16px'}} onClick={()=>onDone(chosen)}>Continue</button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SCREEN: CONTRACT NEGOTIATION
══════════════════════════════════════════════════════════ */
const ContractScreen = ({ career, username, onDone }) => {
  const [counter, setCounter] = useState({years:3, salary:500});
  const [phase, setPhase] = useState('offer');
  const [chosen, setChosen] = useState(null);

  const offers = Array.from({length:3},(_,i)=>{
    const baseTeam = ALL_TEAMS[(ALL_TEAMS.indexOf(career.team)+i*7)%30];
    const years = 1+Math.floor(Math.random()*5);
    const salary = (200+Math.floor(career.overall/5)*50+Math.floor(Math.random()*200));
    const role = career.overall>85?'Starter':career.overall>75?'Platoon':'Reserve';
    return { team:baseTeam, years, salary, role };
  });

  const sign = (offer) => {
    const totalCoins = offer.salary * offer.years;
    addCoins(username, totalCoins);
    setChosen(offer);
    setPhase('signed');
  };

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'20px' }}>
        <div style={{ fontSize:'2rem' }}>📝</div>
        <h2 style={{ color:'var(--color-cyan)', fontWeight:900 }}>Free Agency</h2>
        <p style={{ color:'rgba(192,208,255,0.5)' }}>You're a free agent. Review your offers.</p>
      </div>
      {phase==='offer' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {offers.map((o,i)=>(
            <div key={i} style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'10px' }}>
                <div>
                  <div style={{ fontWeight:700, color:'#e7e9ea', marginBottom:'4px' }}>{o.team}</div>
                  <div style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.82rem' }}>{o.years} yr • {o.role}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'#ffd700', fontWeight:700 }}>{o.salary} coins/yr</div>
                  <div style={{ color:'rgba(192,208,255,0.4)', fontSize:'0.75rem' }}>Total: {o.salary*o.years} coins</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                <button style={{...S.btnGold, flex:1}} onClick={()=>sign(o)}>Accept</button>
                <button style={{...S.btn, flex:1}} onClick={()=>setPhase('counter')}>Counter</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {phase==='counter' && (
        <div style={S.card}>
          <h3 style={S.hdr}>Counter Offer</h3>
          <div style={S.row}>
            <div style={{ flex:1 }}>
              <label style={S.label}>Years</label>
              <input style={S.inp} type="number" min={1} max={10} value={counter.years} onChange={e=>setCounter(p=>({...p,years:+e.target.value}))} />
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Salary (coins/yr)</label>
              <input style={S.inp} type="number" min={100} value={counter.salary} onChange={e=>setCounter(p=>({...p,salary:+e.target.value}))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button style={{...S.btnGold, flex:1}} onClick={()=>{
              const accepted = Math.random() < (counter.salary<800?0.8:0.4);
              if (accepted) sign({...offers[0], ...counter, team:offers[0].team});
              else { alert(`${offers[0].team} rejected your counter offer.`); setPhase('offer'); }
            }}>Send Counter</button>
            <button style={{...S.btn}} onClick={()=>setPhase('offer')}>Back</button>
          </div>
        </div>
      )}
      {phase==='signed' && chosen && (
        <div style={{ ...S.card, textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'10px' }}>🎉</div>
          <h2 style={{ color:'#ffd700' }}>Signed!</h2>
          <p style={{ color:'#c0d0ff' }}>{chosen.years} years • {chosen.salary} coins/yr</p>
          <p style={{ color:'#00ff88', fontWeight:700, fontSize:'1.1rem' }}>+{chosen.salary*chosen.years} coins added</p>
          <p style={{ color:'rgba(192,208,255,0.5)' }}>{chosen.team} • {chosen.role}</p>
          <button style={{...S.btnGold, marginTop:'16px'}} onClick={()=>onDone(chosen)}>Start Next Season</button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SEASON END
══════════════════════════════════════════════════════════ */
const SeasonEndScreen = ({ career, onContinue }) => {
  const s = career.seasonStats;
  const isPitcher = ['SP','RP'].includes(career.player.position);
  const playoffs  = career.wins >= 90;
  const ws        = career.wins >= 100 && Math.random() < 0.3;
  return (
    <div style={{ textAlign:'center' }}>
      <div style={S.card}>
        <div style={{ fontSize:'3rem', marginBottom:'10px' }}>{ws?'🏆':playoffs?'⚾':'📊'}</div>
        <h2 style={{ color: ws?'#ffd700':playoffs?'#00ff88':'var(--color-cyan)' }}>
          {ws?'World Series Champions!':playoffs?'Playoff Bound!':'Season Complete'}
        </h2>
        <p style={{ color:'rgba(192,208,255,0.5)', marginBottom:'20px' }}>Year {career.year} — {career.wins}W {career.losses}L</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
          {(isPitcher
            ? [['W',s.wins||0],['ERA',(s.era||0).toFixed(2)],['K',s.k||0]]
            : [['HR',s.hr||0],['RBI',s.rbi||0],['AVG',(s.avg||0).toFixed(3)]]
          ).map(([l,v])=>(
            <div key={l} style={{ background:'rgba(0,0,0,0.3)', borderRadius:'8px', padding:'12px' }}>
              <div style={{ fontSize:'1.4rem', fontWeight:900, color:'var(--color-cyan)' }}>{v}</div>
              <div style={{ fontSize:'0.7rem', color:'rgba(192,208,255,0.45)' }}>{l}</div>
            </div>
          ))}
        </div>
        {ws && <p style={{ color:'#ffd700', marginBottom:'16px' }}>You're a World Series Champion!</p>}
        <p style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.85rem', marginBottom:'20px' }}>Your contract is up. Time to negotiate a new deal.</p>
        <button style={{...S.btnGold, padding:'14px 30px'}} onClick={onContinue}>Contract Negotiations →</button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ROOT COMPONENT
══════════════════════════════════════════════════════════ */
export default function RoadToTheShow() {
  const { user } = useAuth();
  const username = user?.username || 'guest';
  const [coins, setCoins]   = useState(() => getCoins(username));
  const [screen, setScreen] = useState('home');
  const [career, setCareer] = useState(null);
  const [pendingDrama, setPendingDrama] = useState(null);
  const [gameMode, setGameMode] = useState('play');
  const [tempPlayer, setTempPlayer]     = useState(null);
  const [tempCombine, setTempCombine]   = useState(null);
  const [tempDraft, setTempDraft]       = useState(null);

  useEffect(() => {
    const saved = loadCareer(username);
    if (saved) setCareer(saved);
  }, [username]);

  const refreshCoins = () => setCoins(getCoins(username));

  const updateCareer = (updates) => {
    setCareer(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      saveCareer(username, next);
      return next;
    });
  };

  // New career flow
  const handleCreationDone = (player) => { setTempPlayer(player); setScreen('combine'); };
  const handleCombineDone  = (overall, draftPos, combineResults) => { setTempCombine({overall,draftPos,combineResults}); setScreen('draft'); };
  const handleDraftDone    = (team, overall, attrs) => {
    const newCareer = {
      player: { ...tempPlayer, attrs },
      team, overall,
      year:1, wins:0, losses:0, gamesPlayed:0,
      nextOpponent: ALL_TEAMS[Math.floor(Math.random()*30)],
      seasonStats: { hr:0,rbi:0,h:0,sb:0,ks:0,g:0,avg:0, wins:0,losses:0,era:0,ip:0,k:0,bb:0,whip:0 },
      careerStats:  { hr:0,rbi:0,avg:0,g:0, wins:0,k:0,era:0 },
      lastRecap: null,
    };
    saveCareer(username, newCareer);
    setCareer(newCareer);
    setScreen('career');
  };

  // Game play
  const handleGameStart = (mode) => { setGameMode(mode); setScreen('game'); };
  const handleGameDone  = (result) => {
    const isPitcher = ['SP','RP'].includes(career.player.position);
    const gp = (career.gamesPlayed||0)+1;
    const wins    = career.wins + (result.win?1:0);
    const losses  = career.losses + (result.win?0:1);
    const r = result.raw;
    const coinBonus = result.win ? 150 : 50;
    addCoins(username, coinBonus); refreshCoins();

    const nextOpp = ALL_TEAMS[Math.floor(Math.random()*30)];
    const newRecap = { result:result.win?'WIN':'LOSS', score:result.score, narrative:result.narrative };

    // Update season stats
    updateCareer(prev => {
      const s = { ...prev.seasonStats };
      if (isPitcher) {
        s.wins = (s.wins||0)+(result.win?1:0); s.losses=(s.losses||0)+(result.win?0:1);
        s.k=(s.k||0)+(r.K||0); s.bb=(s.bb||0)+(r.BB||0); s.ip=(s.ip||0)+(parseFloat(r.IP)||0);
        s.era = s.ip>0 ? ((s.losses||0)*9/s.ip).toFixed(2)*1 : 0;
        s.whip= s.ip>0 ? (((s.bb||0)+(s.k||0))/s.ip).toFixed(2)*1 : 0;
      } else {
        s.hr=(s.hr||0)+(r.hr||0); s.rbi=(s.rbi||0)+(r.rbi||0); s.h=(s.h||0)+(r.h||0);
        s.sb=(s.sb||0)+(r.sb||0); s.ks=(s.ks||0)+(r.ks||0); s.g=(s.g||0)+1;
        const totalAB = (s.g||1)*3.5;
        s.avg = totalAB>0 ? parseFloat((s.h/totalAB).toFixed(3)) : 0;
      }
      return { ...prev, wins, losses, gamesPlayed:gp, nextOpponent:nextOpp, seasonStats:s, lastRecap:newRecap };
    });

    // Random drama event ~every 15 games
    if (gp>0 && gp%15===0) {
      const evt = DRAMA_EVENTS[Math.floor(Math.random()*DRAMA_EVENTS.length)];
      setPendingDrama(evt);
      setScreen('drama');
    } else if (gp >= 162) {
      setScreen('seasonend');
    } else {
      setScreen('career');
    }
  };

  const handleDramaDone = () => {
    setPendingDrama(null);
    if ((career.gamesPlayed||0) >= 162) setScreen('seasonend');
    else setScreen('career');
  };

  const handleSeasonEnd = () => setScreen('contract');
  const handleContractDone = (offer) => {
    refreshCoins();
    updateCareer(prev => {
      const cs = { ...prev.careerStats };
      const s  = prev.seasonStats;
      cs.hr = (cs.hr||0)+(s.hr||0); cs.rbi=(cs.rbi||0)+(s.rbi||0);
      cs.g  = (cs.g||0)+(s.g||0);
      const totalAB = (cs.g||1)*3.5;
      cs.avg = parseFloat((cs.hr/Math.max(1,totalAB)).toFixed(3));
      cs.wins=(cs.wins||0)+(s.wins||0); cs.k=(cs.k||0)+(s.k||0);
      return {
        ...prev, team:offer.team, year:(prev.year||1)+1,
        wins:0, losses:0, gamesPlayed:0,
        nextOpponent: ALL_TEAMS[Math.floor(Math.random()*30)],
        seasonStats:{ hr:0,rbi:0,h:0,sb:0,ks:0,g:0,avg:0, wins:0,losses:0,era:0,ip:0,k:0,bb:0,whip:0 },
        careerStats: cs, lastRecap:null,
      };
    });
    setScreen('career');
  };

  return (
    <div style={S.page}>
      {/* Screen back button */}
      {screen !== 'home' && screen !== 'career' && (
        <button style={{ ...S.btn, marginBottom:'16px', fontSize:'0.8rem', padding:'6px 14px' }} onClick={()=>setScreen(career?'career':'home')}>
          ← Back
        </button>
      )}

      {screen === 'home'      && <HomeScreen onNew={()=>setScreen('creation')} onContinue={()=>setScreen('career')} hasSave={!!career} />}
      {screen === 'creation'  && <CreationScreen onDone={handleCreationDone} />}
      {screen === 'combine'   && <CombineScreen player={tempPlayer} onDone={handleCombineDone} />}
      {screen === 'draft'     && <DraftScreen player={tempPlayer} overall={tempCombine?.overall} draftPos={tempCombine?.draftPos} combineResults={tempCombine?.combineResults||[]} onDone={handleDraftDone} />}
      {screen === 'career'    && career && <CareerHub career={career} setCareer={setCareer} username={username} coins={coins} setCoins={setCoins} onGame={handleGameStart} />}
      {screen === 'game'      && career && <GamePlayScreen career={career} mode={gameMode} onDone={handleGameDone} />}
      {screen === 'drama'     && pendingDrama && <DramaScreen event={pendingDrama} username={username} career={career} onDone={handleDramaDone} />}
      {screen === 'seasonend' && career && <SeasonEndScreen career={career} onContinue={handleSeasonEnd} />}
      {screen === 'contract'  && career && <ContractScreen career={career} username={username} onDone={handleContractDone} />}
    </div>
  );
}
