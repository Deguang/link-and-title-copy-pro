let configuredShortcuts = [];

function loadConfigurations() {
  chrome.storage.sync.get('CopyTitleAndUrlConfigs', function(result) {
    if (result.CopyTitleAndUrlConfigs) {
      configuredShortcuts = result.CopyTitleAndUrlConfigs;
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