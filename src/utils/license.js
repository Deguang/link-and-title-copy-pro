// License / Pro-status helpers — provider-agnostic, dual-track activation.
//
// RECOMMENDED MODEL (no lock-in): the extension always verifies YOUR self-signed
// Ed25519 keys locally (offline, no secret, unaffected if any payment platform
// dies). The payment platform (Creem / Stripe / …) is just a checkout; its webhook
// triggers your key issuance (scripts/license/issue-key.mjs logic). Switching
// platforms then never touches the extension and never locks out a paid user,
// because every key is your own format.
//
// OPTIONAL second track: if you'd rather let a provider (e.g. Creem) auto-issue and
// manage its OWN license keys, the extension can validate those online. Only enable
// this with a CLIENT-SAFE validate endpoint — one that needs just the license key,
// NOT your secret API key (never embed that in a browser extension). If the
// provider requires a secret, route validation through a tiny proxy instead.
//
// Because payment is currently disabled (PAYMENT_ENABLED=false) no user has a stored
// license yet, so this storage shape can evolve freely.

import { verifyLicenseKey } from './licenseKey.mjs';

// ---- Product / self-signed verification ----
export const PRODUCT_ID = 'ltc';
// Ed25519 public key (hex) for self-signed keys. Fill via `npm run license:keygen`.
export const LICENSE_PUBLIC_KEY = '';

// ---- Storage keys ----
export const LICENSE_RECORD_KEY = 'licenseRecord'; // { key, source, plan, email, validatedAt }
export const PRO_STORAGE_KEY = 'isPro';            // dev-only override

// ---- Free tier / entry ----
export const FREE_BATCH_LIMIT = 5;
export const PRICING_URL =
  'https://app.lideguang.com/link-and-title-copy-pro/?utm_source=extension&utm_medium=popup&utm_campaign=batch_upsell#pricing';

// Master switch: while false, the paywall entry shows "coming soon" (no purchase/
// activation). Flip to true when payment goes live.
export const PAYMENT_ENABLED = false;

// ---- Optional online provider (Creem etc.) — leave URL empty to stay self-signed-only ----
// Must be a client-safe endpoint (license key only, NO secret). Adjust the request/
// response mapping in validateProviderKey() to the provider's actual API.
export const PROVIDER_VALIDATE_URL = '';     // e.g. 'https://api.creem.io/v1/licenses/validate'
export const PROVIDER_PRODUCT_ID = '';
// Grace window: an online-validated key stays "paid" this long without re-checking,
// so the provider being briefly unreachable doesn't lock users out.
export const PAID_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getLocal(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (r) => resolve(chrome.runtime.lastError ? {} : r));
    } catch {
      resolve({});
    }
  });
}

function setLocal(obj) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(obj, resolve);
    } catch {
      resolve();
    }
  });
}

// Track 1 — self-signed key, verified locally (offline).
async function verifySigned(key) {
  if (!key || !LICENSE_PUBLIC_KEY) return { valid: false, reason: 'no_pubkey' };
  return verifyLicenseKey(key, { publicKeyHex: LICENSE_PUBLIC_KEY, productId: PRODUCT_ID });
}

// Track 2 — provider-issued key, validated online. Disabled until PROVIDER_VALIDATE_URL
// is set. NOTE: confirm the request body and response fields against the provider's docs.
async function validateProviderKey(key) {
  if (!PROVIDER_VALIDATE_URL) return { valid: false, reason: 'provider_not_configured' };
  try {
    const res = await fetch(PROVIDER_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, product_id: PROVIDER_PRODUCT_ID }),
    });
    if (!res.ok) return { valid: false, reason: `http_${res.status}` };
    const data = await res.json();
    // Map provider response -> normalized shape (adjust field names to the real API).
    const valid = data.valid === true || data.status === 'active';
    return {
      valid,
      payload: valid ? { plan: data.plan || 'pro', email: data.email || data.customer_email || '' } : undefined,
      reason: valid ? undefined : (data.reason || 'invalid'),
    };
  } catch {
    return { valid: false, reason: 'network' };
  }
}

/**
 * Validate a key (self-signed first, then online provider) and store it on success.
 * @returns {Promise<{valid: boolean, reason?: string, payload?: Object}>}
 */
export async function activateLicense(key) {
  const trimmed = (key || '').trim();
  if (!trimmed) return { valid: false, reason: 'empty' };

  const signed = await verifySigned(trimmed);
  if (signed.valid) {
    await setLocal({
      [LICENSE_RECORD_KEY]: {
        key: trimmed, source: 'signed',
        plan: signed.payload?.plan, email: signed.payload?.email,
        validatedAt: Date.now(),
      },
    });
    return signed;
  }

  const provider = await validateProviderKey(trimmed);
  if (provider.valid) {
    await setLocal({
      [LICENSE_RECORD_KEY]: {
        key: trimmed, source: 'provider',
        plan: provider.payload?.plan, email: provider.payload?.email,
        validatedAt: Date.now(),
      },
    });
    return provider;
  }

  // Prefer the more informative reason.
  return provider.reason === 'provider_not_configured' ? signed : provider;
}

/**
 * Whether Pro is currently unlocked.
 * @returns {Promise<boolean>}
 */
export async function getProStatus() {
  const { [PRO_STORAGE_KEY]: devPro, [LICENSE_RECORD_KEY]: record } = await getLocal([
    PRO_STORAGE_KEY, LICENSE_RECORD_KEY,
  ]);
  if (devPro === true) return true;
  if (!record || !record.key) return false;

  if (record.source === 'signed') {
    // Offline: cheap to re-verify every time.
    return (await verifySigned(record.key)).valid;
  }

  // Provider key: trust the cached result within the grace window.
  if (record.validatedAt && Date.now() - record.validatedAt < PAID_CACHE_TTL_MS) return true;
  // Cache expired: re-validate. Keep access on transient network errors (grace).
  const res = await validateProviderKey(record.key);
  if (res.valid) {
    await setLocal({ [LICENSE_RECORD_KEY]: { ...record, validatedAt: Date.now() } });
    return true;
  }
  return res.reason === 'network' ? true : false;
}

/**
 * Stored license display info (plan/email/source) if a license is present & valid.
 * @returns {Promise<Object|null>}
 */
export async function getLicenseInfo() {
  const { [LICENSE_RECORD_KEY]: record } = await getLocal([LICENSE_RECORD_KEY]);
  if (!record || !record.key) return null;
  return (await getProStatus()) ? { plan: record.plan, email: record.email, source: record.source } : null;
}

/** Remove the stored license. */
export function clearLicense() {
  return new Promise((resolve) => chrome.storage.local.remove(LICENSE_RECORD_KEY, resolve));
}

/** Open the checkout / pricing page in a new tab. */
export function openUpgradePage() {
  chrome.tabs.create({ url: PRICING_URL });
}
