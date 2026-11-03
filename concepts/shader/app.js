/*
  Shader concept: app.js
  ----------------------
  1. Reads the project rows from the HTML (tint, media, aspect ratio).
  2. Tracks which row is active: hover, keyboard focus, or a finger on the
     row on touch screens. Nothing is active at rest.
  3. Draws a WebGL noise field in two passes:
       pass 1  field.frag    -> half-resolution texture (colour + noise in alpha)
       pass 2  compose.frag  -> screen: upscaled field + the active project's
                                media, dissolving in along the noise
  4. Falls back to the CSS gradient + plain <img> when there is no WebGL,
     the context is lost, the GPU is too slow, or the visitor prefers
     reduced motion.

  Every animated value is a small spring (see Spring), so any change of
  target mid-flight keeps its velocity: fast hovering never jumps. The tint
  springs in OKLCH (lightness, chroma, hue on the short arc), so moving
  between two projects never passes through grey. Hue springs faster than
  lightness and chroma, and chroma eases off while the hue is far from home,
  so a long swing (pink to green) doesn't stop on a third colour.
  On phones, where there is no preview, the field at rest drifts slowly
  through the project hues instead of sitting grey.
*/
(() => {
  'use strict';

  const root = document.documentElement;
  const list = document.querySelector('.list');
  const rows = Array.from(document.querySelectorAll('.row'));
  const stage = document.querySelector('.stage');
  const knBlocks = Array.from(document.querySelectorAll('.kn'));
  const canvas = document.querySelector('.field');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

  const REST_TINT = '#8d887c';   // the field is monochrome until a project is chosen

  // ---------- colour: sRGB hex <-> OKLCH ----------
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  function hexToLch(hex) {
    const [r, g, b] = hexToRgb(hex).map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [L, Math.hypot(A, B), Math.atan2(B, A) * 180 / Math.PI];
  }
  function lchToRgb(L, C, H) {
    const h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ].map((c) => toGam(Math.min(1, Math.max(0, c))));
  }

  // ---------- project data, read once from the rows ----------
  const projects = rows.map((el, i) => ({
    el, i,
    tintHex: el.dataset.tint,
    lch: hexToLch(el.dataset.tint),
    img: el.dataset.img || null,
    video: el.dataset.video || null,
    ratio: parseFloat(el.dataset.ratio) || 1,
    max: parseFloat(el.dataset.max) || 0,                 // optional size cap in CSS px
    radius: el.dataset.radius != null ? parseFloat(el.dataset.radius) : 12,
    frame: el.dataset.frame !== 'none',                   // 'none' = cut-out icon: no shadow
    // Field signature, so a project without media still has its own look:
    // grain (noise frequency) and pace (flow speed), spread by row number.
    grain: 1.05 + (i % 4) * 0.2,
    pace: 1.4 + ((i * 5) % 3) * 0.8,
    // filled in later
    tex: null, texAspect: parseFloat(el.dataset.ratio) || 1, imgReady: false,
    imgLoading: false, vid: null, vidFresh: false, vidFrames: false, fallbackImg: null,
  }));
  const REST_LCH = hexToLch(REST_TINT);

  // ---------- Spring: interruptible, keeps velocity when the target changes ----------
  class Spring {
    constructor(value, k, c) { this.x = value; this.v = 0; this.target = value; this.k = k; this.c = c; }
    step(dt) {
      // Sub-steps of at most 1/240 s keep stiff springs stable on slow frames.
      const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
      for (let i = 0; i < n; i++) {
        this.v += (-this.k * (this.x - this.target) - this.c * this.v) * h;
        this.x += this.v * h;
      }
    }
    get resting() { return Math.abs(this.v) < 1e-3 && Math.abs(this.x - this.target) < 1e-3; }
  }

  // ---------- active project ----------
  let active = -1;        // row shown in the field and preview
  let renderer = null;    // WebGL renderer, or null in fallback mode

  function setActive(i) {
    if (i === active) return;
    active = i;
    rows.forEach((r, j) => r.classList.toggle('is-active', j === i));
    list.classList.toggle('has-active', i >= 0);
    root.style.setProperty('--tint', i >= 0 ? projects[i].tintHex : REST_TINT);
    for (const k of knBlocks) k.classList.toggle('on', +k.dataset.i === i);
    if (renderer) renderer.show(i); else showFallback(i);
  }

  // ----- mouse: hover a row; leaving the list waits a moment, and never
  // clears while the pointer is over the preview it was heading for -----
  let overList = false, leaveTimer = 0;
  const inStage = (x, y) => {
    const r = stage.getClientRects().length ? stage.getBoundingClientRect() : null;
    return !!r && x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 24 && y <= r.bottom + 24;
  };
  const cancelLeave = () => { clearTimeout(leaveTimer); leaveTimer = 0; };
  const scheduleLeave = () => {
    if (leaveTimer) return;
    leaveTimer = setTimeout(() => { leaveTimer = 0; if (!overList) setActive(-1); }, 420);
  };
  // Intent: a pointer on its way from the active row to the preview crosses
  // other rows. While it is heading into the preview, a row it passes over
  // only takes over if the pointer stays on it for a moment (menu-aim).
  let hoverRow = -1, intentTimer = 0;
  const trail = [];                       // recent mouse points, newest last
  function headingToStage() {
    const r = stage.getClientRects().length ? stage.getBoundingClientRect() : null;
    if (!r || trail.length < 2) return false;
    const [a, b] = [trail[0], trail[trail.length - 1]];
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx <= 2 || b.x >= r.left) return false;
    const s = dy / dx, top = (r.top - a.y) / (r.left - a.x), bot = (r.bottom - a.y) / (r.left - a.x);
    return s >= top && s <= bot;
  }
  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      overList = true; hoverRow = i; cancelLeave(); clearTimeout(intentTimer);
      if (active >= 0 && active !== i && headingToStage()) {
        intentTimer = setTimeout(() => { if (hoverRow === i) setActive(i); }, 140);
      } else setActive(i);
    });
  });
  list.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { overList = false; hoverRow = -1; scheduleLeave(); } });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    trail.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    while (trail.length > 2 && e.timeStamp - trail[0].t > 80) trail.shift();
    if (overList || active < 0) return;
    if (inStage(e.clientX, e.clientY)) cancelLeave(); else scheduleLeave();
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget && !overList) scheduleLeave(); });

  // ----- touch: the finger on a row tints the field; lifting or scrolling away
  // returns to rest. Nothing is tinted at rest, so the tint always points at a row. -----
  let touchTimer = 0;
  rows.forEach((row, i) => {
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(touchTimer);
      setActive(i);
    });
  });
  const touchRelease = (delay) => (e) => {
    if (e.pointerType !== 'touch') return;
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => setActive(-1), delay);
  };
  // A tap navigates before this fires; a press that goes nowhere fades back.
  window.addEventListener('pointerup', touchRelease(700));
  window.addEventListener('pointercancel', touchRelease(200));
  // Back from the page cache: start at rest again.
  window.addEventListener('pageshow', (e) => { if (e.persisted) { clearTimeout(touchTimer); setActive(-1); } });

  // ----- keyboard: focus does exactly what hover does -----
  list.addEventListener('focusin', (e) => {
    const i = rows.indexOf(e.target.closest('.row'));
    if (i >= 0) { cancelLeave(); setActive(i); }
  });
  list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget) && !overList) setActive(-1); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && active >= 0) { overList = false; setActive(-1); } });

  // ---------- fallback preview: plain <img>, cross-faded with CSS ----------
  // All images are made up front on wide screens, so the first hover is never
  // empty (and the preloaded ExeTix screen is used straight away).
  function makeFallbackImgs() {
    if (renderer || !stageVisible()) return;
    for (const p of projects) {
      if (!p.img || p.fallbackImg) continue;
      const im = new Image();
      im.alt = '';
      im.decoding = 'async';
      if (p.i !== 0) im.fetchPriority = 'low';
      im.src = p.img;
      im.style.setProperty('--r', p.radius + 'px');
      if (p.max) { im.style.maxWidth = im.style.maxHeight = `min(100%, ${p.max}px)`; }
      p.fallbackImg = im;
      stage.appendChild(im);
    }
  }
  function showFallback(i) {
    makeFallbackImgs();
    for (const p of projects) if (p.fallbackImg) p.fallbackImg.classList.toggle('on', p.i === i);
  }
  const stageVisible = () => stage.getClientRects().length > 0;
  matchMedia('(min-width: 900px)').addEventListener('change', () => { if (!renderer) showFallback(active); });

  // ----- the preview is part of the link: a click on the visible media (or
  // the key number) opens the active project. The row stays the only <a>. -----
  function previewRect() {
    const p = projects[active];
    if (!p || !stageVisible()) return null;
    if (p.img) {
      if (renderer) return renderer.mediaRect(p);
      return p.fallbackImg && p.fallbackImg.complete && p.fallbackImg.naturalWidth ? p.fallbackImg.getBoundingClientRect() : null;
    }
    const kn = knBlocks.find((k) => +k.dataset.i === active);
    return kn ? kn.getBoundingClientRect() : null;
  }
  const inRect = (r, x, y) => !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    root.classList.toggle('over-preview', active >= 0 && inRect(previewRect(), e.clientX, e.clientY));
  }, { passive: true });
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.defaultPrevented || active < 0 || e.target.closest('a, button')) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!inRect(previewRect(), e.clientX, e.clientY)) return;
    const href = projects[active].el.href;
    if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener');
    else location.assign(href);
  });

  // ---------- WebGL ----------
  const VERT = `
    attribute vec2 a_pos;
    varying vec2 vUv;
    void main() { vUv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // Pass 1: the field. Domain-warped fbm (Inigo Quilez's warp, two levels),
  // pulled toward the cursor. RGB = colour, A = raw noise for the dissolve.
  const FIELD = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 u_res;      // field texture size in px
    uniform float u_time;    // seconds
    uniform vec2 u_mouse;    // 0..1, y up
    uniform float u_hover;   // 0..1 cursor presence
    uniform vec3 u_tint;     // active colour (springs between projects)
    uniform float u_warp;    // extra warp; pulses when the project changes
    uniform float u_intro;   // 0..1 fade in on load
    uniform float u_left;    // 1 on wide screens: keep the text column calmer
    uniform vec3 u_focus;    // xy: preview centre (0..1), z: strength of the vortex
    uniform float u_scale;   // noise frequency: each project has its own grain

    vec2 hash2(vec2 p) {                        // sine-free hash (Dave Hoskins): stable over long visits
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);
    }
    float noise(vec2 p) {                       // gradient noise, about -0.7..0.7
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                 mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + 1.0), f - 1.0), u.x), u.y);
    }
    float fbm(vec2 p) {                         // 4 octaves, rotated each step
      float v = 0.0, a = 0.5;
      mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p; a *= 0.5; }
      return v;
    }

    void main() {
      float aspect = u_res.x / u_res.y;
      vec2 p = vec2(vUv.x * aspect, vUv.y);
      vec2 m = vec2(u_mouse.x * aspect, u_mouse.y);

      // Cursor lens: the field is gently drawn in around the pointer.
      vec2 d = p - m;
      float lens = exp(-dot(d, d) * 9.0) * u_hover;
      p -= d * lens * 0.45;

      // Focus vortex: with a project chosen, the smoke turns around the preview.
      vec2 fc = vec2(u_focus.x * aspect, u_focus.y);
      vec2 e = p - fc;
      float fz = exp(-dot(e, e) * 3.0) * u_focus.z;
      float ang = fz * 1.4;
      p = fc + mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * e;

      float t = u_time * 0.045;
      vec2 s = (p - fc) * u_scale + fc * 1.35;     // grain changes around the focus
      vec2 q = vec2(fbm(s + vec2(0.0, t)), fbm(s + vec2(5.2, 1.3 - t)));
      float w = 2.4 + u_warp;
      vec2 r = vec2(fbm(s + w * q + vec2(1.7, 9.2) + 0.6 * t),
                    fbm(s + w * q + vec2(8.3, 2.8) - 0.5 * t));
      float f = fbm(s + (2.6 + u_warp) * r);
      float v = clamp(f * 0.85 + 0.5, 0.0, 1.0);

      // Colour: near-black ground, smoke in the tint, a hot core where folds meet.
      vec3 ground = vec3(0.027, 0.031, 0.027);
      float smoke = smoothstep(0.28, 0.95, v);
      float folds = smoothstep(0.2, 0.9, length(r));
      vec3 col = ground;
      col += u_tint * v * v * 0.10;                       // broad ambient body
      col += u_tint * (smoke * smoke) * 0.42;
      col += u_tint * folds * smoke * 0.30;
      col += mix(u_tint, vec3(1.0), 0.45) * pow(smoke, 5.0) * 0.30;
      col += u_tint * lens * 0.08;
      col += u_tint * smoke * fz * 0.30;                  // the chosen project glows

      // Quieter behind the text: darken the left side on wide screens,
      // the top and bottom everywhere.
      float calm = mix(1.0, smoothstep(-0.15, 0.75, vUv.x), u_left * 0.55);
      // Phones (u_left = 0) have no preview to look at, so the field itself
      // is the show: a shorter dark band at the bottom, behind the footer.
      float lo = mix(0.22, 0.35, u_left);
      calm *= smoothstep(-0.1, lo, vUv.y) * (1.0 - 0.35 * smoothstep(0.75, 1.1, vUv.y));
      col = mix(ground, col, calm * u_intro);

      gl_FragColor = vec4(col, v);
    }`;

  // Pass 2: upscale the field and dissolve up to two media layers into it.
  // A layer appears where its threshold (distance from its centre + noise)
  // drops below its progress, so it condenses out of the smoke.
  const COMPOSE = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D u_field;
    uniform vec2 u_css;       // canvas size in CSS px
    uniform float u_time;
    uniform vec3 u_tint;
    uniform sampler2D u_tex0; uniform vec4 u_rect0; uniform float u_amt0; uniform float u_rad0; uniform float u_asp0; uniform float u_shd0;
    uniform sampler2D u_tex1; uniform vec4 u_rect1; uniform float u_amt1; uniform float u_rad1; uniform float u_asp1; uniform float u_shd1;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    vec3 layer(vec3 col, vec2 px, vec2 nn, sampler2D tex, vec4 rect, float amt, float rad, float asp, float shd, float other) {
      if (amt < 0.002) return col;
      vec2 half_ = rect.zw * 0.5;
      vec2 q = px - (rect.xy + half_);

      // Rounded-rectangle distance (negative inside), for the mask and a soft shadow.
      vec2 b = half_ - rad;
      float sd = length(max(abs(q) - b, 0.0)) + min(max(abs(q).x - b.x, abs(q).y - b.y), 0.0) - rad;
      float inside = 1.0 - smoothstep(-0.75, 0.75, sd);

      // The drop shadow only arrives once the image has nearly condensed,
      // and its inner edge is soft, so the box never shows before the image.
      float shadow = shd * smoothstep(0.7, 1.0, amt) * (1.0 - smoothstep(0.0, 90.0, sd)) * smoothstep(-2.0, 2.0, sd);
      col *= 1.0 - 0.45 * shadow;

      // Dissolve front: grows from the centre with a ragged, noise-driven edge.
      float radial = length(q / half_) * 0.7071;
      float edge = radial * 0.72 + nn.x * 0.5;
      float m = clamp((amt * 1.35 - edge) / 0.09, 0.0, 1.0);

      // While it condenses the image is still liquid: displaced and split.
      float liquid = 1.0 - amt;
      vec2 uv = (px - rect.xy) / rect.zw + (nn - 0.5) * 0.05 * liquid;
      float ra = rect.z / rect.w;                     // cover-fit the texture
      if (asp > ra) uv.x = (uv.x - 0.5) * ra / asp + 0.5;
      else          uv.y = (uv.y - 0.5) * asp / ra + 0.5;
      float k = 0.005 * liquid;
      vec4 c = texture2D(tex, uv);
      c.r = texture2D(tex, uv + vec2(k, 0.0)).r;
      c.b = texture2D(tex, uv - vec2(k, 0.0)).b;

      float a = c.a * m * inside;
      col = mix(col, c.rgb, a);
      // Lit rim on the front. With the other layer on screen too, it fades and
      // is capped, so two stacked fronts never burn out to a white halo.
      float rim = m * (1.0 - m) * 1.65 * inside * (1.0 - other);
      col += u_tint * min(rim, mix(0.42, 0.15, smoothstep(0.0, 0.2, other)));
      return col;
    }

    void main() {
      vec4 fld = texture2D(u_field, vUv);
      vec2 nn = vec2(fld.a, texture2D(u_field, vUv + vec2(0.013, 0.021)).a);
      vec2 px = vUv * u_css;
      vec3 col = fld.rgb;
      col = layer(col, px, nn, u_tex0, u_rect0, u_amt0, u_rad0, u_asp0, u_shd0, u_amt1);
      col = layer(col, px, nn, u_tex1, u_rect1, u_amt1, u_rad1, u_asp1, u_shd1, u_amt0);
      col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;  // dither: no banding
      gl_FragColor = vec4(col, 1.0);
    }`;

  function createRenderer() {
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'high-performance',
    });
    if (!gl || gl.isContextLost()) return null;

    const shaders = [], programs = [], textures = [];
    function compile(type, src) {
      const s = gl.createShader(type);
      shaders.push(s);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(frag) {
      const p = gl.createProgram();
      programs.push(p);
      gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
      gl.bindAttribLocation(p, 0, 'a_pos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
      return { p, u };
    }
    function freeGL() {
      programs.forEach((p) => gl.deleteProgram(p));
      shaders.forEach((s) => gl.deleteShader(s));
      textures.forEach((t) => gl.deleteTexture(t));
      if (buf) gl.deleteBuffer(buf);
      if (fbo) gl.deleteFramebuffer(fbo);
    }
    let field, compose, buf = null, fbo = null;
    try { field = program(FIELD); compose = program(COMPOSE); }
    catch (err) { freeGL(); return null; }   // a driver that can't compile gets the CSS field

    // One triangle that covers the screen.
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Uploads and setup use their own texture unit, so they never disturb
    // the units the compose pass samples from (0 = field, 1 and 2 = layers).
    const SCRATCH = gl.TEXTURE3;
    function makeTex() {
      const t = gl.createTexture();
      textures.push(t);
      gl.activeTexture(SCRATCH);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      return t;
    }
    const blank = makeTex();

    // Half-resolution target for pass 1.
    const fieldTex = makeTex();
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // texture v runs up, like gl_FragCoord

    // ----- sizes and quality -----
    // Quality steps down if frames run long: 0 = full, 1 = coarser field,
    // 2 = 1x compose, 3 = give up and use the CSS field.
    let quality = 0;
    let cssW = 1, cssH = 1, fw = 1, fh = 1, stageBox = null;
    function resize() {
      cssW = Math.max(1, canvas.clientWidth); cssH = Math.max(1, canvas.clientHeight);
      // The compose pass is cheap, so media stays sharp on Retina (up to 2x).
      const dpr = Math.min(window.devicePixelRatio || 1, quality >= 2 ? 1 : 2);
      const fieldScale = quality >= 1 ? 0.34 : 0.5;
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      fw = Math.max(1, Math.round(cssW * fieldScale)); fh = Math.max(1, Math.round(cssH * fieldScale));
      gl.activeTexture(SCRATCH);
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      stageBox = stageVisible() ? stage.getBoundingClientRect() : null;
      if (stageBox) preload();            // images load once a preview box exists
      wake();
    }

    // Where a project's media sits: contained in the stage, centred, in CSS px, y up.
    function rectFor(p) {
      if (!stageBox) return null;
      let w = stageBox.width, h = w / p.ratio;
      if (h > stageBox.height) { h = stageBox.height; w = h * p.ratio; }
      if (p.max) { const s = Math.min(1, p.max / Math.max(w, h)); w *= s; h *= s; }
      const x = stageBox.left + (stageBox.width - w) / 2;
      const top = stageBox.top + (stageBox.height - h) / 2;
      return [x, cssH - (top + h), w, h];
    }

    // The same box in screen coordinates (y down), for click-through.
    function mediaRect(p) {
      const r = rectFor(p);
      const s = slots.find((x) => x.p === p);
      if (!r || !s || s.amt.target !== 1) return null;
      const top = cssH - r[1] - r[3];
      return { left: r[0], top, right: r[0] + r[2], bottom: top + r[3] };
    }

    // Vortex centre: the middle of the preview box, or the finger on phones.
    let touchPt = [0.68, 0.5];
    function focusCentre() {
      if (!stageBox) return touchPt;
      return [(stageBox.left + stageBox.width / 2) / cssW, 1 - (stageBox.top + stageBox.height / 2) / cssH];
    }

    // ----- media: images load early on wide screens, video only after a dwell -----
    function upload(p, source) {
      if (!p.tex) p.tex = makeTex();
      gl.activeTexture(SCRATCH);
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    // Media is only fetched when there is a preview box to show it in (never on phones).
    function loadImage(p) {
      if (!p.img || p.imgLoading || !stageBox) return;
      p.imgLoading = true;
      const im = new Image();
      im.decoding = 'async';
      if (p.i !== 0) im.fetchPriority = 'low';
      im.src = p.img;
      im.decode().then(() => {
        if (dead || p.vidFrames) return;          // video already took over
        upload(p, im); p.texAspect = im.naturalWidth / im.naturalHeight; p.imgReady = true;
        wake();
      }).catch(() => { p.imgFailed = true; });   // broken image: shown by the field alone
    }
    function loadVideo(p) {
      if (!p.video || p.vid || !stageBox) return;
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = p.video;
      p.vid = v;
      // Upload only when the decoder hands us a new frame.
      if ('requestVideoFrameCallback' in v) {
        const onFrame = () => { p.vidFresh = true; wake(); if (p.vid === v) v.requestVideoFrameCallback(onFrame); };
        v.requestVideoFrameCallback(onFrame);
      }
    }
    let preloaded = false;
    const preload = () => {
      if (preloaded) return;
      preloaded = true;
      setTimeout(() => projects.forEach(loadImage), 0);
    };

    // ----- animated state -----
    const S = {
      // Hue is stiffer (near critical) than L and C, so a long hue swing is
      // over before the colour is at full strength.
      L: new Spring(REST_LCH[0], 90, 19), C: new Spring(REST_LCH[1], 90, 19), H: new Spring(REST_LCH[2], 260, 31),
      warp: new Spring(0, 160, 9),          // underdamped: a soft "breath" on change
      mx: new Spring(0.62, 70, 17), my: new Spring(0.5, 70, 17),
      hover: new Spring(0, 40, 13),
      intro: new Spring(0, 18, 8.5),
      focus: new Spring(0, 60, 14),         // vortex strength around the preview
      grain: new Spring(1.35, 40, 12),      // noise frequency
      pace: new Spring(1, 30, 11),          // flow speed (time is integrated, so no jumps)
    };
    S.intro.target = 1;
    const springs = Object.values(S);

    // Two layers so one project can dissolve out while the next condenses in.
    // When both are busy, the one being replaced fades out fast (about 80 ms)
    // before it takes the new project, instead of vanishing in one frame.
    const SOFT = [150, 24], QUICK = [2000, 90];
    const mkSlot = () => ({ p: null, next: null, amt: new Spring(0, SOFT[0], SOFT[1]) });
    const slots = [mkSlot(), mkSlot()];
    function assign(slot, p) {
      slot.p = p; slot.next = null;
      slot.amt.x = 0; slot.amt.v = 0; slot.amt.target = 1;
      [slot.amt.k, slot.amt.c] = SOFT;
    }

    let videoTimer = 0;
    function show(i) {
      const p = projects[i] || null;
      if (p) loadImage(p);
      // Video only after a short dwell, so sweeping the list doesn't download every clip.
      clearTimeout(videoTimer);
      if (p && p.video) videoTimer = setTimeout(() => {
        if (dead) return;
        if (slots.some((s) => s.p === p && s.amt.target === 1)) { loadVideo(p); if (p.vid) p.vid.play().catch(() => {}); }
      }, 220);

      // Only projects with media take a layer; the others are shown by the field alone.
      const pm = p && p.img && !p.imgFailed && stageBox ? p : null;
      let slot = pm ? slots.find((s) => s.p === pm) : null;
      if (slot) {                                   // hovering back: send it home,
        slot.next = null; [slot.amt.k, slot.amt.c] = SOFT;
        for (const s of slots) if (s !== slot && s.p) [s.amt.k, s.amt.c] = QUICK;   // and clear the other one fast
      }
      else if (pm) {
        slot = slots.find((s) => !s.p) || (slots[0].amt.x <= slots[1].amt.x ? slots[0] : slots[1]);
        if (!slot.p || slot.amt.x < 0.02) { if (slot.p && slot.p.vid) slot.p.vid.pause(); assign(slot, pm); }
        else { slot.next = pm; [slot.amt.k, slot.amt.c] = QUICK; }      // fade out first, then take it
      }
      for (const s of slots) {
        if (s !== slot) s.next = null;
        s.amt.target = (s === slot && pm && !s.next) ? 1 : 0;
      }

      // Tint: OKLCH, hue on the short arc.
      const c = p ? p.lch : REST_LCH;
      S.L.target = c[0]; S.C.target = c[1];
      S.H.target = c[2] + 360 * Math.round((S.H.x - c[2]) / 360);
      S.grain.target = p ? p.grain : 1.35;
      S.pace.target = p ? p.pace : 1;
      // No media: the field itself is the preview, so the vortex goes all in.
      S.focus.target = !p ? 0 : (p.img && stageBox ? 0.5 : (stageBox ? 0.8 : 0.9));
      if (p) S.warp.v = Math.min(S.warp.v + 3.2, 4);   // kick: the field stirs, but sweeps never pile up

      for (const q of projects) if (q.vid && q !== p && !slots.some((s) => s.p === q && s.amt.x > 0.01)) q.vid.pause();
      wake();
    }

    // ----- input: the cursor (or a finger) draws the field in -----
    let lastInput = 0;
    function onMove(e) {
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      if (e.pointerType === 'touch' && e.type === 'pointermove' && !touching) return;
      S.mx.target = e.clientX / cssW; S.my.target = 1 - e.clientY / cssH; S.hover.target = 1;
      if (e.pointerType === 'touch') touchPt = [S.mx.target, S.my.target];
      lastInput = performance.now();
      wake();
    }
    let touching = false;
    function onDown(e) {
      if (e.pointerType !== 'touch') return;
      touching = true;
      // Jump the lens to the finger rather than sliding in from the last one.
      S.mx.x = S.mx.target = e.clientX / cssW; S.my.x = S.my.target = 1 - e.clientY / cssH;
      onMove(e);
    }
    function onUp(e) { if (e.pointerType === 'touch') { touching = false; S.hover.target = 0; wake(); } }
    function onOut(e) { if (!e.relatedTarget) { S.hover.target = 0; wake(); } }
    function onVis() { if (document.hidden) stop(); else start(); }
    // A window in the background keeps flowing, at a lower rate.
    let blurred = !document.hasFocus();
    function onBlur() { blurred = true; }
    function onFocus() { blurred = false; wake(); }
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    document.addEventListener('pointerout', onOut);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    // ----- frame loop -----
    // While anything moves, draw every display frame. Once every spring has
    // settled, no video plays and the pointer has been still for a second,
    // the field keeps flowing at 30 fps, which looks the same at this speed;
    // after 10 s of that, 20 fps; in a window without focus, 12 fps.
    let raf = 0, lastRaf = 0, lastDraw = 0, drewLast = false, time = Math.random() * 100, slow = 0, dead = false;
    let settledSince = 0;
    // Phones at rest: the tint drifts through the project hues, one turn a
    // minute, a little lighter than the projects so the smoke reads as colour.
    const DRIFT = { L: 0.74, C: 0.085, degPerSec: 6 };
    const drifting = () => !stageBox && active < 0;
    function wake() { lastInput = Math.max(lastInput, performance.now() - 800); }
    function settled(now) {
      if (now - lastInput < 1000) return false;
      // While drifting, the tint springs follow a slowly moving target on purpose.
      const tintFree = drifting();
      if (!springs.every((s) => s.resting || (tintFree && (s === S.L || s === S.C || s === S.H)))) return false;
      if (!slots.every((s) => s.amt.resting && !s.next)) return false;
      return !projects.some((p) => p.vid && !p.vid.paused);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);

      // Adaptive quality, from the display-frame interval after a frame we drew.
      if (lastRaf && drewLast) {
        const gap = now - lastRaf;
        // Thresholds widen per step, so a browser that caps rAF at 30 fps
        // (battery saver: gaps of ~33 ms) only loses the finer field, not sharp media.
        slow = gap > [22, 40, 50][Math.min(quality, 2)] ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 45) {
          slow = 0; quality++;
          if (quality >= 3) { dropToCSS(); return; }
          resize();
        }
      }
      lastRaf = now;

      if (settled(now)) {
        if (!settledSince) settledSince = now;
        const fps = blurred ? 12 : (now - settledSince > 10000 ? 20 : 30);
        if (now - lastDraw < 1000 / fps - 2) { drewLast = false; return; }
      } else settledSince = 0;
      // Clamped well above the idle frame time, so the flow keeps its pace at 12 fps.
      const dt = Math.min((now - (lastDraw || now)) / 1000, 0.1);
      lastDraw = now; drewLast = true;

      if (drifting()) {
        const h = (REST_LCH[2] + now / 1000 * DRIFT.degPerSec) % 360;
        S.L.target = DRIFT.L; S.C.target = DRIFT.C;
        S.H.target = h + 360 * Math.round((S.H.x - h) / 360);
      }

      for (const s of springs) s.step(dt);
      S.warp.target = 0;
      time += dt * S.pace.x;

      let anyReady = false;
      const slotState = slots.map((s) => {
        const p = s.p;
        const rect = p && rectFor(p);
        // Video: swap in the newest decoded frame. The poster is frame 0, so this is seamless.
        if (p && p.vid && p.vid.readyState >= 2 && (p.vidFresh || !('requestVideoFrameCallback' in p.vid))) {
          upload(p, p.vid); p.vidFresh = false; p.vidFrames = true;
          p.texAspect = p.vid.videoWidth / p.vid.videoHeight || p.ratio;
        }
        const ready = !!(p && rect && p.tex && (p.imgReady || p.vidFrames));
        // Not decoded yet: hold at 0, so the dissolve starts when there is something to show.
        if (p && !ready && s.amt.target === 1) { s.amt.x = 0; s.amt.v = 0; }
        else s.amt.step(dt);
        if (s.amt.target === 0 && s.amt.x < 0.02) {
          if (s.next) { if (s.p && s.p.vid) s.p.vid.pause(); assign(s, s.next); }
          else if (s.amt.x < 0.002) { if (s.p && s.p.vid) s.p.vid.pause(); s.p = null; }
        }
        anyReady = anyReady || ready;
        return { p, rect, ready };
      });
      // Chroma eases off while the hue is far from its target, so the middle
      // of a long swing is a soft blend, not a third, muddy colour.
      const hueLeft = Math.abs(S.H.x - S.H.target);
      const tint = lchToRgb(S.L.x, Math.max(0, S.C.x) * (1 - 0.4 * Math.min(1, Math.max(0, (hueLeft - 25) / 95))), S.H.x);

      // Pass 1: field into the small texture.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, fw, fh);
      gl.useProgram(field.p);
      gl.uniform2f(field.u.u_res, fw, fh);
      gl.uniform1f(field.u.u_time, time);
      gl.uniform2f(field.u.u_mouse, S.mx.x, S.my.x);
      gl.uniform1f(field.u.u_hover, S.hover.x);
      gl.uniform3fv(field.u.u_tint, tint);
      gl.uniform1f(field.u.u_warp, S.warp.x);
      gl.uniform1f(field.u.u_intro, Math.min(1, Math.max(0, S.intro.x)));
      gl.uniform1f(field.u.u_left, stageBox ? 1 : 0);
      const fc = focusCentre();
      gl.uniform3f(field.u.u_focus, fc[0], fc[1], Math.max(0, S.focus.x));
      gl.uniform1f(field.u.u_scale, S.grain.x);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2: compose to the screen.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compose.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      gl.uniform1i(compose.u.u_field, 0);
      gl.uniform2f(compose.u.u_css, cssW, cssH);
      gl.uniform1f(compose.u.u_time, time);
      gl.uniform3fv(compose.u.u_tint, tint);
      slotState.forEach(({ p, rect, ready }, n) => {
        const s = slots[n];
        gl.activeTexture(gl.TEXTURE1 + n);
        gl.bindTexture(gl.TEXTURE_2D, ready ? p.tex : blank);
        gl.uniform1i(compose.u['u_tex' + n], 1 + n);
        gl.uniform4fv(compose.u['u_rect' + n], ready ? rect : [0, 0, 1, 1]);
        gl.uniform1f(compose.u['u_amt' + n], ready ? Math.min(1, Math.max(0, s.amt.x)) : 0);
        gl.uniform1f(compose.u['u_rad' + n], p ? p.radius : 0);
        gl.uniform1f(compose.u['u_asp' + n], p ? p.texAspect : 1);
        gl.uniform1f(compose.u['u_shd' + n], p && p.frame ? 1 : 0);
      });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function start() { if (!raf && !dead) { lastRaf = lastDraw = 0; drewLast = false; slow = 0; raf = requestAnimationFrame(frame); } }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    function destroy() {
      dead = true;
      stop();
      clearTimeout(videoTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      projects.forEach((p) => {
        if (p.vid) { p.vid.pause(); p.vid.removeAttribute('src'); p.vid.load(); p.vid = null; }
        p.tex = null; p.imgReady = p.vidFrames = p.vidFresh = false; p.imgLoading = false;
      });
      if (!gl.isContextLost()) freeGL();
    }

    resize();
    start();
    return { show, destroy, mediaRect };
  }

  // ---------- boot ----------
  let gpuTooSlow = false;
  function enableGL() {
    if (renderer || reduceMQ.matches || gpuTooSlow) return;
    renderer = createRenderer();
    if (!renderer) return;
    root.classList.add('gl');
    showFallback(-1);                  // hide any <img> left from reduced motion
    renderer.show(active);
  }
  function disableGL() {
    if (!renderer) return;
    renderer.destroy();
    renderer = null;
    root.classList.remove('gl');
    showFallback(active);
  }
  // Last quality step: this GPU can't hold the field, so keep the CSS one for the visit.
  function dropToCSS() { gpuTooSlow = true; disableGL(); }

  // A lost context (GPU reset, too many tabs) drops to the CSS field.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); disableGL(); });
  // Turning reduced motion on or off mid-visit switches mode without a reload.
  reduceMQ.addEventListener('change', () => (reduceMQ.matches ? disableGL() : enableGL()));

  enableGL();
  if (!renderer) showFallback(active);   // no WebGL or reduced motion: images ready before the first hover
})();
