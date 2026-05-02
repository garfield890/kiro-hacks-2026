/**
 * Text-based chapter / section heading detector.
 *
 * Splits a flat word array into sections by scanning for heading patterns.
 * Works on the raw word tokens so it can be used by both PDF and EPUB parsers
 * as a fallback (or primary) detection method.
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

// Roman numerals up to 100
const ROMAN_RE = /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
function isRoman(s) {
  if (!s || s.length === 0 || s.length > 10) return false;
  const clean = s.replace(/[.,;:!?]$/, '');
  if (clean.length === 0) return false;
  return ROMAN_RE.test(clean) && clean.toUpperCase() !== '';
}

function isArabic(s) {
  return /^\d{1,3}[.,;:]?$/.test(s);
}

function isWordNumber(s) {
  return WORD_NUM_SET.has(s.toLowerCase().replace(/[.,;:!?]$/, ''));
}

// ── Heading-prefix keywords ───────────────────────────────────────────────────

// These words, when followed by a number/numeral/word-number (or standing alone
// on a "line"), strongly indicate a chapter boundary.
const CHAPTER_KEYWORDS = new Set([
  'chapter', 'part', 'section', 'book', 'volume', 'act', 'scene',
  'prologue', 'epilogue', 'introduction', 'preface', 'foreword',
  'afterword', 'appendix', 'interlude', 'coda', 'conclusion',
]);

// ── Core detector ─────────────────────────────────────────────────────────────

/**
 * Given a flat array of word strings, return sections:
 *   [{ title: string, startIndex: number, words: string[] }]
 *
 * Strategy:
 *  1. Walk the word array looking for heading candidates.
 *  2. A heading candidate is a short run of words (≤ 8) that matches one of:
 *       a) KEYWORD  [NUMBER|ROMAN|WORD_NUM]  [optional subtitle words]
 *          e.g. "Chapter 1", "Chapter One", "Part IV", "Book Three"
 *       b) Standalone number/roman at the start of a "paragraph"
 *          e.g. "1", "I", "IV", "One", "Twenty-Three"
 *          — only accepted when preceded by a paragraph gap (≥ 2 consecutive
 *            whitespace-only tokens, or at position 0) AND followed by normal
 *            prose (not another number).
 *  3. To avoid false positives inside sentences, we require that a heading
 *     candidate is "isolated" — the token immediately before it (if any) ends
 *     with sentence-ending punctuation OR is a blank/gap marker.
 *
 * The words array should be pre-split on whitespace and filtered of empties,
 * BUT we accept an optional `rawText` string for better gap detection.
 * If rawText is not provided we use a heuristic based on word content.
 */
