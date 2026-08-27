import test from 'node:test';
import assert from 'node:assert/strict';
import { shortenUrl } from './shortUrl.mjs';

test('amazon keeps only the ASIN', () => {
    assert.equal(
        shortenUrl('https://www.amazon.com/Portable-Transistor-Suitable-Emergency-BJL-671/dp/B0D4HLHW8B/'),
        'https://www.amazon.com/dp/B0D4HLHW8B'
    );
});

test('amazon /gp/product resolves to the same short form', () => {
    assert.equal(
        shortenUrl('https://www.amazon.com/gp/product/B0D4HLHW8B?th=1'),
        'https://www.amazon.com/dp/B0D4HLHW8B'
    );
});

test('amazon keeps the country domain', () => {
    // A different marketplace is a different catalogue; rewriting the host would
    // point at another listing or none at all.
    assert.equal(
        shortenUrl('https://www.amazon.co.uk/Some-Long-Title/dp/B0D4HLHW8B/'),
        'https://www.amazon.co.uk/dp/B0D4HLHW8B'
    );
    assert.equal(
        shortenUrl('https://www.amazon.co.jp/foo/dp/B0D4HLHW8B/'),
        'https://www.amazon.co.jp/dp/B0D4HLHW8B'
    );
});

test('hobby lobby keeps only the product id', () => {
    assert.equal(
        shortenUrl('https://www.hobbylobby.com/home-decor-frames/home-organization-storage/shelves/brown-rustic-wood-wall-shelf/p/80778424'),
        'https://www.hobbylobby.com/p/80778424'
    );
});

test('youtube becomes youtu.be', () => {
    assert.equal(shortenUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://youtu.be/dQw4w9WgXcQ');
});

test('a youtube timestamp survives', () => {
    assert.equal(
        shortenUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42'),
        'https://youtu.be/dQw4w9WgXcQ?t=42'
    );
});

test('a youtube playlist is left long rather than losing the list', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123';
    assert.equal(shortenUrl(url), url);
});

test('stack overflow uses its question permalink', () => {
    assert.equal(
        shortenUrl('https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster'),
        'https://stackoverflow.com/q/11227809'
    );
});

test('a linked stack overflow answer keeps pointing at the answer', () => {
    assert.equal(
        shortenUrl('https://stackoverflow.com/questions/11227809/why-is-it-faster/11227902'),
        'https://stackoverflow.com/a/11227902'
    );
});

test('reddit uses redd.it', () => {
    assert.equal(
        shortenUrl('https://www.reddit.com/r/programming/comments/1abc2de/some_long_title/'),
        'https://redd.it/1abc2de'
    );
});

test('ebay, etsy, walmart and target drop the slug', () => {
    assert.equal(shortenUrl('https://www.ebay.com/itm/some-long-title/123456789012'), 'https://www.ebay.com/itm/123456789012');
    assert.equal(shortenUrl('https://www.etsy.com/listing/1234567890/hand-made-thing'), 'https://www.etsy.com/listing/1234567890');
    assert.equal(shortenUrl('https://www.walmart.com/ip/Some-Product-Name/123456789'), 'https://www.walmart.com/ip/123456789');
    assert.equal(shortenUrl('https://www.target.com/p/some-product-name/-/A-12345678'), 'https://www.target.com/p/-/A-12345678');
});

test('tracking is stripped on the way', () => {
    assert.equal(
        shortenUrl('https://www.amazon.com/Long-Title/dp/B0D4HLHW8B/?utm_source=newsletter&tag=aff-20'),
        'https://www.amazon.com/dp/B0D4HLHW8B'
    );
});

test('a site with no rule still comes back without tracking', () => {
    assert.equal(
        shortenUrl('https://example.com/some/article?utm_source=x&page=2'),
        'https://example.com/some/article?page=2'
    );
});

test('a fragment survives, since it points within the page', () => {
    assert.equal(
        shortenUrl('https://stackoverflow.com/questions/11227809/why#comment-1'),
        'https://stackoverflow.com/q/11227809#comment-1'
    );
});

test('a url that matches nothing is returned unchanged', () => {
    const url = 'https://example.com/a/b/c';
    assert.equal(shortenUrl(url), url);
});

test('an amazon page that is not a listing is left alone', () => {
    const url = 'https://www.amazon.com/s?k=radio';
    assert.equal(shortenUrl(url), url);
});

test('non-urls and empties are safe', () => {
    assert.equal(shortenUrl('not a url'), 'not a url');
    assert.equal(shortenUrl(''), '');
});
