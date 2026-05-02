import styles from './WordDisplay.module.css';

export function WordDisplay({ word, isPlaying }) {
  return (
    <div className={styles.container}>
      <div className={`${styles.word} ${isPlaying ? styles.playing : ''}`}>
        {word || '—'}
      </div>
    </div>
  );
}
