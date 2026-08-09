import React from 'react';

/**
 * Modifier-key glyphs as SVG.
 *
 * These four symbols (⌘ ⇧ ⌥ ⌃) sit outside the bundled JetBrains Mono Latin
 * subset, so as text they fall back to whatever monospace face the platform
 * supplies — rendering smaller and lighter than the letters beside them, with
 * no way to match their weight to the surrounding type. As SVG they scale with
 * the keycap and inherit its colour via `currentColor`, so a row of keycaps
 * stays optically even at 11px.
 *
 * Paths are from Bootstrap Icons (MIT) — `command`, `shift`, `option`, and
 * `chevron-up` for Control. Licence: ./BootstrapIcons-LICENSE.txt
 * https://github.com/twbs/icons
 */

// Bootstrap Icons are drawn to sit beside regular body text, so against the
// keycaps' semibold mono letters they read noticeably lighter. A same-colour
// stroke on the fill thickens them uniformly; 1.0 (in a 16-unit viewBox) matches
// the letters' weight while leaving the ⌘ counters open — 1.3 starts closing
// them. Because the width is in viewBox units it stays proportional across the
// sm/md/lg keycap sizes.
const STROKE = 1;

const Svg = ({ children, label }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
        width="1em"
        height="1em"
        role="img"
        aria-label={label}
        focusable="false"
    >
        {children}
    </svg>
);

export const CommandIcon = () => (
    <Svg label="Command">
        <path d="M3.5 2A1.5 1.5 0 0 1 5 3.5V5H3.5a1.5 1.5 0 1 1 0-3M6 5V3.5A2.5 2.5 0 1 0 3.5 6H5v4H3.5A2.5 2.5 0 1 0 6 12.5V11h4v1.5a2.5 2.5 0 1 0 2.5-2.5H11V6h1.5A2.5 2.5 0 1 0 10 3.5V5zm4 1v4H6V6zm1-1V3.5A1.5 1.5 0 1 1 12.5 5zm0 6h1.5a1.5 1.5 0 1 1-1.5 1.5zm-6 0v1.5A1.5 1.5 0 1 1 3.5 11z" />
    </Svg>
);

export const ShiftIcon = () => (
    <Svg label="Shift">
        <path d="M7.27 2.047a1 1 0 0 1 1.46 0l6.345 6.77c.6.638.146 1.683-.73 1.683H11.5v3a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-3H1.654C.78 10.5.326 9.455.924 8.816zM14.346 9.5 8 2.731 1.654 9.5H4.5a1 1 0 0 1 1 1v3h5v-3a1 1 0 0 1 1-1z" />
    </Svg>
);

export const OptionIcon = () => (
    <Svg label="Option">
        <path d="M1 2.5a.5.5 0 0 1 .5-.5h3.797a.5.5 0 0 1 .439.26L11 13h3.5a.5.5 0 0 1 0 1h-3.797a.5.5 0 0 1-.439-.26L5 3H1.5a.5.5 0 0 1-.5-.5m10 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5" />
    </Svg>
);

export const ControlIcon = () => (
    <Svg label="Control">
        <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z" />
    </Svg>
);

/**
 * Glyph produced by shortcutFormatter → the icon that replaces it.
 * Anything absent from this map renders as text.
 */
export const GLYPH_ICONS = {
    '⌘': CommandIcon,
    '⇧': ShiftIcon,
    '⌥': OptionIcon,
    '⌃': ControlIcon,
};
