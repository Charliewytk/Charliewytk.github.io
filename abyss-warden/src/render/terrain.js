// Terrain 3.0 — painted-ground backgrounds in the classic cartoon-TD style:
// the whole floor is dense textured GROUND (not open water), with raised
// plateaus, extruded cliff faces, deep pools, clustered decoration and a
// bright saturated palette. Painted once per battle into an offscreen canvas.
// Also exports animated caustics + landmark idle dynamics drawn per-frame.
import { INK, inkStroke } from './draw.js';
import { makeRng } from '../engine/rng.js';
import { makeNoise, paintRelief } from './noise.js';

const TAU = Math.PI * 2;

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function shade(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * mul) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * mul) | 0;
  const b = Math.min(255, (n & 255) * mul) | 0;
  return `rgb(${r},${g},${b})`;
}

// ---------- decoration mini-drawings ----------

function kelp(ctx, rng) {
  const n = 2 + (rng.float() * 3 | 0);
  for (let k = 0; k < n; k++) {
    const x0 = k * 6 - n * 3;
    const h = 24 + rng.float() * 18;
    ctx.strokeStyle = '#2e8a4f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo(x0 + 6, -h * 0.5, x0 - 3, -h);
    ctx.stroke();
    ctx.strokeStyle = '#55c979';
    ctx.lineWidth = 2;
    ctx.stroke();
    // little leaf nubs
    ctx.fillStyle = '#55c979';
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x0 + (i % 2 ? 4 : -3), -h * i / 3, 3, 1.6, i % 2 ? 0.6 : -0.6, 0, TAU);
      ctx.fill();
    }
  }
}

function coral(ctx, rng) {
  const col = rng.float() > 0.5 ? '#e86a9a' : '#f09a4a';
  const g = ctx.createRadialGradient(-3, -10, 1, 0, -5, 13);
  g.addColorStop(0, shade(col, 1.35));
  g.addColorStop(1, shade(col, 0.75));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -6, 9, 0, TAU);
  ctx.arc(-8, -2, 6, 0, TAU);
  ctx.arc(8, -3, 7, 0, TAU);
  ctx.fill();
  inkStroke(ctx, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(-3, -10, 3, 0, TAU); ctx.fill();
}

function starfish(ctx, rng) {
  ctx.fillStyle = rng.float() > 0.5 ? '#f0a04a' : '#e86a5a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 + 0.3;
    const r = i % 2 === 0 ? 8 : 3.5;
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
  }
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.8);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.arc(0, -1, 2, 0, TAU); ctx.fill();
}

function rock(ctx, rng) {
  const w = 10 + rng.float() * 8;
  const g = ctx.createLinearGradient(-w, -10, w, 6);
  g.addColorStop(0, '#a8b0b8');
  g.addColorStop(1, '#5c666e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, 4);
  ctx.quadraticCurveTo(-w * 0.7, -9, 1, -8 - rng.float() * 4);
  ctx.quadraticCurveTo(w, -7, w * 0.9, 4);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(-w * 0.3, -5, w * 0.35, 2.5, -0.3, 0, TAU); ctx.fill();
}

function seagrass(ctx, rng) {
  ctx.strokeStyle = '#4aa860';
  ctx.lineWidth = 2.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 3, 2);
    ctx.quadraticCurveTo(i * 3 + 3, -8, i * 2, -13 - Math.abs(i) - rng.float() * 4);
    ctx.stroke();
  }
}

function seaFan(ctx, rng) {
  const col = rng.float() > 0.5 ? '#e8608a' : '#f0a04a';
  const g = ctx.createLinearGradient(0, -22, 0, 0);
  g.addColorStop(0, shade(col, 1.3));
  g.addColorStop(1, shade(col, 0.7));
  ctx.strokeStyle = g;
  ctx.lineWidth = 2.4;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(i * 4, -10, i * 6.5, -20 - (3 - Math.abs(i)) * 2.5);
    ctx.stroke();
  }
  // webbing arcs
  ctx.strokeStyle = shade(col, 0.85);
  ctx.lineWidth = 1.2;
  for (let r = 8; r <= 20; r += 6) {
    ctx.beginPath();
    ctx.arc(0, 2, r, Math.PI * 1.22, Math.PI * 1.78);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -2);
  ctx.stroke();
}

