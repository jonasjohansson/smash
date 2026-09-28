// 06 Crack Line. Lane: Light.
// SMASH written by one running crack of light: one line enters the pane at its left edge, writes
// the name, and leaves at the right. The geometry lives in ./crack-line/geometry.js.

import { svg, timeline, canvasStage, loadImage, drawCover, withCleanup, pointer, ease, clamp, span, smoothstep, lerp } from '../lib.js';
import { build, outline, paneS, fine, pathOf, bounds, Graph } from './crack-line/geometry.js';

const INK = '#0a0a0c'; // black glass
const PAPER = '#ecebe6';
const CREAM = '#f3efe8'; // the resting light
const YELLOW = '#f7be04';
const FONTS = new URL('./crack-line/fonts.css', import.meta.url).href;
const DISPLAY = '"Crack Sectra", "GT Sectra Display", Georgia, serif';
const TEXT = '"Crack Theinhardt", "Theinhardt", "Helvetica Neue", Arial, sans-serif';

export const info = {
  n: 6,
  slug: 'crack-line',
  name: 'Crack Line',
  lane: 'Light',
  idea: 'The name written by one running crack of light.',
  story: 'A pane takes a hit, and one crack runs across it from edge to edge. On its way it writes SMASH. That is the work in a single gesture: a surface gives, and light comes through where it gave. The crack opens into clean, sharp letters and closes to a hairline between them, so the name reads at a glance and still looks like one event.',
  dynamism: 'Still, the line never stops: it comes in low from the left edge, leaves high at the right, and breaks at set angles between the letters. In motion the glass is struck. The crack runs out both ways in bursts, catches for a moment between the M and the A, and opens behind its tip into letters. A light passes over the name and catches each run at its angle. Then the light drains out along the crack in the order it came, and an ember waits for the next strike. Where the glass is struck is the system’s variable: a project, a page or a visitor can break it at a different letter.',
  keeps: 'The glass of the brief, as an event rather than an illustration: the break is the beauty, and the light is the point. The same crack, cut through a square, is the symbol, so the symbol and the name come from one line. It works in one colour; the spectrum on its edges only appears for a moment, in light, and its warm side is SMASH yellow.',
  risk: 'It is a light, linear mark, so next to CM’s heavy block it has less presence at the same width, and with its leads it needs horizontal room. A crack can read as damage if it is drawn loosely; it holds because the letters are exact and only the hairlines break. The symbol is an S in a square: near CM’s S icon, and the round has two other S symbols. Here it only works as a pane split edge to edge by one crack, so that is how it must always be drawn.',
  palette: { ink: INK, paper: PAPER, accent: YELLOW },
  interactive: 'Click or tap the glass to strike it there: the crack runs out both ways from that point. Move the pointer and it becomes the light: runs lying across it catch and flare.',
  application: { title: 'The studio front: the glass cracked into the name', aspect: '16/9' },
  keyframe: 0.56,
  type: {
    fonts: [FONTS],
    display: {
      family: DISPLAY,
      css: 'font-weight: 300; letter-spacing: -0.01em;',
      name: 'GT Sectra Display Light',
      note: 'A sharp serif whose joins look cut with a scalpel: the crack’s incision, at the size of a headline. Light, so a headline stays a line of light.',
    },
    text: {
      family: TEXT,
      css: 'font-weight: 400;',
      name: 'Theinhardt Regular',
      note: 'A quiet, exact grotesk. It stays out of the crack’s way and reads well small, in a dark room.',
    },
  },
};

// ---------- the marks ----------

// The canonical crack: one fixed seed. Only its hairlines are seeded; the letters are exact.
const WORD = { seed: 5 };
// The symbol: the same S, cut through a square pane from edge to edge.
const SYM = { half: 8.5, cap: 60, lead: 2.4, leadEnd: 0.6 };

const memo = new Map();
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn()); return memo.get(key); };
const wordCrack = () => once('word', () => build(WORD));
const wordFaces = () => once('wordFaces', () => outline(wordCrack().G).faces);
const symFaces = () => once('symFaces', () => outline(paneS(SYM).G).faces);

/** Polygons scaled by k and moved by dx, dy. */
const move = (list, k, dx, dy) => list.map((p) => p.map(([x, y]) => [x * k + dx, y * k + dy]));
const r2 = (v) => +v.toFixed(2);

/** The wordmark's frame: exactly from where the line enters to where it leaves. */
function wordFrame(pad = 10) {
  const C = wordCrack();
  const B = bounds(wordFaces());
  return { x0: C.box.x0, x1: C.box.x1, y0: B.y0 - pad, y1: B.y1 + pad };
}

export function wordmark() {
  const F = wordFrame();
  return svg(r2(F.x1 - F.x0), r2(F.y1 - F.y0), `<path id="crack" fill="currentColor" d="${pathOf(move(wordFaces(), 1, -F.x0, -F.y0))}"/>`);
}

/** The pane and its crack as one shape: a square with the crack cut through it. */
const paneD = (faces, k = 1, dx = 0, dy = 0) => `M${r2(dx)} ${r2(dy)}H${r2(dx + 100 * k)}V${r2(dy + 100 * k)}H${r2(dx)}Z${pathOf(move(faces, k, dx, dy))}`;

export function symbol() {
  return svg(100, 100, `<path id="pane" fill="currentColor" fill-rule="evenodd" d="${paneD(symFaces())}"/>`);
}

/** The lockup: the pane beside the name, its S the height of the name's capitals. */
export function lockup() {
  const C = once('lockWord', () => build({ ...WORD, leadIn: false }));
  const W = once('lockWordFaces', () => outline(C.G).faces);
  const B = bounds(W);
  const side = 100 / (SYM.cap / 100); // the pane's S has the name's cap height
  const k = side / 100;
  const gap = 34;
  const top = 50 - side / 2;
  const wx = side + gap - C.box.x0;
  const all = move(W, 1, wx, 0);
  const x1 = wx + C.box.x1;
  const y0 = Math.min(top, B.y0);
  const y1 = Math.max(top + side, B.y1);
  const pad = 2;
  return svg(r2(x1 + pad * 2), r2(y1 - y0 + pad * 2),
    `<path id="pane" fill="currentColor" fill-rule="evenodd" d="${paneD(symFaces(), k, pad, top - y0 + pad)}"/><path id="crack" fill="currentColor" d="${pathOf(move(all, 1, pad, -y0 + pad))}"/>`);
}

