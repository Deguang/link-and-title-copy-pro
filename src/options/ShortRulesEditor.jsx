import { useMemo, useState } from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { USER_RULES_KEY } from '../constant';
import { PRESET_RULES, validateRule } from '../utils/urlRules.mjs';
import { shortenUrl } from '../utils/shortUrl.mjs';

export { USER_RULES_KEY };

const FIELD = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15';
const FIELD_ERROR = 'border-danger focus:border-danger focus:ring-danger/15';
const LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-ink-3';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25';

const ERROR_KEYS = {
    missingHost: 'ruleErrMissingHost',
    missingMatch: 'ruleErrMissingMatch',
    missingReplace: 'ruleErrMissingReplace',
    patternInvalid: 'ruleErrPatternInvalid',
    patternUnsafe: 'ruleErrPatternUnsafe',
    patternTooLong: 'ruleErrPatternTooLong',
    duplicateName: 'ruleErrDuplicateName',
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
        <div className="rounded-xl border border-line bg-surface p-4">
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
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line-soft py-2 last:border-0">
            <span className="min-w-[7rem] text-sm font-medium text-ink">{rule.label}</span>
            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                {t('rulesBuiltin')}
            </span>
            <code className="font-mono text-xs text-ink-3">{rule.host}</code>
            <code className="font-mono text-xs text-ink-2">→ {rule.replace}</code>
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
        if (!testUrl.trim()) return null;
        const usable = rules.filter((r) => !validateRule(r));
        const out = shortenUrl(testUrl.trim(), usable);
        return { out, changed: out !== testUrl.trim() };
    }, [testUrl, rules]);

    return (
        <div className="mx-auto max-w-3xl">
            <h2 className="text-lg font-semibold text-ink">{t('rulesTitle')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{t('rulesDesc')}</p>

            {/* Test first: it is the fastest way to understand what any of this does. */}
            <div className="mt-5 rounded-xl border border-line bg-surface p-4">
                <label className={`${LABEL} mb-1.5 block`}>{t('rulesTest')}</label>
                <input
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://www.amazon.com/Some-Long-Title/dp/B0D4HLHW8B/"
                    className={`${FIELD} font-mono text-xs`}
                />
                {preview && (
                    <div className="mt-3">
                        <span className={`${LABEL} mb-1.5 block`}>{t('rulesResult')}</span>
                        <p className="break-all rounded-lg border border-line-soft bg-surface-2 p-2.5 font-mono text-xs text-ink">
                            {preview.out}
                        </p>
                        {!preview.changed && (
                            <p className="mt-1.5 text-xs text-ink-3">{t('rulesNoMatch')}</p>
                        )}
                    </div>
                )}
            </div>

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

            <div className="mt-8">
                <h3 className={`${LABEL} mb-2`}>{t('rulesBuiltin')}</h3>
                <div className="rounded-xl border border-line bg-surface px-4 py-1">
                    {PRESET_RULES.map((rule) => <PresetRow key={rule.id} t={t} rule={rule} />)}
                </div>
            </div>
        </div>
    );
}
