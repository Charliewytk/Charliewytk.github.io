// Level 9 — The Nursery: the Siphon Matron's garden. Polyps drag the dead
// back up; kill the gardeners first.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level09 = {
  id: 'level09',
  zone: 1,
  name: 'The Nursery',
  intro: 'Everything here is either newborn or refuses to stay dead.',
  startGold: 380,
  lives: 20,
  waveBonus: 26,
  boss: 'matron',
  ironTowers: ['harpoon', 'charge', 'sonar'],
  paths: [[
    [-44, 300], [156, 300], [289, 200], [467, 170], [622, 240],
    [622, 380], [467, 450], [289, 420], [200, 520], [378, 570],
    [622, 540], [800, 470], [911, 340], [867, 200], [1111, 140],
  ]],
  pads: [
    [200, 210], [378, 100], [534, 100], [378, 300], [711, 160],
    [534, 350], [333, 520], [133, 430], [711, 400], [845, 560],
    [978, 240], [778, 280],
  ],
  waves: [
    { groups: [g('jelly', 4, 2), g('fry', 12, 0.5, 3)] },
    { groups: [g('polyp', 2, 3), g('isopod', 6, 1.4, 2)] },
    { groups: [g('brood', 2, 3), g('mite', 12, 0.3, 4)] },
    { groups: [g('polyp', 3, 2.6), g('jelly', 3, 2.2, 2), g('barracuda', 6, 1.1, 5)] },
    { groups: [g('worm', 6, 1.5), g('polyp', 2, 3, 4), g('husk', 5, 1.3, 6)] },
    { groups: [g('brood', 3, 2.6), g('jelly', 4, 2, 2), g('ray', 6, 1.3, 5)] },
    { groups: [g('jelly', 3, 2, 0, { elite: true }), g('polyp', 3, 2.4, 3), g('fry', 16, 0.35, 6)] },
    { groups: [g('angler', 4, 2.2), g('shaman', 2, 3, 3), g('stalker', 5, 1.4, 7)] },
    { groups: [g('polyp', 4, 2.2), g('shaman', 2, 3, 2), g('hermit', 5, 1.6, 5), g('mite', 14, 0.28, 9)] },
    { boss: true, intro: 'The garden parts. The gardener has noticed you.', groups: [g('boss_matron', 1, 1), g('jelly', 3, 3, 16)] },
  ],
};
