// Procedural audio: all SFX and ambience are synthesised with the Web Audio API.
// initAudio() must be called from a user gesture (autoplay policy).
let ctx = null;
let master = null;
let sfxBus = null;
let noiseBuf = null;
let ambientStarted = false;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0.5;
  // A gentle limiter on the way out. With 200 creatures dying at once the
  // summed SFX used to clip and turn to mush; this keeps peaks in check
  // without audibly squashing quiet moments.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 22;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  master.connect(comp);
  comp.connect(ctx.destination);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  startAmbient();
}

function env(gainNode, t0, peak, attack, decay) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function osc(type, f0, f1, dur, peak) {
  const o = ctx.createOscillator();
  o.type = type;
  const g = ctx.createGain();
  o.connect(g);
  g.connect(sfxBus);
  const t = ctx.currentTime;
  // ±4% pitch micro-jitter kills repetition fatigue on rapid-fire sounds
  const jit = 0.96 + Math.random() * 0.08;
  f0 *= jit;
  f1 *= jit;
  o.frequency.setValueAtTime(Math.max(1, f0), t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, peak, 0.005, dur);
  o.start(t);
  o.stop(t + dur + 0.06);
  // Stopping a source is not enough: the gain node stays wired into the bus and
  // keeps being processed every audio quantum. Hundreds of sounds a minute meant
  // thousands of live nodes after ten minutes of play, which a playtester
  // reported as the game "starting to lag" while their machine was otherwise
  // idle. Unhook the whole chain once the note has finished.
  o.onended = () => { o.disconnect(); g.disconnect(); };
}

function noise(dur, peak, freq, q = 1, type = 'bandpass') {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  const t = ctx.currentTime;
  env(g, t, peak, 0.003, dur);
  src.start(t);
  src.stop(t + dur + 0.06);
  src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
}

const lastPlayed = {};
function gate(name, gap = 0.04) {
  if (!ctx) return false;
  const t = ctx.currentTime;
  if (lastPlayed[name] && t - lastPlayed[name] < gap) return false;
  lastPlayed[name] = t;
  return true;
}

function later(ms, fn) {
  setTimeout(() => { if (ctx) fn(); }, ms);
}

