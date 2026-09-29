// The sequence on /identity: the same player as its own page (player.js), in
// a stage like the chapters' motions, with their kind of controls: play or
// pause, the scrub, the sound, black on white, the MP4, and the page itself.

import { mountSequence } from './player.js';
import { SIZES_HINT } from '../video.js';

export const HTML = `
  <section class="lab" id="sequence">
    <header class="ch-head">
      <p class="ch-n">00 · sequence</p>
      <h2 class="ch-name">Sequence</h2>
    </header>
    <figure class="stage seq-stage">
      <div class="motion-el"><svg class="seq-mark" role="img" aria-label="SMASH, from the logo to the modular mark, the S M, the S and its corner square"></svg></div>
      <figcaption class="controls">
        <button type="button" class="play" aria-label="Play or pause">Pause</button>
        <input type="range" class="scrub" min="0" max="1000" value="0" aria-label="Scrub the sequence">
        <button type="button" class="sound" aria-label="Sound on or off">Sound</button>
        <button type="button" class="invert" aria-label="Black on white, or white on black">Invert</button>
        <button type="button" class="download" title="${SIZES_HINT}">MP4</button>
        <a class="open" href="/identity/sequence/">Full screen</a>
      </figcaption>
    </figure>
  </section>`;

/** Mount the player in its section: it plays while on screen, silent until the sound is turned on. */
export function mount(section) {
  const stage = section.querySelector('.seq-stage');
  const $ = (sel) => stage.querySelector(sel);
  const play = $('.play'), sound = $('.sound'), invert = $('.invert'), dl = $('.download');
  const player = mountSequence(stage, {
    paused: matchMedia('(prefers-reduced-motion: reduce)').matches,
    onState(s) {
      play.textContent = s.paused ? 'Play' : 'Pause';
      sound.toggleAttribute('data-on', s.sound);
      invert.toggleAttribute('data-on', s.paper);
      dl.toggleAttribute('data-busy', s.busy);
      dl.textContent = s.busy ? `${Math.round(s.progress * 100)}%` : 'MP4';
    },
  });
  return {
    ready: Promise.resolve(),
    pause: player.pause,
    resume: player.resume,
    destroy: player.destroy,
  };
}
