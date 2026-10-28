// ClipTime — publisher settings. Fill these in before publishing (see README → "প্রিমিয়াম সেটআপ").
export const CONFIG = {
  // ---------- Bangladesh: bKash / Nagad → keys you create with tools/license-generator.html ----------
  // Public key from tools/license-generator.html → "1. Create key pair".
  // It is SAFE to publish this. Never put the private key anywhere in this repo.
  LICENSE_PUBLIC_KEY: null,
  // Example: { "kty": "EC", "crv": "P-256", "x": "....", "y": "...." }

  // List of cancelled CT1 license IDs, checked once a day. Leave '' to disable.
  // Example: https://raw.githubusercontent.com/<username>/cliptime/main/docs/revoked.json
  REVOKED_URL: 'https://raw.githubusercontent.com/niruvai/cliptime/main/docs/revoked.json',

  // ---------- International: card / PayPal / Apple Pay via Lemon Squeezy ----------
  // Lemon Squeezy emails the buyer a license key automatically. Leave STORE_ID null to turn this off.
  LEMON: {
    STORE_ID: null,          // number — Lemon Squeezy → Settings → Stores (the # next to your store)
    PRODUCT_IDS: [],         // numbers — product(s) that unlock Pro; empty = any product in your store
    API_BASE: 'https://api.lemonsqueezy.com',
    REVALIDATE_DAYS: 3,      // check the key online every N days
    OFFLINE_GRACE_DAYS: 21,  // keep Pro working this long without internet
  },

  // ---------- Shop ----------
  // Page where people buy a license (GitHub Pages: https://<username>.github.io/cliptime/)
  BUY_URL: 'https://niruvai.github.io/cliptime/',
  PRICE_TEXT_BD: '৳299',   // shown to users with Bangla UI / Bangladesh time zone
  PRICE_TEXT_INTL: '$4.99', // shown to everyone else
  SUPPORT_EMAIL: '',
};
