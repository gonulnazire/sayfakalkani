// Bir HTML belgesinden sözleşme metnini çıkarır: menü, üst/alt bilgi, form ve reklam
// alanlarını atar, okunabilir paragrafları sırayla toplar.
// Klasik betik olarak yüklenir (ES modülü değil), çünkü hem içerik betiğinde hem de
// offscreen belgede kullanılır. Global `extractLegalText` fonksiyonunu tanımlar.
(() => {
  // Her zaman atılanlar: metin taşımayan öğeler.
  const HARD_NOISE = [
    'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'video', 'audio',
    'button', 'select', 'input', 'textarea', '[aria-hidden="true"]', '[hidden]',
  ].join(',');

  // Genelde gürültü olan bölgeler. Bazı sitelerde (ör. tüm sayfayı saran form) asıl metin
  // de bunların içinde olabilir; o yüzden bunları atınca metin çok azalırsa geri alınır.
  const SOFT_NOISE = [
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="dialog"]',
    '[id*="cookie" i]', '[class*="cookie" i]', '[class*="advert" i]',
  ].join(',');

  const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,blockquote,pre';
  const MAIN = 'main, article, [role="main"], #content, #main, .content, .main, .terms, .policy, .legal';

  const clean = (s) => s.replace(/\s+/g, ' ').trim();

  const textLength = (el) => clean(el.textContent || '').length;

  const collectBlocks = (root) => {
    const lines = [];
    for (const el of root.querySelectorAll(BLOCKS)) {
      // İç içe bloklarda (ör. li içinde p) yalnızca en içtekini al.
      if (el.querySelector(BLOCKS)) continue;
      const text = clean(el.textContent || '');
      if (text) lines.push({text, heading: /^H[1-6]$/.test(el.tagName)});
    }
    return lines;
  };

  // Bazı siteler paragrafları <p> yerine <div> ile yazar.
  const collectDivs = (root) => {
    const lines = [];
    for (const el of root.querySelectorAll('div, section')) {
      if (el.querySelector('div, section, p, li')) continue;
      const text = clean(el.textContent || '');
      if (text) lines.push({text, heading: false});
    }
    return lines;
  };

  globalThis.extractLegalText = (doc) => {
    if (!doc.body) return {title: doc.title || '', text: '', words: 0};
    let body = doc.body.cloneNode(true);
    body.querySelectorAll(HARD_NOISE).forEach((el) => el.remove());
    const withRegions = body.cloneNode(true);
    const before = textLength(body);
    body.querySelectorAll(SOFT_NOISE).forEach((el) => el.remove());
    if (textLength(body) < before * 0.3) body = withRegions;

    const total = textLength(body);
    let root = body;
    for (const candidate of body.querySelectorAll(MAIN)) {
      const len = textLength(candidate);
      if (len > total * 0.5 && len < textLength(root)) root = candidate;
    }

    let lines = collectBlocks(root);
    const covered = lines.reduce((sum, l) => sum + l.text.length, 0);
    if (covered < textLength(root) * 0.4) lines = collectDivs(root);

    const paragraphs = [];
    for (const line of lines) {
      if (paragraphs[paragraphs.length - 1] !== line.text) paragraphs.push(line.text);
    }
    const text = paragraphs.join('\n');
    const h1 = doc.querySelector('h1');
    return {
      title: clean((h1 && h1.textContent) || doc.title || ''),
      text,
      words: text.split(/\s+/).filter(Boolean).length,
    };
  };
})();
