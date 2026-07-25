import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  // Generated / vendored output is not ours to lint.
  { ignores: ["dist/**", "releases/**", "node_modules/**", "docs/**", "extension.zip"] },

  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },

  // Extension code runs in the browser + the WebExtensions APIs (chrome.*);
  // build scripts run in Node. Declare all three so real bugs surface instead of
  // a wall of "'chrome' is not defined".
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.node,
      },
    },
  },

  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  {
    settings: { react: { version: "detect" } },
    rules: {
      // This codebase doesn't use PropTypes or import React into every JSX file.
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // Empty catches are used intentionally (best-effort clipboard / messaging).
      "no-empty": ["warn", { allowEmptyCatch: true }],
      // Unused vars are a smell, not a build-breaker — surface as warnings, and
      // allow deliberately-ignored args/vars via a leading underscore. Use the
      // TS-aware rule (from typescript-eslint) and disable the base to avoid dupes.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // Tests may use globals injected by vitest.
  {
    files: ["**/*.test.{js,mjs,jsx}", "scripts/test/**"],
    languageOptions: { globals: { ...globals.node } },
  },
];
