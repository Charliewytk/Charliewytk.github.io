// World map: an illustrated descent chart — three terrain bands (Shelf,
// Trench, Hadal Rift), a dotted expedition trail, flag-pole level nodes and
// a Kingdom-Rush-style bottom bar.
import { LEVELS, isUnlocked, endlessLevel } from '../game/levels/index.js';
import { launchLevel } from '../game/launch.js';
import { totalStars } from '../game/save.js';
import { HEROES, HERO_ORDER, drawHero } from '../game/heroes.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { makeRng } from '../engine/rng.js';
import { paintRelief } from '../render/noise.js';
import { INK, inkStroke, panel, ribbonBanner, starIcon, drawText, drawTextO, drawButton, hitRect, glowCircle, ring, roundRect } from '../render/draw.js';

const TAU = Math.PI * 2;

const NODE_POS = [
  [144, 96], [322, 70], [500, 104], [678, 68], [856, 100],
  [923, 206], [745, 236], [567, 200], [389, 240], [211, 208],
  [169, 300], [333, 350], [511, 316], [689, 354], [867, 320],
  [923, 440], [745, 470], [556, 436], [378, 474], [200, 440],
];

// ---------- illustrated terrain (rendered once) ----------

function buildMapTerrain(W, H) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(0x5eabed);

  // bands
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a6a8a');
  g.addColorStop(0.20, '#0d4a63');
  g.addColorStop(0.26, '#2b2058');
  g.addColorStop(0.40, '#171040');
  g.addColorStop(0.46, '#33101a');
  g.addColorStop(0.60, '#12060a');
  g.addColorStop(0.66, '#123244');   // the Cold Seep begins
  g.addColorStop(0.84, '#3d6f88');
  g.addColorStop(1, '#7fa8bd');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // painted relief brushwork across the whole chart
  paintRelief(ctx, W, H, 0x5eabed, [
    { scale: 0.05, amp: 3, alpha: 0.18, oct: 3 },
    { scale: 0.16, amp: 2, alpha: 0.12, oct: 2, seedOffset: 77 },
  ]);

  // shelf: sandy patches + kelp + tiny domes
  for (let i = 0; i < 8; i++) {
    const x = rng.float() * W, y = 50 + rng.float() * 90, r = 36 + rng.float() * 70;
    const pg = ctx.createRadialGradient(x, y, 0, x, y, r);
    pg.addColorStop(0, 'rgba(200,180,120,0.16)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    const x = rng.float() * W, y = 50 + rng.float() * 90;
    ctx.strokeStyle = 'rgba(60,160,110,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.quadraticCurveTo(x + 5, y - 2, x - 2, y - 12 - rng.float() * 8);
    ctx.stroke();
  }
  // shelf edge cliff into the trench
  ctx.fillStyle = 'rgba(10,8,30,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 150);
  for (let x = 0; x <= W; x += 60) {
    ctx.lineTo(x + 30, 150 + (x * 7919 % 23));
  }
  ctx.lineTo(W, 182); ctx.lineTo(W, 164); ctx.lineTo(0, 177);
  ctx.closePath(); ctx.fill();

  // trench: canyon streaks + wrecks + shrooms
  for (let i = 0; i < 10; i++) {
    const x = rng.float() * W, y = 172 + rng.float() * 78;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3 + rng.float() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + rng.float() * 40, y + 14 + rng.float() * 20);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = 60 + rng.float() * (W - 120), y = 180 + rng.float() * 70;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 14);
    gg.addColorStop(0, 'rgba(190,140,255,0.5)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a5fc9';
    ctx.beginPath(); ctx.arc(x, y, 3.5, Math.PI, 0); ctx.closePath(); ctx.fill();
    inkStroke(ctx, 1.2);
  }
  // second cliff into the rift
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.moveTo(0, 262);
  for (let x = 0; x <= W; x += 50) ctx.lineTo(x + 25, 262 + (x * 104729 % 19));
  ctx.lineTo(W, 290); ctx.lineTo(W, 275); ctx.lineTo(0, 285);
  ctx.closePath(); ctx.fill();

  // hadal: the glowing rift crack + vents
  ctx.strokeStyle = 'rgba(255,90,50,0.8)';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255,90,50,0.9)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(40, 372);
  ctx.lineTo(180, 352);
  ctx.lineTo(330, 374);
  ctx.lineTo(520, 348);
  ctx.lineTo(700, 372);
  ctx.lineTo(880, 350);
  ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 7; i++) {
    const x = 60 + rng.float() * (W - 120), y = 300 + rng.float() * 60;
    ctx.fillStyle = '#2a1214';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 4); ctx.lineTo(x - 3, y - 12); ctx.lineTo(x + 3, y - 12); ctx.lineTo(x + 7, y + 4);
    ctx.closePath(); ctx.fill();
    inkStroke(ctx, 1.6);
    const vg = ctx.createRadialGradient(x, y - 14, 0, x, y - 14, 8);
    vg.addColorStop(0, 'rgba(255,130,70,0.7)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.arc(x, y - 14, 8, 0, TAU); ctx.fill();
  }

  // Cold Seep: a lid of methane ice with frost shards hanging under it
  ctx.fillStyle = 'rgba(210,238,248,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, 396);
  for (let x = 0; x <= W; x += 44) ctx.lineTo(x + 22, 396 + (x * 7919 % 15) - 7);
  ctx.lineTo(W, 372); ctx.lineTo(0, 372);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 22; i++) {
    const x = rng.float() * W, y = 398 + rng.float() * 108;
    const hgt = 10 + rng.float() * 22;
    ctx.fillStyle = 'rgba(226,244,252,' + (0.28 + rng.float() * 0.3).toFixed(2) + ')';
    ctx.beginPath();
    ctx.moveTo(x - 5, y); ctx.lineTo(x, y + hgt); ctx.lineTo(x + 5, y);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = 40 + rng.float() * (W - 80), y = 420 + rng.float() * 90;
    const vg2 = ctx.createRadialGradient(x, y, 0, x, y, 20);
    vg2.addColorStop(0, 'rgba(190,240,255,0.5)');
    vg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg2;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill();
  }

  // zone name plates
  const zoneY = [142, 254, 364, 508];
  S.zones.forEach((z, i) => {
    ctx.font = '800 15px "Trebuchet MS", system-ui, sans-serif';
    const w = ctx.measureText(z.toUpperCase()).width + 26;
    roundRect(ctx, 14, zoneY[i] - 26, w, 26, 7);
    ctx.fillStyle = 'rgba(4,16,26,0.75)';
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = 'rgba(200,235,255,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(z.toUpperCase(), 27, zoneY[i] - 12);
  });

  // dotted expedition trail
  for (let i = 0; i < NODE_POS.length - 1; i++) {
    const [x1, y1] = NODE_POS[i], [x2, y2] = NODE_POS[i + 1];
    const d = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.floor(d / 16);
    for (let k = 2; k < steps - 1; k++) {
      const t = k / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 8;
      ctx.fillStyle = '#ffd873';
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  return cv;
}

export function createMap(game, data = {}) {
  const { W, H } = game;
  let t = 0;
  let selected = data.selected != null ? data.selected : null;
  let difficulty = 'standard';
  let heroHover = null;
  let lockedMsg = 0;
  let challenge = null;
  const terrain = buildMapTerrain(W, H);
  const motes = [];
  for (let i = 0; i < 40; i++) {
    motes.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.5, s: Math.random() * 6 + 2, p: Math.random() * TAU });
  }
  // ambient fish schools drifting across the chart
  const fish = [];
  for (let i = 0; i < 7; i++) {
    fish.push({
      x: Math.random() * W, y: 70 + Math.random() * (H - 200),
      s: 0.5 + Math.random() * 0.8, spd: (12 + Math.random() * 22) * (Math.random() > 0.5 ? 1 : -1),
      p: Math.random() * TAU,
    });
  }

  const BAR_Y = H - 78;
  const bottomBtns = [
    { id: 'feats', x: W - 520, y: BAR_Y + 10, w: 114, h: 56, label: 'Feats', icon: 'trophy' },
    { id: 'upgrades', x: W - 396, y: BAR_Y + 10, w: 122, h: 56, label: S.map.upgrades, icon: 'anvil' },
    { id: 'codex', x: W - 264, y: BAR_Y + 10, w: 122, h: 56, label: S.map.codex, icon: 'book' },
    { id: 'settings', x: W - 132, y: BAR_Y + 10, w: 118, h: 56, label: S.map.settings, icon: 'gear' },
  ];
  const ENDLESS_NODE = { x: 1003 - 26, y: 250 - 34, w: 52, h: 62, cx: 1003, cy: 250 };
  const endlessOpen = () => (game.save.stars.level20 || 0) > 0;

  function heroRect(i) { return { x: 96 + i * 66, y: BAR_Y + 8, w: 60, h: 62 }; }

  function nodeRect(i) {
    const p = NODE_POS[i] || [100 + i * 60, 300];
    return { x: p[0] - 26, y: p[1] - 34, w: 52, h: 62, cx: p[0], cy: p[1] };
  }

  // two-line word wrap for the little explanation lines under each choice
  function wrapLines(ctx, text, x, y, maxW, size) {
    ctx.font = `400 ${size}px "Trebuchet MS", system-ui, sans-serif`;
    let line = '';
    let ly = y;
    for (const word of text.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        drawText(ctx, line, x, ly, size, '#8fbdd4', 'left', 400);
        line = word;
        ly += size + 4;
      } else line = test;
    }
    if (line) drawText(ctx, line, x, ly, size, '#8fbdd4', 'left', 400);
  }

  function panelRects() {
    const px = W - 300, py = 96, pw = 286;
    return {
      px, py, pw,
      diffBtns: ['casual', 'standard', 'veteran'].map((d, i) => ({
        d, x: px + 14 + i * 88, y: py + 126, w: 84, h: 30, label: S.difficulties[d],
      })),
      chalBtns: [
        { c: null, x: px + 14, y: py + 202, w: 84, h: 30, label: 'Campaign' },
        { c: 'iron', x: px + 102, y: py + 202, w: 76, h: 30, label: 'Iron' },
        { c: 'heroic', x: px + 182, y: py + 202, w: 90, h: 30, label: 'Heroic' },
      ],
      dive: { x: px + 14, y: py + 264, w: pw - 28, h: 44, label: S.map.start },
    };
  }

  function heroUnlocked(id) {
    const need = HEROES[id].unlockLevel;
    if (need === 0) return true;
    return isUnlocked(game.save, need);
  }

  function startLevel() {
    if (selected === 'endless') {
      game.setState('battle', { level: endlessLevel(S), difficulty: 'standard' });
      return;
    }
    launchLevel(game, LEVELS[selected], difficulty, challenge);
  }

  const ICONS = {
    anvil(ctx) { // upgrades: star-on-pedestal
      starIcon(ctx, 0, -6, 10, true);
      ctx.fillStyle = '#7d95a8';
      ctx.fillRect(-9, 4, 18, 5);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(-9, 4, 18, 5);
    },
    book(ctx) {
      ctx.fillStyle = '#c9a05f';
      ctx.beginPath();
      ctx.moveTo(-11, -8); ctx.lineTo(0, -5); ctx.lineTo(11, -8);
      ctx.lineTo(11, 7); ctx.lineTo(0, 10); ctx.lineTo(-11, 7);
      ctx.closePath(); ctx.fill(); inkStroke(ctx, 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 10); ctx.stroke();
    },
    trophy(ctx) {
      ctx.fillStyle = '#ffd873';
      ctx.beginPath();
      ctx.moveTo(-8, -9); ctx.lineTo(8, -9); ctx.lineTo(6, 0);
      ctx.quadraticCurveTo(4, 5, 0, 5);
      ctx.quadraticCurveTo(-4, 5, -6, 0);
      ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.8);
      ctx.strokeStyle = '#ffd873'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-9, -5, 3.5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(9, -5, 3.5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      ctx.fillStyle = '#ffd873';
      ctx.fillRect(-4, 5, 8, 3);
      ctx.fillRect(-6, 8, 12, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      ctx.strokeRect(-6, 8, 12, 3);
    },
    gear(ctx) {
      ctx.strokeStyle = '#9fb4c0'; ctx.lineWidth = 3.6;
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5);
        ctx.stroke();
      }
      ctx.fillStyle = '#9fb4c0';
      ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0b1520';
      ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, TAU); ctx.stroke();
    },
  };

  function drawNode(ctx, i) {
    const lvl = LEVELS[i];
    const r = nodeRect(i);
    const unlocked = isUnlocked(game.save, i);
    const stars = game.save.stars[lvl.id] || 0;
    const isSel = selected === i;
    const cx = r.cx, cy = r.cy;
    if (isSel) glowCircle(ctx, cx, cy, 44, 'rgba(140,230,255,0.5)');
    // ground shadow + mound
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 20, 18, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = unlocked ? '#3a5a70' : '#26313d';
    ctx.beginPath(); ctx.ellipse(cx, cy + 17, 14, 7, 0, 0, TAU); ctx.fill();
    inkStroke(ctx, 2);
    // pole
    ctx.strokeStyle = INK; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(cx, cy + 16); ctx.lineTo(cx, cy - 22); ctx.stroke();
    ctx.strokeStyle = '#8a97a5'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy + 15); ctx.lineTo(cx, cy - 21); ctx.stroke();
    // pennant
    const wave1 = unlocked ? Math.sin(t * 4 + i) * 3 : 0;
    const wave2 = unlocked ? Math.sin(t * 4 + i + 1) * 4 : 0;
    const col = !unlocked ? '#42525f' : lvl.boss ? '#e85a6a' : stars > 0 ? '#4ac9a0' : '#ffd873';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
    ctx.quadraticCurveTo(cx + 16, cy - 22 + wave1, cx + 30, cy - 19 + wave2);
    ctx.lineTo(cx + 27, cy - 8 + wave2);
    ctx.quadraticCurveTo(cx + 14, cy - 9 + wave1, cx, cy - 4);
    ctx.closePath();
    ctx.fill();
    inkStroke(ctx, 2.4);
    // number / lock / skull on the pennant
    if (!unlocked) {
      ctx.strokeStyle = '#1d2833'; ctx.lineWidth = 2;
      ctx.strokeRect(cx + 9, cy - 16, 9, 7);
      ctx.beginPath(); ctx.arc(cx + 13.5, cy - 17, 3.4, Math.PI, 0); ctx.stroke();
    } else {
      drawText(ctx, String(i + 1), cx + 14, cy - 13 + wave1 * 0.5, 13, lvl.boss ? '#ffe2e5' : '#14303c', 'center', 800);
      if (lvl.boss) drawText(ctx, '☠', cx + 30, cy - 26, 12, '#ffb4bd', 'center');
    }
    // stars
    for (let s2 = 0; s2 < 3; s2++) {
      starIcon(ctx, cx - 13 + s2 * 13, cy + 30, 5.5, s2 < stars);
    }
  }

  return {
    update(dt) {
      t += dt;
      lockedMsg = Math.max(0, lockedMsg - dt);
      for (const m of motes) {
        m.y -= m.s * dt;
        if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; }
      }
      for (const f of fish) {
        f.x += f.spd * dt;
        if (f.x > W + 30) { f.x = -30; f.y = 70 + Math.random() * (H - 200); }
        if (f.x < -30) { f.x = W + 30; f.y = 70 + Math.random() * (H - 200); }
      }
    },
    pointerMove(x, y) {
      heroHover = null;
      for (let i = 0; i < HERO_ORDER.length; i++) {
        if (hitRect(heroRect(i), x, y)) { heroHover = HERO_ORDER[i]; return; }
      }
    },
    pointerDown(x, y) {
      for (let i = 0; i < HERO_ORDER.length; i++) {
        if (hitRect(heroRect(i), x, y)) {
          const id = HERO_ORDER[i];
          if (heroUnlocked(id)) { game.save.hero = id; game.persist(); }
          sfx.click();
          return;
        }
      }
      for (const b of bottomBtns) {
        if (hitRect(b, x, y)) {
          sfx.click();
          if (game.hasState(b.id)) game.setState(b.id);
          return;
        }
      }
      if (selected != null) {
        const pr = panelRects();
        if (selected !== 'endless') {
          for (const b of pr.diffBtns) {
            if (hitRect(b, x, y)) { difficulty = b.d; sfx.click(); return; }
          }
          const cleared = (game.save.stars[LEVELS[selected].id] || 0) > 0;
          if (cleared) {
            for (const b of pr.chalBtns) {
              if (hitRect(b, x, y)) { challenge = b.c; sfx.click(); return; }
            }
          }
        }
        if (hitRect(pr.dive, x, y)) { sfx.click(); startLevel(); return; }
      }
      if (hitRect(ENDLESS_NODE, x, y)) {
        if (endlessOpen()) { selected = 'endless'; challenge = null; }
        sfx.click();
        return;
      }
      for (let i = 0; i < LEVELS.length; i++) {
        if (hitRect(nodeRect(i), x, y)) {
          if (isUnlocked(game.save, i)) { selected = i; challenge = null; }
          else lockedMsg = 2.5;   // S.map.locked was never surfaced
          sfx.click();
          return;
        }
      }
      selected = null;
    },
    render(ctx) {
      ctx.drawImage(terrain, 0, 0);
      // ambient fish silhouettes
      for (const f of fish) {
        const dir = f.spd > 0 ? 1 : -1;
        const bob = Math.sin(t * 2 + f.p) * 3;
        ctx.save();
        ctx.translate(f.x, f.y + bob);
        ctx.scale(dir * f.s, f.s);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#0a1c28';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.quadraticCurveTo(0, -5, -7, 0);
        ctx.quadraticCurveTo(0, 5, 9, 0);
        ctx.moveTo(-6, 0);
        ctx.lineTo(-11, -4 + Math.sin(t * 6 + f.p) * 2);
        ctx.lineTo(-11, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        ctx.globalAlpha = 0.18 + 0.14 * Math.sin(t * 1.5 + m.p);
        ctx.fillStyle = '#7fdcff';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < LEVELS.length; i++) drawNode(ctx, i);

      // endless siege node (opens after the campaign)
      {
        const open = endlessOpen();
        const cx = ENDLESS_NODE.cx, cy = ENDLESS_NODE.cy;
        if (selected === 'endless') glowCircle(ctx, cx, cy, 44, 'rgba(255,140,220,0.5)');
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 20, 18, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = open ? '#4a2f5c' : '#26313d';
        ctx.beginPath(); ctx.ellipse(cx, cy + 17, 14, 7, 0, 0, TAU); ctx.fill();
        inkStroke(ctx, 2);
        ctx.strokeStyle = INK; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(cx, cy + 16); ctx.lineTo(cx, cy - 22); ctx.stroke();
        const wv = open ? Math.sin(t * 4.5) * 3 : 0;
        ctx.fillStyle = open ? '#c95fd0' : '#42525f';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22);
        ctx.quadraticCurveTo(cx + 16, cy - 22 + wv, cx + 30, cy - 19 + wv);
        ctx.lineTo(cx + 27, cy - 8 + wv);
        ctx.quadraticCurveTo(cx + 14, cy - 9 + wv, cx, cy - 4);
        ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
        drawTextO(ctx, '∞', cx + 14, cy - 13, 14, open ? '#fff' : '#5a6a78', 'center', 800, 2.4);
        if (open && game.save.endlessBest > 0) {
          drawTextO(ctx, S.endless.best + ' ' + game.save.endlessBest, cx, cy + 34, 11, '#ffd6f5', 'center', 800, 2.2);
        }
      }

      // header: satin ribbon title + bronze star plaque
      ribbonBanner(ctx, 148, 30, 236, 36, '#c0392b');
      drawTextO(ctx, S.map.title, 148, 31, 20, '#ffedd0', 'center');
      panel(ctx, W - 146, 8, 136, 42, 12);
      starIcon(ctx, W - 122, 29, 11, true);
      drawTextO(ctx, `${totalStars(game.save)} / 100`, W - 104, 30, 17, '#ffe9a8', 'left');
      // 15 stations x3 = 45, plus one star each for Iron and Heroic = 75
      drawText(ctx, '60 campaign + 20 Iron + 20 Heroic', W - 14, 60, 10.5, '#7fb6cf', 'right', 400);

      // level panel
      if (selected === 'endless') {
        const pr = panelRects();
        panel(ctx, pr.px, pr.py, pr.pw, 276);
        drawText(ctx, S.endless.name, pr.px + 14, pr.py + 28, 19, '#ffd6f5', 'left', 800);
        drawText(ctx, S.zones[2], pr.px + 14, pr.py + 50, 13, '#7fb6cf', 'left');
        drawText(ctx, S.endless.desc, pr.px + 14, pr.py + 74, 13, '#9fd4ea', 'left');
        drawText(ctx, `${S.endless.best}: ${game.save.endlessBest || 0} waves`, pr.px + 14, pr.py + 110, 14, '#ffe9a8', 'left', 700);
        drawButton(ctx, pr.dive, { accent: true, size: 18 });
      } else if (selected != null) {
        const lvl = LEVELS[selected];
        const pr = panelRects();
        panel(ctx, pr.px, pr.py, pr.pw, 322);
        drawText(ctx, lvl.name, pr.px + 14, pr.py + 28, 19, '#dff4ff', 'left', 800);
        drawText(ctx, S.zones[lvl.zone], pr.px + 14, pr.py + 50, 13, '#7fb6cf', 'left');
        drawText(ctx, `${lvl.waves.length} waves` + (lvl.boss ? '  ·  BOSS' : ''), pr.px + 14, pr.py + 70, 13, '#9fd4ea', 'left');
        const stars = game.save.stars[lvl.id] || 0;
        for (let s2 = 0; s2 < 3; s2++) starIcon(ctx, pr.px + 22 + s2 * 22, pr.py + 94, 8, s2 < stars);
        // difficulty: say what each option actually does, not just its name
        drawText(ctx, S.labels.difficulty, pr.px + 14, pr.py + 116, 11, '#5f92ad', 'left', 800);
        for (const b of pr.diffBtns) drawButton(ctx, b, { accent: difficulty === b.d, size: 13 });
        wrapLines(ctx, S.difficultyDesc[difficulty], pr.px + 14, pr.py + 172, pr.pw - 28, 12);

        drawText(ctx, S.labels.mode, pr.px + 14, pr.py + 192, 11, '#5f92ad', 'left', 800);
        const cleared = stars > 0;
        if (cleared) {
          for (const b of pr.chalBtns) {
            const done = b.c === 'iron' ? game.save.iron[lvl.id] : b.c === 'heroic' ? game.save.heroic[lvl.id] : false;
            drawButton(ctx, b, { accent: challenge === b.c, size: 12 });
            if (done) drawText(ctx, '✓', b.x + b.w - 10, b.y + 10, 11, '#7df3a8', 'center');
          }
          const cd = challenge === 'iron' ? S.challenges.ironDesc
            : challenge === 'heroic' ? S.challenges.heroicDesc : S.campaignDesc;
          wrapLines(ctx, cd, pr.px + 14, pr.py + 248, pr.pw - 28, 12);
        } else {
          drawText(ctx, 'Clear this station to unlock challenge modes', pr.px + 14, pr.py + 214, 12, '#587a8e', 'left');
        }
        drawButton(ctx, pr.dive, { accent: true, size: 18 });
      }

      // bottom bar
      ctx.fillStyle = 'rgba(3,12,20,0.92)';
      ctx.fillRect(0, BAR_Y, W, H - BAR_Y);
      ctx.strokeStyle = '#2e5a7a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, BAR_Y + 1); ctx.lineTo(W, BAR_Y + 1); ctx.stroke();
      if (lockedMsg > 0) {
        ctx.globalAlpha = Math.min(1, lockedMsg * 2);
        ctx.font = '700 14px "Trebuchet MS", system-ui, sans-serif';
        const lw = ctx.measureText(S.map.locked).width + 28;
        roundRect(ctx, W / 2 - lw / 2, BAR_Y - 52, lw, 30, 9);
        ctx.fillStyle = 'rgba(40,10,14,0.92)';
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        drawTextO(ctx, S.map.locked, W / 2, BAR_Y - 36, 14, '#ffb3a8', 'center', 700, 2.6);
        ctx.globalAlpha = 1;
      }
      drawText(ctx, S.map.heroPick.toUpperCase(), 16, BAR_Y + 39, 12, '#7fb6cf', 'left', 800);
      HERO_ORDER.forEach((id, i) => {
        const r = heroRect(i);
        const unlocked = heroUnlocked(id);
        const active = game.save.hero === id;
        roundRect(ctx, r.x, r.y, r.w, r.h, 9);
        ctx.fillStyle = active ? '#0e3a52' : '#0b2536';
        ctx.fill();
        ctx.strokeStyle = active ? '#8df0c0' : INK;
        ctx.lineWidth = active ? 3 : 2.5;
        ctx.stroke();
        if (unlocked) {
          ctx.save();
          ctx.translate(r.x + r.w / 2, r.y + 36);
          drawHero(ctx, { def: HEROES[id], x: 0, y: 0, selected: false, hp: 1, maxHp: 1, hurtT: 0 }, t);
          ctx.restore();
          drawText(ctx, S.heroes[id].name.split(' ')[0], r.x + r.w / 2, r.y + 11, 10, '#bfe8f7', 'center', 700);
        } else {
          drawText(ctx, '?', r.x + r.w / 2, r.y + r.h / 2, 22, '#31465a', 'center', 800);
        }
      });

      // who is this and what do they do — hover a portrait to find out
      if (heroHover) {
        const hs = S.heroes[heroHover];
        const open = heroUnlocked(heroHover);
        const cw = 340, chh = 104, cx = 16, cy = BAR_Y - chh - 10;
        panel(ctx, cx, cy, cw, chh, 12);
        if (open) {
          drawTextO(ctx, hs.name, cx + 14, cy + 22, 15, '#ffe9a8', 'left', 800, 2.6);
          drawText(ctx, hs.role, cx + 14, cy + 40, 11.5, '#7fb6cf', 'left', 700);
          drawText(ctx, hs.desc, cx + 14, cy + 60, 11.5, '#c9e8f7', 'left', 400);
          drawText(ctx, `${hs.ability} — ${hs.abilityDesc}`, cx + 14, cy + 84, 11, '#8df0c0', 'left', 400);
        } else {
          const need = HEROES[heroHover].unlockLevel;
          drawTextO(ctx, 'Not yet recruited', cx + 14, cy + 30, 14, '#8fa6b5', 'left', 800, 2.4);
          drawText(ctx, `Clear station ${need} to bring them aboard.`, cx + 14, cy + 56, 12, '#7fb6cf', 'left');
        }
      }
      for (const b of bottomBtns) {
        drawButton(ctx, { ...b, label: '' }, {});
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y + 21);
        ICONS[b.icon](ctx);
        ctx.restore();
        drawTextO(ctx, b.label, b.x + b.w / 2, b.y + b.h - 12, 12, '#e8f6ff', 'center', 800, 2.6);
      }
      if (selected == null) {
        drawText(ctx, 'Select a station on the chart', W / 2, 70, 14, 'rgba(180,225,250,0.75)', 'center');
      }
    },
  };
}
