// Shared "drop into a level" path. Both the chart and the title screen use this
// so the comic-interlude gating can never drift between them.
import { LEVELS, isUnlocked } from './levels/index.js';

// Every station now opens with an interlude, so the story runs continuously
// instead of going quiet for five levels at a time.
const COMIC_GATES = {
  level01: 'intro',        level02: 'kelpwash',      level03: 'boss1',
  level04: 'splitcurrent', level05: 'twinvents',     level06: 'zone2',
  level07: 'smokers',      level08: 'shiftingsands', level09: 'nursery',
  level10: 'twinthroats',  level11: 'zone3',         level12: 'movingfloor',
  level13: 'survival',     level14: 'crossing',      level15: 'riftthrone',
  level16: 'zone4',        level17: 'frostgarden',   level18: 'methanefalls',
  level19: 'silentrows',   level20: 'hollowcrown',
};

export function launchLevel(game, level, difficulty = 'standard', challenge = null) {
  const data = { level, difficulty, challenge };
  const gate = COMIC_GATES[level.id];
  // Station 1 is the exception: a brand-new player gets their hands on the game
  // first and is told why they're here afterwards. The intro comic lands as a
  // payoff for clearing the station instead of a wall in front of it — see the
  // hook at the end of battle.js. Every later station still opens with its comic.
  if (level.id === 'level01' && !challenge) {
    game.setState('battle', data);
    return;
  }
  if (gate && !game.save.comics[gate] && !challenge) {
    game.save.comics[gate] = true;
    game.persist();
    game.setState('comic', { scene: gate, next: { state: 'battle', data } });
    return;
  }
  game.setState('battle', data);
}

// Where a returning player should pick up: their first unlocked station that
// isn't beaten yet, otherwise the furthest one they've reached.
export function nextStationIndex(save) {
  let furthest = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (!isUnlocked(save, i)) break;
    furthest = i;
    if (!(save.stars[LEVELS[i].id] > 0)) return i;
  }
  return furthest;
}
