import ePub from 'epubjs';
import { detectChapters } from './chapterDetector';

/**
 * Parse an EPUB file into sections.
 * Returns: { sections: [{ title, words: [] }], allWords: [] }
 *
 * Detection priority:
 *  1. EPUB TOC (navigation) — used when available
 *  2. In-document headings (h1/h2/h3) per spine item
 *  3. Text-based chapter detection via detectChapters() on the full text
 */
export async function parseEPUB(file) {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const spine = book.spine;
  const toc = book.navigation?.toc ?? [];

  // Build href → title map from TOC (walk recursively)
  const hrefTitleMap = {};
  function walkToc(items) {
    for (const item of items) {
      if (item.href) {
        hrefTitleMap[item.href.split('#')[0]] = item.label?.trim() ?? null;
      }
      if (item.subitems?.length) walkToc(item.subitems);
    }
  }
  walkToc(toc);

  const hasToc = Object.keys(hrefTitleMap).length > 0;

  // ── Extract spine items ───────────────────────────────────────────────────
  const spineItems = [];
  spine.each((item) => spineItems.push(item));

  const rawSections = []; // { title, words, rawText }

  for (const item of spineItems) {
    await item.load(book.load.bind(book));
    const doc = item.document;
    if (!doc) { item.unload(); continue; }

    const bodyEl = doc.querySelector('body');
    const rawText = bodyEl ? bodyEl.textContent : doc.textContent;
    const words = rawText.split(/\s+/).filter(Boolean);

    if (words.length === 0) { item.unload(); continue; }

    // Resolve title from TOC
    const hrefBase = item.href?.split('#')[0] ?? '';
    const hrefFile = hrefBase.split('/').pop();
    let title = null;

    if (hasToc) {
      for (const [key, val] of Object.entries(hrefTitleMap)) {
        if (key === hrefBase || key.endsWith('/' + hrefFile) || key === hrefFile) {
          title = val;
          break;
        }
      }
    }

    // Fallback: first heading in the document
    if (!title) {
      const heading = doc.querySelector('h1, h2, h3');
      if (heading) title = heading.textContent.trim();
    }

    rawSections.push({ title, words, rawText });
    item.unload();
  }

  if (rawSections.length === 0) {
    return { sections: [{ title: 'Document', words: [] }], allWords: [] };
  }

  // ── If TOC gave us good titles, use spine-level sections ─────────────────
  if (hasToc) {
    const sections = rawSections.map((s, i) => ({
      title: s.title || `Section ${i + 1}`,
      words: s.words,
    }));
    const allWords = sections.flatMap((s) => s.words);
    return { sections, allWords };
  }

  // ── No TOC — run text-based detection on the full concatenated text ───────
  // Concatenate all spine items with double-newline separators so paragraph
  // detection works across spine boundaries.
  const fullWords = rawSections.flatMap((s) => s.words);
  const fullRawText = rawSections.map((s) => s.rawText).join('\n\n');

  const sections = detectChapters(fullWords, fullRawText);
  const allWords = sections.flatMap((s) => s.words);
  return { sections, allWords };
}
