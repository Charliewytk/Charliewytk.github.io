/* Palette concept: behaviour.
   - Type to filter rows (index.html holds the rows; this file never creates them).
   - Arrow keys / pointer move one highlight, driven by an interruptible spring.
   - Enter or click opens a detail sheet that grows out of the row: tile, title and status
     travel across (FLIP), and on wide screens the panel's height springs to fit.
   - Idle: the empty field types out project names and the highlight follows them.
   Copy and numbers below are verbatim from concepts/_content/content.json. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- data
  // One entry per project, keyed by the row's data-slug. v = value, l = label, q = qualifier
  // (a qualifier always renders next to its number). exeterticketexchange.com is left out:
  // it answered HTTP 402 on 3 Nov 2026. KILL_LOG.md is left out too: its GitHub repo is private
  // (404 for visitors). "~£0" renders as a number with its label (pack: research_summary.revenue).
  const DATA = {
    "exetix": {"n": "01", "name": "ExeTix", "href": "/exetix/", "kind": "iPhone app", "status": "Built and sold", "lead": "Pinged the second Exeter tickets drop.", "also": ["Get pinged the second Exeter tickets drop.", "Sold out? Buy a verified student's spare."], "detail": "On the App Store · released 29 Sep 2026 · sold Oct 2026", "numbers": [{"v": "~1–2 s", "l": "from a known release time to the alert"}, {"v": "£0", "l": "seller fees. Sellers keep 100% of their price"}, {"v": "≈⅓", "l": "of a typical student-resale booking fee: card processing, nothing on top"}], "links": [{"label": "On the App Store", "href": "https://apps.apple.com/gb/app/exetix/id6814591245"}], "fine": ["ExeTix is independent. It is not affiliated with the University of Exeter, any venue, or any ticketing platform, and it never buys tickets on other platforms for you."],
      "media": {"shots": [
        {"src": "/exetix/img/screen-alerts.webp", "alt": "ExeTix onboarding screen ‘Be first, every time’ with sample alerts: dropping in 10 min, tickets just dropped, restock, resale listed"},
        {"src": "/exetix/img/screen-explore.webp", "alt": "ExeTix Explore tab: ‘5 club nights tonight’ with a flyer for Indie Thursday at Timepiece and a Dropping soon rail"},
        {"src": "/exetix/img/screen-drops.webp", "alt": "ExeTix Drops tab: the next drop counting down and sold-out nights watched for restocks"}]}},
    "kill-log": {"n": "02", "name": "The Kill Log", "href": "/kill-log/", "kind": "Quant research", "status": "Research", "lead": "Research that says no.", "also": ["Most trading ideas die. This is where they die on the record."], "detail": "Two strategies in small-size live execution tests. Nothing here claims a profit yet", "numbers": [{"v": "~170", "l": "pre-registered hypotheses across two programmes"}, {"v": "50 / 65", "l": "trading lanes on the second ledger killed, on the record", "q": "From the lane ledger as of 30 September 2026."}, {"v": "p ≈ 1.0", "l": "deflated Sharpe of the best of 3,038 model trials. The honest answer"}, {"v": "110", "l": "paper hypotheses. They died to costs.", "q": "This is a paper book. No live P&L is claimed. No live book is implied."}, {"v": "~£0", "l": "Live tests run at tiny size to measure real fills against paper; paper and backtest numbers are labelled as such throughout."}], "links": [{"label": "Research", "href": "/tracks/research/"}], "fine": ["Scaling up needs a separate, pre-registered live test.", "Separately, the meme-desk auditor has closed about 70 entry and exit variants as failed or inconclusive, with no pass standing.", "No position is held in anything listed."]},
    "solana": {"n": "03", "name": "Solana execution", "href": "/tracks/solana/", "kind": "On-chain infrastructure", "status": "Live execution test", "lead": "Fast enough. Then I measured whether fast mattered.", "also": ["A third of a millisecond, and why it didn't matter.", "Trigger to exit in a third of a millisecond."], "detail": "0.25 SOL clips since 30 Sep 2026", "numbers": [{"v": "0.33 ms", "l": "p50, trigger to ready-to-sign sell bytes (p90 1.2 ms)"}, {"v": "0.4 points", "l": "Replayed on the same positions, it improved the average stop fill by 0.4 points", "q": "Fills are simulated at the estimated landing slot, not landed."}, {"v": "0.0 bps", "l": "median error of my integer AMM quote against the on-chain fill"}, {"v": "~£0", "l": "Live tests run at tiny size to measure real fills against paper; paper and backtest numbers are labelled as such throughout."}], "fine": ["Two strategies in small-size live execution tests. Nothing here claims a profit yet", "Scaling up needs a separate, pre-registered live test."]},
    "merger-monitor": {"n": "04", "name": "Merger Monitor", "href": "/merger-monitor/", "kind": "Data product · SEC filings", "status": "Live · £5/month", "lead": "A table of filings, not a tip sheet.", "also": ["A 3% spread is not 24.6% a year."], "numbers": [{"v": "24.6%", "l": "what a 3% spread looks like annualised. That number is marketing"}, {"v": "+1.38%", "l": "per deal after break risk, costs and forgone carry", "q": "A floor, not a ceiling: deals that die before a definitive proxy never enter the sample. Filings, not advice."}, {"v": "1.59%", "l": "break-even spread. Thinner deals lose money on average"}, {"v": "£5/month", "l": "the same table, emailed the evening it is built", "q": "Zero subscribers so far. Take: £0."}], "links": [{"label": "Pay on Gumroad", "href": "https://wuytackcharlie.gumroad.com/l/mergermonitor", "note": "£5/month on Gumroad. Cancel there. 7-day refund."}], "fine": ["Nothing here is investment advice. No position is held in anything listed."]},
    "doorly": {"n": "05", "name": "Doorly", "href": "/doorly/", "kind": "Web + iOS", "status": "Demo", "lead": "The cheapest flight isn't the cheapest trip.", "also": ["Flight search that ranks the whole door-to-door trip, not just the fare."], "numbers": [{"v": "£120 < £130", "l": "until you add the journey to the airport", "q": "Demo fares, labelled as such."}],
      "media": {"video": "/media/doorly-demo.mp4", "poster": "/media/doorly.jpg", "w": 1400, "h": 972}},
    "powerleash": {"n": "06", "name": "PowerLeash", "href": "/tracks/powerleash/", "kind": "macOS utility", "status": "Download", "lead": "A Mac menu-bar tool with one job.", "also": ["A low power mode that leaves the app in front alone.", "Holds the charger's cap at 42.8 W."], "numbers": [{"v": "42.8 W", "l": "held under a sustained 8-thread burn"}, {"v": "59.0 → 42.7 W", "l": "system load, before and after Match Charger"}, {"v": "−15.6 → −3.5 W", "l": "battery flow while plugged in: from draining hard to nearly break-even", "q": "Battery savings are not quantified yet."}], "download": {"href": "/downloads/PowerLeash.zip", "note": "Apple Silicon, unsigned. Unzip → drag PowerLeash.app to /Applications → right-click Open. Double-click is blocked by Gatekeeper; that is expected. Battery savings are not quantified yet."}},
    "abyss-warden": {"n": "07", "name": "Abyss Warden", "href": "/abyss-warden/", "kind": "Game", "status": "Playable", "lead": "Deep-sea tower defence.", "also": ["Hold the trench. Keep the lights on."], "numbers": [{"v": "5", "l": "bosses, playable in the browser"}, {"v": "20", "l": "levels, all finished and balance-passed"}],
      "media": {"video": "/media/abyss.mp4", "poster": "/media/abyss-poster.jpg", "w": 1400, "h": 875}},
    "deskstatus": {"n": "08", "name": "DeskStatus", "href": "/tracks/deskstatus/", "kind": "macOS app", "status": "Shipped · v1.0.3", "lead": "The whole trading desk in one window.", "also": ["The desk in one window. It can't sign anything.", "Looking can't turn into doing by accident."], "numbers": [{"v": "7", "l": "tabs, a menu-bar status light and a headless mode for scripts"}, {"v": "Read-only", "l": "it can't sign anything"}], "fine": ["The real window shows live account data, so it isn't pictured."]},
    "numerai": {"n": "09", "name": "Numerai", "href": "/tracks/numerai/", "kind": "Tournament ML", "status": "Live, unstaked", "lead": "The audit, and a deadline that moves.", "also": [], "numbers": [{"v": "1.47", "l": "Sharpe of CORR60 over 93 held-out eras, positive in 95% of them"}, {"v": "1.27", "l": "Sharpe of the payout score out of sample, with no losing quarter"}, {"v": "2", "l": "live rounds resolved so far. Too few to stake on; the policy asks for ten"}]},
    "competitions": {"n": "10", "name": "Competitions", "href": "/tracks/competitions/", "kind": "Competitions", "status": "Selected", "lead": "Read deltas, not levels.", "also": ["Quantiacs, BRAIN, Structural Break."], "numbers": [{"v": "1 of 15", "l": "strategies selected in the Quantiacs Q25 contest", "q": "In-sample Sharpe 1.22, maximum drawdown 23.6%."}, {"v": "Gold", "l": "on WorldQuant BRAIN, with about 14 alphas live"}, {"v": "263rd of 1,332", "l": "Structural Break"}, {"v": "−0.0003", "l": "live change from two improvements that gained +0.0144 on my holdout"}]},
    "chess-exchange": {"n": "11", "name": "Chess Exchange", "href": "/tracks/chess-exchange/", "kind": "Markets + engines", "status": "Play money", "lead": "Markets on live games. Play money.", "also": ["Prediction markets on live chess games."], "numbers": [{"v": "W / D / B", "l": "from any position you paste in", "q": "Play money. Not a book, not advice."}, {"v": "6", "l": "liquidity bots around an LMSR market maker"}], "links": [{"label": "Try the FEN → WDL demo", "href": "https://charliewytk.github.io/chess-exchange/"}],
      "media": {"video": "/media/chess-demo.mp4", "poster": "/media/chess.jpg", "w": 1400, "h": 950}},
    "chelsea-bikes": {"n": "12", "name": "Chelsea Bikes", "href": "/chelsea-bikes/", "kind": "Web design", "status": "Prototype", "lead": "My local bike shop, rebuilt unasked.", "also": ["My local bike shop's website, rebuilt unasked."], "detail": "Not yet pitched", "numbers": [{"v": "11", "l": "pages, works offline"}],
      "media": {"video": "/media/chelsea-demo.mp4", "poster": "/media/chelsea.jpg", "w": 1400, "h": 972}}
  };


  // ---------------------------------------------------------------- setup
  const $ = (sel) => document.querySelector(sel);
  const panel = $('#panel'), input = $('#q'), field = input.parentElement, ghost = $('#ghost');
  const bar = $('.bar'), results = $('.results'), foot = $('.foot');
  const list = $('#list'), hl = $('#hl'), empty = $('#empty'), live = $('#live');
  const sheet = $('#sheet'), sheetBg = $('#sheet-bg'), scroller = $('#sheet-scroll');
  const back = $('#back'), leaf = $('#crumb-leaf');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 641px)');   // matches the phone breakpoint in style.css

  const PAD = 8;       // matches --pad in style.css
  const GUTTER = 24;   // .stage padding on wide screens
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Every row, with the text search runs against (qualifiers included, so "paper" or "Sharpe" find them).
  const items = [...list.querySelectorAll('.row')].map((el) => {
    const d = DATA[el.dataset.slug];
    const nameEl = el.querySelector('.name');
    const extra = d
      ? [d.lead, ...d.also, d.kind, d.status, d.detail || '', ...d.numbers.flatMap((x) => [x.v, x.l, x.q || ''])]
      : [el.dataset.keys || '', el.querySelector('.acc').textContent];
    return { el, d, nameEl, name: nameEl.textContent, keys: extra.join(' ').toLowerCase() };
  });
  let shown = items.slice();   // rows currently visible, in DOM order
  let active = 0;              // index into shown
  let quietHl = false;         // true while the highlight shows an idle suggestion (no aria state)

  // Upgrade the plain links to a combobox + listbox (WAI-ARIA 1.2 pattern).
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', 'list');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-autocomplete', 'list');
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;   // the combobox owns the arrow keys; the scroller is not a Tab stop
  list.querySelectorAll('.group').forEach((g) => g.setAttribute('role', 'group'));
  list.querySelector('.rule').setAttribute('role', 'presentation');
  items.forEach((it) => { it.el.setAttribute('role', 'option'); it.el.tabIndex = it.d ? -1 : 0; });

  // ---------------------------------------------------------------- spring
  // Interruptible spring (motion brief §4): set() can be called mid-flight and keeps velocity.
  function spring({ k = 400, c = 30, eps = 0.01, onFrame, onRest }) {
    let x = 0, v = 0, target = 0, raf = 0, last = 0;
    const tick = (t) => {
      const dt = Math.min((t - (last || t)) / 1000, 1 / 30); last = t;
      v += (-k * (x - target) - c * v) * dt; x += v * dt;
      if (Math.abs(v) < eps && Math.abs(x - target) < eps) {
        x = target; v = 0; raf = last = 0; onFrame(x); if (onRest) onRest(x); return;
      }
      onFrame(x); raf = requestAnimationFrame(tick);
    };
    return {
      get value() { return x; },
      get target() { return target; },
      set(t, opts) { if (opts) { k = opts.k ?? k; c = opts.c ?? c; } target = t; if (!raf) raf = requestAnimationFrame(tick); },
      jump(t) { if (raf) cancelAnimationFrame(raf); raf = last = 0; x = target = t; v = 0; onFrame(x); if (onRest) onRest(x); },
    };
  }

  // ---------------------------------------------------------------- highlight
  // Two springs, one per edge: the edge in the direction of travel leads and the other trails,
  // so a single move stretches the pill across the gap and it snaps back to row height
  // (squash and stretch, drawn with transform only). Held arrow keys and filtering jump,
  // so fast input never lags behind.
  let hlH = 44;
  const drawHl = () => {
    const a = hlTop.value, b = hlBot.value + hlH;
    const h = Math.max(hlH * 0.8, b - a);
    hl.style.transform = `translate3d(0, ${a}px, 0) scaleY(${h / hlH})`;
  };
  const hlTop = spring({ k: 600, c: 40, eps: 0.05, onFrame: () => drawHl() });
  const hlBot = spring({ k: 600, c: 40, eps: 0.05, onFrame: () => drawHl() });
  const LEAD = { k: 760, c: 46 }, TRAIL = { k: 400, c: 36 };
  function moveHl(y, animate) {
    if (!animate) { hlTop.jump(y); hlBot.jump(y); return; }
    const down = y > hlTop.target;
    hlTop.set(y, down ? TRAIL : LEAD);
    hlBot.set(y, down ? LEAD : TRAIL);
  }
  let hlFree = false;   // true once the highlight moved while a sheet was closing

  // quiet = visual only (idle suggestions): screen readers hear nothing unless the user moved.
  function setActive(i, animate, quiet = false) {
    if (!shown.length) return;
    active = (i + shown.length) % shown.length;
    quietHl = quiet;
    const el = shown[active].el;
    items.forEach((it) => it.el.setAttribute('aria-selected', String(!quiet && it.el === el)));
    if (quiet) input.removeAttribute('aria-activedescendant');
    else input.setAttribute('aria-activedescendant', el.id);
    const y = el.offsetTop - list.clientTop;
    hlH = el.offsetHeight || hlH;
    moveHl(y, animate && !reduced.matches);
    if (openSlug && morph.target === 0) { hlFree = true; hl.style.visibility = ''; }
    // Keep the row in view; instant, never smooth (motion brief §2).
    const top = el.offsetTop - 8, bottom = el.offsetTop + el.offsetHeight + 8;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }
  const indexOf = (el) => shown.findIndex((it) => it.el === el);

  // ---------------------------------------------------------------- panel size
  // Wide screens: the panel's top stays put and its height follows the content, like Raycast.
  // sizeSpring carries the list height; while a sheet is open the morph value p blends it
  // to the sheet's own height. Phones keep the full-height panel from style.css.
  const MIN_SHEET = 420;
  let sized = false, chrome = 0, maxH = 0, sheetH = 0;
  const sizeSpring = spring({ k: 520, c: 44, eps: 0.3, onFrame: () => { if (flip) renderMorph(morph.value); else applyHeight(0); } });

  // Height the list needs right now: its last child (the Links group) never hides.
  const listContentH = () => { const g = list.lastElementChild; return g.offsetTop + g.offsetHeight + PAD; };

  function layoutPanel() {
    sized = wide.matches;
    if (!sized) { panel.style.removeProperty('height'); panel.style.removeProperty('--top'); return; }
    chrome = bar.offsetHeight + foot.offsetHeight;
    // Centre the panel for the full list, then keep that top whatever the list does.
    const hiddenRows = items.filter((it) => it.el.hidden), emptyWasHidden = empty.hidden;
    hiddenRows.forEach((it) => { it.el.hidden = false; }); empty.hidden = true;
    const full = chrome + listContentH();
    hiddenRows.forEach((it) => { it.el.hidden = true; }); empty.hidden = emptyWasHidden;
    const top = Math.max(GUTTER, Math.round((innerHeight - Math.min(full, innerHeight - 2 * GUTTER)) / 2));
    panel.style.setProperty('--top', `${top - GUTTER}px`);
    maxH = innerHeight - top - GUTTER;
    fitList(false);
  }
  function fitList(animate) {
    if (!sized) return;
    const h = Math.min(maxH, chrome + listContentH());
    (animate && !reduced.matches) ? sizeSpring.set(h) : sizeSpring.jump(h);
  }
  // The open sheet's height: its content, within [MIN_SHEET, maxH].
  const fitSheet = () => { sheetH = Math.min(maxH, Math.max(MIN_SHEET, chrome + scroller.firstElementChild.offsetHeight)); };
  // p: 0 = list height, 1 = sheet height. Returns the results area height.
  function applyHeight(p) {
    const h = lerp(sizeSpring.value, sheetH, p);
    panel.style.height = `${h}px`;
    return h - chrome;
  }

  // ---------------------------------------------------------------- search
  // Name matches rank first (prefix > word start > anywhere > in order), then any other text.
  function match(it, q) {
    const n = it.name.toLowerCase();
    const at = n.indexOf(q);
    if (at === 0) return { score: 100, marks: range(0, q.length) };
    if (at > 0) return { score: n[at - 1] === ' ' ? 80 : 60, marks: range(at, at + q.length) };
    const marks = [];
    let j = 0;
    for (let i = 0; i < n.length && j < q.length; i++) if (n[i] === q[j]) { marks.push(i); j++; }
    if (j === q.length && q.length > 1) return { score: 40 - (marks[marks.length - 1] - marks[0]), marks };
    if (it.keys.includes(q)) return { score: 20, marks: [] };
    return { score: 0, marks: [] };
  }
  function range(a, b) { const r = []; for (let i = a; i < b; i++) r.push(i); return r; }
  function paintName(it, marks) {
    if (!marks.length) { it.nameEl.textContent = it.name; return; }
    const set = new Set(marks);
    it.nameEl.innerHTML = [...it.name].map((ch, i) => set.has(i) ? `<mark>${esc(ch)}</mark>` : esc(ch)).join('');
  }

  function filter(raw) {
    const q = raw.trim().toLowerCase();
    let best = -1, bestScore = 0, projects = 0;
    shown = [];
    items.forEach((it) => {
      const m = q ? match(it, q) : { score: 1, marks: [] };
      // Links (Work, GitHub, Contact) never hide, so a search never ends on an empty screen.
      const visible = m.score > 0 || !it.d;
      it.el.hidden = !visible;
      paintName(it, visible ? m.marks : []);
      if (!visible) return;
      if (it.d) projects++;
      if (m.score > bestScore) { bestScore = m.score; best = shown.length; }
      shown.push(it);
    });
    empty.hidden = projects > 0;
    if (!projects) empty.textContent = `No projects match “${raw.trim()}”`;
    field.classList.toggle('has-value', raw.length > 0);
    // #empty is aria-hidden (a listbox may only hold options), so the live region says it instead.
    live.textContent = !q ? '' : projects ? `${projects} ${projects === 1 ? 'project' : 'projects'}` : empty.textContent;
    setActive(best < 0 ? 0 : best, false);
    fitList(true);
  }

  // ---------------------------------------------------------------- detail sheet
  // One spring value p drives the whole morph: 0 = row, 1 = sheet. Reversing mid-flight keeps velocity.
  // Tile, title and status travel from the row (shared elements); the rest fades in under them.
  let openSlug = null, flip = null, video = null, popSkip = false;
  const isOpen = () => !!openSlug && morph.target === 1;   // open, or opening; a closing sheet acts as the list
  const morph = spring({ k: 300, c: 26, eps: 0.002, onFrame: renderMorph, onRest: (p) => { if (p === 0) closed(); else settledOpen(); } });

  function sheetHTML(slug) {
    const d = DATA[slug];
    const m = d.media || {};
    let media = '';
    if (m.shots) media = `<div class="s-media shots">${m.shots.map((s) => `<img src="${s.src}" alt="${esc(s.alt)}" width="540" height="1173" loading="lazy" decoding="async">`).join('')}</div>`;
    else if (m.video) media = `<div class="s-media"><button class="vid" type="button" aria-label="Play ${esc(d.name)} demo recording" data-name="${esc(d.name)}"><video muted loop playsinline preload="none" poster="${m.poster}" width="${m.w}" height="${m.h}"><source src="${m.video}" type="video/mp4"></video><span class="vid-state" aria-hidden="true"></span></button></div>`;
    const nums = d.numbers.map((x) => `<div><dt>${esc(x.v)}</dt><dd>${esc(x.l)}${x.q ? `<span class="q">${esc(x.q)}</span>` : ''}</dd></div>`).join('');
    const ext = '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 16 8M9 8h7v7"/></svg>';
    const links = (d.links || []).map((l) => /^https?:/.test(l.href)
      ? `<a class="btn" href="${l.href}" rel="noopener">${esc(l.label)}${ext}</a>`
      : `<a class="btn" href="${l.href}">${esc(l.label)}</a>`).join('');
    const dl = d.download ? `<a class="btn" href="${d.download.href}" download>Download</a>` : '';
    const notes = [d.download && d.download.note, ...(d.links || []).map((l) => l.note)].filter(Boolean);
    return `<div class="s-inner">
      <div class="s-head">
        <span class="s-tile"><span class="bloom" aria-hidden="true"></span><span class="s-tile-slot"></span></span>
        <div><h2 class="s-title" id="s-title">${esc(d.name)}</h2><p class="s-meta"><span class="s-kind s-rest">${esc(d.kind)}<span class="s-dot" aria-hidden="true"> · </span></span><span class="s-status">${esc(d.status)}</span></p></div>
      </div>
      <div class="s-rest">
        <p class="s-lead">${esc(d.lead)}</p>
        ${d.detail ? `<p class="s-detail">${esc(d.detail)}</p>` : ''}
        <div class="s-actions"><a class="btn primary" id="s-open" href="${d.href}">Open ${esc(d.name)}<kbd aria-hidden="true">↵</kbd></a>${dl}${links}</div>
        ${notes.map((t) => `<p class="s-note">${esc(t)}</p>`).join('')}
        ${media}
        <dl class="s-nums">${nums}</dl>
        ${(d.fine || []).map((t) => `<p class="s-fine">${esc(t)}</p>`).join('')}
      </div></div>`;
  }

  // "Kind · Status": when the status wraps to its own line, drop the dot so no line ends in one.
  function fitMeta() {
    const meta = scroller.querySelector('.s-meta'); if (!meta) return;
    meta.classList.remove('wrapped');
    const k = meta.querySelector('.s-kind'), st = meta.querySelector('.s-status');
    if (st.offsetTop > k.offsetTop + 2) meta.classList.add('wrapped');
  }

  // Where the row sits and where the sheet's shared elements sit, with no transforms applied.
  // Offsets are stored as if the sheet were scrolled to the top; renderMorph adds the live scroll.
  function measure(row) {
    const sh = {
      tile: scroller.querySelector('.s-tile'),
      title: scroller.querySelector('.s-title'),
      status: scroller.querySelector('.s-status'),
    };
    Object.values(sh).forEach((el) => { el.style.transform = ''; });
    const listT = list.style.transform; list.style.transform = '';
    const s = scroller.scrollTop;
    const box = results.getBoundingClientRect(), r = row.el.getBoundingClientRect();
    const rt = row.el.querySelector('.tile').getBoundingClientRect(), st = sh.tile.getBoundingClientRect();
    const rn = row.nameEl.getBoundingClientRect(), sn = sh.title.getBoundingClientRect();
    const ra = row.el.querySelector('.acc').getBoundingClientRect(), ss = sh.status.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(row.nameEl).fontSize) / parseFloat(getComputedStyle(sh.title).fontSize);
    list.style.transform = listT;
    return {
      top: r.top - box.top, bottom: r.bottom - box.top, left: r.left - box.left, right: box.right - r.right,
      resH: box.height,
      tile: { el: sh.tile, dx: rt.left - st.left, dy: rt.top - st.top - s, s: rt.width / st.width },
      title: { el: sh.title, dx: rn.left - sn.left, dy: rn.top - sn.top - s, s: fs },
      status: { el: sh.status, dx: ra.right - ss.right, dy: ra.top - ss.top - s, s: parseFloat(getComputedStyle(row.el.querySelector('.acc')).fontSize) / parseFloat(getComputedStyle(sh.status).fontSize) },
      rest: [...scroller.querySelectorAll('.s-rest')],
      bloom: scroller.querySelector('.bloom'),
    };
  }

  function renderMorph(p) {
    if (!flip) return;
    const s = scroller.scrollTop;   // read before any write this frame
    const cp = clamp01(p);
    const still = reduced.matches;  // reduced motion: crossfade only, nothing moves or grows
    const inv = 1 - p;
    const resH = sized ? applyHeight(still ? (cp > 0 ? 1 : 0) : cp) : flip.resH;
    // The highlight pill becomes the sheet: its shape grows out of the row to the panel's edges,
    // and its tint thins out so the panel's glass shows through at rest.
    const at = (v) => (still ? 0 : lerp(v, 0, cp));
    sheet.style.clipPath = `inset(${at(flip.top)}px ${at(flip.right)}px ${at(resH - flip.bottom)}px ${at(flip.left)}px round ${still ? 0 : lerp(10, 0, cp)}px)`;
    sheetBg.style.opacity = still ? cp * 0.45 : lerp(1, 0.45, cp);
    // A soft light blooms behind the icon as it lands, then settles to a faint glow.
    flip.bloom.style.opacity = still ? cp * 0.3 : Math.sin(Math.PI * cp) * 0.85 + cp * 0.3;
    // Shared elements travel from the row to the header. Tile and title keep the spring's
    // overshoot; the status lands without it, so it never slides over the text beside it.
    for (const f of [flip.tile, flip.title, flip.status]) {
      const q = f === flip.status ? 1 - cp : inv;
      f.el.style.transform = still ? '' : `translate3d(${f.dx * q}px, ${(f.dy + s) * q}px, 0) scale(${lerp(f.s, 1, p)})`;
      if (still) f.el.style.opacity = cp;
    }
    // Everything else rides along under the title and fades in as the shape opens up.
    // The kind stays out of the way until the status has landed, so only the status travels.
    const o = clamp01((p - 0.2) / 0.5), ko = clamp01((p - 0.8) / 0.2);
    flip.rest.forEach((el) => {
      if (el.classList.contains('s-kind')) { el.style.opacity = still ? cp : ko; return; }
      el.style.opacity = still ? cp : o;
      el.style.transform = still ? '' : `translate3d(0, ${(flip.title.dy + s) * inv}px, 0)`;
    });
    // The list steps back underneath, gone before the content arrives (the sheet is translucent).
    list.style.opacity = 1 - clamp01(p * 2.5);
    list.style.transform = still ? '' : `scale(${1 - 0.015 * cp})`;
    hl.style.visibility = p > 0.001 && !hlFree ? 'hidden' : '';
  }

  function open(slug, { push = true, instant = false } = {}) {
    const row = items.find((it) => it.el.dataset.slug === slug);
    if (!row) return;
    stopIdle();
    if (openSlug && openSlug !== slug) { morph.jump(0); }   // switching projects: snap the old one shut
    if (openSlug !== slug) {
      scroller.innerHTML = sheetHTML(slug);
      scroller.querySelector('.s-tile-slot').replaceWith(row.el.querySelector('.tile').cloneNode(true));
      sheet.hidden = false;      // must be laid out before the scroll reset sticks
      scroller.scrollTop = 0;
      fitMeta();
      flip = measure(row);
      if (sized) fitSheet();
    }
    openSlug = slug;
    hlFree = false;
    // Reopening the same row while it closes reverses the spring mid-flight, keeping its velocity;
    // a different row snapped the old sheet shut above. Either way the highlight sits on this row.
    const i = indexOf(row.el); if (i >= 0 && i !== active) setActive(i, false);
    row.el.classList.add('lifted');
    panel.classList.add('is-open');
    leaf.textContent = DATA[slug].name;
    list.inert = true;
    input.inert = true;          // the field is invisible while a sheet is open
    back.tabIndex = 0;
    input.setAttribute('aria-expanded', 'false');
    if (push) history.pushState({ sheet: slug }, '', `#/${slug}`);
    if (instant) morph.jump(1); else if (reduced.matches) fade(1); else morph.set(1, { k: 300, c: 26 });
    $('#s-open').focus({ preventScroll: true });
  }

  // Everything a closing sheet changes happens here, at once, so keys and pointer act on the
  // list from the first frame of the close (closed() only tidies up once the spring rests).
  function close({ fromHistory = false } = {}) {
    if (!openSlug || morph.target === 0) return;
    if (!fromHistory) {
      if (history.state && history.state.sheet) { popSkip = true; history.back(); }   // drop our entry; its popstate is ignored
      else history.replaceState(null, '', location.pathname + location.search);
    }
    input.inert = false;
    sheet.classList.remove('settled');
    panel.classList.remove('is-open');
    list.inert = false;
    back.tabIndex = -1;
    input.setAttribute('aria-expanded', 'true');
    playVideo(false);
    // Exits never overshoot: critically damped and a little stiffer than the way in.
    if (reduced.matches) fade(0); else morph.set(0, { k: 520, c: 46 });
    // Keyboard and mouse users go straight back to typing; on touch, don't summon the keyboard.
    if (fine.matches) input.focus({ preventScroll: true });
    else shown[active] && shown[active].el.focus({ preventScroll: true });
  }

  function closed() {
    if (!openSlug) return;
    scroller.scrollTop = 0;
    sheet.hidden = true;
    items.forEach((it) => it.el.classList.remove('lifted'));
    list.style.opacity = list.style.transform = '';
    hl.style.visibility = '';
    scroller.innerHTML = '';
    openSlug = flip = video = null;
    hlFree = false;
    leaf.textContent = '';
    if (sized) applyHeight(0);
  }

  function settledOpen() {
    sheet.classList.add('settled');   // turns on the scroll-edge fade
    video = scroller.querySelector('video');
    if (video && !reduced.matches) playVideo(true);
  }
  // Demo videos: autoplay muted once the sheet settles (not under reduced motion); click to pause/play.
  function playVideo(on) {
    if (!video) return;
    const btn = video.parentElement;
    if (on) video.play().catch(() => {}); else video.pause();
    btn.classList.toggle('playing', on);
    btn.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${btn.dataset.name} demo recording`);
  }
  scroller.addEventListener('click', (e) => {
    if (!e.target.closest('.vid')) return;
    video = scroller.querySelector('video');
    playVideo(video.paused);
  });

  // Reduced motion: a short opacity tween instead of the spring.
  function fade(to) {
    const from = morph.value, start = performance.now();
    const step = (t) => {
      const k = clamp01((t - start) / 125);
      if (k < 1) { renderMorph(lerp(from, to, k)); requestAnimationFrame(step); } else morph.jump(to);
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- idle suggestions
  // On first load the empty field types out each project name once and the highlight moves
  // to it as soon as the typed prefix is unique, so Enter opens whatever is suggested. One pass
  // only (WCAG 2.2.2); any key or pointer input ends it for good. It moves the highlight quietly
  // (no aria changes), and the first arrow key after it starts from the top of the list.
  const SUGGEST = items.filter((it) => it.d).map((it) => it.name);
  let idleTimer = 0, idleOn = false, idleIdx = 0, idleDone = false;
  const wait = (ms) => new Promise((res) => { idleTimer = setTimeout(res, ms); });
  const unique = (prefix) => SUGGEST.filter((n) => n.toLowerCase().startsWith(prefix.toLowerCase())).length === 1;

  async function idleLoop() {
    idleOn = true;
    while (idleOn && idleIdx < SUGGEST.length) {
      // Only suggest rows already in view, so the idle loop never scrolls the list.
      const inView = (it) => it.el.offsetTop >= list.scrollTop && it.el.offsetTop + it.el.offsetHeight <= list.scrollTop + list.clientHeight;
      let target = null;
      while (!target && idleIdx < SUGGEST.length) {
        const name = SUGGEST[idleIdx++];
        const it = items.find((x) => x.name === name);
        if (inView(it)) target = it;
      }
      if (!target) break;
      const word = target.name;
      if (reduced.matches) {   // no typing effect, just swap the word
        ghost.textContent = word; setActive(indexOf(target.el), false, true);
        await wait(2600); if (!idleOn) return; continue;
      }
      field.classList.add('typing');
      let moved = false;
      for (let i = 1; i <= word.length; i++) {
        ghost.textContent = word.slice(0, i);
        if (!moved && (unique(word.slice(0, i)) || i === word.length)) { setActive(indexOf(target.el), true, true); moved = true; }
        await wait(45 + Math.random() * 45); if (!idleOn) return;
      }
      field.classList.remove('typing');
      await wait(1900); if (!idleOn) return;
      field.classList.add('typing');
      for (let i = word.length - 1; i >= 0; i--) { ghost.textContent = word.slice(0, i); await wait(22); if (!idleOn) return; }
      field.classList.remove('typing');
      await wait(420); if (!idleOn) return;
    }
    idleOn = false; idleDone = true; ghost.textContent = '';
  }
  function stopIdle() {
    clearTimeout(idleTimer); idleOn = false; idleDone = true;
    ghost.textContent = ''; field.classList.remove('typing');
  }
  function scheduleIdle(ms) {
    if (idleDone) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!input.value && !openSlug && !document.hidden) idleLoop(); }, ms);
  }

  // ---------------------------------------------------------------- input
  const isText = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  const printable = (e) => e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;

  function activate(e) {
    const it = shown[active];
    if (!it) return;
    if (it.d && !(e.metaKey || e.ctrlKey)) open(it.el.dataset.slug);
    else location.href = it.el.href;   // links, or ⌘↵ to go straight to a project's page
  }

  input.addEventListener('input', () => { stopIdle(); filter(input.value); });

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'k') {
      e.preventDefault(); if (isOpen()) close(); input.focus(); input.select(); return;
    }
    if (isOpen()) {
      if (k === 'Escape' || (k === 'Backspace' && !isText(e.target))) { e.preventDefault(); close(); return; }
      // Typing anywhere goes back to the list and into the field, as in Raycast.
      if (printable(e) && k !== ' ' && !isText(e.target)) { close(); input.focus({ preventScroll: true }); }
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      const fromIdle = quietHl;
      stopIdle();
      if (fromIdle) setActive(k === 'ArrowDown' ? 0 : -1, true);   // the suggestion was never a selection
      else setActive(active + (k === 'ArrowDown' ? 1 : -1), !e.repeat);
      return;
    }
    if (k === 'Enter' && (e.target === input || e.target.closest('.row'))) { e.preventDefault(); stopIdle(); activate(e); return; }
    if (k === 'Escape' && input.value) { input.value = ''; filter(''); return; }
    if (k === '/' && e.target !== input) { e.preventDefault(); input.focus(); return; }
    if (printable(e) && !isText(e.target)) input.focus({ preventScroll: true });
  });

  // Pointer. Mouse: hover moves the highlight (pointermove, so scrolling under a still mouse
  // doesn't). Touch and pen: the highlight moves only once a press has held still for 80 ms,
  // so a scroll gesture never drags it around; a quick tap moves it in open().
  let pressTimer = 0, press = null;
  const unpress = () => { clearTimeout(pressTimer); press = null; hl.classList.remove('press'); };
  const pressRow = (row) => { const i = indexOf(row); if (i !== active) setActive(i, true); hl.classList.add('press'); };
  list.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) unpress();
      return;
    }
    const row = e.target.closest('.row'); if (!row) return;
    const i = indexOf(row);
    if (i !== active || quietHl) { stopIdle(); setActive(i, true); }
  });
  list.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.row'); if (!row || e.button !== 0) return;
    stopIdle();
    if (e.pointerType === 'mouse') { pressRow(row); return; }
    unpress();
    press = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(() => pressRow(row), 80);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => list.addEventListener(t, unpress));

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.row'); if (!row) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;   // new tab etc.: let the link work
    if (!row.dataset.slug) return;                                                     // Work / GitHub / Contact navigate
    e.preventDefault();
    open(row.dataset.slug);
  });

  back.addEventListener('click', () => close());
  // The whole bar is the search field's tap target (on phones there is no autofocus).
  bar.addEventListener('click', (e) => { if (!isOpen() && !e.target.closest('button, input')) input.focus(); });
  panel.addEventListener('pointerdown', (e) => { if (!isOpen() && !e.target.closest('.row')) stopIdle(); });
  // Work, GitHub and Contact are also plain Tab stops; focusing one moves the highlight to it.
  list.addEventListener('focusin', (e) => {
    const row = e.target.closest('.row'); if (!row) return;
    const i = indexOf(row); if (i >= 0 && (i !== active || quietHl)) { stopIdle(); setActive(i, true); }
  });

  // Back/forward and deep links: #/slug opens that project (not #slug, which the live homepage redirects).
  const slugFromHash = () => { const m = location.hash.match(/^#\/([\w-]+)$/); return m && DATA[m[1]] ? m[1] : null; };
  addEventListener('popstate', () => {
    const s = slugFromHash();
    if (popSkip) { popSkip = false; if (!s) return; }   // the back() that close() already acted on
    if (s) open(s, { push: false }); else close({ fromHistory: true });
  });

  addEventListener('resize', () => {
    layoutPanel();
    if (shown[active]) setActive(active, false, quietHl);
    if (openSlug && morph.target === 1) {
      const row = items.find((it) => it.el.dataset.slug === openSlug);
      fitMeta(); flip = measure(row); if (sized) fitSheet(); renderMorph(morph.value);
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && idleOn) stopIdle(); });

  // The first sheet layout pays a one-off style and font cost (~35 ms on a normal laptop).
  // Pay it while the page is idle, inside one task so nothing paints, not on the first Enter.
  function warmSheet() {
    if (openSlug) return;
    sheet.style.visibility = 'hidden';
    sheet.hidden = false;
    scroller.innerHTML = sheetHTML('kill-log');
    void scroller.offsetHeight;
    scroller.innerHTML = '';
    sheet.hidden = true;
    sheet.style.visibility = '';
  }

  // ---------------------------------------------------------------- start
  filter('');
  layoutPanel();
  (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(warmSheet, { timeout: 800 });
  const first = slugFromHash();
  if (first) open(first, { push: false, instant: true });
  else {
    if (fine.matches) input.focus({ preventScroll: true });   // no autofocus on touch: it would raise the keyboard
    scheduleIdle(900);
  }
})();
