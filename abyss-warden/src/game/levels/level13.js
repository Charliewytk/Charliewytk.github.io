// Level 13 — Last Light Station: pure survival. Fourteen waves, everything
// the abyss has learned about you so far.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level13 = {
  id: 'level13',
  zone: 2,
  name: 'Last Light Station',
  intro: 'No boss. No trick. Just the abyss, taking your measure.',
  startGold: 450,
  lives: 20,
  waveBonus: 30,
  ironTowers: ['harpoon', 'drone', 'arc'],
  paths: [
    [
      [-44, 200], [156, 220], [333, 160], [489, 220], [534, 350],
      [445, 470], [578, 560], [778, 520], [889, 400], [845, 260],
      [978, 160], [1111, 140],
    ],
    [
      [1111, 560], [934, 580], [778, 520], [889, 400], [845, 260],
      [978, 160], [1111, 140],
    ],
  ],
  pads: [
    [220, 100], [90, 320], [360, 300], [220, 330], [560, 280],
    [340, 560], [560, 440], [667, 573], [860, 500], [680, 300],
    [860, 300], [929, 247],
  ],
  waves: [
    { groups: [g('fry', 14, 0.45), g('mite', 10, 0.3, 4)] },
    { groups: [g('isopod', 7, 1.3), g('barracuda', 6, 1, 3, { path: 1 })] },
    { groups: [g('jelly', 4, 2), g('worm', 6, 1.4, 2)] },
    { groups: [g('stalker', 6, 1.3, 0, { path: 1 }), g('husk', 6, 1.2, 2)] },
    { groups: [g('hermit', 6, 1.5), g('ray', 6, 1.3, 3), g('mite', 12, 0.3, 6)] },
    { groups: [g('brood', 3, 2.4), g('lancer', 5, 1.5, 3, { path: 1 })] },
    { groups: [g('behemoth', 1, 1), g('polyp', 3, 2.4, 2), g('fry', 16, 0.35, 6)] },
    { groups: [g('barracuda', 6, 1, 0, { elite: true }), g('jelly', 4, 2, 3, { path: 1 })] },
    { groups: [g('angler', 4, 2), g('worm', 6, 1.3, 3), g('stalker', 6, 1.2, 7, { path: 1 })] },
    { groups: [g('isopod', 6, 1.2, 0, { elite: true }), g('husk', 7, 1.1, 3), g('mite', 16, 0.26, 7)] },
    { groups: [g('behemoth', 2, 7), g('shaman', 2, 3, 3, { path: 1 }), g('glider', 6, 1.3, 8)] },
    { groups: [g('stalker', 6, 1.2, 0, { elite: true, path: 1 }), g('polyp', 4, 2.2, 3), g('barracuda', 9, 0.85, 7)] },
    { groups: [g('angler', 4, 2, 0, { elite: true }), g('lancer', 6, 1.3, 3, { path: 1 }), g('jelly', 5, 1.8, 8)] },
    { groups: [g('behemoth', 3, 6), g('angler', 4, 2, 5, { path: 1 }), g('brood', 3, 2.2, 10), g('mite', 20, 0.22, 14, { path: 1 })] },
  ],
};
