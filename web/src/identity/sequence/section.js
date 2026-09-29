// The sequence on /identity: the same player as its own page (player.js), in
// a stage like the chapters' motions, with their kind of controls: play or
// pause, the scrub, the sound, black on white, the MP4, the version on the
// pulse (pulse.js) or the first one, and the page itself, in that version.

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
        <button type="button" class="pulse" aria-pressed="false" title="The version on the pulse: a hit on the beat each time the mark changes">Pulse</button>
        <a class="open" href="/identity/sequence/">Full screen</a>
      </figcaption>
    </figure>
  </section>`;

/**
 * Mount the player in its section: it plays while on screen, silent until the
 * sound is turned on. Pulse swaps the sequence for the one on the pulse and
 * back: a new player on the same controls, black or white as it was.
 */
export function mount(section) {
  const stage = section.querySelector('.seq-stage');
  const $ = (sel) => stage.querySelector(sel);
  const play = $('.play'), sound = $('.sound'), invert = $('.invert'), dl = $('.download'), pulse = $('.pulse'), open = $('.open');
  let player = null;
  let away = false;
  function start(engine) {
    const paper = stage.hasAttribute('data-paper');
    player?.destroy();
    player = mountSequence(stage, {
      engine,
      paper,
      paused: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onState(s) {
        play.textContent = s.paused ? 'Play' : 'Pause';
        sound.toggleAttribute('data-on', s.sound);
        invert.toggleAttribute('data-on', s.paper);
        dl.toggleAttribute('data-busy', s.busy);
        dl.textContent = s.busy ? `${Math.round(s.progress * 100)}%` : 'MP4';
      },
    });
    if (away) player.pause();
  }
  start();
  pulse.addEventListener('click', async () => {
    const on = pulse.getAttribute('aria-pressed') !== 'true';
    start(on ? await import('./pulse.js') : undefined);
    pulse.setAttribute('aria-pressed', String(on));
    pulse.toggleAttribute('data-on', on);
    open.href = `/identity/sequence/${on ? '?pulse' : ''}`;
  });
  return {
    ready: Promise.resolve(),
    pause() { away = true; player.pause(); },
    resume() { away = false; player.resume(); },
    destroy() { player.destroy(); },
  };
}
