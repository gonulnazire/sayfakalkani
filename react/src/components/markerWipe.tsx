import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';

type MarkerWipeProps = {
  color: string;
  edgeColor: string;
};

// Eğik uçlu bir fosforlu kalem ekranı soldan sağa boyar; arkasında yeni sahne kalır.
const SLANT = 14; // kalem ucunun eğimi (ekran genişliğinin yüzdesi)
const BAND = 7; // kalem şeridinin genişliği (yüzde)

const MarkerWipePresentation: React.FC<
  TransitionPresentationComponentProps<MarkerWipeProps>
> = ({children, presentationDirection, presentationProgress, passedProps}) => {
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  // edge: yeni sahnenin alt kenardaki sınırı. Üst kenar SLANT kadar ileride.
  const edge = interpolate(presentationProgress, [0, 1], [-(SLANT + BAND), 100]);
  const reveal = `polygon(0% 0%, ${edge + SLANT}% 0%, ${edge}% 100%, 0% 100%)`;
  // Şerit, yeni sahneyle biraz örtüşür; böylece aralarında ince bir dikiş görünmez.
  const overlap = 0.4;
  const band = `polygon(${edge + SLANT - overlap}% 0%, ${edge + SLANT + BAND}% 0%, ${edge + BAND}% 100%, ${edge - overlap}% 100%)`;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: reveal}}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: band,
          // Kalemin ucu, üst üste geçen fosforlu kalem gibi biraz daha koyu.
          background: `linear-gradient(90deg, ${passedProps.color} 0%, ${passedProps.color} 60%, ${passedProps.edgeColor} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const markerWipe = (
  props: MarkerWipeProps,
): TransitionPresentation<MarkerWipeProps> => ({
  component: MarkerWipePresentation,
  props,
});
