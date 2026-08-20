// Level 19 — the ranks under the ice. They have been waiting.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level19 = {
  id: 'level19',
  zone: 3,
  name: 'The Silent Rows',
  intro: 'Rows of them, standing upright in the ice. Do not wake the whole field.',
  startGold: 540,
  lives: 20,
  waveBonus: 36,
  ironTowers: ['arc', 'drone', 'sonar'],
  paths: [[
    [-44, 300], [144, 250], [311, 300], [400, 420], [556, 480],
    [711, 430], [778, 300], [689, 180], [522, 130], [367, 160],
    [278, 80], [478, 40], [711, 70], [911, 140], [1045, 260],
    [1123, 380],
  ]],
  pads: [
    [222, 180], [367, 370], [522, 380], [667, 520], [845, 400],
    [856, 220], [622, 240], [433, 240], [200, 400], [578, 90],
    [978, 80], [1023, 400],
  ],
  waves: [
    { groups: [g('rime', 5, 1.7), g('wisp', 8, 1, 3)] },
    { groups: [g('juggernaut', 2, 5), g('rime', 5, 1.6, 3), g('fry', 14, 0.4, 7)] },
    { groups: [g('shaman', 3, 2.5), g('glider', 8, 1.1, 3), g('wisp', 8, 1, 7)] },
    { groups: [g('rime', 6, 1.5, 0, { elite: true }), g('angler', 4, 2, 3), g('stalker', 7, 1.1, 7)] },
    { groups: [g('behemoth', 3, 5), g('wisp', 10, 0.9, 4), g('polyp', 4, 2.2, 8)] },
    { groups: [g('juggernaut', 3, 4), g('rime', 6, 1.5, 3, { elite: true }), g('barracuda', 10, 0.8, 8)] },
    { groups: [g('shaman', 4, 2.2), g('brood', 4, 2.2, 3), g('wisp', 12, 0.8, 7)] },
    { groups: [g('behemoth', 3, 5), g('rime', 8, 1.3, 3), g('glider', 9, 1, 8), g('mite', 20, 0.22, 12)] },
  ],
};