function sponge(ctx, rng) {
  const g = ctx.createLinearGradient(-8, -18, 8, 2);
  g.addColorStop(0, '#e8c95a');
  g.addColorStop(1, '#9a7a2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(-9, -16, -4, -17);
  ctx.lineTo(4, -17);
  ctx.quadraticCurveTo(9, -16, 8, 2);
  ctx.closePath();
  ctx.fill();
  inkStroke(ctx, 2.2);
  // osculum + pores
  ctx.fillStyle = '#5c4a16';
  ctx.beginPath();
  ctx.ellipse(0, -16, 4, 1.8, 0, 0, TAU);
  ctx.fill();
  inkStroke(ctx, 1.4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (const [px, py] of [[-4, -8], [3, -5], [-1, -12]]) {
    ctx.beginPath();
    ctx.arc(px, py, 1.4, 0, TAU);
    ctx.fill();
  }
}

function urchin(ctx, rng) {
  ctx.strokeStyle = '#3a2a4a';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 2 - 4);
    ctx.lineTo(Math.cos(a) * (9 + rng.float() * 3), Math.sin(a) * (7 + rng.float() * 2) - 4);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(-2, -6, 1, 0, -4, 7);
  g.addColorStop(0, '#8a5fc9');
  g.addColorStop(1, '#3d2a5c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -4, 6, 4.5, 0, 0, TAU);
  ctx.fill();
  inkStroke(ctx, 1.8);
}

function tubeWorms(ctx, rng) {
  for (let i = -1; i <= 1; i++) {
    const h = 14 + rng.float() * 8;
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#d8d0c0');
    g.addColorStop(1, '#8a8272');
    ctx.fillStyle = g;
    ctx.fillRect(i * 6 - 2, -h, 4, h + 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(i * 6 - 2, -h, 4, h + 2);
    // feathery red plume
    ctx.strokeStyle = '#e8504a';
    ctx.lineWidth = 1.6;
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath();
      ctx.moveTo(i * 6, -h);
      ctx.quadraticCurveTo(i * 6 + f * 2, -h - 4, i * 6 + f * 3, -h - 6 - rng.float() * 2);
      ctx.stroke();
    }
  }
}

function shells(ctx, rng) {
  for (let i = 0; i < 3; i++) {
    const x = (rng.float() - 0.5) * 18, y = (rng.float() - 0.5) * 8;
    ctx.fillStyle = i % 2 ? '#f0e0c0' : '#e0c9a0';
    ctx.beginPath(); ctx.arc(x, y, 3 + rng.float() * 2, Math.PI, 0); ctx.closePath(); ctx.fill();
    inkStroke(ctx, 1.4);
  }
}

function anemone(ctx, rng) {
  const col = rng.float() > 0.5 ? '#c95a9a' : '#9a5ac9';
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.36;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * 7, Math.sin(a) * 7 - 3, Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.stroke();
  }
  ctx.fillStyle = shade(col, 1.3);
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); inkStroke(ctx, 1.6);
}

function spire(ctx, rng) {
  const g = ctx.createLinearGradient(-10, 0, 12, 0);
  g.addColorStop(0, '#7a6aa0');
  g.addColorStop(1, '#3d3358');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-11, 4);
  ctx.lineTo(-4, -26 - rng.float() * 10);
  ctx.lineTo(2, -12);
  ctx.lineTo(7, -20);
  ctx.lineTo(12, 4);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.2);
}

function wreckRibs(ctx, rng) {
  ctx.strokeStyle = '#9a8668';
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(i * 9 - 14, 2, 14, Math.PI * 1.15, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(i * 9 - 14, 2, 14, Math.PI * 1.15, Math.PI * 1.8);
    ctx.stroke();
  }
}

function glowShroom(ctx, rng) {
  const g = ctx.createRadialGradient(0, -8, 0, 0, -8, 16);
  g.addColorStop(0, 'rgba(200,150,255,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -8, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b07ae8';
  ctx.beginPath(); ctx.arc(0, -8, 6, Math.PI, 0); ctx.closePath(); ctx.fill();
  inkStroke(ctx, 1.8);
  ctx.strokeStyle = '#8054b0'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 0); ctx.stroke();
}

function ventlet(ctx, rng) {
  const g = ctx.createLinearGradient(-9, 0, 9, 0);
  g.addColorStop(0, '#6d4a42');
  g.addColorStop(1, '#33221e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, 4); ctx.lineTo(-5, -20); ctx.lineTo(5, -20); ctx.lineTo(10, 4);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.2);
  const gg = ctx.createRadialGradient(0, -22, 0, 0, -22, 10);
  gg.addColorStop(0, 'rgba(255,140,80,0.8)');
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.arc(0, -22, 10, 0, TAU); ctx.fill();
}

function bones(ctx, rng) {
  ctx.strokeStyle = '#e0d6c0';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(10, 4, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
}

function iceShard(ctx, rng) {
  const hgt = 12 + rng.float() * 16;
  ctx.fillStyle = 'rgba(226,244,252,0.85)';
  ctx.beginPath();
  ctx.moveTo(-5, 2); ctx.lineTo(-1, -hgt); ctx.lineTo(3, -hgt * 0.6); ctx.lineTo(6, 2);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(-2, 0); ctx.lineTo(-0.5, -hgt * 0.8); ctx.lineTo(1, 0);
  ctx.closePath(); ctx.fill();
}

function frostPatch(ctx, rng) {
  ctx.strokeStyle = 'rgba(214,240,250,0.75)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rng.float() * 0.3;
    const r = 6 + rng.float() * 7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6);
    ctx.stroke();
  }
}

const ZONE_DECOS = [
  [kelp, coral, starfish, rock, seagrass, shells, anemone, seaFan, sponge, urchin, kelp, seagrass, coral, seaFan],
  [spire, wreckRibs, glowShroom, rock, spire, glowShroom, anemone, bones, urchin, tubeWorms],
  [ventlet, bones, anemone, spire, ventlet, rock, glowShroom, tubeWorms, urchin],
  // Cold Seep — frost shards, seep tubeworms and bare stone
  [iceShard, frostPatch, rock, tubeWorms, iceShard, shells, frostPatch, bones, iceShard, rock],
];

