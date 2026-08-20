// Campaign registry. Zones: 0 Shelf, 1 Trench, 2 Hadal Rift, 3 Cold Seep.
import { level01 } from './level01.js';
import { level02 } from './level02.js';
import { level03 } from './level03.js';
import { level04 } from './level04.js';
import { level05 } from './level05.js';
import { level06 } from './level06.js';
import { level07 } from './level07.js';
import { level08 } from './level08.js';
import { level09 } from './level09.js';
import { level10 } from './level10.js';
import { level11 } from './level11.js';
import { level12 } from './level12.js';
import { level13 } from './level13.js';
import { level14 } from './level14.js';
import { level15 } from './level15.js';
import { level16 } from './level16.js';
import { level17 } from './level17.js';
import { level18 } from './level18.js';
import { level19 } from './level19.js';
import { level20 } from './level20.js';

export const LEVELS = [
  level01, level02, level03, level04, level05,
  level06, level07, level08, level09, level10,
  level11, level12, level13, level14, level15,
  level16, level17, level18, level19, level20,
];

export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));

export function levelIndex(id) { return LEVELS.findIndex(l => l.id === id); }

export function isUnlocked(save, idx) {
  if (idx === 0) return true;
  const prev = LEVELS[idx - 1];
  return prev && (save.stars[prev.id] || 0) > 0;
}

// Endless siege runs on the survival map with procedurally-scaled waves.
export function endlessLevel(S) {
  return {
    id: 'endless', zone: 2, name: S.endless.name, intro: S.endless.intro,
    startGold: 480, lives: 20, waveBonus: 26, endless: true,
    paths: level13.paths, pads: level13.pads, waves: [],
  };
}
