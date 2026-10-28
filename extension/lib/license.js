// ClipTime — offline license keys signed with ECDSA P-256.
// Key format:  CT1-<base64url(JSON payload)>.<base64url(signature)>
// The signature covers the base64url payload string. Only the public key ships in the extension,
// so nobody can create valid keys without the seller's private key.

const enc = new TextEncoder();
const dec = new TextDecoder();
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
export const PREFIX = 'CT1-';

export function b64urlEncode(bytes) {
  let s = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const utf8b64 = (str) => b64urlEncode(enc.encode(str));

export function normalizeKey(key) {
  return String(key || '').replace(/\s+/g, '').trim();
}

// -> { valid: true, payload } | { valid: false, reason: 'format'|'signature'|'expired'|'nokey' }
export async function verifyLicenseKey(key, publicJwk, now = Date.now()) {
  if (!publicJwk) return { valid: false, reason: 'nokey' };
  key = normalizeKey(key);
  if (!key.startsWith(PREFIX)) return { valid: false, reason: 'format' };
  const [p, s] = key.slice(PREFIX.length).split('.');
  if (!p || !s) return { valid: false, reason: 'format' };
  let payload;
  try { payload = JSON.parse(dec.decode(b64urlDecode(p))); } catch { return { valid: false, reason: 'format' }; }
  let ok = false;
  try {
    const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: publicJwk.x, y: publicJwk.y }, ALG, false, ['verify']);
    ok = await crypto.subtle.verify(SIGN, pub, b64urlDecode(s), enc.encode(p));
  } catch { ok = false; }
  if (!ok) return { valid: false, reason: 'signature' };
  if (!payload || payload.v !== 1 || !payload.i) return { valid: false, reason: 'format' };
  if (payload.x && now > payload.x) return { valid: false, reason: 'expired', payload };
  return { valid: true, payload };
}

// ---- used only by the seller's tools (tools/), never by the extension at runtime ----
export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
  return { privateJwk: priv, publicJwk: { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y } };
}

export async function signLicense(payload, privateJwk) {
  const p = utf8b64(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('jwk', { ...privateJwk, key_ops: ['sign'] }, ALG, false, ['sign']);
  const sig = await crypto.subtle.sign(SIGN, key, enc.encode(p));
  return PREFIX + p + '.' + b64urlEncode(new Uint8Array(sig));
}

export function newLicenseId() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return b64urlEncode(b);
}
