// ClipTime — runs in the page's own JS world.
// Many sites' "Copy" buttons use navigator.clipboard.writeText(), which fires no `copy` event.
// We wrap it (without changing its behaviour) and tell our content script what was copied.
(() => {
  if (window.__cliptimeMain) return;
  window.__cliptimeMain = true;
  const C = window.Clipboard && window.Clipboard.prototype;
  if (!C) return;

  const emit = (text) => {
    if (typeof text !== 'string' || !text) return;
    try { document.dispatchEvent(new CustomEvent('__cliptime_write', { detail: text.slice(0, 200000) })); } catch {}
  };

  const origWriteText = C.writeText;
  if (typeof origWriteText === 'function') {
    C.writeText = function (data) {
      const p = origWriteText.apply(this, arguments);
      Promise.resolve(p).then(() => emit(String(data)), () => {});
      return p;
    };
  }

  const origWrite = C.write;
  if (typeof origWrite === 'function') {
    C.write = function (items) {
      const p = origWrite.apply(this, arguments);
      Promise.resolve(p).then(async () => {
        try {
          for (const item of items || []) {
            if (item && item.types && item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              emit(await blob.text());
              break;
            }
          }
        } catch {}
      }, () => {});
      return p;
    };
  }
})();
