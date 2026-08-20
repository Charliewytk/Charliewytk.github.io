// Persistent save via localStorage. One save slot, versioned.
const KEY = 'abyssWardenSave.v1';

export function defaultSave() {
  return {
    v: 1,
    stars: {},            // levelId -> 0..3 (best)
    iron: {},             // levelId -> true (challenge cleared, +1 star value)
    heroic: {},           // levelId -> true
    best: {},             // levelId -> { lives, difficulty }
    meta: {},             // metaNodeId -> true
    hero: 'karrick',      // selected hero id
    seen: {},             // enemyId -> true (codex)
    comics: {},           // sceneId -> true (story panels shown)
    feats: {},            // featId -> true (achievements)
    stats: { kills: 0, torps: 0 },
    endlessBest: 0,
    tutorialDone: false,
    settings: { sfx: 0.8, music: 0.6, shake: true, dmgNums: true, autoWave: false, fx: true },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    const d = defaultSave();
    return {
      ...d, ...s,
      settings: { ...d.settings, ...(s.settings || {}) },
      stats: { ...d.stats, ...(s.stats || {}) },
    };
  } catch (err) {
    return defaultSave();
  }
}

export function storeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (err) { /* private mode etc. — play on without persistence */ }
}

export function wipeSave() {
  try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
}

// Total stars earned (level stars + 1 per cleared challenge).
export function totalStars(save) {
  let n = 0;
  for (const k in save.stars) n += save.stars[k];
  for (const k in save.iron) if (save.iron[k]) n += 1;
  for (const k in save.heroic) if (save.heroic[k]) n += 1;
  return n;
}

export function starsSpent(save, metaDefs) {
  let n = 0;
  for (const branch in metaDefs) {
    for (const node of metaDefs[branch]) {
      if (save.meta[node.id]) n += node.cost;
    }
  }
  return n;
}
