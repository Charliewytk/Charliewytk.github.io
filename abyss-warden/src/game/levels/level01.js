// Level 1 — Outpost Shelfside: the tutorial shelf. One winding path.
// Deliberately only three creatures: something basic, something that swarms,
// something armoured. This level used to hand over six types including the
// healer, which left stations 2 and 3 with nothing left to reveal — a
// playtester disengaged at station 4 for exactly that reason.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level01 = {
  id: 'level01',
  zone: 0,
  name: 'Outpost Shelfside',
  intro: 'Tap a glowing pad to build a tower. Hold the trench.',
  startGold: 230,
  lives: 20,
  waveBonus: 20,
  tutorial: true,
  ironTowers: ['harpoon', 'arc', 'drone'],
  paths: [[
    [-44, 150], [167, 150], [267, 240], [167, 340], [167, 470],
    [367, 520], [522, 430], [500, 300], [422, 200], [578, 120],
    [778, 140], [845, 260], [778, 380], [845, 500], [978, 470],
  ]],
  pads: [
    [272, 170], [106, 300], [261, 330], [267, 440], [433, 545],
    [600, 360], [506, 85], [722, 240], [700, 460], [900, 400],
  ],
  waves: [
    { groups: [g('fry', 8, 0.9)] },
    { groups: [g('fry', 12, 0.55)] },
    { groups: [g('mite', 10, 0.35), g('fry', 8, 0.6, 3)] },
    { groups: [g('isopod', 5, 1.6), g('fry', 8, 0.5, 4)] },
    { groups: [g('isopod', 6, 1.4), g('mite', 10, 0.3, 3)] },
    { groups: [g('isopod', 6, 1.4), g('fry', 10, 0.45, 4), g('mite', 8, 0.35, 7)] },
    { groups: [g('isopod', 7, 1.3), g('mite', 12, 0.3, 4)] },
    { groups: [g('isopod', 8, 1.2), g('fry', 14, 0.4, 3), g('mite', 12, 0.28, 7)] },
  ],
};
