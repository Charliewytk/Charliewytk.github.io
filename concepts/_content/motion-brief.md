# Motion and craft brief

Goal: Linear / Apple Notes calm, with 60fps.design-grade feel. Motion confirms input and shows where things come from; it never decorates. All values are house rules for this site (curves named by their maths; springs sampled by us from stiffness k, damping c, mass 1). Where a rule comes from a source, the source is named.

## 1. Tokens (paste once into `:root`, use nothing else)

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* ease-out-quint: enters, exits, hovers */
  --ease-in-out: cubic-bezier(0.76, 0, 0.24, 1);   /* ease-in-out-quart: on-screen moves and morphs */
  /* each linear() spring is only valid with its own duration */
  --spring-snappy: linear(0, 0.095 6%, 0.278 12%, 0.455 19%, 0.609 25%, 0.724 31%, 0.811 38%, 0.871 44%, 0.914 50%, 0.943 56%, 0.962 62%, 0.975 69%, 0.984 75%, 0.989 81%, 0.993 88%, 0.996 94%, 1);
  --spring-snappy-dur: 400ms;   /* k400 c40, critically damped, no overshoot */
  --spring-bouncy: linear(0, 0.101 6%, 0.305 12%, 0.529 19%, 0.712 25%, 0.852 31%, 0.940 38%, 0.993 44%, 1.018 50%, 1.026 56%, 1.025 62%, 1.021 69%, 1.015 75%, 1.009 81%, 1.005 88%, 1.002 94%, 1);
  --spring-bouncy-dur: 400ms;   /* k400 c30, peaks 2.7 % over: the "springy" default */
  --dur-press: 100ms; --dur-exit: 120ms; --dur-fast: 125ms; --dur-base: 180ms; --dur-slow: 260ms; --stagger: 40ms;
}
@supports not (transition-timing-function: linear(0, 1)) { :root { --spring-snappy: var(--ease-out); --spring-bouncy: var(--ease-out); } }
```

Both springs reach ~90 % of the target by ~200ms; the tail reads as "settling", not slowness.

## 2. Durations by interaction

| Interaction | Duration | Curve |
|---|---|---|
| Press (`:active`), both ways | `--dur-press` | `--ease-out` |
| Hover colour / background | `--dur-fast` | `--ease-out` |
| Tooltip | `--dur-fast` (125ms, Emil Kowalski); 0ms for the next one | `--ease-out` |
| Menu, popover, select | `--dur-base` in, `--dur-exit` out | `--ease-out`; exits never spring |
| Card lift, tab indicator, toggle thumb | `--spring-bouncy-dur` | `--spring-bouncy` |
| Sheet, dialog, accordion | `--spring-snappy-dur` in, `--dur-base` out | `--spring-snappy` in, `--ease-out` out |
| Page / view transition | `--dur-slow` | `--ease-in-out` |
| Keyboard actions, command menu | 0ms | none (Rauno, Emil: frequent actions get no animation) |

No raw ms values in page code: use the tokens. UI motion stays under 300ms (Emil). Exits ~30 % shorter than enters. No `ease-in` in UI. `linear` only for progress or time.

## 3. Enter, exit, press, hover, stagger

- Enter from `scale(0.96)` + `opacity:0`, never `scale(0)` (Emil: start around 0.9 or above). Translate 8px at most.
- Press: `scale(0.97)` on `:active` (Emil). `transform-origin` = the trigger, so a dropdown grows from its button (Emil: origin-aware popovers).
- A muddy crossfade gets `filter: blur(2px)` on the outgoing state (Emil).
- All hover rules sit in `@media (hover:hover) and (pointer:fine)`, so touch never gets a stuck hover.
- Stagger: 40ms per item, total capped at 300ms (items after the 8th arrive with the 8th), first paint of a list only, never on filter or sort, never on honesty labels or trading figures.

```css
.btn { transition: transform var(--dur-press) var(--ease-out), background-color var(--dur-fast) var(--ease-out); }
.btn:active { transform: scale(0.97); }
@media (hover:hover) and (pointer:fine) { .btn:hover { background-color: var(--bg-hover); } }
@media (prefers-reduced-motion: no-preference) {   /* stagger, CSS only; set style="--i:3" in HTML */
  .stagger > * { animation: enter var(--dur-slow) var(--ease-out) backwards; animation-delay: calc(min(var(--i), 7) * var(--stagger)); }
  @keyframes enter { from { opacity: 0; transform: translateY(8px); } }
}
```

## 4. Interruptibility (Rauno: every motion can reverse mid-flight)

- Anything that toggles uses `transition`, never `@keyframes`: transitions retarget from the current value, keyframes restart and jump.
- A reversed CSS transition is shortened and loses velocity. For drag, swipe and anything thrown, use this rAF spring, which keeps velocity when the target changes.
- Apply direct input 1:1 while the finger is down. Light actions may fire mid-gesture; destructive ones wait for release (Rauno).

```js
// Tiny interruptible spring. Call set() at any time; velocity is kept.
export function spring(el, { k = 400, c = 30, onFrame }) {
  let x = 0, v = 0, target = 0, raf = 0, last = 0;
  const tick = (t) => {
    const dt = Math.min((t - (last || t)) / 1000, 1 / 30); last = t;
    v += (-k * (x - target) - c * v) * dt; x += v * dt;
    if (Math.abs(v) < 0.01 && Math.abs(x - target) < 0.01) { x = target; raf = last = 0; onFrame(el, x); return; }
    onFrame(el, x); raf = requestAnimationFrame(tick);
  };
  return { set(t) { target = t; if (!raf) raf = requestAnimationFrame(tick); }, jump(t) { x = target = t; v = 0; onFrame(el, x); } };
}
// const s = spring(card, { onFrame: (el, x) => (el.style.transform = `translateY(${x}px)`) }); s.set(-4);
```

## 5. Default-visible rule (hard rule for this site)

Nothing waits at `opacity:0` for scroll or JS. Headless screenshots, no-JS and unsupported browsers see the full page. Honesty labels ("paper", "after rewards", "not financial advice", "as of 30 September", "tiny size", "Nothing here is trading live at a profit") are in the first paint and are never revealed late. Trading figures appear verbatim at once; never count them up.

## 6. Scroll-linked motion (CSS only, progressive)

Chrome 115+ and Safari 26 run scroll-driven animations; Firefox only behind a flag. Fallback: no animation, content already visible. Never fade below 0.4, so nothing is ever hidden.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }
    @keyframes reveal { from { opacity: 0.4; transform: translateY(12px); } }
  }
}
```

