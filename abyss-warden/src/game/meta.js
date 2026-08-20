// Star upgrade tree: 5 tower branches + general. Nodes unlock in order within
// a branch. Fully respeccable (map screen refunds everything).
export const META = {
  general: [
    { id: 'gen1', cost: 1, eff: { startGold: 80 } },
    { id: 'gen2', cost: 1, eff: { lifeRegen: 2 } },
    { id: 'gen3', cost: 2, eff: { earlyMul: 1.6 } },
    { id: 'gen4', cost: 2, eff: { heroCdMul: 0.8 } },
    { id: 'gen5', cost: 2, eff: { reinfPlus: 1 } },
    { id: 'gen6', cost: 2, eff: { torpMul: 1.4 } },
  ],
  harpoon: [
    { id: 'har1', cost: 1, eff: { harpoonDmg: 1.1 } },
    { id: 'har2', cost: 2, eff: { harpoonRange: 1.1 } },
    { id: 'har3', cost: 3, eff: { harpoonCost: 0.85 } },
    { id: 'har4', cost: 3, eff: { harpoonDmg: 1.14 } },
    { id: 'har5', cost: 4, eff: { harpoonRange: 1.12 } },
    { id: 'har6', cost: 5, eff: { harpoonCost: 0.9 } },
  ],
  arc: [
    { id: 'arc1', cost: 1, eff: { arcChains: 1 } },
    { id: 'arc2', cost: 2, eff: { arcDmg: 1.12 } },
    { id: 'arc3', cost: 3, eff: { arcCost: 0.85 } },
    { id: 'arc4', cost: 3, eff: { arcDmg: 1.16 } },
    { id: 'arc5', cost: 4, eff: { arcChains: 1 } },
    { id: 'arc6', cost: 5, eff: { arcDmg: 1.18 } },
  ],
  charge: [
    { id: 'chg1', cost: 1, eff: { chargeRadius: 1.15 } },
    { id: 'chg2', cost: 2, eff: { chargeDmg: 1.12 } },
    { id: 'chg3', cost: 3, eff: { chargeCost: 0.85 } },
    { id: 'chg4', cost: 3, eff: { chargeDmg: 1.16 } },
    { id: 'chg5', cost: 4, eff: { chargeRadius: 1.14 } },
    { id: 'chg6', cost: 5, eff: { chargeDmg: 1.18 } },
  ],
  drone: [
    { id: 'drn1', cost: 1, eff: { droneHp: 1.2 } },
    { id: 'drn2', cost: 2, eff: { droneDmg: 1.15 } },
    { id: 'drn3', cost: 3, eff: { droneRespawn: 0.75 } },
    { id: 'drn4', cost: 3, eff: { droneDmg: 1.18 } },
    { id: 'drn5', cost: 4, eff: { droneHp: 1.25 } },
    { id: 'drn6', cost: 5, eff: { droneRespawn: 0.85 } },
  ],
  sonar: [
    { id: 'son1', cost: 1, eff: { sonarRadius: 1.12 } },
    { id: 'son2', cost: 2, eff: { sonarSlow: 0.92 } },  // multiplies slow factor (lower = stronger)
    { id: 'son3', cost: 3, eff: { sonarBuff: 1.5 } },
    { id: 'son4', cost: 3, eff: { sonarRadius: 1.15 } },
    { id: 'son5', cost: 4, eff: { sonarSlow: 0.92 } },
    { id: 'son6', cost: 5, eff: { sonarBuff: 1.25 } },
  ],
};

// Collapse purchased nodes into one effects object with sane defaults.
export function metaEffects(save) {
  const e = {
    startGold: 0, lifeRegen: 0, earlyMul: 1, heroCdMul: 1, reinfPlus: 0, torpMul: 1,
    harpoonDmg: 1, harpoonRange: 1, harpoonCost: 1,
    arcChains: 0, arcDmg: 1, arcCost: 1,
    chargeRadius: 1, chargeDmg: 1, chargeCost: 1,
    droneHp: 1, droneDmg: 1, droneRespawn: 1,
    sonarRadius: 1, sonarSlow: 1, sonarBuff: 1,
  };
  for (const branch in META) {
    for (const node of META[branch]) {
      if (!save.meta[node.id]) continue;
      for (const k in node.eff) {
        if (k === 'startGold' || k === 'lifeRegen' || k === 'arcChains') e[k] += node.eff[k];
        else e[k] *= node.eff[k];
      }
    }
  }
  return e;
}

// A node is buyable if the previous node in its branch is owned.
export function nodeAvailable(save, branch, index) {
  if (index === 0) return true;
  return !!save.meta[META[branch][index - 1].id];
}
