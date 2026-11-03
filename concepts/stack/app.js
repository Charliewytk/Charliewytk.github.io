// Stack: one deck of project cards, driven by small interruptible springs.
//
//   fan   (wide screens)  a fanned hand. Each card's index sits in the strip the next card leaves
//                         visible, so the hand reads at rest. Pointing at a strip picks that card up
//                         (on top, fully visible). Click, or pull it up, brings it to the centre and
//                         turns it over. Esc, click outside, or drag it away puts it back.
//   stack (otherwise)     a deck. Swipe the top card off and it tucks under the deck.
//                         Tap to turn it over. The dots jump to a card.
//
// Every card has one spring per property (x, y, r, s, f, lift, tx, ty). Changing a target
// keeps the current velocity, so any motion can be grabbed or reversed mid-flight.
// The finger owns x/y (and r on the deck) while dragging, 1:1; on release its velocity seeds the springs.
//
// Keyboard: the deck is one tab stop (roving tabindex). Arrows move between cards,
// Enter / Space turns the card over, Esc turns it back.

(() => {
  'use strict';

  const root = document.documentElement;
  const stage = document.querySelector('.stage');
  const deck = document.querySelector('.deck');
  const dots = [...document.querySelectorAll('.dots button')];
  const wideMQ = matchMedia('(min-width: 1280px) and (min-height: 640px)');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  // ---------- springs ----------
  // [stiffness, damping], mass 1. k400 c30 is the site's "bouncy" spring (motion-brief §1).
  const TUNE = {
    x: [400, 30], y: [400, 30], r: [400, 30], s: [500, 30],   // s settles with a small overshoot
    f: [260, 25],            // the flip: a touch softer so the turn reads
    lift: [400, 40], tx: [300, 30], ty: [300, 30],
  };
  const EPS = { s: 1e-4, lift: 1e-3 };

  const cards = [...deck.querySelectorAll('.card')].map((el, i) => {
    const sp = {};
    for (const p in TUNE) sp[p] = { x: p === 's' ? 1 : 0, v: 0, t: p === 's' ? 1 : 0, k: TUNE[p][0], c: TUNE[p][1] };
    const front = el.querySelector('.front');
    const title = front.querySelector('h2 a');
    if (title) title.tabIndex = -1;   // the front is one control: the turn button
    const back = el.querySelector('.back');
    const glow = document.createElement('span');   // the open card's highlight, moved by transform
    glow.className = 'glow';
    glow.setAttribute('aria-hidden', 'true');
    back.prepend(glow);
    return {
      el, i, sp, front, back, glow,
      inner: el.querySelector('.inner'),
      turn: front.querySelector('.turn'),
      rest: el.querySelector('.shadow-rest'),
      lift: el.querySelector('.shadow-lift'),
      seed: (((i * 7) % 5) - 2) * 0.9, // small fixed tilt so the deck looks hand-stacked
      flipped: false,
      thrown: 0,        // -1 / 1 while flying off the deck, 0 otherwise
      returning: false, // fan: on its way back into the hand, stay on top until it lands
      held: false,      // the finger owns x / y (and r on the deck)
      press: false,
    };
  });
  const N = cards.length;

  let mode = 'stack';
  let top = 0;        // stack: index of the card on top
  let hovered = -1;   // fan: the picked-up card; -1 = the hand rests, every index visible
  let cur = 0;        // fan: the card that holds the deck's tab stop
  let open = null;    // fan: the card turned over in the centre
  let drag = null;
  let geo = null;     // fan geometry, cached per layout size
  let cardW = 0, cardH = 0;
  let suppressClick = false;
  let dotTop = -1;
  let touched = false;

  let raf = 0, last = 0;
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function tick(t) {
    // Integrate in small fixed substeps, so motion stays time-correct even when frames are dropped.
    const dt = Math.min((t - (last || t)) / 1000, 0.25);
    const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
    last = t;
    let busy = false;
    for (const c of cards) {
      let moved = c.dirty;
      for (const p in c.sp) {
        const s = c.sp[p];
        if (c.held && (p === 'x' || p === 'y' || (p === 'r' && mode === 'stack'))) continue;
        if (s.v === 0 && s.x === s.t) continue;
        for (let n = 0; n < steps; n++) { s.v += (-s.k * (s.x - s.t) - s.c * s.v) * h; s.x += s.v * h; }
        const e = EPS[p] || 0.01;
        if (Math.abs(s.v) < e * 10 && Math.abs(s.x - s.t) < e) { s.x = s.t; s.v = 0; }
        else busy = true;
        moved = true;
      }
      if (moved) render(c);
      c.dirty = false;
      if (watch(c)) busy = true;
    }
    if (drag) busy = true;
    raf = busy ? requestAnimationFrame(tick) : 0;
    if (!raf) last = 0;
  }

  // The turn eases through edge-on, the way a real card hangs for a moment at 90deg.
  // Same end points as the spring (0 and 180), so only the pacing changes.
  const turn = (f) => f + 9 * Math.sin((f * Math.PI) / 90);

  function render(c) {
    const { x, y, r, s, f, lift, tx, ty } = c.sp;
    const a = turn(f.x);
    c.el.style.transform = `translate3d(${x.x.toFixed(2)}px,${y.x.toFixed(2)}px,0) rotate(${r.x.toFixed(3)}deg) scale(${s.x.toFixed(4)})`;
    // 3D only while the card turns or tilts: a flat card has no 3D context to composite.
    const flat = Math.abs(a) < 0.01 && Math.abs(tx.x) < 0.01 && Math.abs(ty.x) < 0.01;
    c.inner.style.transform = flat ? '' : `perspective(2200px) rotateX(${tx.x.toFixed(2)}deg) rotateY(${(a + ty.x).toFixed(2)}deg)`;
    // a card seen edge-on casts almost no shadow
    const edge = Math.abs(Math.cos((a * Math.PI) / 180));
    c.rest.style.opacity = (0.35 + 0.65 * edge).toFixed(3);
    c.lift.style.opacity = (Math.max(0, Math.min(1, lift.x)) * edge).toFixed(3);
  }

  // Per-frame bookkeeping for cards in flight. Returns true while it still needs frames.
  function watch(c) {
    if (c.thrown) {
      if (Math.abs(c.sp.x.x) > innerWidth / 2 + cardW * 0.75) tuck(c);
      return true;
    }
    if (c.returning) {
      const T = c.target;
      if (Math.abs(c.sp.x.x - T.x) < 6 && Math.abs(c.sp.y.x - T.y) < 6) { c.returning = false; setZ(c, T.z); }
      return c.returning;
    }
    return false;
  }

  // ---------- layout: where each card wants to be ----------
  const depth = (c) => (c.i - top + N) % N;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  function measure() {
    cardW = cards[0].el.offsetWidth;
    cardH = cards[0].el.offsetHeight;
    geo = null;
  }

  function stackSlot(c) {
    const d = depth(c);
    // while the top card is dragged, the cards behind move up by the drag progress
    const p = drag && drag.moving && mode === 'stack' ? drag.p : 0;
    const dd = d === 0 ? 0 : Math.max(0, Math.min(d, 3) - p);
    // the card in the hand rises a little and its shadow grows the further it is carried
    const held = d === 0 && drag && drag.moving && drag.c === c;
    return {
      x: 0, y: dd * 26, r: d === 0 ? 0 : c.seed * Math.min(1, dd),
      s: held ? 1.03 : 1 - dd * 0.05, f: c.flipped ? 180 : 0,
      lift: held ? 0.3 + 0.7 * p : 0, z: N - d,
    };
  }

  // The hand: card centres on an arc of radius R around a pivot below the stage.
  // Neighbours sit `strip` apart along the arc. The index column on each front is sized to that strip,
  // so nothing a card says at rest is covered by the card on its right.
  function fanGeometry() {
    if (geo) return geo;
    const W = stage.clientWidth, H = stage.clientHeight;
    const cw = cardW, ch = cardH;
    // Scale: the index strip should be about 42% of a card's width at any screen width
    // (solved from the arc below), within what the stage height allows.
    const s = Math.max(0.42, Math.min((W - 32) * 3.743e-4, (H - 150) / ch, 0.9));
    // Type is sized for the screen at the 1440px scale (0.527) and grows with the card above it.
    const grow = Math.max(1, s / 0.527);
    const half = rad(10);                      // the hand spans -10deg .. +10deg
    const a = half + rad(1.2);                 // room for the cards that part around a picked-up one
    const reach = (cw * s / 2) * Math.cos(a) + (ch * s / 2) * Math.sin(a);
    const U = 2 * (W / 2 - 16 - reach) * (half / Math.sin(a)); // arc length, first centre to last
    const step = U / (N - 1);                  // px along the arc at the card centres
    const R = U / 2 / half;
    const drop = R * (1 - Math.cos(half));
    // A neighbour is the same card turned by step/R about the pivot, so the strip it leaves visible
    // grows with distance from the pivot: widest at the top of the card. y is measured down from the card centre.
    const strip = (y) => (step * (R - y)) / R;
    const cardTop = -(ch * s) / 2;
    const pad = 9 * grow;                      // front side padding on screen (9px * k, scaled by s)
    const col = strip(ch * s * 0.12) - pad - 5;          // the index fills at most the top 62% of the card
    const titleW = strip(cardTop + 72 * grow) - pad - 3;    // the name sits higher, where the strip is wider
    const titlePx = Math.min(15.5 * grow, (15.5 * titleW) / longestWord());
    const panelGap = strip(ch * s * 0.12) + 10 - pad - col; // the panel starts under the next card
    // Open: the card keeps its full size where it can; the hand below shows 48 to 92px of its end cards
    // (the names; the middle of the arc shows `drop` more).
    const full = Math.min(1, (H - 40) / ch, (W - 40) / cw);
    const show = Math.min(92, Math.max(48, H - 18 - ch * full - 14 - drop));
    const openS = Math.min(full, (H - show - drop - 14 - 18) / ch);
    geo = { W, H, cw, ch, s, half, step, R, drop, pad, col, titleW, show, openS, parts: [], bands: null };
    // CSS gets lengths in card pixels, since the card is scaled by s
    const set = (k, v) => root.style.setProperty(k, v);
    set('--fan-k', (grow / s).toFixed(4));
    set('--fan-col', `${(col / s).toFixed(1)}px`);
    set('--fan-title-w', `${(titleW / s).toFixed(1)}px`);
    set('--fan-title', `${(titlePx / s).toFixed(2)}px`);
    set('--fan-gap', `${(panelGap / s).toFixed(1)}px`);
    // where each card's index runs, top to bottom, as a fraction of the card from its centre (read once the type is set)
    geo.bands = cards.map(({ front: f }) => {
      const t = f.querySelector('h2'), m = f.querySelector('.meta'), h = f.offsetHeight;
      return [t.offsetTop / h - 0.5, (m.offsetTop + m.offsetHeight) / h - 0.5];
    });
    return geo;
  }

  // Widest single word in any card name at the fan's 15.5px title size, measured once.
  let wordW = 0;
  function longestWord() {
    if (wordW) return wordW;
    const ctx = document.createElement('canvas').getContext('2d');
    const h2 = cards[0].front.querySelector('h2');
    const cs = getComputedStyle(h2);
    ctx.font = `650 15.5px ${cs.fontFamily}`;
    for (const c of cards) {
      for (const w of c.front.querySelector('h2').textContent.split(/\s+/)) {
        wordW = Math.max(wordW, ctx.measureText(w).width * 1.01 - w.length * 0.31); // -0.02em tracking
      }
    }
    return wordW || 96;
  }

  const fanAngle = (i, g) => (i - (N - 1) / 2) * (g.step / g.R);

  // A card resting in the hand, turned by `t` extra radians about the pivot.
  function handSlot(i, g, t = 0) {
    const a = fanAngle(i, g) + t;
    return { x: g.R * Math.sin(a), y: g.R * (1 - Math.cos(a)) - g.drop / 2, r: deg(a), s: g.s };
  }
  // Picked up: out of the hand, a little larger, more upright (by `lean`), on top.
  function liftSlot(i, g, lean) {
    const a = fanAngle(i, g), L = 46, h = handSlot(i, g);
    return { x: h.x + Math.sin(a) * L, y: h.y - Math.cos(a) * L, r: h.r * lean, s: g.s * 1.1 };
  }

  // How far the cards either side part when card h is picked up, so the hand stays clean:
  // the card on its right tucks fully under it, the next one clears its edge, and the card
  // on its left keeps its whole index. Solved on the real corners, once per card per layout size.
  // Returns [left turn, right turn, lean]; the lean straightens less where that is what keeps the hand clean.
  function parts(h, g) {
    if (g.parts[h]) return g.parts[h];
    const chs = g.ch * g.s, left = -(g.cw * g.s) / 2;
    const ys = (i) => { const [a, b] = g.bands[i]; return [a, (a + b) / 2, b].map((f) => f * chs); };
    const at = (S, lx, ly) => {                          // world point of a card's local point
      const t = rad(S.r);
      return [S.x + lx * Math.cos(t) - ly * Math.sin(t), S.y + lx * Math.sin(t) + ly * Math.cos(t)];
    };
    let out;
    for (const lean of [0.8, 0.9, 1]) {
      const L = liftSlot(h, g, lean), hw = (g.cw * L.s) / 2;
      const edge = (lx, Y) => { const [x0, y0] = at(L, lx, 0); return x0 - (Y - y0) * Math.tan(rad(L.r)); };
      // smallest gap over the index band between card i's local column lx and L's edge on `side` (positive: clear)
      const gap = (i, t, lx, side) => Math.min(...ys(i).map((ly) => {
        const [X, Y] = at(handSlot(i, g, t), lx, ly);
        return side * (X - edge(side * hw, Y));
      }));
      const solve = (i, lx, side) => {
        let t = rad(0.5);
        if (i < 0 || i >= N) return t;
        for (let k = 0; k < 3; k++) t += Math.max(0, 3 - gap(i, side * t, lx, side)) / g.R;
        return t;
      };
      const tr = solve(h + 2, left + g.pad, 1);              // the card after next clears L's right edge
      const tl = solve(h - 1, left + g.pad + g.col, -1);     // the card before keeps its index clear of L's left edge
      out = [tl, tr, lean];
      // the card just right of L stays fully under it, name included
      if (h + 1 >= N || gap(h + 1, tr, left + g.pad + Math.max(g.col, g.titleW), 1) <= -1) break;
    }
    return (g.parts[h] = out);
  }

  function fanSlot(c, g) {
    if (open === c) {
      // the open card sits above the dropped hand, so every card's name stays in sight
      return { x: 0, y: 18 + (g.ch * g.openS) / 2 - g.H / 2, r: 0, s: g.openS, f: 180, lift: 1, z: 100 };
    }
    const lifted = !open && c.i === hovered;
    let T;
    if (lifted) T = liftSlot(c.i, g, parts(c.i, g)[2]);
    else {
      let t = 0;
      if (!open && hovered >= 0) { const [tl, tr] = parts(hovered, g); t = c.i > hovered ? tr : -tl; }
      T = handSlot(c.i, g, t);
    }
    if (open) T.y += g.H / 2 + (g.ch * g.s) / 2 - g.show - g.drop / 2; // the rest of the hand drops to the bottom edge
    return { ...T, f: 0, lift: lifted ? 1 : 0, z: lifted ? 50 : c.i + 1 };
  }

  // Which card's strip is under the pointer, from the resting geometry (so moving cards never steal it).
  function slotAt(cx, cy) {
    const g = fanGeometry();
    const b = stage.getBoundingClientRect();
    const px = cx - (b.left + g.W / 2), py = cy - (b.top + g.H / 2);
    const pivotY = g.R - g.drop / 2;
    const dist = Math.hypot(px, pivotY - py);
    const halfH = (g.ch * g.s) / 2;
    if (dist < g.R - halfH - 12 || dist > g.R + halfH + 60) return -1;
    const ang = Math.atan2(px, pivotY - py);
    const hw = (g.cw * g.s) / 2 / dist;        // half a card, as an angle at this radius
    const k = Math.floor((ang + hw - fanAngle(0, g)) / (g.step / g.R));
    if (k < 0) return -1;
    if (k >= N - 1) return ang <= fanAngle(N - 1, g) + hw ? N - 1 : -1;
    return k;
  }

  function layout(jump = false) {
    const g = mode === 'fan' ? fanGeometry() : null;
    for (const c of cards) {
      if (c.thrown) continue;
      const T = mode === 'fan' ? fanSlot(c, g) : stackSlot(c);
      if (c.press) T.s *= 0.97;
      c.target = T;
      if (!c.returning) setZ(c, T.z);
      for (const p of ['x', 'y', 'r', 's', 'f', 'lift']) {
        if (c.held && (p === 'x' || p === 'y' || p === 'r')) continue; // a held card keeps its lean
        to(c, p, T[p], jump);
      }
    }
    if (dotTop !== top) {               // the dots are one tab stop too; arrows move along them
      dotTop = top;
      dots.forEach((d, i) => { d.setAttribute('aria-current', String(i === top)); d.tabIndex = i === top ? 0 : -1; });
    }
    rove();
    kick();
  }

  function to(c, p, v, jump) {
    const s = c.sp[p];
    s.t = v;
    if (jump || reduceMQ.matches) { s.x = v; s.v = 0; c.dirty = true; }
  }
  function setZ(c, z) { if (c.z !== z) { c.z = z; c.el.style.zIndex = z; } }

  // ---------- focus ----------
  // One tab stop for the deck: the current card's turn button. Every other card's controls are out of the tab order.
  function rove() {
    const k = mode === 'stack' ? top : open ? open.i : cur;
    for (const c of cards) {
      const t = c.i === k ? 0 : -1;
      if (c.turn.tabIndex !== t) c.turn.tabIndex = t;
    }
  }
  // Only the face that is up can be reached by keyboard or screen reader.
  function faces(c) {
    c.front.inert = c.flipped;
    c.back.inert = !c.flipped;
    c.el.classList.toggle('is-open', c.flipped);
  }
  // Was focus with the deck (or nowhere) before a change? Then it follows the card.
  const focusHere = () => deck.contains(document.activeElement) || document.activeElement === document.body;
  function focusFace(c) {
    const el = c.flipped ? c.back.querySelector('.open') : c.turn;
    if (el) el.focus({ preventScroll: true });
  }

  // The back shows the card's picture in whatever room the numbers leave; hide it when the room is too small.
  // Writes, then reads, then writes, so the browser lays out once.
  function fitBacks() {
    const arts = cards.map((c) => c.back.querySelector('.art')).filter(Boolean);
    for (const art of arts) art.hidden = false;
    const tall = arts.map((art) => art.offsetHeight >= 110);
    arts.forEach((art, i) => { art.hidden = !tall[i]; });
    fitNums();
  }

  // Deck only: a card without a picture sets its lead number as large as the card is wide (64px measure, up to 112px).
  const nums = cards.map((c) => c.front.querySelector('.art--num b')).filter(Boolean);
  function fitNums() {
    if (mode !== 'stack') { for (const b of nums) b.style.removeProperty('--num'); return; }
    for (const b of nums) b.style.setProperty('--num', '64px');
    const room = nums.map((b) => [b.parentElement.clientWidth, b.offsetWidth]);
    nums.forEach((b, i) => {
      const [w, sw] = room[i];
      b.style.setProperty('--num', `${Math.max(40, Math.min(112, Math.floor((64 * w) / sw))) }px`);
    });
  }

  // Wallet reveal: the open card's still crossfades to its looping demo. Loaded on open only; never under
  // reduced motion or data saver.
  function playDemo(c) {
    const art = c.back.querySelector('.art[data-video]');
    if (!art || art.hidden || mode !== 'fan' || reduceMQ.matches || navigator.connection?.saveData) return;
    let v = art.querySelector('video');
    if (!v) {
      v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.addEventListener('playing', () => { if (open === c) art.classList.add('is-playing'); });
      v.src = art.dataset.video;
      art.append(v);
    }
    v.play().catch(() => {});
  }
  function stopDemo(c) {
    const art = c && c.back.querySelector('.art[data-video]');
    const v = art && art.querySelector('video');
    if (!v) return;
    art.classList.remove('is-playing');
    v.pause();
  }

  // ---------- stack actions ----------
  function flip(c) {
    const had = focusHere();
    c.flipped = !c.flipped;
    faces(c);
    if (had) focusFace(c);
    layout();
  }

  // Throw the top card off one side; it tucks under the deck once it is off screen.
  function throwTop(dir, vx = 0, vy = 0, nextTop = (top + 1) % N) {
    const c = cards[top];
    top = nextTop;
    if (reduceMQ.matches) { c.flipped = false; faces(c); layout(true); return; }
    c.thrown = dir;
    c.target = null;
    setZ(c, 200);
    // ballistic flight: no spring pulls it, it just keeps the thrown speed until it is off screen
    c.sp.x.k = 0; c.sp.x.c = 0;
    c.sp.x.v = dir * Math.min(2600, Math.max(Math.abs(vx), 1200));
    c.sp.y.k = 0; c.sp.y.c = 4;
    c.sp.y.v = Math.max(-1200, Math.min(1200, vy));
    c.sp.r.t = dir * 24;
    layout();
  }

  function tuck(c) {
    c.thrown = 0;
    c.sp.x.k = TUNE.x[0]; c.sp.x.c = TUNE.x[1];
    c.sp.y.k = TUNE.y[0]; c.sp.y.c = TUNE.y[1];
    setZ(c, 0);
    if (c.flipped) { c.flipped = false; faces(c); }
    c.returning = true; // keep it under the deck until it lands, then take its real z
    layout();
    c.target.z = N - depth(c);
  }

  // Bring the card under the deck back on top, sliding in from the left.
  function prevCard() {
    const c = cards[(top - 1 + N) % N];
    top = c.i;
    if (!reduceMQ.matches) {
      c.sp.x.x = -(innerWidth / 2 + cardW); c.sp.x.v = 0;
      c.sp.r.x = -18; c.sp.y.x = 0;
    }
    c.flipped = false; faces(c);
    layout();
  }

  function goTo(i) {
    if (i === top) return;
    if (i === (top - 1 + N) % N) return prevCard();
    throwTop(i === (top + 1) % N || i > top ? 1 : -1, 0, 0, i);
  }

  // ---------- fan actions ----------
  function expand(c) {
    const had = focusHere();
    const prev = open;
    open = c;
    hovered = -1;
    cur = c.i;
    c.returning = false;
    c.flipped = true;
    faces(c);
    if (had) focusFace(c);           // focus the new card first, then retire the old one
    if (prev && prev !== c) { prev.flipped = false; faces(prev); prev.returning = true; to(prev, 'tx', 0); to(prev, 'ty', 0); stopDemo(prev); }
    playDemo(c);
    layout();
  }

  function close() {
    if (!open) return;
    const had = deck.contains(document.activeElement);
    const c = open;
    open = null;
    c.flipped = false;
    c.returning = true;
    faces(c);
    to(c, 'tx', 0); to(c, 'ty', 0);
    stopDemo(c);
    if (had) { hovered = c.i; focusFace(c); }
    layout();
  }

  // ---------- pointer: drag, throw, press ----------
  deck.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    const el = e.target.closest('.card');
    if (!el) return;
    const c = cards[+el.dataset.i];
    if (mode === 'stack' && depth(c) !== 0) return;
    if (c.thrown) return;
    touched = true;
    suppressClick = false;
    const box = el.getBoundingClientRect();
    drag = {
      c, id: e.pointerId, moving: false, p: 0,
      x0: e.clientX, y0: e.clientY,
      sx: c.sp.x.x, sy: c.sp.y.x, sr: c.target ? c.target.r : c.sp.r.x,
      low: e.clientY > box.top + box.height / 2,   // grabbed low: it tips the other way
      log: [[e.timeStamp, e.clientX, e.clientY]],
    };
    c.press = true;
    layout();
  });

  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const c = drag.c;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moving) {
      if (Math.hypot(dx, dy) < 6) return;
      drag.moving = true;
      c.held = true;
      c.press = false;
      try { c.el.setPointerCapture(drag.id); } catch (_) {}
      c.el.classList.add('dragging');
      if (open === c) { to(c, 'tx', 0); to(c, 'ty', 0); }
    }
    drag.log.push([e.timeStamp, e.clientX, e.clientY]);
    while (drag.log.length > 2 && e.timeStamp - drag.log[0][0] > 90) drag.log.shift();
    const v = velocity();

    c.sp.x.x = drag.sx + dx; c.sp.x.v = 0;
    c.sp.y.x = drag.sy + dy; c.sp.y.v = 0;
    if (mode === 'stack') {
      c.sp.r.x = Math.max(-22, Math.min(22, (c.sp.x.x * 0.065) * (drag.low ? -1 : 1)));
      c.sp.r.v = 0;
      drag.p = Math.min(1, Math.abs(c.sp.x.x) / (cardW * 0.5));
    } else {
      // carried cards lean into the motion (a spring, so the lean eases in and out)
      c.sp.r.t = drag.sr + Math.max(-12, Math.min(12, v.x * 0.012)) * (drag.low ? -1 : 1);
    }
    c.dirty = true;
    layout();
  });

  function velocity(d = drag) {
    const L = d.log, a = L[0], b = L[L.length - 1];
    const dt = Math.max(1, b[0] - a[0]) / 1000;
    return { x: (b[1] - a[1]) / dt, y: (b[2] - a[2]) / dt };
  }

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag, c = d.c;
    drag = null;
    c.press = false;
    c.el.classList.remove('dragging');
    if (!d.moving) { layout(); return; }
    suppressClick = e.type !== 'pointercancel';
    c.held = false;
    const v = velocity(d);
    c.sp.x.v = v.x; c.sp.y.v = v.y;
    const dx = c.sp.x.x - d.sx, dy = c.sp.y.x - d.sy;

    if (mode === 'stack') {
      const far = Math.abs(c.sp.x.x) > cardW * 0.32 && Math.sign(v.x) !== -Math.sign(c.sp.x.x);
      const fast = Math.abs(v.x) > 900;
      if (far || fast) return throwTop(Math.sign(fast ? v.x : c.sp.x.x), v.x, v.y);
    } else if (open === c) {
      if (Math.hypot(dx, dy) > 140 || Math.hypot(v.x, v.y) > 1100) return close();
    } else if (-dy > 90 || v.y < -800) {
      return expand(c);
    }
    layout();
  }
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  // A drag is not a click: swallow the click that follows it (capture, so links are covered too).
  deck.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    const el = e.target.closest('.card');
    if (!el || e.target.closest('a')) return;
    const c = cards[+el.dataset.i];
    if (mode === 'stack') depth(c) === 0 ? flip(c) : goTo(c.i);
    else open === c ? close() : expand(c);
  }, true);

  // fan: click on the table puts the open card back
  stage.addEventListener('click', (e) => { if (open && !e.target.closest('.card')) close(); });

  // fan: pointing at a strip picks that card up; leaving the hand puts it down
  stage.addEventListener('pointermove', (e) => {
    if (mode !== 'fan' || open || drag || e.pointerType !== 'mouse') return;
    const i = slotAt(e.clientX, e.clientY);
    if (i === hovered) return;
    hovered = i;
    if (i >= 0) cur = i;
    layout();
  });
  stage.addEventListener('pointerleave', (e) => {
    if (mode !== 'fan' || open || drag || e.pointerType !== 'mouse' || hovered < 0) return;
    if (deck.contains(document.activeElement)) return; // keyboard focus keeps its card up
    hovered = -1;
    layout();
  });

  // fan: the open card tilts toward the pointer, and its highlight follows it (not under reduced motion)
  for (const c of cards) {
    c.el.addEventListener('pointermove', (e) => {
      if (open !== c || drag || !fine.matches || reduceMQ.matches) return;
      const b = c.el.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      to(c, 'ty', -(px - 0.5) * 7);  // rotateY sits on top of the 180deg flip, so the sign flips
      to(c, 'tx', -(py - 0.5) * 7);
      c.glow.style.transform = `translate3d(${((1 - px) * cardW).toFixed(1)}px,${(py * cardH).toFixed(1)}px,0)`;
      kick();
    });
    c.el.addEventListener('pointerleave', () => {
      if (open !== c) return;
      to(c, 'tx', 0); to(c, 'ty', 0); kick();
    });
  }

  // ---------- keyboard ----------
  deck.addEventListener('focusin', (e) => {
    const c = cards[+e.target.closest('.card').dataset.i];
    if (mode === 'stack' && depth(c) !== 0 && !drag) goTo(c.i);
    if (mode === 'fan' && !open && (hovered !== c.i || cur !== c.i)) { hovered = cur = c.i; layout(); }
  });
  deck.addEventListener('focusout', (e) => {
    if (mode !== 'fan' || open || deck.contains(e.relatedTarget) || stage.matches(':hover')) return;
    hovered = -1;
    layout();
  });

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') {
      if (mode === 'fan') close();
      else if (cards[top].flipped) flip(cards[top]);
      return;
    }
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    touched = true;
    const had = deck.contains(document.activeElement);
    if (mode === 'stack') {
      const onDots = dots.includes(document.activeElement);
      dir > 0 ? throwTop(1) : prevCard();
      if (had) cards[top].turn.focus({ preventScroll: true });
      else if (onDots) dots[top].focus({ preventScroll: true });
    } else {
      const from = open ? open.i : hovered >= 0 ? hovered : cur;
      const next = cards[(from + dir + N) % N];
      if (open) return expand(next);   // expand() moves focus to the new card's Open link
      hovered = cur = next.i;
      layout();
      if (had) next.turn.focus({ preventScroll: true });
    }
  });

  dots.forEach((d, i) => d.addEventListener('click', () => { touched = true; goTo(i); }));

  // ---------- mode, resize, first deal ----------
  function setMode() {
    mode = wideMQ.matches ? 'fan' : 'stack';
    root.dataset.mode = mode;
    if (open) stopDemo(open);
    open = null;
    hovered = -1;
    for (const c of cards) {
      c.flipped = false; c.thrown = 0; c.returning = false;
      for (const p of ['x', 'y']) { c.sp[p].k = TUNE[p][0]; c.sp[p].c = TUNE[p][1]; }
      faces(c);
    }
    measure();
    fitBacks();
    layout(true);
  }

  // Fan only: the hand is dealt from a squared pile. The cards are visible the whole time.
  function deal() {
    if (mode !== 'fan' || reduceMQ.matches) return;
    const s0 = fanGeometry().s;
    const slots = cards.map((c) => ({ ...c.target }));
    for (const c of cards) {               // square the pile
      const pile = { x: 0, y: 24, r: c.seed, s: s0, lift: 0 };
      for (const p in pile) { c.sp[p].x = c.sp[p].t = pile[p]; c.sp[p].v = 0; }
      render(c);
    }
    cards.forEach((c, i) => setTimeout(() => {   // then deal left to right, 40ms apart
      if (touched || mode !== 'fan') return;
      for (const p of ['x', 'y', 'r', 's', 'lift']) c.sp[p].t = slots[i][p];
      kick();
    }, 200 + Math.min(i, 7) * 40));
    setTimeout(() => { if (touched) layout(); }, 200 + 8 * 40);
    // If frames were starved (background tab, headless capture), land the hand anyway.
    setTimeout(() => {
      if (touched || mode !== 'fan') return;
      for (const c of cards) {
        if (Math.abs(c.sp.x.x - c.sp.x.t) > 2) { for (const p in c.sp) { c.sp[p].x = c.sp[p].t; c.sp[p].v = 0; } render(c); }
      }
    }, 1600);
  }

  // Stack only, once: the top card shifts a little, the way a deck invites a swipe.
  function nudge() {
    setTimeout(() => {
      if (mode !== 'stack' || touched || reduceMQ.matches || document.hidden) return;
      const c = cards[top];
      c.sp.x.v = -420; c.sp.r.v = -26;
      kick();
    }, 1400);
  }

  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { measure(); fitBacks(); layout(); });
  });
  wideMQ.addEventListener('change', setMode);

  setMode();
  deal();
  nudge();
})();
