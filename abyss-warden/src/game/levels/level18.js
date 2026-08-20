// Level 18 — twin gas falls; two lanes, one station.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level18 = {
  id: 'level18',
  zone: 3,
  name: 'Methane Falls',
  intro: 'Gas pours off the ledge in two columns. Everything rides them down.',
  startGold: 520,
  lives: 20,
  waveBonus: 34,
  ironTowers: ['harpoon', 'charge', 'sonar'],
  paths: [
    [
      [-44, 110], [156, 140], [333, 120], [489, 190], [578, 300],
      [622, 420], [756, 480], [934, 450], [1067, 380], [1123, 300],
    ],
    [
      [-44, 520], [167, 540], [356, 500], [500, 430], [578, 320],
      [689, 250], [867, 230], [1000, 290], [1123, 300],
    ],
  ],
  pads: [
    [230, 210], [400, 90], [430, 300], [300, 400], [180, 300],
    [620, 370], [700, 150], [560, 540], [840, 340], [890, 180],
    [930, 471], [120, 420],
  ],
  waves: [
    { groups: [g('wisp', 8, 1), g('rime', 4, 1.8, 3, { path: 1 })] },
    { groups: [g('rime', 5, 1.6), g('glider', 7, 1.2, 3, { path: 1 })] },
    { groups: [g('juggernaut', 2, 5, 0, { path: 1 }), g('wisp', 9, 0.9, 3)] },
    { groups: [g('rime', 5, 1.6, 0, { elite: true }), g('husk', 8, 1, 3, { path: 1 })] },
    { groups: [g('shaman', 3, 2.6, 0, { path: 1 }), g('barracuda', 10, 0.8, 3), g('wisp', 9, 0.9, 7)] },
    { groups: [g('behemoth', 2, 6), g('rime', 6, 1.5, 4, { path: 1 }), g('glider', 8, 1.1, 8)] },
    { groups: [g('juggernaut', 3, 4, 0, { path: 1 }), g('polyp', 4, 2.2, 4), g('mite', 18, 0.24, 8)] },
    { groups: [g('rime', 7, 1.4, 0, { elite: true, path: 1 }), g('shaman', 3, 2.4, 3), g('wisp', 12, 0.8, 8)] },
  ],
};
