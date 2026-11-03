/* Canvas camera.
   The world (#plane) moves under a fixed viewport. The camera is the world point
   (cx, cy) shown at the centre of the screen, at zoom s.
   All motion runs in one rAF loop: a spring for flights and zooms, exponential
   decay for momentum. Any new input interrupts and keeps the current position. */
(() => {
  'use strict';

  const html = document.documentElement;
  const view = document.getElementById('viewport');
  const plane = document.getElementById('plane');
  const nameEl = plane.querySelector('.name');
  const cards = [...plane.querySelectorAll('.card')];
  const dotsEl = view.querySelector('.dots');
  const miniEl = document.querySelector('.mini');
  const brand = document.querySelector('.brand-pill');
  const pct = document.querySelector('.zoom .pct');
  const topBar = document.querySelector('.top');
  const honesty = document.querySelector('.honesty');
  const zoomPill = document.querySelector('.zoom');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const MIN_S = 0.2, MAX_S = 2.5;
  const READ_S = 0.85;             // below this the smallest qualifier drops under 11px on screen
  const FLY = { k: 180, c: 26 };   // camera spring, near critical: settles with no visible bounce
  const ZOOM = { k: 400, c: 40 };  // wheel and button zoom, critically damped (brief: spring-snappy)
  const DECAY = 0.42;              // momentum time constant in seconds (iOS-like deceleration)

  const clampS = (s) => Math.min(MAX_S, Math.max(MIN_S, s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const phone = () => vw < 600;

  let vw = innerWidth, vh = innerHeight, dpr = 1;
  const cam = { cx: 0, cy: 0, s: 1 };

  /* ---------- geometry (world units, cached: offsets ignore transforms) ---------- */
  let rects = [], nameRect = null, bounds = null;
  function measure() {
    rects = cards.map((el) => ({
      el, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.querySelector('.face').offsetHeight,
      more: el.querySelector('.more').offsetHeight, label: el.querySelector('.label'), lw: el.querySelector('.label').offsetWidth,
      ring: el.querySelector('.ring'), dy: 0, lh: el.querySelector('.label').offsetHeight + 6,  // room above the card for its label
    }));
    const w = nameEl.offsetWidth, h = nameEl.offsetHeight;
    nameRect = { x: nameEl.offsetLeft - w / 2, y: nameEl.offsetTop - h / 2, w, h, dy: 0 };
    let x0 = nameRect.x, y0 = nameRect.y, x1 = x0 + w, y1 = y0 + h;
    for (const r of rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y - r.lh); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
    bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    lastS = 0;
    if (sel) push(sel);
  }
  const rectOf = (el) => rects.find((r) => r.el === el);
  const union = (list) => {
    const x0 = Math.min(...list.map((b) => b.x)), y0 = Math.min(...list.map((b) => b.y));
    return { x: x0, y: y0, w: Math.max(...list.map((b) => b.x + b.w)) - x0, h: Math.max(...list.map((b) => b.y + b.h)) - y0 };
  };
  const cardBox = (r, withMore) => ({ x: r.x, y: r.y - r.lh, w: r.w, h: r.lh + r.h + (withMore ? 12 + r.more : 0) });
  const pad = (b, p) => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p });

  // Screen area the content may use: between the real top bar and the real footer, on every breakpoint.
  function usable() {
    let top = 0;
    for (const el of topBar.children) top = Math.max(top, el.getBoundingClientRect().bottom);
    let bottom = honesty.getBoundingClientRect().top;
    if (zoomPill.offsetParent) bottom = Math.min(bottom, zoomPill.getBoundingClientRect().top);
    return { top: top + 8, bottom: bottom - 8, left: 16, right: vw - 16 };
  }

  // Camera that fits a world box into the usable area, never below `minS`.
  // If the box is then taller than the screen, its top edge is kept in view (read from the top down).
  function fit(box, maxS, minS = MIN_S) {
    const u = usable(), uw = u.right - u.left, uh = u.bottom - u.top;
    const s = clampS(clamp(Math.min(uw / box.w, uh / box.h), Math.min(minS, maxS), maxS));
    const cy = box.h * s > uh
      ? box.y + (vh / 2 - u.top) / s
      : box.y + box.h / 2 - ((u.top + u.bottom) / 2 - vh / 2) / s;
    return { cx: box.x + box.w / 2 - ((u.left + u.right) / 2 - vw / 2) / s, cy, s };
  }

  function cardCam(card) {
    return fit(pad(cardBox(rectOf(card), true), 16), phone() ? 1.1 : 1.05, phone() ? 0.9 : READ_S);
  }
  // One home everywhere (load, brand pill, Escape, 0, the zoom readout): the name and its nearest cards,
  // at a zoom where every qualifier is readable. On a phone: the name and ExeTix.
  function homeCam() {
    const list = [nameRect, ...rects.filter((r) => phone() ? r.el.dataset.home === 'phone' : r.el.hasAttribute("data-home")).map((r) => cardBox(r))];
    return fit(pad(union(list), phone() ? 12 : 16), 1, phone() ? 0.9 : READ_S);
  }

  /* ---------- push: an open panel moves the objects below it out of the way ---------- */
  function push(card) {
    const objs = [...rects.map((r) => ({ r, el: r.el, top: r.y - r.lh })), { r: nameRect, el: nameEl, top: nameRect.y }];
    let below = [];
    if (card) {
      const s = rectOf(card), x0 = s.x - 24, x1 = s.x + s.w + 24;
      below = objs.filter((o) => o.el !== card && o.r.x < x1 && o.r.x + o.r.w > x0 && o.top > s.y);
      const first = Math.min(...below.map((o) => o.top));
      const shift = Math.max(0, s.y + s.h + 12 + s.more + 48 - first);
      for (const o of below) o.r.dy = shift;
    }
    for (const o of objs) {
      if (!below.includes(o)) o.r.dy = 0;
      const v = String(Math.round(o.r.dy));
      if (o.el.style.getPropertyValue('--push') !== v) o.el.style.setProperty('--push', v);
    }
  }

  /* ---------- render ---------- */
  let raf = 0, last = 0, dirty = false, restTimer = 0, brandHidden = true, lastS = 0, moving = false, pctText = '';
  const dots = dotsEl.getContext('2d'), mini = miniEl.getContext('2d');
  let colors = {};
  function readColors() {
    const cs = getComputedStyle(html);
    colors = { dot: cs.getPropertyValue('--dot').trim(), ink: cs.getPropertyValue('--ink').trim(), accent: cs.getPropertyValue('--accent').trim() };
    tileKey = '';
  }

  function render() {
    dirty = false;
    const s = cam.s, tx = vw / 2 - cam.cx * s, ty = vh / 2 - cam.cy * s;
    plane.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
    // Zoom-dependent styles are written only when the zoom changes, and only on the few elements
    // that need them, so a pan restyles nothing.
    if (s !== lastS) {
      lastS = s;
      for (const r of rects) r.label.style.transform = `scale(${Math.min(1 / s, r.w / Math.max(1, r.lw))})`;
      if (sel) rectOf(sel).ring.style.setProperty('--inv', 1 / s);
      const t = Math.round(s * 100) + '%';
      if (t !== pctText) pct.textContent = pctText = t;
    }
    // will-change only while moving, so text re-rasterises crisp at rest
    if (!moving) { moving = true; plane.classList.add('moving'); }
    clearTimeout(restTimer);
    restTimer = setTimeout(() => { moving = false; plane.classList.remove('moving'); }, 160);
    drawDots(tx, ty, s);
    drawMini();
    // the small name in the top bar appears once the big one has mostly left the screen
    const n = nameRect, nx0 = (n.x - cam.cx) * s + vw / 2, ny0 = (n.y + n.dy - cam.cy) * s + vh / 2;
    const ix = Math.max(0, Math.min(vw, nx0 + n.w * s) - Math.max(0, nx0));
    const iy = Math.max(0, Math.min(vh, ny0 + n.h * s) - Math.max(64, ny0));
    const hide = (ix * iy) / (n.w * n.h * s * s) > 0.3;
    if (hide !== brandHidden) { brandHidden = hide; brand.toggleAttribute('data-hidden', hide); }
  }

  // Dot grid: one pre-drawn tile, filled as a pattern (two calls a frame).
  // Constant dot size; spacing doubles as you zoom out, the in-between dots fade in as they spread.
  const tile = document.createElement('canvas'), tctx = tile.getContext('2d');
  let pattern = null, tileKey = '';
  function drawDots(tx, ty, s) {
    let step = 24 * s;
    while (step < 14) step *= 2;
    const fade = Math.round(clamp((step - 14) / 14, 0, 1) * 32) / 32;
    const N = Math.max(4, Math.round(2 * step * dpr)), k = (2 * step * dpr) / N;
    const size = Math.max(1, Math.round(1.4 * dpr)), h = N / 4;
    const key = N + '|' + fade + '|' + size + '|' + colors.dot;
    if (key !== tileKey) {
      tileKey = key;
      tile.width = tile.height = N;
      tctx.fillStyle = colors.dot;
      const at = (x, y) => tctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      at(h, h);
      if (fade > 0) { tctx.globalAlpha = fade; at(h + N / 2, h); at(h, h + N / 2); at(h + N / 2, h + N / 2); tctx.globalAlpha = 1; }
      pattern = dots.createPattern(tile, 'repeat');
    }
    const period = N * k, ox = (((tx * dpr - h * k) % period) + period) % period, oy = (((ty * dpr - h * k) % period) + period) % period;
    pattern.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
    dots.clearRect(0, 0, dotsEl.width, dotsEl.height);
    dots.fillStyle = pattern;
    dots.fillRect(0, 0, dotsEl.width, dotsEl.height);
  }

  // Minimap: the whole world, the cards, and the part you are looking at.
  let miniMap = null, miniTimer = 0;
  function drawMini() {
    const W = miniEl.width, H = miniEl.height;
    if (!W || !H) return;
    const b = pad(bounds, 80);
    const m = Math.min(W / b.w, H / b.h), ox = (W - b.w * m) / 2 - b.x * m, oy = (H - b.h * m) / 2 - b.y * m;
    miniMap = { m: m / dpr, ox: ox / dpr, oy: oy / dpr };
    mini.clearRect(0, 0, W, H);
    mini.fillStyle = colors.ink;
    mini.globalAlpha = 0.5;
    mini.fillRect(nameRect.x * m + ox, (nameRect.y + nameRect.dy) * m + oy, nameRect.w * m, nameRect.h * m);
    for (const r of rects) {
      mini.globalAlpha = r.el === sel ? 1 : 0.2;
      mini.fillStyle = r.el === sel ? colors.accent : colors.ink;
      mini.fillRect(r.x * m + ox, (r.y + r.dy) * m + oy, r.w * m, r.h * m);
    }
    const vx = (cam.cx - vw / 2 / cam.s) * m + ox, vy = (cam.cy - vh / 2 / cam.s) * m + oy;
    const rw = (vw / cam.s) * m, rh = (vh / cam.s) * m;
    if (vx <= 0 && vy <= 0 && vx + rw >= W && vy + rh >= H) return;  // the view covers the whole map: nothing to show
    mini.globalAlpha = 0.1; mini.fillStyle = colors.accent;
    mini.fillRect(vx, vy, rw, rh);
    mini.globalAlpha = 1; mini.strokeStyle = colors.accent; mini.lineWidth = 1.5 * dpr;
    mini.strokeRect(vx, vy, rw, rh);
  }
  // Shown while the camera moves under your hand, gone 0.9 s after it stops.
  function showMini() {
    if (!miniEl.classList.contains('show')) miniEl.classList.add('show');
    clearTimeout(miniTimer);
    miniTimer = setTimeout(() => { if (!miniDown) miniEl.classList.remove('show'); }, 900);
  }

  function resize() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    dotsEl.width = Math.round(vw * dpr); dotsEl.height = Math.round(vh * dpr);
    miniEl.width = Math.round(miniEl.offsetWidth * dpr); miniEl.height = Math.round(miniEl.offsetHeight * dpr);
    tileKey = '';
    measure();
    // Until someone moves the camera, keep the opening view framed for the current window size.
    if (!touched && rects.length) {
      const target = sel ? cardCam(sel) : homeCam();
      if (mode === 'fly') go(target); else Object.assign(cam, target);
    }
    invalidate();
  }
  let touched = false;
  for (const t of ['pointerdown', 'wheel', 'keydown', 'gesturestart']) addEventListener(t, () => { touched = true; }, { capture: true, passive: true });

  /* ---------- motion ---------- */
  let mode = 'idle';                                       // idle | fly | zoom | coast
  const fly = { cx: 0, cy: 0, z: 0, vx: 0, vy: 0, vz: 0, hop: null, d0: 0 };
  const zm = { px: 0, py: 0, wx: 0, wy: 0, z: 0, vz: 0 };   // zoom around a fixed screen point
  const coast = { vx: 0, vy: 0 };                          // screen px per second

  function invalidate() { dirty = true; kick(); }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(t) {
    raf = 0;
    const dt = last && t - last < 100 ? (t - last) / 1000 : 1 / 60;
    last = t;
    let running = false;
    if (mode === 'fly') running = stepFly(Math.min(dt, 1 / 30));
    else if (mode === 'zoom') running = stepZoom(Math.min(dt, 1 / 30));
    else if (mode === 'coast') running = stepCoast(dt);
    if (dirty) render();
    if (running) kick();
    else if (mode !== 'idle') { const was = mode; mode = 'idle'; last = 0; if (was === 'coast') settleBounds(); }
  }

  // Stop whatever is moving, keep the camera where it is.
  function stop() { mode = 'idle'; fly.vx = fly.vy = fly.vz = 0; }

  function go(target, instant) {
    if (instant || reduce.matches) { stop(); Object.assign(cam, target); invalidate(); return; }
    const z = Math.log(cam.s), tz = Math.log(target.s);
    if (mode === 'coast') { fly.vx = -coast.vx / cam.s; fly.vy = -coast.vy / cam.s; fly.vz = 0; }  // carry the flick
    else if (mode !== 'fly') { fly.vx = fly.vy = fly.vz = 0; }                                    // a retarget keeps velocity
    fly.cx = target.cx; fly.cy = target.cy; fly.z = tz;
    // Long trips zoom out a little on the way, so you see where you are going.
    const d = Math.hypot(target.cx - cam.cx, target.cy - cam.cy);
    const hopS = (Math.min(vw, vh) * 0.9) / Math.max(d, 1);
    fly.d0 = d;
    fly.hop = d * cam.s > Math.max(vw, vh) * 0.9 && Math.log(hopS) < Math.min(z, tz) - 0.05 ? Math.log(hopS) : null;
    mode = 'fly';
    kick();
  }

  function spring(x, v, target, k, c, dt) {
    v += (-k * (x - target) - c * v) * dt;
    return [x + v * dt, v];
  }

  function stepFly(dt) {
    if (fly.hop !== null && Math.hypot(fly.cx - cam.cx, fly.cy - cam.cy) < fly.d0 * 0.5) fly.hop = null;
    let z = Math.log(cam.s);
    [cam.cx, fly.vx] = spring(cam.cx, fly.vx, fly.cx, FLY.k, FLY.c, dt);
    [cam.cy, fly.vy] = spring(cam.cy, fly.vy, fly.cy, FLY.k, FLY.c, dt);
    [z, fly.vz] = spring(z, fly.vz, fly.hop ?? fly.z, FLY.k, FLY.c, dt);
    cam.s = clampS(Math.exp(z));
    dirty = true;
    const near = Math.abs(fly.cx - cam.cx) * cam.s < 0.3 && Math.abs(fly.cy - cam.cy) * cam.s < 0.3 && Math.abs(fly.z - z) < 0.001;
    const slow = Math.hypot(fly.vx, fly.vy) * cam.s < 2 && Math.abs(fly.vz) < 0.01;
    if (fly.hop === null && near && slow) { cam.cx = fly.cx; cam.cy = fly.cy; cam.s = Math.exp(fly.z); return false; }
    return true;
  }

  function zoomBy(factor, px, py, instant) {
    showMini();
    const startZ = mode === 'zoom' ? zm.z : Math.log(cam.s);
    const z = Math.log(clampS(Math.exp(startZ) * factor));
    if (instant || reduce.matches) {
      stop();
      const s = Math.exp(z), wx = cam.cx + (px - vw / 2) / cam.s, wy = cam.cy + (py - vh / 2) / cam.s;
      cam.s = s; cam.cx = wx - (px - vw / 2) / s; cam.cy = wy - (py - vh / 2) / s;
      invalidate(); return;
    }
    if (mode !== 'zoom') zm.vz = 0;
    zm.px = px; zm.py = py;
    zm.wx = cam.cx + (px - vw / 2) / cam.s; zm.wy = cam.cy + (py - vh / 2) / cam.s;
    zm.z = z; mode = 'zoom'; kick();
  }

  function stepZoom(dt) {
    let z = Math.log(cam.s);
    [z, zm.vz] = spring(z, zm.vz, zm.z, ZOOM.k, ZOOM.c, dt);
    const s = cam.s = Math.exp(z);
    cam.cx = zm.wx - (zm.px - vw / 2) / s; cam.cy = zm.wy - (zm.py - vh / 2) / s;  // the point under the cursor stays put
    dirty = true;
    if (Math.abs(zm.z - z) < 0.0005 && Math.abs(zm.vz) < 0.005) { cam.s = Math.exp(zm.z); cam.cx = zm.wx - (zm.px - vw / 2) / cam.s; cam.cy = zm.wy - (zm.py - vh / 2) / cam.s; return false; }
    return true;
  }

  function stepCoast(dt) {
    const out = outside();
    const decay = Math.exp(-dt / (out ? 0.08 : DECAY));  // past the edge it brakes hard, then springs back
    cam.cx -= (coast.vx * dt) / cam.s; cam.cy -= (coast.vy * dt) / cam.s;
    coast.vx *= decay; coast.vy *= decay;
    dirty = true;
    showMini();
    return Math.hypot(coast.vx, coast.vy) > 12;
  }

  // The screen centre may roam over the content and a little beyond; past that it springs back.
  function limits() { const b = pad(bounds, 120); return { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }; }
  function outside() { const l = limits(); return cam.cx < l.x0 || cam.cx > l.x1 || cam.cy < l.y0 || cam.cy > l.y1; }
  function settleBounds() {
    if (!outside()) return;
    const l = limits();
    go({ cx: clamp(cam.cx, l.x0, l.x1), cy: clamp(cam.cy, l.y0, l.y1), s: cam.s });
  }

  /* ---------- selection (part of history: Back closes the card) ---------- */
  let sel = null, before = null;
  const fromHash = () => cards.find((c) => '#' + c.id === decodeURIComponent(location.hash)) || null;
  function select(card, { flyTo = true, focus = false, instant = false, hist = true } = {}) {
    if (card !== sel) {
      const prev = sel;
      if (prev) { prev.classList.remove('sel'); video(prev, false); }
      sel = card;
      html.classList.toggle('picked', !!card);
      if (card) {
        card.classList.add('sel'); video(card, true);
        const r = rectOf(card); r.lw = r.label.offsetWidth;  // the selected label is bolder
      }
      push(card);
      lastS = 0;
      if (hist) {
        const path = location.pathname + location.search;
        if (!prev && card) { before = { ...cam }; history.pushState({ cv: 1 }, '', '#' + card.id); }
        else if (card) history.replaceState(history.state, '', '#' + card.id);
        else if (history.state && history.state.cv) history.back();
        else history.replaceState(null, '', path);
      }
      invalidate();
    }
    if (card && focus) card.querySelector('.label a').focus({ preventScroll: true });
    if (card && flyTo) go(cardCam(card), instant);
  }
  // Close the open card and go back to where you were before you opened it.
  function close(opts) {
    const back = before;
    before = null;
    select(null, opts);
    go(back || homeCam());
  }
  function onHistory() {
    const card = fromHash();
    if (card === sel) return;
    if (card) select(card, { hist: false });
    else close({ hist: false });
  }
  addEventListener('popstate', onHistory);
  addEventListener('hashchange', onHistory);

  // Cards with a demo video play it while selected. Never with reduced motion.
  function video(card, on) {
    const shot = card.querySelector('.shot[data-video]');
    if (!shot) return;
    let v = shot.querySelector('video');
    if (!on) { if (v) { v.pause(); v.classList.remove('on'); } return; }
    if (reduce.matches) return;
    if (!v) {
      const img = shot.querySelector('img');
      v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', poster: img.currentSrc || img.src, src: shot.dataset.video });
      v.setAttribute('aria-hidden', 'true');
      v.addEventListener('playing', () => { if (card === sel) v.classList.add('on'); });
      shot.appendChild(v);
    }
    v.play().catch(() => {});
  }

  // Arrow keys: the nearest card in that direction, inside a wide cone.
  function nearest(dx, dy) {
    const o = sel ? rectOf(sel) : null;
    const ox = o ? o.x + o.w / 2 : cam.cx, oy = o ? o.y + o.h / 2 : cam.cy;
    let best = null, score = Infinity;
    for (const r of rects) {
      if (r.el === sel) continue;
      const x = r.x + r.w / 2 - ox, y = r.y + r.h / 2 - oy;
      const along = x * dx + y * dy, across = Math.abs(x * dy - y * dx);
      if (along <= 20 || across > along * 2) continue;
      const sc = along + across * 1.5;
      if (sc < score) { score = sc; best = r.el; }
    }
    return best;
  }

  /* ---------- input ---------- */
  const pts = new Map();
  let drag = null, pinch = null, suppressClick = false, pressSel = null, wheelTimer = 0;

  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // let mouse users select text in the detail panel
    if (e.pointerType === 'mouse' && e.target.closest('.sel .more')) return;
    // A press catches a coasting canvas. A flight keeps going until the press becomes a drag,
    // so clicking another card mid-flight retargets with the velocity it already has.
    if (mode === 'coast') stop();
    suppressClick = false;
    pressSel = sel;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, type: e.pointerType, samples: [[e.timeStamp, e.clientX, e.clientY]] };
    else if (pts.size === 2) startPinch();
  });

  view.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (pinch) { movePinch(); return; }
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < (drag.type === 'mouse' ? 4 : 8)) return;
      drag.moved = true;
      stop();
      view.setPointerCapture(e.pointerId);
      view.classList.add('grabbing');
    }
    let dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (outside()) { dx *= 0.35; dy *= 0.35; }  // rubber band past the edge
    cam.cx -= dx / cam.s; cam.cy -= dy / cam.s;
    drag.samples.push([e.timeStamp, e.clientX, e.clientY]);
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 100) drag.samples.shift();
    showMini();
    invalidate();
  });

  function endPointer(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    view.classList.remove('grabbing');
    if (pinch) {
      if (pts.size >= 2) return;
      pinch = null; suppressClick = true;
      const rest = [...pts][0];
      // one finger left: keep panning with it
      drag = rest ? { id: rest[0], x0: rest[1].x, y0: rest[1].y, x: rest[1].x, y: rest[1].y, moved: true, type: 'touch', samples: [] } : null;
      if (!rest) settleBounds();
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.moved) { suppressClick = true; release(drag.samples, e.timeStamp); }
    drag = null;
  }
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);

  // Hand a flick over to momentum.
  function release(samples, now) {
    const recent = samples.filter((s) => now - s[0] < 80);
    if (reduce.matches || recent.length < 2) return settleBounds();
    const a = recent[0], b = recent[recent.length - 1], t = (b[0] - a[0]) / 1000;
    if (t <= 0) return settleBounds();
    coast.vx = clamp((b[1] - a[1]) / t, -5000, 5000);
    coast.vy = clamp((b[2] - a[2]) / t, -5000, 5000);
    if (Math.hypot(coast.vx, coast.vy) < 80) return settleBounds();
    mode = 'coast'; kick();
  }

  function startPinch() {
    const [a, b] = [...pts.values()];
    const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: cam.s, wx: cam.cx + (c.x - vw / 2) / cam.s, wy: cam.cy + (c.y - vh / 2) / cam.s };
    drag = null; suppressClick = true;
    stop();
  }
  function movePinch() {
    const [a, b] = [...pts.values()];
    const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const s = clampS(pinch.s0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0);
    // the world point that started under the fingers stays under them
    cam.s = s; cam.cx = pinch.wx - (c.x - vw / 2) / s; cam.cy = pinch.wy - (c.y - vh / 2) / s;
    showMini();
    invalidate();
  }

  // Trackpad: two fingers pan, pinch zooms (it arrives as ctrl+wheel). Mouse: wheel pans, ctrl/cmd+wheel zooms.
  // On window, so a pinch over the chrome (minimap, zoom pill) never zooms the browser page.
  addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
    const dx = e.deltaX * unit, dy = e.deltaY * unit;
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaMode === 0 && Math.abs(dy) < 50) zoomBy(Math.exp(-dy * 0.01), e.clientX, e.clientY, true);
      else zoomBy(Math.exp(-Math.sign(dy) * Math.min(Math.abs(dy), 200) * 0.0022), e.clientX, e.clientY, false);
    } else {
      stop();
      cam.cx += dx / cam.s; cam.cy += dy / cam.s;
      showMini();
      invalidate();
    }
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { if (mode === 'idle') settleBounds(); }, 180);
  }, { passive: false });

  // Safari (macOS trackpad) reports pinch as gesture events with e.scale, not ctrl+wheel.
  // iOS fires them during a touch pinch too; the pointer pinch already handles that.
  let gestureScale = 1;
  document.addEventListener('gesturestart', (e) => { e.preventDefault(); gestureScale = 1; });
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (pts.size || !e.scale) return;
    zoomBy(e.scale / gestureScale, e.clientX, e.clientY, true);
    gestureScale = e.scale;
  });
  document.addEventListener('gestureend', (e) => e.preventDefault());

  // Clicks: first press on a card selects it and flies there; once selected, links work
  // and a press on the card opens it. Modifier clicks and keyboard activation never get in the way.
  view.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    const card = e.target.closest('.card'), link = e.target.closest('a');
    if (!card) { if (sel && !link) select(null); return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || e.detail === 0) return;
    if (card !== pressSel) { e.preventDefault(); select(card); return; }
    if (link || !e.target.closest('.face')) return;
    location.href = card.querySelector('.label a').href;
  }, true);

  // Tab moves the camera too: the focused card is always on screen.
  plane.addEventListener('focusin', (e) => {
    const card = e.target.closest('.card');
    if (card && card !== sel) select(card);
  });

  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (dir) {
      e.preventDefault();
      const next = nearest(dir[0], dir[1]);
      if (next) select(next, { focus: true });
      return;
    }
    if (e.key === 'Escape') {
      if (plane.contains(document.activeElement)) document.activeElement.blur();
      if (sel) close(); else go(homeCam());
    }
    else if (e.key === '+' || e.key === '=') zoomBy(1.25, vw / 2, vh / 2);
    else if (e.key === '-' || e.key === '_') zoomBy(0.8, vw / 2, vh / 2);
    else if (e.key === '0') { if (sel) select(null); go(homeCam()); }
  });

  zoomPill.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.zoom === 'in') zoomBy(1.25, vw / 2, vh / 2);
    else if (b.dataset.zoom === 'out') zoomBy(0.8, vw / 2, vh / 2);
    else { if (sel) select(null); go(homeCam()); }
  });

  // The name in the top bar flies home instead of reloading.
  brand.querySelector('a').addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); if (sel) select(null); go(homeCam());
  });

  // Minimap: press to fly there, drag to scrub.
  let miniDown = false;
  const miniToWorld = (e) => {
    const r = miniEl.getBoundingClientRect();
    return { cx: (e.clientX - r.left - miniMap.ox) / miniMap.m, cy: (e.clientY - r.top - miniMap.oy) / miniMap.m };
  };
  miniEl.addEventListener('pointerdown', (e) => {
    if (!miniMap) return;
    miniDown = true; miniEl.setPointerCapture(e.pointerId);
    showMini();
    go({ ...miniToWorld(e), s: cam.s });
  });
  miniEl.addEventListener('pointermove', (e) => {
    if (!miniDown) return;
    stop(); Object.assign(cam, miniToWorld(e)); showMini(); invalidate();
  });
  const miniUp = () => { if (miniDown) { miniDown = false; showMini(); settleBounds(); } };
  miniEl.addEventListener('pointerup', miniUp);
  miniEl.addEventListener('pointercancel', miniUp);

  /* ---------- housekeeping ---------- */
  addEventListener('resize', resize);
  // The viewport clips, but a focused element must never scroll the page under the camera.
  addEventListener('scroll', () => { if (scrollX || scrollY) scrollTo(0, 0); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); invalidate(); });
  document.addEventListener('visibilitychange', () => { if (sel) video(sel, !document.hidden); });
  // Images set card heights; re-measure once they arrive.
  for (const img of plane.querySelectorAll('img')) if (!img.complete) img.addEventListener('load', () => { measure(); invalidate(); }, { once: true });
  // Web fonts or late layout: measure again once everything has loaded.
  addEventListener('load', resize, { once: true });

  /* ---------- start ---------- */
  readColors();
  resize();
  const deep = fromHash();
  if (deep) select(deep, { instant: true, hist: false });
  else {
    const home = homeCam();
    // One settle on arrival: the canvas starts a touch further out and springs into place.
    // Everything is visible from the first frame; with reduced motion it simply starts at home.
    if (reduce.matches) Object.assign(cam, home);
    else { Object.assign(cam, { ...home, s: home.s * 0.9 }); go(home); }
  }
  render();

  // Test hook for the concept's own checks (read-only).
  window.__canvas = { cam, homeCam, usable, rects: () => rects, nameRect: () => nameRect };
})();
