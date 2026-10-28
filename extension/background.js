// ClipTime — background service worker
import { TOOLS, expandPlaceholders } from './lib/text-tools.js';
import { CONFIG } from './lib/config.js';
import { verifyLicenseKey, normalizeKey } from './lib/license.js';
import { isLemonKey, lemonActivate, lemonValidate, lemonDeactivate, summarize, belongsToUs } from './lib/lemon.js';
import { limitsFor, effectiveSettings } from './lib/plan.js';

const DAY = 24 * 60 * 60 * 1000;
const MAX_TEXT = 200_000;

export const DEFAULT_SETTINGS = {
  retentionDays: 30,       // 0 = keep forever
  maxItems: 200,
  capture: true,           // save copies made in Chrome
  readSystemClipboard: true, // when popup opens, also save what's currently on the OS clipboard
  expandSnippets: true,    // type ;shortcut to expand a snippet
  ignoreSites: [],         // hostnames where nothing is saved
};

const t = (k, subs) => chrome.i18n.getMessage(k, subs) || k;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- storage helpers (all writes go through one queue to avoid races) ----------
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

// ---------- license / plan ----------
let planCache = null;
async function getPlanInfo(force = false) {
  if (!force && planCache && Date.now() - planCache.at < 60_000) return planCache;
  const { license, revoked } = await chrome.storage.local.get(['license', 'revoked']);
  let info = { plan: 'free', status: 'none' };
  if (license && license.provider === 'lemon') {
    info = lemonPlan(license);
  } else if (license && license.key) {
    const r = await verifyLicenseKey(license.key, CONFIG.LICENSE_PUBLIC_KEY);
    if (r.valid && ((revoked && revoked.ids) || []).includes(r.payload.i)) info = { plan: 'free', status: 'revoked', payload: r.payload };
    else if (r.valid) info = { plan: 'pro', status: 'active', payload: r.payload };
    else info = { plan: 'free', status: r.reason, payload: r.payload || null };
  }
  planCache = { at: Date.now(), ...info };
  return planCache;
}

// ---- International licenses (Lemon Squeezy) ----
const lemonEnabled = () => !!(CONFIG.LEMON && CONFIG.LEMON.STORE_ID != null);

function lemonPlan(license, now = Date.now()) {
  const r = license.lemon || {};
  const payload = { src: 'intl', e: r.email || '', i: String(license.key).slice(0, 8).toUpperCase(), x: r.expiresAt || 0, usage: r.usage, limit: r.limit, product: r.product || '' };
  const grace = (CONFIG.LEMON.OFFLINE_GRACE_DAYS || 21) * DAY;
  if (!lemonEnabled()) return { plan: 'free', status: 'nokey', payload };
  if (r.status === 'disabled') return { plan: 'free', status: 'revoked', payload };
  if (r.status === 'expired' || (r.expiresAt && now > r.expiresAt)) return { plan: 'free', status: 'expired', payload };
  if (r.status !== 'active') return { plan: 'free', status: 'invalid', payload };
  if (now - (license.lastValidated || 0) > grace) return { plan: 'free', status: 'offline', payload };
  return { plan: 'pro', status: 'active', payload };
}

function instanceName() {
  const ua = navigator.userAgentData;
  const os = (ua && ua.platform) || (/Mac/.test(navigator.userAgent) ? 'macOS' : /Win/.test(navigator.userAgent) ? 'Windows' : /Linux/.test(navigator.userAgent) ? 'Linux' : 'Computer');
  return `ClipTime · Chrome on ${os} · ${new Date().toISOString().slice(0, 10)}`;
}

async function activateLemon(key) {
  if (!lemonEnabled()) return { ok: false, error: 'nokey' };
  const api = CONFIG.LEMON.API_BASE;
  const r = await lemonActivate(api, key, instanceName());
  if (r.network) return { ok: false, error: 'network' };
  const j = r.json || {};
  const sum = summarize(j);
  if (!j.activated) {
    if (/limit/i.test(j.error || '')) return { ok: false, error: 'limit' };
    if (sum.status === 'disabled') return { ok: false, error: 'revoked' };
    if (sum.status === 'expired') return { ok: false, error: 'expired' };
    return { ok: false, error: 'invalid' };
  }
  if (!belongsToUs(sum, CONFIG.LEMON)) {
    if (j.instance && j.instance.id) await lemonDeactivate(api, key, j.instance.id);
    return { ok: false, error: 'foreign' };
  }
  const now = Date.now();
  await chrome.storage.local.set({ license: { provider: 'lemon', key, instanceId: j.instance && j.instance.id, activated: now, lastValidated: now, lemon: sum } });
  planCache = null;
  return { ok: true };
}

