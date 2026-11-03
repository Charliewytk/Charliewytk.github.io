// Notes portfolio behaviour. All content is already in index.html; this file only
// adds selection, live search, the phone stack (push, pop, swipe back) and video play/pause.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const screens = [$('#list'), $('#note')];
  const scrim = $('.scrim');
  const rows = $$('#rows .row');
  const notes = $$('#note article');
  const q = $('#q');
  const clearBtn = $('.search .clear');
  const pill = $('#pill');
  const empty = $('#empty');
  const NAME = $('#list-title').textContent;

  const phoneMQ = matchMedia('(max-width: 959px)');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const isPhone = () => phoneMQ.matches;
  const motionOK = () => !reduceMQ.matches;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- spring (motion brief §4): interruptible, keeps velocity on retarget ----------
  function spring({ k = 400, c = 30, onFrame, onRest = () => {} }) {
    let x = 0, v = 0, target = 0, raf = 0, last = 0;
    const tick = (t) => {
      const dt = Math.min((t - (last || t)) / 1000, 1 / 30); last = t;
      v += (-k * (x - target) - c * v) * dt; x += v * dt;
      if (Math.abs(v) < 0.005 && Math.abs(x - target) < 0.0005 * Math.max(1, Math.abs(target))) {
        x = target; v = 0; raf = last = 0; onFrame(x); onRest(x); return;
      }
      onFrame(x); raf = requestAnimationFrame(tick);
    };
    return {
      set(t, v0) { target = t; if (v0 !== undefined) v = v0; if (!raf) { last = 0; raf = requestAnimationFrame(tick); } },
      jump(t) { cancelAnimationFrame(raf); raf = last = 0; x = target = t; v = 0; onFrame(x); onRest(x); },
      get value() { return x; },
    };
  }

  // The same spring as a CSS easing, so one-shot WAAPI moves feel like the pill.
  // Sampled from x'' = -k(x-1) - c x' over its settle time; plain ease-out where linear() is unknown.
  const canLinear = window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
  function springEasing(k, c) {
    let x = 0, v = 0, t = 0; const dt = 1 / 600, pts = [0];
    while (t < 2 && !(t > 0.05 && Math.abs(v) < 0.01 && Math.abs(1 - x) < 0.001)) {
      for (let i = 0; i < 10; i++) { v += (-k * (x - 1) - c * v) * dt; x += v * dt; t += dt; }
      pts.push(+x.toFixed(4));
    }
    pts[pts.length - 1] = 1;
    return { pts, easing: canLinear ? `linear(${pts.join(', ')})` : 'cubic-bezier(0.22, 1, 0.36, 1)', duration: Math.round(t * 1000) };
  }
  const SOFT = springEasing(260, 26);  // note swap and media morph: settles in ~0.5 s, small overshoot

  // ---------- shared-element morph, transform only ----------
  // A row's square thumbnail grows into the note's wider media. The box (overflow: hidden)
  // is squashed to the thumbnail's square with a non-uniform scale and its content is
  // counter-scaled, so the picture only ever shows its centre square at one uniform scale.
  // Box and content must agree on every frame, so the spring is baked into the keyframes
  // (one per sample) instead of being left to two easings that would drift apart mid-flight.
  // Nothing here repaints: both layers only change transform.
  function morph(box, inner, a, b, { duration = SOFT.duration + 80 } = {}) {
    const side = Math.min(b.width, b.height);               // the thumbnail is the centre square
    const sc = a.width / side;                              // uniform scale of the content
    const sx0 = a.width / b.width, sy0 = a.height / b.height;
    const dx0 = a.left + a.width / 2 - (b.left + b.width / 2), dy0 = a.top + a.height / 2 - (b.top + b.height / 2);
    const step = Math.max(1, Math.round(SOFT.pts.length / 40));
    const outer = [], content = [];
    for (let i = 0; i < SOFT.pts.length; i += step) {
      const e = SOFT.pts[i], offset = i / (SOFT.pts.length - 1);
      const sx = lerp(sx0, 1, e), sy = lerp(sy0, 1, e), s = lerp(sc, 1, e);
      outer.push({ offset, transform: `translate(${lerp(dx0, 0, e)}px, ${lerp(dy0, 0, e)}px) scale(${sx}, ${sy})` });
      content.push({ offset, transform: `scale(${s / sx}, ${s / sy})` });
    }
    outer.push({ offset: 1, transform: 'none' }); content.push({ offset: 1, transform: 'none' });
    const opts = { duration, easing: 'linear' };
    return [box.animate(outer, opts), ...(inner ? [inner.animate(content, opts)] : [])];
  }

  // ---------- selection ----------
  let current = (notes.find((n) => n.classList.contains('is-active')) || notes[0]).id;
  const rowFor = (id) => rows.find((r) => r.hash === '#' + id);
  const noteFor = (id) => notes.find((n) => n.id === id);
  const mediaOf = (art) => $('.video', art) || $('.file img', art);

  function show(id, { animate = false } = {}) {
    const art = noteFor(id);
    if (!art) return false;
    const changed = id !== current;
    current = id;
    notes.forEach((n) => n.classList.toggle('is-active', n === art));
    rows.forEach((r) => (r === rowFor(id) ? r.setAttribute('aria-current', 'true') : r.removeAttribute('aria-current')));
    if (changed) {
      screens[1].scrollTop = 0;
      if (animate && !isPhone() && motionOK()) enter(art, animate.from);
    }
    placePill(!animate);
    loadPoster(art);
    syncVideos();
    paintHighlights();
    rove();
    setTitle();
    return true;
  }

  // Posters are fetched for the open note only (and for a row the pointer or focus reaches,
  // so the morph starts from a real picture). Until then the thumbnail stands in (style.css).
  function loadPoster(art) {
    for (const v of $$('video[data-poster]', art)) if (!v.getAttribute('poster')) v.poster = v.dataset.poster;
  }
  const warm = (e) => {
    const r = e.target.closest && e.target.closest('.row');
    const art = r && noteFor(r.hash.slice(1));
    if (art) loadPoster(art);
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  // The tab strip says where you are: the open note on desktop, the screen on top on phone.
  function setTitle() {
    const art = noteFor(current);
    const head = (!isPhone() || depth === 1) && art ? $('h2', art).textContent : '';
    document.title = head ? `${head} · ${NAME}` : NAME;
  }

  // One Tab stop for the list, like native Notes: Tab goes search, notes, note.
  // Up and Down move inside the list. Without JS every link stays tabbable.
  function rove() {
    const live = rows.filter((r) => !r.parentElement.hidden);
    const stop = live.includes(rowFor(current)) ? rowFor(current) : live[0];
    rows.forEach((r) => (r.tabIndex = r === stop ? 0 : -1));
  }

  // Desktop note swap: the note's blocks rise 8px and fade in, 30ms apart, on the soft spring.
  // If a row thumbnail was clicked, the note's media grows out of it (morph above); the
  // blocks under it wait until it has mostly landed, so nothing it flies over is already in place.
  // A new swap cancels the last one mid-flight, so fast arrowing never queues motion.
  let running = [];
  function enter(art, fromImg) {
    running.forEach((a) => a.cancel()); running = [];
    const kids = [...art.children].filter((k) => k.offsetParent !== null);
    const media = mediaOf(art);
    let flyer = null, after = 0;
    if (fromImg && media && fromImg.offsetParent !== null) {
      const a = fromImg.getBoundingClientRect(), b = media.getBoundingClientRect();
      if (a.width && b.width) {
        const inner = media.tagName === 'IMG' ? null : $('video', media);
        running.push(...morph(media, inner, a, b));
        const btn = $('.vid-toggle', media);
        if (btn) running.push(btn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: SOFT.duration, fill: 'backwards' }));
        flyer = media.tagName === 'IMG' ? media.closest('.file') : media;  // a file chip's parent is the attachment
        after = Math.round(SOFT.duration * 0.45);
      }
    }
    let past = false, n = 0;
    kids.slice(0, 9).forEach((k) => {
      if (k === flyer) { past = true; return; }
      const delay = (past ? after : 0) + n++ * 30;
      running.push(k.animate([{ transform: 'translateY(8px)' }, { transform: 'none' }],
        { duration: SOFT.duration, easing: SOFT.easing, delay, fill: 'backwards' }));
      running.push(k.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay, fill: 'backwards' }));
    });
  }

  // The yellow selection pill springs between rows (desktop only).
  const pillSpring = spring({ k: 400, c: 30, onFrame: (y) => { pill.style.transform = `translate3d(0, ${y}px, 0)`; } });
  function placePill(instant) {
    if (isPhone()) return;
    const r = rowFor(current);
    const li = r && r.parentElement;
    const visible = li && !li.hidden;
    pill.style.opacity = visible ? '1' : '0';
    if (!visible) return;
    pill.style.height = r.offsetHeight + 'px';
    const y = li.offsetTop;
    instant || !motionOK() ? pillSpring.jump(y) : pillSpring.set(y);
  }

  // ---------- live search ----------
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  // Readable text of an element: text nodes joined by spaces, so cells and lines don't run together.
  const plain = (el) => {
    const out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) out.push(n.data);
    return out.join(' ').replace(/\s+/g, ' ').trim();
  };
  // Each note's text, piece by piece (a paragraph, a table cell, a qualifier), so a snippet
  // can start where its piece starts instead of mid-word in the cell before.
  const blocks = (el) => {
    const out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      const t = n.data.replace(/\s+/g, ' ').trim();
      if (t.length > 1 && !out.includes(t)) out.push(t);
    }
    return out;
  };
  const index = rows.map((r) => {
    const id = r.hash.slice(1);
    const pv = $('.pv', r);
    const art = noteFor(id);
    return { id, row: r, li: r.parentElement, pv, orig: pv.textContent, head: norm(plain(r)), blocks: blocks(art), body: plain(art).toLowerCase() };
  });

  // The matching block, started at its own start or at the sentence that holds the hit,
  // so the hit sits inside the first 30 characters and never gets cut off.
  function snippet(it, term) {
    const b = it.blocks.find((t) => t.toLowerCase().includes(term));
    if (!b) return it.orig;
    const i = b.toLowerCase().indexOf(term);
    if (i <= 30) return b;
    const sentence = Math.max(b.lastIndexOf('. ', i), b.lastIndexOf('; ', i), b.lastIndexOf(': ', i));
    if (sentence > -1 && i - (sentence + 2) <= 30) return b.slice(sentence + 2);
    const word = b.lastIndexOf(' ', i - 12);
    return '…' + b.slice(word + 1);
  }

  let terms = [];
  function filter() {
    terms = norm(q.value).split(' ').filter(Boolean);
    clearBtn.hidden = !q.value;
    const shown = [];
    for (const it of index) {
      const hit = terms.every((t) => it.body.includes(t) || it.head.includes(t));
      it.li.hidden = !hit;
      if (hit) shown.push(it.id);
      // A match only inside the note body? Show where it is, like Notes does.
      const miss = terms.find((t) => !it.head.includes(t));
      it.pv.textContent = miss ? snippet(it, miss) : it.orig;
    }
    empty.hidden = shown.length > 0;
    screens[1].classList.toggle('is-empty', !shown.length);  // like Notes: no match, no note
    if (!isPhone() && shown.length && !shown.includes(current)) show(shown[0]);
    placePill(true);
    paintHighlights();
    rove();
  }

  // Search matches are marked with the CSS Custom Highlight API (no DOM rewriting).
  function paintHighlights() {
    if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
    CSS.highlights.delete('q');
    if (!terms.length) return;
    const roots = index.filter((it) => !it.li.hidden).map((it) => $('.row-text', it.row));
    const art = noteFor(current);
    if (art) roots.push(art);
    const ranges = [];
    for (const root of roots) {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node; (node = walk.nextNode());) {
        const text = node.data.toLowerCase();
        for (const t of terms) {
          for (let i = text.indexOf(t); i > -1; i = text.indexOf(t, i + t.length)) {
            const r = new Range(); r.setStart(node, i); r.setEnd(node, i + t.length); ranges.push(r);
          }
        }
      }
    }
    CSS.highlights.set('q', new Highlight(...ranges));
  }

  q.addEventListener('input', filter);
  clearBtn.addEventListener('click', () => { q.value = ''; filter(); q.focus(); });

  // ---------- phone stack ----------
  // One number drives both screens: pos 0 = list, 1 = note.
  // A screen sits at (index - pos) screen-widths; the list drifts 30% left under a scrim.
  // As in UIKit, the list's large title slides left and fades while the note's back label
  // slides in from where that title was, so the two read as one handoff.
  let depth = 0;
  const backLabel = $('#note .back span');
  const large = $('#list .large');
  function layout(pos) {
    screens.forEach((s, i) => {
      const o = i - pos;
      s.style.transform = `translate3d(${o >= 0 ? o * 100 : o * 30}%, 0, 0)`;
      s.style.visibility = i === depth || (o < 0.999 && o > -0.999) ? 'visible' : 'hidden'; // the destination stays focusable
    });
    const p = clamp(1 - pos, 0, 1);  // 0 = note fully in
    backLabel.style.transform = `translate3d(${p * 45}vw, 0, 0)`;
    backLabel.style.opacity = 1 - p * 1.4;
    const cov = clamp(pos, 0, 1);    // 1 = list fully covered
    large.style.opacity = 1 - cov;
    large.style.transform = `translate3d(${cov * 22}vw, 0, 0)`;
    scrim.style.opacity = cov;
    scrim.style.visibility = cov > 0 && cov < 1 ? 'visible' : 'hidden';
  }
  const nav = spring({ k: 400, c: 40, onFrame: layout, onRest: () => screens.forEach((s, i) => (s.inert = i !== depth)) });

  function go(d, velocity) {
    if (d !== 1) land();
    depth = d;
    screens.forEach((s, i) => (s.inert = i !== d));
    screens[d].style.visibility = 'visible';  // focusable now, before the spring's first frame
    reduceMQ.matches ? nav.jump(d) : nav.set(d, velocity);
    syncVideos();
  }

  // Phone push: the tapped row's thumbnail flies out of the list and becomes the note's media
  // while the note slides in under it. The flying copy lives above both screens; the real
  // media stays hidden until the copy has landed exactly on it, then they swap in one frame.
  // A swipe or a pop during the flight lands it at once, so nothing is left in the air.
  let fly = null;
  function land() {
    if (!fly) return;
    fly.anims.forEach((a) => a.cancel());
    fly.el.remove(); fly.media.classList.remove('flying');
    fly = null;
  }
  function flyIn(img, art) {
    land();
    const media = mediaOf(art);
    if (!img || !media || !motionOK()) return;
    const a = img.getBoundingClientRect(), r = media.getBoundingClientRect();
    const shift = screens[1].getBoundingClientRect().left;  // the note is still off to the right
    const b = new DOMRect(r.left - shift, r.top, r.width, r.height);
    if (!a.width || !b.width || b.top > innerHeight) return;
    const el = document.createElement('div');
    el.className = 'fly';
    el.style.cssText = `left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;` +
      `border-radius:${getComputedStyle(media).borderRadius};background-image:url(${img.currentSrc || img.src})`;
    const pic = new Image();
    pic.alt = ''; pic.decoding = 'sync';
    pic.src = $('video', media) ? $('video', media).dataset.poster : media.currentSrc || media.src;
    el.append(pic);
    document.body.append(el);
    media.classList.add('flying');
    const anims = morph(el, pic, a, b);
    fly = { el, media, anims };
    anims[0].onfinish = land;
  }

  // Opening a note pushes a history entry so the browser's Back pops the stack too.
  let skipPop = false;
  function openNote(id, { viaKeyboard = false, from = null } = {}) {
    if (!show(id)) return;
    screens[1].classList.remove('is-empty');
    if (isPhone()) {
      history.pushState({ note: id }, '', '#' + id);
      if (from && depth === 0) flyIn(from, noteFor(id));
      go(1);
      setTitle();
      // Next frame: the browser's own focus fix-up for the now-inert list runs first.
      if (viaKeyboard) requestAnimationFrame(() => $('h2', noteFor(id)).focus({ preventScroll: true }));
    } else {
      history.replaceState(null, '', '#' + id);
    }
  }
  function closeNote(velocity) {
    go(0, velocity);
    if (history.state && history.state.note) { skipPop = true; history.back(); }
    else history.replaceState(null, '', location.pathname + location.search);
    setTitle();
    const r = rowFor(current), f = document.activeElement;
    if (r && (!f || f === document.body || screens[1].contains(f))) requestAnimationFrame(() => r.focus({ preventScroll: true }));
  }
  // A back swipe that starts at the screen edge belongs to the browser (iOS Safari, Android).
  // Its own animation has already played by the time popstate fires, so jump instead of springing.
  const EDGE = 24;
  let edgeTouchAt = -1e9;
  addEventListener('touchstart', (e) => { if (e.touches[0].clientX < EDGE) edgeTouchAt = e.timeStamp; }, { passive: true });
  addEventListener('popstate', (e) => {
    if (skipPop) { skipPop = false; return; }
    const system = e.timeStamp - edgeTouchAt < 1500;
    const to = (d) => (system ? (land(), depth = d, screens.forEach((s, i) => (s.inert = i !== d)), nav.jump(d), syncVideos()) : go(d));
    const id = location.hash.slice(1);
    if (noteFor(id)) { show(id); if (isPhone()) to(1); }
    else if (isPhone() && depth === 1) to(0);
  });

  // Swipe back: the finger drives pos 1:1 from wherever the note is when the drag starts
  // (it may still be sliding in), and release hands the finger's velocity to the spring.
  const note = screens[1];
  note.addEventListener('pointerdown', (e) => {
    if (!isPhone() || e.pointerType === 'mouse' || !e.isPrimary || e.clientX < EDGE) return;
    if (Math.abs(nav.value - 1) >= 1) return;               // fully off screen: nothing to grab
    if (e.target.closest('.shots')) return;                 // the screenshot row scrolls sideways itself
    const x0 = e.clientX, y0 = e.clientY, W = innerWidth;
    let state = 'pending', samples = [], p0 = 1, xd = 0;
    const onMove = (ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (state === 'pending') {
        if (Math.hypot(dx, dy) < 8) return;
        state = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2 ? 'drag' : 'off';
        if (state === 'off') return end();
        note.setPointerCapture(ev.pointerId);
        land();
        screens[0].inert = false;
        p0 = nav.value; xd = ev.clientX;                     // catch the note where it is now
      }
      samples.push([ev.timeStamp, ev.clientX]);
      if (samples.length > 6) samples.shift();
      nav.jump(clamp(p0 - (ev.clientX - xd) / W, 0, 1));
    };
    const onUp = (ev) => {
      const was = state; end();
      if (was !== 'drag') return;
      const [t0, xa] = samples[0] || [ev.timeStamp, ev.clientX];
      const vx = ev.type === 'pointercancel' ? 0 : (ev.clientX - xa) / Math.max(1, ev.timeStamp - t0) * 1000; // px/s
      const progress = 1 - nav.value;                        // how far back the note is, not how far the finger went
      const back = vx > 400 || (progress > 0.45 && vx > -200);
      const vPos = -vx / W; // px/s to screens/s
      back ? closeNote(vPos) : go(1, vPos);
    };
    const end = () => {
      note.removeEventListener('pointermove', onMove);
      note.removeEventListener('pointerup', onUp);
      note.removeEventListener('pointercancel', onUp);
      state = 'done';
    };
    note.addEventListener('pointermove', onMove);
    note.addEventListener('pointerup', onUp);
    note.addEventListener('pointercancel', onUp);
  });

  // ---------- clicks ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.classList.contains('row')) {
      e.preventDefault();
      const id = a.hash.slice(1);
      const from = e.detail > 0 ? $('img', a) : null;
      if (isPhone()) openNote(id, { viaKeyboard: e.detail === 0, from });
      else {
        show(id, { animate: { from } });
        history.replaceState(null, '', a.hash);
        if (e.detail === 0) focusNote();  // Enter on a row goes into the note, like Notes
      }
    } else if (a.hasAttribute('data-back')) {
      e.preventDefault();
      closeNote();
    }
  });

  // ---------- keyboard ----------
  // While the keyboard drives the selection, a pointer resting on a row must not paint its
  // hover fill under the pill as the pill springs away (style.css reads this flag).
  const root = document.documentElement;
  addEventListener('pointermove', () => root.removeAttribute('data-keys'), { passive: true });
  const visibleRows = () => index.filter((it) => !it.li.hidden).map((it) => it.row);
  const focusNote = () => { const h = $('#note article.is-active h2'); if (h) h.focus({ preventScroll: true }); };
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isPhone() && depth === 1) closeNote();
      q.focus({ preventScroll: true }); q.select();
      return;
    }
    if (e.target === q) {
      if (e.key === 'Escape') { if (q.value) { q.value = ''; filter(); } else q.blur(); }
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        const first = visibleRows()[0];
        if (!first) return;
        e.preventDefault();
        if (e.key === 'Enter') first.click(); else first.focus();
      }
      return;
    }
    const row = e.target.closest && e.target.closest('.row');
    if (row && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      root.setAttribute('data-keys', '');
      const list = visibleRows();
      const next = list[list.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (!next && e.key === 'ArrowUp') { q.focus(); return; }
      if (!next) return;
      next.focus();
      if (!isPhone()) { show(next.hash.slice(1), { animate: {} }); history.replaceState(null, '', next.hash); }
      else { row.tabIndex = -1; next.tabIndex = 0; }
      return;
    }
    if (row && e.key === 'ArrowRight' && !isPhone()) { e.preventDefault(); focusNote(); return; }
    const inNote = screens[1].contains(e.target) && !(e.target.closest && e.target.closest('input, video'));
    if (inNote && !isPhone() && (e.key === 'Escape' || (e.key === 'ArrowLeft' && !e.altKey))) {
      const r = rowFor(current);
      if (r && !r.parentElement.hidden) { e.preventDefault(); r.focus(); }
      return;
    }
    if (e.key === 'Escape' && isPhone() && depth === 1 && !e.target.closest('input')) closeNote();
  });

  // ---------- video: only the open note plays; motion-sensitive viewers press play themselves ----------
  const userChoice = new WeakMap(); // video -> 'play' | 'pause'
  function syncVideos() {
    for (const v of $$('#note video')) {
      const open = v.closest('article').classList.contains('is-active') && (!isPhone() || depth === 1) && !document.hidden;
      const want = userChoice.get(v) || (reduceMQ.matches ? 'pause' : 'play');
      if (open && want === 'play') v.play().catch(() => {});
      else v.pause();
    }
  }
  for (const btn of $$('.vid-toggle')) {
    const v = btn.parentElement.querySelector('video');
    const paint = () => {
      const playing = !v.paused;
      btn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
      $('use', btn).setAttribute('href', playing ? '#i-pause' : '#i-play');
    };
    v.addEventListener('play', paint); v.addEventListener('pause', paint);
    btn.addEventListener('click', () => { userChoice.set(v, v.paused ? 'play' : 'pause'); syncVideos(); });
    btn.hidden = false; paint();
  }
  document.addEventListener('visibilitychange', syncVideos);

  // ---------- nav bars: material + small title once the large title scrolls away ----------
  const watch = (screen, target) => new IntersectionObserver(
    ([en]) => $('.bar', screen).classList.toggle('scrolled', !en.isIntersecting),
    { root: screen, rootMargin: '-44px 0px 0px 0px' }).observe(target);
  watch(screens[0], large);
  watch(screens[1], $('.sentinel', screens[1]));

  // ---------- layout switches between stack and panes ----------
  function applyMode() {
    land();
    if (isPhone()) {
      nav.jump(depth);
    } else {
      screens.forEach((s) => { s.style.transform = s.style.visibility = ''; s.inert = false; });
      scrim.style.opacity = scrim.style.visibility = '';
      [backLabel, large].forEach((el) => { el.style.transform = el.style.opacity = ''; });
      placePill(true);
    }
    syncVideos();
  }
  phoneMQ.addEventListener('change', applyMode);
  addEventListener('resize', () => placePill(true));

  // ---------- start: honour a #note link, otherwise the list (phone) / first note (desktop) ----------
  history.scrollRestoration = 'manual';
  const start = location.hash.slice(1);
  if (noteFor(start)) { show(start); depth = isPhone() ? 1 : 0; }
  show(current);
  applyMode();
  screens.forEach((s) => (s.scrollTop = 0));
})();
