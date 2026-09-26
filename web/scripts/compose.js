/**
 * Layout composer: turns a project's flat list of blocks into rows on the
 * 12-column grid.
 *
 * Authors write content in order and only place things when they care
 * (`size: half-left`, or `colStart`/`colSpan`). Everything unplaced is set by
 * rules, so pages vary without anyone laying them out by hand. Pictures go as
 * on jonasjohansson.se, full width or side by side, with text beside them:
 *
 *  - an image and a short text next to each other share a row, image and text
 *    on alternating sides, text sitting on the image's baseline;
 *  - a landscape image takes the full width;
 *  - a run of portrait (or square) images stands side by side, up to four to
 *    a row and the rows as even as they can be, sharing the width in
 *    proportion to their shapes, so all stand the same height and none is
 *    cropped; a portrait on its own takes one of two columns;
 *  - images placed side by side across all twelve columns stay one row, the
 *    same way;
 *  - a lone text alternates between two reading columns.
 *
 * A cell is { block, start, span }, spans in whole columns; a cell of a group
 * (side by side) is { block, vw }, its share of the width in percent.
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

const HALVES = [[1, 6], [7, 6]];
const TEXT_SOLO = [[2, 5], [7, 5]];
/** Longer than this and a text needs its own row to stay readable. */
const CAPTION_MAX = 700;

const isMedia = (b) => b?.type === 'image' || b?.type === 'video';
const placed = (b) => b.size || b.colStart || b.colSpan;
const portrait = (b) => b.ar < 0.95;
const tall = (b) => b.ar <= 1; // stands beside others, rather than taking the full width
const cell = (block, [start, span]) => ({ block, start, span });
const PER_ROW = 4;

/** Side by side, each as wide as its shape asks, so all stand the same height. */
function group(items) {
  const sum = items.reduce((total, b) => total + b.ar, 0);
  return { kind: 'group', cells: items.map((block) => ({ block, vw: Math.round((block.ar / sum) * 100) })) };
}

function explicit(b) {
  const [start, span] = SIZES[b.size] ?? [b.colStart ?? 1, b.colSpan ?? 12];
  return [b.colStart ?? start, b.colSpan ?? span];
}

/** How many placed images from i tile one row from column 1 to 12 (0 if none do). */
function authoredRow(blocks, i) {
  let column = 1;
  let n = 0;
  while (isMedia(blocks[i + n]) && placed(blocks[i + n]) && column < 13) {
    const [start, span] = explicit(blocks[i + n]);
    if (start !== column) break;
    column += span;
    n++;
  }
  return column === 13 ? n : 0;
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
    // Side by side, no empty column between: a landscape takes three
    // quarters of the row, a portrait half.
    const [m, w] = portrait(media)
      ? side ? [[7, 6], [3, 4]] : [[1, 6], [7, 4]]
      : side ? [[4, 9], [1, 3]] : [[1, 9], [10, 3]];
    side ^= 1;
    const cells = [cell(media, m), cell(words, w)];
    return { kind: 'caption', cells: m[0] < w[0] ? cells : cells.reverse() };
  };
  let half = 0;
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
      const run = authoredRow(blocks, i);
      if (run > 1) {
        rows.push(group(blocks.slice(i, i + run)));
        i += run - 1;
      } else {
        const [start, span] = explicit(b);
        rows.push({ kind: span === 12 ? 'full' : 'media', cells: [cell(b, [start, span])] });
      }
    } else if (next?.type === 'text' && !placed(next) && next.content.length <= CAPTION_MAX) {
      rows.push(caption(b, next));
      i++;
    } else if (tall(b)) {
      let end = i;
      while (isMedia(blocks[end + 1]) && !placed(blocks[end + 1]) && tall(blocks[end + 1])) end++;
      const run = blocks.slice(i, end + 1);
      if (run.length === 1) {
        rows.push({ kind: 'media', cells: [cell(b, HALVES[half++ % 2])] });
      } else {
        // Five make three and two, not four and one.
        const count = Math.ceil(run.length / PER_ROW);
        for (let j = 0, at = 0; j < count; j++) {
          const n = Math.floor(run.length / count) + (j < run.length % count ? 1 : 0);
          rows.push(group(run.slice(at, at + n)));
          at += n;
        }
      }
      i = end;
    } else {
      rows.push({ kind: 'full', cells: [cell(b, [1, 12])] });
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
