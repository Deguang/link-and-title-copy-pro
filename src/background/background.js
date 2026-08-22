// 直接定义常量和默认配置，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
import { processTemplate } from '../utils/templateProcessor';
import { WHATS_NEW_KEY, WHATS_NEW_VERSION } from '../constant';
import {
  recordCopies,
  shouldPromptReview,
  markReviewDone,
  REVIEW_URL,
  STORE_URL,
} from '../utils/reviewPrompt';

// No analytics. This extension does not collect, store, or transmit usage data —
// everything happens locally, matching the stated privacy policy.

function getDefaultConfigs() {
  const descPlain = chrome.i18n.getMessage('defaultDescPlain') || 'Copy selected text (or title) and URL';
  const descMarkdown = chrome.i18n.getMessage('defaultDescMarkdown') || 'Copy as Markdown link';
  const descSmart = chrome.i18n.getMessage('defaultDescSmart') || 'Smart copy with quotes for selected text';
  const descClean = chrome.i18n.getMessage('defaultDescClean') || 'Clean link, tracking removed';

  return [
    {
      windows: { shortcut: 'Ctrl+Shift+P', template: '{selectedText|title}\n{url}', description: descPlain },
      mac:     { shortcut: 'Command+Shift+P', template: '{selectedText|title}\n{url}', description: descPlain },
      linux:   { shortcut: 'Ctrl+Shift+P', template: '{selectedText|title}\n{url}', description: descPlain }
    },
    {
      windows: { shortcut: 'Ctrl+Shift+L', template: '[{selectedText|title}]({url})', description: descMarkdown },
      mac:     { shortcut: 'Command+Shift+L', template: '[{selectedText|title}]({url})', description: descMarkdown },
      linux:   { shortcut: 'Ctrl+Shift+L', template: '[{selectedText|title}]({url})', description: descMarkdown }
    },
    {
      windows: { shortcut: 'Ctrl+Shift+U', template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}', description: descSmart },
      mac:     { shortcut: 'Command+Shift+U', template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}', description: descSmart },
      linux:   { shortcut: 'Ctrl+Shift+U', template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}', description: descSmart }
    },
    // Shipped without a shortcut: four defaults is already a lot of keys to
    // claim, and this one is reached from the popup or the context menu. New
    // installs only — setupDefaultConfigs leaves existing setups alone.
    {
      windows: { shortcut: '', template: '{url:notrack}', description: descClean },
      mac:     { shortcut: '', template: '{url:notrack}', description: descClean },
      linux:   { shortcut: '', template: '{url:notrack}', description: descClean }
    }
  ];
}

let configuredShortcuts = [];

function getPlatform() {
  return new Promise((resolve) => {
    if (chrome.runtime.getPlatformInfo) {
      chrome.runtime.getPlatformInfo((info) => {
        switch (info.os) {
          case 'mac':
            resolve('mac');
            break;
          case 'win':
            resolve('windows');
            break;
          case 'linux':
            resolve('linux');
            break;
          default:
            resolve('windows');
        }
      });
    } else {
      const platformInfo = navigator.platform.toLowerCase();
      if (platformInfo.includes('win')) resolve('windows');
      else if (platformInfo.includes('mac')) resolve('mac');
      else if (platformInfo.includes('linux')) resolve('linux');
      else resolve('windows');
    }
  });
}

async function setupDefaultConfigs() {
  try {
    const platform = await getPlatform();

    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error reading storage:', chrome.runtime.lastError);
        return;
      }

      if (!result[STORAGE_KEY] || !Array.isArray(result[STORAGE_KEY]) || result[STORAGE_KEY].length === 0) {
        const platformConfigs = getDefaultConfigs().map(config => {
          return config[platform] || config.windows;
        });

        chrome.storage.local.set({ [STORAGE_KEY]: platformConfigs }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error setting default configs:', chrome.runtime.lastError);
          } else {
            console.log(`Default configurations for ${platform} have been set.`);
            loadConfigurations();
          }
        });
      } else {
        console.log('Existing configurations found, skipping default setup');
        loadConfigurations();
      }
    });
  } catch (error) {
    console.error('Error setting up default configs:', error);
  }
}