/**
 * The favicon: the pane in black glass with the crack in light, running off both edges. At 16
 * and 32 px its bars and leads sit on whole pixels, and the leads are a whole pixel wide.
 */
export function favicon({ size = 32 } = {}) {
  const px = 100 / size;
  // 16 px: bars two pixels, a pixel of terminal; 32 px: bars three pixels; 64 px: drawn as the symbol
  const cfg = size <= 16 ? { cap: 10 * px, half: 10, sTerminal: 30, lead: 0 } : size <= 32 ? { cap: 20 * px, half: 7.5, sTerminal: 25, lead: 0 } : { cap: 62.5, half: 8, lead: 2.2, leadEnd: 0.5 };
  const P = paneS({ ...SYM, ...cfg, leads: !!cfg.lead });
  const faces = outline(P.G).faces;
  let extra = '';
  if (!cfg.lead) {
    // the leads as whole pixels: the top row of the S's top bar runs on to the right edge, the
    // bottom row of its bottom bar back to the left edge
    const IN = P.G.nodes[P.in];
    const OUT = P.G.nodes[P.out];
    extra = `M0 ${r2(IN.y - px)}H${r2(IN.x + 0.5)}V${r2(IN.y)}H0Z M${r2(OUT.x - 0.5)} ${r2(OUT.y)}H100V${r2(OUT.y + px)}H${r2(OUT.x - 0.5)}Z`;
  }
  return svg(100, 100, `<rect width="100" height="100" fill="${INK}"/><path fill="${CREAM}" d="${pathOf(faces)}${extra}"/>`);
}

/**
 * The crack as a rule: a hairline across a column that breaks twice at 10°, opens once to a
 * narrow run and forks once, sharp at both ends. A divider for layouts.
 */
export function crackRule(W = 900, H = 16) {
  const G = new Graph();
  const RAD = Math.PI / 180;
  const y = H / 2 + 1;
  // level, a break up at 10°, the open run, a break down at 10°, level again; a fork off the second break
  const k1 = W * 0.3;
  const up = 16 * Math.tan(10 * RAD);
  const k2 = W * 0.52;
  const down = 26 * Math.tan(10 * RAD);
  const pts = [[0, y], [k1, y], [k1 + 16, y - up], [k2, y - up], [k2 + 26, y - up + down], [W, y - up + down]];
  const ws = [0, 0.75, 0.75, 1.3, 0.75, 0];
  const ids = pts.map(([x, yy]) => G.node(x, yy));
  for (let i = 0; i < ids.length - 1; i++) G.edge(ids[i], ids[i + 1], ws[i], ws[i + 1]);
  const K = G.nodes[ids[4]];
  const T = G.node(K.x + 34 * Math.cos(25 * RAD), K.y - 34 * Math.sin(25 * RAD));
  G.edge(ids[4], T, 0.65, 0);
  const { faces } = outline(G);
  return svg(W, H, `<path fill="currentColor" d="${pathOf(faces)}"/>`);
}

export function specimen(el) {
  const esc = (t) => t.replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
  const size = 'font-size:clamp(34px, 4.1vw, 66px)';
  const rule = `<div style="margin:10px 0 22px;color:var(--d-paper, #ecebe6);max-width:12.5em;${size}">${crackRule(900).replace('<svg', '<svg style="width:100%;height:auto;display:block"')}</div>`;
  el.innerHTML = `
    <div class="spec-display">
      <p class="spec-headline" style="font-family:${esc(DISPLAY)};font-weight:300;letter-spacing:-0.01em;max-width:12.5em;${size};line-height:1.02">Smash ultimately wants to make people feel.</p>
      ${rule}
      <p class="label">Display: GT Sectra Display Light</p>
      <p class="note">${esc(info.type.display.note)}</p>
    </div>
    <div class="spec-text">
      <p style="font-family:${esc(DISPLAY)};font-weight:300;font-style:italic;font-size:clamp(24px,2.4vw,36px);line-height:1.1;margin-bottom:18px">The break is the beauty.</p>
      <p class="spec-body" style="font-family:${esc(TEXT)};font-weight:400">Smash is an immersive experience studio creating physical and digital experiences that make people feel. They combine art, technology, storytelling and spatial experiences to create memorable moments, from large-scale public installations to intimate museum experiences.</p>
      <p style="font-family:${esc(TEXT)};font-weight:500;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:4px 0 16px;color:#cfcac2">Installations · Projection mapping · Immersive rooms · Stage</p>
      <p class="label">Text: Theinhardt Regular and Medium</p>
      <p class="note">${esc(info.type.text.note)} The crack also works as a rule: a hairline that opens once and forks, to divide a page.</p>
    </div>`;
  return { destroy() {} };
}

// ---------- light ----------

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const C_REST = [198, 192, 182]; // the line at rest: a soft cream, with headroom for the light
const C_HOT = [252, 251, 247]; // a fresh run, white hot
const C_WARM = rgb(YELLOW); // the spectrum's warm edge is SMASH yellow
const C_COOL = [80, 150, 255];
const SCAR = 0.08; // what is left in the glass once the light has drained

const K_BURST = 6; // the bursts: fast off the mark, easing into the next corner
const burst = (u) => (1 - 2 ** (-K_BURST * u)) / (1 - 2 ** -K_BURST);
const burstInv = (p) => -Math.log2(1 - clamp(p) * (1 - 2 ** -K_BURST)) / K_BURST;
const burstD = (u) => (K_BURST * Math.LN2 * 2 ** (-K_BURST * u)) / (1 - 2 ** -K_BURST);
const invOutCubic = (p) => 1 - Math.cbrt(1 - clamp(p));

/** When everything happens, in seconds of the 6 s loop. */
const T = { dur: 6, ember: 0.2, drawIn: 0.78, strike: 0.9, hold: 2.3, glint0: 2.5, glint1: 4.7, drain: 4.35, scarOut: 5.45, end: 5.95 };
// each letter's burst and the catch after it: S and M in one breath, a catch between M and A, then A, S, H, and the release
const LEG = { in: 0.22, S: 0.16, M: 0.16, A: 0.14, S2: 0.15, H: 0.13, out: 0.12 };
const CATCH = [0.035, 0.18, 0.035, 0.035, 0.05];

/**
 * The run: from a strike at s0 on the line, a tip runs forward and one back, leg by leg. A leg
 * is a letter with the hairline before it; each is one burst, and the tip catches between them.
 */
