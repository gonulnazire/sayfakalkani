# btk_akademi

| Klasör | İçerik |
|---|---|
| `extension/` | **Sözleşme Okuyucu** Chrome eklentisi. Ayrıntılar: [`extension/README.md`](extension/README.md) |
| `react/` | Eklentinin 60 saniyelik Remotion tanıtım videosu (`npm run dev`, `npm run render:browser`) |
| `docs/` | Eklentinin planı |

## Eklentiyi Chrome'da açmak

1. Chrome'da `chrome://extensions` adresine git.
2. Sağ üstten **Geliştirici modu**'nu aç.
3. **Paketlenmemiş öğe yükle**'ye bas ve **bu klasörü (`btk_akademi`)** seç. Klasörün içinde `manifest.json` görünmeli.
4. Araç çubuğundaki yapboz simgesinden **Sözleşme Okuyucu**'yu sabitle.

Kökteki `manifest.json`, eklenti dosyalarını `extension/` klasöründen okur. İstersen doğrudan `extension` klasörünü de seçebilirsin; ikisinden yalnızca birini yükle.
