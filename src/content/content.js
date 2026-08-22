// 直接定义常量，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
import { processTemplate } from '../utils/templateProcessor';
import { matchShortcut } from '../utils/shortcutMatch.mjs';



function getSelectedText() {
  // 获取当前选中的文本
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }

  // 尝试从活动元素获取选中文本（处理输入框等）
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    if (start !== end) {
      return activeElement.value.substring(start, end).trim();
    }
  }

  return '';
}

// processTemplate 已移至 ../utils/templateProcessor.js

import { showToast } from './toast';

// Load configurations from storage
let shortcuts = [];

// When the extension updates or reloads, content scripts already running in open
// tabs are orphaned: `chrome` survives but its API objects are torn out, so
// `chrome.storage.local` throws "Cannot read properties of undefined". Chrome
// injects a fresh script into those tabs, but the stale one can still run a
// queued callback first. Checking runtime.id is the standard liveness test.
function isContextAlive() {
  try {
    return Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
  } catch {
    return false;
  }
}

function loadShortcuts() {
  if (!isContextAlive()) return;
  try {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      // lastError must be read, or Chrome logs it as unchecked.
      if (chrome.runtime.lastError || !result?.[STORAGE_KEY]) return;

      // Map to include original index
      shortcuts = result[STORAGE_KEY].map((c, i) => ({ ...c, originalIndex: i })).filter(c => c && c.shortcut);
    });
  } catch { /* orphaned between the check and the call */ }
}

// Initial load
loadShortcuts();

// Listen for storage changes to update shortcuts dynamically
if (isContextAlive()) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[STORAGE_KEY]) {
      loadShortcuts();
    }
  });
}

// Rolling log of copies that did NOT succeed on the primary clipboard path. Stays
// LOCAL (chrome.storage.local) — never transmitted. It's only ever read when the
// user chooses to file a report (see the background's reportCopyIssue handler).
const COPY_ISSUE_LOG_KEY = 'copyIssueLog';
function recordCopyIssue(tier, errorName) {
  if (!isContextAlive()) return;
  try {
    chrome.storage.local.get(COPY_ISSUE_LOG_KEY, (r) => {
      if (chrome.runtime.lastError) return;
      const log = Array.isArray(r[COPY_ISSUE_LOG_KEY]) ? r[COPY_ISSUE_LOG_KEY] : [];
      log.push({ tier, error: errorName || '', domain: location.hostname, ts: Date.now() });
      chrome.storage.local.set({ [COPY_ISSUE_LOG_KEY]: log.slice(-5) });
    });
  } catch { /* stale context — ignore */ }
}


// Keyboard shortcut handler. Named (not an inline listener) so injection can be
// made idempotent — see initContentScript(): a fresh injection after an extension
// update unbinds the stale handler and binds this live one.
function handleKeydown(e) {
  // Prevent repeat triggers while holding key
  if (e.repeat) return;

  // Ignore if user is typing in an input field
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
    return;
  }

  // If no main key (just modifiers), return
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const matchedConfig = matchShortcut(e, shortcuts, { isMac });

  if (matchedConfig) {
    console.log('Shortcut matched:', matchedConfig.shortcut);
    e.preventDefault();
    e.stopPropagation();

    // Trigger copy
    // We send a message to background to handle the "Copy" logic purely?
    // actually, background.js 'copyToClipboard(index)' relies on existing tabs.
    // It's better if WE (content script) ask background to process the template for us,
    // OR we trigger the copy flow.
    // Let's reuse the existing flow: send message to background saying "Copy Config X"
    
    // Find the index of this config in the full list? 
    // Wait, the 'shortcuts' array is filtered. We need the original index or pass the template directly.
    // Background's 'copyToClipboard(index)' expects an index in the FULL storage array.
    // Let's modify the loadShortcuts to keep track of original index.
    // A content script that outlived an extension update has an invalidated
    // context; chrome.runtime.id goes undefined and sendMessage throws
    // "Extension context invalidated". Bail quietly — the background re-injects a
    // fresh script (see ensureContentScript) so the next keypress works.
    if (!chrome.runtime?.id) return;
    try {
      chrome.runtime.sendMessage({
        action: 'triggerCopyByIndex',
        index: matchedConfig.originalIndex
      });
    } catch (err) {
      console.warn('[Content] Copy trigger failed (stale context?):', err);
    }
  }
}

