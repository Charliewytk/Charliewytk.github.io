import { createLoop } from './engine/loop.js';
import { attachInput } from './engine/input.js';
import { initAudio, setSfxVolume } from './audio/synth.js';
import { startMusic, setMood, setMusicVolume, setMuffled } from './audio/music.js';
import { createTitle } from './state/title.js';
import { createBattle } from './state/battle.js';
import { createResults } from './state/results.js';
import { loadSave, storeSave, totalStars } from './game/save.js';
import { initArmorGames, agLoadSave, agPushSave, agSyncFeats } from './platform/armorgames.js';
import { LEVELS } from './game/levels/index.js';
import { drawSurround, drawRotatePrompt } from './render/surround.js';
import { initPortal, gameplayStart, gameplayStop, happytime,
         reportProgress, onMuteChange } from './platform/portal.js';

// 16:9. Every screen derives its layout from these two numbers, so this is the
// only place the field size is stated. Level paths and the world chart carry
// authored coordinates and were rescaled to match by tools/widen-to-16x9.py.
const W = 1067, H = 600;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

import { createMap } from './state/map.js';
import { createUpgrades } from './state/upgrades.js';
import { createCodex } from './state/codex.js';
import { createSettings } from './state/settings.js';
import { createComic } from './state/comic.js';
import { createFeatsScreen } from './state/achievements.js';

const STATES = {
  comic: createComic,
  feats: createFeatsScreen,
  title: createTitle,
  battle: createBattle,
  results: createResults,
  map: createMap,
  upgrades: createUpgrades,
  codex: createCodex,
  settings: createSettings,
};

const STATE_MOODS = {
  title: 'menu', map: 'menu', upgrades: 'menu', codex: 'menu',
  settings: 'menu', results: 'menu', battle: 'battle', comic: 'menu', feats: 'menu',
};

