// The sequence's sound: a few small synthesised sounds (Web Audio, no files),
// each driven by its move's own curve, so it sounds the way it moves. How
// loud follows how fast the move is going (its speed, from the easing), and
// the pitch or the filter follows where it is (its position), so a spring
// wobbles, an overshoot lands and a sweep sweeps. Going back, the position
// runs the other way, and so does the sound.
//
// Off until asked for: a browser plays sound only after a click.

const N = 96; // points on each curve

/** A move's position (0 to 1, going the way it goes) and speed (0 to 1) along its easing, as N points. */
function curves(ease, dir) {
  const pos = new Float32Array(N);
  const speed = new Float32Array(N);
  let top = 1e-6;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const e = ease(u);
    pos[i] = dir > 0 ? e : 1 - e;
    const d = Math.abs(ease(Math.min(1, u + 0.004)) - ease(Math.max(0, u - 0.004)));
    speed[i] = d;
    top = Math.max(top, d);
  }
  for (let i = 0; i < N; i++) speed[i] /= top;
  return { pos, speed };
}
const map = (arr, fn) => Float32Array.from(arr, fn);

export function createSound() {
  let ctx = null;
  let out = null;
  let noise = null;

  function start() {
    if (ctx) return ctx.resume();
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(comp).connect(ctx.destination);
    // Two seconds of white noise, for the air in the whooshes and the clicks.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx.resume();
  }

  const noiseSource = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; return s; };
  const gainNode = () => { const g = ctx.createGain(); g.gain.value = 0; return g; };

  /** Noise through a band, loud as the move is fast, the band where the move is. */
  function whoosh(t0, d, c, { lo, hi, q, level, type = 'bandpass' }) {
    const src = noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueCurveAtTime(map(c.pos, (p) => lo * (hi / lo) ** p), t0, d);
    const g = gainNode();
    g.gain.setValueCurveAtTime(map(c.speed, (v) => level * v ** 1.3), t0, d);
    src.connect(filter).connect(g).connect(out);
    src.start(t0, Math.random());
    src.stop(t0 + d + 0.05);
  }

  /** A tone whose pitch is where the move is, loud as it moves, with a short tail. */
  function tone(t0, d, c, { lo, hi, level, type = 'sine', floor = 0.1 }) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueCurveAtTime(map(c.pos, (p) => lo * (hi / lo) ** p), t0, d);
    const g = gainNode();
    const env = map(c.speed, (v, i) => level * Math.min(1, floor + v) * (i === N - 1 ? 0 : 1) * Math.min(1, (i / (N - 1)) * 40));
    g.gain.setValueCurveAtTime(env, t0, d);
    osc.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + d + 0.05);
  }

  /** A click: a hair of noise and a high blip. */
  function click(t, { level = 0.5, pitch = 2400 } = {}) {
    const src = noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(hp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.05);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, t + 0.04);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(level * 0.35, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(og).connect(out);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * The sound of one move: `feel` (its easing's name), its easing, how long,
   * which way (dir), and what moves (key).
   */
  function play({ feel, ease, d, dir, key }) {
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + 0.01;
    const c = curves(ease, dir);
    switch (feel) {
      case 'smooth': // the stamp's frame thinning away: soft air, falling
        whoosh(t0, d, c, { lo: 2600, hi: 700, q: 0.9, level: 0.28 });
        break;
      case 'snap': // the slots breaking out: a click as they go, a lighter one going back
        click(t0 + d * 0.5, { level: dir > 0 ? 0.55 : 0.35, pitch: key === 'openTop' ? 2600 : 2100 });
        whoosh(t0 + d * 0.35, d * 0.3, curves(ease, dir), { lo: 1800, hi: 5200, q: 1.4, level: 0.12 });
        break;
      case 'land': // the counter rising: a blip that overshoots and settles
        tone(t0, d, c, { lo: 520, hi: 880, level: 0.16, floor: 0.12 });
        break;
      case 'spring': // the bands squashing: a low, round boing
        tone(t0, d, c, { lo: 98, hi: 196, level: 0.34, type: 'triangle', floor: 0.05 });
        whoosh(t0, d, c, { lo: 180, hi: 420, q: 0.7, level: 0.1, type: 'lowpass' });
        break;
      case 'sweep': // a crop: a sweep through a band, and a tick as the edge locks
        whoosh(t0, d, c, { lo: 380, hi: 3400, q: 2.2, level: 0.3 });
        click(t0 + d * 0.96, { level: 0.28, pitch: 1500 });
        break;
      case 'follow': // the camera: a breath of low air
        whoosh(t0, d, c, { lo: 160, hi: 520, q: 0.5, level: 0.09, type: 'lowpass' });
        break;
    }
  }

  return {
    start,
    stop() { ctx?.suspend(); },
    play,
  };
}
