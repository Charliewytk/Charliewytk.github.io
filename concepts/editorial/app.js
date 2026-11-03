// Editorial concept. Five small jobs, no dependencies:
// 1. mark the current project in the index (desktop rail + phone running head),
// 2. show the phone running head once the index has scrolled away,
// 3. raise each display name out of its line masks as it scrolls in (one shot),
// 4. play the demo videos only while they are on screen (never under reduced motion),
// 5. on desktop, turn the index rail into an instrument: a plate under it previews the project you point at.
// The page is complete without this file.
(() => {
  const spreads = [...document.querySelectorAll('.spread')];
  const links = [...document.querySelectorAll('.index a')];
  const index = document.querySelector('.index');
  const runhead = document.querySelector('.runhead');
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  // 1. Current project = the spread crossing a line 40% down the viewport.
  //    CSS springs the marker and the odometer to --i; a new value mid-flight just retargets.
  let current = -1;
  function setCurrent(i) {
    if (i === current) return;
    current = i;
    links.forEach((a, j) => (j === i ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    const n = String(Math.max(i, 0));
    index.style.setProperty('--i', n);
    runhead.style.setProperty('--i', n);
    runhead.dataset.i = n;                       // picks the progress timeline for the head's hairline
    index.classList.toggle('has-current', i >= 0);
  }
  const band = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const i = spreads.indexOf(en.target);
      if (en.isIntersecting) setCurrent(i);
      else if (i === 0 && en.boundingClientRect.top > 0) setCurrent(-1); // scrolled back above the first one
    }
  }, { rootMargin: '-40% 0px -59% 0px' });
  spreads.forEach((s) => band.observe(s));

  // 2. Running head (phones only; hidden by CSS on desktop, where the index is sticky instead).
  new IntersectionObserver(([en]) => {
    const on = !en.isIntersecting && en.boundingClientRect.bottom < 0;
    runhead.classList.toggle('on', on);
    runhead.inert = !on;
  }).observe(index);

  // 3. Line reveals. A name is armed (pushed down inside its mask) only while it is less than one
  //    screen below the viewport, and only if it is not already visible, so first paint, a page
  //    restored mid-scroll and a capture of the first screen always show every name.
  //    It is released once it is 10% into view, or as soon as anything inside it takes focus.
  if (!still.matches) {
    const heads = [...document.querySelectorAll('.name, .motto')];
    heads.forEach((h) => h.querySelectorAll('.line > span').forEach((s, i) => s.style.setProperty('--li', i)));
    const release = (h) => { h.classList.remove('armed'); show.unobserve(h); };
    const show = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) release(en.target);
    }, { rootMargin: '0px 0px -10% 0px' });
    const near = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        near.unobserve(en.target);
        if (en.boundingClientRect.top > innerHeight) {
          en.target.classList.add('armed');
          show.observe(en.target);
        }
      }
    }, { rootMargin: '0px 0px 100% 0px' });
    heads.forEach((h) => near.observe(h));
    document.addEventListener('focusin', (e) => {
      const h = e.target.closest && e.target.closest('.armed');
      if (h) release(h);
    });
    addEventListener('beforeprint', () => heads.forEach(release));
  }

  // 4. Videos: preload="none" with a poster, so nothing downloads until one is seen.
  const videos = [...document.querySelectorAll('video')];
  const seen = new Set();
  const sync = () => videos.forEach((v) => {
    if (seen.has(v) && !still.matches && !document.hidden) v.play().catch(() => {});
    else v.pause();
  });
  const watch = new IntersectionObserver((entries) => {
    for (const en of entries) en.isIntersecting ? seen.add(en.target) : seen.delete(en.target);
    sync();
  }, { threshold: 0.35 });
  videos.forEach((v) => watch.observe(v));
  document.addEventListener('visibilitychange', sync);
  still.addEventListener('change', sync);

  // 5. Preview plate. Built from the spreads themselves (their poster, phones or numeral and lede),
  //    so there is one source of truth and phones download nothing extra. CSS springs a strip of
  //    frames to --p; a new target mid-flight retargets. Decorative: the rail links carry the meaning.
  const fine = matchMedia('(min-width: 960px) and (hover: hover) and (pointer: fine)');
  let plate = null;
  function build() {
    if (plate || !fine.matches) return;
    plate = document.createElement('div');
    plate.className = 'pv';
    plate.setAttribute('aria-hidden', 'true');
    const frame = document.createElement('div');
    frame.className = 'pv-frame';
    const strip = document.createElement('div');
    strip.className = 'pv-strip';
    const cap = document.createElement('div');
    cap.className = 'pv-cap';
    const roll = document.createElement('span');
    roll.className = 'roll';
    spreads.forEach((s, j) => {
      const f = document.createElement('div');
      f.className = 'pv-f';
      const phones = s.querySelector('.phones');
      const video = s.querySelector('video[poster]');
      if (phones) {
        const p = document.createElement('span');
        p.className = 'phones';
        phones.querySelectorAll('img').forEach((img) => {
          const c = document.createElement('img');
          c.className = 'pv-phone';
          c.src = img.currentSrc || img.src; c.alt = ''; c.decoding = 'async';
          c.width = img.width; c.height = img.height;
          p.append(c);
        });
        f.append(p);
      } else if (video) {
        f.classList.add('dark');
        const c = document.createElement('img');
        c.src = video.getAttribute('poster'); c.alt = ''; c.decoding = 'async';
        f.append(c);
      } else {
        const t = document.createElement('div');
        t.className = 'pv-type';
        const n = document.createElement('span');
        n.className = 'n';
        n.textContent = s.querySelector('.meta .n').textContent;
        const l = document.createElement('p');
        l.textContent = s.querySelector('.lede').textContent;
        t.append(n, l);
        f.append(t);
      }
      strip.append(f);
      const k = links[j] && links[j].querySelector('.k');
      const label = document.createElement('span');
      label.textContent = k ? k.textContent : (s.querySelector('.meta > :nth-child(2)') || {}).textContent || '';
      roll.append(label);
    });
    frame.append(strip);
    cap.append(roll);
    plate.append(frame, cap);
    index.append(plate);

    const setP = (j) => index.style.setProperty('--p', String(j));
    const peek = (j) => {
      if (!index.classList.contains('peek') && current >= 0) {
        // the plate is hidden: jump straight to the item, then fade in, so it never sweeps the strip unseen
        plate.classList.add('still');
        setP(j);
        void plate.offsetWidth;
        plate.classList.remove('still');
      } else setP(j);
      index.classList.add('peek');
    };
    const unpeek = () => index.classList.remove('peek');
    const ol = index.querySelector('ol');
    ol.addEventListener('pointerover', (e) => {
      const a = e.target.closest('a');
      if (a) peek(links.indexOf(a));
    });
    ol.addEventListener('pointerleave', () => { if (!index.querySelector(':focus-visible')) unpeek(); });
    index.addEventListener('focusin', (e) => {
      const a = e.target.closest('a');
      if (a && a.matches(':focus-visible')) peek(links.indexOf(a));
    });
    index.addEventListener('focusout', (e) => { if (!index.contains(e.relatedTarget)) unpeek(); });
  }
  build();
  fine.addEventListener('change', build);
})();
