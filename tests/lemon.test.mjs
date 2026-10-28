import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLemonKey, summarize, belongsToUs } from '../extension/lib/lemon.js';

test('recognises Lemon Squeezy keys', () => {
  assert.equal(isLemonKey('38B1460A-5104-4067-A91D-77B872934D51'), true);
  assert.equal(isLemonKey(' 38b1460a-5104-4067-a91d-77b872934d51 '), true);
  assert.equal(isLemonKey('CT1-abc.def'), false);
});

test('summarize + store check', () => {
  const s = summarize({
    license_key: { status: 'active', activation_limit: 3, activation_usage: 1, expires_at: null },
    meta: { store_id: 111, product_id: 222, customer_email: 'a@b.c', product_name: 'ClipTime Pro', variant_name: 'Default' },
  });
  assert.equal(s.status, 'active');
  assert.equal(s.product, 'ClipTime Pro');
  assert.equal(belongsToUs(s, { STORE_ID: 111, PRODUCT_IDS: [222] }), true);
  assert.equal(belongsToUs(s, { STORE_ID: 111, PRODUCT_IDS: [] }), true);
  assert.equal(belongsToUs(s, { STORE_ID: 111, PRODUCT_IDS: [5] }), false);
  assert.equal(belongsToUs(s, { STORE_ID: 9 }), false);
  assert.equal(belongsToUs(s, { STORE_ID: null }), false);
});
