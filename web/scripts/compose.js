/**
 * Layout composer: turns a project's flat list of blocks into rows on the
 * 12-column grid.
 *
 * Authors write content in order and only place things when they care
 * (`size: half-left`, or `colStart`/`colSpan`). Everything unplaced is set by
 * rules, so pages vary without anyone laying them out by hand. A project reads
 * in sections: its hero, a large introduction, and then each further text,
 * large and centred, over the pictures that follow it:
 *
 *  - a text is a section of its own, the width of the page but the margins;
 *  - two landscape images in a row stand side by side, one on its own takes
 *    the full width;
 *  - a run of portrait (or square) images stands side by side, up to four to
 *    a row and the rows as even as they can be; a portrait on its own takes
 *    one of two columns;
 *  - side by side, images share the width in proportion to their shapes, so
 *    all stand the same height and none is cropped;
 *  - images placed side by side across all twelve columns stay one row, the
 *    same way.
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
const SECTION = [2, 10];

const isMedia = (b) => b?.type === 'image' || b?.type === 'video';
const placed = (b) => b.size || b.colStart || b.colSpan;
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
  let half = 0;

  // A run of pictures between texts, laid out.
  function pictures(run) {
    for (let j = 0; j < run.length;) {
      if (tall(run[j])) {
        let end = j;
        while (run[end + 1] && tall(run[end + 1])) end++;
        const talls = run.slice(j, end + 1);
        if (talls.length === 1) {
          rows.push({ kind: 'media', cells: [cell(talls[0], HALVES[half++ % 2])] });
        } else {
          // Five make three and two, not four and one.
          const count = Math.ceil(talls.length / PER_ROW);
          for (let k = 0, at = 0; k < count; k++) {
            const n = Math.floor(talls.length / count) + (k < talls.length % count ? 1 : 0);
            rows.push(group(talls.slice(at, at + n)));
            at += n;
          }
        }
        j = end + 1;
      } else if (run[j + 1] && !tall(run[j + 1])) {
        rows.push(group(run.slice(j, j + 2)));
        j += 2;
      } else {
        rows.push({ kind: 'full', cells: [cell(run[j], [1, 12])] });
        j += 1;
      }
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === 'credits') {
      rows.push({ kind: 'credits', cells: [cell(b, [1, 12])] });
    } else if (b.type === 'text') {
      rows.push({ kind: 'section', cells: [cell(b, placed(b) ? explicit(b) : SECTION)] });
    } else if (placed(b)) {
      const run = authoredRow(blocks, i);
      if (run > 1) {
        rows.push(group(blocks.slice(i, i + run)));
        i += run - 1;
      } else {
        const [start, span] = explicit(b);
        rows.push({ kind: span === 12 ? 'full' : 'media', cells: [cell(b, [start, span])] });
      }
    } else {
      let end = i;
      while (isMedia(blocks[end + 1]) && !placed(blocks[end + 1])) end++;
      pictures(blocks.slice(i, end + 1));
      i = end;
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
