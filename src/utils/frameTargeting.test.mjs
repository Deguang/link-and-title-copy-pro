import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * chrome.tabs.sendMessage without a frameId reaches every frame in the tab, and
 * a content script in a frame that wasn't given the tab's URL falls back to its
 * own. On a page embedding a hidden iframe — Stripe.js was the reported case —
 * that iframe copies its own address over the correct one, non-deterministically,
 * because it has no focus and so takes the offscreen path that lands last.
 *
 * Asserted rather than remembered: the older path had this right and two call
 * sites added later did not copy it.
 */
const bg = readFileSync(new URL('../background/background.js', import.meta.url), 'utf8');
const content = readFileSync(new URL('../content/content.js', import.meta.url), 'utf8');

/** Each `chrome.tabs.sendMessage(...)` call, balanced to its closing paren. */
function sendMessageCalls(src) {
    const calls = [];
    const marker = 'chrome.tabs.sendMessage(';
    let at = src.indexOf(marker);
    while (at !== -1) {
        let depth = 0;
        let i = at + marker.length - 1;
        for (; i < src.length; i++) {
            if (src[i] === '(') depth++;
            else if (src[i] === ')') {
                depth--;
                if (depth === 0) break;
            }
        }
        calls.push(src.slice(at, i + 1));
        at = src.indexOf(marker, i);
    }
    return calls;
}

test('every copyToClipboard message names a frame', () => {
    const copies = sendMessageCalls(bg).filter(c => c.includes("action: 'copyToClipboard'"));
    assert.ok(copies.length >= 3, `expected the known copy call sites, found ${copies.length}`);
    for (const call of copies) {
        assert.match(call, /frameId/, `broadcasts to every frame:\n${call}`);
    }
});

test('every copyToClipboard message carries the tab title and url', () => {
    const copies = sendMessageCalls(bg).filter(c => c.includes("action: 'copyToClipboard'"));
    for (const call of copies) {
        assert.match(call, /\btitle:/, `no title override, frame would use its own:\n${call}`);
        assert.match(call, /\burl:/, `no url override, frame would use its own:\n${call}`);
    }
});

test('a subframe holding no selection refuses the copy', () => {
    const at = content.indexOf("message.action === 'copyToClipboard'");
    assert.notEqual(at, -1);
    // Up to the copy call itself, so the guard has to sit before the work.
    const handler = content.slice(at, content.indexOf('copyToClipboard(config.template', at));
    assert.match(handler, /window\.top !== window/, 'no top-frame guard');
    assert.match(
        handler,
        /!getSelectedText\(\)/,
        'the guard must key off an actual selection: page context alone lets a hidden '
        + 'iframe that triggered the copy itself through'
    );
    assert.match(handler, /success: false/, 'the decline has to be reported so the caller can retry');
});

test('the background retries at the top frame when a subframe declines', () => {
    const at = bg.indexOf('function copyToClipboard(index');
    assert.notEqual(at, -1);
    const fn = bg.slice(at, bg.indexOf('\n}', at));
    assert.match(fn, /response\.success === false/, 'a decline is ignored, so the copy is lost');
    assert.match(fn, /frameId: 0/, 'nothing retries against the top frame');
});
