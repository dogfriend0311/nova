import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as fdb from '../../services/franchiseDb';

const POS_ORDER = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

function pct(w, l) { const g = w + l; return g > 0 ? (w / g).toFixed(3).replace(/^0/, '') : '.000'; }

// ── Single player row with lazily-loaded season stats ──────────
const PlayerRow = ({ player, seasonId, leagueAverages }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    if (seasonId) {
      fdb.getPlayerSeasonStats(player.id, seasonId, leagueAverages).then(s => { if (active) setStats(s); });
    }
    return () => { active = false; };
  }, [player.id, seasonId, leagueAverages]);

  const ratingsStr = player.is_pitcher
    ? `STU ${player.stuff} / CTL ${player.control} / MOV ${player.movement} / STA ${player.stamina}`
    : `CON ${player.contact} / POW ${player.power} / EYE ${player.eye} / SPD ${player.speed} / FLD ${player.fielding}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid rgba(94,129,244,0.08)', flexWrap: 'wrap' }}>
      <span style={{ width: 34, fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-cyan)', flexShrink: 0 }}>{player.position}</span>
      <span style={{ minWidth: 130, fontSize: '0.85rem', color: '#e2e5f0', fontWeight: 600 }}>{player.first_name} {player.last_name}</span>
      <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)' }}>Age {player.age}</span>
      <span style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.45)', flex: 1, minWidth: 200 }}>{ratingsStr}</span>
      {stats && (
        <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.6)', fontFamily: 'monospace' }}>
          {player.is_pitcher
            ? `ERA ${stats.era.toFixed(2)} · WHIP ${stats.whip.toFixed(2)} · K/9 ${stats.k9.toFixed(1)} · FIP ${stats.fip.toFixed(2)} · WAR ${(stats.war || 0).toFixed(1)}`
            : `AVG ${stats.avg.toFixed(3)} · OPS ${stats.ops.toFixed(3)} · HR ${stats.hr || 0} · RBI ${stats.rbi || 0} · WAR ${(stats.war || 0).toFixed(1)}`}
        </span>
      )}
    </div>
  );
};

// ── Roster view for one team, with level tabs ──────────────────
const TeamRoster = ({ team, seasonId, leagueAverages, onBack, canClaim, onClaim, user }) => {
  const [level, setLevel] = useState('MLB');
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fdb.getRoster(team.id, level).then(r => {
      const sorted = [...r].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position));
      setRoster(sorted);
      setLoading(false);
    });
  }, [team.id, level]);
  useEffect(load, [load]);

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 14 }}>← Back to Standings</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ color: '#e2e5f0', margin: 0 }}>{team.city} {team.name}</h2>
          <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)' }}>
            {team.league} League · {team.division} Division · {team.wins}-{team.losses} ({pct(team.wins, team.losses)})
            {team.owner_user_id && ` · Owned by @${team.owner_user_id}`}
          </div>
        </div>
        {!team.owner_user_id && canClaim && (
          <button className="neon-button" onClick={() => onClaim(team.id)}>Claim This Team</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['MLB', 'AAA', 'AA', 'A'].map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, minHeight: 40,
            background: level === l ? 'rgba(94,129,244,0.18)' : 'rgba(94,129,244,0.05)',
            border: `1px solid ${level === l ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
            color: level === l ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
          }}>{l}</button>
        ))}
      </div>

      <div className="neon-card p-3">
        {loading ? (
          <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>Loading roster…</div>
        ) : roster.length === 0 ? (
          <div style={{ color: 'rgba(158,165,196,0.35)', textAlign: 'center', padding: 20 }}>No players at this level.</div>
        ) : (
          roster.map(p => <PlayerRow key={p.id} player={p} seasonId={seasonId} leagueAverages={leagueAverages} />)
        )}
      </div>
    </div>
  );
};

