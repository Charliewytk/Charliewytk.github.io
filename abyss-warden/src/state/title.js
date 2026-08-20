import { INK, inkStroke, drawText, drawTextO, glowCircle, drawButton, ribbonBanner, hitRect } from '../render/draw.js';
import { paintRelief } from '../render/noise.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { defaultSave } from '../game/save.js';
import { LEVELS } from '../game/levels/index.js';
import { launchLevel, nextStationIndex } from '../game/launch.js';

const TAU = Math.PI * 2;

// The title backdrop is painted once: relief-textured seabed, light shafts,
// a glowing station dome and kelp silhouettes.
function buildBackdrop(W, H) {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a6a8a');
  g.addColorStop(0.55, '#0d4661');
  g.addColorStop(1, '#052436');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  paintRelief(ctx, W, H, 0x711e, [
    { scale: 0.05, amp: 3, alpha: 0.18, oct: 3 },
    { scale: 0.15, amp: 2, alpha: 0.12, oct: 2, seedOffset: 3 },
  ]);
  // light shafts
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = 90 + i * 190;
    ctx.fillStyle = 'rgba(200,240,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(x - 14, 0);
    ctx.lineTo(x + 44, 0);
    ctx.lineTo(x + 180, H);
    ctx.lineTo(x + 60, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // seabed rise
  ctx.fillStyle = 'rgba(6,24,36,0.7)';
  ctx.beginPath();
  ctx.moveTo(0, H - 90);
  for (let x = 0; x <= W; x += 60) {
    ctx.quadraticCurveTo(x + 30, H - 100 - (x * 7919 % 26), x + 60, H - 84 - (x * 104729 % 18));
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // glowing station dome on the rise
  glowCircle(ctx, W / 2, H - 108, 90, 'rgba(140,240,255,0.4)');
  ctx.fillStyle = '#14425f';
  ctx.beginPath();
  ctx.arc(W / 2, H - 96, 42, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  inkStroke(ctx, 3);
  ctx.fillStyle = '#1b5a7d';
  ctx.fillRect(W / 2 - 50, H - 98, 100, 10);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(W / 2 - 50, H - 98, 100, 10);
  ctx.fillStyle = '#9fe8ff';
  for (const px of [-24, 0, 24]) {
    ctx.beginPath();
    ctx.arc(W / 2 + px, H - 112, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // kelp silhouettes at the edges
  ctx.strokeStyle = 'rgba(10,40,40,0.8)';
  for (const [kx, s] of [[60, 1.6], [130, 1.1], [W - 70, 1.8], [W - 150, 1.2]]) {
    for (let i = -1; i <= 1; i++) {
      ctx.lineWidth = 7 * s;
      ctx.beginPath();
      ctx.moveTo(kx + i * 12 * s, H);
      ctx.quadraticCurveTo(kx + i * 12 * s + 20, H - 80 * s, kx + i * 8 * s - 10, H - 150 * s);
      ctx.stroke();
    }
  }
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,10,18,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  return cv;
}

export function createTitle(game) {
  let t = 0;
  const { W, H } = game;
  const backdrop = buildBackdrop(W, H);
  const motes = [];
  for (let i = 0; i < 70; i++) {
    motes.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 2 + 0.5, s: Math.random() * 8 + 3, p: Math.random() * TAU,
    });
  }
  const fish = [];
  for (let i = 0; i < 6; i++) {
    fish.push({
      x: Math.random() * W, y: 80 + Math.random() * (H - 300),
      s: 0.6 + Math.random() * 0.9, spd: (14 + Math.random() * 24) * (Math.random() > 0.5 ? 1 : -1),
      p: Math.random() * TAU,
    });
  }
  // One tap from the title into play. Returning players resume at the station
  // they left off on; new players drop straight into the first dive.
  const hasProgress = Object.keys(game.save.stars).length > 0;
  const resumeIdx = nextStationIndex(game.save);
  const resumeLevel = LEVELS[resumeIdx];
  const resumeLabel = `Station ${resumeIdx + 1} · ${resumeLevel.name}`;
  const buttons = [];
  if (hasProgress) {
    buttons.push({ x: W / 2 - 120, y: 352, w: 240, h: 50, label: S.ui.continueGame, accent: true,
      act: () => launchLevel(game, resumeLevel) });
    buttons.push({ x: W / 2 - 100, y: 436, w: 200, h: 40, label: S.ui.toMap,
      act: () => game.setState('map') });
    buttons.push({ x: W / 2 - 85, y: 486, w: 170, h: 34, label: S.ui.newGame, act: newGame, confirm: true, small: true });
  } else {
    buttons.push({ x: W / 2 - 120, y: 378, w: 240, h: 56, label: S.ui.newGame, accent: true,
      act: () => launchLevel(game, LEVELS[0]) });
  }
  let confirmArm = 0;

  function newGame() {
    if (confirmArm > 0) {
      game.save = defaultSave();
      game.persist();
      launchLevel(game, LEVELS[0]);
    } else {
      confirmArm = 3;
    }
  }

  return {
    update(dt) {
      t += dt;
      confirmArm = Math.max(0, confirmArm - dt);
      for (const m of motes) {
        m.y -= m.s * dt;
        if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; }
      }
      for (const f of fish) {
        f.x += f.spd * dt;
        if (f.x > W + 30) { f.x = -30; f.y = 80 + Math.random() * (H - 300); }
        if (f.x < -30) { f.x = W + 30; f.y = 80 + Math.random() * (H - 300); }
      }
    },
    pointerDown(x, y) {
      for (const b of buttons) {
        if (hitRect(b, x, y)) { sfx.click(); b.act(); return; }
      }
    },
    render(ctx) {
      ctx.drawImage(backdrop, 0, 0);
      // ambient fish
      for (const f of fish) {
        const dir = f.spd > 0 ? 1 : -1;
        ctx.save();
        ctx.translate(f.x, f.y + Math.sin(t * 2 + f.p) * 3);
        ctx.scale(dir * f.s, f.s);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#0a2836';
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
      // motes
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + m.p);
        ctx.fillStyle = '#7fdcff';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // logo: big outlined title on a gently bobbing ribbon
      const bob = Math.sin(t * 1.2) * 4;
      glowCircle(ctx, W / 2, 200 + bob, 250, 'rgba(30,140,180,0.3)');
      drawTextO(ctx, S.ui.title, W / 2, 185 + bob, 66, '#dff4ff', 'center', 800, 7);
      ribbonBanner(ctx, W / 2, 252 + bob, 330, 34, '#c0392b');
      drawTextO(ctx, S.ui.tagline, W / 2, 253 + bob, 16, '#ffedd0', 'center', 700, 2.6);

      for (const b of buttons) {
        const label = b.confirm && confirmArm > 0 ? 'Erase progress?' : b.label;
        drawButton(ctx, { ...b, label }, { accent: b.accent, size: b.small ? 14 : 17 });
      }
      // tell the player exactly where Continue is taking them
      if (hasProgress) {
        drawTextO(ctx, resumeLabel, W / 2, 420, 13.5, '#ffd873', 'center', 700, 2.8);
      }

    },
  };
}
