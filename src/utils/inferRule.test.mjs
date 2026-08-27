import test from 'node:test';
import assert from 'node:assert/strict';
import { inferRule } from './inferRule.mjs';
import { PRESET_RULES } from './urlRules.mjs';
import { shortenUrl } from './shortUrl.mjs';

/** Compares shape, ignoring what the captures happen to be called. */
const shape = (s) => s.replace(/:\w+/g, ':X');

/**
 * Each example is the pair a user would paste: the long URL, and the short one
 * they know works. The expected rule is the one written by hand for that site.
 */
const EXAMPLES = [
    ['amazon',
        'https://www.amazon.com/Portable-Transistor-Suitable-Emergency-BJL-671/dp/B0D4HLHW8B/',
        'https://www.amazon.com/dp/B0D4HLHW8B'],
    ['stackexchange-q',
        'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster',
        'https://stackoverflow.com/q/11227809'],
    ['ebay', 'https://www.ebay.com/itm/some-long-title/123456789012', 'https://www.ebay.com/itm/123456789012'],
    ['etsy', 'https://www.etsy.com/listing/1234567890/hand-made-thing', 'https://www.etsy.com/listing/1234567890'],
    ['walmart', 'https://www.walmart.com/ip/Some-Product-Name/123456789', 'https://www.walmart.com/ip/123456789'],
    ['target', 'https://www.target.com/p/some-product-name/-/A-12345678', 'https://www.target.com/p/-/A-12345678'],
];

test('inference reproduces the hand-written rule from one example', () => {
    for (const [id, long, short] of EXAMPLES) {
        const got = inferRule(long, short);
        const want = PRESET_RULES.find((r) => r.id === id);
        assert.ok(got.ok, `${id}: ${got.error}`);
        assert.equal(shape(got.match), shape(want.match), id);
        assert.equal(shape(got.replace), shape(want.replace), id);
    }
});

test('the rule is keyed on the host being copied from, not the short one', () => {
    // Reddit shortens to redd.it; a rule keyed on that would never fire.
    const r = inferRule(
        'https://www.reddit.com/r/programming/comments/1abc2de/some_long_title/',
        'https://redd.it/1abc2de'
    );
    assert.ok(r.ok);
    assert.equal(r.host, 'reddit.com');
    assert.equal(r.replace, 'https://redd.it/:id');
});

test('an inferred rule actually shortens the URL it came from', () => {
    for (const [, long, short] of EXAMPLES) {
        const rule = inferRule(long, short);
        assert.equal(shortenUrl(long, [{ id: 'x', label: 'x', ...rule }]), short, long);
    }
});

test('a structural segment stays literal instead of becoming a capture', () => {
    // `dp` survives into the short URL because it is part of the address, not
    // because it identifies anything. Capturing it would give **/:a/:b, which
    // matches almost any two segments.
    const r = inferRule('https://shop.example/Long-Name/dp/B0D4HLHW8B/', 'https://shop.example/dp/B0D4HLHW8B');
    assert.ok(r.match.includes('/dp/'), r.match);
});

test('a one-character separator is not mistaken for prose', () => {
    // Target's path has a bare `-` between the slug and the id.
    const r = inferRule('https://www.target.com/p/a-name/-/A-123', 'https://www.target.com/p/-/A-123');
    assert.ok(r.match.includes('/-/'), r.match);
});

test('inference errs narrow: an unrecognised segment is kept, not generalised', () => {
    // Over-fitting means the rule sometimes doesn't fire, which is a non-event.
    // Over-generalising rewrites URLs it shouldn't, and those links don't open.
    const r = inferRule(
        'https://www.hobbylobby.com/home-decor/shelves/brown-wall-shelf/p/80778424',
        'https://www.hobbylobby.com/p/80778424'
    );
    assert.ok(r.ok);
    assert.ok(r.match.includes('shelves'), r.match);
});

test('two unrelated URLs produce no rule rather than a wrong one', () => {
    assert.equal(inferRule('https://a.example/x/1', 'https://b.example/totally/other').error, 'noCommonPart');
});

test('bad input is reported, not guessed at', () => {
    assert.equal(inferRule('not a url', 'https://a.example/x').error, 'notAUrl');
    assert.equal(inferRule('https://a.example/x', 'https://a.example/x').error, 'sameUrl');
    assert.equal(inferRule('javascript:alert(1)', 'https://a.example/x').error, 'notAUrl');
});
