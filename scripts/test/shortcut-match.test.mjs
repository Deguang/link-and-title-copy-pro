// Verifies keyboard-shortcut matching for the cases we cannot easily reproduce
// on a US-layout machine without an IME: IME composition and non-US layouts.
//   node scripts/test/shortcut-match.test.mjs

import assert from 'node:assert';
import { matchShortcut } from '../../src/utils/shortcutMatch.mjs';

const win = [{ shortcut: 'Ctrl+Shift+P', i: 0 }, { shortcut: 'Ctrl+Shift+L', i: 1 }];
const ev = (o) => ({ ctrlKey: false, shiftKey: false, metaKey: false, altKey: false, ...o });

let passed = 0;
const check = (name, cond) => { assert.ok(cond, name); passed++; };

// Baseline: US layout, normal keypress.
check('US layout Ctrl+Shift+P',
  matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'P', code: 'KeyP' }), win, { isMac: false })?.i === 0);

// Lowercase e.key (Shift not reflected in some engines) still matches.
check('lowercase key still matches',
  matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'p', code: 'KeyP' }), win, { isMac: false })?.i === 0);

// THE BUG: IME active -> e.key becomes 'Process', but e.code is intact.
check('IME e.key=Process matches via e.code',
  matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'Process', code: 'KeyP' }), win, { isMac: false })?.i === 0);

// THE BUG: Cyrillic layout -> physical P produces 'з'; match via e.code.
check('Cyrillic layout matches via e.code',
  matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'з', code: 'KeyP' }), win, { isMac: false })?.i === 0);

// 'Unidentified' key (some Android/IME) -> match via e.code.
check('Unidentified key matches via e.code',
  matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'Unidentified', code: 'KeyL' }), win, { isMac: false })?.i === 1);

// No false positive: a different physical key must NOT match.
check('different key does not match',
  matchShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'A', code: 'KeyA' }), win, { isMac: false }) === null);

// No false positive: missing a required modifier must NOT match.
check('missing modifier does not match',
  matchShortcut(ev({ ctrlKey: true, key: 'P', code: 'KeyP' }), win, { isMac: false }) === null);

// Mac: Meta maps to Command.
check('Mac Command+Shift+P',
  matchShortcut(ev({ metaKey: true, shiftKey: true, key: 'P', code: 'KeyP' }), [{ shortcut: 'Command+Shift+P', i: 9 }], { isMac: true })?.i === 9);

// Windows: Meta maps to Win (so a Mac-style 'Command+...' must NOT match on Win).
check('Win Meta does not match Command shortcut',
  matchShortcut(ev({ metaKey: true, shiftKey: true, key: 'P', code: 'KeyP' }), [{ shortcut: 'Command+Shift+P' }], { isMac: false }) === null);

console.log(`✓ all ${passed} shortcut-match tests passed`);
