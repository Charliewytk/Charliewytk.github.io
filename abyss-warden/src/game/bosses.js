// Boss definitions. Each boss is an enemy with a scripted update; scripts get
// an api provided by the battle ({spawn, disableTower, destroyPad, banner,
// ring, heal}). Phases fire once at 66% and 33%.
import { S } from '../data/strings.js';
import { inkStroke, glowCircle } from '../render/draw.js';

const TAU = Math.PI * 2;

export const BOSSES = {
  maw: {
    id: 'maw', baseType: 'angler', scale: 2.3,
    hp: 3300, speed: 26, armor: 0.2, magicRes: 0.25, bounty: 160, lives: 20,
    radius: 26, melee: 55,
    strings: S.bosses.maw,
    script(boss, api, dt) {
      // lantern lure: periodically dazzles the nearest tower
      boss.t1 = (boss.t1 || 0) + dt;
      if (boss.t1 > 10) {
        boss.t1 = 0;
        api.disableNearestTower(boss, 4);
      }
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.maw.p66);
        for (let i = 0; i < 6; i++) api.spawn('fry', boss, i * 12);
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.maw.p33);
        boss.speedMul = 1.5;
      }
    },
  },
  carapace: {
    id: 'carapace', baseType: 'isopod', scale: 2.6,
    hp: 5200, speed: 24, armor: 0.6, magicRes: 0.1, bounty: 240, lives: 20,
    radius: 28, melee: 60,
    strings: S.bosses.carapace,
    script(boss, api, dt) {
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.carapace.p66);
        boss.def = { ...boss.def, armor: 0.35 };
        boss.speedMul = 1.25;
        for (let i = 0; i < 2; i++) api.spawn('isopod', boss, i * 14, true);
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.carapace.p33);
        boss.def = { ...boss.def, armor: 0.1 };
        boss.speedMul = 1.6;
      }
    },
  },
  matron: {
    id: 'matron', baseType: 'jelly', scale: 2.5,
    hp: 7000, speed: 22, armor: 0.1, magicRes: 0.5, bounty: 300, lives: 20,
    radius: 28, melee: 45,
    strings: S.bosses.matron,
    script(boss, api, dt) {
      boss.t1 = (boss.t1 || 0) + dt;
      if (boss.t1 > 12) {
        boss.t1 = 0;
        api.spawn('jelly', boss, 0);
        api.spawn('fry', boss, 8);
      }
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.matron.p66);
        for (let i = 0; i < 4; i++) api.spawn('fry', boss, i * 10);
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.matron.p33);
        api.heal(boss, 0.12);
      }
    },
  },
  undertow: {
    id: 'undertow', baseType: 'worm', scale: 2.4,
    hp: 9500, speed: 30, armor: 0.25, magicRes: 0.2, bounty: 380, lives: 20,
    radius: 28, melee: 70,
    strings: S.bosses.undertow,
    script(boss, api, dt) {
      boss.t1 = (boss.t1 || 0) + dt;
      const burrowCd = boss.phase >= 2 ? 8 : 14;
      if (boss.t1 > burrowCd) {
        boss.t1 = 0;
        // burrow-lunge forward unless pinned by sonar
        if (!boss.inSonar) {
          boss.dist += 150;
          api.ring(boss.x, boss.y, 60, 'rgba(200,150,90,0.8)');
        } else {
          api.ring(boss.x, boss.y, 40, 'rgba(120,220,255,0.8)');
        }
      }
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.undertow.p66);
        api.destroyRandomPad();
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.undertow.p33);
      }
    },
  },
  choir: {
    id: 'choir', baseType: 'jelly', scale: 2.3,
    hp: 12000, speed: 24, armor: 0.1, magicRes: 0.6, bounty: 420, lives: 20,
    radius: 27, melee: 50,
    strings: S.bosses.choir,
    script(boss, api, dt) {
      boss.t1 = (boss.t1 || 0) + dt;
      if (boss.t1 > 9) {
        boss.t1 = 0;
        api.spawn('jelly', boss, 0);
        api.spawn('jelly', boss, 10);
        api.heal(boss, 0.04);
      }
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.choir.p66);
        for (let i = 0; i < 3; i++) api.spawn('husk', boss, i * 10, true);
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.choir.p33);
        boss.speedMul = 1.4;
      }
    },
  },
  sovereign: {
    id: 'sovereign', baseType: 'juggernaut', scale: 2.9,
    hp: 26000, speed: 17, armor: 0.35, magicRes: 0.35, bounty: 800, lives: 20,
    radius: 36, melee: 120,
    strings: S.bosses.sovereign,
    script(boss, api, dt) {
      // freezes emplacements solid on a slow cycle
      boss.t1 = (boss.t1 || 0) + dt;
      if (boss.t1 > 9) {
        boss.t1 = 0;
        api.disableNearestTower(boss, 4);
        api.ring(boss.x, boss.y, 150, 'rgba(190,235,255,0.7)');
      }
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.sovereign.p66);
        api.spawn('rime', boss, 0, true);
        api.spawn('rime', boss, 14);
        api.spawn('wisp', boss, 24);
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.sovereign.p33);
        boss.speedMul = 1.3;
        boss.freezePulse = true;
      }
      if (boss.freezePulse) {
        boss.t2 = (boss.t2 || 0) + dt;
        if (boss.t2 > 8) {
          boss.t2 = 0;
          api.stunTowersNear(boss, 165, 2.5);
          api.ring(boss.x, boss.y, 165, 'rgba(210,245,255,0.8)');
          api.spawn('wisp', boss, 6);
        }
      }
    },
  },
  leviathan: {
    id: 'leviathan', baseType: 'behemoth', scale: 2.6,
    hp: 19500, speed: 19, armor: 0.3, magicRes: 0.3, bounty: 600, lives: 20,
    radius: 34, melee: 110,
    strings: S.bosses.leviathan,
    script(boss, api, dt) {
      boss.t1 = (boss.t1 || 0) + dt;
      if (boss.t1 > 10) {
        boss.t1 = 0;
        api.disableRandomTower(5);
      }
      if (boss.phase >= 1 && !boss.did66) {
        boss.did66 = true;
        api.banner(S.bosses.leviathan.p66);
        api.spawn('lancer', boss, 0, true);
        api.spawn('stalker', boss, 10, true);
        api.spawn('stalker', boss, 20, true);
      }
      if (boss.phase >= 2 && !boss.did33) {
        boss.did33 = true;
        api.banner(S.bosses.leviathan.p33);
        boss.speedMul = 1.35;
        boss.stunPulse = true;
      }
      if (boss.stunPulse) {
        boss.t2 = (boss.t2 || 0) + dt;
        if (boss.t2 > 7.5) {
          boss.t2 = 0;
          api.stunTowersNear(boss, 150, 3);
          api.ring(boss.x, boss.y, 150, 'rgba(255,110,110,0.7)');
        }
        boss.t3 = (boss.t3 || 0) + dt;
        if (boss.t3 > 8) {
          boss.t3 = 0;
          for (let i = 0; i < 3; i++) api.spawn('mite', boss, i * 6);
          api.spawn('stalker', boss, 12, true);
        }
      }
    },
  },
};

// Draw a boss: scaled base creature + crown of spines + menace glow.
export function drawBossAccents(ctx, e) {
  glowCircle(ctx, 0, 0, e.def.radius * 1.6, 'rgba(255,120,120,0.18)');
  // dorsal crest
  ctx.fillStyle = '#ffd873';
  for (let i = 0; i < 4; i++) {
    const x = -e.def.radius * 0.7 + i * (e.def.radius * 0.42);
    ctx.beginPath();
    ctx.moveTo(x, -e.def.radius * 0.55);
    ctx.lineTo(x + 4, -e.def.radius * 0.95);
    ctx.lineTo(x + 8, -e.def.radius * 0.55);
    ctx.closePath(); ctx.fill(); inkStroke(ctx, 1.6);
  }
}
