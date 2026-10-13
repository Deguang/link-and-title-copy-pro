import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordCopies,
  shouldPromptReview,
  markReviewDone,
  markReviewHighlight,
  shouldPromptKofi,
  REVIEW_KEYS,
  REVIEW_MIN_COPIES,
  REVIEW_FALLBACK_COPIES,
  KOFI_THRESHOLD,
} from './reviewPrompt.mjs';

// In-memory chrome.storage.local mock, reset per test.
let store;
beforeEach(() => {
  store = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: (keys, cb) => {
          const k = Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const key of k) if (key in store) out[key] = store[key];
          cb(out);
        },
        set: (obj, cb) => { Object.assign(store, obj); if (cb) cb(); },
      },
    },
  };
});

const copyN = async (n) => { for (let i = 0; i < n; i++) await recordCopies(1); };

describe('recordCopies', () => {
  test('accumulates the running total', async () => {
    await copyN(3);
    assert.equal(store[REVIEW_KEYS.count], 3);
    await recordCopies(10);
    assert.equal(store[REVIEW_KEYS.count], 13);
  });
});

describe('shouldPromptReview — timing', () => {
  test('a highlight before the minimum does not ask', async () => {
    await copyN(REVIEW_MIN_COPIES - 1);
    assert.equal(await shouldPromptReview({ highlight: true }), false);
  });

  test('asks on the first highlight once the minimum is reached', async () => {
    await copyN(REVIEW_MIN_COPIES);
    assert.equal(await shouldPromptReview(), false); // ordinary copy
    await copyN(1);
    assert.equal(await shouldPromptReview({ highlight: true }), true);
    assert.equal(store[REVIEW_KEYS.askedAt], REVIEW_MIN_COPIES + 1);
  });

  test('a batch copy in the popup makes the next on-page copy ask', async () => {
    await copyN(REVIEW_MIN_COPIES);
    await markReviewHighlight();
    await copyN(1);
    assert.equal(await shouldPromptReview(), true);
    assert.equal(store[REVIEW_KEYS.highlight], false);
  });

  test('falls back to an ordinary copy if no highlight comes', async () => {
    await copyN(REVIEW_FALLBACK_COPIES - 1);
    assert.equal(await shouldPromptReview(), false);
    await copyN(1);
    assert.equal(await shouldPromptReview(), true);
  });

  test('asks only once, even if ignored', async () => {
    await copyN(REVIEW_FALLBACK_COPIES);
    assert.equal(await shouldPromptReview(), true);
    for (let i = 0; i < 200; i++) {
      await copyN(1);
      assert.equal(await shouldPromptReview({ highlight: true }), false);
    }
  });

  test('a user already asked under the old 50/100/150 schedule is never asked again', async () => {
    store[REVIEW_KEYS.count] = 60;
    store[REVIEW_KEYS.asks] = 1;
    store[REVIEW_KEYS.nextAt] = 100;
    assert.equal(await shouldPromptReview({ highlight: true }), false);
  });
});

describe('shouldPromptReview — stop conditions', () => {
  test('never prompts once markReviewDone() is set', async () => {
    await copyN(REVIEW_FALLBACK_COPIES);
    await markReviewDone();
    assert.equal(await shouldPromptReview(), false);
  });

  test('respects the Settings opt-out and restores when re-enabled', async () => {
    await copyN(REVIEW_FALLBACK_COPIES);
    store[REVIEW_KEYS.optOut] = true;
    assert.equal(await shouldPromptReview(), false);
    store[REVIEW_KEYS.optOut] = false;
    assert.equal(await shouldPromptReview(), true);
  });
});

// Mirrors background.js: the rate/share ask gets first claim on each copy, and
// the Ko-fi thank-you only takes a copy it didn't. Returns which nudge fired.
const copyAndAsk = async () => {
  await recordCopies(1);
  if (await shouldPromptReview()) return 'review';
  if (await shouldPromptKofi()) return 'kofi';
  return null;
};
const nudgesOver = async (n) => {
  const fired = {};
  for (let i = 1; i <= n; i++) {
    const what = await copyAndAsk();
    if (what) fired[i] = what;
  }
  return fired;
};

describe('shouldPromptKofi', () => {
  test('stays silent before the threshold', async () => {
    await copyN(KOFI_THRESHOLD - 1);
    assert.equal(await shouldPromptKofi(), false);
  });

  test('fires once at the threshold when the rate/share ask is done', async () => {
    await copyN(KOFI_THRESHOLD);
    await markReviewDone();
    assert.equal(await shouldPromptKofi(), true);
    assert.equal(await shouldPromptKofi(), false);
  });

  test('one early rate/share ask, Ko-fi at 100', async () => {
    assert.deepEqual(await nudgesOver(250), { [REVIEW_FALLBACK_COPIES]: 'review', 100: 'kofi' });
  });

  test('keeps its gap from a late ask', async () => {
    store[REVIEW_KEYS.count] = 99;
    assert.deepEqual(await nudgesOver(30), { 1: 'review', 21: 'kofi' }); // copies 100 and 120
  });

  test('keeps its gap from an ask made under the old schedule', async () => {
    store[REVIEW_KEYS.count] = 105;
    store[REVIEW_KEYS.asks] = 2;
    store[REVIEW_KEYS.nextAt] = 150; // last ask at 100
    assert.equal(await shouldPromptKofi(), false);
    store[REVIEW_KEYS.count] = 120;
    assert.equal(await shouldPromptKofi(), true);
  });

  test('respects the Settings opt-out', async () => {
    store[REVIEW_KEYS.optOut] = true;
    assert.deepEqual(await nudgesOver(200), {});
  });
});
