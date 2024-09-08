import {STORAGE_KEY, DEFAULT_CONFIGS} from '../constant.js';
let configuredShortcuts = [];

function getPlatform() {
  const platformInfo = navigator.platform.toLowerCase();
  if (platformInfo.includes('win')) return 'windows';
  if (platformInfo.includes('mac')) return 'mac';
  if (platformInfo.includes('linux')) return 'linux';
  return 'unknown';
}

function setupDefaultConfigs() {
  const platform = getPlatform();
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (!result[STORAGE_KEY] || result[STORAGE_KEY].length === 0) {
      const platformConfigs = DEFAULT_CONFIGS.map(config => config[platform] || config.windows);
      chrome.storage.local.set({ [STORAGE_KEY]: platformConfigs }, () => {
        console.log(`Default configurations for ${platform} have been set.`);
      });
    }
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    setupDefaultConfigs();
  }
});

function loadConfigurations() {
  chrome.storage.local.get(STORAGE_KEY, function(result) {
    if (result[STORAGE_KEY]) {
      configuredShortcuts = result[STORAGE_KEY];
      updateContextMenu();
    }
  });
}

function updateContextMenu() {
  chrome.contextMenus.removeAll(() => {
    configuredShortcuts.forEach((config, index) => {
      chrome.contextMenus.create({
        id: `copyTemplate_${index}`,
        title: `Copy: ${config.shortcut}`,
        type: 'normal',
        contexts: ['page']
      });
    });
  });
}

function copyToClipboard(index) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { 
      action: 'copyToClipboard', 
      templateIndex: index 
    });
  });
}

chrome.commands.onCommand.addListener(function (command) {
  const match = command.match(/copy-template-(\d+)/);
  if (match) {
    const index = parseInt(match[1]);
    copyToClipboard(index);
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  const match = info.menuItemId.match(/copyTemplate_(\d+)/);
  if (match) {
    const index = parseInt(match[1]);
    copyToClipboard(index);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon.webp',
      title: request.title,
      message: request.message
    });
  } else if (request.action === 'reloadConfigurations') {
    loadConfigurations();
  }
});

loadConfigurations();