async function revalidateLemon(force = false) {
  const { license } = await chrome.storage.local.get('license');
  if (!license || license.provider !== 'lemon' || !lemonEnabled()) return;
  const now = Date.now();
  if (!force && now - (license.lastValidated || 0) < (CONFIG.LEMON.REVALIDATE_DAYS || 3) * DAY) return;
  if (!force && now - (license.lastAttempt || 0) < 60 * 60 * 1000) return; // at most hourly when offline
  const r = await lemonValidate(CONFIG.LEMON.API_BASE, license.key, license.instanceId);
  const next = { ...license, lastAttempt: now };
  if (!r.network && r.json) {
    const sum = summarize(r.json);
    if (r.json.valid) { next.lemon = sum; next.lastValidated = now; }
    else {
      // A definite "no": refunded/disabled, expired, or this computer's activation was removed
      next.lemon = { ...(license.lemon || {}), ...sum, status: ['disabled', 'expired'].includes(sum.status) ? sum.status : 'invalid' };
      next.lastValidated = now;
    }
  }
  await chrome.storage.local.set({ license: next });
  planCache = null;
  await runPrune();
}

// Cancelled licenses: only checked when a license is installed, so free users make no network requests at all.
async function checkRevoked() {
  if (!CONFIG.REVOKED_URL) return;
  const { license } = await chrome.storage.local.get('license');
  if (!license || license.provider === 'lemon') return;
  try {
    const res = await fetch(CONFIG.REVOKED_URL, { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) return;
    const j = await res.json();
    const ids = (Array.isArray(j) ? j : j.revoked || []).map(String).slice(0, 20000);
    await chrome.storage.local.set({ revoked: { ids, fetched: Date.now() } });
    planCache = null;
    await runPrune();
  } catch {}
}

async function getAll() {
  const d = await chrome.storage.local.get(['history', 'snippets', 'settings']);
  const settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  const { plan } = await getPlanInfo();
  return {
    history: Array.isArray(d.history) ? d.history : [],
    snippets: Array.isArray(d.snippets) ? d.snippets : [],
    settings,
    plan,
    limits: limitsFor(plan),
    eff: effectiveSettings(settings, plan),
  };
}

function prune(history, settings, now = Date.now()) {
  const days = Number(settings.retentionDays) || 0;
  let out = history;
  if (days > 0) {
    const cutoff = now - days * DAY;
    out = out.filter((h) => h.pinned || h.ts >= cutoff);
  }
  const max = Math.max(50, Number(settings.maxItems) || DEFAULT_SETTINGS.maxItems);
  let unpinned = 0;
  out = out.filter((h) => h.pinned || ++unpinned <= max);
  return out;
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function isIgnored(url, settings) {
  const host = hostOf(url);
  if (!host) return false;
  return (settings.ignoreSites || []).some((s) => {
    s = String(s).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return s && (host === s || host.endsWith('.' + s));
  });
}

function addItem({ text, url = '', title = '', source = 'copy' }, { force = false } = {}) {
  return serial(async () => {
    if (typeof text !== 'string') return { ok: false };
    text = text.replace(/\r\n?/g, '\n');
    if (!text.trim()) return { ok: false };
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

    const { history, settings, eff } = await getAll();
    if (!force && !settings.capture) return { ok: false, reason: 'paused' };
    if (url && isIgnored(url, settings)) return { ok: false, reason: 'ignored' };

    const now = Date.now();
    const idx = history.findIndex((h) => h.text === text);
    let item;
    if (idx >= 0) {
      [item] = history.splice(idx, 1);
      item.ts = now;
      item.count = (item.count || 1) + 1;
      if (url) { item.url = url; item.title = title; }
    } else {
      item = { id: uid(), text, ts: now, created: now, url, title: String(title).slice(0, 200), source, pinned: false, count: 1 };
    }
    history.unshift(item);
    await chrome.storage.local.set({ history: prune(history, eff, now) });
    scheduleMenus();
    return { ok: true, id: item.id };
  });
}

function mutateHistory(fn) {
  return serial(async () => {
    const all = await getAll();
    const next = fn(all.history, all);
    if (next && next.error) return { ok: false, ...next };
    await chrome.storage.local.set({ history: prune(next, all.eff) });
    scheduleMenus();
    return { ok: true };
  });
}

function mutateSnippets(fn) {
  return serial(async () => {
    const all = await getAll();
    const next = fn(all.snippets, all);
    if (next && next.error) return { ok: false, ...next };
    await chrome.storage.local.set({ snippets: next });
    scheduleMenus();
    return { ok: true };
  });
}

function runPrune() {
  return mutateHistory((h) => h);
}

// ---------- clipboard writing from the service worker (via offscreen document) ----------
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length) return;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Write transformed text to the clipboard from the context menu.',
    });
  } catch (e) {
    if (!String(e).includes('single offscreen')) throw e;
  }
}

