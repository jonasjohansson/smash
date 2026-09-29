// The bench: a small editor on the stage, where a symbol is built by hand
// from the kit, and what it makes is a symbol like the grammar's.
//
// A pegboard (a dot at every node of the grid) and a tray of the six pieces.
// Tap a piece in the tray to take it in hand (tap it again to turn it), then
// tap the board to put it down: it snaps to the nearest place it fits and
// drops in. Tap a piece on the board to pick it; tap it again to turn it;
// hold it a moment to mirror it; drag it to move it; drag it off the board
// to throw it away. Keys, while
// the bench is in use: R turns, M mirrors, Delete removes, arrows move,
// Cmd/Ctrl Z undoes, Esc lets go. The rules are the board's (kit.js): pieces
// click together end to end, round a bend or into a T, and never overlap.

import { KIT, piece, box, moved, turned, mirrored, boardOf, span, at, weightOf, PITCH, SLOT, inkBox, strokesSVG } from './kit.js';
import { symbolLines, kitSVG, DROP } from './draw.js';

const f = (n) => +n.toFixed(2);
const clone = (x) => JSON.parse(JSON.stringify(x));

/** Distance from point p to the segment a–b. */
function toSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Offsets to try, nearest first, up to two nodes away. */
const NEAR = [];
for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) NEAR.push([dx, dy]);
NEAR.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));

/**
 * Pieces kept inside the grid, for building as blocks: an end run off the
 * block (cut) is pulled back onto it; a piece left with nothing is dropped.
 */
function inside(pieces, n, m) {
  const on = ([x, y]) => x >= 0 && y >= 0 && x < n && y < m;
  return pieces.map((p) => {
    const lines = p.lines.map((l) => ({ ...l, pts: l.pts.filter(on) })).filter((l) => l.pts.length > 1);
    return lines.length ? { ...p, lines } : null;
  }).filter(Boolean);
}

/**
 * Mount the bench in el. onChange(symbol) is called after every change.
 * Returns { open(sym, from), detach(), empty(n, m), set({ build, fg, bg }),
 * turn(), mirror(), remove(), undo(), hold(kind), symbol(), from, pristine,
 * held, destroy() }.
 */
