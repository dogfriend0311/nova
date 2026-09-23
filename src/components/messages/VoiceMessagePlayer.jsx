import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

const formatDuration = (ms) => {
  const s = Math.round((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const SPEEDS = [1, 1.5, 2];

// payload shape: { url, duration_ms, peaks: number[] (0..1) }
const VoiceMessagePlayer = ({ payload }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [speed, setSpeed] = useState(1);
  const peaks = payload?.peaks?.length ? payload.peaks : Array.from({ length: 28 }, () => 0.3);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', minWidth: 190 }}>
      <audio ref={audioRef} src={payload?.url} preload="metadata" />
      <button
        onClick={toggle}
        style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(94,129,244,0.25)', border: 'none', cursor: 'pointer', color: '#e2e5f0', flexShrink: 0,
        }}
      >
        {playing ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: 1 }} />}
      </button>

      <div onClick={seek} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 24, cursor: 'pointer' }}>
        {peaks.map((p, i) => (
          <span
            key={i}
            style={{
              width: 2.5, borderRadius: 2, height: `${Math.max(3, p * 22)}px`,
              background: (i / peaks.length) <= progress ? 'var(--color-cyan, #5e81f4)' : 'rgba(158,165,196,0.3)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      <span style={{ color: 'rgba(158,165,196,0.6)', fontSize: '0.66rem', flexShrink: 0, minWidth: 28 }}>
        {formatDuration(payload?.duration_ms)}
      </span>
      <button
        onClick={cycleSpeed}
        title="Playback speed"
        style={{
          background: 'rgba(94,129,244,0.1)', border: '1px solid rgba(94,129,244,0.2)', borderRadius: 6,
          color: 'rgba(158,165,196,0.7)', fontSize: '0.6rem', fontWeight: 700, padding: '2px 5px', cursor: 'pointer', flexShrink: 0,
        }}
      >
        {speed}x
      </button>
    </div>
  );
};

export default VoiceMessagePlayer;
