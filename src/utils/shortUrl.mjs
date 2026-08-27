// @ts-check
/**
 * Canonical short forms, where a site publishes one.
 *
 * Plenty of sites carry the whole title in the path purely for humans and search
 * engines, and answer to a much shorter URL built from the id alone —
 * amazon.com/dp/B0D4HLHW8B rather than
 * amazon.com/Portable-Transistor-Suitable-Emergency-BJL-671/dp/B0D4HLHW8B/. It's
 * a URL shortener's result without a URL shortener: no third party, no redirect,
 * nothing to expire, and still readable.
 *
 * Every rule here has to be *lossless*: the short form must reach the same page,
 * for everyone, indefinitely. A shortened link that 404s is far worse than a long
 * one, so anything uncertain is left alone. Where no rule matches, the URL comes
 * back with tracking stripped and nothing else changed.
 *
 * Suggested by a user who had built the same thing as a bookmarklet.
 */

import { cleanUrl } from './cleanUrl.mjs';
import { PRESET_RULES, applyRules } from './urlRules.mjs';

/**
 * Tracking removed, then the site's own short form where a rule matches.
 *
 * User rules are tried before the presets, so someone can correct or override a
 * built-in rule for a site rather than being stuck with it.
 *
 * @param {string} url
 * @param {import('./urlRules.mjs').UrlRule[]} [userRules]
 * @returns {string} The shortest form known to reach the same page.
 */
export function shortenUrl(url, userRules = []) {
    const cleaned = cleanUrl(url);
    if (!cleaned) return '';
    const rules = Array.isArray(userRules) && userRules.length
        ? [...userRules, ...PRESET_RULES]
        : PRESET_RULES;
    // No rule matching is the normal case, and means the cleaned URL is already
    // the shortest form we can vouch for.
    return applyRules(cleaned, rules) || cleaned;
}
