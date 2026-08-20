// Tower definitions: 5 lines × 3 levels, then a branch choice (level 4) with
// two purchasable abilities each. resolveStats() merges level/branch/ability/
// meta/sonar-buff effects into one flat stats object.
import { INK, inkStroke, glowCircle, ring } from '../render/draw.js';

const TAU = Math.PI * 2;

export const TOWER_ORDER = ['harpoon', 'arc', 'charge', 'drone', 'sonar'];

export const TOWERS = {
  harpoon: {
    id: 'harpoon', kind: 'physical',
    levels: [
      { cost: 70, range: 115, dmg: 12, rate: 1.6 },
      { cost: 60, range: 125, dmg: 20, rate: 1.9 },
      { cost: 85, range: 135, dmg: 32, rate: 2.2 },
    ],
    branches: {
      flenser: {
        cost: 150, range: 140, dmg: 38, rate: 2.3,
        bleed: { dps: 12, dur: 3 }, shred: { per: 0.08, max: 0.4 },
        abilities: [
          { id: 'rendfins', cost: 130 },
          { id: 'flayer', cost: 170 },
        ],
      },
      twinlock: {
        cost: 160, range: 145, dmg: 30, rate: 2.4, targets: 2,
        abilities: [
          { id: 'quadrail', cost: 170 },
          { id: 'pinpoint', cost: 150 },
        ],
      },
    },
  },
  arc: {
    id: 'arc', kind: 'magic',
    levels: [
      { cost: 95, range: 100, dmg: 10, rate: 0.9, chains: 3, chainRange: 80 },
      { cost: 85, range: 110, dmg: 15, rate: 1.0, chains: 4, chainRange: 85 },
      { cost: 115, range: 120, dmg: 22, rate: 1.1, chains: 5, chainRange: 90 },
    ],
    branches: {
      stormcell: {
        cost: 165, range: 125, dmg: 26, rate: 1.1, chains: 5, chainRange: 95,
        stun: { chance: 0.25, dur: 1.0 },
        abilities: [
          { id: 'capacitance', cost: 150 },
          { id: 'lockdown', cost: 180 },
        ],
      },
      overload: {
        cost: 175, range: 125, dmg: 30, rate: 1.15, chains: 7, chainRange: 105,
        nova: { cd: 6, dmg: 60, radius: 95 },
        abilities: [
          { id: 'tempest', cost: 160 },
          { id: 'corona', cost: 200 },
        ],
      },
    },
  },
  charge: {
    id: 'charge', kind: 'physical', aoe: true,
    levels: [
      { cost: 100, range: 130, dmg: 26, radius: 55, rate: 0.45 },
      { cost: 90, range: 140, dmg: 42, radius: 60, rate: 0.5 },
      { cost: 120, range: 150, dmg: 65, radius: 65, rate: 0.55 },
    ],
    branches: {
      seismic: {
        cost: 175, range: 155, dmg: 82, radius: 72, rate: 0.55,
        crater: { slow: 0.6, dur: 3 },
        abilities: [
          { id: 'faultline', cost: 150 },
          { id: 'aftershock', cost: 185 },
        ],
      },
      cluster: {
        cost: 185, range: 155, dmg: 55, radius: 60, rate: 0.55,
        bomblets: { n: 4, dmg: 18, spread: 55, radius: 35 },
        abilities: [
          { id: 'carpet', cost: 165 },
          { id: 'corrosive', cost: 195 },
        ],
      },
    },
  },
  drone: {
    id: 'drone', kind: 'physical', support: 'blocker',
    levels: [
      { cost: 90, range: 110, drones: 3, droneHp: 90, droneDmg: 7, droneRate: 1.0, respawn: 8 },
      { cost: 80, range: 115, drones: 3, droneHp: 140, droneDmg: 11, droneRate: 1.1, respawn: 8 },
      { cost: 110, range: 120, drones: 3, droneHp: 200, droneDmg: 16, droneRate: 1.2, respawn: 7 },
    ],
    branches: {
      ram: {
        cost: 170, range: 120, drones: 3, droneHp: 330, droneDmg: 18, droneRate: 1.0,
        respawn: 9, droneArmor: 0.3,
        abilities: [
          { id: 'bulwark', cost: 160 },
          { id: 'ramming', cost: 180 },
        ],
      },
      stinger: {
        cost: 160, range: 125, drones: 3, droneHp: 130, droneDmg: 14, droneRate: 1.4,
        respawn: 4, poison: { dps: 8, dur: 3 },
        abilities: [
          { id: 'venom', cost: 170 },
          { id: 'swarmframe', cost: 190 },
        ],
      },
    },
  },
  sonar: {
    id: 'sonar', kind: 'support', support: 'aura',
    levels: [
      { cost: 80, range: 110, slow: 0.85, buffRange: 1.1, buffDmg: 1.0 },
      { cost: 70, range: 125, slow: 0.78, buffRange: 1.15, buffDmg: 1.05 },
      { cost: 95, range: 140, slow: 0.7, buffRange: 1.2, buffDmg: 1.1 },
    ],
    branches: {
      resonance: {
        cost: 155, range: 155, slow: 0.7, buffRange: 1.2, buffDmg: 1.12,
        amp: 1.2,
        abilities: [
          { id: 'shatterpoint', cost: 175 },
          { id: 'deepscan', cost: 145 },
        ],
      },
      lure: {
        cost: 165, range: 150, slow: 0.65, buffRange: 1.2, buffDmg: 1.1,
        hold: { cd: 7, dur: 1.2 },
        abilities: [
          { id: 'siren', cost: 185 },
          { id: 'mesmer', cost: 155 },
        ],
      },
    },
  },
};

