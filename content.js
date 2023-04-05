function copyToClipboard() {
    const title = document.title;
    const url = window.location.href;
    const text = `${title}\n${url}`;
    navigator.clipboard.writeText(text).then(() => {
      // Send a message to the background script indicating that the copy operation is complete
      chrome.runtime.sendMessage({ type: 'copyComplete' });
    });
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