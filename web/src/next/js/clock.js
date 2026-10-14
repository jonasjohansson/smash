// The studio's local time, live: every [data-clock] shows Stockholm's hours
// and minutes; [data-clock-state] says whether someone is in (09-18 on a
// weekday), with the studio's light as a dot, on or hollow.

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });

function tick() {
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const h = Number(parts.hour);
  const open = !/Sat|Sun/.test(parts.weekday) && h >= 9 && h < 18;
  document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = `${parts.hour}:${parts.minute}`; });
  document.querySelectorAll('[data-clock-state]').forEach((el) => {
    el.innerHTML = `<span class="dot${open ? ' on' : ''}" aria-hidden="true"></span>${open ? 'In the studio until 18:00' : 'Back at 09:00, Stockholm time'}`;
  });
}

tick();
setInterval(tick, 15000);
