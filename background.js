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
    contexts: ['all']
  })
})

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'copyPageTitleAndUrl') {
    copyToClipboard()
  }
})