// Enemy definitions + chunky cartoon draw routines (thick ink outlines,
// saturated two-tone fills, big eyes — original deep-sea designs).
import { INK, inkStroke, glowCircle } from '../render/draw.js';

const TAU = Math.PI * 2;

// melee = damage per hit vs blockers (drones/heroes).
// traits: heal, sprint, submerge, cloak, flying, shield, deathSpawn,
// resurrect, droneBane, slowImmune.
export const ENEMIES = {
  fry: {
    id: 'fry', hp: 26, speed: 85, armor: 0, magicRes: 0, bounty: 4, lives: 1,
    radius: 8, melee: 4, body: '#5ff0c0', belly: '#b8fbe6', fin: '#2bbf8f',
  },
  mite: {
    id: 'mite', hp: 14, speed: 130, armor: 0, magicRes: 0, bounty: 2, lives: 1,
    radius: 6, melee: 3, slowImmune: true, body: '#ffb84d', belly: '#ffe1a8', fin: '#d98422',
  },
  isopod: {
    id: 'isopod', hp: 130, speed: 40, armor: 0.5, magicRes: 0, bounty: 14, lives: 1,
    radius: 12, melee: 10, body: '#c98f4d', belly: '#e8c188', fin: '#8a5c26',
  },
  barracuda: {
    id: 'barracuda', hp: 90, speed: 70, armor: 0, magicRes: 0.1, bounty: 12, lives: 1,
    radius: 10, melee: 12, sprint: { every: 4, dur: 1.4, mul: 2.2 },
    body: '#7fd0f0', belly: '#d3f0fb', fin: '#3d8fb5',
  },
  jelly: {
    id: 'jelly', hp: 150, speed: 42, armor: 0, magicRes: 0.6, bounty: 16, lives: 1,
    radius: 12, melee: 6, heal: { radius: 90, hps: 10 },
    body: '#ef8fd0', belly: '#ffd3ef', fin: '#b3539a',
  },
  worm: {
    id: 'worm', hp: 170, speed: 55, armor: 0.2, magicRes: 0, bounty: 16, lives: 1,
    radius: 11, melee: 12, submerge: { down: 2.4, up: 2.6, mul: 1.5 },
    body: '#c76a5a', belly: '#eba895', fin: '#8f4033',
  },
  stalker: {
    id: 'stalker', hp: 115, speed: 76, armor: 0.2, magicRes: 0.2, bounty: 15, lives: 1,
    radius: 10, melee: 16, cloak: true,
    body: '#8f7fe8', belly: '#c9c0f7', fin: '#5a4bb0',
  },
  ray: {
    id: 'ray', hp: 85, speed: 66, armor: 0, magicRes: 0.2, bounty: 12, lives: 1,
    radius: 11, melee: 0, flying: true,
    body: '#63c8e8', belly: '#c9effa', fin: '#2f88ab',
  },
  hermit: {
    id: 'hermit', hp: 110, speed: 40, armor: 0.3, magicRes: 0.1, bounty: 16, lives: 1,
    radius: 12, melee: 10, shield: 130,
    body: '#e8a05f', belly: '#ffd7ae', fin: '#a86a30',
  },
  husk: {
    id: 'husk', hp: 100, speed: 52, armor: 0.1, magicRes: 0.85, bounty: 12, lives: 1,
    radius: 10, melee: 8, body: '#9aa84f', belly: '#d6dfa2', fin: '#66732b',
  },
  lancer: {
    id: 'lancer', hp: 155, speed: 62, armor: 0.25, magicRes: 0, bounty: 14, lives: 1,
    radius: 11, melee: 22, droneBane: 3,
    body: '#5fb7a0', belly: '#b5e6d8', fin: '#2f7a66',
  },
  angler: {
    id: 'angler', hp: 220, speed: 48, armor: 0.15, magicRes: 0.35, bounty: 18, lives: 2,
    radius: 13, melee: 18, body: '#7a4fa0', belly: '#c3a2e0', fin: '#4a2d63',
  },
  brood: {
    id: 'brood', hp: 280, speed: 34, armor: 0.15, magicRes: 0.15, bounty: 20, lives: 2,
    radius: 15, melee: 14, deathSpawn: { type: 'fry', n: 4 },
    body: '#8fbf5f', belly: '#d2eaa9', fin: '#5a8630',
  },
  polyp: {
    id: 'polyp', hp: 190, speed: 30, armor: 0, magicRes: 0.3, bounty: 18, lives: 1,
    radius: 12, melee: 8, resurrect: { radius: 130, cd: 7 },
    body: '#c05fb0', belly: '#eaa9e0', fin: '#86307a',
  },
  behemoth: {
    id: 'behemoth', hp: 760, speed: 22, armor: 0.3, magicRes: 0.2, bounty: 48, lives: 3,
    radius: 18, melee: 40, body: '#5f7a99', belly: '#a9c0d6', fin: '#33465c',
  },
  glider: {
    id: 'glider', hp: 125, speed: 66, armor: 0, magicRes: 0.15, bounty: 15, lives: 1,
    radius: 10, melee: 0, flying: true, sprint: { every: 3.5, dur: 1.2, mul: 1.9 },
    body: '#e8b45f', belly: '#ffe6b5', fin: '#b57e2a',
  },
  shaman: {
    id: 'shaman', hp: 210, speed: 38, armor: 0.1, magicRes: 0.5, bounty: 22, lives: 2,
    radius: 12, melee: 8, heal: { radius: 120, hps: 18 },
    body: '#5f8fe8', belly: '#b5cdf7', fin: '#2a55b0',
  },
  rime: {
    id: 'rime', hp: 320, speed: 34, armor: 0.5, magicRes: 0.1, bounty: 28, lives: 2,
    radius: 14, melee: 26, slowImmune: true,
    body: '#8fb6c9', belly: '#dceef5', fin: '#5b8299',
  },
  wisp: {
    id: 'wisp', hp: 120, speed: 90, armor: 0, magicRes: 0.55, bounty: 17, lives: 1,
    radius: 9, melee: 0, flying: true,
    // A false light that puts out real ones: darts past your turrets and snuffs
    // their lamps. The gun still works — it just cannot see for itself any more,
    // so only overlapping cover keeps that stretch of road defended.
    douse: { radius: 105, dur: 3.0, cd: 5 },
    body: '#bfe6ff', belly: '#f2fcff', fin: '#7fb8d6',
  },
  juggernaut: {
    id: 'juggernaut', hp: 360, speed: 26, armor: 0.45, magicRes: 0.1, bounty: 30, lives: 2,
    radius: 16, melee: 26, shield: 220,
    body: '#8a5f70', belly: '#c9a2b0', fin: '#5c3344',
  },
};

