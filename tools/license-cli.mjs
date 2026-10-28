#!/usr/bin/env node
// ClipTime license CLI (same keys as tools/license-generator.html)
//   node tools/license-cli.mjs keygen  [--out ~/cliptime-PRIVATE-key.json]
//   node tools/license-cli.mjs issue   --key ~/cliptime-PRIVATE-key.json --email buyer@mail.com [--days 365]
//   node tools/license-cli.mjs verify  --pub '{"kty":"EC",...}' --license CT1-...
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { generateKeyPair, signLicense, verifyLicenseKey, newLicenseId } from '../extension/lib/license.js';

const [cmd, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];

if (cmd === 'keygen') {
  const out = args.out || 'cliptime-PRIVATE-key.json';
  if (existsSync(out)) { console.error(`${out} already exists — refusing to overwrite.`); process.exit(1); }
  const { privateJwk, publicJwk } = await generateKeyPair();
  writeFileSync(out, JSON.stringify({ kty: 'EC', crv: 'P-256', d: privateJwk.d, x: privateJwk.x, y: privateJwk.y }, null, 2), { mode: 0o600 });
  console.log(`Private key saved to ${out}  (keep it secret, never commit it)\n`);
  console.log('Put this in extension/lib/config.js → LICENSE_PUBLIC_KEY:\n' + JSON.stringify(publicJwk));
} else if (cmd === 'issue') {
  if (!args.key || !args.email) { console.error('Need --key and --email'); process.exit(1); }
  const priv = JSON.parse(readFileSync(args.key, 'utf8'));
  const days = Number(args.days || 0);
  const now = Date.now();
  const payload = { v: 1, i: newLicenseId(), e: args.email, p: 'pro', t: now, x: days ? now + days * 864e5 : 0 };
  console.log(await signLicense(payload, priv));
  console.error(`id=${payload.i} ${days ? `expires ${new Date(payload.x).toISOString().slice(0, 10)}` : 'lifetime'}`);
} else if (cmd === 'verify') {
  console.log(await verifyLicenseKey(args.license, JSON.parse(args.pub)));
} else {
  console.log('Usage: keygen | issue | verify  (see top of file)');
}
