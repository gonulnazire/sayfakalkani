import React from 'react';
import {COLORS} from '../theme';

// Koyu zemin için fosforlu kalem: şerit geçtikçe altındaki yazının rengi de değişir.
// Alttaki katman açık renkli yazı, üstteki katman sarı zemin üstünde koyu yazıdır;
// üst katman soldan sağa açılır.
export const MarkerLine: React.FC<{
  progress: number;
  color: string;
  markedColor?: string;
  children: string;
}> = ({progress, color, markedColor = COLORS.ink, children}) => {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <span style={{position: 'relative', display: 'inline-block', color}}>
      <span>{children}</span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '-0.2em',
          right: '-0.2em',
          paddingLeft: '0.2em',
          whiteSpace: 'nowrap',
          color: markedColor,
          backgroundImage: `linear-gradient(180deg, transparent 10%, ${COLORS.marker} 10%, ${COLORS.marker} 92%, transparent 92%)`,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        }}
      >
        {children}
      </span>
    </span>
  );
};
