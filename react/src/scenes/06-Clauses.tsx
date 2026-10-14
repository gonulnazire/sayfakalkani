import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress} from '../components/anim';
import {Highlight} from '../components/Highlight';
import {KineticText} from '../components/KineticText';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

type Clause = {no: string; text: string; risk?: string};

const CLAUSES: Clause[] = [
  {no: '4.1', text: 'Hizmeti kullanarak bu koşulları kabul etmiş sayılırsınız.'},
  {
    no: '4.2',
    text: 'Kişisel verileriniz reklam ve analiz amacıyla iş ortaklarımızla paylaşılabilir.',
    risk: 'Veri paylaşımı',
  },
  {no: '4.3', text: 'Hesap bilgilerinizin doğruluğundan siz sorumlusunuz.'},
  {
    no: '5.1',
    text: 'Ücretli abonelikler iptal edilmedikçe her ay otomatik olarak yenilenir.',
    risk: 'Otomatik yenileme',
  },
  {no: '5.2', text: 'Fiyat değişiklikleri en az 30 gün önce duyurulur.'},
  {
    no: '6.1',
    text: 'Uyuşmazlıklar mahkemeye gidilmeksizin tahkim yoluyla çözülür.',
    risk: 'Tahkim',
  },
  {no: '6.2', text: 'Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir.'},
];

// Her riskli madde bir öncekinden 45 kare (3 vuruş) sonra işaretlenir.
const FIRST_MARK = 42;
const MARK_GAP = 45;

export const Clauses: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const sheetIn = spring({frame: frame - 6, fps, config: {damping: 16, stiffness: 80}});
  const scroll = interpolate(frame, [0, 260], [0, -90]);
  let riskIndex = 0;

  return (
    <Page tone="paper">
      <AbsoluteFill style={{padding: '96px 140px 0'}}>
        <h2
          style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 68,
            letterSpacing: '-0.025em',
            color: COLORS.ink,
            margin: 0,
          }}
        >
          <KineticText text="Riskli maddeleri metnin içinde işaretler." delay={14} stagger={0.8} />
        </h2>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          top: 230,
          left: 140,
          transform: `translateY(${(1 - sheetIn) * 700 + scroll}px) rotate(-1deg)`,
        }}
      >
        <div
          style={{
            width: 1120,
            backgroundColor: COLORS.sheet,
            borderRadius: 6,
            boxShadow: '0 30px 70px rgba(22, 33, 58, 0.18)',
            padding: '60px 76px 80px',
          }}
        >
          <div style={{fontFamily: FONTS.serif, fontWeight: 500, fontSize: 44, color: COLORS.ink, marginBottom: 30}}>
            Kullanım Koşulları
          </div>
          {CLAUSES.map((clause) => {
            const markAt = clause.risk ? FIRST_MARK + riskIndex++ * MARK_GAP : -1;
            const tag = spring({frame: frame - markAt - 8, fps, config: {damping: 9, stiffness: 200}});
            return (
              <div
                key={clause.no}
                style={{
                  position: 'relative',
                  display: 'flex',
                  gap: 26,
                  fontFamily: FONTS.serif,
                  fontSize: 31,
                  lineHeight: 1.5,
                  color: COLORS.ink,
                  marginBottom: 22,
                }}
              >
                <span style={{color: COLORS.graphite, flexShrink: 0, width: 52}}>{clause.no}</span>
                <span>
                  {clause.risk ? (
                    <Highlight progress={progress(frame, markAt, 14)}>{clause.text}</Highlight>
                  ) : (
                    clause.text
                  )}
                </span>
                {clause.risk ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 'calc(100% + 110px)',
                      top: 4,
                      whiteSpace: 'nowrap',
                      border: `4px solid ${COLORS.stamp}`,
                      borderRadius: 8,
                      padding: '6px 18px',
                      color: COLORS.stamp,
                      fontFamily: FONTS.display,
                      fontWeight: 800,
                      fontSize: 32,
                      transform: `rotate(-5deg) scale(${frame >= markAt + 8 ? 2.2 - tag * 1.2 : 0})`,
                      opacity: Math.min(1, tag * 2),
                    }}
                  >
                    {clause.risk}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Page>
  );
};
