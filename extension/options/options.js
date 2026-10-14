import {MODELS} from '../lib/models.js';
import {getSettings, h, logo, send} from '../ui/common.js';

const status = document.getElementById('status');
const fields = {
  consentWarnings: document.getElementById('consentWarnings'),
  watchChanges: document.getElementById('watchChanges'),
  aiEnabled: document.getElementById('aiEnabled'),
  apiKey: document.getElementById('apiKey'),
  model: document.getElementById('model'),
};

let statusTimer;
const say = (text) => {
  status.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ''), 2500);
};

const save = async () => {
  const settings = {
    consentWarnings: fields.consentWarnings.checked,
    watchChanges: fields.watchChanges.checked,
    aiEnabled: fields.aiEnabled.checked,
    apiKey: fields.apiKey.value.trim(),
    model: fields.model.value,
  };
  await chrome.storage.local.set({settings});
  fields.apiKey.disabled = fields.model.disabled = !settings.aiEnabled;
  say(settings.aiEnabled && !settings.apiKey ? 'Kaydedildi. Claude için bir API anahtarı girmeyi unutma.' : 'Kaydedildi.');
};

const renderClear = () => {
  const area = document.getElementById('clear-area');
  area.replaceChildren(
    h('button', {class: 'btn btn-ghost', onclick: () => {
      area.replaceChildren(
        h('span', {}, 'Tüm geçmiş silinsin mi?'),
        h('button', {class: 'btn', onclick: async () => {
          await send({type: 'clear-history'});
          renderClear();
          say('Geçmiş silindi.');
        }}, 'Evet, sil'),
        h('button', {class: 'btn btn-ghost', onclick: renderClear}, 'Vazgeç'),
      );
    }}, 'Geçmişi temizle'),
  );
};

const init = async () => {
  document.getElementById('logo').append(logo());
  fields.model.replaceChildren(...MODELS.map((m) => h('option', {value: m.id}, m.label)));
  const settings = await getSettings();
  fields.consentWarnings.checked = settings.consentWarnings;
  fields.watchChanges.checked = settings.watchChanges;
  fields.aiEnabled.checked = settings.aiEnabled;
  fields.apiKey.value = settings.apiKey;
  fields.model.value = settings.model;
  fields.apiKey.disabled = fields.model.disabled = !settings.aiEnabled;
  for (const el of Object.values(fields)) el.addEventListener('change', save);
  renderClear();
};

init();
