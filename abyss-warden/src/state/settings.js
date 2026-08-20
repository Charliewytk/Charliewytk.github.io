import { drawText, drawButton, hitRect, panel, roundRect } from '../render/draw.js';
import { paintedBackdrop } from '../render/noise.js';
import { S } from '../data/strings.js';
import { sfx, setSfxVolume } from '../audio/synth.js';
import { setMusicVolume } from '../audio/music.js';
import { wipeSave, defaultSave } from '../game/save.js';

export function createSettings(game) {
  const { W, H } = game;
  let t = 0;
  let wipeArm = 0;
  const st = game.save.settings;

  const px = W / 2 - 240, py = 62, pw = 480;
  const sliders = [
    { id: 'sfx', label: S.settings.sfx, y: py + 80 },
    { id: 'music', label: S.settings.music, y: py + 130 },
  ];
  const toggles = [
    { id: 'shake', label: S.settings.shake, y: py + 182 },
    { id: 'dmgNums', label: S.settings.dmgNums, y: py + 230 },
    { id: 'autoWave', label: S.settings.autoWave, y: py + 278 },
    { id: 'fx', label: S.settings.fx, y: py + 326 },
  ];
  const exportBtn = { x: px + 24, y: py + 370, w: 138, h: 38, label: S.settings.exportSave };
  const importBtn = { x: px + 172, y: py + 370, w: 138, h: 38, label: S.settings.importSave };
  const wipeBtn = { x: px + 320, y: py + 370, w: 138, h: 38, label: S.settings.wipe };
  const backBtn = { x: px + pw / 2 - 95, y: py + 418, w: 190, h: 40, label: S.settings.back };

  function sliderRect(s) { return { x: px + 190, y: s.y - 12, w: 220, h: 24 }; }
  function toggleRect(s) { return { x: px + 190, y: s.y - 15, w: 64, h: 30 }; }

  function applyAudio() {
    setSfxVolume(st.sfx);
    setMusicVolume(st.music);
  }

  function handle(x, y) {
    for (const s of sliders) {
      const r = sliderRect(s);
      if (hitRect({ x: r.x - 8, y: r.y, w: r.w + 16, h: r.h }, x, y)) {
        st[s.id] = Math.max(0, Math.min(1, (x - r.x) / r.w));
        applyAudio();
        game.persist();
        if (s.id === 'sfx') sfx.click();
        return true;
      }
    }
    for (const s of toggles) {
      if (hitRect(toggleRect(s), x, y)) {
        st[s.id] = !st[s.id];
        game.persist();
        sfx.click();
        return true;
      }
    }
    return false;
  }

  return {
    update(dt) { t += dt; wipeArm = Math.max(0, wipeArm - dt); },
    pointerDown(x, y) {
      if (handle(x, y)) return;
      if (hitRect(exportBtn, x, y)) {
        sfx.click();
        try {
          const code = btoa(unescape(encodeURIComponent(JSON.stringify(game.save))));
          window.prompt(S.settings.exportMsg, code);
        } catch (e) { /* prompt blocked — nothing to break */ }
        return;
      }
      if (hitRect(importBtn, x, y)) {
        sfx.click();
        try {
          const code = window.prompt(S.settings.importMsg, '');
          if (code) {
            const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
            if (parsed && typeof parsed === 'object' && parsed.stars) {
              game.save = parsed;
              game.persist();
              game.setState('title');
              return;
            }
          }
        } catch (e) {
          window.alert && window.alert(S.settings.importBad);
        }
        return;
      }
      if (hitRect(wipeBtn, x, y)) {
        sfx.click();
        if (wipeArm > 0) {
          wipeSave();
          game.save = defaultSave();
          game.setState('title');
        } else wipeArm = 3;
        return;
      }
      if (hitRect(backBtn, x, y)) { sfx.click(); game.setState('map'); }
    },
    pointerMove(x, y) {},
    render(ctx) {
      ctx.drawImage(paintedBackdrop(W, H, 0xbead, '#14536b', '#04121c'), 0, 0);
      panel(ctx, px, py, pw, 476);
      drawText(ctx, S.settings.title, W / 2, py + 38, 26, '#bdf3ff', 'center', 800);

      for (const s of sliders) {
        drawText(ctx, s.label, px + 40, s.y, 16, '#9fd4ea', 'left');
        const r = sliderRect(s);
        roundRect(ctx, r.x, r.y + 8, r.w, 8, 4);
        ctx.fillStyle = '#0a1a26';
        ctx.fill();
        ctx.strokeStyle = '#2e6a8f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const v = st[s.id];
        roundRect(ctx, r.x, r.y + 8, r.w * v, 8, 4);
        ctx.fillStyle = '#5fe3ff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r.x + r.w * v, r.y + 12, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#c8ecff';
        ctx.fill();
        ctx.strokeStyle = '#101a2b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      for (const s of toggles) {
        drawText(ctx, s.label, px + 40, s.y, 16, '#9fd4ea', 'left');
        const r = toggleRect(s);
        roundRect(ctx, r.x, r.y, r.w, r.h, 15);
        ctx.fillStyle = st[s.id] ? '#136a4f' : '#232f3d';
        ctx.fill();
        ctx.strokeStyle = '#101a2b';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(st[s.id] ? r.x + r.w - 15 : r.x + 15, r.y + 15, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#c8ecff';
        ctx.fill();
        ctx.strokeStyle = '#101a2b';
        ctx.stroke();
      }
      drawButton(ctx, exportBtn, { size: 13 });
      drawButton(ctx, importBtn, { size: 13 });
      drawButton(ctx, { ...wipeBtn, label: wipeArm > 0 ? S.settings.wipeConfirm : S.settings.wipe }, { size: wipeArm > 0 ? 10 : 13 });
      drawButton(ctx, backBtn, { accent: true, size: 15 });
    },
  };
}
