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
    // Update state first so controlled inputs stay responsive — waiting for the
    // async storage callback drops keystrokes and jumps the caret while typing.
    setValue(newValue);
    chrome.storage.local.set({ [key]: newValue }, () => {
      // Reload configurations
      chrome.runtime.sendMessage({ action: 'reloadConfigurations' });
    });
  }, [key]);

  return [value, setStorageValue];
}