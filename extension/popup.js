// ClipTime — popup / full-page UI
import { TOOLS, stats, expandPlaceholders } from './lib/text-tools.js';
import { CONFIG } from './lib/config.js';
import { FREE_TOOLS, limitsFor } from './lib/plan.js';

const DAY = 864e5;
const RENDER_LIMIT = 300;
const DEFAULTS = { retentionDays: 30, maxItems: 200, capture: true, readSystemClipboard: true, expandSnippets: true, ignoreSites: [] };
const LANG = chrome.i18n.getUILanguage();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const t = (k, subs) => chrome.i18n.getMessage(k, subs) || k;
const send = (msg) => chrome.runtime.sendMessage(msg).catch((e) => ({ ok: false, error: String(e) }));

const state = { history: [], snippets: [], settings: { ...DEFAULTS }, filter: 'all', query: '', snipQuery: '', kb: -1, plan: { plan: 'free', status: 'none' } };
const isPro = () => state.plan.plan === 'pro';
const limits = () => limitsFor(state.plan.plan);
const isFull = new URLSearchParams(location.search).has('full');

// ---------- i18n ----------
function applyI18n() {
  document.documentElement.lang = LANG;
  for (const el of $$('[data-i18n]')) { const m = chrome.i18n.getMessage(el.dataset.i18n); if (m) el.textContent = m; }
  for (const el of $$('[data-i18n-placeholder]')) { const m = chrome.i18n.getMessage(el.dataset.i18nPlaceholder); if (m) el.placeholder = m; }
  for (const el of $$('[data-i18n-title]')) { const m = chrome.i18n.getMessage(el.dataset.i18nTitle); if (m) { el.title = m; el.setAttribute('aria-label', m); } }
  for (const o of $$('#set-retention option')) o.textContent = o.value === '0' ? t('forever') : t('nDays', [fmtNum(o.value)]);
  for (const o of $$('#set-max option')) o.textContent = fmtNum(o.value);
  const titles = { pin: 'actPin', clean: 'actClean', tools: 'actTools', delete: 'actDelete' };
  const tpl = $('#tpl-item').content;
  for (const b of $$('button[data-act]', tpl)) { b.title = t(titles[b.dataset.act]); b.setAttribute('aria-label', b.title); }
}

