// Ledger: filter, sort, keyboard, and a spring-lagged media preview.
// The table is complete static HTML; this file only enhances it.
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const ledger = $('#ledger');
  const tbody = $('#table tbody');
  const input = $('#q');
  const count = $('#count');
  const slab = $('.slab');
  const preview = $('.preview');
  const card = $('.card', preview);
  const rows = [...tbody.rows];
  const total = rows.length;

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 641px)');

  // Status sorts by meaning, not alphabet: live, done, demo, contest result, research, killed.
  const toneRank = { live: 0, done: 1, demo: 2, result: 3, paper: 4, killed: 5 };

  const templateOf = (row) => $('th.name template', row);

  // Cache what we filter and sort on. The preview's <template> counts too, so its
  // qualifiers ("paper", "simulated", "Sharpe") are findable.
  rows.forEach((row, i) => {
    row._i = i;
    row._text = `${row.textContent} ${templateOf(row)?.content.textContent || ''}`.toLowerCase().replace(/\s+/g, ' ');
    const name = $('th.name', row).textContent.trim();
    row._key = {
      n: row.dataset.n ? Number(row.dataset.n) : 1e3 + i, // killed edges after the numbered work
      name,
      kind: $('td.kind', row).textContent.trim(),
      status: [toneRank[row.dataset.tone] ?? 9, name],
    };
  });

  // ── Spring (motion-brief §4): retargetable, keeps velocity ───────────
  function spring(k, c, onFrame) {
    let x = 0, v = 0, target = 0, raf = 0, last = 0;
    const tick = (t) => {
      const dt = Math.min((t - (last || t)) / 1000, 1 / 30); last = t;
      v += (-k * (x - target) - c * v) * dt; x += v * dt;
      if (Math.abs(v) < 0.5 && Math.abs(x - target) < 0.05) { x = target; v = 0; raf = last = 0; onFrame(x); return; }
      onFrame(x); raf = requestAnimationFrame(tick);
    };
    return {
      get value() { return x; },
      set(n) { if (still.matches) return this.jump(n); target = n; if (!raf) raf = requestAnimationFrame(tick); },
      jump(n) { cancelAnimationFrame(raf); raf = last = 0; x = target = n; v = 0; onFrame(x); },
      // Move the current position without touching velocity (scroll glue, FLIP).
      offset(d) { x += d; if (!raf) target += d; onFrame(x); },
    };
  }

  // ── Filter ───────────────────────────────────────────────────────────
  function applyFilter() {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const row of rows) {
      const hit = terms.every((t) => row._text.includes(t));
      row.hidden = !hit;
      if (hit) shown++;
    }
    count.textContent = terms.length ? `${shown} / ${total}` : String(total);
    ledger.classList.toggle('empty', !shown);
    hidePreview(); hideSlab();
    syncUrl();
  }
  input.addEventListener('input', applyFilter);

  // ── Sort (header buttons) ────────────────────────────────────────────
  const sort = { key: 'n', dir: 1 };
  const heads = [...document.querySelectorAll('thead button[data-sort]')];
  const cmp = (x, y) => typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' });

  function applySort(animate) {
    const { key, dir } = sort;
    const sorted = rows.slice().sort((a, b) => {
      const x = [].concat(a._key[key]), y = [].concat(b._key[key]);
      let d = 0;
      for (let i = 0; !d && i < x.length; i++) d = cmp(x[i], y[i]);
      return (d || a._i - b._i) * dir;
    });
    const was = animate ? new Map([...tbody.rows].filter((r) => !r.hidden).map((r, i) => [r, i])) : null;
    tbody.append(...sorted);
    heads.forEach((b) => {
      const th = b.parentElement;
      if (b.dataset.sort === key) th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
    if (was) settle(was);
    syncUrl();
  }

  // The new order is in place at once. The table dips to 0.4 and comes back, and each row
  // that changed place rises the last 8 px into its slot, top to bottom, 12 ms apart.
  // No row ever crosses another, and a second sort mid-flight just starts a fresh one.
  const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
  let settleTimer = 0;
  function settle(was) {
    tbody.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    tbody.classList.add('sorting'); // opaque rows for the whole flight
    let i = 0, last = 0;
    for (const row of tbody.rows) {
      if (row.hidden) continue;
      if (was.get(row) !== i) {
        last = i * 12;
        row.animate({ transform: ['translateY(8px)', 'none'] }, { duration: 260, delay: last, easing: easeOut, fill: 'backwards' });
      }
      i++;
    }
    tbody.animate({ opacity: [0.4, 1] }, { duration: 180, easing: easeOut });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => tbody.classList.remove('sorting'), last + 280);
  }

  heads.forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.sort;
    sort.dir = sort.key === key ? -sort.dir : 1;
    sort.key = key;
    hidePreview(); hideSlab();
    applySort(!still.matches);
  }));

  // ── URL state, so a filtered or sorted view can be linked ────────────
  function syncUrl() {
    const p = new URLSearchParams();
    if (input.value.trim()) p.set('q', input.value.trim());
    if (sort.key !== 'n' || sort.dir < 0) p.set('sort', (sort.dir < 0 ? '-' : '') + sort.key);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  // ── Whole-row link: forward clicks on any other cell to the row's link ─
  const rowLink = (e) => {
    if (e.target.closest('a')) return null; // the link handles itself
    const sel = getSelection();
    if (sel && !sel.isCollapsed && tbody.contains(sel.anchorNode)) return null; // selecting text, not clicking
    return e.target.closest('tr')?.querySelector('th.name a') || null;
  };
  tbody.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    const a = rowLink(e);
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(a.href, '_blank', 'noopener');
    else a.click();
  });
  tbody.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    const a = rowLink(e);
    if (a) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); }
  });

  // ── Keyboard: / filter · ↑↓ or j k move · Enter open · Esc clear ─────
  const links = () => rows.filter((r) => !r.hidden && r.isConnected).sort((a, b) => a.sectionRowIndex - b.sectionRowIndex).map((r) => $('th.name a', r));

  function focusRow(i) {
    const list = links();
    if (!list.length) return;
    const a = list[Math.max(0, Math.min(i, list.length - 1))];
    a.focus({ preventScroll: true });
    a.closest('tr').scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target === input) {
      if (e.key === 'ArrowDown') { e.preventDefault(); focusRow(0); }
      else if (e.key === 'Enter') { const a = links()[0]; if (a && input.value.trim()) a.click(); }
      else if (e.key === 'Escape') { if (input.value) { input.value = ''; applyFilter(); } else input.blur(); }
      return;
    }
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === '/') { e.preventDefault(); input.focus(); input.select(); return; }
    if (e.key === 'Escape' && input.value) { input.value = ''; applyFilter(); return; }
    const inTable = tbody.contains(document.activeElement);
    const step = { ArrowDown: 1, j: 1, ArrowUp: -1, k: -1 }[e.key];
    if (!step || (!inTable && e.key.startsWith('Arrow'))) return;
    e.preventDefault();
    const list = links();
    const at = list.indexOf(document.activeElement);
    if (at < 0) return focusRow(step > 0 ? 0 : list.length - 1);
    if (at + step < 0) return input.focus();
    focusRow(at + step);
  });

  // ── Hover slab: a highlight that springs from row to row ─────────────
  let slabOn = false;
  const sy = spring(520, 46, drawSlab);
  const sh = spring(520, 46, drawSlab);
  function drawSlab() { slab.style.transform = `translateY(${sy.value}px) scaleY(${sh.value / 100})`; }
  function slabTo(row) {
    const top = row.getBoundingClientRect().top - ledger.getBoundingClientRect().top;
    const h = row.getBoundingClientRect().height;
    slab.classList.toggle('focus', mode === 'key');
    if (slabOn) { sy.set(top); sh.set(h); } else { sy.jump(top); sh.jump(h); slab.classList.add('on'); slabOn = true; }
  }
  function hideSlab() { slab.classList.remove('on'); slabOn = false; }

  // ── Preview: one fixed element, positioned by two springs ────────────
  // It never covers the active row: it sits above or below it, on the side the eye
  // has just left (moving down → above), so the next rows stay readable.
  const items = new Map(); // row -> .item, built on first use from the row's <template>
  let current = null, shown = false, activeRow = null, mode = null;
  let mx = 0, my = 0, dirY = 1;
  const px = spring(260, 30, drawPreview);
  const py = spring(260, 30, drawPreview);
  // Hard limits on what is drawn, so momentum can't carry the card past the right edge or into the row.
  let cardW = 0, edgeY = 0, up = false;
  const head = $('#table thead th.status');
  // The card's opaque backing is one layer of this base size, scaled to each item (transform only).
  const BW = 320, BH = 240;
  let snapRaf = 0;
  function snap() { // one frame with no transitions: a cut, not a glide
    card.classList.add('snap');
    cancelAnimationFrame(snapRaf);
    snapRaf = requestAnimationFrame(() => { snapRaf = requestAnimationFrame(() => card.classList.remove('snap')); });
  }
  function drawPreview() {
    const x = Math.max(16, Math.min(px.value, innerWidth - 16 - cardW));
    const y = up ? Math.min(py.value, edgeY) : Math.max(py.value, edgeY);
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function itemFor(row) {
    if (items.has(row)) return items.get(row);
    const el = document.createElement('div');
    el.className = 'item';
    el.append(templateOf(row).content.cloneNode(true));
    const img = $('img', el);
    if (img && img.height > img.width) el.classList.add('portrait');
    card.append(el);
    items.set(row, el);
    return el;
  }

  function play(el, on) {
    const v = $('video', el);
    if (!v) return;
    if (on && !still.matches) v.play().catch(() => {}); // an interrupted play() must not throw
    else v.pause();
  }

  function showPreview(row) {
    if (!wide.matches) return;
    if (!templateOf(row)) { hidePreview(); activeRow = row; return; } // killed rows: the row says it all
    const el = itemFor(row);
    if (el !== current) {
      if (current) { current.classList.remove('on'); play(current, false); }
      el.classList.add('on'); play(el, true);
      current = el;
    }
    if (row !== activeRow && activeRow && activeRow.isConnected) {
      const t = row.getBoundingClientRect().top, was = activeRow.getBoundingClientRect().top;
      if (t !== was) dirY = t > was ? 1 : -1;
    }
    activeRow = row;
    place(el);
  }

  function place(el) {
    const w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight, gap = 8, pad = 16;
    const r = activeRow.getBoundingClientRect();

    // x: pointer → just right of the cursor; keyboard → over Kind/Status, never over the qualifiers.
    let x;
    if (mode === 'pointer') x = mx + 12;
    else {
      const kind = $('td.kind', activeRow);
      const cell = kind && kind.offsetParent ? kind : $('td.status', activeRow);
      x = cell.getBoundingClientRect().left;
    }
    x = Math.max(pad, Math.min(x, vw - pad - w));

    // y: the trailing side of the row; the other side if it doesn't fit; shrink only if neither does.
    // Never over the sticky filter bar and column heads.
    const ceil = Math.max(pad, head.getBoundingClientRect().bottom + gap);
    const roomAbove = r.top - gap - ceil, roomBelow = vh - pad - r.bottom - gap;
    let want = dirY > 0 ? 'above' : 'below';
    const fits = (s) => (s === 'above' ? roomAbove : roomBelow) >= h;
    if (!fits(want)) want = fits(want === 'above' ? 'below' : 'above') ? (want === 'above' ? 'below' : 'above') : (roomAbove > roomBelow ? 'above' : 'below');
    const room = want === 'above' ? roomAbove : roomBelow;
    const fit = Math.max(0.5, Math.min(1, room / h));
    el.style.setProperty('--fit', fit === 1 ? '' : fit.toFixed(3));
    // y is the card edge nearest the row: its bottom when above (.up hangs items upward), its top when below.
    // So a crossfading card of another height always grows away from the row, never into it.
    const above = want === 'above';
    const y = above ? r.top - gap : r.bottom + gap;

    // Glide only on the same side and if the whole trip stays clear of the row; otherwise cut.
    const hh = h * fit;
    const sweep = above ? [Math.min(py.value, y) - hh, Math.max(py.value, y)] : [Math.min(py.value, y), Math.max(py.value, y) + hh];
    const glide = shown && above === up && !(sweep[0] < r.bottom && sweep[1] > r.top);
    up = above; edgeY = y; cardW = w;
    // Only the incoming item takes the new anchor; an outgoing one keeps its own until it has faded.
    el.classList.toggle('up', above);
    card.classList.toggle('up', above);
    card.style.setProperty('--sx', (w * fit / BW).toFixed(4));
    card.style.setProperty('--sy', (hh / BH).toFixed(4));
    if (!glide) snap();
    if (glide) { px.set(x); py.set(y); }
    else if (shown) { px.set(x); py.jump(y); }
    else {
      px.jump(x); py.jump(y);
      card.style.setProperty('--ox', `${Math.max(0, Math.min(w, mx - x))}px`);
      preview.classList.add('on'); shown = true;
    }
    drawPreview(); // the width may have changed this frame
  }

  function hidePreview() {
    preview.classList.remove('on');
    if (current) play(current, false);
    shown = false; activeRow = null;
  }

  // Pointer (mouse / trackpad only; touch taps just follow the link).
  tbody.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !finePointer.matches) return;
    const was = mode;
    if (!shown && e.clientY !== my) dirY = e.clientY > my ? 1 : -1;
    mx = e.clientX; my = e.clientY; mode = 'pointer';
    const row = e.target.closest('tr');
    if (!row) return;
    if (row !== activeRow || was !== 'pointer') slabTo(row);
    showPreview(row);
  });
  tbody.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hidePreview(); hideSlab(); } });

  // Keyboard focus drives the same preview, so arrowing down the list glides it.
  tbody.addEventListener('focusin', (e) => {
    const a = e.target.closest('th.name a');
    if (!a || !a.matches(':focus-visible')) return;
    mode = 'key';
    const row = a.closest('tr');
    slabTo(row);
    showPreview(row);
  });
  tbody.addEventListener('focusout', (e) => {
    if (!tbody.contains(e.relatedTarget) && mode === 'key') { hidePreview(); hideSlab(); }
  });

  // Scrolling moves rows: glue the card to the content (velocity kept), then re-aim once per frame.
  let aim = 0, lastY = scrollY;
  addEventListener('scroll', () => {
    const d = scrollY - lastY; lastY = scrollY;
    if (shown && d) { edgeY -= d; py.offset(-d); }
    if (!slabOn || aim) return;
    aim = requestAnimationFrame(() => {
      aim = 0;
      if (mode === 'key' && activeRow) { slabTo(activeRow); if (shown) place(current); return; }
      const row = document.elementFromPoint(mx, my)?.closest('tbody tr');
      if (row) { slabTo(row); showPreview(row); } else { hidePreview(); hideSlab(); }
    });
  }, { passive: true });

  addEventListener('resize', () => { hidePreview(); hideSlab(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hidePreview(); });

  // Warm the cache when idle (images and video posters), so the first hover opens on a frame.
  if (finePointer.matches && wide.matches) {
    const warm = () => rows.forEach((r) => {
      const t = templateOf(r);
      const m = t && t.content.querySelector('img, video[poster]');
      if (m) new Image().src = m.getAttribute(m.tagName === 'IMG' ? 'src' : 'poster');
    });
    'requestIdleCallback' in window ? requestIdleCallback(warm, { timeout: 2000 }) : setTimeout(warm, 800);
  }

  // ── Phone: a still of each row's media at the row's right edge ───────
  // (The floating preview needs a pointer or a keyboard; phones get the posters inline.)
  let thumbs = false;
  function buildThumbs() {
    if (thumbs || wide.matches) return;
    thumbs = true;
    for (const row of rows) {
      const m = templateOf(row)?.content.querySelector('img, video[poster]');
      if (!m) continue;
      const w = Number(m.getAttribute('width')), h = Number(m.getAttribute('height'));
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
      img.src = m.getAttribute(m.tagName === 'IMG' ? 'src' : 'poster');
      const td = document.createElement('td');
      td.className = `thumb${h > w ? ' portrait' : h === w ? ' square' : ''}`;
      td.setAttribute('aria-hidden', 'true');
      td.append(img);
      row.append(td);
      row.classList.add('has-thumb');
    }
  }
  buildThumbs();
  wide.addEventListener('change', buildThumbs);

  // Restore a linked view (?q=…&sort=…). Last, so everything above is wired first.
  {
    const p = new URLSearchParams(location.search);
    const s = p.get('sort') || '';
    const key = s.replace(/^-/, '');
    if (heads.some((b) => b.dataset.sort === key)) { sort.key = key; sort.dir = s.startsWith('-') ? -1 : 1; applySort(false); }
    if (p.get('q')) { input.value = p.get('q'); applyFilter(); }
  }
})();
