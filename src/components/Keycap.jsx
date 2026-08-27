import React from 'react';
import { splitShortcut, keyLabel, detectIsMac } from '@/utils/shortcutFormatter.mjs';
import { GLYPH_ICONS } from './ModifierIcons';

const IS_MAC = detectIsMac();

/**
 * Renders a stored shortcut ("Ctrl+Shift+C") as physical-looking keycaps.
 *
 * Every surface — popup, options, onboarding — renders shortcuts through this
 * one component, so a shortcut can never look like two different things in two
 * places. Labels come from shortcutFormatter, which applies the right
 * per-platform convention (Apple glyphs on macOS, spelled-out words elsewhere).
 *
 * `size`    'sm' for dense lists, 'md' for editors, 'lg' for onboarding.
 * `variant` 'default' | 'active' | 'success' — onboarding animates between them.
 */
export default function Keycap({
    shortcut,
    size = 'sm',
    variant = 'default',
    muted = false,
    className = '',
    emptyLabel = '—',
}) {
    const tokens = splitShortcut(shortcut);

    if (!tokens.length) {
        return (
            <span className="inline-flex items-center rounded-md border border-dashed border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-3">
                {emptyLabel}
            </span>
        );
    }

    const sizes = {
        sm: 'min-w-[20px] px-1.5 py-0.5 text-[11px] rounded-md',
        md: 'min-w-[24px] px-2 py-1 text-xs rounded-md',
        lg: 'min-w-[48px] h-11 px-3 py-2 text-sm rounded-lg border-b-[3px]',
    };

    const variants = {
        default: muted
            ? 'border-line bg-surface-2 text-ink-3'
            : 'border-key-line bg-gradient-to-b from-key-bg to-key-bg-2 text-key-ink',
        active: 'border-accent-hover bg-accent text-accent-fg shadow-lg shadow-accent/20 key-active',
        success: 'border-ok bg-ok text-surface shadow-lg shadow-ok/20',
    };

    const gap = size === 'lg' ? 'gap-2' : 'gap-1';

    // Symbols that aren't one of the four SVG modifiers (arrows, ↵, ⌫) still fall
    // outside the bundled Latin subset, so render those from the UI stack and
    // nudge the size up rather than letting the mono fallback shrink them.
    const glyphClass = 'font-sans text-[1.2em] font-medium';

    return (
        <span className={`inline-flex items-center ${gap} ${className}`}>
            {tokens.map((token, i) => {
                const label = keyLabel(token, IS_MAC);
                const Icon = GLYPH_ICONS[label];
                const isOtherGlyph = !Icon && /[^\x20-\x7E]/.test(label);

                return (
                    <React.Fragment key={i}>
                        {i > 0 && size !== 'lg' && (
                            <span className="text-[10px] text-ink-3/60">+</span>
                        )}
                        <kbd
                            title={token}
                            className={`inline-flex items-center justify-center border font-mono font-semibold leading-none select-none shadow-[0_1px_0_rgb(var(--c-ink)/0.08)] ${sizes[size]} ${variants[variant]} ${isOtherGlyph ? glyphClass : ''}`}
                        >
                            {Icon ? <Icon /> : label}
                        </kbd>
                    </React.Fragment>
                );
            })}
        </span>
    );
}
