import { useState, useRef, useEffect } from 'react';
import styles from './SearchBar.module.css';

// Vite's ?worker syntax gives us a constructor for the worker module
import SearchWorker from '../workers/search.worker.js?worker';

export function SearchBar({ allWords, sections, onSeek, onPause }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);  // null = no search yet, [] = searched but empty
  const [displayedResults, setDisplayedResults] = useState(null); // last non-empty results
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const wrapperRef  = useRef(null);
  const workerRef   = useRef(null);
  const searchId    = useRef(0);
  const debounceRef = useRef(null);
  const typingTimer = useRef(null); // clears "isTyping" after keystroke gap
  const TYPING_TIMEOUT = 600; // ms of silence before considered "done typing"

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Spin up the worker once
  useEffect(() => {
    workerRef.current = new SearchWorker();
    workerRef.current.onmessage = (e) => {
      const { type, matches, id } = e.data;
      if (type === 'results' && id === searchId.current) {
        setResults(matches);
        if (matches.length > 0) {
          setDisplayedResults(matches);
        }
        // If no matches and user has stopped typing, show the empty state
        // (isTyping check happens in render — we just store the raw results here)
        setActiveIdx(0);
        setOpen(true);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  // Re-index whenever the word array changes
  useEffect(() => {
    if (!allWords || !workerRef.current) return;
    workerRef.current.postMessage({ type: 'index', words: allWords });
    setResults(null);
    setDisplayedResults(null);
    setOpen(false);
  }, [allWords]);

  // Debounced search on query change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults(null);
      setDisplayedResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const id = ++searchId.current;
      workerRef.current?.postMessage({ type: 'search', query: q, id });
    }, 80); // 80 ms debounce — fast enough to feel instant, avoids mid-word searches
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Snippet builder (main thread, only for displayed results) ────────────
  function getSnippet(idx) {
    const qLen  = query.trim().split(/\s+/).length;
    const start = Math.max(0, idx - 4);
    const end   = Math.min(allWords.length, idx + qLen + 4);
    return allWords.slice(start, end).map((w, i) => ({
      word: w,
      bold: i >= idx - start && i < idx - start + qLen,
    }));
  }

  function goTo(wordIndex) {
    onPause();
    onSeek(wordIndex);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (!displayedResults || displayedResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, Math.min(displayedResults.length, 12) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goTo(displayedResults[displayedResults.length === 1 ? 0 : activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Build chapter boundary list from sections for fast lookup
  const chapterBoundaries = [];
  if (sections) {
    let offset = 0;
    for (const s of sections) {
      chapterBoundaries.push({ index: offset, title: s.title });
      offset += s.words.length;
    }
  }

  function getChapter(wordIdx) {
    for (let i = chapterBoundaries.length - 1; i >= 0; i--) {
      if (wordIdx >= chapterBoundaries[i].index) return chapterBoundaries[i].title;
    }
    return '';
  }

  // While actively typing with no match → keep showing last good results (stale).
  // Once typing stops → show whatever results actually are (including empty state).
  const listResults = (results !== null && results.length === 0 && isTyping)
    ? displayedResults
    : (results !== null && results.length > 0 ? results : displayedResults);
  const showEmpty = open && results !== null && results.length === 0 && !isTyping && !listResults?.length;
  const count = results?.length ?? 0;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputRow}>
        <svg className={styles.icon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Search…"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            // Mark as actively typing; reset the idle timer
            setIsTyping(true);
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setIsTyping(false), TYPING_TIMEOUT);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => listResults && setOpen(true)}
          aria-label="Search text"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button
            className={styles.clear}
            onClick={() => { setQuery(''); setResults(null); setDisplayedResults(null); setOpen(false); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >×</button>
        )}
        {results !== null && !isTyping && (
          <span className={styles.count}>
            {count === 0 ? 'no results' : `${count} result${count === 1 ? '' : 's'}`}
          </span>
        )}      </div>

      {open && listResults && listResults.length > 0 && (
        <ul ref={listRef} className={styles.list} role="listbox">
          {listResults.length === 1 && (
            <li
              className={`${styles.item} ${styles.active}`}
              role="option"
              aria-selected="true"
              onClick={() => goTo(listResults[0])}
              data-active="true"
            >
              <span className={styles.chapterTag}>{getChapter(listResults[0])}</span>
              <span className={styles.resultNum}>1</span>
              <Snippet tokens={getSnippet(listResults[0])} />
              <span className={styles.jumpHint}>↵ jump</span>
            </li>
          )}
          {listResults.length > 1 && listResults.slice(0, 12).map((wordIdx, i) => (
            <li
              key={wordIdx}
              className={`${styles.item} ${i === activeIdx ? styles.active : ''}`}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => goTo(wordIdx)}
              onMouseEnter={() => setActiveIdx(i)}
              data-active={i === activeIdx ? 'true' : 'false'}
            >
              <span className={styles.chapterTag}>{getChapter(wordIdx)}</span>
              <span className={styles.resultNum}>{i + 1}</span>
              <Snippet tokens={getSnippet(wordIdx)} />
            </li>
          ))}
          {listResults.length > 12 && (
            <li className={styles.overflow}>+{listResults.length - 12} more — refine your search</li>
          )}
        </ul>
      )}

      {showEmpty && (
        <div className={styles.empty}>No matches found</div>
      )}
    </div>
  );
}

function Snippet({ tokens }) {
  return (
    <span className={styles.snippet}>
      {tokens.map((t, i) =>
        t.bold
          ? <strong key={i}>{t.word} </strong>
          : <span key={i}>{t.word} </span>
      )}
    </span>
  );
}
