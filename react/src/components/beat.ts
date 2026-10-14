import {createContext, useContext} from 'react';
import {useCurrentFrame} from 'remotion';
import {FRAMES_PER_BEAT} from '../constants';

// Her sahne kendi yerel karesiyle çalışır. Müzikle senkron kalmak için
// sahnenin videodaki başlangıç karesini bu context ile aşağı taşıyoruz.
export const SceneStart = createContext(0);

export const useBeat = () => {
  const frame = useCurrentFrame() + useContext(SceneStart);
  const sinceBeat = frame % FRAMES_PER_BEAT;
  return {
    // Vuruş anında 1, sonra hızla 0'a iner.
    pulse: Math.exp(-sinceBeat / 4),
    beat: Math.floor(frame / FRAMES_PER_BEAT),
  };
};
