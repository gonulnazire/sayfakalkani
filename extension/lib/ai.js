// İsteğe bağlı yapay zeka analizi (Claude). Kullanıcının kendi API anahtarıyla çalışır ve
// yalnızca kullanıcı bir düğmeye bastığında çağrılır. Bu durumda sözleşme metni Anthropic'e
// gönderilir; ayarlar sayfası bunu kullanıcıya açıkça söyler.
import Anthropic from '../vendor/anthropic-sdk.mjs';

// Yaklaşık sınır: bundan uzun metinler yapay zekaya gönderilmez, kullanıcıya söylenir.
const MAX_CHARS = 1_500_000;

// Özet ve soru-cevap aynı sistem istemini ve aynı belge bloğunu kullanır; böylece aynı
// sözleşmeye sorulan sorular önbellekten okunur ve daha ucuza gelir.
const SYSTEM = `Sen, kullanıcıların web sitelerindeki sözleşmeleri (kullanım koşulları, gizlilik politikası, KVKK aydınlatma metni, çerez politikası, mesafeli satış sözleşmesi) anlamasına yardım eden bir asistansın.
Sana bir sözleşme metni ve bir görev verilecek. Sadece metinde yazanlara dayan; metinde olmayan bir şeyi varsayma ya da uydurma. Emin olmadığın yerde bunu açıkça söyle.
Hukuki tavsiye vermezsin; metnin ne söylediğini sade Türkçeyle aktarırsın. Kullanıcıya "sen" diye hitap et. Alıntıları metinden kelimesi kelimesine, değiştirmeden al.`;

const SUMMARY_TASK = `Bu sözleşmeyi kullanıcı açısından incele ve şunları üret:
- summary: 5-7 madde. Her madde tek cümle, sade Türkçe. level alanı: kullanıcı için ciddi risk "high", orta risk "medium", kullanıcının lehine olan "good", tarafsız bilgi "info".
- score: 0-100 arası tam sayı risk puanı. 0 kullanıcı için çok güvenli, 100 çok riskli demek. Ölçek: 0-39 düşük, 40-69 orta, 70-100 yüksek.
- clauses: kullanıcı için en riskli en fazla 8 madde. label kısa bir kategori adı olsun (ör. "Veri paylaşımı", "Otomatik yenileme", "Tek taraflı değişiklik", "Tahkim", "Geniş içerik lisansı", "Hesap kapatma", "Sorumluluk sınırlaması"). quote metinden tek bir cümlenin birebir alıntısı. explanation bunun kullanıcı için ne anlama geldiğini anlatan bir cümle.`;

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    score: {type: 'integer'},
    summary: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: {type: 'string'},
          level: {type: 'string', enum: ['high', 'medium', 'good', 'info']},
        },
        required: ['text', 'level'],
        additionalProperties: false,
      },
    },
    clauses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: {type: 'string'},
          quote: {type: 'string'},
          explanation: {type: 'string'},
        },
        required: ['label', 'quote', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['score', 'summary', 'clauses'],
  additionalProperties: false,
};

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: {type: 'string'},
    quotes: {type: 'array', items: {type: 'string'}},
  },
  required: ['answer', 'quotes'],
  additionalProperties: false,
};

export class AiError extends Error {}

const describeError = (error) => {
  if (error instanceof Anthropic.AuthenticationError) return 'API anahtarı geçersiz. Ayarlar sayfasından kontrol et.';
  if (error instanceof Anthropic.PermissionDeniedError) return 'Bu API anahtarının seçilen modele erişimi yok.';
  if (error instanceof Anthropic.RateLimitError) return 'Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.';
  if (error instanceof Anthropic.BadRequestError) return `İstek reddedildi: ${error.message}`;
  if (error instanceof Anthropic.APIConnectionError) return 'Anthropic API\'ye bağlanılamadı. İnternet bağlantını kontrol et.';
  if (error instanceof Anthropic.APIError) return `API hatası (${error.status}): ${error.message}`;
  return String(error?.message ?? error);
};

// Service worker uzun bir istek sırasında boşta sayılıp kapatılmasın diye
// arada bir küçük bir eklenti API'si çağrılır.
const withKeepAlive = async (promise) => {
  const timer = setInterval(() => chrome.runtime.getPlatformInfo(), 20_000);
  try {
    return await promise;
  } finally {
    clearInterval(timer);
  }
};

const run = async ({apiKey, model}, text, task, schema) => {
  if (!apiKey) throw new AiError('Yapay zeka için önce ayarlar sayfasından bir Claude API anahtarı gir.');
  if (text.length > MAX_CHARS) {
    throw new AiError('Bu metin yapay zekaya tek seferde gönderilemeyecek kadar uzun. Kural tabanlı analiz sonuçlarını kullanabilirsin.');
  }

  const client = new Anthropic({apiKey, dangerouslyAllowBrowser: true});
  // Opus 5.5 ve Sonnet 5.5'te güvenlik sınıflandırıcısı bir isteği reddederse,
  // sunucu aynı isteği önerilen yedek modelle yeniden çalıştırır.
  const fallback = model === 'claude-haiku-5-5' ? {} : {betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default'};

  try {
    const stream = client.beta.messages.stream({
      model,
      max_tokens: 16000,
      thinking: {type: 'adaptive'},
      output_config: {effort: 'medium', format: {type: 'json_schema', schema}},
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {type: 'text', text: `<sozlesme>\n${text}\n</sozlesme>`, cache_control: {type: 'ephemeral'}},
            {type: 'text', text: task},
          ],
        },
      ],
      ...fallback,
    });
    const message = await withKeepAlive(stream.finalMessage());

    if (message.stop_reason === 'refusal') {
      throw new AiError('Model bu isteği yanıtlamadı. Kural tabanlı analiz sonuçlarını kullanabilirsin.');
    }
    if (message.stop_reason === 'max_tokens') {
      throw new AiError('Yanıt yarıda kesildi. Tekrar dene.');
    }
    const block = message.content.find((b) => b.type === 'text');
    if (!block) throw new AiError('Modelden metin yanıtı gelmedi.');
    return {data: JSON.parse(block.text), model: message.model};
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(describeError(error));
  }
};

export const summarizeWithAi = async (settings, text) => {
  const {data, model} = await run(settings, text, SUMMARY_TASK, SUMMARY_SCHEMA);
  const score = Math.max(0, Math.min(100, Math.round(data.score)));
  return {
    score,
    summary: data.summary.slice(0, 7),
    clauses: data.clauses.slice(0, 8).map((c) => ({label: c.label, sentence: c.quote, explanation: c.explanation})),
    engine: 'ai',
    model,
  };
};

export const answerWithAi = async (settings, text, question) => {
  const task = `Kullanıcının sorusu: "${question}"
Soruyu yalnızca bu sözleşmeye dayanarak 2-4 cümleyle yanıtla (answer). Cevabı destekleyen en fazla 3 cümleyi metinden birebir alıntıla (quotes). Metin soruyu yanıtlamıyorsa bunu açıkça söyle ve quotes boş kalsın.`;
  const {data, model} = await run(settings, text, task, ANSWER_SCHEMA);
  return {answer: data.answer, quotes: data.quotes.slice(0, 3).map((sentence) => ({sentence})), engine: 'ai', model};
};