export function bench(el, { onChange = () => {}, onHold = () => {} } = {}) {
  el.innerHTML = `<div class="board" tabindex="0" role="application" aria-label="Build a symbol"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg></div>`
    + `<div class="tray">${KIT.map((k) => `<button type="button" class="part" data-k="${k}" aria-label="${k}"></button>`).join('')}</div>`;
  const board = el.querySelector('.board');
  const svg = board.querySelector('svg');
  const tray = el.querySelector('.tray');

  let sym = { n: 5, m: 5, build: 'blocks', sym: 'none', pieces: [] };
  let fg = '#fff', bg = '#000';
  let sel = -1; // the piece picked on the board
  const hand = { kind: 'bend', r: 0, m: false }; // the piece in hand, from the tray
  let history = [];
  let pristine = true; // not changed since it was opened
  let from = null; // the gallery's index of the symbol it was opened from
  let ghost = null; // the piece in hand, hollow, where it would go
  let drag = null;
  let active = false; // in use: keys go to it
  let drawn = '';

  const cut = () => sym.build === 'cut';
  const fits = (q, others) => !!boardOf([...others, q], { N: sym.n, M: sym.m, cut: cut() });
  const others = (i) => sym.pieces.filter((_, k) => k !== i);
  const current = () => ({ ...sym, pieces: sym.pieces, groups: sym.pieces.map((_, i) => [i]) });
  const linesOf = (pieces) => symbolLines({ ...sym, pieces });

  /** The nearest place a piece fits, among the others: where it is, or up to two nodes off. */
  function snap(p, rest) {
    for (const [dx, dy] of NEAR) {
      const q = moved(p, dx, dy);
      if (fits(q, rest)) return q;
    }
    return null;
  }

  /** The piece in hand, centred on a node, snapped. */
  function handAt([x, y]) {
    let p = piece(hand.kind, undefined, { r: hand.r, m: hand.m });
    const [x0, y0, x1, y1] = box(p);
    p = moved(p, x - Math.round((x0 + x1) / 2), y - Math.round((y0 + y1) / 2));
    return snap(p, sym.pieces);
  }

  // ------------------------------------------------------------------ drawing

  function drawTray() {
    for (const b of tray.querySelectorAll('.part')) {
      const on = b.dataset.k === hand.kind;
      b.classList.toggle('held', on);
      b.innerHTML = kitSVG(b.dataset.k, { fg: on ? bg : fg, bg: on ? fg : 'none', turns: on ? hand.r : 0, mirror: on && hand.m, square: true });
    }
  }

  /** The board; with `dropped` (an index), that piece falls into place. */
  function draw(dropped = -1) {
    const { n, m } = sym;
    const W = span(n), H = span(m);
    const p = PITCH * 0.5;
    const ink = cut() ? bg : fg;
    const paper = cut() ? fg : bg;
    let shown = sym.pieces;
    if (drag) shown = drag.off ? others(drag.i) : shown.map((q, k) => (k === drag.i ? drag.at : q));
    let s = cut() ? `<rect width="${f(W)}" height="${f(H)}" fill="${fg}"/>` : '';
    let pegs = '';
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) pegs += `<circle cx="${f(at(i))}" cy="${f(at(j))}" r="2.4"/>`;
    s += `<g fill="${ink}">${pegs}</g>`;
    if (dropped >= 0) {
      const before = shown.filter((_, k) => k !== dropped);
      s += `<g class="sh-show" style="animation-duration:${DROP}ms">${strokesSVG(linesOf(before), ink)}</g>`;
      s += `<g class="sh-drop">${strokesSVG(linesOf([shown[dropped]]), ink)}</g>`;
      s += `<g class="sh-last" style="animation-duration:${DROP}ms">${strokesSVG(linesOf(shown), ink)}</g>`;
    } else {
      s += strokesSVG(linesOf(shown), ink);
    }
    if (ghost && !drag) {
      const ul = linesOf([ghost]);
      s += strokesSVG(ul, ink) + strokesSVG(ul, paper, (ul[0]?.w ?? SLOT) - 5);
    }
    const picked = drag ? (drag.off ? null : drag.at) : sym.pieces[sel];
    if (picked) {
      // Corner marks round the picked piece: a line with a halo, seen on the block and off it.
      const [x0, y0, x1, y1] = inkBox(linesOf([picked])).map((v, k) => v + (k < 2 ? -7 : 7));
      const L = Math.min(12, (x1 - x0) / 3, (y1 - y0) / 3);
      const d = `M${f(x0)} ${f(y0 + L)}V${f(y0)}H${f(x0 + L)}M${f(x1 - L)} ${f(y0)}H${f(x1)}V${f(y0 + L)}M${f(x1)} ${f(y1 - L)}V${f(y1)}H${f(x1 - L)}M${f(x0 + L)} ${f(y1)}H${f(x0)}V${f(y1 - L)}`;
      s += `<path d="${d}" fill="none" stroke="${paper}" stroke-width="6"/><path d="${d}" fill="none" stroke="${ink}" stroke-width="2.4"/>`;
    }
    const vb = `${f(-p)} ${f(-p)} ${f(W + 2 * p)} ${f(H + 2 * p)}`;
    if (svg.getAttribute('viewBox') !== vb) svg.setAttribute('viewBox', vb);
    if (s !== drawn || dropped >= 0) { svg.innerHTML = s; drawn = s; }
  }

  // ------------------------------------------------------------------ changes

  function commit(pieces, nextSel, dropped = -1) {
    history.push(clone(sym.pieces));
    if (history.length > 200) history.shift();
    sym = { ...sym, pieces };
    sel = nextSel;
    pristine = false;
    draw(dropped);
    onChange(current());
  }

  function turn() {
    if (sel >= 0) {
      const q = snap(turned(sym.pieces[sel]), others(sel));
      if (q) commit(sym.pieces.map((p, k) => (k === sel ? q : p)), sel);
    } else { hand.r = (hand.r + 1) % 4; drawTray(); }
  }
  function mirror() {
    if (sel >= 0) {
      const q = snap(mirrored(sym.pieces[sel]), others(sel));
      if (q) commit(sym.pieces.map((p, k) => (k === sel ? q : p)), sel);
    } else { hand.m = !hand.m; drawTray(); }
  }
  function remove() { if (sel >= 0) commit(others(sel), -1); }
  function nudge(dx, dy) {
    if (sel < 0) return;
    const q = moved(sym.pieces[sel], dx, dy);
    if (fits(q, others(sel))) commit(sym.pieces.map((p, k) => (k === sel ? q : p)), sel);
  }
  function undo() {
    if (!history.length) return;
    sym = { ...sym, pieces: history.pop() };
    sel = -1;
    draw();
    onChange(current());
  }
  function hold(kind) {
    if (hand.kind === kind) hand.r = (hand.r + 1) % 4; // tapped again: turned in hand
    else Object.assign(hand, { kind, r: 0, m: false });
    sel = -1;
    drawTray();
    draw();
    onHold(hand.kind);
  }

  // ------------------------------------------------------------------ pointer

  const toUnits = (e) => {
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [q.x, q.y];
  };
  const toNode = ([x, y]) => [Math.round((x - at(0)) / PITCH), Math.round((y - at(0)) / PITCH)];
  /** Off the board: past the room round the block. */
  const off = ([x, y]) => x < -PITCH * 0.5 || y < -PITCH * 0.5 || x > span(sym.n) + PITCH * 0.5 || y > span(sym.m) + PITCH * 0.5;
  function hit(u) {
    let best = -1, bd = Infinity;
    sym.pieces.forEach((p, i) => {
      for (const l of linesOf([p])) for (let k = 1; k < l.pts.length; k++) {
        const d = toSegment(u, l.pts[k - 1], l.pts[k]);
        if (d < bd) { bd = d; best = i; }
      }
    });
    return bd <= weightOf(sym.build) / 2 + 9 ? best : -1;
  }

  board.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    active = true;
    board.focus({ preventScroll: true });
    const u = toUnits(e);
    const i = hit(u);
    try { board.setPointerCapture(e.pointerId); } catch {}
    ghost = null;
    if (i >= 0) {
      drag = { i, from: sym.pieces[i], at: sym.pieces[i], start: toNode(u), moved: false, off: false, wasPicked: sel === i };
      // Held still for a moment: mirrored (a finger has no M key).
      drag.timer = setTimeout(() => { if (drag && !drag.moved) { drag = null; mirror(); } }, 520);
      sel = i;
      draw();
    } else {
      const q = handAt(toNode(u));
      if (q) commit([...sym.pieces, q], sym.pieces.length, sym.pieces.length);
      else { sel = -1; draw(); }
    }
    e.preventDefault();
  });
  board.addEventListener('pointermove', (e) => {
    const u = toUnits(e);
    if (drag) {
      const [nx, ny] = toNode(u);
      const dx = nx - drag.start[0], dy = ny - drag.start[1];
      drag.off = off(u);
      if (dx || dy || drag.off) { drag.moved = true; clearTimeout(drag.timer); }
      if (!drag.off) {
        const q = moved(drag.from, dx, dy);
        if (fits(q, others(drag.i))) drag.at = q;
      }
      draw();
      return;
    }
    if (e.pointerType === 'mouse') {
      ghost = off(u) || hit(u) >= 0 ? null : handAt(toNode(u));
      draw();
    }
  });
  const release = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    clearTimeout(d.timer);
    if (d.off) commit(others(d.i), -1);
    else if (d.moved && d.at !== d.from) commit(sym.pieces.map((p, k) => (k === d.i ? d.at : p)), d.i);
    else if (!d.moved && d.wasPicked) turn(); // tapped again: turned
    else draw();
  };
  board.addEventListener('pointerup', release);
  board.addEventListener('pointercancel', () => { clearTimeout(drag?.timer); drag = null; draw(); });
  board.addEventListener('pointerleave', () => { if (!drag && ghost) { ghost = null; draw(); } });
  tray.addEventListener('click', (e) => {
    const b = e.target.closest('.part');
    if (b) { active = true; hold(b.dataset.k); }
  });

  // ------------------------------------------------------------------ keys

  const onDown = (e) => { active = el.contains(e.target); };
  const onKey = (e) => {
    if (!active || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') { undo(); e.preventDefault(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const steps = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
    if (k === 'r') turn();
    else if (k === 'm') mirror();
    else if ((k === 'delete' || k === 'backspace') && sel >= 0) remove();
    else if (k === 'escape') { sel = -1; draw(); } else if (steps[k] && sel >= 0) nudge(...steps[k]);
    else return;
    e.preventDefault();
  };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey);

  drawTray();
  draw();

  return {
    /** Open a symbol (a copy of it), from the gallery's place `index`. */
    open(s, index = null) {
      sym = { n: s.n, m: s.m, build: s.build, sym: s.sym ?? 'none', pieces: clone(s.pieces) };
      from = index;
      history = [];
      pristine = true;
      sel = -1;
      draw();
    },
    /** No longer tied to the gallery (it was rebuilt). */
    detach() { from = null; },
    /** Start empty, on a grid of n × m. */
    empty(n, m) {
      history.push(clone(sym.pieces));
      sym = { n, m, build: sym.build, sym: 'none', pieces: [] };
      from = null;
      pristine = false;
      sel = -1;
      draw();
      onChange(current());
    },
    /** Blocks or cut, and the colours. */
    set({ build = sym.build, fg: f1 = fg, bg: b1 = bg }) {
      fg = f1; bg = b1;
      if (build !== sym.build) sym = { ...sym, build, pieces: build === 'cut' ? sym.pieces : inside(sym.pieces, sym.n, sym.m) };
      drawTray();
      draw();
    },
    turn, mirror, remove, undo, hold,
    symbol: current,
    get from() { return from; },
    get pristine() { return pristine; },
    get held() { return hand.kind; },
    destroy() {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      el.innerHTML = '';
    },
  };
}