async function writeClipboard(text) {
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'write', text });
  return !!(res && res.ok);
}

async function flashBadge(ok = true) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: ok ? '#0f766e' : '#b91c1c' });
    await chrome.action.setBadgeText({ text: ok ? '✓' : '!' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => {}), 1500);
  } catch {}
}

// ---------- context menus ----------
const SEL_TRANSFORMS = [
  ['removeBlankLines', 'menuCopyNoBlank'],
  ['smartClean', 'menuCopyClean'],
  ['upper', 'toolUpper'],
  ['lower', 'toolLower'],
  ['title', 'toolTitle'],
  ['sentence', 'toolSentence'],
];

let menuTimer = null;
function scheduleMenus() {
  clearTimeout(menuTimer);
  menuTimer = setTimeout(() => buildMenus().catch(console.warn), 400);
}

const clip = (s, n = 42) => {
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
// '&' is an access-key marker in menu titles — escape it
const menuSafe = (s) => s.replace(/&/g, '&&');

async function buildMenus() {
  await chrome.contextMenus.removeAll();
  const { history, snippets } = await getAll();

  chrome.contextMenus.create({ id: 'sel', title: t('menuSelRoot'), contexts: ['selection'] });
  for (const [tool, key] of SEL_TRANSFORMS) {
    chrome.contextMenus.create({ id: 'sel:' + tool, parentId: 'sel', title: t(key), contexts: ['selection'] });
  }
  chrome.contextMenus.create({ id: 'sel-sep', parentId: 'sel', type: 'separator', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'sel-snippet', parentId: 'sel', title: t('menuSaveSnippet'), contexts: ['selection'] });

  chrome.contextMenus.create({ id: 'edit', title: t('menuEditRoot'), contexts: ['editable'] });
  const snips = snippets.slice(0, 30);
  if (snips.length) {
    chrome.contextMenus.create({ id: 'edit-snips', parentId: 'edit', title: t('menuSnippets'), contexts: ['editable'] });
    for (const s of snips) {
      chrome.contextMenus.create({
        id: 'snip:' + s.id,
        parentId: 'edit-snips',
        title: menuSafe(clip(s.title || s.text) + (s.trigger ? `  (${s.trigger})` : '')),
        contexts: ['editable'],
      });
    }
  } else {
    chrome.contextMenus.create({ id: 'edit-nosnips', parentId: 'edit', title: t('menuNoSnippets'), enabled: false, contexts: ['editable'] });
  }
  const recent = history.slice(0, 10);
  if (recent.length) {
    chrome.contextMenus.create({ id: 'edit-recent', parentId: 'edit', title: t('menuRecent'), contexts: ['editable'] });
    for (const h of recent) {
      chrome.contextMenus.create({ id: 'recent:' + h.id, parentId: 'edit-recent', title: menuSafe(clip(h.text)), contexts: ['editable'] });
    }
  }
}

async function selectionFromTab(info, tab) {
  // info.selectionText collapses line breaks, so ask the frame's content script for the real text
  try {
    const opts = typeof info.frameId === 'number' ? { frameId: info.frameId } : undefined;
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'cs:getSelection' }, opts);
    if (res && typeof res.text === 'string' && res.text) return res.text;
  } catch {}
  return info.selectionText || '';
}

