// Review / share nudge.
//
// After the user has copied enough times to clearly find the extension useful,
// we ask (once) for a store review or a share. The ask piggybacks on the copy
// success toast that already appears on every shortcut copy — it is NOT a
// separate interruption — and it is never shown again once the user acts.
//
// State (chrome.storage.local):
//   reviewCopyCount : total successful copies (across shortcut + popup paths)
//   reviewNextAt    : copy count at which the next ask may fire
//   reviewAsks      : how many times we have already asked
//   reviewDone      : user clicked Review, Share, or "Don't ask again" → never ask again
//   reviewOptOut    : user turned reminders off in Settings → never ask (user-facing toggle)
//   kofiShown       : the one-time Ko-fi thank-you has been shown → never again

export const REVIEW_KEYS = {
  count: 'reviewCopyCount',
  nextAt: 'reviewNextAt',
  asks: 'reviewAsks',
  done: 'reviewDone',
  optOut: 'reviewOptOut',
  kofiShown: 'kofiShown',
};

// Storage key for the Settings toggle (true = user opted out of reminders).
export const REVIEW_OPT_OUT_KEY = REVIEW_KEYS.optOut;

// Ask on the 50th copy. If ignored, ask again every REVIEW_INTERVAL copies,
// up to REVIEW_MAX_ASKS times total, then give up.
export const REVIEW_THRESHOLD = 50;
export const REVIEW_INTERVAL = 50;
export const REVIEW_MAX_ASKS = 3;

// Chrome Web Store listing for this extension.
export const STORE_URL =
  'https://chromewebstore.google.com/detail/kakoelinbkchhkjcbgjgmailplkhpkod';
export const REVIEW_URL = `${STORE_URL}/reviews`;

// One-time Ko-fi thank-you, separate from the rate/share ask. It lands around the
// 100th copy, but never on the same copy as a rate/share ask and never within
// KOFI_GAP copies after one, so the two nudges don't stack (with the default
// cadence that puts it at copy 120 for users who haven't rated yet).
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

// Decide whether to surface the ask right now. Call this only on a path that can
// actually render the prompt (the on-page success toast). When `show` is true it
// also advances the schedule so the same milestone won't fire again immediately.
// `lastAsk` is true when this is the final permitted nudge (so the UI can offer a
// "Don't ask again" instead of "Later").
export async function shouldPromptReview() {
  const none = { show: false, lastAsk: false };
  const s = await get([
    REVIEW_KEYS.count,
    REVIEW_KEYS.nextAt,
    REVIEW_KEYS.asks,
    REVIEW_KEYS.done,
    REVIEW_KEYS.optOut,
  ]);
  if (s[REVIEW_KEYS.done] || s[REVIEW_KEYS.optOut]) return none;
  const count = s[REVIEW_KEYS.count] || 0;
  const nextAt = s[REVIEW_KEYS.nextAt] || REVIEW_THRESHOLD;
  const asks = s[REVIEW_KEYS.asks] || 0;
  if (count < nextAt || asks >= REVIEW_MAX_ASKS) return none;
  const newAsks = asks + 1;
  await set({
    [REVIEW_KEYS.nextAt]: count + REVIEW_INTERVAL,
    [REVIEW_KEYS.asks]: newAsks,
  });
  return { show: true, lastAsk: newAsks >= REVIEW_MAX_ASKS };
}

// User acted on the ask (reviewed, shared, or "Don't ask again") — stop forever.
export function markReviewDone() {
  return set({ [REVIEW_KEYS.done]: true });
}

// Decide whether to show the one-time Ko-fi thank-you. Call it only after
// shouldPromptReview() returned show:false for this copy. Marks itself shown when
// it fires, so it appears once whatever the user clicks. Honors the same Settings
// opt-out as the rate/share ask.
export async function shouldPromptKofi() {
  const s = await get([
    REVIEW_KEYS.count,
    REVIEW_KEYS.nextAt,
    REVIEW_KEYS.asks,
    REVIEW_KEYS.optOut,
    REVIEW_KEYS.kofiShown,
  ]);
  if (s[REVIEW_KEYS.optOut] || s[REVIEW_KEYS.kofiShown]) return false;
  const count = s[REVIEW_KEYS.count] || 0;
  if (count < KOFI_THRESHOLD) return false;
  if ((s[REVIEW_KEYS.asks] || 0) > 0) {
    const lastAskAt = (s[REVIEW_KEYS.nextAt] || REVIEW_THRESHOLD) - REVIEW_INTERVAL;
    if (count - lastAskAt < KOFI_GAP) return false;
  }
  await set({ [REVIEW_KEYS.kofiShown]: true });
  return true;
}
