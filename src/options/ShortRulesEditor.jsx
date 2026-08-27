import { useEffect, useMemo, useRef, useState } from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { USER_RULES_KEY } from '../constant';
import { PRESET_RULES, validateRule } from '../utils/urlRules.mjs';
import { inferRule } from '../utils/inferRule.mjs';
import { matchRule } from '../utils/urlRules.mjs';
import { cleanUrl } from '../utils/cleanUrl.mjs';
import UrlDiff from './UrlDiff';
import { shortenUrl } from '../utils/shortUrl.mjs';

export { USER_RULES_KEY };

const FIELD = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15';
const FIELD_ERROR = 'border-danger focus:border-danger focus:ring-danger/15';
const LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-ink-3';

/* The one surface that is actually lifted: the box you reach for first. */
const HERO = 'rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(3,42,75,0.10),0_8px_24px_-16px_rgba(3,42,75,0.35)]';
/* Everything else sits flush. Cards for every section is what made the page read
   as a stack of identical boxes rather than a page with a shape. */
const FLUSH = 'rounded-2xl border border-line-soft bg-surface-2 p-5';

const ERROR_KEYS = {
    missingHost: 'ruleErrMissingHost',
    missingMatch: 'ruleErrMissingMatch',
    missingReplace: 'ruleErrMissingReplace',
    patternInvalid: 'ruleErrPatternInvalid',
    patternUnsafe: 'ruleErrPatternUnsafe',
    patternTooLong: 'ruleErrPatternTooLong',
    duplicateName: 'ruleErrDuplicateName',
    notAUrl: 'ruleErrNotAUrl',
    sameUrl: 'ruleErrSameUrl',
    noCommonPart: 'ruleErrNoCommonPart',
    badName: 'ruleErrBadName',
    badQuery: 'ruleErrBadQuery',
    unknownName: 'ruleErrUnknownName',
};

/**
 * A rule the user can edit. Fields save as they're typed, like the rest of the
 * page — the live preview below is what tells them whether it's right, so there
 * is nothing to submit.
 */
function RuleRow({ t, rule, onChange, onRemove }) {
    const error = validateRule(rule);
    const errText = error ? t(ERROR_KEYS[error] || error) : '';
    const isRegex = rule.syntax === 'regex';
    // A rule with nothing in it was just created, so it opens ready to fill in.
    const [open, setOpen] = useState(!rule.host && !rule.match);

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition hover:border-accent/40 hover:bg-surface-2 focus:outline-none focus:ring-4 focus:ring-accent/15"
            >
                <span className="min-w-0 flex-1 truncate">
                    <span className="text-sm font-medium text-ink">{rule.label || rule.host}</span>
                    {!error && (
                        <span className="ml-2.5 font-mono text-xs text-ink-3">
                            {rule.match} <span className="px-0.5">→</span> {rule.replace}
                        </span>
                    )}
                    {error && <span className="ml-2.5 text-xs font-medium text-danger">{errText}</span>}
                </span>
                <span className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-ink-3 transition group-hover:text-accent">
                    {t('rulesEdit')}
                    <span aria-hidden="true">›</span>
                </span>
            </button>
        );
    }

    return (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(3,42,75,0.06)]">
            <div className="mb-3 flex items-center gap-2">
                <input
                    value={rule.label || ''}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder={t('rulesLabel')}
                    className={`${FIELD} flex-1 font-medium`}
                />
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={!!error}
                    className="rounded-lg px-2.5 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:bg-transparent"
                >
                    {t('rulesDone')}
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded-lg px-2.5 py-2 text-sm text-ink-3 transition hover:bg-surface-2 hover:text-danger focus:outline-none focus:ring-4 focus:ring-danger/10"
                >
                    {t('rulesRemove')}
                </button>
            </div>

            {!error && (
                <p className="mb-3 break-all rounded-lg bg-surface-2 px-2.5 py-2 font-mono text-[12px] text-ink-2">
                    <span className="text-ink-3">{rule.host}</span>
                    {/* The pattern is a path, so it needs to read as one — without a
                        gap the host runs straight into it. */}
                    <span className="px-1 text-ink-3">·</span>
                    <span className="text-ink">{rule.match}</span>
                    <span className="px-1.5 text-ink-3">→</span>
                    <span className="font-medium text-ok">{rule.replace}</span>
                </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <label className={`${LABEL} mb-1.5 block`}>{t('rulesHost')}</label>
                    <input
                        value={rule.host || ''}
                        onChange={(e) => onChange({ host: e.target.value })}
                        placeholder="example.com"
                        className={`${FIELD} font-mono text-xs ${error === 'missingHost' ? FIELD_ERROR : ''}`}
                    />
                </div>
                <div>
                    <label className={`${LABEL} mb-1.5 block`}>{t('rulesMatch')}</label>
                    <input
                        value={rule.match || ''}
                        onChange={(e) => onChange({ match: e.target.value })}
                        placeholder={isRegex ? '^/products/[^/]+/(\\d+)' : '/products/*/:id'}
                        className={`${FIELD} font-mono text-xs ${error && error !== 'missingHost' && error !== 'missingReplace' ? FIELD_ERROR : ''}`}
                    />
                </div>
                <div>
                    <label className={`${LABEL} mb-1.5 block`}>{t('rulesReplace')}</label>
                    <input
                        value={rule.replace || ''}
                        onChange={(e) => onChange({ replace: e.target.value })}
                        placeholder={isRegex ? '/p/$1' : '/p/:id'}
                        className={`${FIELD} font-mono text-xs ${error === 'missingReplace' ? FIELD_ERROR : ''}`}
                    />
                </div>
            </div>

            {!isRegex && (
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-3">{t('rulesSyntaxHelp')}</p>
            )}

            <label className="mt-2 flex items-center gap-2 text-xs text-ink-3">
                <input
                    type="checkbox"
                    checked={isRegex}
                    onChange={(e) => onChange({ syntax: e.target.checked ? 'regex' : 'simple' })}
                    className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-2 focus:ring-accent/25"
                />
                {t('rulesAdvanced')}
            </label>

            {errText && <p className="mt-2 text-xs font-medium text-danger">{errText}</p>}
        </div>
    );
}

