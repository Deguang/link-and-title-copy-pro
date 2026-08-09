# Design System — Brand v2

The visual language for the popup, options, and onboarding surfaces.

**Source of truth is code, not this document:**
`src/styles/tokens.css` holds the values, `tailwind.config.js` exposes them as
semantic utilities. This file explains the *reasoning* — read it before changing
a colour, so a later edit doesn't quietly undo a constraint.

---

## 1. The palette comes from the mark

Colours were sampled from `src/icons/icon.png` rather than invented:

| Sampled | Hex | Where it appears in the mark |
| --- | --- | --- |
| Navy | `#032A4B` | Outline and text lines — the largest area |
| Coral | `#FC686D` | The title bar |
| Amber | `#FAD176` | The "U" tile |
| Cyan | `#03C7E4` | The "T" |

Neutrals are **navy-tinted**, not stock grey. This is the single biggest reason
the UI reads as one family with the icon instead of "a coloured logo dropped
onto a grey app".

## 2. Role assignment (the part that's easy to get wrong)

Picking the hues was the easy half. What each hue is *allowed to do* matters
more:

| Role | Token | Rule |
| --- | --- | --- |
| Primary action | `accent` (navy) | Buttons, focus rings, selected rows, links |
| Brand spark | `brand` (coral) | **Decoration only** — the popup's top hairline and the mark. Never a button, link, or state |
| Pro / premium | `pro` (amber) | Pro badges only |
| Link / URL | `ok` (cyan) | URLs in previews, success confirmations |
| Error | `danger` (red) | Errors and destructive actions only |
| Warning | `warn` (amber-brown) | Shortcut conflicts, validation warnings |

**Why navy and not coral as the primary?** Two reasons, both functional:

1. Red/coral means *error* in nearly every convention. If "Add Template" and
   "Save" are coral, routine controls read as alarms, and a real error message
   has nothing left to distinguish it.
2. Raw coral is **2.86:1 on white** — it cannot legally carry text or act as a
   button fill with white text. Darkening it to pass (`#D63A44`) turns it into a
   different colour anyway, which defeats the "it's the brand colour" argument.

Coral survives where it works best: a 2px hairline at the top of the popup, and
the mark itself. Small area, high recognition, zero semantic load.

## 3. Contrast

Every pairing in `tokens.css` is checked against WCAG AA (4.5:1 for body text).
Verified values:

| Pair | Light | Dark |
| --- | --- | --- |
| `ink` on `canvas` | 13.62 | 13.52 |
| `ink-2` on `surface` | 5.82 | 6.40 |
| `ink-3` on `surface` | 4.73 | 4.71 |
| `accent-fg` on `accent` | 11.41 | 6.44 |
| `ok` on `surface` | 4.85 | 6.50 |
| `danger` on `surface` | 5.44 | — |
| `pro-fg` on `pro` | 10.06 | — |

> **Dark-mode trap:** the accent lifts to `#4A9FD8` so it reads on a dark
> surface, which *flips the foreground*. White on it is only **2.90:1**;
> `accent-fg` becomes dark navy (6.44:1). Always use `text-accent-fg` on an
> accent fill — never hard-code `text-white`.

`ink-3` is deliberately darker than a typical "muted" grey so tertiary meta text
(eyebrow labels, hints) still passes AA.

## 4. Theming

Tokens are RGB triplets so Tailwind alpha modifiers work (`ring-accent/20`).

- Dark mode follows the OS via `prefers-color-scheme`.
- It can be forced with `data-theme="light"|"dark"` on `<html>`.
- Components must name **roles** (`bg-surface`, `text-ink-2`), never raw hues
  (`bg-slate-50`). Anything hard-coded silently breaks dark mode.

## 5. Typography

| Use | Stack |
| --- | --- |
| UI / body | System stack, script-aware (`-apple-system`, `PingFang SC`, `Noto Sans SC`, …) |
| Mono | **JetBrains Mono** (bundled, Latin 400/600) → platform mono fallback |

**No custom UI font is bundled, and this is deliberate.** The extension ships 9
locales including `zh_CN`, `zh_TW`, `ja`, `ko`, `hi`, `ru`. No bundleable font
covers those — CJK faces are multi-MB. A custom body font would render English
in that face and Chinese in a system fallback, sometimes *within one string*
(`Ctrl+Shift+C 智能复制`), which is worse than using the system stack everywhere.

Monospace has no such problem: templates, placeholders, URLs, and keycaps are
effectively ASCII. That's where a bundled face buys consistency, so it's the one
place we spend the bytes (~42 KB, Latin subset only).

JetBrains Mono was chosen for brace and pipe legibility — template syntax is
full of `{`, `}`, and `|`. Licensed SIL OFL 1.1; the licence ships in
`src/assets/fonts/`.

## 6. Shortcut display

