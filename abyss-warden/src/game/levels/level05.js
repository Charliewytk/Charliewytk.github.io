// Level 5 — Twin Vents: two separate vents spawn two separate streams that
// converge on the station. Hermits, husks and lancers debut.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level05 = {
  id: 'level05',
  zone: 0,
  name: 'Twin Vents',
  intro: 'Two vents. One station. The arithmetic is unkind.',
  startGold: 340,
  lives: 20,
  waveBonus: 24,
  ironTowers: ['charge', 'drone', 'arc'],
  paths: [
    [
      [-44, 90], [156, 120], [289, 220], [267, 360], [400, 440],
      [578, 420], [711, 470], [889, 470], [1000, 420],
    ],
    [
      [1111, 90], [911, 110], [756, 180], [667, 300], [534, 330],
      [445, 250], [311, 300], [267, 360], [400, 440],
      [578, 420], [711, 470], [889, 470], [1000, 420],
    ],
  ],
  pads: [
    [160, 220], [320, 320], [180, 440], [450, 500], [560, 350],
    [730, 400], [740, 200], [560, 220], [400, 170], [850, 320],
  ],
  waves: [
    { groups: [g('fry', 10, 0.6), g('mite', 8, 0.35, 3, { path: 1 })] },
    { groups: [g('isopod', 5, 1.5, 0, { path: 1 }), g('barracuda', 5, 1.2, 2)] },
    { groups: [g('hermit', 4, 2), g('fry', 12, 0.45, 3, { path: 1 })] },
    { groups: [g('husk', 6, 1.3, 0, { path: 1 }), g('jelly', 3, 2.2, 2)] },
    { groups: [g('lancer', 4, 1.8), g('isopod', 6, 1.3, 2, { path: 1 }), g('ray', 5, 1.4, 5, { path: 1 })] },
    { groups: [g('hermit', 5, 1.8, 0, { path: 1 }), g('worm', 5, 1.6, 2), g('mite', 12, 0.3, 6)] },
    { groups: [g('husk', 7, 1.2), g('stalker', 5, 1.4, 2, { path: 1 }), g('jelly', 4, 2, 4, { path: 1 })] },
    { groups: [g('lancer', 5, 1.6, 0, { path: 1 }), g('barracuda', 8, 0.9, 2), g('hermit', 4, 2, 5)] },
    { groups: [g('angler', 4, 2.3), g('husk', 6, 1.3, 2, { path: 1 }), g('worm', 6, 1.5, 4), g('fry', 16, 0.35, 8, { path: 1 })] },
    { groups: [g('behemoth', 1, 1, 0, { path: 1 }), g('lancer', 5, 1.5, 3), g('hermit', 4, 1.9, 6, { path: 1 }), g('mite', 12, 0.3, 10)] },
  ],
};
