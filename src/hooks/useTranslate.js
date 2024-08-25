import { useCallback } from 'react';

export const useTranslate = () => {
  const t = useCallback((key, substitutions = {}) => {
    return chrome.i18n.getMessage(key, substitutions);
  }, []);

  return { t };
};