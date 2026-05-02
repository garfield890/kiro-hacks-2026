import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeedReader(allWords) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const intervalRef = useRef(null);

  const msPerWord = Math.round(60000 / wpm);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (!allWords || allWords.length === 0) return;
    if (currentIndex >= allWords.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [allWords, currentIndex]);

  const toggle = useCallback(() => {
    if (isPlaying) stop();
    else play();
  }, [isPlaying, play, stop]);

  // Drive the interval
  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= allWords.length - 1) {
          stop();
          return prev;
        }
        return prev + 1;
      });
    }, msPerWord);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, msPerWord, allWords, stop]);

  // Reset on new content
  useEffect(() => {
    stop();
    setCurrentIndex(0);
  }, [allWords]); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(index, (allWords?.length ?? 1) - 1)));
  }, [allWords]);

  return {
    currentIndex,
    isPlaying,
    wpm,
    setWpm,
    play,
    stop,
    toggle,
    seek,
  };
}
