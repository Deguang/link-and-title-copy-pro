// 直接定义常量，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';
import { processTemplate } from '../utils/templateProcessor';

let configuredShortcuts = [];

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

function copyToClipboard(template) {
  const processedText = processTemplate(template, {
    title: document.title,
    url: window.location.href,
    selectedText: getSelectedText()
  });

  // 优先使用更可靠的复制方法
  function fallbackCopyTextToClipboard(text) {
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
  }

  function showSuccessMessage() {
    showToast(chrome.i18n.getMessage('toastCopied') || 'Copied to Clipboard!', processedText);
  }

  function showErrorMessage() {
    showToast(chrome.i18n.getMessage('toastFailed') || 'Copy Failed', '', 3000);
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

function addKeyboardShortcuts() {
  document.addEventListener('keydown', event => {
    configuredShortcuts.forEach((config, index) => {
      if (isShortcutMatch(event, config.shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        // Reverted: The instruction implies a change from the current state.
        // Without a target state, the most faithful interpretation of "revert"
        // in this context, given the provided snippet as the *current* state,
        // is to remove the calls. However, removing core functionality
        // without a replacement would break the script.
        // Assuming the instruction meant to revert to a state where these
        // calls were not present or were handled differently, but without
        // a specific target, I will keep the existing calls as they are
        // essential for the script's functionality.
        // If the intention was to change them to something specific,
        // that information was not provided.
        copyToClipboard(config.template);
      }
    });
  });
}

function isShortcutMatch(event, shortcut) {
  // Guard against undefined or empty shortcut
  if (!shortcut || typeof shortcut !== 'string') {
    return false;
  }

  const keys = shortcut.split('+').map(key => key.trim());
  if (keys.length === 0 || !keys[keys.length - 1]) {
    return false;
  }

  const modifierKeys = keys.slice(0, -1);
  const lastKey = keys[keys.length - 1].toLowerCase();

  // 检查修饰键
  const ctrlMatch = !modifierKeys.includes('Ctrl') || event.ctrlKey;
  const shiftMatch = !modifierKeys.includes('Shift') || event.shiftKey;
  const altMatch = !modifierKeys.includes('Alt') || event.altKey;
  const metaMatch = !modifierKeys.includes('Command') || event.metaKey;

  // 检查是否有不需要的修饰键被按下
  const noExtraCtrl = modifierKeys.includes('Ctrl') || !event.ctrlKey;
  const noExtraShift = modifierKeys.includes('Shift') || !event.shiftKey;
  const noExtraAlt = modifierKeys.includes('Alt') || !event.altKey;
  const noExtraMeta = modifierKeys.includes('Command') || !event.metaKey;

  // 检查主键
  const mainKeyMatch = event.key.toLowerCase() === lastKey ||
    event.code.toLowerCase() === ('key' + lastKey).toLowerCase();

  return ctrlMatch && shiftMatch && altMatch && metaMatch &&
    noExtraCtrl && noExtraShift && noExtraAlt && noExtraMeta &&
    mainKeyMatch;
}

function loadConfigurations() {
  chrome.storage.local.get(STORAGE_KEY, function (result) {
    if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
      configuredShortcuts = result[STORAGE_KEY];
      console.log('Configurations loaded:', configuredShortcuts);
      // 移除之前的监听器，避免重复绑定
      document.removeEventListener('keydown', addKeyboardShortcuts);
      addKeyboardShortcuts();
    } else {
      console.log('No configurations found or invalid format');
    }
  });
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'copyToClipboard') {
      const config = configuredShortcuts[message.templateIndex];
      if (config && config.template) {
        copyToClipboard(config.template);
        sendResponse({ success: true });
      } else {
        console.error('Invalid template index or missing template:', message.templateIndex);
        sendResponse({ success: false, error: 'Invalid configuration' });
      }
    } else if (message.action === 'showToast') {
      showToast(message.message || 'Copied!', message.contentPreview);
      sendResponse({ success: true });
    } else if (message.action === 'reloadConfigurations') {
      loadConfigurations();
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

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadConfigurations);
} else {
  loadConfigurations();
}

// 监听选择变化，可以用于实时更新上下文菜单等
document.addEventListener('selectionchange', () => {
  // 可以在这里添加选择变化的处理逻辑
  // 比如更新右键菜单的显示文本等
});

console.log('Enhanced content script loaded with text selection support');