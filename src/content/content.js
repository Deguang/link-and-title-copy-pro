// 直接定义常量，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
import { processTemplate } from '../utils/templateProcessor';



function getSelectedText() {
  // 获取当前选中的文本
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }

  // 尝试从活动元素获取选中文本（处理输入框等）
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    if (start !== end) {
      return activeElement.value.substring(start, end).trim();
    }
  }

  return '';
}

// processTemplate 已移至 ../utils/templateProcessor.js

import { showToast } from './toast';

// Load configurations from storage
let shortcuts = [];


function loadShortcuts() {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (result[STORAGE_KEY]) {

      // Map to include original index
      shortcuts = result[STORAGE_KEY].map((c, i) => ({...c, originalIndex: i})).filter(c => c && c.shortcut);
      console.log('Shortcuts loaded in content script:', shortcuts);
    }
  });
}

// Initial load
loadShortcuts();

// Listen for storage changes to update shortcuts dynamically
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEY]) {
    loadShortcuts();
  }
});


// Prevent duplicate injection
if (window.hasLinkTitleCopyProContentScript) {
  console.log('Link & Title Copy Pro content script already loaded');
  // If we are re-loaded (e.g. by explicit injection), we should probably not add another listener.
  // We can just exit.
  // BUT we need to make sure we don't break strict mode or scope.
  // Since we are in an IIFE or module scope (Vite), return might not work if not in function.
  // Actually, Vite wraps this. But let's use a flag.
} else {
window.hasLinkTitleCopyProContentScript = true;

// Helper to normalize key strings (e.g. 'Meta' -> 'Command')
function normalizeKey(key) {
  if (key === 'Meta') return 'Command';
  if (key === 'Control') return 'Ctrl';
  if (key === ' ') return 'Space';
  if (key === 'ArrowUp') return '↑';
  if (key === 'ArrowDown') return '↓';
  if (key === 'ArrowLeft') return '←';
  if (key === 'ArrowRight') return '→';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

// Global Keyboard Listener
window.addEventListener('keydown', (e) => {
  // Prevent repeat triggers while holding key
  if (e.repeat) return;

  // Ignore if user is typing in an input field
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
    return;
  }

  // Build the shortcut string from the event
  const modifiers = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  // On Mac, Command is Meta. On Windows, Win is Meta. 
  // We use 'Command' as the standard internal representation for Meta on Mac.
  // But wait, our Options page saves it as 'Command' on Mac and 'Win' on Windows?
  // Let's check the options.jsx logic. It pushes 'Command' if isMac && e.metaKey.
  // Here we need to be consistent.
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (e.metaKey) modifiers.push(isMac ? 'Command' : 'Win');
  if (e.altKey) modifiers.push(isMac ? 'Option' : 'Alt');
  if (e.shiftKey) modifiers.push('Shift');

  // If no main key (just modifiers), return
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

  const mainKey = normalizeKey(e.key);
  const pressedShortcut = [...modifiers, mainKey].join('+');

  // Check for match
  const matchedConfig = shortcuts.find(c => c.shortcut === pressedShortcut);

  if (matchedConfig) {
    console.log('Shortcut matched:', pressedShortcut);
    e.preventDefault();
    e.stopPropagation();

    // Trigger copy
    // We send a message to background to handle the "Copy" logic purely?
    // actually, background.js 'copyToClipboard(index)' relies on existing tabs.
    // It's better if WE (content script) ask background to process the template for us,
    // OR we trigger the copy flow.
    // Let's reuse the existing flow: send message to background saying "Copy Config X"
    
    // Find the index of this config in the full list? 
    // Wait, the 'shortcuts' array is filtered. We need the original index or pass the template directly.
    // Background's 'copyToClipboard(index)' expects an index in the FULL storage array.
    // Let's modify the loadShortcuts to keep track of original index.
    chrome.runtime.sendMessage({
      action: 'triggerCopyByIndex',
      index: matchedConfig.originalIndex
    });
  }
}, true); // Capture phase to ensure we get it first

function copyToClipboard(template, overrideTitle, overrideUrl) {
  const processedText = processTemplate(template, {
    title: overrideTitle || document.title,
    url: overrideUrl || window.location.href,
    selectedText: getSelectedText()
  });

  // 优先使用更可靠的复制方法
  function fallbackCopyTextToClipboard(text) {
    // Save current selection
    const activeElement = document.activeElement;
    const selection = document.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    const textArea = document.createElement("textarea");
    textArea.value = text;

    // 避免滚动到底部
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.style.zIndex = "-1";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showSuccessMessage();
      } else {
        showErrorMessage();
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      showErrorMessage();
    }

    document.body.removeChild(textArea);

    // Restore selection
    if (activeElement) activeElement.focus();
    if (range) {
       selection.removeAllRanges();
       selection.addRange(range);
    }
  }

  function showSuccessMessage() {
    // Send message to background to show toast (Background will route it to Top Frame)
    const toastMessage = chrome.i18n.getMessage('toastCopied');
    console.log('[Content] i18n toastCopied:', toastMessage, '| UI Language:', chrome.i18n.getUILanguage());
    chrome.runtime.sendMessage({
        action: 'showToastRequest',
        message: toastMessage || 'Copied to Clipboard!',
        contentPreview: processedText
    });
  }

  function showErrorMessage() {
     chrome.runtime.sendMessage({
        action: 'showToastRequest',
        message: chrome.i18n.getMessage('toastFailed') || 'Copy Failed'
    });
  }

  // 检查是否支持现代剪贴板API并且文档有焦点
  if (navigator.clipboard && window.isSecureContext) {
    if (document.hasFocus()) {
      navigator.clipboard.writeText(processedText).then(() => {
        showSuccessMessage();
      }).catch(err => {
        console.error('Modern clipboard API failed, using fallback:', err);
        fallbackCopyTextToClipboard(processedText);
      });
    } else {
      fallbackCopyTextToClipboard(processedText);
    }
  } else {
    fallbackCopyTextToClipboard(processedText);
  }
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'copyToClipboard') {
      const config = shortcuts.find(c => c.originalIndex === message.templateIndex);
      
      if (config && config.template) {
        // Use overrides from message if present (for iframe support)
        copyToClipboard(config.template, message.title, message.url);
        sendResponse({ success: true });
      } else {
        console.error('Invalid template index or missing template:', message.templateIndex);
        sendResponse({ success: false, error: 'Invalid configuration' });
      }
    } else if (message.action === 'showToast') {
      showToast(message.message || 'Copied!', message.contentPreview);
      sendResponse({ success: true });
    } else if (message.action === 'getPageInfo') {
      // 返回页面信息用于预览
      const selectedText = getSelectedText();
      sendResponse({
        success: true,
        data: {
          title: document.title,
          url: window.location.href,
          selectedText: selectedText,
          hasSelection: !!selectedText
        }
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }

  return true;
});

// 监听选择变化，可以用于实时更新上下文菜单等
document.addEventListener('selectionchange', () => {
  // 可以在这里添加选择变化的处理逻辑
  // 比如更新右键菜单的显示文本等
});

console.log('Enhanced content script loaded with text selection support');
}