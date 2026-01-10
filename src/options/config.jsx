import React, { useState, useRef, useEffect } from 'react';
import { useTranslate } from '@/hooks/useTranslate.js';
import { useChromeStorage } from '@/hooks/useChromeStorage.js';
import { processTemplate } from '@/utils/templateProcessor';
import { STORAGE_KEY } from '../constant';

const TemplateHelp = ({ t }) => {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center text-blue-700 font-medium"
            >
                <span className="mr-2">{showHelp ? '▼' : '▶'}</span>
                Template Help & Examples
            </button>

            {showHelp && (
                <div className="mt-3 text-sm">
                    <div className="mb-3">
                        <h4 className="font-medium mb-2">Basic Placeholders:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded">{'{title}'}</code> - Page title</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{url}'}</code> - Page URL</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{selectedText}'}</code> - Selected text (empty if none)</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">Smart Placeholders:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded">{'{selectedText|title}'}</code> - Selected text if any, otherwise title</li>
                            <li><code className="bg-gray-200 px-1 rounded">{'{title|selectedText}'}</code> - Same as above</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">Conditional Templates:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><code className="bg-gray-200 px-1 rounded text-xs">{'{if:selectedText}...{/if:selectedText}'}</code> - Only when text is selected</li>
                            <li><code className="bg-gray-200 px-1 rounded text-xs">{'{if:noSelectedText}...{/if:noSelectedText}'}</code> - Only when no text selected</li>
                        </ul>
                    </div>

                    <div className="mb-3">
                        <h4 className="font-medium mb-2">Example Templates:</h4>
                        <div className="space-y-2">
                            <div className="bg-white p-2 rounded border">
                                <div className="font-mono text-xs mb-1">{'{selectedText|title}'}<br />{'{url}'}</div>
                                <div className="text-xs text-gray-600">Smart copy - selected text or title + URL</div>
                            </div>
                            <div className="bg-white p-2 rounded border">
                                <div className="font-mono text-xs mb-1">[{'{selectedText|title}'}]({'{url}'})</div>
                                <div className="text-xs text-gray-600">Markdown link format</div>
                            </div>
                            <div className="bg-white p-2 rounded border">
                                <div className="font-mono text-xs mb-1">{'{if:selectedText}"{selectedText}" - {title}{/if:selectedText}{if:noSelectedText}{title}{/if:noSelectedText}'}<br />{'{url}'}</div>
                                <div className="text-xs text-gray-600">Quoted selected text with title, or just title</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConfigItem = ({ config, index, onUpdate, onDelete, isNew = false }) => {
    const { t } = useTranslate();
    const [editing, setEditing] = useState(isNew);
    const [editedConfig, setEditedConfig] = useState(config);
    const [shortcutError, setShortcutError] = useState('');
    const [isManualInput, setIsManualInput] = useState(false);
    const shortcutRef = useRef(null);

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
            const shortcut = [...modifiers, key.toLowerCase()].join('+');

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

                <TemplateHelp t={t} />

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
                    <div className="w-3/4">
                        <textarea
                            name="template"
                            value={editedConfig.template}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            placeholder="Template with placeholders..."
                            rows="6"
                        />
                        <span className="text-xs text-gray-500">
                            {t('supportedPlaceholders')}: {'{title}'}, {'{url}'}, {'{selectedText}'}, {'{selectedText|title}'}
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block font-medium mb-2">{t('preview')}:</label>
                    <div className="space-y-3">
                        <div>
                            <div className="text-sm font-medium text-green-700 mb-1">📝 With selected text:</div>
                            <div className="whitespace-pre-wrap bg-green-50 p-3 rounded border text-sm">
                                {preview.withSelection || 'Empty result'}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-blue-700 mb-1">📄 Without selected text:</div>
                            <div className="whitespace-pre-wrap bg-blue-50 p-3 rounded border text-sm">
                                {preview.withoutSelection || 'Empty result'}
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
        <div className="bg-white p-4 mb-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
                <strong className="w-1/4">{t('shortcut')}:</strong>
                <span className="w-3/4 font-mono bg-gray-100 px-2 py-1 rounded">{config.shortcut}</span>
            </div>

            {config.description && (
                <div className="flex items-center mb-2">
                    <strong className="w-1/4">{t('description')}:</strong>
                    <span className="w-3/4 text-gray-700">{config.description}</span>
                </div>
            )}

            <div className="flex items-start mb-2">
                <strong className="w-1/4">{t('template')}:</strong>
                <pre className="w-3/4 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded">{config.template}</pre>
            </div>

            <div className="mb-4">
                <strong className="block mb-2">{t('preview')}:</strong>
                <div className="space-y-2">
                    <div>
                        <div className="text-sm font-medium text-green-700 mb-1">📝 With selection:</div>
                        <div className="whitespace-pre-wrap bg-green-50 p-2 rounded text-sm border-l-4 border-green-400">
                            {displayPreview.withSelection}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-blue-700 mb-1">📄 Without selection:</div>
                        <div className="whitespace-pre-wrap bg-blue-50 p-2 rounded text-sm border-l-4 border-blue-400">
                            {displayPreview.withoutSelection}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleEdit}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition duration-200"
                >
                    {t('edit')}
                </button>
                <button
                    onClick={() => onDelete(index)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-200"
                >
                    {t('delete')}
                </button>
            </div>
        </div>
    );
};

const ConfigList = ({ configs, onUpdate, onDelete }) => {
    const { t } = useTranslate();

    return (
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            <h2 className="text-xl font-semibold mb-4">Template Configurations</h2>
            {configs.map((config, index) => (
                <ConfigItem
                    key={index}
                    config={config}
                    index={index}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    isNew={config.isNew}
                />
            ))}
        </div>
    );
};

export default function Config() {
    const { t } = useTranslate();
    const [configs, setConfigs, storageError] = useChromeStorage(STORAGE_KEY, []);

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
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-gray-100">
            <div className="w-full max-w-4xl bg-slate-50 rounded-lg shadow-lg overflow-hidden flex flex-col h-[90vh]">
                <div className="p-6 flex flex-col h-full">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800 flex-shrink-0">
                        {t('config')} - {t('name')}
                    </h1>

                    <div className="mb-6 p-4 bg-blue-50 rounded-lg flex-shrink-0">
                        <h3 className="font-medium text-blue-800 mb-2">✨ Enhanced Features:</h3>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• <strong>Smart text selection support</strong> - Copy selected text or fallback to page title</li>
                            <li>• <strong>Conditional templates</strong> - Different output based on whether text is selected</li>
                            <li>• <strong>Right-click context menu</strong> - Quick access from page or selected text</li>
                            <li>• <strong>Visual feedback</strong> - Different icons and messages for different copy types</li>
                        </ul>
                    </div>

                    <ConfigList
                        configs={configs}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
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