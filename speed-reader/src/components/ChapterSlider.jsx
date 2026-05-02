import { useRef, useCallback, useEffect, useState } from 'react';
import styles from './ChapterSlider.module.css';

/**
 * sections: [{ title, words }]
 * currentIndex: global word index
 * totalWords: total word count
 * onSeek(index): called when user drags/clicks
 * isPlaying: bool — used to pause at chapter boundaries
 * onPause: called when playback should pause (chapter boundary hit)
 */
export function ChapterSlider({ sections, currentIndex, totalWords, onSeek, isPlaying, onPause }) {
  const trackRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { x, label }
  const [hoveredTick, setHoveredTick] = useState(null);

  // Build chapter boundary data
  const chapterBoundaries = [];
  let offset = 0;
  for (let i = 0; i < sections.length; i++) {
    chapterBoundaries.push({
      index: offset,
      title: sections[i].title,
      wordCount: sections[i].words.length,
    });
    offset += sections[i].words.length;
  }

  // Pause at chapter boundaries when playing
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (!isPlaying) {
      prevIndexRef.current = currentIndex;
      return;
    }
    // Check if we just crossed a chapter boundary (not the very first one)
    for (let i = 1; i < chapterBoundaries.length; i++) {
      const boundary = chapterBoundaries[i].index;
      if (prevIndexRef.current < boundary && currentIndex >= boundary) {
        onPause();
        break;
      }
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const getIndexFromX = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track || totalWords === 0) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (totalWords - 1));
  }, [totalWords]);

  function handleTrackClick(e) {
    onSeek(getIndexFromX(e.clientX));
  }

  function handleMouseMove(e) {
    const track = trackRef.current;
    if (!track || totalWords === 0) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(ratio * (totalWords - 1));

    // Find which section this index belongs to
    let sectionTitle = '';
    for (let i = chapterBoundaries.length - 1; i >= 0; i--) {
      if (idx >= chapterBoundaries[i].index) {
        sectionTitle = chapterBoundaries[i].title;
        break;
      }
    }

    setTooltip({ x: e.clientX - rect.left, label: sectionTitle || `Word ${idx + 1}` });
  }

  function handleMouseLeave() {
    setTooltip(null);
    setHoveredTick(null);
  }

  // Drag support
  const dragging = useRef(false);

  function onMouseDown(e) {
    dragging.current = true;
    document.body.style.userSelect = 'none';
    onSeek(getIndexFromX(e.clientX));
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  }

  function onWindowMouseMove(e) {
    if (dragging.current) onSeek(getIndexFromX(e.clientX));
  }

  function onWindowMouseUp() {
    dragging.current = false;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = totalWords > 1 ? currentIndex / (totalWords - 1) : 0;

  // Current section index
  let currentSectionIdx = 0;
  let currentSection = '';
  for (let i = chapterBoundaries.length - 1; i >= 0; i--) {
    if (currentIndex >= chapterBoundaries[i].index) {
      currentSectionIdx = i;
      currentSection = chapterBoundaries[i].title;
      break;
    }
  }

  function skipPrevChapter() {
    // If we're more than 3 words into the current chapter, go to its start.
    // If we're near the start already, go to the previous chapter.
    const chapterStart = chapterBoundaries[currentSectionIdx].index;
    if (currentIndex - chapterStart > 3 && currentSectionIdx > 0) {
      onSeek(chapterStart);
    } else {
      const prev = chapterBoundaries[currentSectionIdx - 1];
      if (prev) onSeek(prev.index);
    }
  }

  function skipNextChapter() {
    const next = chapterBoundaries[currentSectionIdx + 1];
    if (next) onSeek(next.index);
  }

  const canGoPrev = currentSectionIdx > 0 || currentIndex > chapterBoundaries[0]?.index + 3;
  const canGoNext = currentSectionIdx < chapterBoundaries.length - 1;

  return (
    <div className={styles.wrapper}>
      {/* Section label */}
      <div className={styles.sectionLabel}>
        <span className={styles.sectionName}>{currentSection}</span>
        <span className={styles.wordCount}>
          {currentIndex + 1} / {totalWords} ({totalWords > 1 ? ((currentIndex + 1) / totalWords * 100).toFixed(1) : '0.0'}%)
        </span>
      </div>

      {/* Slider row with skip buttons */}
      <div className={styles.sliderRow}>
        <button
          className={styles.skipBtn}
          onClick={skipPrevChapter}
          disabled={!canGoPrev}
          aria-label="Previous chapter"
          title="Previous chapter"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19,5 9,12 19,19" />
            <rect x="5" y="5" width="3" height="14" rx="1" />
          </svg>
        </button>

        <div
          className={styles.trackOuter}
          ref={trackRef}
          onClick={handleTrackClick}
          onMouseDown={onMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={totalWords - 1}
          aria-valuenow={currentIndex}
          aria-label="Reading position"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.preventDefault();
          }}
        >
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${progress * 100}%` }} />

            {chapterBoundaries.map((ch, i) => {
              if (i === 0) return null;
              const pct = totalWords > 1 ? (ch.index / (totalWords - 1)) * 100 : 0;
              return (
                <div
                  key={i}
                  className={`${styles.tick} ${hoveredTick === i ? styles.tickHovered : ''}`}
                  style={{ left: `${pct}%` }}
                  onMouseEnter={() => setHoveredTick(i)}
                  onMouseLeave={() => setHoveredTick(null)}
                  title={ch.title}
                >
                  <div className={styles.tickLine} />
                  <div className={styles.tickLabel}>{ch.title}</div>
                </div>
              );
            })}

            <div className={styles.thumb} style={{ left: `${progress * 100}%` }} />
          </div>

          {tooltip && (
            <div className={styles.tooltip} style={{ left: `${tooltip.x}px` }}>
              {tooltip.label}
            </div>
          )}
        </div>

        <button
          className={styles.skipBtn}
          onClick={skipNextChapter}
          disabled={!canGoNext}
          aria-label="Next chapter"
          title="Next chapter"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,5 15,12 5,19" />
            <rect x="16" y="5" width="3" height="14" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
