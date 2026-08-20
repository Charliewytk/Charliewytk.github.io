// Comic-book story interludes: code-drawn panels with ink frames, captions
// and speech bubbles. Panels reveal one tap at a time.
import { INK, inkStroke, roundRect, drawText, glowCircle, drawButton, hitRect } from '../render/draw.js';
import { drawHero } from '../game/heroes.js';
import { HEROES } from '../game/heroes.js';
import { drawEnemyBody } from '../game/enemies.js';
import { ENEMIES } from '../game/enemies.js';
import { sfx } from '../audio/synth.js';

const TAU = Math.PI * 2;

// ---------- tiny scene-drawing vocabulary ----------

function sea(ctx, w, h, top, bot) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function motes(ctx, w, h, n, t, color = '#7fdcff') {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = ((i * 137) % w + t * 6) % w;
    const y = (i * 89) % h;
    ctx.globalAlpha = 0.2 + 0.15 * Math.sin(t * 2 + i);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function ship(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#3e4c5c';
  ctx.beginPath();
  ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.lineTo(42, 18); ctx.lineTo(-46, 18);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 3);
  ctx.fillStyle = '#5c6c7c';
  ctx.fillRect(-20, -18, 34, 18);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-20, -18, 34, 18);
  ctx.fillStyle = '#ffd873';
  ctx.beginPath(); ctx.arc(4, -9, 3.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function dome(ctx, x, y, s = 1, lit = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (lit) glowCircle(ctx, 0, -10, 55, 'rgba(140,240,255,0.5)');
  ctx.fillStyle = '#14425f';
  ctx.beginPath(); ctx.arc(0, 0, 34, Math.PI, 0); ctx.closePath(); ctx.fill(); inkStroke(ctx, 3);
  ctx.fillStyle = '#1b5a7d';
  ctx.fillRect(-40, 0, 80, 9);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-40, 0, 80, 9);
  ctx.fillStyle = lit ? '#d8f8ff' : '#28455c';
  ctx.beginPath(); ctx.arc(0, -14, 5, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
  // portholes
  ctx.fillStyle = lit ? '#9fe8ff' : '#22384a';
  for (const px of [-18, 0, 18]) {
    ctx.beginPath(); ctx.arc(px, -2, 3.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

function eyes(ctx, x, y, s = 1, color = '#ffd873') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  glowCircle(ctx, 0, 0, 16, 'rgba(255,216,115,0.35)');
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(-8, 0, 4, 6, -0.15, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 0, 4, 6, 0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-8, 1, 1.6, 3, -0.15, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 1, 1.6, 3, 0.15, 0, TAU); ctx.fill();
  ctx.restore();
}

function creature(ctx, id, x, y, s, wob = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  drawEnemyBody(ctx, { def: ENEMIES[id], baseType: id, type: id, wob, hidden: false, elite: false, shieldHp: 1 });
  ctx.restore();
}

function hero(ctx, id, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  drawHero(ctx, { def: HEROES[id], x: 0, y: 0, selected: false, hp: 1, maxHp: 1, hurtT: 0 }, t);
  ctx.restore();
}

function bubble(ctx, x, y, w, txt, tailX = 0) {
  const lines = txt.split('\n');
  const h = 16 + lines.length * 17;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 12);
  ctx.fillStyle = '#f4f8fb';
  ctx.fill();
  inkStroke(ctx, 2.5);
  if (tailX) {
    ctx.fillStyle = '#f4f8fb';
    ctx.beginPath();
    ctx.moveTo(x + tailX - 8, y + h / 2 - 2);
    ctx.lineTo(x + tailX, y + h / 2 + 14);
    ctx.lineTo(x + tailX + 8, y + h / 2 - 2);
    ctx.closePath();
    ctx.fill();
    inkStroke(ctx, 2.5);
    ctx.fillStyle = '#f4f8fb';
    ctx.fillRect(x + tailX - 7, y + h / 2 - 4, 14, 5);
  }
  lines.forEach((ln, i) => {
    drawText(ctx, ln, x, y - h / 2 + 17 + i * 17, 13.5, INK, 'center', 700);
  });
}

function caption(ctx, x, y, w, txt) {
  const lines = txt.split('\n');
  const h = 12 + lines.length * 16;
  ctx.fillStyle = '#ffe9b8';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);
  lines.forEach((ln, i) => {
    drawText(ctx, ln, x + 8, y + 14 + i * 16, 12.5, '#2b2313', 'left', 700);
  });
}


function kelpStrand(ctx, x, y, hgt, s = 1, col = 'rgba(46,122,86,0.92)') {
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  for (const off of [-6, 0, 6]) {
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(x + off * s, y);
    ctx.quadraticCurveTo(x + off * s - 14 * s, y - hgt * 0.55, x + off * s + 9 * s, y - hgt);
    ctx.stroke();
  }
}

function helmet(ctx, x, y, s = 1, lit = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 15, 21, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a6a3c';
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); inkStroke(ctx, 3);
  ctx.fillStyle = lit ? '#9fe8ff' : '#16303f';
  ctx.beginPath(); ctx.arc(3, -2, 8, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
  ctx.fillStyle = '#6b4526';
  ctx.fillRect(-18, 8, 36, 7);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-18, 8, 36, 7);
  ctx.restore();
}

