import ePub from 'epubjs';
import { detectChapters } from './chapterDetector';

/**
 * Parse an EPUB file into sections.
 * Returns: { sections: [{ title, words: [] }], allWords: [] }
 *
 * Strategy:
 *  1. Build a full TOC anchor map: href+fragment → title
 *     (many EPUBs, including Gutenberg, use fragment anchors like
 *      "chapter01.xhtml#ch1" rather than separate files per chapter)
 *  2. For each spine item, walk the DOM looking for elements whose
 *     id matches a TOC anchor — those are chapter boundaries.
 *  3. Split the spine item's text at those boundaries.
 *  4. If no TOC anchors are found at all, fall back to detectChapters().
 */
export async function parseEPUB(file) {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const spine = book.spine;
  const toc = book.navigation?.toc ?? [];

  // ── Build anchor map: id → title ─────────────────────────────────────────
  // Walk the full TOC recursively, keeping the fragment part of each href.
  // e.g. "chapter01.xhtml#heading_id_1" → "Chapter I"
  const anchorTitleMap = {}; // fragment id → title
  const fileTitleMap  = {}; // bare filename → title (fallback)

  function walkToc(items) {
    for (const item of items) {
      if (item.href) {
        const [path, fragment] = item.href.split('#');
        const filename = path.split('/').pop();
        const label = item.label?.trim() || null;
        if (fragment) {
          anchorTitleMap[fragment] = label;
        }
        // Also store by filename for spine-level matching
        if (!fileTitleMap[filename]) {
          fileTitleMap[filename] = label;
        }
      }
      if (item.subitems?.length) walkToc(item.subitems);
    }
  }
  walkToc(toc);

  const hasAnchors = Object.keys(anchorTitleMap).length > 0;

  // ── Process spine items ───────────────────────────────────────────────────
  const spineItems = [];
  spine.each((item) => spineItems.push(item));

  // Collect all sections across all spine items
  const sections = [];

  for (const item of spineItems) {
    await item.load(book.load.bind(book));
    const doc = item.document;
    if (!doc) { item.unload(); continue; }

    const body = doc.querySelector('body');
    if (!body) { item.unload(); continue; }

    const filename = (item.href || '').split('#')[0].split('/').pop();

    if (hasAnchors) {
      // ── Anchor-based splitting ──────────────────────────────────────────
      // Walk every element in the body. When we hit one whose id is in
      // anchorTitleMap, that's a chapter boundary — start a new section.
      // We collect text nodes between boundaries.

      const allElements = Array.from(body.querySelectorAll('*'));
      // Also check the body itself
      allElements.unshift(body);

      let currentTitle = fileTitleMap[filename] || null;
      let currentNodes = [];
      let foundAnyAnchor = false;

      // We'll walk child nodes of body in document order
      // and split on elements with matching ids
      const walker = doc.createTreeWalker(body, 0x1 | 0x4); // SHOW_ELEMENT | SHOW_TEXT
      let node = walker.nextNode();

      while (node) {
        if (node.nodeType === 1 /* ELEMENT */) {
          const id = node.getAttribute && node.getAttribute('id');
          if (id && anchorTitleMap[id] !== undefined) {
            // Flush current section
            if (currentNodes.length > 0) {
              const text = currentNodes.join(' ');
              const words = text.split(/\s+/).filter(Boolean);
              if (words.length > 0) {
                sections.push({ title: currentTitle || inferTitle(sections), words });
              }
            }
            currentTitle = anchorTitleMap[id];
            currentNodes = [];
            foundAnyAnchor = true;
          }
        } else if (node.nodeType === 3 /* TEXT */) {
          const t = node.textContent;
          if (t && t.trim()) currentNodes.push(t.trim());
        }
        node = walker.nextNode();
      }

      // Flush last section
      if (currentNodes.length > 0) {
        const text = currentNodes.join(' ');
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          sections.push({ title: currentTitle || inferTitle(sections), words });
        }
      }

      if (!foundAnyAnchor) {
        // This spine item had no TOC anchors — treat as one block
        const rawText = body.textContent || '';
        const words = rawText.split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          sections.push({ title: fileTitleMap[filename] || inferTitle(sections), words });
        }
      }

    } else {
      // ── No anchors: one section per spine item ──────────────────────────
      const rawText = body.textContent || '';
      const words = rawText.split(/\s+/).filter(Boolean);
      if (words.length === 0) { item.unload(); continue; }

      // Try to get a title from heading or filename map
      let title = fileTitleMap[filename] || null;
      if (!title) {
        const h = body.querySelector('h1,h2,h3');
        if (h) title = h.textContent.trim();
      }
      sections.push({ title: title || inferTitle(sections), words });
    }

    item.unload();
  }

  if (sections.length === 0) {
    return { sections: [{ title: 'Document', words: [] }], allWords: [] };
  }

  // ── If we still only got 1–2 giant sections, run text detection on them ──
  // This handles EPUBs with no useful TOC at all.
  const totalSections = sections.length;
  const avgWords = sections.reduce((s, x) => s + x.words.length, 0) / totalSections;

  if (totalSections <= 2 && avgWords > 5000) {
    const fullWords = sections.flatMap(s => s.words);
    const fullRawText = sections.map(s => s.words.join(' ')).join('\n\n');
    const detected = detectChapters(fullWords, fullRawText);
    const allWords = detected.flatMap(s => s.words);
    return { sections: detected, allWords };
  }

  const allWords = sections.flatMap(s => s.words);
  return { sections, allWords };
}

// Give an unnamed section a sensible fallback title
function inferTitle(existingSections) {
  return `Section ${existingSections.length + 1}`;
}
