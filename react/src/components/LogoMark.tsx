import React from 'react';
import {COLORS} from '../theme';

// Eklenti ikonu: köşesi kıvrık bir sayfa, üzerinde fosforlu kalemle çizilmiş bir satır.
export const LogoMark: React.FC<{
  size: number;
  page?: string;
  lines?: string;
  stripe?: number;
}> = ({size, page = COLORS.sheet, lines = COLORS.graphite, stripe = 1}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M22 8 H62 L82 28 V92 H22 Z" fill={page} />
      <path d="M62 8 V28 H82 Z" fill={lines} opacity={0.45} />
      <rect x={32} y={40} width={40} height={5} rx={2.5} fill={lines} opacity={0.6} />
      <rect x={28} y={52} width={48 * stripe} height={13} rx={3} fill={COLORS.marker} />
      <rect x={32} y={56} width={40} height={5} rx={2.5} fill={lines} opacity={0.6} />
      <rect x={32} y={74} width={30} height={5} rx={2.5} fill={lines} opacity={0.6} />
    </svg>
  );
};
