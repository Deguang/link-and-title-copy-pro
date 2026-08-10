import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanUrl, stripQuery } from './cleanUrl.mjs';

test('removes utm parameters', () => {
    assert.equal(
        cleanUrl('https://example.com/post?utm_source=newsletter&utm_medium=email'),
        'https://example.com/post'
    );
});

test('keeps parameters the page needs', () => {
    // The whole point: a watch URL without ?v= is not the video.
    assert.equal(
        cleanUrl('https://www.youtube.com/watch?v=abc123&utm_source=twitter'),
        'https://www.youtube.com/watch?v=abc123'
    );
});

test('keeps a search query while dropping the click id', () => {
    assert.equal(
        cleanUrl('https://example.com/search?q=design+systems&gclid=xyz'),
        'https://example.com/search?q=design+systems'
    );
});

test('removes click ids from the major ad networks', () => {
    for (const p of ['gclid', 'fbclid', 'msclkid', 'twclid', 'ttclid', 'yclid', 'dclid']) {
        assert.equal(cleanUrl(`https://example.com/a?${p}=123`), 'https://example.com/a');
    }
});

test('removes email-platform parameters', () => {
    assert.equal(
        cleanUrl('https://example.com/a?mc_cid=1&mc_eid=2&_hsenc=3&mkt_tok=4'),
        'https://example.com/a'
    );
});

test('removes whole prefix families without listing each member', () => {
    assert.equal(
        cleanUrl('https://example.com/a?utm_anything_new=1&pk_kwd=2&matomo_x=3'),
        'https://example.com/a'
    );
});

test('leaves no bare question mark when everything was tracking', () => {
    const out = cleanUrl('https://example.com/page?utm_source=x');
    assert.equal(out, 'https://example.com/page');
    assert.ok(!out.endsWith('?'));
});

test('preserves the fragment', () => {
    assert.equal(
        cleanUrl('https://example.com/doc?utm_source=x#section-3'),
        'https://example.com/doc#section-3'
    );
});

test('preserves the fragment when the query empties out', () => {
    const out = cleanUrl('https://example.com/doc?utm_medium=email#top');
    assert.equal(out, 'https://example.com/doc#top');
    assert.ok(!out.includes('?'));
});

test('keeps t on youtube, where it is a timestamp not tracking', () => {
    assert.equal(
        cleanUrl('https://youtu.be/abc?t=42&utm_source=x'),
        'https://youtu.be/abc?t=42'
    );
});

test('removes t elsewhere, where it is a tracking token', () => {
    assert.equal(cleanUrl('https://x.com/user/status/1?t=abc&s=20'), 'https://x.com/user/status/1');
});

test('host rules apply to subdomains', () => {
    assert.equal(
        cleanUrl('https://m.youtube.com/watch?v=x&t=10&utm_source=y'),
        'https://m.youtube.com/watch?v=x&t=10'
    );
});

test('a url with nothing to remove comes back unchanged', () => {
    const url = 'https://example.com/a?page=2&sort=asc';
    assert.equal(cleanUrl(url), url);
});

test('non-urls are returned untouched rather than mangled', () => {
    assert.equal(cleanUrl('not a url'), 'not a url');
    assert.equal(cleanUrl(''), '');
});

test('parameter order is preserved', () => {
    assert.equal(
        cleanUrl('https://example.com/?a=1&utm_source=x&b=2'),
        'https://example.com/?a=1&b=2'
    );
});

test('stripQuery still drops everything after the path', () => {
    assert.equal(
        stripQuery('https://example.com/post?v=1&utm_source=x#top'),
        'https://example.com/post'
    );
});