One or two hero moments per page at most. No parallax on text. Never hijack the wheel or change native scroll speed.

## 7. View Transitions (with fallbacks)

Same-document: Chrome 111, Safari 18, Firefox 144. Cross-document (`@view-transition`): Chrome 126, Safari 18.2, not Firefox. Fallback: an instant change.

```css
@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } }
::view-transition-group(*) { animation-duration: var(--dur-slow); animation-timing-function: var(--ease-in-out); }
```
```js
function swap(update) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return update();
  const t = document.startViewTransition(update);
  t.ready.catch(() => {}); t.finished.catch(() => {});   // no console errors when skipped
}
```

Each `view-transition-name` must be unique on the page at that moment; a duplicate skips the transition and logs an error. Name only the one element that moves.

## 8. Cursor and pointer

Never hide or replace the system cursor; no trails, no magnetic buttons. One subtle effect at most: a soft card highlight, `radial-gradient(240px at var(--mx) var(--my), var(--glow), transparent 70%)`, with `--mx/--my` set from `pointermove` inside one rAF, only under `(hover:hover) and (pointer:fine)`.

## 9. Display type

Stack: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif`. Tracking tightens as size grows (the principle behind Apple's SF tracking tables). `text-wrap: balance` on headings, `pretty` on paragraphs, `tabular-nums` on every number column, body max 68ch.

| Role | Size (phone to desktop) | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display | `clamp(2.5rem, 6vw + 1rem, 4.5rem)` | 600 | -0.035em | 1.02 |
| H2 | `clamp(1.75rem, 2.5vw + 1rem, 2.5rem)` | 600 | -0.025em | 1.1 |
| H3 | 1.25rem | 600 | -0.015em | 1.25 |
| Body | 1rem (1.0625rem on desktop) | 400 | -0.005em | 1.55 |
| Small | 0.8125rem | 500 | 0 | 1.4 |

## 10. Performance

- Animate only `transform`, `opacity`, `filter`. Never `width`, `height`, `top`, `margin`, `box-shadow` (fade a shadow layer's opacity instead).
- `will-change` only while moving (add on `pointerdown`, remove on `transitionend`), never set broadly in CSS.
- One rAF loop per gesture; read layout, then write. No scroll listeners: `IntersectionObserver` for visibility, CSS scroll timelines for progress. Pause off-screen loops and on `document.hidden`.
- Test at 390x844 with 4x CPU throttle: no dropped frames on press, menu or sheet.

## 11. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; transition-delay: 0s !important; scroll-behavior: auto !important; }
  .fade { transition: opacity var(--dur-fast) var(--ease-out) !important; }   /* opt-in: fades stay, nothing moves */
}
```

In JS, check `matchMedia('(prefers-reduced-motion: reduce)').matches` and call `jump()` instead of `set()`.

## 12. Fifteen tells of a cheap-looking site

1. Every section fades up on scroll, all with the same timing.
2. Content hidden at `opacity:0` until JS runs; blank in screenshots.
3. Entrances from `scale(0)` or 40px+ slides.
4. `ease-in` or default `ease` on movement; motion that starts slow.
5. Animations over 400ms on things people click often.
6. Staggers above 50ms per item, or a list that takes over 300ms to land.
7. Bouncy overshoot on exits, or on everything.
8. Scroll-jacking, smooth-scroll libraries, or snapping the reader against their will.
9. Custom cursors, cursor trails, magnetic buttons.
10. Preloaders and intro splashes before content.
11. Count-up numbers (here: any animation on trading figures).
12. Hover effects that stick on touch, or hover as the only way to find a link.
13. Animating `box-shadow`, `width` or `top`; visible jank on a phone.
14. Taglines, eyebrow labels and helper text doing the layout's job; gradient text and glows.
15. Motion that cannot be interrupted: a menu that ignores a second click until its animation ends.
