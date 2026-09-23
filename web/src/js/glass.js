// v2: the mark as liquid glass.
//
// One full-screen WebGL pass. The mark is rasterised twice: sharp, for its
// outline, and as a soft height field (a blurred copy at quarter size). The
// height field's slope is the glass surface: flat inside a letter, curving
// down at its rim. Where it curves, the image behind is bent outward,
// split slightly by colour, and caught by a highlight; inside it passes clean.

export const GLASS_DEFAULTS = {
  refract: 2.4, // how far the rim bends the image
  rim: 30, // width of the curved edge, in px
  aberr: 0.08, // colour split at the rim
  shine: 0.9, // highlight
};

const VERT = `#version 300 es
in vec2 p;
out vec2 vUv;
// vUv runs from the top left, like the images and the mask as uploaded.
void main() { vUv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImage, uMask, uHeight;
uniform vec2 uImgScale, uImgOffset, uTexel;
uniform float uRefract, uAberr, uShine, uHasImage;
uniform vec3 uBg;
in vec2 vUv;
out vec4 o;

vec3 img(vec2 uv) {
  return texture(uImage, clamp(uv, 0.0, 1.0) * uImgScale + uImgOffset).rgb;
}

void main() {
  float m = texture(uMask, vUv).a;
  float h = texture(uHeight, vUv).r;
  // Slope of the glass, in height per screen width.
  vec2 g = vec2(
    texture(uHeight, vUv + vec2(uTexel.x, 0.0)).r - texture(uHeight, vUv - vec2(uTexel.x, 0.0)).r,
    texture(uHeight, vUv + vec2(0.0, uTexel.y)).r - texture(uHeight, vUv - vec2(0.0, uTexel.y)).r
  ) / (2.0 * uTexel);
  // 1 at the rim, 0 once the glass is flat.
  float rim = 1.0 - smoothstep(0.55, 0.98, h);
  vec2 off = -g * uRefract * 0.00035 * rim;

  vec3 c = vec3(
    img(vUv + off * (1.0 + uAberr)).r,
    img(vUv + off).g,
    img(vUv + off * (1.0 - uAberr)).b
  );

  // A light from the top left, caught on the rims that face it.
  vec2 out2 = length(g) > 0.001 ? -normalize(g) : vec2(0.0);
  float facing = dot(out2, normalize(vec2(-0.6, -0.8)));
  // A thin bright line just inside the outline, strongest where it faces the
  // light, with a fainter counter-light on the far side; a broad soft sheen
  // across the curved part.
  float line = smoothstep(0.42, 0.52, h) * (1.0 - smoothstep(0.52, 0.7, h));
  float light = line * (0.25 + 0.75 * pow(max(facing, 0.0), 2.0) + 0.35 * pow(max(-facing, 0.0), 2.0));
  float sheen = rim * pow(max(facing, 0.0), 3.0) * 0.35;
  c += uShine * (light + sheen);
  c *= 1.0 - 0.12 * rim * max(-facing, 0.0);

  c = mix(uBg, c, uHasImage);
  o = vec4(mix(uBg, c, m), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/** Three passes of a box blur approximate a Gaussian. In place, on a Float32Array. */
function blur(data, w, h, r) {
  if (r < 1) return data;
  const tmp = new Float32Array(data.length);
  const pass = (src, dst, len, count, stride, step) => {
    for (let k = 0; k < count; k++) {
      const base = k * stride;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += src[base + Math.min(len - 1, Math.max(0, i)) * step];
      for (let i = 0; i < len; i++) {
        dst[base + i * step] = sum / (2 * r + 1);
        sum += src[base + Math.min(len - 1, i + r + 1) * step] - src[base + Math.max(0, i - r) * step];
      }
    }
  };
  for (let n = 0; n < 3; n++) {
    pass(data, tmp, w, h, w, 1); // rows
    pass(tmp, data, h, w, 1, w); // columns
  }
  return data;
}

export function createGlass(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(prog, name);
  const texture = (unit, name) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.uniform1i(u(name), unit);
    return t;
  };
  const imageTex = texture(0, 'uImage');
  const maskTex = texture(1, 'uMask');
  const heightTex = texture(2, 'uHeight');
  // Nothing is flipped on upload (WebGL ignores that for ImageBitmaps anyway);
  // the shader reads everything from the top left.

  let imageAspect = 1;
  let hasImage = 0;
  const state = { refract: 1, aberr: 0.06, shine: 0.6, bg: [0, 0, 0] };

  function render() {
    const W = canvas.width, H = canvas.height;
    gl.viewport(0, 0, W, H);
    // object-fit: cover
    const va = W / H;
    const sx = imageAspect > va ? va / imageAspect : 1;
    const sy = imageAspect > va ? 1 : imageAspect / va;
    gl.uniform2f(u('uImgScale'), sx, sy);
    gl.uniform2f(u('uImgOffset'), (1 - sx) / 2, (1 - sy) / 2);
    gl.uniform1f(u('uRefract'), state.refract);
    gl.uniform1f(u('uAberr'), state.aberr);
    gl.uniform1f(u('uShine'), state.shine);
    gl.uniform1f(u('uHasImage'), hasImage);
    gl.uniform3f(u('uBg'), ...state.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    /** A decoded frame (ImageBitmap or image). */
    setImage(source) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      imageAspect = source.width / source.height;
      hasImage = 1;
      render();
    },

    /** The mark, as an SVG string whose opaque parts are glass. rim is in CSS px. */
    async setMask(svg, cssW, cssH, rim) {
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

      // The height field: the same shape, small and blurred.
      const hw = Math.max(8, Math.round(cssW / 4));
      const hh = Math.max(8, Math.round(cssH / 4));
      const small = document.createElement('canvas');
      small.width = hw;
      small.height = hh;
      const sctx = small.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(pic, 0, 0, hw, hh);
      const px = sctx.getImageData(0, 0, hw, hh).data;
      const field = new Float32Array(hw * hh);
      for (let i = 0; i < hw * hh; i++) field[i] = px[i * 4 + 3] / 255;
      blur(field, hw, hh, Math.max(1, Math.round(rim / 4 / 1.7)));
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, heightTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, hw, hh, 0, gl.RED, gl.FLOAT, field);
      gl.uniform2f(u('uTexel'), 1 / hw, 1 / hh);
      render();
    },

    set(opts) { Object.assign(state, opts); render(); },
    render,
  };
}
