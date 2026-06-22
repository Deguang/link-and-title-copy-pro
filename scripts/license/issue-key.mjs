// Manually issue a signed license key after a sale.
//
//   node scripts/license/issue-key.mjs --email buyer@example.com [--plan lifetime] [--prod ltc] [--days 365]
//
// Reads the private key from $LICENSE_PRIVATE_KEY or scripts/license/.private-key.
// Prints the license key to paste into the email reply to the buyer.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { signLicenseKey } from '../../src/utils/licenseKey.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[k] = v;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.email) {
  console.error('Usage: node scripts/license/issue-key.mjs --email buyer@example.com [--plan lifetime] [--prod ltc] [--days N]');
  process.exit(1);
}

let privHex = process.env.LICENSE_PRIVATE_KEY;
if (!privHex) {
  const privPath = join(here, '.private-key');
  if (!existsSync(privPath)) {
    console.error('✗ No private key. Set $LICENSE_PRIVATE_KEY or run gen-keypair.mjs first.');
    process.exit(1);
  }
  privHex = readFileSync(privPath, 'utf8').trim();
}

const prod = args.prod || 'ltc';
const plan = args.plan || 'lifetime';
const exp = args.days ? Math.floor(Date.now() / 1000) + Number(args.days) * 86400 : null;

const key = await signLicenseKey({
  payload: { prod, plan, email: args.email, exp },
  privateKeyHex: privHex,
});

console.log(`\nProduct : ${prod}`);
console.log(`Plan    : ${plan}`);
console.log(`Email   : ${args.email}`);
console.log(`Expires : ${exp ? new Date(exp * 1000).toISOString() : 'never (lifetime)'}`);
console.log('\nLicense key (send this to the buyer):\n');
console.log(key + '\n');
