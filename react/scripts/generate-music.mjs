// Videonun müziğini üretir: 60 saniyelik, 120 BPM elektronik bir parça (public/music.wav).
// Dış bağımlılık yoktur ve telif sorunu yoktur. Gürültü sabit tohumlu üretildiği için
// betik her çalıştığında aynı dosyayı verir.
// Bölümler ve geçiş sesleri src/timing.json içindeki sahne kesimlerine göre yerleşir.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const timing = JSON.parse(readFileSync(join(root, 'src', 'timing.json'), 'utf8'));

const SR = 44100;
const DURATION = timing.durationInSeconds;
const BEAT = 60 / timing.bpm;
const BAR = BEAT * 4;
const STEP = BEAT / 4; // on altılık nota
const BARS = Math.round(DURATION / BAR);
const N = Math.round(SR * DURATION);
const CUTS = timing.cutsInSeconds;

// Sahne kesimlerinin denk geldiği ölçüler: 6 sn -> 3. ölçü, 14 sn -> 7. ölçü ...
const cutBars = CUTS.map((s) => Math.round(s / BAR));
const TENSION_BAR = cutBars[0]; // sorun sahnesi: gerilim
const GROOVE_BAR = cutBars[1]; // tespit sahnesi: tam ritim başlar
const LIFT_BAR = cutBars[cutBars.length - 2]; // uyarı sahnesi: hafifler
const OUTRO_BAR = cutBars[cutBars.length - 1]; // kapanış

// ---------------------------------------------------------------- yardımcılar

const bus = () => [new Float32Array(N), new Float32Array(N)];
const drums = bus();
const bass = bus();
const pad = bus();
const arp = bus();
const fx = bus();

let seed = 20261012;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rand() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const lowpassCoef = (hz) => 1 - Math.exp((-2 * Math.PI * hz) / SR);
const highpassCoef = (hz) => 1 / (1 + (2 * Math.PI * hz) / SR);

// pan: -1 sol, 0 orta, 1 sağ
const write = ([L, R], i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.min(1, 1 - pan);
  R[i] += v * Math.min(1, 1 + pan);
};

const toSample = (seconds) => Math.round(seconds * SR);

// ---------------------------------------------------------------- enstrümanlar

const kickTimes = [];

const kick = (t0, amp) => {
  kickTimes.push(t0);
  const start = toSample(t0);
  let phase = 0;
  for (let n = 0; n < toSample(0.45); n++) {
    const t = n / SR;
    const freq = 48 + 120 * Math.exp(-t / 0.035);
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.exp(-t / 0.16) * Math.min(1, t / 0.002);
    const click = n < 60 ? noise() * 0.3 * (1 - n / 60) : 0;
    write(drums, start + n, (Math.tanh(1.8 * Math.sin(phase) * env) + click) * amp);
  }
};

const snare = (t0, amp) => {
  const start = toSample(t0);
  const a = highpassCoef(1400);
  let x1 = 0;
  let y = 0;
  for (let n = 0; n < toSample(0.3); n++) {
    const t = n / SR;
    const x = noise();
    y = a * (y + x - x1);
    x1 = x;
    const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.05) * 0.6;
    write(drums, start + n, (y * Math.exp(-t / 0.09) + body) * amp, -0.05);
  }
};

const hat = (t0, amp, decay = 0.03) => {
  const start = toSample(t0);
  const a = highpassCoef(7500);
  let x1 = 0;
  let y = 0;
  for (let n = 0; n < toSample(decay * 6); n++) {
    const t = n / SR;
    const x = noise();
    y = a * (y + x - x1);
    x1 = x;
    write(drums, start + n, y * Math.exp(-t / decay) * amp, 0.3);
  }
};

const crash = (t0, amp) => {
  const start = toSample(t0);
  const a = highpassCoef(4500);
  const state = [
    {x1: 0, y: 0},
    {x1: 0, y: 0},
  ];
  for (let n = 0; n < toSample(2); n++) {
    const t = n / SR;
    const env = Math.exp(-t / 0.55) * amp;
    state.forEach((s, ch) => {
      const x = noise();
      s.y = a * (s.y + x - s.x1);
      s.x1 = x;
      write(fx, start + n, s.y * env, ch === 0 ? -1 : 1);
    });
  }
};

const bassNote = (midi, t0, dur, amp) => {
  const start = toSample(t0);
  const freq = mtof(midi);
  let phase = 0;
  let y1 = 0;
  let y2 = 0;
  const len = toSample(dur);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    phase = (phase + freq / SR) % 1;
    const saw = 2 * phase - 1;
    const sub = Math.sin(2 * Math.PI * phase);
    const a = lowpassCoef(180 + 1300 * Math.exp(-t / 0.09));
    y1 += a * (saw - y1);
    y2 += a * (y1 - y2);
    const env = Math.min(1, t / 0.004) * Math.min(1, (len - n) / toSample(0.03));
    write(bass, start + n, (y2 * 0.8 + sub * 0.55) * env * amp);
  }
};

