import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, signLicense, verifyLicenseKey, newLicenseId } from '../extension/lib/license.js';
import { effectiveSettings, limitsFor } from '../extension/lib/plan.js';

const { privateJwk, publicJwk } = await generateKeyPair();
const other = await generateKeyPair();
const payload = (x = 0) => ({ v: 1, i: newLicenseId(), e: 'a@b.com', p: 'pro', t: Date.now(), x });

test('valid lifetime key', async () => {
  const key = await signLicense(payload(), privateJwk);
  const r = await verifyLicenseKey(key, publicJwk);
  assert.equal(r.valid, true);
  assert.equal(r.payload.e, 'a@b.com');
});

test('whitespace/newlines in pasted key are ignored', async () => {
  const key = await signLicense(payload(), privateJwk);
  const messy = '  ' + key.slice(0, 30) + '\n ' + key.slice(30) + ' \n';
  assert.equal((await verifyLicenseKey(messy, publicJwk)).valid, true);
});

test('tampered payload is rejected', async () => {
  const key = await signLicense(payload(), privateJwk);
  const [p, s] = key.slice(4).split('.');
  const forged = JSON.parse(Buffer.from(p, 'base64url').toString());
  forged.e = 'thief@x.com';
  const bad = 'CT1-' + Buffer.from(JSON.stringify(forged)).toString('base64url') + '.' + s;
  assert.equal((await verifyLicenseKey(bad, publicJwk)).reason, 'signature');
});

test('key from a different private key is rejected', async () => {
  const key = await signLicense(payload(), other.privateJwk);
  assert.equal((await verifyLicenseKey(key, publicJwk)).reason, 'signature');
});

test('expired key', async () => {
  const key = await signLicense(payload(Date.now() - 1000), privateJwk);
  assert.equal((await verifyLicenseKey(key, publicJwk)).reason, 'expired');
});

test('garbage and unconfigured', async () => {
  assert.equal((await verifyLicenseKey('hello', publicJwk)).reason, 'format');
  assert.equal((await verifyLicenseKey('CT1-abc', publicJwk)).reason, 'format');
  assert.equal((await verifyLicenseKey('CT1-x.y', null)).reason, 'nokey');
});

test('free plan clamps settings', () => {
  const s = effectiveSettings({ retentionDays: 0, maxItems: 5000 }, 'free');
  assert.equal(s.retentionDays, 30);
  assert.equal(s.maxItems, 200);
  const p = effectiveSettings({ retentionDays: 0, maxItems: 5000 }, 'pro');
  assert.equal(p.retentionDays, 0);
  assert.equal(p.maxItems, 5000);
  assert.equal(limitsFor('free').snippets, 5);
});
