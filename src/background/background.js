// 直接定义常量和默认配置，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
import { processTemplate } from '../utils/templateProcessor';

// Google Analytics Measurement Protocol configuration
const GA_MEASUREMENT_ID = 'G-49HSQQVZ1F';
const GA_API_SECRET = ''; // Optional: Add API secret for server-side validation

// Send event to Google Analytics 4
async function sendGAEvent(eventName, eventParams = {}) {
  try {
    const clientId = await getOrCreateClientId();
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          engagement_time_msec: '100',
          ...eventParams
        }
      }]
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
    
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    }).catch(err => console.log('GA event send failed:', err));
  } catch (error) {
    console.log('GA tracking error:', error);
  }
}

// Get or create a persistent client ID for GA
async function getOrCreateClientId() {
  const result = await chrome.storage.local.get('ga_client_id');
  if (result.ga_client_id) {
    return result.ga_client_id;
  }
  const clientId = crypto.randomUUID();
  await chrome.storage.local.set({ ga_client_id: clientId });
  return clientId;
}

function getDefaultConfigs() {
  const descPlain = chrome.i18n.getMessage('defaultDescPlain') || 'Copy selected text (or title) and URL';
  const descMarkdown = chrome.i18n.getMessage('defaultDescMarkdown') || 'Copy as Markdown link';
  const descSmart = chrome.i18n.getMessage('defaultDescSmart') || 'Smart copy with quotes for selected text';

  return [
    {
      windows: { shortcut: 'Ctrl+Shift+P', template: '{selectedText|title}\n{url}', description: descPlain },
      mac:     { shortcut: 'Command+Shift+P', template: '{selectedText|title}\n{url}', description: descPlain },
      linux:   { shortcut: 'Ctrl+Shift+P', template: '{selectedText|title}\n{url}', description: descPlain }
    },
    {
      windows: { shortcut: 'Ctrl+Shift+O', template: '[{selectedText|title}]({url})', description: descMarkdown },
      mac:     { shortcut: 'Command+Shift+O', template: '[{selectedText|title}]({url})', description: descMarkdown },
      linux:   { shortcut: 'Ctrl+Shift+O', template: '[{selectedText|title}]({url})', description: descMarkdown }
    },
    {
      windows: { shortcut: 'Ctrl+Shift+U', template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}', description: descSmart },
      mac:     { shortcut: 'Command+Shift+U', template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}', description: descSmart },
      linux:   { shortcut: 'Ctrl+Shift+U', template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}', description: descSmart }
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

// Set uninstall survey URL — replace with your actual Google Form / Typeform URL
// chrome.runtime.setUninstallURL('https://forms.gle/REPLACE_WITH_YOUR_FORM_ID');

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
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
});

function loadConfigurations() {
  chrome.storage.local.get(STORAGE_KEY, function (result) {
    if (chrome.runtime.lastError) {
      console.error('Error loading configurations:', chrome.runtime.lastError);
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
  });
}

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
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.error('Error removing context menus:', chrome.runtime.lastError.message);
        return;
      }

      // Filter valid configs (non-empty shortcut and template, not isNew)
      const validConfigs = configuredShortcuts.filter(
        config => config && config.shortcut && config.template && !config.isNew
      );

      validConfigs.forEach((config, index) => {
        // 为页面创建菜单项
        chrome.contextMenus.create({
          id: `copyTemplate_page_${index}`,
          title: `📄 ${config.description || config.shortcut}`,
          type: 'normal',
          contexts: ['page']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error creating page context menu ${index}:`, chrome.runtime.lastError.message);
          }
        });

        // 为选中文本创建菜单项
        chrome.contextMenus.create({
          id: `copyTemplate_selection_${index}`,
          title: `📝 ${config.description || config.shortcut}`,
          type: 'normal',
          contexts: ['selection']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error creating selection context menu ${index}:`, chrome.runtime.lastError.message);
          }
        });
      });

      // 添加分隔线和帮助项
      if (validConfigs.length > 0) {
        chrome.contextMenus.create({
          id: 'separator',
          type: 'separator',
          contexts: ['page', 'selection']
        });

        chrome.contextMenus.create({
          id: 'openOptions',
          title: '⚙️ ' + (chrome.i18n.getMessage('config') || 'Settings'),
          type: 'normal',
          contexts: ['page', 'selection']
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



async function fallbackCopy(index, tab) {
  try {
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
         console.warn('Could not send to frame', targetFrameId, 'Trying top frame', chrome.runtime.lastError);
         // Fallback to top frame if sender frame is gone or errored?
         // But if sender frame is gone, selection is gone. relying on top frame logic might be safer fallback for title/url only.
         if (targetFrameId !== 0) {
             fallbackCopy(index, activeTab);
         }
      }
    });
  });
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
       // Track copy event in GA
       const config = configuredShortcuts[request.index];
       sendGAEvent('copy', {
         template_index: request.index,
         template_desc: config?.description || 'unknown'
       });
       // Capture sender frame ID to reply to the correct frame
       const senderFrameId = sender.frameId;
       copyToClipboard(request.index, senderFrameId);
       sendResponse({ success: true });
    } else if (request.action === 'showToastRequest') {
        // Route toast to TOP frame (frameId: 0) so it is always visible
        if (sender.tab) {
             chrome.tabs.sendMessage(sender.tab.id, {
                action: 'showToast',
                message: request.message,
                contentPreview: request.contentPreview
             }, { frameId: 0 }); // TARGET TOP FRAME
        }
        sendResponse({ success: true });
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

/* 
// Deprecated: Native commands removed in favor of JS content script injection
chrome.commands.onCommand.addListener(function (command) {
  console.log('Command received:', command);
  const match = command.match(/copy-template-(\d+)/);
  if (match) {
    const index = parseInt(match[1]);
    copyToClipboard(index);
  }
});
*/

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEY]) {
    console.log('Storage changed, reloading configurations');
    loadConfigurations();
  }
});

console.log('Enhanced background script loaded with text selection support');
loadConfigurations();