// Level 8 — Shifting Sands: halfway through the defence, the seabed slumps
// and carves a NEW channel — the path changes at wave 5.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level08 = {
  id: 'level08',
  zone: 1,
  name: 'Shifting Sands',
  intro: 'The seabed here never settles. Build for the map you will have, not the map you see.',
  startGold: 380,
  lives: 20,
  waveBonus: 26,
  ironTowers: ['arc', 'sonar', 'drone'],
  paths: [[
    [-44, 150], [222, 150], [400, 220], [578, 160], [778, 200],
    [867, 330], [778, 460], [578, 500], [378, 460], [222, 520], [89, 560],
  ]],
  // after the shift a second mouth feeds the SAME exit
  shift: {
    wave: 4,
    paths: [
      [
        [-44, 150], [222, 150], [400, 220], [578, 160], [778, 200],
        [867, 330], [778, 460], [578, 500], [378, 460], [222, 520], [89, 560],
      ],
      [
        [1111, 90], [911, 120], [734, 90], [578, 160], [778, 200],
        [867, 330], [778, 460], [578, 500], [378, 460], [222, 520], [89, 560],
      ],
    ],
  },
  pads: [
    [311, 90], [156, 220], [478, 260], [667, 100], [689, 260],
    [778, 350], [656, 430], [467, 400], [289, 440], [156, 460],
    [956, 200], [978, 420],
  ],
  waves: [
    { groups: [g('fry', 12, 0.55), g('barracuda', 5, 1.3, 4)] },
    { groups: [g('isopod', 6, 1.4), g('mite', 12, 0.3, 3)] },
    { groups: [g('stalker', 5, 1.5), g('jelly', 3, 2.2, 3)] },
    { groups: [g('worm', 6, 1.5), g('husk', 5, 1.4, 3)] },
    { intro: 'The seabed slumps — a second channel tears open in the east!', groups: [g('barracuda', 6, 1.1), g('lancer', 4, 1.7, 3, { path: 1 })] },
    { groups: [g('hermit', 5, 1.7), g('stalker', 5, 1.4, 2, { path: 1 }), g('mite', 12, 0.3, 6, { path: 1 })] },
    { groups: [g('jelly', 4, 2), g('worm', 5, 1.5, 2, { path: 1 }), g('ray', 6, 1.3, 5)] },
    { groups: [g('angler', 3, 2.4, 0, { path: 1 }), g('husk', 6, 1.2, 2), g('barracuda', 7, 1, 5, { path: 1 })] },
    { groups: [g('brood', 2, 3), g('lancer', 5, 1.5, 2, { path: 1 }), g('fry', 16, 0.35, 6)] },
    { groups: [g('behemoth', 1, 1, 0, { path: 1 }), g('angler', 3, 2.3, 3), g('stalker', 5, 1.3, 7, { path: 1 }), g('mite', 14, 0.28, 10)] },
  ],
};