export function detectChapters(words, rawText = null) {
  if (!words || words.length === 0) return [{ title: 'Document', startIndex: 0, words }];

  // Build a set of word indices that follow a paragraph break.
  // A paragraph break is: a blank line in rawText, or a sentence-ending word
  // (ends with . ! ?) followed by a capitalised word.
  const afterBreak = new Set();
  afterBreak.add(0);

  if (rawText) {
    // Split rawText into paragraphs by blank lines, map back to word indices
    const paragraphBreakPositions = getParagraphWordIndices(rawText, words);
    for (const idx of paragraphBreakPositions) afterBreak.add(idx);
  } else {
    // Heuristic: word ends sentence if it ends with [.!?] or is ALL-CAPS short
    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      if (/[.!?]["']?$/.test(prev)) afterBreak.add(i);
    }
  }

  const boundaries = []; // word indices where a new chapter starts

  let i = 0;
  while (i < words.length) {
    const w = words[i];
    const wLow = w.toLowerCase().replace(/[.,;:!?'"]+$/, '');

    // ── Pattern A: KEYWORD [number/name] [optional subtitle] ──────────────
    if (CHAPTER_KEYWORDS.has(wLow)) {
      // Accept anywhere — chapter keywords are strong signals
      const headingWords = [w];
      let j = i + 1;

      // Consume optional number token
      if (j < words.length) {
        const next = words[j];
        if (isArabic(next) || isRoman(next) || isWordNumber(next)) {
          headingWords.push(next);
          j++;
        }
      }

      // Consume optional subtitle (up to 5 more words, stop at sentence end)
      while (j < words.length && headingWords.length < 8) {
        const tok = words[j];
        if (/[.!?]$/.test(tok)) { headingWords.push(tok); j++; break; }
        // Stop if next token looks like a new heading keyword
        if (CHAPTER_KEYWORDS.has(tok.toLowerCase())) break;
        headingWords.push(tok);
        j++;
      }

      const title = headingWords.join(' ').replace(/[.,;:]+$/, '').trim();
      boundaries.push({ index: i, title });
      i = j;
      continue;
    }

    // ── Pattern B: Standalone numeral / word-number after a break ─────────
    if (afterBreak.has(i)) {
      const clean = w.replace(/[.,;:!?'"]+$/, '');

      if (isRoman(clean) || isArabic(clean) || isWordNumber(clean)) {
        // Make sure the NEXT word isn't also a number (avoids "1 2 3" lists)
        const nextW = words[i + 1] || '';
        const nextClean = nextW.replace(/[.,;:!?'"]+$/, '');
        const nextIsNum = isArabic(nextClean) || isRoman(nextClean) || isWordNumber(nextClean);

        if (!nextIsNum) {
          // Also require the word after the number to be a normal word or nothing
          // (prevents matching things like "I don't" — "I" is roman for 1 but
          //  here it's a pronoun; we detect this by checking if the next word
          //  is a common pronoun/article/preposition)
          if (!isFunctionWord(nextW)) {
            const title = clean;
            boundaries.push({ index: i, title });
            i++;
            continue;
          }
        }
      }
    }

    i++;
  }

  // ── Deduplicate boundaries that are too close together (< 30 words apart) ─
  const filtered = [];
  for (const b of boundaries) {
    if (filtered.length === 0 || b.index - filtered[filtered.length - 1].index >= 30) {
      filtered.push(b);
    }
  }

  if (filtered.length === 0) {
    return [{ title: 'Document', startIndex: 0, words }];
  }

  // ── Build sections ────────────────────────────────────────────────────────
  const sections = [];

  // Content before first detected heading
  if (filtered[0].index > 0) {
    sections.push({
      title: 'Preface',
      startIndex: 0,
      words: words.slice(0, filtered[0].index),
    });
  }

  for (let bi = 0; bi < filtered.length; bi++) {
    const start = filtered[bi].index;
    const end = bi + 1 < filtered.length ? filtered[bi + 1].index : words.length;
    sections.push({
      title: filtered[bi].title,
      startIndex: start,
      words: words.slice(start, end),
    });
  }

  return sections;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Common English function words that follow "I" as a pronoun, not a chapter num
const FUNCTION_WORDS = new Set([
  'i','a','an','the','is','am','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','shall','should',
  'may','might','must','can','could','need','dare','ought','used',
  'to','of','in','on','at','by','for','with','about','against','between',
  'into','through','during','before','after','above','below','from',
  'up','down','out','off','over','under','again','further','then','once',
  'and','but','or','nor','so','yet','both','either','neither','not',
  'no','nor','just','because','as','until','while','although','though',
  'if','unless','since','when','where','who','which','that','this','these',
  'those','my','your','his','her','its','our','their','me','him','us','them',
  'what','how','why','all','each','every','few','more','most','other',
  'some','such','than','too','very','s','t','don','won','can',
]);

function isFunctionWord(w) {
  if (!w) return false;
  return FUNCTION_WORDS.has(w.toLowerCase().replace(/[.,;:!?'"]+$/, ''));
}

/**
 * Given the raw text and the word array, find word indices that start
 * a new paragraph (blank-line separated block).
 */
function getParagraphWordIndices(rawText, words) {
  const result = new Set();
  // Split on blank lines (two or more newlines)
  const paragraphs = rawText.split(/\n\s*\n+/);
  let wordCursor = 0;

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).filter(Boolean);
    if (paraWords.length === 0) continue;
    // Find where this paragraph starts in the words array
    // (simple linear scan — good enough for typical book sizes)
    const firstWord = paraWords[0];
    for (let k = wordCursor; k < Math.min(wordCursor + 50, words.length); k++) {
      if (words[k] === firstWord) {
        result.add(k);
        wordCursor = k + paraWords.length;
        break;
      }
    }
  }

  return result;
}
