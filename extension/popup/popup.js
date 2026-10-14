import {
  DISCLAIMER,
  LEVELS,
  activeTab,
  formatNumber,
  getSettings,
  h,
  icon,
  logo,
  ring,
  send,
  showInPage,
  timeAgo,
  viewOf,
} from '../ui/common.js';

const main = document.getElementById('main');
const chips = document.getElementById('docs');
const askButton = document.getElementById('ask');

let tab;
let settings;
let options = [];
let current = null;
let engine = 'rules';

const setMain = (...nodes) => main.replaceChildren(...nodes);
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const reading = (label) =>
  h(
    'div',
    {class: 'reading'},
    h('p', {}, `${label} okunuyor…`),
    h('div', {class: 'lines'}, h('div', {class: 'line'}), h('div', {class: 'line'}), h('div', {class: 'line'})),
  );

const errorBox = (message, retry) =>
  h(
    'div',
    {class: 'error-box', role: 'alert'},
    h('p', {}, message),
    retry ? h('button', {class: 'btn btn-ghost', onclick: retry}, 'Tekrar dene') : null,
  );

const renderUnsupported = () =>
  setMain(
    h(
      'div',
      {class: 'empty'},
      h('h1', {}, 'Bu sayfada çalışamıyorum'),
      h(
        'p',
        {},
        'Chrome kendi sayfalarında (ayarlar, yeni sekme, Web Mağazası) eklentilerin çalışmasına izin vermiyor. Bir web sitesine geçip tekrar dene.',
      ),
    ),
  );

const renderEmpty = () =>
  setMain(
    h(
      'div',
      {class: 'empty'},
      h('h1', {}, 'Bu sayfada sözleşme bağlantısı bulunamadı'),
      h('p', {}, 'Açık olan sayfa bir sözleşmeyse onu doğrudan inceleyebilirim.'),
      h(
        'button',
        {class: 'btn btn-marker', onclick: () => select({page: true, url: tab.url.split('#')[0], label: 'Bu sayfa'})},
        'Bu sayfayı sözleşme olarak incele',
      ),
    ),
  );

const renderChips = () => {
  chips.replaceChildren(
    ...options.map((option) =>
      h('button', {class: 'chip', 'aria-pressed': String(option === current), onclick: () => select(option)}, option.label),
    ),
  );
  chips.hidden = options.length === 0;
};

const openPanel = async (section) => {
  await chrome.storage.session.set({[`panel:${tab.id}`]: {url: current?.url ?? null, section}});
  try {
    await chrome.sidePanel.open({tabId: tab.id});
    window.close();
  } catch (error) {
    main.prepend(errorBox(`Yan panel açılamadı: ${error.message}`));
  }
};

const runAi = async (doc, button) => {
  button.disabled = true;
  button.textContent = 'Claude okuyor…';
  try {
    const {doc: updated} = await send({type: 'ai-summary', url: doc.url});
    engine = 'ai';
    renderDoc(updated);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Claude ile ayrıntılı özetle';
    button.after(errorBox(error.message));
  }
};

const changeBanner = (doc) =>
  h(
    'div',
    {class: 'banner', role: 'status'},
    h('strong', {}, 'Koşullar değişti'),
    h(
      'span',
      {},
      `Değişiklik ${timeAgo(doc.changes.detectedAt)} fark edildi: ${doc.changes.added.length} madde eklendi, ${doc.changes.removed.length} madde çıkarıldı.`,
    ),
    h(
      'div',
      {class: 'actions'},
      h('button', {class: 'link-btn', onclick: () => openPanel('changes')}, 'Farkları gör'),
      h(
        'button',
        {
          class: 'link-btn',
          onclick: async (event) => {
            const banner = event.currentTarget.closest('.banner');
            await send({type: 'mark-change-seen', url: doc.url});
            banner.remove();
          },
        },
        'Tamam',
      ),
    ),
  );

