// Kural tabanlı sözleşme analizi. Tarayıcı API'si kullanmaz; hem service worker'da
// hem de Node'daki testlerde çalışır. Metin hiçbir yere gönderilmez.
//
// Eşleştirme "katlanmış" metin üzerinde yapılır: küçük harf, Türkçe karakterler ASCII'ye
// indirgenmiş (ş→s, ı/İ→i ...). Böylece "KİŞİSEL", "kişisel" ve "kisisel" aynı kalıba uyar.
// Bu yüzden aşağıdaki kalıplar da ASCII yazılmıştır.

export const fold = (s) =>
  s
    .replace(/İ/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

// Her kategori: etiket, ağırlık (risk puanına katkısı), özet cümlesi ve kalıplar.
// `all` verilmişse, cümlenin `any` kalıplarından birine VE `all` kalıplarının hepsine uyması gerekir.
export const CATEGORIES = {
  data_sharing: {
    label: 'Veri paylaşımı',
    weight: 22,
    summary: 'Verilerin üçüncü taraflarla paylaşılabilir.',
    any: [
      /(veri|bilgi)[a-z]*\b[^.]{0,120}\b(ucuncu (taraf|kisi)|is ortak|reklam|tedarikci|grup sirket|hizmet saglayici|yurt ?disina)[^.]{0,120}(paylas|aktar|devred|ilet|satil)/,
      /(ucuncu (taraf|kisi)|is ortak|reklam|tedarikci|grup sirket|yurt ?disina)[^.]{0,120}(veri|bilgi)[a-z]*[^.]{0,120}(paylas|aktar|devred|ilet)/,
      /\b(share|disclose|sell|transfer|rent|provide)[a-z]*\b[^.]{0,120}\b(personal (data|information)|your (data|information)|information (we collect|about you))[^.]{0,160}\b(third[- ]part|partner|advertis|affiliate|vendor)/,
      /\b(personal (data|information)|your (data|information)|information (we collect|about you))[^.]{0,160}\b(shared|disclosed|sold|transferred)\b[^.]{0,120}\b(third[- ]part|partner|advertis|affiliate)/,
      /\bwe (may )?(share|disclose|sell)\b[^.]{0,80}\b(with|to) (third[- ]part|our partners|advertis|affiliate)/,
    ],
  },
  auto_renewal: {
    label: 'Otomatik yenileme',
    weight: 14,
    summary: 'Ücretli abonelikler, iptal etmezsen otomatik olarak yenilenir.',
    any: [
      /otomatik(\s+olarak)?\s+(yenilen|uzat|tahsil|ucretlendir|cekil)/,
      /(abonelik|uyelik)[^.]{0,80}(kendiliginden|otomatik)[^.]{0,40}(yenilen|uzar)/,
      /iptal (edilmedikce|edilmedigi surece|etmediginiz surece|etmedikce)[^.]{0,80}(yenilen|devam|uzat|tahsil)/,
      /\bauto(matic(ally)?)?[- ]?renew/,
      /\brenews? automatically\b/,
      /\brecurring (charge|billing|payment|fee)/,
    ],
  },
  unilateral_change: {
    label: 'Tek taraflı değişiklik',
    weight: 12,
    summary: 'Site koşulları tek taraflı ve haber vermeden değiştirebilir.',
    any: [
      /(diledigi|herhangi bir) zaman(da)?[^.]{0,100}(degistir|guncelle|degisiklik)/,
      /(degistir|guncelle)[^.]{0,100}(diledigi|herhangi bir) zaman/,
      /bildirim(de bulunmaksizin| yapilmaksizin| olmaksizin| gerekmeksizin)/,
      /tek tarafli olarak[^.]{0,80}(degistir|guncelle|degisiklik)/,
      /(degistirme|guncelleme) hakkini sakli tutar/,
      /\b(modify|change|amend|update|revise)[a-z]*\b[^.]{0,120}\b(at any time|without (prior )?notice|(our|its) sole discretion)/,
      /\b(at any time|without (prior )?notice|(our|its) sole discretion)[^.]{0,120}\b(modify|change|amend|update|revise)/,
      /\breserves? the right to (modify|change|amend|update|revise)/,
    ],
  },
  arbitration: {
    label: 'Tahkim',
    weight: 18,
    summary: 'Anlaşmazlıklarda mahkeme yerine tahkim öngörülüyor; dava hakkın kısıtlanabilir.',
    any: [
      /\btahkim/,
      /dava (acma )?hakkin(dan|i)[^.]{0,40}(feragat|vazgec)/,
      /toplu dava/,
      /\barbitrat/,
      /\bclass[- ]action/,
      /\bwaive[a-z]*\b[^.]{0,80}\b(jury|class)/,
      /\bjury trial/,
    ],
  },
  content_license: {
    label: 'Geniş içerik lisansı',
    weight: 12,
    summary: 'Paylaştığın içerikler üzerinde siteye geniş bir kullanım hakkı veriyorsun.',
    any: [
      /(yukledig|paylastig|gonderdig|olusturdug)[a-z]*\s+(tum\s+)?(icerik|materyal|fotograf|yorum|gonderi)[^.]{0,200}(lisans|kullanma hakki|kullanim hakki|hak tani)/,
      /icerik[^.]{0,200}(dunya capinda|suresiz|geri alinamaz|bedelsiz|telif ucretsiz)[^.]{0,80}(lisans|hak)/,
      /\b(worldwide|perpetual|irrevocable|royalty[- ]free|sublicensable)\b[^.]{0,160}\blicen[cs]e/,
      /\blicen[cs]e\b[^.]{0,160}\b(worldwide|perpetual|irrevocable|royalty[- ]free|sublicensable)/,
    ],
    // Kullanıcıya verilen yazılım lisanslarını ("size sınırlı bir lisans veriyoruz") elemek için
    // cümlenin kullanıcının içeriğinden ya da kullanıcının verdiği haktan söz etmesi gerekir.
    all: [/(icerik|materyal|you (hereby )?grant|(your|user) content|content (you|that you))/],
  },
  account_termination: {
    label: 'Hesap kapatma',
    weight: 10,
    summary: 'Site hesabını kendi takdirine göre askıya alabilir veya kapatabilir.',
    any: [
      /hesab[a-z]*[^.]{0,100}(askiya al|kapat|sonlandir|feshed|dondur|engelle)/,
      /\b(suspend|terminate|disable|deactivate)[a-z]*\b[^.]{0,100}\b(account|access)/,
      /\b(account|access)\b[^.]{0,100}\b(suspend|terminat|disabl|deactivat)/,
    ],
    all: [
      /(takdir|bildirim|sebep gostermeksizin|gerekce gostermeksizin|herhangi bir zaman|diledigi zaman|tek tarafli|any time|sole discretion|without (prior )?notice|for any reason|without cause)/,
    ],
  },
  liability: {
    label: 'Sorumluluk sınırlaması',
    weight: 8,
    summary: 'Site, uğrayabileceğin zararlar için sorumluluğunu sınırlıyor.',
    any: [
      /sorumlu (tutulamaz|degildir|olmayacak|tutulmayacak)/,
      /sorumlulu(k|gu)[^.]{0,60}(kabul etmez|bulunmamaktadir|yoktur|ustlenmez)/,
      /(hicbir|herhangi bir) (zarar|kayip)[^.]{0,80}(sorumlu|tazmin)/,
      /\b(shall not|will not|won't|not) be (held )?liable/,
      /\blimitation of liability/,
      /\b(disclaim|exclude)[a-z]*\b[^.]{0,60}\b(warrant|liabilit)/,
      /\bin no event\b[^.]{0,120}\bliable/,
    ],
  },
};

// Kullanıcının lehine olan maddeler puanı düşürür ve özette ayrıca belirtilir.
export const POSITIVES = {
  no_sale: {
    summary: 'Verilerinin satılmadığı açıkça belirtiliyor.',
    bonus: 6,
    any: [/\b(do not|don't|never|will not|won't) sell\b/, /(satmayiz|satmiyoruz|satilmaz|satmaz)/],
  },
  account_deletion: {
    summary: 'Hesabını silebilir veya kapatabilirsin.',
    bonus: 4,
    any: [
      /(silebilirsiniz|kapatabilirsiniz|silme talebinde bulunabilirsiniz|silinmesini talep edebilirsiniz)/,
      /\byou (can|may)\b[^.]{0,60}\b(delete|close|deactivate)\b[^.]{0,40}\baccount/,
    ],
  },
  data_rights: {
    summary: 'Verilerine erişme, düzeltme veya silinmesini isteme hakkın var.',
    bonus: 4,
    any: [
      /(kvkk|6698)[^.]{0,120}\b(11|on birinci)\b/,
      /(erisim|bilgi talep|duzeltilmesini|silinmesini|yok edilmesini)[^.]{0,30}(talep etme|isteme) hakk/,
      /\b(right to|you (can|may)) (access|download|export|obtain a copy|request (access|a copy))/,
      /\bdata portability/,
    ],
  },
  opt_out: {
    summary: 'Bazı veri kullanımlarını reddedebilir ya da onayını geri çekebilirsin.',
    bonus: 3,
    any: [
      /(vazgecebilir|reddedebilir|itiraz edebilir|geri cekebilir)/,
      /\bopt[- ]out\b/,
      /\bwithdraw (your )?consent/,
    ],
  },
};

export const LEVELS = [
  {id: 'low', label: 'Düşük risk', min: 0},
  {id: 'medium', label: 'Orta risk', min: 40},
  {id: 'high', label: 'Yüksek risk', min: 70},
];

export const levelFor = (score) => [...LEVELS].reverse().find((l) => score >= l.min);

const matches = (folded, rule) =>
  rule.any.some((re) => re.test(folded)) && (rule.all ?? []).every((re) => re.test(folded));

// Paragrafları cümlelere böler. Çok kısa parçalar (menü artıkları) atılır.
export const splitSentences = (text) =>
  text
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?;])\s+(?=["“'(]?[A-ZÇĞİÖŞÜ0-9])/))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 25);

const MAX_EXAMPLES = 3;

export const analyze = (text) => {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(Boolean).length;
  const hits = {};
  const positives = new Set();
  const clauses = [];

  sentences.forEach((sentence, index) => {
    const folded = fold(sentence);
    for (const [id, rule] of Object.entries(POSITIVES)) {
      if (matches(folded, rule)) positives.add(id);
    }
    for (const [id, rule] of Object.entries(CATEGORIES)) {
      if (!matches(folded, rule)) continue;
      // "Verilerinizi satmayız" gibi olumsuz cümleler veri paylaşımı riski sayılmaz.
      if (id === 'data_sharing' && matches(folded, POSITIVES.no_sale)) continue;
      hits[id] = (hits[id] ?? 0) + 1;
      if (hits[id] <= MAX_EXAMPLES) {
        clauses.push({category: id, label: rule.label, sentence, index});
      }
    }
  });

  // Puan: bulunan her kategori kendi ağırlığı kadar; aynı kategoriden çok madde varsa biraz daha.
  let risk = 0;
  for (const [id, count] of Object.entries(hits)) {
    risk += CATEGORIES[id].weight * Math.min(1.3, 1 + 0.1 * (count - 1));
  }
  for (const id of positives) risk -= POSITIVES[id].bonus;
  if (words > 6000) risk += 4;
  const score = Math.max(0, Math.min(100, Math.round(risk)));

  const found = Object.keys(hits).sort((a, b) => CATEGORIES[b].weight - CATEGORIES[a].weight);
  const summary = found.slice(0, 5).map((id) => ({
    text: CATEGORIES[id].summary,
    level: CATEGORIES[id].weight >= 14 ? 'high' : 'medium',
    category: id,
  }));
  for (const id of [...positives].slice(0, 2)) {
    summary.push({text: POSITIVES[id].summary, level: 'good'});
  }
  const readingMinutes = Math.max(1, Math.ceil(words / 200));
  if (found.length === 0) {
    summary.unshift({text: 'Bilinen riskli madde kalıplarından hiçbiri bulunamadı.', level: 'good'});
  }
  if (summary.length < 5) {
    summary.push({
      text: `Metin yaklaşık ${words.toLocaleString('tr-TR')} kelime; dikkatle okumak yaklaşık ${readingMinutes} dakika sürer.`,
      level: 'info',
    });
  }

  clauses.sort((a, b) => CATEGORIES[b.category].weight - CATEGORIES[a.category].weight || a.index - b.index);

  return {
    score,
    level: levelFor(score).id,
    summary: summary.slice(0, 7),
    clauses,
    counts: hits,
    riskyCount: found.length,
    stats: {words, sentences: sentences.length, readingMinutes},
    engine: 'rules',
  };
};

// ---------------------------------------------------------------- soru-cevap

const STOP = new Set(
  (
    'acaba ama bana beni benim bir biri bu bunu bunlar da de diye eger en gibi hangi hem hep icin ile ise kadar ' +
    'kim mi mu mi mudur midir mu musun ne neden nasil nedir o olur olursa onu sen seni senin siz sizi sizin su sey ' +
    've veya ya yani zaman olarak oldugu olan var yok edilir edilecek ' +
    'the a an and or of to in on for is are be can may will what when where who how does do if my me i you your it this that ' +
    'they them their we us our'
  ).split(' '),
);

// Eş anlamlılar: sorudaki bir kelime bir gruba uyarsa gruptaki diğer kökler de aranır.
const SYNONYMS = [
  ['sil', 'silin', 'silme', 'kaldir', 'imha', 'yok et', 'delet', 'erase', 'remov'],
  ['veri', 'bilgi', 'kisisel', 'data', 'informat', 'personal'],
  ['hesap', 'hesab', 'account', 'uyelik', 'profil'],
  ['iptal', 'fesih', 'feshet', 'cancel', 'terminat', 'sonlandir'],
  ['ucret', 'odeme', 'para', 'iade', 'fiyat', 'refund', 'fee', 'payment', 'charge', 'price'],
  ['paylas', 'aktar', 'share', 'disclos', 'ucuncu', 'third', 'partner', 'ortak'],
  ['cerez', 'cookie', 'takip', 'track'],
  ['konum', 'location', 'gps'],
  ['cocuk', 'child', 'minor', 'yas', 'age'],
  ['sakla', 'saklan', 'sure', 'retain', 'retention', 'store', 'keep'],
  ['abonel', 'subscri', 'yenile', 'renew'],
  ['dava', 'mahkeme', 'tahkim', 'court', 'arbitrat', 'lawsuit'],
  ['reklam', 'advertis', 'pazarlama', 'marketing'],
  ['guvenl', 'securit', 'sifre', 'password'],
  ['degis', 'guncel', 'change', 'modif', 'amend', 'update', 'revis'],
];

const stem = (word) => (word.length > 5 ? word.slice(0, 5) : word);

const queryTerms = (question) => {
  const words = fold(question)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
  const terms = new Map();
  for (const w of words) {
    terms.set(stem(w), 1);
    for (const group of SYNONYMS) {
      if (group.some((g) => w.startsWith(stem(g)) || g.startsWith(stem(w)))) {
        for (const g of group) if (!terms.has(stem(g))) terms.set(stem(g), 0.7);
      }
    }
  }
  return terms;
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const answerQuestion = (text, question, limit = 3) => {
  const sentences = splitSentences(text);
  const folded = sentences.map(fold);
  const terms = [...queryTerms(question)].map(([term, weight]) => ({
    weight,
    re: new RegExp(`\\b${escapeRe(term)}`),
  }));
  if (terms.length === 0) {
    return {answer: 'Soruyu biraz daha açık yazar mısın? Örneğin: "Hesabımı silersem verilerim silinir mi?"', quotes: []};
  }
  // Nadir geçen kelimeler daha belirleyicidir (IDF).
  const idf = terms.map(({re}) => {
    const df = folded.filter((s) => re.test(s)).length;
    return Math.log(1 + sentences.length / (1 + df));
  });
  const scored = folded
    .map((s, index) => ({
      index,
      score: terms.reduce((sum, t, i) => sum + (t.re.test(s) ? t.weight * idf[i] : 0), 0),
      matched: terms.filter((t) => t.re.test(s)).length,
    }))
    .filter((r) => r.matched >= Math.min(2, terms.filter((t) => t.weight === 1).length || 1))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) {
    return {
      answer: 'Sözleşmede bu soruyla doğrudan ilgili bir madde bulamadım. Soruyu farklı kelimelerle sormayı deneyebilirsin.',
      quotes: [],
    };
  }
  return {
    answer:
      'Sözleşmede bu konuyla ilgili en yakın maddeler şunlar. Kesin bir yorum için maddeyi metnin içinde, çevresiyle birlikte okumanı öneririm.',
    quotes: scored.map((r) => ({sentence: sentences[r.index], index: r.index})),
  };
};

// ---------------------------------------------------------------- değişiklik takibi

// İki sürüm arasında eklenen ve çıkarılan cümleleri bulur.
export const diffTexts = (oldText, newText, limit = 20) => {
  const before = splitSentences(oldText);
  const after = splitSentences(newText);
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((s) => !beforeSet.has(s)).slice(0, limit),
    removed: before.filter((s) => !afterSet.has(s)).slice(0, limit),
  };
};
