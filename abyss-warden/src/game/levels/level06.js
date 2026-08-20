// Level 6 — Wreckfield Descent: into the Trench. Shipwreck debris, armour
// everywhere, and the Carapace King waiting at the bottom.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level06 = {
  id: 'level06',
  zone: 1,
  name: 'Wreckfield Descent',
  intro: 'A century of sunken hulls. Something has been wearing them.',
  startGold: 340,
  lives: 20,
  waveBonus: 24,
  boss: 'carapace',
  ironTowers: ['harpoon', 'arc', 'sonar'],
  paths: [[
    [-44, 520], [178, 520], [333, 460], [378, 330], [267, 230],
    [378, 120], [578, 100], [734, 170], [711, 300], [578, 380],
    [622, 490], [800, 530], [956, 470], [1000, 350], [1111, 300],
  ]],
  pads: [
    [200, 440], [100, 570], [289, 330], [467, 400], [256, 130],
    [478, 180], [656, 240], [822, 240], [778, 420], [945, 560],
  ],
  waves: [
    { groups: [g('isopod', 6, 1.5), g('fry', 10, 0.5, 3)] },
    { groups: [g('hermit', 4, 2), g('mite', 10, 0.32, 3)] },
    { groups: [g('barracuda', 7, 1.0), g('isopod', 6, 1.4, 2)] },
    { groups: [g('husk', 6, 1.3), g('jelly', 3, 2.2, 3)] },
    { groups: [g('hermit', 5, 1.8), g('isopod', 7, 1.2, 2), g('mite', 12, 0.3, 6)] },
    { groups: [g('worm', 6, 1.5), g('husk', 6, 1.2, 3), g('ray', 5, 1.4, 6)] },
    { groups: [g('isopod', 4, 1.4, 0, { elite: true }), g('jelly', 4, 2, 2), g('barracuda', 8, 0.9, 5)] },
    { groups: [g('angler', 4, 2.3), g('hermit', 5, 1.7, 2), g('fry', 14, 0.4, 7)] },
    { boss: true, intro: 'The wrecks stir. Their king has come to collect.', groups: [g('boss_carapace', 1, 1), g('isopod', 6, 2, 14)] },
  ],
};