// Set uninstall survey URL with language detection
function setUninstallSurveyURL() {
  const uiLang = chrome.i18n.getUILanguage().toLowerCase(); // e.g. "zh-cn", "ja", "en-us"
  const langMap = {
    'zh-cn': 'ZH-CN',
    'zh-tw': 'ZH-TW',
    'zh-hk': 'ZH-TW',
    'ja': 'JA',
    'ru': 'RU',
    'hi': 'HI',
  };
  // Exact match first, then prefix match (e.g. "ja-JP" → "ja"), fallback to EN
  const lang = langMap[uiLang] || langMap[uiLang.split('-')[0]] || 'EN';
  chrome.runtime.setUninstallURL(
    `https://page.lideguang.com/s/copy-page-title-and-url-uninstall-report?lang=${lang}`
  );
}
setUninstallSurveyURL();

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  if (details.reason === 'install' || details.reason === 'update') {
    await setupDefaultConfigs();
  }

  // Inject content script into all already-open tabs so users don't need to refresh.
  // Without this, pre-existing pages have no keydown listener and shortcuts fall through
  // to the page/browser (e.g. triggering print dialogs on some sites).
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content.js'],
      }).catch(() => {
        // Silently ignore tabs that reject injection (e.g. chrome:// pages, PDFs)
      });
    }
  });

  if (details.reason === 'install') {
    // New users get onboarding, not the what's-new nudge.
    chrome.storage.local.set({ [WHATS_NEW_KEY]: WHATS_NEW_VERSION });
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  } else if (details.reason === 'update') {
    // Existing users: badge the toolbar icon if they haven't seen this version's update.
    chrome.storage.local.get(WHATS_NEW_KEY, (r) => {
      if (r[WHATS_NEW_KEY] !== WHATS_NEW_VERSION) {
        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      }
    });
  }
});

// Resolves once configuredShortcuts reflects storage. Paths that read the
// in-memory configs (e.g. fallbackCopy) await this so a copy fired right after the
// service worker respawns can't race an empty array.
let configsReady;

function loadConfigurations() {
  configsReady = new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, function (result) {
      if (chrome.runtime.lastError) {
        console.error('Error loading configurations:', chrome.runtime.lastError);
        resolve();
        return;
      }

      if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
        configuredShortcuts = result[STORAGE_KEY];
        console.log('Configurations loaded in background:', configuredShortcuts);
        updateContextMenu();
      } else {
        console.log('No valid configurations found');
        configuredShortcuts = [];
      }
      resolve();
    });
  });
  return configsReady;
}

// Self-heal for stale content scripts. After an extension update, tabs opened
// earlier keep running a now-dead content script (its shortcut silently no-ops).
// When a tab is focused, ping it; if nothing answers, inject a fresh script.
async function ensureContentScript(tabId, url) {
  if (!tabId || !url || !/^https?:/.test(url)) return;
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    // A reply means a live content script is already present — nothing to do.
  } catch {
    chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content.js'],
    }).catch(() => { /* restricted page (chrome://, PDF, store) — ignore */ });
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!chrome.runtime.lastError && tab) ensureContentScript(tab.id, tab.url);
  });
});

// Browser restart: session-restored tabs may not have re-run their content script.
// Proactively ensure a live one in each open tab. ping-guarded, so it's a no-op
// where the script is already present, and restricted/discarded tabs are ignored.
chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
    for (const tab of tabs) ensureContentScript(tab.id, tab.url);
  });
});

// Debounce timer for context menu updates
let menuUpdateTimer = null;

