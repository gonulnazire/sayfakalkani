import {DISCLAIMER, activeTab, getSettings, h, logo, send, showInPage, timeAgo} from '../ui/common.js';

const main = document.getElementById('main');
const select = document.getElementById('doc-select');
const form = document.getElementById('ask-form');
const questionInput = document.getElementById('question');
const useAi = document.getElementById('use-ai');
const tabs = [...document.querySelectorAll('[role="tab"]')];

const SUGGESTIONS = [
  'Hesabımı silersem verilerim silinir mi?',
  'Verilerim kimlerle paylaşılıyor?',
  'Aboneliği nasıl iptal ederim?',
  'Koşullar değişirse bana haber verilir mi?',
];

let tab = null;
let settings = null;
let options = [];
let current = null; // seçili seçenek
let doc = null; // seçili sözleşmenin analizi
let section = 'ask';
const chats = new Map(); // sözleşme adresi -> soru-cevap geçmişi

const setMain = (...nodes) => main.replaceChildren(...nodes);
const message = (text) => h('p', {class: 'empty-note'}, text);

const setSection = (next) => {
  section = next;
  for (const button of tabs) button.setAttribute('aria-selected', String(button.dataset.section === section));
  render();
};

// ---------------------------------------------------------------- soru-cevap

const quoteCard = (sentence) =>
  h(
    'div',
    {class: 'quote-card'},
    h('q', {}, sentence),
    h('button', {class: 'link-btn', type: 'button', onclick: () => showInPage(doc.url, sentence, tab)}, 'Metinde göster'),
  );

const renderChat = () => {
  const chat = chats.get(doc.url) ?? [];
  const nodes = [];
  if (chat.length === 0) {
    nodes.push(
      message('Bu sözleşmeyle ilgili merak ettiğin bir şeyi sor. Cevap, sözleşmeden alıntılarla birlikte gelir.'),
      h(
        'div',
        {class: 'suggestions'},
        SUGGESTIONS.map((q) => h('button', {class: 'chip', type: 'button', onclick: () => ask(q)}, q)),
      ),
    );
  }
  const list = h('div', {class: 'chat'});
  for (const entry of chat) {
    list.append(h('div', {class: 'bubble question'}, entry.question));
    if (entry.pending) {
      list.append(h('div', {class: 'bubble answer'}, 'Sözleşmeye bakıyorum…'));
    } else if (entry.error) {
      list.append(h('div', {class: 'bubble error', role: 'alert'}, entry.error));
    } else {
      list.append(
        h(
          'div',
          {class: 'bubble answer'},
          entry.answer,
          entry.quotes.map((q) => quoteCard(q.sentence)),
          h('span', {class: 'engine'}, entry.engine === 'ai' ? `${entry.model} ile yanıtlandı.` : 'Anahtar kelime eşleştirmesiyle bulundu.'),
        ),
      );
    }
  }
  nodes.push(list, h('p', {class: 'disclaimer'}, DISCLAIMER));
  setMain(...nodes);
  main.scrollTop = main.scrollHeight;
};

const ask = async (question) => {
  const text = question.trim();
  if (!text || !doc) return;
  const chat = chats.get(doc.url) ?? [];
  chats.set(doc.url, chat);
  const entry = {question: text, pending: true};
  chat.push(entry);
  questionInput.value = '';
  renderChat();
  try {
    Object.assign(entry, await send({type: 'ask', url: doc.url, question: text, useAi: useAi.checked}));
  } catch (error) {
    entry.error = error.message;
  }
  entry.pending = false;
  if (section === 'ask') renderChat();
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  ask(questionInput.value);
});

// ---------------------------------------------------------------- maddeler ve değişiklikler

const renderClauses = () => {
  const groups = [{title: 'Kural tabanlı analiz', clauses: doc.analysis.clauses}];
  if (doc.ai) groups.unshift({title: `Claude (${doc.ai.model})`, clauses: doc.ai.clauses});
  const nodes = [];
  for (const group of groups) {
    nodes.push(h('h2', {class: 'section-title'}, group.title));
    if (group.clauses.length === 0) {
      nodes.push(message('Riskli madde bulunamadı.'));
      continue;
    }
    nodes.push(
      h(
        'ol',
        {class: 'clauses'},
        group.clauses.map((clause) =>
          h(
            'li',
            {class: 'clause'},
            h('span', {class: 'tag'}, clause.label),
            h('q', {class: 'quote'}, clause.sentence),
            clause.explanation ? h('p', {class: 'explanation'}, clause.explanation) : null,
            h('button', {class: 'link-btn', onclick: () => showInPage(doc.url, clause.sentence, tab)}, 'Metinde göster'),
          ),
        ),
      ),
    );
  }
  nodes.push(h('p', {class: 'disclaimer'}, DISCLAIMER));
  setMain(...nodes);
};

