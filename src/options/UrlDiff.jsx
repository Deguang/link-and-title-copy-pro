/**
 * Shows what happened to a URL, rather than only what came out of it.
 *
 * A result on its own is a black box: you can see it's shorter, but not which
 * part was dropped or why. Rendering the original with the removed segments
 * struck through — and the surviving ones lit — turns the preview into the
 * explanation, and makes a rule that took too much visible at a glance.
 */
export default function UrlDiff({ from, to }) {
    let a, b;
    try {
        a = new URL(from);
        b = new URL(to);
    } catch {
        return <span className="font-mono text-[13px] text-ink">{to}</span>;
    }

    const segments = a.pathname.split('/').filter(Boolean);
    const hostChanged = a.host !== b.host;
    // Highlighting a segment means "a rule chose to keep this". When the path
    // came through untouched no rule chose anything, so lighting every segment
    // would claim a selection that never happened: only the query was dropped.
    const pathRewritten = a.pathname.replace(/\/$/, '') !== b.pathname.replace(/\/$/, '');
    const kept = new Set(pathRewritten ? b.pathname.split('/').filter(Boolean) : []);

    return (
        <span className="font-mono text-[13px] leading-[1.9] break-all">
            <span className={hostChanged ? 'text-ink-3 line-through decoration-danger/50' : 'text-ink-2'}>
                {a.host}
            </span>
            {hostChanged && <span className="text-ok">{' → '}{b.host}</span>}

            {segments.map((seg, i) => {
                const survives = pathRewritten && kept.has(seg);
                return (
                    <span key={i}>
                        <span className="text-ink-3">/</span>
                        <span
                            className={
                                survives
                                    ? 'rounded-[4px] bg-ok/[0.12] px-1 py-0.5 font-semibold text-ok'
                                    : pathRewritten
                                        ? 'text-ink-3 line-through decoration-danger/60 decoration-[1.5px]'
                                        // Nothing was selected away, so the path
                                        // is simply itself.
                                        : 'text-ink-2'
                            }
                        >
                            {seg}
                        </span>
                    </span>
                );
            })}

            {a.search && (
                <span className="text-ink-3 line-through decoration-danger/60 decoration-[1.5px]">{a.search}</span>
            )}
            {b.search && <span className="text-ok">{b.search}</span>}
        </span>
    );
}
