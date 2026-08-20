// Level 4 — Split Current: the current forks around a ridge — two routes to
// the same core. First worms and stalkers; sonar earns its keep.
const g = (type, count, gap, delay = 0, opts = {}) => ({ type, count, gap, delay, ...opts });

export const level04 = {
  id: 'level04',
  zone: 0,
  name: 'Split Current',
  intro: 'The ridge splits the current. Creatures ride both sides.',
  startGold: 400,
  lives: 20,
  waveBonus: 22,
  ironTowers: ['harpoon', 'sonar', 'drone'],
  // The two currents rejoin at (667,378) — a little past halfway — so the last
  // third of the run is shared. Two testers stalled here for the same reason:
  // the fork used to stay apart until the second-to-last point, which asked a
  // player to fund and cover two whole defences out of one station-4 budget.
  // A shared tail means a single well-built killzone is a valid answer to your
  // first fork, and station 5 can be the map that genuinely demands two.
  paths: [
    [
      [-44, 130], [178, 130], [333, 175], [489, 125], [622, 178],
      [689, 300], [667, 378], [800, 433], [900, 505], [978, 520],
    ],
    [
      [-44, 130], [178, 130], [267, 285], [233, 430], [367, 522],
      [533, 511], [667, 378], [800, 433], [900, 505], [978, 520],
    ],
  ],
  pads: [
    [200, 200], [340, 100], [500, 170], [660, 110], [760, 240],
    [150, 350], [300, 440], [480, 470], [660, 400], [820, 430],
  ],
  waves: [
    { groups: [g('fry', 8, 0.7), g('fry', 8, 0.7, 1, { path: 1 })] },
    { groups: [g('isopod', 5, 1.5), g('barracuda', 5, 1.2, 2, { path: 1 })] },
    { intro: 'Burrowers below! Sonar drags them back into the light.', groups: [g('worm', 4, 2.2), g('fry', 10, 0.5, 5, { path: 1 })] },
    { intro: 'Cloaked shapes on the south current — light them up.', groups: [g('stalker', 4, 1.8, 0, { path: 1 }), g('mite', 10, 0.32, 4)] },
    { groups: [g('jelly', 3, 2.2), g('worm', 5, 1.6, 2, { path: 1 }), g('ray', 5, 1.4, 5)] },
    { groups: [g('stalker', 6, 1.3), g('isopod', 6, 1.3, 2, { path: 1 }), g('fry', 12, 0.4, 6, { path: 1 })] },
    { groups: [g('worm', 7, 1.4, 0, { path: 1 }), g('barracuda', 7, 1.0, 2), g('jelly', 3, 2.4, 5)] },
    { groups: [g('angler', 3, 2.5), g('stalker', 5, 1.4, 2, { path: 1 }), g('mite', 12, 0.3, 6)] },
    { groups: [g('angler', 3, 2.4, 0, { path: 1 }), g('worm', 5, 1.7, 3), g('jelly', 3, 2.2, 5), g('fry', 12, 0.4, 8, { path: 1 })] },
    { groups: [g('behemoth', 1, 1), g('stalker', 6, 1.3, 4, { path: 1 }), g('ray', 6, 1.3, 8)] },
  ],
};
