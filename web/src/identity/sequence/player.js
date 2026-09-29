// The sequence's player: the drawing kept in time on a screen, its sound, and
// its MP4, in any element. The sequence's own page (sequence.js) and its
// section on /identity (section.js) each mount one, with their own controls.

import * as classic from './engine.js';
import { createSound } from './sound.js';

/**
 * Mount a player on root: it draws into root's .seq-mark (an <svg>) and binds
 * whichever of its controls root has, by class: .play, .scrub, .sound,
 * .download, .invert. Invert toggles data-paper on root (the colours are the
 * page's CSS). What the controls should show goes out through
 * onState({ paused, sound, paper, busy, progress }).
 * Options: engine (the sequence: engine.js by default, or pulse.js), t
 * (seconds into the loop to start at), paused, paper.
 * Returns { get t, get paused, seek(t), setPaused(p), step(dir), setSound(on),
 * invert(), download(e), pause(), resume(), destroy() }. pause() and resume()
 * are for going off and on screen, apart from the viewer's own pause.
 */
export function mountSequence(root, { engine = classic, t = 0, paused = false, paper = false, onState = () => {} } = {}) {
  const { PERIOD, SEGMENTS, START, VERSION, wrap, frameAt, svgAt, viewBox, cueOf, loopSound } = engine;
  const el = root.querySelector('.seq-mark');
  const $ = (sel) => root.querySelector(sel);
  const play = $('.play'), scrub = $('.scrub'), speaker = $('.sound'), dl = $('.download'), inv = $('.invert');
  let last = null;
  let raf = 0;
  let away = false; // off screen: nothing drawn, nothing heard
  let dead = false;
  let busy = false;
  let progress = 0;
  root.toggleAttribute('data-paper', paper);

  const tell = () => onState({ paused, sound: soundOn, paper: root.hasAttribute('data-paper'), busy, progress });

  function render() {
    const aspect = el.clientWidth / Math.max(1, el.clientHeight) || 16 / 9;
    const { view, svg } = frameAt(t, aspect);
    el.setAttribute('viewBox', viewBox(view));
    el.innerHTML = svg;
    if (scrub) scrub.value = String(Math.round((wrap(t) / PERIOD) * 1000));
  }

  // The sound: each move's sound scheduled a little ahead, to start exactly when
  // its move starts on the screen (the output's own delay taken off); only while
  // it plays on its own, not when scrubbed.
  const sound = createSound();
  let soundOn = false;
  const scheduled = new Set(); // the moves already scheduled, by when they start (ms, on the page's clock)
  function listen() {
    if (paused || away || !soundOn) return;
    const now = wrap(t);
    for (const seg of SEGMENTS) {
      if (!seg.key) continue;
      let dt = seg.t0 - now;
      if (dt < -PERIOD / 2) dt += PERIOD;
      if (dt < -0.02 || dt > 0.15 + sound.latency()) continue;
      const id = Math.round((t + dt) * 1000);
      if (scheduled.has(id)) continue;
      scheduled.add(id);
      sound.play(cueOf(seg), sound.now() + Math.max(0, dt + 1 / 60 - sound.latency()));
    }
    if (scheduled.size > 64) [...scheduled].slice(0, 32).forEach((x) => scheduled.delete(x));
  }
  function setSound(on) {
    soundOn = on;
    if (on) sound.start(); else sound.stop();
    tell();
  }

  function frame(now) {
    raf = 0;
    if (dead || away) return;
    if (last !== null && !paused) t += (now - last) / 1000;
    last = now;
    listen();
    render();
    raf = requestAnimationFrame(frame);
  }
  const run = () => { if (!raf && !dead && !away) { last = null; raf = requestAnimationFrame(frame); } };

  function setPaused(p) {
    paused = p;
    tell();
  }

  /** The start of the next (or previous) hold. */
  function step(dir) {
    const now = wrap(t);
    const holds = SEGMENTS.filter((s) => s.hold !== undefined).map((s) => s.t0);
    t = dir > 0 ? holds.find((h) => h > now + 0.01) ?? holds[0] + PERIOD : holds.findLast((h) => h < now - 0.01) ?? holds.at(-1) - PERIOD;
    render();
  }

  function invert() {
    root.toggleAttribute('data-paper');
    tell();
  }

  // The download: this version, in these colours, made into an MP4 here and now
  // (../video.js), 1600 × 1200 by default (Dribbble's 4:3); shift for 1920 ×
  // 1080, alt for 1080 × 1080; or ?size=WxH. The file opens where the
  // sequence says (its START, on a whole frame, so every hit lands on one).
  async function download(e) {
    if (busy) return;
    busy = true; progress = 0; tell();
    const paperOn = root.hasAttribute('data-paper');
    const [ink, paper] = paperOn ? ['#000', '#fff'] : ['#fff', '#000'];
    try {
      const { renderVideo, svgPainter, sizeOf, save } = await import('../video.js');
      const [width, height] = sizeOf(e);
      const blob = await renderVideo({
        period: PERIOD, start: START, width, height, sound: loopSound,
        paint: svgPainter((s) => svgAt(s, width / height), { ink, paper }),
        onProgress: (p) => { progress = p; tell(); },
      });
      save(blob, `smash-sequence${VERSION === 'snappy' ? '' : `-${VERSION}`}${paperOn ? '-paper' : ''}-${width}x${height}.mp4`);
    } catch (err) {
      console.error('[sequence] the video could not be made', err);
    } finally {
      busy = false; progress = 0; tell();
    }
  }

  const bound = new AbortController(); // the controls' listeners, all let go on destroy, so another player can take them
  const on = (node, type, fn) => node?.addEventListener(type, fn, { signal: bound.signal });
  on(play, 'click', () => setPaused(!paused));
  on(el, 'click', () => setPaused(!paused));
  on(scrub, 'input', () => { t = (Number(scrub.value) / 1000) * PERIOD; setPaused(true); render(); });
  on(speaker, 'click', () => setSound(!soundOn));
  on(inv, 'click', invert);
  on(dl, 'click', download);

  const ro = new ResizeObserver(() => render());
  ro.observe(el);
  render();
  tell();
  run();

  return {
    get t() { return t; },
    get paused() { return paused; },
    seek(s) { t = s; setPaused(true); render(); },
    setPaused, step, setSound, invert, download,
    toggleSound: () => setSound(!soundOn),
    pause() { away = true; cancelAnimationFrame(raf); raf = 0; },
    resume() { away = false; run(); },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); bound.abort(); if (soundOn) sound.stop(); },
  };
}
