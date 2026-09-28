// Distance fields as textures a shader can cut with (sculpture/field-core.js
// makes the bytes). Built in a worker when the browser can (a module worker
// with OffscreenCanvas), on the page otherwise.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

import { fieldBytes } from './field-core.js';

function texture(bytes, w, h) {
  const t = new THREE.DataTexture(bytes, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

function textures(f) {
  return {
    texture: texture(f.near, f.w, f.h), // sharp, for the cut
    far: texture(f.far, f.fw, f.fh), // long range, for the occlusion
    farBand: f.farBand,
    w: f.w,
    h: f.h,
    xf: new THREE.Vector4(...f.xf),
    dispose() { this.texture.dispose(); this.far.dispose(); },
  };
}

let worker = null;
let broken = typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined';
let seq = 0;
const pending = new Map();

function giveUp(e) {
  broken = true;
  for (const p of pending.values()) p.reject(e);
  pending.clear();
  worker?.terminate();
  worker = null;
}

function getWorker() {
  if (broken) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./field-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => {
        const p = pending.get(data.id);
        if (!p) return;
        pending.delete(data.id);
        if (data.error) p.reject(new Error(data.error));
        else p.resolve(data.field);
      };
      worker.onerror = (e) => giveUp(e);
    } catch (e) {
      giveUp(e);
    }
  }
  return worker;
}

function onPage(contours, bounds, opts) {
  return fieldBytes(contours, bounds, opts, (w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas.getContext('2d', { willReadFrequently: true });
  });
}

/**
 * The fields of closed contours ([[x, y], ...], y up) over bounds { x0, x1, y0, y1 }.
 * Resolves to { texture, far, farBand, xf, dispose() }: xf maps a point to uv for both textures.
 */
export async function distanceField(contours, bounds, opts = {}) {
  const w = getWorker();
  if (w) {
    try {
      const f = await new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        w.postMessage({ id, contours, bounds, opts });
      });
      return textures(f);
    } catch (e) {
      if (!broken) giveUp(e);
      console.warn('[identity] sculpture: building the distance field on the page', e?.message ?? e);
    }
  }
  return textures(onPage(contours, bounds, opts));
}
