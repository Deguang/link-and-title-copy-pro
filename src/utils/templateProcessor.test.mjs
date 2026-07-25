import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { processTemplate } from './templateProcessor.mjs';

const ctx = {
  title: 'My Page',
  url: 'https://example.com/path?utm_source=x#frag',
  selectedText: 'quoted bit',
};

describe('processTemplate — basic placeholders', () => {
  test('replaces {title}, {url}, {selectedText}', () => {
    assert.equal(processTemplate('{title}\n{url}', ctx), 'My Page\nhttps://example.com/path?utm_source=x#frag');
    assert.equal(processTemplate('[{title}]({url})', ctx), '[My Page](https://example.com/path?utm_source=x#frag)');
    assert.equal(processTemplate('{selectedText}', ctx), 'quoted bit');
  });

  test('leaves {selectedText} empty when none provided', () => {
    assert.equal(processTemplate('x{selectedText}y', { title: 't', url: 'https://e.com' }), 'xy');
  });
});

describe('processTemplate — URL components', () => {
  test('exposes clean/domain/path/query/hash/origin/protocol', () => {
    assert.equal(processTemplate('{url:clean}', ctx), 'https://example.com/path');
    assert.equal(processTemplate('{url:domain}', ctx), 'example.com');
    assert.equal(processTemplate('{url:path}', ctx), '/path');
    assert.equal(processTemplate('{url:query}', ctx), '?utm_source=x');
    assert.equal(processTemplate('{url:hash}', ctx), '#frag');
    assert.equal(processTemplate('{url:origin}', ctx), 'https://example.com');
    assert.equal(processTemplate('{url:protocol}', ctx), 'https');
  });

  test('does not throw on an invalid URL', () => {
    // processTemplate warns on a bad URL by design; silence it so this expected
    // path doesn't look like a failure in the test log.
    const warn = console.warn;
    console.warn = () => {};
    try {
      assert.doesNotThrow(() => processTemplate('{url:domain}', { title: 't', url: 'not a url' }));
    } finally {
      console.warn = warn;
    }
  });
});

describe('processTemplate — smart fallbacks', () => {
  test('{selectedText|title} uses selection when present, else title', () => {
    assert.equal(processTemplate('{selectedText|title}', ctx), 'quoted bit');
    assert.equal(processTemplate('{selectedText|title}', { title: 'T', url: 'https://e.com' }), 'T');
  });
});

describe('processTemplate — conditionals', () => {
  const tpl = '{if:selectedText}"{selectedText}" - {title}{/if:selectedText}{if:noSelectedText}{title}{/if:noSelectedText}\n{url}';
  test('keeps the selected branch when text is selected', () => {
    assert.equal(processTemplate(tpl, ctx), '"quoted bit" - My Page\nhttps://example.com/path?utm_source=x#frag');
  });
  test('keeps the no-selection branch when nothing is selected', () => {
    assert.equal(processTemplate(tpl, { title: 'My Page', url: 'https://e.com' }), 'My Page\nhttps://e.com');
  });
});

describe('processTemplate — cleanup', () => {
  test('trims leading/trailing whitespace around the result', () => {
    assert.equal(processTemplate('  {title}\n{url}  ', ctx), 'My Page\nhttps://example.com/path?utm_source=x#frag');
  });
  test('collapses runs of blank lines', () => {
    assert.equal(processTemplate('{title}\n\n\n\n{url}', ctx), 'My Page\nhttps://example.com/path?utm_source=x#frag');
  });
});
