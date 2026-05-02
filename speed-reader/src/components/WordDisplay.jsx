import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './WordDisplay.module.css';

const CONTEXT = 20;

export function WordDisplay({ word, allWords, currentIndex, tapeMode, tapeOpacity }) {
  const anchorRef  = useRef(null);
  const stripRef   = useRef(null);
  const portalRef  = useRef(null);
  const [portalEl, setPortalEl] = useState(null);
  const placeholderRef = useRef(null);
  const [tapeTop, setTapeTop] = useState(0);

  // Create a fixed portal container once
  useEffect(() => {
    const el = document.createElement('div');
    el.className = styles.tapeViewport;
    document.body.appendChild(el);
    portalRef.current = el;
    setPortalEl(el);
    return () => document.body.removeChild(el);
  }, []);

  // Track placeholder position to align the fixed overlay
  useLayoutEffect(() => {
    if (!placeholderRef.current) return;
    const rect = placeholderRef.current.getBoundingClientRect();
    setTapeTop(rect.top);
    if (portalRef.current) {
      portalRef.current.style.top = `${rect.top}px`;
      portalRef.current.style.height = `${rect.height}px`;
    }
  });

  // Center the strip horizontally
  useLayoutEffect(() => {
    if (!tapeMode || !anchorRef.current || !stripRef.current) return;
    const viewportW  = window.innerWidth;
    const stripRect  = stripRef.current.getBoundingClientRect();
    const wordRect   = anchorRef.current.getBoundingClientRect();
    // Reset to measure natural position
    stripRef.current.style.transform = 'translateX(0)';
    const stripRectReset = stripRef.current.getBoundingClientRect();
    const wordRectReset  = anchorRef.current.getBoundingClientRect();
    const wordMid  = wordRectReset.left + wordRectReset.width / 2;
    const shift    = viewportW / 2 - wordMid;
    stripRef.current.style.transform = `translateX(${shift}px)`;
  });

  if (!tapeMode || !allWords) {
    return (
      <div className={styles.container}>
        <span className={styles.wordCenter}>{word || '—'}</span>
      </div>
    );
  }

  const start  = Math.max(0, currentIndex - CONTEXT);
  const end    = Math.min(allWords.length, currentIndex + CONTEXT + 1);
  const slice  = allWords.slice(start, end);
  const relIdx = currentIndex - start;

  const strip = (
    <div
      className={styles.strip}
      ref={stripRef}
      style={{ position: 'absolute', top: '25%', transform: 'translateY(-50%)', whiteSpace: 'nowrap', lineHeight: 1 }}
    >
      {slice.map((w, i) => {
        const isCurrent = i === relIdx;
        return (
          <span
            key={start + i}
            ref={isCurrent ? anchorRef : null}
            className={styles.tapeWord}
            style={{ opacity: isCurrent ? 1 : tapeOpacity }}
          >
            {w}{i < slice.length - 1 ? '\u00A0' : ''}
          </span>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Placeholder reserves space in the normal flow */}
      <div ref={placeholderRef} className={styles.container} />
      {/* Strip renders into a fixed viewport overlay via portal */}
      {portalEl && createPortal(strip, portalEl)}
    </>
  );
}
