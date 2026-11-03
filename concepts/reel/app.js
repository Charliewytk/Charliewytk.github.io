// Reel: three small jobs, no dependencies.
//   1. Films play while their chapter is on screen, pause otherwise (with a toggle).
//   2. The current chapter is marked on the rail and on <html data-at>.
//   3. A rail click is a cut: a View Transition wipes to the chapter. A second
//      press mid-cut interrupts it and cuts again from where the reel is now.
// Scrolling itself is never touched: snapping and the wipes are CSS.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...document.querySelectorAll('.ch')];
  const ticks = [...document.querySelectorAll('.rail a')];
  const fill = document.querySelector('.rail__fill');

  /* 1. Films --------------------------------------------------------------- */
  const PAUSE = '<svg class="i-pause" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" rx="1"/><rect x="8.5" y="1" width="3.5" height="12" rx="1"/></svg>';
  const PLAY = '<svg class="i-play" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.6v10.8a.8.8 0 0 0 1.2.7l8.6-5.4a.8.8 0 0 0 0-1.4L4.2.9A.8.8 0 0 0 3 1.6z"/></svg>';

  const films = [...document.querySelectorAll('.film')].map((ch) => {
    const video = ch.querySelector('video');
    const name = ch.querySelector('.cap__title a').firstChild.textContent.trim();
    const btn = document.createElement('button');
    btn.className = 'toggle';
    btn.type = 'button';
    btn.innerHTML = PAUSE + PLAY;
    ch.querySelector('.cap').append(btn);   // sits in the caption row, clear of the films' own HUDs

    // "wanted" = the viewer has not paused it; reduced motion starts paused.
    const f = { ch, video, btn, name, wanted: !reduce.matches, visible: false };
    btn.addEventListener('click', () => { f.wanted = !f.wanted; sync(f); });
    sync(f);
    return f;
  });

  function sync(f) {
    const play = f.wanted && f.visible && !document.hidden;
    f.btn.setAttribute('aria-pressed', String(f.wanted));
    f.btn.setAttribute('aria-label', (f.wanted ? 'Pause ' : 'Play ') + f.name + ' video');
    f.ch.dataset.playing = String(play);  // the phone pan runs only while the film does
    if (play && f.video.paused) {
      f.video.preload = 'auto';
      f.video.play().catch(() => {});      // autoplay refused: the poster stays
    } else if (!play && !f.video.paused) {
      f.video.pause();
    }
  }

  // Load a film one screen early so it is ready when its card lands.
  const warm = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.preload = 'auto';
  }, { rootMargin: '100% 0px' });

  const onScreen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const f = films.find((x) => x.ch === e.target);
      f.visible = e.intersectionRatio >= 0.5;
      sync(f);
    }
  }, { threshold: [0, 0.5] });

  for (const f of films) { warm.observe(f.video); onScreen.observe(f.ch); }
  document.addEventListener('visibilitychange', () => films.forEach(sync));
  reduce.addEventListener('change', () => films.forEach((f) => { f.wanted = !reduce.matches; sync(f); }));

  /* 2. Current chapter ------------------------------------------------------ */
  let current = 0;                          // index into chapters
  function mark(i) {
    current = i;
    const id = chapters[i].id;
    root.dataset.at = id;                   // style.css hides header copy that repeats the screen
    for (const a of ticks) {
      if (a.hash === '#' + id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
    // Fallback fill for browsers without scroll timelines, and for reduced motion
    fill.style.setProperty('--p', i / (chapters.length - 1));
  }
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) mark(chapters.indexOf(e.target));
  }, { threshold: 0.55 });
  chapters.forEach((ch) => spy.observe(ch));

  /* 3. Rail click = a cut --------------------------------------------------- */
  // While a View Transition runs, its overlay takes every pointer event, so the
  // rail's own click handler can't see a second press. A capture listener on the
  // document finds the tick under the pointer by its box (the rail is fixed and
  // has its own transition name, so its boxes hold still), skips the running
  // cut and starts the new one. Any other press during a cut just ends it.
  let cut = null;                           // the running transition
  let swallowUntil = 0;                     // the click that follows an intercepted press

  function go(a) {
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    const to = chapters.indexOf(target);
    if (to === current && !cut) return;
    root.dataset.cut = to > current ? 'down' : 'up';
    if (cut) cut.skipTransition();

    const t = document.startViewTransition(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      history.replaceState(null, '', a.hash);
      mark(to);
    });
    cut = t;
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => { if (cut === t) cut = null; });
  }

  const tickAt = (x, y) => ticks.find((a) => {
    const r = a.getBoundingClientRect();
    return r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });

  document.addEventListener('pointerdown', (ev) => {
    if (!cut) return;
    const a = tickAt(ev.clientX, ev.clientY);
    swallowUntil = ev.timeStamp + 800;
    if (a) go(a); else cut.skipTransition();
  }, true);

  document.addEventListener('click', (ev) => {
    if (ev.timeStamp < swallowUntil) {     // already handled on pointerdown
      swallowUntil = 0;
      ev.preventDefault(); ev.stopPropagation();
      return;
    }
    const a = ev.target.closest && ev.target.closest('.rail a');
    if (!a || !document.startViewTransition || reduce.matches) return;   // plain anchor jump
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;   // new tab etc.
    ev.preventDefault();
    go(a);
  }, true);
})();
