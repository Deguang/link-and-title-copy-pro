import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { processTemplate } from '../utils/templateProcessor';
import { getKeySymbols } from '../utils/shortcutFormatter';
import { getProStatus, FREE_BATCH_LIMIT, openUpgradePage, PAYMENT_ENABLED } from '../utils/license';
import { WHATS_NEW_KEY, WHATS_NEW_VERSION } from '../constant';

const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
const os =(navigator.userAgentData?.platform || navigator.platform || '').toLowerCase().includes('mac') ? 'mac' : 'windows';
const sym = getKeySymbols(os);

const t = (key, subs) => chrome.i18n.getMessage(key, subs);

function ShortcutKeys({ shortcut }) {
  if (!shortcut) return null;
  const keys = shortcut.split('+');
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-slate-400 dark:text-slate-500 text-[10px]">+</span>}
          <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 min-w-[18px] h-5 leading-none">
            {sym[k] ?? k}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

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
          className="group relative p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 space-y-1.5"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
            {config.description || `Template ${index + 1}`}
          </h3>
          <div>
            <ShortcutKeys shortcut={config.shortcut} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/50 p-1 rounded border border-slate-100 dark:border-slate-800/50">
            {processTemplate(config.template, { title: tabInfo.title || 'Example Title', url: tabInfo.url || 'https://example.com', selectedText: '' })}
          </p>
        </div>
      ))}

      {configs.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <p>{t('noConfig') || 'No configurations found.'}</p>
          <button onClick={openOptions} className="mt-2 text-blue-600 hover:underline text-sm">Configure</button>
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
  return <span className="w-4 h-4 rounded-sm flex-shrink-0 bg-slate-200 dark:bg-slate-700 inline-flex items-center justify-center text-[8px] text-slate-400">●</span>;
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
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
          {t('batchFormat')}
        </label>
        <select
          value={templateIndex}
          onChange={(e) => setTemplateIndex(Number(e.target.value))}
          className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {configs.map((c, i) => (
            <option key={i} value={i}>{c.description || `Template ${i + 1}`}</option>
          ))}
        </select>
        {previewText && (
          <pre className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded border border-slate-100 dark:border-slate-800/50 max-h-16 overflow-y-auto">
            {previewText}
          </pre>
        )}
      </div>

      {/* Select all row */}
      <div className="flex items-center justify-between mb-1 px-1">
        <button onClick={selectAll} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          {t('batchSelectAll')}
        </button>
        <span className="text-xs text-slate-400">{selectedCount}/{allTabs.length}</span>
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
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              } ${locked ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(tb.id)}
                className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
              />
              <Favicon tab={tb} />
              <span className="text-xs text-slate-700 dark:text-slate-200 truncate flex-1">{tb.title || tb.url}</span>
              {locked && <span className="text-[10px] flex-shrink-0">🔒</span>}
            </label>
          );
        })}
        {allTabs.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">{t('batchNoTabs')}</div>
        )}
      </div>

      {/* Upsell banner */}
      {overLimit && (
        <div className={`mt-2 p-2.5 rounded-lg border text-xs transition ${
          upsellFlash
            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600'
            : 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
        }`}>
          <p className="text-slate-600 dark:text-slate-300 leading-snug">
            {PAYMENT_ENABLED
              ? t('batchUpsellDesc', [String(FREE_BATCH_LIMIT)])
              : t('batchUpsellWaiting', [String(FREE_BATCH_LIMIT)])}
          </p>
          {PAYMENT_ENABLED ? (
            <button
              onClick={openUpgradePage}
              className="mt-1.5 w-full py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition"
            >
              {t('batchUpgrade')}
            </button>
          ) : (
            <div className="mt-1.5 w-full py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-center">
              ⭐ {t('licenseComingSoon')}
            </div>
          )}
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={onCopy}
        disabled={selectedCount === 0}
        className={`mt-2 w-full py-2 rounded-lg font-semibold text-sm transition ${
          copied
            ? 'bg-green-600 text-white'
            : selectedCount === 0
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
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

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
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
          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {label}{typeof count === 'number' ? ` (${count})` : ''}
      {dot && (
        <span className="absolute top-0.5 right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
      )}
    </button>
  );

  return (
    <div className="p-4 min-h-[400px] max-h-[560px] flex flex-col bg-white dark:bg-slate-900 border-t-4 border-blue-600" style={{ width: '350px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <img src="../icons/icon.webp" className="w-5 h-5 rounded" alt="Logo" />
          Link & Title Copy
        </h1>
        <button
          onClick={openOptions}
          className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
          title={t('config') || 'Settings'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 mb-3 rounded-lg bg-slate-100 dark:bg-slate-800">
        <TabButton id="current" label={t('batchCurrentTab')} />
        <TabButton id="batch" label={t('batchAllTabs')} count={allTabs.length} dot={showNewDot} />
      </div>

      {view === 'current'
        ? <CurrentTabView configs={configs} tabInfo={tabInfo} openOptions={openOptions} />
        : <BatchView configs={configs} allTabs={allTabs} isPro={isPro} />}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
        <span>v1.4.0</span>
        <div className="flex gap-3">
          <a href="https://github.com/Deguang/link-and-title-copy-pro/issues/new" target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition">{t('reportIssue') || 'Feedback'}</a>
          <a href="https://app.lideguang.com/link-and-title-copy-pro/" target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Website</a>
          <a href="https://github.com/Deguang/link-and-title-copy-pro" target="_blank" rel="noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition">GitHub</a>
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
