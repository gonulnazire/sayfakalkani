// Bir sözleşme özetini yazdırılabilir biçimde gösterir ve yazdırma penceresini açar.
// Kullanıcı hedef olarak "PDF olarak kaydet"i seçerek özeti PDF'e dönüştürür.
import {DISCLAIMER, LEVELS, h, logo, ring, send, viewOf} from '../ui/common.js';

const sheet = document.getElementById('sheet');

const engineBlock = (doc, engine) => {
  const view = viewOf(doc, engine);
  return h(
    'section',
    {class: 'engine-block'},
    h(
      'div',
      {class: 'score-row'},
      ring(view.score, 72),
      h(
        'div',
        {},
        h('span', {class: `level level-${view.level}`}, LEVELS[view.level].label),
        h('p', {class: 'meta'}, engine === 'ai' ? `Claude özeti (${doc.ai.model})` : 'Kural tabanlı analiz'),
      ),
    ),
    h('h2', {class: 'section-title'}, 'Özet'),
    h('ul', {class: 'bullets'}, view.summary.map((b) => h('li', {'data-level': b.level}, b.text))),
    view.clauses.length
      ? [
          h('h2', {class: 'section-title'}, 'Riskli maddeler'),
          h(
            'ol',
            {class: 'clauses'},
            view.clauses.map((c) =>
              h(
                'li',
                {class: 'clause'},
                h('span', {class: 'tag'}, c.label),
                h('q', {class: 'quote'}, c.sentence),
                c.explanation ? h('p', {class: 'explanation'}, c.explanation) : null,
              ),
            ),
          ),
        ]
      : null,
  );
};

const render = async () => {
  const url = new URLSearchParams(location.search).get('url');
  const {doc} = await send({type: 'get-doc', url});
  if (!doc) {
    sheet.replaceChildren(h('p', {}, 'Bu sözleşme geçmişte bulunamadı.'));
    return;
  }
  document.title = `${doc.label} - ${doc.site}`;
  sheet.replaceChildren(
    h('div', {class: 'brand'}, logo(), 'Sözleşme Okuyucu'),
    h('h1', {}, doc.label),
    h('p', {class: 'url'}, `${doc.url} (okunma tarihi: ${new Date(doc.analyzedAt).toLocaleString('tr-TR')})`),
    doc.ai ? engineBlock(doc, 'ai') : null,
    engineBlock(doc, 'rules'),
    h('p', {class: 'disclaimer'}, `${DISCLAIMER} Sözleşme Okuyucu ile oluşturuldu.`),
  );
  await document.fonts.ready;
  window.print();
};

render();
