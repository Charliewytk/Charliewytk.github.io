// Level 16 — ice shelf: the first ground that fights back.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level16 = {
  id: 'level16',
  zone: 3,
  name: 'Clathrate Shelf',
  intro: 'Methane ice underfoot. It cracks when things walk on it — listen for that.',
  startGold: 460,
  lives: 20,
  waveBonus: 30,
  ironTowers: ['harpoon', 'arc', 'sonar'],
  paths: [[
    [-44, 150], [133, 180], [311, 150], [467, 210], [578, 320],
    [478, 430], [311, 470], [178, 410], [133, 300], [267, 250],
    [467, 300], [667, 340], [845, 300], [978, 380], [1111, 420],
  ]],
  pads: [
    [222, 120], [378, 110], [522, 140], [622, 230], [400, 360],
    [233, 330], [333, 540], [556, 430], [711, 250], [778, 430],
    [923, 240], [1023, 300],
  ],
  waves: [
    { groups: [g('rime', 4, 1.8), g('fry', 12, 0.45, 3)] },
    { groups: [g('wisp', 7, 1.1), g('isopod', 6, 1.3, 3)] },
    { groups: [g('rime', 5, 1.7), g('barracuda', 8, 0.9, 3)] },
    { groups: [g('wisp', 8, 1), g('husk', 7, 1.1, 3), g('mite', 14, 0.28, 7)] },
    { groups: [g('juggernaut', 2, 5), g('rime', 5, 1.6, 3), g('glider', 6, 1.3, 7)] },
    { groups: [g('rime', 4, 1.7, 0, { elite: true }), g('shaman', 2, 3, 3), g('wisp', 8, 1, 6)] },
    { groups: [g('behemoth', 2, 6), g('rime', 6, 1.5, 3), g('stalker', 6, 1.2, 8)] },
    { groups: [g('juggernaut', 3, 4), g('wisp', 10, 0.9, 4), g('angler', 4, 2, 9)] },
  ],
};
