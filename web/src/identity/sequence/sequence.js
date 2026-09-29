// The sequence's own page: the mark alone, full screen (engine.js is the
// sequence, or pulse.js on the pulse; player.js keeps it in time and makes
// its MP4).
//
// Click or space pauses; the arrows step from one to the next; i inverts; s
// (or the speaker) turns the sound on (sound.js); p switches to the punchy
// version and back (?punchy; ?calm is the slow one); b to the one on the
// pulse (?pulse: a hit on every beat). The download button makes an MP4
// (../video.js): 1600 × 1200 for Dribbble; shift for 1920 × 1080, alt for
// 1080 × 1080 (or ?size=WxH). ?t=0.5 seeks (a share of the loop) and pauses;
// ?at=2 holds one of the states (on the pulse, one of the beats); ?paper
// starts black on white.

import { mountSequence } from './player.js';

const query = new URLSearchParams(location.search);
const E = await import(query.has('pulse') ? './pulse.js' : './engine.js');
const root = document.querySelector('.seq');
const play = root.querySelector('.play');
const speaker = root.querySelector('.sound');
const dl = root.querySelector('.download');
const ring = dl.querySelector('.i-ring');

const at = query.has('at') ? Math.max(0, Math.min(E.STATES.length - 1, Number(query.get('at')) || 0)) : null;
const player = mountSequence(root, {
  engine: E,
  t: query.has('t') ? (Number(query.get('t')) || 0) * E.PERIOD : at !== null ? (E.SEGMENTS.find((s) => s.hold === at) ?? E.SEGMENTS.find((s) => s.from === at)).t0 : 0,
  paused: query.has('t') || at !== null || matchMedia('(prefers-reduced-motion: reduce)').matches,
  paper: query.has('paper'),
  // The icons: play or pause, the speaker's waves, the download's ring filling as the MP4 is made.
  onState({ paused, sound, busy, progress }) {
    play.toggleAttribute('data-paused', paused);
    speaker.toggleAttribute('data-on', sound);
    dl.toggleAttribute('data-busy', busy);
    ring.setAttribute('stroke-dasharray', `${Math.round(progress * 100)} 100`);
  },
});

/** Switch to a version (?punchy, ?calm, ?pulse), or back to the default from it. */
function swap(name) {
  const u = new URL(location.href);
  const on = u.searchParams.has(name);
  for (const v of ['punchy', 'calm', 'pulse']) u.searchParams.delete(v);
  if (!on) u.searchParams.set(name, '');
  location.href = u.href;
}

addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')) return;
  if (e.key === ' ' && e.target.closest?.('button')) return; // a focused button takes its own space
  if (e.metaKey || e.ctrlKey || e.altKey) return; // the browser's own shortcuts
  if (e.key === ' ') { e.preventDefault(); player.setPaused(!player.paused); }
  else if (e.key === 'ArrowRight') player.step(1);
  else if (e.key === 'ArrowLeft') player.step(-1);
  else if (e.key === 'i') player.invert();
  else if (e.key === 's') player.toggleSound();
  else if (e.key === 'p') swap('punchy');
  else if (e.key === 'b') swap('pulse');
});
document.documentElement.dataset.ready = '1';

// For scripts: the measures, the drawing, the cues and the sound at any state or time.
window.__sequence = { ...E, seek: player.seek };
