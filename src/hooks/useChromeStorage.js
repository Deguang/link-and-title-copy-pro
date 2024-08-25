import { useState, useEffect, useCallback } from 'react';

export function useChromeStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
    });
  }, [key]);

  const setStorageValue = useCallback((newValue) => {
    chrome.storage.local.set({ [key]: newValue }, () => {
      setValue(newValue);
      // Reload configurations
      chrome.runtime.sendMessage({ action: 'reloadConfigurations' });

    });
  }, [key]);

  return [value, setStorageValue];
}