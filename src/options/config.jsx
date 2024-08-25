import React from 'react';
import { useTranslate } from '@/hooks/useTranslate.js';

export default function Config() {
  const { t } = useTranslate();
  return (
    <div className="w-2/3 mx-auto bg-blue-500 p-4 text-white">
      <h1 className="text-2xl font-bold">{t('config')}-{t('name')}</h1>
    </div>
  );
}