const nf = new Intl.NumberFormat(LANG);
const fmtNum = (n) => nf.format(Number(n));
const rtf = new Intl.RelativeTimeFormat(LANG, { numeric: 'auto', style: 'short' });
function ago(ts) {
  const s = Math.round((ts - Date.now()) / 1000);
  const a = Math.abs(s);
  if (a < 45) return t('justNow');
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

async function copyText(text, msgKey = 'copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast(t(msgKey));
}

// ---------- tabs ----------
function showTab(name) {
  for (const b of $$('.tab')) b.classList.toggle('active', b.dataset.tab === name);
  for (const p of $$('.panel')) p.classList.toggle('active', p.id === 'panel-' + name);
  if (name === 'history') $('#hist-search').focus();
  if (name === 'tools') $('#tool-text').focus();
  if (name === 'snippets' && !$('#snip-form').hidden) $('#snip-title').focus();
  try { localStorage.setItem('lastTab', name); } catch {}
}
$$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

// ---------- history ----------
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function highlight(text, q) {
  const shown = text.length > 1200 ? text.slice(0, 1200) + '…' : text;
  if (!q) return escapeHtml(shown);
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let out = '', last = 0, m;
  while ((m = re.exec(shown)) && m[0]) {
    out += escapeHtml(shown.slice(last, m.index)) + '<mark class="mark">' + escapeHtml(m[0]) + '</mark>';
    last = m.index + m[0].length;
  }
  return out + escapeHtml(shown.slice(last));
}

function visibleHistory() {
  const q = state.query.toLowerCase();
  let items = state.history;
  if (state.filter === 'pinned') items = items.filter((h) => h.pinned);
  if (q) items = items.filter((h) => h.text.toLowerCase().includes(q) || (h.url || '').toLowerCase().includes(q));
  // pinned first in "all" view
  if (state.filter === 'all' && !q) items = [...items.filter((h) => h.pinned), ...items.filter((h) => !h.pinned)];
  return items;
}

function renderHistory() {
  const list = $('#hist-list');
  const items = visibleHistory();
  const tpl = $('#tpl-item');
  const frag = document.createDocumentFragment();
  const days = Number(state.settings.retentionDays) || 0;

  items.slice(0, RENDER_LIMIT).forEach((h, i) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.dataset.id = h.id;
    li.dataset.index = i;
    li.classList.toggle('pinned', !!h.pinned);
    $('.item-text', li).innerHTML = highlight(h.text, state.query);
    const meta = [];
    meta.push(`<span>${escapeHtml(ago(h.ts))}</span>`);
    const d = host(h.url);
    if (d) meta.push(`<span class="dot">${escapeHtml(d)}</span>`);
    else if (h.source === 'system') meta.push(`<span class="dot">${escapeHtml(t('fromOtherApp'))}</span>`);
    meta.push(`<span class="dot">${escapeHtml(t('nChars', [fmtNum([...h.text].length)]))}</span>`);
    if (h.pinned) meta.push(`<span class="dot exp">${escapeHtml(t('pinnedLabel'))}</span>`);
    else if (days > 0) {
      const left = Math.ceil((h.ts + days * DAY - Date.now()) / DAY);
      if (left <= 3) meta.push(`<span class="dot exp">${escapeHtml(t('expiresIn', [fmtNum(Math.max(left, 0))]))}</span>`);
    }
    $('.item-meta', li).innerHTML = meta.join('');
    $('.pin', li).title = t(h.pinned ? 'actUnpin' : 'actPin');
    frag.appendChild(li);
  });
  list.replaceChildren(frag);

  const total = state.history.length;
  $('#hist-empty').hidden = items.length > 0;
  $('#hist-empty p').textContent = total && !items.length ? t('emptySearch') : t('emptyHistory');
  let countText = t('nItems', [fmtNum(total)]);
  if (items.length > RENDER_LIMIT) countText += ' · ' + t('showingFirst', [fmtNum(RENDER_LIMIT)]);
  $('#hist-count').textContent = countText;
  $('#paused-banner').hidden = state.settings.capture !== false;
  state.kb = Math.min(state.kb, list.children.length - 1);
  markKb();
}

function markKb() {
  const lis = $$('#hist-list .item');
  lis.forEach((li, i) => li.classList.toggle('kb', i === state.kb));
  if (lis[state.kb]) lis[state.kb].scrollIntoView({ block: 'nearest' });
}

const byId = (id) => state.history.find((h) => h.id === id);

$('#hist-list').addEventListener('click', async (e) => {
  const li = e.target.closest('.item');
  if (!li) return;
  const h = byId(li.dataset.id);
  if (!h) return;
  const act = e.target.closest('button[data-act]')?.dataset.act;
  if (!act) return copyText(h.text);
  e.stopPropagation();
  if (act === 'pin') {
    const r = await send({ type: 'clip:pin', id: h.id });
    if (r.error === 'limit') return openUpgrade('pins');
    toast(t(h.pinned ? 'unpinnedToast' : 'pinnedToast'));
  }
  if (act === 'delete') { await send({ type: 'clip:delete', id: h.id }); toast(t('deleted')); }
  if (act === 'clean') copyText(TOOLS.removeBlankLines(h.text), 'copiedClean');
  if (act === 'tools') { setToolText(h.text, true); showTab('tools'); }
});
$('#hist-list').addEventListener('dblclick', (e) => {
  const li = e.target.closest('.item');
  if (li && !e.target.closest('button')) li.classList.toggle('expanded');
});