// ── Standings grouped by league/division ────────────────────────
const Standings = ({ teams, onSelectTeam }) => {
  const groups = {};
  teams.forEach(t => {
    const key = `${t.league} — ${t.division}`;
    (groups[key] = groups[key] || []).push(t);
  });
  Object.values(groups).forEach(list => list.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses)));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {Object.entries(groups).map(([label, list]) => (
        <div key={label} className="neon-card p-3">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(158,165,196,0.4)', marginBottom: 10 }}>{label}</div>
          {list.map(t => (
            <button key={t.id} onClick={() => onSelectTeam(t)} style={{
              display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 6px', minHeight: 44,
              background: 'transparent', border: 'none', borderBottom: '1px solid rgba(94,129,244,0.08)', cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ color: '#e2e5f0', fontSize: '0.85rem' }}>
                {t.city} {t.name}{t.owner_user_id && <span style={{ color: 'var(--color-cyan)', fontSize: '0.7rem' }}> · @{t.owner_user_id}</span>}
              </span>
              <span style={{ color: 'rgba(158,165,196,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{t.wins}-{t.losses}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────
const FranchiseMode = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'cofounder';

  const [instance, setInstance]   = useState(null);
  const [teams, setTeams]         = useState([]);
  const [season, setSeason]       = useState(null);
  const [leagueAvg, setLeagueAvg] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [lastResults, setLastResults] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inst = await fdb.getSharedInstance();
      if (!inst) { setInstance(null); setLoading(false); return; }
      setInstance(inst);
      const [teamList, currentSeason] = await Promise.all([fdb.getTeams(inst.id), fdb.getCurrentSeason(inst.id)]);
      setTeams(teamList);
      setSeason(currentSeason);
      if (currentSeason) setLeagueAvg(await fdb.getLeagueAverages(currentSeason.id));
    } catch (err) {
      console.error('Franchise load error:', err);
      setError(err.message || 'Failed to load franchise data.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await fdb.initializeSharedLeague();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to generate league.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSimulateDay = async () => {
    if (!season) return;
    setSimulating(true);
    setError('');
    try {
      const results = await fdb.simulateDay(season.id);
      setLastResults(results);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to simulate day.');
    } finally {
      setSimulating(false);
    }
  };

  const handleClaim = async (teamId) => {
    if (!user?.username) return;
    try {
      await fdb.claimTeam(teamId, user.username);
      await load();
      setSelectedTeam(prev => prev ? { ...prev, owner_user_id: user.username } : prev);
    } catch (err) {
      setError(err.message || 'Failed to claim team.');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(158,165,196,0.4)' }}>Loading franchise…</div>;
  }

  if (!instance) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>⚾</div>
        <h2 style={{ color: '#e2e5f0' }}>No league yet</h2>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.9rem', marginBottom: 20 }}>
          Generate the 32-team league to get started — full rosters (MLB/AAA/AA/A) for every team, ready to play.
        </p>
        {canManage ? (
          <button className="neon-button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating league… (this takes a moment)' : '⚾ Generate 32-Team League'}
          </button>
        ) : (
          <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.85rem' }}>An owner or cofounder needs to generate the league first.</p>
        )}
        {error && <div style={{ color: '#ff6b7a', fontSize: '0.85rem', marginTop: 14 }}>⚠ {error}</div>}
      </div>
    );
  }

  if (selectedTeam) {
    return (
      <div style={{ padding: '20px 12px', maxWidth: 900, margin: '0 auto' }}>
        <TeamRoster
          team={teams.find(t => t.id === selectedTeam.id) || selectedTeam}
          seasonId={season?.id}
          leagueAverages={leagueAvg}
          onBack={() => setSelectedTeam(null)}
          canClaim={!!user}
          onClaim={handleClaim}
          user={user}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 12px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <h1 style={{ color: '#e2e5f0', margin: 0 }}>⚾ {instance.name}</h1>
        {season && (
          <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)' }}>
            {season.year} Season · Day {season.current_day} of {season.total_days}
          </div>
        )}
      </div>

      {canManage && season && season.current_day < season.total_days && (
        <div style={{ marginBottom: 16 }}>
          <button className="neon-button" onClick={handleSimulateDay} disabled={simulating}>
            {simulating ? 'Simulating…' : '▶ Simulate Next Day'}
          </button>
        </div>
      )}

      {error && <div style={{ color: '#ff6b7a', fontSize: '0.85rem', marginBottom: 14 }}>⚠ {error}</div>}

      {lastResults.length > 0 && (
        <div className="neon-card p-3" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)', marginBottom: 8 }}>Yesterday's Results</div>
          {lastResults.map(g => {
            const home = teams.find(t => t.id === g.home_team_id);
            const away = teams.find(t => t.id === g.away_team_id);
            return (
              <div key={g.id} style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.7)', padding: '4px 0' }}>
                {away?.name} {g.away_score} @ {home?.name} {g.home_score}
              </div>
            );
          })}
        </div>
      )}

      <Standings teams={teams} onSelectTeam={setSelectedTeam} />
    </div>
  );
};

export default FranchiseMode;
