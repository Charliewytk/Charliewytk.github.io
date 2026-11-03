// Notes portfolio behaviour. All content is already in index.html; this file only
// adds selection, live search, the phone stack (push, pop, swipe back) and video play/pause.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const screens = [$('#folders'), $('#list'), $('#note')];
  const scrims = $$('.scrim');
  const rows = $$('#rows .row');
  const notes = $$('#note article');
  const q = $('#q');
  const clearBtn = $('.search .clear');
  const pill = $('#pill');
  const fpill = $('#fpill');
  const empty = $('#empty');
  const listTitle = $('#list-title');
  const listBarTitle = $('#list .bar-title');
  const backLabel = $('#back-label');
  const NAME = listTitle.textContent;

  const phoneMQ = matchMedia('(max-width: 959px)');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const isPhone = () => phoneMQ.matches;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

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
    return { easing: canLinear ? `linear(${pts.join(', ')})` : 'cubic-bezier(0.22, 1, 0.36, 1)', duration: Math.round(t * 1000) };
  }
  const SOFT = springEasing(260, 26);  // note swap and media morph: settles in ~0.5 s, small overshoot
  const PILL = springEasing(400, 30);  // the selection pill's own spring, for rows that move with it
  const motionOK = () => !reduceMQ.matches;

  // ---------- selection ----------
  let current = (notes.find((n) => n.classList.contains('is-active')) || notes[0]).id;
  let folder = 'all';
  const rowFor = (id) => rows.find((r) => r.hash === '#' + id);

  function show(id, { animate = false } = {}) {
    const art = notes.find((n) => n.id === id);
    if (!art) return false;
    const changed = id !== current;
    current = id;
    notes.forEach((n) => n.classList.toggle('is-active', n === art));
    rows.forEach((r) => (r === rowFor(id) ? r.setAttribute('aria-current', 'true') : r.removeAttribute('aria-current')));
    if (changed) {
      screens[2].scrollTop = 0;
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
    const art = r && notes.find((n) => '#' + n.id === r.hash);
    if (art) loadPoster(art);
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  // The tab strip says where you are: the open note on desktop, the screen on top on phone.
  function setTitle() {
    const art = notes.find((n) => n.id === current);
    const onNote = !isPhone() || depth === 2;
    const head = onNote && art ? $('h2', art).textContent : folder === 'all' ? '' : folderName(folder);
    document.title = head ? `${head} · ${NAME}` : NAME;
  }

  // One Tab stop per list, like native Notes: Tab goes folders, search, notes, note.
  // Up and Down move inside a list. Without JS every link stays tabbable.
  function rove() {
    const live = rows.filter((r) => !r.parentElement.hidden);
    const stop = live.includes(rowFor(current)) ? rowFor(current) : live[0];
    rows.forEach((r) => (r.tabIndex = r === stop ? 0 : -1));
    const fl = $$('.frow');
    fl.forEach((a) => (a.tabIndex = a.dataset.folder === folder ? 0 : -1));
  }

  // Desktop note swap: the note's blocks rise 8px and fade in, 30ms apart, on the soft spring.
  // If a row thumbnail was clicked, the note's media grows out of it as one shared element:
  // it starts as exactly the thumbnail (same square crop via clip-path, same corner radius,
  // same place), then opens to the full frame. The blocks under it wait until it has
  // mostly landed, so nothing it flies over is already in place.
  // A new swap cancels the last one mid-flight, so fast arrowing never queues motion.
  let running = [];
  function enter(art, fromImg) {
    running.forEach((a) => a.cancel()); running = [];
    const kids = [...art.children].filter((k) => k.offsetParent !== null);
    const media = $('.video', art) || $('.file img', art);
    let morph = null, after = 0;
    if (fromImg && media && fromImg.offsetParent !== null) {
      const a = fromImg.getBoundingClientRect(), b = media.getBoundingClientRect();
      if (a.width && b.width) {
        const side = Math.min(b.width, b.height);           // the thumbnail is the centre square
        const ix = (b.width - side) / 2, iy = (b.height - side) / 2;
        const sc = a.width / side;
        const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
        const r0 = parseFloat(getComputedStyle(fromImg).borderRadius) || 7;
        const r1 = parseFloat(getComputedStyle(media).borderRadius) || 12;
        morph = media;
        const dur = SOFT.duration + 80;
        running.push(media.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${sc})`, clipPath: `inset(${iy}px ${ix}px round ${r0 / sc}px)` },
          { transform: 'none', clipPath: `inset(0px 0px round ${r1}px)` }],
          { duration: dur, easing: SOFT.easing }));
        after = Math.round(dur * 0.45);
      }
    }
    // Everything after the media in reading order waits for it; a file chip's parent
    // (the attachment) is the media itself for PowerLeash.
    const flyer = morph && (morph.tagName === 'IMG' ? morph.closest('.file') : morph);
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

  // The folder selection is the same kind of pill, one size smaller.
  const fpillSpring = spring({ k: 400, c: 30, onFrame: (y) => { fpill.style.transform = `translate3d(0, ${y}px, 0)`; } });
  function placeFolderPill(instant) {
    if (isPhone()) return;
    const a = $(`.frow[data-folder="${folder}"]`);
    if (!a) return;
    fpill.style.height = a.offsetHeight + 'px';
    const y = a.parentElement.offsetTop;
    instant || !motionOK() ? fpillSpring.jump(y) : fpillSpring.set(y);
  }

  // ---------- folders (shelf tags) and live search ----------
  const folderLinks = $$('[data-folder]').filter((a) => a.tagName === 'A');
  const folderName = (fid) => {
    const a = $(`.frow[data-folder="${fid}"] span`);
    return a ? a.textContent : NAME;
  };
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
    const art = notes.find((n) => n.id === id);
    const pv = $('.pv', r);
    const text = plain(art);
    return { id, row: r, li: r.parentElement, pv, orig: pv.textContent, head: norm(plain(r)), blocks: blocks(art), body: text.toLowerCase() };
  });

  function setFolder(fid) {
    folder = fid;
    $$('.frow').forEach((a) => (a.dataset.folder === fid ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    const title = fid === 'all' ? NAME : folderName(fid);
    listTitle.textContent = listBarTitle.textContent = backLabel.textContent = title;
    placeFolderPill(false);
    filter({ flip: true });
  }

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
  let flips = [];
  const wrap = $('#rows').parentElement;
  function filter({ flip = false } = {}) {
    // Folder switch on desktop: rows that stay glide to their new place on the pill's own
    // spring (the pill rides along), rows that go fade out where they stood, new ones fade in.
    flip = flip && !isPhone() && motionOK();
    const top0 = wrap.getBoundingClientRect().top;
    const before = new Map();
    if (flip) for (const it of index) if (!it.li.hidden) before.set(it, it.li.getBoundingClientRect().top - top0);
    flips.forEach((a) => a.cancel()); flips = [];
    $$('.rows > li.leaving').forEach((li) => { li.classList.remove('leaving'); li.style.top = ''; });

    terms = norm(q.value).split(' ').filter(Boolean);
    clearBtn.hidden = !q.value;
    const shown = [];
    for (const it of index) {
      const inFolder = folder === 'all' || it.li.dataset.folder === folder;
      const hit = terms.every((t) => it.body.includes(t) || it.head.includes(t));
      it.li.hidden = !(inFolder && hit);
      if (!it.li.hidden) shown.push(it.id);
      // A match only inside the note body? Show where it is, like Notes does.
      const miss = terms.find((t) => !it.head.includes(t));
      it.pv.textContent = miss ? snippet(it, miss) : it.orig;
    }
    empty.hidden = shown.length > 0;
    screens[2].classList.toggle('is-empty', !shown.length);  // like Notes: no match, no note
    if (!isPhone() && shown.length && !shown.includes(current)) show(shown[0], { animate: flip ? {} : false });
    if (flip) {
      for (const it of index) {
        const was = before.get(it);
        if (!it.li.hidden) {
          const d = was === undefined ? null : was - it.li.offsetTop;
          if (d) flips.push(it.li.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }],
            { duration: PILL.duration, easing: PILL.easing }));
          else if (d === null) flips.push(it.li.animate([{ opacity: 0 }, { opacity: 1 }],
            { duration: 200, delay: 80, easing: 'ease-out', fill: 'backwards' }));
        } else if (was !== undefined) {
          it.li.classList.add('leaving'); it.li.style.top = was + 'px';
          const a = it.li.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.98)' }],
            { duration: 160, easing: 'ease-out', fill: 'forwards' });
          a.onfinish = () => { it.li.classList.remove('leaving'); it.li.style.top = ''; a.cancel(); };
          flips.push(a);
        }
      }
    }
    placePill(!flip);
    paintHighlights();
    rove();
  }

  // Search matches are marked with the CSS Custom Highlight API (no DOM rewriting).
  function paintHighlights() {
    if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
    CSS.highlights.delete('q');
    if (!terms.length) return;
    const roots = index.filter((it) => !it.li.hidden).map((it) => $('.row-text', it.row));
    const art = notes.find((n) => n.id === current);
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
  // One number drives every screen: pos 0 = folders, 1 = list, 2 = note.
  // A screen sits at (index - pos) screen-widths; screens underneath drift 30% left under a scrim.
  // As in UIKit, the title of the screen being covered slides left and fades, and the new
  // screen's back label slides in from where that title was, so the two read as one handoff.
  let depth = 1;
  const backLabels = [null, $('#list .back span'), $('#note .back span')];
  const larges = [$('.large', screens[0]), $('.large', screens[1])];
  function layout(pos) {
    screens.forEach((s, i) => {
      const o = i - pos;
      s.style.transform = `translate3d(${o >= 0 ? o * 100 : o * 30}%, 0, 0)`;
      s.style.visibility = i === depth || (o < 0.999 && o > -0.999) ? 'visible' : 'hidden'; // the destination stays focusable
      if (backLabels[i]) {
        const p = clamp(o, 0, 1);  // 0 = this screen fully in
        backLabels[i].style.transform = `translate3d(${p * 45}vw, 0, 0)`;
        backLabels[i].style.opacity = 1 - p * 1.4;
      }
      if (larges[i]) {
        const cov = clamp(-o, 0, 1); // 1 = fully covered by the next screen
        larges[i].style.opacity = 1 - cov;
        larges[i].style.transform = `translate3d(${cov * 22}vw, 0, 0)`;
      }
    });
    scrims.forEach((sc, i) => {
      const a = clamp(pos - i, 0, 1);
      sc.style.opacity = a;
      sc.style.visibility = a > 0 && a < 1 ? 'visible' : 'hidden';
    });
  }
  const nav = spring({ k: 400, c: 40, onFrame: layout, onRest: () => screens.forEach((s, i) => (s.inert = i !== depth)) });

  function go(d, velocity) {
    depth = d;
    screens.forEach((s, i) => (s.inert = i !== d));
    screens[d].style.visibility = 'visible';  // focusable now, before the spring's first frame
    reduceMQ.matches ? nav.jump(d) : nav.set(d, velocity);
    syncVideos();
  }

  // Opening a note pushes a history entry so the browser's Back pops the stack too.
  let skipPop = false;
  function openNote(id, viaKeyboard) {
    if (!show(id)) return;
    screens[2].classList.remove('is-empty');
    if (isPhone()) {
      history.pushState({ note: id }, '', '#' + id);
      go(2);
      setTitle();
      // Next frame: the browser's own focus fix-up for the now-inert list runs first.
      if (viaKeyboard) requestAnimationFrame(() => $('h2', notes.find((n) => n.id === id)).focus({ preventScroll: true }));
    } else {
      history.replaceState(null, '', '#' + id);
    }
  }
  function closeNote(velocity) {
    go(1, velocity);
    if (history.state && history.state.note) { skipPop = true; history.back(); }
    else history.replaceState(null, '', location.pathname + location.search + (folder === 'all' ? '' : '#folder-' + folder));
    setTitle();
    const r = rowFor(current), f = document.activeElement;
    if (r && (!f || f === document.body || screens[2].contains(f))) requestAnimationFrame(() => r.focus({ preventScroll: true }));
  }
  // A back swipe that starts at the screen edge belongs to the browser (iOS Safari, Android).
  // Its own animation has already played by the time popstate fires, so jump instead of springing.
  const EDGE = 24;
  let edgeTouchAt = -1e9;
  addEventListener('touchstart', (e) => { if (e.touches[0].clientX < EDGE) edgeTouchAt = e.timeStamp; }, { passive: true });
  addEventListener('popstate', (e) => {
    if (skipPop) { skipPop = false; return; }
    const system = e.timeStamp - edgeTouchAt < 1500;
    const to = (d) => (system ? (depth = d, screens.forEach((s, i) => (s.inert = i !== d)), nav.jump(d), syncVideos()) : go(d));
    const id = location.hash.slice(1);
    if (notes.some((n) => n.id === id)) { show(id); if (isPhone()) to(2); }
    else if (isPhone() && depth === 2) to(1);
  });

  // Swipe back: the finger drives pos 1:1, release hands its velocity to the spring.
  screens.forEach((s, i) => {
    if (i === 0) return;
    s.addEventListener('pointerdown', (e) => {
      if (!isPhone() || e.pointerType === 'mouse' || i !== depth || !e.isPrimary || e.clientX < EDGE) return;
      if (e.target.closest('.shots')) return;  // the screenshot row scrolls sideways itself
      const x0 = e.clientX, y0 = e.clientY, W = innerWidth;
      let state = 'pending', samples = [];
      const onMove = (ev) => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (state === 'pending') {
          if (Math.hypot(dx, dy) < 8) return;
          state = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2 ? 'drag' : 'off';
          if (state === 'off') return end();
          s.setPointerCapture(ev.pointerId);
          screens[i - 1].inert = false;
        }
        samples.push([ev.timeStamp, ev.clientX]);
        if (samples.length > 6) samples.shift();
        nav.jump(i - clamp(dx, 0, W) / W);
      };
      const onUp = (ev) => {
        const was = state; end();
        if (was !== 'drag') return;
        const [t0, xa] = samples[0] || [ev.timeStamp, ev.clientX];
        const vx = ev.type === 'pointercancel' ? 0 : (ev.clientX - xa) / Math.max(1, ev.timeStamp - t0) * 1000; // px/s
        const progress = (ev.clientX - x0) / W;
        const back = vx > 400 || (progress > 0.45 && vx > -200);
        const vPos = -vx / W; // px/s to screens/s
        if (!back) return go(i, vPos);
        i === 2 ? closeNote(vPos) : go(0, vPos);
      };
      const end = () => {
        s.removeEventListener('pointermove', onMove);
        s.removeEventListener('pointerup', onUp);
        s.removeEventListener('pointercancel', onUp);
        state = 'done';
      };
      s.addEventListener('pointermove', onMove);
      s.addEventListener('pointerup', onUp);
      s.addEventListener('pointercancel', onUp);
    });
  });

  // ---------- clicks ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.classList.contains('row')) {
      e.preventDefault();
      const id = a.hash.slice(1);
      if (isPhone()) openNote(id, e.detail === 0);
      else {
        show(id, { animate: { from: e.detail > 0 ? $('img', a) : null } });
        history.replaceState(null, '', a.hash);
        if (e.detail === 0) focusNote();  // Enter on a row goes into the note, like Notes
      }
    } else if (a.dataset.folder) {
      e.preventDefault();
      setFolder(a.dataset.folder);
      history.replaceState(null, '', a.dataset.folder === 'all' ? location.pathname + location.search : a.hash);
      if (isPhone()) {
        if (depth === 2) closeNote(); else go(1);
      }
    } else if (a.hasAttribute('data-back')) {
      e.preventDefault();
      a.closest('.note') ? closeNote() : go(0);
    }
  });

  // ---------- keyboard ----------
  const visibleRows = () => index.filter((it) => !it.li.hidden).map((it) => it.row);
  const focusNote = () => { const h = $('#note article.is-active h2'); if (h) h.focus({ preventScroll: true }); };
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isPhone() && depth !== 1) depth === 2 ? closeNote() : go(1);
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
    const frow = e.target.closest && e.target.closest('.frow');
    if (frow && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const fl = $$('.frow');
      const next = fl[fl.indexOf(frow) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (!next) return;
      next.focus();
      if (!isPhone()) { setFolder(next.dataset.folder); history.replaceState(null, '', next.dataset.folder === 'all' ? location.pathname + location.search : next.hash); }
      else next.tabIndex = 0, frow.tabIndex = -1;
      return;
    }
    const row = e.target.closest && e.target.closest('.row');
    if (row && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
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
    const inNote = screens[2].contains(e.target) && !(e.target.closest && e.target.closest('input, video'));
    if (inNote && !isPhone() && (e.key === 'Escape' || (e.key === 'ArrowLeft' && !e.altKey))) {
      const r = rowFor(current);
      if (r && !r.parentElement.hidden) { e.preventDefault(); r.focus(); }
      return;
    }
    if (e.key === 'Escape' && isPhone() && depth === 2 && !e.target.closest('input')) closeNote();
  });

  // ---------- video: only the open note plays; motion-sensitive viewers press play themselves ----------
  const userChoice = new WeakMap(); // video -> 'play' | 'pause'
  function syncVideos() {
    for (const v of $$('#note video')) {
      const open = v.closest('article').classList.contains('is-active') && (!isPhone() || depth === 2) && !document.hidden;
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
  watch(screens[0], $('.large', screens[0]));
  watch(screens[1], $('.large', screens[1]));
  watch(screens[2], $('.sentinel', screens[2]));

  // ---------- layout switches between stack and panes ----------
  function applyMode() {
    if (isPhone()) {
      nav.jump(depth);
    } else {
      screens.forEach((s) => { s.style.transform = s.style.visibility = ''; s.inert = false; });
      scrims.forEach((sc) => { sc.style.opacity = sc.style.visibility = ''; });
      [...backLabels, ...larges].forEach((el) => { if (el) el.style.transform = el.style.opacity = ''; });
      placePill(true); placeFolderPill(true);
    }
    syncVideos();
  }
  phoneMQ.addEventListener('change', applyMode);
  addEventListener('resize', () => { placePill(true); placeFolderPill(true); });

  // ---------- start: honour a #note link, otherwise the list (phone) / first note (desktop) ----------
  history.scrollRestoration = 'manual';
  const start = location.hash.slice(1);
  if (notes.some((n) => n.id === start)) { show(start); depth = isPhone() ? 2 : 1; }
  else if (start === 'folders') depth = 0;
  else if (start.startsWith('folder-') && $(`.frow[data-folder="${start.slice(7)}"]`)) { folder = start.slice(7); setFolder(folder); }
  show(current);
  applyMode();
  screens.forEach((s) => (s.scrollTop = 0));
})();
