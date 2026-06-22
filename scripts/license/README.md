# License keys (manual issuance)

Signed Ed25519 license keys. The private key signs keys on your machine; the
extension embeds only the public key and verifies offline — no server required.
Reusable across projects: each project sets its own `productId` + public key.

## One-time setup

```bash
npm run license:keygen
```

- Writes the **private key** to `scripts/license/.private-key` (gitignored — keep it
  secret, back it up; whoever has it can mint valid keys).
- Prints the **public key** — paste it into `LICENSE_PUBLIC_KEY` in
  `src/utils/license.js`, then rebuild.

## Issuing a key after a sale (manual)

When Stripe notifies you of a payment, run:

```bash
npm run license:issue -- --email buyer@example.com
# options: --plan lifetime|pro   --prod ltc   --days 365 (omit for lifetime)
```

Copy the printed key into your reply email. The buyer pastes it into the extension's
**Settings → Activate Pro** field.

## Key format

`base64url(payload).base64url(ed25519-signature)` where
`payload = { v, prod, plan, email, iat, exp }`. The extension rejects keys whose
`prod` doesn't match its `PRODUCT_ID` or whose `exp` has passed.

## Reusing for another project

1. Reuse the **same keypair** (one public key embedded everywhere) or generate a new one per project.
2. Give the project a distinct `--prod` id and set the matching `PRODUCT_ID` in that project.
3. Drop in `src/utils/licenseKey.js` and call `verifyLicenseKey`.
