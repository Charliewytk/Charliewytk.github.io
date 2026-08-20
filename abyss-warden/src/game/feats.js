// Achievements ("Feats of the Deep"). Awarding is idempotent; battle shows a
// banner, the Feats screen shows the collection.
export const FEATS = [
  { id: 'first', name: 'First Light', desc: 'Clear Outpost Shelfside.' },
  { id: 'perfect', name: 'Not A Scratch', desc: 'Earn 3 stars on any station.' },
  { id: 'k100', name: 'Chum Maker', desc: 'Repel 100 creatures (lifetime).' },
  { id: 'k1000', name: 'Trench Warden', desc: 'Repel 1,000 creatures (lifetime).' },
  { id: 'torpedo', name: 'Down Periscope', desc: 'Fire 10 torpedo strikes.' },
  { id: 'maxTower', name: 'Full Rig', desc: 'Install both abilities on one tower.' },
  { id: 'bossNoLeak', name: 'Gatekeeper', desc: 'Slay a boss with your hull untouched.' },
  { id: 'campaign', name: 'Lights Stay On', desc: 'Clear all fifteen stations.' },
  { id: 'iron', name: 'Cold Steel', desc: 'Complete an Iron protocol.' },
  { id: 'endless20', name: 'The Abyss Stares Back', desc: 'Survive 20 waves of the Abyss Eternal.' },
  { id: 'glider50', name: 'Clip Their Wings', desc: 'Repel 50 Razor Gliders.' },
  { id: 'shellBreaker', name: 'Shellbreaker', desc: "Strip a Ridge Juggernaut's barnacle shield." },
];

export function awardFeat(save, id) {
  if (save.feats[id]) return false;
  save.feats[id] = true;
  return true;
}
