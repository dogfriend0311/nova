import React, { useEffect, useState } from 'react';
import {
  fetchAthleteProfile, fetchAthleteStats, fetchAthleteOverview,
  fetchAthleteSplits, fetchAthleteGameLog, fetchAthleteNews,
} from '../../services/sportsDataService';
import './AthletePage.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'stats',    label: 'Stats' },
  { id: 'gamelog',  label: 'Game Log' },
  { id: 'splits',   label: 'Splits' },
  { id: 'news',     label: 'News' },
];

const thS = { padding: '7px 10px', color: 'rgba(158, 165, 196,0.45)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(100,120,200,0.18)', textAlign: 'center', whiteSpace: 'nowrap' };
const tdS = { padding: '7px 10px', textAlign: 'center', color: 'rgba(158, 165, 196,0.82)', fontSize: '0.83rem', borderBottom: '1px solid rgba(100,120,200,0.07)', whiteSpace: 'nowrap' };

// ── ESPN-style player page for real-world sports (NBA/NHL/MLB/NFL/etc) ──
// This is deliberately separate from LeaguePlayerPage.jsx, which is the
// Roblox-league (NABB/etc) roster player page — that one showcases a
// custom roster player; this one showcases a real-world athlete pulled
// live from ESPN's API, for any sport in the Sports tab.
const AthletePage = ({ sport, athleteId, onBack }) => {
  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [profile, setProfile]   = useState(null);
  const [statsCat, setStatsCat] = useState([]);
  const [overview, setOverview] = useState(null);

  const [tabData, setTabData]       = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    setProfile(null); setStatsCat([]); setOverview(null);
    setTabData({}); setTab('overview');

    Promise.allSettled([
      fetchAthleteProfile(sport, athleteId),
      fetchAthleteStats(sport, athleteId),
      fetchAthleteOverview(sport, athleteId),
    ]).then(([profRes, statsRes, ovRes]) => {
      if (!active) return;
      if (profRes.status !== 'fulfilled' && ovRes.status !== 'fulfilled') {
        setError('Could not load this player.');
      }
      setProfile(profRes.status === 'fulfilled' ? profRes.value?.athlete : null);
      setStatsCat(statsRes.status === 'fulfilled' ? (statsRes.value?.categories || []) : []);
      setOverview(ovRes.status === 'fulfilled' ? ovRes.value : null);
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [sport, athleteId]);

  // Lazy-load Game Log / Splits / News only when their tab is opened
  useEffect(() => {
    if (tab === 'overview' || tab === 'stats') return;
    if (tabData[tab]) return;
    let active = true;
    setTabLoading(true);
    const fetcher = tab === 'gamelog' ? fetchAthleteGameLog : tab === 'splits' ? fetchAthleteSplits : fetchAthleteNews;
    fetcher(sport, athleteId)
      .then(data => { if (active) setTabData(prev => ({ ...prev, [tab]: data })); })
      .catch(() => { if (active) setTabData(prev => ({ ...prev, [tab]: null })); })
      .finally(() => { if (active) setTabLoading(false); });
    return () => { active = false; };
  }, [tab, sport, athleteId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="ap-page">
        <button className="sh-back-btn" onClick={onBack}>Back</button>
        <div className="sh-loading" style={{ marginTop: 40 }}><div className="sh-spinner" /></div>
      </div>
    );
  }

  if (error && !profile && !overview) {
    return (
      <div className="ap-page">
        <button className="sh-back-btn" onClick={onBack}>Back</button>
        <div className="sh-error" style={{ marginTop: 20 }}>{error}</div>
      </div>
    );
  }

  const displayName = profile?.displayName || overview?.athlete?.displayName || 'Player';
  const headshot     = profile?.headshot?.href || overview?.athlete?.headshot?.href;
  const teamName     = profile?.team?.displayName || overview?.athlete?.team?.displayName;
  const teamLogo     = profile?.team?.logos?.[0]?.href || overview?.athlete?.team?.logo;
  const jersey       = profile?.jersey || overview?.athlete?.jersey;
  const position     = profile?.position?.displayName || overview?.athlete?.position?.displayName;
  const bio = [
    profile?.age && `Age ${profile.age}`,
    profile?.displayHeight,
    profile?.displayWeight,
    profile?.birthPlace?.city && [profile.birthPlace.city, profile.birthPlace.state || profile.birthPlace.country].filter(Boolean).join(', '),
    profile?.college?.name && `${profile.college.name}`,
    profile?.draft?.displayText,
  ].filter(Boolean);

  return (
    <div className="ap-page">
      <button className="sh-back-btn" onClick={onBack}>Back</button>

      <div className="ap-header">
        {teamLogo && <img src={teamLogo} alt="" className="ap-team-bg-logo" />}
        <div className="ap-header-inner">
          {headshot
            ? <img src={headshot} alt={displayName} className="ap-headshot" onError={e => { e.target.style.visibility = 'hidden'; }} />
            : <div className="ap-headshot ap-headshot-ph">👤</div>}
          <div className="ap-header-info">
            <h2 className="ap-name">{displayName}</h2>
            <div className="ap-meta-row">
              {teamName && <span className="ap-badge ap-badge-team">{teamName}</span>}
              {position && <span className="ap-badge">{position}</span>}
              {jersey && <span className="ap-badge">#{jersey}</span>}
            </div>
            {bio.length > 0 && <div className="ap-bio-line">{bio.join(' · ')}</div>}
          </div>
        </div>
      </div>

      <div className="sh-sub-tabs" style={{ marginTop: 22 }}>
        {TABS.map(t => (
          <button key={t.id} className={`sh-sub-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ap-tab-body">
        {tab === 'overview' && <OverviewTab profile={profile} overview={overview} statsCat={statsCat} />}
        {tab === 'stats'    && <StatsTab statsCat={statsCat} />}
        {tab === 'gamelog'  && (tabLoading ? <Spinner /> : <GameLogTab data={tabData.gamelog} />)}
        {tab === 'splits'   && (tabLoading ? <Spinner /> : <SplitsTab data={tabData.splits} />)}
        {tab === 'news'     && (tabLoading ? <Spinner /> : <NewsTab data={tabData.news} />)}
      </div>
    </div>
  );
};

const Spinner = () => <div className="sh-loading" style={{ padding: '30px 0' }}><div className="sh-spinner" /></div>;

const StatTable = ({ cat }) => (
  <div style={{ marginBottom: 20 }}>
    <h5 style={{ fontSize: '0.75rem', color: 'rgba(158, 165, 196,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.displayName || cat.name}</h5>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={thS}>Season</th>{(cat.labels || []).map((lbl, li) => <th key={li} style={thS}>{lbl}</th>)}</tr></thead>
        <tbody>
          {Object.values(cat.statistics || {}).map((row, ri) => (
            <tr key={ri}>
              <td style={{ ...tdS, textAlign: 'left' }}>{row.season?.year || row.season?.displayName || '--'}{row.teamShortName ? ` · ${row.teamShortName}` : ''}</td>
              {(row.stats || []).map((val, vi) => <td key={vi} style={tdS}>{val}</td>)}
            </tr>
          ))}
          {cat.totals?.length > 0 && (
            <tr style={{ borderTop: '1px solid rgba(100,120,200,0.25)' }}>
              <td style={{ ...tdS, color: 'var(--color-cyan)', fontWeight: 700, textAlign: 'left' }}>Career</td>
              {cat.totals.map((val, vi) => <td key={vi} style={{ ...tdS, fontWeight: 700 }}>{val}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const OverviewTab = ({ profile, overview, statsCat }) => (
  <div>
    {statsCat.length > 0
      ? <StatTable cat={statsCat[0]} />
      : <p className="ap-empty">No stats available for this player yet.</p>}
    {profile?.experience?.displayValue && (
      <div className="ap-fact-row"><span>Experience</span><strong>{profile.experience.displayValue}</strong></div>
    )}
    {profile?.status?.displayName && (
      <div className="ap-fact-row"><span>Status</span><strong>{profile.status.displayName}</strong></div>
    )}
  </div>
);

const StatsTab = ({ statsCat }) => (
  statsCat.length > 0
    ? <div>{statsCat.map((cat, ci) => <StatTable key={ci} cat={cat} />)}</div>
    : <p className="ap-empty">No stats available for this player.</p>
);

const GameLogTab = ({ data }) => {
  const events = data?.seasonTypes?.[0]?.categories?.[0]?.events || data?.events || [];
  const labels = data?.labels || data?.names || [];
  if (!events.length) return <p className="ap-empty">No recent games found.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ ...thS, textAlign: 'left' }}>Date</th><th style={{ ...thS, textAlign: 'left' }}>Opponent</th>{labels.map((l, i) => <th key={i} style={thS}>{l}</th>)}</tr></thead>
        <tbody>
          {events.slice(0, 20).map((ev, i) => (
            <tr key={i}>
              <td style={{ ...tdS, textAlign: 'left' }}>{ev.gameDate ? new Date(ev.gameDate).toLocaleDateString() : (ev.date || '--')}</td>
              <td style={{ ...tdS, textAlign: 'left' }}>{ev.opponent?.displayName || ev.atVs || '--'}</td>
              {(ev.stats || []).map((val, vi) => <td key={vi} style={tdS}>{val}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SplitsTab = ({ data }) => {
  const cats = data?.categories || data?.splitCategories || [];
  if (!cats.length) return <p className="ap-empty">No splits available for this player.</p>;
  return (
    <div>
      {cats.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 20 }}>
          <h5 style={{ fontSize: '0.75rem', color: 'rgba(158, 165, 196,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.displayName || cat.name}</h5>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ ...thS, textAlign: 'left' }}>Split</th>{(cat.labels || []).map((l, i) => <th key={i} style={thS}>{l}</th>)}</tr></thead>
              <tbody>
                {(cat.splits || []).map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ ...tdS, textAlign: 'left' }}>{row.displayName || row.name || '--'}</td>
                    {(row.stats || []).map((val, vi) => <td key={vi} style={tdS}>{val}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const NewsTab = ({ data }) => {
  const articles = data?.articles || data?.results || [];
  if (!articles.length) return <p className="ap-empty">No recent news for this player.</p>;
  return (
    <div className="ap-news-list">
      {articles.slice(0, 10).map((a, i) => (
        <a key={i} className="ap-news-item" href={a.links?.web?.href || a.links?.mobile?.href || '#'} target="_blank" rel="noopener noreferrer">
          {a.images?.[0]?.url && <img src={a.images[0].url} alt="" />}
          <div>
            <div className="ap-news-headline">{a.headline}</div>
            {a.published && <div className="ap-news-date">{new Date(a.published).toLocaleDateString()}</div>}
          </div>
        </a>
      ))}
    </div>
  );
};

export default AthletePage;
