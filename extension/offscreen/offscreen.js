// Service worker'ın gönderdiği HTML'i ayrıştırıp okunabilir sözleşme metnini döndürür.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message.type !== 'parse-html') return false;
  const doc = new DOMParser().parseFromString(message.html, 'text/html');
  sendResponse(globalThis.extractLegalText(doc));
  return false;
});
