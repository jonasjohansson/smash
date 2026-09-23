/**
 * Layout composer: turns a project's flat list of blocks into rows on the
 * 12-column grid.
 *
 * Authors write content in order and only place things when they care
 * (`size: half-left`, or `colStart`/`colSpan`). Everything unplaced is set by
 * rules, so pages vary without anyone laying them out by hand:
 *
 *  - an image and a short text next to each other share a row, image and text
 *    on alternating sides, text sitting on the image's baseline;
 *  - two unplaced images in a row become a pair with uneven widths, but never
 *    two pairs back to back;
 *  - a lone image steps through full, inset and offset positions, and a
 *    portrait one is never wider than five columns;
 *  - a lone text alternates between two reading columns.
 *
 * A cell is { block, start, span }. Spans are always whole columns.
 */

export const SIZES = {
  full: [1, 12],
  large: [2, 10],
  left: [1, 7],
  right: [6, 7],
  'half-left': [1, 6],
  'half-right': [7, 6],
  'small-left': [1, 5],
  'small-right': [8, 5],
};

const LANDSCAPE_SOLO = [[1, 12], [3, 8], [1, 9], [5, 8]];
const PORTRAIT_SOLO = [[2, 5], [7, 5], [4, 5]];
const PAIRS = [[[1, 7], [8, 5]], [[1, 5], [6, 7]], [[1, 6], [7, 6]]];
const TEXT_SOLO = [[2, 5], [7, 5]];
/** Longer than this and a text needs its own row to stay readable. */
const CAPTION_MAX = 700;

const isMedia = (b) => b?.type === 'image' || b?.type === 'video';
const placed = (b) => b.size || b.colStart || b.colSpan;
const portrait = (b) => b.ar < 0.95;
const cell = (block, [start, span]) => ({ block, start, span });

function explicit(b) {
  const [start, span] = SIZES[b.size] ?? [b.colStart ?? 1, b.colSpan ?? 12];
  return [b.colStart ?? start, b.colSpan ?? span];
}

export function compose(project) {
  const blocks = [...project.blocks];
  const heroIndex = blocks.findIndex(isMedia);
  const hero = heroIndex >= 0 ? blocks.splice(heroIndex, 1)[0] : null;
  const leadIndex = blocks.findIndex((b) => b.type === 'text');
  const lead = leadIndex >= 0 ? blocks.splice(leadIndex, 1)[0] : null;

  const rows = [];
  let side = 0;
  // Media and text share a row, on alternating sides. Cells are listed in
  // visual order so the stacked mobile layout reads left to right.
  const caption = (media, words) => {
    const [m, w] = portrait(media)
      ? side ? [[8, 5], [2, 4]] : [[1, 5], [7, 4]]
      : side ? [[5, 8], [1, 3]] : [[1, 8], [10, 3]];
    side ^= 1;
    const cells = [cell(media, m), cell(words, w)];
    return { kind: 'caption', cells: m[0] < w[0] ? cells : cells.reverse() };
  };
  let solo = 0;
  let pair = 0;
  let text = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];

    if (b.type === 'credits') {
      rows.push({ kind: 'credits', cells: [cell(b, [1, 12])] });
    } else if (b.type === 'text' && !placed(b) && b.content.length <= CAPTION_MAX && isMedia(next) && !placed(next)) {
      rows.push(caption(next, b));
      i++;
    } else if (b.type === 'text') {
      rows.push({ kind: 'text', cells: [cell(b, placed(b) ? explicit(b) : TEXT_SOLO[text++ % 2])] });
    } else if (placed(b)) {
      // Authored pairs stay pairs: half-left followed by half-right is one row.
      if (b.size?.endsWith('-left') && next && isMedia(next) && next.size?.endsWith('-right')) {
        rows.push({ kind: 'media', cells: [cell(b, explicit(b)), cell(next, explicit(next))] });
        i++;
      } else {
        rows.push({ kind: 'media', cells: [cell(b, explicit(b))] });
      }
    } else if (next?.type === 'text' && !placed(next) && next.content.length <= CAPTION_MAX) {
      rows.push(caption(b, next));
      i++;
    } else if (isMedia(next) && !placed(next) && rows.at(-1)?.pair !== true) {
      const [a, c] = PAIRS[pair++ % PAIRS.length];
      rows.push({ kind: 'media', pair: true, cells: [cell(b, a), cell(next, c)] });
      i++;
    } else {
      const cycle = portrait(b) ? PORTRAIT_SOLO : LANDSCAPE_SOLO;
      rows.push({ kind: 'media', cells: [cell(b, cycle[solo++ % cycle.length])] });
    }
  }

  return { hero, lead, rows };
}

/**
 * The work index: a repeating rhythm of rows, so the grid reads as designed
 * rather than as a uniform wall of thumbnails.
 */
const INDEX_RHYTHM = [
  [[1, 7], [9, 4]],
  [[1, 4], [5, 4], [9, 4]],
  [[2, 5], [7, 6]],
  [[1, 4], [6, 7]],
];

export function indexLayout(projects) {
  const tiles = [];
  let r = 0;
  while (tiles.length < projects.length) {
    const row = INDEX_RHYTHM[r++ % INDEX_RHYTHM.length];
    row.forEach(([start, span], i) => tiles.push({ start, span, first: i === 0 }));
  }
  return tiles.slice(0, projects.length).map((t) => ({ ...t, ar: t.span >= 6 ? '3 / 2' : '4 / 5' }));
}
