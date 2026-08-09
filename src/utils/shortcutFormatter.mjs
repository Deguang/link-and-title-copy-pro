// @ts-check
/**
 * How a stored shortcut is rendered on screen.
 *
 * Stored values are always the plain ASCII form ("Ctrl+Shift+C"); this module
 * only decides what the user *sees*, and it is the single source of truth for
 * every surface (popup, options, onboarding) so a shortcut never looks like two
 * different things in two places.
 *
 * Platform conventions differ, and following the wrong one is what makes a
 * keycap unreadable:
 *  - macOS users read ⌘ ⌥ ⇧ ⌃ fluently — Apple's own menus use them.
 *  - Windows/Linux have no such tradition: modifiers are spelled out. Showing
 *    ⌘ or the ⊞ glyph there is meaningless (and ⊞ renders inconsistently across
 *    fonts), so those are never used off macOS.
 *
 * Cross-platform configs are handled too: a shortcut captured on a Mac and
 * viewed on Windows shows "Cmd", not ⌘.
 */

/** macOS modifier glyphs, per Apple HIG. */
const MAC_KEYS = {
    Command: '⌘',
    Cmd: '⌘',
    Meta: '⌘',
    Ctrl: '⌃',
    Control: '⌃',
    Shift: '⇧',
    Alt: '⌥',
    Option: '⌥',
    Win: '⌘',
};

/** Windows / Linux: spelled out. No ⌘, no ⊞. */
const WIN_KEYS = {
    Command: 'Cmd',
    Cmd: 'Cmd',
    Meta: 'Win',
    Ctrl: 'Ctrl',
    Control: 'Ctrl',
    Shift: 'Shift',
    Alt: 'Alt',
    Option: 'Alt',
    Win: 'Win',
};

/** Non-modifier keys that need a readable label on both platforms. */
const COMMON_KEYS = {
    ' ': 'Space',
    Space: 'Space',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Escape: 'Esc',
    Enter: '↵',
    Backspace: '⌫',
    Delete: 'Del',
    Tab: 'Tab',
};

/**
 * Display label for a single key token.
 * @param {string} key   Stored token, e.g. "Ctrl", "Shift", "C".
 * @param {boolean} isMac
 * @returns {string}
 */
export function keyLabel(key, isMac) {
    if (!key) return '';
    const table = isMac ? MAC_KEYS : WIN_KEYS;
    if (table[key]) return table[key];
    if (COMMON_KEYS[key]) return COMMON_KEYS[key];
    // Single letters read better capitalised on a keycap.
    return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Split a stored shortcut into its tokens.
 * Handles "Ctrl++" (the literal plus key) without producing empty segments.
 * @param {string} shortcut
 * @returns {string[]}
 */
export function splitShortcut(shortcut) {
    if (!shortcut) return [];
    const parts = shortcut.split('+');
    const out = [];
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '') {
            // An empty segment means the key itself was "+": "Ctrl++" → ['Ctrl','+'].
            if (i + 1 < parts.length && parts[i + 1] === '') {
                out.push('+');
                i++;
            } else if (i === parts.length - 1) {
                out.push('+');
            }
        } else {
            out.push(parts[i]);
        }
    }
    return out;
}

/**
 * Display labels for every token in a shortcut — what a keycap row renders.
 * @param {string} shortcut
 * @param {boolean} isMac
 * @returns {string[]}
 */
export function shortcutLabels(shortcut, isMac) {
    return splitShortcut(shortcut).map((k) => keyLabel(k, isMac));
}

/**
 * Flat display string, for places without room for individual keycaps
 * (tooltips, `title` attributes, plain-text contexts).
 * @param {string} shortcut
 * @param {boolean} isMac
 * @returns {string}
 */
export function formatShortcut(shortcut, isMac) {
    const labels = shortcutLabels(shortcut, isMac);
    if (!labels.length) return '';
    // macOS convention omits the separators; elsewhere keep them readable.
    return isMac ? labels.join('') : labels.join('+');
}

/** True when the current platform is macOS. */
export function detectIsMac() {
    const p =
        (typeof navigator !== 'undefined' &&
            (navigator.userAgentData?.platform || navigator.platform)) ||
        '';
    return p.toLowerCase().includes('mac');
}
