import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress} from '../components/anim';
import {KineticText} from '../components/KineticText';
import {Page} from '../components/Page';
import {COLORS, FONTS} from '../theme';

const CLAUSES = [
  'Hizmeti kullanmaya devam etmeniz, güncellenmiş koşulları kabul ettiğiniz anlamına gelir.',
  'Şirket, hizmetin herhangi bir bölümünü önceden bildirimde bulunmaksızın değiştirebilir.',
  'Kullanıcı tarafından yüklenen içerikler için şirkete dünya çapında bir lisans verilmiş sayılır.',
  'Ücretli planlar, dönem sonundan önce iptal edilmedikçe otomatik olarak yenilenir.',
  'Kişisel veriler, hizmetin iyileştirilmesi amacıyla iş ortaklarıyla paylaşılabilir.',
  'Şirket, kendi takdirine bağlı olarak hesabı askıya alma veya kapatma hakkını saklı tutar.',
  'Taraflar arasındaki uyuşmazlıklar tahkim yoluyla çözülür.',
  'Bu koşulların herhangi bir hükmünün geçersiz sayılması, diğer hükümleri etkilemez.',
  'Çerezler ve benzeri teknolojiler, kullanım alışkanlıklarını analiz etmek için kullanılır.',
  'Şirket, üçüncü taraf hizmetlerden kaynaklanan zararlardan sorumlu tutulamaz.',
];

const Column: React.FC<{offset: number; speed: number; scroll: number}> = ({
  offset,
  speed,
  scroll,
}) => (
  <div style={{width: 340, transform: `translateY(${-scroll * speed}px)`}}>
    {Array.from({length: 36}, (_, i) => {
      const n = i + offset;
      return (
        <p
          key={i}
          style={{
            fontFamily: FONTS.serif,
            fontSize: 25,
            lineHeight: 1.45,
            color: COLORS.graphite,
            margin: '0 0 22px',
          }}
        >
          <span style={{color: COLORS.ink, opacity: 0.55}}>
            {Math.floor(n / 4) + 1}.{(n % 4) + 1}
          </span>{' '}
          {CLAUSES[(n * 7) % CLAUSES.length]}
        </p>
      );
    })}
  </div>
);

// Her ifade bir sonraki gelmeden hemen önce yukarı kayarak çıkar.
const Phrase: React.FC<{text: string; exitAt?: number; children?: React.ReactNode}> = ({
  text,
  exitAt,
  children,
}) => {
  const frame = useCurrentFrame();
  const exit = exitAt === undefined ? 0 : progress(frame, exitAt, 8, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        paddingLeft: 160,
        opacity: 1 - exit,
        transform: `translateY(${-exit * 60}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 44}}>
        {children}
        <h2
          style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 132,
            letterSpacing: '-0.03em',
            color: COLORS.ink,
            margin: 0,
          }}
        >
          <KineticText text={text} delay={0} stagger={1.4} />
        </h2>
      </div>
    </AbsoluteFill>
  );
};

const Checkbox: React.FC = () => {
  const frame = useCurrentFrame();
  const tick = progress(frame, 18, 10);
  const pop = interpolate(frame, [16, 22, 28], [1, 1.15, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <svg width={110} height={110} viewBox="0 0 110 110" style={{transform: `scale(${pop})`}}>
      <rect x={6} y={6} width={98} height={98} rx={14} fill={COLORS.ink} />
      <path
        d="M30 57 L48 75 L82 37"
        fill="none"
        stroke={COLORS.marker}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={80}
        strokeDashoffset={80 * (1 - tick)}
      />
    </svg>
  );
};

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // Metin duvarı giderek hızlanır.
  const scroll = frame * 2.4 + Math.pow(frame / durationInFrames, 2.4) * 1500;

  return (
    <Page tone="paper">
      <AbsoluteFill style={{left: 760, flexDirection: 'row', gap: 44, top: -40}}>
        <Column offset={0} speed={1} scroll={scroll} />
        <Column offset={11} speed={1.25} scroll={scroll} />
        <Column offset={23} speed={0.85} scroll={scroll} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, ${COLORS.paper} 0%, ${COLORS.paper} 40%, rgba(237,240,244,0.55) 62%, rgba(237,240,244,0) 80%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${COLORS.paper} 0%, rgba(237,240,244,0) 14%, rgba(237,240,244,0) 86%, ${COLORS.paper} 100%)`,
        }}
      />
      {/* İfadeler müzikteki vuruşlara denk gelir: videonun 6., 9. ve 12. saniyeleri. */}
      <Sequence from={10} durationInFrames={90} layout="none">
        <Phrase text="Kabul ediyorum." exitAt={82}>
          <Checkbox />
        </Phrase>
      </Sequence>
      <Sequence from={100} durationInFrames={90} layout="none">
        <Phrase text="Okudun mu?" exitAt={82} />
      </Sequence>
      <Sequence from={190} layout="none">
        <Phrase text="Kimse okumuyor." />
      </Sequence>
    </Page>
  );
};
