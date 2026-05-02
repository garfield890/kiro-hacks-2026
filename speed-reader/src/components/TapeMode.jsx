import styles from './TapeMode.module.css';

export function TapeMode({ enabled, onToggle, opacity, onOpacity }) {
  return (
    <div className={styles.row}>
      <button
        className={`${styles.btn} ${enabled ? styles.active : ''}`}
        onClick={onToggle}
        aria-label={enabled ? 'Disable tape mode' : 'Enable tape mode'}
        title="Tape mode"
      >
        {/* Tape/film strip icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="7" width="20" height="10" rx="2"/>
          <circle cx="7" cy="12" r="2"/>
          <circle cx="17" cy="12" r="2"/>
          <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        <span>tape mode</span>
      </button>

      {enabled && (
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.01}
          value={opacity}
          onChange={e => onOpacity(Number(e.target.value))}
          className={styles.slider}
          aria-label="Context word opacity"
          title={`Context opacity: ${Math.round(opacity * 100)}%`}
        />
      )}
    </div>
  );
}
