// Level 10 — Twin Throats: the trench splits into two gullets with separate
// spawns; broodmothers make every kill a decision.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level10 = {
  id: 'level10',
  zone: 1,
  name: 'Twin Throats',
  intro: 'Two gullets, one gut. Guess where the station sits.',
  startGold: 400,
  lives: 20,
  waveBonus: 28,
  ironTowers: ['drone', 'arc', 'charge'],
  paths: [
    [
      [-44, 110], [178, 140], [356, 100], [511, 160], [578, 290],
      [534, 420], [622, 520], [800, 540], [956, 480], [1000, 360],
    ],
    [
      [-44, 560], [156, 540], [333, 570], [467, 500], [534, 420],
      [622, 520], [800, 540], [956, 480], [1000, 360],
    ],
  ],
  pads: [
    [220, 220], [90, 240], [390, 240], [560, 120], [600, 340],
    [380, 340], [200, 460], [340, 470], [640, 440], [780, 400],
    [815, 571], [920, 240],
  ],
  waves: [
    { groups: [g('fry', 10, 0.55), g('fry', 10, 0.55, 1, { path: 1 })] },
    { groups: [g('isopod', 5, 1.5), g('barracuda', 6, 1.1, 2, { path: 1 })] },
    { groups: [g('brood', 2, 3, 0, { path: 1 }), g('mite', 12, 0.3, 3)] },
    { groups: [g('stalker', 5, 1.4), g('worm', 5, 1.5, 2, { path: 1 })] },
    { groups: [g('jelly', 4, 2, 0, { path: 1 }), g('hermit', 4, 1.8, 2), g('ray', 5, 1.4, 5)] },
    { groups: [g('brood', 3, 2.6), g('husk', 6, 1.2, 2, { path: 1 }), g('mite', 12, 0.3, 6, { path: 1 })] },
    { groups: [g('lancer', 5, 1.5, 0, { path: 1 }), g('barracuda', 8, 0.9, 2), g('jelly', 3, 2.2, 5)] },
    { groups: [g('brood', 2, 3, 0, { elite: true }), g('stalker', 6, 1.3, 3, { path: 1 })] },
    { groups: [g('angler', 4, 2.2, 0, { path: 1 }), g('worm', 6, 1.4, 2), g('fry', 16, 0.35, 6)] },
    { groups: [g('behemoth', 1, 1), g('brood', 3, 2.4, 3, { path: 1 }), g('ray', 7, 1.2, 7)] },
    { groups: [g('angler', 3, 2.2, 0, { elite: true }), g('polyp', 3, 2.4, 3, { path: 1 }), g('hermit', 5, 1.6, 6), g('mite', 16, 0.26, 10, { path: 1 })] },
    { groups: [g('behemoth', 2, 8), g('lancer', 6, 1.4, 3, { path: 1 }), g('jelly', 4, 2, 8), g('barracuda', 8, 0.9, 12, { path: 1 })] },
  ],
};