$('#hist-search').addEventListener('input', (e) => { state.query = e.target.value.trim(); state.kb = state.query ? 0 : -1; renderHistory(); });
$('#hist-search').addEventListener('keydown', (e) => {
  const n = $$('#hist-list .item').length;
  if (e.key === 'ArrowDown') { e.preventDefault(); state.kb = Math.min(n - 1, state.kb + 1); markKb(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); state.kb = Math.max(0, state.kb - 1); markKb(); }
  else if (e.key === 'Enter') {
    const li = $$('#hist-list .item')[Math.max(0, state.kb)];
    if (li) { const h = byId(li.dataset.id); if (h) copyText(e.shiftKey ? TOOLS.removeBlankLines(h.text) : h.text, e.shiftKey ? 'copiedClean' : 'copied'); }
  }
});
$$('.chip').forEach((c) => c.addEventListener('click', () => {
  state.filter = c.dataset.filter;
  $$('.chip').forEach((x) => x.classList.toggle('active', x === c));
  renderHistory();
}));
$('#clear-btn').addEventListener('click', async () => {
  if (!state.history.some((h) => !h.pinned)) return;
  if (confirm(t('confirmClear'))) await send({ type: 'clip:clear' });
});
$('#resume-btn').addEventListener('click', () => send({ type: 'settings:save', settings: { capture: true } }));

// ---------- tools ----------
const toolText = $('#tool-text');
const undoStack = [];
function updateStats() {
  const s = stats(toolText.value);
  $('#tool-stats').textContent = t('statsLine', [fmtNum(s.chars), fmtNum(s.words), fmtNum(s.lines)]);
  $('#tool-undo').disabled = !undoStack.length;
  try { localStorage.setItem('toolDraft', toolText.value); } catch {}
}
function setToolText(v, pushUndo) {
  if (pushUndo && toolText.value && toolText.value !== v) undoStack.push(toolText.value);
  if (undoStack.length > 50) undoStack.shift();
  toolText.value = v;
  updateStats();
}
toolText.addEventListener('input', updateStats);
$$('.tool').forEach((b) => b.addEventListener('click', () => {
  const fn = TOOLS[b.dataset.tool];
  if (!fn) return;
  if (b.classList.contains('locked')) return openUpgrade('tools');
  const before = toolText.value;
  const after = fn(before);
  if (after !== before) setToolText(after, true);
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
}));
$('#tool-undo').addEventListener('click', () => { if (undoStack.length) { toolText.value = undoStack.pop(); updateStats(); } });
$('#tool-clear').addEventListener('click', () => setToolText('', true));
$('#tool-paste').addEventListener('click', async () => {
  try { const v = await navigator.clipboard.readText(); if (v) setToolText(v, true); } catch {}
});
$('#tool-copy').addEventListener('click', async () => {
  const v = toolText.value;
  if (!v.trim()) return toast(t('nothingToCopy'));
  await copyText(v);
  send({ type: 'clip:addSystem', text: v, source: 'tool' });
});
$('#tool-save-snippet').addEventListener('click', () => {
  const v = toolText.value;
  if (!v.trim()) return toast(t('nothingToCopy'));
  openSnipForm({ text: v });
  showTab('snippets');
});

// ---------- snippets ----------
function renderSnippets() {
  const q = state.snipQuery.toLowerCase();
  const items = state.snippets.filter((s) => !q || (s.title + ' ' + s.trigger + ' ' + s.text).toLowerCase().includes(q));
  const frag = document.createDocumentFragment();
  for (const s of items) {
    const li = document.createElement('li');
    li.className = 'item snip-item';
    li.tabIndex = 0;
    li.dataset.id = s.id;
    li.innerHTML = `
      <div class="item-main">
        <div class="snip-head"><b></b>${s.trigger ? '<span class="kbd"></span>' : ''}</div>
        <div class="item-text"></div>
      </div>
      <div class="item-actions">
        <button class="ia" data-act="edit" title="${escapeHtml(t('actEdit'))}"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg></button>
        <button class="ia del" data-act="delete" title="${escapeHtml(t('actDelete'))}"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/></svg></button>
      </div>`;
    $('b', li).textContent = s.title || s.text.split('\n')[0].slice(0, 60);
    if (s.trigger) $('.kbd', li).textContent = s.trigger;
    $('.item-text', li).textContent = s.text;
    frag.appendChild(li);
  }
  $('#snip-list').replaceChildren(frag);
  $('#snip-empty').hidden = items.length > 0 || !$('#snip-form').hidden;
}

