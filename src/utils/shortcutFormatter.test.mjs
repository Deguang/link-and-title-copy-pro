import test from 'node:test';
import assert from 'node:assert/strict';
import { keyLabel, splitShortcut, shortcutLabels, formatShortcut } from './shortcutFormatter.mjs';

const MAC = true;
const WIN = false;

test('mac renders Apple modifier glyphs', () => {
    assert.equal(keyLabel('Command', MAC), '⌘');
    assert.equal(keyLabel('Ctrl', MAC), '⌃');
    assert.equal(keyLabel('Shift', MAC), '⇧');
    assert.equal(keyLabel('Alt', MAC), '⌥');
    assert.equal(keyLabel('Option', MAC), '⌥');
});

test('windows spells modifiers out and never shows mac glyphs', () => {
    for (const k of ['Ctrl', 'Shift', 'Alt', 'Win', 'Command']) {
        const label = keyLabel(k, WIN);
        assert.ok(!/[⌘⌥⇧⌃⊞]/.test(label), `${k} rendered a symbol on Windows: ${label}`);
    }
    assert.equal(keyLabel('Ctrl', WIN), 'Ctrl');
    assert.equal(keyLabel('Shift', WIN), 'Shift');
    assert.equal(keyLabel('Alt', WIN), 'Alt');
    assert.equal(keyLabel('Win', WIN), 'Win');
});

test('a mac-captured Command shows as Cmd on windows, not an unknown glyph', () => {
    assert.equal(keyLabel('Command', WIN), 'Cmd');
});

test('the obsolete ⊞ glyph is never produced', () => {
    assert.equal(keyLabel('Win', WIN), 'Win');
    assert.ok(!formatShortcut('Win+Shift+S', WIN).includes('⊞'));
});

test('single letters are capitalised', () => {
    assert.equal(keyLabel('c', WIN), 'C');
    assert.equal(keyLabel('C', MAC), 'C');
});

test('named keys get readable labels', () => {
    assert.equal(keyLabel('ArrowUp', WIN), '↑');
    assert.equal(keyLabel(' ', WIN), 'Space');
    assert.equal(keyLabel('Escape', WIN), 'Esc');
});

test('unknown keys pass through unchanged', () => {
    assert.equal(keyLabel('F5', WIN), 'F5');
});

test('splitShortcut handles ordinary combinations', () => {
    assert.deepEqual(splitShortcut('Ctrl+Shift+C'), ['Ctrl', 'Shift', 'C']);
});

test('splitShortcut handles the literal plus key without empty segments', () => {
    assert.deepEqual(splitShortcut('Ctrl++'), ['Ctrl', '+']);
    assert.ok(!splitShortcut('Ctrl++').includes(''));
});

test('splitShortcut on empty input returns an empty list', () => {
    assert.deepEqual(splitShortcut(''), []);
    assert.deepEqual(shortcutLabels('', MAC), []);
});

test('formatShortcut follows each platform convention', () => {
    assert.equal(formatShortcut('Command+Shift+C', MAC), '⌘⇧C');
    assert.equal(formatShortcut('Ctrl+Shift+C', WIN), 'Ctrl+Shift+C');
});

test('the same stored value renders consistently through both entry points', () => {
    const stored = 'Ctrl+Shift+L';
    assert.equal(shortcutLabels(stored, WIN).join('+'), formatShortcut(stored, WIN));
});
