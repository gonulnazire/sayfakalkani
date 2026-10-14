// Sözleşme Okuyucu - service worker.
// Sayfa taramalarını toplar, rozetleri günceller, sözleşmeleri çekip analiz eder,
// sonuçları saklar ve değişiklikleri takip eder.
import {analyze, answerQuestion, diffTexts} from './lib/analyzer.js';
import {AiError, answerWithAi, summarizeWithAi} from './lib/ai.js';
import {DEFAULT_SETTINGS, getSettings} from './lib/settings.js';

const CACHE_HOURS = 24;
const MAX_DOCS = 60;
const MIN_WORDS = 150;
const WATCH_ALARM = 'watch-changes';
const INK = '#16213A';

// Eklenti doğrudan bu klasörden yüklendiyse '', proje kökünden (btk_akademi) yüklendiyse
// 'extension/'. Eklenti köküne göre yazılması gereken dosya yolları bununla kurulur.
const PREFIX = new URL('./', import.meta.url).pathname.slice(1);
const asset = (path) => `${PREFIX}${path}`;
const MARKER = '#FFE45C';

// ---------------------------------------------------------------- depolama

const docKey = (url) => `doc:${url}`;
const tabKey = (tabId) => `tab:${tabId}`;

const getDoc = async (url) => (await chrome.storage.local.get(docKey(url)))[docKey(url)];

const allDocs = async () =>
  Object.entries(await chrome.storage.local.get(null))
    .filter(([key]) => key.startsWith('doc:'))
    .map(([, doc]) => doc);

const putDoc = async (doc) => {
  await chrome.storage.local.set({[docKey(doc.url)]: doc});
  const docs = await allDocs();
  if (docs.length > MAX_DOCS) {
    docs.sort((a, b) => a.analyzedAt - b.analyzedAt);
    await chrome.storage.local.remove(docs.slice(0, docs.length - MAX_DOCS).map((d) => docKey(d.url)));
  }
};

const getTabInfo = async (tabId) => (await chrome.storage.session.get(tabKey(tabId)))[tabKey(tabId)] ?? null;

// Arayüze giden kayıt: tam metin büyük olduğu için gönderilmez.
const publicDoc = (doc) => {
  const {text, fetched, ...rest} = doc;
  return {...rest, words: doc.analysis?.stats.words ?? 0};
};

// ---------------------------------------------------------------- yardımcılar

const normalizeUrl = (url) => {
  const u = new URL(url);
  u.hash = '';
  return u.href;
};

const siteOf = (url) => new URL(url).hostname.replace(/^www\./, '');

const sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

class ReadError extends Error {}

// Sayfanın karakter setini başlıktan ya da <meta charset> etiketinden bulur
// (ör. eski Türkçe sitelerde windows-1254).
const decodeHtml = (buffer, contentType) => {
  const head = new TextDecoder('ascii').decode(buffer.slice(0, 4096));
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
};

// ---------------------------------------------------------------- HTML ayrıştırma

// Service worker'da DOM yoktur; HTML'i ayrıştırmak için gizli bir offscreen belge kullanılır.
let creatingOffscreen = null;
const ensureOffscreen = async () => {
  const contexts = await chrome.runtime.getContexts({contextTypes: ['OFFSCREEN_DOCUMENT']});
  if (contexts.length > 0) return;
  creatingOffscreen ??= chrome.offscreen
    .createDocument({
      url: asset('offscreen/offscreen.html'),
      reasons: ['DOM_PARSER'],
      justification: 'Sözleşme sayfasının HTML kodundan okunabilir metni çıkarmak için.',
    })
    .finally(() => {
      creatingOffscreen = null;
    });
  await creatingOffscreen;
};

const fetchDocument = async (url) => {
  let response;
  try {
    response = await fetch(url, {credentials: 'omit', redirect: 'follow'});
  } catch {
    throw new ReadError('Sözleşme sayfasına ulaşılamadı. İnternet bağlantını kontrol et.');
  }
  if (!response.ok) throw new ReadError(`Sözleşme sayfası açılamadı (HTTP ${response.status}).`);
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('pdf')) {
    throw new ReadError('Bu sözleşme PDF olarak yayınlanmış. Şimdilik yalnızca web sayfaları okunabiliyor.');
  }
  const html = decodeHtml(await response.arrayBuffer(), contentType);
  await ensureOffscreen();
  return chrome.runtime.sendMessage({target: 'offscreen', type: 'parse-html', html});
};

