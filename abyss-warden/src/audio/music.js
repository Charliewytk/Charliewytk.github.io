// Generative music: three moods (menu / battle / boss) — bass, pads, arps,
// lead melodies, and a filtered-noise drum kit. No audio files.
import { getAudioContext, getMaster } from './synth.js';

let ctx = null;
let bus = null;
let drumBus = null;
let noiseBuf = null;
let started = false;
let mood = 'menu';
let volume = 0.6;
let intensity = 0; // 0..1 — boss phases push tempo + drums up
let muffle = null;
let timer = null;
let nextNoteTime = 0;
let stepIdx = 0;
let barIdx = 0;

// D minor pentatonic across octaves (Hz).
const ROOT = 73.42; // D2
const SCALE = [0, 3, 5, 7, 10];
// chord roots cycle: i — VI — III — VII (in scale degrees)
const PROGRESSION = [0, -2, 2, 1];

function note(deg, oct = 0) {
  const semis = SCALE[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct);
  return ROOT * Math.pow(2, semis / 12);
}

const MOODS = {
  menu: {
    bpm: 64, bassEvery: 8, arpChance: 0.12, padEvery: 16, dark: 0, arpOct: 2, drums: false,
    melody: [0, null, 2, null, 4, null, 3, null, 2, null, 4, null, 5, null, 4, 2,
             0, null, 2, null, 4, null, 7, null, 5, null, 4, null, 2, null, 1, null],
    melodyPeak: 0.09,
  },
  battle: {
    bpm: 98, bassEvery: 4, arpChance: 0.3, padEvery: 16, dark: 0, arpOct: 2, drums: true,
    melody: [4, null, null, 5, null, 4, null, null, 2, null, null, 4, null, null, null, null,
             7, null, null, 5, null, 4, null, 2, null, null, 1, null, 0, null, null, null],
    melodyPeak: 0.055,
  },
  boss: {
    bpm: 126, bassEvery: 2, arpChance: 0.5, padEvery: 8, dark: 1, arpOct: 1, drums: true,
    melody: [0, null, 0, null, 1, null, 0, null, 0, null, 0, null, -1, null, 1, null],
    melodyPeak: 0.06,
  },
};

function env(g, t0, peak, a, d) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function playNote(time, freq, type, peak, a, d, filterFreq, dest = null) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  let head = o;
  if (filterFreq) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    o.connect(f);
    head = f;
  }
  head.connect(g);
  g.connect(dest || bus);
  env(g, time, peak, a, d);
  o.start(time);
  o.stop(time + a + d + 0.1);
}

// ---- drum kit from noise + sines ----
function kick(time, peak = 0.3) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, time);
  o.frequency.exponentialRampToValueAtTime(45, time + 0.1);
  const g = ctx.createGain();
  o.connect(g);
  g.connect(drumBus);
  env(g, time, peak, 0.004, 0.16);
  o.start(time);
  o.stop(time + 0.25);
}

function noiseHit(time, peak, freq, q, type, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 1;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  src.connect(f);
  f.connect(g);
  g.connect(drumBus);
  env(g, time, peak, 0.003, dur);
  src.start(time);
  src.stop(time + dur + 0.05);
}

