import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchShortcut } from './shortcutMatch.mjs';

const win = [{ shortcut: 'Ctrl+Shift+P', i: 0 }, { shortcut: 'Ctrl+Shift+L', i: 1 }];
const ev = (o) => ({ ctrlKey: false, shiftKey: false, metaKey: false, altKey: false, ...o });

describe('matchShortcut — matches via physical key (e.code)', () => {
  test('US layout Ctrl+Shift+P', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'P', code: 'KeyP' }), win, { isMac: false })?.i, 0);
  });
  test('lowercase e.key still matches', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'p', code: 'KeyP' }), win, { isMac: false })?.i, 0);
  });
  test('IME e.key="Process" matches via e.code', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'Process', code: 'KeyP' }), win, { isMac: false })?.i, 0);
  });
  test('Cyrillic layout matches via e.code', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'з', code: 'KeyP' }), win, { isMac: false })?.i, 0);
  });
  test('"Unidentified" key matches via e.code', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'Unidentified', code: 'KeyL' }), win, { isMac: false })?.i, 1);
  });
});

describe('matchShortcut — no false positives', () => {
  test('a different physical key does not match', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'A', code: 'KeyA' }), win, { isMac: false }), null);
  });
  test('a missing modifier does not match', () => {
    assert.equal(matchShortcut(ev({ ctrlKey: true, key: 'P', code: 'KeyP' }), win, { isMac: false }), null);
  });
});