const padChord = (notes, t0, dur, amp) => {
  const start = toSample(t0);
  const len = toSample(dur + 0.6);
  const a = lowpassCoef(1100);
  for (const midi of notes) {
    for (const [detune, pan] of [
      [-0.09, -0.65],
      [0.09, 0.65],
    ]) {
      const freq = mtof(midi + detune);
      let phase = rand();
      let y1 = 0;
      let y2 = 0;
      for (let n = 0; n < len; n++) {
        const t = n / SR;
        phase = (phase + freq / SR) % 1;
        y1 += a * (2 * phase - 1 - y1);
        y2 += a * (y1 - y2);
        const attack = Math.min(1, t / 0.25);
        const release = t > dur ? Math.max(0, 1 - (t - dur) / 0.6) : 1;
        write(pad, start + n, y2 * attack * release * amp, pan);
      }
    }
  }
};

const pluck = (midi, t0, amp, pan) => {
  const start = toSample(t0);
  const freq = mtof(midi);
  let phase = 0;
  for (let n = 0; n < toSample(0.45); n++) {
    const t = n / SR;
    phase = (phase + freq / SR) % 1;
    const tri = 1 - 4 * Math.abs(phase - 0.5);
    const env = Math.min(1, t / 0.003) * Math.exp(-t / 0.11);
    write(arp, start + n, tri * env * amp, pan);
  }
};

// Bir sonraki bölüme hazırlayan, giderek parlaklaşan gürültü.
const riser = (t0, t1, amp) => {
  const start = toSample(t0);
  const len = toSample(t1 - t0);
  const ys = [0, 0];
  for (let n = 0; n < len; n++) {
    const x = n / len;
    const a = lowpassCoef(400 * Math.pow(22, x));
    for (let ch = 0; ch < 2; ch++) {
      ys[ch] += a * (noise() - ys[ch]);
      write(fx, start + n, ys[ch] * x * x * amp, ch === 0 ? -1 : 1);
    }
  }
};

// Sahne geçişinde soldan sağa geçen "vuuş" sesi; tepe noktası tam kesimde.
const whoosh = (tc, amp) => {
  const before = 0.45;
  const after = 0.3;
  const start = toSample(tc - before);
  const len = toSample(before + after);
  let y = 0;
  for (let n = 0; n < len; n++) {
    const t = n / SR - before;
    const env = t < 0 ? Math.pow(1 + t / before, 3) : Math.exp(-t / 0.08);
    const a = lowpassCoef(500 + 4500 * env);
    y += a * (noise() - y);
    const pan = Math.max(-1, Math.min(1, (t / (before + after)) * 2.4));
    write(fx, start + n, y * env * amp, pan);
  }
};

const impact = (tc, amp) => {
  const start = toSample(tc);
  let phase = 0;
  for (let n = 0; n < toSample(1.2); n++) {
    const t = n / SR;
    const freq = 42 + 50 * Math.exp(-t / 0.08);
    phase += (2 * Math.PI * freq) / SR;
    write(fx, start + n, Math.sin(phase) * Math.exp(-t / 0.45) * amp);
  }
  crash(tc, amp * 0.5);
};

// ---------------------------------------------------------------- düzenleme

// Am – F – C – G (ses yürüyüşü yakın tutulmuş akorlar)
const CHORDS = [
  {root: 45, notes: [57, 60, 64]},
  {root: 41, notes: [57, 60, 65]},
  {root: 48, notes: [55, 60, 64]},
  {root: 43, notes: [55, 59, 62]},
];
const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 0, 2, 0, 1, 2, 3, 2, 1, 3, 2];

