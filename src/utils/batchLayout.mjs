// @ts-check
/**
 * How a batch of copied tabs is assembled.
 *
 * The per-tab template decides what one entry looks like; this decides how the
 * entries sit together. They were simply joined with a newline, which for the
 * default two-line template produces a wall of alternating titles and URLs with
 * no visible boundary between one tab and the next — readable only by counting.
 */

/**
 * Escapes the pipes and newlines that would otherwise break out of a table cell.
 * @param {string} s
 */
function cell(s) {
    return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * Escapes the characters that would otherwise close a tag or an attribute.
 * @param {string} s
 */
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @param {string} s */
function csvCell(s) {
    const v = String(s).replace(/\r?\n/g, ' ').trim();
    return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * @typedef {Object} BatchItem
 * @property {string} title
 * @property {string} url
 * @property {string} text  The per-tab template already applied.
 */

/**
 * Layouts, keyed by the id stored in settings.
 *
 * `lines` is the historical behaviour and stays the default, so nobody's output
 * changes shape without them asking — but it now separates entries with a blank
 * line when the entry itself spans more than one, which is the case that was
 * unreadable.
 */
export const BATCH_LAYOUTS = ['lines', 'bullets', 'tasks', 'numbered', 'table', 'html', 'csv', 'json'];

/**
 * @param {BatchItem[]} items
 * @param {string} layout
 * @returns {string}
 */
export function buildBatchText(items, layout = 'lines') {
    if (!items || !items.length) return '';

    switch (layout) {
        case 'bullets':
            // A multi-line entry is indented under its own bullet so the list
            // survives being pasted into a Markdown renderer.
            return items
                .map((it) => it.text.split('\n').map((l, i) => (i === 0 ? `- ${l}` : `  ${l}`)).join('\n'))
                .join('\n');

        case 'tasks':
            // GitHub-flavoured checkboxes, for turning a reading session into a
            // list you can tick off.
            return items
                .map((it) => it.text.split('\n').map((l, i) => (i === 0 ? `- [ ] ${l}` : `      ${l}`)).join('\n'))
                .join('\n');

        case 'numbered':
            return items
                .map((it, n) => it.text.split('\n').map((l, i) => (i === 0 ? `${n + 1}. ${l}` : `   ${l}`)).join('\n'))
                .join('\n');

        case 'table':
            // The template output isn't used here: a table's columns are the
            // title and the link, and an arbitrary template can't be split into
            // them. Titles are linked so the table stays useful when rendered.
            return [
                '| # | Title | URL |',
                '| --- | --- | --- |',
                ...items.map((it, n) => `| ${n + 1} | ${cell(it.title)} | ${cell(it.url)} |`),
            ].join('\n');

        case 'html':
            // Pastes into a rich-text editor or a doc as a real table.
            return [
                '<table>',
                '  <thead><tr><th>Title</th><th>URL</th></tr></thead>',
                '  <tbody>',
                ...items.map((it) =>
                    `    <tr><td><a href="${esc(it.url)}">${esc(it.title)}</a></td><td>${esc(it.url)}</td></tr>`),
                '  </tbody>',
                '</table>',
            ].join('\n');

        case 'csv':
            return ['Title,URL', ...items.map((it) => `${csvCell(it.title)},${csvCell(it.url)}`)].join('\n');

        case 'json':
            // For anything that will read this back rather than display it.
            return JSON.stringify(items.map((it) => ({ title: it.title, url: it.url })), null, 2);

        case 'lines':
        default: {
            // A blank line between entries only when an entry spans several —
            // one-line entries read fine as a plain list and shouldn't be padded.
            const multiline = items.some((it) => it.text.includes('\n'));
            return items.map((it) => it.text).join(multiline ? '\n\n' : '\n');
        }
    }
}
