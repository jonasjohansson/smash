// The studio page is the day page: paper, where the people are. Two places on
// it are dark, the room under the title and the contact room at the end
// (studio.css), so the header must read them as ink. The page's paper moves
// from <body> to each paper block in <main> (site.js inverts the header over
// [data-ground="paper"]); the room's picture and the contact room get none.

document.body.removeAttribute('data-ground');
const main = document.getElementById('content');
if (main) {
  for (const el of main.children) {
    if (el.querySelector('[data-ink]')) {
      // A figure with a dark room: only its caption is on paper.
      el.querySelectorAll(':scope > figcaption').forEach((c) => c.setAttribute('data-ground', 'paper'));
    } else {
      el.setAttribute('data-ground', 'paper');
    }
  }
}
document.querySelector('.contact')?.removeAttribute('data-ground');
// site.js read the grounds once on load; let it read them again.
dispatchEvent(new Event('resize'));
