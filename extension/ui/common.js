// Arayüz sayfalarının (popup, yan panel, geçmiş, ayarlar) ortak yardımcıları.
// Web sayfalarından gelen metinler her zaman textContent ile yazılır, asla HTML olarak değil.

export {getSettings} from '../lib/settings.js';

// Küçük bir DOM oluşturucu: h('p', {class: 'x', onclick: fn}, 'metin', başkaÖğe)
export const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// Service worker'a mesaj gönderir; hata varsa Error fırlatır.
export const send = async (message) => {
  const response = await chrome.runtime.sendMessage(message);
  if (!response) throw new Error('Eklentiden yanıt alınamadı. Sayfayı yenileyip tekrar dene.');
  if (!response.ok) throw new Error(response.error);
  return response.result;
};

export const LEVELS = {
  low: {label: 'Düşük risk', color: 'var(--safe)'},
  medium: {label: 'Orta risk', color: 'var(--marker-edge)'},
  high: {label: 'Yüksek risk', color: 'var(--stamp)'},
};
export const levelOf = (score) => (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');

export const ring = (score, size = 84) => {
  const stroke = Math.round(size / 9);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const level = levelOf(score);
  const el = svg('svg', {width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true'});
  el.append(
    svg('circle', {cx: size / 2, cy: size / 2, r, fill: 'none', stroke: 'var(--line)', 'stroke-width': stroke}),
    svg('circle', {
      cx: size / 2,
      cy: size / 2,
      r,
      fill: 'none',
      stroke: LEVELS[level].color,
      'stroke-width': stroke,
      'stroke-linecap': 'round',
      'stroke-dasharray': c,
      'stroke-dashoffset': c * (1 - score / 100),
      opacity: score > 0 ? 1 : 0,
    }),
  );
  return h(
    'div',
    {class: 'ring', role: 'img', 'aria-label': `Risk puanı ${score}/100, ${LEVELS[level].label}`},
    el,
    h('span', {class: 'value', style: `font-size:${Math.round(size * 0.36)}px`}, String(score)),
  );
};

export const logo = () => {
  const el = svg('svg', {class: 'logo', viewBox: '0 0 100 100', 'aria-hidden': 'true'});
  el.append(
    svg('path', {d: 'M22 8 H62 L82 28 V92 H22 Z', fill: '#FBFCFD'}),
    svg('path', {d: 'M62 8 V28 H82 Z', fill: '#2A3756', opacity: '0.45'}),
    svg('rect', {x: 32, y: 40, width: 40, height: 5, rx: 2.5, fill: '#2A3756', opacity: '0.6'}),
    svg('rect', {x: 28, y: 52, width: 48, height: 13, rx: 3, fill: '#FFE45C'}),
    svg('rect', {x: 32, y: 56, width: 40, height: 5, rx: 2.5, fill: '#2A3756', opacity: '0.6'}),
    svg('rect', {x: 32, y: 74, width: 30, height: 5, rx: 2.5, fill: '#2A3756', opacity: '0.6'}),
  );
  return el;
};

const ICONS = {
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.94-2.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 15.47 2h-4a.5.5 0 0 0-.49.42l-.38 2.65c-.62.25-1.2.59-1.73 1l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L5.06 11c-.04.33-.06.66-.06 1s.02.67.06 1l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.13.22.39.3.61.22l2.49-1c.53.41 1.11.75 1.73 1l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.62-.25 1.2-.59 1.73-1l2.49 1c.22.08.48 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64L20.94 13Z',
  refresh:
    'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z',
};
export const icon = (name) => {
  const el = svg('svg', {viewBox: '0 0 24 24', 'aria-hidden': 'true'});
  el.append(svg('path', {d: ICONS[name], fill: 'currentColor'}));
  return el;
};

const rtf = new Intl.RelativeTimeFormat('tr', {numeric: 'auto'});
export const timeAgo = (ts) => {
  const minutes = Math.round((ts - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return new Date(ts).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'});
};

export const formatNumber = (n) => n.toLocaleString('tr-TR');

// Popup ve yan panel normalde etkin sekmeyi okur. Test ve hata ayıklama için
// sayfa ?tab=<id> parametresiyle belirli bir sekmeye bağlanabilir.
export const activeTab = async () => {
  const param = new URLSearchParams(location.search).get('tab');
  if (param) return chrome.tabs.get(Number(param));
  const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
  return tab;
};

const fragmentPart = (s) => encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C');

// Chrome'un metin parçası bağlantısı (#:~:text=) sayfayı açınca ilgili cümleyi bulup vurgular.
export const textFragmentUrl = (url, sentence) => {
  const words = sentence.replace(/\s+/g, ' ').trim().split(' ');
  const fragment =
    words.length <= 8
      ? fragmentPart(words.join(' '))
      : `${fragmentPart(words.slice(0, 4).join(' '))},${fragmentPart(words.slice(-4).join(' '))}`;
  return `${url.split('#')[0]}#:~:text=${fragment}`;
};

const stripHash = (url) => (url ?? '').split('#')[0];

// Özetteki bir maddeyi orijinal metinde gösterir. Sözleşme açık sekmedeyse orada vurgular,
// değilse sözleşmeyi yeni sekmede açar ve Chrome'un metin parçası özelliğiyle o cümleye gider.
export const showInPage = async (docUrl, sentence, tab) => {
  if (tab && stripHash(tab.url) === stripHash(docUrl)) {
    try {
      const found = await chrome.tabs.sendMessage(tab.id, {type: 'highlight', sentence});
      if (found) {
        await chrome.tabs.update(tab.id, {active: true});
        return 'highlighted';
      }
    } catch {
      // İçerik betiği yoksa aşağıdaki yönteme düş.
    }
    await chrome.tabs.update(tab.id, {url: textFragmentUrl(docUrl, sentence), active: true});
    return 'navigated';
  }
  await chrome.tabs.create({url: textFragmentUrl(docUrl, sentence)});
  return 'opened';
};

// Bir analiz sonucunu (kurallar ya da yapay zeka) ekranda gösterilecek tek biçime getirir.
export const viewOf = (doc, engine) => {
  if (engine === 'ai' && doc.ai) {
    return {
      score: doc.ai.score,
      level: levelOf(doc.ai.score),
      summary: doc.ai.summary,
      clauses: doc.ai.clauses,
      engineNote: `Bu özet ${doc.ai.model} ile oluşturuldu; sözleşme metni Anthropic'e gönderildi.`,
    };
  }
  return {
    score: doc.analysis.score,
    level: doc.analysis.level,
    summary: doc.analysis.summary,
    clauses: doc.analysis.clauses,
    engineNote: 'Analiz bu bilgisayarda, anahtar kelime kurallarıyla yapıldı; metin hiçbir yere gönderilmedi.',
  };
};

export const DISCLAIMER = 'Bu bir hukuki tavsiye değildir.';
