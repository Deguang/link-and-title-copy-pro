module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/**/*.html",
        "./docs/**/*.html",
        "./docs/**/*.html",
        // 如果你的组件在特定目录，确保也包含它
        "./src/components/**/*.{js,jsx,ts,tsx}",
        // 如果你有options页面，确保包含它
        "./src/options/**/*.{js,jsx,ts,tsx,html}",
    ],
    theme: {
        extend: {
            // Semantic colors backed by the CSS variables in src/styles/tokens.css.
            // Components name roles ("bg-surface", "text-ink-2"), never raw hues,
            // so light/dark is one attribute flip with no per-element ternaries.
            colors: {
                canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
                surface: 'rgb(var(--c-surface) / <alpha-value>)',
                'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
                line: 'rgb(var(--c-line) / <alpha-value>)',
                'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',
                ink: 'rgb(var(--c-ink) / <alpha-value>)',
                'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
                'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',
                accent: 'rgb(var(--c-accent) / <alpha-value>)',
                'accent-hover': 'rgb(var(--c-accent-hover) / <alpha-value>)',
                'accent-fg': 'rgb(var(--c-accent-fg) / <alpha-value>)',
                'accent-soft': 'rgb(var(--c-accent-soft) / <alpha-value>)',
                brand: 'rgb(var(--c-brand) / <alpha-value>)',
                ok: 'rgb(var(--c-ok) / <alpha-value>)',
                warn: 'rgb(var(--c-warn) / <alpha-value>)',
                'warn-soft': 'rgb(var(--c-warn-soft) / <alpha-value>)',
                danger: 'rgb(var(--c-danger) / <alpha-value>)',
                'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)',
                pro: 'rgb(var(--c-pro) / <alpha-value>)',
                'pro-fg': 'rgb(var(--c-pro-fg) / <alpha-value>)',
                'key-bg': 'rgb(var(--c-key-bg) / <alpha-value>)',
                'key-bg-2': 'rgb(var(--c-key-bg-2) / <alpha-value>)',
                'key-line': 'rgb(var(--c-key-line) / <alpha-value>)',
                'key-ink': 'rgb(var(--c-key-ink) / <alpha-value>)',
            },
            fontFamily: {
                // Bundled Latin-only face; the stack still degrades to platform
                // monospace for scripts JetBrains Mono doesn't cover.
                mono: [
                    '"JetBrains Mono"',
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'Consolas',
                    '"Liberation Mono"',
                    'monospace',
                ],
                // System stack per platform/script — see src/styles/fonts.css for
                // why the UI font is intentionally not bundled.
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    '"PingFang SC"',
                    '"Hiragino Sans"',
                    '"Noto Sans SC"',
                    '"Microsoft YaHei"',
                    'system-ui',
                    'sans-serif',
                ],
            },
        },
    },
    plugins: [],
}