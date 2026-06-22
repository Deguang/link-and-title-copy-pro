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

  // Payment not live yet: show a "coming soon" waiting entry, free mode otherwise.
  if (!PAYMENT_ENABLED) {
    return (
      <div className="mt-4 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex-shrink-0 flex items-center justify-center gap-2 text-sm text-gray-500">
        <span>⭐</span>
        <span className="font-medium">{t('licenseComingSoon') || 'Pro · Coming soon'}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 rounded-lg border border-gray-200 bg-white flex-shrink-0">
      {info ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="inline-flex items-center gap-1 font-semibold text-green-600">
              <span>✓</span>{t('licenseActivated') || 'Pro activated'}
            </span>
            <span className="text-gray-500 ml-2">
              {info.plan}{info.email ? ` · ${info.email}` : ''}
            </span>
          </div>
          <button
            onClick={onDeactivate}
            className="text-xs text-gray-400 hover:text-red-500 transition flex-shrink-0"
          >
            {t('licenseDeactivate') || 'Deactivate'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('licenseSectionTitle') || 'Activate Pro'}</span>
            <button onClick={openUpgradePage} className="text-xs text-blue-600 hover:underline">
              {t('licenseBuyPro') || 'Buy Pro'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={t('licenseEnterKey') || 'Paste your license key'}
              className="flex-1 text-xs font-mono rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-blue-500"
            />
            <button
              onClick={onActivate}
              disabled={busy || !keyInput.trim()}
              className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
            >
              {t('licenseActivate') || 'Activate'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
