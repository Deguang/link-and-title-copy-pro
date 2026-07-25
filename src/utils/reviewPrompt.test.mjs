import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordCopies,
  shouldPromptReview,
  markReviewDone,
  REVIEW_KEYS,
  REVIEW_THRESHOLD,
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
