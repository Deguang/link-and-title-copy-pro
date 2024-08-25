// This function copies the page title and URL to the clipboard
// Ctrl+Shift+C
function copyToClipboard() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { action: 'copyToClipboard' });
  });
}

chrome.commands.onCommand.addListener(function (command) {
  console.log('command', command)
  if (command === 'copy-to-clipboard') {
    copyToClipboard();
  }
});
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: 'copyPageTitleAndUrl',
    title: 'Copy Page Title and URL',
    type: 'normal',
    contexts: ['page']
  })
})

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'copyPageTitleAndUrl') {
    copyToClipboard()
  }
})

// Notification
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    // TODO show notification
    // chrome.notifications.create({
    //   type: 'basic',
    //   iconUrl: './icons/icon.webp',
    //   title: request.title,
    //   message: request.message
    // })
  }
})