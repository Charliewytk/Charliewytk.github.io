// Level 17 — a nursery in the ice. Nothing here should be alive.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level17 = {
  id: 'level17',
  zone: 3,
  name: 'The Frost Garden',
  intro: 'Something farmed this place. The rows are too neat to be an accident.',
  startGold: 480,
  lives: 20,
  waveBonus: 32,
  ironTowers: ['arc', 'charge', 'drone'],
  paths: [[
    [-44, 470], [156, 440], [333, 470], [478, 400], [522, 280],
    [422, 180], [256, 150], [156, 240], [289, 320], [478, 340],
    [656, 290], [778, 180], [945, 160], [1067, 240], [1123, 340],
  ]],
  pads: [
    [245, 540], [422, 530], [400, 420], [578, 380], [622, 180],
    [367, 250], [200, 340], [667, 400], [800, 300], [878, 90],
    [1000, 340], [1033, 144],
  ],
  waves: [
    { groups: [g('wisp', 8, 1), g('rime', 4, 1.8, 3)] },
    { groups: [g('polyp', 3, 2.4), g('rime', 5, 1.6, 3), g('fry', 14, 0.4, 6)] },
    { groups: [g('shaman', 3, 2.6), g('wisp', 9, 0.95, 3)] },
    { groups: [g('rime', 5, 1.6, 0, { elite: true }), g('brood', 3, 2.4, 3), g('glider', 7, 1.2, 7)] },
    { groups: [g('juggernaut', 3, 4.5), g('polyp', 4, 2.2, 4), g('wisp', 10, 0.9, 8)] },
    { groups: [g('shaman', 3, 2.6), g('rime', 6, 1.5, 3), g('barracuda', 10, 0.8, 7)] },
    { groups: [g('behemoth', 2, 6), g('wisp', 12, 0.8, 3), g('lancer', 7, 1.2, 8)] },
    { groups: [g('rime', 6, 1.5, 0, { elite: true }), g('shaman', 3, 2.4, 4), g('mite', 20, 0.22, 8)] },
  ],
};
