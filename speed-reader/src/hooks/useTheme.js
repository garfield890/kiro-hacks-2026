import { useState, useEffect } from 'react';

// Persisted preference: 'system' | 'light' | 'dark'
const STORAGE_KEY = 'speed-reader-theme';

export function useTheme() {
  const [preference, setPreference] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  });

  // Resolved: 'light' | 'dark'
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Track system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolved = preference === 'system'
    ? (systemDark ? 'dark' : 'light')
    : preference;

  // Apply to <html> as a data attribute so CSS can key off it
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  function setAndPersist(value) {
    setPreference(value);
    localStorage.setItem(STORAGE_KEY, value);
  }

  return { preference, resolved, setPreference: setAndPersist };
}
