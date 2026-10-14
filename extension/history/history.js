import {LEVELS, h, logo, ring, send, timeAgo} from '../ui/common.js';
import {docToText, downloadText, fileNameFor} from '../ui/export.js';

const list = document.getElementById('list');
const count = document.getElementById('count');
const clearArea = document.getElementById('clear-area');

const docCard = (doc) => {
  const card = h(
    'article',
    {class: 'doc-card', 'data-url': doc.url},
    ring(doc.analysis.score, 56),
    h(
      'div',
      {},
      h('h3', {}, doc.label, doc.changes ? h('span', {class: 'changed'}, 'Değişti') : null),
      h('p', {class: 'url'}, doc.url),
      h('p', {class: 'meta'}, `${LEVELS[doc.analysis.level].label}. Son okuma: ${timeAgo(doc.analyzedAt)}.`),
      h('ul', {class: 'bullets'}, doc.analysis.summary.slice(0, 3).map((b) => h('li', {'data-level': b.level}, b.text))),
      h(
        'div',
        {class: 'doc-actions'},
        h('button', {class: 'link-btn', onclick: async () => {
          const {doc: full} = await send({type: 'get-doc', url: doc.url});
          downloadText(fileNameFor(full), docToText(full));
        }}, 'Özeti indir (.txt)'),
        h('button', {class: 'link-btn', onclick: () =>
          chrome.tabs.create({url: `${new URL('print.html', location.href).href}?url=${encodeURIComponent(doc.url)}`}),
        }, 'PDF olarak kaydet'),
        h('button', {class: 'link-btn', onclick: () => chrome.tabs.create({url: doc.url})}, 'Sözleşmeyi aç'),
        h('button', {class: 'link-btn', onclick: async () => {
          await send({type: 'delete-doc', url: doc.url});
          load();
        }}, 'Sil'),
      ),
    ),
  );
  return card;
};

// "Tümünü sil" iki adımlıdır: önce onay sorulur.
const renderClear = (hasDocs) => {
  if (!hasDocs) {
    clearArea.replaceChildren();
    return;
  }
  const ask = h('button', {class: 'btn btn-ghost', onclick: () => {
    clearArea.replaceChildren(
      h(
        'div',
        {class: 'confirm'},
        h('span', {}, 'Tüm geçmiş silinsin mi?'),
        h('button', {class: 'btn', onclick: async () => {
          await send({type: 'clear-history'});
          load();
        }}, 'Evet, sil'),
        h('button', {class: 'btn btn-ghost', onclick: () => renderClear(true)}, 'Vazgeç'),
      ),
    );
  }}, 'Tümünü sil');
  clearArea.replaceChildren(ask);
};

const load = async () => {
  const {docs} = await send({type: 'history'});
  count.textContent = docs.length
    ? `${docs.length} sözleşme, ${new Set(docs.map((d) => d.site)).size} site. Değişiklikler günde bir kez kontrol edilir.`
    : '';
  renderClear(docs.length > 0);
  if (docs.length === 0) {
    list.replaceChildren(
      h('p', {class: 'hint'}, 'Henüz bir sözleşme okumadın. Bir sitede araç çubuğundaki Sözleşme Okuyucu simgesine tıklayarak başlayabilirsin.'),
    );
    return;
  }
  const bySite = new Map();
  for (const doc of docs) {
    if (!bySite.has(doc.site)) bySite.set(doc.site, []);
    bySite.get(doc.site).push(doc);
  }
  list.replaceChildren(
    ...[...bySite].map(([site, siteDocs]) => h('section', {class: 'site-group'}, h('h2', {}, site), siteDocs.map(docCard))),
  );

  // Bildirimden gelindiyse ilgili sözleşmeyi göster.
  const target = decodeURIComponent(location.hash.slice(1));
  if (target) {
    const card = [...list.querySelectorAll('.doc-card')].find((el) => el.dataset.url === target);
    card?.classList.add('focus');
    card?.scrollIntoView({block: 'center'});
  }
};

document.getElementById('logo').append(logo());
load();
