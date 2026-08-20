// Level 2 — Kelpwash Flats: long straights across a kelp shelf. Introduces the
// first flyer and the first genuinely fast runner. The healer and the angler
// belong to station 3, so this level leaves them alone — each early station
// gets exactly one idea of its own.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level02 = {
  id: 'level02',
  zone: 0,
  name: 'Kelpwash Flats',
  intro: 'Kelp harvesters went quiet out here. The kelp did not.',
  startGold: 290,
  lives: 20,
  waveBonus: 20,
  ironTowers: ['harpoon', 'drone', 'sonar'],
  paths: [[
    [-44, 480], [156, 480], [333, 420], [422, 300], [333, 190],
    [467, 110], [645, 150], [711, 280], [622, 400], [711, 500],
    [911, 480], [1000, 380], [978, 260], [1111, 200],
  ]],
  pads: [
    [167, 420], [333, 500], [311, 310], [467, 210], [522, 90],
    [622, 250], [578, 470], [800, 430], [911, 320], [878, 190],
  ],
  waves: [
    { groups: [g('fry', 10, 0.8)] },
    { groups: [g('fry', 10, 0.6), g('barracuda', 4, 1.6, 4)] },
    { groups: [g('isopod', 6, 1.6), g('mite', 8, 0.35, 5)] },
    { groups: [g('ray', 6, 1.4), g('fry', 10, 0.5, 3)] },
    { groups: [g('barracuda', 6, 1.2), g('isopod', 6, 1.4, 2)] },
    { groups: [g('ray', 6, 1.3), g('mite', 10, 0.32, 4)] },
    { groups: [g('isopod', 7, 1.3), g('barracuda', 5, 1.1, 4), g('fry', 12, 0.4, 6)] },
    { groups: [g('ray', 7, 1.2), g('isopod', 7, 1.3, 3), g('mite', 12, 0.3, 6)] },
    { groups: [g('barracuda', 8, 1.0), g('ray', 6, 1.3, 3), g('isopod', 8, 1.2, 6), g('fry', 14, 0.35, 9)] },
  ],
};
