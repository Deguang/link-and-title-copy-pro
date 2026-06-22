// Generate an Ed25519 keypair for license signing. Run ONCE.
//
//   node scripts/license/gen-keypair.mjs
//
// - Writes the PRIVATE key to scripts/license/.private-key (gitignored). Keep it secret;
//   anyone with it can mint valid keys. Back it up somewhere safe.
// - Prints the PUBLIC key — paste it into LICENSE_PUBLIC_KEY in src/utils/license.js.

import * as ed from '@noble/ed25519';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const privPath = join(here, '.private-key');

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

if (existsSync(privPath)) {
  console.error(`✗ ${privPath} already exists. Refusing to overwrite.`);
  console.error('  Delete it manually if you really want a new keypair (invalidates all issued keys).');
  process.exit(1);
}

const priv = ed.utils.randomPrivateKey();
const pub = await ed.getPublicKeyAsync(priv);
const privHex = toHex(priv);
const pubHex = toHex(pub);

writeFileSync(privPath, privHex + '\n', { mode: 0o600 });

console.log('✓ Keypair generated.\n');
console.log('PRIVATE key  →  saved to scripts/license/.private-key (gitignored, keep secret)');
console.log('PUBLIC  key  →  paste into LICENSE_PUBLIC_KEY in src/utils/license.js:\n');
console.log(`  export const LICENSE_PUBLIC_KEY = '${pubHex}';\n`);
