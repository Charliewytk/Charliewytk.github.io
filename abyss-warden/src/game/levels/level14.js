// Level 14 — The Crossing: two currents thread through each other. Elites
// everywhere; the abyss stopped sending amateurs.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level14 = {
  id: 'level14',
  zone: 2,
  name: 'The Crossing',
  intro: 'Two rivers of teeth, braided. Aim carefully.',
  startGold: 450,
  lives: 20,
  waveBonus: 30,
  ironTowers: ['charge', 'sonar', 'harpoon'],
  paths: [
    [
      [-44, 120], [200, 140], [400, 220], [534, 340], [622, 460],
      [800, 520], [978, 480], [1045, 360], [1111, 320],
    ],
    [
      [-44, 520], [200, 500], [400, 420], [534, 340], [667, 220],
      [845, 160], [1000, 200], [1045, 360], [1111, 320],
    ],
  ],
  pads: [
    [240, 240], [110, 240], [400, 130], [300, 480], [110, 420],
    [420, 500], [520, 240], [560, 560], [680, 380], [700, 100],
    [820, 300], [817, 573],
  ],
  waves: [
    { groups: [g('barracuda', 7, 1), g('stalker', 5, 1.4, 2, { path: 1 })] },
    { groups: [g('isopod', 5, 1.3, 0, { elite: true }), g('mite', 14, 0.28, 3, { path: 1 })] },
    { groups: [g('worm', 6, 1.3, 0, { path: 1 }), g('jelly', 4, 2, 2)] },
    { groups: [g('hermit', 6, 1.5), g('husk', 6, 1.2, 3, { path: 1 })] },
    { groups: [g('behemoth', 1, 1, 0, { path: 1 }), g('lancer', 5, 1.4, 2), g('ray', 6, 1.3, 6)] },
    { groups: [g('jelly', 4, 1.9, 0, { elite: true, path: 1 }), g('brood', 3, 2.3, 3)] },
    { groups: [g('angler', 4, 2), g('stalker', 6, 1.2, 3, { path: 1 }), g('fry', 18, 0.32, 6)] },
    { groups: [g('worm', 6, 1.2, 0, { elite: true }), g('polyp', 4, 2.2, 3, { path: 1 })] },
    { groups: [g('behemoth', 2, 7, 0, { path: 1 }), g('hermit', 6, 1.5, 3), g('mite', 16, 0.25, 7)] },
    { groups: [g('lancer', 6, 1.3, 0, { elite: true, path: 1 }), g('glider', 6, 1.2, 3), g('barracuda', 9, 0.85, 7)] },
    { groups: [g('angler', 4, 1.9, 0, { elite: true }), g('brood', 4, 2.2, 3, { path: 1 }), g('husk', 8, 1, 8)] },
    { groups: [g('behemoth', 2, 6), g('juggernaut', 2, 5, 8, { path: 1 }), g('stalker', 7, 1.1, 4, { path: 1 }), g('shaman', 2, 3, 10)] },
    { groups: [g('angler', 5, 1.8, 0, { elite: true, path: 1 }), g('polyp', 4, 2, 4), g('lancer', 6, 1.2, 8), g('mite', 20, 0.22, 12, { path: 1 })] },
  ],
};
