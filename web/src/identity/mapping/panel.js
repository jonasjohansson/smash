// The mapping tool's panel: a strip of presets (each drawn by its own maths)
// with undo and redo, the ground (white on black, or black on white), and the
// settings in Tweakpane.

import { PRESETS, pose, warper } from './warp.js';
import { loadSource } from './source.js';

const TWEAKPANE = 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js';

/** A preset's grid as a small drawing, made by the same functions that move the points, fitted to its box. */
export function presetIcon(name) {
  const A = 1.35, n = 5, m = 4, S = 16;
  const g = pose(name, n, m, { A, seed: 7, impact: [0.547, 0.5] });
  const f = warper(g, name === 'fold' || name === 'struck' ? 'linear' : 'smooth');
  const lines = [];
  for (let i = 0; i < n; i++) lines.push(Array.from({ length: S + 1 }, (_, q) => f(i / (n - 1), q / S, [0, 0])));
  for (let j = 0; j < m; j++) lines.push(Array.from({ length: S + 1 }, (_, q) => f(q / S, j / (m - 1), [0, 0])));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of lines) for (const [x, y] of l) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // Frame units to the box: the rest frame 40 × 40/A, the whole drawing scaled down to fit 44 × 26 if it spills.
  const W = 40, H = W / A, BW = 44, BH = 26;
  const k = Math.min(1, (BW - 2) / ((x1 - x0) * W), (BH - 2) / ((y1 - y0) * H));
  const ox = BW / 2 - ((x0 + x1) / 2) * W * k, oy = BH / 2 - ((y0 + y1) / 2) * H * k;
  const d = lines.map((l) => `M${l.map(([x, y]) => `${(ox + x * W * k).toFixed(1)} ${(oy + y * H * k).toFixed(1)}`).join('L')}`).join('');
  return `<svg viewBox="0 0 ${BW} ${BH}" aria-hidden="true"><path d="${d}"/></svg>`;
}

/** A ground as a small drawing: the mark itself (once it has loaded) in its tone, on its ground, 64 × 26. */
function groundIcon(ground, src = null) {
  const bg = ground === 'black' ? '#000' : '#fff', ink = ground === 'black' ? '#fff' : '#000';
  if (!src) return `<svg viewBox="0 0 64 26" aria-hidden="true"><rect width="64" height="26" fill="${bg}"/></svg>`;
  const { x, y, w, h } = src.frame;
  const vh = h / 0.74, vw = (vh * 64) / 26;
  const vx = x + w / 2 - vw / 2, vy = y + h / 2 - vh / 2;
  const paths = src.paths.map((p) => `<path d="${p.d}" fill-rule="${p.rule}" transform="matrix(${p.m.join(' ')})"/>`).join('');
  return `<svg viewBox="${vx} ${vy} ${vw} ${vh}" aria-hidden="true"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${bg}"/><g fill="${ink}">${paths}</g></svg>`;
}

export const GROUNDS = { black: 'white on black', white: 'black on white' };

/**
 * The panel in host. ctx: {
 *   params, sources (a promise of the marks that load), destroyed(), focusStage(),
 *   setPreset(name), setGround(ground), undo(), redo(), canUndo(), canRedo(),
 *   resize(ev), interpChanged(), useSource(id), change(), seedChanged(), extrudeChanged(),
 *   savePNG(), saveSVG(), copySettings() (a promise), resetAll()
 * }
 * Returns { refresh(), dispose() }.
 */
