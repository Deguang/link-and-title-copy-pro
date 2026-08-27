// @ts-check
/**
 * A pattern language for URL rules, in place of a raw regular expression.
 *
 * Every built-in rule was doing the same thing — drop the part of the path
 * that's there for readers, keep the id — and a regex is a heavy way to say it:
 *
 *   ^(?:/[^/]+)?/(?:dp|gp/product)/([A-Z0-9]{10})(?:[/?].*)?$
 *   **\/dp/:asin
 *
 * The syntax is small enough to learn from one example:
 *
 *   :name        one path segment, captured for the replacement
 *   :name(num)   the same, but only digits
 *   *            one segment, ignored
 *   **           any number of segments, ignored
 *   ?a=:x&b=:y   query parameters — and *only* those, so a URL carrying
 *                anything else fails to match rather than silently losing it
 *
 * Leaving the query out of a pattern means the query is ignored, which is what
 * you want when it holds nothing but tracking and session noise.
 */

/** @typedef {{ ok: true, re: RegExp, names: string[] }} Compiled */
/** @typedef {{ ok: false, error: string }} Failed */

const SEGMENT = '[^/?]+';
const NAME = /^:([A-Za-z][A-Za-z0-9_]*)(?:\((num)\))?$/;

/** @param {string} s */
function escapeLiteral(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} pattern
 * @returns {Compiled | Failed}
 */
export function compilePattern(pattern) {
    if (typeof pattern !== 'string' || !pattern.trim()) return { ok: false, error: 'missingMatch' };

    const [rawPath, ...queryParts] = pattern.trim().split('?');
    const rawQuery = queryParts.join('?');

    /** @type {string[]} */
    const names = [];
    let body = '';

    for (const seg of rawPath.split('/')) {
        if (seg === '') continue; // leading slash, or a trailing one
        if (seg === '**') { body += `(?:/${SEGMENT})*`; continue; }
        if (seg === '*') { body += `/${SEGMENT}`; continue; }

        const m = NAME.exec(seg);
        if (m) {
            if (names.includes(m[1])) return { ok: false, error: 'duplicateName' };
            names.push(m[1]);
            body += m[2] === 'num' ? '/(\\d+)' : `/(${SEGMENT})`;
            continue;
        }
        if (seg.includes(':')) return { ok: false, error: 'badName' };
        body += `/${escapeLiteral(seg)}`;
    }

    // A trailing slash is noise; a URL with or without one is the same page.
    let source = `^${body || '/?'}/?`;

    if (rawQuery) {
        // Listing parameters means exactly those, in that order. Anything extra —
        // a playlist on a YouTube link, say — fails the match, and the URL is
        // left long rather than quietly losing what wasn't mentioned.
        const parts = [];
        for (const pair of rawQuery.split('&')) {
            const eq = pair.indexOf('=');
            if (eq < 1) return { ok: false, error: 'badQuery' };
            const key = pair.slice(0, eq);
            const val = pair.slice(eq + 1);
            const m = NAME.exec(val);
            if (m) {
                if (names.includes(m[1])) return { ok: false, error: 'duplicateName' };
                names.push(m[1]);
                parts.push(`${escapeLiteral(key)}=${m[2] === 'num' ? '(\\d+)' : '([^&]+)'}`);
            } else if (val.includes(':')) {
                return { ok: false, error: 'badName' };
            } else {
                parts.push(`${escapeLiteral(key)}=${escapeLiteral(val)}`);
            }
        }
        source += `\\?${parts.join('&')}`;
    } else {
        // No query in the pattern: whatever is left after tracking removal is
        // not part of the identity, so it goes.
        source += '(?:\\?.*)?';
    }

    source += '$';

    try {
        return { ok: true, re: new RegExp(source), names };
    } catch {
        return { ok: false, error: 'patternInvalid' };
    }
}

/**
 * Turns `/p/:id` into the `$1` form the rule engine substitutes into.
 *
 * @param {string} replacement
 * @param {string[]} names
 * @returns {{ ok: true, value: string } | Failed}
 */
export function compileReplacement(replacement, names) {
    if (typeof replacement !== 'string' || !replacement.trim()) {
        return { ok: false, error: 'missingReplace' };
    }
    let unknown = '';
    const value = replacement.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (whole, name) => {
        const i = names.indexOf(name);
        if (i === -1) { unknown = name; return whole; }
        return `$${i + 1}`;
    });
    // Naming something the pattern never captured is the one mistake here that
    // silently produces a broken link, so it is refused rather than passed on.
    return unknown ? { ok: false, error: 'unknownName' } : { ok: true, value };
}
