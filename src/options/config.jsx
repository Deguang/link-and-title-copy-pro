import React, { useState, useRef, useEffect } from 'react';
import { useTranslate } from '@/hooks/useTranslate.js';
import { useChromeStorage } from '@/hooks/useChromeStorage.js';
import { processTemplate } from '@/utils/templateProcessor';
import { STORAGE_KEY } from '../constant';
import LicenseSection from './LicenseSection';
import { PAYMENT_ENABLED } from '@/utils/license';
import { REVIEW_OPT_OUT_KEY } from '@/utils/reviewPrompt';
import { validateConfig } from '@/utils/validateConfig.mjs';
import Keycap from '@/components/Keycap';

// Maps a validation issue onto its localized message.
const issueText = (t, issue) => {
    switch (issue.code) {
        case 'missingShortcut': return t('validationMissingShortcut');
        case 'duplicateShortcut': return t('validationDuplicateShortcut', [issue.value]);
        case 'emptyTemplate': return t('validationEmptyTemplate');
        case 'unknownPlaceholder': return t('validationUnknownPlaceholder', [issue.value]);
        case 'unclosedTag': return t('validationUnclosedTag', [issue.value]);
        case 'negativeConditionalOnly': return t('validationNegativeConditionalOnly');
        default: return issue.code;
    }
};

/* --------------------------------------------------------------------------
 * Design tokens (kept as string constants so the whole page stays consistent)
 * Values come from src/styles/tokens.css via semantic Tailwind colors, so these
 * strings never name a raw hue and dark mode needs no per-element handling.
 * ------------------------------------------------------------------------ */
const FIELD = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15';
const FIELD_ERROR = 'border-danger focus:border-danger focus:ring-danger/15';
const LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-ink-3';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25';
const BTN_GHOST = 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-2 shadow-sm transition hover:bg-surface-2 hover:text-ink focus:outline-none focus:ring-4 focus:ring-accent/10';


// Non-blocking validation feedback for a single field. Errors mean "this config
// cannot work"; warnings mean "this will copy something you probably didn't mean".
const IssueList = ({ t, issues }) => {
    if (!issues.length) return null;
    return (
        <div className="mt-2 space-y-1.5">
            {issues.map((issue, i) => {
                const isError = issue.level === 'error';
                return (
                    <p
                        key={i}
                        className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs ${isError ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}
                    >
                        <WarningIcon className="mt-px h-3.5 w-3.5 flex-shrink-0" />
                        <span>{issueText(t, issue)}</span>
                    </p>
                );
            })}
        </div>
    );
};

const WarningIcon = ({ className = '' }) => (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
);

