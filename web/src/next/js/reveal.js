// The slot reveal: a picture first shows as a round-ended slit of light one
// gutter wide (a window), which opens to the frame's edges (a threshold) once
// its frame is a fifth in view. Once each. The CSS is .reveal / .reveal.is-open.
// observe(el) adds elements made later (the endless feed).
//
// The slit's own clip-path hides most of it from IntersectionObserver, so
// what is watched is its parent, the frame it opens into.

const owners = new Map(); // watched frame -> reveals inside it
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    owners.get(e.target)?.forEach((el) => el.classList.add('is-open'));
    owners.delete(e.target);
    io.unobserve(e.target);
  }
}, { threshold: 0.2 }) : null;

export function observe(el) {
  const frame = el.parentElement;
  if (!io || !frame || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.classList.add('is-open'); return; }
  if (!owners.has(frame)) { owners.set(frame, []); io.observe(frame); }
  owners.get(frame).push(el);
}

document.querySelectorAll('.reveal').forEach(observe);
