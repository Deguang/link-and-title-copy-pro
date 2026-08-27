// @ts-check
/**
 * Rules for rewriting a URL to a site's own short form.
 *
 * One format for both the built-in rules and anything a user adds, so the
 * presets double as worked examples: open the list, see how Amazon is done,
 * write your own the same way.
 *
 * A rule matches against `pathname + search` and produces either a new path or a
 * whole URL. Matching the search string too is what lets a rule stay narrow —
 * an anchored YouTube pattern simply fails on a URL carrying a playlist, so the
 * link is left long rather than quietly losing the list.
 *
 * @typedef {Object} UrlRule
 * @property {string} id        Stable key. User rules get a generated one.
 * @property {string} label     Shown in settings.
 * @property {string} host      Domain suffix; `*` stands in for the TLD.
 * @property {string} match     Regex source, tested against pathname + search.
 * @property {string} replace   Replacement: a path, or a full URL to move host.
 * @property {boolean} [enabled]
 */

import { compilePattern, compileReplacement } from './urlPattern.mjs';

/** Longer than any real URL; a bound on what a user's regex can chew on. */
const MAX_URL = 4096;
const MAX_PATTERN = 300;

/**
 * Rules shipped with the extension. Ordered — the first match wins, so the more
 * specific rule comes first (a linked answer before its question).
 *
 * @type {UrlRule[]}
 */
export const PRESET_RULES = [
    {
        id: 'amazon', label: 'Amazon', host: 'amazon.*', syntax: 'simple',
        // The ASIN is the whole identity of a listing; everything ahead of it is
        // there for readers and search engines. The country domain is untouched,
        // because .co.uk and .com are different catalogues.
        match: '**/dp/:asin', replace: '/dp/:asin',
    },
    {
        id: 'amazon-gp', label: 'Amazon (product page)', host: 'amazon.*', syntax: 'simple',
        match: '/gp/product/:asin', replace: '/dp/:asin',
    },
    {
        id: 'youtube-t', label: 'YouTube (with timestamp)', host: 'youtube.com', syntax: 'simple',
        match: '/watch?v=:id&t=:t', replace: 'https://youtu.be/:id?t=:t',
    },
    {
        id: 'youtube', label: 'YouTube', host: 'youtube.com', syntax: 'simple',
        // Naming only `v` is what keeps a playlist link long: the extra
        // parameter fails the match rather than being dropped.
        match: '/watch?v=:id', replace: 'https://youtu.be/:id',
    },
    {
        id: 'stackexchange-a', label: 'Stack Exchange (answer)', host: 'stackoverflow.com', syntax: 'simple',
        match: '/questions/:q(num)/*/:a(num)', replace: '/a/:a',
    },
    {
        id: 'stackexchange-q', label: 'Stack Exchange (question)', host: 'stackoverflow.com', syntax: 'simple',
        match: '/questions/:q(num)/**', replace: '/q/:q',
    },
    {
        id: 'reddit', label: 'Reddit', host: 'reddit.com', syntax: 'simple',
        match: '/r/*/comments/:id/**', replace: 'https://redd.it/:id',
    },
    {
        id: 'ebay', label: 'eBay', host: 'ebay.com', syntax: 'simple',
        match: '/itm/**/:id(num)', replace: '/itm/:id',
    },
    {
        id: 'etsy', label: 'Etsy', host: 'etsy.com', syntax: 'simple',
        match: '/listing/:id(num)/**', replace: '/listing/:id',
    },
    {
        id: 'walmart', label: 'Walmart', host: 'walmart.com', syntax: 'simple',
        match: '/ip/**/:id(num)', replace: '/ip/:id',
    },
    {
        id: 'target', label: 'Target', host: 'target.com', syntax: 'simple',
        match: '/p/**/-/:id', replace: '/p/-/:id',
    },
    {
        id: 'hobbylobby', label: 'Hobby Lobby', host: 'hobbylobby.com', syntax: 'simple',
        match: '**/p/:id(num)', replace: '/p/:id',
    },
];

/**
 * A host pattern is a domain suffix, so subdomains match, and `*` stands in for
 * the TLD so one Amazon rule covers every marketplace.
 *
 * @param {string} host
 * @param {string} pattern
 */
export function hostMatches(host, pattern) {
    if (!host || !pattern) return false;
    const h = host.toLowerCase().replace(/^www\./, '');
    const p = pattern.toLowerCase().trim().replace(/^www\./, '');
    if (p === '*') return true;
    const body = p
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        // A `*` stands for a TLD — one label, or two for the likes of .co.uk —
        // and no more. Left unbounded it would also swallow
        // `amazon.com.somewhere-else.example`, handing a lookalike domain the
        // rule written for the real one.
        .join('[a-z0-9-]+(?:\\.[a-z0-9-]+)?');
    // Either the host itself, or any subdomain of it.
    return new RegExp(`(^|\\.)${body}$`).test(h);
}