function schedule(F, C, s0) {
  const S = (i) => F.mainS.get(C.main[i]);
  const L = C.legs; // letters: { in, out } as indices into main
  const bounds = [0, S(L[0].in), ...L.map((l) => S(l.out)), F.mainLen];
  const durs = [LEG.in, LEG.S, LEG.M, LEG.A, LEG.S2, LEG.H, LEG.out];
  const pauseAfter = [0, ...CATCH, 0];
  const legs = bounds.slice(0, -1).map((a, i) => ({ a, b: bounds[i + 1], d: durs[i] ?? 0.14, p: pauseAfter[i] ?? 0.035 }));
  const at = legs.findIndex((l) => s0 >= l.a && s0 <= l.b + 1e-9);
  const segsF = [];
  const segsB = [];
  let t = 0;
  for (let i = at; i < legs.length; i++) {
    const l = legs[i];
    const a = i === at ? s0 : l.a;
    if (l.b - a > 1e-6) {
      const d = l.d * ((l.b - a) / (l.b - l.a)) ** 0.6;
      segsF.push({ a, b: l.b, t0: t, t1: t + d });
      t += d;
    }
    t += l.p;
  }
  t = 0;
  for (let i = at; i >= 0; i--) {
    const l = legs[i];
    const b = i === at ? s0 : l.b;
    if (b - l.a > 1e-6) {
      const d = l.d * ((b - l.a) / (l.b - l.a)) ** 0.6;
      segsB.push({ a: b, b: l.a, t0: t, t1: t + d });
      t += d;
    }
    t += i > 0 ? legs[i - 1].p : 0;
  }
  const arrive = (s) => {
    const segs = s >= s0 ? segsF : segsB;
    for (const g of segs) {
      const lo = Math.min(g.a, g.b);
      const hi = Math.max(g.a, g.b);
      if (s >= lo - 1e-9 && s <= hi + 1e-9) return T.strike + g.t0 + (g.t1 - g.t0) * burstInv(Math.abs(s - g.a) / (Math.abs(g.b - g.a) || 1));
    }
    return T.strike;
  };
  const tip = (segs, time) => {
    const tau = time - T.strike;
    if (tau <= 0 || !segs.length) return null;
    for (const g of segs) {
      if (tau < g.t0) return { s: g.a, v: 0, dir: Math.sign(g.b - g.a) };
      if (tau <= g.t1) {
        const u = (tau - g.t0) / (g.t1 - g.t0);
        return { s: g.a + (g.b - g.a) * burst(u), v: (Math.abs(g.b - g.a) * burstD(u)) / (g.t1 - g.t0), dir: Math.sign(g.b - g.a) };
      }
    }
    return null;
  };
  // branches split off after the tip has passed their junction, and grow at their own pace
  const br = C.branches.map((b, i) => {
    const t0 = arrive(F.mainS.get(b[0]) ?? 0) + 0.05;
    const len = F.branchLen[i];
    return { t0, d: 0.08 + len / 700, len };
  });
  const when = (p) => (p.s !== undefined ? arrive(p.s) : br[p.b].t0 + br[p.b].d * invOutCubic(p.d / (br[p.b].len || 1)));
  const tN = F.nodes.map((n) => (n.at ? when(n.at) : Infinity));
  const tE = F.edges.map((e) => [when(e.pa), when(e.pb)]);
  const runEnd = Math.max(...segsF.map((g) => g.t1), ...segsB.map((g) => g.t1), 0) + T.strike;
  return { s0, tN, tE, tipF: (time) => tip(segsF, time), tipB: (time) => tip(segsB, time), runEnd };
}

/** The black glass: a faint sheen across it, as a pane in a dark room. */
function paintGlass(ctx, w, h, ground) {
  if (ground === 'paper') { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h); return; }
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.46, 'rgba(255,255,255,0.016)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  g.addColorStop(0.56, 'rgba(255,255,255,0.01)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

const tracePolys = (ctx, list) => {
  ctx.beginPath();
  for (const p of list) {
    if (!p || p.length < 3) continue;
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }
};

/** A soft blur that works in every browser: shrink by halves, then draw back up, smoothed. */
function softBlur(src, chain) {
  let cur = src;
  for (const c of chain) {
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, c.width, c.height);
    cur = c;
  }
  return cur;
}

