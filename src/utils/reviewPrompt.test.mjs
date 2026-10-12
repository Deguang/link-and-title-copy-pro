import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordCopies,
  shouldPromptReview,
  markReviewDone,
  shouldPromptKofi,
  REVIEW_KEYS,
  REVIEW_THRESHOLD,
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

describe('shouldPromptReview — cadence', () => {
  test('stays silent before the threshold', async () => {
    await copyN(REVIEW_THRESHOLD - 1);
    assert.equal((await shouldPromptReview()).show, false);
  });

  test('fires ask #1 at the threshold, not the last', async () => {
    await copyN(REVIEW_THRESHOLD);
    assert.deepEqual(await shouldPromptReview(), { show: true, lastAsk: false });
    assert.equal(store[REVIEW_KEYS.asks], 1);
    assert.equal(store[REVIEW_KEYS.nextAt], 100);
  });

  test('does not repeat until the next interval', async () => {
    await copyN(REVIEW_THRESHOLD);
    await shouldPromptReview();
    assert.equal((await shouldPromptReview()).show, false);
  });

  test('escalates to lastAsk on the 3rd ask, then stops', async () => {
    await copyN(50); assert.equal((await shouldPromptReview()).lastAsk, false); // #1
    await copyN(50); assert.equal((await shouldPromptReview()).lastAsk, false); // #2
    await copyN(50); assert.equal((await shouldPromptReview()).lastAsk, true);  // #3
    await copyN(50); assert.equal((await shouldPromptReview()).show, false);    // capped
  });
});

describe('shouldPromptReview — stop conditions', () => {
  test('never prompts once markReviewDone() is set', async () => {
    await copyN(50);
    await markReviewDone();
    assert.equal((await shouldPromptReview()).show, false);
  });

  test('respects the Settings opt-out and restores when re-enabled', async () => {
    await copyN(50);
    store[REVIEW_KEYS.optOut] = true;
    assert.equal((await shouldPromptReview()).show, false);
    store[REVIEW_KEYS.optOut] = false;
    assert.equal((await shouldPromptReview()).show, true);
  });
});

// Mirrors background.js: the rate/share ask gets first claim on each copy, and
// the Ko-fi thank-you only takes a copy it didn't. Returns which nudge fired.
const copyAndAsk = async () => {
  await recordCopies(1);
  if ((await shouldPromptReview()).show) return 'review';
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

  test('never stacks on the rate/share cadence: review 50/100/150, Ko-fi 120', async () => {
    assert.deepEqual(await nudgesOver(250), { 50: 'review', 100: 'review', 120: 'kofi', 150: 'review' });
  });

  test('lands at 100 for a user who already rated at 50', async () => {
    const fired = {};
    for (let i = 1; i <= 200; i++) {
      const what = await copyAndAsk();
      if (what) fired[i] = what;
      if (what === 'review') await markReviewDone(); // rated on the first ask
    }
    assert.deepEqual(fired, { 50: 'review', 100: 'kofi' });
  });

  test('respects the Settings opt-out', async () => {
    store[REVIEW_KEYS.optOut] = true;
    assert.deepEqual(await nudgesOver(200), {});
  });
});