async function insertIntoTab(info, tab, text) {
  try {
    const opts = typeof info.frameId === 'number' ? { frameId: info.frameId } : undefined;
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'cs:insert', text }, opts);
    if (res && res.ok) return true;
  } catch {}
  // Fallback: put it on the clipboard so the user can paste
  return writeClipboard(text);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);
  try {
    if (id.startsWith('sel:')) {
      const tool = id.slice(4);
      const raw = await selectionFromTab(info, tab);
      const out = TOOLS[tool] ? TOOLS[tool](raw) : raw;
      const ok = await writeClipboard(out);
      if (ok) await addItem({ text: out, url: info.pageUrl || tab?.url, title: tab?.title, source: 'menu' }, { force: true });
      flashBadge(ok);
    } else if (id === 'sel-snippet') {
      const raw = await selectionFromTab(info, tab);
      const r = await mutateSnippets((s, { limits }) => s.length >= limits.snippets ? { error: 'limit', feature: 'snippets' } : [
        { id: uid(), title: clip(raw, 40), trigger: '', text: raw, created: Date.now(), updated: Date.now() },
        ...s,
      ]);
      flashBadge(r.ok);
    } else if (id.startsWith('snip:')) {
      const { snippets } = await getAll();
      const s = snippets.find((x) => x.id === id.slice(5));
      if (s) flashBadge(await insertIntoTab(info, tab, expandPlaceholders(s.text, chrome.i18n.getUILanguage())));
    } else if (id.startsWith('recent:')) {
      const { history } = await getAll();
      const h = history.find((x) => x.id === id.slice(7));
      if (h) flashBadge(await insertIntoTab(info, tab, h.text));
    }
  } catch (e) {
    console.warn('ClipTime menu error', e);
    flashBadge(false);
  }
});

