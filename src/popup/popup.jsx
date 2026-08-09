import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { processTemplate } from '../utils/templateProcessor';
import Keycap from '../components/Keycap';
import { getProStatus, FREE_BATCH_LIMIT, openUpgradePage, PAYMENT_ENABLED } from '../utils/license';
import { WHATS_NEW_KEY, WHATS_NEW_VERSION } from '../constant';
import { recordCopies } from '../utils/reviewPrompt';

const STORAGE_KEY = 'CopyTitleAndUrlConfigs';

const t = (key, subs) => chrome.i18n.getMessage(key, subs);

// Copy text to the clipboard from the popup (runs inside a user gesture).
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for environments where the async Clipboard API is unavailable.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function CurrentTabView({ configs, tabInfo, openOptions }) {
  return (
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {configs.map((config, index) => (
        <div
          key={index}
          className="group relative p-3 rounded-lg border border-line bg-surface hover:border-accent hover:shadow-md transition-all duration-200 space-y-1.5"
        >
          <h3 className="text-sm font-semibold text-ink truncate">
            {config.description || `Template ${index + 1}`}
          </h3>
          <div>
            <Keycap shortcut={config.shortcut} />
          </div>
          <p className="text-xs text-ink-2 font-mono whitespace-pre-wrap break-all bg-surface-2 p-1.5 rounded border border-line-soft">
            {processTemplate(config.template, { title: tabInfo.title || 'Example Title', url: tabInfo.url || 'https://example.com', selectedText: '' })}
          </p>
        </div>
      ))}

      {configs.length === 0 && (
        <div className="text-center py-10 text-ink-3">
          <p>{t('noConfig') || 'No configurations found.'}</p>
          <button onClick={openOptions} className="mt-2 text-accent hover:underline text-sm">Configure</button>
        </div>
      )}
    </div>
  );
}

function Favicon({ tab }) {
  const [error, setError] = useState(false);
  if (tab.favIconUrl && !error) {
    return <img src={tab.favIconUrl} onError={() => setError(true)} className="w-4 h-4 rounded-sm flex-shrink-0" alt="" />;
  }
  return <span className="w-4 h-4 rounded-sm flex-shrink-0 bg-surface-2 inline-flex items-center justify-center text-[8px] text-ink-3">●</span>;
}

