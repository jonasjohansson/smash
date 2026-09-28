// The mapping stage in WebGL 2, in black and white. Three passes:
//   1. the mark: a finely cut mesh (128 × 128 quads) bent through the grid,
//      its mask sampled from a ~4000 px picture of the outlines, into `front`
//      (the mesh covers the grid's frame; the mark sits in part of it, uContent);
//   2. the extrusion (2.5D): for every pixel, walk back along the depth
//      through `front` and take the first layer found, a grey shaded by how
//      that wall faces the light (read from a blurred copy of the mark, so it
//      turns smoothly) and fading into the ground the further back it is, into `lit`;
//   3. the ground: `lit` laid on plain black or plain white.

const SUB = 128; // mesh quads each way

const FULL_VS = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const MESH_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aUv;
uniform vec2 uStage;
out vec2 vUv;
void main() { vUv = aUv; vec2 c = aPos / uStage * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;

const MESH_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uMask;
uniform vec4 uContent; // where the mark's own frame sits in the grid's frame: x, y, w, h
uniform vec3 uColor;
out vec4 o;
void main() {
  vec2 mu = (vUv - uContent.xy) / uContent.zw;
  float m = texture(uMask, mu).r; // the mask's margin is black, and its edge clamps

  // Keep the edge one pixel wide however far the mesh stretches the mask.
  float w = fwidth(m);
  float a = clamp((m - 0.5) / clamp(w, 1e-3, 1.0) + 0.5, 0.0, 1.0);
  o = vec4(uColor * a, a);
}`;

const EXTRUDE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uFront;
uniform sampler2D uSoft;
uniform vec2 uPx;
uniform vec2 uStep;
uniform vec2 uCenter;
uniform float uPersp;
uniform int uSteps;
uniform vec2 uShade; // the wall's grey in shade and in the light
uniform vec3 uGround;
uniform float uFog; // how far the back of the walls fades into the ground
uniform vec2 uLight;
uniform float uNs;
out vec4 o;
float soft(vec2 q) { return texture(uSoft, q).a; }
void main() {
  vec4 acc = texture(uFront, vUv);
  float T = 1.0 - acc.a;
  if (uSteps > 0 && T > 0.003) {
    for (int k = 1; k <= 1024; k++) {
      if (k > uSteps) break;
      float f = float(k) / float(uSteps);
      float sc = 1.0 - uPersp * f;
      vec2 q = uCenter + (vUv - uCenter - uStep * float(k)) / sc;
      float a = textureLod(uFront, q, 0.0).a;
      if (a > 0.004) {
        // Which way this wall faces: the slope of the mark's edge where it shows, read from a
        // Gaussian-softened copy (uSoft), two taps each way, so the walls shade smoothly along their
        // length. The footprint follows the picture's resolution (uNs), so a saved picture shades as the screen does.
        vec2 dx = vec2(uPx.x * 3.0 * uNs, 0.0), dy = vec2(0.0, uPx.y * 3.0 * uNs);
        vec2 g = vec2(soft(q + dx) - soft(q - dx) + 0.5 * (soft(q + 2.0 * dx) - soft(q - 2.0 * dx)),
                      soft(q + dy) - soft(q - dy) + 0.5 * (soft(q + 2.0 * dy) - soft(q - 2.0 * dy)));
        float gl = length(g);
        vec2 n = gl > 1e-4 ? -g / gl : vec2(0.0);
        float lit = 0.5 + 0.5 * dot(n, uLight);
        vec3 wall = mix(vec3(mix(uShade.x, uShade.y, lit)), uGround, uFog * f);
        acc.rgb += T * a * wall;
        T *= 1.0 - a;
        if (T < 0.003) break;
      }
    }
    acc.a = 1.0 - T;
  }
  o = acc;
}`;

const DOWN_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uPx;
out vec4 o;
void main() {
  o = 0.25 * (texture(uSrc, vUv + uPx * vec2(-1.0, -1.0)) + texture(uSrc, vUv + uPx * vec2(1.0, -1.0))
            + texture(uSrc, vUv + uPx * vec2(-1.0, 1.0)) + texture(uSrc, vUv + uPx * vec2(1.0, 1.0)));
}`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uDir;
out vec4 o;
void main() {
  // Nine taps of a Gaussian in five fetches (linear sampling between texels).
  vec4 c = texture(uSrc, vUv) * 0.2270270270;
  c += (texture(uSrc, vUv + uDir * 1.3846153846) + texture(uSrc, vUv - uDir * 1.3846153846)) * 0.3162162162;
  c += (texture(uSrc, vUv + uDir * 3.2307692308) + texture(uSrc, vUv - uDir * 3.2307692308)) * 0.0702702703;
  o = c;
}`;

const FINAL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uLit;
uniform vec3 uGround;
out vec4 o;
void main() {
  vec4 L = texture(uLit, vUv); // premultiplied
  o = vec4(L.rgb + (1.0 - L.a) * uGround, 1.0);
}`;

function compile(gl, vs, fs) {
  const make = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  const a = make(gl.VERTEX_SHADER, vs), b = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, a);
  gl.attachShader(p, b);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  gl.deleteShader(a);
  gl.deleteShader(b);
  const loc = {};
  const u = (name) => (name in loc ? loc[name] : (loc[name] = gl.getUniformLocation(p, name)));
  return { p, u };
}

/**
 * The renderer on a canvas. Returns null without WebGL 2.
 * { maxTex, setMask(canvas), draw(state), destroy() }
 */
export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false, antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  const P = {
    mesh: compile(gl, MESH_VS, MESH_FS),
    extrude: compile(gl, FULL_VS, EXTRUDE_FS),
    down: compile(gl, FULL_VS, DOWN_FS),
    blur: compile(gl, FULL_VS, BLUR_FS),
    final: compile(gl, FULL_VS, FINAL_FS),
  };

  // The mesh: static UVs and indices, positions written each frame.
  const count = (SUB + 1) * (SUB + 1);
  const uv = new Float32Array(count * 2);
  for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) { uv[(j * (SUB + 1) + i) * 2] = i / SUB; uv[(j * (SUB + 1) + i) * 2 + 1] = j / SUB; }
  const idx = new Uint16Array(SUB * SUB * 6);
  let o = 0;
  for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
    const a = j * (SUB + 1) + i, b = a + 1, c = a + SUB + 1, d = c + 1;
    idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
  }
  const meshVao = gl.createVertexArray();
  gl.bindVertexArray(meshVao);
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, count * 2 * 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
  const idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  const fullVao = gl.createVertexArray();
  // The front is read sharp in the extrusion, whatever filter its texture has.
  const sampler = (min) => {
    const sm = gl.createSampler();
    gl.samplerParameteri(sm, gl.TEXTURE_MIN_FILTER, min);
    gl.samplerParameteri(sm, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(sm, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sm, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return sm;
  };
  const sharp = sampler(gl.LINEAR);

  const texture = (filter = gl.LINEAR) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  };
  const mask = texture(gl.LINEAR_MIPMAP_LINEAR);
  const upload = (t, img, fmt = gl.RGBA8, src = gl.RGBA) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, src, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  };

  // Render targets, remade when the stage changes size.
  const target = () => ({ tex: texture(), fb: gl.createFramebuffer(), w: 0, h: 0 });
  const T = { front: target(), lit: target(), qa: target(), qb: target() };
  const size = (t, w, h) => {
    if (t.w === w && t.h === h) return;
    t.w = w; t.h = h;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
  };
  const bindTarget = (t) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
    gl.viewport(0, 0, t ? t.w : canvas.width, t ? t.h : canvas.height);
  };
  const bindTex = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };
  const full = () => { gl.bindVertexArray(fullVao); gl.drawArrays(gl.TRIANGLES, 0, 3); };

  return {
    maxTex,
    /** The mask: a canvas, white where the mark is. Uploaded to one channel. */
    setMask(c) { upload(mask, c, gl.R8, gl.RED); },
    /**
     * Draw a frame. s: {
     *   W, H (css px), dpr, verts (Float32Array of css px positions, (SUB+1)² × 2),
     *   content [x, y, w, h] (the mark's frame within the grid's),
     *   color [r, g, b] (the mark), ground [r, g, b] (the stage),
     *   extrude: null | { step: [x, y] css px per layer, steps, center: [x, y] css px, persp,
     *     shade: [in shade, in the light] (the walls' grey), fog (how far the back fades into the ground), light: [x, y] }
     * }
     */
    draw(s) {
      const w = Math.max(1, Math.round(s.W * s.dpr)), h = Math.max(1, Math.round(s.H * s.dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      size(T.front, w, h);
      size(T.lit, w, h);
      const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4));
      size(T.qa, qw, qh);
      size(T.qb, qw, qh);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);

      // 1. The mark.
      bindTarget(T.front);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(P.mesh.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, s.verts);
      gl.uniform2f(P.mesh.u('uStage'), s.W, s.H);
      bindTex(0, mask);
      gl.uniform1i(P.mesh.u('uMask'), 0);
      gl.uniform4fv(P.mesh.u('uContent'), s.content ?? [0, 0, 1, 1]);
      gl.uniform3fv(P.mesh.u('uColor'), s.color);
      gl.bindVertexArray(meshVao);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.BLEND);

      // A quarter-size copy of the mark, blurred (T.qa): the walls read which way they face from it.
      const blur = (src, r) => {
        bindTarget(T.qa);
        gl.useProgram(P.down.p);
        bindTex(0, src.tex);
        gl.uniform1i(P.down.u('uSrc'), 0);
        gl.uniform2f(P.down.u('uPx'), 1 / w, 1 / h);
        full();
        gl.useProgram(P.blur.p);
        gl.uniform1i(P.blur.u('uSrc'), 0);
        for (const k of r) {
          bindTarget(T.qb);
          bindTex(0, T.qa.tex);
          gl.uniform2f(P.blur.u('uDir'), k / qw, 0);
          full();
          bindTarget(T.qa);
          bindTex(0, T.qb.tex);
          gl.uniform2f(P.blur.u('uDir'), 0, k / qh);
          full();
        }
      };
      const ns = Math.max(1, s.dpr / 2);

      // 2. The extrusion.
      let lit = T.front;
      if (s.extrude && s.extrude.steps > 0) {
        const e = s.extrude;
        blur(T.front, [ns, 2 * ns]);
        bindTarget(T.lit);
        gl.useProgram(P.extrude.p);
        bindTex(0, T.front.tex);
        bindTex(1, T.qa.tex);
        gl.bindSampler(0, sharp);
        gl.uniform1i(P.extrude.u('uFront'), 0);
        gl.uniform1i(P.extrude.u('uSoft'), 1);
        gl.uniform2f(P.extrude.u('uPx'), 1 / w, 1 / h);
        // css px, y down, into uv, y up
        gl.uniform2f(P.extrude.u('uStep'), e.step[0] / s.W, -e.step[1] / s.H);
        gl.uniform2f(P.extrude.u('uCenter'), e.center[0] / s.W, 1 - e.center[1] / s.H);
        gl.uniform1f(P.extrude.u('uPersp'), e.persp);
        gl.uniform1i(P.extrude.u('uSteps'), e.steps);
        gl.uniform2fv(P.extrude.u('uShade'), e.shade);
        gl.uniform3fv(P.extrude.u('uGround'), s.ground);
        gl.uniform1f(P.extrude.u('uFog'), e.fog);
        gl.uniform2f(P.extrude.u('uLight'), e.light[0], -e.light[1]);
        gl.uniform1f(P.extrude.u('uNs'), ns);
        full();
        gl.bindSampler(0, null);
        lit = T.lit;
      }

      // 3. The ground.
      bindTarget(null);
      gl.useProgram(P.final.p);
      bindTex(0, lit.tex);
      gl.uniform1i(P.final.u('uLit'), 0);
      gl.uniform3fv(P.final.u('uGround'), s.ground);
      full();
    },
    destroy() {
      for (const t of Object.values(T)) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
      gl.deleteTexture(mask);
      for (const b of [posBuf, uvBuf, idxBuf]) gl.deleteBuffer(b);
      gl.deleteVertexArray(meshVao);
      gl.deleteVertexArray(fullVao);
      for (const p of Object.values(P)) gl.deleteProgram(p.p);
      gl.deleteSampler(sharp);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export const MESH_SUB = SUB;
