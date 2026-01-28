# Link & Title Copy Pro

- [Link & Title Copy Pro Website](https://app.lideguang.com/link-and-title-copy-pro/)

Link&TitleCopyPro is a browser extension that allows you to copy both the title and URL link of a browser tab at the same time, with customizable templates and smart features.

Link&TitleCopyPro是一个可以同时复制浏览器标签页的标题和URL链接的浏览器扩展，支持自定义模板和智能功能。

## Features / 功能特性

- [x] Copy title & link / 复制标题和链接
- [x] i18n support (EN & ZH-CN) / 国际化支持（中英文）
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