// ---------- messages ----------
async function handle(msg, sender, fromExtPage) {
  // Content scripts may only add copies; everything else must come from our own pages.
  if (msg.type === 'clip:add') {
    const url = sender.tab ? (sender.url || sender.tab.url || '') : (msg.url || '');
    return addItem({ text: msg.text, url, title: sender.tab ? sender.tab.title : msg.title, source: msg.source || 'copy' });
  }
  if (!fromExtPage) return { ok: false, error: 'forbidden' };

  switch (msg.type) {
    case 'clip:addSystem':
      return addItem({ text: msg.text, source: msg.source === 'tool' ? 'tool' : 'system' });
    case 'clip:delete':
      return mutateHistory((h) => h.filter((x) => x.id !== msg.id));
    case 'clip:pin':
      return mutateHistory((h, { limits }) => {
        const target = h.find((x) => x.id === msg.id);
        if (target && !target.pinned && h.filter((x) => x.pinned).length >= limits.pins) return { error: 'limit', feature: 'pins' };
        return h.map((x) => (x.id === msg.id ? { ...x, pinned: !x.pinned } : x));
      });
    case 'clip:edit':
      return mutateHistory((h) => h.map((x) => (x.id === msg.id && typeof msg.text === 'string' && msg.text.trim() ? { ...x, text: msg.text } : x)));
    case 'clip:clear':
      return mutateHistory((h) => (msg.includePinned ? [] : h.filter((x) => x.pinned)));
    case 'snippet:save':
      return mutateSnippets((list, { limits }) => {
        const s = msg.snippet || {};
        if (!list.some((x) => x.id === s.id) && list.length >= limits.snippets) return { error: 'limit', feature: 'snippets' };
        const clean = {
          title: String(s.title || '').slice(0, 120),
          trigger: String(s.trigger || '').replace(/\s+/g, '').slice(0, 32),
          text: String(s.text || ''),
          updated: Date.now(),
        };
        if (!clean.text.trim()) return list;
        const i = list.findIndex((x) => x.id === s.id);
        if (i >= 0) { list[i] = { ...list[i], ...clean }; return list; }
        return [{ id: uid(), created: Date.now(), ...clean }, ...list];
      });
    case 'snippet:delete':
      return mutateSnippets((list) => list.filter((x) => x.id !== msg.id));
    case 'snippet:reorder':
      return mutateSnippets((list) => {
        const order = new Map((msg.ids || []).map((id, i) => [id, i]));
        return list.slice().sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
      });
    case 'settings:save':
      return serial(async () => {
        const { settings, history, plan } = await getAll();
        const next = { ...settings, ...(msg.settings || {}) };
        next.retentionDays = Math.max(0, Math.min(3650, Number(next.retentionDays) || 0));
        next.maxItems = Math.max(50, Math.min(10000, Number(next.maxItems) || DEFAULT_SETTINGS.maxItems));
        next.ignoreSites = (next.ignoreSites || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 500);
        await chrome.storage.local.set({ settings: next, history: prune(history, effectiveSettings(next, plan)) });
        scheduleMenus();
        return { ok: true };
      });
    case 'data:import':
      return serial(async () => {
        const data = msg.data || {};
        const cur = await getAll();
        if (!cur.limits.backup) return { ok: false, error: 'limit', feature: 'backup' };
        const valid = (x) => x && typeof x.text === 'string' && x.text.trim();
        const hist = new Map(cur.history.map((h) => [h.text, h]));
        for (const h of (Array.isArray(data.history) ? data.history : []).filter(valid)) {
          if (!hist.has(h.text)) {
            hist.set(h.text, { id: uid(), text: h.text.slice(0, MAX_TEXT), ts: Number(h.ts) || Date.now(), created: Number(h.created || h.ts) || Date.now(), url: String(h.url || ''), title: String(h.title || ''), source: 'import', pinned: !!h.pinned, count: 1 });
          }
        }
        const history = [...hist.values()].sort((a, b) => b.ts - a.ts);
        const snipIds = new Set(cur.snippets.map((s) => s.text));
        const snippets = [
          ...cur.snippets,
          ...(Array.isArray(data.snippets) ? data.snippets : [])
            .filter(valid)
            .filter((s) => !snipIds.has(s.text))
            .map((s) => ({ id: uid(), title: String(s.title || ''), trigger: String(s.trigger || ''), text: s.text, created: Date.now(), updated: Date.now() })),
        ];
        await chrome.storage.local.set({ history: prune(history, cur.eff), snippets });
        scheduleMenus();
        return { ok: true, history: history.length, snippets: snippets.length };
      });
    case 'plan:get': {
      revalidateLemon().catch(() => {}); // refresh in the background if it's due
      const info = await getPlanInfo(true);
      return { ok: true, plan: info.plan, status: info.status, payload: info.payload || null, configured: !!CONFIG.LICENSE_PUBLIC_KEY || lemonEnabled() };
    }
    case 'license:activate': {
      const key = normalizeKey(msg.key);
      if (isLemonKey(key)) {
        const lr = await activateLemon(key.toLowerCase());
        if (!lr.ok) return lr;
        await runPrune();
        return { ok: true, payload: (await getPlanInfo(true)).payload };
      }
      const r = await verifyLicenseKey(key, CONFIG.LICENSE_PUBLIC_KEY);
      if (!r.valid) return { ok: false, error: r.reason };
      await chrome.storage.local.set({ license: { key, activated: Date.now() } });
      planCache = null;
      await checkRevoked();
      const info = await getPlanInfo(true);
      if (info.plan !== 'pro') return { ok: false, error: info.status };
      return { ok: true, payload: info.payload };
    }
    case 'license:remove': {
      const { license } = await chrome.storage.local.get('license');
      // Free this computer's activation slot so the key can be used elsewhere
      if (license && license.provider === 'lemon' && license.instanceId && lemonEnabled()) {
        await lemonDeactivate(CONFIG.LEMON.API_BASE, license.key, license.instanceId).catch(() => {});
      }
      await chrome.storage.local.remove('license');
      planCache = null;
      await runPrune();
      return { ok: true };
    }
    case 'data:wipe':
      return serial(async () => {
        await chrome.storage.local.set({ history: [], snippets: [] });
        scheduleMenus();
        return { ok: true };
      });
    default:
      return { ok: false, error: 'unknown' };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string' || msg.target === 'offscreen') return false;
  if (sender.id !== chrome.runtime.id) return false;
  const base = chrome.runtime.getURL('');
  const fromExtPage = !!(sender.url && sender.url.startsWith(base));
  handle(msg, sender, fromExtPage).then(
    (r) => sendResponse(r ?? { ok: true }),
    (e) => sendResponse({ ok: false, error: String(e) })
  );
  return true;
});

// ---------- lifecycle ----------
async function injectIntoOpenTabs() {
  // Content scripts only load on new page loads; inject into tabs that were already open.
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    if (tab.discarded) continue;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['inject-main.js'], world: 'MAIN' });
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] });
    } catch {}
  }
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const d = await chrome.storage.local.get(['settings', 'snippets']);
  if (!d.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  if (!d.snippets && reason === 'install') {
    await chrome.storage.local.set({
      snippets: [
        { id: uid(), title: t('sampleSnipTitle'), trigger: ';ty', text: t('sampleSnipText'), created: Date.now(), updated: Date.now() },
        { id: uid(), title: t('sampleDateTitle'), trigger: ';date', text: '{date}', created: Date.now(), updated: Date.now() },
      ],
    });
  }
  chrome.alarms.create('prune', { periodInMinutes: 360 });
  chrome.alarms.create('license', { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  await runPrune();
  await buildMenus();
  injectIntoOpenTabs().catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  revalidateLemon().catch(() => {});
  chrome.alarms.create('prune', { periodInMinutes: 360 });
  chrome.alarms.create('license', { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  await runPrune();
  await buildMenus();
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'prune') runPrune();
  if (a.name === 'license') { checkRevoked(); revalidateLemon(); }
});
