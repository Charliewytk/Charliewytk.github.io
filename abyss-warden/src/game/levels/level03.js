// Level 3 — The Maw's Hollow: boss arena. A coiled approach around a sinkhole;
// the Shelfside Maw rises on the final wave.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level03 = {
  id: 'level03',
  zone: 0,
  name: "The Maw's Hollow",
  intro: 'Divers report a glow in the sinkhole. Divers report nothing else.',
  startGold: 300,
  lives: 20,
  waveBonus: 22,
  boss: 'maw',
  ironTowers: ['arc', 'charge', 'sonar'],
  paths: [[
    [-44, 100], [200, 100], [367, 160], [467, 300], [389, 440],
    [222, 480], [133, 380], [222, 260], [467, 300],
    [622, 200], [800, 160], [956, 240], [956, 400], [800, 480], [622, 460],
  ]],
  pads: [
    [222, 170], [367, 90], [300, 380], [133, 480], [278, 330],
    [534, 380], [578, 130], [778, 240], [878, 400], [689, 400],
  ],
  waves: [
    { groups: [g('fry', 12, 0.6)] },
    { groups: [g('barracuda', 6, 1.2), g('mite', 10, 0.3, 3)] },
    { groups: [g('isopod', 7, 1.4), g('fry', 10, 0.5, 4)] },
    { groups: [g('jelly', 4, 2), g('ray', 6, 1.3, 2)] },
    { groups: [g('angler', 3, 2.6), g('isopod', 6, 1.3, 3), g('mite', 12, 0.3, 7)] },
    { groups: [g('barracuda', 8, 0.9), g('jelly', 4, 2, 3), g('fry', 14, 0.4, 5)] },
    { groups: [g('angler', 4, 2.4), g('ray', 8, 1.1, 2), g('isopod', 8, 1.2, 5)] },
    { boss: true, intro: 'Something vast unfolds from the sinkhole...', groups: [g('boss_maw', 1, 1), g('fry', 8, 1.2, 10)] },
  ],
};
