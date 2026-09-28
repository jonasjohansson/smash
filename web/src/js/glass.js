// v2: the mark as liquid glass.
//
// The mark becomes a slab of glass with a rounded bevel. Its shape comes from
// a signed distance field (exact Euclidean distance to the outline, computed
// on the CPU when the mark changes): inside a letter the glass is flat; within
// `bevel` px of its edge it curves down on a circular profile. From that
// surface normal, per frame:
//   - refraction by Snell's law through a slab `depth` px thick, per colour
//     channel with a slightly different index (dispersion), sampling a
//     mip-mapped image so the curved rim is a little frosted;
//   - Fresnel reflection of a soft studio (overhead light, horizon), plus a
//     tight specular glint from a key light;
//   - absorption: thicker glass darkens and cools a touch, the rim most;
//   - a band of light sweeping across every few seconds, caught by the rims;
//   - a slow ripple in the surface, so it reads as liquid.
// On a white ground the glass also casts a soft shadow.

export const GLASS_DEFAULTS = {
  bevel: 34, // px of rounded edge
  depth: 48, // px of glass the light travels through
  ior: 1.48, // index of refraction
  dispersion: 0.012, // spread of the index across colours
  frost: 2, // blur through the curve (mip levels)
  reflect: 0.9, // strength of reflections
  shine: 0.7, // the sweeping light
  sweep: 7, // seconds between sweeps
  flow: 0.2, // the liquid ripple
};