All three surfaces render shortcuts through `src/components/Keycap.jsx`, which
takes labels from `src/utils/shortcutFormatter.mjs`. **Never format a shortcut
inline** — that is how the three pages drifted apart in the first place.

Platform conventions are not cosmetic:

- **macOS** — Apple glyphs (`⌘ ⌥ ⇧ ⌃`). Mac users read these fluently.
- **Windows / Linux** — modifiers are **spelled out** (`Ctrl`, `Shift`, `Alt`,
  `Win`). There is no symbol tradition on these platforms; `⌘` is meaningless
  and the `⊞` glyph renders inconsistently across fonts. Neither is ever emitted
  off macOS.
- A shortcut captured on a Mac and viewed on Windows shows `Cmd`, not `⌘`.

These rules are locked by tests in `src/utils/shortcutFormatter.test.mjs`.

### Modifier glyphs are SVG, not text

`⌘ ⇧ ⌥ ⌃` are **not** rendered as characters. They sit outside the bundled
JetBrains Mono Latin subset (`⇧` is U+21E7; the subset stops at U+00FF plus a
few punctuation ranges), so as text they fall back to the platform's monospace
face — arriving smaller and lighter than the letters beside them, with no way to
match their weight to the surrounding type.

`src/components/ModifierIcons.jsx` supplies them as SVG that scales with the
keycap (`width: 1em`) and inherits its colour via `currentColor`, so a row of
keycaps stays optically even at 11px. Paths are from
[Bootstrap Icons](https://github.com/twbs/icons) (MIT, licence vendored beside
the component) — `command`, `shift`, `option`, and `chevron-up` for Control.
Each carries an `aria-label`, and the `<kbd>` keeps a `title` with the raw token.

Other non-ASCII labels (arrows, `↵`, `⌫`) hit the same subset gap but are far
rarer; they render from the UI stack one step larger instead of getting their
own icons.

Full mapping — stored token → what the user sees:

| Stored | macOS | Windows / Linux | Icon (macOS) |
| --- | --- | --- | --- |
| `Command` | ⌘ | `Cmd` | `command` |
| `Ctrl` / `Control` | ⌃ | `Ctrl` | `chevron-up` |
| `Shift` | ⇧ | `Shift` | `shift` |
| `Alt` / `Option` | ⌥ | `Alt` | `option` |
| `Win` / `Meta` | ⌘ / `Win` | `Win` | — |
| `ArrowUp/Down/Left/Right` | ↑ ↓ ← → | same | — (UI stack) |
| `Escape` | `Esc` | `Esc` | — |
| `' '` | `Space` | `Space` | — |

Stroke weight on the icons is deliberate: Bootstrap Icons are drawn for body
text, so beside the keycaps' semibold mono letters they read too light. A
same-colour stroke of **1.0** (in the 16-unit viewBox) matches the letters
without closing the ⌘ counters — 1.3 does close them. Because the width is in
viewBox units it holds across the sm/md/lg sizes.
`designs/copy-url-pro-redesign/stroke-test.html` renders the weight ladder if
this ever needs re-tuning.

### Do users need a legend?

No, and adding one would be clutter. The mapping is already discoverable four
ways, each in context:

1. Every `<kbd>` carries `title` with the stored token — hover a `⌘` and it says
   "Command".
2. Each icon has an `aria-label`, so screen readers announce the key name rather
   than skipping a decorative glyph.
3. In the options editor the shortcut **input** shows the raw text
   (`Command+Shift+C`) directly beneath the keycaps showing `⌘⇧C` — an implicit
   legend, in place, at the moment of editing.
4. Onboarding asks the user to physically *press* the shortcut, which teaches the
   mapping better than any caption.

Symbols also only ever appear on macOS, where the glyphs are standard across the
OS. A persistent legend would explain something Mac users already read fluently,
to the ~100% of users who don't need it.

## 7. Layout patterns

- **Options** — master/detail. Template list left, editor right. Edits
  auto-save; there is no Save button, because switching rows with unsaved state
  is how work gets lost. A `✓ Saved` badge confirms the write.
- **Validation is advisory, never blocking.** Auto-save means refusing to write
  would discard typing. Invalid configs are saved *and* flagged — inline per
  field, plus an `Incomplete` chip in the list.
- **Popup** — 350px. Segmented control switches Current Tab / All Tabs.
- **Help** — a right-hand slide-over drawer, reachable from a persistent top-bar
  button. It was previously a collapsed block at the bottom of the editor, where
  nobody found it.

## 8. Reference

The interactive study — six colour directions, light/dark toggle, live keycaps —
lives at `designs/copy-url-pro-redesign/Direction Study.html`. Serve `designs/`
over HTTP and open it; the `Tweaks` button (bottom-right) switches direction and
theme. Directions other than Brand v2 are kept as rejected alternatives.