// PWA install support (skipped on localhost so dev never serves stale code)
if ('serviceWorker' in navigator && !location.hostname.includes('localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* fine without it */ });
}

const game = {
  W, H, canvas, ctx,
  state: null,
  pointerType: window.matchMedia('(pointer: fine)').matches ? 'mouse' : 'touch',
  save: loadSave(),
  persist() {
    storeSave(this.save);
    reportProgress(completionPercent());
    agPushSave(this.save);      // debounced; no-op off Armor Games
    agSyncFeats(this.save);
  },
  hasState(name) { return !!STATES[name]; },
  registerState(name, factory) { STATES[name] = factory; },
  setState(name, data) {
    const factory = STATES[name];
    if (factory) {
      this.state = factory(this, data);
      if (STATE_MOODS[name]) setMood(STATE_MOODS[name]);
      setMuffled(false);
    }
  },
};

// The canvas fills the viewport; the 1067×600 play field is centred inside it
// and whatever margin is left over gets painted as deep water (see surround.js).
const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

// Safe-area insets (notch, Dynamic Island, home indicator). The canvas still
// covers the whole screen — only the painted surround sits under the cutouts —
// but the play field is kept inside the safe rect so no HUD hides behind them.
const safeProbe = document.getElementById('safe-probe');
function safeInsets() {
  if (!safeProbe) return { t: 0, r: 0, b: 0, l: 0 };
  const s = getComputedStyle(safeProbe);
  return {
    t: parseFloat(s.paddingTop) || 0,
    r: parseFloat(s.paddingRight) || 0,
    b: parseFloat(s.paddingBottom) || 0,
    l: parseFloat(s.paddingLeft) || 0,
  };
}

function resize() {
  const vw = window.innerWidth | 0;
  const vh = window.innerHeight | 0;
  // Portals iframe the game and collapse that frame to nothing while toggling
  // fullscreen or opening an ad overlay. Laying out against a degenerate size
  // used to clamp the field to its 160px minimum and stick there, because the
  // frame settles back without firing another resize — hence the ResizeObserver
  // below. Ignore the bad size outright and keep the last good layout.
  if (vw < 2 || vh < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.dpr = dpr;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.width = Math.max(1, Math.round(vw * dpr));
  canvas.height = Math.max(1, Math.round(vh * dpr));

  // a touch device held in portrait can't show a landscape field usefully
  view.rotate = vh > vw && (navigator.maxTouchPoints || 0) > 0;
  if (view.rotate && game.state && game.state._battle) {
    game.state._battle.B.paused = true;
  }

  const ins = safeInsets();
  const availW = Math.max(160, vw - ins.l - ins.r);
  const availH = Math.max(120, vh - ins.t - ins.b);
  view.scale = Math.min(availW / W, availH / H) * dpr;
  view.ox = Math.round(ins.l * dpr + (availW * dpr - W * view.scale) / 2);
  view.oy = Math.round(ins.t * dpr + (availH * dpr - H * view.scale) / 2);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
// The window resize event can be missed entirely when a host page resizes our
// iframe — observing the element itself catches the size it actually settles on.
if (window.ResizeObserver) new ResizeObserver(resize).observe(document.getElementById('wrap'));
resize();

// canvas-relative CSS pixels -> logical game coordinates
function toLogical(cx, cy) {
  return [(cx * view.dpr - view.ox) / view.scale, (cy * view.dpr - view.oy) / view.scale];
}

const pointer = { x: -100, y: -100, fine: window.matchMedia('(pointer: fine)').matches };

// Hide the OS cursor only over the play field, where we draw our own brass one.
// Over the painted surround the native cursor comes back.
let cursorHidden = null;
function setCursorStyle(x, y) {
  if (!pointer.fine) return;
  const inside = x >= 0 && y >= 0 && x <= W && y <= H;
  if (inside === cursorHidden) return;
  cursorHidden = inside;
  canvas.style.cursor = inside ? 'none' : 'default';
}

attachInput(canvas, toLogical, {
  down(x, y, type) {
    // Reclaim keyboard focus for our frame. A playtester reported spacebar
    // scrolling the page: our own handlers cancel it and the page cannot even
    // scroll, so the keystrokes were going to the *host* page around the iframe.
    // Grabbing focus on any interaction keeps the keys with the game.
    try { window.focus(); } catch { /* cross-origin host; nothing to do */ }
    initAudio();
    setSfxVolume(game.save.settings.sfx);
    startMusic();
    setMusicVolume(game.save.settings.music);
    // touch has no hover, so menus need tap-to-preview then tap-to-confirm
    if (type) game.pointerType = type;
    pointer.x = x; pointer.y = y;
    if (game.state && game.state.pointerDown) game.state.pointerDown(x, y);
  },
  move(x, y, type) {
    if (type) game.pointerType = type;
    pointer.x = x; pointer.y = y;
    setCursorStyle(x, y);
    if (game.state && game.state.pointerMove) game.state.pointerMove(x, y);
  },
  up(x, y) {
    if (game.state && game.state.pointerUp) game.state.pointerUp(x, y);
  },
});

// keyboard: SPACE = hero ability, W/Enter = wave, H = hero, S = speed, Esc/P = pause
window.addEventListener('keydown', e => {
  if ([' ', 'Enter'].includes(e.key)) e.preventDefault();
  initAudio();
  setSfxVolume(game.save.settings.sfx);
  startMusic();
  setMusicVolume(game.save.settings.music);
  if (game.state && game.state.onKey) game.state.onKey(e.key.toLowerCase() === 'enter' ? 'enter' : e.key);
});

// A playtester dragging near the edge of the field scrolled the host page
// instead ("I tried to place it, but it just scrolled down the page"). Inside a
// portal iframe that yanks the game out from under the player. Wheel and the
// scrolling keys are swallowed while the pointer is over the canvas.
canvas.addEventListener('wheel', e => e.preventDefault(), { passive: false });
window.addEventListener('keydown', e => {
  const scrolls = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
  if (scrolls.includes(e.key) && e.target === document.body) e.preventDefault();
}, { passive: false });

// iOS suspends the AudioContext whenever the app is backgrounded and will only
// let it resume from inside a genuine user gesture — listening for visibility
// changes is not enough under WebKit's restrictions. Every pointerdown already
// calls initAudio(), which resumes a suspended context; touchend is added on
// top because some WebKit builds honour it and not pointer events.
window.addEventListener('touchend', () => initAudio(), { passive: true });

// auto-pause when the tab loses focus (prevents cheap deaths)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state && game.state._battle) {
    game.state._battle.B.paused = true;
    setMuffled(true);
  }
});

