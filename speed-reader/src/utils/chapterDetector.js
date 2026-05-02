/**
 * Text-based chapter / section heading detector.
 *
 * Splits a flat word array into sections by scanning for heading patterns.
 * Designed to work on the raw word tokens produced by PDF/EPUB parsers.
 */

// ── Number helpers ────────────────────────────────────────────────────────────

const WORD_NUMS = [
  'zero','one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen',
  'eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three',
  'twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight',
  'twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four',
  'thirty-five','thirty-six','thirty-seven','thirty-eight','thirty-nine','forty',
  'forty-one','forty-two','forty-three','forty-four','forty-five','forty-six',
  'forty-seven','forty-eight','forty-nine','fifty',
];
const WORD_NUM_SET = new Set(WORD_NUMS.map(w => w.toLowerCase()));

// Roman numerals I–C (1–100). Must be the ENTIRE token after stripping punctuation.
const ROMAN_RE = /^(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
function isRoman(s) {
  const clean = s.replace(/[.,;:!?'"]+$/, '').trim();
  if (!clean || clean.length > 7) return false;
  if (!ROMAN_RE.test(clean)) return false;
  // Exclude the empty string match (ROMAN_RE matches '' because all groups optional)
  return clean.length > 0;
}

function isArabic(s) {
  return /^\d{1,3}[.,;:]?$/.test(s);
}

function isWordNumber(s) {
  return WORD_NUM_SET.has(s.toLowerCase().replace(/[.,;:!?'"]+$/, ''));
}

// ── Chapter keyword prefixes ──────────────────────────────────────────────────

const CHAPTER_KEYWORDS = new Set([
  'chapter', 'part', 'section', 'book', 'volume', 'act', 'scene',
  'prologue', 'epilogue', 'introduction', 'preface', 'foreword',
  'afterword', 'appendix', 'interlude', 'coda', 'conclusion',
]);

// ── Core detector ─────────────────────────────────────────────────────────────

/**
 * detectChapters(words, rawText?)
 *
 * Returns [{ title, startIndex, words }]
 *
 * Two detection modes depending on whether rawText is supplied:
 *
 * WITH rawText (preferred):
 *   Parse paragraphs from blank-line-separated blocks. A paragraph that
 *   consists of ONLY a chapter heading token (roman numeral, arabic number,
 *   word-number, or keyword+number) is treated as a chapter boundary.
 *   This is the most accurate mode and handles "I", "II", "V" etc. correctly
 *   because they must be the sole content of a paragraph.
 *
 * WITHOUT rawText:
 *   Fall back to scanning for keyword-prefixed headings (Pattern A) only.
 *   Standalone numerals are NOT matched in this mode to avoid false positives.
 */
export function detectChapters(words, rawText = null) {
  if (!words || words.length === 0) {
    return [{ title: 'Document', startIndex: 0, words }];
  }

  const boundaries = rawText
    ? detectWithRawText(words, rawText)
    : detectKeywordsOnly(words);

  // Deduplicate boundaries closer than 20 words apart
  const filtered = [];
  for (const b of boundaries) {
    if (filtered.length === 0 || b.index - filtered[filtered.length - 1].index >= 20) {
      filtered.push(b);
    }
  }

  if (filtered.length === 0) {
    return [{ title: 'Document', startIndex: 0, words }];
  }

  return buildSections(words, filtered);
}

// ── Mode 1: paragraph-aware detection ────────────────────────────────────────

function detectWithRawText(words, rawText) {
  // Split into paragraphs on blank lines
  const paragraphs = rawText.split(/\n[ \t]*\n+/);

  // Map each paragraph's first word back to a word-array index.
  // We walk the word array linearly to avoid O(n²) behaviour.
  let wordCursor = 0;
  const boundaries = [];

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).filter(Boolean);
    if (paraWords.length === 0) continue;

    // Find where this paragraph starts in the words array
    const firstWord = paraWords[0];
    let found = -1;
    const searchLimit = Math.min(wordCursor + 200, words.length);
    for (let k = wordCursor; k < searchLimit; k++) {
      if (words[k] === firstWord) {
        found = k;
        wordCursor = k + paraWords.length;
        break;
      }
    }
    if (found === -1) continue;

    // ── Is this paragraph a chapter heading? ──────────────────────────────

    // Pattern A: keyword [number]  (any paragraph length up to 8 words)
    if (paraWords.length <= 8) {
      const firstLow = paraWords[0].toLowerCase().replace(/[.,;:!?'"]+$/, '');
      if (CHAPTER_KEYWORDS.has(firstLow)) {
        const title = paraWords.join(' ').replace(/[.,;:]+$/, '').trim();
        boundaries.push({ index: found, title });
        continue;
      }
    }

    // Pattern B: paragraph is ONLY a numeral / word-number (1–3 tokens max)
    // This correctly handles "I", "II", "V", "One", "1" as chapter markers
    // while rejecting them when they appear inside prose paragraphs.
    if (paraWords.length <= 3) {
      const token = paraWords[0].replace(/[.,;:!?'"]+$/, '');
      const isNum = isArabic(token) || isRoman(token) || isWordNumber(token);

      if (isNum) {
        // If the paragraph has more words, they must also be numbers or
        // a subtitle-like phrase (not prose). We check the second word.
        let accept = true;
        if (paraWords.length > 1) {
          const second = paraWords[1].replace(/[.,;:!?'"]+$/, '');
          // Accept "Chapter One", "Part Two" style — second word is also a num
          // or the whole thing is short enough to be a subtitle
          if (!isArabic(second) && !isRoman(second) && !isWordNumber(second)) {
            // Two-word paragraph like "I Introduction" — still a heading
            // Three-word paragraph like "I The Party" — still a heading
            // But "I went to" — reject (4+ words handled by length guard above)
            accept = paraWords.length <= 3;
          }
        }

        if (accept) {
          const title = paraWords.join(' ').replace(/[.,;:]+$/, '').trim();
          boundaries.push({ index: found, title });
          continue;
        }
      }
    }
  }

  return boundaries;
}

// ── Mode 2: keyword-only detection (no rawText) ───────────────────────────────

function detectKeywordsOnly(words) {
  const boundaries = [];
  let i = 0;
  while (i < words.length) {
    const wLow = words[i].toLowerCase().replace(/[.,;:!?'"]+$/, '');
    if (CHAPTER_KEYWORDS.has(wLow)) {
      const headingWords = [words[i]];
      let j = i + 1;
      // Consume optional number token
      if (j < words.length) {
        const next = words[j].replace(/[.,;:!?'"]+$/, '');
        if (isArabic(next) || isRoman(next) || isWordNumber(next)) {
          headingWords.push(words[j]);
          j++;
        }
      }
      // Consume optional short subtitle (up to 4 more words)
      while (j < words.length && headingWords.length < 6) {
        const tok = words[j];
        if (/[.!?]$/.test(tok)) { headingWords.push(tok); j++; break; }
        if (CHAPTER_KEYWORDS.has(tok.toLowerCase())) break;
        headingWords.push(tok);
        j++;
      }
      const title = headingWords.join(' ').replace(/[.,;:]+$/, '').trim();
      boundaries.push({ index: i, title });
      i = j;
      continue;
    }
    i++;
  }
  return boundaries;
}

// ── Section builder ───────────────────────────────────────────────────────────

function buildSections(words, boundaries) {
  const sections = [];

  // Content before the first heading becomes its own section
  if (boundaries[0].index > 0) {
    sections.push({
      title: 'Beginning',
      startIndex: 0,
      words: words.slice(0, boundaries[0].index),
    });
  }

  for (let bi = 0; bi < boundaries.length; bi++) {
    const start = boundaries[bi].index;
    const end = bi + 1 < boundaries.length ? boundaries[bi + 1].index : words.length;
    sections.push({
      title: boundaries[bi].title,
      startIndex: start,
      words: words.slice(start, end),
    });
  }

  // The last section already runs to words.length, so the "end" is covered.
  return sections;
}