function openSnipForm(s = {}) {
  $('#snip-id').value = s.id || '';
  $('#snip-title').value = s.title || '';
  $('#snip-trigger').value = s.trigger || '';
  $('#snip-text').value = s.text || '';
  $('#snip-form').hidden = false;
  $('#snip-empty').hidden = true;
  setTimeout(() => $('#snip-title').focus(), 0);
}
function closeSnipForm() { $('#snip-form').hidden = true; renderSnippets(); }

$('#snip-new').addEventListener('click', () => {
  if (state.snippets.length >= limits().snippets) return openUpgrade('snippets');
  openSnipForm();
});
$('#snip-cancel').addEventListener('click', closeSnipForm);
$('#snip-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const snippet = {
    id: $('#snip-id').value || undefined,
    title: $('#snip-title').value.trim(),
    trigger: $('#snip-trigger').value.trim(),
    text: $('#snip-text').value,
  };
  if (!snippet.text.trim()) { $('#snip-text').focus(); return; }
  const clash = snippet.trigger && state.snippets.find((s) => s.trigger === snippet.trigger && s.id !== snippet.id);
  if (clash) { toast(t('triggerTaken')); $('#snip-trigger').focus(); return; }
  const r = await send({ type: 'snippet:save', snippet });
  if (r.error === 'limit') return openUpgrade('snippets');
  toast(t('savedSnippet'));
  closeSnipForm();
});
$('#snip-search').addEventListener('input', (e) => { state.snipQuery = e.target.value.trim(); renderSnippets(); });
$('#snip-list').addEventListener('click', async (e) => {
  const li = e.target.closest('.item');
  if (!li) return;
  const s = state.snippets.find((x) => x.id === li.dataset.id);
  if (!s) return;
  const act = e.target.closest('button[data-act]')?.dataset.act;
  if (act === 'edit') return openSnipForm(s);
  if (act === 'delete') { if (confirm(t('confirmDeleteSnippet'))) { await send({ type: 'snippet:delete', id: s.id }); toast(t('deleted')); } return; }
  copyText(expandPlaceholders(s.text, LANG));
});

// ---------- settings ----------
function renderSettings() {
  const s = state.settings;
  $('#set-capture').checked = s.capture !== false;
  $('#set-system').checked = s.readSystemClipboard !== false;
  $('#set-expand').checked = s.expandSnippets !== false;
  const L = limits();
  let ret = String(s.retentionDays ?? 30);
  if (L.retentionDays > 0 && (Number(ret) === 0 || Number(ret) > L.retentionDays)) ret = String(L.retentionDays);
  if (![...$('#set-retention').options].some((o) => o.value === ret)) $('#set-retention').add(new Option(t('nDays', [fmtNum(ret)]), ret));
  $('#set-retention').value = ret;
  const max = String(Math.min(Number(s.maxItems ?? 200), L.maxItems));
  if (![...$('#set-max').options].some((o) => o.value === max)) $('#set-max').add(new Option(fmtNum(max), max));
  $('#set-max').value = max;
  if (document.activeElement !== $('#set-ignore')) $('#set-ignore').value = (s.ignoreSites || []).join('\n');
}
const saveSetting = (patch) => send({ type: 'settings:save', settings: patch });
$('#set-capture').addEventListener('change', (e) => saveSetting({ capture: e.target.checked }));
$('#set-system').addEventListener('change', (e) => saveSetting({ readSystemClipboard: e.target.checked }));
$('#set-expand').addEventListener('change', (e) => saveSetting({ expandSnippets: e.target.checked }));
function guardSelect(sel, key) {
  sel.addEventListener('change', (e) => {
    const opt = sel.selectedOptions[0];
    if (opt && opt.classList.contains('locked')) {
      renderSettings();
      return openUpgrade(key === 'retentionDays' ? 'retention' : 'items');
    }
    saveSetting({ [key]: Number(e.target.value) });
  });
}
guardSelect($('#set-retention'), 'retentionDays');
guardSelect($('#set-max'), 'maxItems');
$('#set-ignore').addEventListener('change', (e) => saveSetting({ ignoreSites: e.target.value.split(/[\n,]+/) }));