function BatchView({ configs, allTabs, isPro }) {
  const [templateIndex, setTemplateIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [copied, setCopied] = useState(0);
  const [upsellFlash, setUpsellFlash] = useState(false);

  // Default selection: all tabs for Pro, the first FREE_BATCH_LIMIT for free users.
  useEffect(() => {
    const ids = allTabs.map((tb) => tb.id);
    const initial = isPro ? ids : ids.slice(0, FREE_BATCH_LIMIT);
    setSelectedIds(new Set(initial));
  }, [allTabs, isPro]);

  const overLimit = !isPro && allTabs.length > FREE_BATCH_LIMIT;
  const limit = isPro ? Infinity : FREE_BATCH_LIMIT;

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= limit) {
          setUpsellFlash(true);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const ids = allTabs.map((tb) => tb.id);
    if (selectedIds.size === Math.min(ids.length, limit)) {
      setSelectedIds(new Set());
    } else {
      if (!isPro && ids.length > limit) setUpsellFlash(true);
      setSelectedIds(new Set(isPro ? ids : ids.slice(0, limit)));
    }
  };

  const buildText = () => {
    const tpl = configs[templateIndex]?.template || '{title}\n{url}';
    return allTabs
      .filter((tb) => selectedIds.has(tb.id))
      .map((tb) => processTemplate(tpl, { title: tb.title || '', url: tb.url || '', selectedText: '' }))
      .join('\n');
  };

  const onCopy = async () => {
    if (selectedIds.size === 0) return;
    const ok = await copyText(buildText());
    if (ok) {
      const n = selectedIds.size;
      setCopied(n);
      setTimeout(() => setCopied(0), 1800);
      // Count toward the review nudge (the ask itself surfaces on the on-page toast).
      recordCopies(n).catch(() => {});
    }
  };

  const selectedCount = selectedIds.size;

  // Live preview of how one tab will look with the chosen template.
  const previewTab = allTabs.find((tb) => selectedIds.has(tb.id)) || allTabs[0];
  const previewText = previewTab
    ? processTemplate(configs[templateIndex]?.template || '{title}\n{url}', {
        title: previewTab.title || '',
        url: previewTab.url || '',
        selectedText: '',
      })
    : '';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Format selector + live preview */}
      <div className="mb-2">
        <label className="block text-xs font-semibold text-ink-2 mb-1">
          {t('batchFormat')}
        </label>
        <select
          value={templateIndex}
          onChange={(e) => setTemplateIndex(Number(e.target.value))}
          className="w-full text-sm rounded-lg border border-line bg-surface text-ink px-2 py-1.5 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
        >
          {configs.map((c, i) => (
            <option key={i} value={i}>{c.description || `Template ${i + 1}`}</option>
          ))}
        </select>
        {previewText && (
          <pre className="mt-1.5 text-[11px] leading-snug text-ink-2 font-mono whitespace-pre-wrap break-all bg-surface-2 p-1.5 rounded-lg border border-line-soft max-h-16 overflow-y-auto">
            {previewText}
          </pre>
        )}
      </div>

      {/* Select all row */}
      <div className="flex items-center justify-between mb-1 px-1">
        <button onClick={selectAll} className="text-xs text-accent hover:underline">
          {t('batchSelectAll')}
        </button>
        <span className="text-xs text-ink-3">{selectedCount}/{allTabs.length}</span>
      </div>

      {/* Tab list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {allTabs.map((tb, idx) => {
          const checked = selectedIds.has(tb.id);
          const locked = !isPro && !checked && idx >= FREE_BATCH_LIMIT;
          return (
            <label
              key={tb.id}
              className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition ${
                checked
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-ink-3'
              } ${locked ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(tb.id)}
                className="w-3.5 h-3.5 accent-accent flex-shrink-0"
              />
              <Favicon tab={tb} />
              <span className="text-xs text-ink truncate flex-1">{tb.title || tb.url}</span>
              {locked && <span className="text-[10px] flex-shrink-0">🔒</span>}
            </label>
          );
        })}
        {allTabs.length === 0 && (
          <div className="text-center py-8 text-ink-3 text-sm">{t('batchNoTabs')}</div>
        )}
      </div>

      {/* Upsell banner */}
      {overLimit && (
        <div className={`mt-2 p-2.5 rounded-lg border text-xs transition ${
          upsellFlash
            ? 'border-warn bg-warn-soft'
            : 'border-line bg-surface-2'
        }`}>
          <p className="text-ink-2 leading-snug">
            {PAYMENT_ENABLED
              ? t('batchUpsellDesc', [String(FREE_BATCH_LIMIT)])
              : t('batchUpsellWaiting', [String(FREE_BATCH_LIMIT)])}
          </p>
          {PAYMENT_ENABLED ? (
            <button
              onClick={openUpgradePage}
              className="mt-1.5 w-full py-1.5 rounded-lg bg-pro text-pro-fg font-semibold hover:brightness-95 transition"
            >
              {t('batchUpgrade')}
            </button>
          ) : (
            <div className="mt-1.5 w-full py-1.5 rounded-lg bg-surface-2 border border-line text-ink-3 font-semibold text-center">
              ⭐ {t('licenseComingSoon')}
            </div>
          )}
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={onCopy}
        disabled={selectedCount === 0}
        className={`mt-2 w-full py-2.5 rounded-lg font-semibold text-sm transition ${
          copied
            ? 'bg-ok text-surface'
            : selectedCount === 0
              ? 'bg-surface-2 text-ink-3 cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-accent-fg'
        }`}
      >
        {copied ? t('batchCopied', [String(copied)]) : `${t('batchCopyButton')} (${selectedCount})`}
      </button>
    </div>
  );
}

