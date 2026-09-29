// The sequence's sound: small synthesised sounds (Web Audio, no files), each
// driven by its move's own curve, so it sounds the way it moves. How loud
// follows how fast the move is going; the pitch or the filter follows where
// it is; the moments a move makes contact (a slot's end snapping through the
// edge, the bands first landing, a crop locking) get their own hit, exactly
// then; and each sits where it happens, left to right.
//
// One key for all of it, D minor pentatonic, so the notes agree: the slots
// break out high (A5 and D6, F5 and A5, one on each S), the counter lands on
// the A, the crops lock a step lower each time the mark gets smaller (A4, G4,
// F4, then D4 for the square), and the logo writes itself back as a rising
// arpeggio from that D4, a note for each slot column as it opens, left to
// right, over a D minor chord with an added ninth. A small room (a synthesised
// reverb, kept out of the low end), a gentle compressor, drive into a limiter.
// The compressors look ahead 6 ms each, so every sound is sent that much
// early; the noise is seeded, so every render sounds the same.
//
// Off until asked for: a browser plays sound only after a click. Given a
// context (an OfflineAudioContext), it writes the sound of a whole loop
// instead, each move at its own time, for the video (../video.js).

const N = 128; // points on each curve
const LAG = 0.012; // the two compressors' look-ahead, 6 ms each: sounds are sent this much early
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const NOTE = { D2: 38, D3: 50, F3: 53, G3: 55, A3: 57, C4: 60, D4: 62, F4: 65, G4: 67, A4: 69, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, D6: 86 };
const ARPEGGIO = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'D6']; // the reveal: one for each slot column, left to right
let seed = 0x5a5a;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const LOCK = { 2: 'A4', 3: 'G4', 4: 'F4', 5: 'D4' }; // the note a crop locks on, by the state it lands in

/** A move's position (0 to 1) and speed (0 to 1) along its easing, as N points. */
function curves(ease) {
  const pos = new Float32Array(N);
  const speed = new Float32Array(N);
  let top = 1e-6;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    pos[i] = ease(u);
    const d = Math.abs(ease(Math.min(1, u + 0.004)) - ease(Math.max(0, u - 0.004)));
    speed[i] = d;
    top = Math.max(top, d);
  }
  for (let i = 0; i < N; i++) speed[i] /= top;
  return { pos, speed };
}
const map = (arr, fn) => Float32Array.from(arr, fn);
/** The first u (0 to 1) where the easing reaches v, or 1. */
function when(ease, v) {
  for (let i = 0; i <= 400; i++) if (ease(i / 400) >= v) return i / 400;
  return 1;
}

