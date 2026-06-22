// Reusable signed-license-key module (shared across projects).
//
// A license key is `base64url(payload) + "." + base64url(signature)`, where the
// signature is Ed25519 over the payload bytes. The private key signs keys (offline,
// on your machine / server); apps embed only the PUBLIC key and verify locally — so
// keys cannot be forged without the private key, and verification needs no server.
//
// payload shape: { v, prod, plan, email, iat, exp }
//   v     schema version (1)
//   prod  product id, e.g. "ltc" — apps reject keys for other products
//   plan  "pro" | "lifetime" | ...
//   email buyer email (for support / display)
//   iat   issued-at (unix seconds)
//   exp   expiry (unix seconds) or null for lifetime
//
// Works in both Node 18+ and the browser/extension (btoa/atob, TextEncoder and
// crypto.subtle are global in both). Signing is async; verification is async.

import * as ed from '@noble/ed25519';

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Sign a license payload. Used by the key-issuing CLI / server only.
 * @param {Object} opts
 * @param {Object} opts.payload - { prod, plan, email, exp? } (v/iat are filled in)
 * @param {string} opts.privateKeyHex - 32-byte Ed25519 private key, hex.
 * @returns {Promise<string>} the license key.
 */
export async function signLicenseKey({ payload, privateKeyHex }) {
  const full = {
    v: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: null,
    ...payload,
  };
  const body = bytesToB64url(enc.encode(JSON.stringify(full)));
  const sig = await ed.signAsync(enc.encode(body), privateKeyHex);
  return `${body}.${bytesToB64url(sig)}`;
}

/**
 * Verify a license key against an embedded public key. Used by apps.
 * @param {string} key - the license key string.
 * @param {Object} opts
 * @param {string} opts.publicKeyHex - 32-byte Ed25519 public key, hex.
 * @param {string} [opts.productId] - if set, key.prod must match.
 * @returns {Promise<{valid: boolean, reason?: string, payload?: Object}>}
 */
export async function verifyLicenseKey(key, { publicKeyHex, productId } = {}) {
  try {
    if (!key || typeof key !== 'string') return { valid: false, reason: 'empty' };
    const [body, sig] = key.trim().split('.');
    if (!body || !sig) return { valid: false, reason: 'malformed' };

    const ok = await ed.verifyAsync(b64urlToBytes(sig), enc.encode(body), publicKeyHex);
    if (!ok) return { valid: false, reason: 'bad_signature' };

    const payload = JSON.parse(dec.decode(b64urlToBytes(body)));
    if (productId && payload.prod !== productId) return { valid: false, reason: 'wrong_product' };
    if (payload.exp && Date.now() > payload.exp * 1000) return { valid: false, reason: 'expired' };

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'error' };
  }
}
