import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePattern, compileReplacement } from './urlPattern.mjs';
import { shortenUrl } from './shortUrl.mjs';

const rule = (match, replace, host = 'example.com') =>
    [{ id: 'r', label: 'r', host, syntax: 'simple', match, replace }];

test(':name captures one segment', () => {
    assert.equal(
        shortenUrl('https://example.com/products/blue-widget/1234', rule('/products/*/:id', '/p/:id')),
        'https://example.com/p/1234'
    );
});

test('* skips a segment without capturing it', () => {
    const c = compilePattern('/a/*/b');
    assert.ok(c.ok);
    assert.deepEqual(c.names, []);
});

test('** spans any number of segments, including none', () => {
    const r = rule('/itm/**/:id', '/itm/:id');
    assert.equal(shortenUrl('https://example.com/itm/a/b/c/999', r), 'https://example.com/itm/999');
    assert.equal(shortenUrl('https://example.com/itm/999', r), 'https://example.com/itm/999');
});

test('(num) refuses a segment that is not digits', () => {
    const r = rule('/p/:id(num)', '/x/:id');
    assert.equal(shortenUrl('https://example.com/p/1234', r), 'https://example.com/x/1234');
    // Left alone rather than producing /x/not-a-number.
    assert.equal(shortenUrl('https://example.com/p/not-a-number', r), 'https://example.com/p/not-a-number');
});

test('a trailing slash makes no difference', () => {
    const r = rule('/p/:id', '/x/:id');
    assert.equal(shortenUrl('https://example.com/p/7/', r), 'https://example.com/x/7');
});

test('a query is dropped when the pattern says nothing about it', () => {
    // Whatever survived tracking removal is not part of the page's identity.
    assert.equal(
        shortenUrl('https://example.com/p/7?th=1&ref_=foo', rule('/p/:id', '/x/:id')),
        'https://example.com/x/7'
    );
});

test('naming query parameters means those and no others', () => {
    const r = rule('/watch?v=:id', 'https://short.example/:id');
    assert.equal(shortenUrl('https://example.com/watch?v=abc', r), 'https://short.example/abc');
    // An unnamed parameter is not silently discarded — the rule just doesn't fire.
    const withList = 'https://example.com/watch?v=abc&list=PL1';
    assert.equal(shortenUrl(withList, r), withList);
});

test('a captured query parameter can be carried into the replacement', () => {
    // `t` is a tracking parameter off YouTube, so it would be stripped before any
    // rule saw it — the real YouTube case is covered in shortUrl.test.mjs, where
    // the host keeps it.
    assert.equal(
        shortenUrl('https://example.com/watch?v=abc&start=42', rule('/watch?v=:id&start=:s', 'https://short.example/:id?t=:s')),
        'https://short.example/abc?t=42'
    );
});

test('literal segments are matched literally, not as regex', () => {
    const r = rule('/a.b/:id', '/x/:id');
    assert.equal(shortenUrl('https://example.com/a.b/7', r), 'https://example.com/x/7');
    // The dot is a dot, so this must not match.
    assert.equal(shortenUrl('https://example.com/axb/7', r), 'https://example.com/axb/7');
});

test('a replacement naming something never captured is refused', () => {
    const c = compilePattern('/p/:id');
    assert.ok(c.ok);
    const r = compileReplacement('/x/:nope', c.names);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'unknownName');
});

test('a repeated name is refused rather than silently shadowed', () => {
    assert.equal(compilePattern('/a/:id/b/:id').error, 'duplicateName');
});

test('an empty pattern is refused', () => {
    assert.equal(compilePattern('   ').error, 'missingMatch');
});

test('a rule written as a regex still works', () => {
    // What 1.12.0 stored, and what the advanced option still produces.
    const legacy = [{ id: 'l', label: 'l', host: 'example.com', syntax: 'regex', match: '^/p/(\\d+)$', replace: '/x/$1' }];
    assert.equal(shortenUrl('https://example.com/p/7', legacy), 'https://example.com/x/7');
});

test('a regex rule stored without a syntax field is still read as regex', () => {
    const legacy = [{ id: 'l', label: 'l', host: 'example.com', match: '^/p/(\\d+)$', replace: '/x/$1' }];
    assert.equal(shortenUrl('https://example.com/p/7', legacy), 'https://example.com/x/7');
});
