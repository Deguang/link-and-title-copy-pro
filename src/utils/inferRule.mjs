// @ts-check
/**
 * Works out a rule from an example: the long URL, and the short one you know
 * reaches the same page.
 *
 * Writing the rule is the part that asks for effort, and it's the part the user
 * has the least appetite for — but they already know the answer, because they
 * found the short form by trying it. This just turns the example into a pattern.
 *
 * The inference deliberately errs towards over-fitting. A rule that is too narrow
 * simply doesn't fire on some URLs, which is a non-event; a rule that is too
 * broad rewrites URLs it shouldn't and produces links that don't open. So an
 * unreferenced path segment is kept as a literal unless it looks like prose.
 */

/** Prose written for readers: hyphenated, or simply too long to be structural. */
function looksLikeSlug(seg) {
    // Length matters: Target's path has a bare `-` as a separator segment, which
    // is structure, not prose. Swallowing it would leave a rule looser than the
    // URL it was derived from.
    if (seg.length < 4) return false;
    return seg.includes('-') || seg.includes('_') || seg.length > 20;
}

/** Carries an identity rather than a name. */
function looksLikeId(seg) {
    return /\d/.test(seg) && seg.length >= 2;
}

/**
 * @param {string} longUrl
 * @param {string} shortUrl
 * @returns {{ ok: true, host: string, match: string, replace: string, syntax: 'simple' }
 *          | { ok: false, error: string }}
 */
export function inferRule(longUrl, shortUrl) {
    let a, b;
    try {
        a = new URL(longUrl.trim());
        b = new URL(shortUrl.trim());
    } catch {
        return { ok: false, error: 'notAUrl' };
    }
    if (!/^https?:$/.test(a.protocol) || !/^https?:$/.test(b.protocol)) {
        return { ok: false, error: 'notAUrl' };
    }
    if (a.href === b.href) return { ok: false, error: 'sameUrl' };

    const longSegs = a.pathname.split('/').filter(Boolean);
    const shortSegs = b.pathname.split('/').filter(Boolean);

    // Each short segment that also appears in the long URL is a value carried
    // across; the rest are literal text the short form introduces (Stack
    // Exchange's /q/ standing in for /questions/).
    const used = new Set();
    /** @type {Array<{ literal?: string, from?: number }>} */
    const plan = [];
    for (const seg of shortSegs) {
        const at = longSegs.findIndex((s, i) => s === seg && !used.has(i));
        // A segment the short form keeps is only a *value* if it looks like one.
        // `dp`, `itm`, `p` and `listing` survive into the short URL because they
        // are part of its structure, not because they identify anything — turning
        // them into captures would produce a rule that matches any two segments.
        if (at === -1 || !looksLikeId(seg)) { plan.push({ literal: seg }); continue; }
        used.add(at);
        plan.push({ from: at });
    }

    if (![...plan].some((p) => p.from !== undefined)) {
        // Nothing in the short URL came from the long one, so there is no rule
        // here — just two different addresses.
        return { ok: false, error: 'noCommonPart' };
    }

    // Name the captures after what they look like, so the rule reads back.
    /** @type {Map<number, string>} */
    const names = new Map();
    for (const p of plan) {
        if (p.from === undefined) continue;
        const name = names.size === 0 ? 'id' : `id${names.size + 1}`;
        names.set(p.from, name);
    }

    // Build the pattern from the long URL, collapsing runs of prose into `**`.
    const parts = [];
    let pendingSkip = false;
    longSegs.forEach((seg, i) => {
        if (names.has(i)) {
            if (pendingSkip) { parts.push('**'); pendingSkip = false; }
            // All-digits gets the tighter form, so the rule declines a URL whose
            // id slot holds something else rather than building a broken link.
            parts.push(`:${names.get(i)}${/^\d+$/.test(seg) ? '(num)' : ''}`);
            return;
        }
        if (looksLikeSlug(seg)) { pendingSkip = true; return; }
        if (pendingSkip) { parts.push('**'); pendingSkip = false; }
        parts.push(seg);
    });
    if (pendingSkip) parts.push('**');

    // A leading `**` is written bare; `/**` would just mean the same thing.
    const match = parts[0] === '**' ? parts.join('/') : '/' + parts.join('/');
    const replaceParts = plan.map((p) => (p.from !== undefined ? `:${names.get(p.from)}` : p.literal));
    const path = '/' + replaceParts.join('/');
    // A short form on another host — youtu.be for a YouTube watch URL — needs the
    // whole address, not just a path.
    const replace = a.origin === b.origin ? path : `${b.origin}${path}`;

    // The rule is matched against the URL being copied, so it is the long form's
    // host that matters. Taking the short form's would give Reddit a rule keyed
    // on redd.it, which is the one host it would never see.
    return { ok: true, host: a.hostname.replace(/^www\./, ''), match, replace, syntax: 'simple' };
}
