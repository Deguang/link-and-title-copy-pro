# Link & Title Copy Pro

- [Link & Title Copy Pro Website](https://app.lideguang.com/link-and-title-copy-pro/)

Link&TitleCopyPro is a browser extension that allows you to copy both the title and URL link of a browser tab at the same time, with customizable templates and smart features.

Link&TitleCopyPro是一个可以同时复制浏览器标签页的标题和URL链接的浏览器扩展，支持自定义模板和智能功能。

<p align="center">
  <img src="docs/images/feature-toast.png" alt="Toast Notification" width="30%">
  <img src="docs/images/feature-paste.png" alt="Paste Result" width="30%">
  <img src="docs/images/feature-config.png" alt="Shortcut Configuration" width="30%">
</p>

## Features / 功能特性

- [x] Copy title & link / 复制标题和链接
- [x] i18n support (EN, 简中, 繁中, 日本語, Русский, हिंदी) / 国际化支持（6 种语言）
- [x] Copy selected text & link / 复制选中文本和链接
- [x] Custom copy templates / 自定义复制模板
- [x] Custom shortcuts / 自定义快捷键
- [x] Context menu integration / 右键菜单集成
- [x] URL component placeholders / URL 组件占位符
- [x] Conditional templates / 条件模板
- [x] Template autocomplete / 模板自动完成

## Template Placeholders / 模板占位符

### Basic / 基础

- `{title}` - Page title / 页面标题
- `{url}` - Page URL / 页面链接
- `{selectedText}` - Selected text / 选中文本

### Smart / 智能

- `{selectedText|title}` - Selected text if any, otherwise title / 优先选中文本，否则标题
- `{title|selectedText}` - Same as above / 同上
- `{selectedTextWithQuote}` - Selected text wrapped in quotes, or title in quotes if no selection / 带引号的选中文本 (如 `"text"`)
- `{selectedTextWithBrackets}` - Selected text wrapped in brackets / 带方括号的选中文本 (如 `[text]`)
- `{selectedTextWithContext}` - Selected text + Title / 选中文本 + 标题 (如 `Selected Text - Page Title`)

### URL Components / URL 组件

- `{url:clean}` - URL without query params and hash
- `{url:protocol}` - Protocol (e.g., https)
- `{url:domain}` - Domain/hostname
- `{url:path}` - Path only
- `{url:query}` - Query parameters
- `{url:hash}` - Hash fragment
- `{url:origin}` - Protocol + domain

### Conditional / 条件模板

- `{if:selectedText}...{/if:selectedText}` - Show content only when text is selected
- `{selectedText?}...{/selectedText?}` - Shorthand for above / 简写
- `{if:noSelectedText}...{/if:noSelectedText}` - Show content only when no text is selected
- `{noSelectedText?}...{/noSelectedText?}` - Shorthand for above / 简写

## Version History / 版本历史

### v1.7.2

- Onboarding moved onto the design system; it stays dark by intent, using the same navy palette / 引导页并入设计系统，保持深色但改用同一套藏青色板
- Content scripts survive an extension update without throwing in already-open tabs / 扩展更新后，已打开标签页的脚本不再报错
- Removed a dead script reference and the module preloads Chrome rejects on extension pages / 移除失效脚本引用与扩展页无效的预载标签

### v1.7.0

- Redesigned popup and settings around a design system derived from the product mark / 基于产品图标反推的设计系统，重做弹窗与设置页
- Light and dark themes across both surfaces, following the OS / 两个界面均支持浅色/深色，跟随系统
- Settings rebuilt as master–detail with auto-save; the Save/Cancel buttons are gone / 设置页改为主从分栏 + 即时保存，去掉保存/取消按钮
- Non-blocking validation flags unreachable shortcuts, duplicates, and unknown placeholders / 非阻断式校验：无效快捷键、重复绑定、未知占位符
- One shortcut renderer for every surface; modifier keys draw as SVG / 三个界面统一快捷键渲染，修饰键改用 SVG
- Windows no longer shows macOS-only glyphs for Command and the Win key / Windows 不再显示 macOS 专属符号
- Bundled JetBrains Mono for templates and keycaps (Latin subset, ~42KB) / 内置 JetBrains Mono 用于模板与键帽
- Fixed dropped keystrokes when typing quickly in settings / 修复设置页快速输入时丢字符

> Storage format is unchanged — existing templates and shortcuts carry over untouched.
> 存储结构未变，已有模板与快捷键原样沿用。

### v1.2.1

- Interactive onboarding page on first install / 首次安装时展示交互式引导页
- OS detection with real-time shortcut validation / 自动检测系统并实时验证快捷键
- Template preview with per-shortcut copy feedback / 模板预览，按下快捷键直接复制内容
- Full i18n for onboarding (en, zh_CN, zh_TW, ja, ru, hi) / 引导页完整多语言支持
- Remove unused scripting permission / 移除未使用的 scripting 权限

### v1.1.0

- Multi-language support: Japanese, Russian, Hindi, Traditional Chinese / 多语言支持：日语、俄语、印地语、繁体中文
- Landing page i18n with build-time generation / 落地页国际化构建系统
- Google Analytics event tracking for copy actions / 复制操作 GA 事件追踪

### v1.0.0

- Enhanced toast notification with content preview / 增强的 Toast 通知，支持内容预览
- Improved i18n support / 改进国际化支持
- Launch landing page / 上线官网页面

### v0.5.0

- Added URL component placeholders
- Improved configuration page layout
- Complete internationalization
- Template autocomplete feature
- Delete confirmation dialog
- Context menu error fixes

### v0.4.0

- Initial public release
- Custom templates support
- Multiple shortcut configurations

## Design / 设计

Visual language, colour tokens, and the reasoning behind them:
**[docs/design-system.md](docs/design-system.md)**

Values live in `src/styles/tokens.css` and are exposed as semantic Tailwind
utilities (`bg-surface`, `text-ink-2`, `bg-accent`). Components name roles, never
raw hues, so light/dark is a single attribute flip.

## License / 许可证

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). You may
read, use, modify, and share the source for **noncommercial purposes**. Commercial
use — including redistributing or reselling the extension or a derivative, or
removing the Pro license gate — is **not permitted** without a separate commercial
license from the author.

源码公开，采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。允许出于**非商业目的**
查看、使用、修改和分享源码；**商业用途**（包括转售/重新上架本扩展或其衍生版本、移除 Pro
付费校验）须另行获得作者的商业授权。

Pro features are unlocked with a paid license key — see
[Link & Title Copy Pro](https://app.lideguang.com/link-and-title-copy-pro/).
