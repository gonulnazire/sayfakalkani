import React from 'react';
import {COLORS} from '../theme';

// Fosforlu kalem: metnin arkasına soldan sağa sarı bir şerit çeker.
// progress 0 iken görünmez, 1 iken satırın tamamı boyanmış olur.
export const Highlight: React.FC<{
  progress: number;
  color?: string;
  children: React.ReactNode;
}> = ({progress, color = COLORS.marker, children}) => {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(100deg, ${color} 0%, ${color} 96%, transparent 100%)`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${p * 100}% 78%`,
        backgroundPosition: '0 62%',
        padding: '0 0.18em',
        margin: '0 -0.18em',
        borderRadius: '0.12em',
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
      }}
    >
      {children}
    </span>
  );
};
