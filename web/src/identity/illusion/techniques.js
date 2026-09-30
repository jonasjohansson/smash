// The illusions, one technique each, every one with the mark as its figure.
// Each is a fragment shader over the tile, reading the mark through its
// signed distance (field.js); two are simulations (reaction–diffusion) and
// one is drawn on the CPU (the stereogram).
//
// In every shader: p is the pixel (top left origin, device pixels), u the
// same point in mark units (the mark spans 0..uSize), inside(u) is 1 in the
// letters and 0 outside (antialiased), sdU(u) the signed distance in units,
// sq(x, duty) a square wave (1 where fract(x) < duty) filtered over the pixel,
// bars(v) the mark's own rhythm (its stem, then its slot, a pitch apart): the
// stripes, rings and checkers are drawn at the mark's own weight.
// shade() returns 1 for the mark's colour (white on the page) and 0 for the
// ground. uPhase runs 0..1 over the technique's loop, so every one loops.

const PRELUDE = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uPhase;
uniform float uDpr;
uniform float uInvert;
uniform sampler2D uSdf;
uniform vec4 uBox;
uniform vec2 uSize;
uniform vec3 uFit;
uniform vec3 uStripes;
uniform vec2 uLetters[6];
uniform float uLetterN;
out vec4 outColor;
#define TAU 6.28318530718