function updateContextMenu() {
  // Debounce: cancel any pending update and schedule a new one
  if (menuUpdateTimer) {
    clearTimeout(menuUpdateTimer);
  }

  menuUpdateTimer = setTimeout(() => {
    menuUpdateTimer = null;
    doUpdateContextMenu();
  }, 100);
}

function doUpdateContextMenu() {
  try {
    const linkPrefix = chrome.i18n.getMessage('ctxLinkPrefix') || 'Link';
    const rootTitle = chrome.i18n.getMessage('ctxCopyRoot') || 'Copy this page';

    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.error('Error removing context menus:', chrome.runtime.lastError.message);
        return;
      }

      // Filter valid configs (non-empty shortcut and template, not isNew)
      const validConfigs = configuredShortcuts.filter(
        config => config && config.shortcut && config.template && !config.isNew
      );

      // Two roots: what's under the cursor, and — when that's a link — the link
      // itself. Chrome layers contexts, so without this a link right-click would
      // list every template twice at the top level.
      chrome.contextMenus.create({
        id: 'copyRoot',
        title: rootTitle,
        contexts: ['page', 'selection', 'link'],
      });
      chrome.contextMenus.create({
        id: 'copyLinkRoot',
        title: linkPrefix,
        contexts: ['link'],
      });

      validConfigs.forEach((config, index) => {
        // 为页面创建菜单项
        chrome.contextMenus.create({
          id: `copyTemplate_page_${index}`,
          parentId: 'copyRoot',
          title: config.description || config.shortcut,
          type: 'normal',
          contexts: ['page', 'selection', 'link']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error creating page context menu ${index}:`, chrome.runtime.lastError.message);
          }
        });

        // The link the cursor is on is a different target from the page holding
        // it, so it gets the same list under its own parent.
        chrome.contextMenus.create({
          id: `copyTemplate_link_${index}`,
          parentId: 'copyLinkRoot',
          title: config.description || config.shortcut,
          type: 'normal',
          contexts: ['link']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error creating link context menu ${index}:`, chrome.runtime.lastError.message);
          }
        });
      });

      // 添加分隔线和帮助项
      if (validConfigs.length > 0) {
        chrome.contextMenus.create({
          id: 'separator',
          parentId: 'copyRoot',
          type: 'separator',
          contexts: ['page', 'selection', 'link']
        });

        chrome.contextMenus.create({
          id: 'openOptions',
          parentId: 'copyRoot',
          title: chrome.i18n.getMessage('config') || 'Settings',
          type: 'normal',
          contexts: ['page', 'selection', 'link']
        });
      }
    });
  } catch (error) {
    console.error('Error updating context menu:', error);
  }
}

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

async function setupOffscreenDocument(path) {
  // 检查是否已经存在 offscreen document
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  // 创建 offscreen document
  await chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Write text to clipboard',
  });
}



// Writes text to the clipboard from the background, via the offscreen document,
// and confirms it however the page allows. Shared by the fallback copy path and
// the link context menu — both need to copy without a content script.
async function copyTextViaOffscreen(text, tab) {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  chrome.runtime.sendMessage({ type: 'copy-data', target: 'offscreen-doc', data: text }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending to offscreen:', chrome.runtime.lastError);
      showNotification('Copy Failed', 'Could not copy to clipboard');
      return;
    }
    if (!response || !response.success) {
      showNotification('Copy Failed', response?.error || 'Unknown error');
      return;
    }
    const label = chrome.i18n.getMessage('toastCopied') || 'Copied to Clipboard!';
    if (!tab) { showNotification(label, text); return; }
    // The in-page toast is nicer, but a page without a content script can't show
    // one — a system notification means the copy is still acknowledged.
    chrome.tabs.sendMessage(tab.id, { action: 'showToast', message: label, contentPreview: text }, () => {
      if (chrome.runtime.lastError) showNotification(label, text);
    });
  });
}

