import { useRef, useLayoutEffect } from 'react';
import { KNOWN_PLACEHOLDERS } from '../utils/validateConfig.mjs';

/**
 * The template field, with its placeholders lit.
 *
 * This is the one thing on the page the user actually authors, and it was a bare
 * textarea: every token the same grey, a typo indistinguishable from a real
 * placeholder until a warning appeared underneath. Colouring them puts the
 * feedback where the typing is, and gives the surface its only real texture.
 *
 * A textarea cannot render rich text, so the standard arrangement applies: a
 * highlighted <pre> underneath, a transparent textarea on top, identical metrics,
 * scroll positions kept in step. Every metric that affects glyph position has to
 * match exactly or the two layers drift apart as you type.
 */

const CONDITIONALS = /^\/?(?:if:)?(?:no)?[sS]electedText\??$/;

/** @param {string} s */
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Splits the template into tokens and classifies each one, so the colour says
 * what kind of thing it is rather than merely that it is in braces.
 */
function highlight(text) {
    let out = '';
    let last = 0;
    for (const m of text.matchAll(/\{([^{}]*)\}/g)) {
        out += escapeHtml(text.slice(last, m.index));
        const token = m[1];
        const cls = CONDITIONALS.test(token)
            ? 'text-accent'
            : KNOWN_PLACEHOLDERS.has(token)
                // Teal reads as "this resolves to something", matching the
                // preview and the URL diff on the rules page.
                ? 'text-ok'
                // Not a placeholder, so it lands in the clipboard verbatim.
                : 'text-danger underline decoration-danger/40 decoration-wavy underline-offset-2';
        out += `<span class="${cls} font-medium">${escapeHtml(m[0])}</span>`;
        last = m.index + m[0].length;
    }
    out += escapeHtml(text.slice(last));
    // A trailing newline collapses in a <pre>, which would shorten the backdrop
    // by one line and leave the last row of the textarea unpainted.
    return out + '\n';
}

export default function TemplateInput({ value, forwardRef, hasError, ...props }) {
    const taRef = useRef(null);
    const preRef = useRef(null);

    // Kept in step on every render as well as on scroll: typing past the last
    // visible line scrolls the textarea without firing a scroll event first.
    useLayoutEffect(() => {
        const ta = taRef.current;
        const pre = preRef.current;
        if (!ta || !pre) return;
        pre.scrollTop = ta.scrollTop;
        pre.scrollLeft = ta.scrollLeft;
    });

    const sync = () => {
        const ta = taRef.current;
        const pre = preRef.current;
        if (!ta || !pre) return;
        pre.scrollTop = ta.scrollTop;
        pre.scrollLeft = ta.scrollLeft;
    };

    // Everything that moves a glyph lives here once, so the two layers cannot
    // disagree about where a character sits.
    const metrics = 'font-mono text-sm leading-relaxed px-3 py-2 whitespace-pre-wrap break-words';

    // The container carries the field's appearance so neither inner layer needs a
    // background of its own; relying on utility order to override one would be a
    // coin flip on CSS source order.
    return (
        <div
            className={`relative overflow-hidden rounded-lg border bg-surface transition focus-within:ring-4 ${
                hasError
                    ? 'border-danger focus-within:border-danger focus-within:ring-danger/15'
                    : 'border-line focus-within:border-accent focus-within:ring-accent/15'
            }`}
        >
            <pre
                ref={preRef}
                aria-hidden="true"
                className={`${metrics} pointer-events-none absolute inset-0 m-0 overflow-hidden text-ink`}
                dangerouslySetInnerHTML={{ __html: highlight(value || '') }}
            />
            <textarea
                {...props}
                ref={(node) => {
                    taRef.current = node;
                    if (typeof forwardRef === 'function') forwardRef(node);
                    else if (forwardRef) forwardRef.current = node;
                }}
                value={value}
                onScroll={sync}
                spellCheck={false}
                className={`${metrics} relative block w-full resize-y bg-transparent text-transparent caret-ink outline-none placeholder:text-ink-3 selection:bg-accent/25`}
            />
        </div>
    );
}
