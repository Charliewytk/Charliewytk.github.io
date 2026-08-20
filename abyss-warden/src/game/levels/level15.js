// Level 15 — The Rift Throne: the final arena. A spiral descent to the oldest
// thing in the ocean.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level15 = {
  id: 'level15',
  zone: 2,
  name: 'The Rift Throne',
  intro: 'The last light in the last trench. Make it count.',
  startGold: 480,
  lives: 20,
  waveBonus: 32,
  boss: 'leviathan',
  ironTowers: ['harpoon', 'arc', 'charge'],
  paths: [[
    [-44, 100], [222, 90], [467, 130], [689, 100], [911, 160],
    [978, 300], [889, 430], [711, 500], [511, 460], [356, 520],
    [200, 460], [156, 330], [289, 240], [467, 280], [622, 340],
    [756, 300], [1111, 300],
  ]],
  pads: [
    [156, 180], [356, 200], [578, 200], [800, 220], [1000, 460],
    [775, 573], [578, 560], [375, 573], [100, 400], [245, 340],
    [534, 370], [734, 400],
  ],
  waves: [
    { groups: [g('stalker', 6, 1.3), g('mite', 14, 0.28, 3)] },
    { groups: [g('behemoth', 1, 1), g('isopod', 6, 1.2, 2, { elite: true })] },
    { groups: [g('worm', 6, 1.3), g('jelly', 4, 1.9, 2), g('ray', 6, 1.3, 6)] },
    { groups: [g('lancer', 6, 1.3), g('hermit', 6, 1.5, 3)] },
    { groups: [g('brood', 3, 2.3, 0, { elite: true }), g('husk', 7, 1.1, 3)] },
    { groups: [g('angler', 4, 1.9), g('polyp', 4, 2.1, 3), g('fry', 20, 0.3, 6)] },
    { groups: [g('behemoth', 2, 7), g('stalker', 6, 1.2, 3, { elite: true })] },
    { groups: [g('jelly', 5, 1.8, 0, { elite: true }), g('worm', 6, 1.2, 3), g('barracuda', 9, 0.85, 7)] },
    { groups: [g('angler', 4, 1.9, 0, { elite: true }), g('brood', 4, 2.1, 3), g('mite', 18, 0.24, 8)] },
    { groups: [g('juggernaut', 2, 5), g('lancer', 6, 1.2, 3, { elite: true }), g('glider', 7, 1.2, 8)] },
    { groups: [g('angler', 5, 1.8), g('shaman', 2, 3, 4), g('juggernaut', 2, 5, 8), g('stalker', 7, 1.1, 12)] },
    { boss: true, intro: 'The rift exhales. The old one rises.', groups: [g('boss_leviathan', 1, 1), g('behemoth', 1, 1, 30), g('jelly', 4, 2.4, 20)] },
  ],
};
