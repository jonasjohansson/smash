// The sequence's own page: the mark alone, full screen (engine.js is the
// sequence, player.js keeps it in time and makes its MP4).
//
// Click or space pauses; the arrows step from one to the next; i inverts; s
// (or the speaker) turns the sound on (sound.js); p switches to the punchy
// version and back (?punchy; ?calm is the slow one). The download button
// makes an MP4 (../video.js): 1600 × 1200 for Dribbble; shift for 1920 × 1080,
// alt for 1080 × 1080 (or ?size=WxH). ?t=0.5 seeks (a share of the loop) and
// pauses; ?at=2 holds one of the states; ?paper starts black on white.

import { PUNCHY, STATES, PERIOD, SEGMENTS, EASE, TEMPO, UNIT, HOLDS, stateAt, draw, svgAt, cueOf, loopSound } from './engine.js';
import { mountSequence } from './player.js';

const query = new URLSearchParams(location.search);
const root = document.querySelector('.seq');
const play = root.querySelector('.play');
const speaker = root.querySelector('.sound');
const dl = root.querySelector('.download');
const ring = dl.querySelector('.i-ring');

const at = query.has('at') ? Math.max(0, Math.min(STATES.length - 1, Number(query.get('at')) || 0)) : null;
const player = mountSequence(root, {
  t: query.has('t') ? (Number(query.get('t')) || 0) * PERIOD : at !== null ? (SEGMENTS.find((s) => s.hold === at) ?? SEGMENTS.find((s) => s.from === at)).t0 : 0,
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

addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')) return;
  if (e.key === ' ' && e.target.closest?.('button')) return; // a focused button takes its own space
  if (e.metaKey || e.ctrlKey || e.altKey) return; // the browser's own shortcuts
  if (e.key === ' ') { e.preventDefault(); player.setPaused(!player.paused); }
  else if (e.key === 'ArrowRight') player.step(1);
  else if (e.key === 'ArrowLeft') player.step(-1);
  else if (e.key === 'i') player.invert();
  else if (e.key === 's') player.toggleSound();
  else if (e.key === 'p') { const u = new URL(location.href); if (PUNCHY) u.searchParams.delete('punchy'); else u.searchParams.set('punchy', ''); location.href = u.href; }
});
document.documentElement.dataset.ready = '1';

// For scripts: the measures, the drawing, the cues and the sound at any state or time.
window.__sequence = { STATES, PERIOD, SEGMENTS, EASE, TEMPO, UNIT, HOLDS, stateAt, draw, svgAt, cueOf, loopSound, seek: player.seek };
