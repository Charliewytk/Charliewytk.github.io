// Level 7 — The Black Smokers: vent chimneys and magic-proof husks. Long
// winding single path with a tight switchback the artillery loves.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level07 = {
  id: 'level07',
  zone: 1,
  name: 'The Black Smokers',
  intro: 'The vents cook the water. What swims out is already boiled mean.',
  startGold: 360,
  lives: 20,
  waveBonus: 24,
  ironTowers: ['charge', 'drone', 'harpoon'],
  paths: [[
    [-44, 110], [200, 130], [378, 90], [556, 140], [622, 260],
    [511, 340], [333, 300], [178, 360], [200, 480], [400, 520],
    [600, 480], [778, 520], [934, 460], [978, 330], [889, 220], [1111, 160],
  ]],
  pads: [
    [267, 200], [467, 200], [100, 200], [622, 160], [422, 380],
    [267, 420], [100, 440], [522, 560], [711, 420], [878, 560],
    [845, 320], [989, 220],
  ],
  waves: [
    { groups: [g('husk', 5, 1.5), g('fry', 10, 0.5, 3)] },
    { groups: [g('lancer', 4, 1.8), g('mite', 10, 0.32, 3)] },
    { groups: [g('stalker', 5, 1.5), g('husk', 5, 1.4, 3)] },
    { groups: [g('barracuda', 8, 0.9), g('jelly', 3, 2.2, 2)] },
    { groups: [g('worm', 6, 1.5), g('lancer', 5, 1.6, 3)] },
    { groups: [g('husk', 8, 1.1), g('ray', 6, 1.3, 2), g('mite', 12, 0.3, 6)] },
    { groups: [g('hermit', 5, 1.7), g('glider', 5, 1.5, 3), g('stalker', 6, 1.3, 6)] },
    { groups: [g('husk', 4, 1.4, 0, { elite: true }), g('jelly', 4, 2, 2), g('barracuda', 8, 0.9, 5)] },
    { groups: [g('angler', 4, 2.2), g('worm', 6, 1.4, 2), g('lancer', 5, 1.5, 6)] },
    { groups: [g('brood', 2, 3), g('husk', 7, 1.1, 2), g('fry', 14, 0.4, 7)] },
    { groups: [g('behemoth', 1, 1), g('stalker', 4, 1.4, 3, { elite: true }), g('glider', 6, 1.3, 7), g('mite', 14, 0.28, 10)] },
  ],
};