vec2 toMark(vec2 p) { return (p - uFit.xy) / uFit.z; }
float sdU(vec2 u) {
  vec2 q = clamp(u, uBox.xy, uBox.xy + uBox.zw);
  return texture(uSdf, (q - uBox.xy) / uBox.zw).r + length(u - q);
}
float inside(vec2 u) { return clamp(0.5 - sdU(u) * uFit.z, 0.0, 1.0); }
float box(float x, float d) { return floor(x) * d + min(fract(x), d); }
float sq(float x, float duty) {
  float w = max(fwidth(x), 1e-4);
  return clamp((box(x + 0.5 * w, duty) - box(x - 0.5 * w, duty)) / w, 0.0, 1.0);
}
float hash(vec2 c) {
  uvec2 q = uvec2(ivec2(c) + 65536);
  q = q * 1664525u + 1013904223u;
  q.x += q.y * 1664525u; q.y += q.x * 1664525u;
  q ^= q >> 16u;
  q.x += q.y * 1664525u; q.y += q.x * 1664525u;
  q ^= q >> 16u;
  return float(q.x & 0xffffu) / 65535.0;
}
// The mark's own rhythm: bars as wide as its stems and gaps as wide as its
// slots, a pitch apart (1 on a bar). barsX is upright and in line with its slots.
float bars(float v) { return 1.0 - sq(v / uStripes.y, uStripes.z / uStripes.y); }
float barsX(float x) { return bars(x - uStripes.x + 0.5 * uStripes.z); }
/** Which letter x (units) is in: the nearest letter's index. */
float letterAt(float x) {
  float best = 0.0, dist = 1e9;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uLetterN) break;
    vec2 L = uLetters[i];
    float d = max(max(L.x - x, x - L.y), 0.0);
    if (d < dist) { dist = d; best = float(i); }
  }
  return best;
}
`;

const shader = (body) => `${PRELUDE}
${body}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float c = shade(p, toMark(p));
  c = mix(c, 1.0 - c, uInvert);
  outColor = vec4(vec3(c), 1.0);
}`;

export const TECHNIQUES = [
  {
    id: 'field',
    name: 'Field',
    // The mark's own slots run on out of it, as far as the tile goes: the
    // block's edge disappears, and the letters are left only where the stripes
    // stop (the bends, the closed ends, the crossbars). A slow fold travels
    // across, the stripes crowding and opening (after Riley's Movement in Squares).
    loop: 10,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  u.x += 46.0 * sin(TAU * (u.x / 640.0 - uPhase));
  vec2 e = max(-u, u - uSize);
  float block = clamp(-1.5 - max(e.x, e.y) * uFit.z, 0.0, 1.0); // a pixel and a half in, so the mark's own edge never shows as a seam
  return mix(barsX(u.x), inside(u), block);
}`),
  },
  {
    id: 'phase',
    name: 'Phase',
    // One grating of lines, the same inside the letters as out, only shifted:
    // the mark is drawn by nothing but the lines' ends (an illusory contour).
    // Inside and out drift against each other, so twice a loop they line up
    // and the mark is gone.
    loop: 8,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float per = uStripes.y;
  float a = bars(u.y + per * uPhase);
  float b = bars(u.y - per * uPhase + 0.5 * per);
  return mix(a, b, inside(u));
}`),
  },
  {
    id: 'grain',
    name: 'Grain',
    // Orientation alone: upright stripes round the mark, level ones in it,
    // both running. Nothing but the direction of the lines says where it is.
    loop: 6,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float per = uStripes.y;
  float a = barsX(u.x - 2.0 * per * uPhase);
  float b = bars(u.y - 2.0 * per * uPhase);
  return mix(a, b, inside(u));
}`),
  },
  {
    id: 'ouchi',
    name: 'Ouchi',
    // Ouchi's illusion: a checker of long bricks, lying round the mark and
    // standing in it. Moved as one, in a small circle, the letters seem to
    // float and slide on their own.
    loop: 1.6,
    frag: shader(`
float checker(vec2 u, vec2 cell) {
  float x = sq(u.x / (2.0 * cell.x), 0.5), y = sq(u.y / (2.0 * cell.y), 0.5);
  return x * y + (1.0 - x) * (1.0 - y);
}
float shade(vec2 p, vec2 u) {
  u -= 12.0 * vec2(cos(TAU * uPhase), sin(TAU * uPhase));
  float a = uStripes.y / 2.0;
  return mix(checker(u, vec2(4.0 * a, a)), checker(u, vec2(a, 4.0 * a)), inside(u));
}`),
  },
  {
    id: 'current',
    name: 'Current',
    // Waving lines, in step outside and the opposite way inside, so the
    // letters shimmer against the ground (after Riley's Current).
    loop: 4,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float per = uStripes.y, amp = 0.3 * per;
  float w = sin(TAU * (u.x / (3.0 * per) - uPhase));
  float a = bars(u.y + amp * w);
  float b = bars(u.y - amp * w);
  return mix(a, b, inside(u));
}`),
  },
  {
    id: 'rings',
    name: 'Rings',
    // Rings out from the middle of the tile, black and white turned over in
    // the letters: the mark as a target, always moving outwards.
    loop: 4,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  vec2 c = toMark(uRes * 0.5);
  float a = bars(length(u - c) - 2.0 * uStripes.y * uPhase);
  return mix(a, 1.0 - a, inside(u));
}`),
  },
  {
    id: 'echo',
    name: 'Echo',
    // The mark's outline, sent out again and again: lines of equal distance
    // from the letters, rounding off into rings as they go (a fingerprint
    // grown from the mark).
    loop: 4,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float d = sdU(u);
  float ring = bars(d - 2.0 * uStripes.y * uPhase);
  float gap = clamp((d - uStripes.z) * uFit.z + 0.5, 0.0, 1.0); // a slot's width clear round the letters
  return mix(ring * gap, 1.0, inside(u));
}`),
  },
  {
    id: 'swell',
    name: 'Swell',
    // Level lines, and the mark pushed up from under them: the lines climb
    // over the letters and bunch at their edges (the liquified op-art letter).
    // Flat, it is gone; it rises and sinks back once a loop.
    loop: 6,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float d = sdU(u);
  float h = 1.0 - smoothstep(-6.0, 6.0, d) + 0.6 * exp(-max(d, 0.0) / 50.0);
  float rise = 0.5 - 0.5 * cos(TAU * uPhase);
  return bars(u.y - 0.9 * uStripes.y * rise * h);
}`),
  },
  {
    id: 'vega',
    name: 'Vega',
    // A checkerboard stretched over the mark, as if it stood up out of the
    // surface: the squares crowd at every edge (after Vasarely's Vega). The
    // board drifts, so the squares roll over the letters.
    loop: 8,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float e = 1.5;
  float d = sdU(u);
  vec2 n = vec2(sdU(u + vec2(e, 0.0)) - sdU(u - vec2(e, 0.0)), sdU(u + vec2(0.0, e)) - sdU(u - vec2(0.0, e))) / (2.0 * e);
  float s = 1.0 / (1.0 + exp(d / 8.0));
  vec2 q = u + 90.0 * s * (1.0 - s) * n + uStripes.y * vec2(1.0, 1.0) * uPhase;
  float x = sq(q.x / uStripes.y, 0.5), y = sq(q.y / uStripes.y, 0.5);
  float board = x * y + (1.0 - x) * (1.0 - y);
  return board;
}`),
  },
  {
    id: 'moire',
    name: 'Moiré',
    // Fine lines with the mark hidden in them (half a line out of step in the
    // letters), and a second sheet of the same lines laid over, turning a
    // little and sliding: where they meet, the mark comes up dark, then light,
    // then not at all. Uncovered, it is only a grey.
    loop: 10,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float per = 3.0 * uDpr / uFit.z;
  float base = sq(u.y / per + 0.5 * step(0.5, inside(u)), 0.5);
  vec2 c = toMark(uRes * 0.5);
  float a = 0.018 * sin(TAU * uPhase);
  vec2 r = u - c;
  float ky = -sin(a) * r.x + cos(a) * r.y;
  float key = sq(ky / per + 3.0 * uPhase, 0.5);
  float edge = uRes.x * (0.5 + 0.38 * cos(TAU * uPhase));
  float covered = clamp(p.x - edge + 0.5, 0.0, 1.0);
  return mix(base, base * key, covered);
}`),
  },
  {
    id: 'scanimation',
    name: 'Scanimation',
    // Four frames of the mark cut into thin strips and interleaved: on its own,
    // a blur. Slide a sheet of black bars over it, one slit to every four
    // strips, and the letters hop (the barrier-grid animation).
    loop: 12,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float s = 3.0 * uDpr, N = 4.0;
  float k = mod(floor(p.x / s), N);
  float i = letterAt(u.x);
  float hop = max(0.0, sin(TAU * k / N - i * 1.4));
  float img = inside(u - vec2(0.0, -34.0 * hop));
  float o = uPhase * 64.0 * s;
  float slit = step(fract((p.x - o) / (N * s)), 1.0 / N);
  float edge = uRes.x * (0.52 + 0.46 * cos(TAU * uPhase));
  float covered = step(edge, p.x);
  return mix(img, img * slit, covered);
}`),
  },
  {
    id: 'motion',
    name: 'Motion',
    // Noise, and nothing else: inside the letters it runs up, outside it runs
    // down. Any single frame is only noise; the mark is there only while it
    // moves. (Pause it.)
    loop: 20,
    frag: shader(`
