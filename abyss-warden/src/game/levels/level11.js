// Level 11 — The Hadal Gate: first station in the Rift. Everything is elite,
// enormous, or both.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level11 = {
  id: 'level11',
  zone: 2,
  name: 'The Hadal Gate',
  intro: 'Below this line the charts just say: DO NOT.',
  startGold: 420,
  lives: 20,
  waveBonus: 28,
  ironTowers: ['harpoon', 'sonar', 'charge'],
  paths: [[
    [-44, 90], [200, 110], [378, 180], [333, 320], [178, 380],
    [222, 500], [422, 540], [600, 480], [645, 340], [578, 210],
    [734, 130], [911, 180], [978, 320], [911, 460], [1000, 560], [1111, 580],
  ]],
  pads: [
    [278, 240], [122, 220], [467, 260], [333, 440], [100, 480],
    [519, 573], [734, 400], [711, 250], [845, 300], [1023, 440],
    [822, 560], [622, 100],
  ],
  waves: [
    { groups: [g('isopod', 7, 1.3), g('mite', 12, 0.3, 3)] },
    { groups: [g('behemoth', 1, 1), g('fry', 14, 0.4, 3)] },
    { groups: [g('stalker', 6, 1.3), g('husk', 6, 1.2, 2)] },
    { groups: [g('barracuda', 5, 1.1, 0, { elite: true }), g('jelly', 4, 2, 3)] },
    { groups: [g('worm', 7, 1.3), g('lancer', 5, 1.5, 3), g('ray', 6, 1.3, 6)] },
    { groups: [g('behemoth', 1, 1), g('hermit', 5, 1.6, 2), g('mite', 14, 0.28, 6)] },
    { groups: [g('isopod', 5, 1.3, 0, { elite: true }), g('polyp', 3, 2.4, 3), g('fry', 16, 0.35, 6)] },
    { groups: [g('angler', 4, 2.1), g('brood', 3, 2.5, 3), g('stalker', 6, 1.2, 7)] },
    { groups: [g('worm', 5, 1.4, 0, { elite: true }), g('jelly', 4, 2, 3), g('barracuda', 8, 0.9, 6)] },
    { groups: [g('juggernaut', 2, 5), g('husk', 7, 1.1, 3), g('ray', 7, 1.2, 7)] },
    { groups: [g('angler', 3, 2.1, 0, { elite: true }), g('lancer', 6, 1.3, 3), g('mite', 18, 0.24, 7)] },
    { groups: [g('behemoth', 2, 6), g('juggernaut', 2, 4, 4), g('stalker', 6, 1.2, 9), g('jelly', 4, 2, 12)] },
  ],
};