export function motion(el, { ground = 'ink' } = {}) {
  const stage = canvasStage(el);
  const paper = ground === 'paper';
  const glass = document.createElement('canvas');
  const gctx = glass.getContext('2d');
  const bloom = document.createElement('canvas'); // the glow, drawn at a quarter of the size
  const bctx = bloom.getContext('2d');
  const chain = [document.createElement('canvas'), document.createElement('canvas')]; // and blurred by halving
  let L = null;
  let tl = null;
  let strikeRel = 0; // where the glass was struck, along the line from the S's lower spike (0: the canonical strike)
  // the pointer, as a light, eased so it glides
  const lightP = { x: 0.5, y: 0.2, on: 0 };
  let easeRaf = 0;
  let lastEase = 0;
  const stepEase = (now) => {
    const dt = lastEase ? Math.min(0.05, (now - lastEase) / 1000) : 0.016;
    lastEase = now;
    const k = 1 - Math.exp(-dt / 0.12);
    lightP.x += (ptr.x - lightP.x) * k;
    lightP.y += (ptr.y - lightP.y) * k;
    lightP.on += ((ptr.inside ? 1 : 0) - lightP.on) * k;
    const moving = Math.abs(ptr.x - lightP.x) + Math.abs(ptr.y - lightP.y) > 0.0005 || Math.abs((ptr.inside ? 1 : 0) - lightP.on) > 0.002;
    if (tl && !tl.playing) tl.redraw();
    easeRaf = moving ? requestAnimationFrame(stepEase) : 0;
    if (!moving) lastEase = 0;
  };
  const ptr = pointer(el, { onMove: () => { if (!easeRaf) easeRaf = requestAnimationFrame(stepEase); } });

  const layout = () => {
    const { width: w, height: h, dpr } = stage;
    const base = build(WORD);
    const narrow = w < 560;
    const scale = (w * (narrow ? 0.8 : 0.66)) / base.width;
    // the same crack, with its leads run out to the frame's edges
    const ox = w / 2 - ((base.x0 + base.x1) / 2) * scale;
    const leadInExtra = (ox / scale + base.x0) - base.o.lead + 2 / scale;
    const leadOutExtra = ((w - ox) / scale - base.x1) - base.o.lead + 2 / scale;
    const C = build({ ...WORD, leadInExtra, leadOutExtra });
    const F = fine(C, 5);
    const oy = h / 2 - 50 * scale;
    glass.width = Math.round(w * dpr);
    glass.height = Math.round(h * dpr);
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintGlass(gctx, w, h, ground);
    bloom.width = Math.max(2, Math.round(w / 4));
    bloom.height = Math.max(2, Math.round(h / 4));
    chain[0].width = Math.max(1, Math.round(w / 8)); chain[0].height = Math.max(1, Math.round(h / 8));
    chain[1].width = Math.max(1, Math.round(w / 16)); chain[1].height = Math.max(1, Math.round(h / 16));
    const sIn = F.mainS.get(C.main[C.legs[0].in]);
    const s0 = clamp(sIn + strikeRel, 2, F.mainLen - 2);
    L = { w, h, dpr, scale, ox, oy, C, F, s0, sIn, sch: schedule(F, C, s0) };
  };

  /** A point on the running line at distance s, and the line's direction there. */
  const pointAt = (s) => {
    const { C, F } = L;
    const M = C.main;
    for (let i = 1; i < M.length; i++) {
      const sa = F.mainS.get(M[i - 1]);
      const sb = F.mainS.get(M[i]);
      if (s <= sb || i === M.length - 1) {
        const a = C.G.nodes[M[i - 1]];
        const b = C.G.nodes[M[i]];
        const u = clamp((s - sa) / ((sb - sa) || 1));
        const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, d: [(b.x - a.x) / l, (b.y - a.y) / l] };
      }
    }
    return { x: 0, y: 0, d: [1, 0] };
  };

  /** The crack as it is at this moment: a graph of what has opened, with its widths. */
  const openGraph = (time) => {
    const { F, sch } = L;
    const G = new Graph();
    const ids = new Map();
    const opening = 0.25;
    const widthAt = (base, t) => {
      if (!(time >= t)) return 0;
      if (base <= 0.6) return base;
      return Math.min(base, 0.6 + (base - 0.6) * ease.outCubic(clamp((time - t) / opening)));
    };
    const nodeOf = (i) => {
      if (!ids.has(i)) { const n = F.nodes[i]; ids.set(i, G.node(n.x, n.y, { cut: n.cut, clip: n.clip, tip: n.tip })); }
      return ids.get(i);
    };
    const meta = [];
    F.edges.forEach((e, k) => {
      const [ta, tb] = sch.tE[k];
      const lo = Math.min(ta, tb);
      const hi = Math.max(ta, tb);
      if (!(time >= lo)) return;
      const tm = (ta + tb) / 2;
      if (time >= hi) {
        G.edge(nodeOf(e.a), nodeOf(e.b), widthAt(e.wa, ta), widthAt(e.wb, tb), { zero: e.zero, attach: e.attach });
      } else {
        const fromA = ta <= tb;
        const r = fromA ? e.a : e.b;
        const o = fromA ? e.b : e.a;
        const u = (time - lo) / ((hi - lo) || 1);
        const R = F.nodes[r];
        const O = F.nodes[o];
        const tipId = G.node(R.x + (O.x - R.x) * u, R.y + (O.y - R.y) * u);
        const wr = fromA ? e.wa : e.wb;
        G.edge(nodeOf(r), tipId, widthAt(wr, lo), 0, { zero: e.zero });
      }
      meta.push({ tm, dir: e.dir, mx: (F.nodes[e.a].x + F.nodes[e.b].x) / 2, my: (F.nodes[e.a].y + F.nodes[e.b].y) / 2, zero: e.zero });
    });
    return { G, meta };
  };

  const render = (t) => {
    if (!L) return;
    const { ctx } = stage;
    const { w, h, dpr, scale, ox, oy, sch } = L;
    const time = t * T.dur;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(glass, 0, 0, w, h);

    const strikeP = pointAt(L.s0);
    const toPx = (p) => [ox + p[0] * scale, oy + p[1] * scale];
    const [sx, sy] = toPx([strikeP.x, strikeP.y]);

    // the light: the pointer while it is over the glass, else one that crosses above the name during the hold
    const scripted = (() => {
      const u = ease.inOutCubic(span(time, T.glint0, T.glint1));
      const on = smoothstep(T.glint0, T.glint0 + 0.3, time) * (1 - smoothstep(T.glint1 - 0.3, T.glint1, time));
      return { x: (-0.1 + 1.2 * u) * w, y: h * 0.06, on };
    })();
    const pl = { x: lightP.x * w, y: lightP.y * h, on: lightP.on };
    const light = pl.on > 0.01 ? { x: lerp(scripted.x, pl.x, pl.on), y: lerp(scripted.y, pl.y, pl.on), on: Math.max(scripted.on * (1 - pl.on), pl.on) } : scripted;
    const lu = [(light.x - ox) / scale, (light.y - oy) / scale];

    // the pointer's light on the glass itself, faint, so you can see where it is
    if (pl.on > 0.01 && !paper) {
      const r = Math.max(w, h) * 0.3;
      const g = ctx.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, r);
      g.addColorStop(0, `rgba(255,248,236,${0.06 * pl.on})`);
      g.addColorStop(0.35, `rgba(255,248,236,${0.02 * pl.on})`);
      g.addColorStop(1, 'rgba(255,248,236,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // the strike: a jolt of the glass, felt in the crack
    const tau = time - T.strike;
    const jolt = tau > 0 && tau < 0.6 ? 3 * Math.exp(-tau / 0.08) * Math.sin((tau / 0.11) * Math.PI * 2) : 0;
    const jx = jolt * 0.3;
    const jy = jolt * 0.95;

    // the crack as it is now
    const scarFade = 1 - smoothstep(T.scarOut, T.end, time);
    const visible = time >= T.strike && scarFade > 0;
    let hot = [];
    if (visible) {
      const { G, meta } = openGraph(time);
      const O = outline(G, { clean: false });
      // each run's colour: white hot when fresh, cooling to rest; lit by the light; drained to a scar
      const cols = [];
      O.pieces.forEach((p, i) => {
        if (!p) return;
        const m = meta[i];
        const age = time - m.tm;
        const heat = age >= 0 ? Math.max(0, Math.exp(-age / 0.4) - 0.01) / 0.99 : 1;
        const drainAt = T.drain + (m.tm - T.strike) * 0.8;
        const lit = 1 - (1 - SCAR) * smoothstep(drainAt, drainAt + 0.3, time);
        const lx = lu[0] - m.mx;
        const ly = lu[1] - m.my;
        const ld = Math.hypot(lx, ly) || 1;
        const across = Math.abs(m.dir[0] * (ly / ld) - m.dir[1] * (lx / ld));
        const reach = Math.exp(-((m.mx - lu[0]) ** 2) / (2 * 110 * 110));
        const glint = paper ? 0 : 0.85 * light.on * across ** 3 * reach * lit;
        const base = C_REST.map((v, j) => v + (C_HOT[j] - v) * heat);
        const c = base.map((v) => (v + (255 - v) * glint) * lit * scarFade);
        cols.push([p, c, heat, glint * lit, m]);
      });
      ctx.save();
      ctx.translate(jx, jy);
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      if (!paper) {
        // the spectrum at the edges of the freshest line only: warm away from the light, cool towards it
        ctx.globalCompositeOperation = 'lighter';
        for (const [p, , heat, , m] of cols) {
          const f = smoothstep(0.62, 0.95, heat);
          if (f <= 0.01) continue;
          const lx = m.mx - lu[0];
          const ly = m.my - lu[1];
          const ld = Math.hypot(lx, ly) || 1;
          for (const [sgn, c] of [[1, C_WARM], [-1, C_COOL]]) {
            ctx.save();
            ctx.translate((lx / ld) * 0.6 * sgn, (ly / ld) * 0.6 * sgn);
            ctx.fillStyle = css(c, 0.8 * f);
            tracePolys(ctx, [p]);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // the line: filled once in its resting light, then each run that differs (fresh, lit or drained)
      // in its own light, clipped to the outline, with a hair of stroke to hide the seams
      const paint = (c) => (paper ? css(rgb(INK), Math.min(1, (c[0] / 255) * 1.3)) : css(c));
      const rest = C_REST.map((v) => v * scarFade);
      tracePolys(ctx, O.faces);
      ctx.fillStyle = paint(rest);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.lineWidth = 0.9 / scale;
      ctx.lineJoin = 'round';
      for (const [p, c] of cols) {
        if (Math.abs(c[0] - rest[0]) + Math.abs(c[1] - rest[1]) + Math.abs(c[2] - rest[2]) < 2) continue;
        ctx.fillStyle = paint(c);
        ctx.strokeStyle = ctx.fillStyle;
        tracePolys(ctx, [p]);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      hot = cols.filter(([, , heat, glint]) => heat > 0.05 || glint > 0.04);
    }
    if (paper) return;

    // bloom: fresh runs and glints glow, drawn small and blurred
    const bw = bloom.width;
    const bh = bloom.height;
    const bs = bw / w;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, bw, bh);
    if (hot.length) {
      bctx.setTransform(bs * scale, 0, 0, bs * scale, bs * (ox + jx), bs * (oy + jy));
      bctx.globalCompositeOperation = 'lighter';
      for (const [p, , heat, glint] of hot) {
        bctx.fillStyle = css([255, 246, 232], Math.min(1, heat * 0.8 + glint * 0.9));
        tracePolys(bctx, [p]);
        bctx.fill();
      }
      const wide = softBlur(bloom, chain);
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(bloom, 0, 0, w, h);
      ctx.globalAlpha = 0.25;
      ctx.drawImage(wide, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    const glow = (x, y, r, a, c = C_HOT) => {
      if (a <= 0.002 || r <= 0) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, css(c, a));
      g.addColorStop(0.3, css(c, a * 0.3));
      g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    ctx.globalCompositeOperation = 'lighter';
    // before the strike: an ember, then a point of light gathers and draws in just before it hits
    const emberIn = smoothstep(T.scarOut, T.end + 0.05, time);
    const ember = time < T.drawIn ? 1 : emberIn;
    const grow = ease.inOutQuad(span(time, T.ember, T.drawIn));
    const draw = ease.inCubic(span(time, T.drawIn, T.strike));
    const C_EMBER = [255, 206, 150];
    if (time < T.strike) {
      const r = (8 + 32 * grow) * (1 - draw) + 4 * draw;
      glow(sx, sy, r, 0.26 + 0.24 * grow + 0.4 * draw, mixc(C_EMBER, C_HOT, grow)); // warm, then white as it gathers
      glow(sx, sy, 2.8 + 1.2 * draw, 0.95);
    } else if (ember > 0.001) {
      glow(sx, sy, 8, 0.26 * ember, C_EMBER);
      glow(sx, sy, 2.8, 0.95 * ember);
    }
    glow(sx, sy, 24, 0.12 * (time < T.drawIn ? 1 - grow : emberIn), C_EMBER); // the ember's warm halo: the same at both ends of the loop
    // the hit: the pane flashes for a frame or two, and a burst at the point of impact
    if (tau >= 0 && tau < 0.5) {
      const flash = 0.13 * (1 - smoothstep(0, 0.05, tau));
      if (flash > 0.001) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, w, h); }
      const halo = Math.exp(-tau / 0.12);
      glow(sx + jx, sy + jy, Math.min(90, 12 + 150 * tau), 0.75 * halo);
    }
    // the impact: a few short cracks star out from the point, unevenly, then fade as the crack takes over
    if (tau >= 0 && tau < 1.6) {
      const out = ease.outExpo(clamp(tau / 0.07));
      const fade = 1 - smoothstep(0.6, 1.5, tau);
      const away = strikeP.y > 50 ? 1 : -1;
      ctx.save();
      ctx.translate(ox + jx, oy + jy);
      ctx.scale(scale, scale);
      ctx.fillStyle = css(C_HOT, 0.95 * fade);
      for (const [deg, len] of [[142, 16], [76, 9], [218, 7], [104, 5]]) {
        const a = (deg * Math.PI) / 180;
        const dx = Math.cos(a);
        const dy = Math.sin(a) * away;
        const l = len * out;
        const wv = 1.3;
        ctx.beginPath();
        ctx.moveTo(strikeP.x - dy * wv, strikeP.y + dx * wv);
        ctx.lineTo(strikeP.x + dx * l, strikeP.y + dy * l);
        ctx.lineTo(strikeP.x + dy * wv, strikeP.y - dx * wv);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // the running tips: a needle along the line, as long as the tip is fast
    for (const tip of [sch.tipF(time), sch.tipB(time)]) {
      if (!tip) continue;
      const p = pointAt(tip.s);
      const d = [p.d[0] * tip.dir, p.d[1] * tip.dir];
      const len = clamp(tip.v * 0.028, 2.5, 42);
      const wv = 1.6;
      const [px, py] = toPx([p.x, p.y]);
      ctx.save();
      ctx.translate(px + jx, py + jy);
      ctx.scale(scale, scale);
      ctx.fillStyle = css(C_HOT, 0.95);
      ctx.beginPath();
      ctx.moveTo(d[0] * 3, d[1] * 3);
      ctx.lineTo(-d[1] * wv, d[0] * wv);
      ctx.lineTo(-d[0] * len, -d[1] * len);
      ctx.lineTo(d[1] * wv, -d[0] * wv);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      glow(px + jx, py + jy, 8, 0.4);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // strike where you click or tap: the crack runs out both ways from there
  const strike = (e) => {
    if (!L) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) - L.ox) / L.scale;
    const py = ((e.clientY - r.top) - L.oy) / L.scale;
    const { C, F } = L;
    let best = { d: Infinity, s: L.s0 };
    for (let i = 1; i < C.main.length; i++) {
      const a = C.G.nodes[C.main[i - 1]];
      const b = C.G.nodes[C.main[i]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      const u = clamp(((px - a.x) * dx + (py - a.y) * dy) / l2);
      const d = Math.hypot(a.x + dx * u - px, a.y + dy * u - py);
      if (d < best.d) best = { d, s: F.mainS.get(C.main[i - 1]) + Math.sqrt(l2) * u };
    }
    L.s0 = clamp(best.s, 2, F.mainLen - 2);
    strikeRel = L.s0 - L.sIn;
    L.sch = schedule(F, C, L.s0);
    tl.seek((T.drawIn - 0.12) / T.dur);
    tl.play();
  };
  el.addEventListener('pointerdown', strike);

  layout();
  tl = timeline({ duration: T.dur, render });
  stage.onResize(() => { layout(); tl.redraw(); });
  const release = () => {
    el.removeEventListener('pointerdown', strike);
    cancelAnimationFrame(easeRaf);
    for (const c of [glass, bloom, ...chain]) { c.width = 0; c.height = 0; }
  };
  return withCleanup(tl, ptr.destroy, release, stage.destroy);
}

// ---------- the application: the studio's front at night ----------

const APP_IMAGE = 6; // Svartljus: rings of light in the trees, projected on the studio floor

export function application(el, { images }) {
  const stage = canvasStage(el);
  let img = null;
  let dead = false;
  const fontsReady = (async () => {
    try {
      await Promise.all([
        document.fonts.load(`400 20px ${TEXT}`),
        document.fonts.load(`500 20px ${TEXT}`),
        document.fonts.load(`300 40px ${DISPLAY}`),
      ]);
    } catch (e) { /* the fallbacks will do */ }
  })();
  const draw = () => { if (img && !dead) paintFront(stage.ctx, stage.width, stage.height, stage.dpr, img); };
  const ready = Promise.all([loadImage(images[APP_IMAGE]).then((i) => { img = i; }), fontsReady]).then(draw);
  stage.onResize(draw);
  return { ready, destroy: () => { dead = true; stage.destroy(); } };
}

/** The average colour of a picture, for the light it throws into the room. */
function tone(img) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, 8, 8);
  const d = x.getImageData(0, 0, 8, 8).data;
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] + d[i + 1] + d[i + 2];
    const k = lum / 765; // weight by brightness: the light, not the dark
    sum[0] += d[i] * k; sum[1] += d[i + 1] * k; sum[2] += d[i + 2] * k; n += k;
  }
  return sum.map((v) => Math.round(v / (n || 1)));
}

const quad = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); };
const mixc = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);

