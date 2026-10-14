import React from 'react';
import {AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress} from '../components/anim';
import {useBeat} from '../components/beat';
import {KineticText} from '../components/KineticText';
import {LogoMark} from '../components/LogoMark';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {pulse} = useBeat();

  const logoIn = spring({frame: frame - 12, fps, config: {damping: 11, stiffness: 120}});
  const tagline = progress(frame, 62, 16, Easing.out(Easing.cubic));
  const meta = progress(frame, 92, 14, Easing.out(Easing.cubic));

  return (
    <Page tone="marker">
      <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 180}}>
        <div
          style={{
            width: 140,
            transform: `scale(${logoIn * (1 + pulse * 0.04)}) rotate(${(1 - logoIn) * 20}deg)`,
            transformOrigin: '30% 60%',
          }}
        >
          <LogoMark size={140} lines={COLORS.ink} />
        </div>
        <h1
          style={{
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: COLORS.ink,
            margin: '36px 0 0',
          }}
        >
          <KineticText text="Sözleşme Okuyucu" delay={20} stagger={1.6} />
        </h1>
        <p
          style={{
            fontFamily: FONTS.serif,
            fontWeight: 500,
            fontSize: 66,
            color: COLORS.ink,
            margin: '30px 0 0',
            opacity: tagline,
            transform: `translateY(${(1 - tagline) * 30}px)`,
          }}
        >
          Onaylamadan önce ne kabul ettiğini bil.
        </p>
        <div
          style={{
            marginTop: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            opacity: meta,
            transform: `translateY(${(1 - meta) * 20}px)`,
          }}
        >
          <div
            style={{
              padding: '12px 26px',
              borderRadius: 30,
              backgroundColor: COLORS.ink,
              color: COLORS.marker,
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 32,
            }}
          >
            Chrome eklentisi
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'flex-end', padding: '0 0 70px 180px'}}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 26,
            color: COLORS.ink,
            opacity: meta * 0.7,
          }}
        >
          Bu hukuki tavsiye değildir.
        </div>
      </AbsoluteFill>
    </Page>
  );
};
