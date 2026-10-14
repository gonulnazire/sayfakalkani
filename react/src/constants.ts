import timing from './timing.json';

// Zamanlama tek yerden gelir: timing.json. Müzik betiği (scripts/generate-music.mjs)
// de aynı dosyayı okur, böylece sahne geçişleri ve müzikteki vuruşlar hep örtüşür.
export const FPS = timing.fps;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_FRAMES = timing.durationInSeconds * FPS;

// 120 BPM ve 30 fps'te bir vuruş 15 kare, bir ölçü 60 kare (2 sn).
export const FRAMES_PER_BEAT = (FPS * 60) / timing.bpm;
export const FRAMES_PER_BAR = FRAMES_PER_BEAT * 4;

export const TRANSITION_FRAMES = timing.transitionFrames;

// Sahne değişimleri (kare cinsinden). Her geçişin ortası bu karelere denk gelir.
const cuts = [0, ...timing.cutsInSeconds.map((s) => s * FPS), TOTAL_FRAMES];

if (TRANSITION_FRAMES.length !== cuts.length - 2) {
  throw new Error('timing.json: her sahne değişimi için bir geçiş süresi olmalı.');
}
if (TRANSITION_FRAMES.some((t) => t % 2 !== 0)) {
  throw new Error('timing.json: geçiş süreleri çift sayı olmalı.');
}

// TransitionSeries geçişleri iki sahneyi üst üste bindirir. Bu yüzden her sahne,
// kesimden yarım geçiş süresi önce başlar ve yarım geçiş süresi sonra biter.
export const SCENES = cuts.slice(0, -1).map((cut, i) => {
  const isFirst = i === 0;
  const isLast = i === cuts.length - 2;
  const from = isFirst ? 0 : cut - TRANSITION_FRAMES[i - 1] / 2;
  const to = isLast ? TOTAL_FRAMES : cuts[i + 1] + TRANSITION_FRAMES[i] / 2;
  return {from, durationInFrames: to - from};
});

// toplam = sahne süreleri toplamı − geçiş süreleri toplamı
const computedTotal =
  SCENES.reduce((sum, s) => sum + s.durationInFrames, 0) -
  TRANSITION_FRAMES.reduce((sum, t) => sum + t, 0);

if (computedTotal !== TOTAL_FRAMES) {
  throw new Error(
    `Sahne süreleri tutmuyor: ${computedTotal} kare hesaplandı, ${TOTAL_FRAMES} bekleniyordu.`,
  );
}
