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

export const REVIEW_KEYS = {
  count: 'reviewCopyCount',
  nextAt: 'reviewNextAt',
  asks: 'reviewAsks',
  done: 'reviewDone',
  optOut: 'reviewOptOut',
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
