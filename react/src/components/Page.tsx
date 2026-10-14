import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COLORS} from '../theme';

type Tone = 'ink' | 'paper' | 'marker';

const BACKGROUNDS: Record<Tone, string> = {
  ink: COLORS.ink,
  paper: COLORS.paper,
  marker: COLORS.marker,
};

// Kâğıt dokusu: küçük bir gürültü karosu, tüm ekrana döşenir.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

export const Page: React.FC<{tone: Tone; children: React.ReactNode}> = ({
  tone,
  children,
}) => {
  return (
    <AbsoluteFill style={{backgroundColor: BACKGROUNDS[tone], overflow: 'hidden'}}>
      {children}
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          opacity: tone === 'ink' ? 0.1 : 0.07,
          mixBlendMode: tone === 'ink' ? 'screen' : 'multiply',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
