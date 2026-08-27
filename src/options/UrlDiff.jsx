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
        return <span className="font-mono text-xs text-ink">{to}</span>;
    }

    const kept = new Set(b.pathname.split('/').filter(Boolean));
    const segments = a.pathname.split('/').filter(Boolean);
    const hostChanged = a.host !== b.host;

    return (
        <span className="font-mono text-[12.5px] leading-relaxed break-all">
            <span className={hostChanged ? 'text-ink-3 line-through decoration-danger/50' : 'text-ink-2'}>
                {a.host}
            </span>
            {hostChanged && <span className="text-ok">{' → '}{b.host}</span>}

            {segments.map((seg, i) => {
                const survives = kept.has(seg);
                return (
                    <span key={i}>
                        <span className="text-ink-3">/</span>
                        <span
                            className={
                                survives
                                    ? 'rounded bg-ok/10 px-0.5 font-medium text-ok'
                                    : 'text-ink-3 line-through decoration-danger/40'
                            }
                        >
                            {seg}
                        </span>
                    </span>
                );
            })}

            {a.search && (
                <span className="text-ink-3 line-through decoration-danger/40">{a.search}</span>
            )}
            {b.search && <span className="text-ok">{b.search}</span>}
        </span>
    );
}