// ---------- landmarks (kept from v2, now with registered dynamics) ----------

function lmOutpost(ctx) {
  for (const [dx, dy, s] of [[-26, 6, 0.8], [22, 10, 0.6], [0, -4, 1]]) {
    ctx.save(); ctx.translate(dx, dy); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 8, 18, 6, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);
    g.addColorStop(0, '#5fa8cf'); g.addColorStop(1, '#1d4a63');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 2, 14, Math.PI, 0); ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.fillStyle = '#c9f2ff';
    ctx.beginPath(); ctx.arc(-4, -3, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function lmSub(ctx) {
  ctx.save(); ctx.rotate(-0.28);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 22, 44, 9, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(0, -22, 0, 18);
  g.addColorStop(0, '#b8c4d0'); g.addColorStop(1, '#4d5a66');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 15, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.8);
  ctx.fillStyle = '#7d8d9c';
  ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(4, -30); ctx.lineTo(14, -14); ctx.closePath();
  ctx.fill(); inkStroke(ctx, 2.2);
  ctx.fillStyle = '#10303f';
  for (const px of [-24, -8, 8]) {
    ctx.beginPath(); ctx.arc(px, -2, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  ctx.fillStyle = '#1a232c';
  ctx.beginPath(); ctx.moveTo(26, 4); ctx.lineTo(40, -2); ctx.lineTo(42, 10); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function lmSinkhole(ctx) {
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
  g.addColorStop(0, 'rgba(140,240,255,0.6)');
  g.addColorStop(0.35, 'rgba(20,80,110,0.95)');
  g.addColorStop(1, 'rgba(4,20,30,0.95)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 26, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.6);
  ctx.strokeStyle = 'rgba(140,240,255,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 17, 0, 0, TAU); ctx.stroke();
}

function lmMonolith(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 26, 26, 8, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(-14, 0, 16, 0);
  g.addColorStop(0, '#8d9dad'); g.addColorStop(1, '#3d4a55');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16, 26); ctx.lineTo(-10, -34); ctx.lineTo(8, -40); ctx.lineTo(16, 26);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.8);
  ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(0, -22 + i * 13, 5, 0.4, Math.PI - 0.4); ctx.stroke();
  }
}

function lmVents(ctx) {
  for (const [dx, s] of [[-16, 1], [16, 0.75]]) {
    ctx.save(); ctx.translate(dx, 0); ctx.scale(s, s);
    const g = ctx.createLinearGradient(-10, 0, 12, 0);
    g.addColorStop(0, '#6d5248'); g.addColorStop(1, '#33221c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-5, -30); ctx.lineTo(5, -30); ctx.lineTo(12, 12);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.6);
    ctx.restore();
  }
}

function lmWreckHull(ctx) {
  ctx.save(); ctx.rotate(0.14);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 24, 50, 10, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(0, -30, 0, 22);
  g.addColorStop(0, '#9a8468'); g.addColorStop(1, '#443627');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-48, 22); ctx.quadraticCurveTo(-40, -26, 6, -30);
  ctx.lineTo(10, -12); ctx.lineTo(48, -16); ctx.lineTo(44, 22);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.8);
  ctx.strokeStyle = '#33291c'; ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(i * 12, 20); ctx.lineTo(i * 12 + 4, -18); ctx.stroke();
  }
  ctx.fillStyle = '#141c24';
  for (const px of [-28, -6]) {
    ctx.beginPath(); ctx.arc(px, 0, 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5d6d7a'; ctx.lineWidth = 1.6; ctx.stroke();
  }
  ctx.restore();
}

function lmSmokers(ctx) {
  for (const [dx, dy, s] of [[-30, 8, 0.8], [0, 0, 1.15], [28, 10, 0.65]]) {
    ctx.save(); ctx.translate(dx, dy); ctx.scale(s, s);
    const g = ctx.createLinearGradient(-9, 0, 9, 0);
    g.addColorStop(0, '#40302a'); g.addColorStop(1, '#1c120e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(-4, -34); ctx.lineTo(4, -34); ctx.lineTo(9, 10);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
    ctx.restore();
  }
}

function lmWhirlpool(ctx) {
  ctx.strokeStyle = 'rgba(240,225,180,0.65)';
  ctx.lineWidth = 4;
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let a = 0; a < 4.2; a += 0.25) {
      const r = 4 + a * 8;
      const x = Math.cos(a + arm * 2.1) * r, y = Math.sin(a + arm * 2.1) * r * 0.6;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(10,30,40,0.6)';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, TAU); ctx.fill();
}

function lmNursery(ctx) {
  const g = ctx.createRadialGradient(-6, -10, 2, 0, 0, 26);
  g.addColorStop(0, '#ffb8e8'); g.addColorStop(1, '#a04a86');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -4, 22, Math.PI, 0); ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.6);
  ctx.strokeStyle = '#6d2c5e'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(0, -4 + i * 2, 18 - i * 4.5, Math.PI + 0.3, -0.3); ctx.stroke();
  }
  for (const [ex, ey] of [[-30, 4], [-24, 12], [28, 8], [34, 2]]) {
    ctx.fillStyle = 'rgba(220,250,190,0.95)';
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU); ctx.fill(); inkStroke(ctx, 1.6);
    ctx.fillStyle = '#5a8630';
    ctx.beginPath(); ctx.arc(ex + 1, ey + 1, 1.8, 0, TAU); ctx.fill();
  }
}

