import * as pdfjsLib from 'pdfjs-dist';
import { detectChapters } from './chapterDetector';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Parse a PDF file into sections.
 * Returns: { sections: [{ title, words: [] }], allWords: [] }
 *
 * Detection priority:
 *  1. PDF outline (bookmarks) — most reliable when present
 *  2. Text-based chapter heading detection via detectChapters()
 *  3. Single section fallback
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // ── Extract text with layout info ────────────────────────────────────────
  // We collect both a plain word array and a raw text string (preserving
  // newlines) so detectChapters can use paragraph breaks.
  const pageTexts = [];      // plain text per page
  const pageRawTexts = [];   // newline-preserved text per page

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Build text preserving line breaks by checking y-position jumps
    let lastY = null;
    const lines = [];
    let currentLine = [];

    for (const item of content.items) {
      if (!item.str) continue;
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.length) lines.push(currentLine.join(' '));
        currentLine = [];
      }
      currentLine.push(item.str);
      lastY = y;
    }
    if (currentLine.length) lines.push(currentLine.join(' '));

    pageTexts.push(lines.join(' '));
    pageRawTexts.push(lines.join('\n'));
  }

  // ── Try PDF outline first ─────────────────────────────────────────────────
  let outline = [];
  try { outline = await pdf.getOutline(); } catch (_) { outline = []; }

  const chapterPageMap = [];
  if (outline && outline.length > 0) {
    await resolveOutlinePages(pdf, outline, chapterPageMap);
    chapterPageMap.sort((a, b) => a.pageIndex - b.pageIndex);
  }

  if (chapterPageMap.length > 0) {
    // Use outline-based sections
    const sections = [];

    if (chapterPageMap[0].pageIndex > 0) {
      const preText = pageTexts.slice(0, chapterPageMap[0].pageIndex).join(' ');
      const words = preText.split(/\s+/).filter(Boolean);
      if (words.length > 0) sections.push({ title: 'Preface', words });
    }

    for (let ci = 0; ci < chapterPageMap.length; ci++) {
      const startPage = chapterPageMap[ci].pageIndex;
      const endPage = ci + 1 < chapterPageMap.length
        ? chapterPageMap[ci + 1].pageIndex
        : pdf.numPages;
      const chapterText = pageTexts.slice(startPage, endPage).join(' ');
      const words = chapterText.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        sections.push({ title: chapterPageMap[ci].title, words });
      }
    }

    const allWords = sections.flatMap((s) => s.words);
    return { sections, allWords };
  }

  // ── No outline — use text-based detection ────────────────────────────────
  const fullText = pageTexts.join(' ');
  const fullRawText = pageRawTexts.join('\n\n'); // blank line between pages
  const allWords = fullText.split(/\s+/).filter(Boolean);

  const detected = detectChapters(allWords, fullRawText);

  // If detection found only one section and the doc is long, it's probably
  // a novel with no blank-line gaps in the PDF — retry without rawText so
  // the heuristic sentence-end detection kicks in.
  const sections = detected.length === 1 && allWords.length > 2000
    ? detectChapters(allWords, null)
    : detected;

  return { sections, allWords };
}

async function resolveOutlinePages(pdf, items, result, depth = 0) {
  if (depth > 3) return;
  for (const item of items) {
    if (!item) continue;
    try {
      let pageIndex = null;
      if (item.dest) {
        const dest = typeof item.dest === 'string'
          ? await pdf.getDestination(item.dest)
          : item.dest;
        if (dest && dest[0]) {
          pageIndex = await pdf.getPageIndex(dest[0]);
        }
      }
      if (pageIndex !== null) {
        result.push({ title: item.title || 'Section', pageIndex });
      }
      if (item.items && item.items.length > 0) {
        await resolveOutlinePages(pdf, item.items, result, depth + 1);
      }
    } catch (_) { /* skip */ }
  }
}
