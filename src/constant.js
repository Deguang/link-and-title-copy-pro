// constants.js

export const STORAGE_KEY = 'CopyTitleAndUrlConfigs';

export const DEFAULT_CONFIGS = [
  {
    windows: { shortcut: 'Ctrl+Shift+P', template: '{title}\n{url}' },
    mac: { shortcut: 'Command+Shift+P', template: '{title}\n{url}' },
    linux: { shortcut: 'Ctrl+Shift+P', template: '{title}\n{url}' }
  },
  {
    windows: { shortcut: 'Ctrl+Shift+O', template: '[{title}]({url})' },
    mac: { shortcut: 'Command+Shift+O', template: '[{title}]({url})' },
    linux: { shortcut: 'Ctrl+Shift+O', template: '[{title}]({url})' }
  }
];