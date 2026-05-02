import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { WordDisplay } from './components/WordDisplay';
import { ChapterSlider } from './components/ChapterSlider';
import { Controls } from './components/Controls';
import { ThemeToggle } from './components/ThemeToggle';
import { useSpeedReader } from './hooks/useSpeedReader';
import { useTheme } from './hooks/useTheme';
import { parsePDF } from './utils/pdfParser';
import { parseEPUB } from './utils/epubParser';
import styles from './App.module.css';

export default function App() {
  const { preference, setPreference } = useTheme();

  const [sections, setSections] = useState(null);
  const [allWords, setAllWords] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { currentIndex, isPlaying, wpm, setWpm, toggle, stop, seek } =
    useSpeedReader(allWords);

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError('');
    setSections(null);
    setAllWords(null);
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let result;
      if (ext === 'pdf') {
        result = await parsePDF(file);
      } else if (ext === 'epub') {
        result = await parseEPUB(file);
      } else {
        throw new Error('Unsupported file type');
      }

      if (!result.allWords || result.allWords.length === 0) {
        throw new Error('No readable text found in this file.');
      }

      setSections(result.sections);
      setAllWords(result.allWords);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const hasContent = allWords && allWords.length > 0;
  const currentWord = hasContent ? allWords[currentIndex] : '';

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (!hasContent) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasContent, toggle]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>SpeedReader</h1>
          {fileName && <span className={styles.fileName}>{fileName}</span>}
        </div>
        <ThemeToggle preference={preference} onChange={setPreference} />
      </header>

      <main className={styles.main}>
        <section className={styles.uploadSection}>
          <FileUpload onFile={handleFile} loading={loading} />
          {error && <p className={styles.error}>{error}</p>}
        </section>

        {hasContent && (
          <section className={styles.readerSection}>
            <WordDisplay word={currentWord} isPlaying={isPlaying} />

            <div className={styles.sliderArea}>
              <ChapterSlider
                sections={sections}
                currentIndex={currentIndex}
                totalWords={allWords.length}
                onSeek={seek}
                isPlaying={isPlaying}
                onPause={stop}
              />
            </div>

            <Controls
              isPlaying={isPlaying}
              onToggle={toggle}
              wpm={wpm}
              onWpmChange={setWpm}
              disabled={!hasContent}
            />

            <p className={styles.hint}>
              Space to play/pause · ← → to step · Shift+← → to jump 10
            </p>
          </section>
        )}

        {!hasContent && !loading && (
          <div className={styles.emptyState}>
            <p>Upload a PDF or EPUB to start reading at speed.</p>
          </div>
        )}
      </main>
    </div>
  );
}
