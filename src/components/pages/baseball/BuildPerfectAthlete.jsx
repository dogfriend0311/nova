import React, { useMemo, useState, useCallback, useEffect } from 'react';
import './perfectAthlete.css';
import { PERFECT_ATHLETE_SPORTS, getTierForOvr } from '../../../data/perfectAthleteData';
import { getPlayers, listBuilds, saveBuild, deleteBuild } from '../../../services/perfectAthleteService';

const SPIN_TICKS = 20;
const SPIN_TICK_MS = 75;

function randomPlayer(players) {
  return players[Math.floor(Math.random() * players.length)];
}

function careerBlurb(sport, ovr, tier, slots) {
  const filled = Object.entries(slots).filter(([, s]) => s);
  if (!filled.length) return '';
  const best = filled.reduce((a, b) => (b[1].value > a[1].value ? b : a));
  const bestAttr = sport.attributes.find((a) => a.id === best[0])?.label || best[0];
  const rookieYear = 2019 + (ovr % 6);
  return `Drafted out of nowhere in ${rookieYear}, this ${sport.unit} build became known for elite ${bestAttr.toLowerCase()} `
    + `(a ${best[1].value} straight from ${best[1].playerName}'s own game). ${tier.blurb} `
    + `Final scouting grade: ${tier.grade} — ${ovr} OVR.`;
}

