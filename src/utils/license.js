// License / Pro-status helpers.
//
// Pro is unlocked by a signed license key (see licenseKey.js). The key is stored in
// chrome.storage.local under LICENSE_STORAGE_KEY and verified locally against the
// embedded public key — no server call needed. Keys are issued manually for now:
// after a Stripe payment, run scripts/license/issue-key.mjs and email the key.

import { verifyLicenseKey } from './licenseKey.mjs';

// Product id this build accepts keys for. Keep stable across versions.
export const PRODUCT_ID = 'ltc';

// Ed25519 public key (hex) used to verify license keys.
// Generate a keypair with `node scripts/license/gen-keypair.mjs` and paste the
// PUBLIC key here. While empty, no key can validate (Pro stays locked).
export const LICENSE_PUBLIC_KEY = '';

export const LICENSE_STORAGE_KEY = 'licenseKey';

// Master switch for live payment. The free limit (batch wall at FREE_BATCH_LIMIT)
// is ALWAYS enforced. While false, the Pro entry points show "coming soon" instead
// of a live purchase/activation. Flip to true to enable the Stripe buy link and
// license-key activation.
export const PAYMENT_ENABLED = false;

// Dev-only override: set chrome.storage.local {isPro:true} to force Pro while testing.
export const PRO_STORAGE_KEY = 'isPro';

// Free users can batch-copy at most this many tabs at once. Generous on purpose:
// invisible to normal use, only the heaviest power-users hit the Pro nudge. Set very
// high (e.g. 9999) to effectively make batch copy free.
export const FREE_BATCH_LIMIT = 5;

// Stripe payment link (the only third party in the loop — collects money, no licensing).
export const PRICING_URL =
  'https://app.lideguang.com/link-and-title-copy-pro/?utm_source=extension&utm_medium=popup&utm_campaign=batch_upsell#pricing';

function getLocal(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        resolve(chrome.runtime.lastError ? {} : result);
      });
    } catch {
      resolve({});
    }
  });
}

/**
 * Resolve whether the current user has Pro unlocked.
 * @returns {Promise<boolean>}
 */
export async function getProStatus() {
  const { [PRO_STORAGE_KEY]: devPro, [LICENSE_STORAGE_KEY]: key } = await getLocal([
    PRO_STORAGE_KEY,
    LICENSE_STORAGE_KEY,
  ]);
  if (devPro === true) return true;
  if (!key || !LICENSE_PUBLIC_KEY) return false;
  const res = await verifyLicenseKey(key, { publicKeyHex: LICENSE_PUBLIC_KEY, productId: PRODUCT_ID });
  return res.valid;
}

/**
 * Read the stored license payload (email/plan/exp) for display, if valid.
 * @returns {Promise<Object|null>}
 */
export async function getLicenseInfo() {
  const { [LICENSE_STORAGE_KEY]: key } = await getLocal([LICENSE_STORAGE_KEY]);
  if (!key || !LICENSE_PUBLIC_KEY) return null;
  const res = await verifyLicenseKey(key, { publicKeyHex: LICENSE_PUBLIC_KEY, productId: PRODUCT_ID });
  return res.valid ? res.payload : null;
}

/**
 * Validate and store a license key.
 * @param {string} key
 * @returns {Promise<{valid: boolean, reason?: string, payload?: Object}>}
 */
export async function activateLicense(key) {
  const res = await verifyLicenseKey(key, { publicKeyHex: LICENSE_PUBLIC_KEY, productId: PRODUCT_ID });
  if (res.valid) {
    await new Promise((resolve) => chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: key.trim() }, resolve));
  }
  return res;
}

/** Remove the stored license key. */
export function clearLicense() {
  return new Promise((resolve) => chrome.storage.local.remove(LICENSE_STORAGE_KEY, resolve));
}

/** Open the Stripe payment / pricing page in a new tab. */
export function openUpgradePage() {
  chrome.tabs.create({ url: PRICING_URL });
}
