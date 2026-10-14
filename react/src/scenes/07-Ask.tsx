import React from 'react';
import {AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress, typed} from '../components/anim';
import {useBeat} from '../components/beat';
import {Highlight} from '../components/Highlight';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

const WARN_AT = 38;
const QUESTION_AT = 113;
const ANSWER_AT = 158;
const QUOTE_AT = 203;

const QUESTION = 'Hesabımı silersem verilerim silinir mi?';
const ANSWER = 'Tamamen değil. Hesabın silinmesinden sonra veriler 90 gün daha saklanır.';

const Caption: React.FC<{children: React.ReactNode; at: number}> = ({children, at}) => {
  const frame = useCurrentFrame();
  const p = progress(frame, at, 14, Easing.out(Easing.cubic));
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: 800,
        fontSize: 56,
        letterSpacing: '-0.02em',
        color: COLORS.paper,
        marginBottom: 36,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Field: React.FC<{label: string; value: string}> = ({label, value}) => (
  <div style={{marginBottom: 22}}>
    <div style={{fontFamily: FONTS.display, fontWeight: 500, fontSize: 22, color: COLORS.graphite, marginBottom: 8}}>
      {label}
    </div>
    <div
      style={{
        height: 62,
        borderRadius: 10,
        border: '2px solid #D9DEE6',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontFamily: FONTS.display,
        fontSize: 24,
        color: COLORS.inkSoft,
      }}
    >
      {value}
    </div>
  </div>
);

export const Ask: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {pulse} = useBeat();

  const cardIn = spring({frame: frame - 4, fps, config: {damping: 16, stiffness: 100}});
  const warn = spring({frame: frame - WARN_AT, fps, config: {damping: 11, stiffness: 160}});
  const question = spring({frame: frame - QUESTION_AT, fps, config: {damping: 14}});
  const answer = spring({frame: frame - ANSWER_AT, fps, config: {damping: 14}});
  const quote = spring({frame: frame - QUOTE_AT, fps, config: {damping: 14}});
  const warned = frame >= WARN_AT;

  return (
    <Page tone="ink">
      <AbsoluteFill style={{left: 140, width: 780, justifyContent: 'center'}}>
        <Caption at={6}>Onaylamadan önce uyarır.</Caption>
        <div
          style={{
            position: 'relative',
            backgroundColor: COLORS.sheet,
            borderRadius: 18,
            padding: '40px 46px',
            transform: `translateY(${(1 - cardIn) * 400}px)`,
          }}
        >
          <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 44, color: COLORS.ink, marginBottom: 28}}>
            Hesap oluştur
          </div>
          <Field label="E-posta" value="ad@ornek.com" />
          <Field label="Şifre" value="••••••••••" />
          <div style={{display: 'flex', alignItems: 'center', gap: 18, margin: '10px 0 30px'}}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                flexShrink: 0,
                border: `3px solid ${warned ? COLORS.stamp : COLORS.graphite}`,
                transform: `scale(${warned ? 1 + pulse * 0.12 : 1})`,
              }}
            />
            <div style={{fontFamily: FONTS.display, fontWeight: 500, fontSize: 24, color: COLORS.inkSoft}}>
              Kullanım koşullarını okudum ve kabul ediyorum.
            </div>
          </div>
          <div
            style={{
              height: 66,
              borderRadius: 12,
              backgroundColor: COLORS.ink,
              color: COLORS.sheet,
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Kayıt ol
          </div>

          {/* Uyarı kartı onay kutusunun hemen üstünde açılır ve okla kutuyu gösterir. */}
          <div
            style={{
              position: 'absolute',
              left: 26,
              bottom: 196,
              width: 600,
              backgroundColor: COLORS.stamp,
              color: COLORS.sheet,
              borderRadius: 16,
              padding: '24px 28px',
              boxShadow: '0 24px 50px rgba(5, 10, 25, 0.45)',
              transform: `translateY(${(1 - warn) * 30}px) scale(${0.85 + warn * 0.15})`,
              transformOrigin: 'bottom left',
              opacity: Math.min(1, warn * 2),
            }}
          >
            <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 30, lineHeight: 1.2}}>
              Onaylamadan önce bak: 3 riskli madde var.
            </div>
            <div style={{fontFamily: FONTS.display, fontWeight: 500, fontSize: 23, marginTop: 10, opacity: 0.9}}>
              Veri paylaşımı, otomatik yenileme, tahkim
            </div>
            <div
              style={{
                position: 'absolute',
                left: 22,
                bottom: -14,
                width: 28,
                height: 28,
                backgroundColor: COLORS.stamp,
                transform: 'rotate(45deg)',
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{left: 1020, width: 760, justifyContent: 'center'}}>
        <Caption at={QUESTION_AT - 22}>Sorularını yanıtlar.</Caption>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
          <div
            style={{
              alignSelf: 'flex-end',
              maxWidth: 600,
              backgroundColor: COLORS.paper,
              color: COLORS.ink,
              borderRadius: '24px 24px 6px 24px',
              padding: '22px 28px',
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: 30,
              lineHeight: 1.3,
              minHeight: 39,
              opacity: question,
              transform: `translateY(${(1 - question) * 30}px)`,
            }}
          >
            {typed(QUESTION, frame, QUESTION_AT, 1.5) || ' '}
          </div>
          <div
            style={{
              maxWidth: 680,
              backgroundColor: COLORS.inkSoft,
              color: COLORS.paper,
              borderRadius: '24px 24px 24px 6px',
              padding: '22px 28px',
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: 30,
              lineHeight: 1.35,
              opacity: answer,
              transform: `translateY(${(1 - answer) * 30}px)`,
            }}
          >
            {typed(ANSWER, frame, ANSWER_AT, 1.9) || ' '}
            <div
              style={{
                marginTop: 18,
                backgroundColor: COLORS.sheet,
                color: COLORS.ink,
                borderRadius: 10,
                padding: '16px 20px',
                fontFamily: FONTS.serif,
                fontSize: 27,
                lineHeight: 1.45,
                opacity: quote,
                transform: `scale(${0.94 + quote * 0.06})`,
                transformOrigin: 'top left',
              }}
            >
              <Highlight progress={progress(frame, QUOTE_AT + 12, 18)}>
                “Hesabın silinmesinden sonra kişisel veriler 90 gün süreyle saklanır.”
              </Highlight>
              <div style={{fontFamily: FONTS.display, fontWeight: 500, fontSize: 21, color: COLORS.graphite, marginTop: 8}}>
                Madde 7.2
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Page>
  );
};
