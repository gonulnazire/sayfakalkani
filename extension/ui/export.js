// Bir sözleşme analizini düz metin olarak dışa aktarır.
import {DISCLAIMER, LEVELS, viewOf} from './common.js';

const MARKS = {high: '[!!]', medium: '[!]', good: '[+]', info: '[i]'};

export const docToText = (doc) => {
  const lines = [];
  const date = new Date(doc.analyzedAt).toLocaleString('tr-TR');
  lines.push(`${doc.label} - ${doc.site}`, doc.url, `Okunma tarihi: ${date}`, '');

  const engines = doc.ai ? ['ai', 'rules'] : ['rules'];
  for (const engine of engines) {
    const view = viewOf(doc, engine);
    lines.push(
      engine === 'ai' ? `CLAUDE ÖZETİ (${doc.ai.model})` : 'KURAL TABANLI ANALİZ',
      `Risk puanı: ${view.score}/100 (${LEVELS[view.level].label})`,
      '',
      'Özet:',
    );
    for (const b of view.summary) lines.push(`  ${MARKS[b.level] ?? '-'} ${b.text}`);
    if (view.clauses.length > 0) {
      lines.push('', 'Riskli maddeler:');
      for (const c of view.clauses) {
        lines.push(`  - ${c.label}: "${c.sentence}"`);
        if (c.explanation) lines.push(`    ${c.explanation}`);
      }
    }
    lines.push('');
  }

  if (doc.changes) {
    lines.push(`Son değişiklik: ${new Date(doc.changes.detectedAt).toLocaleString('tr-TR')}`);
    for (const s of doc.changes.added) lines.push(`  + ${s}`);
    for (const s of doc.changes.removed) lines.push(`  - ${s}`);
    lines.push('');
  }

  lines.push(`${DISCLAIMER} Sözleşme Okuyucu ile oluşturuldu.`);
  return lines.join('\n');
};

export const downloadText = (filename, text) => {
  const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
  const a = Object.assign(document.createElement('a'), {href: url, download: filename});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const fileNameFor = (doc) =>
  `${doc.site}-${doc.label}`
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü]+/g, '-')
    .replace(/^-|-$/g, '')
    .concat('.txt');