function lmWhaleBones(ctx) {
  ctx.strokeStyle = '#ecdfc5';
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 5 - i * 0.5;
    ctx.beginPath(); ctx.arc(-i * 16 + 20, 6, 24 - i * 2, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(-i * 16 + 20, 6, 24 - i * 2, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  const g = ctx.createLinearGradient(30, -10, 60, 10);
  g.addColorStop(0, '#f0e6cf'); g.addColorStop(1, '#a89a80');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(34, 8); ctx.quadraticCurveTo(40, -16, 62, -10);
  ctx.quadraticCurveTo(70, 0, 60, 8); ctx.closePath();
  ctx.fill(); inkStroke(ctx, 2.2);
  ctx.fillStyle = '#141c24';
  ctx.beginPath(); ctx.arc(52, -4, 3.5, 0, TAU); ctx.fill();
}

function lmGate(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 30, 42, 9, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(-30, 0, 30, 0);
  g.addColorStop(0, '#5d5266'); g.addColorStop(1, '#241e2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-38, 30); ctx.lineTo(-34, -18); ctx.quadraticCurveTo(0, -46, 34, -18);
  ctx.lineTo(38, 30); ctx.lineTo(24, 30); ctx.lineTo(22, -10);
  ctx.quadraticCurveTo(0, -30, -22, -10); ctx.lineTo(-24, 30);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.8);
  ctx.fillStyle = '#ff8f7a';
  for (const [rx, ry] of [[-29, 0], [0, -32], [29, 0]]) {
    ctx.beginPath(); ctx.arc(rx, ry, 2.6, 0, TAU); ctx.fill();
  }
}

function lmFissure(ctx) {
  ctx.strokeStyle = 'rgba(255,120,70,0.95)';
  ctx.lineWidth = 5;
  ctx.shadowColor = 'rgba(255,110,60,0.9)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-44, -6); ctx.lineTo(-18, 4); ctx.lineTo(2, -8); ctx.lineTo(26, 6); ctx.lineTo(46, -2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1a0e0a'; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-44, -10); ctx.lineTo(-18, 0); ctx.lineTo(2, -12); ctx.lineTo(26, 2); ctx.lineTo(46, -6);
  ctx.stroke();
}

function lmRuin(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 18, 36, 9, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 30);
  g.addColorStop(0, '#54707c'); g.addColorStop(1, '#1c2c33');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 8, 28, Math.PI, 0); ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.6);
  ctx.fillStyle = '#0a1216';
  ctx.beginPath(); ctx.moveTo(6, -18); ctx.lineTo(16, 2); ctx.lineTo(24, -4); ctx.lineTo(28, 8);
  ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d5560';
  ctx.fillRect(-34, 6, 68, 6);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-34, 6, 68, 6);
}

function lmBridge(ctx) {
  const g = ctx.createLinearGradient(0, -8, 0, 12);
  g.addColorStop(0, '#8d9dad'); g.addColorStop(1, '#3d4a55');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-10, -18, 14, -8);
  ctx.lineTo(12, 2); ctx.quadraticCurveTo(-10, -8, -44, 10);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
  ctx.fillStyle = '#3d4a55';
  ctx.beginPath(); ctx.moveTo(24, -4); ctx.lineTo(46, 6); ctx.lineTo(42, 14); ctx.lineTo(22, 6);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.2);
  for (const px of [-38, -18, 2]) {
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(px, 2); ctx.lineTo(px, 18); ctx.stroke();
  }
}

function lmThrone(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 34, 40, 10, 0, 0, TAU); ctx.fill();
  for (const [dx, h, w] of [[-26, 34, 12], [26, 30, 12], [0, 52, 16]]) {
    const g = ctx.createLinearGradient(dx - w, 0, dx + w, 0);
    g.addColorStop(0, '#5c3448'); g.addColorStop(1, '#1c0e16');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(dx - w, 34); ctx.lineTo(dx - w * 0.55, 34 - h); ctx.lineTo(dx + w * 0.55, 34 - h - 6);
    ctx.lineTo(dx + w, 34);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.6);
  }
  ctx.fillStyle = '#ff9a9a';
  ctx.beginPath(); ctx.arc(0, -6, 3.4, 0, TAU); ctx.fill();
}

