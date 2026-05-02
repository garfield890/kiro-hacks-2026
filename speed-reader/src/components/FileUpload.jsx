import { useRef, useState } from 'react';
import styles from './FileUpload.module.css';

export function FileUpload({ onFile, loading, compact, fileName }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'epub') {
      alert('Please upload a PDF or EPUB file.');
      return;
    }
    onFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onClick() {
    inputRef.current?.click();
  }

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${loading ? styles.loading : ''} ${compact ? styles.compact : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={loading ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label="Upload PDF or EPUB file"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>Parsing file…</span>
        </div>
      ) : (
        <div className={styles.idle}>
          <div className={styles.icon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          {compact && fileName ? (
            <div className={styles.labelSwap}>
              <p className={`${styles.primary} ${(hovered || dragging) ? styles.labelHidden : ''}`}>{fileName}</p>
              <p className={`${styles.primary} ${styles.labelOver} ${(hovered || dragging) ? '' : styles.labelHidden}`}>Drop a PDF or EPUB here</p>
            </div>
          ) : (
            <>
              <p className={styles.primary}>Drop a PDF or EPUB here</p>
              {!compact && <p className={styles.secondary}>or click to browse</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
