// Level 12 — The Moving Floor: the Undertow's hunting ground. It eats build
// sites; sonar pins its burrow-lunges.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level12 = {
  id: 'level12',
  zone: 2,
  name: 'The Moving Floor',
  intro: 'Keep sonar sweeping. The floor is patient, and it is hungry.',
  startGold: 420,
  lives: 20,
  waveBonus: 28,
  boss: 'undertow',
  ironTowers: ['sonar', 'arc', 'drone'],
  paths: [[
    [-44, 480], [178, 460], [333, 520], [511, 480], [578, 360],
    [489, 240], [311, 200], [156, 260], [111, 130], [311, 80],
    [534, 110], [711, 180], [778, 320], [734, 460], [845, 550],
    [1000, 500], [1111, 420],
  ]],
  pads: [
    [245, 380], [111, 560], [422, 400], [622, 500], [667, 280],
    [400, 140], [200, 160], [534, 220], [845, 240], [911, 400],
    [711, 560], [1019, 573],
  ],
  waves: [
    { groups: [g('worm', 6, 1.4), g('fry', 12, 0.45, 3)] },
    { groups: [g('stalker', 6, 1.3), g('isopod', 6, 1.3, 2)] },
    { groups: [g('worm', 5, 1.4, 0, { elite: true }), g('mite', 14, 0.28, 3)] },
    { groups: [g('lancer', 5, 1.5), g('jelly', 4, 2, 3), g('ray', 6, 1.3, 6)] },
    { groups: [g('behemoth', 1, 1), g('worm', 6, 1.3, 2), g('husk', 6, 1.2, 6)] },
    { groups: [g('stalker', 5, 1.3, 0, { elite: true }), g('hermit', 5, 1.6, 3)] },
    { groups: [g('brood', 3, 2.4), g('polyp', 3, 2.4, 3), g('barracuda', 8, 0.9, 6)] },
    { groups: [g('angler', 4, 2), g('worm', 6, 1.3, 3), g('mite', 16, 0.26, 7)] },
    { groups: [g('behemoth', 2, 7), g('stalker', 6, 1.2, 3), g('jelly', 4, 2, 8)] },
    { boss: true, intro: 'The floor rises. It was never a floor.', groups: [g('boss_undertow', 1, 1), g('worm', 5, 2.4, 16)] },
  ],
};