export default function BuildPerfectAthlete({ user }) {
  const [sportKey, setSportKey] = useState(PERFECT_ATHLETE_SPORTS[0].key);
  const [slotsBySport, setSlotsBySport] = useState({});
  const [spinningSlot, setSpinningSlot] = useState(null);
  const [reelName, setReelName] = useState('');
  const [builds, setBuilds] = useState(() => listBuilds(PERFECT_ATHLETE_SPORTS[0].key));
  const [saveMsg, setSaveMsg] = useState('');

  const sport = useMemo(() => PERFECT_ATHLETE_SPORTS.find((s) => s.key === sportKey), [sportKey]);
  const players = useMemo(() => getPlayers(sportKey), [sportKey]);
  const slots = slotsBySport[sportKey] || {};

  useEffect(() => { setBuilds(listBuilds(sportKey)); }, [sportKey]);

  const filledCount = sport.attributes.filter((a) => slots[a.id]).length;
  const allFilled = filledCount === sport.attributes.length;
  const ovr = filledCount
    ? Math.round(sport.attributes.reduce((sum, a) => sum + (slots[a.id]?.value || 0), 0) / filledCount)
    : 0;
  const tier = getTierForOvr(ovr || 0);

  const setSlot = useCallback((attrId, value) => {
    setSlotsBySport((prev) => ({
      ...prev,
      [sportKey]: { ...(prev[sportKey] || {}), [attrId]: value },
    }));
  }, [sportKey]);

  const spinSlot = useCallback((attrId) => new Promise((resolve) => {
    setSpinningSlot(attrId);
    let tick = 0;
    const timer = setInterval(() => {
      setReelName(randomPlayer(players).name);
      tick += 1;
      if (tick >= SPIN_TICKS) {
        clearInterval(timer);
        const winner = randomPlayer(players);
        setSlot(attrId, { value: winner.ratings[attrId], playerName: winner.name, playerId: winner.id });
        setSpinningSlot(null);
        resolve();
      }
    }, SPIN_TICK_MS);
  }), [players, setSlot]);

  const spinAllEmpty = async () => {
    for (const attr of sport.attributes) {
      if (!slots[attr.id]) {
        // eslint-disable-next-line no-await-in-loop
        await spinSlot(attr.id);
      }
    }
  };

  const resetBuild = () => {
    setSlotsBySport((prev) => ({ ...prev, [sportKey]: {} }));
    setSaveMsg('');
  };

  const handleSave = () => {
    if (!allFilled) return;
    saveBuild({
      sportKey,
      sportLabel: sport.label,
      ovr,
      tierLabel: tier.label,
      grade: tier.grade,
      slots,
      builtBy: user?.username || 'Guest',
    });
    setBuilds(listBuilds(sportKey));
    setSaveMsg('Build saved to your Hall of Fame.');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleDelete = (id) => {
    deleteBuild(id);
    setBuilds(listBuilds(sportKey));
  };

  return (
    <div className="pa-wrap">
      <div className="pa-header">
        <div className="eyebrow">GOATLAB-STYLE SIMULATION</div>
        <h1>🐐 Build the Perfect Athlete</h1>
        <p>Pick a sport, spin the reel for every attribute, and draft real pros' ratings into your build. Fill every slot — can you hit a 99 OVR?</p>
      </div>

      <div className="pa-sport-picker">
        {PERFECT_ATHLETE_SPORTS.map((s) => (
          <button
            key={s.key}
            className={`pa-sport-btn ${s.key === sportKey ? 'active' : ''}`}
            onClick={() => setSportKey(s.key)}
          >
            <span className="em">{s.emoji}</span>{s.unit} · {s.label}
          </button>
        ))}
      </div>

      <div className="pa-grid">
        <div className="pa-slots-card">
          <div className="pa-card-title">
            <span>{sport.unit} ATTRIBUTE SLOTS</span>
            <span>{filledCount}/{sport.attributes.length} filled</span>
          </div>

          {sport.attributes.map((attr) => {
            const slot = slots[attr.id];
            const isSpinning = spinningSlot === attr.id;
            return (
              <div key={attr.id} className={`pa-slot ${slot ? 'filled' : ''}`}>
                <div className="pa-slot-label">{attr.label}</div>
                <div className="pa-slot-value">
                  <div className={`pa-slot-num ${slot ? '' : 'empty'}`}>{isSpinning ? '—' : (slot ? slot.value : '—')}</div>
                  <div className={`pa-slot-source ${isSpinning ? 'spinning' : ''}`}>
                    {isSpinning
                      ? <strong>{reelName}</strong>
                      : slot
                        ? <><strong>{slot.playerName}</strong><span>{attr.label} rating drafted</span></>
                        : <span>No player drafted yet</span>}
                  </div>
                </div>
                <div className="pa-slot-actions">
                  <button className="pa-spin-btn" disabled={spinningSlot !== null} onClick={() => spinSlot(attr.id)}>
                    {slot ? '🔄 Respin' : '🎰 Spin'}
                  </button>
                  {slot && <button className="pa-clear-btn" disabled={spinningSlot !== null} onClick={() => setSlot(attr.id, null)}>✕</button>}
                </div>
              </div>
            );
          })}

          <div className="pa-toolbar">
            <button className="pa-btn primary" disabled={spinningSlot !== null || allFilled} onClick={spinAllEmpty}>🎰 Spin All Remaining</button>
            <button className="pa-btn" disabled={spinningSlot !== null || !allFilled} onClick={handleSave}>💾 Save Build</button>
            <button className="pa-btn ghost" disabled={spinningSlot !== null || filledCount === 0} onClick={resetBuild}>Reset</button>
          </div>
          {saveMsg && <div className="pa-career-box">{saveMsg}</div>}
        </div>

        <div>
          <div className="pa-result-card">
            <div className="pa-card-title"><span>YOUR BUILD</span></div>
            <div className="pa-ovr-badge">
              <div className="pa-ovr-num">{filledCount ? ovr : '--'}</div>
              <div className="pa-ovr-tier">{filledCount ? tier.label : 'Not built yet'}</div>
              {filledCount > 0 && <div className="pa-ovr-grade">Grade {tier.grade}</div>}
              {filledCount > 0 && <div className="pa-ovr-blurb">{tier.blurb}</div>}
            </div>

            {filledCount === 0 && <div className="pa-empty-note">Spin your first slot to start the build.</div>}

            {filledCount > 0 && (
              <div className="pa-contrib-list">
                {sport.attributes.filter((a) => slots[a.id]).map((a) => (
                  <div className="pa-contrib-row" key={a.id}>
                    <span>{a.label}</span>
                    <span>{slots[a.id].value} — {slots[a.id].playerName}</span>
                  </div>
                ))}
              </div>
            )}

            {allFilled && <div className="pa-career-box">{careerBlurb(sport, ovr, tier, slots)}</div>}
          </div>

          <div className="pa-builds-card" style={{ marginTop: 16 }}>
            <div className="pa-card-title"><span>🏛️ SAVED {sport.unit} BUILDS</span></div>
            {builds.length === 0 && <div className="pa-empty-note">No saved builds for this sport yet.</div>}
            {builds.map((b) => (
              <div className="pa-build-row" key={b.id}>
                <div>
                  <strong>{b.ovr} OVR — {b.tierLabel}</strong>
                  <span>{b.builtBy} • {new Date(b.savedAt).toLocaleDateString()}</span>
                </div>
                <button className="pa-build-del" onClick={() => handleDelete(b.id)} title="Delete build">🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