export const ELITE = { hpMul: 2.2, speedMul: 1.1, bountyMul: 2, radiusAdd: 3 };

// ---------- drawing ----------
// Each drawn facing +x, centred on origin. `e` supplies wob (anim phase),
// hidden (submerged/cloaked), elite. Ink-outline cartoon style.

function eye(ctx, x, y, r, look = 1) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x + r * 0.35 * look, y, r * 0.45, 0, TAU); ctx.fill();
}

function finTri(ctx, d, x1, y1, x2, y2, x3, y3) {
  ctx.fillStyle = d.fin;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
  ctx.fill(); inkStroke(ctx, 2);
}

// A gradient's coordinates resolve against the transform in force when it is
// *painted*, not when it is created — so one object per (palette, height) can
// serve every fish on screen. This used to allocate one gradient per enemy per
// frame, which at 200+ enemies dominated the render cost.
const gradCache = new WeakMap();
function bodyGradient(ctx, d, ht) {
  let byKey = gradCache.get(ctx);
  if (!byKey) { byKey = new Map(); gradCache.set(ctx, byKey); }
  const key = `${d.belly}|${d.body}|${d.fin}|${ht}`;
  let g = byKey.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, -ht, 0, ht);
    g.addColorStop(0, d.belly);
    g.addColorStop(0.35, d.body);
    g.addColorStop(1, d.fin);
    byKey.set(key, g);
  }
  return g;
}

function fishBody(ctx, d, len, ht, tail) {
  // tail
  finTri(ctx, d, -len * 0.7, 0, -len - 4, -ht * 0.8 + tail, -len - 4, ht * 0.8 + tail);
  // body — vertical gradient so it reads as a lit volume, not a sticker
  ctx.fillStyle = bodyGradient(ctx, d, ht);
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.quadraticCurveTo(len * 0.4, -ht, -len * 0.6, -ht * 0.55);
  ctx.quadraticCurveTo(-len, 0, -len * 0.6, ht * 0.55);
  ctx.quadraticCurveTo(len * 0.4, ht, len, 0);
  ctx.closePath();
  ctx.fill(); inkStroke(ctx, 2.4);
  // belly highlight
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(len * 0.75, -1);
  ctx.quadraticCurveTo(len * 0.25, -ht * 0.8, -len * 0.45, -ht * 0.45);
  ctx.quadraticCurveTo(len * 0.2, -ht * 0.3, len * 0.75, -1);
  ctx.fill();
}

