// Feats of the Deep — the achievement collection screen.
import { FEATS } from '../game/feats.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { INK, drawText, drawTextO, drawButton, hitRect, panel, roundRect, starIcon } from '../render/draw.js';
import { paintedBackdrop } from '../render/noise.js';

const TAU = Math.PI * 2;

export function createFeatsScreen(game) {
  const { W, H } = game;
  let t = 0;
  const backBtn = { x: W - 150, y: 10, w: 130, h: 32, label: S.settings.back };

  function cardRect(i) {
    const col = i % 2, row = Math.floor(i / 2);
    return { x: 60 + col * 430, y: 72 + row * 84, w: 410, h: 74 };
  }

  return {
    update(dt) { t += dt; },
    pointerDown(x, y) {
      if (hitRect(backBtn, x, y)) { sfx.click(); game.setState('map'); }
    },
    pointerMove() {},
    render(ctx) {
      ctx.drawImage(paintedBackdrop(W, H, 0xbead, '#14536b', '#04121c'), 0, 0);
      ctx.fillStyle = 'rgba(3,16,26,0.85)';
      ctx.fillRect(0, 0, W, 52);
      drawTextO(ctx, S.feats.title, 20, 27, 22, '#ffe9a8', 'left');
      const done = FEATS.filter(f => game.save.feats[f.id]).length;
      drawTextO(ctx, `${done} / ${FEATS.length}`, 330, 27, 17, '#ffd873', 'left');
      drawButton(ctx, backBtn, { size: 14 });

      FEATS.forEach((f, i) => {
        const r = cardRect(i);
        const got = !!game.save.feats[f.id];
        panel(ctx, r.x, r.y, r.w, r.h, 12);
        // medallion
        const mx = r.x + 42, my = r.y + r.h / 2;
        const mg = ctx.createRadialGradient(mx - 6, my - 8, 3, mx, my, 24);
        if (got) {
          mg.addColorStop(0, '#ffe9a8');
          mg.addColorStop(1, '#b5722a');
        } else {
          mg.addColorStop(0, '#2c3e4c');
          mg.addColorStop(1, '#141f28');
        }
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mx, my, 23, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        starIcon(ctx, mx, my, 12, got);
        if (got) {
          const shimmer = 0.5 + 0.5 * Math.sin(t * 2 + i);
          ctx.globalAlpha = shimmer * 0.35;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(mx, my, 26, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawTextO(ctx, got ? f.name : '? ? ?', r.x + 82, r.y + 30, 16,
          got ? '#ffe9a8' : '#44607a', 'left', 800, 2.8);
        drawText(ctx, got ? f.desc : S.feats.locked, r.x + 82, r.y + 56, 13,
          got ? '#c9e8f7' : '#33506a', 'left');
      });
    },
  };
}
