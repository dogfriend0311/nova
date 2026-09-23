// src/services/audioRecorder.js
//
// Browser mic recording for Messages voice notes, plus a helper that
// decodes the recorded clip into a small set of waveform "peaks" (an
// array of 0..1 amplitude values) for the static waveform shown in
// VoiceMessagePlayer. Recording and decoding both happen client-side —
// the finished blob is uploaded via blobUpload.js like any other
// message attachment.

export function createRecorder() {
  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let startedAt = 0;

  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg']
      .find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    startedAt = Date.now();
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.start();
  }

  function stop() {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve({ blob: null, durationMs: 0 });
        return;
      }
      mediaRecorder.onstop = () => {
        stream?.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        resolve({ blob, durationMs: Date.now() - startedAt });
      };
      mediaRecorder.stop();
    });
  }

  function cancel() {
    try { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch { /* noop */ }
    stream?.getTracks().forEach(t => t.stop());
  }

  return { start, stop, cancel };
}

/** Downsamples a recorded audio blob into `bucketCount` amplitude values (0..1). */
export async function computeWaveformPeaks(blob, bucketCount = 32) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channel = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / bucketCount));
    const raw = [];
    for (let i = 0; i < bucketCount; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) sum += Math.abs(channel[start + j] || 0);
      raw.push(sum / blockSize);
    }
    ctx.close();
    const max = Math.max(...raw, 0.0001);
    return raw.map(v => Math.max(0.08, v / max));
  } catch {
    // Decoding can fail on some browser/codec combos — a flat-ish
    // placeholder waveform beats losing the recording entirely.
    return Array.from({ length: bucketCount }, () => 0.25 + Math.random() * 0.35);
  }
}
