import React, { useRef, useState } from 'react';
import { Mic, Trash2, Send } from 'lucide-react';
import { createRecorder, computeWaveformPeaks } from '../../services/audioRecorder';

const formatTimer = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Renders as a plain mic button; while recording it takes over the whole
// row (see MessagesPage, which hides the text input/GIF button via
// onRecordingChange) and shows a timer + cancel/send controls instead.
const VoiceRecorderButton = ({ onSend, onRecordingChange, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef(null);
  const tickRef = useRef(null);
  const startRef = useRef(0);

  const setRecordingState = (val) => { setRecording(val); onRecordingChange?.(val); };

  const startRecording = async () => {
    try {
      const recorder = createRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      startRef.current = Date.now();
      setElapsed(0);
      setRecordingState(true);
      tickRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 200);
    } catch {
      // Mic permission denied or unsupported — button just stays idle.
    }
  };

  const cleanup = () => {
    clearInterval(tickRef.current);
    setRecordingState(false);
    setElapsed(0);
  };

  const cancelRecording = () => {
    recorderRef.current?.cancel();
    cleanup();
  };

  const finishRecording = async () => {
    if (!recorderRef.current) return;
    const { blob, durationMs } = await recorderRef.current.stop();
    cleanup();
    if (!blob || durationMs < 400) return; // too short to bother sending
    setBusy(true);
    const peaks = await computeWaveformPeaks(blob);
    await onSend({ blob, durationMs, peaks });
    setBusy(false);
  };

  if (recording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, padding: '0 6px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b', animation: 'nova-rec-pulse 1.1s infinite' }} />
        <span style={{ color: '#e2e5f0', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums', flex: 1 }}>{formatTimer(elapsed)}</span>
        <button onClick={cancelRecording} title="Discard" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'rgba(158,165,196,0.6)' }}>
          <Trash2 size={16} />
        </button>
        <button onClick={finishRecording} title="Send" className="neon-button" style={{ padding: '7px 12px', display: 'flex', alignItems: 'center' }}>
          <Send size={15} />
        </button>
        <style>{`@keyframes nova-rec-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }`}</style>
      </div>
    );
  }

  return (
    <button
      title="Record a voice message"
      disabled={disabled || busy}
      onClick={startRecording}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0,
        borderRadius: 8, background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)',
        cursor: 'pointer', color: 'rgba(158,165,196,0.8)', opacity: (disabled || busy) ? 0.5 : 1,
      }}
    >
      <Mic size={15} />
    </button>
  );
};

export default VoiceRecorderButton;
