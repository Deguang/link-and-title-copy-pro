# Roadmap

## Optional: AI-Oriented Enhancements

以下为可选的 AI 方向功能，按实现难度从低到高排列。

---

### 1. OG / Meta 元数据占位符（无需 AI，高价值）

**背景**：扩展目前只读取 `document.title` 和 `location.href`，但页面中通常包含更丰富的结构化数据。

新增占位符：

| 占位符 | 来源 | 示例值 |
|---|---|---|
| `{og:title}` | `<meta property="og:title">` | 通常比 document.title 更干净 |
| `{og:description}` | `<meta property="og:description">` | 页面摘要 |
| `{meta:author}` | `<meta name="author">` | 作者名 |
| `{meta:date}` | `<meta property="article:published_time">` | 发布日期 |
| `{url:canonical}` | `<link rel="canonical">` | 规范链接 |

**适用场景**：学术引用、Notion/Obsidian 笔记、AI 写作工具的素材准备。

---

### 2. 上下文感知的模板自动推荐（规则驱动）

**背景**：不同网站场景对应不同的最佳复制格式，目前用户需要手动切换。

根据当前页面 URL 域名和 `og:type` 自动推荐模板：

| 页面类型 | 判断依据 | 推荐模板示例 |
|---|---|---|
| GitHub | `github.com` | `[{title}]({url})` Markdown |
| 学术论文 | `arxiv.org` / `og:type=article` | APA 引用格式 |
| 新闻页面 | `og:type=article` + `meta:date` | 带日期的引用 |
| 视频页面 | `og:type=video` | 带时长/作者的格式 |

在 popup 中以"建议"的形式展示，不强制替换用户配置。

---

### 3. Chrome 内置 AI：智能标题清洗

**背景**：`document.title` 常包含网站品牌，如 `"Git 使用指南 - 阮一峰的网络日志"`，复制后需要手动删除后缀。

- 新增 `{title:clean}` 占位符
- 使用 **Chrome 内置 Gemini Nano**（`chrome.aiOriginTrial` / Prompt API）本地推断
- 离线可用，无 API Key，用户数据不离开设备
- 参考：[Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)

**实现思路**：
```js
// content.js
const session = await chrome.aiOriginTrial.languageModel.create();
const clean = await session.prompt(
  `Remove the website name suffix from this page title, return only the article title: "${rawTitle}"`
);
```

---

### 4. Chrome 内置 AI：自然语言生成模板

**背景**：当前模板语法（`{if:selectedText}...{/if}`）对新用户门槛较高。

在 Options 页面增加"用自然语言描述你想要的格式"输入框：

> 输入："带引号的选中文字，后面跟来源链接"
> 输出：`"{selectedText}" —— [{title}]({url})`

同样使用 Chrome 内置 AI，本地生成，无需外部 API。

---

### 5. 选中文本 AI 摘要占位符

**背景**：用户复制长段落时，往往只需要核心句子。

- 新增 `{selectedText:summary}` 占位符
- 选中文本超过一定长度时，自动用 AI 压缩为一句话摘要
- 适合做 Obsidian / Notion 笔记引用

---

### 6. Side Panel 替代 Popup + Options

**背景**：当前 popup 空间有限（350px 宽），且点击外部会关闭；Options 是独立页面，操作割裂。

- 使用 Chrome **Side Panel API**（Chrome 114+）在浏览器右侧打开持久面板
- 合并 popup 预览列表 + options 编辑功能到同一个面板
- 不会意外关闭，空间更大（约 300-500px 宽，全高）
- 点击扩展图标打开 side panel 而非 popup

**改动范围**：
- manifest.json 添加 `side_panel` 配置
- 新建 side panel 页面，整合 popup + options 功能
- 点击扩展图标触发 `chrome.sidePanel.open()`

---

### 优先级参考

| 功能 | 依赖 | 难度 | 用户价值 |
|---|---|---|---|
| OG/Meta 占位符 | 无 | 低 | 高 |
| 上下文模板推荐 | 无 | 中 | 高 |
| 标题清洗 | Chrome 内置 AI | 中 | 中 |
| 自然语言生成模板 | Chrome 内置 AI | 中 | 中 |
| 选中文本摘要 | Chrome 内置 AI | 中 | 中（重度笔记用户）|
| Side Panel 合并 UI | Chrome 114+ | 中 | 高 |