const DRAW = {
  fry(ctx, e, d) {
    fishBody(ctx, d, 9, 6, Math.sin(e.wob * 2.2) * 3);
    eye(ctx, 4, -1.5, 2.4);
  },
  mite(ctx, e, d) {
    fishBody(ctx, d, 7, 4.5, Math.sin(e.wob * 3) * 3);
    eye(ctx, 3, -1, 2);
  },
  isopod(ctx, e, d) {
    ctx.fillStyle = d.body;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.6);
    ctx.strokeStyle = d.fin; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 6, 0, 8.2, -1.15, 1.15); ctx.stroke(); }
    // stubby legs
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const wig = Math.sin(e.wob * 2 + i) * 2;
      ctx.beginPath(); ctx.moveTo(-6 + i * 6, 8); ctx.lineTo(-8 + i * 6 + wig, 12); ctx.stroke();
    }
    eye(ctx, 10, -3, 2.6);
  },
  barracuda(ctx, e, d) {
    fishBody(ctx, d, 15, 5.5, Math.sin(e.wob * 2.5) * 4);
    // jaw
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(9, 2.5); ctx.stroke();
    eye(ctx, 8, -2, 2.4);
  },
  jelly(ctx, e, d) {
    const puff = 1 + Math.sin(e.wob * 1.6) * 0.08;
    // tentacles
    ctx.strokeStyle = d.fin; ctx.lineWidth = 2.2;
    for (let i = -2; i <= 2; i++) {
      const sway = Math.sin(e.wob * 1.6 + i) * 3;
      ctx.beginPath(); ctx.moveTo(i * 4, 4);
      ctx.quadraticCurveTo(i * 4 + sway, 12, i * 4 - sway, 18); ctx.stroke();
    }
    ctx.fillStyle = d.body;
    ctx.beginPath(); ctx.arc(0, 0, 12 * puff, Math.PI, 0); ctx.quadraticCurveTo(12 * puff, 8, 0, 8);
    ctx.quadraticCurveTo(-12 * puff, 8, -12 * puff, 0); ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.arc(-3, -3, 5 * puff, 0, TAU); ctx.fill();
    eye(ctx, 3, 0, 2.2); eye(ctx, -4, 1, 1.8);
  },
  worm(ctx, e, d) {
    if (e.hidden) { // burrowed: a moving mound of silt
      ctx.fillStyle = 'rgba(120,95,70,0.7)';
      ctx.beginPath(); ctx.ellipse(0, 4, 13, 5, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 1.5);
      return;
    }
    ctx.fillStyle = d.body;
    for (let i = 3; i >= 0; i--) {
      const sy = Math.sin(e.wob * 2 + i * 1.2) * 3;
      ctx.beginPath(); ctx.arc(-i * 7 + 6, sy, 9 - i * 1.2, 0, TAU); ctx.fill(); inkStroke(ctx, 2.2);
    }
    // maw
    ctx.fillStyle = d.fin;
    ctx.beginPath(); ctx.arc(8, Math.sin(e.wob * 2) * 3, 5, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
    eye(ctx, 10, -4 + Math.sin(e.wob * 2) * 3, 2);
  },
  stalker(ctx, e, d) {
    fishBody(ctx, d, 13, 7, Math.sin(e.wob * 2) * 3);
    // spines
    ctx.strokeStyle = d.fin; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-2 - i * 4, -6); ctx.lineTo(-4 - i * 4, -11); ctx.stroke();
    }
    eye(ctx, 7, -2, 2.6);
  },
  ray(ctx, e, d) {
    const flap = Math.sin(e.wob * 1.8) * 4;
    ctx.fillStyle = d.body;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.quadraticCurveTo(0, -12 - flap, -10, -3);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-10, 3);
    ctx.quadraticCurveTo(0, 12 + flap, 12, 0);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.ellipse(2, 0, 6, 3.5, 0, 0, TAU); ctx.fill();
    eye(ctx, 7, -2, 2);
  },
  hermit(ctx, e, d) {
    // shell (shield visual while up)
    if (e.shieldHp > 0) {
      ctx.fillStyle = '#8fd7e8';
      ctx.beginPath(); ctx.arc(-3, -2, 13, 0, TAU); ctx.fill(); inkStroke(ctx, 2.6);
      ctx.strokeStyle = '#5aa8bd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-3, -2, 8, 0.5, 2.6); ctx.stroke();
    }
    ctx.fillStyle = d.body;
    ctx.beginPath(); ctx.ellipse(6, 3, 8, 6, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.4);
    // claw
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.arc(13, 4, 4, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
    eye(ctx, 9, -2, 2.2);
  },
  husk(ctx, e, d) {
    fishBody(ctx, d, 11, 7, Math.sin(e.wob * 1.4) * 2);
    // vent cracks
    ctx.strokeStyle = '#f5e663'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(0, 0); ctx.lineTo(-3, 3); ctx.stroke();
    eye(ctx, 6, -2, 2.2);
  },
  lancer(ctx, e, d) {
    fishBody(ctx, d, 13, 6, Math.sin(e.wob * 2) * 3);
    // lance snout
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(10, -2.5); ctx.lineTo(10, 2.5); ctx.closePath();
    ctx.fill(); inkStroke(ctx, 2);
    eye(ctx, 5, -2, 2.4);
  },
  angler(ctx, e, d) {
    fishBody(ctx, d, 14, 10, Math.sin(e.wob * 1.6) * 3);
    // teeth
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(12 - i * 3, 3); ctx.lineTo(11 - i * 3, 7); ctx.lineTo(9.5 - i * 3, 3); ctx.closePath(); ctx.fill();
    }
    // lure
    const ly = -14 + Math.sin(e.wob) * 2;
    ctx.strokeStyle = d.fin; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, -9); ctx.quadraticCurveTo(10, -16, 15, ly); ctx.stroke();
    glowCircle(ctx, 15, ly, 9, 'rgba(174,244,255,0.85)');
    ctx.fillStyle = '#eafcff'; ctx.beginPath(); ctx.arc(15, ly, 2.6, 0, TAU); ctx.fill();
    eye(ctx, 6, -3, 3);
  },
  brood(ctx, e, d) {
    fishBody(ctx, d, 15, 11, Math.sin(e.wob * 1.3) * 3);
    // egg sacs
    ctx.fillStyle = d.belly;
    for (let i = 0; i < 3; i++) {
      const bob = Math.sin(e.wob * 1.3 + i * 2) * 1.5;
      ctx.beginPath(); ctx.arc(-4 + i * 5, 6 + bob, 3.5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.6);
    }
    eye(ctx, 8, -3, 2.8);
  },
  polyp(ctx, e, d) {
    // stalked drifting polyp
    const sway = Math.sin(e.wob * 1.2) * 3;
    ctx.strokeStyle = d.fin; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.quadraticCurveTo(0, 2, sway, -4); ctx.stroke();
    ctx.fillStyle = d.body;
    ctx.beginPath(); ctx.arc(sway, -6, 9, 0, TAU); ctx.fill(); inkStroke(ctx, 2.4);
    // grasping fronds
    ctx.strokeStyle = d.belly; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = -0.8 + i * 0.55 + Math.sin(e.wob + i) * 0.15;
      ctx.beginPath(); ctx.moveTo(sway, -6);
      ctx.lineTo(sway + Math.cos(a) * 13, -6 + Math.sin(a) * 13); ctx.stroke();
    }
    eye(ctx, sway + 2, -7, 2.4);
  },
  behemoth(ctx, e, d) {
    fishBody(ctx, d, 22, 15, Math.sin(e.wob) * 4);
    // armour ridges
    ctx.strokeStyle = d.fin; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(-i * 8 + 2, 0, 12 - i * 2, -1, 1); ctx.stroke();
    }
    // tusks
    ctx.fillStyle = '#efe8d8';
    ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(26, 9); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.6);
    eye(ctx, 12, -5, 3.2);
  },
  rime(ctx, e, d) {
    // frozen crawler: a slab of ice with something inside it
    ctx.fillStyle = d.body;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.8);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(-9, -7); ctx.lineTo(-2, -10); ctx.lineTo(2, -4); ctx.lineTo(-6, -2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = d.fin; ctx.lineWidth = 2.2;
    for (const sx of [-7, 0, 7]) {
      ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx + 2, -15); ctx.stroke();
    }
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.ellipse(4, 3, 7, 4.5, 0, 0, TAU); ctx.fill();
    eye(ctx, 9, -2, 2.6);
  },
  wisp(ctx, e, d) {
    // a drifting cold light with a thin trailing veil
    const pulse = 0.6 + 0.4 * Math.sin(e.wob * 2.4);
    glowCircle(ctx, 0, 0, 15 + pulse * 5, 'rgba(180,235,255,0.45)');
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6.5, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.2);
    ctx.strokeStyle = d.fin;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const off of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(-6 + off * 0.3, 3);
      ctx.quadraticCurveTo(-13 + off, 8 + Math.sin(e.wob * 3 + off) * 3, -18 + off, 5);
      ctx.stroke();
    }
    ctx.fillStyle = '#0d2233';
    ctx.beginPath(); ctx.arc(3, -1, 2, 0, TAU); ctx.fill();
  },
  glider(ctx, e, d) {
    // swept delta wings that snap when it sprints
    const flap = Math.sin(e.wob * 2.6) * 5;
    ctx.fillStyle = d.body;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.quadraticCurveTo(-2, -4, -8, -13 - flap);
    ctx.quadraticCurveTo(-6, -3, -14, -1);
    ctx.quadraticCurveTo(-6, 3, -8, 13 + flap);
    ctx.quadraticCurveTo(-2, 4, 14, 0);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = d.belly;
    ctx.beginPath(); ctx.ellipse(3, 0, 7, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = d.fin; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-7, -10 - flap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(-7, 10 + flap); ctx.stroke();
    eye(ctx, 8, -1.5, 2.2);
  },
  shaman(ctx, e, d) {
    fishBody(ctx, d, 12, 8.5, Math.sin(e.wob * 1.6) * 3);
    // kelp-wrapped totem staff with a mending orb
    ctx.strokeStyle = '#2a5540'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-6, -17); ctx.stroke();
    const gp = 0.6 + 0.4 * Math.sin(e.wob * 3);
    ctx.fillStyle = `rgba(140,240,190,${(0.5 + gp * 0.4).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(-6, -19, 3.4 + gp, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8df0c0';
    ctx.beginPath(); ctx.arc(-6, -19, 2, 0, TAU); ctx.fill(); inkStroke(ctx, 1.4);
    // ceremonial markings
    ctx.strokeStyle = d.belly; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(1, 0, 5, -0.9, 0.9); ctx.stroke();
    eye(ctx, 7, -2.5, 2.6);
  },
  juggernaut(ctx, e, d) {
    // barnacled shield shell while charged
    if (e.shieldHp > 0) {
      ctx.fillStyle = '#7d95a8';
      ctx.beginPath(); ctx.ellipse(-2, -2, 17, 13, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.8);
      ctx.strokeStyle = '#5a7285'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(-2, -2, 10, 0.4, 2.7); ctx.stroke();
      ctx.fillStyle = '#c9d8e2';
      for (const [bx, by] of [[-10, -8], [4, -11], [8, 2]]) {
        ctx.beginPath(); ctx.arc(bx, by, 2, 0, TAU); ctx.fill();
      }
    }
    fishBody(ctx, d, 18, 12, Math.sin(e.wob * 0.9) * 3);
    // riveted brow plate
    ctx.fillStyle = d.fin;
    ctx.beginPath(); ctx.moveTo(16, -4); ctx.quadraticCurveTo(4, -14, -6, -10);
    ctx.quadraticCurveTo(6, -8, 14, -1); ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.8);
    eye(ctx, 10, -4, 2.8);
  },
};

// Bosses reuse enemy drawing at large scale with custom accents; they are
// registered here so the battle renderer stays generic.
export function drawEnemyBody(ctx, e) {
  const d = e.def;
  const fn = DRAW[e.baseType || e.type] || DRAW.fry;
  if (e.hidden && !e.def.submerge) ctx.globalAlpha = 0.3; // cloaked ghost
  fn(ctx, e, d);
  ctx.globalAlpha = 1;
  if (e.elite) { // elite crest
    ctx.fillStyle = '#ffd873';
    ctx.beginPath();
    ctx.moveTo(-4, -e.def.radius - 4); ctx.lineTo(-1, -e.def.radius - 10); ctx.lineTo(2, -e.def.radius - 4);
    ctx.lineTo(5, -e.def.radius - 9); ctx.lineTo(7, -e.def.radius - 4);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.5);
  }
}
