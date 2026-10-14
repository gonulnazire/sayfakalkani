import {loadFont as loadArchivo} from '@remotion/google-fonts/Archivo';
import {loadFont as loadNewsreader} from '@remotion/google-fonts/Newsreader';

const archivo = loadArchivo('normal', {
  weights: ['500', '700', '800', '900'],
  subsets: ['latin', 'latin-ext'],
});

const newsreader = loadNewsreader('normal', {
  weights: ['400', '500'],
  subsets: ['latin', 'latin-ext'],
});

export const FONTS = {
  // Başlıklar ve arayüz
  display: archivo.fontFamily,
  // Sözleşme metinleri ve alıntılar
  serif: newsreader.fontFamily,
};

// Sözleşme dünyasından renkler: mürekkep, fotokopi kâğıdı, fosforlu kalem, kırmızı damga.
export const COLORS = {
  ink: '#16213A',
  inkSoft: '#2A3756',
  paper: '#EDF0F4',
  sheet: '#FBFCFD',
  marker: '#FFE45C',
  stamp: '#D93A3A',
  safe: '#2E9E6A',
  graphite: '#7C8699',
};
