// Distance fields off the page's thread (sculpture/field-core.js on an OffscreenCanvas),
// so building one never stalls the page.

import { fieldBytes } from './field-core.js';

self.onmessage = ({ data: { id, contours, bounds, opts } }) => {
  try {
    const f = fieldBytes(contours, bounds, opts, (w, h) => new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true }));
    self.postMessage({ id, field: f }, [f.near.buffer, f.far.buffer]);
  } catch (e) {
    self.postMessage({ id, error: String(e?.message ?? e) });
  }
};