// dynamics: idle animation emitters rendered per frame by drawTerrainDynamics
const LANDMARKS = {
  level01: { fn: lmOutpost, at: [590, 250], dyn: [{ type: 'bubbles', dx: 0, dy: -10 }] },
  level02: { fn: lmSub, at: [720, 560], dyn: [{ type: 'bubbles', dx: 30, dy: -6 }, { type: 'flicker', dx: -24, dy: -2, color: '#9fe8ff' }] },
  level03: { fn: lmSinkhole, at: [290, 350], dyn: [{ type: 'glow', dx: 0, dy: 0, r: 34, color: 'rgba(140,240,255,0.35)' }] },
  level04: { fn: lmMonolith, at: [470, 300], dyn: [{ type: 'glow', dx: 0, dy: -18, r: 20, color: 'rgba(140,220,255,0.3)' }] },
  level05: { fn: lmVents, at: [90, 540], dyn: [{ type: 'smoke', dx: -16, dy: -30 }, { type: 'smoke', dx: 16, dy: -24 }] },
  level06: { fn: lmWreckHull, at: [820, 120], dyn: [{ type: 'bubbles', dx: 0, dy: -20 }] },
  level07: { fn: lmSmokers, at: [800, 110], dyn: [{ type: 'smoke', dx: -30, dy: -28 }, { type: 'smoke', dx: 0, dy: -40 }, { type: 'smoke', dx: 28, dy: -26 }] },
  level08: { fn: lmWhirlpool, at: [420, 330], dyn: [{ type: 'swirl', dx: 0, dy: 0 }] },
  level09: { fn: lmNursery, at: [420, 260], dyn: [{ type: 'sparkle', dx: 0, dy: -10, color: '#ffb8e8' }] },
  level10: { fn: lmWhaleBones, at: [180, 350], dyn: [{ type: 'bubbles', dx: 20, dy: -10 }] },
  level11: { fn: lmGate, at: [420, 420], dyn: [{ type: 'glow', dx: 0, dy: -12, r: 40, color: 'rgba(255,110,80,0.28)' }] },
  level12: { fn: lmFissure, at: [330, 300], dyn: [{ type: 'glow', dx: 0, dy: -2, r: 46, color: 'rgba(255,110,60,0.3)' }, { type: 'smoke', dx: 10, dy: -8 }] },
  level13: { fn: lmRuin, at: [160, 520], dyn: [{ type: 'flicker', dx: -12, dy: -4, color: '#ffd873' }] },
  level14: { fn: lmBridge, at: [480, 90], dyn: [{ type: 'bubbles', dx: 0, dy: -8 }] },
  level15: { fn: lmThrone, at: [430, 430], dyn: [{ type: 'glow', dx: 0, dy: -6, r: 44, color: 'rgba(255,90,90,0.35)' }, { type: 'sparkle', dx: 0, dy: -20, color: '#ff9a9a' }] },
};

// ---------- painted background builder ----------

