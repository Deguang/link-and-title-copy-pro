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

#link-title-copy-pro-toast-review {
  display: none;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

#link-title-copy-pro-toast-review-prompt {
  font-size: 12px;
  color: #e2e8f0; /* slate-200 */
}

#link-title-copy-pro-toast-review-actions {
  display: flex;
  gap: 8px;
}

.link-title-copy-pro-toast-btn {
  flex: 1;
  pointer-events: auto;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background-color: rgba(255, 255, 255, 0.08);
  transition: background-color 0.15s ease;
}

.link-title-copy-pro-toast-btn:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.link-title-copy-pro-toast-btn-primary {
  background-color: #f59e0b; /* amber-500 */
  border-color: #f59e0b;
}

.link-title-copy-pro-toast-btn-primary:hover {
  background-color: #d97706; /* amber-600 */
}

.link-title-copy-pro-toast-btn-ghost {
  flex: 0 0 auto;
  background-color: transparent;
  border-color: transparent;
  color: #94a3b8; /* slate-400 */
  font-weight: 500;
}

.link-title-copy-pro-toast-btn-ghost:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #e2e8f0; /* slate-200 */
}

/* Celebration burst — only fired on the milestone toast. */
#link-title-copy-pro-fx {
  position: fixed;
  z-index: 2147483647;
  width: 0;
  height: 0;
  pointer-events: none;
}

.link-title-copy-pro-fx-p {
  position: absolute;
  left: 0;
  top: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--c);
  opacity: 0;
  transform: translate(-50%, -50%);
  animation: link-title-copy-pro-burst 1s ease-out forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes link-title-copy-pro-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 24px)) rotate(var(--r)) scale(0.3);
  }
}

@media (prefers-reduced-motion: reduce) {
  #link-title-copy-pro-fx { display: none; }
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
  // document_start injection can run before <head> exists; fall back to <html>.
  (document.head || document.documentElement).appendChild(style);
  styleInjected = true;
}

export function showToast(message = 'Copied to clipboard', contentPreview = '', options = {}) {
  injectStyles();

  const { review = null, report = null, duration } = options;

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

    // Review / share ask (hidden unless a milestone toast requests it)
    const reviewContainer = document.createElement('div');
    reviewContainer.id = 'link-title-copy-pro-toast-review';

    toastElement.appendChild(row);
    toastElement.appendChild(previewContainer);
    toastElement.appendChild(reviewContainer);

    (document.body || document.documentElement).appendChild(toastElement);
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

  // Update review / share ask. Rebuilt each call so a normal toast never keeps
  // a stale ask from a previous milestone toast.
  const reviewDiv = toastElement.querySelector('#link-title-copy-pro-toast-review');
  if (reviewDiv) {
    reviewDiv.textContent = '';
    if (review) {
      renderReview(reviewDiv, review);
      reviewDiv.style.display = 'flex';
    } else if (report) {
      renderReport(reviewDiv, report);
      reviewDiv.style.display = 'flex';
    } else {
      reviewDiv.style.display = 'none';
    }
  }

  // The review/share ask stays until the user acts or dismisses it — they copied
  // that #50 content to actually use it, so the ask must survive their paste task
  // and still be there when they come back. A failure toast with a report action
  // lingers longer than a normal one so the user can click it; normal toasts are brief.
  const visibleFor = typeof duration === 'number' ? duration : report ? 7000 : 2000;
  const persist = !!review;

  // Show toast
  // Remove show class first to reset transition if already shown (optional, but good for rapid clicks)
  toastElement.classList.remove('show');
  
  // Force reflow
  void toastElement.offsetWidth;

  requestAnimationFrame(() => {
    toastElement.classList.add('show');
    // Celebrate the milestone — only when the review/share ask is present.
    if (review) launchFireworks();
  });

  // Clear existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Hide after duration — unless this is the persistent review ask.
  if (!persist) {
    toastTimeout = setTimeout(() => {
      toastElement.classList.remove('show');
    }, visibleFor);
  }
}