// Toggle to opt out of the occasional rate/share reminder (stored under
// REVIEW_OPT_OUT_KEY; true = opted out). shouldPromptReview() honors this.
function ReviewReminderToggle({ t }) {
    const [optOut, setOptOut] = useChromeStorage(REVIEW_OPT_OUT_KEY, false);
    const on = !optOut;
    // A preference most users never touch — kept at the weight of a footer link
    // rather than a card, so the Pro entry is the only thing carrying weight here.
    return (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-3 transition hover:text-ink-2">
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => setOptOut(on)}
                className={`relative inline-flex h-3.5 w-6 flex-shrink-0 items-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-accent/20 ${on ? 'bg-accent' : 'bg-line'}`}
            >
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-surface shadow-sm transition ${on ? 'translate-x-3' : 'translate-x-0.5'}`} />
            </button>
            {t('reviewRemindersLabel')}
        </label>
    );
}

// Shortcuts the browser itself reserves — pages often can't intercept these, so a
// configured copy shortcut using one may silently open a browser feature instead.
// Display-only: we warn, we never change the user's saved shortcut.
const _isMacOptions = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const BROWSER_CONFLICTS = _isMacOptions
    ? new Set(['Command+Shift+N', 'Command+Shift+T', 'Command+Shift+W', 'Command+Shift+I', 'Command+Shift+J', 'Command+Shift+C'])
    : new Set(['Ctrl+Shift+O', 'Ctrl+Shift+B', 'Ctrl+Shift+N', 'Ctrl+Shift+T', 'Ctrl+Shift+W', 'Ctrl+Shift+Q', 'Ctrl+Shift+M', 'Ctrl+Shift+D', 'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C', 'Ctrl+Shift+Delete']);

// Placeholder reference body. Rendered inside the slide-over help drawer.
const HelpContent = ({ t }) => {
    const Group = ({ title, children }) => (
        <section className="mb-6 last:mb-0">
            <h4 className={`${LABEL} mb-2`}>{title}</h4>
            <dl className="overflow-hidden rounded-xl border border-line bg-surface">
                {children}
            </dl>
        </section>
    );

    const Row = ({ code, desc }) => (
        <div className="flex flex-col gap-1 border-b border-line-soft px-3 py-2.5 last:border-0">
            <code className="w-fit rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[12px] font-medium text-accent">
                {code}
            </code>
            <dd className="text-xs leading-relaxed text-ink-2">{desc}</dd>
        </div>
    );

    const Example = ({ code, desc }) => (
        <div className="rounded-xl border border-line bg-surface p-3">
            <pre className="mb-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-ink-2">{code}</pre>
            <div className="text-xs text-ink-3">{desc}</div>
        </div>
    );

    return (
        <div>
            <Group title={t('basicPlaceholders')}>
                <Row code="{title}" desc={t('pageTitle')} />
                <Row code="{url}" desc={t('pageUrl')} />
                <Row code="{selectedText}" desc={t('selectedTextEmpty')} />
            </Group>

            <Group title={t('smartPlaceholders')}>
                <Row code="{selectedText|title}" desc={t('selectedTextOrTitle')} />
                <Row code="{title|selectedText}" desc={t('sameAsAbove')} />
            </Group>

            <Group title={t('urlComponentPlaceholders')}>
                <Row code="{url:notrack}" desc={t('urlNoTrack')} />
                <Row code="{url:clean}" desc={t('urlClean')} />
                <Row code="{url:protocol}" desc={t('urlProtocol')} />
                <Row code="{url:domain}" desc={t('urlDomain')} />
                <Row code="{url:path}" desc={t('urlPath')} />
                <Row code="{url:query}" desc={t('urlQuery')} />
                <Row code="{url:hash}" desc={t('urlHash')} />
                <Row code="{url:origin}" desc={t('urlOrigin')} />
            </Group>

            <Group title={t('conditionalTemplates')}>
                <Row code="{if:selectedText}…{/if:selectedText}" desc={t('onlyWhenTextSelected')} />
                <Row code="{if:noSelectedText}…{/if:noSelectedText}" desc={t('onlyWhenNoTextSelected')} />
            </Group>

            <section>
                <h4 className={`${LABEL} mb-2`}>{t('exampleTemplates')}</h4>
                <div className="space-y-2">
                    <Example code={'{selectedText|title}\n{url}'} desc={t('smartCopyDesc')} />
                    <Example code={'[{selectedText|title}]({url})'} desc={t('markdownLinkFormat')} />
                    <Example
                        code={'{if:selectedText}"{selectedText}" - {title}{/if:selectedText}{if:noSelectedText}{title}{/if:noSelectedText}\n{url}'}
                        desc={t('quotedSelectedText')}
                    />
                </div>
            </section>
        </div>
    );
};

// One row in the left master list. Selecting it opens the editor on the right.
const TemplateListRow = ({ config, active, onClick, hasError }) => {
    const { t } = useTranslate();
    const conflict = BROWSER_CONFLICTS.has(config.shortcut);
    const subtitle = config.description || (config.template || '').split('\n')[0] || t('templatePlaceholder');
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative mb-1 w-full rounded-xl px-3 py-2.5 text-left transition focus:outline-none focus:ring-4 focus:ring-accent/15 ${active
                ? 'bg-surface shadow-sm ring-1 ring-line'
                : 'hover:bg-surface/70'}`}
        >
            {/* Active indicator rail */}
            <span
                className={`absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
            />
            <div className="mb-1 flex items-center gap-1.5">
                <Keycap shortcut={config.shortcut} muted={!active} emptyLabel={t('shortcutNone')} />
                {conflict && (
                    <WarningIcon className="h-3.5 w-3.5 flex-shrink-0 text-warn" />
                )}
                {hasError && (
                    <span className="ml-auto flex-shrink-0 rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        {t('validationIncomplete')}
                    </span>
                )}
            </div>
            <div className={`truncate text-xs ${active ? 'text-ink-2' : 'text-ink-3'}`}>{subtitle}</div>
        </button>
    );
};

// Right-hand editor. Fully controlled: every edit is pushed up via onChange and
// persisted immediately (auto-save), so switching rows never loses work.
const TemplateEditor = ({ config, index, onChange, onDelete, onOpenHelp, issues = [], justSaved }) => {
    const { t } = useTranslate();
    const [shortcutError, setShortcutError] = useState('');
    const [isManualInput, setIsManualInput] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionFilter, setSuggestionFilter] = useState('');
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const templateRef = useRef(null);
    const confirmBtnRef = useRef(null);

    // Move focus onto the confirm button so the keyboard path matches what the
    // native dialog gave us, and let Esc back out.
    useEffect(() => {
        if (!confirmingDelete) return;
        confirmBtnRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') setConfirmingDelete(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [confirmingDelete]);

    const placeholders = [
        { value: '{title}', desc: t('pageTitle') },
        { value: '{url}', desc: t('pageUrl') },
        { value: '{url:notrack}', desc: t('urlNoTrack') },
        { value: '{url:clean}', desc: t('urlClean') },
        { value: '{url:protocol}', desc: t('urlProtocol') },
        { value: '{url:domain}', desc: t('urlDomain') },
        { value: '{url:path}', desc: t('urlPath') },
        { value: '{url:query}', desc: t('urlQuery') },
        { value: '{url:hash}', desc: t('urlHash') },
        { value: '{url:origin}', desc: t('urlOrigin') },
        { value: '{selectedText}', desc: t('selectedTextEmpty') },
        { value: '{selectedText|title}', desc: t('selectedTextOrTitle') },
        { value: '{title|selectedText}', desc: t('sameAsAbove') },
        { value: '{if:selectedText}', desc: t('onlyWhenTextSelected') },
        { value: '{/if:selectedText}', desc: t('onlyWhenTextSelected') },
        { value: '{if:noSelectedText}', desc: t('onlyWhenNoTextSelected') },
        { value: '{/if:noSelectedText}', desc: t('onlyWhenNoTextSelected') },
    ];

    const filteredPlaceholders = placeholders.filter(p =>
        p.value.toLowerCase().includes(suggestionFilter.toLowerCase())
    );

    const isValidShortcut = (shortcut) => {
        const invalidCombinations = ['Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Alt+F4'];
        return !invalidCombinations.includes(shortcut);
    };

    const handleShortcutCapture = (e) => {
        e.preventDefault();
        setShortcutError('');

        // Backspace and Delete clear the binding. Neither is usable as a shortcut
        // on its own, so nothing is lost by reserving them for this.
        if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            onChange({ shortcut: '' });
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push(isMac ? 'Command' : 'Win');
        if (e.altKey) modifiers.push(isMac ? 'Option' : 'Alt');
        if (e.shiftKey) modifiers.push('Shift');

        let key = e.key;
        const specialKeys = {
            ' ': 'Space',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
        };
        key = specialKeys[key] || key;

        if (!['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(key)) {
            const displayKey = key.length === 1 ? key.toUpperCase() : key;
            const shortcut = [...modifiers, displayKey].join('+');
            if (isValidShortcut(shortcut)) {
                onChange({ shortcut });
            } else {
                setShortcutError(t('invalidShortcut'));
            }
        }
    };

    const handleManualShortcutInput = (e) => {
        const shortcut = e.target.value;
        onChange({ shortcut });
        // Emptying the field is how you clear a binding here, so it isn't an error.
        setShortcutError(!shortcut || isValidShortcut(shortcut) ? '' : t('invalidShortcutFormat'));
    };

    const handleTemplateChange = (e) => {
        const { value, selectionStart } = e.target;
        onChange({ template: value });

        const textBeforeCursor = value.substring(0, selectionStart);
        const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
        const lastCloseBrace = textBeforeCursor.lastIndexOf('}');

        if (lastBraceIndex > lastCloseBrace) {
            setSuggestionFilter(textBeforeCursor.substring(lastBraceIndex));
            setShowSuggestions(true);
            setSelectedSuggestion(0);
        } else {
            setShowSuggestions(false);
            setSuggestionFilter('');
        }
    };

    const handleTemplateKeyDown = (e) => {
        if (!showSuggestions || filteredPlaceholders.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestion(prev => (prev + 1) % filteredPlaceholders.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestion(prev => (prev - 1 + filteredPlaceholders.length) % filteredPlaceholders.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertSuggestion(filteredPlaceholders[selectedSuggestion].value);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const insertSuggestion = (placeholder) => {
        const textarea = templateRef.current;
        if (!textarea) return;

        const { selectionStart, value } = textarea;
        const textBeforeCursor = value.substring(0, selectionStart);
        const textAfterCursor = value.substring(selectionStart);
        const lastBraceIndex = textBeforeCursor.lastIndexOf('{');

        const newValue = textBeforeCursor.substring(0, lastBraceIndex) + placeholder + textAfterCursor;
        onChange({ template: newValue });
        setShowSuggestions(false);
        setSuggestionFilter('');

        setTimeout(() => {
            const newCursorPos = lastBraceIndex + placeholder.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
    };

    const preview = {
        withSelection: processTemplate(config.template, {
            title: 'Example Website Title',
            url: 'https://example.com',
            selectedText: 'Selected text example',
        }),
        withoutSelection: processTemplate(config.template, {
            title: 'Example Website Title',
            url: 'https://example.com',
            selectedText: '',
        }),
    };

    const conflict = BROWSER_CONFLICTS.has(config.shortcut);
    const shortcutIssues = issues.filter(i => i.field === 'shortcut');
    const templateIssues = issues.filter(i => i.field === 'template');

    return (
        <div className="mx-auto max-w-3xl">
            {/* Editor header */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <Keycap shortcut={config.shortcut} size="md" emptyLabel={t('shortcutNone')} />
                    <h3 className="mt-2 truncate text-xl font-semibold tracking-tight text-ink">
                        {config.description || t('edit')}
                    </h3>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                        className={`flex items-center gap-1 text-xs font-medium text-ok transition-opacity duration-300 ${justSaved ? 'opacity-100' : 'opacity-0'}`}
                        aria-live="polite"
                    >
                        <span>✓</span>{t('savedIndicator')}
                    </span>
                    <button
                        onClick={() => setConfirmingDelete(true)}
                        className="rounded-lg px-2.5 py-1.5 text-sm text-ink-3 transition hover:bg-danger-soft hover:text-danger focus:outline-none focus:ring-4 focus:ring-danger/10"
                    >
                        {t('delete')}
                    </button>
                </div>
            </div>

            {/* Inline delete confirmation — replaces window.confirm(), which broke
                out of the page's visual language and blocked the whole tab. */}
            {confirmingDelete && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-danger">
                        <WarningIcon className="h-4 w-4 flex-shrink-0" />
                        {t('confirmDelete')}
                    </p>
                    <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                            onClick={() => setConfirmingDelete(false)}
                            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink focus:outline-none focus:ring-4 focus:ring-accent/10"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            ref={confirmBtnRef}
                            onClick={() => onDelete(index)}
                            className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-surface shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-danger/25"
                        >
                            {t('delete')}
                        </button>
                    </div>
                </div>
            )}

            {/* Shortcut */}
            <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                    <label className={LABEL}>{t('shortcut')}</label>
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                        {t('shortcutOptional')}
                    </span>
                </div>
                {isManualInput ? (
                    <input
                        type="text"
                        value={config.shortcut}
                        onChange={handleManualShortcutInput}
                        className={`${FIELD} font-mono ${shortcutError ? FIELD_ERROR : ''}`}
                        placeholder={t('enterShortcutManually')}
                    />
                ) : (
                    <div className="relative">
                        <input
                            type="text"
                            value={config.shortcut}
                            onKeyDown={handleShortcutCapture}
                            className={`${FIELD} cursor-pointer text-center font-mono tracking-wide ${config.shortcut ? 'pr-10' : ''} ${shortcutError ? FIELD_ERROR : ''}`}
                            placeholder={t('pressKeyCombination')}
                            readOnly
                        />
                        {config.shortcut && (
                            <button
                                type="button"
                                onClick={() => onChange({ shortcut: '' })}
                                title={t('shortcutClear')}
                                aria-label={t('shortcutClear')}
                                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-lg leading-none text-ink-3 transition hover:bg-surface-2 hover:text-danger focus:outline-none focus:ring-4 focus:ring-danger/10"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}

                {shortcutError && (
                    <p className="mt-2 text-xs font-medium text-danger">{shortcutError}</p>
                )}
                {conflict && !shortcutError && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warn-soft px-2.5 py-2 text-xs text-warn">
                        <WarningIcon className="mt-px h-3.5 w-3.5 flex-shrink-0" />
                        <span>{t('shortcutConflictHint')}</span>
                    </p>
                )}
                <IssueList t={t} issues={shortcutIssues} />

                <p className="mt-2.5 text-xs leading-relaxed text-ink-3">{t('shortcutWays')}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-3">
                        {t('exampleShortcuts')}: Ctrl+Shift+P, Alt+S, Command+Option+F
                    </p>
                    <button
                        onClick={() => setIsManualInput(!isManualInput)}
                        className="text-xs font-medium text-accent transition hover:text-accent-hover hover:underline"
                    >
                        {isManualInput ? t('switchToAutomaticCapture') : t('switchToManualInput')}
                    </button>
                </div>
            </section>

            {/* Description */}
            <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <label className={`${LABEL} mb-2 block`}>{t('description')}</label>
                <input
                    type="text"
                    value={config.description || ''}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className={FIELD}
                    placeholder={t('descriptionPlaceholder')}
                />
            </section>

            {/* Template */}
            <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <label className={LABEL}>{t('template')}</label>
                    <button
                        onClick={onOpenHelp}
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:text-accent-hover hover:underline"
                    >
                        <span className="font-mono">{'{ }'}</span>
                        {t('supportedPlaceholders')}
                    </button>
                </div>
                <div className="relative">
                    <textarea
                        ref={templateRef}
                        value={config.template}
                        onChange={handleTemplateChange}
                        onKeyDown={handleTemplateKeyDown}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className={`${FIELD} resize-y font-mono leading-relaxed`}
                        placeholder={t('templatePlaceholder')}
                        rows="6"
                    />
                    {showSuggestions && filteredPlaceholders.length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl shadow-ink/10">
                            {filteredPlaceholders.map((placeholder, idx) => (
                                <div
                                    key={placeholder.value}
                                    onClick={() => insertSuggestion(placeholder.value)}
                                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition ${idx === selectedSuggestion ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}
                                >
                                    <code className={`font-mono text-xs font-medium ${idx === selectedSuggestion ? 'text-accent' : 'text-ink-2'}`}>
                                        {placeholder.value}
                                    </code>
                                    <span className="truncate text-[11px] text-ink-3">{placeholder.desc}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <IssueList t={t} issues={templateIssues} />
            </section>

            {/* Preview */}
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <label className={`${LABEL} mb-3 block`}>{t('preview')}</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                            {t('withSelectedText')}
                        </div>
                        <div className="min-h-[3.5rem] whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink-2">
                            {preview.withSelection || <span className="italic text-ink-3">{t('emptyResult')}</span>}
                        </div>
                    </div>
                    <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                            {t('withoutSelectedText')}
                        </div>
                        <div className="min-h-[3.5rem] whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink-2">
                            {preview.withoutSelection || <span className="italic text-ink-3">{t('emptyResult')}</span>}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default function Config() {
    const { t } = useTranslate();
    const [configs, setConfigs, storageError] = useChromeStorage(STORAGE_KEY, []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showHelp, setShowHelp] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const savedTimer = useRef(null);

    useEffect(() => {
        const uiLanguage = chrome.i18n.getUILanguage();
        console.log('[Options] Current UI Language:', uiLanguage);
        console.log('[Options] Accept Languages:', navigator.languages);
    }, []);

    // Esc closes the help drawer.
    useEffect(() => {
        if (!showHelp) return;
        const onKey = (e) => { if (e.key === 'Escape') setShowHelp(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showHelp]);

    // Keep the selection within bounds as the list grows/shrinks.
    const selected = selectedIndex != null && selectedIndex < configs.length
        ? configs[selectedIndex]
        : null;

    // Flash "Saved" after a write; the timer is restarted on every keystroke so the
    // badge lingers ~1.2s past the last change instead of blinking per character.
    const flashSaved = () => {
        setJustSaved(true);
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setJustSaved(false), 1200);
    };

    useEffect(() => () => clearTimeout(savedTimer.current), []);

    const handleChange = (index, patch) => {
        const next = [...configs];
        next[index] = { ...next[index], ...patch, isNew: false };
        setConfigs(next);
        flashSaved();
    };

    const handleDelete = (index) => {
        const next = configs.filter((_, i) => i !== index);
        setConfigs(next);
        setSelectedIndex(next.length === 0 ? null : Math.min(index, next.length - 1));
    };

    const handleAddNew = () => {
        const newConfig = {
            shortcut: '',
            template: '{selectedText|title}\n{url}',
            description: '',
            isNew: true,
        };
        setConfigs([...configs, newConfig]);
        setSelectedIndex(configs.length);
    };

    if (storageError) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-canvas p-4">
                <div className="w-full max-w-md rounded-2xl border border-danger bg-surface p-6 shadow-lg">
                    <h1 className="mb-2 text-lg font-semibold text-danger">Error</h1>
                    <p className="text-sm text-ink-2">Storage error: {storageError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-canvas p-3">
            <style>{`
                @keyframes drawerIn { from { transform: translateX(16px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            `}</style>

            <div className="relative flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl shadow-ink/10 ring-1 ring-ink/5">
                {/* Top bar */}
                <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {/* Absolute path: resolves from the extension root regardless of
                            which page embeds it. */}
                        <img
                            src="/icons/icon.webp"
                            alt=""
                            className="h-7 w-7 flex-shrink-0 rounded-md"
                        />
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-semibold tracking-tight text-ink">
                                {t('name')}
                            </h1>
                            <p className="text-xs text-ink-3">{t('config')}</p>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                        <button onClick={() => setShowHelp(true)} className={BTN_GHOST}>
                            <span className="font-mono text-accent">{'{ }'}</span>
                            <span className="hidden sm:inline">{t('supportedPlaceholders')}</span>
                        </button>
                        <button onClick={handleAddNew} className={BTN_PRIMARY}>
                            <span className="text-base leading-none">+</span>
                            {t('addNewConfig')}
                        </button>
                    </div>
                </header>

                {/* Master / detail */}
                <div className="flex min-h-0 flex-1">
                    {/* Master list */}
                    <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-line bg-surface-2 p-2.5">
                        <h2 className={`${LABEL} mb-2 flex items-center justify-between px-2 pt-1`}>
                            <span>{t('templateConfigurations')}</span>
                            <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
                                {configs.length}
                            </span>
                        </h2>
                        {configs.map((config, index) => (
                            <TemplateListRow
                                key={index}
                                config={config}
                                active={index === selectedIndex}
                                onClick={() => setSelectedIndex(index)}
                                hasError={validateConfig(config, { allConfigs: configs, index })
                                    .some(i => i.level === 'error')}
                            />
                        ))}
                    </aside>

                    {/* Detail */}
                    <main className="flex-1 overflow-y-auto bg-canvas p-6">
                        {selected ? (
                            <TemplateEditor
                                key={selectedIndex}
                                config={selected}
                                index={selectedIndex}
                                onChange={(patch) => handleChange(selectedIndex, patch)}
                                onDelete={handleDelete}
                                onOpenHelp={() => setShowHelp(true)}
                                issues={validateConfig(selected, { allConfigs: configs, index: selectedIndex })}
                                justSaved={justSaved}
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 font-mono text-ink-3">
                                    {'{ }'}
                                </div>
                                <p className="mb-4 max-w-xs text-sm text-ink-2">{t('editorEmptyHint')}</p>
                                <button onClick={handleAddNew} className={BTN_PRIMARY}>
                                    <span className="text-base leading-none">+</span>
                                    {t('addNewConfig')}
                                </button>
                            </div>
                        )}
                    </main>
                </div>

                {/* Bottom meta bar */}
                {/* Footer carries only secondary matter, so nothing in it outweighs the
                    editor. Once payment is live the licence UI needs real room and gets
                    its own row; until then it's a chip alongside the other meta. */}
                <footer className="flex-shrink-0 border-t border-line bg-surface px-5 py-2.5">
                    {PAYMENT_ENABLED && (
                        <div className="mb-2.5">
                            <LicenseSection />
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                        <div className="flex items-center gap-3">
                            <a
                                href="https://github.com/Deguang/link-and-title-copy-pro/issues/new"
                                target="_blank"
                                rel="noreferrer"
                                className="text-ink-3 transition hover:text-accent"
                            >
                                {t('reportIssue')}
                            </a>
                            {!PAYMENT_ENABLED && <LicenseSection />}
                        </div>
                        <ReviewReminderToggle t={t} />
                    </div>
                </footer>

                {/* Help drawer (slide-over) */}
                {showHelp && (
                    <div className="absolute inset-0 z-30 flex">
                        <div
                            className="flex-1 bg-ink/25 backdrop-blur-[2px]"
                            style={{ animation: 'fadeIn .15s ease-out' }}
                            onClick={() => setShowHelp(false)}
                        />
                        <div
                            className="flex w-[26rem] max-w-full flex-col border-l border-line bg-canvas shadow-2xl shadow-ink/20"
                            style={{ animation: 'drawerIn .2s cubic-bezier(.32,.72,0,1)' }}
                        >
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-line bg-surface px-5 py-3.5">
                                <div>
                                    <h3 className="text-sm font-semibold tracking-tight text-ink">
                                        {t('templateHelp')}
                                    </h3>
                                    <p className="text-xs text-ink-3">{t('supportedPlaceholders')}</p>
                                </div>
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none text-ink-3 transition hover:bg-surface-2 hover:text-ink focus:outline-none focus:ring-4 focus:ring-accent/10"
                                    aria-label={t('cancel')}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="overflow-y-auto p-5">
                                <HelpContent t={t} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