/** The room behind the glass: a dark studio in one-point perspective, a projection on its floor. */
function paintRoom(ctx, sf, u, img, lightC) {
  const vp = [sf.x + sf.w * 0.5, sf.y + sf.h * 0.4];
  const dep = 0.5;
  const bk = { x: vp[0] + (sf.x - vp[0]) * dep, y: vp[1] + (sf.y - vp[1]) * dep, w: sf.w * dep, h: sf.h * dep };
  const ground = sf.y + sf.h;
  const O = { tl: [sf.x, sf.y], tr: [sf.x + sf.w, sf.y], br: [sf.x + sf.w, ground], bl: [sf.x, ground] };
  const B = { tl: [bk.x, bk.y], tr: [bk.x + bk.w, bk.y], br: [bk.x + bk.w, bk.y + bk.h], bl: [bk.x, bk.y + bk.h] };
  const lit = (a) => css(mixc([20, 19, 22], lightC, a));
  const grad = (x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  ctx.save();
  quad(ctx, [O.tl, O.tr, O.br, O.bl]);
  ctx.clip();
  // walls, lit from below by the floor
  ctx.fillStyle = grad(0, sf.y, 0, bk.y, [[0, '#0b0b0d'], [1, '#141316']]);
  quad(ctx, [O.tl, O.tr, B.tr, B.tl]); ctx.fill();
  ctx.fillStyle = grad(0, bk.y, 0, bk.y + bk.h, [[0, '#131215'], [0.7, lit(0.12)], [1, lit(0.3)]]);
  quad(ctx, [B.tl, B.tr, B.br, B.bl]); ctx.fill();
  for (const [a, b, c, d] of [[O.tl, B.tl, B.bl, O.bl], [B.tr, O.tr, O.br, B.br]]) {
    ctx.fillStyle = grad(0, sf.y, 0, ground, [[0, '#0d0c0f'], [0.45, '#151417'], [0.8, lit(0.16)], [1, lit(0.24)]]);
    quad(ctx, [a, b, c, d]); ctx.fill();
  }
  // the wall's corners, caught by the light
  ctx.strokeStyle = css(mixc([40, 38, 42], lightC, 0.2), 0.7);
  ctx.lineWidth = Math.max(1, 0.8 * u);
  ctx.beginPath();
  for (const [p, q] of [[O.tl, B.tl], [O.tr, B.tr], [B.tl, B.bl], [B.tr, B.br]]) { ctx.moveTo(...p); ctx.lineTo(...q); }
  ctx.stroke();
  // the floor, dark and polished
  ctx.fillStyle = grad(0, bk.y + bk.h, 0, ground, [[0, '#121114'], [1, '#08080a']]);
  quad(ctx, [B.bl, B.br, O.br, O.bl]); ctx.fill();
  // the projection on the floor, in perspective, row by row: far end at the top of the picture
  const zAt = (y) => (ground - vp[1]) / (y - vp[1]); // depth, 1 at the glass
  const z0 = 1.25;
  const z1 = 1 / dep - 0.12;
  const half = 0.36 * sf.w; // the projection's half width, in glass units
  const rows = Math.max(40, Math.ceil((sf.h * 0.3) * 2.5));
  const yNear = vp[1] + (ground - vp[1]) / z0;
  const yFar = vp[1] + (ground - vp[1]) / z1;
  const sh = img.height;
  const sw = img.width;
  const cropW = Math.min(sw, sh * 1.2);
  const cropX = (sw - cropW) / 2;
  ctx.save();
  ctx.globalAlpha = 0.92;
  for (let i = 0; i < rows; i++) {
    const ya = yFar + ((yNear - yFar) * i) / rows;
    const yb2 = yFar + ((yNear - yFar) * (i + 1)) / rows;
    const za = zAt(ya);
    const v = (z1 - za) / (z1 - z0); // 0 far … 1 near
    const hw = half / za;
    const sy = clamp(v, 0, 0.999) * sh;
    ctx.drawImage(img, cropX, sy, cropW, Math.max(1, Math.min(sh - sy, (sh / rows) * 1.5)), vp[0] - hw, ya, hw * 2, (yb2 - ya) * 1.6);
  }
  ctx.restore();
  // its light on the back wall and the walls: a soft rise of colour
  const spill = ctx.createRadialGradient(vp[0], yNear, 10, vp[0], yNear, sf.w * 0.55);
  spill.addColorStop(0, css(lightC, 0.2));
  spill.addColorStop(1, css(lightC, 0));
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = spill;
  ctx.fillRect(sf.x, sf.y, sf.w, sf.h);
  ctx.globalCompositeOperation = 'source-over';
  // an installation in the room: rods of light hung from the ceiling to the floor, in two rows
  const rods = [[-0.34, 1.35], [-0.2, 1.62], [-0.07, 1.4], [0.06, 1.75], [0.19, 1.45], [0.3, 1.68], [-0.42, 1.8], [0.42, 1.3]];
  for (const [X, z] of rods) {
    const x = vp[0] + (X * sf.w) / z;
    const yTop = vp[1] + (sf.y - vp[1]) / z;
    const yBot = vp[1] + (ground - vp[1]) / z;
    const a = 0.55 / z;
    const g = ctx.createLinearGradient(0, yTop, 0, yBot);
    g.addColorStop(0, `rgba(255,236,200,${a * 0.5})`);
    g.addColorStop(0.5, `rgba(255,240,215,${a})`);
    g.addColorStop(1, `rgba(255,220,160,${a * 0.8})`);
    ctx.fillStyle = g;
    ctx.fillRect(x - (1.1 * u) / z, yTop, (2.2 * u) / z, yBot - yTop);
    ctx.fillStyle = `rgba(255,230,190,${a * 0.08})`;
    ctx.fillRect(x - (7 * u) / z, yTop, (14 * u) / z, yBot - yTop);
  }
  ctx.restore();
  return { vp, bk, yNear };
}

function paintFront(ctx, w, h, dpr, img) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const u = w / 1000;
  const lightC = tone(img);

  // the facade: a dark fascia above, the pavement below, the storefront between
  ctx.fillStyle = '#111010';
  ctx.fillRect(0, 0, w, h);
  const sf = { x: 40 * u, y: 34 * u, w: w - 80 * u, h: h - 34 * u - 40 * u };
  const ground = sf.y + sf.h;
  const f = 10 * u; // the steel
  const doorX0 = sf.x + sf.w * 0.7;
  const doorX1 = sf.x + sf.w * 0.9;
  const transom = sf.y + sf.h * 0.13;

  // the room, drawn once, then seen through two pieces of glass
  const room = document.createElement('canvas');
  room.width = Math.round(w * dpr);
  room.height = Math.round(h * dpr);
  const rctx = room.getContext('2d');
  rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintRoom(rctx, sf, u, img, lightC);
  ctx.drawImage(room, 0, 0, w, h);

  // the crack across the big pane, frame to frame, at eye height
  const pane = { x0: sf.x, x1: doorX0 - f / 2, y0: sf.y, y1: ground };
  const base = build(WORD);
  const paneW = pane.x1 - pane.x0;
  const k = (paneW * 0.7) / base.width;
  const ox = pane.x0 + paneW / 2 - ((base.x0 + base.x1) / 2) * k;
  const lead0 = (pane.x0 - ox) / k;
  const lead1 = (pane.x1 - ox) / k;
  const C = build({ ...WORD, leadInExtra: base.x0 - base.o.lead - lead0 + 0.5, leadOutExtra: lead1 - base.x1 - base.o.lead + 0.5 });
  const oy = sf.y + sf.h * 0.4 - 50 * k;
  const faces = outline(C.G).faces;
  const S = (p) => [ox + p.x * k, oy + p.y * k];
  // the glass above the crack is a separate piece, set a little off: the room behind it shifts
  const upper = [...C.main.map((id) => S(C.G.nodes[id]))];
  upper.push([pane.x1 + 2, upper[upper.length - 1][1]], [pane.x1 + 2, pane.y0 - 2], [pane.x0 - 2, pane.y0 - 2], [pane.x0 - 2, upper[0][1]]);
  ctx.save();
  quad(ctx, [[pane.x0, pane.y0], [pane.x1, pane.y0], [pane.x1, pane.y1], [pane.x0, pane.y1]]);
  ctx.clip();
  quad(ctx, upper);
  ctx.clip();
  ctx.drawImage(room, -3.6 * u, -1.8 * u, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  ctx.fillRect(pane.x0, pane.y0, paneW, pane.y1 - pane.y0);
  ctx.restore();

  // seen through glass: a cool tint, and the street's reflection as a long sheen (tilted a little on the upper piece)
  const sheen = (x0, y0, a) => {
    const g = ctx.createLinearGradient(x0, y0, x0 + sf.w, y0 + sf.h * 1.5);
    g.addColorStop(0.18, 'rgba(255,255,255,0)');
    g.addColorStop(0.3, `rgba(255,255,255,${0.05 * a})`);
    g.addColorStop(0.36, `rgba(255,255,255,${0.012 * a})`);
    g.addColorStop(0.62, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, `rgba(255,255,255,${0.035 * a})`);
    g.addColorStop(0.75, 'rgba(255,255,255,0)');
    return g;
  };
  ctx.fillStyle = 'rgba(16,22,30,0.16)';
  ctx.fillRect(sf.x, sf.y, sf.w, sf.h);
  ctx.save();
  quad(ctx, [[sf.x, sf.y], [sf.x + sf.w, sf.y], [sf.x + sf.w, ground], [sf.x, ground]]);
  ctx.clip();
  ctx.fillStyle = sheen(sf.x, sf.y, 1);
  ctx.fillRect(sf.x, sf.y, sf.w, sf.h);
  quad(ctx, upper);
  ctx.clip();
  ctx.fillStyle = sheen(sf.x - 14 * u, sf.y - 4 * u, 0.9);
  ctx.fillRect(sf.x, sf.y, sf.w, sf.h);
  ctx.restore();

  // the vinyl: a frosted cream, lit along its upper edge by the street, a hair of shadow below
  ctx.save();
  quad(ctx, [[pane.x0, pane.y0], [pane.x1, pane.y0], [pane.x1, pane.y1], [pane.x0, pane.y1]]);
  ctx.clip();
  ctx.translate(ox, oy);
  ctx.scale(k, k);
  const onePx = 1 / k;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.save(); ctx.translate(0, onePx * 1.2); tracePolys(ctx, faces); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,253,248,0.95)';
  ctx.save(); ctx.translate(0, -onePx); tracePolys(ctx, faces); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(236,231,222,0.9)';
  tracePolys(ctx, faces);
  ctx.fill();
  ctx.restore();

  // the steel: frame, mullions, the door
  const steel = (x, y, ww, hh) => {
    ctx.fillStyle = '#0b0b0c';
    ctx.fillRect(x, y, ww, hh);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x, y, Math.min(ww, 1.2), hh);
    ctx.fillRect(x, y, ww, Math.min(hh, 1.2));
  };
  steel(sf.x - f, sf.y - f, sf.w + f * 2, f);
  steel(sf.x - f, sf.y - f, f, sf.h + f);
  steel(sf.x + sf.w, sf.y - f, f, sf.h + f);
  steel(doorX0 - f / 2, sf.y, f, sf.h);
  steel(doorX1 - f / 2, sf.y, f, sf.h);
  steel(doorX0, transom - f / 2, doorX1 - doorX0, f);
  const leaf = { x: doorX0 + f / 2, y: transom + f / 2, w: doorX1 - doorX0 - f, h: ground - transom - f / 2 };
  const st = 6 * u;
  steel(leaf.x, leaf.y, st, leaf.h);
  steel(leaf.x + leaf.w - st, leaf.y, st, leaf.h);
  steel(leaf.x, leaf.y, leaf.w, st);
  steel(leaf.x, ground - 22 * u, leaf.w, 22 * u);
  // a long pull handle, brushed steel
  const hx = leaf.x + leaf.w - st - 20 * u;
  const hy0 = leaf.y + leaf.h * 0.3;
  const hy1 = leaf.y + leaf.h * 0.72;
  const bar = ctx.createLinearGradient(hx, 0, hx + 4.5 * u, 0);
  bar.addColorStop(0, '#5d5f63');
  bar.addColorStop(0.45, '#d4d6d9');
  bar.addColorStop(1, '#3e4044');
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(hx + 2 * u, hy0 + 3 * u, 4.5 * u, hy1 - hy0);
  ctx.fillStyle = bar;
  ctx.fillRect(hx, hy0, 4.5 * u, hy1 - hy0);
  ctx.fillStyle = '#26272a';
  ctx.fillRect(hx - 4 * u, hy0 + 8 * u, 4.5 * u, 3.5 * u);
  ctx.fillRect(hx - 4 * u, hy1 - 11.5 * u, 4.5 * u, 3.5 * u);

  // the door: the pane itself as a frosted decal, its crack left clear, then the studio in small type
  const tx = leaf.x + st + 14 * u;
  const ds = 44 * u;
  const dy0 = oy + 50 * k - ds / 2 - 14 * u;
  ctx.save();
  ctx.translate(tx, dy0);
  ctx.scale(ds / 100, ds / 100);
  ctx.fillStyle = 'rgba(236,231,222,0.9)';
  const decal = new Path2D(paneD(symFaces()));
  ctx.fill(decal, 'evenodd');
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CREAM;
  let ty = dy0 + ds + 22 * u;
  ctx.font = `500 ${(8 * u).toFixed(1)}px ${TEXT}`;
  ctx.letterSpacing = `${(1.6 * u).toFixed(1)}px`;
  ctx.fillText('SMASH', tx, ty);
  ctx.letterSpacing = '0px';
  ty += 15 * u;
  ctx.font = `300 ${(10.5 * u).toFixed(1)}px ${DISPLAY}`;
  ctx.fillText('Immersive', tx, ty);
  ctx.fillText('experience studio', tx, ty + 12 * u);
  ty += 32 * u;
  ctx.font = `400 ${(6.4 * u).toFixed(1)}px ${TEXT}`;
  ctx.fillStyle = 'rgba(243,239,232,0.72)';
  ctx.fillText('Stockholm', tx, ty);
  ctx.fillText('Visits by appointment', tx, ty + 9.5 * u);
  ctx.textAlign = 'right';
  ctx.font = `500 ${(6.4 * u).toFixed(1)}px ${TEXT}`;
  ctx.letterSpacing = `${(1 * u).toFixed(1)}px`;
  ctx.fillStyle = 'rgba(243,239,232,0.8)';
  ctx.fillText('DRA', hx - 9 * u, hy1 - 4 * u);
  ctx.letterSpacing = '0px';

  // the threshold, and the pavement with the window's light in it
  ctx.fillStyle = '#1c1b1a';
  ctx.fillRect(sf.x - f, ground, sf.w + f * 2, 3.5 * u);
  ctx.fillStyle = '#0c0b0a';
  ctx.fillRect(0, ground + 3.5 * u, w, h - ground);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ground + 3.5 * u, w, h - ground);
  ctx.clip();
  const pool = ctx.createRadialGradient(sf.x + sf.w * 0.45, ground, 4, sf.x + sf.w * 0.45, ground, sf.w * 0.5);
  pool.addColorStop(0, css(lightC, 0.22));
  pool.addColorStop(1, css(lightC, 0));
  ctx.fillStyle = pool;
  ctx.fillRect(0, ground, w, h - ground);
  ctx.restore();
  // the fascia: a faint board line
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.fillRect(0, sf.y - f - 7 * u, w, 1);
  ctx.restore();
  room.width = 0;
  room.height = 0;
}
