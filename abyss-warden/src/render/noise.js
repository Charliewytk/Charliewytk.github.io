// Value-noise "brushwork" engine: multi-octave noise fields drive mottled
// colour and fake-lit relief, baked into overlay canvases. This is the
// painted-texture layer — the closest canvas code gets to hand-painted
// ground. Everything is generated once and composited with 'overlay'.

function hash2(seed, xi, yi) {
  let h = seed ^ (xi * 374761393) ^ (yi * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = t => t * t * (3 - 2 * t);

export function makeNoise(seed) {
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const a = hash2(seed, xi, yi), b = hash2(seed, xi + 1, yi);
    const c = hash2(seed, xi, yi + 1), d = hash2(seed, xi + 1, yi + 1);
    const sx = smooth(fx), sy = smooth(fy);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y, oct = 3) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) {
      v += noise(x * f, y * f) * amp;
      amp *= 0.5;
      f *= 2.1;
    }
    return v / (1 - Math.pow(0.5, oct));
  }
  return { noise, fbm };
}

// A grayscale relief map: neutral 128 gray modulated by noise height and a
// top-left light source. Composite with 'overlay' to give any surface
// painted, bumpy, hand-shaded texture. Built coarse and scaled up so the
// browser's bilinear filtering smooths it for free.
export function reliefCanvas(W, H, seed, opts = {}) {
  const scale = opts.scale || 0.06;   // feature size (bigger = finer)
  const amp = opts.amp || 5;          // lighting strength
  const sw = 240, sh = Math.max(2, Math.round(240 * H / W));
  const cv = document.createElement('canvas');
  cv.width = sw;
  cv.height = sh;
  const ctx = cv.getContext('2d');
  const { fbm } = makeNoise(seed);
  // heights on a (sw+1)x(sh+1) grid
  const hs = new Float32Array((sw + 1) * (sh + 1));
  for (let y = 0; y <= sh; y++) {
    for (let x = 0; x <= sw; x++) {
      hs[y * (sw + 1) + x] = fbm(x * scale, y * scale, opts.oct || 3);
    }
  }
  const img = ctx.createImageData(sw, sh);
  const data = img.data;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const h = hs[y * (sw + 1) + x];
      const hx = hs[y * (sw + 1) + x + 1] - h;
      const hy = hs[(y + 1) * (sw + 1) + x] - h;
      // light from the upper-left; only a whisper of height tone so the
      // texture reads as brushed relief, not camouflage blotches
      let light = 0.5 + (-hx - hy) * amp + (h - 0.5) * 0.1;
      light = Math.max(0.2, Math.min(0.8, light));
      const g = Math.round(light * 255);
      const i = (y * sw + x) * 4;
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// A cached painted backdrop for menu screens: gradient + relief + vignette.
const backdropCache = new Map();
export function paintedBackdrop(W, H, seed, top, bot) {
  const key = `${W}x${H}:${seed}:${top}:${bot}`;
  if (backdropCache.has(key)) return backdropCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  paintRelief(ctx, W, H, seed, [
    { scale: 0.05, amp: 3, alpha: 0.16, oct: 3 },
    { scale: 0.16, amp: 2, alpha: 0.1, oct: 2, seedOffset: 13 },
  ]);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,10,18,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  backdropCache.set(key, cv);
  return cv;
}

// Convenience: composite one or more relief layers over the current canvas.
export function paintRelief(ctx, W, H, seed, layers) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (const layer of layers) {
    const cv = reliefCanvas(W, H, seed + (layer.seedOffset || 0), layer);
    ctx.globalAlpha = layer.alpha != null ? layer.alpha : 0.5;
    ctx.drawImage(cv, 0, 0, W, H);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