function schedule() {
  if (!ctx) return;
  const m = MOODS[mood];
  const stepDur = 60 / (m.bpm * (1 + intensity * 0.18)) / 2;
  while (nextNoteTime < ctx.currentTime + 0.5) {
    const t = nextNoteTime;
    const s = stepIdx;
    const chord = PROGRESSION[Math.floor(s / 16) % PROGRESSION.length];
    // bass
    if (s % m.bassEvery === 0) {
      const deg = chord + (s % 16 === 8 ? (m.dark ? -1 : 4) : 0);
      playNote(t, note(deg, 0), 'triangle', 0.22, 0.01, stepDur * 1.6, 300);
      playNote(t, note(deg, -1), 'sine', 0.12, 0.01, stepDur * 1.8, 200);
    }
    // pad swell
    if (s % m.padEvery === 0) {
      for (const d of [0, 2, 4]) {
        playNote(t, note(chord + d, 1) * (1 + (Math.random() - 0.5) * 0.003), 'sawtooth', 0.032,
          stepDur * 3, stepDur * m.padEvery * 0.9, 700);
      }
    }
    // lead melody
    if (m.melody) {
      const deg = m.melody[s % m.melody.length];
      if (deg != null) {
        playNote(t, note(deg + (m.dark ? chord : 0), 2), 'sine', m.melodyPeak, 0.05, stepDur * 2.6, 2200);
        playNote(t, note(deg + (m.dark ? chord : 0), 1), 'triangle', m.melodyPeak * 0.45, 0.05, stepDur * 2.6, 1200);
      }
    }
    // arp sparkles
    if (Math.random() < m.arpChance) {
      const deg = chord + Math.floor(Math.random() * 8) - 2;
      playNote(t, note(deg, m.arpOct), 'triangle', 0.05, 0.005, stepDur * 0.9, 2400);
    }
    // drums (heavier as intensity rises)
    if (m.drums) {
      if (s % 4 === 0) kick(t, (m.dark ? 0.34 : 0.26) + intensity * 0.1);
      if ((m.dark || intensity > 0.4) && s % 4 === 2) kick(t, 0.2 + intensity * 0.08);
      if (s % 2 === 1) noiseHit(t, 0.05 + intensity * 0.03, 7000, 1, 'highpass', 0.04);
      if (s % 8 === 4) noiseHit(t, 0.1 + intensity * 0.05, 1800, 1.2, 'bandpass', 0.12);
      if (intensity > 0.8 && s % 8 === 6) noiseHit(t, 0.08, 1400, 1.4, 'bandpass', 0.1);
    }
    // boss: tension ticker
    if (m.dark && s % 4 === 2) {
      playNote(t, note(0, 3) * 1.06, 'square', 0.018, 0.003, stepDur * 0.4, 3000);
    }
    nextNoteTime += stepDur;
    stepIdx++;
    if (stepIdx % 16 === 0) barIdx++;
  }
}

export function startMusic() {
  ctx = getAudioContext();
  if (!ctx || started) return;
  started = true;
  muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 18000;
  muffle.connect(getMaster());
  bus = ctx.createGain();
  bus.gain.value = volume * 0.5;
  bus.connect(muffle);
  drumBus = ctx.createGain();
  drumBus.gain.value = volume * 0.4;
  drumBus.connect(muffle);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextNoteTime = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 120);
}

export function setMood(next) {
  if (mood === next) return;
  mood = next;
  stepIdx = 0;
  if (ctx && bus) {
    const t = ctx.currentTime;
    for (const b of [bus, drumBus]) {
      b.gain.cancelScheduledValues(t);
      b.gain.setValueAtTime(b.gain.value, t);
      b.gain.linearRampToValueAtTime(0.02, t + 0.4);
      b.gain.linearRampToValueAtTime((b === bus ? 0.5 : 0.4) * volume, t + 1.4);
    }
  }
}

// Dip the music under a big moment (boss roar, phase change) so the sting
// lands, then swell back. Classic sidechain feel without a real sidechain.
export function duckMusic(depth = 0.35, hold = 0.5) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime;
  for (const b of [bus, drumBus]) {
    if (!b) continue;
    const full = (b === bus ? 0.5 : 0.4) * volume;
    b.gain.cancelScheduledValues(t);
    b.gain.setValueAtTime(b.gain.value, t);
    b.gain.linearRampToValueAtTime(Math.max(0.0001, full * depth), t + 0.08);
    b.gain.setValueAtTime(Math.max(0.0001, full * depth), t + hold);
    b.gain.linearRampToValueAtTime(full, t + hold + 0.7);
  }
}

// Underwater-sounding low-pass while the game is paused.
export function setMuffled(m) {
  if (!ctx || !muffle) return;
  const t = ctx.currentTime;
  muffle.frequency.cancelScheduledValues(t);
  muffle.frequency.setValueAtTime(muffle.frequency.value, t);
  muffle.frequency.exponentialRampToValueAtTime(m ? 380 : 18000, t + 0.35);
}

export function setIntensity(i) {
  intensity = Math.max(0, Math.min(1, i));
}

export function setMusicVolume(v) {
  volume = v;
  if (bus && ctx) {
    bus.gain.setValueAtTime(v * 0.5, ctx.currentTime);
    drumBus.gain.setValueAtTime(v * 0.4, ctx.currentTime);
  }
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
  for (const b of [bus, drumBus, muffle]) {
    if (b) { try { b.disconnect(); } catch (e) { /* ok */ } }
  }
  bus = drumBus = muffle = null;
}
