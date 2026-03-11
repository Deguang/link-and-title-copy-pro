export const KEY_SYMBOLS_MAC = {
  Command: '⌘', Ctrl: '⌃', Shift: '⇧', Alt: '⌥', Option: '⌥', Win: '⊞',
};

export const KEY_SYMBOLS_WIN = {
  Command: '⌘', Ctrl: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Option: 'Alt', Win: '⊞',
};

export function getKeySymbols(os) {
  return os === 'mac' ? KEY_SYMBOLS_MAC : KEY_SYMBOLS_WIN;
}

export function formatShortcut(shortcut, isMac) {
  if (!shortcut) return '';
  if (isMac) {
    return shortcut
      .replace('Command', '⌘').replace('Ctrl', '⌃')
      .replace('Shift', '⇧').replace(/Alt|Option/g, '⌥')
      .replace(/\+/g, '');
  }
  return shortcut
    .replace('Command', '⌘').replace('Win', '⊞')
    .replace(/\+/g, ' ');
}
