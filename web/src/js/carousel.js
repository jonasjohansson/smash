// The work carousel. State is three numbers eased every frame:
//   spin  — degrees the ring has turned
//   view  — 0 standing, seen from the side; 1 laid flat, seen from above
//   zoom  — distance multiplier, smaller is closer
// Scroll or drag sideways turns it; drag up/down moves between side and above;
// pinch or ⌘/Ctrl-scroll zooms; arrow keys turn, +/- zoom.

const carousel = document.querySelector('[data-carousel]');
if (carousel) {
  const ring = carousel.querySelector('[data-ring]');
  const cards = [...ring.querySelectorAll('[data-card]')];
  const buttons = [...document.querySelectorAll('[data-view]')];
  const count = cards.length;
  const step = 360 / count;
  const PERSPECTIVE = 1400;

  let spin = 0, spinVel = 0, spinTarget = null;
  let view = 0, viewTarget = 0;
  let zoom = 1, zoomTarget = 1;

  const measure = () => {
    const w = parseFloat(getComputedStyle(cards[0]).width);
    return { w, h: w * 1.25, r: (count * w * 1.12) / (2 * Math.PI) };
  };
  let size = measure();
  addEventListener('resize', () => { size = measure(); });

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function setView(v) {
    viewTarget = v;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.view) === Math.round(v))));
  }
  buttons.forEach((b) => b.addEventListener('click', () => setView(Number(b.dataset.view))));

  function frame() {
    if (spinTarget !== null) {
      spin += (spinTarget - spin) * 0.12;
      if (Math.abs(spinTarget - spin) < 0.01) spinTarget = null;
    } else {
      spin += spinVel;
      spinVel *= 0.93;
    }
    view += (viewTarget - view) * 0.08;
    zoom += (zoomTarget - zoom) * 0.12;

    const { h, r } = size;
    const m = Math.min(innerWidth, innerHeight);
    // Side: the front poster just behind the screen plane.
    const side = r + 260;
    // Above: far enough that the whole sun fits.
    const above = PERSPECTIVE * ((2 * (r + h)) / (0.92 * m) - 1);
    const dist = lerp(side, above, view) * zoom;
    const tilt = lerp(-8, -90, view);
    const lay = 90 * view;

    ring.style.transform = `translate3d(0, ${lerp(-h * 0.1, 0, view)}px, ${-dist}px) rotateX(${tilt}deg) rotateY(${spin}deg)`;
    ring.style.setProperty('--lay', `${lay}deg`);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  carousel.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoomTarget = clamp(zoomTarget * Math.exp(e.deltaY * 0.01), 0.35, 2.5);
    } else {
      spinTarget = null;
      spinVel += (e.deltaY + e.deltaX) * 0.012;
    }
  }, { passive: false });

  let drag = null;
  let suppressClick = false;
  carousel.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    spinTarget = null;
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6) carousel.classList.add('is-dragging');
    spinVel = dx * 0.12;
    spin += dx * 0.12;
    viewTarget = clamp(viewTarget - dy * 0.004, 0, 1);
    view = viewTarget;
    drag.x = e.clientX; drag.y = e.clientY;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    carousel.classList.remove('is-dragging');
    // A drag that ends past halfway settles into that view.
    setView(viewTarget > 0.5 ? 1 : 0);
    suppressClick = drag.moved > 6;
    drag = null;
  });
  // A drag is not a click on the poster under it.
  carousel.addEventListener('click', (e) => {
    if (suppressClick) e.preventDefault();
    suppressClick = false;
  }, true);

  // Focusing a poster (Tab) turns it to the front.
  cards.forEach((card, i) => card.addEventListener('focus', () => {
    const k = Math.round((spin + i * step) / 360);
    spinTarget = -i * step + k * 360;
  }));

  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') spinVel -= 1.2;
    if (e.key === 'ArrowLeft') spinVel += 1.2;
    if (e.key === 'ArrowUp') setView(1);
    if (e.key === 'ArrowDown') setView(0);
    if (e.key === '+' || e.key === '=') zoomTarget = clamp(zoomTarget * 0.8, 0.35, 2.5);
    if (e.key === '-') zoomTarget = clamp(zoomTarget * 1.25, 0.35, 2.5);
  });
}
