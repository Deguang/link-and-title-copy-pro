// Register entry
function createContextMenus() {
    chrome.contextMenus.create({
      type: 'normal',
      id: 'savePage',
      title: '保存页面',
      checked: false,
    });
  }
  chrome.runtime.onInstalled.addListener(() => {
    createContextMenus();
  });