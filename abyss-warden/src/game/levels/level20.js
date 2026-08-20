// Level 20 — the seat under the ice. The last station.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level20 = {
  id: 'level20',
  zone: 3,
  name: 'Hollow Crown',
  intro: 'Whatever the Leviathan was guarding, it is awake now. Everything you have.',
  startGold: 600,
  lives: 20,
  waveBonus: 40,
  boss: 'sovereign',
  ironTowers: ['harpoon', 'arc', 'charge'],
  paths: [
    [
      [-44, 120], [178, 160], [378, 120], [534, 200], [600, 330],
      [522, 450], [622, 540], [822, 520], [978, 440], [1111, 360],
    ],
    [
      [-44, 470], [156, 500], [333, 540], [478, 470], [556, 350],
      [689, 300], [867, 320], [978, 400], [1111, 360],
    ],
  ],
  pads: [
    [250, 240], [410, 60], [430, 330], [320, 430], [160, 300],
    [600, 200], [660, 420], [560, 110], [780, 220], [830, 540],
    [930, 270], [120, 560],
  ],
  waves: [
    { groups: [g('rime', 6, 1.5), g('wisp', 9, 0.9, 3, { path: 1 })] },
    { groups: [g('juggernaut', 3, 4, 0, { path: 1 }), g('glider', 8, 1.1, 3)] },
    { groups: [g('rime', 6, 1.5, 0, { elite: true }), g('shaman', 3, 2.4, 3, { path: 1 })] },
    { groups: [g('behemoth', 3, 5), g('wisp', 12, 0.8, 4, { path: 1 }), g('husk', 8, 1, 8)] },
    { groups: [g('juggernaut', 4, 3.5, 0, { path: 1 }), g('polyp', 4, 2.2, 4), g('barracuda', 10, 0.8, 8)] },
    { groups: [g('rime', 8, 1.3, 0, { elite: true }), g('angler', 5, 1.8, 3, { path: 1 }), g('wisp', 12, 0.8, 8)] },
    { groups: [g('behemoth', 3, 5, 0, { path: 1 }), g('shaman', 4, 2.2, 3), g('glider', 10, 1, 8), g('mite', 20, 0.22, 12)] },
    { boss: true, intro: 'The ice splits along a seam a hundred metres long.', groups: [g('boss_sovereign', 1, 1), g('rime', 6, 2.4, 20, { path: 1 }), g('wisp', 10, 1.2, 34)] },
  ],
};
