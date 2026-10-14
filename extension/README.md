# Sözleşme Okuyucu (Chrome eklentisi)

Sitelerdeki kullanım koşullarını, gizlilik politikalarını ve benzeri sözleşmeleri bulur, okur, özetler, 0-100 arası risk puanı verir ve riskli maddeleri gösterir. Plan: [`../docs/sozlesme-okuyucu-plan.md`](../docs/sozlesme-okuyucu-plan.md)

> Bu eklenti hukuki tavsiye vermez; sözleşmelerin ne söylediğini anlamana yardım eder.

## Kurulum

1. Chrome'da adres çubuğuna `chrome://extensions` yaz.
2. Sağ üstteki **Geliştirici modu** anahtarını aç.
3. **Paketlenmemiş öğe yükle** düğmesine bas ve proje klasörü **`btk_akademi`**'yi seç (içinde `manifest.json` olan klasör). Bu `extension` klasörünü seçmek de aynı şekilde çalışır; ikisinden yalnızca birini yükle.
4. Araç çubuğundaki yapboz simgesinden **Sözleşme Okuyucu**'yu sabitle.

Derleme adımı yoktur; klasör olduğu gibi yüklenir. Kodu değiştirdiğinde `chrome://extensions` sayfasında eklentinin yenile düğmesine bas ve açık sekmeleri yenile. En az Chrome 116 gerekir.

Chrome "Manifest dosyası eksik veya okunamıyor" derse, seçtiğin klasörün içinde doğrudan `manifest.json` dosyası olmadığı anlamına gelir. Klasörü seçerken içine girip bir alt klasörü (ör. `docs`, `react`, `popup`) işaretlemediğinden emin ol.

İki manifest vardır:

- `extension/manifest.json` asıl tanımdır; Chrome Web Store'a yüklerken yalnızca `extension` klasörü ZIP'lenir.
- Proje kökündeki `manifest.json` aynı tanımın, yollarının başına `extension/` eklenmiş kopyasıdır ve eklentinin proje kökünden yüklenebilmesini sağlar. `extension/manifest.json`'u değiştirirsen bunu da aynı şekilde güncelle.

## Özellikler

| # | Özellik | Nerede |
|---|---|---|
| 1 | Sayfadaki sözleşme bağlantılarını bulur, ikonda rozetle sayısını gösterir | Araç çubuğu ikonu |
| 2 | Sözleşme sayfasını arka planda çeker, menü/alt bilgi gibi kısımları atıp metni çıkarır (eski Türkçe sitelerdeki `windows-1254` dahil) | Otomatik |
| 3 | 5-7 maddelik sade Türkçe özet | Popup |
| 4 | 0-100 risk puanı: 0-39 düşük, 40-69 orta, 70-100 yüksek | Popup |
| 5 | Riskli maddeler: veri paylaşımı, otomatik yenileme, tek taraflı değişiklik, tahkim, geniş içerik lisansı, hesap kapatma, sorumluluk sınırlaması | Popup, yan panel |
| 6 | "Metinde göster": maddeyi sözleşme sayfasında sarıyla vurgular | Popup, yan panel |
| 7 | "Kabul ediyorum" kutusu ya da "Kayıt ol" düğmesi görünce uyarı kartı | Web sayfası |
| 8 | Sözleşmeler günde bir kez yeniden okunur; metin değişirse bildirim gelir, eklenen ve çıkarılan maddeler listelenir | Bildirim, yan panel |
| 9 | Sözleşmeye soru sorma; cevap sözleşmeden alıntılarla gelir | Yan panel |
| 10 | Site bazında geçmiş; özeti `.txt` olarak indirme ya da PDF olarak kaydetme | Geçmiş sayfası |

Analiz iki dili de tanır: Türkçe ve İngilizce sözleşmeler.

## Yapay zeka (isteğe bağlı)

Varsayılan analiz bu bilgisayarda, anahtar kelime kurallarıyla yapılır; metin hiçbir yere gönderilmez. Ayarlar sayfasından Claude açılıp bir API anahtarı girilirse:

- Popup'ta **Claude ile ayrıntılı özetle** düğmesi çıkar.
- Yan panelde **Claude ile yanıtla** seçeneği çıkar.

Bu düğmelere basıldığında sözleşme metni (ve soru) kullanıcının kendi anahtarıyla Anthropic'e gönderilir. Varsayılan model Claude Opus 5.5'tir; ayarlardan Sonnet 5.5 ya da Haiku 5.5 seçilebilir. Opus ve Sonnet'te, model bir isteği reddederse sunucu tarafındaki varsayılan yedek model devreye girer (`fallbacks: "default"`).

## Klasör yapısı

```
manifest.json          Eklenti tanımı (Manifest V3)
background.js          Service worker: tarama sonuçları, analiz, önbellek, değişiklik takibi
content/               Her sayfada çalışan betik: bağlantı bulma, uyarı kartı, vurgulama
offscreen/             Arka planda çekilen HTML'i ayrıştıran gizli belge
lib/analyzer.js        Kural tabanlı analiz, soru-cevap, değişiklik karşılaştırma
lib/extract.js         HTML'den sözleşme metnini çıkarma
lib/ai.js              İsteğe bağlı Claude entegrasyonu
lib/settings.js        Ayarlar ve varsayılanlar
popup/                 Araç çubuğu penceresi
sidepanel/             Soru-cevap, maddeler, değişiklikler
history/               Geçmiş, dışa aktarma, PDF görünümü
options/               Ayarlar
ui/                    Ortak stil ve yardımcılar
fonts/                 Archivo ve Newsreader (SIL Open Font License)
vendor/                Anthropic TypeScript SDK'nın tek dosyalık paketi
icons/                 Eklenti ikonları
```

## Bilinen sınırlar

- PDF olarak yayınlanan sözleşmeler okunmaz.
- Metni sayfa açıldıktan sonra JavaScript ile yüklenen sözleşme sayfaları arka planda okunamaz. Bu durumda sözleşme sayfasını açıp popup'taki **Bu sayfa** seçeneği kullanılır.
- Kural tabanlı analiz anahtar kelime kalıplarına dayanır; bazı maddeleri kaçırabilir ya da yanlış işaretleyebilir.
- Uyarı kartındaki **Ayrıntıları gör** düğmesi yan paneli Chrome'un izin verdiği durumlarda açar. Açamazsa kart, araç çubuğundaki simgeye tıklamayı önerir.

## Geliştirici notu: SDK paketi

`vendor/anthropic-sdk.mjs`, `@anthropic-ai/sdk@0.128.0` paketinin esbuild ile üretilmiş tek dosyalık ESM sürümüdür (eklentide derleme adımı olmadığı için):

```bash
npm install @anthropic-ai/sdk@0.128.0
printf "export { default } from '@anthropic-ai/sdk';\nexport * from '@anthropic-ai/sdk';\n" > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --platform=browser --target=chrome116 --minify --legal-comments=none --outfile=vendor/anthropic-sdk.mjs
```

Lisansı: `vendor/anthropic-sdk.LICENSE`.