// ---------------------------------------------------------------- analiz

const notifyChange = async (doc) => {
  const {added, removed} = doc.changes;
  await chrome.notifications.create(`change:${doc.url}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL(asset('icons/icon128.png')),
    title: 'Koşullar değişti',
    message: `${doc.site}: ${doc.label} güncellenmiş. ${added.length} madde eklendi, ${removed.length} madde çıkarıldı.`,
    priority: 1,
  });
};

// Bir sözleşmenin arka planda çekilmiş son sürümü (değişiklik takibinin referansı).
const lastFetched = (doc) => {
  if (!doc) return null;
  if (doc.source === 'fetch') return {hash: doc.hash, text: doc.text, analyzedAt: doc.analyzedAt, score: doc.analysis.score};
  return doc.fetched ?? null;
};

// Bir sözleşmeyi okur ve analiz eder. `extracted` verilirse sayfayı yeniden çekmek yerine
// açık sekmedeki metni kullanır (sayfa sonradan JavaScript ile yükleniyorsa gerekli).
const analyzeDocument = async ({url, kind, label, extracted, force = false}) => {
  const key = normalizeUrl(url);
  const previous = await getDoc(key);
  const fresh = previous && Date.now() - previous.analyzedAt < CACHE_HOURS * 3600e3;
  if (!force && !extracted && fresh) return previous;

  const result = extracted ?? (await fetchDocument(key));
  if (!result || result.words < MIN_WORDS) {
    throw new ReadError(
      'Sayfada okunabilir bir sözleşme metni bulunamadı. Metin sayfa açıldıktan sonra yükleniyorsa, sözleşme sayfasını açıp "Bu sayfayı incele" düğmesini kullan.',
    );
  }

  const hash = await sha256(result.text.replace(/\s+/g, ' '));
  const source = extracted ? 'page' : 'fetch';
  const fetchedBefore = lastFetched(previous);
  const doc = {
    url: key,
    site: siteOf(key),
    kind: kind ?? previous?.kind ?? 'other',
    label: label ?? previous?.label ?? (result.title || 'Sözleşme'),
    title: result.title,
    // Metnin nereden okunduğu: açık sekmeden ('page') ya da arka planda çekilerek ('fetch').
    source,
    // Açık sekmeden okununca, değişiklik takibi için son çekilen sürüm ayrıca saklanır.
    fetched: source === 'page' ? fetchedBefore : undefined,
    // Arka planda bir kez çekilebildiyse günlük değişiklik kontrolüne girer.
    watchable: source === 'fetch' || Boolean(fetchedBefore),
    text: result.text,
    hash,
    analyzedAt: Date.now(),
    firstSeenAt: previous?.firstSeenAt ?? Date.now(),
    analysis: analyze(result.text),
    // Metin değişmediyse daha önce alınan yapay zeka özeti geçerliliğini korur.
    ai: previous?.hash === hash ? previous.ai : undefined,
    changes: previous?.changes,
  };

  // Değişiklikler yalnızca arka planda çekilen sürümler arasında aranır. Açık sekmedeki sayfa
  // (ör. sonradan yüklenen bölümler) ile çekilen HTML arasındaki farklar değişiklik sayılmaz.
  if (source === 'fetch' && fetchedBefore && fetchedBefore.hash !== hash) {
    const diff = diffTexts(fetchedBefore.text, result.text);
    if (diff.added.length > 0 || diff.removed.length > 0) {
      doc.changes = {
        ...diff,
        detectedAt: Date.now(),
        previousAnalyzedAt: fetchedBefore.analyzedAt,
        previousScore: fetchedBefore.score,
        seen: false,
      };
      await notifyChange(doc);
    }
  }

  await putDoc(doc);
  return doc;
};

// İçerik betiği henüz yüklenmemiş sekmelere (ör. eklenti kurulmadan önce açılanlar) yükler.
const ensureContentScript = async (tabId) => {
  try {
    await chrome.tabs.sendMessage(tabId, {type: 'ping'});
  } catch {
    await chrome.scripting.insertCSS({target: {tabId}, files: [asset('content/content.css')]});
    await chrome.scripting.executeScript({target: {tabId}, files: [asset('lib/extract.js'), asset('content/content.js')]});
  }
};

const analyzeOpenPage = async (tabId) => {
  const tab = await chrome.tabs.get(tabId);
  await ensureContentScript(tabId);
  const extracted = await chrome.tabs.sendMessage(tabId, {type: 'extract'});
  const info = await getTabInfo(tabId);
  return analyzeDocument({
    url: tab.url,
    kind: info?.legalPage?.kind,
    label: info?.legalPage?.label ?? extracted.title,
    extracted,
  });
};

// Kayıt formundaki uyarı kartı için: sayfanın bağlantı verdiği sözleşmeleri (önbellekten
// ya da yeniden okuyarak) analiz eder ve riskli kategorileri birleştirir. Yapay zeka kullanılmaz.
const consentSummary = async (tabId) => {
  const info = await getTabInfo(tabId);
  const links = (info?.links ?? []).filter((l) => ['terms', 'privacy', 'kvkk', 'sales'].includes(l.kind)).slice(0, 3);
  if (links.length === 0) return null;
  const results = await Promise.allSettled(links.map((l) => analyzeDocument(l)));
  const docs = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (docs.length === 0) return null;
  const labels = [...new Set(docs.flatMap((d) => d.analysis.clauses.map((c) => c.label)))];
  const score = Math.max(...docs.map((d) => d.analysis.score));
  return {count: labels.length, labels, score, docs: docs.map((d) => d.label)};
};

// ---------------------------------------------------------------- rozet

const updateBadge = async (tabId, info) => {
  const count = (info?.links.length ?? 0) + (info?.legalPage ? 1 : 0);
  await chrome.action.setBadgeText({tabId, text: count > 0 ? String(count) : ''});
  await chrome.action.setBadgeBackgroundColor({tabId, color: INK});
  await chrome.action.setBadgeTextColor({tabId, color: MARKER});
  await chrome.action.setTitle({
    tabId,
    title: count > 0 ? `Sözleşme Okuyucu: bu sayfada ${count} sözleşme bulundu` : 'Sözleşme Okuyucu',
  });
};

// ---------------------------------------------------------------- mesajlar

const handlers = {
  // İçerik betiğinden: sayfadaki sözleşme bağlantıları.
  'page-scan': async (message, sender) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined) return null;
    const info = {pageUrl: sender.tab.url, links: message.links, legalPage: message.legalPage, updatedAt: Date.now()};
    await chrome.storage.session.set({[tabKey(tabId)]: info});
    await updateBadge(tabId, info);
    return null;
  },
  'consent-check': async (_message, sender) => consentSummary(sender.tab.id),
  'open-panel': async (_message, sender) => {
    await chrome.sidePanel.open({tabId: sender.tab.id});
    return true;
  },

  // Arayüzden.
  'tab-info': async ({tabId}) => {
    const tab = await chrome.tabs.get(tabId);
    const scriptable = /^https?:/.test(tab.url ?? '');
    if (scriptable && !(await getTabInfo(tabId))) {
      // Eklenti kurulmadan önce açılmış sekme ya da tarayıcı yeniden başlatıldı:
      // içerik betiğini yükle ve sayfayı hemen yeniden tarat.
      await ensureContentScript(tabId);
      const scan = await chrome.tabs.sendMessage(tabId, {type: 'rescan'});
      await handlers['page-scan'](scan, {tab});
    }
    return {tab: {id: tab.id, url: tab.url, title: tab.title}, scriptable, info: await getTabInfo(tabId)};
  },
  analyze: async ({url, kind, label, force}) => ({doc: publicDoc(await analyzeDocument({url, kind, label, force}))}),
  'analyze-page': async ({tabId}) => ({doc: publicDoc(await analyzeOpenPage(tabId))}),
  'get-doc': async ({url}) => {
    const doc = await getDoc(normalizeUrl(url));
    return {doc: doc ? publicDoc(doc) : null};
  },
  ask: async ({url, question, useAi}) => {
    const doc = await getDoc(normalizeUrl(url));
    if (!doc) throw new ReadError('Önce sözleşmeyi analiz et.');
    const settings = await getSettings();
    if (useAi && settings.aiEnabled) return answerWithAi(settings, doc.text, question);
    return {...answerQuestion(doc.text, question), engine: 'rules'};
  },
  'ai-summary': async ({url}) => {
    const doc = await getDoc(normalizeUrl(url));
    if (!doc) throw new ReadError('Önce sözleşmeyi analiz et.');
    const settings = await getSettings();
    if (!settings.aiEnabled) throw new AiError('Yapay zeka ayarlardan kapalı.');
    doc.ai = {...(await summarizeWithAi(settings, doc.text)), createdAt: Date.now()};
    await putDoc(doc);
    return {doc: publicDoc(doc)};
  },
  history: async () => ({
    docs: (await allDocs()).map(publicDoc).sort((a, b) => b.analyzedAt - a.analyzedAt),
  }),
  'mark-change-seen': async ({url}) => {
    const doc = await getDoc(normalizeUrl(url));
    if (doc?.changes) {
      doc.changes.seen = true;
      await putDoc(doc);
    }
    return null;
  },
  'delete-doc': async ({url}) => {
    await chrome.storage.local.remove(docKey(normalizeUrl(url)));
    return null;
  },
  'clear-history': async () => {
    const docs = await allDocs();
    await chrome.storage.local.remove(docs.map((d) => docKey(d.url)));
    return null;
  },
};

// Web sayfalarında çalışan içerik betiği yalnızca bu mesajları gönderebilir. Geri kalanlar
// (ör. yapay zeka çağrısı, geçmişi silme, rastgele bir adresi çekme) yalnızca eklentinin
// kendi sayfalarından (popup, yan panel, geçmiş, ayarlar) kabul edilir.
const CONTENT_SCRIPT_MESSAGES = new Set(['page-scan', 'consent-check', 'open-panel']);
const EXTENSION_ORIGIN = chrome.runtime.getURL('');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'offscreen') return false;
  const handler = handlers[message?.type];
  if (!handler) return false;
  const fromExtensionPage = sender.url?.startsWith(EXTENSION_ORIGIN);
  if (!fromExtensionPage && !CONTENT_SCRIPT_MESSAGES.has(message.type)) return false;
  handler(message, sender)
    .then((result) => sendResponse({ok: true, result}))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof ReadError || error instanceof AiError ? error.message : `Beklenmeyen hata: ${error.message}`,
      }),
    );
  return true;
});

// ---------------------------------------------------------------- sekmeler

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(tabKey(tabId)));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Başka bir sayfaya geçildi: yeni sayfanın taraması gelene kadar eski sonuçları temizle.
  if (changeInfo.url) {
    chrome.storage.session.remove(tabKey(tabId));
    chrome.action.setBadgeText({tabId, text: ''});
  }
});

// ---------------------------------------------------------------- değişiklik takibi

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== WATCH_ALARM) return;
  const settings = await getSettings();
  if (!settings.watchChanges) return;
  for (const doc of await allDocs()) {
    if (!doc.watchable) continue;
    try {
      await analyzeDocument({url: doc.url, force: true});
    } catch {
      // Sayfa geçici olarak açılamadıysa bir sonraki kontrolde yeniden denenir.
    }
  }
});

chrome.notifications.onClicked.addListener((id) => {
  if (!id.startsWith('change:')) return;
  const url = id.slice('change:'.length);
  chrome.tabs.create({url: `${chrome.runtime.getURL(asset('history/history.html'))}#${encodeURIComponent(url)}`});
  chrome.notifications.clear(id);
});

// ---------------------------------------------------------------- kurulum

chrome.runtime.onInstalled.addListener(async () => {
  const {settings} = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({settings: {...DEFAULT_SETTINGS, ...settings}});
  await chrome.alarms.create(WATCH_ALARM, {periodInMinutes: 24 * 60, delayInMinutes: 60});

  // Zaten açık olan sekmelerde de rozetler hemen görünsün.
  const tabs = await chrome.tabs.query({url: ['http://*/*', 'https://*/*']});
  for (const tab of tabs) {
    ensureContentScript(tab.id).catch(() => {});
  }
});
