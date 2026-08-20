// Portal integration (CrazyGames SDK).
//
// The game ships to itch.io and to portals from the same source, so every call
// here has to be a no-op when the SDK isn't on the page. Two separate guards
// are needed: the script may be absent entirely (itch, local dev), and when it
// IS present but the page is served from a non-CrazyGames domain the SDK
// reports environment 'disabled' and *throws* on every call. So we check for
// the object, check the environment, and still wrap each call in try/catch —
// a portal analytics hiccup must never take the game down with it.

let sdk = null;          // the live SDK, or null when we're running standalone
let ready = false;
let playing = false;     // mirrors gameplayStart/Stop so we never double-fire
const muteListeners = [];

function api() {
  if (!ready || !sdk) return null;
  return sdk;
}

// Every outbound call funnels through here.
function call(fn) {
  const s = api();
  if (!s) return undefined;
  try {
    return fn(s);
  } catch {
    return undefined;   // SDK disabled or mid-teardown; the game carries on
  }
}

export async function initPortal() {
  const candidate = window.CrazyGames && window.CrazyGames.SDK;
  if (!candidate) return false;
  try {
    await candidate.init();
    // 'disabled' means we're embedded somewhere the SDK won't serve; treat it
    // exactly like having no SDK at all rather than letting calls throw.
    if (candidate.environment === 'disabled') return false;
    sdk = candidate;
    ready = true;
  } catch {
    return false;
  }
  // The platform owns the mute switch and it outranks our own audio settings.
  call(s => {
    const fire = () => {
      const muted = !!(s.game.settings && s.game.settings.muteAudio);
      for (const cb of muteListeners) cb(muted);
    };
    s.game.addSettingsChangeListener(fire);
    fire();
  });
  return true;
}

// --- session events -------------------------------------------------------
// gameplayStart also marks the end of the measured initial download, so it must
// fire only once the player can actually act — not while a comic is playing.

export function gameplayStart() {
  if (playing) return;
  playing = true;
  call(s => s.game.gameplayStart());
}

export function gameplayStop() {
  if (!playing) return;
  playing = false;
  call(s => s.game.gameplayStop());
}

export function loadingStart() { call(s => s.game.loadingStart()); }
export function loadingStop() { call(s => s.game.loadingStop()); }

// Site-wide celebration. Reserved for beating a boss — the docs are explicit
// that routine wins shouldn't trigger it.
export function happytime() { call(s => s.game.happytime()); }

export function reportProgress(pct) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  call(s => s.game.reportGameCompletedPercentage(v));
}

// Attached to feedback reports so a bug reporter's state comes through with it.
export function setContext(obj) { call(s => s.game.setGameContext(obj)); }
export function clearContext() { call(s => s.game.clearGameContext()); }

export function onMuteChange(cb) {
  muteListeners.push(cb);
  const s = api();
  if (s) {
    try { cb(!!(s.game.settings && s.game.settings.muteAudio)); } catch { /* ignore */ }
  }
}

export function isPortal() { return ready; }
