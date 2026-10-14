// The showreel, full screen, with sound: any [data-reel-open] opens it.
// The film on ink, Pause and Close (or Esc); clicking the film pauses it too.

const SOURCES = [
  ['/reel/showreel-landing-av1.mp4', 'video/mp4; codecs="av01.0.08M.10"'],
  ['/reel/showreel-landing.mp4', 'video/mp4'],
];

let dialog = null;
let opener = null;

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'reel';
  dialog.setAttribute('aria-label', 'Showreel');
  dialog.innerHTML = `
    <video playsinline preload="auto">${SOURCES.map(([src, type]) => `<source src="${src}" type='${type}'>`).join('')}</video>
    <div class="reel-bar grid">
      <button type="button" data-pp>Pause</button>
      <button type="button" data-close>Close</button>
    </div>`;
  document.body.append(dialog);
  const v = dialog.querySelector('video');
  const pp = dialog.querySelector('[data-pp]');
  const toggle = () => (v.paused ? v.play() : v.pause());
  v.addEventListener('play', () => { pp.textContent = 'Pause'; });
  v.addEventListener('pause', () => { pp.textContent = 'Play'; });
  v.addEventListener('ended', () => dialog.close());
  v.addEventListener('click', toggle);
  pp.addEventListener('click', toggle);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { v.pause(); opener?.focus(); });
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-reel-open]');
  if (!b) return;
  opener = b;
  if (!dialog) build();
  const v = dialog.querySelector('video');
  dialog.showModal();
  v.currentTime = 0;
  v.muted = false;
  v.play().catch(() => {});
  dialog.querySelector('[data-pp]').focus();
});