float shade(vec2 p, vec2 u) {
  float cell = 1.5 * uDpr;
  float v = 22.0 * uDpr * uTime;
  float m = step(0.5, inside(u));
  vec2 q = p + vec2(0.0, mix(-v, v, m));
  return step(0.5, hash(floor(q / cell)));
}`),
  },
  {
    id: 'depth',
    name: 'Depth',
    // A random-dot stereogram: look through the tile (or cross your eyes) until
    // the dots lock, and the mark stands up out of them.
    loop: 1,
    cpu: true,
    fit: [0.62, 0.5],
  },
  {
    id: 'turing',
    name: 'Turing',
    // Reaction–diffusion (Gray–Scott) grown out of the mark's outline: coral
    // creeping out from the letters, a slot's width off them, at the weight
    // of their strokes, so the mark reads as the one still piece of it.
    // cells: how many simulation cells to a pitch of the mark (the pattern's
    // own wavelength), so its worms come out as wide as the mark's stems;
    // level: where the chemistry turns white, for a bar a stem wide.
    loop: 40,
    sim: { mode: 0, F: 0.037, k: 0.06, cells: 12, level: 0.15 },
  },
  {
    id: 'fingerprint',
    name: 'Fingerprint',
    // The same chemistry made to run along the mark's outlines, so it settles
    // into the mark's echo, rounding into rings, at the mark's weight (lined
    // up, its wavelength across is shorter, so it takes fewer cells a pitch).
    loop: 40,
    sim: { mode: 1, F: 0.037, k: 0.06, cells: 6, level: 0.15 },
  },
];

// Reaction–diffusion ----------------------------------------------------------

const SIM_HEAD = `${PRELUDE}
uniform sampler2D uState;
uniform float uMode;
uniform float uF;
uniform float uK;
uniform float uSeed;
vec2 simP() { return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); }
`;

/** Seed: the chemistry at rest everywhere, the other one on the mark's outline or scattered. */
export const SIM_INIT = `${SIM_HEAD}
void main() {
  vec2 p = simP();
  vec2 u = toMark(p);
  float d = sdU(u);
  float v = 0.0;
  vec2 grain = floor(p / 2.0) + uSeed;
  if (uMode < 0.5) v = step(abs(d - uStripes.z - 0.5 * (uStripes.y - uStripes.z)), 0.3 * (uStripes.y - uStripes.z)) * step(0.35, hash(grain));
  else {
    // The mark's outline again and again at its own rhythm (a bar, a slot), fading into specks towards the edges.
    float ring = bars(d) * step(uStripes.z, d) * step(d * uFit.z, uRes.y * 0.3);
    v = max(ring * step(0.15, hash(grain)), step(0.95, hash(floor(p / 3.0) + uSeed)));
  }
  outColor = vec4(1.0 - 0.5 * v, 0.25 * v, 0.0, 1.0);
}`;

/**
 * One step of Gray–Scott with anisotropic diffusion: the Laplacian taken with
 * a diffusion tensor that is stronger along dir, so the pattern lines up.
 */
export const SIM_STEP = `${SIM_HEAD}
vec2 at(vec2 o) { return texture(uState, (gl_FragCoord.xy + o) / uRes).rg; }
void main() {
  vec2 p = simP();
  vec2 u = toMark(p);
  float m = inside(u);
  // Direction (in texture space, y up) and strength of the lining up.
  vec2 dOut = vec2(1.0, 0.0);
  float aOut = 0.0;
  if (uMode > 0.5) {
    // Along the mark's outlines: across the gradient of its distance.
    float e = 2.0;
    vec2 g = vec2(sdU(u + vec2(e, 0.0)) - sdU(u - vec2(e, 0.0)), sdU(u + vec2(0.0, e)) - sdU(u - vec2(0.0, e)));
    vec2 t = normalize(vec2(-g.y, g.x) + 1e-5);
    dOut = vec2(t.x, -t.y);
    aOut = 0.8;
  }
  vec2 dIn = vec2(0.0, 1.0);
  float aIn = 0.0;
  // The tensor D = (1 + a) dd' + (1 - a) nn', mixed between outside and in.
  mat2 Do = (1.0 + aOut) * outerProduct(dOut, dOut) + (1.0 - aOut) * outerProduct(vec2(-dOut.y, dOut.x), vec2(-dOut.y, dOut.x));
  mat2 Di = (1.0 + aIn) * outerProduct(dIn, dIn) + (1.0 - aIn) * outerProduct(vec2(-dIn.y, dIn.x), vec2(-dIn.y, dIn.x));
  mat2 D = Do * (1.0 - m) + Di * m;
  vec2 c = at(vec2(0.0));
  vec2 xx = at(vec2(1.0, 0.0)) + at(vec2(-1.0, 0.0)) - 2.0 * c;
  vec2 yy = at(vec2(0.0, 1.0)) + at(vec2(0.0, -1.0)) - 2.0 * c;
  vec2 xy = 0.25 * (at(vec2(1.0, 1.0)) + at(vec2(-1.0, -1.0)) - at(vec2(1.0, -1.0)) - at(vec2(-1.0, 1.0)));
  vec2 lap = D[0][0] * xx + 2.0 * D[0][1] * xy + D[1][1] * yy;
  float U = c.x, V = c.y;
  float uvv = U * V * V;
  U += 0.13 * lap.x - uvv + uF * (1.0 - U);
  V += 0.065 * lap.y + uvv - (uF + uK) * V;
  // Nothing grows in the letters (shown solid) or within a slot's width of them, so the pattern
  // keeps the mark's own gap from it, and meets its outline.
  float k = 1.0 - smoothstep(uStripes.z - 1.0, uStripes.z + 1.0, sdU(u));
  U = mix(U, 1.0, k);
  V = mix(V, 0.0, k);
  outColor = vec4(clamp(U, 0.0, 1.0), clamp(V, 0.0, 1.0), 0.0, 1.0);
}`;

/** Show the chemistry: the second one as white, thresholded softly. */
export const SIM_SHOW = shader(`
uniform sampler2D uState;
uniform float uLevel;
float shade(vec2 p, vec2 u) {
  float v = texture(uState, vec2(p.x, uRes.y - p.y) / uRes).g;
  float w = max(fwidth(v), 1e-3);
  return max(smoothstep(uLevel - w, uLevel + w, v), inside(u));
}`);

// The stereogram ---------------------------------------------------------------

/**
 * A random-dot autostereogram of the mark (Thimbleby, Inglis and Witten's
 * algorithm), w × h, the mark raised where inMark(x, y) is true. eye is the
 * separation of the eyes in pixels. Returns a Uint8Array of 0 or 255.
 */
export function stereogram(w, h, inMark, eye, seed = 7) {
  const mu = 1 / 3;
  const out = new Uint8Array(w * h);
  const same = new Int32Array(w);
  const row = new Uint8Array(w);
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s >>> 24; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) same[x] = x;
    for (let x = 0; x < w; x++) {
      const z = inMark(x, y) ? 1 : 0;
      const sep = Math.round(((1 - mu * z) * eye) / (2 - mu * z));
      let left = x - (sep >> 1);
      let right = left + sep;
      if (left < 0 || right >= w) continue;
      let l = same[left];
      while (l !== left && l !== right) {
        if (l < right) { left = l; l = same[left]; } else { same[left] = right; left = right; l = same[left]; right = l; }
      }
      same[left] = right;
    }
    for (let x = w - 1; x >= 0; x--) row[x] = same[x] === x ? (rand() & 1) * 255 : row[same[x]];
    out.set(row, y * w);
  }
  return out;
}
