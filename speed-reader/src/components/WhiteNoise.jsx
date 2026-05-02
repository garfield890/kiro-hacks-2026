import { useState, useRef, useCallback } from 'react';
import styles from './WhiteNoise.module.css';

export function WhiteNoise() {
  const [playing, setPlaying] = useState(false);

  const ctxRef    = useRef(null);
  const gainRef   = useRef(null);
  const sourceRef = useRef(null);

  const start = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Brown noise: integrate white noise samples (running sum), then normalise.
    // Each sample = prev + random step, clamped to prevent drift.
    const bufferSize = ctx.sampleRate * 4; // 4-second loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // leaky integrator
      data[i] = last;
    }
    // Normalise to prevent clipping
    let peak = 0;
    for (let i = 0; i < bufferSize; i++) if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
    if (peak > 0) for (let i = 0; i < bufferSize; i++) data[i] /= peak;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.15; // quiet by default

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    sourceRef.current = source;
    gainRef.current   = gain;
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setPlaying(false);
  }, []);

  function toggle() {
    if (playing) stop(); else start();
  }

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${playing ? styles.active : ''}`}
        onClick={toggle}
        aria-label={playing ? 'Stop brown noise' : 'Play brown noise'}
        title={playing ? 'Stop brown noise' : 'Play brown noise'}
      >
        {playing ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1"/>
            <rect x="15" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        )}
        <span>brown noise</span>
      </button>
    </div>
  );
}
