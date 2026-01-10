// 直接定义常量和默认配置，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
import { processTemplate } from '../utils/templateProcessor';

const DEFAULT_CONFIGS = [
  {
    windows: {
      shortcut: 'Ctrl+Shift+P',
      template: '{selectedText|title}\n{url}',
      description: 'Copy selected text (or title) and URL'
    },
    mac: {
      shortcut: 'Command+Shift+P',
      template: '{selectedText|title}\n{url}',
      description: 'Copy selected text (or title) and URL'
    },
    linux: {
      shortcut: 'Ctrl+Shift+P',
      template: '{selectedText|title}\n{url}',
      description: 'Copy selected text (or title) and URL'
    }
  },
  {
    windows: {
      shortcut: 'Ctrl+Shift+O',
      template: '[{selectedText|title}]({url})',
      description: 'Copy as Markdown link'
    },
    mac: {
      shortcut: 'Command+Shift+O',
      template: '[{selectedText|title}]({url})',
      description: 'Copy as Markdown link'
    },
    linux: {
      shortcut: 'Ctrl+Shift+O',
      template: '[{selectedText|title}]({url})',
      description: 'Copy as Markdown link'
    }
  },
  {
    windows: {
      shortcut: 'Ctrl+Shift+U',
      template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}',
      description: 'Smart copy with quotes for selected text'
    },
    mac: {
      shortcut: 'Command+Shift+U',
      template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}',
      description: 'Smart copy with quotes for selected text'
    },
    linux: {
      shortcut: 'Ctrl+Shift+U',
      template: '{if:selectedText}"{selectedText}" - {title}\n{url}{/if:selectedText}{if:noSelectedText}{title}\n{url}{/if:noSelectedText}',
      description: 'Smart copy with quotes for selected text'
    }
  }
];

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
        const platformConfigs = DEFAULT_CONFIGS.map(config => {
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

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  if (details.reason === 'install' || details.reason === 'update') {
    await setupDefaultConfigs();
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

function updateContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.error('Error removing context menus:', chrome.runtime.lastError);
        return;
      }

      configuredShortcuts.forEach((config, index) => {
        if (config && config.shortcut && config.template) {
          // 为页面创建菜单项
          chrome.contextMenus.create({
            id: `copyTemplate_page_${index}`,
            title: `📄 ${config.description || config.shortcut}`,
            type: 'normal',
            contexts: ['page']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error(`Error creating page context menu ${index}:`, chrome.runtime.lastError);
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
              console.error(`Error creating selection context menu ${index}:`, chrome.runtime.lastError);
            }
          });
        }
      });

      // 添加分隔线和帮助项
      if (configuredShortcuts.length > 0) {
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

function copyToClipboard(index) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      return;
    }

    if (tabs.length === 0) {
      console.error('No active tabs found');
      return;
    }

    const activeTab = tabs[0];

    if (activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:')) {
      console.log('Cannot inject into system pages');
      // 对于系统页面，我们只能直接回退到 fallbackCopy，它现在使用 offscreen
      fallbackCopy(index, activeTab);
      return;
    }

    // 尝试发送消息
    chrome.tabs.sendMessage(activeTab.id, {
      action: 'copyToClipboard',
      templateIndex: index
    }, (response) => {
      // 如果出错（通常是 content script 未加载），尝试注入脚本
      if (chrome.runtime.lastError) {
        console.log('Content script not ready, attempting injection...', chrome.runtime.lastError);

        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Script injection failed:', chrome.runtime.lastError);
            fallbackCopy(index, activeTab);
            return;
          }

          // 注入成功后重试发送消息
          setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, {
              action: 'copyToClipboard',
              templateIndex: index
            }, (retryResponse) => {
              if (chrome.runtime.lastError) {
                console.error('Retry failed:', chrome.runtime.lastError);
                fallbackCopy(index, activeTab);
              }
            });
          }, 100);
        });
      } else if (response && !response.success) {
        console.error('Content script error:', response.error);
        fallbackCopy(index, activeTab);
      }
    });
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
      if (chrome.runtime.lastError) {
        console.error('Error sending to offscreen:', chrome.runtime.lastError);
        showNotification('Copy Failed', 'Could not copy to clipboard');
      } else if (response && response.success) {
        showNotification('Copied (Fallback)', text);
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

chrome.commands.onCommand.addListener(function (command) {
  console.log('Command received:', command);
  const match = command.match(/copy-template-(\d+)/);
  if (match) {
    const index = parseInt(match[1]);
    copyToClipboard(index);
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log('Context menu clicked:', info.menuItemId);

  if (info.menuItemId === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return;
  }

  const pageMatch = info.menuItemId.match(/copyTemplate_page_(\d+)/);
  const selectionMatch = info.menuItemId.match(/copyTemplate_selection_(\d+)/);

  if (pageMatch) {
    const index = parseInt(pageMatch[1]);
    copyToClipboard(index);
  } else if (selectionMatch) {
    const index = parseInt(selectionMatch[1]);
    copyToClipboard(index);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'showNotification') {
      showNotification(request.title, request.message);
      sendResponse({ success: true });
    } else if (request.action === 'reloadConfigurations') {
      loadConfigurations();
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

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEY]) {
    console.log('Storage changed, reloading configurations');
    loadConfigurations();
  }
});

console.log('Enhanced background script loaded with text selection support');
loadConfigurations();