// Review / share nudge.
//
// We ask exactly once for a store review or a share, early — around the 10th
// copy, while "this thing is handy" is still fresh — and preferably right after
// a highlight moment (a copy that actually stripped tracking parameters, or a
// successful batch copy). The ask piggybacks on the copy success toast that
// already appears on every shortcut copy — it is NOT a separate interruption.
// Whatever the user does with it (rate, share, dismiss, or just walk away), it
// never comes back: re-asking only trains people to click the close button.
//
// State (chrome.storage.local):
//   reviewCopyCount : total successful copies (across shortcut + popup paths)
//   reviewAsks      : >0 once the ask has been shown → never ask again
//   reviewAskedAt   : copy count at which the ask was shown (spaces out the Ko-fi toast)
//   reviewHighlight : a batch copy happened in the popup (which has no on-page
//                     toast) → the next on-page copy counts as a highlight
//   reviewNextAt    : legacy (≤ v1.14 re-ask schedule), read only for Ko-fi spacing
//   reviewDone      : user clicked Review, Share, or "No thanks" → never ask again
//   reviewOptOut    : user turned reminders off in Settings → never ask (user-facing toggle)
//   kofiShown       : the one-time Ko-fi thank-you has been shown → never again

export const REVIEW_KEYS = {
  count: 'reviewCopyCount',
  nextAt: 'reviewNextAt',
  asks: 'reviewAsks',
  askedAt: 'reviewAskedAt',
  highlight: 'reviewHighlight',
  done: 'reviewDone',
  optOut: 'reviewOptOut',
  kofiShown: 'kofiShown',
};

// Storage key for the Settings toggle (true = user opted out of reminders).
export const REVIEW_OPT_OUT_KEY = REVIEW_KEYS.optOut;

// From the REVIEW_MIN_COPIES-th copy on, ask on the first highlight moment. If
// none has come by REVIEW_FALLBACK_COPIES, ask on an ordinary copy instead.
export const REVIEW_MIN_COPIES = 10;
export const REVIEW_FALLBACK_COPIES = 20;
// The old schedule re-asked every 50 copies; only used to place the Ko-fi gap
// for users whose last ask happened under it.
const LEGACY_REVIEW_INTERVAL = 50;

// Chrome Web Store listing for this extension.
export const STORE_URL =
  'https://chromewebstore.google.com/detail/kakoelinbkchhkjcbgjgmailplkhpkod';
export const REVIEW_URL = `${STORE_URL}/reviews`;

// One-time Ko-fi thank-you, separate from the rate/share ask. It lands around the
// 100th copy, but never on the same copy as a rate/share ask and never within
// KOFI_GAP copies after one, so the two nudges don't stack.
export const KOFI_THRESHOLD = 100;
export const KOFI_GAP = 20;
export const KOFI_URL = 'https://ko-fi.com/deguang';

function get(keys) {
  return new Promise((resolve) =>
    chrome.storage.local.get(keys, (r) => resolve(r || {}))
  );
}
function set(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

// Increment the running copy total by n. Returns the new total.
export async function recordCopies(n = 1) {
  const s = await get(REVIEW_KEYS.count);
  const count = (s[REVIEW_KEYS.count] || 0) + n;
  await set({ [REVIEW_KEYS.count]: count });
  return count;
}

// A batch copy succeeded in the popup. The popup can't show the on-page toast,
// so remember it and let the next on-page copy carry the ask.
export function markReviewHighlight() {
  return set({ [REVIEW_KEYS.highlight]: true });
}

// Decide whether to surface the ask right now. Call this only on a path that can
// actually render the prompt (the on-page success toast). `highlight` is true when
// this copy is a highlight moment (e.g. it stripped tracking parameters). When it
// returns true it also records the ask, so it never fires again.
export async function shouldPromptReview({ highlight = false } = {}) {
  const s = await get([
    REVIEW_KEYS.count,
    REVIEW_KEYS.asks,
    REVIEW_KEYS.done,
    REVIEW_KEYS.optOut,
    REVIEW_KEYS.highlight,
  ]);
  if (s[REVIEW_KEYS.done] || s[REVIEW_KEYS.optOut]) return false;
  if ((s[REVIEW_KEYS.asks] || 0) > 0) return false;
  const count = s[REVIEW_KEYS.count] || 0;
  if (count < REVIEW_MIN_COPIES) return false;
  const moment = highlight || !!s[REVIEW_KEYS.highlight];
  if (!moment && count < REVIEW_FALLBACK_COPIES) return false;
  await set({
    [REVIEW_KEYS.asks]: 1,
    [REVIEW_KEYS.askedAt]: count,
    [REVIEW_KEYS.highlight]: false,
  });
  return true;
}

// User acted on the ask (reviewed, shared, or "No thanks") — stop forever.
export function markReviewDone() {
  return set({ [REVIEW_KEYS.done]: true });
}

// Decide whether to show the one-time Ko-fi thank-you. Call it only after
// shouldPromptReview() returned false for this copy. Marks itself shown when
// it fires, so it appears once whatever the user clicks. Honors the same Settings
// opt-out as the rate/share ask.
export async function shouldPromptKofi() {
  const s = await get([
    REVIEW_KEYS.count,
    REVIEW_KEYS.nextAt,
    REVIEW_KEYS.asks,
    REVIEW_KEYS.askedAt,
    REVIEW_KEYS.optOut,
    REVIEW_KEYS.kofiShown,
  ]);
  if (s[REVIEW_KEYS.optOut] || s[REVIEW_KEYS.kofiShown]) return false;
  const count = s[REVIEW_KEYS.count] || 0;
  if (count < KOFI_THRESHOLD) return false;
  if ((s[REVIEW_KEYS.asks] || 0) > 0) {
    const lastAskAt = s[REVIEW_KEYS.askedAt] ??
      (s[REVIEW_KEYS.nextAt] || LEGACY_REVIEW_INTERVAL) - LEGACY_REVIEW_INTERVAL;
    if (count - lastAskAt < KOFI_GAP) return false;
  }
  await set({ [REVIEW_KEYS.kofiShown]: true });
  return true;
}
