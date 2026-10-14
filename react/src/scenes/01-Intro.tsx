import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress} from '../components/anim';
import {useBeat} from '../components/beat';
import {KineticText} from '../components/KineticText';
import {LogoMark} from '../components/LogoMark';
import {MarkerLine} from '../components/MarkerLine';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {pulse} = useBeat();

  const logoIn = spring({frame: frame - 4, fps, config: {damping: 12, stiffness: 110}});
  const stripe = progress(frame, 28, 14);
  const subtitleIn = progress(frame, 58, 14, Easing.out(Easing.cubic));
  const marker = progress(frame, 84, 26);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.07]);

  return (
    <Page tone="ink">
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          paddingLeft: 180,
          transform: `scale(${push})`,
          transformOrigin: '15% 50%',
        }}
      >
        <div
          style={{
            width: 150,
            transform: `scale(${logoIn * (1 + pulse * 0.05)}) rotate(${(1 - logoIn) * -24}deg)`,
            transformOrigin: '30% 60%',
          }}
        >
          <LogoMark size={150} lines={COLORS.inkSoft} stripe={stripe} />
        </div>
        <h1
          style={{
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: COLORS.paper,
            margin: '40px 0 0',
          }}
        >
          <KineticText text="Sözleşme Okuyucu" delay={14} stagger={1.6} />
        </h1>
        <p
          style={{
            fontFamily: FONTS.serif,
            fontSize: 64,
            margin: '36px 0 0',
            opacity: subtitleIn,
            transform: `translateY(${(1 - subtitleIn) * 30}px)`,
          }}
        >
          <MarkerLine progress={marker} color={COLORS.paper}>
            Kullanım koşullarını senin yerine okur.
          </MarkerLine>
        </p>
      </AbsoluteFill>
    </Page>
  );
};
