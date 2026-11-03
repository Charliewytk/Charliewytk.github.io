// Desktop concept: windows, dock tiles, phone sheets and the clock.
// The page works without this file: every icon is a plain link to its project.
// With it, a plain click opens the project as a window (desktop) or a full-screen sheet (phone).
//
// Motion model (see concepts/_content/motion-brief.md):
//   .win    outer layer: position (desktop drag/throw) or the swipe-down drag (phone)
//   .frame  inner layer: the "genie", a rect morph from an origin (icon, dock tile, old rect)
//           to the window, driven by two springs (x and y progress) so it stretches a little.
//   .chrome the content, counter-scaled against .frame so text is never squashed.
//   .genie  a copy of the app icon stretched over the frame: the flight starts as the icon and
//           cross-fades into the window (and back into the icon on the way out).
// Every motion is a spring that can be retargeted mid-flight and keeps its velocity.

(() => {
  'use strict';

  const MENU = 28;            // menu bar height (desktop)
  const DOCK = 84;            // space kept clear for the dock (desktop)
  const GAP = 12;             // margin from the screen edge when zoomed
  const MIN_W = 320, MIN_H = 220;
  const RADIUS = 12;          // window corner radius (desktop)

  const phoneMQ = matchMedia('(max-width: 900px), (max-height: 560px)');   // same query as style.css
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const isPhone = () => phoneMQ.matches;
  const reduced = () => reduceMQ.matches;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };

  // ---------- One rAF loop for everything that moves ----------
  const loop = {
    jobs: new Set(), raf: 0, last: 0,
    add(job) { this.jobs.add(job); if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(this.tick); } },
    tick: (t) => {
      const dt = Math.min((t - (loop.last || t)) / 1000, 1 / 30);
      loop.last = t;
      for (const job of loop.jobs) if (!job(dt)) loop.jobs.delete(job);
      loop.raf = loop.jobs.size ? requestAnimationFrame(loop.tick) : 0;
    },
  };

  // ---------- Spring: k stiffness, c damping, mass 1 ----------
  class Spring {
    constructor(x, k = 400, c = 30, eps = 0.002) { Object.assign(this, { x, v: 0, to: x, k, c, eps }); }
    set(to, k = this.k, c = this.c) { this.to = to; this.k = k; this.c = c; }
    jump(x) { this.x = this.to = x; this.v = 0; }
    get resting() { return Math.abs(this.v) < this.eps * 10 && Math.abs(this.x - this.to) < this.eps; }
    step(dt) {                         // 4 semi-implicit Euler substeps: stable at k = 500
      const h = dt / 4;
      for (let i = 0; i < 4; i++) { this.v += (-this.k * (this.x - this.to) - this.c * this.v) * h; this.x += this.v * h; }
      if (this.resting) this.jump(this.to);
    }
  }
  const OPEN_X = [420, 32], OPEN_Y = [300, 27];    // bouncy: a little overshoot, y trails x
  const SHUT_X = [380, 40], SHUT_Y = [520, 46];    // critically damped: exits never bounce
  const SETTLE = [300, 30];                         // throws and drags

  // ---------- Velocity from the last ~80 ms of pointer samples ----------
  function tracker() {
    const pts = [];
    return {
      push(x, y) { const t = performance.now(); pts.push({ x, y, t }); while (pts.length > 2 && t - pts[0].t > 80) pts.shift(); },
      velocity() {                                   // px per second
        if (pts.length < 2) return { x: 0, y: 0 };
        const a = pts[0], b = pts[pts.length - 1], dt = Math.max((b.t - a.t) / 1000, 0.008);
        if (performance.now() - b.t > 100) return { x: 0, y: 0 };   // finger held still before release
        return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      },
    };
  }

  // ---------- Shared chrome ----------
  const winLayer = $('#windows');
  const dock = $('.dock');
  const dockList = $('#dock');
  const appName = $('#app-name');
  const ownerName = appName.textContent;
  const background = [$('.menubar'), $('#desktop'), dock];   // made inert (and pushed back) behind a phone sheet
  const wins = new Map();                                    // slug -> Win
  let zTop = 10;
  let cascade = 0;

  const workArea = () => ({ x: 0, y: MENU, w: innerWidth, h: innerHeight - MENU - DOCK });
  // Windows open left of the icon grid, so the launcher is never covered.
  const launcherLeft = () => $('.apps').getBoundingClientRect().left - 16;

  // Play only the front window's video; buried and minimised windows sit still.
  function syncVideos() {
    for (const w of wins.values()) {
      if (!w.video) continue;
      const front = w.state === 'open' && w.el.classList.contains('is-front');
      if (front && !reduced()) { if (w.video.paused) w.video.play().catch(() => {}); } else if (!w.video.paused) w.video.pause();
    }
  }

  // ---------- Phone depth: the home screen sinks and dims as a sheet comes up ----------
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.setAttribute('aria-hidden', 'true');
  winLayer.append(scrim);
  const depth = {
    of: new Map(), p: 0,
    set(win, p) {
      if (p > 0.0005) this.of.set(win, p); else this.of.delete(win);
      const next = isPhone() ? Math.max(0, ...this.of.values()) : 0;
      if (Math.abs(next - this.p) < 0.0005) return;
      if (!this.p && next) {                                 // first frame: scale each layer around the screen centre
        for (const n of background) {
          const r = n.getBoundingClientRect();
          n.style.transformOrigin = `${innerWidth / 2 - r.left}px ${innerHeight / 2 - r.top}px`;
          n.style.willChange = 'transform';
        }
      }
      this.p = next;
      dock.classList.toggle('is-sunk', next > 0);           // no live blur behind a sheet: it would re-blur every frame
      if (!next) { for (const n of background) n.style.transform = n.style.transformOrigin = n.style.willChange = ''; scrim.style.opacity = ''; return; }
      const sc = 1 - 0.06 * next;
      for (const n of background) n.style.transform = `scale(${sc})`;
      scrim.style.opacity = String(next);
    },
  };

  // ---------- Window ----------
  class Win {
    constructor(app) {
      this.app = app;                                        // the desktop icon link
      this.slug = app.dataset.app;
      this.name = $('.label', app).textContent;
      this.state = 'closed';                                 // closed | open | min
      this.px = new Spring(0); this.py = new Spring(0);      // genie progress, 0 = at origin
      this.x = new Spring(0, ...SETTLE, 0.05); this.y = new Spring(0, ...SETTLE, 0.05);
      this.drag = new Spring(0, ...SETTLE, 0.05);            // phone swipe-down offset
      this.w = 0; this.h = 0;
      this.from = null;                                      // origin rect for the genie
      this.to = null;                                        // target rect override (phone dismiss)
      this.fade = true;                                      // fade while morphing from a small origin
      this.build();
    }

    build() {
      const id = `w-${this.slug}`;
      const el = document.createElement('article');
      el.className = 'win';
      el.id = id;
      el.hidden = true;
      el.tabIndex = -1;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-labelledby', `${id}-title`);
      el.innerHTML = `
        <div class="frame"><div class="chrome">
          <header class="titlebar">
            <div class="lights">
              <button class="light light--close" type="button" aria-label="Close ${this.name}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 4l4 4M8 4l-4 4"/></svg></button>
              <button class="light light--min" type="button" aria-label="Minimise ${this.name}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 6h5"/></svg></button>
              <button class="light light--zoom" type="button" aria-label="Zoom ${this.name}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 4h3.2L4 7.2zM8 8H4.8L8 4.8z" fill="rgba(0,0,0,.6)" stroke="none"/></svg></button>
            </div>
            <h2 class="title" id="${id}-title">${this.name}</h2>
            <span class="grabber" aria-hidden="true"></span>
          </header>
          <div class="body"></div>
        </div><span class="resize" aria-hidden="true"></span></div>`;
      this.el = el;
      this.frame = $('.frame', el);
      this.chrome = $('.chrome', el);
      this.body = $('.body', el);
      this.titlebar = $('.titlebar', el);
      // The icon, stretched to the window rect: the frame's scale shrinks it back to the icon at the origin.
      const genie = $('.icon', this.app).cloneNode(true);
      genie.classList.add('genie');
      genie.setAttribute('aria-hidden', 'true');
      $('svg', genie)?.setAttribute('preserveAspectRatio', 'none');
      this.chrome.after(genie);
      this.genie = genie;
      winLayer.append(el);

      $('.light--close', el).addEventListener('click', () => this.close());
      $('.light--min', el).addEventListener('click', () => this.minimise());
      $('.light--zoom', el).addEventListener('click', () => this.zoom());
      this.titlebar.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && !isPhone()) this.zoom(); });
      el.addEventListener('pointerdown', () => this.raise(), true);
      el.addEventListener('focusin', () => this.raise());
      this.titlebar.addEventListener('pointerdown', (e) => (isPhone() ? this.swipeStart(e) : this.dragStart(e)));
      $('.resize', el).addEventListener('pointerdown', (e) => this.resizeStart(e));
      this.bodySwipe();
    }

    // Clone the body on first open, so closed windows fetch no images or video.
    mount() {
      if (this.body.childElementCount) return;
      this.body.append($(`#tpl-${this.slug}`).content.cloneNode(true));
      this.video = $('video', this.body);
      if (this.video && reduced()) this.video.controls = true;
    }
    // Hover or press on the icon: clone the body and decode its first picture, so the spring starts on a warm layer.
    warm() {
      if (this.warmed) return;
      this.warmed = true;
      this.mount();
      const srcs = $$('img', this.body).map((i) => i.currentSrc || i.src);
      if (this.video?.poster) srcs.push(this.video.poster);
      for (const src of srcs.slice(0, 3)) { const i = new Image(); i.src = src; i.decode?.().catch(() => {}); }
    }

    // Where the window lives when open.
    place() {
      this.phone = isPhone();
      if (this.phone) { this.w = innerWidth; this.h = innerHeight; this.fit = false; this.x.jump(0); this.y.jump(0); return this.size(); }
      const area = workArea(), right = launcherLeft();
      this.w = clamp(Math.min(560, right - 24), MIN_W, area.w - 16);
      const step = (cascade++ % 6) * 28;
      // Sit just left of the icons, then cascade down and to the left, away from them.
      const x = Math.round(right - this.w - step);
      const y = Math.round(area.y + 24 + step);
      this.x.jump(clamp(x, 8, area.w - this.w - 8));
      this.y.jump(clamp(y, area.y, area.y + area.h - 80));
      this.fit = true;
      this.size();
    }
    // fit: the window is as tall as its content, capped by CSS above the dock (follows viewport changes).
    size() {
      const s = this.el.style;
      s.width = `${this.w}px`;
      if (this.fit && !isPhone()) {
        s.height = 'auto';
        s.maxHeight = `max(${MIN_H}px, calc(100dvh - ${Math.round(this.y.to) + DOCK - 8}px))`;
        this.h = this.el.offsetHeight;
      } else { s.height = `${this.h}px`; s.maxHeight = ''; }
    }

    // instant: no genie (used for the window that is open at load, so screenshots never catch it mid-flight).
    open(origin = this.app, { focus = true, instant = false, kbd = false } = {}) {
      this.el.classList.toggle('is-kbd', kbd);
      if (this.state === 'open') { this.raise(); if (focus) this.el.focus({ preventScroll: true }); return; }
      const cold = !this.body.childElementCount;            // a tap fires pointerdown and click together, so warm() may not have had a frame
      this.mount();
      const offscreen = this.el.hidden;                      // false while a close is still flying
      this.el.hidden = false;
      if (offscreen) this.place();
      this.state = 'open';
      this.zoomed = false;
      this.from = rectOf($('.icon', origin) || origin);
      this.to = null;
      this.fade = true;
      this.drag.jump(0);
      this.dockFlight(origin !== this.app);                   // restoring from a dock tile: rise out of the dock, not from under it
      this.modal();
      if (instant) { this.px.jump(1); this.py.jump(1); this.render(); }
      else if (cold && !reduced() && this.px.x === 0 && this.py.x === 0) {
        // First open: pay for the clone, layout and image decode in this frame (drawn invisible at the icon),
        // then start the spring on the next one, so its first step never lands on a long frame.
        this.render();
        requestAnimationFrame(() => { if (this.state === 'open') this.animate(1, OPEN_X, OPEN_Y); });
      } else this.animate(1, OPEN_X, OPEN_Y);
      this.raise();
      this.app.classList.add('is-open');
      dockTiles.add(this, instant);
      syncVideos();
      if (isPhone()) background.forEach((n) => (n.inert = true));
      if (focus) this.el.focus({ preventScroll: true });
    }

    // A phone sheet is modal (the home screen behind it is inert); a desktop window is not.
    modal() { if (isPhone()) this.el.setAttribute('aria-modal', 'true'); else this.el.removeAttribute('aria-modal'); }

    close() {
      if (this.state === 'closed') return;
      const hadFocus = this.el.contains(document.activeElement);
      const wasMin = this.state === 'min';
      this.state = 'closed';
      this.app.classList.remove('is-open');
      dockTiles.remove(this);
      if (isPhone()) background.forEach((n) => (n.inert = false));
      this.dockFlight(false);
      if (!wasMin) { this.from = rectOf($('.icon', this.app)); this.fade = true; this.animate(0, SHUT_X, SHUT_Y); }
      this.video?.pause();
      if (hadFocus) this.app.focus({ preventScroll: true });
      frontmost();
    }

    minimise() {
      if (this.state !== 'open' || isPhone()) return;
      this.state = 'min';
      this.fade = true;
      const tile = dockTiles.tileOf(this);
      this.from = rectOf(tile ? $('.icon', tile) : $('.icon', this.app));
      this.dockFlight(!!tile);                               // pass in front of the dock glass, into the tile
      this.animate(0, SHUT_X, SHUT_Y);
      tile?.classList.add('tile--min');
      this.video?.pause();
      if (this.el.contains(document.activeElement)) (tile || this.app).focus({ preventScroll: true });
      frontmost();
    }

    zoom() {
      if (this.state !== 'open' || isPhone()) return;
      const before = this.rectNow();
      if (!this.zoomed) {
        this.saved = { x: this.x.to, y: this.y.to, w: this.w, h: this.h, fit: this.fit };
        this.fit = false;
        // Like Notes: as tall as the screen allows, capped at a readable width, and still clear of the icons.
        const a = workArea(), right = launcherLeft();
        this.w = clamp(Math.min(right - GAP, 960), MIN_W, a.w - GAP * 2); this.h = a.h - GAP;
        this.x.jump(Math.round(clamp(right - this.w, GAP, a.w - this.w - GAP))); this.y.jump(a.y + GAP);
      } else {
        const s = this.saved; this.x.jump(s.x); this.y.jump(s.y); this.w = s.w; this.h = s.h; this.fit = s.fit;
      }
      this.zoomed = !this.zoomed;
      this.size();
      // Morph from the old rect: same picture this frame, then spring to the new one.
      this.from = before; this.to = null; this.fade = false;
      this.px.jump(0); this.py.jump(0);
      this.animate(1, OPEN_X, OPEN_Y);
    }

    raise() {
      if (this.el.classList.contains('is-front')) return;
      this.el.style.zIndex = ++zTop;
      $$('.win.is-front').forEach((w) => w.classList.remove('is-front'));
      this.el.classList.add('is-front');
      appName.textContent = this.name;
      syncVideos();
    }

    // While a window flies to or from a dock tile, the window layer sits above the dock (z 800).
    dockFlight(on) {
      this.docking = on;
      winLayer.classList.toggle('windows--fly', [...wins.values()].some((w) => w.docking));
    }

    // The rect the frame shows right now, in viewport pixels.
    rectNow() { return rectOf(this.frame); }

    animate(target, [kx, cx], [ky, cy]) {
      if (reduced()) { this.px.jump(target); this.py.jump(target); this.render(); this.settled(); return; }
      this.px.set(target, kx, cx); this.py.set(target, ky, cy);
      this.render();                                         // paint the first frame now, not one frame late
      this.run();
    }
    run() {
      if (this.running) return;
      this.running = true;
      this.el.classList.add('is-moving');
      loop.add((dt) => {
        for (const s of [this.px, this.py, this.x, this.y, this.drag]) s.step(dt);
        this.render();
        const moving = ![this.px, this.py, this.x, this.y, this.drag].every((s) => s.resting);
        if (!moving) { this.running = false; this.el.classList.remove('is-moving'); this.settled(); }
        return moving;
      });
    }
    // Write a style only when it changes, so a resting corner never repaints the layer.
    put(node, prop, value) {
      const key = `_${prop}`;
      if (node[key] === value) return;
      node[key] = value; node.style[prop] = value;
    }

    render() {
      const { el, frame, chrome } = this;
      const px = this.px.x, py = this.py.x, phone = isPhone();
      const m = Math.min(px, py);
      // Outer layer: where the window is.
      if (phone) {
        const d = this.drag.x, s = 1 - 0.1 * clamp(d / this.h, 0, 1);
        el.style.transform = d ? `translate3d(0, ${d}px, 0) scale(${s})` : '';
        depth.set(this, this.state === 'closed' && !this.running ? 0 : clamp(m, 0, 1) * (1 - clamp(d / this.h, 0, 1)));
      } else {
        el.style.transform = `translate3d(${this.x.x}px, ${this.y.x}px, 0)`;
      }
      const flying = !(px === 1 && py === 1 && !this.to);
      // The resting shadow and hairline (.win::before) hide while the frame morphs, and fade back in on landing.
      if (flying !== this.flying) { this.flying = flying; el.classList.toggle('is-flying', flying); }
      if (!flying) {                                         // at rest: no morph, nothing inline
        this.put(frame, 'transform', ''); this.put(frame, 'opacity', '');
        this.put(chrome, 'transform', ''); this.put(chrome, 'opacity', '');
        this.put(this.genie, 'opacity', '');
        // A sheet being dragged gets rounded top corners, like a card lifted off the screen.
        this.put(frame, 'borderRadius', phone && this.drag.x > 0 ? `${Math.min(this.drag.x / 2, 12).toFixed(1)}px` : '');
        return;
      }
      // Inner layer: morph from `from` to the window rect (or `to`), per axis.
      const home = { x: phone ? 0 : this.x.x, y: phone ? 0 : this.y.x, w: this.w, h: this.h };
      const T = this.to || home, F = this.from || T;
      const R = { x: lerp(F.x, T.x, px), w: lerp(F.w, T.w, px), y: lerp(F.y, T.y, py), h: lerp(F.h, T.h, py) };
      const sx = Math.max(R.w / this.w, 0.001), sy = Math.max(R.h / this.h, 0.001);
      this.put(frame, 'transform', `translate3d(${R.x - home.x}px, ${R.y - home.y}px, 0) scale(${sx}, ${sy})`);
      // The content keeps its own size: the frame's clip reveals it instead of squashing it.
      const cx = Math.max(sx, 0.05), cy = Math.max(sy, 0.05);
      this.put(chrome, 'transform', `scale(${1 / cx}, ${1 / cy})`);
      // Corners: icon radius at the origin, window radius at the end, undistorted by the scale.
      // Phone sheets keep 12 px corners while they move and square off as they land full-screen.
      const rEnd = phone ? 12 * clamp((1 - m) * 4, 0, 1) : RADIUS;
      const r0 = this.fade ? F.w * 0.225 : rEnd, r1 = this.to ? 12 : rEnd;
      this.put(frame, 'borderRadius', `${(lerp(r0, r1, px) / sx).toFixed(1)}px / ${(lerp(r0, r1, py) / sy).toFixed(1)}px`);
      // From an icon: the flight starts as the icon (the genie copy covers the frame) and cross-fades to the window
      // while the content fades in. Closing runs the same curve backwards, so it lands as the icon, never as a blank card.
      // The frame itself only fades over the last tenth, where it already looks like the icon it lands on.
      this.put(frame, 'opacity', this.fade ? clamp(Math.max(px, py) * 10, 0, 1).toFixed(3) : '');   // both axes home first
      // Exits keep the content up for longer (until about halfway home), so a closing window reads as a shrinking window.
      const [c0, c1, g0, g1] = this.state === 'open' ? [0.3, 0.7, 0.6, 0.3] : [0.12, 0.45, 0.42, 0.12];
      this.put(chrome, 'opacity', this.fade ? clamp((m - c0) / (c1 - c0), 0, 1).toFixed(3) : '');
      this.put(this.genie, 'opacity', this.fade ? clamp((g0 - m) / (g0 - g1), 0, 1).toFixed(3) : '');
    }

    settled() {
      if (this.docking) this.dockFlight(false);
      if (this.state !== 'open') {                           // fully shut: take it off the screen
        this.el.hidden = true;
        for (const n of [this.frame, this.chrome, this.genie]) {
          n.style.cssText = '';
          for (const k of Object.keys(n)) if (k[0] === '_') delete n[k];
        }
        this.el.style.transform = '';
        depth.set(this, 0);
        this.to = null;
        this.px.jump(0); this.py.jump(0);
      } else if (this.fit && !isPhone()) this.size();       // a thrown window gets a new height cap for where it landed
    }

    // ----- Desktop: drag by the title bar, throw, clamp -----
    bounds() {
      return { x0: 80 - this.w, x1: innerWidth - 80, y0: MENU, y1: innerHeight - 48 };
    }
    dragStart(e) {
      if (e.button !== 0 || e.target.closest('button, a')) return;
      e.preventDefault();
      const bar = this.titlebar, track = tracker();
      const ox = e.clientX - this.x.x, oy = e.clientY - this.y.x;
      bar.setPointerCapture(e.pointerId);
      track.push(e.clientX, e.clientY);
      const move = (ev) => {
        track.push(ev.clientX, ev.clientY);
        const b = this.bounds();
        this.x.jump(ev.clientX - ox);
        this.y.jump(clamp(ev.clientY - oy, b.y0, b.y1));       // never under the menu bar
        this.zoomed = false;
        this.render();
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        const v = reduced() ? { x: 0, y: 0 } : track.velocity(), b = this.bounds();
        // Project the throw 0.15 s ahead, keep it on screen, and let the spring carry the velocity.
        this.x.v = v.x; this.y.v = v.y;
        this.x.set(clamp(this.x.x + v.x * 0.15, b.x0, b.x1));
        this.y.set(clamp(this.y.x + v.y * 0.15, b.y0, b.y1));
        if (this.fit) this.size();                           // cap the height for where it will land, so the bottom stays reachable
        if (reduced()) { this.x.jump(this.x.to); this.y.jump(this.y.to); this.render(); } else this.run();
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    }
    resizeStart(e) {
      if (e.button !== 0 || isPhone()) return;
      e.preventDefault();
      const handle = e.currentTarget, sx = e.clientX, sy = e.clientY, w0 = this.w, h0 = this.h;
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        this.w = clamp(w0 + ev.clientX - sx, MIN_W, innerWidth - this.x.x - 8);
        this.h = clamp(h0 + ev.clientY - sy, MIN_H, innerHeight - this.y.x - 8);
        this.zoomed = false;
        this.fit = false;
        this.size();
      };
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    }
    reclamp() {
      if (this.state === 'closed') return;
      if (isPhone() || this.phone) { this.place(); this.render(); return; }   // phone, or just left phone layout
      const a = workArea();
      this.w = Math.min(this.w, a.w - 16); this.h = Math.min(this.h, a.h - 16);
      const b = this.bounds();
      this.x.jump(clamp(this.x.x, b.x0, b.x1)); this.y.jump(clamp(this.y.x, b.y0, b.y1));
      this.size(); this.render();
    }

    // ----- Phone: swipe the sheet down to dismiss -----
    swipeStart(e) {
      if (e.button !== 0 || e.target.closest('button, a') || this.state !== 'open') return;
      const bar = this.titlebar;
      bar.setPointerCapture(e.pointerId);
      const track = tracker(), y0 = e.clientY - this.drag.x;
      track.push(0, e.clientY);
      const move = (ev) => { track.push(0, ev.clientY); this.dragTo(ev.clientY - y0); };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        this.swipeEnd(track.velocity().y);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    }
    // From the content: only when it is scrolled to the top and the finger moves down.
    bodySwipe() {
      let y0 = 0, active = false, decided = false, track;
      this.body.addEventListener('touchstart', (e) => {
        if (!isPhone() || e.touches.length > 1) return;
        y0 = e.touches[0].clientY; active = false; decided = false; track = tracker();
      }, { passive: true });
      this.body.addEventListener('touchmove', (e) => {
        if (!isPhone() || decided && !active) return;
        const y = e.touches[0].clientY, dy = y - y0;
        if (!decided) {
          if (Math.abs(dy) < 6) return;
          decided = true; active = dy > 0 && this.body.scrollTop <= 0;
          if (!active) return;
          y0 = y;
        }
        e.preventDefault();
        track.push(0, y);
        this.dragTo(y - y0);
      }, { passive: false });
      const end = () => { if (active) { active = false; this.swipeEnd(track.velocity().y); } };
      this.body.addEventListener('touchend', end);
      this.body.addEventListener('touchcancel', end);
    }
    dragTo(d) {
      this.drag.jump(d >= 0 ? d : d / 4);                      // rubber band upwards
      this.render();
    }
    swipeEnd(vy) {
      const d = this.drag.x;
      if (d > this.h * 0.3 || (vy > 700 && d > 10)) {
        // Hand the dragged picture to the genie, then fly back to the icon.
        this.to = this.rectNow();
        this.drag.jump(0);
        this.render();
        this.close();
      } else {
        this.drag.v = vy;
        this.drag.set(0);
        if (reduced()) { this.drag.jump(0); this.render(); } else this.run();
      }
    }
  }

  // Name the frontmost open window in the menu bar.
  function frontmost() {
    const open = [...wins.values()].filter((w) => w.state === 'open').sort((a, b) => b.el.style.zIndex - a.el.style.zIndex);
    $$('.win.is-front').forEach((w) => w.classList.remove('is-front'));
    if (open[0]) { open[0].el.classList.add('is-front'); appName.textContent = open[0].name; }
    else appName.textContent = ownerName;
    syncVideos();
  }

  // ---------- Dock tiles for open and minimised windows ----------
  const dockTiles = {
    map: new Map(),
    tileOf(win) { return this.map.get(win)?.firstElementChild || null; },
    add(win, instant = false) {
      const old = this.map.get(win);
      if (old) { old.firstElementChild.classList.remove('tile--min'); return; }
      const li = document.createElement('li');
      li.className = instant ? 'is-run' : 'is-run is-entering';
      li.innerHTML = `<button class="tile tile--run" type="button" aria-label="${win.name}">${$('.icon', win.app).outerHTML}<span class="tile__label" aria-hidden="true">${win.name}</span></button>`;
      li.firstElementChild.addEventListener('click', (e) => win.open(win.state === 'min' ? li.firstElementChild : win.app, { kbd: e.detail === 0 }));
      if (instant) { dockList.append(li); dock.classList.add('has-running'); } else this.flip(() => dockList.append(li));
      this.map.set(win, li);
      if (!instant) requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('is-entering')));
    },
    remove(win) {
      const li = this.map.get(win);
      if (!li) return;
      this.map.delete(win);
      if (reduced()) { this.flip(() => li.remove()); return; }
      li.classList.add('is-entering');
      setTimeout(() => this.flip(() => li.remove()), 140);
    },
    // FLIP: the dock and its tiles glide to their new places instead of jumping.
    flip(change) {
      const items = $$(':scope > li', dockList).filter((li) => !li.classList.contains('is-entering'));
      const before = new Map(items.map((li) => [li, li.getBoundingClientRect().left]));
      const w0 = dockList.offsetWidth;
      change();
      dock.classList.toggle('has-running', $$('.is-run', dockList).length > 0);
      if (reduced()) return;
      const w1 = dockList.offsetWidth;
      for (const [li, x0] of before) {
        if (!li.isConnected) continue;
        const dx = x0 - li.getBoundingClientRect().left;
        if (!dx) continue;
        li.style.transition = 'none';
        li.style.transform = `translateX(${dx}px)`;
      }
      dockList.style.setProperty('--from', w1 ? String(w0 / w1) : '1');
      dockList.classList.add('is-flipping');
      dockList.offsetWidth;                                  // commit the inverted state
      for (const li of before.keys()) { li.style.transition = ''; li.style.transform = ''; }
      dockList.classList.remove('is-flipping');
    },
  };

  // ---------- Icons: a plain click opens the window; modified clicks navigate ----------
  for (const app of $$('.app')) {
    const win = new Win(app);
    wins.set(win.slug, win);
    for (const type of ['pointerenter', 'pointerdown', 'focus']) app.addEventListener(type, () => win.warm(), { passive: true });
    app.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      win.open(win.state === 'min' ? dockTiles.tileOf(win) : app, { kbd: e.detail === 0 });   // detail 0: Enter, not a click
    });
  }

  // Esc closes the frontmost window.
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = [...wins.values()].filter((w) => w.state === 'open').sort((a, b) => b.el.style.zIndex - a.el.style.zIndex);
    if (open[0]) { e.preventDefault(); open[0].el.focus({ preventScroll: true }); open[0].close(); }
  });

  // Keep windows on screen when the viewport changes; switch window/sheet at the breakpoint.
  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => wins.forEach((w) => w.reclamp()));
  });
  phoneMQ.addEventListener('change', () => {
    const anyOpen = [...wins.values()].some((w) => w.state === 'open');
    background.forEach((n) => (n.inert = isPhone() && anyOpen));
    wins.forEach((w) => { if (w.state !== 'closed') w.modal(); });
    if (!isPhone()) wins.forEach((w) => depth.set(w, 0));
  });

  // ---------- Clock: Exeter time, on the minute ----------
  const clock = $('#clock');
  const fmtDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' });
  const fmtTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/London' });
  function tick() {
    const now = new Date();
    $('.clock__date', clock).textContent = fmtDate.format(now).replace(',', '');
    $('.clock__time', clock).textContent = fmtTime.format(now);
    clock.dateTime = now.toISOString();
    setTimeout(tick, 60000 - (now.getTime() % 60000) + 20);
  }
  tick();

  // ---------- First window: ?open=<slug>, else ExeTix on a wide desktop ----------
  const wanted = new URLSearchParams(location.search).get('open');
  // ExeTix opens only where it fits between the name and the icons, so it never covers the name.
  // Same maths as place(): the window's left edge must clear the name.
  const roomy = !isPhone() && launcherLeft() - 560 >= $('.hello h1').getBoundingClientRect().right + 24;
  const first = wins.get(wanted) || (roomy ? wins.get('exetix') : null);
  if (first) first.open(first.app, { focus: !!wanted, instant: true });
})();
