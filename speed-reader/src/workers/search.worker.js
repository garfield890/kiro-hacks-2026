/**
 * Search worker — runs phrase matching off the main thread.
 *
 * Messages IN:
 *   { type: 'index', words: string[] }   — load/replace the word array
 *   { type: 'search', query: string, id: number }  — run a search
 *
 * Messages OUT:
 *   { type: 'results', matches: number[], id: number }
 */

let words = [];

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'index') {
    // Pre-normalise every word once so searches are fast
    words = e.data.words.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, ''));
    return;
  }

  if (type === 'search') {
    const { query, id } = e.data;
    const q = query.trim().toLowerCase();

    if (!q || words.length === 0) {
      self.postMessage({ type: 'results', matches: [], id });
      return;
    }

    const queryTokens = q.split(/\s+/).filter(Boolean)
      .map(w => w.replace(/[^a-z0-9']/g, ''));

    const matches = [];
    const len = words.length - queryTokens.length;

    outer: for (let i = 0; i <= len; i++) {
      for (let j = 0; j < queryTokens.length; j++) {
        if (words[i + j] !== queryTokens[j]) continue outer;
      }
      matches.push(i);
    }

    self.postMessage({ type: 'results', matches, id });
  }
};