/**
 * Catastrophic backtracking is the one way a user-written pattern can hurt the
 * page it runs on. Input is capped hard, and the classic nested-quantifier shape
 * is refused outright — between them a pathological pattern has nothing to chew
 * on. This isn't a general safety proof; it's the cheap 90% that keeps a typo
 * from freezing a tab.
 *
 * @param {string} source
 */
function looksCatastrophic(source) {
    return /\([^)]*[+*][^)]*\)\s*[+*]/.test(source) || /(\[[^\]]*\][+*]){2,}/.test(source);
}

/**
 * @param {UrlRule} rule
 * @returns {{ ok: true, re: RegExp } | { ok: false, error: string }}
 */
export function compileRule(rule) {
    if (!rule || !rule.host || !rule.match) return { ok: false, error: 'incomplete' };
    if (rule.match.length > MAX_PATTERN) return { ok: false, error: 'patternTooLong' };

    // Rules stored before the pattern syntax existed carry no `syntax` field and
    // meant a raw regex, so that is what absent means. New rules say 'simple'.
    if (rule.syntax === 'regex' || (!rule.syntax && looksLikeRegex(rule.match))) {
        if (looksCatastrophic(rule.match)) return { ok: false, error: 'patternUnsafe' };
        try {
            return { ok: true, re: new RegExp(rule.match), replace: rule.replace };
        } catch {
            return { ok: false, error: 'patternInvalid' };
        }
    }

    const compiled = compilePattern(rule.match);
    if (!compiled.ok) return compiled;
    const replacement = compileReplacement(rule.replace, compiled.names);
    if (!replacement.ok) return replacement;
    return { ok: true, re: compiled.re, replace: replacement.value };
}

/**
 * Only for rules stored before `syntax` existed. Bare parentheses are not a
 * signal — `:id(num)` has them — so this looks for the things the pattern syntax
 * never produces: an anchor, an escape, a character class, or a group modifier.
 */
function looksLikeRegex(source) {
    return /^\^|[\\[\]{}|+$]|\(\?/.test(source);
}

/**
 * Checks a rule without applying it, for the settings UI.
 *
 * @param {UrlRule} rule
 * @returns {string} An error code, or '' when the rule is usable.
 */
export function validateRule(rule) {
    if (!rule?.host?.trim()) return 'missingHost';
    if (!rule?.match?.trim()) return 'missingMatch';
    if (!rule?.replace?.trim()) return 'missingReplace';
    const c = compileRule(rule);
    return c.ok ? '' : c.error;
}

/**
 * Like applyRules, but says which rule fired — the settings page names it, so a
 * result can be traced back to the line that produced it.
 *
 * @param {string} url
 * @param {UrlRule[]} rules
 * @returns {{ url: string, rule: UrlRule } | null}
 */
export function matchRule(url, rules) {
    return applyRules(url, rules, true);
}

/**
 * First matching rule wins. Returns null when none apply, so the caller can tell
 * "no rule matched" from "a rule produced the same URL".
 *
 * @param {string} url    Already stripped of tracking.
 * @param {UrlRule[]} rules
 * @param {boolean} [withRule] Return the rule alongside the URL.
 * @returns {string|{url: string, rule: UrlRule}|null}
 */
export function applyRules(url, rules, withRule = false) {
    if (!url || url.length > MAX_URL || !Array.isArray(rules)) return null;

    let u;
    try {
        u = new URL(url);
    } catch {
        return null;
    }

    const target = u.pathname + u.search;

    for (const rule of rules) {
        if (rule?.enabled === false) continue;
        if (!hostMatches(u.hostname, rule.host)) continue;

        const compiled = compileRule(rule);
        if (!compiled.ok) continue;
        if (!compiled.re.test(target)) continue;

        const out = target.replace(compiled.re, compiled.replace);
        // A replacement may move the host, so anything absolute is taken whole.
        const next = /^https?:\/\//i.test(out) ? out : u.origin + (out.startsWith('/') ? out : `/${out}`);

        try {
            const parsed = new URL(next);
            // A rule that produced nonsense shouldn't be able to send a link
            // somewhere unrelated: the result has to stay http(s).
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
            const out2 = u.hash ? parsed.toString() + u.hash : parsed.toString();
            return withRule ? { url: out2, rule } : out2;
        } catch {
            continue;
        }
    }
    return null;
}
