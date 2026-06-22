// Pure, testable shortcut matching used by the content script.
//
// Matches a keydown event against the user's configured shortcut strings. It
// builds candidates from BOTH the typed key (e.key) and a layout/IME-independent
// fallback derived from the physical code (e.code), so a shortcut like
// "Ctrl+Shift+P" still matches when an IME turns e.key into "Process" or a non-US
// (e.g. Cyrillic) layout produces a different character on the same physical key.
//
// Kept free of DOM/chrome APIs so it can be unit-tested in Node.

export function normalizeKey(key) {
  if (!key) return '';
  if (key === 'Meta') return 'Command';
  if (key === 'Control') return 'Ctrl';
  if (key === ' ') return 'Space';
  if (key === 'ArrowUp') return '↑';
  if (key === 'ArrowDown') return '↓';
  if (key === 'ArrowLeft') return '←';
  if (key === 'ArrowRight') return '→';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

// Derive the main key from the physical code (e.g. 'KeyP' -> 'P', 'Digit1' -> '1').
// Returns null for codes we don't map.
export function keyFromCode(code) {
  if (!code) return null;
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
  if ((m = /^Digit([0-9])$/.exec(code))) return m[1];
  return null;
}

// Build the ordered list of shortcut strings a keydown could match.
export function buildShortcutCandidates(e, { isMac } = {}) {
  const modifiers = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.metaKey) modifiers.push(isMac ? 'Command' : 'Win');
  if (e.altKey) modifiers.push(isMac ? 'Option' : 'Alt');
  if (e.shiftKey) modifiers.push('Shift');

  const candidates = [];
  const mainKey = normalizeKey(e.key);
  if (mainKey) candidates.push([...modifiers, mainKey].join('+'));

  const codeKey = keyFromCode(e.code);
  if (codeKey && codeKey !== mainKey) candidates.push([...modifiers, codeKey].join('+'));

  return candidates;
}

// Return the first configured shortcut matching the event, or null.
export function matchShortcut(e, shortcuts, { isMac } = {}) {
  const candidates = buildShortcutCandidates(e, { isMac });
  return shortcuts.find((c) => c && candidates.includes(c.shortcut)) || null;
}
