// What identity-export.py does not write for 03 Impact, as plain SVG for Illustrator. Run from the
// repo root after it:
//
//   node web/src/identity/directions/impact/export-extra.mjs
//
// Writes to identity/03-impact/:
//   symbol-set.svg                  the mark set small (as in the lockup and favicons): shards closed up, no flight
//   places/<place>.svg              every place in the application: its fracture, one path per shard
//   favicon-16|32|64-clear.svg      the favicons with no tile, ink shards, for light browser tabs
//   symbol-construction.svg         the symbol on layers: shards as cut, where they fly, cracks, the fan's edges, the hit, the spread

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fracture, placeSeed, pathOf } from './fracture.js';
import { favicon, EXTRA, HOME } from '../impact.js';

const out = fileURLToPath(new URL('../../../../../identity/03-impact/', import.meta.url));
mkdirSync(`${out}places`, { recursive: true });
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const f2 = (v) => +v.toFixed(2);
const deg = (a) => Math.round((((a * 180) / Math.PI) % 360 + 360) % 360);
const ll = (p) => `${Math.abs(p.lat).toFixed(4)} ${p.lat >= 0 ? 'N' : 'S'} ${Math.abs(p.lon).toFixed(4)} ${p.lon >= 0 ? 'E' : 'W'}`;

// Places: 1000 units across the longer side.
for (const p of EXTRA.PLACES) {
  const seed = placeSeed(p.lat, p.lon);
  const f = fracture(seed);
  const e = EXTRA.extent(f);
  const S = 1000 / Math.max(e.w, e.h);
  const w = f2(e.w * S);
  const h = f2(e.h * S);
  const shards = f.shards.filter((s) => !s.dropped);
  const paths = shards.map((s, i) => `<path id="shard-${String(i + 1).padStart(2, '0')}" d="${pathOf(s.poly, S, -e.x0 * S, -e.y0 * S)}"/>`).join('');
  const name = `${slug(p.venue)}-${slug(p.city)}`;
  writeFileSync(`${out}places/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><!-- ${p.venue}, ${p.city}: ${ll(p)}, seed ${seed}; ${f.n} shards over ${f.spread}°, the hit travelling ${deg(f.dir)}° --><g id="${name}" fill="#000000">${paths}</g></svg>\n`);
  console.log(`places/${name}.svg  seed ${seed}  ${f.n} shards  ${deg(f.dir)}°`);
}

// The set mark: what the lockup uses, on a 1000 artboard. Its crack is the lockup's (the S–M space).
{
  const { s, mark } = EXTRA.LOCKUP;
  const e = mark.e;
  const S = 900 / Math.max(e.w, e.h);
  const dx = 500 - (e.x0 + e.w / 2) * S;
  const dy = 500 - (e.y0 + e.h / 2) * S;
  const paths = mark.polys.map((p, i) => `<path id="shard-${String(i + 1).padStart(2, '0')}" d="${pathOf(p, S, dx, dy)}"/>`).join('');
  writeFileSync(`${out}symbol-set.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000"><!-- The mark set small, as in the lockup and the favicons: nothing flown, every crack the same width (in the lockup, the space between S and M: ${f2(72 / s)} of the reach). --><g id="symbol-set" fill="#000000">${paths}</g></svg>\n`);
  console.log('symbol-set.svg');
}

// Favicons without a tile.
for (const size of [16, 32, 64]) {
  writeFileSync(`${out}favicon-${size}-clear.svg`, favicon({ size, ground: 'none' }).replace('<svg ', `<svg width="${size}" height="${size}" `) + '\n');
  console.log(`favicon-${size}-clear.svg`);
}

// The symbol's construction: the same artboard as symbol.svg.
{
  const f = EXTRA.LOGO;
  const e = EXTRA.extent(f);
  const S = 900 / Math.max(e.w, e.h);
  const dx = 500 - e.cx * S;
  const dy = 500 - e.cy * S;
  // The shards as the rule cuts them (the cracks centred on the lines below), and where they fly to in the symbol.
  const set = EXTRA.setPolys(f, f.rule.gap);
  const shards = set.map((p, i) => `<path id="shard-${String(i + 1).padStart(2, '0')}" d="${pathOf(p, S, dx, dy)}"/>`).join('');
  const flown = f.shards.map((s, i) => `<path id="flown-${String(i + 1).padStart(2, '0')}" d="${pathOf(s.poly, S, dx, dy)}"/>`).join('');
  const line = (id, a, len) => `<line id="${id}" x1="${f2(dx)}" y1="${f2(dy)}" x2="${f2(dx + Math.cos(a) * len * S)}" y2="${f2(dy + Math.sin(a) * len * S)}"/>`;
  // The cracks two shards share, as far as both run; the fan's two edges, as far as their shard runs.
  const cracks = f.cracks.map((c, i) => line(`crack-${i + 1}-${deg(c.a)}deg`, c.a, c.crack)).join('');
  const first = f.shards[0];
  const last = f.shards[f.shards.length - 1];
  const edges = f.full ? '' : line(`edge-${deg(f.lines[0])}deg`, f.lines[0], first.ra) + line(`edge-${deg(f.lines[f.lines.length - 1])}deg`, f.lines[f.lines.length - 1], last.rb);
  // The spread, as an arc at a fifth of the reach, and the hit's direction.
  const a0 = f.lines[0];
  const a1 = f.lines[f.lines.length - 1];
  const r = 0.2 * S;
  const arc = `<path id="spread-${f.spread}deg" d="M${f2(dx + Math.cos(a0) * r)} ${f2(dy + Math.sin(a0) * r)}A${f2(r)} ${f2(r)} 0 ${f.spread > 180 ? 1 : 0} 1 ${f2(dx + Math.cos(a1) * r)} ${f2(dy + Math.sin(a1) * r)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">`
    + `<!-- ${HOME.place} ${ll(HOME)}, seed ${f.seed}. ${f.n} shards over ${f.spread}°, the hit travelling ${deg(f.dir)}°. Every edge runs on the 15° grid and no crack is level or plumb. The crack is ${f.rule.gap} of the reach; every shard has moved ${f.rule.open} out from the hit and the far side ${f.rule.burst} further. -->`
    + `<g id="shards" fill="#000000">${shards}</g>`
    + `<g id="flown-as-in-the-symbol" fill="none" stroke="#000000" stroke-width="1" stroke-opacity="0.35">${flown}</g>`
    + `<g id="cracks" fill="none" stroke="#2d5bff" stroke-width="1.5">${cracks}</g>`
    + `<g id="fan-edges" fill="none" stroke="#2d5bff" stroke-width="1" stroke-dasharray="6 6">${edges}</g>`
    + `<g id="spread" fill="none" stroke="#2d5bff" stroke-width="1">${arc}${line(`hit-direction-${deg(f.dir)}deg`, f.dir, 0.32)}</g>`
    + `<g id="hit"><circle cx="${f2(dx)}" cy="${f2(dy)}" r="6" fill="#2d5bff"/></g></svg>\n`;
  writeFileSync(`${out}symbol-construction.svg`, svg);
  console.log('symbol-construction.svg');
}