function copyToClipboard(template, overrideTitle, overrideUrl) {
  const processedText = processTemplate(template, {
    title: overrideTitle || document.title,
    url: overrideUrl || window.location.href,
    selectedText: getSelectedText()
  });

  // Error name from the primary (navigator.clipboard) attempt, carried into the
  // local issue log so a report can show why the primary path failed.
  let primaryError = '';

  // 优先使用更可靠的复制方法
  function fallbackCopyTextToClipboard(text) {
    // Save current selection
    const activeElement = document.activeElement;
    const selection = document.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    const textArea = document.createElement("textarea");
    textArea.value = text;

    // 避免滚动到底部
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.style.zIndex = "-1";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showSuccessMessage();
        recordCopyIssue('execCommand', primaryError);
      } else {
        copyViaBackground();
      }
    } catch (err) {
      console.debug('Fallback execCommand blocked, delegating to offscreen:', err?.name || err);
      copyViaBackground();
    }

    document.body.removeChild(textArea);

    // Restore selection
    if (activeElement) activeElement.focus();
    if (range) {
       selection.removeAllRanges();
       selection.addRange(range);
    }
  }

  function showSuccessMessage() {
    if (!isContextAlive()) return;
    // Send message to background to show toast (Background will route it to Top Frame)
    const toastMessage = chrome.i18n.getMessage('toastCopied');
    chrome.runtime.sendMessage({
        action: 'showToastRequest',
        message: toastMessage || 'Copied to Clipboard!',
        contentPreview: processedText,
        success: true // marks a real copy so it counts toward the review nudge
    });
  }

  function showErrorMessage() {
     if (!isContextAlive()) return;
     chrome.runtime.sendMessage({
        action: 'showToastRequest',
        message: chrome.i18n.getMessage('toastFailed') || 'Copy Failed',
        failed: true // ask the toast to offer a "Report problem" action
    });
  }

  // Last resort when both in-page methods are blocked (e.g. a page Permissions-
  // Policy disabling the Clipboard API — crbug.com/414348233). The background
  // writes via its offscreen document, which the page's policy cannot touch.
  function copyViaBackground() {
    if (!isContextAlive()) { showErrorMessage(); return; }
    try {
      chrome.runtime.sendMessage({ action: 'copyViaOffscreen', text: processedText }, (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.success) {
          showErrorMessage();
          recordCopyIssue('failed', primaryError);
        } else {
          showSuccessMessage();
          recordCopyIssue('offscreen', primaryError);
        }
      });
    } catch {
      showErrorMessage();
      recordCopyIssue('failed', primaryError);
    }
  }

  // 检查是否支持现代剪贴板API并且文档有焦点
  if (navigator.clipboard && window.isSecureContext) {
    if (document.hasFocus()) {
      navigator.clipboard.writeText(processedText).then(() => {
        showSuccessMessage();
      }).catch(err => {
        primaryError = err?.name || String(err);
        console.debug('Clipboard API blocked, using fallback:', primaryError);
        fallbackCopyTextToClipboard(processedText);
      });
    } else {
      fallbackCopyTextToClipboard(processedText);
    }
  } else {
    fallbackCopyTextToClipboard(processedText);
  }
}