const renderDoc = (doc) => {
  const view = viewOf(doc, engine);
  const nodes = [
    h(
      'div',
      {class: 'score-row'},
      ring(view.score),
      h(
        'div',
        {},
        h('span', {class: `level level-${view.level}`}, LEVELS[view.level].label),
        h('h1', {class: 'doc-title'}, doc.label),
        h(
          'p',
          {class: 'meta'},
          `${formatNumber(doc.words)} kelime, okuması yaklaşık ${doc.analysis.stats.readingMinutes} dakika. Son okuma: ${timeAgo(doc.analyzedAt)}.`,
        ),
      ),
      h(
        'button',
        {class: 'icon-btn refresh', title: 'Yeniden oku', 'aria-label': 'Yeniden oku', onclick: () => select(current, true)},
        icon('refresh'),
      ),
    ),
  ];

  if (doc.changes && !doc.changes.seen) nodes.push(changeBanner(doc));

  if (doc.ai) {
    nodes.push(
      h(
        'div',
        {class: 'engine-switch', role: 'group', 'aria-label': 'Analiz türü'},
        ['ai', 'rules'].map((id) =>
          h(
            'button',
            {
              'aria-pressed': String(engine === id),
              onclick: () => {
                engine = id;
                renderDoc(doc);
              },
            },
            id === 'ai' ? 'Claude özeti' : 'Kural tabanlı',
          ),
        ),
      ),
    );
  }

  nodes.push(
    h('h2', {class: 'section-title'}, 'Özet'),
    h('ul', {class: 'bullets'}, view.summary.map((b) => h('li', {'data-level': b.level}, b.text))),
  );

  if (view.clauses.length > 0) {
    nodes.push(
      h('h2', {class: 'section-title'}, 'Riskli maddeler'),
      h(
        'ol',
        {class: 'clauses'},
        view.clauses.map((clause) =>
          h(
            'li',
            {class: 'clause'},
            h('span', {class: 'tag'}, clause.label),
            h('q', {class: 'quote'}, truncate(clause.sentence, 240)),
            clause.explanation ? h('p', {class: 'explanation'}, clause.explanation) : null,
            h(
              'button',
              {
                class: 'link-btn',
                onclick: async () => {
                  await showInPage(doc.url, clause.sentence, tab);
                  window.close();
                },
              },
              'Metinde göster',
            ),
          ),
        ),
      ),
    );
  }

  if (settings.aiEnabled && !doc.ai) {
    const button = h('button', {class: 'btn btn-marker', onclick: () => runAi(doc, button)}, 'Claude ile ayrıntılı özetle');
    nodes.push(h('div', {class: 'ai-row'}, button, h('p', {class: 'hint'}, "Bu düğmeye basınca sözleşme metni Anthropic'e gönderilir.")));
  }

  const tip = settings.aiEnabled ? '' : ' Yapay zekayla ayrıntılı özet için ayarlardan Claude\'u açabilirsin.';
  nodes.push(h('p', {class: 'disclaimer'}, `${DISCLAIMER} ${view.engineNote}${tip}`));
  setMain(...nodes);
};

const select = async (option, force = false) => {
  current = option;
  engine = 'rules';
  renderChips();
  await chrome.storage.session.set({[`selected:${tab.id}`]: option.url});
  setMain(reading(option.label));
  try {
    const {doc} = option.page
      ? await send({type: 'analyze-page', tabId: tab.id})
      : await send({type: 'analyze', url: option.url, kind: option.kind, label: option.label, force});
    if (current !== option) return;
    if (doc.ai) engine = 'ai';
    renderDoc(doc);
  } catch (error) {
    if (current === option) setMain(errorBox(error.message, () => select(option, true)));
  }
};

const init = async () => {
  document.getElementById('logo').append(logo());
  const settingsButton = document.getElementById('settings');
  settingsButton.append(icon('settings'));
  settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('history').addEventListener('click', () =>
    chrome.tabs.create({url: new URL('../history/history.html', location.href).href}),
  );
  askButton.addEventListener('click', () => openPanel('ask'));

  settings = await getSettings();
  tab = await activeTab().catch(() => null);
  if (!tab) {
    askButton.disabled = true;
    renderUnsupported();
    return;
  }
  try {
    document.getElementById('site').textContent = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    // Adresi olmayan sekme.
  }

  let result;
  try {
    result = await send({type: 'tab-info', tabId: tab.id});
  } catch {
    result = {scriptable: false};
  }
  if (!result.scriptable) {
    askButton.disabled = true;
    renderUnsupported();
    return;
  }

  const info = result.info ?? {links: [], legalPage: null};
  options = [];
  if (info.legalPage) {
    options.push({page: true, url: tab.url.split('#')[0], kind: info.legalPage.kind, label: `Bu sayfa: ${info.legalPage.label}`});
  }
  // Aynı türden birden fazla bağlantı varsa ayırt edilebilsinler.
  const seen = {};
  for (const link of info.links) {
    seen[link.label] = (seen[link.label] ?? 0) + 1;
    options.push({...link, label: seen[link.label] > 1 ? `${link.label} ${seen[link.label]}` : link.label});
  }
  if (options.length === 0) {
    renderEmpty();
    return;
  }
  renderChips();
  const key = `selected:${tab.id}`;
  const last = (await chrome.storage.session.get(key))[key];
  select(options.find((o) => o.url === last) ?? options[0]);
};

init();
