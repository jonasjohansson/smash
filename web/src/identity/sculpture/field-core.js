// Signed distance fields of closed outlines, as bytes. Pure (no three.js, no
// DOM of its own), so it runs in a worker as well as on the page.
//
// The outline is filled on a 2D canvas (even-odd) and measured with an exact
// Euclidean distance transform (Felzenszwalb and Huttenlocher, as in
// mapbox/tiny-sdf). Two fields come out of one transform:
// - near: full resolution, one byte per texel, 128 on the edge, a few texels
//   of range either side. Texels the edge crosses take their distance from the
//   canvas's own anti-aliased coverage, so the edge sits to a fraction of a
//   texel; sampled with linear filtering it is a smooth curve at any zoom.
// - far: an eighth of the resolution but a long range (farBand units either
//   side), for asking how far a slot or a fold reaches (the occlusion).

const INF = 1e20;

/** One row or column of the squared distance transform, in place (stride steps through the grid). */
function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

/** Squared distance to the nearest zero texel, for every texel (grid: 0 on features, INF elsewhere). */
function edt(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const v = new Uint32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

/**
 * The fields of closed contours ([[x, y], ...], y up, even-odd) over bounds
 * { x0, x1, y0, y1 }. makeContext(w, h) returns a 2D canvas context to fill.
 * Returns { w, h, near, fw, fh, far, farBand, xf } where xf maps a point to
 * uv (uv = p * xf[0..1] + xf[2..3]) for both fields, and texture row 0 is y0.
 */
export function fieldBytes(contours, bounds, { ppu = 2000, band = 24, farBand = 0.3, farStep = 8 } = {}, makeContext) {
  const bw = bounds.x1 - bounds.x0;
  const bh = bounds.y1 - bounds.y0;
  const w = Math.ceil((bw * ppu) / 4) * 4;
  const h = Math.ceil(bh * ppu);
  const sx = w / bw;
  const sy = h / bh;
  const ctx = makeContext(w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (const c of contours) {
    for (let i = 0; i < c.length; i++) {
      const px = (c[i][0] - bounds.x0) * sx;
      const py = (bounds.y1 - c[i][1]) * sy;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  ctx.fill('evenodd');
  const rgba = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const toIn = new Float32Array(n); // squared distance to the nearest inside texel
  const toOut = new Float32Array(n); // ... and to the nearest outside texel
  for (let i = 0; i < n; i++) {
    const inside = rgba[i * 4] >= 128;
    toIn[i] = inside ? 0 : INF;
    toOut[i] = inside ? INF : 0;
  }
  edt(toIn, w, h);
  edt(toOut, w, h);

  // Signed distance in texels at canvas texel i (positive inside).
  const signed = (i) => {
    const cov = rgba[i * 4] / 255;
    if (cov > 0.02 && cov < 0.98) return cov - 0.5; // the edge crosses this texel: its coverage says where
    return cov >= 0.5 ? Math.sqrt(toOut[i]) - 0.5 : 0.5 - Math.sqrt(toIn[i]);
  };
  const byte = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

  const near = new Uint8Array(n);
  const k = 127 / band;
  for (let r = 0; r < h; r++) {
    const src = (h - 1 - r) * w; // texture row 0 is the bottom (y0); canvas row 0 is the top
    const dst = r * w;
    for (let c = 0; c < w; c++) near[dst + c] = byte(128 + signed(src + c) * k);
  }

  const fw = Math.ceil(w / farStep);
  const fh = Math.ceil(h / farStep);
  const far = new Uint8Array(fw * fh);
  const kf = 127 / (farBand * 0.5 * (sx + sy)); // texels to bytes, over farBand units
  for (let r = 0; r < fh; r++) {
    const row = Math.min(h - 1, Math.floor(((r + 0.5) / fh) * h));
    const src = (h - 1 - row) * w;
    for (let c = 0; c < fw; c++) {
      const col = Math.min(w - 1, Math.floor(((c + 0.5) / fw) * w));
      far[r * fw + c] = byte(128 + signed(src + col) * kf);
    }
  }

  const ax = 1 / bw;
  const ay = 1 / bh;
  return { w, h, near, fw, fh, far, farBand, xf: [ax, ay, -bounds.x0 * ax, -bounds.y0 * ay] };
}
