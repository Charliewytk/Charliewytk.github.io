// Armor Games integration (the AGI).
//
// Same discipline as platform/portal.js: the game ships to itch, CrazyGames,
// Poki and Armor Games from one source, so every call here is inert unless the
// AGI is genuinely present. Three things have to be true — the ag.min.js script
// loaded, the parent frame exposed its `agi` object, and an API key was
// supplied — and even then each call is wrapped, because a portal outage must
// never take the game down with it.
//
// Two things the host page must provide (see ArmorGames/index.html):
//   <script src="ag.min.js"></script>      downloaded from their dev portal
//   window.__AG_API_KEY = '...'            the per-game UUID from that portal
//
// What we use:
//   storage  -> cloud saves, so progress follows the player between devices
//   quests   -> our 12 feats become on-site achievements
// We deliberately do NOT touch premium content; there are no purchases.

const SAVE_KEY = 'abyssWardenSave';
const POLL_MS = 250;
const POLL_LIMIT = 40;          // ~10s, then give up quietly and play offline

let ag = null;
let ready = false;
let pushTimer = 0;
const submitted = new Set();    // quests already sent this session

function call(fn) {
  if (!ready || !ag) return null;
  try {
    const p = fn(ag);
    // every AGI method is promise-based; swallow rejections at the boundary
    return p && typeof p.catch === 'function' ? p.catch(() => null) : p;
  } catch {
    return null;
  }
}

// Their docs require document.domain be set so the iframe can reach the parent's
// agi object. Chrome 115+ disables that setter unless the host sends
// Origin-Agent-Cluster: ?0, so this may legitimately throw — in which case we
// simply never connect and the game runs as a normal offline build.
function relaxDomain() {
  if (!/(^|\.)armorgames\.com$/.test(location.hostname)) return;
  try { document.domain = 'armorgames.com'; } catch { /* modern Chrome; see above */ }
}

export function initArmorGames() {
  return new Promise(resolve => {
    const key = window.__AG_API_KEY;
    // A forgotten placeholder is treated as no key at all, so the failure mode
    // is "runs offline" rather than a stream of rejected AGI calls.
    const looksReal = typeof key === 'string' && /^[0-9a-f-]{32,36}$/i.test(key);
    if (!looksReal || !window.ArmorGames) return resolve(false);
    relaxDomain();
    let tries = 0;
    const tick = () => {
      let auth = null;
      try {
        auth = typeof parent.agi !== 'undefined' ? parent.apiAuth : null;
      } catch {
        auth = null;              // cross-origin: not hosted on their page
      }
      if (auth) {
        try {
          ag = new window.ArmorGames({
            user_id: auth.user_id,
            auth_token: auth.auth_token,
            game_id: auth.game_id,
            api_key: key,
            agi: parent.agi,
          });
          ready = true;
          return resolve(true);
        } catch {
          return resolve(false);
        }
      }
      if (++tries > POLL_LIMIT) return resolve(false);
      setTimeout(tick, POLL_MS);
    };
    tick();
  });
}

export function isArmorGames() { return ready; }

// --- cloud save ------------------------------------------------------------
// The whole save travels as one JSON blob. Their storage has no locking and
// documents last-write-wins, so pushes are debounced rather than fired on every
// persist() — the game calls that on almost every meaningful action.

export function agLoadSave() {
  const p = call(a => a.retrieveGame(SAVE_KEY));
  if (!p) return Promise.resolve(null);
  return p.then(res => {
    const raw = res && res[SAVE_KEY];
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }).catch(() => null);
}

export function agPushSave(save) {
  if (!ready) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => call(a => a.saveGame(SAVE_KEY, save)), 2000);
}

// --- quests ----------------------------------------------------------------
// Our feat ids are used verbatim as their developer_id, so the two stay in step
// without a translation table. Submitting an already-complete quest is
// harmless, but the session set avoids the pointless round trips.

export function agSyncFeats(save) {
  if (!ready || !save || !save.feats) return;
  for (const id in save.feats) {
    if (!save.feats[id] || submitted.has(id)) continue;
    submitted.add(id);
    call(a => a.submitQuest(id, 1.0));
  }
}
