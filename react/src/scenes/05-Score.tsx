import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {progress} from '../components/anim';
import {useBeat} from '../components/beat';
import {KineticText} from '../components/KineticText';
import {Page} from '../components/Page';
import {RiskRing} from '../components/RiskRing';
import {COLORS, FONTS} from '../theme';

const SCORE = 72;
const LEVELS = [
  {label: '0–39 düşük risk', color: COLORS.safe, min: 0},
  {label: '40–69 orta risk', color: COLORS.marker, min: 40},
  {label: '70–100 yüksek risk', color: COLORS.stamp, min: 70},
];

const scoreColor = (score: number) =>
  interpolateColors(score, [0, 40, 72, 100], [COLORS.safe, COLORS.marker, COLORS.stamp, COLORS.stamp]);

export const Score: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {pulse} = useBeat();

  const score = interpolate(frame, [20, 110], [0, SCORE], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const color = scoreColor(score);
  const ringIn = spring({frame: frame - 6, fps, config: {damping: 14, stiffness: 90}});
  const pill = spring({frame: frame - 112, fps, config: {damping: 10, stiffness: 170}});
  const settled = frame > 120 ? pulse * 0.02 : 0;

  return (
    <Page tone="ink">
      <AbsoluteFill style={{left: 180, width: 700, justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            position: 'relative',
            width: 600,
            height: 600,
            transform: `scale(${(0.6 + ringIn * 0.4) * (1 + settled)}) rotate(${(1 - ringIn) * -40}deg)`,
            opacity: Math.min(1, ringIn * 1.5),
          }}
        >
          <RiskRing size={600} stroke={46} value={score} color={color} track={COLORS.inkSoft} />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div
              style={{
                fontFamily: FONTS.display,
                fontWeight: 900,
                fontSize: 230,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: COLORS.paper,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(score)}
            </div>
            <div style={{fontFamily: FONTS.display, fontWeight: 500, fontSize: 40, color: COLORS.graphite}}>
              / 100
            </div>
          </AbsoluteFill>
        </div>
        <div
          style={{
            marginTop: 40,
            padding: '14px 34px',
            borderRadius: 40,
            backgroundColor: COLORS.stamp,
            color: COLORS.sheet,
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 38,
            transform: `scale(${pill})`,
          }}
        >
          Yüksek risk
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{left: 1010, width: 780, justifyContent: 'center'}}>
        <h2
          style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 76,
            lineHeight: 1.06,
            letterSpacing: '-0.025em',
            color: COLORS.paper,
            margin: 0,
          }}
        >
          <KineticText text="Her sözleşmeye 0 ile 100 arasında bir risk puanı verir." delay={18} stagger={0.7} />
        </h2>
        <div style={{marginTop: 56, display: 'flex', flexDirection: 'column', gap: 20}}>
          {LEVELS.map((level, i) => {
            const rowIn = progress(frame, 60 + i * 8, 12, Easing.out(Easing.cubic));
            const active = score >= level.min && (i === LEVELS.length - 1 || score < LEVELS[i + 1].min);
            return (
              <div
                key={level.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  opacity: rowIn,
                  transform: `translateX(${(1 - rowIn) * 40}px)`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: level.color,
                    transform: `scale(${active ? 1.25 : 1})`,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: active ? 700 : 500,
                    fontSize: 36,
                    color: active ? COLORS.paper : COLORS.graphite,
                  }}
                >
                  {level.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Page>
  );
};