for (let b = 0; b < BARS; b++) {
  const t = b * BAR;
  const lastBars = b >= BARS - 2;
  const chord = lastBars ? CHORDS[0] : CHORDS[b % 4];
  const intro = b < TENSION_BAR;
  const tension = b >= TENSION_BAR && b < GROOVE_BAR;
  const groove = b >= GROOVE_BAR && b < LIFT_BAR;
  const lift = b >= LIFT_BAR && b < OUTRO_BAR;
  const outro = b >= OUTRO_BAR;

  // Pad: her ölçüde akor. Son iki ölçüde tek uzun Am akoru.
  if (b === BARS - 2) {
    padChord(chord.notes, t, 2 * BAR - 0.6, 0.16);
  } else if (!lastBars) {
    padChord(chord.notes, t, BAR, 0.15);
  }

  // Arpej: girişte sekizlik, ana bölümde on altılık notalar.
  if (!lastBars) {
    const arpNotes = [...chord.notes.map((n) => n + 12), chord.notes[0] + 24];
    const lift12 = lift ? 12 : 0;
    for (let s = 0; s < 16; s++) {
      const sparse = intro || outro;
      if (sparse && s % 2 === 1) continue;
      const fadeIn = intro ? (b * 16 + s) / (TENSION_BAR * 16) : 1;
      const amp = (s % 4 === 0 ? 0.32 : 0.24) * (0.55 + 0.45 * fadeIn);
      pluck(arpNotes[ARP_PATTERN[s]] + lift12, t + s * STEP, amp, s % 2 === 0 ? -0.35 : 0.35);
    }
  }

  // Davul
  if (tension) {
    kick(t, 0.85);
    kick(t + 2 * BEAT, 0.75);
    for (let i = 0; i < 4; i++) hat(t + i * BEAT + BEAT / 2, 0.16);
  }
  if (groove || lift) {
    for (let i = 0; i < 4; i++) kick(t + i * BEAT, 0.9);
    snare(t + BEAT, 0.5);
    snare(t + 3 * BEAT, 0.5);
    for (let s = 0; s < 16; s++) {
      if (lift && s % 2 === 0) continue;
      const accent = s % 4 === 2 ? 0.2 : 0.1;
      hat(t + s * STEP, accent, s === 14 ? 0.09 : 0.025);
    }
    // Bir sonraki ölçü bir sahne kesimiyse son vuruşta trampet dolgusu.
    if (cutBars.includes(b + 1)) {
      for (let s = 0; s < 4; s++) snare(t + 3 * BEAT + s * STEP, 0.22 + s * 0.08);
    }
  }
  if (outro && b === OUTRO_BAR) kick(t, 1);

  // Bas: ana bölümde sekizlik oktav sıçramaları, gerilimde uzun notalar.
  if (tension) bassNote(chord.root, t, BAR * 0.95, 0.3);
  if (groove || lift) {
    for (let e = 0; e < 8; e++) {
      bassNote(chord.root + (e % 2 === 1 ? 12 : 0), t + e * (BEAT / 2), BEAT / 2 - 0.02, 0.36);
    }
  }
}

// Geçiş sesleri: her sahne kesiminde vuuş, büyük bölüm değişimlerinde darbe.
for (const cut of CUTS) whoosh(cut, 0.5);
riser(GROOVE_BAR * BAR - 2, GROOVE_BAR * BAR, 0.45);
riser(OUTRO_BAR * BAR - 2, OUTRO_BAR * BAR, 0.4);
impact(GROOVE_BAR * BAR, 0.9);
impact(OUTRO_BAR * BAR, 0.9);
for (const cut of CUTS.slice(2, -2)) crash(cut, 0.22);

// ---------------------------------------------------------------- miks

// Sidechain: her kick'te pad ve bas kısa bir an kısılır, müzik "nefes alır".
const duck = new Float32Array(N).fill(1);
for (const k of kickTimes) {
  const start = toSample(k);
  for (let n = 0; n < toSample(0.3); n++) {
    const i = start + n;
    if (i >= N) break;
    duck[i] = Math.min(duck[i], 1 - 0.6 * Math.exp(-n / SR / 0.09));
  }
}

// Arpej için ping-pong yankı (noktalı sekizlik).
const D = toSample(STEP * 3);
const wet = bus();
for (let i = D; i < N; i++) {
  wet[0][i] = (arp[0][i - D] + arp[1][i - D]) * 0.5 + wet[1][i - D] * 0.4;
  wet[1][i] = wet[0][i - D] * 0.4;
}

const master = bus();
for (let ch = 0; ch < 2; ch++) {
  for (let i = 0; i < N; i++) {
    master[ch][i] =
      drums[ch][i] +
      bass[ch][i] * 0.8 * duck[i] +
      pad[ch][i] * 0.55 * duck[i] +
      (arp[ch][i] + wet[ch][i] * 0.45) * 0.42 * (0.6 + 0.4 * duck[i]) +
      fx[ch][i] * 0.7;
  }
}

let peak = 0;
for (const ch of master) for (const v of ch) peak = Math.max(peak, Math.abs(v));
const DRIVE = 1.2;
const fadeOut = toSample(1.5);
for (const ch of master) {
  for (let i = 0; i < N; i++) {
    let v = Math.tanh((ch[i] / peak) * DRIVE) / Math.tanh(DRIVE);
    v *= Math.min(1, i / toSample(0.02)) * Math.min(1, (N - 1 - i) / fadeOut);
    ch[i] = v * 0.9;
  }
}

// ---------------------------------------------------------------- WAV

const CHANNELS = 2;
const BYTES = 2;
const dataSize = N * CHANNELS * BYTES;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // PCM
wav.writeUInt16LE(CHANNELS, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * CHANNELS * BYTES, 28);
wav.writeUInt16LE(CHANNELS * BYTES, 32);
wav.writeUInt16LE(BYTES * 8, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);
for (let i = 0; i < N; i++) {
  for (let ch = 0; ch < CHANNELS; ch++) {
    const v = Math.max(-1, Math.min(1, master[ch][i]));
    wav.writeInt16LE(Math.round(v * 32767), 44 + (i * CHANNELS + ch) * BYTES);
  }
}

const out = join(root, 'public', 'music.wav');
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, wav);
console.log(`public/music.wav yazıldı: ${DURATION} sn, ${BARS} ölçü, ${(wav.length / 1e6).toFixed(1)} MB`);
