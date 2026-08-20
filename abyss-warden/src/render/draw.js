// Shared canvas draw helpers — glow, rings, text, buttons, ink outlines.
const TAU = Math.PI * 2;

// The "ink" outline colour that gives everything its chunky cartoon look.
export const INK = '#101a2b';

// Stroke the current path with the ink outline.
export function inkStroke(ctx, w = 2.5) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// A riveted bronze plate with bevel + drop shadow (used across UI screens) —
// the warm KR-style material instead of cold steel.
export function panel(ctx, x, y, w, h, r = 14) {
  roundRect(ctx, x + 3, y + 5, w, h, r);
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#8a5f30');
  g.addColorStop(0.14, '#5f3f1c');
  g.addColorStop(1, '#33210d');
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // inner bevel
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, Math.max(4, r - 4));
  ctx.strokeStyle = 'rgba(255,220,150,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // corner rivets
  for (const [rx, ry] of [[x + 11, y + 11], [x + w - 11, y + 11], [x + 11, y + h - 11], [x + w - 11, y + h - 11]]) {
    ctx.fillStyle = '#e8c477';
    ctx.beginPath();
    ctx.arc(rx, ry, 3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

// A satin ribbon banner with folded v-tail ends — for titles and level names.
export function ribbonBanner(ctx, cx, cy, w, h, color = '#c0392b') {
  const half = w / 2, tail = h * 0.9;
  // side tails (behind)
  ctx.fillStyle = shadeHex(color, 0.62);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * (half - 6), cy - h / 2 + 4);
    ctx.lineTo(cx + dir * (half + tail), cy - h / 2 + 2);
    ctx.lineTo(cx + dir * (half + tail * 0.55), cy);
    ctx.lineTo(cx + dir * (half + tail), cy + h / 2 - 2);
    ctx.lineTo(cx + dir * (half - 6), cy + h / 2 - 4);
    ctx.closePath();
    ctx.fill();
    inkStroke(ctx, 2.5);
  }
  // main band
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, shadeHex(color, 1.25));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shadeHex(color, 0.7));
  ctx.fillStyle = g;
  roundRect(ctx, cx - half, cy - h / 2, w, h, 6);
  ctx.fill();
  inkStroke(ctx, 3);
  // top sheen
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, cx - half + 4, cy - h / 2 + 3, w - 8, h * 0.32, 4);
  ctx.fill();
}

function shadeHex(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * mul) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * mul) | 0;
  const b = Math.min(255, (n & 255) * mul) | 0;
  return `rgb(${r},${g},${b})`;
}

// Chunky outlined text — the KR-style label treatment.
export function drawTextO(ctx, str, x, y, size, color, align = 'center', weight = 800, outline = 3.5) {
  ctx.font = `${weight} ${size}px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8,16,26,0.95)';
  ctx.lineWidth = outline;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Round physical button (pause / speed / ability).
export function uiRoundButton(ctx, cx, cy, r, opts = {}) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 4, r, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r);
  if (opts.accent) {
    g.addColorStop(0, '#ffe9a8');
    g.addColorStop(0.55, '#f0a83f');
    g.addColorStop(1, '#a8661f');
  } else {
    g.addColorStop(0, '#c99a5c');
    g.addColorStop(0.55, '#8a5f2c');
    g.addColorStop(1, '#4a3012');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3.5, Math.PI * 0.8, Math.PI * 1.7);
  ctx.stroke();
}

export function starIcon(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd873' : '#20374a';
  ctx.fill();
  inkStroke(ctx, 1.6);
}

export function drawText(ctx, str, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// Additive radial glow. Pass an rgba() color with the peak alpha baked in.
export function glowCircle(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = prev;
}

export function ring(ctx, x, y, r, color, w = 2, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function hexIcon(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawButton(ctx, b, opts = {}) {
  const enabled = opts.enabled !== false;
  const r = Math.min(10, b.h / 3);
  // drop shadow
  roundRect(ctx, b.x + 2, b.y + 4, b.w, b.h, r);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  // gradient body — warm brass, gold for primary actions
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  if (!enabled) {
    g.addColorStop(0, '#3d3428');
    g.addColorStop(1, '#211b12');
  } else if (opts.accent) {
    g.addColorStop(0, '#ffe9a0');
    g.addColorStop(0.5, '#f0a83f');
    g.addColorStop(1, '#b06c1e');
  } else {
    g.addColorStop(0, '#b8874a');
    g.addColorStop(0.5, '#8a5f2c');
    g.addColorStop(1, '#573a16');
  }
  roundRect(ctx, b.x, b.y, b.w, b.h, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  // top bevel highlight
  roundRect(ctx, b.x + 3, b.y + 2.5, b.w - 6, Math.max(5, b.h * 0.4), Math.max(3, r - 3));
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();
  if (b.label) {
    drawTextO(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, opts.size || 16,
      !enabled ? '#6d5f4a' : opts.accent ? '#fff6dd' : '#ffedd0', 'center', 800, 3.2);
  }
}

export function hitRect(b, x, y) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
