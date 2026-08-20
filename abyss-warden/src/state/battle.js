import { TOWERS, TOWER_ORDER, SELL_REFUND, resolveStats, buildCost, upgradeCost, branchCost, drawTower, drawFlag } from '../game/towers.js';
import { buildBattleBackground, makeCausticTile, drawCaustics, drawTerrainDynamics } from '../render/terrain.js';
import { ENEMIES, ELITE, drawEnemyBody } from '../game/enemies.js';
import { HEROES, drawHero, xpForLevel } from '../game/heroes.js';
import { BOSSES, drawBossAccents } from '../game/bosses.js';
import { level01 } from '../game/levels/level01.js';
import { metaEffects } from '../game/meta.js';
import { awardFeat, FEATS } from '../game/feats.js';
import { S } from '../data/strings.js';
import { sfx } from '../audio/synth.js';
import { setMood, setIntensity, setMuffled, duckMusic } from '../audio/music.js';
import { Particles } from '../render/particles.js';
import { happytime } from '../platform/portal.js';
import { SpatialGrid } from '../engine/grid.js';
import { makeRng } from '../engine/rng.js';
import { INK, inkStroke, glowCircle, ring, drawText, drawTextO, drawButton, uiRoundButton, hitRect, hexIcon, roundRect, panel, ribbonBanner } from '../render/draw.js';

const TAU = Math.PI * 2;
const PAD_R = 20;
const BETWEEN_WAVE_TIME = 12;
const PRIORITIES = ['first', 'last', 'strong', 'weak'];
const SHELL_SPEED = 260;
// nothing may be slowed below this fraction of its base speed
const SLOW_FLOOR = 0.35;

export const ZONE_PALETTES = [
  { // Sunlit Shelf — bright sandy-green reef floor under aqua light
    ground: '#96b184', groundLight: '#b8cf9e', groundDark: '#6d8a62',
    cliff: '#8a795a', cliffTop: '#a89a6d', cliffTopLight: '#cbbd8c',
    pool: '#1d6d80', poolDeep: '#0c3d4d',
    pathEdge: '#5d4f33', path: '#c9b078', pathLight: '#e2cf98',
    tint: 'rgba(50,180,200,0.14)',
    glow: 'rgba(90,220,255,0.3)', mote: '#aef4ff',
  },
  { // The Trench — saturated violet canyon
    ground: '#5d5480', groundLight: '#7d73a5', groundDark: '#443d61',
    cliff: '#4a3f63', cliffTop: '#6d6191', cliffTopLight: '#8d82b0',
    pool: '#231847', poolDeep: '#120b2c',
    pathEdge: '#2c2340', path: '#8d80a8', pathLight: '#aa9dc4',
    tint: 'rgba(90,70,170,0.13)',
    glow: 'rgba(190,140,255,0.3)', mote: '#c9b0ff',
  },
  { // Hadal Rift — scorched rust rock, ember light
    ground: '#6d4a45', groundLight: '#8d6459', groundDark: '#4d332f',
    cliff: '#4a2f2c', cliffTop: '#6d4a42', cliffTopLight: '#8d6553',
    pool: '#1c0e10', poolDeep: '#0c0507',
    pathEdge: '#33201c', path: '#9a7a62', pathLight: '#b8957c',
    tint: 'rgba(255,100,60,0.08)',
    glow: 'rgba(255,110,110,0.3)', mote: '#ffab8f',
  },
  { // Cold Seep — methane ice over pale grey silt, hard blue light
    ground: '#8fa3ad', groundLight: '#c2d4dc', groundDark: '#61757f',
    cliff: '#5d7581', cliffTop: '#8fa9b6', cliffTopLight: '#c3d8e2',
    pool: '#2f6f86', poolDeep: '#123244',
    pathEdge: '#455c66', path: '#d3e3ea', pathLight: '#f2fafd',
    tint: 'rgba(150,215,255,0.12)',
    glow: 'rgba(190,240,255,0.35)', mote: '#e6faff',
  },
];

// Catmull-Rom smoothing: waypoints become flowing curves (KR-style roads).
// Every consumer (movement, rally, portals, terrain) inherits the curves.
function smoothPath(raw) {
  if (raw.length < 3) return raw;
  const pts = raw.map(p => ({ x: p[0], y: p[1] }));
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const segs = Math.max(4, Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 16));
    for (let j = 0; j < segs; j++) {
      const t = j / segs, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ]);
    }
  }
  out.push([pts[pts.length - 1].x, pts[pts.length - 1].y]);
  return out;
}

function buildPath(rawIn) {
  const raw = smoothPath(rawIn);
  const pts = raw.map(p => ({ x: p[0], y: p[1] }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const total = cum[cum.length - 1];
  return {
    pts, cum, total,
    at(d, out) {
      d = Math.max(0, Math.min(d, total));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      out.x = a.x + (b.x - a.x) * t;
      out.y = a.y + (b.y - a.y) * t;
      out.angle = Math.atan2(b.y - a.y, b.x - a.x);
      return out;
    },
  };
}

// Deliberate pad placement: pads march along the route at even intervals,
// alternating sides and hugging the road — replaces the hand-scattered spots
// so every level reads intentional. Pad count comes from the level data.
function normalizePads(L, paths, W, H) {
  const n = (L.pads || []).length || 10;
  const out = [];
  const total = paths.reduce((s, p) => s + p.total, 0);
  const tmp = { x: 0, y: 0, angle: 0 };
  let padsLeft = n;
  paths.forEach((p, pi) => {
    const count = pi === paths.length - 1 ? padsLeft
      : Math.max(1, Math.min(padsLeft - (paths.length - 1 - pi), Math.round(n * (p.total / total))));
    padsLeft -= count;
    for (let i = 0; i < count; i++) {
      const d = p.total * (i + 0.55) / (count + 0.1);
      p.at(d, tmp);
      const side = (i + pi) % 2 === 0 ? 1 : -1;
      const a = tmp.angle + Math.PI / 2 * side;
      let x = tmp.x + Math.cos(a) * 54;
      let y = tmp.y + Math.sin(a) * 54;
      x = Math.max(34, Math.min(W - 34, x));
      y = Math.max(92, Math.min(H - 34, y));
      out.push([x, y]);
    }
  });
  // The HUD's buttons are hit-tested before pads, so a pad underneath one is
  // simply unclickable. Run this AFTER the spacing pass too — spacing can shove
  // a pad straight back under a button.
  const noGo = [
    { x: W - 306, y: 8, w: 190, h: 32 },     // call/launch wave
    { x: W - 108, y: 8, w: 46, h: 32 },      // speed
    { x: W - 54, y: 8, w: 44, h: 32 },       // pause
    { x: 146, y: H - 64, w: 54, h: 54 },     // hero ability
    { x: W / 2 - 62, y: H - 62, w: 52, h: 52 },  // reinforcements
    { x: W / 2 + 10, y: H - 62, w: 52, h: 52 },  // torpedo
    { x: 8, y: H - 72, w: 282, h: 64 },      // hero plaque
    { x: 8, y: 6, w: 336, h: 42 },           // stat plaque
  ];
  function clearHud() {
    const M = 30;
    for (const pad of out) {
      for (const r of noGo) {
        const l = r.x - M, t = r.y - M, rr = r.x + r.w + M, bb = r.y + r.h + M;
        if (pad[0] < l || pad[0] > rr || pad[1] < t || pad[1] > bb) continue;
        // try each escape direction, clamp it, and keep the nearest one that is
        // genuinely outside afterwards — pushing "down" into the field's bottom
        // clamp just puts the pad back where it started.
        const cands = [[pad[0], t - 1], [pad[0], bb + 1], [l - 1, pad[1]], [rr + 1, pad[1]]]
          .map(([cx, cy]) => [
            Math.max(34, Math.min(W - 34, cx)),
            Math.max(92, Math.min(H - 34, cy)),
          ])
          // must clear EVERY button, not just this one — the two spell buttons
          // sit side by side, so escaping one used to land inside the other
          .filter(([cx, cy]) => noGo.every(o => cx < o.x - M || cx > o.x + o.w + M
                                             || cy < o.y - M || cy > o.y + o.h + M))
          .sort((a, b) => Math.hypot(a[0] - pad[0], a[1] - pad[1])
                        - Math.hypot(b[0] - pad[0], b[1] - pad[1]));
        if (cands.length) { pad[0] = cands[0][0]; pad[1] = cands[0][1]; }
      }
    }
  }
  clearHud();

  // push apart any pads that ended up crowding
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < i; j++) {
        const dx = out[i][0] - out[j][0], dy = out[i][1] - out[j][1];
        const dd = Math.hypot(dx, dy) || 1;
        if (dd < 58) {
          const push = (58 - dd) / 2;
          out[i][0] += dx / dd * push; out[i][1] += dy / dd * push;
          out[j][0] -= dx / dd * push; out[j][1] -= dy / dd * push;
        }
      }
      out[i][0] = Math.max(34, Math.min(W - 34, out[i][0]));
      out[i][1] = Math.max(92, Math.min(H - 34, out[i][1]));
    }
  }
  clearHud();
  return out;
}

// Closest point on a path to (x, y) — used for drone rally points.
function nearestOnPath(path, x, y) {
  let best = null, bd = Infinity;
  const step = 12;
  const tmp = { x: 0, y: 0, angle: 0 };
  for (let d = 0; d <= path.total; d += step) {
    path.at(d, tmp);
    const dd = (tmp.x - x) ** 2 + (tmp.y - y) ** 2;
    if (dd < bd) { bd = dd; best = { x: tmp.x, y: tmp.y, d }; }
  }
  return best;
}

