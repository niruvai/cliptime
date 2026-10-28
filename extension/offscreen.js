// ClipTime — offscreen document: the only place a service worker can write to the clipboard
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== 'offscreen') return false;
  if (msg.type === 'write') {
    const ta = document.getElementById('buf');
    ta.value = String(msg.text ?? '');
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.value = '';
    sendResponse({ ok });
  }
  return false;
});
