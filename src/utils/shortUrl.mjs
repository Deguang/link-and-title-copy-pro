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

/**
 * Matches a host against a bare domain, allowing subdomains.
 * @param {string} host
 * @param {string} domain
 */
function hostIs(host, domain) {
    const h = host.replace(/^www\./, '');
    return h === domain || h.endsWith('.' + domain);
}

/**
 * Amazon's marketplaces all share the /dp/<ASIN> form, and the ASIN is the whole
 * identity of a listing. The country domain has to stay — amazon.co.uk and
 * amazon.com are different stores with different listings.
 *
 * @param {URL} u
 * @returns {string|null}
 */
function amazon(u) {
    if (!/(^|\.)amazon\.[a-z.]{2,}$/.test(u.hostname.replace(/^www\./, ''))) return null;
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    return m ? `${u.origin}/dp/${m[1].toUpperCase()}` : null;
}

/** @type {Array<{ test: (u: URL) => boolean, build: (u: URL) => string|null }>} */
const RULES = [
    { test: () => true, build: amazon },

    {
        // youtu.be is YouTube's own short domain. Only when the video id is all
        // that's left: a playlist, a channel or a live chat parameter would be
        // dropped, and the short form would no longer be the same thing.
        test: (u) => hostIs(u.hostname, 'youtube.com') && u.pathname === '/watch',
        build: (u) => {
            const keys = [...u.searchParams.keys()];
            const id = u.searchParams.get('v');
            if (!id || keys.some((k) => k !== 'v' && k !== 't')) return null;
            const t = u.searchParams.get('t');
            return `https://youtu.be/${id}${t ? `?t=${t}` : ''}`;
        },
    },

    {
        // Stack Exchange publishes /q/<id> and /a/<id> as permalinks.
        test: (u) => /(^|\.)(stackoverflow|superuser|serverfault|askubuntu|stackexchange)\.com$/
            .test(u.hostname.replace(/^www\./, '')),
        build: (u) => {
            const a = u.pathname.match(/^\/a\/(\d+)/) || u.pathname.match(/^\/questions\/\d+\/[^/]*\/(\d+)/);
            if (a) return `${u.origin}/a/${a[1]}`;
            const q = u.pathname.match(/^\/questions\/(\d+)/);
            return q ? `${u.origin}/q/${q[1]}` : null;
        },
    },

    {
        // redd.it is Reddit's own short domain for a submission.
        test: (u) => hostIs(u.hostname, 'reddit.com'),
        build: (u) => {
            const c = u.pathname.match(/^\/r\/[^/]+\/comments\/([a-z0-9]+)(?:\/|$)/i);
            return c ? `https://redd.it/${c[1]}` : null;
        },
    },

    {
        // The slug before the id is decoration on all of these; the id resolves
        // on its own.
        test: (u) => hostIs(u.hostname, 'ebay.com'),
        build: (u) => {
            const m = u.pathname.match(/^\/itm\/(?:[^/]+\/)?(\d{9,})/);
            return m ? `${u.origin}/itm/${m[1]}` : null;
        },
    },
    {
        test: (u) => hostIs(u.hostname, 'etsy.com'),
        build: (u) => {
            const m = u.pathname.match(/^\/listing\/(\d+)/);
            return m ? `${u.origin}/listing/${m[1]}` : null;
        },
    },
    {
        test: (u) => hostIs(u.hostname, 'walmart.com'),
        build: (u) => {
            const m = u.pathname.match(/^\/ip\/(?:[^/]+\/)?(\d+)/);
            return m ? `${u.origin}/ip/${m[1]}` : null;
        },
    },
    {
        // Target's id is the "A-" token, and the slug ahead of it is optional.
        test: (u) => hostIs(u.hostname, 'target.com'),
        build: (u) => {
            const m = u.pathname.match(/^\/p\/.*?\/-\/(A-\d+)/);
            return m ? `${u.origin}/p/-/${m[1]}` : null;
        },
    },
    {
        // The form the suggestion arrived with.
        test: (u) => hostIs(u.hostname, 'hobbylobby.com'),
        build: (u) => {
            const m = u.pathname.match(/\/p\/(\d+)(?:\/|$)/);
            return m ? `${u.origin}/p/${m[1]}` : null;
        },
    },
];

/**
 * Tracking removed, then the site's own short form where one exists.
 *
 * @param {string} url
 * @returns {string} The shortest form known to reach the same page.
 */
export function shortenUrl(url) {
    const cleaned = cleanUrl(url);
    if (!cleaned) return '';

    let u;
    try {
        u = new URL(cleaned);
    } catch {
        return cleaned;
    }

    for (const rule of RULES) {
        if (!rule.test(u)) continue;
        const short = rule.build(u);
        if (!short) continue;
        // A fragment is a position within the page, so it survives the rewrite.
        return u.hash ? short + u.hash : short;
    }
    return cleaned;
}
