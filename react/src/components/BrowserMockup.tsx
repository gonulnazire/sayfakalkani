import React from 'react';
import {COLORS, FONTS} from '../theme';
import {LogoMark} from './LogoMark';

// Sade bir tarayıcı penceresi. Sağ üstte Sözleşme Okuyucu eklentisinin ikonu durur.
export const BrowserMockup: React.FC<{
  url: string;
  width: number;
  height: number;
  extensionSlot?: React.ReactNode;
  children: React.ReactNode;
}> = ({url, width, height, extensionSlot, children}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        backgroundColor: COLORS.sheet,
        boxShadow: '0 40px 90px rgba(5, 10, 25, 0.45)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 76,
          backgroundColor: '#DDE2EA',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 22,
        }}
      >
        <div style={{display: 'flex', gap: 10}}>
          {['#E4776B', '#E8B85A', '#69B57A'].map((c) => (
            <div key={c} style={{width: 16, height: 16, borderRadius: 8, backgroundColor: c}} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            height: 44,
            borderRadius: 22,
            backgroundColor: COLORS.sheet,
            display: 'flex',
            alignItems: 'center',
            padding: '0 22px',
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 22,
            color: COLORS.inkSoft,
          }}
        >
          {url}
        </div>
        <div style={{position: 'relative', width: 52, height: 52}}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: COLORS.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogoMark size={40} lines={COLORS.inkSoft} />
          </div>
          {extensionSlot}
        </div>
      </div>
      <div style={{flex: 1, position: 'relative'}}>{children}</div>
    </div>
  );
};
