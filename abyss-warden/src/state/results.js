import { drawText, drawTextO, drawButton, hitRect, glowCircle, panel, ribbonBanner, starIcon, INK } from '../render/draw.js';
import { paintedBackdrop } from '../render/noise.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { LEVELS, levelIndex, endlessLevel } from '../game/levels/index.js';
import { launchLevel } from '../game/launch.js';

export function createResults(game, data) {
  let t = 0;
  const { W, H } = game;

  // Record progress once, on entry.
  let newRecord = false;
  if (data.won && data.levelId && !data.endless) {
    const save = game.save;
    if (data.challenge === 'iron') {
      if (!save.iron[data.levelId]) { save.iron[data.levelId] = true; newRecord = true; }
    } else if (data.challenge === 'heroic') {
      if (!save.heroic[data.levelId]) { save.heroic[data.levelId] = true; newRecord = true; }
    } else {
      const prev = save.stars[data.levelId] || 0;
      if (data.stars > prev) { save.stars[data.levelId] = data.stars; newRecord = true; }
      save.best[data.levelId] = { lives: data.lives, difficulty: data.difficulty };
    }
    // feats that unlock from results
    if (data.levelId === 'level01') save.feats.first = true;
    if (data.stars === 3) save.feats.perfect = true;
    if (data.challenge === 'iron') save.feats.iron = true;
    if (LEVELS.every(l => (save.stars[l.id] || 0) > 0)) save.feats.campaign = true;
    game.persist();
  }

  const idx = data.levelId && !data.endless ? levelIndex(data.levelId) : -1;
  const hasNext = data.won && !data.challenge && idx >= 0 && idx < LEVELS.length - 1;

  const btnW = 172, btnH = 46;
  const buttons = [];
  if (hasNext) {
    buttons.push({ x: W / 2 - btnW * 1.5 - 20, y: 476, w: btnW, h: btnH, label: S.ui.replay, act: retry });
    buttons.push({ x: W / 2 - btnW / 2, y: 476, w: btnW, h: btnH, label: S.ui.toMap, accent: true, act: toMap });
    buttons.push({ x: W / 2 + btnW / 2 + 20, y: 476, w: btnW, h: btnH, label: 'Next Station', act: next });
  } else {
    buttons.push({ x: W / 2 - btnW - 14, y: 476, w: btnW, h: btnH, label: S.ui.replay, accent: !data.won, act: retry });
    buttons.push({ x: W / 2 + 14, y: 476, w: btnW, h: btnH, label: S.ui.toMap, accent: data.won, act: toMap });
  }

  function retry() {
    if (data.endless) {
      game.setState('battle', { level: endlessLevel(S), difficulty: 'standard' });
      return;
    }
    game.setState('battle', {
      level: LEVELS[Math.max(0, idx)],
      difficulty: data.difficulty || 'standard',
      challenge: data.challenge || null,
    });
  }
  function next() {
    // go through launchLevel so the comic interlude for the next station still
    // plays — pressing "Next Station" used to skip it entirely
    launchLevel(game, LEVELS[idx + 1], data.difficulty || 'standard', null);
  }
  function toMap() {
    // Beating the last station earns the finale — it was written but nothing
    // ever triggered it, so the campaign just dropped you back on the chart.
    if (data.won && data.levelId === 'level20' && !data.challenge && !game.save.comics.finale) {
      game.save.comics.finale = true;
      game.persist();
      game.setState('comic', { scene: 'finale', next: { state: 'map', data: { selected: 19 } } });
      return;
    }
    game.setState('map', { selected: Math.max(0, idx) });
  }

  return {
    update(dt) { t += dt; },
    pointerDown(x, y) {
      for (const b of buttons) {
        if (hitRect(b, x, y)) { sfx.click(); b.act(); return; }
      }
    },
    render(ctx) {
      ctx.drawImage(paintedBackdrop(W, H, 0xbead, '#14536b', '#04121c'), 0, 0);

      panel(ctx, W / 2 - 290, 84, 580, 472);

      const won = data.won;
      // ribbon slams in with elastic ease
      const slam = Math.min(1.06, 1 - Math.exp(-t * 8) * Math.cos(t * 12));
      ctx.save();
      ctx.translate(W / 2, 146);
      ctx.scale(Math.max(0.2, slam), Math.max(0.2, slam));
      ribbonBanner(ctx, 0, 0, 380, 52, won ? '#1e8a4f' : '#c0392b');
      drawTextO(ctx, won ? S.results.winTitle : S.results.loseTitle, 0, 1, 32, '#fff6dd', 'center', 800, 4.5);
      ctx.restore();
      let sub = won ? S.results.winSub : S.results.loseSub;
      if (won && data.challenge === 'iron') sub = S.results.ironWin;
      if (won && data.challenge === 'heroic') sub = S.results.heroicWin;
      drawText(ctx, sub, W / 2, 192, 16, '#c9b48a', 'center', 400);
      if (newRecord) drawText(ctx, S.results.newRecord, W / 2, 214, 14, '#ffd873', 'center', 700);
      if (!won && data.hint) drawText(ctx, data.hint, W / 2, 214, 13.5, '#ffe9a8', 'center', 700);

      for (let i = 0; i < 3; i++) {
        const x = W / 2 + (i - 1) * 74;
        const y = 262;
        // metallic star socket
        const sg = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, 26);
        sg.addColorStop(0, '#8a6a3c');
        sg.addColorStop(1, '#33210d');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        const earned = won && !data.challenge && i < data.stars;
        if (earned) {
          const pop = Math.min(1.15, Math.max(0, 1 - Math.exp(-(t - 0.35 - i * 0.28) * 9) * Math.cos((t - 0.35 - i * 0.28) * 14)));
          if (pop > 0.05) {
            glowCircle(ctx, x, y, 42 * Math.min(1, pop), 'rgba(255,216,115,0.55)');
            starIcon(ctx, x, y, 19 * pop, true);
          }
        } else {
          starIcon(ctx, x, y, 17, false);
        }
      }

      const stats = [
        [data.endless ? S.endless.survived : S.results.statWaves,
          data.endless ? `${data.endlessWave}` : `${data.waves} / ${data.totalWaves}`],
        [S.results.statLives, `${data.lives} / ${data.maxLives || 20}`],
        [S.results.statKills, String(data.kills)],
        [S.results.statGold, String(data.goldEarned)],
      ];
      stats.forEach(([label, val], i) => {
        const y = 330 + i * 32;
        drawText(ctx, label, W / 2 - 140, y, 16, '#7fb6cf', 'left', 400);
        drawText(ctx, val, W / 2 + 140, y, 16, '#d6f2ff', 'right', 700);
      });

      for (const b of buttons) drawButton(ctx, b, { accent: b.accent, size: 15 });
    },
  };
}
