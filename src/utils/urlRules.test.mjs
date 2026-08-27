import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_RULES, hostMatches, compileRule, validateRule, applyRules } from './urlRules.mjs';
import { shortenUrl } from './shortUrl.mjs';

test('host patterns cover subdomains', () => {
    assert.ok(hostMatches('www.hobbylobby.com', 'hobbylobby.com'));
    assert.ok(hostMatches('shop.hobbylobby.com', 'hobbylobby.com'));
    assert.ok(hostMatches('hobbylobby.com', 'hobbylobby.com'));
});

test('a wildcard tld covers every marketplace', () => {
    for (const h of ['amazon.com', 'www.amazon.co.uk', 'amazon.de', 'smile.amazon.com']) {
        assert.ok(hostMatches(h, 'amazon.*'), h);
    }
});

test('a host pattern does not match a lookalike domain', () => {
    // The suffix has to fall on a label boundary, or notamazon.com would match.
    assert.equal(hostMatches('notamazon.com', 'amazon.*'), false);
    assert.equal(hostMatches('amazon.com.evil.example', 'amazon.*'), false);
    assert.equal(hostMatches('myhobbylobby.com', 'hobbylobby.com'), false);
});

test('every preset compiles', () => {
    for (const rule of PRESET_RULES) {
        assert.equal(validateRule(rule), '', `${rule.id}: ${validateRule(rule)}`);
    }
});

test('preset ids are unique', () => {
    const ids = PRESET_RULES.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length);
});

test('an invalid regex is reported, not thrown', () => {
    assert.equal(validateRule({ host: 'x.com', match: '([', replace: '/a' }), 'patternInvalid');
});

test('a nested quantifier is refused before it can run', () => {
    // The classic catastrophic-backtracking shape; a user typo shouldn't be able
    // to lock up the page the copy is happening on.
    assert.equal(validateRule({ host: 'x.com', match: '^(a+)+$', replace: '/a' }), 'patternUnsafe');
    assert.equal(compileRule({ host: 'x.com', match: '(\\d*)*', replace: '/a' }).ok, false);
});

test('missing fields are reported individually', () => {
    assert.equal(validateRule({ host: '', match: 'a', replace: 'b' }), 'missingHost');
    assert.equal(validateRule({ host: 'x.com', match: '', replace: 'b' }), 'missingMatch');
    assert.equal(validateRule({ host: 'x.com', match: 'a', replace: '' }), 'missingReplace');
});

test('a user rule handles a site with no preset', () => {
    const mine = [{
        id: 'u1', label: 'My shop', host: 'example-shop.com',
        match: '^/products/[^/]+/(\\d+)(?:[/?].*)?$', replace: '/p/$1',
    }];
    assert.equal(
        shortenUrl('https://example-shop.com/products/a-very-long-name/8899?utm_source=x', mine),
        'https://example-shop.com/p/8899'
    );
});

test('a user rule takes precedence over a preset for the same site', () => {
    const mine = [{
        id: 'u2', label: 'Amazon mine', host: 'amazon.*',
        match: '^.*/dp/([A-Z0-9]{10}).*$', replace: 'https://amzn.example/$1',
    }];
    assert.equal(
        shortenUrl('https://www.amazon.com/Long-Title/dp/B0D4HLHW8B/', mine),
        'https://amzn.example/B0D4HLHW8B'
    );
});

test('a disabled rule is skipped', () => {
    const off = PRESET_RULES.map(r => (r.id === 'amazon' ? { ...r, enabled: false } : r));
    assert.equal(
        applyRules('https://www.amazon.com/Long/dp/B0D4HLHW8B/', off),
        null
    );
});

test('a broken user rule is skipped rather than breaking the copy', () => {
    const bad = [{ id: 'b', label: 'bad', host: 'amazon.*', match: '([', replace: '/x' }];
    // The preset still applies, so the copy is unaffected by the typo.
    assert.equal(
        shortenUrl('https://www.amazon.com/Long-Title/dp/B0D4HLHW8B/', bad),
        'https://www.amazon.com/dp/B0D4HLHW8B'
    );
});

test('a rule cannot send a link off to another scheme', () => {
    const evil = [{ id: 'e', label: 'e', host: 'example.com', match: '^/(.*)$', replace: 'javascript:alert(1)' }];
    const out = shortenUrl('https://example.com/page', evil);
    assert.ok(!out.startsWith('javascript:'), out);
});

test('an absurdly long url is left alone rather than fed to a regex', () => {
    const long = 'https://example.com/' + 'a'.repeat(5000);
    assert.equal(applyRules(long, PRESET_RULES), null);
});

test('no rule matching returns null, distinct from an unchanged rewrite', () => {
    assert.equal(applyRules('https://example.com/nothing/here', PRESET_RULES), null);
});

test('user rules reach the copy, not just the settings preview', async () => {
    // The whole feature hinges on this: rules are read from storage by whoever
    // is copying and threaded through as context. Expanding a template without
    // them is what a half-wired version looks like.
    const { processTemplate } = await import('./templateProcessor.mjs');
    const mine = [{
        id: 'u1', label: 'My shop', host: 'example-shop.com',
        match: '^/products/[^/]+/(\\d+)(?:[/?].*)?$', replace: '/p/$1',
    }];
    const url = 'https://example-shop.com/products/a-very-long-name/8899?utm_source=news';

    assert.equal(
        processTemplate('{url:short}', { url, urlRules: mine }),
        'https://example-shop.com/p/8899'
    );
    // Without them the preset path still applies and tracking still goes.
    assert.equal(
        processTemplate('{url:short}', { url }),
        'https://example-shop.com/products/a-very-long-name/8899'
    );
});

test('a template mixing both url forms expands each correctly', () => {
    // {url:short} and {url:notrack} share a prefix; a careless replace order
    // would leave "{url:notrack}" as "<shortened>rack}".
    const url = 'https://www.amazon.com/Long-Title/dp/B0D4HLHW8B/?utm_source=x';
    return import('./templateProcessor.mjs').then(({ processTemplate }) => {
        assert.equal(
            processTemplate('{url:short} | {url:notrack}', { url }),
            'https://www.amazon.com/dp/B0D4HLHW8B | https://www.amazon.com/Long-Title/dp/B0D4HLHW8B/'
        );
    });
});
