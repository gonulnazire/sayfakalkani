import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {typed} from '../components/anim';
import {KineticText} from '../components/KineticText';
import {LogoMark} from '../components/LogoMark';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

const ITEMS = [
  {text: 'Verilerin reklam ortaklarıyla paylaşılabilir.', level: COLORS.stamp},
  {text: 'Abonelik her ay otomatik yenilenir.', level: COLORS.stamp},
  {text: 'Site koşulları tek taraflı değiştirebilir.', level: COLORS.marker},
  {text: 'Anlaşmazlıklar mahkeme yerine tahkimde çözülür.', level: COLORS.stamp},
  {text: 'Hesabını istediğin zaman silebilirsin.', level: COLORS.safe},
];
const FIRST_ITEM = 45;
const ITEM_GAP = 30;

export const Summary: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const panelIn = spring({frame: frame - 10, fps, config: {damping: 16, stiffness: 100}});
  const drift = interpolate(frame, [0, 270], [0, -20]);

  return (
    <Page tone="paper">
      <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 140, width: 820}}>
        <h2
          style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 84,
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            color: COLORS.ink,
            margin: 0,
          }}
        >
          <KineticText text="Uzun metni beş maddede, sade Türkçeyle özetler." delay={16} stagger={0.8} />
        </h2>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          left: 1000,
          justifyContent: 'center',
          transform: `translateX(${(1 - panelIn) * 700}px) translateY(${drift}px) rotate(${(1 - panelIn) * 6}deg)`,
        }}
      >
        <div
          style={{
            width: 760,
            borderRadius: 22,
            backgroundColor: COLORS.ink,
            padding: '40px 46px 46px',
            boxShadow: '0 40px 90px rgba(22, 33, 58, 0.35)',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <LogoMark size={60} lines={COLORS.inkSoft} />
            <div>
              <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 32, color: COLORS.paper}}>
                Sözleşme Okuyucu
              </div>
              <div style={{fontFamily: FONTS.display, fontWeight: 500, fontSize: 22, color: COLORS.graphite}}>
                ornek-site.com, kullanım koşulları
              </div>
            </div>
          </div>
          <div style={{height: 2, backgroundColor: COLORS.inkSoft, margin: '30px 0 12px'}} />
          {ITEMS.map((item, i) => {
            const start = FIRST_ITEM + i * ITEM_GAP;
            const rowIn = spring({frame: frame - start, fps, config: {damping: 14, stiffness: 160}});
            return (
              <div
                key={item.text}
                style={{
                  display: 'flex',
                  gap: 22,
                  alignItems: 'flex-start',
                  padding: '16px 0',
                  opacity: frame >= start ? 1 : 0,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 40,
                    marginTop: 4,
                    borderRadius: 5,
                    backgroundColor: item.level,
                    transform: `scaleY(${rowIn})`,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONTS.serif,
                    fontSize: 33,
                    lineHeight: 1.3,
                    color: COLORS.paper,
                    minHeight: 43,
                  }}
                >
                  {typed(item.text, frame, start + 2, 1.8)}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Page>
  );
};
