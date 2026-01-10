// 直接定义常量，而不是导入
const STORAGE_KEY = 'CopyTitleAndUrlConfigs';

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

function processTemplate(template, options = {}) {
  const title = document.title;
  const url = window.location.href;
  const selectedText = getSelectedText();
  
  // 根据是否有选中文本来处理模板
  let processedTemplate = template;
  
  // 如果模板包含条件逻辑标记
  if (template.includes('{if:selectedText}') || template.includes('{selectedText?}')) {
    if (selectedText) {
      // 有选中文本时的处理
      processedTemplate = processedTemplate
        .replace(/\{if:selectedText\}(.*?)\{\/if:selectedText\}/gs, '$1')
        .replace(/\{selectedText\?\}(.*?)\{\/selectedText\?\}/gs, '$1')
        .replace(/\{if:noSelectedText\}(.*?)\{\/if:noSelectedText\}/gs, '')
        .replace(/\{noSelectedText\?\}(.*?)\{\/noSelectedText\?\}/gs, '');
    } else {
      // 无选中文本时的处理
      processedTemplate = processedTemplate
        .replace(/\{if:selectedText\}(.*?)\{\/if:selectedText\}/gs, '')
        .replace(/\{selectedText\?\}(.*?)\{\/selectedText\?\}/gs, '')
        .replace(/\{if:noSelectedText\}(.*?)\{\/if:noSelectedText\}/gs, '$1')
        .replace(/\{noSelectedText\?\}(.*?)\{\/noSelectedText\?\}/gs, '$1');
    }
  }
  
  // 替换基本占位符
  let result = processedTemplate
    .replace(/\{title\}/g, title)
    .replace(/\{url\}/g, url)
    .replace(/\{selectedText\}/g, selectedText);
  
  // 处理组合占位符
  if (selectedText) {
    // 有选中文本时的特殊处理
    result = result
      .replace(/\{selectedText\|title\}/g, selectedText) // 优先显示选中文本
      .replace(/\{title\|selectedText\}/g, selectedText) // 优先显示选中文本
      .replace(/\{selectedTextWithQuote\}/g, `"${selectedText}"`)
      .replace(/\{selectedTextWithBrackets\}/g, `[${selectedText}]`)
      .replace(/\{selectedTextWithContext\}/g, `${selectedText} - ${title}`);
  } else {
    // 无选中文本时的处理
    result = result
      .replace(/\{selectedText\|title\}/g, title) // 回退到标题
      .replace(/\{title\|selectedText\}/g, title) // 回退到标题
      .replace(/\{selectedTextWithQuote\}/g, `"${title}"`)
      .replace(/\{selectedTextWithBrackets\}/g, `[${title}]`)
      .replace(/\{selectedTextWithContext\}/g, title);
  }
  
  // 清理多余的空行和空格
  result = result
    .replace(/\n\s*\n\s*\n/g, '\n\n') // 将多个空行合并为双换行
    .replace(/^\s+|\s+$/g, '') // 去除首尾空白
    .replace(/\s+$/gm, ''); // 去除每行末尾空白
  
  return result;
}

function copyToClipboard(template) {
  const processedText = processTemplate(template);
  
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
        showSuccessMessage(text);
      } else {
        showErrorMessage();
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      showErrorMessage();
    }

    document.body.removeChild(textArea);
  }

  function showSuccessMessage(text) {
    const selectedText = getSelectedText();
    const messageType = selectedText ? 'selectedTextCopied' : 'titleUrlCopied';
    
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: chrome.i18n.getMessage('successTip') || 'Copied Successfully',
      message: `${selectedText ? '📝 ' : '🔗 '}${text.length > 80 ? text.substring(0, 80) + '...' : text}`,
      type: messageType
    });
  }

  function showErrorMessage() {
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: chrome.i18n.getMessage('errorTip') || 'Copy Failed',
      message: 'Failed to copy to clipboard'
    });
  }

  // 检查是否支持现代剪贴板API并且文档有焦点
  if (navigator.clipboard && window.isSecureContext) {
    if (document.hasFocus()) {
      navigator.clipboard.writeText(processedText).then(() => {
        showSuccessMessage(processedText);
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
        copyToClipboard(config.template);
      }
    });
  });
}

function isShortcutMatch(event, shortcut) {
  const keys = shortcut.split('+').map(key => key.trim());
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
  chrome.storage.local.get(STORAGE_KEY, function(result) {
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