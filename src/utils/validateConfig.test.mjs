import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, isConfigUsable } from './validateConfig.mjs';

const codes = (config, options) => validateConfig(config, options).map(i => i.code);

const VALID = { shortcut: 'Ctrl+Shift+C', template: '{title}\n{url}' };

test('a complete config reports no issues', () => {
    assert.deepEqual(codes(VALID), []);
    assert.equal(isConfigUsable(VALID), true);
});

test('empty shortcut is an error (template could never fire)', () => {
    const issues = validateConfig({ shortcut: '', template: '{url}' });
    assert.deepEqual(issues.map(i => i.code), ['missingShortcut']);
    assert.equal(issues[0].level, 'error');
    assert.equal(issues[0].field, 'shortcut');
});

test('whitespace-only shortcut counts as missing', () => {
    assert.ok(codes({ shortcut: '   ', template: '{url}' }).includes('missingShortcut'));
});

test('empty template is an error and short-circuits further checks', () => {
    assert.deepEqual(codes({ shortcut: 'Ctrl+Shift+C', template: '   ' }), ['emptyTemplate']);
});

test('a brand-new blank config reports both errors', () => {
    const issues = codes({ shortcut: '', template: '' });
    assert.deepEqual(issues, ['missingShortcut', 'emptyTemplate']);
    assert.equal(isConfigUsable({ shortcut: '', template: '' }), false);
});

test('duplicate shortcut flags only the later config', () => {
    const all = [
        { shortcut: 'Ctrl+Shift+C', template: '{url}' },
        { shortcut: 'Ctrl+Shift+C', template: '{title}' },
    ];
    assert.deepEqual(codes(all[0], { allConfigs: all, index: 0 }), []);
    assert.deepEqual(codes(all[1], { allConfigs: all, index: 1 }), ['duplicateShortcut']);
});

test('unknown placeholder is a warning, reported once per distinct token', () => {
    const issues = validateConfig({ shortcut: 'Ctrl+Shift+C', template: '{titel} {titel} {url}' });
    assert.deepEqual(issues.map(i => i.code), ['unknownPlaceholder']);
    assert.equal(issues[0].value, '{titel}');
    assert.equal(issues[0].level, 'warning');
});

test('all documented placeholders are recognised', () => {
    const template = [
        '{title}', '{url}', '{selectedText}',
        '{url:clean}', '{url:protocol}', '{url:domain}', '{url:path}',
        '{url:query}', '{url:hash}', '{url:origin}',
        '{selectedText|title}', '{title|selectedText}',
        '{selectedTextWithQuote}', '{selectedTextWithBrackets}', '{selectedTextWithContext}',
    ].join(' ');
    assert.deepEqual(codes({ shortcut: 'Ctrl+Shift+C', template }), []);
});

test('balanced conditional block is accepted', () => {
    const template = '{if:selectedText}"{selectedText}"{/if:selectedText}{if:noSelectedText}{title}{/if:noSelectedText}\n{url}';
    assert.deepEqual(codes({ shortcut: 'Ctrl+Shift+C', template }), []);
});

test('unclosed conditional tag is a warning', () => {
    const issues = validateConfig({ shortcut: 'Ctrl+Shift+C', template: '{if:selectedText}{title}\n{url}' });
    const unclosed = issues.find(i => i.code === 'unclosedTag');
    assert.ok(unclosed, 'expected an unclosedTag issue');
    assert.equal(unclosed.value, '{if:selectedText}');
});

test('negative-only conditional is flagged (processor never expands it)', () => {
    const template = '{if:noSelectedText}{title}{/if:noSelectedText}\n{url}';
    assert.ok(codes({ shortcut: 'Ctrl+Shift+C', template }).includes('negativeConditionalOnly'));
});

test('plain text template with no placeholders is allowed', () => {
    assert.deepEqual(codes({ shortcut: 'Ctrl+Shift+C', template: 'just some text' }), []);
});

test('warnings alone keep the config usable', () => {
    assert.equal(isConfigUsable({ shortcut: 'Ctrl+Shift+C', template: '{titel}' }), true);
});
