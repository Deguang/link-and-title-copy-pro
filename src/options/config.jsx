import React, { useState, useRef, useEffect } from 'react';
import { useTranslate } from '@/hooks/useTranslate.js';
import { useChromeStorage } from '@/hooks/useChromeStorage.js';
import { processTemplate } from '@/utils/templateProcessor';
import { STORAGE_KEY } from '../constant';

const TemplateHelp = ({ t, showHelp, setShowHelp }) => {

    return (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex-shrink-0">
            <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center text-blue-700 font-medium"
            >
                <span className="mr-2">{showHelp ? '▼' : '▶'}</span>
                {t('templateHelp')}
            </button>

            {showHelp && (
                <div className="mt-3 text-sm max-h-64 overflow-y-auto">
                    <div className="mb-3">
                        <h4 className="font-medium mb-2">{t('basicPlaceholders')}:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded">{'{title}'}</code> - {t('pageTitle')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url}'}</code> - {t('pageUrl')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{selectedText}'}</code> - {t('selectedTextEmpty')}</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">{t('smartPlaceholders')}:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded">{'{selectedText|title}'}</code> - {t('selectedTextOrTitle')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{title|selectedText}'}</code> - {t('sameAsAbove')}</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">{t('urlComponentPlaceholders')}:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:clean}'}</code> - {t('urlClean')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:protocol}'}</code> - {t('urlProtocol')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:domain}'}</code> - {t('urlDomain')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:path}'}</code> - {t('urlPath')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:query}'}</code> - {t('urlQuery')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:hash}'}</code> - {t('urlHash')}</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url:origin}'}</code> - {t('urlOrigin')}</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">{t('conditionalTemplates')}:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded text-xs">{'{if:selectedText}...{/if:selectedText}'}</code> - {t('onlyWhenTextSelected')}</li>
                            <li><code className="bg-gray-200 px-1 rounded text-xs">{'{if:noSelectedText}...{/if:noSelectedText}'}</code> - {t('onlyWhenNoTextSelected')}</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">{t('exampleTemplates')}:</h4>
                        <div className="space-y-2">
                            <div className="bg-white p-2 rounded border">
                                <div className="font-mono text-xs mb-1">{'{selectedText|title}'}<br />{'{url}'}</div>
                                <div className="text-xs text-gray-600">{t('smartCopyDesc')}</div>
                            </div>
                            <div className="bg-white p-2 rounded border">
                                <div className="font-mono text-xs mb-1">[{'{selectedText|title}'}]({'{url}'})</div>
                                <div className="text-xs text-gray-600">{t('markdownLinkFormat')}</div>
                            </div>
                            <div className="bg-white p-2 rounded border">
                                <div className="font-mono text-xs mb-1">{'{if:selectedText}"{selectedText}" - {title}{/if:selectedText}{if:noSelectedText}{title}{/if:noSelectedText}'}<br />{'{url}'}</div>
                                <div className="text-xs text-gray-600">{t('quotedSelectedText')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConfigItem = ({ config, index, onUpdate, onDelete, onOpenHelp, isNew = false }) => {
    const { t } = useTranslate();
    const [editing, setEditing] = useState(false);
    const [editedConfig, setEditedConfig] = useState(config);
    const [shortcutError, setShortcutError] = useState('');
    const [isManualInput, setIsManualInput] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionFilter, setSuggestionFilter] = useState('');
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const shortcutRef = useRef(null);
    const templateRef = useRef(null);

    // Available placeholders for autocomplete
    const placeholders = [
        { value: '{title}', desc: t('pageTitle') },
        { value: '{url}', desc: t('pageUrl') },
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

    const handleEdit = () => {
        setEditing(true);
    };

    const handleSave = () => {
        onUpdate(index, editedConfig);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditedConfig(config);
        setEditing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleTemplateChange = (e) => {
        const { value, selectionStart } = e.target;
        setEditedConfig(prev => ({ ...prev, template: value }));

        // Check if we should show suggestions
        const textBeforeCursor = value.substring(0, selectionStart);
        const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
        const lastCloseBrace = textBeforeCursor.lastIndexOf('}');

        if (lastBraceIndex > lastCloseBrace) {
            const filter = textBeforeCursor.substring(lastBraceIndex);
            setSuggestionFilter(filter);
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
            if (showSuggestions) {
                e.preventDefault();
                insertSuggestion(filteredPlaceholders[selectedSuggestion].value);
            }
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
        setEditedConfig(prev => ({ ...prev, template: newValue }));
        setShowSuggestions(false);
        setSuggestionFilter('');

        // Set cursor position after inserted placeholder
        setTimeout(() => {
            const newCursorPos = lastBraceIndex + placeholder.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
    };

    const handleShortcutCapture = (e) => {
        e.preventDefault();
        setShortcutError('');

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
            // Use upper case for single letters to match content.js normalization
            const displayKey = key.length === 1 ? key.toUpperCase() : key;
            const shortcut = [...modifiers, displayKey].join('+');

            if (isValidShortcut(shortcut)) {
                setEditedConfig(prev => ({ ...prev, shortcut }));
            } else {
                setShortcutError('Invalid shortcut combination');
            }
        }
    };

    const handleManualShortcutInput = (e) => {
        const shortcut = e.target.value;
        if (isValidShortcut(shortcut)) {
            setEditedConfig(prev => ({ ...prev, shortcut }));
            setShortcutError('');
        } else {
            setShortcutError('Invalid shortcut format');
        }
    };

    const isValidShortcut = (shortcut) => {
        const invalidCombinations = ['Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Alt+F4'];
        return !invalidCombinations.includes(shortcut);
    };

    useEffect(() => {
        if (editing && shortcutRef.current) {
            shortcutRef.current.focus();
        }
    }, [editing]);

    // 生成预览文本
    const generatePreview = (template) => {
        const previewTitle = "Example Website Title";
        const previewUrl = "https://example.com";
        const previewSelectedText = "Selected text example";

        return {
            withSelection: processTemplate(template, {
                title: previewTitle,
                url: previewUrl,
                selectedText: previewSelectedText
            }),
            withoutSelection: processTemplate(template, {
                title: previewTitle,
                url: previewUrl,
                selectedText: ''
            })
        };
    };

    const preview = generatePreview(editedConfig.template);

    if (editing) {
        return (
            <div className="bg-white p-4 mb-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                    {isNew ? t('addNewConfig') : t('edit')}
                </h3>

                <div className="flex items-start mb-4">
                    <label className="w-1/4 pt-2 font-medium">{t('shortcut')}:</label>
                    <div className="w-3/4">
                        {isManualInput ? (
                            <input
                                type="text"
                                value={editedConfig.shortcut}
                                onChange={handleManualShortcutInput}
                                className={`w-full p-2 border rounded ${shortcutError ? 'border-red-500' : ''}`}
                                placeholder={t('enterShortcutManually')}
                            />
                        ) : (
                            <input
                                ref={shortcutRef}
                                type="text"
                                name="shortcut"
                                value={editedConfig.shortcut}
                                onKeyDown={handleShortcutCapture}
                                className={`w-full p-2 border rounded ${shortcutError ? 'border-red-500' : ''}`}
                                placeholder={t('pressKeyCombination')}
                                readOnly
                            />
                        )}
                        {shortcutError && <p className="text-red-500 text-xs mt-1">{shortcutError}</p>}
                        <button
                            onClick={() => setIsManualInput(!isManualInput)}
                            className="text-sm text-blue-500 mt-1 block hover:underline"
                        >
                            {isManualInput ? t('switchToAutomaticCapture') : t('switchToManualInput')}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                            {t('exampleShortcuts')}: Ctrl+Shift+P, Alt+S, Command+Option+F
                        </p>
                    </div>
                </div>

                <div className="flex items-start mb-4">
                    <label className="w-1/4 pt-2 font-medium">{t('description')}:</label>
                    <div className="w-3/4">
                        <input
                            type="text"
                            name="description"
                            value={editedConfig.description || ''}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            placeholder="Brief description of this template"
                        />
                    </div>
                </div>

                <div className="flex items-start mb-4">
                    <label className="w-1/4 pt-2 font-medium">{t('template')}:</label>
                    <div className="w-3/4 relative">
                        <textarea
                            ref={templateRef}
                            name="template"
                            value={editedConfig.template}
                            onChange={handleTemplateChange}
                            onKeyDown={handleTemplateKeyDown}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            className="w-full p-2 border rounded"
                            placeholder={t('templatePlaceholder')}
                            rows="6"
                        />
                        {showSuggestions && filteredPlaceholders.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredPlaceholders.map((placeholder, idx) => (
                                    <div
                                        key={placeholder.value}
                                        onClick={() => insertSuggestion(placeholder.value)}
                                        className={`px-3 py-2 cursor-pointer flex justify-between items-center ${idx === selectedSuggestion ? 'bg-blue-100' : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        <code className="text-sm font-mono text-blue-600">{placeholder.value}</code>
                                        <span className="text-xs text-gray-500 ml-2">{placeholder.desc}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={onOpenHelp}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                            {t('supportedPlaceholders')} ↗
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block font-medium mb-2">{t('preview')}:</label>
                    <div className="space-y-3">
                        <div>
                            <div className="text-sm font-medium text-green-700 mb-1">📝 {t('withSelectedText')}:</div>
                            <div className="whitespace-pre-wrap bg-green-50 p-3 rounded border text-sm">
                                {preview.withSelection || t('emptyResult')}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-blue-700 mb-1">📄 {t('withoutSelectedText')}:</div>
                            <div className="whitespace-pre-wrap bg-blue-50 p-3 rounded border text-sm">
                                {preview.withoutSelection || t('emptyResult')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
                    >
                        {t('save')}
                    </button>
                    <button
                        onClick={handleCancel}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        );
    }

    const displayPreview = generatePreview(config.template);

    return (
        <div className="bg-white p-3 mb-3 rounded-lg shadow">
            {/* Header row: shortcut + description + actions */}
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm font-medium whitespace-nowrap">
                        {config.shortcut}
                    </span>
                    {config.description && (
                        <span className="text-gray-600 text-sm truncate">{config.description}</span>
                    )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={handleEdit}
                        className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600 transition duration-200"
                    >
                        {t('edit')}
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm(t('confirmDelete'))) {
                                onDelete(index);
                            }
                        }}
                        className="bg-red-500 text-white px-2 py-1 text-sm rounded hover:bg-red-600 transition duration-200"
                    >
                        {t('delete')}
                    </button>
                </div>
            </div>

            {/* Template display */}
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded mb-2 text-gray-700 max-h-20 overflow-y-auto">
                {config.template}
            </pre>

            {/* Collapsible Preview */}
            <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
                <span className="mr-1">{showPreview ? '▼' : '▶'}</span>
                {t('preview')}
            </button>

            {showPreview && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                        <div className="text-xs font-medium text-green-700 mb-1">📝 {t('withSelectedText')}</div>
                        <div className="whitespace-pre-wrap bg-green-50 p-2 rounded text-xs border-l-2 border-green-400 max-h-16 overflow-y-auto">
                            {displayPreview.withSelection}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-blue-700 mb-1">📄 {t('withoutSelectedText')}</div>
                        <div className="whitespace-pre-wrap bg-blue-50 p-2 rounded text-xs border-l-2 border-blue-400 max-h-16 overflow-y-auto">
                            {displayPreview.withoutSelection}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConfigList = ({ configs, onUpdate, onDelete, onOpenHelp }) => {
    const { t } = useTranslate();

    return (
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            <h2 className="text-xl font-semibold mb-4">{t('templateConfigurations')}</h2>
            {configs.map((config, index) => (
                <ConfigItem
                    key={index}
                    config={config}
                    index={index}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onOpenHelp={onOpenHelp}
                    isNew={config.isNew}
                />
            ))}
        </div>
    );
};

export default function Config() {
    const { t } = useTranslate();
    const [configs, setConfigs, storageError] = useChromeStorage(STORAGE_KEY, []);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const uiLanguage = chrome.i18n.getUILanguage();
        const acceptLanguages = navigator.languages;
        console.log('[Options] Current UI Language:', uiLanguage);
        console.log('[Options] Accept Languages:', acceptLanguages);
    }, []);

    const handleOpenHelp = () => {
        setShowHelp(true);
    };

    const handleUpdate = (index, updatedConfig) => {
        const newConfigs = [...configs];
        newConfigs[index] = { ...updatedConfig, isNew: false };
        setConfigs(newConfigs);
    };

    const handleDelete = (index) => {
        const newConfigs = configs.filter((_, i) => i !== index);
        setConfigs(newConfigs);
    };

    const handleAddNew = () => {
        const newConfig = {
            shortcut: '',
            template: '{selectedText|title}\n{url}',
            description: '',
            isNew: true
        };
        setConfigs([...configs, newConfig]);
    };

    if (storageError) {
        return (
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-red-100 text-red-700 rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold mb-4">Error</h1>
                    <p>Storage error: {storageError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center p-2 bg-gray-100">
            <div className="w-full max-w-5xl bg-slate-50 rounded-lg shadow-lg overflow-hidden flex flex-col h-[95vh]">
                <div className="p-4 flex flex-col h-full">
                    <h1 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">
                        {t('config')} - {t('name')}
                    </h1>

                    <TemplateHelp t={t} showHelp={showHelp} setShowHelp={setShowHelp} />

                    <ConfigList
                        configs={configs}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onOpenHelp={handleOpenHelp}
                    />

                    <div className="mt-6 flex-shrink-0">
                        <button
                            onClick={handleAddNew}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200 flex items-center"
                        >
                            <span className="mr-2">+</span>
                            {t('addNewConfig')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}