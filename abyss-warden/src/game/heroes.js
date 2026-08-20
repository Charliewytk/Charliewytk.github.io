// Hero definitions + drawing. One hero active per battle; click to select,
// click water to move. Melee heroes block like drones; ranged heroes strafe.
import { INK, inkStroke, glowCircle, ring } from '../render/draw.js';

const TAU = Math.PI * 2;

export const HEROES = {
  karrick: {
    id: 'karrick', unlockLevel: 0, melee: true,
    hp: 320, dmg: 24, rate: 1.1, armor: 0.3, speed: 95, range: 30,
    ability: { id: 'slam', cd: 12, radius: 95, dmg: 65, stun: 1.5 },
    respawn: 12,
    levelHp: 40, levelDmg: 4,
  },
  nerissa: {
    id: 'nerissa', unlockLevel: 5, melee: false,
    hp: 200, dmg: 18, rate: 1.0, armor: 0.1, speed: 115, range: 135, chains: 3,
    ability: { id: 'squall', cd: 14, radius: 110, dmg: 95, slow: 0.5, slowDur: 3 },
    respawn: 11,
    levelHp: 24, levelDmg: 3.5,
  },
  bastion: {
    id: 'bastion', unlockLevel: 10, melee: true,
    hp: 560, dmg: 34, rate: 0.8, armor: 0.5, speed: 62, range: 34,
    ability: { id: 'breach', cd: 16, radius: 130, dmg: 85, stun: 2 },
    respawn: 15,
    levelHp: 60, levelDmg: 5,
  },
  mira: {
    id: 'mira', unlockLevel: 7, melee: false,
    hp: 220, dmg: 12, rate: 1.1, armor: 0.1, speed: 105, range: 120, chains: 1,
    healAura: { radius: 115, hps: 16 },
    ability: { id: 'restore', cd: 15, radius: 135, dmg: 45, heal: 130 },
    respawn: 10,
    levelHp: 28, levelDmg: 2.5,
  },
  torque: {
    id: 'torque', unlockLevel: 12, melee: true,
    hp: 400, dmg: 22, rate: 0.9, armor: 0.35, speed: 78, range: 30,
    ability: { id: 'mine', cd: 10, radius: 72, dmg: 135 },
    respawn: 12,
    levelHp: 46, levelDmg: 4,
  },
};

export const HERO_ORDER = ['karrick', 'nerissa', 'mira', 'bastion', 'torque'];

// XP needed to reach the NEXT level (in-battle levelling, 1..10).
export function xpForLevel(level) { return 60 + level * 55; }

function rrHero(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- drawing ----------

export function drawHero(ctx, h, time) {
  const d = h.def;
  ctx.save();
  ctx.translate(h.x, h.y);
  const bob = Math.sin(time * 3 + 1) * 2;
  ctx.translate(0, bob);
  if (h.hurtT > 0) ctx.globalAlpha = 0.8;

  if (d.id === 'karrick') {
    // exosuit diver: round helm, bulky shoulders, glowing visor
    ctx.fillStyle = '#c9884a';
    ctx.beginPath(); ctx.ellipse(0, 4, 11, 9, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = '#e8b877';
    ctx.beginPath(); ctx.arc(0, -6, 8, 0, TAU); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = '#7df3ff';
    ctx.beginPath(); ctx.arc(2, -6, 4, 0, TAU); ctx.fill(); inkStroke(ctx, 1.4);
    // fists
    ctx.fillStyle = '#a86a30';
    ctx.beginPath(); ctx.arc(-10, 6, 4.5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
    ctx.beginPath(); ctx.arc(10, 6, 4.5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
  } else if (d.id === 'nerissa') {
    // manta glider wing + rider
    const flap = Math.sin(time * 4) * 3;
    ctx.fillStyle = '#5f9ac9';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.quadraticCurveTo(0, -10 - flap, -12, -2);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-12, 2);
    ctx.quadraticCurveTo(0, 10 + flap, 10, 0);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = '#dff4ff';
    ctx.beginPath(); ctx.arc(0, -4, 5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
    glowCircle(ctx, 4, 0, 8, 'rgba(125,243,255,0.6)');
  } else if (d.id === 'mira') {
    // sleek medic suit: white shell, teal trim, glowing cross
    ctx.fillStyle = '#e8f4f8';
    ctx.beginPath(); ctx.ellipse(0, 3, 9, 8, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = '#7fd0e8';
    ctx.beginPath(); ctx.arc(0, -7, 6.5, 0, TAU); ctx.fill(); inkStroke(ctx, 2.2);
    ctx.fillStyle = '#dff8ff';
    ctx.beginPath(); ctx.arc(1.5, -7, 3, 0, TAU); ctx.fill();
    // medic cross
    ctx.fillStyle = '#4ac97f';
    ctx.fillRect(-1.6, 0, 3.2, 8);
    ctx.fillRect(-4, 2.4, 8, 3.2);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.strokeRect(-1.6, 0, 3.2, 8);
    glowCircle(ctx, 0, 3, 10, 'rgba(120,240,180,0.3)');
  } else if (d.id === 'torque') {
    // demolition rig: squat orange chassis, huge wrench arm, mine rack
    ctx.fillStyle = '#e0873d';
    rrHero(ctx, -10, -6, 20, 15, 4); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = '#8a5424';
    ctx.fillRect(-10, 3, 20, 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-10, 3, 20, 4);
    ctx.fillStyle = '#c9cfc0';
    ctx.beginPath(); ctx.arc(0, -10, 5.5, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
    ctx.fillStyle = '#ffd873';
    ctx.beginPath(); ctx.arc(1.5, -10, 2.2, 0, TAU); ctx.fill();
    // wrench arm
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(17, -6); ctx.stroke();
    ctx.strokeStyle = '#c9cfc0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(18, -8, 3.5, 0.6, TAU - 0.6); ctx.stroke();
    // mine on the back
    ctx.fillStyle = '#4a5560';
    ctx.beginPath(); ctx.arc(-12, -2, 3.5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.4);
  } else {
    // salvage mech: boxy torso, claw arms, warning stripes
    ctx.fillStyle = '#8a8f78';
    ctx.fillRect(-10, -8, 20, 16);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.strokeRect(-10, -8, 20, 16);
    ctx.fillStyle = '#ffd873';
    ctx.fillRect(-10, -2, 20, 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-10, -2, 20, 4);
    ctx.fillStyle = '#c9cfc0';
    ctx.beginPath(); ctx.arc(0, -12, 6, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
    ctx.fillStyle = '#ff8f6f';
    ctx.beginPath(); ctx.arc(2, -12, 2.4, 0, TAU); ctx.fill();
    // claws
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-16, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(16, 8); ctx.stroke();
  }
  ctx.restore();

  // selection ring + hp bar
  if (h.selected) {
    ring(ctx, h.x, h.y, 18, '#8df0c0', 2, 0.7 + 0.3 * Math.sin(time * 5));
  }
  if (h.hp < h.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(h.x - 12, h.y - 22, 24, 3.5);
    ctx.fillStyle = '#8df0c0';
    ctx.fillRect(h.x - 12, h.y - 22, 24 * Math.max(0, h.hp / h.maxHp), 3.5);
  }
}