export const sfx = {
  click() { if (gate('click')) osc('square', 900, 700, 0.05, 0.08); },
  heartbeat() {
    if (!gate('heartbeat', 0.5)) return;
    osc('sine', 64, 42, 0.14, 0.3);
    later(190, () => osc('sine', 56, 38, 0.12, 0.22));
  },
  place() {
    if (!gate('place')) return;
    osc('sine', 160, 70, 0.18, 0.25);
    noise(0.08, 0.1, 800);
  },
  upgrade() {
    if (!gate('upgrade', 0.1)) return;
    [440, 587, 784].forEach((f, i) => later(i * 70, () => osc('triangle', f, f, 0.12, 0.12)));
  },
  sell() {
    if (!gate('sell', 0.1)) return;
    [600, 400].forEach((f, i) => later(i * 60, () => osc('triangle', f, f * 0.8, 0.1, 0.1)));
  },
  shot() {
    if (!gate('shot', 0.03)) return;
    noise(0.07, 0.12, 1800, 2);
    osc('square', 700, 250, 0.06, 0.06);
  },
  zap() {
    if (!gate('zap', 0.05)) return;
    osc('sawtooth', 1400, 180, 0.14, 0.1);
    noise(0.1, 0.06, 3000, 1, 'highpass');
  },
  hit() { if (gate('hit', 0.03)) noise(0.05, 0.08, 900, 1.5); },
  // size 0..1 (small fry -> behemoth): bigger things die lower and longer
  death(size = 0.4) {
    if (!gate('death', 0.05)) return;
    const s = Math.max(0, Math.min(1, size));
    const f0 = 300 - s * 150;          // 300Hz squeak down to a 150Hz thud
    const dur = 0.22 + s * 0.28;
    osc('sine', f0, f0 * 0.2, dur, 0.16 + s * 0.12);
    noise(dur * 0.7, 0.07 + s * 0.08, 480 - s * 230, 1, 'lowpass');
    if (s > 0.7) later(40, () => osc('sine', 90, 40, 0.3, 0.14)); // big-body thump
  },
  leak() {
    if (!gate('leak', 0.2)) return;
    osc('square', 330, 330, 0.12, 0.15);
    later(130, () => osc('square', 247, 247, 0.16, 0.15));
  },
  wave() {
    if (!gate('wave', 0.3)) return;
    osc('triangle', 196, 196, 0.2, 0.12);
    later(180, () => osc('triangle', 262, 262, 0.25, 0.12));
  },
  victory() {
    [392, 494, 587, 784].forEach((f, i) => later(i * 140, () => osc('triangle', f, f, 0.25, 0.15)));
  },
  defeat() {
    [330, 277, 220, 165].forEach((f, i) => later(i * 180, () => osc('sawtooth', f, f * 0.97, 0.3, 0.1)));
  },
  boom() {
    if (!gate('boom', 0.08)) return;
    osc('sine', 120, 30, 0.45, 0.35);
    noise(0.35, 0.25, 180, 0.8, 'lowpass');
  },
  ping() {
    if (!gate('ping', 0.4)) return;
    osc('sine', 1200, 1180, 0.4, 0.06);
  },
  droneUp() { if (gate('droneUp', 0.1)) osc('triangle', 300, 520, 0.15, 0.1); },
  droneDown() { if (gate('droneDown', 0.1)) { osc('triangle', 400, 120, 0.2, 0.1); noise(0.1, 0.08, 600); } },
  stun() { if (gate('stun', 0.1)) osc('square', 1600, 1400, 0.09, 0.07); },
  branch() {
    if (!gate('branch', 0.2)) return;
    [392, 523, 659, 880].forEach((f, i) => later(i * 80, () => osc('triangle', f, f, 0.14, 0.13)));
  },
  hold() { if (gate('hold', 0.3)) osc('sine', 700, 500, 0.35, 0.08); },
  heroAbility() {
    if (!gate('heroAbility', 0.2)) return;
    osc('sawtooth', 200, 60, 0.3, 0.2);
    noise(0.25, 0.18, 400, 1, 'lowpass');
  },
  heroDown() {
    if (!gate('heroDown', 0.3)) return;
    [294, 220, 147].forEach((f, i) => later(i * 120, () => osc('triangle', f, f * 0.95, 0.2, 0.12)));
  },
  bossRoar() {
    if (!gate('bossRoar', 0.5)) return;
    osc('sawtooth', 90, 40, 0.8, 0.3);
    noise(0.7, 0.2, 150, 0.7, 'lowpass');
  },
  // `step` walks the chime up a semitone per kill in a streak, capped at an
  // octave. The gate is tighter than the other sounds so fast streaks still
  // read as a run of notes rather than one smear.
  coin(step = 0) {
    if (!gate('coin', 0.05)) return;
    const p = Math.pow(1.0595, Math.max(0, Math.min(12, step)));
    osc('sine', 1320 * p, 1320 * p, 0.05, 0.05);
    later(55, () => osc('sine', 1760 * p, 1760 * p, 0.07, 0.05));
  },
  clank() {
    if (!gate('clank', 0.15)) return;
    noise(0.05, 0.16, 2400, 3);
    osc('square', 340, 300, 0.06, 0.1);
    later(110, () => { noise(0.05, 0.12, 2000, 3); osc('square', 260, 240, 0.07, 0.09); });
  },
  phaseSting() {
    if (!gate('phaseSting', 0.6)) return;
    osc('sawtooth', 110, 55, 0.5, 0.22);
    osc('square', 620, 590, 0.3, 0.06);
    noise(0.4, 0.14, 250, 0.8, 'lowpass');
  },
  levelUp() {
    if (!gate('levelUp', 0.4)) return;
    [523, 659, 784, 1047].forEach((f, i) => later(i * 70, () => osc('triangle', f, f, 0.13, 0.12)));
  },
  splash() {
    if (!gate('splash', 0.06)) return;
    noise(0.12, 0.09, 900, 0.8, 'bandpass');
  },
  deny() {
    if (!gate('deny', 0.15)) return;
    osc('square', 140, 110, 0.09, 0.14);
    noise(0.06, 0.1, 500, 2);
  },
  clash() {
    if (!gate('clash', 0.08)) return;
    noise(0.04, 0.1, 3200, 2.5);
    osc('square', 500, 420, 0.04, 0.05);
  },
  reinf() {
    if (!gate('reinf', 0.3)) return;
    noise(0.2, 0.12, 700, 0.8);
    [330, 440].forEach((f, i) => later(i * 90, () => osc('triangle', f, f, 0.12, 0.1)));
  },
  torpDrop() {
    if (!gate('torpDrop', 0.4)) return;
    osc('sine', 1400, 300, 0.85, 0.09);
  },
};

// Music hooks (music.js drives these buses).
export function getAudioContext() { return ctx; }
export function getMaster() { return master; }
export function setSfxVolume(v) { if (sfxBus) sfxBus.gain.value = v; }

// Low underwater drone: detuned sines through a lowpass, slow LFO swell,
// plus a whisper of filtered noise for water texture.
function startAmbient() {
  if (ambientStarted) return;
  ambientStarted = true;

  const g = ctx.createGain();
  g.gain.value = 0.06;
  g.connect(master);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 220;
  f.connect(g);
  [55, 55.7, 82.4].forEach(freq => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const og = ctx.createGain();
    og.gain.value = 0.5;
    o.connect(og);
    og.connect(f);
    o.start();
  });
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lg = ctx.createGain();
  lg.gain.value = 0.025;
  lfo.connect(lg);
  lg.connect(g.gain);
  lfo.start();

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const nf = ctx.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 400;
  nf.Q.value = 0.6;
  const ng = ctx.createGain();
  ng.gain.value = 0.015;
  src.connect(nf);
  nf.connect(ng);
  ng.connect(master);
  const nlfo = ctx.createOscillator();
  nlfo.frequency.value = 0.05;
  const nlg = ctx.createGain();
  nlg.gain.value = 0.01;
  nlfo.connect(nlg);
  nlg.connect(ng.gain);
  nlfo.start();
  src.start();
}