/** A shipped rule, shown so the presets read as worked examples. */
function PresetRow({ rule }) {
    return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line-soft py-2.5 last:border-0">
            <span className="min-w-[9.5rem] text-sm font-medium text-ink">{rule.label}</span>
            <code className="min-w-[8rem] font-mono text-xs text-ink-3">{rule.host}</code>
            <code className="font-mono text-xs text-ink-2">{rule.match}</code>
            <span className="font-mono text-xs text-ink-3">→</span>
            <code className="font-mono text-xs text-ok">{rule.replace}</code>
        </div>
    );
}


/**
 * Adding a site, in one place.
 *
 * Pasting an example pair and filling in the fields are two ways of saying the
 * same thing, and they were two separate sections of the page that could both be
 * on screen at once, neither explaining its relationship to the other. They are
 * one step with two ways to fill it in.
 */
function AddSite({ t, seed, seedKey, onCreate, onCancel }) {
    const [mode, setMode] = useState('pair');
    const [long, setLong] = useState(seed || '');
    const [short, setShort] = useState('');
    const [error, setError] = useState('');
    const [draft, setDraft] = useState({ host: '', match: '', replace: '', syntax: 'simple' });

    // A fresh seed replaces whatever was there: the user just asked for this
    // site, so an older half-typed URL is no longer what they mean.
    useEffect(() => {
        if (seed) { setLong(seed); setMode('pair'); }
    }, [seed, seedKey]);

    const fromPair = () => {
        const r = inferRule(long, short);
        if (!r.ok) { setError(t(ERROR_KEYS[r.error] || r.error)); return; }
        setError('');
        onCreate({ id: `u${Date.now()}`, label: r.host, host: r.host, match: r.match, replace: r.replace, syntax: r.syntax });
    };

    const draftError = validateRule(draft);
    const fromFields = () => {
        if (draftError) { setError(t(ERROR_KEYS[draftError] || draftError)); return; }
        onCreate({ id: `u${Date.now()}`, label: draft.host, ...draft });
    };

    const Tab = ({ id, label }) => (
        <button
            type="button"
            onClick={() => { setMode(id); setError(''); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                mode === id ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-3 hover:text-ink-2'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className={`mt-4 ${FLUSH}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{t('rulesInferTitle')}</h3>
                <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-0.5 ring-1 ring-line-soft">
                    <Tab id="pair" label={t('rulesByPair')} />
                    <Tab id="manual" label={t('rulesByHand')} />
                </div>
            </div>

            {mode === 'pair' ? (
                <>
                    <p className="mb-3 max-w-[62ch] text-xs leading-relaxed text-ink-2">{t('rulesInferDesc')}</p>
                    <div className="space-y-2">
                        <div>
                            <label className={`${LABEL} mb-1.5 block`}>{t('rulesInferLong')}</label>
                            <input
                                value={long}
                                onChange={(e) => setLong(e.target.value)}
                                placeholder="https://www.hobbylobby.com/home-decor/shelves/brown-wall-shelf/p/80778424"
                                className={`${FIELD} font-mono text-xs`}
                            />
                        </div>
                        <div>
                            <label className={`${LABEL} mb-1.5 block`}>{t('rulesInferShort')}</label>
                            <input
                                value={short}
                                onChange={(e) => setShort(e.target.value)}
                                placeholder="https://www.hobbylobby.com/p/80778424"
                                className={`${FIELD} font-mono text-xs`}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                        <label className={`${LABEL} mb-1.5 block`}>{t('rulesHost')}</label>
                        <input
                            value={draft.host}
                            onChange={(e) => setDraft({ ...draft, host: e.target.value })}
                            placeholder="example.com"
                            className={`${FIELD} font-mono text-xs`}
                        />
                    </div>
                    <div>
                        <label className={`${LABEL} mb-1.5 block`}>{t('rulesMatch')}</label>
                        <input
                            value={draft.match}
                            onChange={(e) => setDraft({ ...draft, match: e.target.value })}
                            placeholder="/products/*/:id"
                            className={`${FIELD} font-mono text-xs`}
                        />
                    </div>
                    <div>
                        <label className={`${LABEL} mb-1.5 block`}>{t('rulesReplace')}</label>
                        <input
                            value={draft.replace}
                            onChange={(e) => setDraft({ ...draft, replace: e.target.value })}
                            placeholder="/p/:id"
                            className={`${FIELD} font-mono text-xs`}
                        />
                    </div>
                    <p className="font-mono text-[11px] leading-relaxed text-ink-3 sm:col-span-3">
                        {t('rulesSyntaxHelp')}
                    </p>
                </div>
            )}

            {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

            <div className="mt-4 flex items-center gap-3">
                <button
                    type="button"
                    onClick={mode === 'pair' ? fromPair : fromFields}
                    disabled={mode === 'pair' ? !long.trim() || !short.trim() : !!draftError}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-[background-color,transform] duration-100 focus:outline-none focus:ring-4 focus:ring-accent/25 ${
                        (mode === 'pair' ? long.trim() && short.trim() : !draftError)
                            ? 'bg-accent text-accent-fg hover:bg-accent-hover active:scale-[0.98]'
                            : 'cursor-not-allowed border border-line bg-surface text-ink-3 shadow-none'
                    }`}
                >
                    {mode === 'pair' ? t('rulesInferMake') : t('rulesCreate')}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-ink-3 underline underline-offset-2 transition hover:text-ink-2"
                >
                    {t('rulesCancel')}
                </button>
            </div>
        </div>
    );
}

export default function ShortRulesEditor({ t }) {
    const [userRules, setUserRules] = useChromeStorage(USER_RULES_KEY, []);
    const [testUrl, setTestUrl] = useState('');
    // Handing the tested URL to the builder, plus a counter so asking twice for
    // the same URL still re-seeds it.
    const [seed, setSeed] = useState('');
    const [seedKey, setSeedKey] = useState(0);
    const [teaching, setTeaching] = useState(false);
    // The row that was just created, so the page can show where it went. Closing
    // the panel and leaving the new rule somewhere below the fold is why adding
    // one felt like nothing happened.
    const [justAdded, setJustAdded] = useState(null);
    const inferRef = useRef(null);
    const listRef = useRef(null);

    const addRule = (rule) => {
        setUserRules([...rules, rule]);
        setTeaching(false);
        setJustAdded(rule.id);
        // After the row exists, not before.
        setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
        setTimeout(() => setJustAdded(null), 2200);
    };

    const rules = Array.isArray(userRules) ? userRules : [];

    const update = (i, patch) => {
        const next = rules.map((r, n) => (n === i ? { ...r, ...patch } : r));
        setUserRules(next);
    };
    const remove = (i) => setUserRules(rules.filter((_, n) => n !== i));

    // Shortening runs on every keystroke so a rule can be judged by what it
    // produces rather than by reading the regex back to yourself.
    const preview = useMemo(() => {
        const input = testUrl.trim();
        if (!input) return null;
        const usable = rules.filter((r) => !validateRule(r));
        const out = shortenUrl(input, usable);
        // Which rule fired, so a result can be traced to the line that made it.
        const cleaned = cleanUrl(input);
        const hit = matchRule(cleaned, [...usable, ...PRESET_RULES]);
        return {
            out,
            changed: out !== input,
            rule: hit ? hit.rule : null,
            // Tracking removal alone is worth naming — it happened even when no
            // rule applied, and otherwise looks like nothing did.
            trackingOnly: !hit && cleaned !== input,
        };
    }, [testUrl, rules]);

    return (
        <div className="mx-auto max-w-3xl">
            <h2 className="text-[22px] font-semibold tracking-[-0.012em] text-ink">{t('rulesTitle')}</h2>
            <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ink-2">{t('rulesIntro')}</p>

            <p className="mt-3 break-all font-mono text-xs leading-relaxed text-ink-3">
                amazon.com/<span className="line-through decoration-danger/50">Portable-Transistor-Radio-BJL-671</span>/dp/B0D4HLHW8B
                <br />
                <span className="text-ok">amazon.com/dp/B0D4HLHW8B</span>
            </p>

            {/* Test first: it is the fastest way to understand what any of this does. */}
            <div className={`mt-6 ${HERO}`}>
                <label className={`${LABEL} mb-1.5 block`}>{t('rulesTest')}</label>
                <input
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://www.amazon.com/Some-Long-Title/dp/B0D4HLHW8B/"
                    className={`${FIELD} font-mono text-xs`}
                />
                {preview && (
                    <div className="mt-3">
                        <div className="mb-1.5 flex items-center gap-2">
                            <span className={LABEL}>{t('rulesResult')}</span>
                            {preview.rule && (
                                <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                    {preview.rule.label}
                                </span>
                            )}
                        </div>

                        <div className="rounded-xl border border-line-soft bg-surface-2 px-3.5 py-3">
                            <UrlDiff from={testUrl.trim()} to={preview.out} />
                        </div>

                        <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-ok/25 bg-ok/[0.06] px-3.5 py-3">
                            <span className="mt-[3px] select-none font-mono text-xs font-semibold text-ok">→</span>
                            <p className="break-all font-mono text-[12.5px] font-medium leading-relaxed text-ink">
                                {preview.out}
                            </p>
                        </div>

                        {!preview.rule && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="text-xs text-ink-3">{t('rulesNoMatch')}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSeed(testUrl.trim());
                                        setSeedKey((n) => n + 1);
                                        setTeaching(true);
                                        inferRef.current?.scrollIntoView({ block: 'nearest' });
                                    }}
                                    className="text-xs font-medium text-accent underline underline-offset-2 transition hover:text-accent-hover"
                                >
                                    {t('rulesInferCta')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div ref={inferRef}>
                {teaching ? (
                    <AddSite
                        t={t}
                        seed={seed}
                        seedKey={seedKey}
                        onCreate={addRule}
                        onCancel={() => setTeaching(false)}
                    />
                ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                            type="button"
                            onClick={() => setTeaching(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-2 shadow-sm transition-[background-color,transform] duration-100 hover:bg-surface-2 hover:text-ink active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-accent/10"
                        >
                            <span className="text-base leading-none">+</span>
                            {t('rulesTeachShort')}
                        </button>

                    </div>
                )}
            </div>

            {rules.length > 0 && (
                <div className="mb-2.5 mt-8 flex items-center gap-3">
                    <h3 className={LABEL}>{t('rulesYours')}</h3>
                    <span className="h-px flex-1 bg-line" />
                </div>
            )}

            <div ref={listRef} className="space-y-2">
                {rules.map((rule, i) => (
                    <div
                        key={rule.id || i}
                        className={`rounded-xl transition-shadow duration-500 ${
                            justAdded === rule.id ? 'ring-4 ring-ok/30' : ''
                        }`}
                    >
                        <RuleRow
                            t={t}
                            rule={rule}
                            onChange={(patch) => update(i, patch)}
                            onRemove={() => remove(i)}
                        />
                    </div>
                ))}

            </div>

            <details className="group mt-8">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink-2 transition hover:border-accent/40 hover:bg-surface-2 hover:text-ink">
                    <span className="text-ink-3 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                    {t('rulesBuiltinSites')}
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-ink-3 ring-1 ring-line-soft group-open:bg-accent-soft group-open:text-accent">
                        {PRESET_RULES.length}
                    </span>
                </summary>
                <div className="mt-2 rounded-xl border border-line-soft bg-surface px-4 py-1">
                    {PRESET_RULES.map((rule) => <PresetRow key={rule.id} rule={rule} />)}
                </div>
            </details>
        </div>
    );
}