export function createPanel(host, ctx) {
  const { params } = ctx;
  const els = [];
  const top = document.createElement('div');
  top.className = 'mp-strips';
  top.innerHTML = `
    <div class="mp-strip">
      <p><span>Presets</span><span class="mp-hist"><button type="button" class="mp-btn" data-act="undo" title="Undo (Cmd-Z)" aria-label="Undo">↶ undo</button><button type="button" class="mp-btn" data-act="redo" title="Redo (Shift-Cmd-Z)" aria-label="Redo">redo ↷</button></span></p>
      <div class="mp-grid">${PRESETS.map((p, i) => `<button type="button" class="mp-chip" data-preset="${p}" title="${p} (${(i + 1) % 10})">${presetIcon(p)}<span>${p}</span></button>`).join('')}</div>
    </div>
    <div class="mp-strip">
      <p><span>Ground</span></p>
      <div class="mp-grid mp-two">${Object.entries(GROUNDS).map(([g, name]) => `<button type="button" class="mp-chip mp-ground" data-ground="${g}" title="${name}">${groundIcon(g)}<span>${name}</span></button>`).join('')}</div>
    </div>`;
  const paneEl = document.createElement('div');
  host.append(top, paneEl);
  els.push(top, paneEl);
  const chips = [...top.querySelectorAll('.mp-chip[data-preset]')];
  const grounds = [...top.querySelectorAll('.mp-ground')];
  loadSource('original').then((src) => {
    for (const c of grounds) c.querySelector('svg').outerHTML = groundIcon(c.dataset.ground, src);
  }).catch(() => {});
  const undoBtn = top.querySelector('[data-act="undo"]');
  const redoBtn = top.querySelector('[data-act="redo"]');
  top.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.preset) ctx.setPreset(b.dataset.preset);
    else if (b.dataset.ground) ctx.setGround(b.dataset.ground);
    else if (b.dataset.act === 'undo') ctx.undo();
    else if (b.dataset.act === 'redo') ctx.redo();
    // A click (not a key) hands the keys back to the stage, so Cmd-Z and 1–0 work straight after.
    if (e.detail > 0) ctx.focusStage();
  });

  let pane = null;
  let show = () => {};
  // Tweakpane reports a refresh as a change; those are ours, not the user's, so they are passed over.
  let refreshing = false;
  const on = (fn) => (ev) => { if (!refreshing) fn(ev); };
  // The lit preset, clicked again, puts its points back (random throws again): its title says so.
  const chipTitle = (p, i, on) => `${p} (${(i + 1) % 10})${on ? (p === 'random' ? ': click again for a new throw' : ': click again to put its points back') : ''}`;
  const refresh = () => {
    chips.forEach((c, i) => {
      const on = c.dataset.preset === params.preset;
      c.setAttribute('aria-pressed', String(on));
      c.title = chipTitle(c.dataset.preset, i, on);
    });
    for (const c of grounds) c.setAttribute('aria-pressed', String(c.dataset.ground === params.ground));
    undoBtn.disabled = !ctx.canUndo();
    redoBtn.disabled = !ctx.canRedo();
    show();
    refreshing = true;
    try { pane?.refresh(); } finally { refreshing = false; }
  };
  refresh();

  Promise.all([import(TWEAKPANE), ctx.sources]).then(([{ Pane }, sources]) => {
    if (ctx.destroyed()) return;
    pane = new Pane({ container: paneEl });
    const change = on(ctx.change);
    const shape = pane.addFolder({ title: 'Grid' });
    if (sources.length > 1) shape.addBinding(params, 'source', { label: 'mark', options: Object.fromEntries(sources.map((s) => [s.name, s.id])) }).on('change', on((ev) => ctx.useSource(ev.value)));
    shape.addBinding(params, 'cols', { label: 'columns', min: 2, max: 12, step: 1 }).on('change', on(ctx.resize));
    shape.addBinding(params, 'rows', { min: 2, max: 12, step: 1 }).on('change', on(ctx.resize));
    shape.addBinding(params, 'interp', {
      label: 'between points',
      options: { smooth: 'smooth', 'linear (mesh)': 'linear', 'corner pin': 'corner' },
    }).on('change', on((ev) => ctx.interpChanged(ev.value)));
    shape.addBinding(params, 'grid', { label: 'show grid' }).on('change', change);

    const depth = pane.addFolder({ title: 'Extrude' });
    depth.addBinding(params, 'extrude', { options: { off: 'off', '2.5D, layered': '2.5d', '3D, turning': '3d' } }).on('change', on(ctx.extrudeChanged));
    const onDepth = [depth.addBinding(params, 'depth', { min: 0, max: 0.6, step: 0.005 }).on('change', change)];
    const on25 = [
      depth.addBinding(params, 'angle', { label: 'direction', min: -180, max: 180, step: 1 }).on('change', change),
      depth.addBinding(params, 'persp', { label: 'vanishing', min: 0, max: 0.8, step: 0.01 }).on('change', change),
    ];
    const on3 = [
      depth.addBinding(params, 'yaw', { label: 'turn', min: -60, max: 60, step: 1 }).on('change', change),
      depth.addBinding(params, 'pitch', { label: 'tilt', min: -45, max: 45, step: 1 }).on('change', change),
    ];

    const motion = pane.addFolder({ title: 'Motion' });
    motion.addBinding(params, 'animate', { label: 'points', options: { still: 'off', drift: 'drift', breathe: 'breathe', 'morph presets': 'morph' } }).on('change', on(() => { show(); ctx.change(); }));
    const amount = motion.addBinding(params, 'amount', { min: 0, max: 1, step: 0.01 }).on('change', change);
    const speed = motion.addBinding(params, 'speed', { min: 0.1, max: 3, step: 0.01 }).on('change', change);
    // The seed throws the random preset and sets how the points drift: shown only where it does something.
    const seed = motion.addBinding(params, 'seed', { min: 1, max: 999, step: 1 }).on('change', on(ctx.seedChanged));

    const out = pane.addFolder({ title: 'Export' });
    out.addButton({ title: 'Save picture (PNG, 3840)' }).on('click', ctx.savePNG);
    // The SVG is the face's outlines: with a depth on, the button says the depth stays out.
    const svg = out.addButton({ title: 'Export SVG (outlines)' });
    svg.on('click', ctx.saveSVG);
    const copy = out.addButton({ title: 'Copy settings (JSON)' });
    copy.on('click', () => ctx.copySettings().then(() => { copy.title = 'Copied'; setTimeout(() => { copy.title = 'Copy settings (JSON)'; }, 1400); }).catch(() => {}));
    out.addButton({ title: 'Reset everything' }).on('click', ctx.resetAll);

    show = () => {
      for (const b of onDepth) b.hidden = params.extrude === 'off';
      for (const b of on25) b.hidden = params.extrude !== '2.5d';
      for (const b of on3) b.hidden = params.extrude !== '3d';
      amount.hidden = params.animate === 'off' || params.animate === 'morph';
      speed.hidden = params.animate === 'off';
      seed.hidden = params.preset !== 'random' && params.animate !== 'drift' && params.animate !== 'morph';
      svg.title = params.extrude === 'off' ? 'Export SVG (outlines)' : 'Export SVG (face outlines)';
    };
    refresh();
  }).catch((e) => console.error('[mapping] the settings panel did not load', e));

  return {
    refresh,
    dispose() { pane?.dispose(); for (const el of els) el.remove(); },
  };
}
