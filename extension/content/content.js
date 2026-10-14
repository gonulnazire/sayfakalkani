// Sözleşme Okuyucu - içerik betiği. Her web sayfasında çalışır:
// sözleşme bağlantılarını bulur, kayıt/onay formlarında uyarı kartı gösterir ve
// istendiğinde bir maddeyi sayfanın içinde fosforlu kalemle vurgular.
(() => {
  if (globalThis.__sozlesmeOkuyucu) return;
  globalThis.__sozlesmeOkuyucu = true;

  const fold = (s) =>
    s
      .replace(/İ/g, 'i')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/\p{M}/gu, '');

  const safeDecode = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  // Bağlantı metni (ya da kısa metinli bağlantılarda adres) bu kalıplara uyarsa sözleşme sayılır.
  const KINDS = [
    {kind: 'kvkk', label: 'KVKK Aydınlatma Metni', text: /\bkvkk\b|kisisel verilerin (korunmasi|islenmesi)|aydinlatma metni/, url: /kvkk|aydinlatma/},
    {kind: 'privacy', label: 'Gizlilik Politikası', text: /gizlilik|privacy|veri (politikasi|koruma)|data (policy|protection)/, url: /privacy|gizlilik|data-policy/},
    {kind: 'cookies', label: 'Çerez Politikası', text: /cerez|cookie/, url: /cerez|cookie/},
    {kind: 'sales', label: 'Mesafeli Satış Sözleşmesi', text: /mesafeli satis|on bilgilendirme/, url: /mesafeli|on-bilgilendirme/},
    {
      kind: 'terms',
      label: 'Kullanım Koşulları',
      text: /kullanim (kosul|sart)|(hizmet|uyelik|kullanici) (kosul|sart|sozlesme)|\bterms( of (service|use))?\b|conditions of use|user agreement|\beula\b/,
      url: /terms|\btos\b|kosul|sartlar|sozlesme|agreement/,
    },
  ];
  const ORDER = ['terms', 'privacy', 'kvkk', 'sales', 'cookies'];
  const MAX_LINKS = 6;

  const classify = (text, path) => {
    const t = fold(text).trim();
    if (t.length > 0 && t.length <= 120) {
      const byText = KINDS.find((k) => k.text.test(t));
      if (byText) return byText;
    }
    return t.length <= 40 ? (KINDS.find((k) => k.url.test(path)) ?? null) : null;
  };

  const pageUrl = () => location.href.split('#')[0];

  const scanLinks = () => {
    const found = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      if (!/^https?:/.test(a.href)) continue;
      const url = a.href.split('#')[0];
      if (url === pageUrl() || found.has(url)) continue;
      const text = a.textContent || a.getAttribute('aria-label') || a.title || '';
      const match = classify(text, fold(safeDecode(new URL(url).pathname)));
      if (match) found.set(url, {url, kind: match.kind, label: match.label});
    }
    return [...found.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, MAX_LINKS);
  };

  // Açık sayfanın kendisi bir sözleşme mi?
  const detectLegalPage = () => {
    const title = fold(`${document.title} ${document.querySelector('h1')?.textContent ?? ''}`).slice(0, 300);
    const path = fold(safeDecode(location.pathname));
    const match = KINDS.find((k) => k.text.test(title)) ?? KINDS.find((k) => k.url.test(path));
    if (!match) return null;
    const words = (document.body?.innerText ?? '').split(/\s+/).length;
    return words >= 400 ? {kind: match.kind, label: match.label} : null;
  };

  let lastSent = '';
  const scan = async () => {
    const payload = {type: 'page-scan', links: scanLinks(), legalPage: detectLegalPage()};
    const serialized = JSON.stringify(payload);
    if (serialized !== lastSent) {
      lastSent = serialized;
      await chrome.runtime.sendMessage(payload).catch(() => {});
    }
    return payload;
  };

  // ---------------------------------------------------------------- onay uyarısı

  const CONSENT = /(okudum|kabul ediyorum|kabul ederim|onayliyorum|onay veriyorum|i agree|i accept|i have read|agree to|accept the)/;
  const LEGAL_WORDS = /(kosul|sart|sozlesme|politika|aydinlatma|kvkk|terms|policy|agreement|privacy)/;
  const SIGNUP = /^(kayit ol|uye ol|hesap olustur|kaydol|ucretsiz uye ol|sign up|create (an )?account|register|join( now)?)$/;

  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  const findConsentTarget = () => {
    for (const input of document.querySelectorAll('input[type="checkbox"]')) {
      const label = input.labels?.[0] ?? input.closest('label');
      const text = fold((label ?? input.parentElement)?.textContent ?? '').slice(0, 400);
      if (CONSENT.test(text) || (LEGAL_WORDS.test(text) && text.length < 300)) {
        const anchor = label ?? input.parentElement ?? input;
        if (visible(anchor)) return anchor;
      }
    }
    for (const button of document.querySelectorAll('button, input[type="submit"], [role="button"]')) {
      const text = fold((button.textContent || button.value || '').trim());
      if (SIGNUP.test(text) && visible(button)) return button;
    }
    return null;
  };

  const CARD_CSS = `
    :host { all: initial; }
    .card {
      box-sizing: border-box; width: 300px; padding: 16px 18px 14px; border-radius: 14px;
      background: #D93A3A; color: #FBFCFD; box-shadow: 0 18px 40px rgba(5, 10, 25, 0.35);
      font: 14px/1.4 system-ui, "Segoe UI", Roboto, sans-serif; position: relative;
    }
    .title { font-size: 16px; font-weight: 800; margin: 0 0 6px; }
    ul { margin: 0 0 12px; padding: 0 0 0 18px; }
    li { margin: 2px 0; }
    .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    button { font: inherit; font-weight: 700; border-radius: 8px; cursor: pointer; padding: 7px 12px; }
    .primary { background: #FBFCFD; color: #16213A; border: 0; }
    .ghost { background: transparent; color: #FBFCFD; border: 1px solid rgba(251, 252, 253, 0.6); }
    button:focus-visible { outline: 3px solid #FFE45C; outline-offset: 2px; }
    .note { margin-top: 10px; font-size: 12px; opacity: 0.85; }
    .arrow { position: absolute; left: 22px; width: 16px; height: 16px; background: #D93A3A; transform: rotate(45deg); }
    .arrow.down { bottom: -7px; }
    .arrow.up { top: -7px; }
  `;

  let card = null;
  let consentChecked = false;

  const removeCard = () => {
    card?.remove();
    card = null;
  };

  const showCard = (target, result) => {
    removeCard();
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;';
    const shadow = host.attachShadow({mode: 'closed'});
    const style = document.createElement('style');
    style.textContent = CARD_CSS;
    const box = document.createElement('div');
    box.className = 'card';
    box.setAttribute('role', 'alert');

    const title = document.createElement('p');
    title.className = 'title';
    title.textContent = `Onaylamadan önce: ${result.count} riskli madde`;
    const list = document.createElement('ul');
    for (const label of result.labels.slice(0, 5)) {
      const li = document.createElement('li');
      li.textContent = label;
      list.append(li);
    }
    const actions = document.createElement('div');
    actions.className = 'actions';
    const details = document.createElement('button');
    details.className = 'primary';
    details.textContent = 'Ayrıntıları gör';
    const close = document.createElement('button');
    close.className = 'ghost';
    close.textContent = 'Kapat';
    actions.append(details, close);
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Sözleşme Okuyucu. Bu bir hukuki tavsiye değildir.';
    const arrow = document.createElement('div');
    arrow.className = 'arrow';

    box.append(title, list, actions, note, arrow);
    shadow.append(style, box);
    document.documentElement.append(host);
    card = host;

    details.addEventListener('click', async () => {
      const response = await chrome.runtime.sendMessage({type: 'open-panel'}).catch(() => null);
      if (!response?.ok) {
        details.replaceWith(
          Object.assign(document.createElement('span'), {
            textContent: 'Ayrıntılar için araç çubuğundaki Sözleşme Okuyucu simgesine tıkla.',
          }),
        );
      }
    });
    close.addEventListener('click', removeCard);

    // Kart, hedefin üstünde (yer yoksa altında) durur ve sayfa kaydıkça onu izler.
    const position = () => {
      if (!card) return;
      const rect = target.getBoundingClientRect();
      if (!target.isConnected || (rect.width === 0 && rect.height === 0)) {
        host.style.display = 'none';
        return;
      }
      host.style.display = 'block';
      const height = box.offsetHeight;
      const above = rect.top - height - 14 > 0;
      const top = above ? rect.top - height - 14 : rect.bottom + 14;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - box.offsetWidth - 8);
      host.style.transform = `translate(${left + window.scrollX}px, ${top + window.scrollY}px)`;
      arrow.className = `arrow ${above ? 'down' : 'up'}`;
    };
    position();
    window.addEventListener('scroll', position, {passive: true});
    window.addEventListener('resize', position, {passive: true});
  };

  const checkConsent = async () => {
    if (consentChecked) return;
    const target = findConsentTarget();
    if (!target) return;
    consentChecked = true;
    const {settings} = await chrome.storage.local.get('settings');
    if (settings?.consentWarnings === false) return;
    const response = await chrome.runtime.sendMessage({type: 'consent-check'}).catch(() => null);
    if (response?.ok && response.result?.count > 0) showCard(target, response.result);
  };

  // ---------------------------------------------------------------- vurgulama

  const HIGHLIGHT = 'sozlesme-okuyucu';

  // Sayfadaki metni boşlukları sadeleştirerek birleştirir, her karakterin hangi metin
  // düğümünden geldiğini tutar; böylece bulunan cümle için bir Range kurulabilir.
  const highlightSentence = (sentence) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let text = '';
    const nodes = [];
    const offsets = [];
    let lastSpace = true;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest('script, style, noscript, template')) continue;
      const value = node.nodeValue;
      for (let i = 0; i < value.length; i++) {
        const space = /\s/.test(value[i]);
        if (space && lastSpace) continue;
        text += space ? ' ' : value[i];
        lastSpace = space;
        nodes.push(node);
        offsets.push(i);
      }
    }
    const target = sentence.replace(/\s+/g, ' ').trim();
    let index = text.indexOf(target);
    let length = target.length;
    if (index < 0) {
      // Cümlenin ortasında bağlantı ya da biçimlendirme varsa başını aramak yeterli.
      const head = target.slice(0, 60);
      index = text.indexOf(head);
      length = head.length;
    }
    if (index < 0) return false;

    const range = document.createRange();
    range.setStart(nodes[index], offsets[index]);
    range.setEnd(nodes[index + length - 1], offsets[index + length - 1] + 1);
    CSS.highlights.set(HIGHLIGHT, new Highlight(range));
    const rect = range.getBoundingClientRect();
    window.scrollTo({top: rect.top + window.scrollY - window.innerHeight / 3, behavior: 'smooth'});
    return true;
  };

  // ---------------------------------------------------------------- mesajlar

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message?.type) {
      case 'ping':
        sendResponse(true);
        return false;
      case 'rescan':
        lastSent = '';
        scan().then(sendResponse);
        return true;
      case 'extract':
        sendResponse(globalThis.extractLegalText(document));
        return false;
      case 'highlight':
        sendResponse(highlightSentence(message.sentence));
        return false;
      default:
        return false;
    }
  });

  // ---------------------------------------------------------------- başlangıç

  // Sayfa sonradan değişirse (tek sayfalı uygulamalar, geç yüklenen alt bilgi) yeniden tara.
  let timer = null;
  let firstChangeAt = 0;
  let lastUrl = location.href;
  const run = async () => {
    firstChangeAt = 0;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      consentChecked = false;
      removeCard();
      CSS.highlights.delete(HIGHLIGHT);
    }
    await scan();
    await checkConsent();
  };
  new MutationObserver(() => {
    clearTimeout(timer);
    firstChangeAt ||= Date.now();
    // Sürekli değişen sayfalarda da en geç 5 saniyede bir taranır.
    timer = setTimeout(run, Date.now() - firstChangeAt > 5000 ? 0 : 1200);
  }).observe(document.documentElement, {childList: true, subtree: true});

  run();
})();