// Portal handshake. Nothing here blocks the game: if there's no SDK on the
// page (itch, local dev) every one of these calls is a no-op.
//
// No loadingStart/loadingStop pair: the SDK only becomes usable after its own
// async init, by which point our modules are already parsed and the title
// screen is up. Bracketing zero elapsed time would report a fictional load.
game.setState('title');

initPortal().then(connected => {
  if (!connected) return;
  // The platform mute switch overrides our own sliders while it is on.
  onMuteChange(muted => {
    setSfxVolume(muted ? 0 : game.save.settings.sfx);
    setMusicVolume(muted ? 0 : game.save.settings.music);
    game.portalMuted = muted;
  });
  reportProgress(completionPercent());
});

// Armor Games cloud save. Their storage is last-write-wins with no locking, so
// rather than trusting whichever copy answers first, the two saves are compared
// on progress and the further-along one wins. A player who got ahead offline
// keeps that progress; a player on a new device inherits their account's.
initArmorGames().then(connected => {
  if (!connected) return;
  agSyncFeats(game.save);
  return agLoadSave().then(cloud => {
    if (!cloud) { agPushSave(game.save); return; }
    if (totalStars(cloud) > totalStars(game.save)) {
      game.save = { ...game.save, ...cloud };
      storeSave(game.save);
      game.setState('title');    // rebuild the menu against the adopted save
    } else {
      agPushSave(game.save);
    }
  });
});

// Completion is "stations cleared", which is the milestone players actually
// feel. Challenge modes and the upgrade tree deliberately don't count, so
// finishing the campaign reads as 100%.
function completionPercent() {
  return (Object.keys(game.save.stars).length / LEVELS.length) * 100;
}

// custom brass-trident cursor (desktop only; touch keeps the native feel)
function drawCursor(c) {
  if (!pointer.fine) return;
  // Only inside the play field. The surround is painted once per resize (it is
  // static), so anything drawn out there would smear and never be cleared —
  // out there the real OS cursor is restored instead, see setCursorStyle().
  const { x, y } = pointer;
  if (x < 0 || y < 0 || x > W || y > H) return;
  c.save();
  c.translate(x, y);
  c.rotate(-0.5);
  c.fillStyle = '#f5e7c8';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(4.5, 13);
  c.lineTo(7.5, 9.5);
  c.lineTo(13, 12.5);
  c.lineTo(9.5, 5.5);
  c.lineTo(13.5, 4);
  c.closePath();
  c.fill();
  c.strokeStyle = '#101a2b';
  c.lineWidth = 2;
  c.lineJoin = 'round';
  c.stroke();
  c.fillStyle = '#f0a83f';
  c.beginPath();
  c.arc(2.5, 3.5, 1.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// The portal wants to know when the player is actually playing, as opposed to
// sitting in a menu, a comic or a pause screen. Deriving it from live state
// each tick — rather than sprinkling calls through every screen — means it
// can't drift out of sync; both calls ignore a repeat of the state they're in.
function syncPortalSession() {
  const b = game.state && game.state._battle;
  const active = !!b && !b.B.paused && b.B.phase !== 'over' && !view.rotate;
  if (active) gameplayStart();
  else gameplayStop();
}

const update = dt => {
  game.state.update(dt);
  syncPortalSession();
};
const render = () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (view.rotate) {
    drawRotatePrompt(ctx, canvas.width, canvas.height, performance.now() / 1000);
    return;
  }
  drawSurround(ctx, canvas.width, canvas.height, view.ox, view.oy,
    W * view.scale, H * view.scale);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  // paths and spawn caves deliberately run past the field edge; the old
  // letterbox cropped them, so clip to keep them out of the surround
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  game.state.render(ctx);
  // inside the clip: the cursor glyph extends down-right of its anchor, so
  // drawing it outside would let it spill past the field edge into the
  // surround, which is only painted on resize and would keep the smear
  drawCursor(ctx);
  ctx.restore();
};

createLoop(update, render);

// Debug hook: lets automated tests pump simulated time when rAF is throttled.
window.__AW = {
  game,
  view,
  portal: { initPortal, gameplayStart, gameplayStop, reportProgress, happytime },
  step(sec = 1) {
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) update(1 / 60);
    render();
  },
};
