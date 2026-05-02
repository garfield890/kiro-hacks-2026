import styles from './ThemeToggle.module.css';

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
];

export function ThemeToggle({ preference, onChange }) {
  return (
    <div className={styles.toggle} role="group" aria-label="Color theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`${styles.option} ${preference === opt.value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={preference === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
