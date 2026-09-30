// One WebGL 2 context for every illusion on the page. A browser keeps only
// about sixteen, and there are more tiles than that, so each tile is drawn
// here in turn and copied onto its own 2D canvas (draw, then copy, in the same
// task, so the drawing buffer is still there to copy).

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

export function renderer() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL 2 is not available');
  const floatTargets = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const programs = new Map();
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.debug(src.split('\n').map((l, i) => `${String(i + 1).padStart(3)} ${l}`).join('\n'));
      throw new Error(`shader: ${log}`);
    }
    return s;
  }
  function program(frag) {
    if (programs.has(frag)) return programs.get(frag);
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      uniforms[name] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
    }
    const entry = { p, uniforms };
    programs.set(frag, entry);
    return entry;
  }

  function texture({ width, height, data = null, internal = gl.RGBA8, format = gl.RGBA, type = gl.UNSIGNED_BYTE, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE }) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }

  /** A pair of float render targets to step a simulation between. */
  function pingpong(width, height) {
    if (!floatTargets) throw new Error('float render targets are not available');
    const make = () => {
      const tex = texture({ width, height, internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, wrap: gl.REPEAT });
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fbo };
    };
    const pair = { width, height, a: make(), b: make() };
    pair.swap = () => { [pair.a, pair.b] = [pair.b, pair.a]; };
    pair.destroy = () => { for (const t of [pair.a, pair.b]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); } };
    return pair;
  }

  /** Grow the canvas to hold at least w × h (it never shrinks). */
  function room(w, h) {
    if (canvas.width >= w && canvas.height >= h) return;
    canvas.width = Math.max(canvas.width, Math.ceil(w / 256) * 256);
    canvas.height = Math.max(canvas.height, Math.ceil(h / 256) * 256);
  }

  /**
   * Run frag over w × h, into `target` (a framebuffer) or the canvas.
   * uniforms: { name: number | number[] | { tex } }; textures take units in order.
   */
  function run(frag, uniforms, w, h, target = null) {
    const { p, uniforms: us } = program(frag);
    gl.useProgram(p);
    let unit = 0;
    for (const [name, value] of Object.entries(uniforms)) {
      const u = us[name];
      if (!u) continue;
      if (value && value.tex) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, value.tex);
        gl.uniform1i(u.loc, unit++);
      } else if (typeof value === 'number') gl.uniform1f(u.loc, value);
      else if (u.type === gl.FLOAT_VEC4) gl.uniform4fv(u.loc, value);
      else if (u.type === gl.FLOAT_VEC3) gl.uniform3fv(u.loc, value);
      else if (u.type === gl.FLOAT_VEC2) gl.uniform2fv(u.loc, value);
      else gl.uniform1fv(u.loc, value);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    if (!target) room(w, h);
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Copy the last w × h drawn to the canvas onto ctx (its top left). */
  function copy(ctx, w, h, dw = w, dh = h) {
    ctx.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, dw, dh);
  }

  return { gl, canvas, floatTargets, texture, pingpong, run, copy, program };
}