export const SELL_REFUND = 0.7;

// Sum of everything paid into a tower (build + upgrades + branch + abilities).
export function towerInvested(tw) { return tw.invested; }

// Cost multiplier from meta per line.
function metaCostMul(type, m) {
  if (type === 'harpoon') return m.harpoonCost;
  if (type === 'arc') return m.arcCost;
  if (type === 'charge') return m.chargeCost;
  return 1;
}

export function buildCost(type, m) {
  return Math.round(TOWERS[type].levels[0].cost * metaCostMul(type, m));
}
export function upgradeCost(tw, m) {
  const next = TOWERS[tw.type].levels[tw.level + 1];
  return next ? Math.round(next.cost * metaCostMul(tw.type, m)) : null;
}
export function branchCost(type, branchId, m) {
  return Math.round(TOWERS[type].branches[branchId].cost * metaCostMul(type, m));
}

// Merge current stats. `m` = metaEffects, `buff` = {rangeMul, dmgMul} from sonar.
export function resolveStats(tw, m, buff) {
  const def = TOWERS[tw.type];
  const base = tw.branch ? def.branches[tw.branch] : def.levels[tw.level];
  const s = { ...base };
  if (tw.type === 'harpoon') { s.dmg *= m.harpoonDmg; s.range *= m.harpoonRange; }
  if (tw.type === 'arc') { s.dmg *= m.arcDmg; s.chains = (s.chains || 0) + m.arcChains; }
  if (tw.type === 'charge') { s.dmg *= m.chargeDmg; s.radius *= m.chargeRadius; }
  if (tw.type === 'drone') { s.droneHp *= m.droneHp; s.droneDmg *= m.droneDmg; s.respawn *= m.droneRespawn; }
  if (tw.type === 'sonar') {
    s.range *= m.sonarRadius; s.slow *= m.sonarSlow;
    if (m.sonarBuff > 1) {
      s.buffRange = 1 + (s.buffRange - 1) * m.sonarBuff;
      s.buffDmg = 1 + (s.buffDmg - 1) * m.sonarBuff;
    }
  }
  // branch abilities
  const a = tw.abilities || {};
  if (a.rendfins && s.bleed) s.bleed = { dps: s.bleed.dps * 2, dur: s.bleed.dur };
  if (a.flayer) s.bleedBonus = 1.25;
  if (a.quadrail) s.targets = 3;
  if (a.pinpoint) s.dmg *= 1.3;
  if (a.capacitance && s.stun) s.stun = { ...s.stun, chance: 0.4 };
  if (a.lockdown && s.stun) s.stun = { ...s.stun, dur: 1.6 };
  if (a.tempest) s.chains = Math.max(s.chains || 0, 9) + m.arcChains;
  if (a.corona && s.nova) s.nova = { cd: s.nova.cd, dmg: 120, radius: 130 };
  if (a.faultline && s.crater) s.crater = { slow: 0.4, dur: 4 };
  if (a.aftershock) s.echo = 0.4;
  if (a.carpet && s.bomblets) s.bomblets = { ...s.bomblets, n: 7 };
  if (a.corrosive && s.bomblets) s.bomblets = { ...s.bomblets, dmg: s.bomblets.dmg + 14 };
  if (a.bulwark) { s.droneHp = 460 * m.droneHp; s.droneArmor = 0.45; }
  if (a.ramming) s.slam = { dmg: 30, stun: 0.5 };
  if (a.venom && s.poison) s.poison = { dps: 16, dur: 4 };
  if (a.swarmframe) s.drones = 4;
  if (a.shatterpoint) s.amp = 1.35;
  if (a.deepscan) { s.range *= 1.15; s.buffRange = 1 + (s.buffRange - 1) * 1.3 + 0.05; }
  if (a.siren && s.hold) s.hold = { ...s.hold, dur: 2 };
  if (a.mesmer && s.hold) s.hold = { ...s.hold, cd: 5 };
  // sonar neighbour buff (never buffs sonar itself)
  if (buff && tw.type !== 'sonar') {
    s.range *= buff.rangeMul;
    if (s.dmg) s.dmg *= buff.dmgMul;
  }
  return s;
}