async function showShortcut() {
  try {
    const cmds = await chrome.commands.getAll();
    const c = cmds.find((x) => x.name === '_execute_action');
    $('#shortcut-now').textContent = c && c.shortcut ? c.shortcut : t('noShortcut');
  } catch {}
}
$('#open-shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

$('#export-btn').addEventListener('click', async () => {
  if (!limits().backup) return openUpgrade('backup');
  const d = await chrome.storage.local.get(['history', 'snippets', 'settings']);
  const data = { app: 'ClipTime', version: chrome.runtime.getManifest().version, exported: new Date().toISOString(), ...d };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cliptime-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
$('#import-btn').addEventListener('click', () => {
  if (!limits().backup) return openUpgrade('backup');
  // A file picker closes the toolbar popup, so import runs in a full tab
  if (!isFull) { chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?full=1#import') }); window.close(); return; }
  $('#import-file').click();
});
$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const r = await send({ type: 'data:import', data });
    if (!r.ok) throw new Error(r.error);
    toast(t('imported', [fmtNum(r.history), fmtNum(r.snippets)]));
  } catch { toast(t('importFailed')); }
});
$('#wipe-btn').addEventListener('click', async () => {
  if (confirm(t('confirmWipe'))) { await send({ type: 'data:wipe' }); toast(t('deleted')); }
});

// ---------- Pro / license ----------
const REASONS = { tools: 'upReasonTools', pins: 'upReasonPins', snippets: 'upReasonSnippets', backup: 'upReasonBackup', retention: 'upReasonRetention', items: 'upReasonItems' };
function openUpgrade(reason) {
  $('#up-reason').textContent = reason ? t(REASONS[reason] || '', [fmtNum(limits().snippets), fmtNum(limits().pins)]) : '';
  $('#up-price').textContent = priceText();
  $('#upgrade').hidden = false;
  $('#up-buy').focus();
}
const closeUpgrade = () => { $('#upgrade').hidden = true; };
$('#up-close').addEventListener('click', closeUpgrade);
$('#upgrade').addEventListener('click', (e) => { if (e.target.id === 'upgrade') closeUpgrade(); });
$('#up-have-key').addEventListener('click', () => { closeUpgrade(); showTab('settings'); $('#lic-key').focus(); });
const inBangladesh = () => LANG.startsWith('bn') || Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka';
const priceText = () => (inBangladesh() ? CONFIG.PRICE_TEXT_BD : CONFIG.PRICE_TEXT_INTL) || '';
function openBuy() {
  if (CONFIG.BUY_URL) {
    const u = new URL(CONFIG.BUY_URL);
    u.searchParams.set('lang', inBangladesh() ? 'bn' : 'en');
    u.hash = 'buy';
    chrome.tabs.create({ url: u.toString() });
  }
  else toast(t('buyNotSet'));
}
$('#up-buy').addEventListener('click', openBuy);
$('#lic-buy').addEventListener('click', openBuy);
$('#pro-pill').addEventListener('click', () => (isPro() ? showTab('settings') : openUpgrade()));

$('#lic-activate').addEventListener('click', async () => {
  const key = $('#lic-key').value.trim();
  if (!key) return $('#lic-key').focus();
  const btn = $('#lic-activate');
  btn.disabled = true;
  btn.textContent = t('checking');
  const r = await send({ type: 'license:activate', key });
  btn.disabled = false;
  btn.textContent = t('activate');
  if (r.ok) { $('#lic-key').value = ''; toast(t('licActivated')); }
  else toast(t('licErr_' + (r.error || 'format')));
  refreshPlan();
});
$('#lic-key').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#lic-activate').click(); });
$('#lic-remove').addEventListener('click', async () => {
  if (!confirm(t('licConfirmRemove'))) return;
  await send({ type: 'license:remove' });
  refreshPlan();
});

function fmtDate(ts) { return new Date(ts).toLocaleDateString(LANG, { year: 'numeric', month: 'short', day: 'numeric' }); }

function renderPlan() {
  const pro = isPro();
  const p = state.plan;
  document.body.classList.toggle('is-pro', pro);
  $('#pro-pill').title = pro ? 'ClipTime Pro' : t('upTitle');
  // lock advanced tools
  for (const b of $$('.tool')) b.classList.toggle('locked', !pro && !FREE_TOOLS.has(b.dataset.tool));
  // lock longer retention / larger history
  const L = limits();
  for (const o of $$('#set-retention option')) {
    const v = Number(o.value);
    const locked = L.retentionDays > 0 && (v === 0 || v > L.retentionDays);
    o.classList.toggle('locked', locked);
    o.textContent = (v === 0 ? t('forever') : t('nDays', [fmtNum(v)])) + (locked ? ' 🔒' : '');
  }
  for (const o of $$('#set-max option')) {
    const locked = Number(o.value) > L.maxItems;
    o.classList.toggle('locked', locked);
    o.textContent = fmtNum(o.value) + (locked ? ' 🔒' : '');
  }
  // license card
  const st = $('#lic-status');
  st.className = '';
  $('#lic-active').hidden = !p.payload || p.status === 'none';
  $('#lic-form').hidden = pro;
  $('#lic-buy').hidden = pro;
  if (pro) {
    st.className = 'ok';
    st.textContent = p.payload.x ? t('licActiveUntil', [fmtDate(p.payload.x)]) : t('licActiveLifetime');
  } else if (p.status === 'expired') { st.className = 'bad'; st.textContent = t('licErr_expired'); }
  else if (p.status === 'revoked') { st.className = 'bad'; st.textContent = t('licErr_revoked'); }
  else if (['offline', 'invalid'].includes(p.status) && p.payload) { st.className = 'bad'; st.textContent = t('licErr_' + p.status); }
  else if (!p.configured) st.textContent = t('licNotConfigured');
  else st.textContent = t('licFreeStatus', [fmtNum(L.maxItems), fmtNum(L.snippets)]);
  let owner = p.payload ? t('licOwner', [p.payload.e || '—', p.payload.i]) : '';
  if (p.payload && p.payload.src === 'intl' && p.payload.limit) owner += ' · ' + t('licDevices', [fmtNum(p.payload.usage ?? 1), fmtNum(p.payload.limit)]);
  $('#lic-owner').textContent = owner;
  renderSettings();
}

async function refreshPlan() {
  const r = await send({ type: 'plan:get' });
  if (r && r.ok) state.plan = r;
  renderPlan();
}

// ---------- data ----------
async function load() {
  const d = await chrome.storage.local.get(['history', 'snippets', 'settings']);
  state.history = d.history || [];
  state.snippets = d.snippets || [];
  state.settings = { ...DEFAULTS, ...(d.settings || {}) };
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.history) { state.history = changes.history.newValue || []; renderHistory(); }
  if (changes.snippets) { state.snippets = changes.snippets.newValue || []; renderSnippets(); }
  if (changes.license || changes.revoked) refreshPlan();
  if (changes.settings) { state.settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) }; renderSettings(); renderHistory(); }
});

async function captureSystemClipboard() {
  if (state.settings.readSystemClipboard === false || state.settings.capture === false) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim() && (!state.history[0] || state.history[0].text !== text.replace(/\r\n?/g, '\n'))) {
      await send({ type: 'clip:addSystem', text });
    }
  } catch { /* clipboard empty, not text, or no focus */ }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#upgrade').hidden) { e.preventDefault(); closeUpgrade(); return; }
  if (e.key === 'Escape' && !$('#snip-form').hidden) { e.preventDefault(); closeSnipForm(); }
});

(async function init() {
  if (isFull) document.body.classList.add('full');
  applyI18n();
  try { toolText.value = localStorage.getItem('toolDraft') || ''; } catch {}
  updateStats();
  await load();
  renderHistory();
  renderSnippets();
  renderSettings();
  await refreshPlan();
  showShortcut();
  const hash = location.hash.slice(1);
  if (hash === 'import') { showTab('settings'); toast(t('importHint')); }
  else showTab(['history', 'tools', 'snippets', 'settings'].includes(hash) ? hash : 'history');
  captureSystemClipboard();
})();
