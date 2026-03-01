#!/usr/bin/env node

/**
 * Sync version number from package.json to all other locations:
 *   - public/manifest.json
 *   - docs/i18n/*.json (badge text)
 *   - src/popup/popup.jsx
 *   - docs/*.html (rebuilt via docs/build-pages.js)
 *
 * Usage: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Read version from package.json (single source of truth)
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

console.log(`\n🔄 Syncing version: v${version}\n`);

// 1. Update public/manifest.json
const manifestPath = path.join(ROOT, 'public/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== version) {
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('  ✓ public/manifest.json');
} else {
  console.log('  – public/manifest.json (already up to date)');
}

// 2. Update docs/i18n/*.json — replace version prefix in badge field
const LOCALES = ['en', 'zh', 'zh-TW', 'ja', 'ru', 'hi'];
for (const locale of LOCALES) {
  const filePath = path.join(ROOT, 'docs/i18n', `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const badge = data.hero && data.hero.badge;
  if (typeof badge === 'string') {
    const updated = badge.replace(/v\d+\.\d+\.\d+/, `v${version}`);
    if (updated !== badge) {
      data.hero.badge = updated;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✓ docs/i18n/${locale}.json`);
    } else {
      console.log(`  – docs/i18n/${locale}.json (already up to date)`);
    }
  }
}

// 3. Update src/popup/popup.jsx — replace hardcoded version in <span>
const popupPath = path.join(ROOT, 'src/popup/popup.jsx');
const popupSrc = fs.readFileSync(popupPath, 'utf8');
const popupUpdated = popupSrc.replace(
  /(<span>)v\d+\.\d+\.\d+(<\/span>)/,
  `$1v${version}$2`
);
if (popupUpdated !== popupSrc) {
  fs.writeFileSync(popupPath, popupUpdated);
  console.log('  ✓ src/popup/popup.jsx');
} else {
  console.log('  – src/popup/popup.jsx (already up to date)');
}

// 4. Rebuild docs HTML pages from updated i18n files
console.log('');
execSync('node docs/build-pages.js', { cwd: ROOT, stdio: 'inherit' });

console.log('✅ Version sync complete!\n');
