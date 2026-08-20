// The play field is a fixed 1067×600. On any screen that isn't 1.6:1 the leftover
// margin used to be dead black bars; this paints it as deep water with the play
// area seated in it like a lit viewport, so the frame reads as deliberate.
import { paintedBackdrop } from './noise.js';

let backdrop = null;
let cache = null;          // pre-composed surround at reduced resolution
let cacheKey = '';

function buildCache(cw, ch, ox, oy, ww, wh) {
  if (!backdrop) backdrop = paintedBackdrop(480, 300, 0x51a7, '#12546e', '#03101a');
  const cwS = 512, chS = Math.max(2, Math.round(512 * ch / cw));
  if (!cache) cache = document.createElement('canvas');
  cache.width = cwS;
  cache.height = chS;
  const c = cache.getContext('2d');
  const kx = cwS / cw, ky = chS / ch;

  c.clearRect(0, 0, cwS, chS);
  c.drawImage(backdrop, 0, 0, cwS, chS);
  c.fillStyle = 'rgba(2,10,18,0.5)';
  c.fillRect(0, 0, cwS, chS);
  const vg = c.createRadialGradient(cwS / 2, chS / 2, Math.min(cwS, chS) * 0.3,
                                    cwS / 2, chS / 2, Math.max(cwS, chS) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(1,7,13,0.75)');
  c.fillStyle = vg;
  c.fillRect(0, 0, cwS, chS);
  // the play area sits proud of the frame — bake its drop shadow in
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.7)';
  c.shadowBlur = Math.max(6, Math.round(Math.min(cwS, chS) * 0.035));
  c.shadowOffsetY = Math.round(Math.min(cwS, chS) * 0.006);
  c.fillStyle = '#000';
  c.fillRect(ox * kx, oy * ky, ww * kx, wh * ky);
  c.restore();
}

// Repaints the margin every frame. It has to be every frame: the custom cursor
// and anything else drawn near the field edge would otherwise smear out here
// permanently, because nothing else ever covers these pixels. Only the four
// margin strips are blitted, so the cost scales with the letterbox, not the screen.
export function drawSurround(ctx, cw, ch, ox, oy, ww, wh) {
  if (ox < 1 && oy < 1) return; // screen matches the play field exactly
  const key = `${cw}x${ch}:${ox},${oy}:${ww}x${wh}`;
  if (key !== cacheKey) { cacheKey = key; buildCache(cw, ch, ox, oy, ww, wh); }

  const kx = cache.width / cw, ky = cache.height / ch;
  const blit = (x, y, w, h) => {
    if (w <= 0 || h <= 0) return;
    ctx.drawImage(cache, x * kx, y * ky, w * kx, h * ky, x, y, w, h);
  };
  const rightW = cw - (ox + ww);
  const botH = ch - (oy + wh);
  blit(0, 0, cw, oy);                 // top
  blit(0, oy + wh, cw, botH);         // bottom
  blit(0, oy, ox, wh);                // left
  blit(ox + ww, oy, rightW, wh);      // right

  const t = Math.max(2, Math.round(Math.min(cw, ch) * 0.0045));
  ctx.strokeStyle = 'rgba(126,196,224,0.4)';
  ctx.lineWidth = t;
  ctx.strokeRect(ox - t / 2, oy - t / 2, ww + t, wh + t);
  ctx.strokeStyle = 'rgba(4,16,26,0.85)';
  ctx.lineWidth = Math.max(1, t * 0.6);
  ctx.strokeRect(ox - t * 1.4, oy - t * 1.4, ww + t * 2.8, wh + t * 2.8);
}

// Portrait on a phone squeezes the landscape field into an unplayable strip.
// Ask for a rotate instead of showing the player something broken.
export function drawRotatePrompt(ctx, cw, ch, t) {
  cacheKey = ''; // this paints over the surround, so force a rebuild afterwards
  if (!backdrop) backdrop = paintedBackdrop(480, 300, 0x51a7, '#12546e', '#03101a');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backdrop, 0, 0, cw, ch);
  ctx.fillStyle = 'rgba(2,10,18,0.66)';
  ctx.fillRect(0, 0, cw, ch);

  const u = Math.min(cw, ch) / 100;      // scale everything off the short edge
  const cx = cw / 2, cy = ch / 2;
  const tilt = -Math.PI / 2 * (0.5 - 0.5 * Math.cos(Math.min(1, (t % 3) / 1.6) * Math.PI));

  ctx.translate(cx, cy - u * 8);
  ctx.rotate(tilt);
  const pw = u * 26, ph = u * 46, r = u * 4;
  ctx.fillStyle = '#0d2c3e';
  ctx.strokeStyle = '#7ec4e0';
  ctx.lineWidth = Math.max(2, u * 1.1);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-pw / 2, -ph / 2, pw, ph, r);
  else ctx.rect(-pw / 2, -ph / 2, pw, ph);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(126,196,224,0.28)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-pw / 2 + u * 2.5, -ph / 2 + u * 5, pw - u * 5, ph - u * 10, r * 0.5);
  else ctx.rect(-pw / 2 + u * 2.5, -ph / 2 + u * 5, pw - u * 5, ph - u * 10);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = `800 ${Math.round(u * 7)}px "Trebuchet MS", system-ui, sans-serif`;
  ctx.fillText('Rotate your device', cx, cy + u * 26);
  ctx.fillStyle = '#8fc4dc';
  ctx.font = `400 ${Math.round(u * 4.4)}px "Trebuchet MS", system-ui, sans-serif`;
  ctx.fillText('Abyss Warden plays in landscape', cx, cy + u * 35);
  ctx.restore();
}
