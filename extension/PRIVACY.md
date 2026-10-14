# Sözleşme Okuyucu Gizlilik Politikası

Bu politika, Sözleşme Okuyucu Chrome eklentisinin hangi verileri nasıl kullandığını açıklar.

## Kısaca

- Eklenti hesap açmanı istemez, seni takip etmez, analiz ya da reklam amaçlı veri toplamaz.
- Varsayılan olarak sözleşme analizi tamamen senin bilgisayarında yapılır.
- Bir sözleşme metni ancak sen yapay zeka özelliğini açıp ilgili düğmeye bastığında, senin API anahtarınla Anthropic'e gönderilir.

## Eklentinin okuduğu veriler

- **Ziyaret ettiğin sayfalar:** Eklenti, açtığın sayfalarda sözleşme bağlantılarını ("Kullanım Koşulları", "Gizlilik Politikası" gibi) ve kayıt/onay formlarını arar. Sayfa içeriği bu amaç dışında kullanılmaz ve hiçbir yere gönderilmez.
- **Sözleşme sayfaları:** Bulunan sözleşme bağlantıları, metni okumak için arka planda doğrudan sitenin kendisinden çekilir. Bu isteklerde çerezlerin ve oturum bilgilerin gönderilmez.

## Saklanan veriler

Aşağıdakiler yalnızca senin tarayıcında (`chrome.storage`) saklanır:

- Okunan sözleşmelerin adresi, metni, analiz sonucu ve değişiklik geçmişi (en fazla 60 sözleşme).
- Ayarların ve, girdiysen, Claude API anahtarın.

Bu verileri ayarlar ya da geçmiş sayfasından istediğin an silebilirsin. Eklentiyi kaldırmak da hepsini siler.

## Üçüncü taraflara gönderilen veriler

Yalnızca yapay zeka özelliği açıksa ve sen **Claude ile ayrıntılı özetle** ya da **Claude ile yanıtla**'yı kullandığında, sözleşme metni ve sorun Anthropic'in API'sine (`api.anthropic.com`) gönderilir. Bu veriler Anthropic'in kendi gizlilik politikası ve API kullanım koşullarına tabidir. Başka hiçbir üçüncü tarafa veri gönderilmez.

## İzinler ve nedenleri

| İzin | Neden |
|---|---|
| Tüm sitelere erişim | Sözleşme bağlantılarını ve onay formlarını bulmak, sözleşme sayfalarını okumak |
| `storage`, `unlimitedStorage` | Analiz sonuçlarını ve geçmişi bilgisayarında saklamak |
| `sidePanel` | Soru-cevap ve ayrıntı panelini göstermek |
| `scripting` | Eklenti kurulmadan önce açılmış sekmelerde de çalışabilmek |
| `offscreen` | Arka planda çekilen sayfanın HTML'ini ayrıştırmak |
| `alarms`, `notifications` | Sözleşmeleri günde bir kez kontrol edip değişiklikleri bildirmek |

## İletişim

Sorular için eklentiyi yayınlayan geliştiriciyle iletişime geçebilirsin.
