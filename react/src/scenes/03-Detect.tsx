import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress} from '../components/anim';
import {useBeat} from '../components/beat';
import {BrowserMockup} from '../components/BrowserMockup';
import {Highlight} from '../components/Highlight';
import {KineticText} from '../components/KineticText';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

const LINKS = ['Kullanım Koşulları', 'Gizlilik Politikası', 'Çerez Politikası'];
const LINK_START = 57;
const LINK_GAP = 15;
const BADGE_AT = LINK_START + LINKS.length * LINK_GAP;

const Bar: React.FC<{width: number | string; height?: number; color?: string}> = ({
  width,
  height = 18,
  color = '#D9DEE6',
}) => <div style={{width, height, borderRadius: height / 2, backgroundColor: color}} />;

export const Detect: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {pulse} = useBeat();

  const windowIn = spring({frame: frame - 8, fps, config: {damping: 15, stiffness: 90}});
  const badge = spring({frame: frame - BADGE_AT, fps, config: {damping: 9, stiffness: 180}});
  const ring = progress(frame, BADGE_AT, 24, Easing.out(Easing.quad));
  const toast = spring({frame: frame - BADGE_AT - 18, fps, config: {damping: 14}});
  const drift = interpolate(frame, [0, 207], [0, -24]);

  return (
    <Page tone="ink">
      <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 140, width: 720}}>
        <h2
          style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 84,
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            color: COLORS.paper,
            margin: 0,
          }}
        >
          <KineticText text="Sayfadaki sözleşmeleri kendisi bulur." delay={14} stagger={0.9} />
        </h2>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          left: 760,
          justifyContent: 'center',
          transform: `translateY(${(1 - windowIn) * 260 + drift}px) rotate(${(1 - windowIn) * 5}deg)`,
          opacity: Math.min(1, windowIn * 2),
        }}
      >
        <BrowserMockup
          url="ornek-site.com/kayit"
          width={1040}
          height={720}
          extensionSlot={
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: 18,
                  border: `4px solid ${COLORS.marker}`,
                  transform: `scale(${1 + ring * 0.9})`,
                  opacity: frame >= BADGE_AT ? 1 - ring : 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: COLORS.stamp,
                  color: COLORS.sheet,
                  fontFamily: FONTS.display,
                  fontWeight: 800,
                  fontSize: 21,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${badge * (1 + (frame > BADGE_AT + 20 ? pulse * 0.12 : 0))})`,
                }}
              >
                {LINKS.length}
              </div>
            </>
          }
        >
          <div style={{padding: '34px 56px', display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
              <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 30, color: COLORS.ink}}>
                ornek-site
              </div>
              <div style={{flex: 1}} />
              <Bar width={90} />
              <Bar width={110} />
              <Bar width={80} />
            </div>
            <div style={{marginTop: 70, display: 'flex', flexDirection: 'column', gap: 22}}>
              <Bar width="72%" height={40} color="#CDD3DD" />
              <Bar width="54%" height={40} color="#CDD3DD" />
              <div style={{height: 10}} />
              <Bar width="80%" />
              <Bar width="66%" />
              <div
                style={{
                  marginTop: 26,
                  width: 230,
                  height: 64,
                  borderRadius: 12,
                  backgroundColor: COLORS.ink,
                  color: COLORS.sheet,
                  fontFamily: FONTS.display,
                  fontWeight: 700,
                  fontSize: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Kayıt ol
              </div>
            </div>
            <div style={{flex: 1}} />
            <div
              style={{
                borderTop: '2px solid #E1E5EC',
                paddingTop: 26,
                display: 'flex',
                gap: 44,
                fontFamily: FONTS.display,
                fontWeight: 500,
                fontSize: 23,
                color: COLORS.inkSoft,
              }}
            >
              {LINKS.map((link, i) => (
                <Highlight key={link} progress={progress(frame, LINK_START + i * LINK_GAP, 9)}>
                  {link}
                </Highlight>
              ))}
            </div>
          </div>
        </BrowserMockup>

        <div
          style={{
            position: 'absolute',
            right: 130,
            top: 236,
            backgroundColor: COLORS.paper,
            color: COLORS.ink,
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 26,
            padding: '16px 24px',
            borderRadius: 12,
            boxShadow: '0 18px 40px rgba(5, 10, 25, 0.35)',
            transform: `translateY(${(1 - toast) * -20}px) scale(${0.9 + toast * 0.1})`,
            transformOrigin: 'top right',
            opacity: toast,
          }}
        >
          {LINKS.length} sözleşme bulundu
        </div>
      </AbsoluteFill>
    </Page>
  );
};