const VERT = `#version 300 es
in vec2 p;
out vec2 vUv;
// vUv runs from the top left, like the images and the mask as uploaded.
void main() { vUv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImage, uMask, uSdf;
uniform vec2 uRes, uSdfTexel, uImgScale, uImgOffset;
uniform float uTime, uBevel, uDepth, uIor, uDispersion, uFrost, uReflect, uShine, uSweep, uFlow, uHasImage, uLight;
uniform vec3 uBg;
in vec2 vUv;
out vec4 o;

vec3 img(vec2 uv, float lod) {
  return textureLod(uImage, clamp(uv, 0.001, 0.999) * uImgScale + uImgOffset, lod).rgb;
}
float sdf(vec2 uv) { return texture(uSdf, uv).r; }

// A soft studio seen in reflection: a bright overhead panel and a dim horizon.
vec3 studio(vec3 r) {
  float up = clamp(-r.y, 0.0, 1.0); // y runs down the screen
  vec3 c = mix(vec3(0.05), vec3(0.22), smoothstep(-0.2, 0.9, up));
  float panel = exp(-pow(length((r.xy - vec2(-0.25, -0.55)) / vec2(0.55, 0.22)), 2.0));
  return c + vec3(1.0, 0.98, 0.95) * panel * 0.9;
}

void main() {
  vec2 px = vUv * uRes;
  float m = texture(uMask, vUv).a;
  float d = sdf(vUv); // px inside the glass, negative outside

  // Background, with the glass's soft shadow on a light ground.
  vec3 bg = uBg;
  if (uLight > 0.5) {
    float ds = sdf(vUv - vec2(0.0, 14.0) / uRes);
    bg *= 1.0 - 0.16 * smoothstep(-48.0, 6.0, ds) * (1.0 - m);
  }
  if (m < 0.002 || uHasImage < 0.5) { o = vec4(bg, 1.0); return; }

  // Surface: flat inside, a circular bevel at the rim.
  vec2 e = uSdfTexel;
  vec2 grad = vec2(sdf(vUv + vec2(e.x, 0.0)) - sdf(vUv - vec2(e.x, 0.0)),
                   sdf(vUv + vec2(0.0, e.y)) - sdf(vUv - vec2(0.0, e.y)));
  vec2 outward = length(grad) > 1e-5 ? -normalize(grad) : vec2(0.0);
  float t = clamp(1.0 - max(d, 0.0) / uBevel, 0.0, 1.0) * 0.86; // 0 flat .. near-vertical at the edge
  vec3 n = normalize(vec3(outward * t, sqrt(max(1.0 - t * t, 0.0))));

  // The liquid: a slow, slight ripple on the surface.
  vec2 q = px / 420.0;
  vec2 ripple = vec2(sin(q.x * 2.1 + uTime * 0.23 + sin(q.y * 1.7 - uTime * 0.17)),
                     cos(q.y * 2.4 - uTime * 0.19 + sin(q.x * 1.3 + uTime * 0.11)));
  n = normalize(n + vec3(ripple * uFlow * 0.045, 0.0));

  // Refraction through the slab, a little different per colour.
  vec3 view = vec3(0.0, 0.0, -1.0);
  float lod = uFrost * t * t * 2.2;
  vec3 col;
  for (int i = 0; i < 3; i++) {
    float ior = uIor + (float(i) - 1.0) * uDispersion;
    vec3 r = refract(view, n, 1.0 / ior);
    vec2 off = r.xy / max(-r.z, 0.35) * uDepth;
    // Never reach further than the bevel is wide: long reaches smear.
    off *= min(1.0, uBevel * 1.2 / max(length(off), 1e-4));
    off /= uRes;
    col[i] = img(vUv + off, lod)[i];
  }

  // Absorption: a touch darker and cooler where the light crosses more glass.
  col *= mix(vec3(1.0), vec3(0.93, 0.965, 1.0), 0.5 + 0.5 * (1.0 - t));
  col *= 1.0 - 0.22 * pow(t, 3.0);

  // Reflection, by Fresnel.
  float cosv = clamp(n.z, 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - cosv, 5.0);
  vec3 refl = studio(reflect(view, n));
  col = mix(col, refl, fres * uReflect) + refl * 0.06 * uReflect;

  // A tight glint from a key light at the top left.
  vec3 L = normalize(vec3(-0.45, -0.62, 0.64));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  col += vec3(1.0, 0.98, 0.94) * pow(max(dot(n, H), 0.0), 220.0) * 0.85 * uReflect;

  // The sweep: a soft diagonal band of light every few seconds.
  float aspect = uRes.x / uRes.y;
  vec2 axis = normalize(vec2(1.0, 0.55));
  float s = dot(vec2(vUv.x * aspect, vUv.y), axis) / dot(vec2(aspect, 1.0), axis);
  float phase = fract(uTime / max(uSweep, 0.5));
  float pos = mix(-0.35, 1.35, smoothstep(0.0, 0.42, phase));
  float band = exp(-pow((s - pos) / 0.07, 2.0));
  col += vec3(1.0, 0.99, 0.96) * band * uShine * (0.05 + 0.55 * pow(t, 1.5) + 0.3 * fres);

  o = vec4(mix(bg, col, m), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

// ---- signed distance field (Felzenszwalb & Huttenlocher) ---------------------

const INF = 1e20;

function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared distance from every cell to the nearest cell where grid is 0. In place. */
function edt(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
}

/** Signed distance, in cells: positive inside (alpha > 0.5), negative outside. */
function signedDistance(alpha, w, h) {
  const inside = new Float64Array(w * h), outside = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i] > 0.5;
    inside[i] = a ? INF : 0; // distance to the nearest outside cell
    outside[i] = a ? 0 : INF; // distance to the nearest inside cell
  }
  edt(inside, w, h);
  edt(outside, w, h);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(inside[i]) - Math.sqrt(outside[i]) - (alpha[i] > 0.5 ? 0.5 : -0.5);
  return out;
}

// ---- renderer ---------------------------------------------------------------------

export function createGlass(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  const u = (name) => (uniforms[name] ??= gl.getUniformLocation(prog, name));
  const texture = (unit, name, mips = false) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(u(name), unit);
    return t;
  };
  const imageTex = texture(0, 'uImage', true);
  const maskTex = texture(1, 'uMask');
  const sdfTex = texture(2, 'uSdf');

  let imageAspect = 1;
  let hasImage = 0;
  let cssW = 1, cssH = 1;
  const state = { ...GLASS_DEFAULTS, bg: [0, 0, 0], light: false };
  const start = performance.now();

  function render() {
    const W = canvas.width, H = canvas.height;
    gl.viewport(0, 0, W, H);
    const va = W / H;
    const sx = imageAspect > va ? va / imageAspect : 1;
    const sy = imageAspect > va ? 1 : imageAspect / va;
    gl.uniform2f(u('uImgScale'), sx, sy);
    gl.uniform2f(u('uImgOffset'), (1 - sx) / 2, (1 - sy) / 2);
    gl.uniform2f(u('uRes'), cssW, cssH);
    gl.uniform1f(u('uTime'), (performance.now() - start) / 1000);
    gl.uniform1f(u('uBevel'), state.bevel);
    gl.uniform1f(u('uDepth'), state.depth);
    gl.uniform1f(u('uIor'), state.ior);
    gl.uniform1f(u('uDispersion'), state.dispersion);
    gl.uniform1f(u('uFrost'), state.frost);
    gl.uniform1f(u('uReflect'), state.reflect);
    gl.uniform1f(u('uShine'), state.shine);
    gl.uniform1f(u('uSweep'), state.sweep);
    gl.uniform1f(u('uFlow'), state.flow);
    gl.uniform1f(u('uHasImage'), hasImage);
    gl.uniform1f(u('uLight'), state.light ? 1 : 0);
    gl.uniform3f(u('uBg'), ...state.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // The sweep and the ripple move, so the glass renders every frame, unless
  // paused (the identity page pauses it off screen) or let go.
  let running = true;
  let raf = 0;
  const loop = () => { if (!document.hidden) render(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  return {
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running) { running = true; raf = requestAnimationFrame(loop); } },
    /** Stop, and give the WebGL context back (a page keeps only about sixteen). */
    destroy() { this.pause(); gl.getExtension('WEBGL_lose_context')?.loseContext(); },
    /** The current frame as a PNG data URL: drawn and read in one go, so it works without preserveDrawingBuffer. */
    snapshot() { render(); return canvas.toDataURL('image/png'); },

    /** A decoded frame (ImageBitmap or image). */
    setImage(source) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      imageAspect = source.width / source.height;
      hasImage = 1;
    },

    /** The mark, as an SVG string whose opaque parts are glass, W × H CSS px. */
    async setMask(svg, W, H) {
      cssW = W;
      cssH = H;
      const pic = new Image();
      pic.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      await pic.decode();

      const sharp = document.createElement('canvas');
      sharp.width = canvas.width;
      sharp.height = canvas.height;
      sharp.getContext('2d').drawImage(pic, 0, 0, sharp.width, sharp.height);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sharp);

      // Distance field at a third of CSS resolution, in CSS px.
      const scale = 3;
      const sw = Math.max(8, Math.round(W / scale));
      const sh = Math.max(8, Math.round(H / scale));
      const small = document.createElement('canvas');
      small.width = sw;
      small.height = sh;
      const sctx = small.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(pic, 0, 0, sw, sh);
      const px = sctx.getImageData(0, 0, sw, sh).data;
      const alpha = new Float32Array(sw * sh);
      for (let i = 0; i < sw * sh; i++) alpha[i] = px[i * 4 + 3] / 255;
      const field = signedDistance(alpha, sw, sh);
      for (let i = 0; i < field.length; i++) field[i] *= W / sw;
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sdfTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, sw, sh, 0, gl.RED, gl.FLOAT, field);
      gl.uniform2f(u('uSdfTexel'), 1 / sw, 1 / sh);
    },

    set(opts) { Object.assign(state, opts); },
  };
}
