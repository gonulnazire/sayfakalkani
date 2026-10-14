import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Harfler sırayla, kelime sınırının altından yaylanarak yükselir.
export const KineticText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
}> = ({text, delay = 0, stagger = 1.5}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  let index = 0;

  return (
    <>
      {words.map((word, w) => (
        <React.Fragment key={w}>
          <span
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              padding: '0.14em 0.02em',
              margin: '-0.14em -0.02em',
              verticalAlign: 'top',
            }}
          >
            {Array.from(word).map((char) => {
              const i = index++;
              const s = spring({
                frame: frame - delay - i * stagger,
                fps,
                config: {damping: 13, stiffness: 170, mass: 0.6},
              });
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    transform: `translateY(${(1 - s) * 1.15}em) rotate(${(1 - s) * 7}deg)`,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
          {w < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </>
  );
};
