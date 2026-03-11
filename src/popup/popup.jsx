import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { processTemplate } from '../utils/templateProcessor';
import { getKeySymbols } from '../utils/shortcutFormatter';

const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
const os = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase().includes('mac') ? 'mac' : 'windows';
const sym = getKeySymbols(os);

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

function Popup() {
  const [configs, setConfigs] = useState([]);

  const [tabInfo, setTabInfo] = useState({ title: '', url: '' });

  useEffect(() => {
    // 1. Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        setTabInfo({
          title: tabs[0].title,
          url: tabs[0].url
        });
      }
    });

    // 2. Get configurations
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY]) {
        // Filter out configs that are marked as 'isNew' (placeholders) unless they have content
        const validConfigs = result[STORAGE_KEY].filter(c => c && c.shortcut && c.template);
        setConfigs(validConfigs);
      }
    });

    // 3. Check for system dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="p-4 min-h-[400px] flex flex-col bg-white dark:bg-slate-900 border-t-4 border-blue-600" style={{ width: '350px' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <img src="../icons/icon.webp" className="w-5 h-5 rounded" alt="Logo" />
          Link & Title Copy
        </h1>
        <button 
          onClick={openOptions}
          className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
          title={chrome.i18n.getMessage('config') || "Settings"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      </div>

      {/* List */}
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
               <p>{chrome.i18n.getMessage('noConfig') || "No configurations found."}</p>
               <button onClick={openOptions} className="mt-2 text-blue-600 hover:underline text-sm">Configure</button>
           </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
         <span>v1.3.1</span>
         <div className="flex gap-3">
            <a href="https://github.com/Deguang/link-and-title-copy-pro/issues/new" target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition">{chrome.i18n.getMessage('reportIssue') || "Feedback"}</a>
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
