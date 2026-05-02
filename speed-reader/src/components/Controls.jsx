import styles from './Controls.module.css';

export function Controls({ isPlaying, onToggle, wpm, onWpmChange, disabled }) {
  return (
    <div className={styles.controls}>
      {/* Play/Pause */}
      <button
        className={styles.playBtn}
        onClick={onToggle}
        disabled={disabled}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* WPM control */}
      <div className={styles.wpmGroup}>
        <label className={styles.wpmLabel} htmlFor="wpm-slider">
          <span className={styles.wpmValue}>{wpm}</span>
          <span className={styles.wpmUnit}>wpm</span>
        </label>
        <input
          id="wpm-slider"
          type="range"
          min={60}
          max={1000}
          step={10}
          value={wpm}
          onChange={(e) => onWpmChange(Number(e.target.value))}
          className={styles.wpmSlider}
          aria-label="Words per minute"
        />
        <div className={styles.wpmRange}>
          <span>60</span>
          <span>1000</span>
        </div>
      </div>
    </div>
  );
}
