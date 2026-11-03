// Linear concept: videos, one light sweep, and one spring system. No dependencies.
(() => {
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  // iOS Safari applies :active only when a touchstart listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true });

  /* ---------- 1. Videos ----------
     Clips autoplay only while on screen and never under reduced motion. Every clip has a
     pause / play button; once someone pauses a clip it stays paused until they press play.
     Without JS the poster (frame-matched to the clip) stays and the button stays hidden. */
  const videos = [...document.querySelectorAll('.pv-media video')];
  const held = new WeakSet(); // clips the viewer paused
  const auto = (v) => {
    if (!still.matches && !document.hidden && !held.has(v) && v.dataset.inView) v.play().catch(() => {});
  };
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      e.target.dataset.inView = e.isIntersecting ? '1' : '';
      e.isIntersecting ? auto(e.target) : e.target.pause();
    }
  }, { threshold: 0.25 });
  videos.forEach((v) => seen.observe(v));

  document.addEventListener('visibilitychange', () =>
    videos.forEach((v) => (document.hidden ? v.pause() : auto(v))));

  document.querySelectorAll('.play').forEach((b) => {
    const v = b.closest('.cell').querySelector('video');
    const label = b.querySelector('.vh');
    const name = label.textContent.replace(/^Play /, '');
    const sync = () => {
      const on = !v.paused;
      b.toggleAttribute('data-playing', on);
      label.textContent = (on ? 'Pause ' : 'Play ') + name;
    };
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    b.addEventListener('click', () => {
      if (v.paused) { held.delete(v); v.play().catch(() => {}); }
      else { held.add(v); v.pause(); }
    });
    sync();
    b.hidden = false;
  });

  /* ---------- 2. Light sweep ----------
     One pass, once: on the cards in view at load, then on each video card as it arrives.
     Cards that arrive together get --i, and CSS staggers them by --stagger (capped at 7). */
  if (!still.matches) {
    let first = true;
    const sweep = new IntersectionObserver((entries) => {
      const hits = entries.filter((e) => e.isIntersecting && (first || e.target.querySelector('video')));
      hits.forEach((e, i) => {
        e.target.style.setProperty('--i', i);
        e.target.classList.add('lit');
        sweep.unobserve(e.target);
      });
      if (first) {
        first = false;
        document.querySelectorAll('.cell:not(.lit)').forEach((c) => { if (!c.querySelector('video')) sweep.unobserve(c); });
      }
    }, { threshold: 0.4 });
    document.querySelectorAll('.cell').forEach((c) => sweep.observe(c));
  }

  /* ---------- 3. Card springs ----------
     Lift and press are damped springs stepped every frame. A new target keeps the current
     velocity, so every motion can be interrupted mid-flight without a jump. Only transform
     is written. */
  class Spring {
    constructor(k, c, x = 0) { this.k = k; this.c = c; this.x = x; this.to = x; this.v = 0; }
    step(dt) { this.v += (this.k * (this.to - this.x) - this.c * this.v) * dt; this.x += this.v * dt; }
    get rest() { return Math.abs(this.to - this.x) < 1e-3 && Math.abs(this.v) < 1e-2; }
    snap() { this.x = this.to; this.v = 0; }
  }

  const cards = [...document.querySelectorAll('.card')].map((el) => ({
    el, sw: el.querySelector('.sw'), cell: el.closest('.cell'),
    // The play button rides the card's lift; with anchor positioning it already follows.
    btn: CSS.supports('anchor-scope: all') ? null : el.closest('.cell').querySelector('.play'),
    lift: new Spring(380, 30),   // px, damping ratio ≈ 0.77
    press: new Spring(700, 42),  // 0–1
  }));
  const springsOf = (c) => [c.lift, c.press];

  const live = new Set();
  let raf = 0, last = 0;
  const wake = (c) => { live.add(c); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  function render(c, idle) {
    const s = 1 - 0.025 * c.press.x, rest = idle && !c.lift.x && !c.press.x;
    c.el.style.transform = rest ? '' : `translateY(${c.lift.x.toFixed(2)}px) scale(${s.toFixed(4)})`;
    if (c.btn) c.btn.style.translate = rest ? '' : `0 ${c.lift.x.toFixed(2)}px`;
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); // a dropped frame never makes a jump
    last = now;
    const n = Math.ceil(dt / (1 / 240));
    for (const c of live) {
      const ss = springsOf(c);
      for (let i = 0; i < n; i++) ss.forEach((s) => s.step(dt / n));
      const idle = ss.every((s) => s.rest);
      if (idle) { ss.forEach((s) => s.snap()); live.delete(c); }
      render(c, idle);
    }
    raf = live.size ? requestAnimationFrame(tick) : 0;
  }

  const on = () => root.classList.contains('spring');
  const LIFT = -6;

  // Pointer: lift and a soft highlight that follows the pointer. Fine pointers only.
  // The highlight reads the rect of the <li>, which is never transformed, so the spring's
  // own transform never feeds back into the measurement.
  let hot = null, px = 0, py = 0, frame = 0;
  const aim = () => {
    frame = 0;
    if (!hot) return;
    const r = hot.cell.getBoundingClientRect();
    hot.sw.style.setProperty('--mx', `${px - r.left}px`);
    hot.sw.style.setProperty('--my', `${py - r.top - hot.lift.x}px`);
  };
  const enter = (c) => { c.lift.to = LIFT; wake(c); };
  const leave = (c) => { c.lift.to = 0; c.press.to = 0; wake(c); };

  cards.forEach((c) => {
    c.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !fine.matches) return;
      hot = c; if (on()) enter(c);
    });
    // Moving onto the card's own play button keeps the card lifted.
    const out = (e) => {
      if (e.pointerType !== 'mouse' || c.cell.contains(e.relatedTarget)) return;
      if (hot === c) hot = null;
      if (on()) leave(c);
    };
    c.el.addEventListener('pointerleave', out);
    c.cell.querySelector('.play')?.addEventListener('pointerleave', out);
    c.el.addEventListener('pointermove', (e) => {
      if (hot !== c) return;
      px = e.clientX; py = e.clientY;
      if (!frame) frame = requestAnimationFrame(aim);
    }, { passive: true });

    // Press: immediate for a mouse; for touch, after 64 ms so a scroll never dips the card.
    let hold = 0;
    const down = () => { if (on()) { c.press.to = 1; wake(c); } };
    const up = () => { clearTimeout(hold); if (on()) { c.press.to = 0; wake(c); } };
    c.el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.pointerType === 'mouse' ? down() : (hold = setTimeout(down, 64));
    });
    ['pointerup', 'pointercancel', 'dragstart'].forEach((t) => c.el.addEventListener(t, up));
    c.el.addEventListener('pointerleave', up);

    // Keyboard focus lifts the card the same way hover does.
    c.el.addEventListener('focus', () => { if (on() && c.el.matches(':focus-visible')) enter(c); });
    c.el.addEventListener('blur', () => { if (on() && hot !== c) leave(c); });
  });

  // Reduced motion switched on mid-visit: drop to the static layout at once.
  still.addEventListener('change', () => {
    videos.forEach((v) => (still.matches ? v.pause() : auto(v)));
    root.classList.toggle('spring', !still.matches);
    cards.forEach((c) => { springsOf(c).forEach((s) => { s.to = 0; s.snap(); }); live.delete(c); render(c, true); });
  });
})();
