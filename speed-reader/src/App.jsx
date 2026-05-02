import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { WordDisplay } from './components/WordDisplay';
import { ChapterSlider } from './components/ChapterSlider';
import { Controls } from './components/Controls';
import { ThemeToggle } from './components/ThemeToggle';
import { SearchBar } from './components/SearchBar';
import { WhiteNoise } from './components/WhiteNoise';
import { TapeMode } from './components/TapeMode';
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
  const [tapeMode, setTapeMode] = useState(false);
  const [tapeOpacity, setTapeOpacity] = useState(0.35);

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
  const prevWords = tapeMode && hasContent
    ? [allWords[currentIndex - 2], allWords[currentIndex - 1]].filter(Boolean)
    : null;
  const nextWords = tapeMode && hasContent
    ? [allWords[currentIndex + 1], allWords[currentIndex + 2]].filter(Boolean)
    : null;
  // Build chapter boundaries for keyboard chapter-skip
  const chapterBoundaries = sections
    ? sections.reduce((acc, s) => {
        const prev = acc.length ? acc[acc.length - 1].index + acc[acc.length - 1].wordCount : 0;
        acc.push({ index: prev, wordCount: s.words.length });
        return acc;
      }, [])
    : [];

  function skipPrevChapter() {
    if (!chapterBoundaries.length) return;
    let idx = chapterBoundaries.findIndex((_, i) => {
      const next = chapterBoundaries[i + 1];
      return !next || currentIndex < next.index;
    });
    const chapterStart = chapterBoundaries[idx]?.index ?? 0;
    if (currentIndex - chapterStart > 3 && idx > 0) {
      seek(chapterStart);
    } else if (idx > 0) {
      seek(chapterBoundaries[idx - 1].index);
    }
  }

  function skipNextChapter() {
    if (!chapterBoundaries.length) return;
    const idx = chapterBoundaries.findIndex((_, i) => {
      const next = chapterBoundaries[i + 1];
      return !next || currentIndex < next.index;
    });
    const next = chapterBoundaries[idx + 1];
    if (next) seek(next.index);
  }

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (!hasContent) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (mod && e.code === 'ArrowRight') {
        e.preventDefault();
        skipNextChapter();
      } else if (mod && e.code === 'ArrowLeft') {
        e.preventDefault();
        skipPrevChapter();
      } else if (!mod && e.code === 'ArrowRight') {
        e.preventDefault();
        seek(Math.min(currentIndex + (e.shiftKey ? 10 : 1), allWords.length - 1));
      } else if (!mod && e.code === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(currentIndex - (e.shiftKey ? 10 : 1), 0));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasContent, toggle, currentIndex, sections, allWords]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>r e a d e r</h1>
      </header>

      <main className={`${styles.main} ${!hasContent ? styles.empty : ''}`}>
        <section className={styles.uploadSection}>
          <FileUpload onFile={handleFile} loading={loading} compact={hasContent} fileName={fileName} />
          {hasContent && error && <p className={styles.error}>{error}</p>}
        </section>

        {hasContent && (
          <section className={styles.readerSection}>
            <WordDisplay
              word={currentWord}
              isPlaying={isPlaying}
              allWords={allWords}
              currentIndex={currentIndex}
              tapeMode={tapeMode}
              tapeOpacity={tapeOpacity}
            />

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
              Space · ← → step · Shift+← → jump 10 · ⌘/Ctrl+← → chapter
            </p>

            <div className={styles.searchArea}>
              <SearchBar
                allWords={allWords}
                sections={sections}
                onSeek={seek}
                onPause={stop}
              />
            </div>

            <div className={styles.noiseRow}>
              <WhiteNoise />
              <TapeMode
                enabled={tapeMode}
                onToggle={() => setTapeMode(v => !v)}
                opacity={tapeOpacity}
                onOpacity={setTapeOpacity}
              />
            </div>
          </section>
        )}

        {!hasContent && !loading && (
          <div className={styles.emptyState}>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <ThemeToggle preference={preference} onChange={setPreference} />
      </footer>
    </div>
  );
}
