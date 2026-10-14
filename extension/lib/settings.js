// Kullanıcı ayarları. Service worker ve arayüz sayfaları aynı varsayılanları kullanır.
import {DEFAULT_MODEL} from './models.js';

export const DEFAULT_SETTINGS = {
  consentWarnings: true,
  watchChanges: true,
  aiEnabled: false,
  apiKey: '',
  model: DEFAULT_MODEL,
};

export const getSettings = async () => ({
  ...DEFAULT_SETTINGS,
  ...(await chrome.storage.local.get('settings')).settings,
});
