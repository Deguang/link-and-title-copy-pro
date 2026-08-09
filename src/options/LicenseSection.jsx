import React, { useState, useEffect } from 'react';
import { getLicenseInfo, activateLicense, clearLicense, openUpgradePage, PAYMENT_ENABLED } from '../utils/license';

const t = (key, subs) => chrome.i18n.getMessage(key, subs);

export default function LicenseSection() {
  const [info, setInfo] = useState(null);     // valid license payload or null
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getLicenseInfo().then(setInfo);
  }, []);

  const onActivate = async () => {
    setError('');
    setBusy(true);
    const res = await activateLicense(keyInput);
    setBusy(false);
    if (res.valid) {
      setInfo(res.payload);
      setKeyInput('');
    } else {
      setError(t('licenseInvalid') || 'Invalid license key');
    }
  };

  const onDeactivate = async () => {
    await clearLicense();
    setInfo(null);
  };

  // Payment isn't live yet. Keep the entry point visible but at footer-meta
  // weight — a full-width card advertising a feature that doesn't exist yet
  // outweighs everything that does. It becomes a real card once PAYMENT_ENABLED
  // flips (see the footer in config.jsx).
  if (!PAYMENT_ENABLED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-pro/20 px-2.5 py-1 text-xs font-medium text-warn">
        <span aria-hidden="true">★</span>
        {t('licenseComingSoon') || 'Pro · Coming soon'}
      </span>
    );
  }

  return (
    <div className="h-full rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
      {info ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="inline-flex items-center gap-1 font-semibold text-ok">
              <span>✓</span>{t('licenseActivated') || 'Pro activated'}
            </span>
            <span className="ml-2 text-ink-3">
              {info.plan}{info.email ? ` · ${info.email}` : ''}
            </span>
          </div>
          <button
            onClick={onDeactivate}
            className="flex-shrink-0 text-xs text-ink-3 transition hover:text-danger"
          >
            {t('licenseDeactivate') || 'Deactivate'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{t('licenseSectionTitle') || 'Activate Pro'}</span>
            <button onClick={openUpgradePage} className="text-xs font-medium text-accent hover:underline">
              {t('licenseBuyPro') || 'Buy Pro'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={t('licenseEnterKey') || 'Paste your license key'}
              className="flex-1 rounded-lg border border-line bg-surface text-ink px-2.5 py-1.5 font-mono text-xs outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
            <button
              onClick={onActivate}
              disabled={busy || !keyInput.trim()}
              className="flex-shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line"
            >
              {t('licenseActivate') || 'Activate'}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
