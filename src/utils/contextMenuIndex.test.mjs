import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The context menu builds an item per template and encodes a position in the id;
 * the click handler looks that position up in the full config list. If the two
 * disagree the wrong template is copied, with nothing to indicate it — so the
 * relationship is asserted rather than left to be re-derived.
 */
const bg = readFileSync(new URL('../background/background.js', import.meta.url), 'utf8');

test('the menu item id carries the index into the full config list', () => {
    // The click handler resolves against configuredShortcuts, so the id must not
    // hold a position within a filtered array.
    assert.match(bg, /configuredShortcuts\[index\]/, 'click handler no longer indexes the full list');
    assert.match(
        bg,
        /\.map\(\(config, originalIndex\) => \(\{ config, originalIndex \}\)\)/,
        'the original position is not preserved through the filter'
    );
    assert.match(
        bg,
        /validConfigs\.forEach\(\(\{ config, originalIndex: index \}\)/,
        'the menu is built from the filtered position rather than the original one'
    );
});

test('a template without a shortcut still gets a menu item', () => {
    // The menu and the popup are the only ways to reach one, and the settings
    // page promises exactly that.
    const filter = bg.match(/const validConfigs = configuredShortcuts[\s\S]*?;\n/)[0];
    assert.doesNotMatch(
        filter,
        /config\.shortcut/,
        'filtering on shortcut hides the templates that need the menu most'
    );
    assert.match(filter, /config\.template/, 'a template still needs a body to copy');
});

test('simulating the filter keeps every id pointing at its own template', () => {
    const configs = [
        { shortcut: '', template: '{url:short}', description: 'clean' },
        { shortcut: 'Ctrl+Shift+P', template: '{title}', description: 'plain' },
        { shortcut: '', template: '', description: 'blank' },
        { shortcut: 'Ctrl+Shift+L', template: '[{title}]({url})', description: 'markdown' },
    ];
    const valid = configs
        .map((config, originalIndex) => ({ config, originalIndex }))
        .filter(({ config }) => config && config.template && !config.isNew);

    // Three survive, and each must still resolve to itself.
    assert.equal(valid.length, 3);
    for (const { config, originalIndex } of valid) {
        assert.equal(configs[originalIndex], config, `id ${originalIndex} points elsewhere`);
    }
    // The one dropped in the middle is what used to shift everything after it.
    assert.deepEqual(valid.map((v) => v.originalIndex), [0, 1, 3]);
});