export function createSound({ context = null } = {}) {
  let ctx = null;
  let bus = null; // the dry mix
  let room = null; // the reverb send
  let noise = null;

  function start() {
    if (ctx) return context ? Promise.resolve() : ctx.resume();
    seed = 0x5a5a;
    ctx = context ?? new AudioContext();
    // Master: the mix and the room, a gentle compressor, a limiter.
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18; glue.knee.value = 10; glue.ratio.value = 2.5; glue.attack.value = 0.006; glue.release.value = 0.18;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.06;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    bus = ctx.createGain();
    room = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = impulse(1.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    const vhp = ctx.createBiquadFilter(); // the room gets no low end: it would only muddy the holds
    vhp.type = 'highpass';
    vhp.frequency.value = 220;
    const drive = ctx.createGain(); // up into the limiter, which holds the peaks
    drive.gain.value = 1.85;
    bus.connect(glue);
    room.connect(vhp).connect(verb).connect(wet).connect(glue);
    glue.connect(drive).connect(limit).connect(master).connect(ctx.destination);
    // Two seconds of white noise, for the air and the clicks.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    return context ? Promise.resolve() : ctx.resume();
  }

  /** A small bright room: stereo noise, fading fast, darker as it fades. */
  function impulse(seconds) {
    const rate = ctx.sampleRate;
    const n = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, n, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        const k = Math.min(0.9, 0.25 + t * 0.9); // the longer it rings, the darker
        lp = lp * k + (rnd() * 2 - 1) * (1 - k);
        d[i] = lp * Math.exp(-t * 4.2) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    return buf;
  }

  /** Where a sound goes: panned (-1 left to 1 right, or from one to the other over d), with a share to the room. */
  function out(t0, d, pan, send) {
    const input = ctx.createGain();
    const p = ctx.createStereoPanner();
    const [a, b] = Array.isArray(pan) ? pan : [pan, pan];
    p.pan.setValueAtTime(a * 0.8, t0);
    if (b !== a) p.pan.linearRampToValueAtTime(b * 0.8, t0 + d);
    input.connect(p).connect(bus);
    const s = ctx.createGain();
    s.gain.value = send;
    p.connect(s).connect(room);
    return input;
  }
  const noiseSource = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; return s; };

  /** A click: a hair of bright noise (kept under 9 kHz, not brittle) and, with a note, a pitched blip; gone in 40 ms. */
  function click(t, { note = null, level = 0.4, pan = 0, send = 0.18, bright = 3200 }) {
    const o = out(t, 0, pan, send);
    const src = noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = bright;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * 0.6, t + 0.0015); // the noise under the note: present, not the loudest thing in the mix
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp).connect(lp).connect(g).connect(o);
    src.start(t, rnd());
    src.stop(t + 0.05);
    if (!note) return;
    const osc = ctx.createOscillator();
    const f0 = hz(NOTE[note]);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.985, t + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(level * 0.42, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(og).connect(o);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** A thump: a low sine falling in pitch, and a soft knock, the weight of something landing. */
  function thump(t, { level = 0.5, pan = 0, from = 92, to = 44, len = 0.26, body = 0 }) {
    const o = out(t, 0, pan, 0.06);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + len * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(o);
    if (body) {
      // Its body: the same sine driven into soft saturation, only the harmonics kept (420 Hz to 2.4 kHz), so a phone or a laptop hears the weight too.
      const pre = ctx.createGain();
      pre.gain.value = 4;
      const ws = ctx.createWaveShaper();
      ws.curve = Float32Array.from({ length: 2048 }, (_, i) => Math.tanh(3 * (i / 1023.5 - 1)));
      ws.oversample = '4x';
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 420; hp.Q.value = 0.7;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2400;
      const bg = ctx.createGain();
      bg.gain.value = body;
      osc.connect(pre).connect(ws).connect(hp).connect(lp).connect(bg).connect(g);
    }
    osc.start(t);
    osc.stop(t + len + 0.02);
    const src = noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(level * 0.35, t + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(lp).connect(ng).connect(o);
    src.start(t, rnd());
    src.stop(t + 0.06);
  }

  /** Noise through a band that follows the move, loud as it moves, travelling left to right with it; `tame`, a low-pass over it (a breath, not a hiss). */
  function whoosh(t0, d, c, { lo, hi, q = 1, level, pan = 0, send = 0.1, type = 'bandpass', tame = null }) {
    const o = out(t0, d, pan, send);
    const src = noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueCurveAtTime(map(c.pos, (p) => lo * (hi / lo) ** Math.max(-0.2, Math.min(1.2, p))), t0, d);
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueCurveAtTime(map(c.speed, (v, i) => level * v ** 1.4 * (i === N - 1 ? 0 : 1)), t0, d);
    let chain = src.connect(filter);
    if (tame) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = tame; lp.Q.value = 0.5; chain = chain.connect(lp); }
    chain.connect(g).connect(o);
    src.start(t0, rnd());
    src.stop(t0 + d + 0.05);
  }

  /** A tone whose pitch is where the move is (overshoot and all), loud as it moves, with a short ring after. */
  function sing(t0, d, c, { lo, hi, level, type = 'sine', pan = 0, send = 0.22, floor = 0.1, ring = 0.12 }) {
    const o = out(t0, d, pan, send);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueCurveAtTime(map(c.pos, (p) => lo * (hi / lo) ** p), t0, d);
    const g = ctx.createGain();
    g.gain.value = 0;
    const env = map(c.speed, (v, i) => level * Math.min(1, floor + v) * Math.min(1, (i / (N - 1)) * 30));
    g.gain.setValueCurveAtTime(env, t0, d);
    g.gain.setValueAtTime(env[N - 1], t0 + d + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + ring);
    osc.connect(g).connect(o);
    osc.start(t0);
    osc.stop(t0 + d + ring + 0.02);
  }

  /** A pluck: a note struck and let ring, a sine and a softer triangle, falling away. */
  function pluck(t, { note, level = 0.12, pan = 0, send = 0.35, ring = 0.55 }) {
    const o = out(t, 0, pan, send);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4800, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + ring);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    lp.connect(g).connect(o);
    const f0 = hz(NOTE[note]);
    for (const [type, mul, v] of [['sine', 1, 0.7], ['triangle', 1, 0.3], ['sine', 2, 0.12]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f0 * mul * 1.004, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * mul, t + 0.05);
      const vg = ctx.createGain();
      vg.gain.value = v;
      osc.connect(vg).connect(lp);
      osc.start(t);
      osc.stop(t + ring + 0.05);
    }
  }

  /**
   * A held note: two voices a few cents apart and a quiet octave, through a
   * soft low-pass; in over 20 ms, settling back a little, swelling again to
   * the end, and out in 60 ms. The breath under a hold.
   */
  function hold(t, dur, { note, level = 0.025, pan = 0, send = 0.4 }) {
    const o = out(t, dur, pan, send);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.02);
    g.gain.setTargetAtTime(level * 0.55, t + 0.02, 0.25);
    g.gain.setValueAtTime(level * 0.55, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(level * 0.7, t + dur - 0.06);
    g.gain.linearRampToValueAtTime(0, t + dur);
    lp.connect(g).connect(o);
    const f0 = hz(NOTE[note]);
    for (const [cents, mul, v] of [[-6, 1, 0.88], [6, 1, 0.12], [0, 2, 0.12]]) { // unequal, so it shimmers rather than throbs
      const osc = ctx.createOscillator();
      osc.frequency.value = f0 * mul;
      osc.detune.value = cents;
      const vg = ctx.createGain();
      vg.gain.value = v;
      osc.connect(vg).connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  }

  /** A chord that opens as the move opens: each note a pair of slightly detuned voices, through a filter opening with it, left to ring. */
  function bloom(t0, d, c, { notes, level, send = 0.45, ring = 1.8 }) {
    const o = out(t0, d, 0, send);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.5;
    lp.frequency.setValueCurveAtTime(map(c.pos, (p) => 260 * (5200 / 260) ** Math.max(0, Math.min(1.1, p))), t0, d);
    const g = ctx.createGain();
    g.gain.value = 0;
    const env = map(c.pos, (p, i) => level * Math.max(0, Math.min(1.08, p)) * Math.min(1, (i / (N - 1)) * 12));
    g.gain.setValueCurveAtTime(env, t0, d);
    g.gain.setValueAtTime(env[N - 1], t0 + d + 0.001);
    g.gain.setTargetAtTime(0, t0 + d + 0.002, 0.45); // rings on over the logo's hold
    lp.frequency.setTargetAtTime(700, t0 + d + 0.01, 0.5); // and darkens as it fades, like the room
    lp.connect(g).connect(o);
    notes.forEach((n, i) => {
      for (const [det, type] of [[-4, 'sine'], [4, 'triangle']]) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = hz(NOTE[n]);
        osc.detune.value = det + (i % 2 ? 1.5 : -1.5);
        const v = ctx.createGain();
        v.gain.value = (type === 'sine' ? 0.6 : 0.25) / notes.length;
        osc.connect(v).connect(lp);
        osc.start(t0);
        osc.stop(t0 + d + ring + 0.05);
      }
    });
  }

  /**
   * The sound of one move (a cue from sequence.js: its kind of move, what
   * moves, how long, its easing, where it is left to right, the state it goes
   * to), now or at a given time (seconds, on the context's clock).
   */
  function play(cue, at = null) {
    if (!ctx || (!context && ctx.state !== 'running')) return;
    const t0 = (at ?? ctx.currentTime + 0.02) - LAG;
    const { kind, key, d, ease, pan, to } = cue;
    const hit = t0 + (cue.hit ?? d); // the moment of contact, as sequence.js placed it on the grid
    const c = curves(ease);
    switch (kind) {
      case 'snap': { // a slot's end through the edge: a click on each S, left and right, the top ones higher; two notes, never one
        const [n1, n2] = key === 'openTop' ? ['A5', 'D6'] : ['F5', 'A5'];
        click(hit, { note: n1, level: 0.36, pan: pan[0] });
        click(hit + 0.011, { note: n2, level: 0.28, pan: pan[1] });
        whoosh(t0, d, c, { lo: 2400, hi: 6800, q: 1.2, level: 0.05, pan: 0 });
        break;
      }
      case 'land': // the counter: a small tone rising to the A, past it and back, and a light tick as it lands
        sing(t0, d, c, { lo: hz(NOTE.D5), hi: hz(NOTE.A5), level: 0.08, pan: pan[0], floor: 0.2, ring: 0.14 });
        click(hit, { note: 'A5', level: 0.14, pan: pan[0], bright: 5000 });
        break;
      case 'spring': // the bands: a round boing in three octaves (the upper ones carry it on small speakers), a thump and a knock where they first land
        sing(t0, d, c, { lo: hz(NOTE.D2), hi: hz(NOTE.D3), level: 0.07, floor: 0.06, send: 0.06, ring: 0.12 });
        sing(t0, d, c, { lo: hz(NOTE.D3), hi: hz(NOTE.D4), level: 0.12, type: 'triangle', floor: 0.06, send: 0.12, ring: 0.1 });
        sing(t0, d, c, { lo: hz(NOTE.D4), hi: hz(NOTE.D5), level: 0.08, floor: 0.06, send: 0.12, ring: 0.1 });
        thump(hit, { level: 0.2, from: 110, to: 52, body: 1 });
        click(hit, { level: 0.24, pan: 0, bright: 700, send: 0.1 });
        break;
      case 'sweep': { // a crop: air through a band that travels with the edge (falling when the edge falls), and a lock where it stops
        // The air stops at the lock: after it the edge only runs on through a slot, unseen.
        const u = Math.min(1, ((cue.hit ?? d) + 0.01) / d);
        const cc = curves((v) => ease(v * u) / ease(u));
        whoosh(t0, d * u, cc, key === 'top' ? { lo: 3600, hi: 520, q: 1.6, level: 0.2, pan } : { lo: 520, hi: 3600 + (to - 2) * 300, q: 1.6, level: 0.2, pan });
        click(hit, { note: LOCK[to] ?? 'D4', level: 0.3, pan: pan[1], bright: 2400 });
        thump(hit, { level: to === 5 ? 0.34 : 0.16, pan: pan[1], from: 170, to: 75, len: to === 5 ? 0.24 : 0.16, body: to === 5 ? 1 : 0 }); // the square lands heaviest
        if (to === 5) click(hit, { level: 0.22, pan: 0, bright: 700, send: 0.1 }); // the square's weight, on small speakers too
        if (to === 4) hold(hit + 0.03, Math.max(0.3, (cue.until ?? 2) - (cue.hit ?? 0) - 0.09), { note: 'F4', level: 0.028, pan: pan[1] }); // the !: a held breath until the next move
        break;
      }
      case 'follow': // the camera: a soft breath of air, drifting the way it pans: felt more than heard
        whoosh(t0, d, c, { lo: 300, hi: 900, q: 1.2, level: 0.2, pan, send: 0.2, tame: 1800 });
        break;
      case 'reveal': { // the logo appearing through the block: each slot column plucks its note as it opens, over the chord
        const cols = cue.columns ?? [];
        cols.forEach((col, i) => pluck(t0 + col.at, { note: ARPEGGIO[i], level: i === cols.length - 1 ? 0.13 : 0.11, pan: col.pan, ring: i === cols.length - 1 ? 1.1 : 0.55 }));
        bloom(t0, d, c, { notes: ['D3', 'A3', 'D4', 'F4', 'A4', 'E5'], level: 0.16, ring: 2.4 });
        if (cols.length) thump(t0 + cols[0].at, { level: 0.24, from: 96, to: 49, len: 0.4 });
        break;
      }
    }
  }

  return {
    start,
    stop() { if (!context) ctx?.suspend(); },
    play,
    /** The sound's clock, and how long its output takes to be heard. */
    now: () => ctx?.currentTime ?? 0,
    latency: () => (ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0),
  };
}
