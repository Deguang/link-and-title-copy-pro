import React, { useState, useRef, useEffect } from 'react';
import { useTranslate } from '@/hooks/useTranslate.js';
import { useChromeStorage } from '@/hooks/useChromeStorage.js';

const ConfigItem = ({ config, index, onUpdate, onDelete, isNew = false }) => {
    const { t } = useTranslate();
    const [editing, setEditing] = useState(isNew);
    const [editedConfig, setEditedConfig] = useState(config);
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
        const shortcut = [];
        if (e.ctrlKey) shortcut.push('Ctrl');
        if (e.altKey) shortcut.push('Alt');
        if (e.shiftKey) shortcut.push('Shift');
        if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift') {
            shortcut.push(e.key.toUpperCase());
        }
        setEditedConfig(prev => ({ ...prev, shortcut: shortcut.join('+') }));
    };

    useEffect(() => {
        if (editing && shortcutRef.current) {
            shortcutRef.current.focus();
        }
    }, [editing]);

    const previewTitle = "Example Website Title";
    const previewUrl = "https://example.com";
    const previewText = editedConfig.template
        .replace('{title}', previewTitle)
        .replace('{url}', previewUrl)
        .replace('{selectedText}', 'Selected Text');

    if (editing) {
        return (
            <div className="bg-white p-4 mb-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">{isNew ? t('addNewConfig') : t('editConfig')}</h3>
                <div className="flex items-center mb-2">
                    <label className="w-1/4">{t('shortcut')}:</label>
                    <div className="w-3/4">
                        <input
                            ref={shortcutRef}
                            type="text"
                            name="shortcut"
                            value={editedConfig.shortcut}
                            onKeyDown={handleShortcutCapture}
                            className="w-full p-2 border rounded"
                            placeholder={t('pressKeyCombination')}
                            readOnly
                        />
                        <span className="text-xs text-gray-500">({t('shortcutRemind')})</span>
                    </div>
                </div>
                <div className="flex items-start mb-2">
                    <label className="w-1/4 pt-2">{t('template')}:</label>
                    <div className="w-3/4">
                        <textarea
                            name="template"
                            value={editedConfig.template}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            placeholder={t('templatePlaceholder')}
                            rows="5"
                        />
                        <span className="text-xs text-gray-500">
                            {t('supportedPlaceholders')}: {'{title}'}, {'{url}'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center mb-4">
                    <label className="w-1/4 pt-2">{t('preview')}:</label>
                    <div className="w-3/4 whitespace-pre-wrap mt-1 bg-gray-100 p-2 rounded">{previewText}</div>
                </div>
                <button onClick={handleSave} className="bg-green-500 text-white px-3 py-1 rounded mr-2 hover:bg-green-600 transition duration-200">
                    {t('save')}
                </button>
                <button onClick={handleCancel} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition duration-200">
                    {t('cancel')}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 mb-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
                <strong className="w-1/4">{t('shortcut')}:</strong>
                <span className="w-3/4">{config.shortcut}</span>
            </div>
            <div className="flex items-start mb-2">
                <strong className="w-1/4">{t('template')}:</strong>
                <pre className="w-3/4 whitespace-pre-wrap">{config.template}</pre>
            </div>
            <div className="flex items-start mb-2">
                <strong className="w-1/4">{t('preview')}:</strong>
                <span className="w-3/4 whitespace-pre-wrap bg-gray-100 p-2 rounded">{previewText}</span>
            </div>
            <div className="mt-2">
                <button onClick={handleEdit} className="bg-blue-500 text-white px-3 py-1 rounded mr-2 hover:bg-blue-600 transition duration-200">
                    {t('edit')}
                </button>
                <button onClick={() => onDelete(index)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-200">
                    {t('delete')}
                </button>
            </div>
        </div>
    );
};

const ConfigList = ({ configs, onUpdate, onDelete }) => {
    const { t } = useTranslate();

    return (
        <div className="mt-4 overflow-y-auto max-h-[calc(100vh-16rem)]">
            <h2 className="text-xl font-semibold mb-4">{t('configList')}</h2>
            {configs.map((config, index) => (
                <ConfigItem
                    key={index}
                    config={config}
                    index={index}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default function Config() {
    const { t } = useTranslate();
    const [configs, setConfigs, storageError] = useChromeStorage('CopyTitleAndUrlConfigs', []);
    const [isAdding, setIsAdding] = useState(false);

    const handleUpdate = (index, updatedConfig) => {
        const newConfigs = [...configs];
        newConfigs[index] = updatedConfig;
        setConfigs(newConfigs);
        if (index === configs.length - 1 && isAdding) {
            setIsAdding(false);
        }
    };

    const handleDelete = (index) => {
        const newConfigs = configs.filter((_, i) => i !== index);
        setConfigs(newConfigs);
    };

    const handleAddNew = () => {
        const newConfig = { shortcut: '', template: '' };
        setConfigs([...configs, newConfig]);
        setIsAdding(true);
    };

    if (storageError) {
        return (
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-red-100 text-red-700 rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold mb-4">{t('error')}</h1>
                    <p>{t('storageError')}: {storageError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-gray-100">
            <div className="w-full max-w-2xl bg-slate-50 rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">{t('config')}-{t('name')}</h1>
                    <ConfigList
                        configs={configs}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                    {isAdding ? (
                        <ConfigItem
                            config={{ shortcut: '', template: '' }}
                            index={configs.length}
                            onUpdate={handleUpdate}
                            onDelete={() => setIsAdding(false)}
                            isNew={true}
                        />
                    ) : (
                        <button
                            onClick={handleAddNew}
                            className="mt-6 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
                        >
                            {t('addNewConfig')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}