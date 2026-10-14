# Chrome Eklentisi: "Sözleşme Okuyucu"

**Amaç:** Kullanıcı bir siteye girdiğinde kullanım koşullarını, gizlilik politikasını ve benzeri sözleşmeleri bulur, okur, özetler ve riskli maddeleri gösterir. Kapsam sadece bu; reklam engelleme, VPN gibi alakasız işler yok.

## 10 Özellik

1. **Otomatik sözleşme tespiti:** Sayfada "Kullanım Koşulları", "Terms of Service", "Gizlilik Politikası", "KVKK", "Çerez Politikası" gibi bağlantıları bulur. Sözleşme varsa eklenti ikonunda rozet çıkar.

2. **Metni çekme ve temizleme:** Sözleşme sayfasını arka planda açar. Menü, footer ve reklam gibi kısımları atar, sadece metni alır.

3. **Kısa özet:** Sözleşmeyi 5–7 maddede sade Türkçeyle özetler ("Bu site verilerini üçüncü taraflarla paylaşabilir" gibi).

4. **Risk puanı:** Sözleşmeye 0–100 arası bir puan verir. Yeşil, sarı ve kırmızı renklerle gösterir.

5. **Riskli madde vurgulama:** Şu tür maddeleri işaretler: veri satışı/paylaşımı, otomatik yenilenen abonelik, tek taraflı değişiklik hakkı, dava hakkından feragat (tahkim), içerik üzerinde geniş lisans, hesap kapatma yetkisi.

6. **Orijinal metinde gösterme:** Özetteki bir maddeye tıklayınca sözleşmenin ilgili yerine gider ve orayı sarıyla vurgular.

7. **Kayıt / onay anında uyarı:** "Kabul ediyorum" kutucuğu veya "Kayıt ol" butonu görüldüğünde küçük bir uyarı kartı çıkar: "Onaylamadan önce 3 riskli madde var."

8. **Değişiklik takibi:** Daha önce okunan sözleşmenin bir özetini (hash) saklar. Site sözleşmeyi güncellerse "Koşullar değişti, farklar şunlar" diye bildirir.

9. **Soru sorma:** Kullanıcı sözleşmeye soru sorabilir ("Hesabımı silersem verilerim silinir mi?"). Cevap, sözleşmeden alıntıyla birlikte verilir.

10. **Geçmiş ve dışa aktarma:** Okunan sözleşmeleri site bazında listeler. Özet PDF veya metin olarak indirilebilir.

## Teknik Yapı (Manifest V3)

| Parça | Görevi |
|---|---|
| `content script` | Sayfadaki sözleşme linklerini ve onay kutucuklarını bulur, vurgulama yapar |
| `service worker` | Sözleşme sayfasını çeker, analiz servisine gönderir, sonucu önbelleğe alır |
| `popup` | Özet, risk puanı ve madde listesi |
| `side panel` | Soru-cevap ve detaylı görünüm |
| `chrome.storage` | Geçmiş, hash'ler, ayarlar |
| Analiz katmanı | Önce kural tabanlı anahtar kelime tarama, sonra bir yapay zeka API'si ile özet, puan ve soru-cevap |

## Yapılacaklar Listesi

### 1. Hazırlık
- [x] Hedef dili belirle (sadece Türkçe mi, Türkçe + İngilizce mi) — arayüz Türkçe, analiz Türkçe + İngilizce
- [x] Riskli madde kategorilerini ve anahtar kelime listesini yaz — `extension/lib/analyzer.js`
- [x] Yapay zeka API'sini seç, maliyet ve gizlilik politikasını netleştir — Claude, isteğe bağlı, kullanıcının kendi API anahtarıyla
- [ ] Test için 20–30 sitenin sözleşme linkini topla

### 2. İskelet
- [x] `manifest.json` (MV3) oluştur, izinleri belirle: `activeTab`, `storage`, `sidePanel`, `scripting`
- [x] Boş popup, side panel ve service worker dosyalarını kur
- [x] Eklentiyi Chrome'a "Paketlenmemiş öğe yükle" ile yükleyip test et

### 3. Tespit ve metin çekme (Özellik 1–2)
- [x] Link bulucu: metin ve URL'de anahtar kelime eşleştirme
- [x] Service worker'da `fetch` ile sayfayı çekme
- [x] Metin temizleme (Readability.js gibi bir kütüphane) — kütüphane yerine kendi çıkarıcımız: `extension/lib/extract.js`
- [x] İkon rozeti

### 4. Analiz (Özellik 3–5)
- [x] Kural tabanlı ön tarama (hızlı ve ücretsiz)
- [x] API'ye gönderilecek istemi (prompt) yaz: özet, puan ve maddeleri JSON olarak istesin
- [ ] Uzun metinleri parçalara bölme — şimdilik gerekmedi: model 1M bağlama sahip, aşırı uzun metinlerde kullanıcı uyarılıyor
- [x] Sonucu URL + hash ile önbelleğe alma

### 5. Arayüz (Özellik 6–7, 9)
- [x] Popup: puan halkası, özet ve madde listesi
- [x] Maddeye tıklayınca orijinal metinde vurgulama
- [x] Onay kutucuğu tespiti ve uyarı kartı
- [x] Side panel'de soru-cevap

### 6. Takip ve geçmiş (Özellik 8, 10)
- [x] Hash karşılaştırma ve fark çıkarma (diff)
- [x] Bildirim (`chrome.notifications`)
- [x] Geçmiş sayfası ve dışa aktarma

### 7. Test ve yayın
- [ ] Toplanan sitelerde doğruluk testi
- [x] Eklentinin kendi gizlilik politikasını yaz (metin bir sunucuya gidiyorsa bu zorunlu) — `extension/PRIVACY.md`
- [ ] Chrome Web Store geliştirici hesabı aç (tek seferlik 5 dolar ücret)
- [ ] Ekran görüntüleri, açıklama ve yayın başvurusu

---

**Önemli not:** Eklentide "Bu hukuki tavsiye değildir" uyarısı mutlaka bulunsun. Ayrıca sözleşme metnini bir sunucuya gönderiyorsan, bunu kullanıcıya açıkça söyle.