async function fallbackCopy(index, tab) {
  try {
    // Ensure configs are loaded — the worker may have just respawned.
    await configsReady;
    const config = configuredShortcuts[index];
    if (!config) return;

    // 简单的模板处理（不支持选中文本，因为我们还没法获取它）
    // 注意：如果页面有 selection，但 content script 失败，我们这里拿不到 selection
    // 除非我们用 scripting api 去获取，但这里为了简单起见，作为最后的保障，只处理 title/url
    // 简单的模板处理（使用通用工具）
    const text = processTemplate(config.template, {
      title: tab.title || '',
      url: tab.url || '',
      selectedText: '' // Fallback 时无法获取选中文本
    });

    // 确保 offscreen document 存在
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

    // 发送消息给 offscreen document 执行复制
    chrome.runtime.sendMessage({
      type: 'copy-data',
      target: 'offscreen-doc',
      data: text
    }, (response) => {
      /* ... */
      if (chrome.runtime.lastError) {
        console.error('Error sending to offscreen:', chrome.runtime.lastError);
        // Fallback to system notification if offscreen fails
        showNotification('Copy Failed', 'Could not copy to clipboard');
      } else if (response && response.success) {
        // Try to show toast in the active tab
        chrome.tabs.sendMessage(tab.id, {
            action: 'showToast', 
            message: chrome.i18n.getMessage('toastFallback') || 'Copied (Fallback)',
            contentPreview: text
        }, () => {
             // If sending to tab fails (e.g. no content script), fallback to system notification
             if (chrome.runtime.lastError) {
                 showNotification(chrome.i18n.getMessage('toastFallback') || 'Copied (Fallback)', text);
             }
        });
      } else {
        showNotification('Copy Failed', response?.error || 'Unknown error');
      }
    });

  } catch (error) {
    console.error('Fallback copy error:', error);
    showNotification('Copy Error', error.message);
  }
}

function showNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon.webp',
      title: title,
      message: message
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating notification:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Function to handle copy, targeting a specific frame if provided
function copyToClipboard(index, senderFrameId = 0) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || tabs.length === 0) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      return;
    }

    const activeTab = tabs[0];
    const targetFrameId = typeof senderFrameId === 'number' ? senderFrameId : 0;

    // Send to specific frame
    chrome.tabs.sendMessage(activeTab.id, {
      action: 'copyToClipboard',
      templateIndex: index,
      title: activeTab.title, // Pass top-level title
      url: activeTab.url      // Pass top-level URL
    }, { frameId: targetFrameId }, (response) => {
      if (chrome.runtime.lastError) {
        // The frame is gone. Its selection went with it, so the tab's own title
        // and URL are all that's left to copy.
        if (targetFrameId !== 0) fallbackCopy(index, activeTab);
        return;
      }

      // A subframe declines when it holds no selection — it has nothing the top
      // frame doesn't, and copying from it would use the wrong page. This is the
      // path a hidden iframe takes when it received the keystroke itself.
      if (response && response.success === false && targetFrameId !== 0) {
        chrome.tabs.sendMessage(activeTab.id, {
          action: 'copyToClipboard',
          templateIndex: index,
          title: activeTab.title,
          url: activeTab.url,
        }, { frameId: 0 }, () => {
          if (chrome.runtime.lastError) fallbackCopy(index, activeTab);
        });
      }
    });
  });
}

