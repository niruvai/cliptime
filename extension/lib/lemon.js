// ClipTime — Lemon Squeezy License API client (no API key needed; the license key itself is the credential).
// Docs: https://docs.lemonsqueezy.com/api/license-api

export const isLemonKey = (key) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(key || '').trim());

async function call(apiBase, path, params) {
  let res;
  try {
    res = await fetch(apiBase.replace(/\/$/, '') + '/v1/licenses/' + path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    return { network: true };
  }
  // Server trouble / rate limit is not an answer about the key — treat like being offline
  if (res.status >= 500 || res.status === 429) return { network: true, http: res.status };
  let json = null;
  try { json = await res.json(); } catch {}
  if (!json) return { network: true, http: res.status };
  return { http: res.status, json };
}

export const lemonActivate = (apiBase, key, instanceName) => call(apiBase, 'activate', { license_key: key, instance_name: instanceName });
export const lemonValidate = (apiBase, key, instanceId) => call(apiBase, 'validate', instanceId ? { license_key: key, instance_id: instanceId } : { license_key: key });
export const lemonDeactivate = (apiBase, key, instanceId) => call(apiBase, 'deactivate', { license_key: key, instance_id: instanceId });

// Turn a Lemon Squeezy response into the fields ClipTime keeps
export function summarize(json) {
  const lk = (json && json.license_key) || {};
  const meta = (json && json.meta) || {};
  return {
    status: lk.status || 'unknown',              // inactive | active | expired | disabled
    expiresAt: lk.expires_at ? Date.parse(lk.expires_at) || 0 : 0,
    limit: lk.activation_limit ?? null,
    usage: lk.activation_usage ?? null,
    storeId: meta.store_id ?? null,
    productId: meta.product_id ?? null,
    email: meta.customer_email || '',
    name: meta.customer_name || '',
    product: [meta.product_name, meta.variant_name].filter((x) => x && x !== 'Default').join(' – '),
    error: (json && json.error) || null,
  };
}

// Is this key from the seller's own store/product?
export function belongsToUs(sum, lemonConfig) {
  if (!lemonConfig || lemonConfig.STORE_ID == null) return false;
  if (Number(sum.storeId) !== Number(lemonConfig.STORE_ID)) return false;
  const ids = (lemonConfig.PRODUCT_IDS || []).map(Number);
  return !ids.length || ids.includes(Number(sum.productId));
}
