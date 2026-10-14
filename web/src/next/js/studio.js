// The studio page is the day page: paper, where the people are. Its contact
// room is the one dark room (studio.css), so the header must read it as ink:
// the page's paper moves from <body> to <main>, and the contact room drops it.

document.body.removeAttribute('data-ground');
document.getElementById('content')?.setAttribute('data-ground', 'paper');
document.querySelector('.contact')?.removeAttribute('data-ground');