// Build a diagnostic from the local copy-failure log + environment and open a
// pre-filled GitHub issue. User-initiated only; nothing is sent automatically, and
// the report carries metadata only — no clipboard content, no page content, no
// template bodies (just the count of configured shortcuts).
async function openCopyIssueReport() {
  try {
    const store = await new Promise((resolve) =>
      chrome.storage.local.get(['copyIssueLog', STORAGE_KEY], (r) => resolve(r || {}))
    );
    const log = Array.isArray(store.copyIssueLog) ? store.copyIssueLog : [];
    const configs = Array.isArray(store[STORAGE_KEY]) ? store[STORAGE_KEY] : [];
    const version = chrome.runtime.getManifest().version;

    const failures = log.length
      ? log.map((e) => `- ${new Date(e.ts).toISOString()} · tier=${e.tier} · ${e.error || '-'} · ${e.domain}`)
      : ['- (none recorded)'];

    const body = [
      '### Copy issue report',
      '',
      `- Extension: v${version}`,
      `- Browser: ${navigator.userAgent}`,
      `- Platform: ${navigator.platform}`,
      `- Shortcuts configured: ${configs.length}`,
      '',
      '#### Recent copy failures (local log)',
      ...failures,
      '',
      '#### What happened',
      '<!-- Please describe what you expected and what went wrong. -->',
    ].join('\n');

    const url =
      'https://github.com/Deguang/link-and-title-copy-pro/issues/new'
      + `?title=${encodeURIComponent('Copy not working')}`
      + `&labels=${encodeURIComponent('copy-issue')}`
      + `&body=${encodeURIComponent(body)}`;
    chrome.tabs.create({ url });
  } catch (e) {
    // Fall back to a blank issue if anything goes wrong building the report.
    chrome.tabs.create({ url: 'https://github.com/Deguang/link-and-title-copy-pro/issues/new' });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'showNotification') {
      showNotification(request.title, request.message);
      sendResponse({ success: true });
    } else if (request.action === 'reloadConfigurations') {
      loadConfigurations();
      sendResponse({ success: true });
    } else if (request.action === 'triggerCopyByIndex') {
       // Capture sender frame ID to reply to the correct frame
       const senderFrameId = sender.frameId;
       copyToClipboard(request.index, senderFrameId);
       sendResponse({ success: true });
    } else if (request.action === 'showToastRequest') {
        // Route toast to TOP frame (frameId: 0) so it is always visible.
        if (sender.tab) {
            const tabId = sender.tab.id;
            const sendToast = (extra) => chrome.tabs.sendMessage(tabId, {
                action: 'showToast',
                message: request.message,
                contentPreview: request.contentPreview,
                review: extra?.review || null,   // milestone rate/share ask
                report: extra?.report || false,  // failure toast → "Report problem" action
            }, { frameId: 0 }); // TARGET TOP FRAME

            // Always show the toast immediately — never gate it on storage. A failure
            // toast carries a report action so the user can file a diagnostic.
            sendToast(request.failed ? { report: true } : null);

            // Only successful copies count toward the review nudge. When the
            // milestone is reached we re-render the same toast with the ask added;
            // any failure here silently leaves the plain toast in place.
            if (request.success) {
                recordCopies(1)
                    .then((count) =>
                        shouldPromptReview().then((res) => {
                            if (res.show) sendToast({ review: { reviewUrl: REVIEW_URL, storeUrl: STORE_URL, count, lastAsk: res.lastAsk } });
                        })
                    )
                    .catch(() => {});
            }
        }
        sendResponse({ success: true });
    } else if (request.action === 'reviewAction') {
        // User clicked Review or Share in the milestone toast — stop asking forever.
        markReviewDone();
        if (request.kind === 'review') chrome.tabs.create({ url: REVIEW_URL });
        sendResponse({ success: true });
    } else if (request.action === 'reportCopyIssue') {
        // User asked to report a copy problem. Build a diagnostic from the LOCAL
        // failure log + environment and open a pre-filled GitHub issue for them to
        // review and submit. Nothing is transmitted automatically.
        openCopyIssueReport();
        sendResponse({ success: true });
    } else if (request.action === 'copyViaOffscreen') {
        // The in-page clipboard write was blocked (e.g. a page Permissions-Policy
        // disabling the Clipboard API — see crbug.com/414348233). Write via the
        // offscreen document, which is extension-origin and not bound by the page.
        (async () => {
            try {
                await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
                chrome.runtime.sendMessage(
                    { type: 'copy-data', target: 'offscreen-doc', data: request.text },
                    (resp) => {
                        if (chrome.runtime.lastError || !resp || !resp.success) {
                            sendResponse({ success: false, error: chrome.runtime.lastError?.message });
                        } else {
                            sendResponse({ success: true });
                        }
                    }
                );
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true; // async sendResponse
    } else {
      console.log('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }

  return true;
});

// Native command fallback.
//
// The content script's keydown listener covers the ordinary case, but it only
// exists where a content script can be injected. On the new tab page, chrome://
// pages, the Web Store, other extensions' pages and PDFs there is nothing
// listening, so the shortcut did nothing — and said nothing about why. A new
// user trying it on the new tab page concludes the extension is broken.
//
// Chrome dispatches these itself, with no page involvement, so they work
// everywhere. Where a content script *does* exist both paths would fire, so this
// asks it first and only acts on its own if nothing answered.
chrome.commands.onCommand.addListener(async (command) => {
  const match = command.match(/copy-template-(\d+)/);
  if (!match) return;
  const index = parseInt(match[1], 10);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Only the content script can read the page selection, so prefer it — but
  // addressed to one frame, carrying the tab's own title and URL.
  //
  // Without both of those this broadcasts to every frame in the tab, and each
  // one copies its *own* location. A page embedding a hidden iframe (Stripe.js
  // is the case this was reported on) then races: the iframe can't reach
  // navigator.clipboard without focus, falls through to the offscreen document,
  // which needs no focus and so tends to land last — overwriting the correct
  // copy with the iframe's URL. Whichever frame finished last won, which is why
  // it only went wrong some of the time.
  //
  // Chrome tells us nothing about which frame the keystroke came from, so the
  // top frame is the only sound target. A selection inside a subframe is not
  // reachable this way; the in-page shortcut path handles that, since a keydown
  // does say which frame it happened in.
  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      action: 'copyToClipboard',
      templateIndex: index,
      title: tab.title,
      url: tab.url,
    }, { frameId: 0 });
    if (res && res.success) return;
  } catch {
    // No receiving end: no content script here. That's the case this exists for.
  }

  // Title and URL come from the tab itself, which needs no page access at all.
  await fallbackCopy(index, tab);
});

// Context menu clicks.
//
// These items have existed since before shortcut handling moved into the content
// script, but the listener that acted on them went with it — so every menu entry
// has been inert since: the user right-clicks, picks a format, and nothing
// happens. Every install hits this.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return;
  }

  const match = String(info.menuItemId).match(/^copyTemplate_(page|link)_(\d+)$/);
  if (!match || !tab) return;

  const [, kind, idxStr] = match;
  const index = parseInt(idxStr, 10);
  await configsReady;
  const config = configuredShortcuts[index];
  if (!config || !config.template) return;

  // A right-clicked link is a different target from the page it sits on, so its
  // own href and text are used rather than the tab's.
  if (kind === 'link') {
    const text = processTemplate(config.template, {
      title: info.linkText || info.selectionText || info.linkUrl || '',
      url: info.linkUrl || '',
      selectedText: info.selectionText || '',
    });
    await copyTextViaOffscreen(text, tab);
    return;
  }

  // Page and selection copies go through the content script, which is the only
  // place the live selection can be read. Unlike a command, a right-click says
  // which frame it happened in, so the selection there is still reachable — but
  // the title and URL are the tab's either way. "Copy this page" means the page,
  // even when the click landed inside an embedded frame.
  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      action: 'copyToClipboard',
      templateIndex: index,
      title: tab.title,
      url: tab.url,
    }, { frameId: typeof info.frameId === 'number' ? info.frameId : 0 });
    if (res && res.success) return;
  } catch {
    // No content script on this page.
  }
  await fallbackCopy(index, tab);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEY]) {
    console.log('Storage changed, reloading configurations');
    loadConfigurations();
  }
});

console.log('Enhanced background script loaded with text selection support');
loadConfigurations();