export function createBattle(game, data = {}) {
  const { W, H } = game;
  let L = data.level || level01;
  const diff = data.difficulty || 'standard';
  const challenge = data.challenge || null;
  const meta = challenge === 'heroic' ? metaEffects({ meta: {} }) : metaEffects(game.save);
  const pal = ZONE_PALETTES[L.zone || 0];

  const diffMods = {
    casual: { hp: 0.8, gold: 80, bounty: 1 },
    standard: { hp: 1, gold: 0, bounty: 1 },
    veteran: { hp: 1.25, gold: -30, bounty: 0.9 },
  }[diff];

  let waves = L.waves;
  let lives = L.lives;
  const endless = !!L.endless;
  let allowedTowers = TOWER_ORDER;
  if (challenge === 'iron') {
    waves = L.waves.slice(-6).map(w => ({ ...w, groups: w.groups.map(g => ({ ...g })) }));
    lives = 1;
    allowedTowers = L.ironTowers || TOWER_ORDER.slice(0, 3);
  } else if (challenge === 'heroic') {
    lives = 10;
  }
  const hpMul = diffMods.hp * (challenge === 'heroic' ? 1.2 : 1);

  const paths = (L.paths || [L.path]).map(buildPath);
  // battle-local level copy: normalized pad layout + no cross-battle mutation
  L = { ...L, pads: normalizePads(L, paths, W, H) };
  let bgBuilt = buildBattleBackground(L, paths, pal, W, H);
  function rebuildBg() { bgBuilt = buildBattleBackground(L, paths, pal, W, H); }
  const causticTile = makeCausticTile();
  const rng = makeRng(0xabc123);

  // Endless siege: procedurally-scaled waves, boss every 10th
  if (endless) {
    const pool = [
      ['fry', 3], ['mite', 2], ['isopod', 9], ['barracuda', 7], ['jelly', 11],
      ['worm', 11], ['stalker', 10], ['ray', 8], ['hermit', 11], ['husk', 9],
      ['lancer', 10], ['angler', 14], ['brood', 15], ['polyp', 13], ['behemoth', 34],
      ['glider', 9], ['shaman', 15], ['juggernaut', 22],
    ];
    const bossCycle = ['maw', 'carapace', 'matron', 'choir', 'undertow', 'leviathan'];
    waves = [];
    for (let i = 0; i < 200; i++) {
      if (i % 10 === 9) {
        waves.push({
          boss: true, intro: S.endless.intro,
          groups: [
            { type: 'boss_' + bossCycle[((i / 10) | 0) % bossCycle.length], count: 1, gap: 1, hpMul: 0.55 + i / 26 },
            { type: 'jelly', count: 3, gap: 2.4, delay: 15, hpMul: 1 + i * 0.03 },
          ],
        });
        continue;
      }
      let budget = 34 + i * 7;
      const groups = [];
      let delay = 0;
      while (budget > 0 && groups.length < 4) {
        const pick = pool[(rng.float() * Math.min(pool.length, 4 + i)) | 0];
        const count = Math.max(3, Math.min(16, Math.round(budget / pick[1] / 2)));
        groups.push({
          type: pick[0], count, gap: Math.max(0.3, 1.4 - i * 0.012), delay,
          elite: i > 12 && rng.float() < 0.22,
          path: (rng.float() * paths.length) | 0,
          hpMul: 1 + i * 0.035,
        });
        budget -= count * pick[1];
        delay += 3;
      }
      waves.push({ groups });
    }
  }
  const particles = new Particles(800);
  const grid = new SpatialGrid(80);

  const B = {
    time: 0, speed: 1,
    gold: L.startGold + diffMods.gold + meta.startGold,
    lives,
    waveIndex: -1,
    phase: 'prep',
    countdown: 0,
    enemies: [], towers: new Map(), projectiles: [], shells: [], bolts: [],
    rings: [], zones: [], floats: [], corpses: [], flashes: [],
    spawner: null, menu: null, hover: { x: -1, y: -1 }, rallyArm: null,
    paused: false, shake: 0, leakFlash: 0, banner: null,
    overTimer: 0, outcome: null, kills: 0, goldEarned: 0,
    hero: null, boss: null,
    spellArm: null, reinfCd: 0, torpCd: 0, flareCd: 0, reinf: [], torpedoes: [], mines: [],
    coins: [], goldPulse: 0, inspect: null, speech: null, scorch: [], waveMarkers: [], flourish: null,
    hitStop: 0, whiteFlash: 0, letterbox: 0, lastLeakType: null,
    coinStreak: 0, coinStreakT: 0, hitStopCd: 0,
    introCards: [],
    // the trench goes dark from the Hadal Rift down; levels can override
    dark: L.dark !== undefined ? L.dark : (L.zone || 0) >= 2,
    flares: [],
  };
  // exposed for later phases (hero/boss modules) & result screen
  const ctxBattle = { B, L, paths, meta, diff, challenge };

  const UI = {
    waveBtn: { x: W - 306, y: 8, w: 190, h: 32, label: '' },
    speedBtn: { x: W - 108, y: 8, w: 46, h: 32, label: '1×' },
    pauseBtn: { x: W - 54, y: 8, w: 44, h: 32, label: '' },
    abilityBtn: { x: 146, y: H - 64, w: 54, h: 54, label: '' },
    spellReinf: { x: W / 2 - 62, y: H - 62, w: 52, h: 52, label: '' },
    spellTorp: { x: W / 2 + 10, y: H - 62, w: 52, h: 52, label: '' },
    spellFlare: { x: W / 2 + 82, y: H - 62, w: 52, h: 52, label: '' },
  };
  // The flare only exists where there is dark to burn off, so lit stations keep
  // the original two-button row and dark ones centre a row of three.
  {
    const n = B.dark ? 3 : 2;
    const pitch = 72, left = W / 2 - ((n - 1) * pitch) / 2 - 26;
    UI.spellReinf.x = left;
    UI.spellTorp.x = left + pitch;
    UI.spellFlare.x = left + pitch * 2;
  }
  const REINF_CD = 15, TORP_CD = 55, FLARE_CD = 18;

  // on-screen spawn portal positions (recomputed after path shifts)
  // interactive vent trap: one per level, tap to erupt (heavy AoE + slow)
  let trap = null;
  if (!challenge) {
    const tmpT = { x: 0, y: 0, angle: 0 };
    for (const frac of [0.5, 0.36, 0.64, 0.25]) {
      paths[0].at(paths[0].total * frac, tmpT);
      const a = tmpT.angle + Math.PI / 2;
      const tx = tmpT.x + Math.cos(a) * 36, ty = tmpT.y + Math.sin(a) * 36;
      if (tx > 30 && tx < W - 30 && ty > 90 && ty < H - 40 &&
          !L.pads.some(p => Math.hypot(p[0] - tx, p[1] - ty) < 46)) {
        trap = { x: tx, y: ty, cd: 0, near: { x: tmpT.x, y: tmpT.y } };
        break;
      }
    }
  }
  const TRAP_CD = 40;

  let portals = [];
  function computePortals() {
    portals = [];
    const tmp2 = { x: 0, y: 0, angle: 0 };
    paths.forEach((p, pi) => {
      for (let d = 0; d <= p.total; d += 6) {
        p.at(d, tmp2);
        if (tmp2.x > 20 && tmp2.x < W - 20 && tmp2.y > 64 && tmp2.y < H - 20) {
          portals.push({ x: tmp2.x, y: tmp2.y, angle: tmp2.angle, path: pi, d });
          break;
        }
      }
    });
  }
  computePortals();
  function portalDistFor(pathIdx) {
    const po = portals.find(p => p.path === pathIdx);
    return po ? po.d : 0;
  }

  // ---------- hero ----------
  const heroId = data.hero || game.save.hero || 'karrick';
  if (HEROES[heroId]) {
    const hd = HEROES[heroId];
    const startPos = paths[0].at(Math.max(0, paths[0].total - 90), { x: 0, y: 0, angle: 0 });
    B.hero = {
      def: hd, x: startPos.x, y: startPos.y - 36, tx: startPos.x, ty: startPos.y - 36,
      hp: hd.hp, maxHp: hd.hp, level: 1, xp: 0,
      atkT: 0, abilityCd: 0, respawnT: 0, dead: false, selected: false,
      target: null, engaged: false, hurtT: 0,
    };
  }

  function heroDmg(h) { return h.def.dmg + h.def.levelDmg * (h.level - 1); }

  function heroXp(amount, x, y) {
    const h = B.hero;
    if (!h || h.dead) return;
    if (Math.hypot(h.x - x, h.y - y) > 180) return;
    h.xp += amount;
    while (h.level < 10 && h.xp >= xpForLevel(h.level)) {
      h.xp -= xpForLevel(h.level);
      h.level++;
      h.maxHp += h.def.levelHp;
      h.hp = h.maxHp;
      addFloat(h.x, h.y - 26, 'LEVEL ' + h.level, '#8df0c0', 14);
      addRing(h.x, h.y, 40, 'rgba(140,240,190,0.8)', 0.6);
      sfx.levelUp();
    }
  }

  function heroRelease(h) {
    if (h.target && h.target.blockedBy === h) h.target.blockedBy = null;
    h.target = null;
    h.engaged = false;
  }

  function castAbility() {
    const h = B.hero;
    if (!h || h.dead || h.abilityCd > 0) return;
    const ab = h.def.ability;
    h.abilityCd = ab.cd * meta.heroCdMul;
    B.tutAbility = true;
    sfx.heroAbility();
    if (ab.id === 'mine') {
      B.mines.push({ x: h.x, y: h.y, dmg: ab.dmg + h.level * 8, radius: ab.radius, arm: 0.5 });
      if (B.mines.length > 6) B.mines.shift();
      addRing(h.x, h.y, 22, 'rgba(255,190,110,0.85)', 0.4);
      return;
    }
    addRing(h.x, h.y, ab.radius, 'rgba(140,240,190,0.85)', 0.55);
    if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.5);
    if (ab.id === 'restore') {
      // mend every nearby ally, scald the enemy
      const healAmt = ab.heal + h.level * 10;
      for (const tw of B.towers.values()) {
        if (!tw.drones) continue;
        for (const dr of tw.drones) {
          if (!dr.dead && Math.hypot(dr.x - h.x, dr.y - h.y) <= ab.radius) {
            dr.hp = Math.min(dr.max, dr.hp + healAmt);
            addFloat(dr.x, dr.y - 14, '+', '#7df3a8', 13);
          }
        }
      }
      for (const r of B.reinf) {
        if (!r.dead && Math.hypot(r.x - h.x, r.y - h.y) <= ab.radius) r.hp = Math.min(r.max, r.hp + healAmt);
      }
      h.hp = Math.min(h.maxHp, h.hp + healAmt * 0.5);
    }
    grid.query(h.x, h.y, ab.radius, tmpQuery);
    for (const e of tmpQuery) {
      if (e.dead || e.hidden) continue;
      damageEnemy(e, (ab.dmg || 0) + h.level * 6, ab.id === 'squall' || ab.id === 'restore' ? 'magic' : 'physical');
      if (ab.stun && !e.dead && !e.boss) e.status.stun = Math.max(e.status.stun, ab.stun);
    }
    if (ab.slow) {
      B.zones.push({ x: h.x, y: h.y, r: ab.radius, slow: ab.slow, t: 0, dur: ab.slowDur });
    }
  }

  function updateHero(dt) {
    const h = B.hero;
    if (!h) return;
    if (h.dead) {
      h.respawnT -= dt;
      if (h.respawnT <= 0) {
        h.dead = false;
        h.hp = h.maxHp;
        const p = paths[0].at(Math.max(0, paths[0].total - 90), tmpPos);
        h.x = h.tx = p.x; h.y = h.ty = p.y - 36;
        addRing(h.x, h.y, 30, 'rgba(140,240,190,0.8)');
      }
      return;
    }
    h.hurtT = Math.max(0, h.hurtT - dt);
    h.abilityCd = Math.max(0, h.abilityCd - dt);
    h.atkT -= dt;
    // medic aura: mend nearby machines and divers
    if (h.def.healAura) {
      const au = h.def.healAura;
      for (const tw of B.towers.values()) {
        if (!tw.drones) continue;
        for (const dr of tw.drones) {
          if (!dr.dead && dr.hp < dr.max && Math.hypot(dr.x - h.x, dr.y - h.y) <= au.radius) {
            dr.hp = Math.min(dr.max, dr.hp + au.hps * dt);
          }
        }
      }
      for (const r of B.reinf) {
        if (!r.dead && r.hp < r.max && Math.hypot(r.x - h.x, r.y - h.y) <= au.radius) {
          r.hp = Math.min(r.max, r.hp + au.hps * dt);
        }
      }
    }
    // movement
    const dxm = h.tx - h.x, dym = h.ty - h.y;
    const dm = Math.hypot(dxm, dym);
    if (dm > 6) {
      heroRelease(h);
      h.x += dxm / dm * Math.min(h.def.speed * dt, dm);
      h.y += dym / dm * Math.min(h.def.speed * dt, dm);
      return;
    }
    if (h.def.melee) {
      // validate / acquire target
      if (h.target && (h.target.dead || h.target.hidden || h.target.def.flying)) heroRelease(h);
      if (!h.target) {
        let best = null, bd = Infinity;
        grid.query(h.x, h.y, 110, tmpQuery);
        for (const e of tmpQuery) {
          if (e.dead || e.hidden || e.def.flying || e.dist < 0) continue;
          if (e.blockedBy && e.blockedBy !== h) continue;
          const d = (e.x - h.x) ** 2 + (e.y - h.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { h.target = best; best.blockedBy = h; }
      }
      if (h.target) {
        const dx = h.target.x - h.x, dy = h.target.y - h.y;
        const d = Math.hypot(dx, dy);
        if (d > 24) {
          h.x += dx / d * Math.min(h.def.speed * dt, d);
          h.y += dy / d * Math.min(h.def.speed * dt, d);
        } else if (h.atkT <= 0) {
          h.atkT = 1 / h.def.rate;
          const tgt = h.target;
          damageEnemy(tgt, heroDmg(h), 'physical');
          particles.burst(tgt.x, tgt.y, 4, { color: '#ffe2a8', speed: 50, life: 0.2, size: 1.5, glow: true });
          addFlash((h.x + tgt.x) / 2, (h.y + tgt.y) / 2, Math.atan2(tgt.y - h.y, tgt.x - h.x));
          sfx.clash();
          if (!tgt.dead) {
            h.hp -= tgt.def.melee * (tgt.def.droneBane ? 1.5 : 1) * (tgt.boss ? 2 : 1) * (1 - h.def.armor);
            h.hurtT = 0.15;
            if (h.hp <= 0) {
              h.hp = 0; h.dead = true; h.respawnT = h.def.respawn;
              heroRelease(h);
              particles.burst(h.x, h.y, 14, { color: '#9fd4ea', speed: 90, life: 0.5, size: 2.5, glow: true });
              sfx.heroDown();
            }
          }
        }
      }
    } else if (h.atkT <= 0) {
      // ranged caster: mini chain zap
      grid.query(h.x, h.y, h.def.range, tmpQuery);
      const cands = tmpQuery.filter(targetable);
      if (cands.length) {
        h.atkT = 1 / h.def.rate;
        cands.sort((a, b) => b.dist - a.dist);
        const hit = cands.slice(0, h.def.chains || 1);
        const pts = [{ x: h.x, y: h.y }];
        let dmg = heroDmg(h);
        for (const e of hit) {
          pts.push({ x: e.x, y: e.y });
          damageEnemy(e, dmg, 'magic');
          dmg *= 0.7;
        }
        B.bolts.push({ segs: makeBoltSegs(pts), t: 0, life: 0.14 });
        sfx.zap();
      }
    }
  }

  // ---------- global spells ----------

  function castReinforcements(x, y) {
    B.reinfCd = REINF_CD;
    B.tutReinf = true;
    const count = 2 + meta.reinfPlus;
    const hp = meta.reinfPlus ? 170 : 120;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      B.reinf.push({
        x: x + Math.cos(a) * 16, y: y + Math.sin(a) * 16,
        hp, max: hp, ttl: 14, target: null, atkT: 0, hurtT: 0, dead: false,
      });
    }
    addRing(x, y, 40, 'rgba(140,240,190,0.9)', 0.5);
    sfx.reinf();
  }

  // A flare buys back vision, not damage. It is the counterplay to being caught
  // in the dark: burn a cooldown to see, shoot what you found, then it dies down.
  function castFlare(x, y) {
    B.flareCd = FLARE_CD;
    B.flares.push({ x, y, r: 170, r0: 170, life: 6 });
    addRing(x, y, 90, 'rgba(255,226,150,0.8)', 0.6);
    addFlash(x, y, 0, true);
    sfx.boom();
  }

  function castTorpedo(x, y) {
    B.torpCd = TORP_CD;
    B.torpedoes.push({ x, y, t: 0, dur: 0.9 });
    game.save.stats.torps++;
    if (game.save.stats.torps >= 10) battleFeat('torpedo');
    sfx.torpDrop();
  }

  function updateReinf(dt) {
    for (const r of B.reinf) {
      if (r.dead) continue;
      r.ttl -= dt;
      r.hurtT = Math.max(0, r.hurtT - dt);
      if (r.ttl <= 0) {
        r.dead = true;
        if (r.target && r.target.blockedBy === r) r.target.blockedBy = null;
        particles.burst(r.x, r.y, 6, { color: '#8df0c0', speed: 50, life: 0.4, size: 2, glow: true });
        continue;
      }
      if (r.target && (r.target.dead || r.target.hidden || r.target.def.flying)) {
        if (r.target.blockedBy === r) r.target.blockedBy = null;
        r.target = null;
      }
      if (!r.target) {
        let best = null, bd = Infinity;
        grid.query(r.x, r.y, 80, tmpQuery);
        for (const e of tmpQuery) {
          if (e.dead || e.hidden || e.def.flying || e.blockedBy || e.dist < 0) continue;
          const d = (e.x - r.x) ** 2 + (e.y - r.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { r.target = best; best.blockedBy = r; }
      }
      if (r.target) {
        const dx = r.target.x - r.x, dy = r.target.y - r.y;
        const d = Math.hypot(dx, dy);
        if (d > 18) {
          r.x += dx / d * Math.min(90 * dt, d);
          r.y += dy / d * Math.min(90 * dt, d);
        } else {
          r.atkT -= dt;
          if (r.atkT <= 0 && !r.target.dead) {
            r.atkT = 1;
            const tgt = r.target;
            damageEnemy(tgt, 9, 'physical');
            addFlash((r.x + tgt.x) / 2, (r.y + tgt.y) / 2, 0);
            sfx.clash();
            if (!tgt.dead) {
              r.hp -= tgt.def.melee * (tgt.boss ? 2.5 : 1);
              r.hurtT = 0.15;
              if (r.hp <= 0) {
                r.dead = true;
                if (tgt.blockedBy === r) tgt.blockedBy = null;
                particles.burst(r.x, r.y, 8, { color: '#9fd4ea', speed: 70, life: 0.4, size: 2, glow: true });
              }
            }
          }
        }
      }
    }
    for (let i = B.reinf.length - 1; i >= 0; i--) if (B.reinf[i].dead) B.reinf.splice(i, 1);

    // limpet mines: arm, then pop on contact
    for (let i = B.mines.length - 1; i >= 0; i--) {
      const m = B.mines[i];
      m.arm = Math.max(0, m.arm - dt);
      if (m.arm > 0) continue;
      grid.query(m.x, m.y, 24, tmpQuery);
      const hit = tmpQuery.find(e => !e.dead && !e.hidden && !e.def.flying);
      if (hit) {
        B.mines.splice(i, 1);
        addRing(m.x, m.y, m.radius, 'rgba(255,190,110,0.9)', 0.45);
        addFlash(m.x, m.y, 0, true);
        if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.5);
        sfx.boom();
        grid.query(m.x, m.y, m.radius, tmpQuery);
        for (const e of tmpQuery) {
          if (e.dead || e.hidden || e.def.flying) continue;
          damageEnemy(e, m.dmg, 'physical');
        }
      }
    }

    for (let i = B.torpedoes.length - 1; i >= 0; i--) {
      const tp = B.torpedoes[i];
      tp.t += dt;
      if (tp.t >= tp.dur) {
        B.torpedoes.splice(i, 1);
        const radius = 85 * meta.torpMul;
        const dmg = 160 * meta.torpMul;
        addRing(tp.x, tp.y, radius, 'rgba(255,200,120,0.95)', 0.5);
        addFlash(tp.x, tp.y, 0, true);
        if (game.save.settings.shake) B.shake = Math.max(B.shake, 1);
        sfx.boom();
        grid.query(tp.x, tp.y, radius, tmpQuery);
        for (const e of tmpQuery) {
          if (e.dead || e.hidden) continue;
          damageEnemy(e, dmg, null); // true damage: ignores armour and wards
        }
      }
    }
  }

  // ---------- boss api ----------
  const bossApi = {
    spawn(type, boss, backOff = 0, elite = false) {
      spawnEnemy(type, { dist: Math.max(0, boss.dist - 40 - backOff), path: boss.pathIdx, elite });
    },
    banner(txt) { setBanner(txt, 4); sfx.bossRoar(); sfx.phaseSting(); duckMusic(0.3, 0.7); },
    ring(x, y, r, c) { addRing(x, y, r, c, 0.6); },
    heal(boss, frac) {
      boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * frac);
      addFloat(boss.x, boss.y - 34, '↺', '#9fe89f', 18);
    },
    disableNearestTower(boss, dur) {
      let best = null, bd = Infinity;
      for (const tw of B.towers.values()) {
        const d = (tw.x - boss.x) ** 2 + (tw.y - boss.y) ** 2;
        if (d < bd) { bd = d; best = tw; }
      }
      if (best) {
        best.disabled = dur;
        addRing(best.x, best.y, 34, 'rgba(255,214,130,0.9)', 0.6);
        addFloat(best.x, best.y - 28, 'DAZZLED', '#ffe66f', 12);
      }
    },
    disableRandomTower(dur) {
      const arr = [...B.towers.values()];
      if (!arr.length) return;
      const tw = arr[Math.floor(rng.float() * arr.length)];
      tw.disabled = dur;
      addRing(tw.x, tw.y, 34, 'rgba(255,110,110,0.9)', 0.6);
      addFloat(tw.x, tw.y - 28, 'JAMMED', '#ff9db4', 12);
    },
    destroyRandomPad() {
      const idxs = L.pads.map((p, i) => i).filter(i => !L.pads[i].destroyed);
      if (!idxs.length) return;
      const i = idxs[Math.floor(rng.float() * idxs.length)];
      const pad = L.pads[i];
      const tw = B.towers.get(i);
      if (tw) {
        B.gold += tw.invested;
        addFloat(pad[0], pad[1] - 26, '+' + tw.invested, '#ffd873');
        B.towers.delete(i);
        markStatsDirty();
      }
      pad.destroyed = true;
      rebuildBg();
      addRing(pad[0], pad[1], 50, 'rgba(255,110,110,0.9)', 0.7);
      particles.burst(pad[0], pad[1], 16, { color: '#c9884a', speed: 110, life: 0.5, size: 3, glow: true });
      if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.8);
      sfx.boom();
    },
    stunTowersNear(boss, r, dur) {
      for (const tw of B.towers.values()) {
        if (Math.hypot(tw.x - boss.x, tw.y - boss.y) <= r) tw.disabled = Math.max(tw.disabled || 0, dur);
      }
    },
  };

  const motes = [];
  for (let i = 0; i < 60; i++) {
    motes.push({ x: rng.float() * W, y: rng.float() * H, r: rng.float() * 1.8 + 0.6, s: rng.float() * 7 + 3, p: rng.float() * TAU });
  }

  const tmpQuery = [];
  const tmpPos = { x: 0, y: 0, angle: 0 };

  // tutorial (level 1, first campaign run only)
  const tut = (L.tutorial && !game.save.tutorialDone && !challenge)
    ? { step: 0, done: false, timer: 0 }
    : null;
  const tutSkipBtn = { x: W / 2 + 150, y: 118, w: 90, h: 28, label: 'Skip' };
  function tutorialAdvanceChecks() {
    if (!tut || tut.done) return;
    tut.timer += 1 / 60;
    const next = () => {
      tut.step++;
      tut.timer = 0;
      // whatever the next lesson teaches must actually be ready to try
      if (tut.step === 5 && B.hero) B.hero.abilityCd = Math.min(B.hero.abilityCd, 0.5);
      if (tut.step === 6) B.reinfCd = Math.min(B.reinfCd, 0.5);
      // Clear the "player did it" flags on entry. They are set the first time
      // the ability or reinforcements are ever used, and a curious player
      // presses both long before the tutorial gets here — leaving them set made
      // these two lessons satisfy themselves on their first frame and vanish.
      if (tut.step === 5) B.tutAbility = false;
      if (tut.step === 6) B.tutReinf = false;
    };
    if (tut.step === 0 && B.towers.size > 0) next();                       // build
    else if (tut.step === 1 && (tut.timer > 5 || B.waveIndex >= 0)) next(); // caves + route
    else if (tut.step === 2 && B.waveIndex >= 0) next();                    // launch
    // 30s escape hatch: a player hoarding gold could otherwise stall here forever
    else if (tut.step === 3 && (tut.timer > 30
      || [...B.towers.values()].some(t => t.level > 0))) next();            // upgrade
    else if (tut.step === 4 && (tut.timer > 25 ||
      (B.hero && Math.hypot(B.hero.tx - B.hero.x, B.hero.ty - B.hero.y) > 30))) next(); // move hero
    else if (tut.step === 5 && (tut.timer > 25 || B.tutAbility)) next();    // hero ability
    else if (tut.step === 6 && (tut.timer > 25 || B.tutReinf)) next();      // reinforcements
    else if (tut.step === 7 && B.waveIndex >= 2) finishTutorial();          // call early
  }
  ctxBattle.tut = tut; // exposed for scripted tutorial testing

  function finishTutorial() {
    if (!tut || tut.done) return;
    tut.done = true;
    game.save.tutorialDone = true;
    game.persist();
  }

  const pauseBtns = {
    resume: { x: W / 2 - 190, y: H / 2 + 40, w: 175, h: 46, label: 'Resume' },
    quit: { x: W / 2 + 15, y: H / 2 + 40, w: 175, h: 46, label: S.ui.toMap },
  };

  let musicBoss = false;

  function setBanner(txt, life = 5.5) { if (txt) B.banner = { txt, t: 0, life }; }
  setBanner(L.intro || S.taunts[0], 5);

  function addFloat(x, y, txt, color, size = 14) {
    B.floats.push({ x, y, txt, color, size, t: 0, life: 0.9 });
    if (B.floats.length > 60) B.floats.shift();
  }
  function addRing(x, y, maxR, color, dur = 0.35) {
    B.rings.push({ x, y, maxR, color, t: 0, dur });
    if (B.rings.length > 40) B.rings.shift();
  }
  function markSeen(type) { if (game.save && !game.save.seen[type]) { game.save.seen[type] = true; } }

  // ---------- waves ----------

  function startWave() {
    // Nothing left to launch. The wave-cleared check owns ending the level, so
    // this is a no-op rather than running off the end of the wave list.
    if (B.waveIndex + 1 >= waves.length) return;
    B.waveIndex++;
    if (L.shift && B.waveIndex === L.shift.wave) {
      paths.length = 0;
      for (const raw of L.shift.paths) paths.push(buildPath(raw));
      for (const tw of B.towers.values()) if (tw.type === 'drone') initDrones(tw);
      rebuildBg();
      computePortals();
      addRing(W / 2, H / 2, 320, 'rgba(200,150,90,0.6)', 1);
      if (game.save.settings.shake) B.shake = Math.max(B.shake, 1);
      sfx.boom();
    }
    const wave = waves[B.waveIndex];
    B.spawner = wave.groups.map(g => ({ ...g, spawned: 0, t: -(g.delay || 0) }));
    B.phase = 'wave';
    setBanner(wave.intro || '');
    if (B.waveIndex === 0 && B.hero && !B.hero.dead) {
      B.speech = { txt: S.speech.waveStart[(rng.float() * S.speech.waveStart.length) | 0], t: 0, life: 3 };
    }
    sfx.wave();
    if (wave.boss) { sfx.bossRoar(); duckMusic(0.25, 0.9); }
    // incoming pulse at each spawn mouth used by this wave
    const mouths = new Set(wave.groups.map(g => g.path || 0));
    for (const pi of mouths) {
      if (!paths[pi]) continue;
      const p0 = paths[pi].pts[0];
      const mx = Math.max(14, Math.min(W - 14, p0.x));
      const my = Math.max(60, Math.min(H - 14, p0.y));
      addRing(mx, my, 60, 'rgba(255,140,120,0.8)', 0.8);
      addFloat(mx + 24, my, '!!', '#ff9d8f', 20);
    }
  }

  function callWave() {
    if (B.phase === 'between') {
      // Auto-call is a commitment to launch as early as possible, so it pays
      // the same as someone hammering the button. It used to shorten the
      // countdown to 2s and then compute the bonus from what was left, which
      // quietly cost ~20 gold a wave — a playtester spotted the shape of it
      // without seeing the code: "not calling early is playing suboptimally all
      // the time... I lose a lot of money if I don't."
      const secs = game.save.settings.autoWave ? BETWEEN_WAVE_TIME : Math.ceil(B.countdown);
      const bonus = Math.round(secs * 2 * meta.earlyMul);
      if (bonus > 0) { B.gold += bonus; B.goldEarned += bonus; addFloat(W - 200, 66, '+' + bonus, '#ffd873'); }
    }
    startWave();
  }

  function spawnEnemy(type, opts = {}) {
    if (type.startsWith('boss_')) return spawnBoss(type.slice(5), opts);
    const def = ENEMIES[type];
    if (!def) return;
    // The codex has a one-line counter for every creature — "shell like a
    // bulkhead, shock it, don't shoot it" — and a playtester spent half an hour
    // saying "what's this? I don't know what this is" without ever opening it.
    // The information was on demand when it needed to be volunteered, so the
    // first time a creature is ever met it introduces itself.
    if (!game.save.seen[type] && S.enemies[type] && !B.introCards.some(c => c.type === type)) {
      B.introCards.push({ type, t: 0, life: 6.5 });
    }
    markSeen(type);
    const elite = !!opts.elite;
    // creatures emerge FROM the cave mouth, not from off-screen
    const spawnD = opts.dist != null ? opts.dist
      : Math.max(0, portalDistFor(opts.path || 0) - 4 - rng.float() * 8);
    const e = {
      def, type, baseType: type, elite,
      hp: def.hp * hpMul * (elite ? ELITE.hpMul : 1),
      maxHp: def.hp * hpMul * (elite ? ELITE.hpMul : 1),
      shieldHp: (def.shield || 0) * hpMul,
      maxShield: (def.shield || 0) * hpMul,
      dist: spawnD,
      emergeT: opts.dist != null ? 0 : 0.5,
      x: -60, y: 0, angle: 0,
      wob: rng.float() * TAU,
      pathIdx: opts.path || 0,
      dead: false, hidden: false, inSonar: false, ampMul: 1,
      blockedBy: null, sprintT: rng.float() * 2, subT: rng.float() * 2, resCd: 0,
      status: { bleed: { t: 0, dps: 0 }, poison: { t: 0, dps: 0 }, stun: 0, held: 0, shred: 0 },
      hitT: 0,
    };
    if (opts.hpMul) { e.hp *= opts.hpMul; e.maxHp *= opts.hpMul; }
    B.enemies.push(e);
    // emergence puff at the cave mouth
    if (e.emergeT > 0) {
      const po = portals.find(p => p.path === (opts.path || 0));
      if (po) {
        particles.burst(po.x, po.y, def.radius > 12 ? 8 : 4, {
          color: '#c9ecff', speed: 50, life: 0.4, size: 2, glow: true,
        });
      }
    }
    return e;
  }

  function battleFeat(id) {
    if (awardFeat(game.save, id)) {
      game.persist();
      const f = FEATS.find(f => f.id === id);
      setBanner(S.feats.unlocked + ' ' + (f ? f.name : id), 4.5);
      sfx.levelUp();
    }
  }

  function spawnBoss(id, opts = {}) {
    const bd = BOSSES[id];
    if (!bd) return;
    const base = ENEMIES[bd.baseType] || ENEMIES.fry;
    const def = { ...base, ...bd, id: 'boss_' + id };
    const hp = def.hp * hpMul * (opts.hpMul || 1);
    const e = {
      def, type: 'boss_' + id, baseType: bd.baseType, elite: false, boss: true,
      bossScript: bd.script, phase: 0,
      hp, maxHp: hp, shieldHp: 0, maxShield: 0,
      dist: opts.dist != null ? opts.dist : Math.max(0, portalDistFor(opts.path || 0) - 4),
      emergeT: 0.7,
      x: -60, y: 0, angle: 0, wob: rng.float() * TAU,
      pathIdx: opts.path || 0,
      dead: false, hidden: false, inSonar: false, ampMul: 1,
      blockedBy: null, sprintT: 0, subT: 0, resCd: 0, speedMul: 1,
      status: { bleed: { t: 0, dps: 0 }, poison: { t: 0, dps: 0 }, stun: 0, held: 0, shred: 0 },
      hitT: 0,
    };
    B.enemies.push(e);
    setBanner(bd.strings.intro, 5);
    B.letterbox = 2.6;
    if (B.hero && !B.hero.dead) {
      B.speech = { txt: S.speech.bossSpawn[(rng.float() * S.speech.bossSpawn.length) | 0], t: 0, life: 3.5 };
    }
    sfx.bossRoar();
    sfx.phaseSting();
    return e;
  }

  // ---------- damage ----------

  function killEnemy(e, silent) {
    if (e.dead) return;
    e.dead = true;
    B.kills++;
    if (!e.boss) {
      const kb = game.save.stats.killsBy || (game.save.stats.killsBy = {});
      kb[e.baseType] = (kb[e.baseType] || 0) + 1;
      if (e.baseType === 'glider' && kb.glider >= 50) battleFeat('glider50');
    }
    const bounty = Math.round(e.def.bounty * diffMods.bounty * (e.elite ? ELITE.bountyMul : 1));
    B.gold += bounty; B.goldEarned += bounty;
    addFloat(e.x, e.y - 16, '+' + bounty, '#ffd873');
    particles.burst(e.x, e.y, e.def.radius > 14 ? 16 : 10, { color: e.def.belly, speed: 70, life: 0.5, size: 2.5, glow: true });
    // chunky fin gibs
    for (let gi = 0; gi < 3; gi++) {
      particles.spawn(e.x, e.y, {
        vx: (rng.float() - 0.5) * 130, vy: -40 - rng.float() * 60,
        life: 0.55, size: 3.5, color: e.def.fin, drag: 0.9,
      });
    }
    // coin flies to the gold counter
    B.coins.push({ x: e.x, y: e.y, t: 0 });
    if (B.coins.length > 20) B.coins.shift();
    heroXp(Math.max(2, Math.round(e.def.bounty * 0.8)), e.x, e.y);
    // Coins chime up a scale while you keep killing, and reset after a lull —
    // a streak you can hear is worth more than a bigger number on screen.
    B.coinStreak = Math.min(12, (B.coinStreak || 0) + 1);
    B.coinStreakT = 1.3;
    sfx.coin(B.coinStreak - 1);
    if (!e.boss) {
      // Impact weight. Swarm chaff dies quietly — shaking the screen for every
      // fry would be exhausting — but anything with mass lands with a thump.
      // Three tiers rather than one threshold. The light tier matters most:
      // station 1 only fields chaff and an armoured crawler, and that opening
      // level is precisely where the game has to feel good to the touch.
      const heft = (e.def.radius || 10) + (e.elite ? 6 : 0);
      if (heft >= 12) {
        const big = heft >= 20, mid = heft >= 15;
        // Shake is cheap and additive, so it can fire on every kill.
        if (game.save.settings.shake) B.shake = Math.max(B.shake, big ? 0.5 : mid ? 0.28 : 0.16);
        // Hitstop is not: a dense wave of heavy enemies would chain freezes
        // into a stutter, so it is rate-limited. A punch you feel occasionally
        // reads as impact; one you feel constantly reads as a bad framerate.
        if (B.hitStopCd <= 0) {
          B.hitStop = Math.max(B.hitStop, big ? 0.055 : mid ? 0.032 : 0.018);
          B.hitStopCd = 0.28;
        }
      }
    }
    if (e.boss) {
      addRing(e.x, e.y, 120, 'rgba(255,216,115,0.9)', 0.9);
      if (game.save.settings.shake) B.shake = Math.max(B.shake, 1.4);
      B.hitStop = 0.22;
      B.whiteFlash = 0.3;
      if (B.lives === lives) battleFeat('bossNoLeak');
      sfx.bossRoar();
      duckMusic(0.3, 0.8);
    }
    if (!silent) sfx.death(Math.min(1, ((e.def.radius || 10) - 6) / 14));
    if (e.blockedBy) { e.blockedBy.target = null; e.blockedBy = null; }
    if (e.def.deathSpawn) {
      for (let i = 0; i < e.def.deathSpawn.n; i++) {
        spawnEnemy(e.def.deathSpawn.type, { dist: Math.max(0, e.dist - 6 - i * 10), path: e.pathIdx });
      }
      addRing(e.x, e.y, 40, 'rgba(150,230,120,0.6)');
    }
    if (!e.def.resurrectImmune && !e.boss) {
      B.corpses.push({ x: e.x, y: e.y, type: e.baseType, elite: e.elite, dist: e.dist, pathIdx: e.pathIdx, t: 0 });
      if (B.corpses.length > 24) B.corpses.shift();
    }
  }

  function damageEnemy(e, dmg, kind, srcStats) {
    if (e.dead || dmg <= 0) return;
    if (kind === 'physical') {
      const armor = Math.max(0, (e.def.armor || 0) - e.status.shred);
      dmg *= 1 - armor;
    } else if (kind === 'magic') {
      dmg *= 1 - (e.def.magicRes || 0);
    }
    dmg *= e.ampMul;
    if (srcStats && srcStats.bleedBonus && e.status.bleed.t > 0) dmg *= srcStats.bleedBonus;
    if (e.shieldHp > 0) {
      e.shieldHp -= dmg;
      if (e.shieldHp <= 0) {
        e.shieldHp = 0;
        if (e.baseType === 'juggernaut') battleFeat('shellBreaker');
        addRing(e.x, e.y, 34, 'rgba(140,220,255,0.8)');
        addFloat(e.x, e.y - 14, 'CRACK', '#8fd7e8', 12);
      }
      e.hitT = 0.12;
      return;
    }
    e.hp -= dmg;
    e.hitT = 0.12;
    if (game.save.settings.dmgNums && dmg >= 1) {
      const col = kind === 'magic' ? '#9fe8ff' : kind === 'poison' ? '#a8e86f' : kind === 'bleed' ? '#ff9a7a' : '#ffe2a8';
      // coalesce rapid hits on the same target into one growing number
      const ex = B.floats.find(f => f.e === e && f.t < 0.35);
      if (ex) {
        ex.val += dmg;
        ex.txt = String(Math.round(ex.val));
        ex.t = 0;
        ex.size = Math.min(16, 11 + ex.val / 40);
      } else {
        B.floats.push({
          x: e.x + (rng.float() - 0.5) * 14, y: e.y - 10,
          txt: String(Math.round(dmg)), color: col, size: 11,
          t: 0, life: 0.9, val: dmg, e,
        });
        if (B.floats.length > 60) B.floats.shift();
      }
    }
    if (e.hp <= 0) killEnemy(e);
  }

  // ---------- tower stats / buffs ----------

  function markStatsDirty() { for (const tw of B.towers.values()) tw._stats = null; refreshBuffs(); }

  function refreshBuffs() {
    const sonars = [];
    for (const tw of B.towers.values()) {
      if (tw.type === 'sonar') sonars.push({ tw, s: resolveStats(tw, meta, null) });
    }
    for (const tw of B.towers.values()) {
      if (tw.type === 'sonar') { tw.buff = null; continue; }
      let rangeMul = 1, dmgMul = 1;
      for (const { tw: st, s } of sonars) {
        const d = Math.hypot(tw.x - st.x, tw.y - st.y);
        if (d <= s.range) {
          rangeMul = Math.max(rangeMul, s.buffRange);
          dmgMul = Math.max(dmgMul, s.buffDmg);
        }
      }
      tw.buff = { rangeMul, dmgMul };
      tw._stats = null;
    }
  }

  function statsOf(tw) {
    if (!tw._stats) tw._stats = resolveStats(tw, meta, tw.buff);
    return tw._stats;
  }

  // ---------- light ----------
  //
  // Below the Hadal Rift the trench stops being lit for you. Turrets, your
  // station and your hero each carry a lamp, and a turret cannot shoot what its
  // light does not reach — so covering the road stops being purely about damage
  // and starts being about where you can *see*. Everything unlit still moves;
  // you just watch its eyes come toward you.
  //
  // Rebuilt once per frame into a reused array rather than allocated, since
  // this is consulted by every targeting query.
  const lights = [];

  function rebuildLights() {
    lights.length = 0;
    if (!B.dark) return;
    for (const path of paths) {
      const end = path.pts[path.pts.length - 1];
      lights.push({ x: end.x, y: end.y, r: 150 });      // the station itself
    }
    for (const tw of B.towers.values()) {
      if (tw.disabled > 0) continue;                     // a stunned turret goes dark
      // A snuffed lamp gutters rather than dies. Killing it outright meant a wisp
      // arriving on wave 1 — which is exactly when it arrives in the Cold Seep —
      // left a player with one turret and no vision at all: a hard fail rather
      // than a tense moment. Guttering collapses your reach while leaving you
      // able to defend your own feet.
      // Deliberately well short of the turret's range. If a lamp reached as far
      // as the gun, everything shootable would be lit by definition and the
      // whole mechanic would be decoration — measured that, it changed nothing.
      // Seeing less far than you can shoot is what forces overlapping cover,
      // makes the hero worth walking forward, and gives flares a job.
      const lamp = Math.max(statsOf(tw).range * 0.75, 95) * (tw.doused > 0 ? 0.42 : 1);
      lights.push({ x: tw.x, y: tw.y, r: lamp });
    }
    if (B.hero && !B.hero.dead) lights.push({ x: B.hero.x, y: B.hero.y, r: 120 });
    for (const f of B.flares) lights.push({ x: f.x, y: f.y, r: f.r });
  }

  function isLit(x, y) {
    if (!B.dark) return true;
    for (const l of lights) {
      const dx = x - l.x, dy = y - l.y;
      if (dx * dx + dy * dy <= l.r * l.r) return true;
    }
    return false;
  }

  // ---------- targeting ----------

  function targetable(e) { return !e.dead && !e.hidden && e.dist >= 0 && isLit(e.x, e.y); }

  function pickTargets(tw, s, n) {
    grid.query(tw.x, tw.y, s.range + 14, tmpQuery);
    const cands = tmpQuery.filter(targetable);
    if (!cands.length) return [];
    const pr = tw.priority || 'first';
    cands.sort((a, b) =>
      pr === 'first' ? b.dist - a.dist :
      pr === 'last' ? a.dist - b.dist :
      pr === 'strong' ? b.hp - a.hp : a.hp - b.hp);
    return cands.slice(0, n);
  }

  // ---------- firing ----------

  function addFlash(x, y, ang, big) {
    B.flashes.push({ x, y, ang, big: !!big, t: 0 });
    if (B.flashes.length > 24) B.flashes.shift();
  }

  function fireHarpoon(tw, s, targets) {
    for (const target of targets) {
      const ang = Math.atan2(target.y - tw.y, target.x - tw.x);
      B.projectiles.push({
        x: tw.x + Math.cos(ang) * 16, y: tw.y + Math.sin(ang) * 16, ang,
        target, tx: target.x, ty: target.y, speed: 480, dmg: s.dmg, stats: s, dead: false,
      });
    }
    tw.angle = Math.atan2(targets[0].y - tw.y, targets[0].x - tw.x);
    addFlash(tw.x + Math.cos(tw.angle) * 24, tw.y - 7 + Math.sin(tw.angle) * 24, tw.angle);
    tw.recoil = 1;
    sfx.shot();
  }

  function makeBoltSegs(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = [{ x: a.x, y: a.y }];
      const nx = -(b.y - a.y), ny = b.x - a.x;
      const len = Math.hypot(nx, ny) || 1;
      for (let j = 1; j < 4; j++) {
        const t = j / 4;
        const jit = (rng.float() - 0.5) * 14;
        seg.push({ x: a.x + (b.x - a.x) * t + nx / len * jit, y: a.y + (b.y - a.y) * t + ny / len * jit });
      }
      seg.push({ x: b.x, y: b.y });
      out.push(seg);
    }
    return out;
  }

  function fireArc(tw, s, target) {
    const hit = [target];
    let cur = target;
    while (hit.length < (s.chains || 1)) {
      grid.query(cur.x, cur.y, s.chainRange, tmpQuery);
      let best = null, bd = Infinity;
      for (const e of tmpQuery) {
        if (!targetable(e) || hit.includes(e)) continue;
        const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.push(best); cur = best;
    }
    const pts = [{ x: tw.x, y: tw.y - 16 }];
    let dmg = s.dmg;
    for (const e of hit) {
      pts.push({ x: e.x, y: e.y });
      particles.burst(e.x, e.y, 4, { color: '#7df3ff', speed: 50, life: 0.25, size: 1.5, glow: true });
      // physical sparks that arc down and bounce toward the seabed
      for (let sp = 0; sp < 3; sp++) {
        particles.spawn(e.x, e.y, {
          vx: (rng.float() - 0.5) * 140, vy: -70 - rng.float() * 50,
          grav: 380, life: 0.5, size: 1.8, color: '#d5f7ff', glow: true, drag: 0.98,
        });
      }
      damageEnemy(e, dmg, 'magic', s);
      if (s.stun && !e.dead && !e.boss && rng.float() < s.stun.chance) {
        e.status.stun = Math.max(e.status.stun, s.stun.dur);
        addFloat(e.x, e.y - 18, '✶', '#ffe66f', 13);
        sfx.stun();
      }
      dmg *= 0.75;
    }
    B.bolts.push({ segs: makeBoltSegs(pts), t: 0, life: 0.16 });
    tw.recoil = 1;
    sfx.zap();
  }

  function fireShell(tw, s, target) {
    // Lead the target along its path.
    const lead = Math.hypot(target.x - tw.x, target.y - tw.y) / SHELL_SPEED;
    const spd = enemySpeed(target);
    paths[target.pathIdx].at(target.dist + spd * lead, tmpPos);
    const tx = tmpPos.x, ty = tmpPos.y;
    const dur = Math.hypot(tx - tw.x, ty - tw.y) / SHELL_SPEED;
    B.shells.push({ sx: tw.x, sy: tw.y - 6, tx, ty, t: 0, dur: Math.max(0.3, dur), stats: s });
    tw.angle = Math.atan2(ty - tw.y, tx - tw.x);
    addFlash(tw.x + Math.cos(tw.angle) * 22, tw.y + Math.sin(tw.angle) * 22, tw.angle, true);
    tw.recoil = 1;
    sfx.shot();
  }

  function explode(x, y, s, mul = 1) {
    addRing(x, y, s.radius, 'rgba(255,190,110,0.8)', 0.4);
    addFlash(x, y, 0, true);
    // scorch mark persists on the seabed
    B.scorch.push({ x, y, r: s.radius * 0.55, t: 0 });
    if (B.scorch.length > 12) B.scorch.shift();
    particles.burst(x, y, 14, { color: '#ffcf8f', speed: 120, life: 0.4, size: 3, glow: true });
    if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.45);
    sfx.boom();
    grid.query(x, y, s.radius + 10, tmpQuery);
    for (const e of tmpQuery) {
      if (e.dead || e.hidden || e.def.flying) continue;
      damageEnemy(e, s.dmg * mul, 'physical', s);
    }
    if (s.crater) {
      B.zones.push({ x, y, r: s.radius * 0.9, slow: s.crater.slow, t: 0, dur: s.crater.dur });
      if (B.zones.length > 16) B.zones.shift();
    }
    if (s.bomblets && mul === 1) {
      for (let i = 0; i < s.bomblets.n; i++) {
        const a = (i / s.bomblets.n) * TAU + rng.float();
        const bx = x + Math.cos(a) * s.bomblets.spread;
        const by = y + Math.sin(a) * s.bomblets.spread;
        B.shells.push({
          sx: x, sy: y, tx: bx, ty: by, t: 0, dur: 0.3,
          stats: { dmg: s.bomblets.dmg, radius: s.bomblets.radius }, mini: true,
        });
      }
    }
    if (s.echo && mul === 1) {
      B.shells.push({ sx: x, sy: y - 30, tx: x, ty: y, t: 0, dur: 0.4, stats: { ...s, echo: null, bomblets: null }, echoShell: true, mul: s.echo });
    }
  }

  // ---------- drones ----------

  function initDrones(tw) {
    const s = statsOf(tw);
    tw.rally = nearestOnPath(paths[0], tw.x, tw.y);
    // choose the closest path if several
    for (let i = 1; i < paths.length; i++) {
      const r = nearestOnPath(paths[i], tw.x, tw.y);
      if (Math.hypot(r.x - tw.x, r.y - tw.y) < Math.hypot(tw.rally.x - tw.x, tw.rally.y - tw.y)) {
        tw.rally = r; tw.rallyPath = i;
      }
    }
    tw.rallyPath = tw.rallyPath || 0;
    tw.drones = [];
    for (let i = 0; i < s.drones; i++) {
      tw.drones.push(newDrone(tw, s, i));
    }
  }

  function newDrone(tw, s, slot) {
    return {
      hp: s.droneHp, max: s.droneHp, x: tw.x, y: tw.y, slot,
      target: null, respawnT: 0, atkT: 0, hurtT: 0, bay: tw, dead: false, engaged: false,
    };
  }

  function updateDrones(tw, dt) {
    const s = statsOf(tw);
    // keep drone count in sync with abilities
    while (tw.drones.length < s.drones) tw.drones.push(newDrone(tw, s, tw.drones.length));
    for (const dr of tw.drones) {
      if (dr.dead) {
        dr.respawnT -= dt;
        if (dr.respawnT <= 0) {
          dr.dead = false; dr.hp = s.droneHp; dr.max = s.droneHp;
          dr.x = tw.x; dr.y = tw.y; dr.target = null; dr.engaged = false;
          sfx.droneUp();
        }
        continue;
      }
      dr.hurtT = Math.max(0, dr.hurtT - dt);
      // validate target
      if (dr.target && (dr.target.dead || dr.target.leaked || dr.target.hidden || dr.target.def.flying)) {
        if (dr.target.blockedBy === dr) dr.target.blockedBy = null;
        dr.target = null; dr.engaged = false;
      }
      // acquire
      if (!dr.target) {
        let best = null, bd = Infinity;
        for (const e of B.enemies) {
          if (e.dead || e.hidden || e.def.flying || e.blockedBy || e.dist < 0) continue;
          const dRally = Math.hypot(e.x - tw.rally.x, e.y - tw.rally.y);
          if (dRally > s.range) continue;
          const d = (e.x - dr.x) ** 2 + (e.y - dr.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { dr.target = best; best.blockedBy = dr; dr.engaged = false; }
      }
      // move
      let gx, gy;
      if (dr.target) { gx = dr.target.x; gy = dr.target.y; }
      else {
        const a = (dr.slot / Math.max(1, tw.drones.length)) * TAU + B.time * 0.6;
        gx = tw.rally.x + Math.cos(a) * 22;
        gy = tw.rally.y + Math.sin(a) * 22;
      }
      const dx = gx - dr.x, dy = gy - dr.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const spd = 130;
        dr.x += dx / d * Math.min(spd * dt, d);
        dr.y += dy / d * Math.min(spd * dt, d);
      }
      // combat
      if (dr.target && d < 20) {
        if (!dr.engaged) {
          dr.engaged = true;
          if (s.slam) {
            const st = dr.target;
            damageEnemy(st, s.slam.dmg, 'physical', s);
            if (!st.dead && !st.boss) st.status.stun = Math.max(st.status.stun, s.slam.stun);
            addRing(dr.x, dr.y, 26, 'rgba(255,210,130,0.7)');
            if (st.dead) continue;
          }
        }
        dr.atkT -= dt;
        const tgt = dr.target;
        if (dr.atkT <= 0 && tgt && !tgt.dead) {
          dr.atkT = 1 / s.droneRate;
          damageEnemy(tgt, s.droneDmg, 'physical', s);
          if (tgt.dead) continue; // killEnemy already released the lock
          if (s.poison) tgt.status.poison = { t: s.poison.dur, dps: s.poison.dps };
          addFlash((dr.x + tgt.x) / 2, (dr.y + tgt.y) / 2, Math.atan2(tgt.y - dr.y, tgt.x - dr.x));
          sfx.clash();
          // enemy strikes back — bosses crush blockers
          const bane = tgt.def.droneBane || 1;
          let hurt = tgt.def.melee * bane * (tgt.boss ? 2.5 : 1);
          if (s.droneArmor) hurt *= 1 - s.droneArmor;
          dr.hp -= hurt;
          dr.hurtT = 0.15;
          if (dr.hp <= 0) {
            dr.dead = true; dr.respawnT = s.respawn;
            if (tgt.blockedBy === dr) tgt.blockedBy = null;
            dr.target = null;
            particles.burst(dr.x, dr.y, 8, { color: '#9fd4ea', speed: 80, life: 0.4, size: 2, glow: true });
            sfx.droneDown();
          }
        }
      }
    }
  }

  // ---------- sonar auras & statuses ----------

  function updateAuras(dt) {
    const sonars = [];
    for (const tw of B.towers.values()) {
      if (tw.type !== 'sonar') continue;
      const s = statsOf(tw);
      sonars.push({ tw, s });
      // lure pulse
      if (s.hold) {
        tw.holdT = (tw.holdT || 0) + dt;
        if (tw.holdT >= s.hold.cd) {
          let any = false;
          for (const e of B.enemies) {
            if (e.dead || e.dist < 0 || e.boss) continue;
            if (Math.hypot(e.x - tw.x, e.y - tw.y) <= s.range) {
              e.status.held = Math.max(e.status.held, s.hold.dur);
              any = true;
            }
          }
          if (any) {
            tw.holdT = 0;
            addRing(tw.x, tw.y, s.range, 'rgba(255,214,130,0.5)', 0.6);
            sfx.hold();
          }
        }
      }
      // ping fx
      tw.pingT = (tw.pingT || 0) + dt;
      if (tw.pingT > 2.4) { tw.pingT = 0; addRing(tw.x, tw.y, s.range, 'rgba(120,220,255,0.28)', 1); sfx.ping(); }
    }
    for (const e of B.enemies) {
      if (e.dead) continue;
      e.inSonar = false;
      e.sonarSlow = 1;
      e.ampMul = 1;
      for (const { tw, s } of sonars) {
        const d = Math.hypot(e.x - tw.x, e.y - tw.y);
        if (d <= s.range) {
          e.inSonar = true;
          e.sonarSlow = Math.min(e.sonarSlow, s.slow);
          if (s.amp) e.ampMul = Math.max(e.ampMul, s.amp);
        }
      }
    }
  }

  function enemySpeed(e) {
    let sp = e.def.speed * (e.elite ? ELITE.speedMul : 1) * (e.speedMul || 1);
    if (e.boss) {
      // bosses shrug off most crowd control: slows at half strength, no stuns
      let slow = (e.sonarSlow || 1);
      for (const z of B.zones) {
        if (Math.hypot(e.x - z.x, e.y - z.y) <= z.r) slow = Math.min(slow, z.slow);
      }
      sp *= Math.sqrt(slow);
      if (e.blockedBy && !e.blockedBy.dead) sp = 0;
      return sp;
    }
    if (e.def.sprint) {
      const c = e.def.sprint;
      const ph = e.sprintT % (c.every + c.dur);
      if (ph > c.every) sp *= c.mul;
    }
    if (e.def.submerge && e.hidden) sp *= e.def.submerge.mul;
    if (!e.def.slowImmune) {
      // Strongest single slow wins — overlapping fields used to multiply
      // (sonar 0.55 x two craters 0.6 = 20% speed), which left creatures
      // effectively frozen. Bosses already worked this way.
      let slow = e.sonarSlow || 1;
      for (const z of B.zones) {
        if (Math.hypot(e.x - z.x, e.y - z.y) <= z.r) slow = Math.min(slow, z.slow);
      }
      sp *= Math.max(SLOW_FLOOR, slow);
    }
    if (e.status.stun > 0 || e.status.held > 0) sp = 0;
    if (e.blockedBy && !e.blockedBy.dead) sp = 0;
    return sp;
  }

  function updateEnemies(dt) {
    for (const e of B.enemies) {
      if (e.dead) continue;
      e.wob += dt * 6;
      e.emergeT = Math.max(0, (e.emergeT || 0) - dt);
      e.hitT = Math.max(0, e.hitT - dt);
      e.status.stun = Math.max(0, e.status.stun - dt);
      e.status.held = Math.max(0, e.status.held - dt);
      if (e.status.bleed.t > 0) {
        e.status.bleed.t -= dt;
        damageEnemy(e, e.status.bleed.dps * dt, 'bleed');
      }
      if (e.status.poison.t > 0) {
        e.status.poison.t -= dt;
        damageEnemy(e, e.status.poison.dps * dt, 'poison');
      }
      if (e.dead) continue;
      // visibility
      if (e.def.cloak) e.hidden = !e.inSonar;
      else if (e.def.submerge) {
        e.subT += dt;
        const c = e.def.submerge;
        const ph = e.subT % (c.down + c.up);
        e.hidden = ph < c.down && !e.inSonar;
      } else e.hidden = false;
      if (e.hidden && e.blockedBy) {
        if (e.blockedBy.target === e) { e.blockedBy.target = null; e.blockedBy.engaged = false; }
        e.blockedBy = null;
      }
      if (e.def.sprint) e.sprintT += dt;
      // boss phases + scripted behaviour
      if (e.boss) {
        e.phase = e.hp < e.maxHp * 0.33 ? 2 : e.hp < e.maxHp * 0.66 ? 1 : 0;
        if (e.bossScript) e.bossScript(e, bossApi, dt);
      }
      // heal aura
      if (e.def.heal) {
        for (const o of B.enemies) {
          if (o === e || o.dead) continue;
          if (Math.hypot(o.x - e.x, o.y - e.y) <= e.def.heal.radius && o.hp < o.maxHp) {
            o.hp = Math.min(o.maxHp, o.hp + e.def.heal.hps * dt);
          }
        }
        if (Math.sin(e.wob) > 0.97) particles.spawn(e.x, e.y, { vy: -20, life: 0.6, size: 2, color: '#9fe89f', glow: true });
      }
      // wisps snuff turret lamps (only meaningful where it is dark)
      if (e.def.douse && B.dark) {
        e.douseT = (e.douseT === undefined ? e.def.douse.cd * 0.5 : e.douseT) - dt;
        if (e.douseT <= 0) {
          e.douseT = e.def.douse.cd;
          let hit = 0;
          for (const tw of B.towers.values()) {
            if (Math.hypot(tw.x - e.x, tw.y - e.y) <= e.def.douse.radius) {
              tw.doused = Math.max(tw.doused || 0, e.def.douse.dur);
              hit++;
            }
          }
          if (hit) {
            addRing(e.x, e.y, e.def.douse.radius, 'rgba(40,20,70,0.85)', 0.5);
            sfx.droneDown();
          }
        }
      }
      // necro resurrect
      if (e.def.resurrect) {
        e.resCd -= dt;
        if (e.resCd <= 0) {
          for (let i = B.corpses.length - 1; i >= 0; i--) {
            const c = B.corpses[i];
            if (c.t > 6) continue;
            if (Math.hypot(c.x - e.x, c.y - e.y) <= e.def.resurrect.radius) {
              B.corpses.splice(i, 1);
              const rev = spawnEnemy(c.type, { dist: Math.max(0, e.dist - 14), path: e.pathIdx, hpMul: 0.5 });
              if (rev) {
                addRing(e.x, e.y, 40, 'rgba(220,130,220,0.7)');
                addFloat(e.x, e.y - 20, '☠', '#eaa9e0', 14);
              }
              e.resCd = e.def.resurrect.cd;
              break;
            }
          }
        }
      }
      // movement
      e.dist += enemySpeed(e) * dt;
      const path = paths[e.pathIdx] || paths[0];
      path.at(e.dist, tmpPos);
      const wobAmt = e.def.flying ? 5 : 3;
      e.x = tmpPos.x + Math.sin(e.wob) * wobAmt;
      e.y = tmpPos.y + Math.cos(e.wob * 0.8) * wobAmt;
      e.angle = tmpPos.angle;
      if (e.dist >= path.total) {
        e.dead = true; e.leaked = true;
        B.lastLeakType = e.def;
        if (e.blockedBy) { e.blockedBy.target = null; e.blockedBy = null; }
        B.lives -= e.def.lives;
        B.leakFlash = 0.5;
        if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.5);
        sfx.leak();
        if (B.lives <= 0) {
          B.lives = 0; B.outcome = 'lost'; B.phase = 'over'; sfx.defeat();
        }
      }
    }
  }

  // ---------- towers update ----------

  function updateTowers(dt) {
    for (const tw of B.towers.values()) {
      tw.cooldown -= dt;
      tw.recoil = Math.max(0, (tw.recoil || 0) - dt * 5);
      if (tw.doused > 0) tw.doused -= dt;
      if (tw.disabled > 0) { tw.disabled -= dt; continue; }
      const s = statsOf(tw);
      if (tw.type === 'drone') { updateDrones(tw, dt); continue; }
      if (tw.type === 'sonar') continue;
      if (tw.type === 'arc' && s.nova) {
        tw.novaT = (tw.novaT || 0) + dt;
        if (tw.novaT >= s.nova.cd) {
          grid.query(tw.x, tw.y, s.nova.radius, tmpQuery);
          const targets = tmpQuery.filter(targetable);
          if (targets.length) {
            tw.novaT = 0;
            addRing(tw.x, tw.y, s.nova.radius, 'rgba(255,190,90,0.75)', 0.5);
            for (const e of targets) damageEnemy(e, s.nova.dmg, 'magic', s);
            sfx.zap();
          }
        }
      }
      if (tw.cooldown > 0) continue;
      if (tw.type === 'harpoon') {
        const targets = pickTargets(tw, s, s.targets || 1);
        if (targets.length) { tw.cooldown = 1 / s.rate; fireHarpoon(tw, s, targets); }
      } else if (tw.type === 'arc') {
        const targets = pickTargets(tw, s, 1);
        if (targets.length) {
          tw.cooldown = 1 / s.rate;
          tw.angle = Math.atan2(targets[0].y - tw.y, targets[0].x - tw.x);
          fireArc(tw, s, targets[0]);
        }
      } else if (tw.type === 'charge') {
        // artillery refuses point-blank fast targets less: just fire at priority pick
        const targets = pickTargets(tw, s, 1).filter(e => !e.def.flying);
        if (targets.length) { tw.cooldown = 1 / s.rate; fireShell(tw, s, targets[0]); }
      }
    }
  }

  function updateProjectiles(dt) {
    for (const p of B.projectiles) {
      if (p.dead) continue;
      const tgt = p.target;
      if (tgt && !tgt.dead && !tgt.hidden) { p.tx = tgt.x; p.ty = tgt.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 6) {
        p.dead = true;
        if (tgt && !tgt.dead && !tgt.hidden) {
          damageEnemy(tgt, p.dmg, 'physical', p.stats);
          if (p.stats.bleed && !tgt.dead) {
            tgt.status.bleed = { t: p.stats.bleed.dur, dps: p.stats.bleed.dps };
          }
          if (p.stats.shred && !tgt.dead) {
            tgt.status.shred = Math.min(p.stats.shred.max, tgt.status.shred + p.stats.shred.per);
          }
          particles.burst(p.tx, p.ty, 5, { color: '#ffe2a8', speed: 60, life: 0.25, size: 1.5, glow: true });
          addFlash(p.tx, p.ty, p.ang);
          sfx.hit();
        }
      } else {
        p.ang = Math.atan2(dy, dx);
        p.x += dx / d * step;
        p.y += dy / d * step;
      }
    }
    for (let i = B.projectiles.length - 1; i >= 0; i--) if (B.projectiles[i].dead) B.projectiles.splice(i, 1);

    for (let i = B.shells.length - 1; i >= 0; i--) {
      const sh = B.shells[i];
      sh.t += dt;
      if (sh.t >= sh.dur) {
        B.shells.splice(i, 1);
        explode(sh.tx, sh.ty, sh.stats, sh.mul || 1);
      }
    }
  }

  // ---------- build menu ----------

  function optionList(padIndex) {
    const tw = B.towers.get(padIndex);
    const opts = [];
    if (!tw) {
      for (const tid of allowedTowers) {
        opts.push({ kind: 'build', type: tid, cost: buildCost(tid, meta), label: S.towers[tid].name, icon: 'build_' + tid });
      }
    } else if (!tw.branch && tw.level < 2) {
      opts.push({ kind: 'upgrade', cost: upgradeCost(tw, meta), label: S.ui.upgrade, icon: 'upgrade' });
      pushCommon(opts, tw);
    } else if (!tw.branch) {
      const ids = Object.keys(TOWERS[tw.type].branches);
      for (const bid of ids) {
        opts.push({ kind: 'branch', branch: bid, cost: branchCost(tw.type, bid, meta), label: S.branches[bid].name, icon: 'branch' });
      }
      pushCommon(opts, tw);
    } else {
      const bdef = TOWERS[tw.type].branches[tw.branch];
      for (const ab of bdef.abilities) {
        if (!tw.abilities[ab.id]) {
          opts.push({ kind: 'ability', ability: ab.id, cost: ab.cost, label: S.abilities[ab.id].name, icon: 'ability' });
        }
      }
      pushCommon(opts, tw);
    }
    return opts;
  }

  function pushCommon(opts, tw) {
    if (tw.type === 'drone') {
      opts.push({ kind: 'rally', label: 'Rally Point', icon: 'rally' });
    }
    if (tw.type !== 'drone' && tw.type !== 'sonar') {
      opts.push({ kind: 'priority', label: S.ui.priority + ': ' + S.ui.priorities[tw.priority || 'first'], icon: 'priority' });
    }
    opts.push({ kind: 'sell', cost: Math.round(tw.invested * SELL_REFUND), label: S.ui.sell, icon: 'sell' });
  }

  function openMenu(padIndex) {
    const pad = L.pads[padIndex];
    const opts = optionList(padIndex);
    const n = opts.length;
    // fan opens toward the screen centre so edge pads never squash the ring
    const baseA = Math.atan2(H / 2 - 30 - pad[1], W / 2 - pad[0]);
    const spread = n > 3 ? 0.66 : 0.85;
    const rad = n > 3 ? 74 : 62;
    opts.forEach((o, i) => {
      const a = baseA + (i - (n - 1) / 2) * spread;
      o.x = Math.max(30, Math.min(W - 30, pad[0] + Math.cos(a) * rad));
      o.y = Math.max(78, Math.min(H - 34, pad[1] + Math.sin(a) * rad));
      o.r = 25;
    });
    B.menu = { padIndex, opts, t: 0, sel: null };
    sfx.click();
  }

  function doOption(o) {
    const padIndex = B.menu.padIndex;
    const pad = L.pads[padIndex];
    const tw = B.towers.get(padIndex);
    const fail = () => { addFloat(pad[0], pad[1] - 30, S.ui.noGold, '#ff8080'); sfx.deny(); };
    if (o.kind === 'build') {
      if (B.gold < o.cost) return fail();
      B.gold -= o.cost;
      const ntw = {
        x: pad[0], y: pad[1], type: o.type, level: 0, branch: null, abilities: {},
        cooldown: 0, angle: -Math.PI / 2, recoil: 0, invested: o.cost, priority: 'first',
        _stats: null, buff: null, disabled: 0, born: 0, pop: 0,
      };
      B.towers.set(padIndex, ntw);
      markStatsDirty();
      if (o.type === 'drone') initDrones(ntw);
      // it lands: silt ring, rising bubbles, a thump of dust
      particles.burst(pad[0], pad[1], 12, { color: '#7fdcff', speed: 60, life: 0.4, size: 2, glow: true });
      particles.burst(pad[0], pad[1] + 8, 14, { color: '#cdbb96', speed: 95, life: 0.55, size: 3 });
      for (let bi = 0; bi < 6; bi++) {
        particles.spawn(pad[0] + (rng.float() - 0.5) * 26, pad[1] + 6, {
          vx: (rng.float() - 0.5) * 18, vy: -34 - rng.float() * 26,
          life: 0.7, size: 2 + rng.float() * 2, color: '#bfe8ff', drag: 0.94,
        });
      }
      addRing(pad[0], pad[1], 40, 'rgba(160,230,255,0.85)', 0.45);
      if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.35);
      sfx.place();
      sfx.clank();
      B.menu = null;
    } else if (o.kind === 'upgrade') {
      if (B.gold < o.cost) return fail();
      B.gold -= o.cost; tw.level++; tw.invested += o.cost;
      tw.pop = 1;
      markStatsDirty();
      if (tw.type === 'drone') for (const dr of tw.drones) { const s = statsOf(tw); dr.max = s.droneHp; dr.hp = Math.min(dr.max, dr.hp + 60); }
      particles.burst(tw.x, tw.y, 14, { color: '#ffd873', speed: 70, life: 0.5, size: 2, glow: true });
      sfx.upgrade();
      B.menu = null;
    } else if (o.kind === 'branch') {
      if (B.gold < o.cost) return fail();
      B.gold -= o.cost; tw.branch = o.branch; tw.invested += o.cost;
      markStatsDirty();
      if (tw.type === 'drone') { const s = statsOf(tw); for (const dr of tw.drones) { dr.max = s.droneHp; dr.hp = s.droneHp; } }
      addRing(tw.x, tw.y, 44, 'rgba(255,216,115,0.8)', 0.6);
      sfx.branch();
      B.menu = null;
    } else if (o.kind === 'ability') {
      if (B.gold < o.cost) return fail();
      B.gold -= o.cost; tw.abilities[o.ability] = true; tw.invested += o.cost;
      if (Object.keys(tw.abilities).length >= 2) battleFeat('maxTower');
      markStatsDirty();
      addRing(tw.x, tw.y, 36, 'rgba(140,240,190,0.8)', 0.5);
      sfx.upgrade();
      B.menu = null;
    } else if (o.kind === 'rally') {
      B.rallyArm = padIndex;
      B.menu = null;
      setBanner('Tap near the path to plant the rally flag', 4);
    } else if (o.kind === 'priority') {
      const i = PRIORITIES.indexOf(tw.priority || 'first');
      tw.priority = PRIORITIES[(i + 1) % PRIORITIES.length];
      B.menu = null;
      openMenu(padIndex);
    } else if (o.kind === 'sell') {
      B.gold += o.cost;
      // salvage: scrap debris + coins vacuum to the counter
      for (let ci = 0; ci < 3; ci++) B.coins.push({ x: pad[0] + (ci - 1) * 9, y: pad[1] - 6, t: -ci * 0.08 });
      particles.burst(pad[0], pad[1], 10, { color: '#8a97a5', speed: 95, life: 0.5, size: 2.5 });
      if (tw.drones) for (const dr of tw.drones) if (dr.target && dr.target.blockedBy === dr) dr.target.blockedBy = null;
      B.towers.delete(padIndex);
      markStatsDirty();
      addFloat(pad[0], pad[1] - 24, '+' + o.cost, '#ffd873');
      sfx.sell();
      B.menu = null;
    }
  }

  function hoveredOption() {
    if (!B.menu) return null;
    for (const o of B.menu.opts) {
      const dx = B.hover.x - o.x, dy = B.hover.y - o.y;
      if (dx * dx + dy * dy <= o.r * o.r) return o;
    }
    return null;
  }

  // Touch has no hover: the first tap previews an option, the second commits it.
  const isTouch = () => game.pointerType === 'touch';
  // extra full-screen passes (caustics, drifting motes) cost real fill rate
  // on low-end phones; the settings toggle turns them off.
  const fxHigh = () => game.save.settings.fx !== false;
  // Fingers are blunter than cursors: grow hit areas on touch without moving
  // any pixels. `grow` is trimmed where neighbouring buttons would collide.
  function hitUI(b, x, y, grow = 6) {
    const g = isTouch() ? grow : 0;
    return x >= b.x - g && x <= b.x + b.w + g && y >= b.y - g && y <= b.y + b.h + g;
  }
  const touchR = (r, extra = 6) => (isTouch() ? r + extra : r);
  // What the menu is currently describing — hovered (mouse) or selected (touch).
  function focusedOption() {
    return hoveredOption() || (B.menu ? B.menu.sel : null);
  }

  // ---------- update ----------

  function update(rawDt) {
    if (B.paused) return;
    if (B.hitStop > 0) { B.hitStop -= rawDt; return; } // impact freeze
    let dt = rawDt * B.speed;
    // tutorial slow-motion: combat crawls while the player learns hero + spells
    if (tut && !tut.done && tut.step >= 4 && tut.step <= 6) dt *= 0.3;
    B.time += dt;
    rebuildLights();   // must precede anything that targets
    B.reinfCd = Math.max(0, B.reinfCd - dt);
    B.torpCd = Math.max(0, B.torpCd - dt);
    B.flareCd = Math.max(0, B.flareCd - dt);
    B.whiteFlash = Math.max(0, B.whiteFlash - rawDt);
    B.letterbox = Math.max(0, B.letterbox - rawDt);
    B.goldPulse = Math.max(0, B.goldPulse - rawDt);
    for (let i = B.coins.length - 1; i >= 0; i--) {
      const c = B.coins[i];
      c.t += rawDt * 2.2;
      if (c.t >= 1) { B.coins.splice(i, 1); B.goldPulse = 0.18; }
    }
    if (B.speech) {
      B.speech.t += rawDt;
      if (B.speech.t > B.speech.life) B.speech = null;
    }
    if (B.inspect) {
      B.inspect.t += rawDt;
      if (B.inspect.t > 5 || B.inspect.e.dead) B.inspect = null;
    }
    B.shake = Math.max(0, B.shake - rawDt * 3);
    B.leakFlash = Math.max(0, B.leakFlash - rawDt);
    if (B.hitStopCd > 0) B.hitStopCd -= rawDt;
    for (let i = B.introCards.length - 1; i >= 0; i--) {
      B.introCards[i].t += rawDt;
      if (B.introCards[i].t >= B.introCards[i].life) B.introCards.splice(i, 1);
    }
    for (let i = B.flares.length - 1; i >= 0; i--) {
      const f = B.flares[i];
      f.life -= dt;
      f.r = f.r0 * Math.min(1, f.life / 1.2);   // burns down rather than snapping off
      if (f.life <= 0) B.flares.splice(i, 1);
    }
    // a pause in the killing drops the chime back to the bottom of the scale
    if (B.coinStreakT > 0) {
      B.coinStreakT -= rawDt;
      if (B.coinStreakT <= 0) B.coinStreak = 0;
    }
    particles.update(dt);
    for (const m of motes) {
      m.y -= m.s * dt;
      if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; }
    }
    for (let i = B.floats.length - 1; i >= 0; i--) {
      const f = B.floats[i]; f.t += rawDt; f.y -= 28 * rawDt;
      if (f.t > f.life) B.floats.splice(i, 1);
    }
    for (let i = B.bolts.length - 1; i >= 0; i--) {
      const b = B.bolts[i]; b.t += rawDt;
      if (b.t > b.life) B.bolts.splice(i, 1);
    }
    for (let i = B.rings.length - 1; i >= 0; i--) {
      const r = B.rings[i]; r.t += rawDt;
      if (r.t > r.dur) B.rings.splice(i, 1);
    }
    for (let i = B.flashes.length - 1; i >= 0; i--) {
      const f = B.flashes[i]; f.t += rawDt;
      if (f.t > 0.09) B.flashes.splice(i, 1);
    }
    for (let i = B.zones.length - 1; i >= 0; i--) {
      const z = B.zones[i]; z.t += dt;
      if (z.t > z.dur) B.zones.splice(i, 1);
    }
    for (const c of B.corpses) c.t += dt;
    if (trap) trap.cd = Math.max(0, trap.cd - dt);
    for (const tw of B.towers.values()) {
      if (tw.born != null && tw.born < 1) tw.born = Math.min(1, tw.born + rawDt * 2.6);
      if (tw.pop > 0) tw.pop = Math.max(0, tw.pop - rawDt * 3.5);
    }
    if (B.flourish) {
      B.flourish.t += rawDt;
      if (B.flourish.t > B.flourish.life) B.flourish = null;
    }
    for (let i = B.scorch.length - 1; i >= 0; i--) {
      B.scorch[i].t += dt;
      if (B.scorch[i].t > 20) B.scorch.splice(i, 1);
    }
    // desperation heartbeat when the hull is nearly gone
    if (B.phase === 'wave' && B.lives <= Math.max(3, lives * 0.2)) {
      B.heartT = (B.heartT || 0) + rawDt;
      if (B.heartT > 1.15) { B.heartT = 0; sfx.heartbeat(); }
    }
    if (B.banner) {
      B.banner.t += rawDt;
      if (B.banner.t > B.banner.life) B.banner = null;
    }
    if (B.menu) B.menu.t += rawDt;

    if (B.phase === 'over') {
      B.overTimer += rawDt;
      if (B.overTimer > 1.8) {
        finishBattle();
      }
      return;
    }

    tutorialAdvanceChecks();
    const bossE = B.enemies.find(e => e.boss && !e.dead);
    if (!!bossE !== musicBoss) {
      musicBoss = !!bossE;
      setMood(bossE ? 'boss' : 'battle');
    }
    setIntensity(bossE ? (bossE.phase + 1) / 3 : (B.lives <= lives * 0.25 ? 0.5 : 0));

    if (B.phase === 'between') {
      B.countdown -= dt;
      // Auto-call routes through callWave() rather than starting the wave
      // directly, so the player still collects the early-call bonus. Going
      // straight to startWave() here was why the setting silently cost gold.
      if (B.countdown <= 0) {
        if (game.save.settings.autoWave) callWave(); else startWave();
      }
    }

    if (B.phase === 'wave') {
      for (const g of B.spawner) {
        g.t += dt;
        while (g.spawned < g.count && g.t >= g.spawned * g.gap) {
          spawnEnemy(g.type, { path: g.path || 0, elite: g.elite, hpMul: g.hpMul });
          g.spawned++;
        }
      }
    }

    grid.rebuild(B.enemies);
    updateAuras(dt);
    if (B.phase === 'wave' || B.enemies.length) updateEnemies(dt);
    if (B.phase === 'over') return;
    grid.rebuild(B.enemies);
    updateHero(dt);
    updateReinf(dt);
    updateTowers(dt);
    updateProjectiles(dt);

    for (let i = B.enemies.length - 1; i >= 0; i--) {
      if (B.enemies[i].dead) B.enemies.splice(i, 1);
    }

    if (B.phase === 'wave') {
      const allSpawned = B.spawner.every(g => g.spawned >= g.count);
      if (allSpawned && B.enemies.length === 0) {
        const bonus = L.waveBonus + B.waveIndex * 3;
        B.gold += bonus; B.goldEarned += bonus;
        B.flourish = { t: 0, life: 2.1, bonus };
        for (let i = 0; i < 18; i++) {
          particles.spawn(W / 2 + (rng.float() - 0.5) * 260, 118 + (rng.float() - 0.5) * 30, {
            vx: (rng.float() - 0.5) * 70, vy: -20 - rng.float() * 50,
            life: 0.8, size: 2 + rng.float() * 2, color: rng.float() > 0.5 ? '#ffe9a8' : '#7df3a8',
            glow: true, drag: 0.93,
          });
        }
        if (meta.lifeRegen && B.lives < lives) {
          B.lives = Math.min(lives, B.lives + meta.lifeRegen);
          addFloat(168, 60, '+' + meta.lifeRegen, '#7df3a8');
        }
        if (B.waveIndex >= waves.length - 1) {
          B.outcome = 'won'; B.phase = 'over'; B.whiteFlash = 0.35; sfx.victory();
          // Site-wide celebration, but only for a boss station on a first,
          // unmodified clear — the docs are explicit that it stops feeling
          // special if routine wins fire it.
          if (L.boss && !challenge && !game.save.stars[L.id]) happytime();
        } else {
          B.phase = 'between';
          B.countdown = game.save.settings.autoWave ? 2 : BETWEEN_WAVE_TIME;
          const idx = (B.waveIndex + 1) % S.taunts.length;
          setBanner(S.taunts[idx], 3.5);
        }
      }
    }
  }

  function finishBattle() {
    const won = B.outcome === 'won';
    const stars = B.lives >= lives * 0.9 ? 3 : B.lives >= lives * 0.5 ? 2 : 1;
    // lifetime stats + related feats
    game.save.stats.kills += B.kills;
    if (game.save.stats.kills >= 100) awardFeat(game.save, 'k100');
    if (game.save.stats.kills >= 1000) awardFeat(game.save, 'k1000');
    if (endless) {
      const cleared = B.waveIndex;
      game.save.endlessBest = Math.max(game.save.endlessBest || 0, cleared);
      if (cleared >= 20) awardFeat(game.save, 'endless20');
    }
    game.persist();
    const resultData = {
      won, lives: B.lives, maxLives: lives,
      waves: B.waveIndex + (won ? 1 : 0), totalWaves: waves.length,
      kills: B.kills, goldEarned: B.goldEarned,
      stars: won ? stars : 0,
      levelId: L.id, difficulty: diff, challenge,
      endless, endlessWave: endless ? B.waveIndex : null,
      hint: !won && B.lastLeakType
        ? (B.lastLeakType.flying ? S.results2.hintFly
          : (B.lastLeakType.cloak || B.lastLeakType.submerge) ? S.results2.hintHidden
          : S.results2.hintGeneric)
        : null,
    };
    // The intro comic is deferred until station 1 is beaten, so a new player
    // reaches gameplay in one click and gets the story as a reward.
    if (won && L.id === 'level01' && !challenge && !game.save.comics.intro) {
      game.save.comics.intro = true;
      game.persist();
      game.setState('comic', { scene: 'intro', next: { state: 'results', data: resultData } });
      return;
    }
    if (won && L.id === 'level15' && !challenge && !game.save.comics.finale) {
      game.save.comics.finale = true;
      game.persist();
      game.setState('comic', { scene: 'finale', next: { state: 'results', data: resultData } });
      return;
    }
    game.setState('results', resultData);
  }

  // ---------- input ----------

  function pointerDown(x, y) {
    if (B.phase === 'over') return;
    if (hitUI(UI.pauseBtn, x, y, 4)) { B.paused = !B.paused; setMuffled(B.paused); sfx.click(); return; }
    if (B.paused) {
      if (hitRect(pauseBtns.resume, x, y)) { B.paused = false; setMuffled(false); sfx.click(); }
      else if (hitRect(pauseBtns.quit, x, y)) { sfx.click(); game.setState('map'); }
      return;
    }
    if (tut && !tut.done && hitRect(tutSkipBtn, x, y)) { finishTutorial(); sfx.click(); return; }
    if (hitUI(UI.speedBtn, x, y, 4)) {
      B.speed = B.speed === 1 ? 2 : B.speed === 2 ? 3 : 1;
      UI.speedBtn.label = B.speed + '×';
      sfx.click();
      return;
    }
    // global spell buttons
    if (B.hero !== undefined) {
      if (hitUI(UI.spellReinf, x, y)) {
        if (B.reinfCd <= 0) { B.spellArm = 'reinf'; sfx.click(); setBanner('Tap anywhere to drop reinforcements', 3); }
        else sfx.deny();
        return;
      }
      if (hitUI(UI.spellTorp, x, y)) {
        if (B.torpCd <= 0) { B.spellArm = 'torp'; sfx.click(); setBanner('Tap a target for the torpedo strike', 3); }
        else sfx.deny();
        return;
      }
      if (B.dark && hitUI(UI.spellFlare, x, y)) {
        if (B.flareCd <= 0) { B.spellArm = 'flare'; sfx.click(); setBanner('Tap anywhere to light a flare', 3); }
        else sfx.deny();
        return;
      }
    }
    // environmental vent trap
    if (trap && trap.cd <= 0 && Math.hypot(x - trap.x, y - trap.y) <= touchR(24)) {
      trap.cd = TRAP_CD;
      addRing(trap.near.x, trap.near.y, 95, 'rgba(140,240,255,0.9)', 0.5);
      addFlash(trap.near.x, trap.near.y, 0, true);
      if (game.save.settings.shake) B.shake = Math.max(B.shake, 0.7);
      sfx.boom();
      grid.query(trap.near.x, trap.near.y, 95, tmpQuery);
      for (const e of tmpQuery) {
        if (e.dead || e.hidden) continue;
        damageEnemy(e, 95, null);
      }
      B.zones.push({ x: trap.near.x, y: trap.near.y, r: 85, slow: 0.55, t: 0, dur: 3.5 });
      return;
    }
    if (B.spellArm) {
      const kind = B.spellArm;
      B.spellArm = null;
      if (y > 52 && y < H - 70) {
        if (kind === 'reinf') castReinforcements(x, y);
        else if (kind === 'flare') castFlare(x, y);
        else castTorpedo(x, y);
      }
      return;
    }
    if ((B.phase === 'prep' || B.phase === 'between') && hitUI(UI.waveBtn, x, y)) {
      sfx.click(); callWave(); return;
    }
    // KR-style portal flags call the wave too
    if ((B.phase === 'prep' || B.phase === 'between') && B.waveMarkers) {
      // A build site — or any option fanned out of an open build ring — always
      // wins over the flag. Otherwise tapping "build harpoon" next to a spawn
      // cave launches the wave instead of building anything.
      const onPad = L.pads.some(p => !p.destroyed
        && (x - p[0]) ** 2 + (y - p[1]) ** 2 <= touchR(PAD_R + 8) ** 2);
      const onMenu = !!B.menu && B.menu.opts.some(o =>
        (x - o.x) ** 2 + (y - o.y) ** 2 <= touchR(o.r) ** 2);
      if (!onPad && !onMenu) {
        for (const m of B.waveMarkers) {
          if ((x - m.x) ** 2 + (y - m.y) ** 2 < touchR(27, 8) ** 2) { sfx.click(); callWave(); return; }
        }
      }
    }
    if (B.hero && hitUI(UI.abilityBtn, x, y)) { castAbility(); return; }
    if (B.rallyArm != null) {
      const tw = B.towers.get(B.rallyArm);
      B.rallyArm = null;
      if (tw) {
        // snap to the closest path point near the tap, within extended leash
        let best = null, bd = Infinity, bestPath = 0;
        for (let pi = 0; pi < paths.length; pi++) {
          const r = nearestOnPath(paths[pi], x, y);
          const d = (r.x - x) ** 2 + (r.y - y) ** 2;
          if (d < bd) { bd = d; best = r; bestPath = pi; }
        }
        const s = statsOf(tw);
        if (best && Math.hypot(best.x - tw.x, best.y - tw.y) <= s.range * 1.7 && bd < 90 * 90) {
          tw.rally = best;
          tw.rallyPath = bestPath;
          addRing(best.x, best.y, 26, 'rgba(140,240,190,0.9)', 0.5);
          sfx.place();
        } else {
          addFloat(x, y - 14, 'Out of range', '#ff8080', 12);
        }
      }
      return;
    }
    if (B.menu) {
      for (const o of B.menu.opts) {
        const dx = x - o.x, dy = y - o.y;
        if (dx * dx + dy * dy > touchR(o.r) ** 2) continue;
        // on touch, show the player what they're buying before charging them
        if (isTouch() && B.menu.sel !== o) { B.menu.sel = o; sfx.click(); return; }
        sfx.click();
        doOption(o);
        return;
      }
      B.menu = null;
    }
    // hero select
    const h = B.hero;
    if (h && !h.dead) {
      const dh = Math.hypot(x - h.x, y - h.y);
      if (dh <= touchR(20)) {
        h.selected = !h.selected;
        sfx.click();
        return;
      }
    }
    for (let i = 0; i < L.pads.length; i++) {
      const p = L.pads[i];
      if (p.destroyed) continue;
      const dx = x - p[0], dy = y - p[1];
      if (dx * dx + dy * dy <= touchR(PAD_R + 8) ** 2) {
        // rapid taps break a jammed tower free early
        const twQ = B.towers.get(i);
        if (twQ && twQ.disabled > 0) {
          twQ.disabled = Math.max(0, twQ.disabled - 1.2);
          addFlash(twQ.x, twQ.y - 10, 0);
          addFloat(twQ.x, twQ.y - 32, 'CLANG', '#ffe66f', 12);
          sfx.clank();
          if (h) h.selected = false;
          return;
        }
        if (h) h.selected = false;
        openMenu(i);
        return;
      }
    }
    // move order for a selected hero
    if (h && !h.dead && h.selected && y > 52) {
      h.tx = Math.max(20, Math.min(W - 20, x));
      h.ty = Math.max(60, Math.min(H - 20, y));
      addRing(h.tx, h.ty, 16, 'rgba(140,240,190,0.7)', 0.4);
      sfx.click();
      return;
    }
    // tap a creature to inspect it
    for (const e of B.enemies) {
      if (e.dead || e.hidden) continue;
      if (Math.hypot(x - e.x, y - e.y) <= e.def.radius + 8) {
        B.inspect = { e, t: 0 };
        sfx.click();
        return;
      }
    }
  }

  function onKey(key) {
    if (B.phase === 'over') return;
    // Escape closes an open build/upgrade ring first — pausing out from under
    // a player who only wanted to dismiss a menu reads as a bug. Note the
    // browser also exits fullscreen on Escape, which is why P exists as the
    // binding that always pauses.
    if (key === 'Escape' && B.menu) { B.menu = null; sfx.click(); return; }
    if (key === 'Escape' || key === 'p') { B.paused = !B.paused; setMuffled(B.paused); sfx.click(); return; }
    if (B.paused) return;
    if (key === ' ') { castAbility(); return; }
    if (key === 'enter' || key === 'w') {
      if (B.phase === 'prep' || B.phase === 'between') { sfx.click(); callWave(); }
      return;
    }
    if (key === 'h' && B.hero && !B.hero.dead) { B.hero.selected = true; sfx.click(); return; }
    if (key === 's') {
      B.speed = B.speed === 1 ? 2 : B.speed === 2 ? 3 : 1;
      UI.speedBtn.label = B.speed + '×';
      sfx.click();
    }
  }

  function pointerMove(x, y) { B.hover.x = x; B.hover.y = y; }

  // ---------- render ----------

  function drawCore(ctx) {
    for (const path of paths) {
      const end = path.pts[path.pts.length - 1];
      const x = end.x, y = end.y;
      const pulse = 0.5 + 0.5 * Math.sin(B.time * 3);
      glowCircle(ctx, x, y, 52, 'rgba(80,220,255,0.13)');
      // contact shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x + 2, y + 13, 34, 10, 0, 0, TAU); ctx.fill();
      // riveted base plinth
      const bg2 = ctx.createLinearGradient(x, y, x, y + 13);
      bg2.addColorStop(0, '#33739c');
      bg2.addColorStop(1, '#122e42');
      ctx.fillStyle = bg2;
      roundRect(ctx, x - 30, y + 1, 60, 11, 4);
      ctx.fill();
      inkStroke(ctx, 2.4);
      ctx.fillStyle = '#9fd4ea';
      for (const bx of [-24, -12, 12, 24]) {
        ctx.beginPath(); ctx.arc(x + bx, y + 6.5, 1.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
      }
      // dome shaded like a sphere lit from upper-left
      const dg = ctx.createRadialGradient(x - 8, y - 14, 3, x, y - 4, 27);
      dg.addColorStop(0, '#71b9de');
      dg.addColorStop(0.55, '#2d6f96');
      dg.addColorStop(1, '#123a54');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(x, y + 2, 23, Math.PI, 0); ctx.closePath(); ctx.fill();
      inkStroke(ctx, 2.6);
      // panel seams
      ctx.strokeStyle = 'rgba(9,26,40,0.5)';
      ctx.lineWidth = 1.5;
      for (const rx of [9, 17]) {
        ctx.beginPath(); ctx.ellipse(x, y + 2, rx, 23, 0, Math.PI, TAU); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(x, y + 2, 23, 8, 0, Math.PI, TAU); ctx.stroke();
      // specular sheen
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(x - 9, y - 12, 6.5, 3.2, -0.5, 0, TAU); ctx.fill();
      // warm porthole
      glowCircle(ctx, x, y - 7, 9 + pulse * 4, 'rgba(255,220,140,0.5)');
      ctx.fillStyle = '#0d2233';
      ctx.beginPath(); ctx.arc(x, y - 7, 6.5, 0, TAU); ctx.fill();
      inkStroke(ctx, 2);
      ctx.fillStyle = `rgba(255,${215 + (pulse * 25 | 0)},135,0.95)`;
      ctx.beginPath(); ctx.arc(x, y - 7, 4, 0, TAU); ctx.fill();
      // beacon mast
      ctx.strokeStyle = '#22303a'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x + 14, y - 15); ctx.lineTo(x + 18, y - 28); ctx.stroke();
      const blink = Math.sin(B.time * 4) > 0.2;
      if (blink) glowCircle(ctx, x + 18, y - 29, 7, 'rgba(255,110,95,0.8)');
      ctx.fillStyle = blink ? '#ff8a75' : '#5a2c26';
      ctx.beginPath(); ctx.arc(x + 18, y - 29, 2.4, 0, TAU); ctx.fill();
      inkStroke(ctx, 1.2);
    }
  }

  function drawZones(ctx) {
    for (const z of B.zones) {
      const a = Math.max(0, 1 - z.t / z.dur) * 0.35;
      ctx.fillStyle = `rgba(200,150,90,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(240,190,120,${(a * 1.6).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawPads(ctx) {
    // static platforms live in the pre-rendered background; only the
    // "build here" pulse is dynamic
    // An empty pad has to read as "build here" at a glance — the old 2px ring
    // was nearly invisible in a still frame.
    const affordable = TOWER_ORDER.some(t => allowedTowers.includes(t) && B.gold >= buildCost(t, meta));
    L.pads.forEach((p, i) => {
      if (p.destroyed || B.towers.has(i)) return;
      const ph = B.time * 2.2 + i * 0.7;
      const pulse = 0.5 + 0.5 * Math.sin(ph);
      const x = p[0], y = p[1] + 2;
      // soft glow pool under the pad
      glowCircle(ctx, x, y, 24 + pulse * 5, affordable
        ? `rgba(120,225,255,${(0.16 + pulse * 0.12).toFixed(3)})`
        : `rgba(120,150,170,${(0.08 + pulse * 0.05).toFixed(3)})`);
      // expanding beckon ring
      ctx.globalAlpha = 0.45 * (1 - pulse) + 0.15;
      ctx.strokeStyle = affordable ? '#7fe6ff' : '#8fa6b5';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(x, y, 17 + pulse * 9, 10.5 + pulse * 5.5, 0, 0, TAU);
      ctx.stroke();
      // steady inner ring so the spot is legible even at the dim part of the pulse
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(x, y, 17, 10.5, 0, 0, TAU);
      ctx.stroke();
      // little hammer-tick marks, KR-style "this is a slot"
      if (affordable) {
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.fillStyle = '#bff2ff';
        for (const a of [-Math.PI / 2, Math.PI / 2]) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 17, y + Math.sin(a) * 10.5, 1.8, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    });
  }

  function drawDrone(ctx, dr) {
    if (dr.dead) return;
    ctx.save();
    ctx.translate(dr.x, dr.y);
    const bob = Math.sin(B.time * 4 + dr.slot * 2) * 2;
    ctx.translate(0, bob);
    const col = dr.bay.branch === 'ram' ? '#c9a05f' : dr.bay.branch === 'stinger' ? '#a8d95f' : '#7fc9e8';
    ctx.fillStyle = dr.hurtT > 0 ? '#ff9a8a' : col;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
    // little prop fins
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-11, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-11, 6); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(2, -1, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    if (dr.hp < dr.max) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(dr.x - 8, dr.y - 13, 16, 3);
      ctx.fillStyle = '#8df0c0';
      ctx.fillRect(dr.x - 8, dr.y - 13, 16 * Math.max(0, dr.hp / dr.max), 3);
    }
  }

  function drawEnemy(ctx, e) {
    const d = e.def;
    ctx.save();
    // flyers hover above the road; everyone scales up out of the cave mouth
    ctx.translate(e.x, e.y - (d.flying ? 12 : 0));
    if (e.emergeT > 0) {
      const em = Math.max(0.15, 1 - e.emergeT / 0.5);
      ctx.scale(em, em);
    }
    const flip = Math.cos(e.angle) < 0;
    ctx.rotate(e.angle);
    if (flip && !d.flying) ctx.scale(1, -1); // keep bellies down
    // subtle swim squash & stretch
    if (!e.boss) {
      const sq = Math.sin(e.wob * 2.3) * 0.06;
      ctx.scale(1 + sq, 1 - sq);
    }
    if (e.hitT > 0) { ctx.globalAlpha = 0.85; }
    if (e.boss) {
      const s = d.scale || 2;
      ctx.scale(s, s);
      drawEnemyBody(ctx, e);
      ctx.scale(1 / s, 1 / s);
      drawBossAccents(ctx, e);
    } else {
      drawEnemyBody(ctx, e);
    }
    ctx.restore();
    // status pips
    if (e.status.stun > 0 || e.status.held > 0) {
      const a = 0.6 + 0.4 * Math.sin(B.time * 10);
      ctx.globalAlpha = a;
      drawText(ctx, e.status.stun > 0 ? '✶' : '♪', e.x, e.y - d.radius - 12, 12, '#ffe66f', 'center');
      ctx.globalAlpha = 1;
    }
    if (!e.hidden && (e.hp < e.maxHp || e.shieldHp > 0)) {
      // chunky KR bar: ink frame, dark red back, bright green front
      const w = Math.max(18, d.radius * 2.4);
      const y = e.y - d.radius - 11 - (d.flying ? 12 : 0);
      ctx.fillStyle = '#5c1414';
      ctx.fillRect(e.x - w / 2, y, w, 4.5);
      ctx.fillStyle = '#4adf5f';
      ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 4.5);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(e.x - w / 2, y, w, 4.5);
      if (e.shieldHp > 0) {
        ctx.fillStyle = '#8fd7e8';
        ctx.fillRect(e.x - w / 2, y - 4, w * Math.max(0, e.shieldHp / e.maxShield), 2.5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - w / 2, y - 4, w, 2.5);
      }
    }
  }

  function drawShells(ctx) {
    for (const sh of B.shells) {
      const t = sh.t / sh.dur;
      const x = sh.sx + (sh.tx - sh.sx) * t;
      const y = sh.sy + (sh.ty - sh.sy) * t - Math.sin(t * Math.PI) * (sh.mini ? 24 : 60);
      // target reticle
      ctx.strokeStyle = 'rgba(255,190,110,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sh.tx, sh.ty, 8 + 4 * Math.sin(B.time * 6), 0, TAU); ctx.stroke();
      ctx.fillStyle = sh.mini ? '#d9a05f' : '#4a5560';
      ctx.beginPath(); ctx.arc(x, y, sh.mini ? 3 : 5.5, 0, TAU); ctx.fill();
      inkStroke(ctx, 1.6);
    }
  }

  function drawProjectiles(ctx) {
    for (const p of B.projectiles) {
      const c = Math.cos(p.ang), s = Math.sin(p.ang);
      ctx.strokeStyle = '#ffe2a8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - c * 6, p.y - s * 6);
      ctx.lineTo(p.x + c * 6, p.y + s * 6);
      ctx.stroke();
      glowCircle(ctx, p.x, p.y, 6, 'rgba(255,210,122,0.5)');
    }
  }

  function drawBolts(ctx) {
    for (const b of B.bolts) {
      const a = Math.max(0, 1 - b.t / b.life);
      ctx.globalCompositeOperation = 'lighter';
      for (const [w, color] of [[5, `rgba(80,200,255,${(0.25 * a).toFixed(3)})`], [1.8, `rgba(230,250,255,${(0.9 * a).toFixed(3)})`]]) {
        ctx.lineWidth = w; ctx.strokeStyle = color;
        for (const seg of b.segs) {
          ctx.beginPath();
          ctx.moveTo(seg[0].x, seg[0].y);
          for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawSpawnPortals(ctx) {
    B.waveMarkers = [];
    for (const po of portals) {
      // cave mouth
      ctx.save();
      ctx.translate(po.x, po.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 10, 30, 10, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      g.addColorStop(0, '#05090c');
      g.addColorStop(0.75, '#1a232c');
      g.addColorStop(1, '#2c3a44');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 18, 0, 0, TAU); ctx.fill();
      inkStroke(ctx, 2.6);
      const pulse = 0.4 + 0.3 * Math.sin(B.time * 3);
      ring(ctx, 0, 0, 22, '#ff6f5f', 2, pulse);
      // warning sign
      ctx.fillStyle = '#ffd873';
      ctx.beginPath();
      ctx.moveTo(20, -22); ctx.lineTo(29, -8); ctx.lineTo(11, -8);
      ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.8);
      drawTextO(ctx, '!', 20, -13, 11, INK, 'center', 800, 0.1);
      ctx.restore();
      // next-wave preview minis above the portal
      if (B.phase === 'prep' || B.phase === 'between') {
        const next = waves[B.waveIndex + 1];
        if (next) {
          const groups = next.groups.filter(gr => (gr.path || 0) === po.path);
          const types = [...new Set(groups.map(gr => gr.type))].slice(0, 3);
          types.forEach((tp, i) => {
            const def = ENEMIES[tp];
            if (!def) { drawTextO(ctx, '☠', po.x - 20 + i * 26, po.y - 34, 15, '#ff9db4'); return; }
            ctx.save();
            ctx.translate(po.x - (types.length - 1) * 13 + i * 26, po.y - 36 + Math.sin(B.time * 3 + i) * 2);
            ctx.scale(0.85, 0.85);
            drawEnemyBody(ctx, { def, baseType: tp, type: tp, wob: B.time * 4 + i, hidden: false, elite: false, shieldHp: 1 });
            if (def.flying) {
              // wing flicks: this one comes by air
              ctx.strokeStyle = '#eaf6ff';
              ctx.lineWidth = 2.2;
              ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(-11, -9); ctx.quadraticCurveTo(-16, -14, -21, -12); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(11, -9); ctx.quadraticCurveTo(16, -14, 21, -12); ctx.stroke();
            } else {
              // ground line: this one walks
              ctx.strokeStyle = 'rgba(0,0,0,0.45)';
              ctx.lineWidth = 2.4;
              ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(-9, 12); ctx.lineTo(9, 12); ctx.stroke();
            }
            ctx.restore();
          });
          // KR-style tappable wave flag: bounce, chevrons down the path, countdown ring
          if (groups.length) {
            const bob = Math.sin(B.time * 4) * 3.5;
            const mx = Math.max(34, Math.min(W - 34, po.x + Math.cos(po.angle) * 52));
            const my = Math.max(92, Math.min(H - 92, po.y + Math.sin(po.angle) * 52)) + bob;
            const pulse = 0.5 + 0.5 * Math.sin(B.time * 5);
            glowCircle(ctx, mx, my, 25 + pulse * 7, 'rgba(255,190,90,0.4)');
            uiRoundButton(ctx, mx, my, 19, { accent: true });
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(po.angle);
            ctx.strokeStyle = '#fff6dd';
            ctx.lineWidth = 3.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const dxo of [-4.5, 4.5]) {
              ctx.beginPath();
              ctx.moveTo(dxo - 3, -6); ctx.lineTo(dxo + 4, 0); ctx.lineTo(dxo - 3, 6);
              ctx.stroke();
            }
            ctx.restore();
            if (B.phase === 'between') {
              const frac = Math.max(0, Math.min(1, B.countdown / BETWEEN_WAVE_TIME));
              ctx.strokeStyle = '#ffd873';
              ctx.lineWidth = 3.5;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(mx, my, 24, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - frac));
              ctx.stroke();
            }
            B.waveMarkers.push({ x: mx, y: my - bob });
          }
        }
      }
    }
  }

  function drawRouteChevrons(ctx) {
    if (B.phase !== 'prep' && B.phase !== 'between') return;
    const tmp2 = { x: 0, y: 0, angle: 0 };
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const p of paths) {
      const off = (B.time * 46) % 84;
      for (let d = off; d < p.total - 10; d += 84) {
        p.at(d, tmp2);
        const a = tmp2.angle;
        const fade = Math.min(1, d / 60, (p.total - d) / 60);
        ctx.globalAlpha = 0.5 * fade;
        ctx.beginPath();
        ctx.moveTo(tmp2.x - Math.cos(a - 0.5) * 8, tmp2.y - Math.sin(a - 0.5) * 8);
        ctx.lineTo(tmp2.x, tmp2.y);
        ctx.lineTo(tmp2.x - Math.cos(a + 0.5) * 8, tmp2.y - Math.sin(a + 0.5) * 8);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawReinf(ctx) {
    for (const r of B.reinf) {
      if (r.dead) continue;
      ctx.save();
      ctx.translate(r.x, r.y + Math.sin(B.time * 4 + r.x) * 1.5);
      if (r.hurtT > 0) ctx.globalAlpha = 0.8;
      // little dive-suit trooper
      ctx.fillStyle = '#5f8fa8';
      ctx.beginPath(); ctx.ellipse(0, 3, 7, 6, 0, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
      ctx.fillStyle = '#8fc0d8';
      ctx.beginPath(); ctx.arc(0, -5, 5.5, 0, TAU); ctx.fill(); inkStroke(ctx, 2);
      ctx.fillStyle = '#dff4ff';
      ctx.beginPath(); ctx.arc(1.5, -5, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      // ttl fuse ring
      ring(ctx, r.x, r.y, 11, '#8df0c0', 1.5, 0.4 * (r.ttl / 14));
      if (r.hp < r.max) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(r.x - 8, r.y - 15, 16, 3);
        ctx.fillStyle = '#8df0c0';
        ctx.fillRect(r.x - 8, r.y - 15, 16 * Math.max(0, r.hp / r.max), 3);
      }
    }
    for (const tp of B.torpedoes) {
      const t = tp.t / tp.dur;
      const y = tp.y - (1 - t) * 320;
      // reticle
      ctx.strokeStyle = 'rgba(255,120,90,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, 18 + 8 * Math.sin(B.time * 8), 0, TAU); ctx.stroke();
      // torpedo body
      ctx.save();
      ctx.translate(tp.x, y);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#5d6d7a';
      roundRect(ctx, -12, -4, 24, 8, 4);
      ctx.fill(); inkStroke(ctx, 2);
      ctx.fillStyle = '#ff8f6f';
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(18, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
      inkStroke(ctx, 1.6);
      ctx.restore();
      particles.spawn(tp.x + (Math.random() - 0.5) * 4, y - 14, { vy: -30, life: 0.3, size: 2, color: '#c9ecff', glow: true });
    }
  }

  function drawFlashes(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of B.flashes) {
      const a = Math.max(0, 1 - f.t / 0.09);
      const r = f.big ? 26 : 13;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, `rgba(255,245,200,${(0.9 * a).toFixed(3)})`);
      g.addColorStop(0.4, `rgba(255,190,90,${(0.55 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.fill();
      if (!f.big) {
        // spiky star burst
        ctx.strokeStyle = `rgba(255,240,190,${(0.85 * a).toFixed(3)})`;
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          const aa = f.ang + k * Math.PI / 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(aa) * 3, f.y + Math.sin(aa) * 3);
          ctx.lineTo(f.x + Math.cos(aa) * (9 + 5 * a), f.y + Math.sin(aa) * (9 + 5 * a));
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawRings(ctx) {
    for (const r of B.rings) {
      const t = r.t / r.dur;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - t) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.maxR * t, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const ICON_DRAW = {
    build_harpoon(ctx) {
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(6, -6); ctx.stroke();
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath(); ctx.moveTo(9, -9); ctx.lineTo(1, -6); ctx.lineTo(6, -1); ctx.closePath(); ctx.fill();
    },
    build_arc(ctx) {
      ctx.strokeStyle = '#7df3ff'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
      ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(3, -2); ctx.lineTo(-3, 2); ctx.lineTo(3, 10); ctx.stroke();
    },
    build_charge(ctx) {
      ctx.fillStyle = '#ffb35f';
      ctx.beginPath(); ctx.arc(0, 2, 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb35f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -10); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 2, 9, -0.6, 0.6); ctx.stroke();
    },
    build_drone(ctx) {
      ctx.fillStyle = '#8df0c0';
      ctx.beginPath(); ctx.arc(0, -2, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8df0c0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-3, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(3, 2); ctx.stroke();
    },
    build_sonar(ctx) {
      ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(-4, 0, i * 4, -0.9, 0.9); ctx.stroke(); }
    },
    upgrade(ctx) {
      ctx.strokeStyle = '#7df3a8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(0, -5); ctx.lineTo(7, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, 9); ctx.lineTo(0, 1); ctx.lineTo(7, 9); ctx.stroke();
    },
    branch(ctx) {
      ctx.strokeStyle = '#ffd873'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, -7); ctx.stroke();
    },
    ability(ctx) {
      ctx.fillStyle = '#8fe8c0';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 === 0 ? 8 : 3.5;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    },
    priority(ctx) {
      ctx.strokeStyle = '#c8ecff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-3, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(3, 0); ctx.stroke();
    },
    sell(ctx) {
      ctx.strokeStyle = '#ffd873'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -1, 7, 0, TAU); ctx.stroke();
      hexIcon(ctx, 0, -1, 3.5, '#ffd873');
    },
    rally(ctx) {
      ctx.strokeStyle = '#8df0c0'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(-3, -9); ctx.stroke();
      ctx.fillStyle = '#8df0c0';
      ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(9, -6); ctx.lineTo(-3, -2); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    },
  };

  function drawMenu(ctx) {
    if (!B.menu) return;
    const pad = L.pads[B.menu.padIndex];
    const tw = B.towers.get(B.menu.padIndex);
    const hov = focusedOption();
    let range = null;
    let rangeCx = pad[0], rangeCy = pad[1];
    if (tw) {
      range = statsOf(tw).range;
      if (tw.type === 'drone' && tw.rally) { rangeCx = tw.rally.x; rangeCy = tw.rally.y; }
      if (hov && hov.kind === 'upgrade') {
        const cur = statsOf(tw);
        const peek = { ...tw, level: tw.level + 1, _stats: null };
        const ns = resolveStats(peek, meta, tw.buff);
        range = ns.range;
        const parts = [];
        // stats are floats after multipliers; 47.040000000000006 is not a stat line
        const n = v => String(Math.round(v * 10) / 10);
        if (ns.dmg != null && ns.dmg !== cur.dmg) parts.push(`DMG ${n(cur.dmg)} → ${n(ns.dmg)}`);
        if (ns.droneDmg != null && ns.droneDmg !== cur.droneDmg) parts.push(`DMG ${n(cur.droneDmg)} → ${n(ns.droneDmg)}`);
        if (ns.range !== cur.range) parts.push(`RNG ${n(cur.range)} → ${n(ns.range)}`);
        if (ns.rate != null && ns.rate !== cur.rate) parts.push(`SPD ${n(cur.rate)} → ${n(ns.rate)}`);
        B.menu.delta = parts.join('    ');
      } else B.menu.delta = null;
      if (hov && hov.kind === 'branch') {
        const peek = { ...tw, branch: hov.branch, _stats: null };
        range = resolveStats(peek, meta, tw.buff).range;
      }
    } else if (hov && hov.kind === 'build') {
      range = TOWERS[hov.type].levels[0].range;
    }
    if (range) {
      ctx.fillStyle = 'rgba(95,227,255,0.07)';
      ctx.beginPath(); ctx.arc(rangeCx, rangeCy, range, 0, TAU); ctx.fill();
      ring(ctx, rangeCx, rangeCy, range, '#5fe3ff', 1.5, 0.5);
    }
    // elastic pop-in: discs spring out from the pad and overshoot slightly
    const mt = B.menu.t;
    const pop = Math.min(1.12, 1 - Math.exp(-mt * 11) * Math.cos(mt * 16));
    let minY = Infinity, cx = pad[0];
    B.menu.opts.forEach(o => { minY = Math.min(minY, o.y - o.r); });
    B.menu.opts.forEach(oRaw => {
      const o = {
        ...oRaw,
        x: pad[0] + (oRaw.x - pad[0]) * pop,
        y: pad[1] + (oRaw.y - pad[1]) * pop,
        r: oRaw.r * Math.min(1, Math.max(0.2, pop)),
      };
      const afford = o.cost == null || o.kind === 'sell' || B.gold >= o.cost;
      // drop shadow for depth
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.beginPath(); ctx.arc(o.x + 2, o.y + 4, o.r, 0, TAU); ctx.fill();
      const og = ctx.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.45, 3, o.x, o.y, o.r);
      if (!afford) {
        og.addColorStop(0, '#5c3540');
        og.addColorStop(1, '#241016');
      } else {
        og.addColorStop(0, '#4a86ad');
        og.addColorStop(0.6, '#1d4a63');
        og.addColorStop(1, '#0e2838');
      }
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ring(ctx, o.x, o.y, o.r - 3, hov === o ? '#c9f2ff' : 'rgba(255,255,255,0.25)', 1.8);
      // the touch-selected option is armed — make that unmistakable
      if (B.menu.sel === oRaw && isTouch()) {
        ring(ctx, o.x, o.y, o.r + 4, '#ffd873', 3, 0.7 + 0.3 * Math.sin(B.time * 6));
      }
      ctx.save(); ctx.translate(o.x, o.y - 3);
      (ICON_DRAW[o.icon] || ICON_DRAW.upgrade)(ctx);
      ctx.restore();
      if (o.cost != null) {
        drawTextO(ctx, (o.kind === 'sell' ? '+' : '') + o.cost, o.x, o.y + o.r - 8, 12,
          o.kind === 'sell' || afford ? '#ffe9a8' : '#ff9a9a', 'center', 800, 2.6);
      }
    });
    // ONE title plaque above the ring — no more overlapping labels
    const focus = hov || null;
    const tw2 = B.towers.get(B.menu.padIndex);
    const branchChoice = B.menu.opts.some(o => o.kind === 'branch');
    const title = focus ? focus.label + (focus.cost != null ? `   ${focus.kind === 'sell' ? '+' : ''}${focus.cost}` : '')
      : branchChoice ? S.ui.chooseBranch
      : tw2 ? S.towers[tw2.type].name + (tw2.branch ? ' — ' + S.branches[tw2.branch].name : '')
      : 'Build a tower';
    ctx.font = '700 14px "Trebuchet MS", system-ui, sans-serif';
    const tw3 = Math.max(150, ctx.measureText(title).width + 30);
    const ty = Math.max(64, minY - 34);
    roundRect(ctx, cx - tw3 / 2, ty - 14, tw3, 28, 8);
    ctx.fillStyle = 'rgba(6,26,40,0.95)';
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = '#3fa8cf'; ctx.lineWidth = 1.2;
    roundRect(ctx, cx - tw3 / 2 + 3, ty - 11, tw3 - 6, 22, 6);
    ctx.stroke();
    drawText(ctx, title, cx, ty + 1, 14, '#dff4ff', 'center', 700);
    let subY = ty + 31;
    if (hov && hov.kind === 'upgrade' && B.menu.delta) {
      drawTextO(ctx, B.menu.delta, cx, subY, 12, '#8df0c0', 'center', 800, 2.6);
      subY += 18;
    }
    if (isTouch() && B.menu.sel) {
      const pulse = 0.7 + 0.3 * Math.sin(B.time * 6);
      ctx.globalAlpha = pulse;
      drawTextO(ctx, S.ui.tapConfirm, cx, subY, 12, '#ffd873', 'center', 800, 2.8);
      ctx.globalAlpha = 1;
    }
    if (hov) {
      let desc = '';
      if (hov.kind === 'build') desc = S.towers[hov.type].desc;
      else if (hov.kind === 'branch') desc = S.branches[hov.branch].desc;
      else if (hov.kind === 'ability') desc = S.abilities[hov.ability].desc;
      if (desc) {
        // backed pill above the spell buttons so they never cover it
        ctx.font = '400 14px "Trebuchet MS", system-ui, sans-serif';
        const dw = ctx.measureText(desc).width + 28;
        roundRect(ctx, W / 2 - dw / 2, H - 98, dw, 26, 13);
        ctx.fillStyle = 'rgba(4,20,32,0.88)';
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        drawText(ctx, desc, W / 2, H - 84, 14, '#c9ecff', 'center');
      }
    }
  }

  function drawFloats(ctx) {
    for (const f of B.floats) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
      drawText(ctx, f.txt, f.x, f.y, f.size || 14, f.color, 'center', 700);
      ctx.globalAlpha = 1;
    }
  }

  function heart(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fill();
    inkStroke(ctx, 1.6);
  }

  function drawHUD(ctx) {
    // stat plaque (riveted steel banner)
    panel(ctx, 8, 6, 336, 42, 12);
    heart(ctx, 34, 27, 10, '#ff6f7d');
    drawTextO(ctx, String(B.lives), 50, 28, 19, '#ffcdd4', 'left');
    const gp = 1 + B.goldPulse * 1.6;
    ctx.save();
    ctx.translate(122, 27);
    ctx.scale(gp, gp);
    hexIcon(ctx, 0, 0, 10, '#ffd873');
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    drawTextO(ctx, String(Math.floor(B.gold)), 140, 28, 19 * gp, '#ffe9a8', 'left');
    // coins vacuuming toward the counter
    for (const c of B.coins) {
      if (c.t < 0) continue;
      const t = c.t, e2 = t * t * (3 - 2 * t);
      const cx2 = c.x + (122 - c.x) * e2;
      const cy2 = c.y + (27 - c.y) * e2 - Math.sin(t * Math.PI) * 40;
      hexIcon(ctx, cx2, cy2, 6, '#ffd873');
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    }
    // wave crest
    ctx.strokeStyle = '#bfe6f7'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(232, 30, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(240, 30, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    drawTextO(ctx, endless
      ? `${Math.max(B.waveIndex + 1, 1)} ∞`
      : `${Math.min(Math.max(B.waveIndex + 1, 1), waves.length)}/${waves.length}`, 254, 28, 18, '#e0f4ff', 'left');

    if (B.phase === 'prep') {
      UI.waveBtn.label = S.ui.launchWave;
      drawButton(ctx, UI.waveBtn, { accent: true });
    } else if (B.phase === 'between') {
      const s = Math.ceil(B.countdown);
      const shown = game.save.settings.autoWave ? BETWEEN_WAVE_TIME : s;
      UI.waveBtn.label = `${S.ui.callWave}  +${Math.round(shown * 2 * meta.earlyMul)}  (${s}s)`;
      drawButton(ctx, UI.waveBtn, { accent: true, size: 14 });
    }
    // round physical speed + pause buttons
    const sx = UI.speedBtn.x + UI.speedBtn.w / 2, sy = UI.speedBtn.y + UI.speedBtn.h / 2 + 3;
    uiRoundButton(ctx, sx, sy, 19, { accent: B.speed === 2 });
    drawTextO(ctx, B.speed + '×', sx, sy + 1, 15, '#fff', 'center', 800, 2.8);
    const px = UI.pauseBtn.x + UI.pauseBtn.w / 2, py = UI.pauseBtn.y + UI.pauseBtn.h / 2 + 3;
    uiRoundButton(ctx, px, py, 19, {});
    ctx.fillStyle = '#eaf6ff';
    if (B.paused) {
      ctx.beginPath(); ctx.moveTo(px - 4, py - 7); ctx.lineTo(px + 7, py); ctx.lineTo(px - 4, py + 7);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    } else {
      for (const bx of [px - 6, px + 2]) {
        ctx.fillRect(bx, py - 7, 4.5, 14);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(bx, py - 7, 4.5, 14);
      }
    }

    if (B.phase === 'prep' || B.phase === 'between') {
      const next = waves[B.waveIndex + 1];
      if (next) {
        const desc = next.groups.map(g => {
          // boss groups are 'boss_<id>' and have no entry in S.enemies, so this
          // used to print the raw id, e.g. "1x boss_maw"
          if (g.type.startsWith('boss_')) {
            const bd = BOSSES[g.type.slice(5)];
            return bd && bd.strings ? bd.strings.name : g.type.slice(5);
          }
          const nm = S.enemies[g.type] ? S.enemies[g.type].name : g.type;
          const air = ENEMIES[g.type] && ENEMIES[g.type].flying ? ' (Air)' : '';
          return `${g.count}× ${nm}${air}`;
        }).join('  ·  ');
        ctx.font = '400 13px "Trebuchet MS", system-ui, sans-serif';
        const tw4 = ctx.measureText(`${S.ui.next}: ${desc}`).width + 22;
        roundRect(ctx, W - 10 - tw4, 52, tw4, 24, 7);
        ctx.fillStyle = 'rgba(4,20,32,0.85)';
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        drawText(ctx, `${S.ui.next}: ${desc}`, W - 20, 65, 13, '#a8d5e8', 'right', 400);
      }
    }

    // S.ui.bossIncoming: sonar picks the boss up while you can still prepare
    const nextIsBoss = (B.phase === 'prep' || B.phase === 'between')
      && waves[B.waveIndex + 1] && waves[B.waveIndex + 1].boss;
    if (nextIsBoss) {
      const pu = 0.55 + 0.45 * Math.sin(B.time * 6);
      ctx.globalAlpha = pu;
      drawTextO(ctx, S.ui.bossIncoming, W / 2, 112, 17, '#ff8f7a', 'center', 800, 3.4);
      ctx.globalAlpha = 1;
    }

    // wave-cleared stamp: slams in, holds, lifts away
    if (B.flourish) {
      const f = B.flourish;
      const slam = Math.min(1.07, 1 - Math.exp(-f.t * 11) * Math.cos(f.t * 15));
      const fade = Math.max(0, Math.min(1, (f.life - f.t) * 2.2));
      const lift = f.t > f.life - 0.5 ? (f.t - (f.life - 0.5)) * 46 : 0;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(W / 2, 116 - lift);
      ctx.scale(Math.max(0.2, slam), Math.max(0.2, slam));
      ribbonBanner(ctx, 0, 0, 330, 46, '#1e8a4f');
      drawTextO(ctx, S.ui.waveCleared, 0, -4, 21, '#fff6dd', 'center', 800, 4);
      drawTextO(ctx, '+' + f.bonus + ' alloy', 0, 15, 13, '#ffe9a8', 'center', 800, 2.6);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if (B.banner) {
      const a = Math.min(1, B.banner.t * 3, (B.banner.life - B.banner.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
      const bw3 = ctx.measureText(B.banner.txt).width + 36;
      roundRect(ctx, W / 2 - bw3 / 2, 70, bw3, 28, 14);
      ctx.fillStyle = 'rgba(10,18,28,0.72)';
      ctx.fill();
      drawTextO(ctx, B.banner.txt, W / 2, 84, 18, '#ffedd0', 'center', 800, 3.5);
      ctx.globalAlpha = 1;
    }

    // boss health banner — framed with skull caps
    const boss = B.enemies.find(e => e.boss && !e.dead);
    if (boss) {
      const bw = 380, bx = W / 2 - bw / 2, by = 56;
      drawTextO(ctx, boss.def.strings.name.toUpperCase(), W / 2, by + 6, 14, '#ffb4bd', 'center', 800, 3);
      roundRect(ctx, bx - 2, by + 14, bw + 4, 14, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      const frac2 = Math.max(0, boss.hp / boss.maxHp);
      if (frac2 > 0.01) {
        const hg = ctx.createLinearGradient(0, by + 15, 0, by + 27);
        const base = boss.phase === 2 ? ['#ff9aa5', '#c93a4a'] : boss.phase === 1 ? ['#ffc09a', '#c96a2c'] : ['#ffe2a0', '#d99a2c'];
        hg.addColorStop(0, base[0]);
        hg.addColorStop(1, base[1]);
        roundRect(ctx, bx, by + 16, (bw) * frac2, 10, 5);
        ctx.fillStyle = hg;
        ctx.fill();
      }
      for (const frac of [0.33, 0.66]) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx + bw * frac, by + 15);
        ctx.lineTo(bx + bw * frac, by + 27);
        ctx.stroke();
      }
      drawTextO(ctx, '☠', bx - 14, by + 21, 15, '#ffb4bd');
      drawTextO(ctx, '☠', bx + bw + 14, by + 21, 15, '#ffb4bd');
    }

    // hero HUD: round portrait medallion, bars, round ability button
    const h = B.hero;
    if (h) {
      panel(ctx, 10, H - 70, 130, 60, 12);
      // portrait medallion
      const mx = 40, my = H - 40;
      const pg = ctx.createRadialGradient(mx - 6, my - 8, 3, mx, my, 22);
      pg.addColorStop(0, '#3d7ea8');
      pg.addColorStop(1, '#0e2838');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(mx, my, 21, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ring(ctx, mx, my, 17.5, h.dead ? '#5d7181' : '#ffd873', 2, 0.9);
      ctx.save();
      ctx.beginPath(); ctx.arc(mx, my, 17, 0, TAU); ctx.clip();
      ctx.translate(mx, my + 4);
      if (!h.dead) drawHero(ctx, { ...h, x: 0, y: 0, selected: false, hp: h.maxHp }, B.time);
      ctx.restore();
      if (h.dead) drawTextO(ctx, Math.ceil(h.respawnT) + '', mx, my, 17, '#ffb4bd');
      drawTextO(ctx, 'L' + h.level, 70, H - 56, 13, '#a8f0cd', 'left', 800, 2.6);
      // hp + xp bars with ink frames
      for (const [by, bh, frac, col] of [
        [H - 46, 7, Math.max(0, h.hp / h.maxHp), '#6ee7a0'],
        [H - 34, 5, Math.min(1, h.xp / xpForLevel(h.level)), '#ffd873'],
      ]) {
        roundRect(ctx, 68, by, 60, bh, bh / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();
        if (frac > 0.02) {
          roundRect(ctx, 68, by, 60 * frac, bh, bh / 2);
          ctx.fillStyle = col;
          ctx.fill();
        }
        roundRect(ctx, 68, by, 60, bh, bh / 2);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      }
      // round ability button with sweep cooldown
      const ab = UI.abilityBtn;
      ab.x = 146;
      const ax = ab.x + ab.w / 2, ay = ab.y + ab.h / 2;
      uiRoundButton(ctx, ax, ay, 26, { accent: h.abilityCd <= 0 && !h.dead });
      ctx.fillStyle = '#fff2cd';
      ctx.beginPath(); ctx.arc(ax, ay - 1, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      drawTextO(ctx, '!', ax, ay, 17, '#b5722a', 'center', 800, 2.4);
      if (h.abilityCd > 0) {
        const frac = h.abilityCd / (h.def.ability.cd * meta.heroCdMul);
        ctx.fillStyle = 'rgba(5,12,20,0.68)';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.arc(ax, ay, 25, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
        ctx.closePath();
        ctx.fill();
        drawTextO(ctx, Math.ceil(h.abilityCd) + '', ax, ay, 19, '#eaf6ff');
      }
    }

    // global spell buttons (bottom centre)
    // S.spells existed from the start and was never drawn — the two buttons
    // had no name or explanation anywhere in the game.
    const spellRow = B.dark
      ? [[UI.spellReinf, 'reinf'], [UI.spellTorp, 'torp'], [UI.spellFlare, 'flare']]
      : [[UI.spellReinf, 'reinf'], [UI.spellTorp, 'torp']];
    for (const [btn, sid] of spellRow) {
      if (B.hover.x < btn.x - 8 || B.hover.x > btn.x + btn.w + 8) continue;
      if (B.hover.y < btn.y - 8 || B.hover.y > btn.y + btn.h + 8) continue;
      const sp = S.spells[sid];
      ctx.font = '400 12.5px "Trebuchet MS", system-ui, sans-serif';
      const tw5 = Math.max(150, ctx.measureText(sp.desc).width + 24);
      const bx = Math.max(8, Math.min(W - tw5 - 8, btn.x + btn.w / 2 - tw5 / 2));
      roundRect(ctx, bx, btn.y - 52, tw5, 44, 9);
      ctx.fillStyle = 'rgba(4,20,32,0.94)';
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      drawTextO(ctx, sp.name, bx + tw5 / 2, btn.y - 36, 13, '#ffe9a8', 'center', 800, 2.6);
      drawText(ctx, sp.desc, bx + tw5 / 2, btn.y - 18, 12.5, '#c9e8f7', 'center', 400);
    }

    for (const [btn, cd, max, glyph] of [
      [UI.spellReinf, B.reinfCd, REINF_CD, 'reinf'],
      [UI.spellTorp, B.torpCd, TORP_CD, 'torp'],
      ...(B.dark ? [[UI.spellFlare, B.flareCd, FLARE_CD, 'flare']] : []),
    ]) {
      const cx2 = btn.x + btn.w / 2, cy2 = btn.y + btn.h / 2;
      uiRoundButton(ctx, cx2, cy2, 25, { accent: cd <= 0 });
      ctx.save();
      ctx.translate(cx2, cy2);
      if (glyph === 'reinf') {
        // gold drop arrow: these guys parachute in
        ctx.fillStyle = '#ffd873';
        ctx.beginPath();
        ctx.moveTo(-3.5, -17); ctx.lineTo(3.5, -17); ctx.lineTo(3.5, -12);
        ctx.lineTo(7.5, -12); ctx.lineTo(0, -4.5); ctx.lineTo(-7.5, -12); ctx.lineTo(-3.5, -12);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
        // two dive-suited defenders, helmets + visors + shoulders
        for (const dx of [-7, 7]) {
          ctx.fillStyle = '#c9ecff';
          ctx.beginPath(); ctx.ellipse(dx, 13, 5.5, 5, 0, Math.PI, TAU); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#eaf6ff';
          ctx.beginPath(); ctx.arc(dx, 5.5, 4.6, 0, TAU); ctx.fill();
          ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = '#1d4a63';
          ctx.beginPath(); ctx.arc(dx + 1.2, 5.5, 2.1, 0, TAU); ctx.fill();
        }
      } else if (glyph === 'flare') {
        // a lit flare: burning star over a small canister
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, -3, 0, 0, -3, 15);
        g.addColorStop(0, 'rgba(255,236,170,0.95)');
        g.addColorStop(0.45, 'rgba(255,190,90,0.45)');
        g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -3, 15, 0, TAU); ctx.fill();
        ctx.restore();
        // four-point star
        ctx.fillStyle = '#fff3d0';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU - Math.PI / 2;
          const rr = i % 2 === 0 ? 10.5 : 3.6;
          const px = Math.cos(a) * rr, py = -3 + Math.sin(a) * rr;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
        // canister below
        ctx.fillStyle = '#c9ecff';
        roundRect(ctx, -3.5, 8, 7, 9, 2);
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        // horizontal torpedo: red warhead, tail fins, prop bubbles
        ctx.strokeStyle = '#9fd4ea';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        for (const ly of [-3, 3]) {
          ctx.beginPath(); ctx.moveTo(-15, ly); ctx.lineTo(-19, ly); ctx.stroke();
        }
        ctx.fillStyle = '#9fd4ea';
        ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-15, -10); ctx.lineTo(-12, -1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-15, 10); ctx.lineTo(-12, 1); ctx.closePath(); ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#eaf6ff';
        roundRect(ctx, -13, -4.5, 21, 9, 4.5);
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = '#ff6f5f';
        ctx.beginPath();
        ctx.moveTo(6, -4.5);
        ctx.quadraticCurveTo(14.5, -3, 15.5, 0);
        ctx.quadraticCurveTo(14.5, 3, 6, 4.5);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.stroke();
        ctx.strokeStyle = 'rgba(9,26,40,0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(1, -4.5); ctx.lineTo(1, 4.5); ctx.stroke();
      }
      ctx.restore();
      if (cd > 0) {
        ctx.fillStyle = 'rgba(5,12,20,0.68)';
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        ctx.arc(cx2, cy2, 24, -Math.PI / 2, -Math.PI / 2 + TAU * (cd / max));
        ctx.closePath();
        ctx.fill();
        drawTextO(ctx, Math.ceil(cd) + '', cx2, cy2, 16, '#eaf6ff');
      }
      if (B.spellArm === glyph) {
        ring(ctx, cx2, cy2, 29, '#ffd873', 2.5, 0.6 + 0.4 * Math.sin(B.time * 6));
      }
    }

    // hero speech bubble
    if (B.speech && B.hero && !B.hero.dead) {
      const a = Math.min(1, B.speech.t * 4, (B.speech.life - B.speech.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      const hx = B.hero.x, hy = B.hero.y - 40;
      ctx.font = '700 13px "Trebuchet MS", system-ui, sans-serif';
      const bw2 = ctx.measureText(B.speech.txt).width + 22;
      roundRect(ctx, hx - bw2 / 2, hy - 13, bw2, 26, 11);
      ctx.fillStyle = '#f4f8fb';
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = '#f4f8fb';
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + 11); ctx.lineTo(hx, hy + 22); ctx.lineTo(hx + 6, hy + 11);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f4f8fb';
      ctx.fillRect(hx - 5, hy + 9, 10, 4);
      drawText(ctx, B.speech.txt, hx, hy + 1, 13, INK, 'center', 700);
      ctx.globalAlpha = 1;
    }

    // creature inspect card
    // First-contact cards: who this is, and the one thing you need to know to
    // beat it. Stacked down the left, clear of the road and the HUD.
    B.introCards.forEach((card, ci) => {
      const def = ENEMIES[card.type];
      const str = S.enemies[card.type];
      if (!def || !str) return;
      const inT = Math.min(1, card.t / 0.35);
      const outT = Math.min(1, (card.life - card.t) / 0.5);
      const a = Math.min(inT, outT);
      const cw = 300, chh = 74;
      const cx = 14 - (1 - inT) * 40;
      const cy = 96 + ci * (chh + 8);
      ctx.save();
      ctx.globalAlpha = a;
      panel(ctx, cx, cy, cw, chh, 10);
      // the creature itself, so the name attaches to a shape
      ctx.save();
      ctx.beginPath(); ctx.rect(cx, cy, 62, chh); ctx.clip();
      ctx.translate(cx + 34, cy + chh / 2);
      const sc = Math.min(1.9, 26 / (def.radius || 10));
      ctx.scale(sc, sc);
      drawEnemyBody(ctx, { def, baseType: card.type, type: card.type,
        wob: B.time * 4, hidden: false, elite: false, shieldHp: def.shield || 0 });
      ctx.restore();
      drawTextO(ctx, str.name, cx + 68, cy + 22, 14, '#ffe9a8', 'left', 800, 2.6);
      // wrap the counter line to the card
      ctx.font = '400 12px "Trebuchet MS", system-ui, sans-serif';
      const words = (str.tip || '').split(' ');
      let line = '', ly = cy + 42;
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > cw - 82 && line) {
          drawText(ctx, line, cx + 68, ly, 12, '#c9e8f7', 'left', 400);
          line = w; ly += 15;
        } else line = test;
      }
      if (line) drawText(ctx, line, cx + 68, ly, 12, '#c9e8f7', 'left', 400);
      ctx.restore();
    });

    if (B.inspect && !B.inspect.e.dead) {
      const e = B.inspect.e;
      const cw = 226, chh = 92, cx3 = W - cw - 12, cy3 = 84;
      panel(ctx, cx3, cy3, cw, chh, 10);
      const nm = e.boss ? e.def.strings.name : (S.enemies[e.baseType] ? S.enemies[e.baseType].name : e.baseType);
      drawTextO(ctx, nm + (e.elite ? ' ★' : ''), cx3 + 14, cy3 + 20, 14, '#ffe9a8', 'left', 800, 2.6);
      // hp bar
      roundRect(ctx, cx3 + 14, cy3 + 32, cw - 28, 9, 4.5);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();
      roundRect(ctx, cx3 + 14, cy3 + 32, (cw - 28) * Math.max(0, e.hp / e.maxHp), 9, 4.5);
      ctx.fillStyle = '#6ee7a0';
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      roundRect(ctx, cx3 + 14, cy3 + 32, cw - 28, 9, 4.5);
      ctx.stroke();
      drawText(ctx, `${S.codex.armor} ${Math.round((e.def.armor || 0) * 100)}%`, cx3 + 14, cy3 + 56, 12.5, '#c9d8e2', 'left', 700);
      drawText(ctx, `${S.codex.magicRes} ${Math.round((e.def.magicRes || 0) * 100)}%`, cx3 + 112, cy3 + 56, 12.5, '#c0aaff', 'left', 700);
      const traits = [];
      if (e.def.flying) traits.push('Flies');
      if (e.def.cloak) traits.push('Cloaked');
      if (e.def.submerge) traits.push('Burrows');
      if (e.def.heal) traits.push('Heals allies');
      if (e.def.droneBane) traits.push('Drone-killer');
      drawText(ctx, traits.join(' · ') || `${S.codex.bounty}: ${e.def.bounty}`, cx3 + 14, cy3 + 76, 12, '#9fd4ea', 'left');
      // the same counter-line the codex carries, where the decision is made
      const itip = S.enemies[e.baseType] && S.enemies[e.baseType].tip;
      if (itip) {
        ctx.font = '400 11.5px "Trebuchet MS", system-ui, sans-serif';
        const iw = ctx.measureText(itip).width;
        panel(ctx, cx3, cy3 + chh + 6, cw, iw > cw - 28 ? 44 : 28, 8);
        let ln = '', ty = cy3 + chh + 24;
        for (const w of itip.split(' ')) {
          const t2 = ln ? ln + ' ' + w : w;
          if (ctx.measureText(t2).width > cw - 28 && ln) {
            drawText(ctx, ln, cx3 + 14, ty, 11.5, '#9fe8ff', 'left', 400);
            ln = w; ty += 14;
          } else ln = t2;
        }
        if (ln) drawText(ctx, ln, cx3 + 14, ty, 11.5, '#9fe8ff', 'left', 400);
      }
    }
  }

  function drawOverlays(ctx) {
    if (B.leakFlash > 0) {
      ctx.fillStyle = `rgba(255,40,60,${(B.leakFlash * 0.35).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (B.lives <= Math.max(3, lives * 0.3) && B.phase !== 'over') {
      const p = 0.15 + 0.1 * Math.sin(B.time * 4);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(255,30,50,0)');
      g.addColorStop(1, `rgba(255,30,50,${p.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (B.paused) {
      ctx.fillStyle = 'rgba(1,6,12,0.62)';
      ctx.fillRect(0, 0, W, H);
      drawText(ctx, S.ui.paused, W / 2, H / 2 - 40, 40, '#bde9ff', 'center', 800);
      drawButton(ctx, pauseBtns.resume, { accent: true, size: 16 });
      drawButton(ctx, pauseBtns.quit, { size: 16 });
    }
    if (tut && !tut.done && !B.paused) {
      const pulse = 0.5 + 0.5 * Math.sin(B.time * 4);
      let target = null;
      if (tut.step === 0) target = { x: L.pads[0][0], y: L.pads[0][1], r: 30 };
      else if (tut.step === 1 && portals[0]) target = { x: portals[0].x, y: portals[0].y, r: 36 };
      else if (tut.step === 2 || tut.step === 7) target = { x: UI.waveBtn.x + UI.waveBtn.w / 2, y: UI.waveBtn.y + UI.waveBtn.h / 2, r: 110 };
      else if (tut.step === 3) {
        const first = [...B.towers.values()][0];
        if (first) target = { x: first.x, y: first.y, r: 30 };
      } else if (tut.step === 4 && B.hero) target = { x: B.hero.x, y: B.hero.y, r: 30 };
      else if (tut.step === 5) target = { x: UI.abilityBtn.x + UI.abilityBtn.w / 2, y: UI.abilityBtn.y + UI.abilityBtn.h / 2, r: 38 };
      else if (tut.step === 6) target = { x: UI.spellReinf.x + UI.spellReinf.w / 2, y: UI.spellReinf.y + UI.spellReinf.h / 2, r: 36 };
      if (target && (tut.step !== 7 || B.phase === 'between')) {
        ring(ctx, target.x, target.y, target.r + pulse * 6, '#ffd873', 3, 0.9);
        // text card
        const txt = S.tutorial[tut.step];
        const lines = txt.split('\n');
        ctx.fillStyle = 'rgba(6,26,40,0.94)';
        roundRect(ctx, W / 2 - 250, 96, 500, 26 + lines.length * 20, 10);
        ctx.fill();
        ctx.strokeStyle = '#ffd873';
        ctx.lineWidth = 2;
        ctx.stroke();
        lines.forEach((ln, i) => {
          drawText(ctx, ln, W / 2, 118 + i * 20, 14.5, '#ffe9b8', 'center');
        });
        tutSkipBtn.x = W / 2 + 152;
        tutSkipBtn.y = 96 + 26 + lines.length * 20 + 8;
        drawButton(ctx, tutSkipBtn, { size: 12 });
      }
    }
    // boss presence: the water itself turns threatening
    if (B.enemies.some(e => e.boss && !e.dead)) {
      ctx.fillStyle = 'rgba(255,40,30,0.055)';
      ctx.fillRect(0, 0, W, H);
    }
    // boss-entrance letterbox bars
    if (B.letterbox > 0) {
      const k = Math.min(1, B.letterbox > 2.2 ? (2.6 - B.letterbox) / 0.4 : B.letterbox < 0.4 ? B.letterbox / 0.4 : 1);
      ctx.fillStyle = 'rgba(2,6,10,0.92)';
      ctx.fillRect(0, 0, W, 42 * k);
      ctx.fillRect(0, H - 42 * k, W, 42 * k);
    }
    if (B.whiteFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(B.whiteFlash * 1.8).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (B.phase === 'over') {
      const a = Math.min(1, B.overTimer);
      // the verdict SLAMS in
      const slam = Math.max(1, 3 - B.overTimer * 8);
      ctx.fillStyle = `rgba(1,6,12,${(a * 0.6).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(slam, slam);
      ctx.globalAlpha = a;
      drawTextO(ctx, B.outcome === 'won' ? S.results.winTitle : S.results.loseTitle,
        0, 0, 46, B.outcome === 'won' ? '#a8f0cd' : '#ffb4bd', 'center', 800, 5);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // two-layer directional shadow (light comes from upper-left): soft halo
  // plus a darker core, offset down-right — grounds every unit on the map
  function drawShadow(ctx, x, y, r, flying) {
    const oy = flying ? 20 : r * 0.9;
    ctx.fillStyle = flying ? 'rgba(0,10,16,0.14)' : 'rgba(0,10,16,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + oy, r * (flying ? 0.8 : 1.15), r * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = flying ? 'rgba(0,10,16,0.18)' : 'rgba(0,10,16,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + oy, r * (flying ? 0.5 : 0.72), r * 0.24, 0, 0, TAU);
    ctx.fill();
  }


  // The dark is one full-field layer with the lamps punched out of it, built on
  // a reused offscreen canvas so nothing is allocated per frame. Drawn after
  // the world and the creatures but before the HUD, so the interface stays
  // readable no matter how black the trench gets.
  let darkCv = null, darkCtx = null;
  function drawDarkness(ctx) {
    if (!B.dark) return;
    if (!darkCv) {
      darkCv = document.createElement('canvas');
      darkCv.width = W; darkCv.height = H;
      darkCtx = darkCv.getContext('2d');
    }
    const d = darkCtx;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(2,7,14,0.88)';
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      // soft edge: solid to about two thirds, then falling away
      const g = d.createRadialGradient(l.x, l.y, l.r * 0.55, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.75, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath();
      d.arc(l.x, l.y, l.r, 0, TAU);
      d.fill();
    }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkCv, 0, 0);

    // Empty pads keep a dim marker through the dark. Hiding them would make the
    // level unplayable rather than tense — you have to be able to build your way
    // back into the light.
    for (let pi = 0; pi < L.pads.length; pi++) {
      const pad = L.pads[pi];
      if (pad.destroyed || B.towers.has(pi)) continue;
      if (isLit(pad[0], pad[1])) continue;
      const pul = 0.4 + 0.25 * Math.sin(B.time * 1.8 + pad[0] * 0.03);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(120,200,240,${0.30 * pul + 0.12})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(pad[0], pad[1] + 2, 17, 11, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // warm bloom sitting on top of each lamp, so light sources read as lamps
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.85);
      g.addColorStop(0, 'rgba(255,226,150,0.13)');
      g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r * 0.85, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // whatever is still out there, watching
    for (const e of B.enemies) {
      if (e.dead || e.dist < 0 || isLit(e.x, e.y)) continue;
      const blink = 0.55 + 0.45 * Math.sin(B.time * 2.2 + e.x * 0.05);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sp = (e.def.radius || 10) * 0.34;
      // a soft halo under the pupils so they carry at a glance
      const halo = ctx.createRadialGradient(e.x, e.y - 2, 0, e.x, e.y - 2, 15);
      halo.addColorStop(0, `rgba(255,170,90,${0.30 * blink})`);
      halo.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(e.x, e.y - 2, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,214,150,${0.85 * blink})`;
      ctx.beginPath(); ctx.arc(e.x - sp, e.y - 2, 2.7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + sp, e.y - 2, 2.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function render(ctx) {
    ctx.save();
    if (B.shake > 0) {
      ctx.translate((Math.random() - 0.5) * B.shake * 8, (Math.random() - 0.5) * B.shake * 8);
      if (B.shake > 0.6) {
        // heavy hits physically tilt the world
        ctx.translate(W / 2, H / 2);
        ctx.rotate((Math.random() - 0.5) * B.shake * 0.02);
        ctx.translate(-W / 2, -H / 2);
      }
    }
    ctx.drawImage(bgBuilt.canvas, 0, 0);
    // battle scars fade slowly into the sand
    for (const sc of B.scorch) {
      ctx.globalAlpha = 0.32 * Math.max(0, 1 - sc.t / 20);
      ctx.fillStyle = '#17100a';
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y, sc.r, sc.r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawTerrainDynamics(ctx, bgBuilt.dynamics, B.time);
    if (fxHigh()) drawCaustics(ctx, causticTile, B.time, W, H, 0.05);

    drawZones(ctx);
    drawRouteChevrons(ctx);
    drawCore(ctx);
    drawSpawnPortals(ctx);
    drawPads(ctx);
    // rally flags
    for (const tw of B.towers.values()) {
      if (tw.type === 'drone' && tw.rally) drawFlag(ctx, tw.rally.x, tw.rally.y, B.time, '#8df0c0');
    }
    if (B.hero && !B.hero.dead && Math.hypot(B.hero.tx - B.hero.x, B.hero.ty - B.hero.y) > 12) {
      drawFlag(ctx, B.hero.tx, B.hero.ty, B.time, '#ffd873');
    }
    if (B.rallyArm != null) {
      const tw = B.towers.get(B.rallyArm);
      if (tw) {
        const s = statsOf(tw);
        ctx.setLineDash([6, 8]);
        ring(ctx, tw.x, tw.y, s.range * 1.6, '#8df0c0', 1.5, 0.5 + 0.3 * Math.sin(B.time * 5));
        ctx.setLineDash([]);
      }
    }
    for (const tw of B.towers.values()) {
      // drops in with an elastic overshoot on build, and re-pops on upgrade
      const bt = tw.born != null ? tw.born : 1;
      if (bt < 1 || tw.pop > 0) {
        const grow = bt < 1
          ? Math.min(1.18, 1 - Math.exp(-bt * 9) * Math.cos(bt * 13))
          : 1;
        const kick = tw.pop > 0 ? 1 + tw.pop * 0.22 : 1;
        const sc = Math.max(0.05, grow * kick);
        ctx.save();
        ctx.translate(tw.x, tw.y + 10);
        ctx.scale(sc, sc);
        ctx.translate(-tw.x, -(tw.y + 10));
        drawTower(ctx, tw, B.time);
        ctx.restore();
      } else {
        drawTower(ctx, tw, B.time);
      }
      if (tw.disabled > 0) {
        ctx.fillStyle = 'rgba(10,16,26,0.55)';
        ctx.beginPath(); ctx.arc(tw.x, tw.y, 18, 0, TAU); ctx.fill();
        drawText(ctx, '✕', tw.x, tw.y, 16, '#ffe66f', 'center', 800);
      }
      // bouncing gold arrow when an upgrade is affordable
      if (!B.menu || B.menu.padIndex !== [...B.towers.keys()].find(k => B.towers.get(k) === tw)) {
        let cost = null;
        if (!tw.branch && tw.level < 2) cost = upgradeCost(tw, meta);
        else if (!tw.branch) cost = Math.min(...Object.keys(TOWERS[tw.type].branches).map(b => branchCost(tw.type, b, meta)));
        else {
          const abs = TOWERS[tw.type].branches[tw.branch].abilities.filter(a => !tw.abilities[a.id]);
          if (abs.length) cost = Math.min(...abs.map(a => a.cost));
        }
        if (cost != null && B.gold >= cost) {
          const bob = Math.sin(B.time * 5) * 3;
          drawTextO(ctx, '▲', tw.x + 16, tw.y - 30 + bob, 15, '#ffd873', 'center', 800, 2.6);
        }
      }
    }
    // unified shadow pass: every unit gets grounded before any body draws
    for (const tw of B.towers.values()) {
      if (tw.drones) for (const dr of tw.drones) if (!dr.dead) drawShadow(ctx, dr.x, dr.y, 8, false);
    }
    if (B.hero && !B.hero.dead) drawShadow(ctx, B.hero.x, B.hero.y, 16, false);
    for (const r of B.reinf) if (!r.dead) drawShadow(ctx, r.x, r.y, 8, false);
    for (const e of B.enemies) {
      if (!e.hidden && e.emergeT < 0.3) drawShadow(ctx, e.x, e.y, e.def.radius, e.def.flying);
    }
    drawReinf(ctx);
    // limpet mines
    for (const m of B.mines) {
      const blink = m.arm > 0 || Math.sin(B.time * 6) > 0;
      ctx.fillStyle = '#4a5560';
      ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, TAU); ctx.fill(); inkStroke(ctx, 1.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(a) * 6, m.y + Math.sin(a) * 6);
        ctx.lineTo(m.x + Math.cos(a) * 9, m.y + Math.sin(a) * 9);
        ctx.stroke();
      }
      ctx.fillStyle = blink ? '#ff6f5f' : '#5a2c26';
      ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, TAU); ctx.fill();
    }
    // environmental vent trap
    if (trap) {
      ctx.save();
      ctx.translate(trap.x, trap.y);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(0, 5, 16, 6, 0, 0, TAU); ctx.fill();
      const tg = ctx.createLinearGradient(-10, 0, 12, 0);
      tg.addColorStop(0, '#5d6d7a'); tg.addColorStop(1, '#2c363e');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.moveTo(-13, 6); ctx.lineTo(-6, -14); ctx.lineTo(6, -14); ctx.lineTo(13, 6);
      ctx.closePath(); ctx.fill(); inkStroke(ctx, 2.4);
      if (trap.cd <= 0) {
        const pulse = 0.5 + 0.5 * Math.sin(B.time * 5);
        glowCircle(ctx, 0, -16, 12 + pulse * 5, 'rgba(140,240,255,0.7)');
        ctx.fillStyle = '#c9f2ff';
        ctx.beginPath(); ctx.ellipse(0, -14, 4, 2.4, 0, 0, TAU); ctx.fill();
        ring(ctx, 0, -4, 20 + pulse * 4, '#8fe8ff', 2, 0.7);
      } else {
        ctx.fillStyle = '#1c262c';
        ctx.beginPath(); ctx.ellipse(0, -14, 4, 2.4, 0, 0, TAU); ctx.fill();
        drawTextO(ctx, Math.ceil(trap.cd) + '', 0, -26, 12, '#9fd4ea');
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    if (fxHigh()) for (const m of motes) {
      ctx.globalAlpha = 0.15 + 0.12 * Math.sin(B.time * 1.5 + m.p);
      ctx.fillStyle = pal.mote;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // depth-sorted unit pass: things lower on screen draw in front (2.5D)
    const unitDraws = [];
    for (const tw of B.towers.values()) {
      if (tw.drones) for (const dr of tw.drones) {
        if (!dr.dead) unitDraws.push([dr.y, dr, 'drone']);
      }
    }
    if (B.hero && !B.hero.dead) unitDraws.push([B.hero.y, B.hero, 'hero']);
    // Creatures outside the light are not drawn at all — drawDarkness() gives
    // them eye-glints instead. Drawing them here would leave ghosts showing
    // through the overlay, which is worse than useless: it would let a player
    // aim at something the turrets themselves cannot see.
    for (const e of B.enemies) if (isLit(e.x, e.y)) unitDraws.push([e.y, e, 'enemy']);
    unitDraws.sort((a, b) => a[0] - b[0]);
    for (const [, u, kind] of unitDraws) {
      if (kind === 'drone') drawDrone(ctx, u);
      else if (kind === 'hero') {
        // gold ground marker so the hero always reads at a glance
        const hpul = 0.5 + 0.5 * Math.sin(B.time * 2.5);
        glowCircle(ctx, u.x, u.y + 7, 19, 'rgba(255,216,115,0.16)');
        ctx.globalAlpha = 0.45 + hpul * 0.3;
        ctx.strokeStyle = '#ffd873';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(u.x, u.y + 8, 14.5 + hpul * 1.5, 7.5 + hpul, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.scale(1.12, 1.12);
        ctx.translate(-u.x, -u.y);
        drawHero(ctx, u, B.time);
        ctx.restore();
      } else drawEnemy(ctx, u);
    }
    drawShells(ctx);
    drawProjectiles(ctx);
    drawBolts(ctx);
    drawFlashes(ctx);
    drawRings(ctx);
    particles.draw(ctx);
    drawFloats(ctx);
    drawDarkness(ctx);
    drawMenu(ctx);
    ctx.restore();

    drawHUD(ctx);
    drawOverlays(ctx);
  }

  return { update, render, pointerDown, pointerMove, onKey, _battle: ctxBattle };
}
