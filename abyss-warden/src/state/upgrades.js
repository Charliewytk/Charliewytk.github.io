// Star upgrade tree: 6 doctrines, sequential nodes, full respec.
import { META, nodeAvailable } from '../game/meta.js';
import { totalStars, starsSpent } from '../game/save.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { drawText, drawButton, hitRect, panel, starIcon, roundRect, INK } from '../render/draw.js';
import { paintedBackdrop } from '../render/noise.js';

const BRANCH_ORDER = ['general', 'harpoon', 'arc', 'charge', 'drone', 'sonar'];
const TAU = Math.PI * 2;

const BRANCH_GLYPHS = {
  general(ctx) { // station dome
    ctx.fillStyle = '#7fc9e8';
    ctx.beginPath(); ctx.arc(0, 2, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = '#dff4ff';
    ctx.beginPath(); ctx.arc(0, -2, 2, 0, TAU); ctx.fill();
  },
  harpoon(ctx) {
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(5, -5); ctx.stroke();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(1, -5); ctx.lineTo(5, -1); ctx.closePath(); ctx.fill();
  },
  arc(ctx) {
    ctx.strokeStyle = '#7df3ff'; ctx.lineWidth = 2.2; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(3, -2); ctx.lineTo(-3, 2); ctx.lineTo(2, 9); ctx.stroke();
  },
  charge(ctx) {
    ctx.fillStyle = '#ffb35f';
    ctx.beginPath(); ctx.arc(0, 2, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = '#ffb35f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -3.5); ctx.lineTo(0, -9); ctx.stroke();
  },
  drone(ctx) {
    ctx.fillStyle = '#8df0c0';
    ctx.beginPath(); ctx.arc(0, -2, 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = '#8df0c0'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(-2.5, 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 7); ctx.lineTo(2.5, 1.5); ctx.stroke();
  },
  sonar(ctx) {
    ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(-4, 0, i * 3.4, -0.9, 0.9); ctx.stroke(); }
  },
};

export function createUpgrades(game) {
  const { W, H } = game;
  let t = 0;
  let hover = null;

  const backBtn = { x: W - 150, y: 10, w: 130, h: 32, label: S.settings.back };
  const respecBtn = { x: W - 300, y: 10, w: 140, h: 32, label: S.upgrades.respec };

  // Six rows have to fit inside 600px. The old 98px pitch pushed general's
  // last two nodes off the bottom of the screen entirely — gen6 was unbuyable.
  function nodeRect(bi, ni) {
    // Derived from the field width rather than a fixed pitch, so the six
    // doctrines always span the screen instead of bunching to the left.
    const MARGIN = 36;
    const colW = (W - MARGIN * 2) / BRANCH_ORDER.length;
    const x = MARGIN + bi * colW;
    const y = 112 + ni * 76;
    return { x, y, w: colW - 26, h: 66, bi, ni };
  }

  function available() { return totalStars(game.save) - starsSpent(game.save, META); }

  return {
    update(dt) { t += dt; },
    pointerDown(x, y) {
      if (hitRect(backBtn, x, y)) { sfx.click(); game.setState('map'); return; }
      if (hitRect(respecBtn, x, y)) {
        sfx.sell();
        game.save.meta = {};
        game.persist();
        return;
      }
      for (let bi = 0; bi < BRANCH_ORDER.length; bi++) {
        const branch = BRANCH_ORDER[bi];
        META[branch].forEach((node, ni) => {
          const r = nodeRect(bi, ni);
          if (hitRect(r, x, y)) {
            if (game.save.meta[node.id]) return;
            if (!nodeAvailable(game.save, branch, ni)) { sfx.click(); return; }
            if (available() < node.cost) { sfx.click(); return; }
            game.save.meta[node.id] = true;
            game.persist();
            sfx.upgrade();
          }
        });
      }
    },
    pointerMove(x, y) {
      hover = null;
      for (let bi = 0; bi < BRANCH_ORDER.length; bi++) {
        META[BRANCH_ORDER[bi]].forEach((node, ni) => {
          if (hitRect(nodeRect(bi, ni), x, y)) hover = node;
        });
      }
    },
    render(ctx) {
      ctx.drawImage(paintedBackdrop(W, H, 0xbead, '#14536b', '#04121c'), 0, 0);

      ctx.fillStyle = 'rgba(3,16,26,0.85)';
      ctx.fillRect(0, 0, W, 52);
      drawText(ctx, S.upgrades.title, 20, 27, 22, '#bdf3ff', 'left', 800);
      starIcon(ctx, 330, 26, 10, true);
      drawText(ctx, `${available()}`, 348, 27, 18, '#ffd873', 'left', 700);
      drawText(ctx, `${S.upgrades.spent}: ${starsSpent(game.save, META)}`, 400, 28, 13, '#7fb6cf', 'left');
      drawButton(ctx, backBtn, { size: 14 });
      drawButton(ctx, respecBtn, { size: 13 });

      BRANCH_ORDER.forEach((branch, bi) => {
        const r0 = nodeRect(bi, 0);
        // doctrine medallion
        ctx.save();
        ctx.translate(r0.x + r0.w / 2, 62);
        ctx.fillStyle = '#0d3348';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
        BRANCH_GLYPHS[branch](ctx);
        ctx.restore();
        drawText(ctx, S.upgrades.branchNames[branch], r0.x + r0.w / 2, 90, 12.5, '#8fd7e8', 'center', 800);
        META[branch].forEach((node, ni) => {
          const r = nodeRect(bi, ni);
          const owned = !!game.save.meta[node.id];
          const open = nodeAvailable(game.save, branch, ni);
          const canBuy = open && !owned && available() >= node.cost;
          if (ni > 0) {
            ctx.strokeStyle = owned || open ? '#2e6a8f' : '#1a2c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(r.x + r.w / 2, r.y - 10);
            ctx.lineTo(r.x + r.w / 2, r.y);
            ctx.stroke();
          }
          roundRect(ctx, r.x, r.y, r.w, r.h, 10);
          ctx.fillStyle = owned ? '#124a38' : canBuy ? '#0e3a52' : '#0a1a26';
          ctx.fill();
          ctx.strokeStyle = owned ? '#8df0c0' : canBuy ? '#5fe3ff' : '#22384a';
          ctx.lineWidth = owned || canBuy ? 2.5 : 1.5;
          ctx.stroke();
          const info = S.upgrades.nodes[node.id];
          drawText(ctx, info.name, r.x + r.w / 2, r.y + 16, 12, owned ? '#8df0c0' : '#c8ecff', 'center', 700);
          // cost pips
          for (let c = 0; c < node.cost; c++) {
            starIcon(ctx, r.x + r.w / 2 + (c - (node.cost - 1) / 2) * 14, r.y + 33, 5.5, owned || canBuy);
          }
          drawText(ctx, owned ? S.upgrades.bought : open ? S.upgrades.buy : '—', r.x + r.w / 2, r.y + 53, 10.5,
            owned ? '#8df0c0' : open ? '#9fd4ea' : '#44607a', 'center');
        });
      });

      if (hover) {
        const info = S.upgrades.nodes[hover.id];
        ctx.fillStyle = 'rgba(3,16,26,0.92)';
        ctx.fillRect(0, H - 40, W, 40);
        drawText(ctx, `${info.name} — ${info.desc}`, W / 2, H - 20, 15, '#dff4ff', 'center');
      }
    },
  };
}
