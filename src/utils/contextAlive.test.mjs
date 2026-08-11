import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The content script outlives extension updates in already-open tabs, and its
 * chrome APIs are torn out when that happens. Every entry point has to check
 * before reaching for one — this has now shipped broken twice, once for storage
 * and once for runtime.onMessage, so it's asserted rather than remembered.
 */
const src = readFileSync(new URL('../content/content.js', import.meta.url), 'utf8');

/** Strips comments so prose about chrome APIs isn't mistaken for a call. */
function code() {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

test('every chrome API entry point is guarded', () => {
    const body = code();
    // Each top-level registration or call that touches a chrome API namespace.
    const risky = [
        'chrome.runtime.onMessage.addListener',
        'chrome.storage.onChanged.addListener',
    ];
    for (const call of risky) {
        const at = body.indexOf(call);
        assert.notEqual(at, -1, `${call} not found — did it move?`);
        // The guard is whatever opened the enclosing block, so look back to the
        // last `if (` rather than a fixed number of characters.
        const before = body.slice(0, at);
        const opener = before.lastIndexOf('if (');
        assert.notEqual(opener, -1, `${call} is not inside a conditional`);
        assert.match(
            before.slice(opener),
            /isContextAlive\(\)/,
            `${call} is not guarded by isContextAlive()`
        );
    }
});

test('isContextAlive checks both namespaces the script uses', () => {
    const fn = code().match(/function isContextAlive\(\)[\s\S]*?\n}/)[0];
    assert.match(fn, /runtime/);
    assert.match(fn, /storage/);
    assert.match(fn, /catch/, 'must survive chrome itself being gone');
});

test('the toast paths bail out instead of throwing', () => {
    const body = code();
    for (const fn of ['showSuccessMessage', 'showErrorMessage', 'copyViaBackground']) {
        const at = body.indexOf(`function ${fn}(`);
        assert.notEqual(at, -1, `${fn} not found`);
        const first = body.slice(at, at + 260);
        assert.match(first, /isContextAlive\(\)/, `${fn} messages the background unguarded`);
    }
});
