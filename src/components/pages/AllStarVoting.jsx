/**
 * AllStarVoting.jsx
 * League-wide All-Star ballot: vote by specific position (not just a
 * blanket "offense"/"defense" bucket), with up to 2 picks per position
 * for each conference (e.g. AFC + NFC, AL + NL, East + West). Rosters
 * come from fetchAllAthletes (per-team roster pull, already used by
 * Players search); conference assignment comes from the standings
 * endpoint via fetchConferenceTeamMap.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllAthletes, fetchConferenceTeamMap } from '../../services/sportsDataService';
import db from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { awardBadge } from '../../services/achievementsService';

const AllStarVoting = ({ sport }) => {
  const { user } = useAuth();
  const [athletes, setAthletes]   = useState(null);
  const [confMap, setConfMap]     = useState(null);
  const [conferences, setConferences] = useState([]);
  const [error, setError]         = useState(null);

  const [position, setPosition]   = useState(null);
  const [search, setSearch]       = useState('');
  const [draft, setDraft]         = useState({}); // conference -> [athleteId, athleteId]
  const [votesBySlot, setVotesBySlot] = useState({}); // conference -> [{athlete_id,...}]
  const [saving, setSaving]       = useState(false);
  const [savedMsg, setSavedMsg]   = useState('');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([fetchAllAthletes(sport), fetchConferenceTeamMap(sport)])
      .then(([athletesRes, { map, conferences: confs }]) => {
        if (cancelled) return;
        setAthletes(athletesRes);
        setConfMap(map);
        setConferences(confs);
      })
      .catch(e => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [sport]);

  const positions = useMemo(() => {
    if (!athletes) return [];
    return Array.from(new Set(athletes.map(a => a.position).filter(Boolean))).sort();
  }, [athletes]);

  useEffect(() => {
    if (positions.length && !position) setPosition(positions[0]);
  }, [positions, position]);

  const athletesByConf = useMemo(() => {
    if (!athletes || !confMap || !position) return {};
    const grouped = {};
    conferences.forEach(c => { grouped[c] = []; });
    athletes.filter(a => a.position === position).forEach(a => {
      const conf = confMap[a.teamAbbrev];
      if (conf && grouped[conf]) grouped[conf].push(a);
    });
    Object.values(grouped).forEach(list => list.sort((x, y) => x.displayName.localeCompare(y.displayName)));
    return grouped;
  }, [athletes, confMap, conferences, position]);

  const loadVotes = useCallback(() => {
    if (!position) return;
    db.getSportsAllStarVotes(sport, position).then(rows => {
      const bySlot = {};
      (rows || []).forEach(r => {
        if (!bySlot[r.conference]) bySlot[r.conference] = [];
        bySlot[r.conference].push(...(r.picks || []));
      });
      setVotesBySlot(bySlot);
      // Restore my own draft if I've already voted this slot.
      const myDraft = {};
      (rows || []).filter(r => r.from_username === user?.username).forEach(r => {
        myDraft[r.conference] = (r.picks || []).map(p => p.id);
      });
      setDraft(myDraft);
    });
  }, [sport, position, user]);

  useEffect(() => { loadVotes(); }, [loadVotes]);

  const togglePick = (conf, athleteId) => {
    setDraft(prev => {
      const current = prev[conf] || [];
      if (current.includes(athleteId)) {
        return { ...prev, [conf]: current.filter(id => id !== athleteId) };
      }
      if (current.length >= 2) return prev; // cap at 2 per conference per position
      return { ...prev, [conf]: [...current, athleteId] };
    });
  };

  const handleSubmit = async (conf) => {
    if (!user || !draft[conf]?.length) return;
    setSaving(true);
    const picks = draft[conf].map(id => {
      const a = athletesByConf[conf].find(x => x.id === id);
      return { id: a.id, name: a.displayName, team: a.teamAbbrev, photo: a.headshotUrl };
    });
    await db.saveSportsAllStarBallot(sport, { position, conference: conf, from_username: user.username, picks });
    awardBadge(user.username, 'allstar_voter');
    setSaving(false);
    setSavedMsg(`Ballot saved for ${conf} — ${position}`);
    setTimeout(() => setSavedMsg(''), 3000);
    loadVotes();
  };

  const tallyFor = (conf) => {
    const votes = votesBySlot[conf] || [];
    const counts = {};
    votes.forEach(p => { counts[p.id] = counts[p.id] || { ...p, count: 0 }; counts[p.id].count++; });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  };

  if (error) return <div className="sh-error">Could not load All-Star ballot: {error}</div>;
  if (!athletes || !confMap) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (!conferences.length) return <div className="sh-empty">This sport doesn't have a conference structure to vote by.</div>;

  const q = search.trim().toLowerCase();

  return (
    <div>
      <h3 className="gradient-text-cyan" style={{ marginBottom: 4 }}>All-Star Voting</h3>
      <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.82rem', marginTop: 0, marginBottom: 16 }}>
        Pick up to 2 players per position for each conference.
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {positions.map(p => (
          <button
            key={p}
            onClick={() => { setPosition(p); setSearch(''); }}
            className={`sh-sub-tab ${position === p ? 'active' : ''}`}
          >
            {p}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${position || ''} players...`}
        style={{ width: '100%', maxWidth: 320, padding: '8px 12px', marginBottom: 18, background: 'rgba(10,10,30,0.85)', border: '1px solid rgba(100,120,200,0.3)', borderRadius: 8, color: '#e2e5f0', fontSize: '0.85rem' }}
      />

      {savedMsg && (
        <div style={{ background: 'rgba(67,181,129,0.1)', border: '1px solid rgba(67,181,129,0.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#43b581' }}>
          {savedMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${conferences.length}, minmax(240px, 1fr))`, gap: 16 }}>
        {conferences.map(conf => {
          const list = (athletesByConf[conf] || []).filter(a => !q || a.displayName.toLowerCase().includes(q) || a.teamAbbrev?.toLowerCase().includes(q));
          const picked = draft[conf] || [];
          const leaders = tallyFor(conf).slice(0, 2);
          return (
            <div key={conf} className="stats-section neon-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(220,230,255,0.9)' }}>{conf}</h4>
                <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.45)' }}>{picked.length}/2 picked</span>
              </div>

              {leaders.length > 0 && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(100,120,200,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(158,165,196,0.4)', marginBottom: 4 }}>Current leaders</div>
                  {leaders.map((l, i) => (
                    <div key={l.id} style={{ fontSize: '0.8rem', color: i === 0 ? '#ffd700' : 'rgba(220,230,255,0.8)' }}>
                      {i === 0 ? '🏆 ' : '2️⃣ '}{l.name} <span style={{ color: 'rgba(158,165,196,0.4)' }}>({l.team}) — {l.count} vote{l.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {list.length === 0 && <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.8rem' }}>No players found.</p>}
                {list.map(a => {
                  const isPicked = picked.includes(a.id);
                  const disabled = !isPicked && picked.length >= 2;
                  return (
                    <label
                      key={a.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: isPicked ? 'rgba(255,215,0,0.08)' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
                    >
                      <input type="checkbox" checked={isPicked} disabled={disabled} onChange={() => togglePick(conf, a.id)} />
                      <span style={{ fontSize: '0.82rem', color: 'rgba(220,230,255,0.85)' }}>{a.displayName} <span style={{ color: 'rgba(158,165,196,0.4)' }}>({a.teamAbbrev})</span></span>
                    </label>
                  );
                })}
              </div>

              {user && user.role !== 'guest' ? (
                <button
                  className="neon-button"
                  onClick={() => handleSubmit(conf)}
                  disabled={saving || !picked.length}
                  style={{ width: '100%', marginTop: 10, padding: '8px 0', opacity: (saving || !picked.length) ? 0.4 : 1 }}
                >
                  {saving ? 'Saving...' : 'Submit Ballot'}
                </button>
              ) : (
                <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.78rem', marginTop: 10, marginBottom: 0 }}>Sign in to vote.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllStarVoting;
