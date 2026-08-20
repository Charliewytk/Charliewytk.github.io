// Abyssal Codex: every creature encountered, with stats and a field note.
import { ENEMIES } from '../game/enemies.js';
import { drawEnemyBody } from '../game/enemies.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { drawText, drawButton, hitRect, panel, roundRect } from '../render/draw.js';
import { paintedBackdrop } from '../render/noise.js';

const ORDER = ['fry', 'mite', 'isopod', 'barracuda', 'jelly', 'worm', 'stalker', 'ray', 'hermit', 'husk', 'lancer', 'angler', 'brood', 'polyp', 'behemoth', 'glider', 'shaman', 'juggernaut'];

export function createCodex(game) {
  const { W, H } = game;
  let t = 0;
  let selected = 0;

  const backBtn = { x: W - 150, y: 10, w: 130, h: 32, label: S.settings.back };

  // The detail panel hangs off the right edge, so its geometry is derived from
  // the field width rather than hardcoded — otherwise it strands a gap on a
  // wider field. These values reproduce the original layout exactly at W=960.
  const PANEL_W = 308;
  const PANEL_X = W - PANEL_W - 20;
  const PL = PANEL_X + 32;                // left-aligned labels
  const PC = PANEL_X + PANEL_W / 2;       // centred content
  const PR = PANEL_X + 276;               // right-aligned stat values

  function cellRect(i) {
    const col = i % 5, row = Math.floor(i / 5);
    return { x: 30 + col * 118, y: 92 + row * 112, w: 104, h: 100 };
  }

  return {
    update(dt) { t += dt; },
    pointerDown(x, y) {
      if (hitRect(backBtn, x, y)) { sfx.click(); game.setState('map'); return; }
      ORDER.forEach((id, i) => {
        if (hitRect(cellRect(i), x, y)) { selected = i; sfx.click(); }
      });
    },
    pointerMove() {},
    render(ctx) {
      ctx.drawImage(paintedBackdrop(W, H, 0xbead, '#14536b', '#04121c'), 0, 0);
      ctx.fillStyle = 'rgba(3,16,26,0.85)';
      ctx.fillRect(0, 0, W, 52);
      drawText(ctx, S.codex.title, 20, 27, 22, '#bdf3ff', 'left', 800);
      drawButton(ctx, backBtn, { size: 14 });

      ORDER.forEach((id, i) => {
        const r = cellRect(i);
        const seen = !!game.save.seen[id];
        const sel = selected === i;
        roundRect(ctx, r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = sel ? '#0e3a52' : '#0a2334';
        ctx.fill();
        ctx.strokeStyle = sel ? '#5fe3ff' : '#22485e';
        ctx.lineWidth = sel ? 2.5 : 1.5;
        ctx.stroke();
        if (seen) {
          ctx.save();
          ctx.translate(r.x + r.w / 2, r.y + 44);
          ctx.scale(1.4, 1.4);
          drawEnemyBody(ctx, { def: ENEMIES[id], baseType: id, type: id, wob: t * 3 + i, hidden: false, elite: false, shieldHp: 1 });
          ctx.restore();
          drawText(ctx, S.enemies[id].name, r.x + r.w / 2, r.y + 88, 10.5, '#bfe8f7', 'center', 700);
        } else {
          drawText(ctx, '?', r.x + r.w / 2, r.y + 46, 30, '#28455c', 'center', 800);
        }
      });

      // detail panel
      const id = ORDER[selected];
      const d = ENEMIES[id];
      const seen = !!game.save.seen[id];
      panel(ctx, PANEL_X, 92, PANEL_W, 436);
      if (seen) {
        drawText(ctx, S.enemies[id].name, PC, 126, 20, '#dff4ff', 'center', 800);
        ctx.save();
        ctx.translate(PC, 196);
        ctx.scale(2.6, 2.6);
        drawEnemyBody(ctx, { def: d, baseType: id, type: id, wob: t * 3, hidden: false, elite: false, shieldHp: 1 });
        ctx.restore();
        drawText(ctx, d.flying ? '✦ Airborne — sails over blockers' : '● Ground', PC, 252, 12,
          d.flying ? '#9fe8ff' : '#c9b48a', 'center', 700);
        const stats = [
          [S.codex.hp, String(d.hp)],
          [S.codex.speed, String(d.speed)],
          [S.codex.armor, Math.round(d.armor * 100) + '%'],
          [S.codex.magicRes, Math.round(d.magicRes * 100) + '%'],
          [S.codex.bounty, String(d.bounty)],
          [S.codex.lives, String(d.lives)],
          ['Repelled', String((game.save.stats.killsBy || {})[id] || 0)],
        ];
        stats.forEach(([k, v], i) => {
          const y = 268 + i * 26;
          drawText(ctx, k, PL, y, 13, '#7fb6cf', 'left');
          drawText(ctx, v, PR, y, 13, '#d6f2ff', 'right', 700);
        });
        // word-wrapped tip
        const words = S.enemies[id].tip.split(' ');
        let line = '', ly = 452;
        ctx.font = '400 12.5px "Trebuchet MS", system-ui, sans-serif';
        for (const w of words) {
          if (ctx.measureText(line + w).width > 260) {
            drawText(ctx, line, PL, ly, 12.5, '#9fd4ea', 'left', 400);
            line = w + ' ';
            ly += 18;
          } else line += w + ' ';
        }
        drawText(ctx, line, PL, ly, 12.5, '#9fd4ea', 'left', 400);
      } else {
        drawText(ctx, S.codex.unseen, PC, 300, 15, '#44607a', 'center');
      }
    },
  };
}