// Build the review / share prompt inside the toast. `review` carries the store
// URLs plus already-localized labels (attached by the content script).
function renderReview(container, review) {
  const prompt = document.createElement('div');
  prompt.id = 'link-title-copy-pro-toast-review-prompt';
  prompt.textContent = review.prompt;

  const actions = document.createElement('div');
  actions.id = 'link-title-copy-pro-toast-review-actions';

  const reviewBtn = document.createElement('button');
  reviewBtn.className = 'link-title-copy-pro-toast-btn link-title-copy-pro-toast-btn-primary';
  reviewBtn.textContent = review.reviewLabel;
  reviewBtn.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ action: 'reviewAction', kind: 'review' });
    } catch { /* extension context gone — nothing to do */ }
    hideToast();
  });

  const shareBtn = document.createElement('button');
  shareBtn.className = 'link-title-copy-pro-toast-btn';
  shareBtn.textContent = review.shareLabel;
  shareBtn.addEventListener('click', () => {
    // Once the share text is on the clipboard, the user still has to go paste it
    // somewhere. Turn the toast into a paste guide and keep it up (with a manual
    // dismiss) rather than yanking it away while they switch to a chat app.
    const finish = () => {
      try {
        chrome.runtime.sendMessage({ action: 'reviewAction', kind: 'share' });
      } catch { /* extension context gone */ }
      if (toastTimeout) clearTimeout(toastTimeout); // stay persistent
      const p = container.querySelector('#link-title-copy-pro-toast-review-prompt');
      if (p) p.textContent = review.sharedMsg;
      actions.textContent = '';
      const gotItBtn = document.createElement('button');
      gotItBtn.className = 'link-title-copy-pro-toast-btn';
      gotItBtn.textContent = review.gotItLabel;
      gotItBtn.addEventListener('click', hideToast);
      actions.appendChild(gotItBtn);
    };
    // Copy the persuasive blurb + store link (falls back to the bare link).
    const sharePayload = review.shareText
      ? `${review.shareText}\n${review.storeUrl}`
      : review.storeUrl;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(sharePayload).then(finish).catch(finish);
    } else {
      finish();
    }
  });

  // Subtle dismiss so the persistent ask is always closeable. On the final nudge
  // this becomes an explicit opt-out ("Don't ask again") that stops asking forever;
  // otherwise it's a plain "Later" that just hides and lets it return at +50.
  const laterBtn = document.createElement('button');
  laterBtn.className = 'link-title-copy-pro-toast-btn link-title-copy-pro-toast-btn-ghost';
  if (review.lastAsk) {
    laterBtn.textContent = review.dontAskAgainLabel;
    laterBtn.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ action: 'reviewAction', kind: 'dismiss' });
      } catch { /* extension context gone */ }
      hideToast();
    });
  } else {
    laterBtn.textContent = review.laterLabel;
    laterBtn.addEventListener('click', hideToast);
  }

  actions.appendChild(reviewBtn);
  actions.appendChild(shareBtn);
  actions.appendChild(laterBtn);
  container.appendChild(prompt);
  container.appendChild(actions);
}

// Single "Report problem" action on a copy-failure toast. Clicking it asks the
// background to open a pre-filled GitHub issue (nothing is sent automatically).
function renderReport(container, report) {
  const actions = document.createElement('div');
  actions.id = 'link-title-copy-pro-toast-review-actions';

  const btn = document.createElement('button');
  btn.className = 'link-title-copy-pro-toast-btn link-title-copy-pro-toast-btn-ghost';
  btn.textContent = report.label;
  btn.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ action: 'reportCopyIssue' });
    } catch { /* extension context gone */ }
    hideToast();
  });

  actions.appendChild(btn);
  container.appendChild(actions);
}

function hideToast() {
  if (toastTimeout) clearTimeout(toastTimeout);
  if (toastElement) toastElement.classList.remove('show');
}

// A one-shot confetti/firework burst emanating from around the toast. Pure
// DOM + CSS, no dependencies; the container removes itself when done.
function launchFireworks() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = toastElement ? toastElement.getBoundingClientRect() : null;
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : 80;

  const container = document.createElement('div');
  container.id = 'link-title-copy-pro-fx';
  container.style.left = `${cx}px`;
  container.style.top = `${cy}px`;

  const colors = ['#fbbf24', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#34d399'];
  const COUNT = 36;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'link-title-copy-pro-fx-p';
    const angle = (Math.PI * 2 * i) / COUNT + (Math.random() - 0.5) * 0.3;
    const dist = 70 + Math.random() * 70;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--r', `${Math.random() * 360}deg`);
    p.style.setProperty('--delay', `${Math.random() * 0.08}s`);
    container.appendChild(p);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), 1300);
}
