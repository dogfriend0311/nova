import React, { useEffect, useMemo, useRef, useState } from 'react';
import './HomeHeroBanner.css';

// How long each slide stays up before auto-advancing.
const ROTATE_MS = 6000;

/**
 * HomeHeroBanner — replaces the old static "Welcome to Nova" hero with a
 * rotating banner that cycles through whatever is actually happening right
 * now: the welcome/stats slide, Staff of the Month, the latest site
 * announcement, Song of the Day, and a Discord CTA. Slides that have no
 * data (e.g. no staff of the month set) are simply left out — the banner
 * always has at least the welcome slide and the Discord slide.
 *
 * - Auto-rotates every 6s, pauses on hover/focus, and skips auto-rotation
 *   entirely when the user has requested reduced motion.
 * - Prev/next arrows + dot indicators for manual control.
 * - Fully keyboard/screen-reader friendly (aria-live region + role=tablist
 *   dots), matching the accessibility pass already planned for the app.
 */
const HomeHeroBanner = ({
  user,
  stats,
  onlinePulse,
  staffOfMonth,
  songOfDay,
  latestAnnouncement,
  discordUrl,
  onNavigate,
}) => {
  const slides = useMemo(() => {
    const list = [
      {
        id: 'welcome',
        title: user?.username ? `Welcome back, ${user.username}` : 'Welcome to Nova',
        body: 'Your hub for Roblox Baseball, Hockey & Football stats, live sports, and the community.',
        showStats: true,
      },
    ];

    if (staffOfMonth?.username) {
      list.push({
        id: 'sotm',
        kicker: `🌟 Staff of the Month${staffOfMonth.month_label ? ` — ${staffOfMonth.month_label}` : ''}`,
        title: staffOfMonth.username,
        body: staffOfMonth.note || staffOfMonth.bio || 'Recognized for going above and beyond this month.',
        cta: { label: 'View profile ↗', onClick: () => onNavigate && onNavigate('members', staffOfMonth.username) },
      });
    }

    if (latestAnnouncement?.message) {
      list.push({
        id: 'announcement',
        kicker: '📣 Site Update',
        title: latestAnnouncement.message.length > 70
          ? `${latestAnnouncement.message.slice(0, 70)}…`
          : latestAnnouncement.message,
        body: '',
      });
    }

    if (songOfDay?.title) {
      list.push({
        id: 'song',
        kicker: '🎵 Song of the Day',
        title: songOfDay.title,
        body: songOfDay.artist || '',
        cta: songOfDay.url ? { label: 'Listen ↗', href: songOfDay.url } : null,
      });
    }

    list.push({
      id: 'discord',
      title: 'Join the Nova Discord',
      body: 'Chat with the community, get live league updates & more.',
      cta: discordUrl ? { label: 'Join Server ↗', href: discordUrl } : null,
    });

    return list;
  }, [user, staffOfMonth, latestAnnouncement, songOfDay, discordUrl, onNavigate]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  // If the slide count shrinks (e.g. the announcement disappears) and we're
  // sitting past the new end, snap back to the first slide instead of
  // rendering nothing.
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (paused || slides.length <= 1) return undefined;
    const prefersReduced = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, slides.length]);

  const goTo = (i) => setIndex(((i % slides.length) + slides.length) % slides.length);
  const slide = slides[index] || slides[0];

  return (
    <div
      className="home-hero home-hero--rotating"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Nova highlights"
    >
      {slides.length > 1 && (
        <button
          type="button"
          className="hero-nav hero-nav--prev"
          onClick={() => goTo(index - 1)}
          aria-label="Previous highlight"
        >
          ‹
        </button>
      )}

      <div className="hero-slide" aria-live="polite">
        {slide.kicker && <div className="hero-kicker">{slide.kicker}</div>}
        <h1 className="gradient-text">{slide.title}</h1>
        {slide.body && <p className="subtitle">{slide.body}</p>}

        {slide.showStats && (
          <div className="home-stat-row">
            <span className={`home-stat-pill${onlinePulse ? ' home-stat-pill--pulse' : ''}`}>
              <span className={`home-stat-dot${onlinePulse ? ' home-stat-dot--pulse' : ''}`} />
              <strong>{stats.online}</strong>&nbsp;online now
            </span>
            <span className="home-stat-pill">
              <strong>{stats.members}</strong>&nbsp;members
            </span>
          </div>
        )}

        {slide.cta && (
          slide.cta.href ? (
            <a className="hero-cta" href={slide.cta.href} target="_blank" rel="noreferrer">
              {slide.cta.label}
            </a>
          ) : (
            <button type="button" className="hero-cta" onClick={slide.cta.onClick}>
              {slide.cta.label}
            </button>
          )
        )}
      </div>

      {slides.length > 1 && (
        <button
          type="button"
          className="hero-nav hero-nav--next"
          onClick={() => goTo(index + 1)}
          aria-label="Next highlight"
        >
          ›
        </button>
      )}

      {slides.length > 1 && (
        <div className="hero-dots" role="tablist" aria-label="Choose highlight">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show highlight ${i + 1} of ${slides.length}: ${s.title}`}
              className={`hero-dot${i === index ? ' hero-dot--active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeHeroBanner;