// Message handler (from background). Named for the same idempotency reason.
function handleMessage(message, sender, sendResponse) {
  try {
    if (message.action === 'ping') {
      // Liveness probe from the background's self-heal check.
      sendResponse({ alive: true });
      return true;
    } else if (message.action === 'copyToClipboard') {
      // A copy addressed to the whole tab reaches every frame in it, and a frame
      // with no override falls back to its own location — which for a hidden
      // iframe embedded by a payment or analytics script is not the page the
      // user is looking at. Senders are expected to name a frame and pass the
      // tab's title and URL; refusing the unqualified case here means a caller
      // that forgets cannot put an iframe's URL on the clipboard.
      if (window.top !== window && !message.url) {
        sendResponse({ success: false, error: 'subframe without page context' });
        return true;
      }

      const config = shortcuts.find(c => c.originalIndex === message.templateIndex);
      
      if (config && config.template) {
        // Use overrides from message if present (for iframe support)
        copyToClipboard(config.template, message.title, message.url);
        sendResponse({ success: true });
      } else {
        console.error('Invalid template index or missing template:', message.templateIndex);
        sendResponse({ success: false, error: 'Invalid configuration' });
      }
    } else if (message.action === 'showToast') {
      let review = null;
      if (message.review) {
        // Attach localized labels here (content script has i18n) so toast.js
        // stays free of translation concerns.
        review = {
          reviewUrl: message.review.reviewUrl,
          storeUrl: message.review.storeUrl,
          prompt: chrome.i18n.getMessage('reviewPrompt', [String(message.review.count || '')]) || 'Enjoying the extension?',
          reviewLabel: chrome.i18n.getMessage('reviewCta') || '⭐ Rate it',
          shareLabel: chrome.i18n.getMessage('reviewShare') || '🔗 Share',
          laterLabel: chrome.i18n.getMessage('reviewLater') || 'Later',
          gotItLabel: chrome.i18n.getMessage('reviewGotIt') || 'Got it',
          dontAskAgainLabel: chrome.i18n.getMessage('reviewDontAskAgain') || "Don't ask again",
          lastAsk: !!message.review.lastAsk,
          sharedMsg: chrome.i18n.getMessage('reviewShared') || 'Copied! Now paste it to a friend to share.',
          // Persuasive blurb copied to the clipboard on share (the store link is
          // appended by the toast), so pasting it anywhere actually sells the tool.
          shareText: chrome.i18n.getMessage('reviewShareText') || '',
        };
      }
      let report = null;
      if (message.report) {
        report = { label: chrome.i18n.getMessage('reportProblem') || 'Report problem' };
      }
      showToast(message.message || 'Copied!', message.contentPreview, { review, report });
      sendResponse({ success: true });
    } else if (message.action === 'getPageInfo') {
      // 返回页面信息用于预览
      const selectedText = getSelectedText();
      sendResponse({
        success: true,
        data: {
          title: document.title,
          url: window.location.href,
          selectedText: selectedText,
          hasSelection: !!selectedText
        }
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }

  return true;
}

// Reserved for future selection-driven behavior. Named so it can be re-bound cleanly.
function handleSelectionChange() {}

// Idempotent install. Safe to run again after a self-heal re-injection: the page's
// window still holds the previous handler refs (even when that script's context is
// dead), so we unbind the stale DOM listeners before binding fresh, live ones. The
// old context's chrome.runtime.onMessage listener is auto-removed by Chrome, so we
// only need to (re)add ours.
function initContentScript() {
  if (window.__ltcKeydown) window.removeEventListener('keydown', window.__ltcKeydown, true);
  if (window.__ltcSelChange) document.removeEventListener('selectionchange', window.__ltcSelChange);

  window.__ltcKeydown = handleKeydown;
  window.addEventListener('keydown', handleKeydown, true); // capture phase — get it first

  window.__ltcSelChange = handleSelectionChange;
  document.addEventListener('selectionchange', handleSelectionChange);

  // Guarded because this runs again on `load`, and a script that outlived an
  // extension update has no chrome.runtime left to register against — reaching
  // for onMessage there throws before the page ever gets a listener.
  //
  // Idempotent within a live context too: removeListener is a safe no-op when the
  // handler isn't registered, so a re-run can never double-bind (which would
  // double-copy). That is what makes the load-time retry below safe.
  if (isContextAlive()) {
    try {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.runtime.onMessage.addListener(handleMessage);
    } catch { /* orphaned between the check and the call */ }
  }

  window.hasLinkTitleCopyProContentScript = true;
}

initContentScript();

// Belt-and-suspenders: if the document_start setup didn't complete for any reason,
// re-run once the page finishes loading. initContentScript is fully idempotent, so
// this can never double-bind. (Pages that never fire 'load' don't need it — the
// listener is already armed from document_start.)
if (document.readyState !== 'complete') {
  window.addEventListener('load', initContentScript, { once: true });
}

console.log('Enhanced content script loaded with text selection support');