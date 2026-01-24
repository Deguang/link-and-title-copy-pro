const TOAST_CSS = `
#link-title-copy-pro-toast {
  position: fixed;
  left: 50%;
  top: 24px;
  transform: translateX(-50%) translateY(-20px);
  background-color: rgba(15, 23, 42, 0.95);
  color: #fff;
  padding: 12px;
  border-radius: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 2147483647;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 450px;
  width: max-content;
}

#link-title-copy-pro-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

#link-title-copy-pro-toast-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  width: 100%;
}

#link-title-copy-pro-toast-icon {
  display: flex;
  align-items: center;
  color: #4ade80;
  flex-shrink: 0;
}

#link-title-copy-pro-toast-text {
  flex-grow: 1;
}

#link-title-copy-pro-toast-preview {
  display: block;
  font-size: 11px;
  color: #fbbf24; /* yellow-400 */
  background-color: rgba(0, 0, 0, 0.3);
  padding: 8px 10px;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
`;

// SVG Checkmark Icon
const CHECK_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

let toastElement = null;
let toastTimeout = null;
let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.textContent = TOAST_CSS;
  document.head.appendChild(style);
  styleInjected = true;
}

export function showToast(message = 'Copied to clipboard', contentPreview = '', duration = 2000) {
  injectStyles();

  // Create toast if it doesn't exist
  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.id = 'link-title-copy-pro-toast';
    
    // Create text container
    const row = document.createElement('div');
    row.id = 'link-title-copy-pro-toast-row';
    
    // Create icon container
    const iconContainer = document.createElement('div');
    iconContainer.id = 'link-title-copy-pro-toast-icon';
    iconContainer.innerHTML = CHECK_ICON;
    
    // Create text container
    const textContainer = document.createElement('span');
    textContainer.id = 'link-title-copy-pro-toast-text';
    
    row.appendChild(iconContainer);
    row.appendChild(textContainer);
    
    // Preview container
    const previewContainer = document.createElement('div');
    previewContainer.id = 'link-title-copy-pro-toast-preview';
    
    toastElement.appendChild(row);
    toastElement.appendChild(previewContainer);
    
    document.body.appendChild(toastElement);
  }

  // Update message
  const textSpan = toastElement.querySelector('#link-title-copy-pro-toast-text');
  if (textSpan) textSpan.textContent = message;
  
  // Update preview
  const previewDiv = toastElement.querySelector('#link-title-copy-pro-toast-preview');
  if (previewDiv) {
      if (contentPreview) {
          // Truncate preview if too long (but much longer now)
          const truncated = contentPreview.length > 500 ? contentPreview.substring(0, 500) + '...' : contentPreview;
          previewDiv.textContent = truncated;
          previewDiv.style.display = 'block';
      } else {
          previewDiv.style.display = 'none';
      }
  }

  // Show toast
  // Remove show class first to reset transition if already shown (optional, but good for rapid clicks)
  toastElement.classList.remove('show');
  
  // Force reflow
  void toastElement.offsetWidth;

  requestAnimationFrame(() => {
    toastElement.classList.add('show');
  });

  // Clear existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Hide after duration
  toastTimeout = setTimeout(() => {
    toastElement.classList.remove('show');
  }, duration);
}
