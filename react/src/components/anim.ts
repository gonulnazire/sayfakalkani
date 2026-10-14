import {Easing, interpolate} from 'remotion';

// start karesinde 0'dan başlayıp duration kare sonra 1'e ulaşan, uçlarda sabitlenen ilerleme.
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = Easing.inOut(Easing.cubic),
) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

// Daktilo efekti: start karesinden itibaren her karede charsPerFrame kadar harf yazılır.
export const typed = (text: string, frame: number, start: number, charsPerFrame = 1.5) => {
  const chars = Array.from(text);
  const count = Math.floor((frame - start) * charsPerFrame);
  return chars.slice(0, Math.max(0, Math.min(chars.length, count))).join('');
};
