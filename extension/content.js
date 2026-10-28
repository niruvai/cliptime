// ClipTime — content script (isolated world)
// 1) records text you copy/cut on any page   2) expands ;snippet shortcuts   3) inserts text for the right-click menu
(() => {
  if (window.__cliptimeCS) return;
  window.__cliptimeCS = true;

  const MAX = 200000;
  const TEXT_INPUT = /^(text|search|url|tel|email|number)?$/i;

  const isTextField = (el) =>
    el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TEXT_INPUT.test(el.type || '')));
  const isPassword = (el) => el && el.tagName === 'INPUT' && String(el.type).toLowerCase() === 'password';

  function deepActive() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  // Returns the selected text, or null when it must not be recorded (password fields)
  function getSelectedText() {
    const el = deepActive();
    if (isPassword(el)) return null;
    if (isTextField(el)) {
      try {
        const s = el.selectionStart, e = el.selectionEnd;
        if (s != null && e > s) return el.value.slice(s, e);
      } catch {}
    }
    const sel = window.getSelection();
    return sel ? sel.toString() : '';
  }

  let alive = true;
  function send(text, source) {
    if (!alive || typeof text !== 'string' || !text.trim()) return;
    if (text.length > MAX) text = text.slice(0, MAX);
    try {
      chrome.runtime.sendMessage({ type: 'clip:add', text, source }).catch(() => {});
    } catch {
      alive = false; // extension was reloaded/updated; this old script is orphaned
    }
  }

  // ---- copy / cut capture ----
  let pending = null;
  let lastSent = { text: '', at: 0 };
  function flush() {
    const p = pending;
    pending = null;
    if (!p || p.text == null) return;
    lastSent = { text: p.text, at: Date.now() };
    send(p.text, p.kind);
  }
  function onCapture(e) {
    pending = { ev: e, kind: e.type, text: getSelectedText() };
    setTimeout(flush, 0);
  }
  function onBubble(e) {
    // If the page replaced the copied text (e.g. adds "Read more at…"), record what actually landed on the clipboard
    if (!pending || pending.ev !== e || pending.text == null) return;
    try {
      const d = e.clipboardData && e.clipboardData.getData('text/plain');
      if (e.defaultPrevented && d) pending.text = d;
    } catch {}
  }
  for (const type of ['copy', 'cut']) {
    window.addEventListener(type, onCapture, true);
    window.addEventListener(type, onBubble, false);
  }

  // Copies made through navigator.clipboard (reported by inject-main.js)
  document.addEventListener('__cliptime_write', (e) => {
    const text = typeof e.detail === 'string' ? e.detail : '';
    if (!text || (text === lastSent.text && Date.now() - lastSent.at < 1500)) return;
    if (isPassword(deepActive())) return;
    lastSent = { text, at: Date.now() };
    send(text, 'copy');
  });

  // ---- insert text into the focused field ----
  function insertText(text) {
    const el = deepActive();
    if (!el || isPassword(el)) return false;
    if (isTextField(el)) {
      el.focus();
      if (document.execCommand('insertText', false, text)) return true;
      const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
      el.setRangeText(text, s, e, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      el.focus();
      return document.execCommand('insertText', false, text);
    }
    return false;
  }

  // ---- snippet expansion (;shortcut) ----
  let snips = [], expandOn = true, loadedAt = 0, expanding = false;

  async function loadSnips(force) {
    if (!alive) return;
    if (!force && Date.now() - loadedAt < 3000) return;
    loadedAt = Date.now();
    try {
      const d = await chrome.storage.local.get(['snippets', 'settings']);
      expandOn = !(d.settings && d.settings.expandSnippets === false);
      snips = (d.snippets || [])
        .filter((s) => s && s.trigger && s.trigger.length >= 2 && s.text)
        .sort((a, b) => b.trigger.length - a.trigger.length);
    } catch {
      alive = false;
    }
  }

  function expandPlaceholders(text) {
    const now = new Date();
    return text
      .replace(/\{datetime\}/g, now.toLocaleString())
      .replace(/\{date\}/g, now.toLocaleDateString())
      .replace(/\{time\}/g, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }

  function findTrigger(before) {
    for (const s of snips) {
      if (before.endsWith(s.trigger)) {
        const prev = before.charAt(before.length - s.trigger.length - 1);
        if (!prev || /\s/.test(prev)) return s;
      }
    }
    return null;
  }

  function onInput(e) {
    if (expanding || !expandOn || !snips.length || e.isComposing) return;
    if (e.inputType && !/^insert(Text|CompositionText)?$/.test(e.inputType)) return;
    const el = e.composedPath ? e.composedPath()[0] : e.target;
    if (!el || isPassword(el)) return;

    if (isTextField(el)) {
      const pos = el.selectionStart;
      if (pos == null || pos !== el.selectionEnd) return;
      const s = findTrigger(el.value.slice(Math.max(0, pos - 40), pos));
      if (!s) return;
      expanding = true;
      try {
        el.setSelectionRange(pos - s.trigger.length, pos);
        insertText(expandPlaceholders(s.text));
      } finally { expanding = false; }
      return;
    }

    if (el.isContentEditable || (el.closest && el.closest('[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]'))) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
      const node = sel.focusNode, off = sel.focusOffset;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const s = findTrigger(node.textContent.slice(Math.max(0, off - 40), off));
      if (!s) return;
      expanding = true;
      try {
        const r = document.createRange();
        r.setStart(node, off - s.trigger.length);
        r.setEnd(node, off);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('insertText', false, expandPlaceholders(s.text));
      } finally { expanding = false; }
    }
  }

  document.addEventListener('focusin', () => loadSnips(false), true);
  document.addEventListener('input', onInput, true);

  // ---- messages from the background (context menu) ----
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return false;
    if (msg.type === 'cs:getSelection') {
      const text = getSelectedText();
      if (text) { sendResponse({ text }); }
      return false;
    }
    if (msg.type === 'cs:insert') {
      const el = deepActive();
      // Only the frame that actually has a focused editable field should answer
      if (!el || !(isTextField(el) || el.isContentEditable)) return false;
      sendResponse({ ok: insertText(String(msg.text ?? '')) });
      return false;
    }
    return false;
  });
})();
