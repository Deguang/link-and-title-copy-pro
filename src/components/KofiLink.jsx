import React from 'react';

// Ko-fi tip link. A filled pill rather than another grey footer link, so it
// reads as an action instead of meta.
export default function KofiLink({ t }) {
  return (
    <a
      href="https://ko-fi.com/deguang"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-pro px-2 py-0.5 font-semibold text-pro-fg transition hover:brightness-95"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>
      {t('supportKofi') || 'Buy me a coffee'}
    </a>
  );
}
