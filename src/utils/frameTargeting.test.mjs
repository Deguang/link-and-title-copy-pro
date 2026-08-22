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

test('a subframe refuses a copy that carries no page context', () => {
    const at = content.indexOf("message.action === 'copyToClipboard'");
    assert.notEqual(at, -1);
    const handler = content.slice(at, at + 700);
    assert.match(handler, /window\.top !== window/, 'no top-frame guard');
    assert.match(handler, /!message\.url/, 'guard must key off the missing override');
});
