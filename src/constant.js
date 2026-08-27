// constants.js

export const STORAGE_KEY = 'CopyTitleAndUrlConfigs';

// "What's new" nudge: bump WHATS_NEW_VERSION when a release adds a user-facing
// feature worth pointing existing users at. Stored value = last version the user
// acknowledged. New installs are set to current (they get onboarding instead).
export const WHATS_NEW_KEY = 'whatsNewSeenVersion';
export const WHATS_NEW_VERSION = '1.4.0';

// The user's own link-shortening rules for {url:short}. Lives here rather than
// beside the editor so the popup and content script can name it without pulling
// a React component into their bundles.
export const USER_RULES_KEY = 'urlShortRules';