export function buildBattleBackground(L, paths, pal, W, H) {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(hashId(L.id));
  const dynamics = [];

  // 1) GROUND — the whole floor is terrain, not open water
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, 0, W, H);

  // very soft, very large tonal drift (keeps the floor from being flat
  // without ever reading as blotches)
  for (let i = 0; i < 14; i++) {
    const x = rng.float() * W, y = rng.float() * H, r = 160 + rng.float() * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rng.float() > 0.5 ? pal.groundLight : pal.groundDark);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // sparse dapple
  for (let i = 0; i < 90; i++) {
    const x = rng.float() * W, y = rng.float() * H;
    ctx.fillStyle = i % 2 ? pal.groundLight : pal.groundDark;
    ctx.globalAlpha = 0.05 + rng.float() * 0.04;
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + rng.float() * 18, 4 + rng.float() * 10, rng.float() * TAU, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // fine speckle (painted grain)
  for (let i = 0; i < 900; i++) {
    const x = rng.float() * W, y = rng.float() * H;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + rng.float() * 1.4, 0, TAU);
    ctx.fill();
  }

  // path samples (for placement rejection)
  const samples = [];
  const tmp = { x: 0, y: 0, angle: 0 };
  for (const p of paths) {
    for (let d = 0; d <= p.total; d += 10) {
      p.at(d, tmp);
      samples.push([tmp.x, tmp.y, tmp.angle]);
    }
  }
  const nearPath = (x, y, r) => {
    for (const [sx, sy] of samples) if ((sx - x) ** 2 + (sy - y) ** 2 < r * r) return true;
    return false;
  };
  const nearPad = (x, y, r) => {
    for (const p of L.pads) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r) return true;
    return false;
  };

  // 2) DEEP POOLS — dark water depressions (elevation, downward)
  const features = []; // placed pools/plateaus, so they never overlap each other
  const nearFeature = (x, y, r) => {
    for (const [fx, fy, fr] of features) if ((fx - x) ** 2 + (fy - y) ** 2 < (r + fr) ** 2) return true;
    return false;
  };
  let pools = 0, ptries = 0;
  while (pools < 3 && ptries++ < 80) {
    const x = 60 + rng.float() * (W - 120), y = 120 + rng.float() * (H - 180);
    const rx = 45 + rng.float() * 55, ry = rx * (0.5 + rng.float() * 0.2);
    if (nearPath(x, y, rx + 44) || nearPad(x, y, rx + 40) || nearFeature(x, y, rx + 14)) continue;
    features.push([x, y, rx]);
    pools++;
    const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
    g.addColorStop(0, pal.poolDeep);
    g.addColorStop(0.75, pal.pool);
    g.addColorStop(1, pal.groundDark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    inkStroke(ctx, 2.4);
    // inner rim shadow (top) + light rim (bottom) = depressed
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(x, y - 2, rx * 0.92, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y + 2, rx * 0.95, ry * 0.92, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    dynamics.push({ type: 'bubbles', x, y, r: rx * 0.5 });
  }

  // 3) PLATEAUS — raised rock outcrops with extruded cliff faces (upward)
  let mounds = 0, mtries = 0;
  while (mounds < 5 && mtries++ < 120) {
    const x = 50 + rng.float() * (W - 100), y = 130 + rng.float() * (H - 190);
    const rx = 26 + rng.float() * 40, ry = rx * 0.62;
    if (nearPath(x, y, rx + 40) || nearPad(x, y, rx + 36) || nearFeature(x, y, rx + 16)) continue;
    features.push([x, y, rx + 8]);
    mounds++;
    const drop = 10 + rx * 0.28;
    // blob outline
    const pts = [];
    const nP = 9;
    for (let i = 0; i < nP; i++) {
      const a = (i / nP) * TAU;
      const rr = 1 + (rng.float() - 0.5) * 0.35;
      pts.push([x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr]);
    }
    const trace = (dy) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] + dy);
      for (let i = 1; i <= nP; i++) {
        const [ax, ay] = pts[i % nP];
        const [bx, by] = pts[(i - 1) % nP];
        ctx.quadraticCurveTo(bx, by + dy, (ax + bx) / 2, (ay + by) / 2 + dy);
      }
      ctx.closePath();
    };
    // soft AO
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    trace(drop + 5);
    ctx.fill();
    // cliff face (extrusion)
    const cg = ctx.createLinearGradient(0, y, 0, y + drop + ry);
    cg.addColorStop(0, pal.cliff);
    cg.addColorStop(1, shade(pal.cliff, 0.55));
    ctx.fillStyle = cg;
    trace(drop);
    ctx.fill();
    inkStroke(ctx, 2.4);
    // vertical striations on the face
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const sx = x - rx * 0.7 + i * rx * 0.35;
      ctx.beginPath(); ctx.moveTo(sx, y + ry * 0.5); ctx.lineTo(sx + 2, y + ry * 0.5 + drop * 0.8); ctx.stroke();
    }
    // top face
    const tg = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 2, x, y, rx);
    tg.addColorStop(0, pal.cliffTopLight);
    tg.addColorStop(1, pal.cliffTop);
    ctx.fillStyle = tg;
    trace(0);
    ctx.fill();
    inkStroke(ctx, 2.6);
    // top rim highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x - 2, y - 3, rx * 0.7, ry * 0.6, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // topper deco
    if (rng.float() > 0.4) {
      ctx.save(); ctx.translate(x, y - 2);
      const dl = ZONE_DECOS[L.zone || 0] || ZONE_DECOS[0];
      dl[(rng.float() * dl.length) | 0](ctx, rng);
      ctx.restore();
    }
  }

  // 4) light shafts
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = 80 + rng.float() * (W - 160);
    ctx.fillStyle = 'rgba(200,240,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(x - 14, 0);
    ctx.lineTo(x + 44, 0);
    ctx.lineTo(x + 170, H);
    ctx.lineTo(x + 60, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 5) THE ROAD — bright worn channel with bevel
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const p of paths) {
    const trace = (dy) => {
      ctx.beginPath();
      ctx.moveTo(p.pts[0].x, p.pts[0].y + dy);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y + dy);
    };
    trace(4);
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 52; ctx.stroke();
    trace(0);
    ctx.strokeStyle = pal.pathEdge; ctx.lineWidth = 44; ctx.stroke();
    trace(2);
    ctx.strokeStyle = pal.path; ctx.lineWidth = 35; ctx.stroke();
    trace(-11);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 8; ctx.stroke();
    trace(4);
    ctx.strokeStyle = pal.pathLight; ctx.lineWidth = 21; ctx.stroke();
    trace(15);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4; ctx.stroke();
  }
  // ---------- painted relief: the "brushwork" layer ----------
  // two overlay passes of lit value-noise texture everything painted so far
  // (ground, pools, plateaus AND the road) with mottled hand-shaded relief
  paintRelief(ctx, W, H, hashId(L.id), [
    { scale: 0.05, amp: 3, alpha: 0.2, oct: 3 },
    { scale: 0.17, amp: 2.2, alpha: 0.15, oct: 2, seedOffset: 991 },
  ]);

  // road grain: stones, speckle, edge pebbles
  for (const p of paths) {
    for (let d = 10; d < p.total; d += 22) {
      p.at(d, tmp);
      const a = tmp.angle + Math.PI / 2;
      const off = (rng.float() - 0.5) * 15;
      ctx.save();
      ctx.translate(tmp.x + Math.cos(a) * off, tmp.y + Math.sin(a) * off + 3);
      ctx.rotate(tmp.angle);
      ctx.fillStyle = rng.float() > 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.5 + rng.float() * 4.5, 2 + rng.float() * 2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      // edge pebbles
      if (rng.float() > 0.55) {
        const side = rng.float() > 0.5 ? 24 : -24;
        const px = tmp.x + Math.cos(a) * side, py = tmp.y + Math.sin(a) * side + 3;
        ctx.fillStyle = shade(pal.pathEdge, 1.5);
        ctx.beginPath(); ctx.arc(px, py, 2 + rng.float() * 2.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 2.5;
    for (const side of [-6, 6]) {
      ctx.beginPath();
      let first = true;
      for (let d = 0; d <= p.total; d += 8) {
        p.at(d, tmp);
        const a = tmp.angle + Math.PI / 2;
        first ? ctx.moveTo(tmp.x + Math.cos(a) * side, tmp.y + Math.sin(a) * side + 4)
              : ctx.lineTo(tmp.x + Math.cos(a) * side, tmp.y + Math.sin(a) * side + 4);
        first = false;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 6) DENSE clustered decoration — placement gated by a noise field so
  // flora gathers into natural meadows and reefs instead of even scatter
  const decos = ZONE_DECOS[L.zone || 0];
  const meadow = makeNoise(hashId(L.id) + 51);
  let clusters = 0, ctries = 0;
  while (clusters < 30 && ctries++ < 700) {
    const cx = 26 + rng.float() * (W - 52);
    const cy = 90 + rng.float() * (H - 120);
    if (nearPath(cx, cy, 56) || nearPad(cx, cy, 58)) continue;
    if (meadow.fbm(cx * 0.008, cy * 0.008) < 0.48) continue;
    clusters++;
    const count = 3 + (rng.float() * 5 | 0);
    for (let k = 0; k < count; k++) {
      const x = cx + (rng.float() - 0.5) * 56;
      const y = cy + (rng.float() - 0.5) * 40;
      if (nearPath(x, y, 40) || nearPad(x, y, 44)) continue;
      ctx.save();
      ctx.translate(x, y);
      const s = 0.55 + rng.float() * 0.65;
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 4, 0, 0, TAU); ctx.fill();
      decos[(rng.float() * decos.length) | 0](ctx, rng);
      ctx.restore();
    }
  }

  // 7) landmark set-piece + its idle dynamics
  const lm = LANDMARKS[L.id];
  if (lm) {
    let [lx, ly] = lm.at;
    const clear = (x, y) => !nearPath(x, y, 78) && !nearPad(x, y, 70);
    if (!clear(lx, ly)) {
      outer:
      for (const rr of [60, 110, 160, 220]) {
        for (let a = 0; a < TAU; a += TAU / 10) {
          const nx = lx + Math.cos(a) * rr, ny = ly + Math.sin(a) * rr;
          if (nx > 60 && nx < W - 60 && ny > 110 && ny < H - 50 && clear(nx, ny)) {
            lx = nx; ly = ny;
            break outer;
          }
        }
      }
    }
    ctx.save();
    ctx.translate(lx, ly);
    lm.fn(ctx);
    ctx.restore();
    for (const d of lm.dyn || []) {
      dynamics.push({ ...d, x: lx + d.dx, y: ly + d.dy });
    }
  }
  // living kelp: a few dynamic strands sway with the current on top of the bake
  let kelps = 0, ktries = 0;
  while (kelps < 7 && ktries++ < 80) {
    const x = 30 + rng.float() * (W - 60), y = 110 + rng.float() * (H - 150);
    if (nearPath(x, y, 46) || nearPad(x, y, 48)) continue;
    kelps++;
    dynamics.push({ type: 'kelp', x, y, s: 0.8 + rng.float() * 0.7, ph: rng.float() * TAU });
  }
  // vent decos in hadal get ambient smoke too
  if ((L.zone || 0) === 2) {
    for (let i = 0; i < 3; i++) {
      const x = 80 + rng.float() * (W - 160), y = 140 + rng.float() * (H - 200);
      if (!nearPath(x, y, 60)) dynamics.push({ type: 'smoke', x, y, faint: true });
    }
  }

  // 8) pad platforms
  for (const p of L.pads) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    if (p.destroyed) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 8, 26, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2c20';
      ctx.beginPath(); ctx.ellipse(0, 4, 23, 15, 0, 0, TAU); ctx.fill();
      inkStroke(ctx, 2.4);
      ctx.strokeStyle = '#57402c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-2, 8); ctx.moveTo(4, -4); ctx.lineTo(12, 6);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 9, 27, 10, 0, 0, TAU); ctx.fill();
      const rimG = ctx.createLinearGradient(0, -12, 0, 22);
      rimG.addColorStop(0, '#3d7ea8'); rimG.addColorStop(1, '#17384f');
      ctx.fillStyle = rimG;
      ctx.beginPath(); ctx.ellipse(0, 6, 26, 17, 0, 0, TAU); ctx.fill();
      inkStroke(ctx, 2.6);
      const deckG = ctx.createRadialGradient(-6, -4, 2, 0, 2, 26);
      deckG.addColorStop(0, '#68a8cf'); deckG.addColorStop(1, '#2c5a7a');
      ctx.fillStyle = deckG;
      ctx.beginPath(); ctx.ellipse(0, 2, 24, 15, 0, 0, TAU); ctx.fill();
      inkStroke(ctx, 2);
      ctx.fillStyle = '#c9ecff';
      for (const [bx, by] of [[-17, 2], [17, 2], [0, -9], [0, 12]]) {
        ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 9) water tint + vignette
  ctx.fillStyle = pal.tint;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,10,18,0.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  return { canvas: cv, dynamics };
}

// ---------- animated caustics ----------

export function makeCausticTile(size = 260) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  const rng = makeRng(0xca57);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  // web of wobbling cells (drawn twice at offsets for tileability)
  const cells = [];
  for (let i = 0; i < 26; i++) cells.push([rng.float() * size, rng.float() * size, 18 + rng.float() * 34]);
  for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size], [size, size], [-size, -size], [size, -size], [-size, size]]) {
    for (const [x, y, r] of cells) {
      ctx.lineWidth = 1.5 + rng.float() * 1.5;
      ctx.beginPath();
      for (let a = 0; a <= TAU + 0.3; a += 0.5) {
        const rr = r * (1 + Math.sin(a * 3 + x) * 0.22);
        const px = x + ox + Math.cos(a) * rr, py = y + oy + Math.sin(a) * rr * 0.8;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  return cv;
}

// draw two drifting caustic layers over the ground
export function drawCaustics(ctx, tile, time, W, H, alpha = 0.07) {
  const s = tile.width;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (const [speed, scale, a] of [[14, 1, alpha], [-9, 1.6, alpha * 0.6]]) {
    ctx.globalAlpha = a * (0.85 + 0.15 * Math.sin(time * 0.7));
    const off = ((time * speed) % s + s) % s;
    const ss = s * scale;
    for (let x = -ss + off; x < W + ss; x += ss) {
      for (let y = -ss + off * 0.6; y < H + ss; y += ss) {
        ctx.drawImage(tile, x, y, ss, ss);
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- landmark idle dynamics ----------

export function drawTerrainDynamics(ctx, dynamics, time) {
  for (const d of dynamics) {
    if (d.type === 'smoke') {
      for (let i = 0; i < 3; i++) {
        const t = ((time * 0.4 + i * 0.33 + (d.x % 10) * 0.05) % 1);
        const y = d.y - t * 46;
        const drift = Math.sin(time * 1.2 + i * 2 + d.x) * 6 * t;
        ctx.globalAlpha = (1 - t) * (d.faint ? 0.12 : 0.25);
        ctx.fillStyle = '#b8b8c9';
        ctx.beginPath();
        ctx.arc(d.x + drift, y, 4 + t * 10, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (d.type === 'glow') {
      const p = 0.7 + 0.3 * Math.sin(time * 2 + d.x);
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * p);
      g.addColorStop(0, d.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * p, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (d.type === 'flicker') {
      if (Math.sin(time * 7 + d.x) > -0.2 && Math.sin(time * 13.7 + d.x * 2) > -0.6) {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(d.x, d.y, 2.6, 0, TAU); ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 12);
        g.addColorStop(0, d.color.replace(')', ',0.4)').replace('rgb', 'rgba').replace('#', '#'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    } else if (d.type === 'swirl') {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(time * 1.4);
      ctx.strokeStyle = 'rgba(240,225,180,0.5)';
      ctx.lineWidth = 3;
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let a = 0; a < 4.2; a += 0.3) {
          const r = 4 + a * 8;
          const x = Math.cos(a + arm * 2.1) * r, y = Math.sin(a + arm * 2.1) * r * 0.6;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (d.type === 'sparkle') {
      for (let i = 0; i < 2; i++) {
        const t = (time * 0.7 + i * 0.5 + (d.x % 7) * 0.1) % 1;
        ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
        ctx.fillStyle = d.color;
        const sx = d.x + Math.sin(i * 4 + time) * 14, sy = d.y - t * 24;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3); ctx.lineTo(sx + 2, sy); ctx.lineTo(sx, sy + 3); ctx.lineTo(sx - 2, sy);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (d.type === 'kelp') {
      const sway = Math.sin(time * 1.4 + d.ph) * 6 * d.s;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(d.s, d.s);
      for (let k = -1; k <= 1; k++) {
        ctx.strokeStyle = '#2e8a4f';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(k * 5, 2);
        ctx.quadraticCurveTo(k * 5 + sway * 0.5, -14, k * 3 + sway, -28 - Math.abs(k) * 4);
        ctx.stroke();
        ctx.strokeStyle = '#55c979';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      ctx.restore();
    } else if (d.type === 'bubbles') {
      for (let i = 0; i < 3; i++) {
        const t = ((time * 0.35 + i * 0.37 + (d.x % 13) * 0.07) % 1);
        const y = d.y - t * 40;
        ctx.globalAlpha = (1 - t) * 0.5;
        ctx.strokeStyle = 'rgba(220,245,255,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(d.x + Math.sin(time * 2 + i * 2.2) * 4, y, 2 + t * 2.5, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}
