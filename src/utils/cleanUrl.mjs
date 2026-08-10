// @ts-check
/**
 * Strips tracking parameters from a URL while keeping the ones the page needs.
 *
 * The previous {url:clean} was `origin + pathname`, which throws away the whole
 * query string. That silently breaks any link whose identity lives there — a
 * YouTube watch URL without ?v= is not the video, a search result without ?q= is
 * not the search. A link that no longer opens is worse than one carrying utm
 * tags, so this removes only what is known to be tracking and leaves the rest.
 */

/**
 * Parameters that exist to attribute traffic and nothing else. Removing any of
 * these cannot change what the page shows.
 */
const TRACKING_PARAMS = new Set([
    // Google Analytics / UTM
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
    // Google Ads / click IDs
    'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source',
    // Facebook / Meta
    'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
    // Microsoft / Bing
    'msclkid',
    // Twitter / X
    'twclid', 's', 't',
    // TikTok, Snapchat, LinkedIn, Reddit, Pinterest
    'ttclid', 'sc_cid', 'li_fat_id', 'rdt_cid', 'epik',
    // Yandex
    'yclid', '_openstat',
    // HubSpot, Marketo, Mailchimp, Klaviyo and other email platforms
    '_hsenc', '_hsmi', 'hsCtaTracking', 'mkt_tok', 'mc_cid', 'mc_eid',
    '_ke', 'vero_conv', 'vero_id',
    // Matomo / Piwik
    'pk_campaign', 'pk_kwd', 'pk_source', 'pk_medium', 'pk_content',
    'piwik_campaign', 'piwik_kwd',
    // Adobe, Oracle, Salesforce
    'ef_id', 'sc_campaign', 'sc_channel', 'sc_content', 'sc_medium',
    'sc_outcome', 'trk', 'trkCampaign',
    // Instagram, Igshid
    'igshid', 'igsh',
    // Misc referral / session noise
    'ref', 'ref_src', 'ref_url', 'referrer', 'source', 'spm', 'scm',
    'share_source', 'share_medium', 'from', 'from_source',
]);

/**
 * Prefixes covering whole families of tracking parameters, so new members of a
 * family don't need adding one by one.
 */
const TRACKING_PREFIXES = ['utm_', 'pk_', 'piwik_', 'matomo_', 'ga_', 'hsa_', '_bta_'];

/**
 * Hosts where a parameter listed above is actually load-bearing. `s` and `t` are
 * tracking on x.com but meaningful elsewhere; `ref` identifies a resource on
 * some sites. Removing a parameter must never change the page, so anything
 * ambiguous is kept unless the host is known.
 */
const HOST_KEEP = {
    'youtube.com': ['t', 's'],
    'youtu.be': ['t', 's'],
    'google.com': ['s', 't', 'source'],
    'amazon.com': ['t', 's', 'ref'],
    'github.com': ['s', 't', 'ref'],
    'stackoverflow.com': ['s', 't'],
};

/** @param {string} host */
function keepListFor(host) {
    const h = host.replace(/^www\./, '');
    for (const [domain, keep] of Object.entries(HOST_KEEP)) {
        if (h === domain || h.endsWith('.' + domain)) return keep;
    }
    return [];
}

/**
 * @param {string} name
 * @param {string[]} keep
 */
function isTracking(name, keep) {
    if (keep.includes(name)) return false;
    if (TRACKING_PARAMS.has(name)) return true;
    return TRACKING_PREFIXES.some((p) => name.startsWith(p));
}

/**
 * Removes tracking parameters, preserving everything else including the path,
 * the remaining query and the fragment.
 *
 * @param {string} url
 * @returns {string} The cleaned URL, or the input unchanged if it can't be parsed.
 */
export function cleanUrl(url) {
    if (!url) return '';
    let u;
    try {
        u = new URL(url);
    } catch {
        return url; // Not a URL we can reason about — better untouched than mangled.
    }

    const keep = keepListFor(u.hostname);
    const names = [...u.searchParams.keys()];
    for (const name of names) {
        if (isTracking(name, keep)) u.searchParams.delete(name);
    }

    // A query that is now empty should leave no bare "?" behind.
    let out = u.toString();
    if (!u.searchParams.toString()) out = out.replace(/\?(?=#|$)/, '');
    return out;
}

/**
 * Everything after the origin and path removed — the old {url:clean} behaviour,
 * kept for the placeholder that explicitly asks for it.
 *
 * @param {string} url
 */
export function stripQuery(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        return `${u.origin}${u.pathname}`;
    } catch {
        return url;
    }
}
