// The showreel, full screen, with sound: any [data-reel-open] opens it. Native
// video on ink, a 1px progress line, a timecode, Pause, and Close (or Esc).

const SOURCES = [
  ['/reel/showreel-landing-av1.mp4', 'video/mp4; codecs="av01.0.08M.10"'],
  ['/reel/showreel-landing.mp4', 'video/mp4'],
];

let dialog = null;
let opener = null;
const time = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'reel';
  dialog.setAttribute('aria-label', 'Showreel');
  dialog.innerHTML = `
    <video playsinline preload="auto">${SOURCES.map(([src, type]) => `<source src="${src}" type='${type}'>`).join('')}</video>
    <button class="reel-close t-meta" type="button" data-close>Close</button>
    <div class="reel-bar t-meta">
      <span>Showreel 2026</span>
      <span><span class="tnum" data-tc>0:00</span> <span class="dim">/ <span class="tnum" data-dur>0:48</span></span></span>
      <button type="button" data-pp>Pause</button>
    </div>
    <div class="reel-progress" aria-hidden="true"><i data-bar></i></div>`;
  document.body.append(dialog);
  const v = dialog.querySelector('video');
  const tc = dialog.querySelector('[data-tc]');
  const dur = dialog.querySelector('[data-dur]');
  const bar = dialog.querySelector('[data-bar]');
  const pp = dialog.querySelector('[data-pp]');
  const toggle = () => (v.paused ? v.play() : v.pause());
  v.addEventListener('timeupdate', () => {
    tc.textContent = time(v.currentTime);
    bar.style.transform = `scaleX(${v.duration ? v.currentTime / v.duration : 0})`;
  });
  v.addEventListener('loadedmetadata', () => { dur.textContent = time(v.duration); });
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