function smoker(ctx, x, y, s = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#2a1714';
  ctx.beginPath();
  ctx.moveTo(-16, 0); ctx.lineTo(-8, -46); ctx.lineTo(8, -46); ctx.lineTo(16, 0);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.6);
  glowCircle(ctx, 0, -48, 24, 'rgba(255,130,70,0.55)');
  ctx.fillStyle = 'rgba(26,20,18,0.7)';
  for (let i = 0; i < 4; i++) {
    const pr = ((t * 0.45) + i * 0.25) % 1;
    ctx.globalAlpha = 0.55 * (1 - pr);
    ctx.beginPath();
    ctx.arc(Math.sin(pr * 6 + i) * 11, -50 - pr * 66, 8 + pr * 17, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function dunes(ctx, w, h, yBase, col = '#6d5a45') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, yBase);
  for (let x = 0; x <= w; x += 24) {
    ctx.quadraticCurveTo(x + 12, yBase - 10 - (x * 7919 % 13), x + 24, yBase - (x * 104729 % 9));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  inkStroke(ctx, 2.4);
}

function eggCluster(ctx, x, y, s = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const spots = [[-22, 4, 11], [-4, -6, 13], [16, 2, 10], [2, 14, 9], [28, 12, 8]];
  spots.forEach(([ex, ey, er], i) => {
    const pulse = 0.55 + 0.45 * Math.sin(t * 2 + i);
    glowCircle(ctx, ex, ey, er * 1.9, `rgba(190,255,170,${(0.18 + pulse * 0.2).toFixed(2)})`);
    ctx.fillStyle = '#cdeaa8';
    ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.15, 0, 0, TAU); ctx.fill();
    inkStroke(ctx, 2.2);
    ctx.fillStyle = `rgba(90,160,70,${(0.5 + pulse * 0.4).toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(ex, ey + 1, er * 0.5, er * 0.6, 0, 0, TAU); ctx.fill();
  });
  ctx.restore();
}

function throne(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  glowCircle(ctx, 0, -20, 90, 'rgba(255,80,60,0.28)');
  ctx.fillStyle = '#160709';
  ctx.beginPath();
  ctx.moveTo(-54, 40); ctx.lineTo(-46, -70); ctx.lineTo(-22, -34); ctx.lineTo(-8, -96);
  ctx.lineTo(10, -34); ctx.lineTo(34, -78); ctx.lineTo(44, -30); ctx.lineTo(58, 40);
  ctx.closePath(); ctx.fill(); inkStroke(ctx, 3);
  ctx.fillStyle = '#3a1014';
  ctx.beginPath(); ctx.ellipse(0, 34, 52, 13, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2.4);
  ctx.restore();
}

// ---------- the scenes ----------
// Each panel: { draw(ctx, w, h, t), cap, bub: {x,y,w,txt,tail} }

export const SCENES = {
  intro: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#7ec8e8', '#0f5e86');
          // waves
          ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 2.5;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
              const y = 40 + i * 10 + Math.sin(x * 0.05 + t * 2 + i) * 3;
              x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ship(ctx, w * 0.55, 44 + Math.sin(t * 1.5) * 2, 1);
        },
        cap: 'The Meridian Trench survey found\nsomething better than oil: light.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#02131f');
          motes(ctx, w, h, 24, t);
          dome(ctx, w * 0.5, h * 0.62, 1.3, true);
          creature(ctx, 'fry', w * 0.2, h * 0.3, 1.4, t * 3);
          creature(ctx, 'fry', w * 0.8, h * 0.25, 1.1, t * 3 + 2);
        },
        cap: 'Research stations, run on the vents’\nown living glow.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#04121c', '#010508');
          eyes(ctx, w * 0.25, h * 0.4, 1.2);
          eyes(ctx, w * 0.6, h * 0.65, 1.8);
          eyes(ctx, w * 0.8, h * 0.3, 0.9);
          eyes(ctx, w * 0.45, h * 0.2, 0.7);
        },
        cap: 'But the light belongs to the deep.\nAnd the deep wants it back.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#031a2b');
          motes(ctx, w, h, 18, t);
          hero(ctx, 'karrick', w * 0.5, h * 0.6, 2.2, t);
        },
        cap: 'You are the Warden.',
        bub: { x: 0.5, y: 0.22, w: 170, txt: 'Keep the lights on.', tail: -20 },
      },
    ],
  },
  zone2: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#031a2b');
          dome(ctx, w * 0.35, h * 0.6, 1, true);
          dome(ctx, w * 0.7, h * 0.72, 0.7, true);
          motes(ctx, w, h, 16, t);
        },
        cap: 'The Shelf holds. Barely.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#241a4a', '#0a0620');
          motes(ctx, w, h, 14, t, '#b08fff');
          // sunken wrecks
          ctx.save();
          ctx.translate(w * 0.3, h * 0.75);
          ctx.rotate(-0.3);
          ship(ctx, 0, 0, 0.8);
          ctx.restore();
          ctx.save();
          ctx.translate(w * 0.72, h * 0.85);
          ctx.rotate(0.5);
          ship(ctx, 0, 0, 0.6);
          ctx.restore();
        },
        cap: 'The distress calls drop into the\nTrench — past the wreckfields.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#160f38', '#060312');
          creature(ctx, 'isopod', w * 0.5, h * 0.5, 3.4, t * 2);
          // crown
          ctx.fillStyle = '#ffd873';
          const cx = w * 0.5 + 26, cy = h * 0.5 - 42;
          ctx.beginPath();
          ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 12, cy - 14); ctx.lineTo(cx - 5, cy);
          ctx.lineTo(cx, cy - 16); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx + 12, cy - 14);
          ctx.lineTo(cx + 18, cy); ctx.closePath();
          ctx.fill(); inkStroke(ctx, 2);
        },
        cap: 'Something down there wears\nthe wrecks like a crown.',
        bub: { x: 0.5, y: 0.15, w: 110, txt: 'MINE.', tail: 10 },
      },
    ],
  },
  zone3: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#26060e', '#070102');
          motes(ctx, w, h, 12, t, '#ff8f6f');
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(w * 0.35, h * 0.5);
          ctx.lineTo(w * 0.5, h * 0.75);
          ctx.lineTo(w * 0.68, h * 0.4);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
        },
        cap: 'Below the Trench: the Hadal Rift.\nThe charts end here.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0d0205', '#010101');
          // one vast eye
          glowCircle(ctx, w * 0.5, h * 0.5, 90, 'rgba(255,140,110,0.35)');
          ctx.fillStyle = '#ffb84d';
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.5, 58, 40, 0, 0, TAU);
          ctx.fill(); inkStroke(ctx, 4);
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.5, 14, 34, 0, 0, TAU);
          ctx.fill();
        },
        cap: 'The vents’ light was never free.\nIt was borrowed.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#26060e', '#070102');
          motes(ctx, w, h, 10, t, '#ff8f6f');
          hero(ctx, 'karrick', w * 0.3, h * 0.62, 1.7, t);
          hero(ctx, 'nerissa', w * 0.55, h * 0.5, 1.7, t + 1);
          hero(ctx, 'bastion', w * 0.78, h * 0.66, 1.7, t + 2);
        },
        cap: 'Time to give it back.\nWith interest.',
        bub: { x: 0.3, y: 0.2, w: 150, txt: 'Last dive, crew.', tail: 0 },
      },
    ],
  },
  boss1: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#02131f');
          motes(ctx, w, h, 18, t);
          // the sinkhole eye opening
          const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 4, w * 0.5, h * 0.55, 70);
          g.addColorStop(0, 'rgba(174,244,255,0.8)');
          g.addColorStop(0.4, 'rgba(20,60,90,0.9)');
          g.addColorStop(1, 'rgba(0,0,0,0.9)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.55, 75, 45, 0, 0, TAU); ctx.fill();
          inkStroke(ctx, 3);
        },
        cap: 'The divers called it a sinkhole.\nSinkholes don’t blink.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#04121c', '#010508');
          creature(ctx, 'angler', w * 0.5, h * 0.5, 2.6, t * 1.5);
        },
        cap: 'Wardens don’t get paid enough\nfor this.',
        bub: { x: 0.5, y: 0.16, w: 160, txt: 'Light it up, crew!', tail: 0 },
      },
    ],
  },
  survival: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#26060e', '#070102');
          motes(ctx, w, h, 12, t, '#ff8f6f');
          dome(ctx, w * 0.5, h * 0.6, 1.3, true);
        },
        cap: 'Last Light Station.\nThe name is not decorative.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0d0205', '#010101');
          eyes(ctx, w * 0.2, h * 0.35, 1.1);
          eyes(ctx, w * 0.5, h * 0.6, 1.6);
          eyes(ctx, w * 0.75, h * 0.3, 0.9);
          eyes(ctx, w * 0.35, h * 0.75, 1.2);
          eyes(ctx, w * 0.65, h * 0.8, 0.8);
        },
        cap: 'Everything you have fought.\nAll of it. At once.',
        bub: { x: 0.5, y: 0.14, w: 130, txt: 'Bring it.', tail: 0 },
      },
    ],
  },
  finale: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0d0205', '#010101');
          ctx.save();
          ctx.translate(w * 0.5, h * 0.45 + t * 6);
          ctx.scale(2.6, 2.6);
          ctx.globalAlpha = Math.max(0.25, 1 - t * 0.1);
          drawEnemyBody(ctx, { def: ENEMIES.behemoth, baseType: 'behemoth', type: 'behemoth', wob: t, hidden: false, elite: false, shieldHp: 1 });
          ctx.globalAlpha = 1;
          ctx.restore();
        },
        cap: 'The old one sinks back\ninto its long sleep.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#02131f');
          motes(ctx, w, h, 26, t);
          dome(ctx, w * 0.25, h * 0.7, 0.8, true);
          dome(ctx, w * 0.55, h * 0.55, 1.1, true);
          dome(ctx, w * 0.85, h * 0.75, 0.6, true);
        },
        cap: 'Every light in the trench\nburns steady tonight.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#031a2b');
          dome(ctx, w * 0.62, h * 0.72, 1.4, true);
          hero(ctx, 'karrick', w * 0.3, h * 0.6, 2, t);
        },
        cap: 'The abyss remembers.\nSo will we.        — THE END —',
        bub: { x: 0.3, y: 0.2, w: 120, txt: 'Lights on.', tail: 0 },
      },
    ],
  },

  // ---- station interludes: one per level that had none ----
  kelpwash: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#12667f', '#062a3c');
          motes(ctx, w, h, 14, t);
          for (const [kx, kh, ks] of [[40, 90, 1], [92, 120, 1.2], [w - 60, 104, 1.1], [w - 118, 78, 0.9]]) {
            kelpStrand(ctx, kx, h * 0.96, kh, ks);
          }
          helmet(ctx, w * 0.52, h * 0.82, 1.1, false);
        },
        cap: 'The harvest rigs are still anchored\nout on the flats. The crews are not.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3546', '#020e16');
          for (const [kx, kh] of [[26, 130], [w - 34, 118], [w * 0.5, 96]]) kelpStrand(ctx, kx, h, kh, 1.3);
          eyes(ctx, w * 0.3, h * 0.42, 1, '#9ff5c0');
          eyes(ctx, w * 0.66, h * 0.32, 0.8, '#9ff5c0');
          eyes(ctx, w * 0.52, h * 0.62, 1.2, '#9ff5c0');
        },
        cap: 'Nothing fed here. Nothing scattered.\nThey were moved off. Deliberately.',
      },
    ],
  },
  splitcurrent: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0e5c78', '#04202e');
          ctx.fillStyle = '#123243';
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.1); ctx.lineTo(w * 0.72, h); ctx.lineTo(w * 0.28, h);
          ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.6);
          for (let i = 0; i < 4; i++) {
            creature(ctx, 'fry', w * 0.16 + i * 12, h * 0.42 + i * 16, 1.1, t * 3 + i);
            creature(ctx, 'fry', w * 0.84 - i * 12, h * 0.38 + i * 16, 1.1, t * 3 - i);
          }
        },
        cap: 'The ridge cuts the current in two,\nand the swarm came down both sides.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#072536', '#010a12');
          motes(ctx, w, h, 10, t);
          eyes(ctx, w * 0.5, h * 0.3, 2.1, '#ffd873');
        },
        cap: 'Both sides. At the same moment.\nThat is not instinct. That is an order.',
      },
    ],
  },
  twinvents: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#3a1e1c', '#0a0405');
          smoker(ctx, w * 0.3, h * 0.95, 1, t);
          smoker(ctx, w * 0.72, h * 0.95, 0.85, t + 1.4);
          motes(ctx, w, h, 12, t, '#ffab7f');
        },
        cap: 'Two vents breathing hot water,\nand a steady supply of teeth.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#2a1518', '#050203');
          smoker(ctx, w * 0.2, h * 1.02, 0.8, t);
          creature(ctx, 'mite', w * 0.42, h * 0.62, 1.3, t * 4);
          creature(ctx, 'mite', w * 0.56, h * 0.5, 1.1, t * 4 + 2);
          creature(ctx, 'mite', w * 0.66, h * 0.68, 1.2, t * 4 + 4);
          eyes(ctx, w * 0.5, h * 0.2, 1.5, '#ff9a6f');
        },
        cap: 'They are not crawling out of the vents.\nThey are being sent up them.',
      },
    ],
  },
  smokers: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#40201a', '#0b0405');
          smoker(ctx, w * 0.22, h, 1.1, t);
          smoker(ctx, w * 0.5, h, 0.75, t + 0.8);
          smoker(ctx, w * 0.8, h, 0.95, t + 1.9);
        },
        cap: 'The black smokers cook the water.\nWhatever swims out is already angry.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#2c1a2e', '#070310');
          motes(ctx, w, h, 12, t, '#ffd27a');
          creature(ctx, 'glider', w * 0.28, h * 0.3, 1.7, t * 4);
          creature(ctx, 'glider', w * 0.6, h * 0.2, 1.3, t * 4 + 2);
          creature(ctx, 'glider', w * 0.78, h * 0.42, 1.5, t * 4 + 4);
          dome(ctx, w * 0.5, h * 0.95, 0.7, true);
        },
        cap: 'And some of them have stopped\ntouching the ground entirely.',
        bub: { x: 0.5, y: 0.68, w: 150, txt: 'Eyes UP.', tail: -18 },
      },
    ],
  },
  shiftingsands: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#5a6b6a', '#16232a');
          dunes(ctx, w, h, h * 0.6, '#7d6a52');
          ctx.strokeStyle = 'rgba(30,24,18,0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let x = 10; x < w - 10; x += 10) {
            const y = h * 0.78 + Math.sin(x * 0.06) * 7;
            x === 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        },
        cap: 'The seabed here refuses to hold still.\nYesterday this was a ridge.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#3d4a52', '#0a1218');
          const bulge = Math.sin(t * 1.3) * 8;
          ctx.fillStyle = '#6d5a45';
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, h * 0.72);
          ctx.quadraticCurveTo(w * 0.5, h * 0.34 - bulge, w, h * 0.7);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
          inkStroke(ctx, 2.6);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.52 - bulge, 70, 15, 0, 0, TAU);
          ctx.fill();
        },
        cap: 'Sonar keeps pinging something\nbeneath the sand. Something long.',
      },
    ],
  },
  nursery: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#123a2a', '#03130e');
          motes(ctx, w, h, 16, t, '#b6ff9f');
          eggCluster(ctx, w * 0.3, h * 0.62, 1.15, t);
          eggCluster(ctx, w * 0.72, h * 0.5, 0.9, t + 1.2);
        },
        cap: 'So this is where they come from.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0d2c22', '#020a07');
          eggCluster(ctx, w * 0.2, h * 0.82, 0.7, t);
          creature(ctx, 'polyp', w * 0.56, h * 0.5, 3.2, t * 2);
          eyes(ctx, w * 0.56, h * 0.3, 1.1, '#ff9df0');
        },
        cap: 'And this is what has been\ntucking them in.',
        bub: { x: 0.5, y: 0.14, w: 190, txt: 'THEY COME BACK.', tail: 14 },
      },
    ],
  },
  twinthroats: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a3d52', '#031a2b');
          motes(ctx, w, h, 18, t);
          dome(ctx, w * 0.5, h * 0.8, 1.25, true);
          ship(ctx, w * 0.68, h * 0.24 + Math.sin(t * 1.4) * 3, 0.7);
        },
        cap: 'Last supply run before the Rift.\nAfter this, nothing comes down.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0c4459', '#04202e');
          dome(ctx, w * 0.3, h * 0.78, 1.5, true);
          hero(ctx, 'karrick', w * 0.74, h * 0.66, 2, t);
        },
        cap: 'Forty-one people keep breathing\nbecause the lights keep burning.',
        bub: { x: 0.72, y: 0.24, w: 176, txt: 'Don\u2019t be long down there.', tail: -16 },
      },
    ],
  },
  movingfloor: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#4a3a30', '#0d0906');
          const rise = Math.min(1, t * 0.5);
          dunes(ctx, w, h, h * 0.62 + 30 - rise * 30, '#7d6a52');
          for (let i = 0; i < 14; i++) {
            ctx.fillStyle = 'rgba(190,170,140,0.75)';
            ctx.beginPath();
            ctx.arc(w * 0.5 + Math.sin(i * 2.3) * 90, h * 0.5 - (i % 5) * 12 - rise * 20, 3 + (i % 3), 0, TAU);
            ctx.fill();
          }
        },
        cap: 'The floor was never a floor.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#2d2118', '#060402');
          creature(ctx, 'worm', w * 0.5, h * 0.55, 4.2, t * 1.5);
          eyes(ctx, w * 0.5, h * 0.3, 1.6, '#ffb35f');
        },
        cap: 'It has been down there since\nthe Shifting Sands. Under our boots.',
      },
    ],
  },
  crossing: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#2a0d16', '#070103');
          motes(ctx, w, h, 14, t, '#ff8f6f');
          for (let i = 0; i < 7; i++) {
            creature(ctx, 'barracuda', 20 + i * 26, h * 0.34 + Math.sin(i) * 10, 0.95, t * 3 + i);
            creature(ctx, 'lancer', 34 + i * 26, h * 0.68 + Math.cos(i) * 10, 0.9, t * 3 - i);
          }
        },
        cap: 'Two rivers of teeth, braided together,\nand every trench feeding them.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#1a0710', '#040103');
          dome(ctx, w * 0.16, h * 0.86, 0.7, true);
          for (let i = 0; i < 9; i++) {
            creature(ctx, 'fry', w * 0.3 + i * 22, h * 0.3 + (i % 3) * 26, 1, t * 3 + i);
          }
          glowCircle(ctx, w * 0.95, h * 0.5, 70, 'rgba(255,70,60,0.4)');
        },
        cap: 'They swim straight past the station.\nThey are not here for us any more.',
      },
    ],
  },
  riftthrone: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#280810', '#050102');
          motes(ctx, w, h, 10, t, '#ff7a6a');
          throne(ctx, w * 0.5, h * 0.68, 1.15);
        },
        cap: 'At the bottom of the last trench:\na seat, cut from the rift itself.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#1c0509', '#030001');
          throne(ctx, w * 0.56, h * 0.66, 1.35);
          eyes(ctx, w * 0.56, h * 0.42, 2.4, '#ff5f4f');
          hero(ctx, 'karrick', w * 0.16, h * 0.84, 1.5, t);
        },
        cap: 'It was old when the ocean was young.\nAnd it has been waiting for the light.',
        bub: { x: 0.28, y: 0.2, w: 200, txt: 'Last light in the trench.\nMake it count.', tail: -30 },
      },
    ],
  },
  // ---- Zone 4: the Cold Seep ----
  zone4: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#1a0508', '#030001');
          throne(ctx, w * 0.5, h * 0.72, 1.05);
          motes(ctx, w, h, 8, t, '#ff7a6a');
        },
        cap: 'The Sovereign\u2019s throne stood empty\nlong before the Leviathan died.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#123244', '#5f8fa8');
          motes(ctx, w, h, 20, t, '#e6faff');
          ctx.fillStyle = 'rgba(226,244,252,0.35)';
          ctx.beginPath();
          ctx.moveTo(0, h * 0.22);
          for (let x = 0; x <= w; x += 20) ctx.lineTo(x + 10, h * 0.22 + Math.sin(x * 0.12) * 6);
          ctx.lineTo(w, 0); ctx.lineTo(0, 0);
          ctx.closePath(); ctx.fill();
          for (let i = 0; i < 7; i++) {
            const x = 14 + i * (w / 7);
            ctx.fillStyle = 'rgba(232,248,255,0.6)';
            ctx.beginPath();
            ctx.moveTo(x - 5, h * 0.24); ctx.lineTo(x, h * 0.24 + 26); ctx.lineTo(x + 5, h * 0.24);
            ctx.closePath(); ctx.fill();
          }
        },
        cap: 'Below the rift the water stops moving.\nThere is a ceiling down here. Of ice.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0d2536', '#020a10');
          creature(ctx, 'rime', w * 0.3, h * 0.62, 2.4, t * 2);
          creature(ctx, 'wisp', w * 0.68, h * 0.36, 2.2, t * 3);
          eyes(ctx, w * 0.5, h * 0.18, 1.4, '#bfe6ff');
        },
        cap: 'Whatever the Leviathan was guarding,\nit was guarding it from us.',
        bub: { x: 0.5, y: 0.85, w: 190, txt: 'It knows we\u2019re here.', tail: -18 },
      },
    ],
  },
  frostgarden: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#16394a', '#04121b');
          motes(ctx, w, h, 14, t, '#cfefff');
          for (let i = 0; i < 5; i++) eggCluster(ctx, 24 + i * (w / 5), h * 0.55 + (i % 2) * 26, 0.7, t + i);
        },
        cap: 'The rows are too neat.\nSomething planted this.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0f2c3c', '#020a11');
          creature(ctx, 'shaman', w * 0.5, h * 0.5, 2.8, t * 2);
          eggCluster(ctx, w * 0.18, h * 0.8, 0.6, t);
          eggCluster(ctx, w * 0.82, h * 0.78, 0.6, t + 1);
        },
        cap: 'And something has been\ntending it in the dark.',
      },
    ],
  },
  methanefalls: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#1a4459', '#061826');
          ctx.strokeStyle = 'rgba(220,246,255,0.5)';
          ctx.lineCap = 'round';
          for (const cx of [w * 0.32, w * 0.68]) {
            for (let i = 0; i < 9; i++) {
              ctx.lineWidth = 2 + (i % 3);
              ctx.beginPath();
              ctx.moveTo(cx + (i - 4) * 5, h * 0.1);
              ctx.lineTo(cx + (i - 4) * 7 + Math.sin(t * 2 + i) * 4, h * 0.95);
              ctx.stroke();
            }
          }
        },
        cap: 'Two columns of gas, pouring\noff the ledge without a sound.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#123444', '#03101a');
          creature(ctx, 'wisp', w * 0.24, h * 0.3, 1.8, t * 3);
          creature(ctx, 'wisp', w * 0.5, h * 0.52, 1.5, t * 3 + 2);
          creature(ctx, 'wisp', w * 0.76, h * 0.34, 1.7, t * 3 + 4);
          dome(ctx, w * 0.5, h * 0.95, 0.75, true);
        },
        cap: 'They ride the falls down.\nThey do not need to swim.',
      },
    ],
  },
  silentrows: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0f2f3f', '#03101a');
          for (let i = 0; i < 10; i++) {
            const x = 18 + i * (w / 10);
            ctx.globalAlpha = 0.5;
            creature(ctx, 'rime', x, h * 0.5 + (i % 3) * 22, 1.15, 0);
            ctx.globalAlpha = 1;
          }
        },
        cap: 'Rank on rank of them,\nstanding upright in the ice.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0a2231', '#010810');
          creature(ctx, 'rime', w * 0.42, h * 0.52, 2.6, t * 2);
          eyes(ctx, w * 0.42, h * 0.3, 1.2, '#bfe6ff');
          motes(ctx, w, h, 12, t, '#e6faff');
        },
        cap: 'Sonar says most of them\nare still asleep. Most.',
        bub: { x: 0.5, y: 0.86, w: 176, txt: 'Quietly. Please.', tail: 0 },
      },
    ],
  },
  hollowcrown: {
    panels: [
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#16384a', '#04121c');
          throne(ctx, w * 0.5, h * 0.7, 1.1);
          ctx.fillStyle = 'rgba(226,244,252,0.4)';
          for (let i = 0; i < 9; i++) {
            const x = 10 + i * (w / 9);
            ctx.beginPath();
            ctx.moveTo(x - 6, 0); ctx.lineTo(x, 30 + (i % 3) * 12); ctx.lineTo(x + 6, 0);
            ctx.closePath(); ctx.fill();
          }
        },
        cap: 'A second throne. Older. Colder.\nAnd this one is not empty.',
      },
      {
        draw(ctx, w, h, t) {
          sea(ctx, w, h, '#0b2434', '#01070d');
          throne(ctx, w * 0.58, h * 0.66, 1.3);
          eyes(ctx, w * 0.58, h * 0.44, 2.6, '#cfefff');
          hero(ctx, 'karrick', w * 0.16, h * 0.84, 1.5, t);
          motes(ctx, w, h, 16, t, '#e6faff');
        },
        cap: 'The trench was warm once.\nThis is what fixed that.',
        bub: { x: 0.3, y: 0.2, w: 210, txt: 'Everything we have.\nRight here.', tail: -34 },
      },
    ],
  },
};

// ---------- state ----------

export function createComic(game, data) {
  const { W, H } = game;
  const scene = SCENES[data.scene];
  const next = data.next || { state: 'map' };
  let t = 0;
  let shown = 1;
  const skipBtn = { x: W - 120, y: H - 46, w: 100, h: 34, label: 'Skip ▸' };

  // Panels reveal on their own so a player who only wants to play ends up in
  // the level without clicking anything. Tapping still advances immediately —
  // this only sets a ceiling on how long an idle player waits.
  // A playtester read these too slowly for a flat timer: "the story beats skip
  // too fast, I'd expect them to last long enough so I can read." So each panel
  // holds for as long as its own text needs, at a deliberately unhurried
  // reading pace, with a floor for wordless panels and a ceiling so a chatty
  // one never strands anybody. Tapping still skips ahead instantly.
  function dwellFor(i) {
    const p = scene.panels[i];
    if (!p) return 3.4;
    const text = (p.cap || '') + ' ' + ((p.bub && p.bub.txt) || '');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return Math.max(3.4, Math.min(8, 2.0 + words / 2.2));
  }
  let sinceReveal = 0;
  let done = false;

  function layout(n) {
    // 3 panels: one row; 4 panels: 2x2
    if (n <= 3) {
      const pw = Math.min(280, (W - 80 - (n - 1) * 20) / n);
      const ph = 340;
      return scene.panels.map((_, i) => ({
        x: W / 2 - (n * pw + (n - 1) * 20) / 2 + i * (pw + 20),
        y: H / 2 - ph / 2, w: pw, h: ph,
      }));
    }
    const pw = 360, ph = 235;
    return scene.panels.map((_, i) => ({
      x: W / 2 - pw - 12 + (i % 2) * (pw + 24),
      y: 52 + Math.floor(i / 2) * (ph + 20), w: pw, h: ph,
    }));
  }
  const rects = layout(scene.panels.length);

  function advance() {
    if (shown < scene.panels.length) {
      shown++;
      sinceReveal = 0;
      sfx.click();
    } else {
      finish();
    }
  }
  function finish() {
    if (done) return;   // a tap landing on the same frame as the auto-advance
    done = true;
    game.setState(next.state, next.data);
  }

  return {
    update(dt) {
      t += dt;
      sinceReveal += dt;
      const onLast = shown >= scene.panels.length;
      // the last panel gets an extra beat before the scene hands off
      const need = dwellFor(shown - 1) + (onLast ? 1.2 : 0);
      if (sinceReveal >= need) {
        if (onLast) finish();
        else { shown++; sinceReveal = 0; }   // silent: no click for a self-reveal
      }
    },
    pointerDown(x, y) {
      if (hitRect(skipBtn, x, y)) { sfx.click(); finish(); return; }
      advance();
    },
    pointerMove() {},
    render(ctx) {
      // comic page background
      ctx.fillStyle = '#0b1520';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);

      scene.panels.forEach((p, i) => {
        const r = rects[i];
        if (i >= shown) {
          // unrevealed: faint empty frame
          roundRect(ctx, r.x, r.y, r.w, r.h, 8);
          ctx.fillStyle = 'rgba(20,32,44,0.5)';
          ctx.fill();
          ctx.strokeStyle = '#1c2f40';
          ctx.lineWidth = 2;
          ctx.stroke();
          return;
        }
        // pop-in
        const age = Math.min(1, (t * 60) % 1e9);
        ctx.save();
        roundRect(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.clip();
        ctx.translate(r.x, r.y);
        p.draw(ctx, r.w, r.h, t + i * 3);
        // caption + bubble inside panel space
        if (p.bub) bubble(ctx, r.w * p.bub.x + 40, r.h * p.bub.y + 10, p.bub.w, p.bub.txt, p.bub.tail);
        if (p.cap) caption(ctx, 8, 8, Math.min(r.w - 16, 235), p.cap);
        ctx.restore();
        roundRect(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.stroke();
      });

      const pulse = 0.6 + 0.4 * Math.sin(t * 3);
      ctx.globalAlpha = pulse;
      drawText(ctx, shown < scene.panels.length ? 'Tap to continue' : 'Tap to begin', W / 2, H - 28, 15, '#ffd873', 'center', 700);
      ctx.globalAlpha = 1;
      drawButton(ctx, skipBtn, { size: 13 });
    },
  };
}
