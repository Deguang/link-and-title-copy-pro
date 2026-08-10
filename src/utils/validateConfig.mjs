// @ts-check
/**
 * Template/shortcut validation.
 *
 * Deliberately advisory: the options page auto-saves, so validation NEVER blocks
 * a write (blocking would silently discard the user's typing). Instead we persist
 * whatever was typed and surface problems in the UI, so a half-finished config is
 * visibly marked rather than quietly broken.
 *
 * Every placeholder understood by processTemplate(). Anything else inside braces
 * is left verbatim in the copied text, which is almost always a typo.
 */
export const KNOWN_PLACEHOLDERS = new Set([
    'title',
    'url',
    'selectedText',
    'url:clean',
    'url:notrack',
    'url:protocol',
    'url:domain',
    'url:path',
    'url:query',
    'url:hash',
    'url:origin',
    'selectedText|title',
    'title|selectedText',
    'selectedTextWithQuote',
    'selectedTextWithBrackets',
    'selectedTextWithContext',
    // Conditional block tags
    'if:selectedText',
    '/if:selectedText',
    'if:noSelectedText',
    '/if:noSelectedText',
    'selectedText?',
    '/selectedText?',
    'noSelectedText?',
    '/noSelectedText?',
]);

/** Paired conditional tags: opening token -> closing token. */
const CONDITIONAL_PAIRS = [
    ['if:selectedText', '/if:selectedText'],
    ['if:noSelectedText', '/if:noSelectedText'],
    ['selectedText?', '/selectedText?'],
    ['noSelectedText?', '/noSelectedText?'],
];

/**
 * @typedef {Object} Issue
 * @property {string} code    Stable identifier (maps to an i18n key in the UI).
 * @property {'error'|'warning'} level
 * @property {'shortcut'|'template'} field
 * @property {string} [value] Offending token, for message interpolation.
 */

/**
 * Validate one config against the whole list (needed to spot duplicate shortcuts).
 *
 * @param {{shortcut?: string, template?: string}} config
 * @param {Object} [options]
 * @param {Array<{shortcut?: string}>} [options.allConfigs] Full list, to detect duplicates.
 * @param {number} [options.index] Index of `config` within allConfigs.
 * @returns {Issue[]} Empty when the config is fully usable.
 */
export function validateConfig(config, options = {}) {
    const { allConfigs = [], index = -1 } = options;
    /** @type {Issue[]} */
    const issues = [];

    const shortcut = (config?.shortcut || '').trim();
    const template = config?.template || '';

    // --- Shortcut ---------------------------------------------------------
    if (!shortcut) {
        // A template without a shortcut is still reachable from the popup and the
        // context menu, so this is a note about what you give up, not a fault.
        issues.push({ code: 'missingShortcut', level: 'warning', field: 'shortcut' });
    } else if (index >= 0) {
        // Only the first config with a given shortcut ever runs; later ones are dead.
        const firstIdx = allConfigs.findIndex(c => (c?.shortcut || '').trim() === shortcut);
        if (firstIdx !== -1 && firstIdx < index) {
            issues.push({ code: 'duplicateShortcut', level: 'error', field: 'shortcut', value: shortcut });
        }
    }

    // --- Template ---------------------------------------------------------
    if (!template.trim()) {
        issues.push({ code: 'emptyTemplate', level: 'error', field: 'template' });
        return issues; // Nothing further worth checking on an empty template.
    }

    // Unknown tokens survive into the clipboard verbatim — flag each distinct one.
    const seen = new Set();
    for (const match of template.matchAll(/\{([^{}]*)\}/g)) {
        const token = match[1];
        if (!KNOWN_PLACEHOLDERS.has(token) && !seen.has(token)) {
            seen.add(token);
            issues.push({ code: 'unknownPlaceholder', level: 'warning', field: 'template', value: `{${token}}` });
        }
    }

    // Unbalanced conditionals: the processor's regex needs both halves, so a lone
    // tag is copied out literally.
    for (const [open, close] of CONDITIONAL_PAIRS) {
        const opens = countOccurrences(template, `{${open}}`);
        const closes = countOccurrences(template, `{${close}}`);
        if (opens !== closes) {
            issues.push({ code: 'unclosedTag', level: 'warning', field: 'template', value: `{${open}}` });
        }
    }

    // processTemplate only enters its conditional branch when the template contains
    // {if:selectedText} or {selectedText?}. A template using ONLY the negative form
    // never gets processed and leaks its tags into the output.
    const hasPositiveGate = template.includes('{if:selectedText}') || template.includes('{selectedText?}');
    const hasNegativeOnly = template.includes('{if:noSelectedText}') || template.includes('{noSelectedText?}');
    if (hasNegativeOnly && !hasPositiveGate) {
        issues.push({ code: 'negativeConditionalOnly', level: 'warning', field: 'template' });
    }

    return issues;
}

/** True when the config has no blocking problems. */
export function isConfigUsable(config, options) {
    return !validateConfig(config, options).some(i => i.level === 'error');
}

function countOccurrences(haystack, needle) {
    let count = 0;
    let pos = haystack.indexOf(needle);
    while (pos !== -1) {
        count++;
        pos = haystack.indexOf(needle, pos + needle.length);
    }
    return count;
}
