let configuredShortcuts = [];

function copyToClipboard(template) {
  const title = document.title;
  const url = window.location.href;
  const selectedText = window.getSelection().toString();
  
  let text = template
    .replace('{title}', title)
    .replace('{url}', url)
    .replace('{selectedText}', selectedText);

  navigator.clipboard.writeText(text).then(() => {
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: 'Copied to Clipboard Successfully',
      message: 'Content copied to clipboard based on the template.'
    });
  }).catch(error => {
    console.error('Error copying text:', error);
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: 'Copy Failed',
      message: 'Failed to copy content to clipboard.'
    });
  });
}

function addKeyboardShortcuts() {
  document.addEventListener('keydown', event => {
    configuredShortcuts.forEach((config, index) => {
      const keys = config.shortcut.split('+');
      const modifierKeys = keys.slice(0, -1);
      const lastKey = keys[keys.length - 1].toLowerCase();

      const modifiersMatch = 
        (!modifierKeys.includes('Ctrl') || event.ctrlKey) &&
        (!modifierKeys.includes('Shift') || event.shiftKey) &&
        (!modifierKeys.includes('Alt') || event.altKey);

      if (modifiersMatch && event.key.toLowerCase() === lastKey) {
        event.preventDefault();
        copyToClipboard(config.template);
      }
    });
  });
}

function loadConfigurations() {
  chrome.storage.local.get('CopyTitleAndUrlConfigs', function(result) {
    if (result.CopyTitleAndUrlConfigs) {
      configuredShortcuts = result.CopyTitleAndUrlConfigs;
      console.log('Configurations loaded:', configuredShortcuts);
      addKeyboardShortcuts();
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'copyToClipboard') {
    const config = configuredShortcuts[message.templateIndex];
    if (config) {
      copyToClipboard(config.template);
    }
  } else if (message.action === 'reloadConfigurations') {
    loadConfigurations();
  }
});

loadConfigurations();

console.log('Content script loaded');