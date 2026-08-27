import { useMemo, useState } from 'react';
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
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg shadow-sm transition-[background-color,transform] duration-100 hover:bg-accent-hover active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-accent/25';

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
function PresetRow({ t, rule }) {
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
 * Derives a rule from an example pair. Writing the pattern is the part nobody
 * wants to do, and it's the part the user already knows the answer to — they
 * found the short form by trying it.
 */
function InferBox({ t, onCreate }) {
    const [long, setLong] = useState('');
    const [short, setShort] = useState('');
    const [error, setError] = useState('');

    const make = () => {
        const r = inferRule(long, short);
        if (!r.ok) { setError(t(ERROR_KEYS[r.error] || r.error)); return; }
        setError('');
        // Named after the site, since that is what the user will look for later.
        onCreate({ id: `u${Date.now()}`, label: r.host, host: r.host, match: r.match, replace: r.replace, syntax: r.syntax });
        setLong('');
        setShort('');
    };

    return (
        <div className={`mt-4 ${FLUSH}`}>
            <h3 className="text-sm font-semibold text-ink">{t('rulesInferTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{t('rulesInferDesc')}</p>

            <div className="mt-3 space-y-2">
                <div>
                    <label className={`${LABEL} mb-1.5 block`}>{t('rulesInferLong')}</label>
                    <input
                        value={long}
                        onChange={(e) => setLong(e.target.value)}
                        placeholder="https://www.example.com/a-very-long-product-name/p/12345"
                        className={`${FIELD} font-mono text-xs`}
                    />
                </div>
                <div>
                    <label className={`${LABEL} mb-1.5 block`}>{t('rulesInferShort')}</label>
                    <input
                        value={short}
                        onChange={(e) => setShort(e.target.value)}
                        placeholder="https://www.example.com/p/12345"
                        className={`${FIELD} font-mono text-xs`}
                    />
                </div>
            </div>

            {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

            <button
                type="button"
                onClick={make}
                disabled={!long.trim() || !short.trim()}
                className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-[background-color,transform] duration-100 focus:outline-none focus:ring-4 focus:ring-accent/25 ${
                    long.trim() && short.trim()
                        ? 'bg-accent text-accent-fg hover:bg-accent-hover active:scale-[0.98]'
                        : 'cursor-not-allowed border border-line bg-surface text-ink-3 shadow-none'
                }`}
            >
                {t('rulesInferMake')}
            </button>
        </div>
    );
}

export default function ShortRulesEditor({ t }) {
    const [userRules, setUserRules] = useChromeStorage(USER_RULES_KEY, []);
    const [testUrl, setTestUrl] = useState('');

    const rules = Array.isArray(userRules) ? userRules : [];

    const update = (i, patch) => {
        const next = rules.map((r, n) => (n === i ? { ...r, ...patch } : r));
        setUserRules(next);
    };
    const add = () => setUserRules([
        ...rules,
        { id: `u${Date.now()}`, label: '', host: '', match: '', replace: '', syntax: 'simple' },
    ]);
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
            <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-ink-2">{t('rulesDesc')}</p>

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
                            <p className="mt-1.5 text-xs text-ink-3">{t('rulesNoMatch')}</p>
                        )}
                    </div>
                )}
            </div>

            <InferBox t={t} onCreate={(rule) => setUserRules([...rules, rule])} />

            <div className="mt-6 space-y-3">
                {rules.map((rule, i) => (
                    <RuleRow
                        key={rule.id || i}
                        t={t}
                        rule={rule}
                        onChange={(patch) => update(i, patch)}
                        onRemove={() => remove(i)}
                    />
                ))}
                <button type="button" onClick={add} className={BTN_PRIMARY}>
                    <span className="text-base leading-none">+</span>
                    {t('rulesAdd')}
                </button>
            </div>

            <div className="mt-9">
                <div className="mb-2.5 flex items-center gap-3">
                    <h3 className={LABEL}>{t('rulesBuiltin')}</h3>
                    <span className="h-px flex-1 bg-line" />
                </div>
                <div className="px-0.5">
                    {PRESET_RULES.map((rule) => <PresetRow key={rule.id} t={t} rule={rule} />)}
                </div>
            </div>
        </div>
    );
}