const renderChanges = () => {
  const changes = doc.changes;
  if (!changes) {
    setMain(
      message(
        settings.watchChanges
          ? 'Bu sözleşmede henüz bir değişiklik görülmedi. Okuduğun sözleşmeler günde bir kez kontrol edilir; metin değişirse bildirim alırsın.'
          : 'Değişiklik takibi ayarlardan kapalı.',
      ),
    );
    return;
  }
  if (!changes.seen) send({type: 'mark-change-seen', url: doc.url}).catch(() => {});
  setMain(
    h(
      'p',
      {class: 'meta'},
      `Değişiklik ${timeAgo(changes.detectedAt)} fark edildi. Önceki sürüm ${timeAgo(changes.previousAnalyzedAt)} okunmuştu; risk puanı ${changes.previousScore} iken şimdi ${doc.analysis.score}.`,
    ),
    h('h2', {class: 'section-title'}, `Eklenen maddeler (${changes.added.length})`),
    changes.added.length ? h('ul', {class: 'diff'}, changes.added.map((s) => h('li', {}, s))) : message('Yok.'),
    h('h2', {class: 'section-title'}, `Çıkarılan maddeler (${changes.removed.length})`),
    changes.removed.length ? h('ul', {class: 'diff removed'}, changes.removed.map((s) => h('li', {}, s))) : message('Yok.'),
  );
};

const render = () => {
  form.hidden = !doc || section !== 'ask';
  if (!doc) return;
  if (section === 'ask') renderChat();
  else if (section === 'clauses') renderClauses();
  else renderChanges();
};

// ---------------------------------------------------------------- yükleme

const selectOption = async (option) => {
  current = option;
  doc = null;
  form.hidden = true;
  select.value = option.url;
  setMain(message(`${option.label} okunuyor…`));
  try {
    const result = option.page
      ? await send({type: 'analyze-page', tabId: tab.id})
      : await send({type: 'analyze', url: option.url, kind: option.kind, label: option.label});
    if (current !== option) return;
    doc = result.doc;
    render();
  } catch (error) {
    if (current === option) setMain(h('div', {class: 'error-box', role: 'alert'}, h('p', {}, error.message)));
  }
};

const load = async () => {
  settings = await getSettings();
  document.getElementById('ai-toggle').hidden = !settings.aiEnabled;
  tab = await activeTab();
  let site = '';
  try {
    site = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    // Adresi olmayan sekme.
  }
  document.getElementById('site').textContent = site;

  const result = await send({type: 'tab-info', tabId: tab.id}).catch(() => ({scriptable: false}));
  const info = result.info ?? {links: [], legalPage: null};
  options = [];
  if (info.legalPage) {
    options.push({page: true, url: tab.url.split('#')[0], kind: info.legalPage.kind, label: `Bu sayfa: ${info.legalPage.label}`});
  }
  options.push(...info.links);
  // Bu siteden daha önce okunmuş sözleşmeler de seçilebilsin.
  const {docs} = await send({type: 'history'}).catch(() => ({docs: []}));
  for (const d of docs) {
    if (d.site === site && !options.some((o) => o.url === d.url)) options.push({url: d.url, kind: d.kind, label: d.label});
  }

  select.replaceChildren(...options.map((o) => h('option', {value: o.url}, o.label)));
  if (options.length === 0) {
    doc = null;
    form.hidden = true;
    setMain(
      message(
        result.scriptable
          ? 'Bu sayfada sözleşme bulunamadı. Bir sözleşme sayfası açıp araç çubuğundaki Sözleşme Okuyucu simgesine tıklayabilirsin.'
          : 'Chrome kendi sayfalarında eklentilerin çalışmasına izin vermiyor.',
      ),
    );
    return;
  }

  // Popup'tan gelen istek (hangi sözleşme, hangi bölüm) varsa onu uygula.
  const panelKey = `panel:${tab.id}`;
  const selectedKey = `selected:${tab.id}`;
  const stored = await chrome.storage.session.get([panelKey, selectedKey]);
  const request = stored[panelKey];
  if (request) await chrome.storage.session.remove(panelKey);
  if (request?.section) {
    section = request.section;
    for (const button of tabs) button.setAttribute('aria-selected', String(button.dataset.section === section));
  }
  const wanted = request?.url ?? stored[selectedKey];
  await selectOption(options.find((o) => o.url === wanted) ?? options[0]);
};

select.addEventListener('change', () => {
  const option = options.find((o) => o.url === select.value);
  if (option) selectOption(option);
});
for (const button of tabs) button.addEventListener('click', () => setSection(button.dataset.section));

document.getElementById('logo').append(logo());
for (const button of tabs) button.setAttribute('aria-selected', String(button.dataset.section === section));

chrome.tabs.onActivated.addListener(() => load());
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (tabId === tab?.id && change.status === 'complete') load();
});
// Panel açıkken popup'tan "Farkları gör" ya da "Soru sor" gelirse.
chrome.storage.session.onChanged.addListener((changes) => {
  if (tab && changes[`panel:${tab.id}`]?.newValue) load();
});

load();