// ---------- drawing (chunky pseudo-3D, ink outlines, KR-style growth) ----------

function inkOnRect(ctx, x, y, w, h) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A shaded cylinder segment: gradient body + elliptical lid with rim light.
function drum(ctx, x, y, w, h, bodyCol, lidCol) {
  const rx = w / 2;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, lidCol);
  g.addColorStop(0.45, bodyCol);
  g.addColorStop(1, shadeDown(bodyCol));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.lineTo(x - rx, y - h);
  ctx.lineTo(x + rx, y - h);
  ctx.lineTo(x + rx, y);
  ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI);
  ctx.fill();
  inkStroke(ctx, 2.2);
  const lg = ctx.createRadialGradient(x - rx * 0.35, y - h - 1, 1, x, y - h, rx);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(0.25, lidCol);
  lg.addColorStop(1, bodyCol);
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(x, y - h, rx, rx * 0.42, 0, 0, TAU);
  ctx.fill();
  inkStroke(ctx, 2);
}

// crude darken for the shadow side of a hex colour
function shadeDown(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) * 0.55) | 0;
  const g = Math.max(0, ((n >> 8) & 255) * 0.55) | 0;
  const b = Math.max(0, (n & 255) * 0.6) | 0;
  return `rgb(${r},${g},${b})`;
}

// riveted armour band around a drum — appears from level 2
function armourBand(ctx, y, w, col) {
  ctx.fillStyle = col;
  ctx.fillRect(-w / 2, y - 3, w, 6);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
  ctx.strokeRect(-w / 2, y - 3, w, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(-w / 2 + 4 + i * (w - 8) / 2, y, 1.3, 0, TAU); ctx.fill();
  }
}

