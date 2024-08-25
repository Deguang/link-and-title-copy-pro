function copyToClipboard() {
    const title = document.title;
    const url = window.location.href;
    const text = `${title}\n${url}`;
    navigator.clipboard.writeText(text).then(() => {
      // Show a notification to the user，indicating that the copy operation was successful
      console.log(chrome.notifications)
      chrome.runtime.sendMessage({
        action: 'showNotification',
        title: 'Copied to Clipboard Successfully',
        message: 'Page title and URL copied to clipboard.'
      })
    }).catch(error => {
      // Show a notification to the user indicating that the copy operation failed
      console.error('Error copying text:', error);
      chrome.runtime.sendMessage({
        action: 'showNotification',
        title: 'Copy Failed',
        message: 'Failed to copy page title and URL to clipboard.'
      })
    })
  }
  // This function adds the keyboard shortcut listener
  function addKeyboardShortcut() {
    document.addEventListener('keydown', event => {
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        copyToClipboard();
      }
    });
  }
  // Call the function to add the keyboard shortcut listener
  addKeyboardShortcut();
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('message', message)
    if (message.action === 'copyToClipboard') {
      copyToClipboard();
    }
  });
console.log('in page content')