import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBatchText, BATCH_LAYOUTS } from './batchLayout.mjs';

const items = [
    { title: 'Overview', url: 'https://a.example/one', text: 'Overview\nhttps://a.example/one' },
    { title: 'AI HOT', url: 'https://b.example/two', text: 'AI HOT\nhttps://b.example/two' },
];
const oneLiners = [
    { title: 'A', url: 'https://a.example', text: '[A](https://a.example)' },
    { title: 'B', url: 'https://b.example', text: '[B](https://b.example)' },
];

test('multi-line entries get a blank line between them', () => {
    // The reported problem: without this, titles and URLs alternate with no
    // visible boundary between one tab and the next.
    const out = buildBatchText(items, 'lines');
    assert.equal(out, 'Overview\nhttps://a.example/one\n\nAI HOT\nhttps://b.example/two');
});

test('single-line entries stay a plain list', () => {
    assert.equal(buildBatchText(oneLiners, 'lines'), '[A](https://a.example)\n[B](https://b.example)');
});

test('bullets indent the continuation lines', () => {
    const out = buildBatchText(items, 'bullets');
    assert.equal(out, '- Overview\n  https://a.example/one\n- AI HOT\n  https://b.example/two');
});

test('numbered entries count from one', () => {
    const out = buildBatchText(items, 'numbered');
    assert.ok(out.startsWith('1. Overview'));
    assert.ok(out.includes('2. AI HOT'));
});

test('table has a header, a divider and one row per item', () => {
    const rows = buildBatchText(items, 'table').split('\n');
    assert.equal(rows[0], '| # | Title | URL |');
    assert.equal(rows[1], '| --- | --- | --- |');
    assert.equal(rows.length, 4);
    assert.equal(rows[2], '| 1 | Overview | https://a.example/one |');
});

test('pipes in a title cannot break the table', () => {
    const out = buildBatchText([{ title: 'A | B', url: 'https://x.example', text: '' }], 'table');
    assert.ok(out.includes('A \\| B'));
    // Escaped pipes stay inside the cell: count only the unescaped ones.
    const row = out.split('\n')[2];
    assert.equal((row.match(/(?<!\\)\|/g) || []).length, 4);
});

test('newlines in a title cannot break a row', () => {
    const out = buildBatchText([{ title: 'Two\nLines', url: 'https://x.example', text: '' }], 'table');
    assert.equal(out.split('\n').length, 3);
});

test('csv quotes fields containing commas or quotes', () => {
    const out = buildBatchText([
        { title: 'A, comma', url: 'https://x.example', text: '' },
        { title: 'He said "hi"', url: 'https://y.example', text: '' },
    ], 'csv');
    const rows = out.split('\n');
    assert.equal(rows[0], 'Title,URL');
    assert.equal(rows[1], '"A, comma",https://x.example');
    assert.equal(rows[2], '"He said ""hi""",https://y.example');
});

test('csv leaves plain fields unquoted', () => {
    assert.equal(
        buildBatchText([{ title: 'Plain', url: 'https://x.example', text: '' }], 'csv'),
        'Title,URL\nPlain,https://x.example'
    );
});

test('an empty batch produces nothing', () => {
    assert.equal(buildBatchText([], 'table'), '');
    assert.equal(buildBatchText(null, 'lines'), '');
});

test('an unknown layout falls back to lines rather than failing', () => {
    assert.equal(buildBatchText(oneLiners, 'nonsense'), buildBatchText(oneLiners, 'lines'));
});

test('every advertised layout produces output', () => {
    for (const l of BATCH_LAYOUTS) {
        assert.ok(buildBatchText(items, l).length > 0, `${l} produced nothing`);
    }
});

test('task list uses GFM checkboxes', () => {
    const out = buildBatchText(items, 'tasks');
    assert.ok(out.startsWith('- [ ] Overview'));
    assert.equal((out.match(/- \[ \]/g) || []).length, 2);
});

test('html table escapes markup in titles', () => {
    const out = buildBatchText(
        [{ title: '<script>x</script>', url: 'https://x.example?a=1&b=2', text: '' }], 'html');
    assert.ok(!out.includes('<script>'));
    assert.ok(out.includes('&lt;script&gt;'));
    assert.ok(out.includes('a=1&amp;b=2'));
});

test('html quotes in a url cannot break the href', () => {
    const out = buildBatchText([{ title: 'A', url: 'https://x.example/"onload="alert(1)', text: '' }], 'html');
    assert.ok(!/href="[^"]*"[^>]*onload/.test(out));
    assert.ok(out.includes('&quot;'));
});

test('json is parseable and carries title and url', () => {
    const parsed = JSON.parse(buildBatchText(items, 'json'));
    assert.equal(parsed.length, 2);
    assert.deepEqual(parsed[0], { title: 'Overview', url: 'https://a.example/one' });
});