export function drawTower(ctx, tw, time) {
  // contact shadow grounds the structure on its platform
  ctx.fillStyle = 'rgba(0,10,16,0.22)';
  ctx.beginPath();
  ctx.ellipse(tw.x + 3, tw.y + 15, 23, 8.5, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(tw.x, tw.y);
  const lvl = tw.branch ? 3 : tw.level;
  const s = 1 + lvl * 0.1;
  ctx.scale(s, s);
  const rec = tw.recoil || 0;

  if (tw.type === 'harpoon') {
    const hull = tw.branch === 'flenser' ? '#b06045' : tw.branch === 'twinlock' ? '#5c93b8' : '#7d95a8';
    const hullL = tw.branch === 'flenser' ? '#d98a66' : tw.branch === 'twinlock' ? '#8fc0dd' : '#a8bfd0';
    drum(ctx, 0, 6, 18, 12 + lvl * 2, hull, hullL);
    if (lvl >= 1) armourBand(ctx, 3, 19, shadeDown(hull));
    if (lvl >= 1) { // ammo pods
      const pg = ctx.createLinearGradient(-14, 0, -8, 0);
      pg.addColorStop(0, '#7d95a8'); pg.addColorStop(1, '#3d4a55');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(-11, 2, 4, 5.5, 0.2, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
      ctx.beginPath(); ctx.ellipse(11, 2, 4, 5.5, -0.2, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
    }
    if (lvl >= 2) { // spotter mast + dorsal fin
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -8 - lvl * 2); ctx.lineTo(-12, -20 - lvl * 2); ctx.stroke();
      ctx.fillStyle = '#ff8f6f';
      ctx.beginPath(); ctx.arc(-12, -21 - lvl * 2, 2.2, 0, TAU); ctx.fill(); inkStroke(ctx, 1.2);
    }
    // rotating head — a visibly different weapon at every level
    ctx.save();
    ctx.translate(0, -7 - lvl);
    ctx.rotate(tw.angle);
    const k = -rec * 4;
    ctx.fillStyle = hullL;
    if (tw.branch === 'twinlock') {
      rr(ctx, k - 6, -7.5, 22, 6, 3); ctx.fill(); inkStroke(ctx, 2);
      rr(ctx, k - 6, 1.5, 22, 6, 3); ctx.fill(); inkStroke(ctx, 2);
    } else if (lvl === 0) { // L1: slim open rail
      rr(ctx, k - 5, -3.5, 20, 7, 3); ctx.fill(); inkStroke(ctx, 2);
    } else if (lvl === 1) { // L2: boxed launcher
      rr(ctx, k - 7, -5.5, 24, 11, 4); ctx.fill(); inkStroke(ctx, 2.2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      rr(ctx, k - 5, -4, 18, 3.5, 2); ctx.fill();
    } else { // L3+: heavy double-deck ballista
      rr(ctx, k - 8, -6.5, 27, 13, 4); ctx.fill(); inkStroke(ctx, 2.4);
      ctx.fillStyle = shadeDown(hullL);
      rr(ctx, k - 6, -10, 20, 5, 2.5); ctx.fill(); inkStroke(ctx, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      rr(ctx, k - 6, -5, 20, 4, 2); ctx.fill();
    }
    // harpoon bolt + tip (glows red-hot right after firing)
    ctx.strokeStyle = '#3d4a55'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(k + 10, 0); ctx.lineTo(k + 22, 0); ctx.stroke();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.moveTo(k + 28 + lvl * 2, 0); ctx.lineTo(k + 18, -5.5); ctx.lineTo(k + 18, 5.5);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2);
    if (rec > 0.35) {
      glowCircle(ctx, k + 26, 0, 9, `rgba(255,120,60,${(rec * 0.55).toFixed(3)})`);
    }
    ctx.restore();
  } else if (tw.type === 'arc') {
    drum(ctx, 0, 8, 16 + lvl * 2, 7 + lvl, '#4a5c74', '#68809c');
    if (lvl >= 1) armourBand(ctx, 6, 17 + lvl * 2, '#2c3a4c');
    if (lvl >= 2) { // grounding cables
      ctx.strokeStyle = '#2c3a4c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, 6); ctx.quadraticCurveTo(-15, 2, -14, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 6); ctx.quadraticCurveTo(15, 2, 14, -8); ctx.stroke();
    }
    const rings = 2 + Math.min(lvl, 3); // L1: 2 rings … branch: 5
    for (let i = 0; i < rings; i++) {
      const w = 15 - i * 2.6;
      const ig = ctx.createLinearGradient(-w / 2 - 2, 0, w / 2 + 2, 0);
      ig.addColorStop(0, i % 2 ? '#b8cbe8' : '#94aac9');
      ig.addColorStop(1, i % 2 ? '#5d7494' : '#42566d');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(0, -1 - i * 6, w / 2 + 2, 3.4, 0, 0, TAU);
      ctx.fill(); inkStroke(ctx, 1.8);
    }
    const topY = -3 - rings * 6;
    const pulse = 0.6 + 0.4 * Math.sin(time * 5);
    const orbCol = tw.branch === 'stormcell' ? 'rgba(200,160,255,' : tw.branch === 'overload' ? 'rgba(255,190,90,' : 'rgba(125,243,255,';
    glowCircle(ctx, 0, topY, 10 + rec * 8, orbCol + (0.6 * pulse).toFixed(3) + ')');
    ctx.fillStyle = tw.branch === 'stormcell' ? '#dcc4ff' : tw.branch === 'overload' ? '#ffd9a0' : '#d5f7ff';
    ctx.beginPath(); ctx.arc(0, topY, 4.5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(-1.5, topY - 1.5, 1.5, 0, TAU); ctx.fill();
  } else if (tw.type === 'charge') {
    const hull = tw.branch === 'cluster' ? '#8a6a4a' : '#5d6d7a';
    const hullL = tw.branch === 'cluster' ? '#b08a5f' : '#84959f';
    // bunker (radial-shaded dome)
    const bg = ctx.createRadialGradient(-5, -4, 2, 0, 2, 17 + lvl * 2);
    bg.addColorStop(0, hullL);
    bg.addColorStop(0.7, hull);
    bg.addColorStop(1, shadeDown(hull));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 4, 15 + lvl * 2, 11 + lvl, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    if (lvl >= 1) { // blast shield plate
      ctx.fillStyle = shadeDown(hull);
      ctx.beginPath(); ctx.ellipse(0, 4, 15 + lvl * 2, 4, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    }
    if (lvl >= 2) { // periscope
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-10, -16); ctx.lineTo(-15, -16); ctx.stroke();
    }
    if (tw.branch === 'seismic') {
      ctx.fillStyle = '#ffcf5f';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8 - 3, 8); ctx.lineTo(i * 8, 3); ctx.lineTo(i * 8 + 3, 8);
        ctx.closePath(); ctx.fill();
      }
      inkStroke(ctx, 1.2);
    }
    // mortar tubes — one at L1/L2, twin battery at L3+
    ctx.save();
    ctx.rotate(tw.angle);
    const k = -rec * 4;
    const tubes = lvl >= 2 ? [[-4.5, 7], [4.5, 7]] : [[0, 10]];
    for (const [ty, th] of tubes) {
      ctx.fillStyle = '#3d4750';
      rr(ctx, k + 2, ty - th / 2, 20, th, 3.5); ctx.fill(); inkStroke(ctx, 2.2);
      ctx.fillStyle = '#20262c';
      ctx.beginPath(); ctx.ellipse(k + 22, ty, 2.6, th / 2, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      rr(ctx, k + 4, ty - th / 2 + 1.2, 14, 2.6, 1.3); ctx.fill();
      if (rec > 0.35) {
        glowCircle(ctx, k + 23, ty, 8, `rgba(255,130,60,${(rec * 0.5).toFixed(3)})`);
      }
    }
    ctx.restore();
    if (lvl >= 2) { // shell rack
      ctx.fillStyle = '#c9a05f';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(-12 + i * 5, 12, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  } else if (tw.type === 'drone') {
    const hull = tw.branch === 'ram' ? '#7d6248' : tw.branch === 'stinger' ? '#6d8a45' : '#45707d';
    const hullL = tw.branch === 'ram' ? '#a8886a' : tw.branch === 'stinger' ? '#93b366' : '#6899a8';
    drum(ctx, 0, 9, 26 + lvl * 2, 9 + lvl * 2, hull, hullL);
    if (lvl >= 1) armourBand(ctx, 6, 27 + lvl * 2, shadeDown(hull));
    if (lvl >= 2) { // control tower
      drum(ctx, -9, -2 - lvl, 8, 7, hull, hullL);
      ctx.fillStyle = '#9fe8ff';
      ctx.beginPath(); ctx.arc(-9, -8 - lvl, 1.8, 0, TAU); ctx.fill();
    }
    // iris hatch
    ctx.fillStyle = '#233038';
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.6, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
    ctx.strokeStyle = '#4a626e'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.stroke();
    // antenna + beacon
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(14, -12); ctx.stroke();
    const blink = Math.sin(time * 4 + tw.x) > 0.2;
    ctx.fillStyle = blink ? '#8df0c0' : '#3a5a4a';
    ctx.beginPath(); ctx.arc(14, -13, 2.4, 0, TAU); ctx.fill(); inkStroke(ctx, 1.2);
    // landing lights
    for (const lx of [-8, 0, 8]) {
      ctx.fillStyle = Math.sin(time * 6 + lx) > 0 ? '#ffd873' : '#6d5a2f';
      ctx.beginPath(); ctx.arc(lx, 6.5, 1.6, 0, TAU); ctx.fill();
    }
  } else { // sonar
    drum(ctx, 0, 8, 12 + lvl * 2, 8 + lvl * 2, '#4a5c74', '#68809c');
    if (lvl >= 2) { // side transducer pods
      for (const dx of [-9, 9]) {
        ctx.fillStyle = '#68809c';
        ctx.beginPath(); ctx.arc(dx, 2, 3.2, 0, TAU); ctx.fill(); inkStroke(ctx, 1.6);
      }
    }
    // gimbal
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, -2 - lvl * 2); ctx.lineTo(0, -9 - lvl * 2); ctx.stroke();
    // secondary dish appears at L3+
    if (lvl >= 2) {
      ctx.save();
      ctx.translate(9, -4 - lvl);
      ctx.rotate(0.5 + Math.sin(time * 1.5 + tw.x) * 0.2);
      ctx.fillStyle = '#7ab0d0';
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
      ctx.fillStyle = '#dff4ff';
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // dish (gently sweeping)
    const sweep = Math.sin(time * 1.2 + tw.y) * 0.2;
    ctx.save();
    ctx.translate(0, -12 - lvl * 2);
    ctx.rotate(-0.35 + sweep);
    const dishCol = tw.branch === 'lure' ? '#c9a05f' : tw.branch === 'resonance' ? '#8a6fc9' : '#5f9ac9';
    ctx.fillStyle = dishCol;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 7.5, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-2, -1.5, 8, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = tw.branch === 'lure' ? '#ffe9a0' : '#dff4ff';
    ctx.beginPath(); ctx.arc(0, -1, 2.6, 0, TAU); ctx.fill(); inkStroke(ctx, 1.4);
    ctx.restore();
  }
  ctx.restore();

  // level pips
  const n = tw.branch ? 4 : tw.level + 1;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = tw.branch ? '#ffd873' : '#7df3a8';
    ctx.beginPath(); ctx.arc(tw.x - 12 + i * 8, tw.y + 24, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
  }
}

// Waving rally pennant (used for drone rally points and hero move orders).
export function drawFlag(ctx, x, y, time, color = '#8df0c0') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 2.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -22); ctx.stroke();
  const w1 = Math.sin(time * 6) * 2.5;
  const w2 = Math.sin(time * 6 + 1.2) * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(8, -21 + w1, 16, -19 + w2);
  ctx.lineTo(14, -14 + w2);
  ctx.quadraticCurveTo(7, -15 + w1, 0, -13);
  ctx.closePath();
  ctx.fill();
  inkStroke(ctx, 1.8);
  ctx.restore();
}