function Popup() {
  const [view, setView] = useState('current'); // 'current' | 'batch'
  const [configs, setConfigs] = useState([]);
  const [tabInfo, setTabInfo] = useState({ title: '', url: '' });
  const [allTabs, setAllTabs] = useState([]);
  const [isPro, setIsPro] = useState(false);
  const [showNewDot, setShowNewDot] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        setTabInfo({ title: tabs[0].title, url: tabs[0].url });
      }
    });

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setAllTabs(tabs.filter((tb) => tb.url && /^https?:/.test(tb.url)));
    });

    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY]) {
        const validConfigs = result[STORAGE_KEY].filter((c) => c && c.shortcut && c.template);
        setConfigs(validConfigs);
      }
    });

    getProStatus().then(setIsPro);

    // What's-new nudge: clear the toolbar badge on open; keep a dot on the new
    // "All Tabs" tab until the user actually visits it.
    chrome.storage.local.get(WHATS_NEW_KEY, (r) => {
      if (r[WHATS_NEW_KEY] !== WHATS_NEW_VERSION) {
        setShowNewDot(true);
        chrome.action.setBadgeText({ text: '' });
      }
    });

  }, []);

  const openOptions = () => chrome.runtime.openOptionsPage();

  const selectView = (id) => {
    setView(id);
    if (id === 'batch' && showNewDot) {
      setShowNewDot(false);
      chrome.storage.local.set({ [WHATS_NEW_KEY]: WHATS_NEW_VERSION });
    }
  };

  const TabButton = ({ id, label, count, dot }) => (
    <button
      onClick={() => selectView(id)}
      className={`relative flex-1 text-xs font-medium py-1.5 rounded-md transition ${
        view === id
          ? 'bg-surface text-accent shadow-sm'
          : 'text-ink-2 hover:text-ink'
      }`}
    >
      {label}{typeof count === 'number' ? ` (${count})` : ''}
      {dot && (
        <span className="absolute top-0.5 right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
        </span>
      )}
    </button>
  );

  return (
    <div className="p-4 min-h-[400px] max-h-[560px] flex flex-col bg-canvas border-t-2 border-brand" style={{ width: '350px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-[15px] font-bold tracking-tight text-ink flex items-center gap-2">
          <img src="/icons/icon.webp" className="w-5 h-5 rounded" alt="Logo" />
          Link & Title Copy
        </h1>
        <button
          onClick={openOptions}
          className="text-ink-3 hover:text-accent p-1.5 hover:bg-surface-2 rounded-lg transition"
          title={t('config') || 'Settings'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 mb-3 rounded-lg bg-surface-2 border border-line-soft">
        <TabButton id="current" label={t('batchCurrentTab')} />
        <TabButton id="batch" label={t('batchAllTabs')} count={allTabs.length} dot={showNewDot} />
      </div>

      {view === 'current'
        ? <CurrentTabView configs={configs} tabInfo={tabInfo} openOptions={openOptions} />
        : <BatchView configs={configs} allTabs={allTabs} isPro={isPro} />}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-line-soft flex justify-between items-center text-xs text-ink-3">
        <span>v1.7.1</span>
        <div className="flex gap-3">
          <a href="https://github.com/Deguang/link-and-title-copy-pro/issues/new" target="_blank" rel="noreferrer" className="hover:text-accent transition">{t('reportIssue') || 'Feedback'}</a>
          <a href="https://app.lideguang.com/link-and-title-copy-pro/" target="_blank" rel="noreferrer" className="hover:text-accent transition">Website</a>
          <a href="https://github.com/Deguang/link-and-title-copy-pro" target="_blank" rel="noreferrer" className="hover:text-ink-2 transition">GitHub</a>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
