# 页面层开发契约

本文件是页面模块（`src/pages/*.ts`）必须遵守的接口约定。
**不要修改本文件描述之外的任何文件。**

---

## 1. 页面模块的统一形状

每个页面文件导出一个 `render` 函数。路由层只认识这个函数。

```ts
import type { RouteContext } from '../core/router';

export interface PageResult {
  /** 页面主体的 HTML（会被插入到 #view-root 内） */
  html: string;
  /** 文档标题（不含站点后缀，由 meta 层自动补） */
  title: string;
  /** 页面描述，用于 <meta name="description"> 与分享卡片 */
  description?: string;
  /** 稳定路径，用于 canonical */
  path?: string;
  /** 渲染完成后执行（绑定交互、初始化目录高亮等）。可选。 */
  mount?: (root: HTMLElement) => void | (() => void);
}

export function render(ctx: RouteContext): PageResult | Promise<PageResult> {
  // ...
}
```

`ctx` 提供：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ctx.path` | `string` | 规范化路径，例如 `/protocols/p01` |
| `ctx.params` | `Record<string,string>` | 路由参数，例如 `{ id: 'p01' }` |
| `ctx.query` | `URLSearchParams` | 查询参数 |
| `ctx.hash` | `string` | 原始 hash（含 `#`） |

**关键约束**

- `render` 可以是 `async`。路由层会 await 它。
- `mount` 在 HTML 插入 DOM 之后调用，`root` 是该页面根元素。返回一个清理函数（可选），页面切换时会被调用。
- 不要自己调用 `window.scrollTo`、不要自己改 `document.title`（路由层与 meta 层负责）。
- 不要 import `main.ts` 里的任何东西（会形成循环依赖）。

---

## 2. 唯一允许的 import 来源

页面只能从以下位置导入：

```ts
// 套件：内容 + 类型 + 组件 + 工具，一个入口全部取到
import { /* ... */ } from '../components/kit';

// 路由类型
import type { RouteContext } from '../core/router';
```

**不要**直接 import `../content/xxx`、`../core/xxx`、`../components/xxx` 的具体模块
（`kit` 已经重新导出它们）。例外：确实需要某个未被 kit 导出的东西时，
先确认它是否存在；不要为了图方便去改 `kit.ts`。

---

## 3. `kit` 导出的完整清单

### 3.1 内容数据

| 导出 | 类型 | 内容 |
| --- | --- | --- |
| `site` | `SiteMeta` | 站点元信息（名称、邮箱、仓库、许可、政策版本） |
| `nav` | `NavItem[]` | 9 条路由的导航定义（label / latin / kicker / description / primary） |
| `protocols` | `Protocol[]` | 3 份协议：`p01` PRT-001、`p02` PRT-002、`p03` PRT-003 |
| `experiments` | `Experiment[]` | 2 项实验：`exp-01` EXP-001、`exp-02` EXP-002 |
| `literature` | `LiteratureEntry[]` | 7 条关键文献 |
| `peerProjects` | `PeerProject[]` | 10 个对照项目 |
| `glossary` | `GlossaryTerm[]` | 12 条术语 |
| `posts` | `BlogPost[]` | 6 篇博客（post-1 … post-6） |
| `releases` | `ReleaseRecord[]` | 发布记录 5 行 |
| `principles` | `ResearchPrinciple[]` | 协议发布标准 5 条 |
| `roadmap` | `RoadmapPhase[]` | 路线图 4 阶段 |
| `risks` | `RiskItem[]` | 风险与应对 6 条 |
| `openWork` | `OpenWorkItem[]` | 开放协作 3 项 |
| `architecture` | `ArchitectureLayer[]` | 平台分层 6 层 |
| `pricing` | `PricingRow[]` | 成本 6 行 |
| `deploySteps` | `DeployStep[]` | 部署步骤 4 步 |
| `legalDocs` | `LegalDoc[]` | 条款 4 篇 |
| `complianceNotice` | `string` | 合规提示条文字 |
| `complianceLink` | `{label,href}` | 合规提示条链接 |
| `homeFaq` | `{question,answer}[]` | 工程向常见问题 7 条 |

### 3.2 类型

`export type * from '../types/content'` —— 所有内容类型都可直接 `import type` 使用。

### 3.3 工具函数

```ts
inline(text: string): string          // 渲染行内标记 **粗** *斜* `码` [文字](链接) → HTML
escapeHtml(s: string): string
formatDate(iso: string, style?: 'full'|'short'|'month'): string   // → 2026-09-30 / 2026 年 9 月 30 日（周三）
relativeTime(iso: string): string     // → 今天 / 3 天前 / 2 个月前
percent(v?: number): string           // 0.17 → "17%"（undefined → "—"）
slugify(s: string): string
highlight(text: string, query: string): string  // 返回带 <mark> 的已转义 HTML
tokenize(q: string): string[]         // 空格切词并转小写
truncate(s: string, max: number): string
stripInline(s: string): string        // 去掉行内标记，得到纯文本
formatBytes(n: number): string
EXPERIMENT_STATUS_LABEL: Record<string,{label,tone}>
PUBLICATION_STATUS_LABEL: Record<string,{label,tone}>
```

### 3.4 内容块渲染（重要）

```ts
renderBlocks(blocks: ContentBlock[]): string     // 一组块的 HTML
renderBlock(block: ContentBlock): string
renderSections(sections: DocSection[]): string   // 章节 → <section class="doc-section"> …
renderToc(sections: DocSection[], opts?: { label?: string }): string  // <nav class="doc-toc">
sectionAnchor(section: DocSection): string
renderDiagram(id: DiagramId, opts?: { id?: string; caption?: string }): string
```

**协议 / 实验详情页的正文必须用 `renderSections(doc.sections)` 渲染，不要手写。**

可用图示 id：`confidence-curves`、`qtr-gates`、`architecture-layers`、`roadmap`、
`migration-map`、`dissonance`、`domain-map`。

### 3.5 组件（全部返回 HTML 字符串）

```ts
sectionHead({label, title, lead?, center?}): string
tag(text, tone?: 'brand'|'gold'|'alert'|'muted'): string
badge(text, variant?: 'draft'|'brand'|'muted'|'alert'): string
statusBadge(status: string, map?): string
publicationBadge(status: string): string
card({href?, accent?, no?, title, body, foot?, meta?, iconName?, titleTag?, className?}): string
callout({variant:'boundary'|'note'|'warning'|'principle'|'quote', title?, text?, items?}): string
quoteBlock(text: string, attribution?: string): string
codeBlock(code: string, opts?: {language?, caption?}): string
table({columns, rows, widths?, caption?, stack?}): string
metrics(items: {value,label,note?}[]): string
progressBar(value: number|undefined, gold?: boolean): string
emptyState({title, text, action?}): string
definitions(items: {term,definition}[]): string
faqList(items: {question,answer,defaultOpen?}[]): string
timeline(items: {phase,period,title,text,items?,status?}[]): string
refItem({href, title, desc?, iconName?}): string
breadcrumb(items: {label,href?}[]): string
pageHero({kicker, title, lead?, breadcrumbItems?, extra?}): string
factGrid(facts: {label,value,href?}[]): string
iconButton({action, label, iconName, pressed?, extra?}): string
readingTime(minutes: number): string
dateLabel(iso: string, prefix?: string): string
icon(name: IconName): string
```

`iconName` 可取：`arrowRight` `arrowLeft` `arrowUp` `external` `search` `menu` `close`
`check` `chevronDown` `chevronRight` `sun` `moon` `contrast` `bookmark` `bookmarkFilled`
`copy` `download` `printer` `home` `book` `flask` `library` `note` `info` `shield` `layers`
`mail` `code` `users` `compass` `target` `scale` `gitBranch` `archive` `refresh` `warning`
`wifiOff` `install` `filter` `list` `clock` `tag` `file` `infinity` `hash` `activity` `eye`

### 3.6 本地状态与行为

```ts
storage.get/set/remove/keys/exportAll/clearAll/usageBytes
preferences: Store<{theme,fontScale,installPromptSeen,subscribeNoticeSeen}>
reading: Store<ReadingState>          // { read, bookmarks, annotations, lastPath, lastTitle, lastAt }
markRead(id: string): void
toggleBookmark({id,kind,title,path}): boolean
isBookmarked(id: string): boolean
recordVisit(path: string, title: string): void
localId(prefix?): string
toast(message: string, opts?: {tone?, duration?, action?}): void
confirmDialog({title,message,confirmLabel?,cancelLabel?,danger?}): Promise<boolean>
promptDialog({title,message?,label?,placeholder?,value?,confirmLabel?,multiline?}): Promise<string|null>
printDocument(): void
```

---

## 4. 设计系统：可用的 CSS 类

设计系统在 `src/styles/design-system.css`，已全局加载。**使用这些类，不要写内联样式或新的 CSS。**

### 布局
`container` `container-narrow` `container-prose` `section` `section--alt` `section--dark`
`section--tight` `section-head` `section-head--center` `sec-label` `sec-title` `sec-lead`
`grid` `grid-2` `grid-3` `grid-4` `grid-auto` `stack` `stack-sm` `stack-lg` `cluster`
`cluster-lg` `split` `text-muted` `mono` `nowrap` `hide-mobile` `only-mobile` `only-desktop`

### 区块
`hero` `hero-inner` `hero-kicker` `hero-lead` `hero-defs` `hero-def` `hero-ctas`
`hero-meta` `hero-art` `page-hero` `page-hero-inner` `p-lead` `breadcrumb`

### 组件
`card` `card--link` `card--flat` `card--accent-brand|gold|alert` `card-meta` `card-foot`
`card-icon` `card-no` `card-index`
`btn` `btn--primary` `btn--ghost` `btn--on-dark` `btn--outline-dark` `btn--sm` `btn--lg`
`btn--block` `btn--icon` `btn-row`
`tag` `tag--brand|gold|alert|muted` `badge` `badge--draft|brand|muted|alert`
`status-dot` `status-dot--running|design|pending|complete|negative|blocked`
`table-wrap` `table-scroll` `table--stack` `table-caption`
`callout` `callout--boundary|note|warning|principle` `callout-title`
`quote-block` `who` `note`
`code-block` `code-caption` `copy-btn`
`figure` `figure-canvas` `figcaption`
`metrics` `metric`
`timeline` `timeline-item` `timeline-marker` `timeline-body` `timeline-phase`
`faq-list` `faq` `faq-a`
`glossary-grid` `gloss-item`
`toolbar` `filter-chips` `chip` `chip-count` `input` `input--search` `input-group` `field`
`result-count` `empty-state` `progress` `progress-bar` `progress--gold`
`doc-page` `doc-head` `doc-id` `doc-head-meta` `doc-body` `doc-section` `doc-facts`
`doc-fact` `doc-layout` `doc-main` `doc-toc` `toc-no`
`ref-list` `ref-item` `ref-item-body` `ref-item-title` `ref-item-desc`
`post-card` `post-meta` `post-title` `post-excerpt` `read-more` `post-index-item`
`post-full` `prose`
`info-list` `info-row` `k` `v`
`step-list` `step-row` `step-no` `step-body`
`layer-list` `layer-row` `layer-no` `layer-name` `layer-desc` `layer-cost`
`exp-card` `exp-head` `exp-facts` `status-legend`
`release-row` `release-doc` `release-meta`
`install-card` `sub-form` `form-status` `form-note`
`compliance` `compliance-inner`
`checklist` `is-todo` `is-done` `sec-no`
`banner` `banner--brand|gold|alert|offline` `banner-icon` `banner-text` `banner-actions`
`overlay` `search-panel` …（搜索面板已有专门模块，页面不要重建）
`sr-only`

颜色只能通过 CSS 变量使用：`var(--brand)` `var(--brand-2)` `var(--brand-soft)`
`var(--gold)` `var(--gold-2)` `var(--gold-soft)` `var(--paper)` `var(--paper-2)`
`var(--paper-3)` `var(--paper-4)` `var(--ink)` `var(--ink-2)` `var(--muted)` `var(--line)`
`var(--line-2)` `var(--alert)` `var(--alert-soft)` `var(--dark)` `var(--on-dark)`
`var(--on-dark-2)` `var(--on-dark-3)` `var(--st-running)` `var(--st-design)` 等。

**深色模式**由 CSS 变量自动处理。**不要硬编码任何十六进制颜色**（唯一例外是 SVG 内联
图形的颜色应写成 `var(--…)`，而不是十六进制）。

---

## 5. 交互约定

- 需要点击行为的元素加 `data-action="xxx"`，并在 `mount` 里用
  `root.querySelectorAll('[data-action="xxx"]')` 绑定。**不要用内联 onclick。**
- 复制按钮已经有全局处理器：写 `<button class="copy-btn" data-copy="要复制的文本">` 即可。
  其它元素上用 `data-copy` 也会被全局处理。
- 移动端底部导航、抽屉、搜索面板、主题切换、Service Worker 提示都由
  `main.ts` / 对应 core 模块负责，页面**不要**重复实现。
- 站内链接直接写 `<a href="/protocols/p01">`，路由层会自动拦截。

---

## 6. 无障碍与内容质量要求

- 每个 `<section>` 如果需要可访问名称，用 `aria-labelledby` 指向其标题 id。
- 装饰性 SVG 加 `aria-hidden="true"`；有语义的图加 `role="img"` 与 `aria-label`。
- 交互控件必须有可读标签（`aria-label` 或可见文本）。
- 标题层级不要跳级（h1 → h2 → h3）。
- 页面只有一个 `<h1>`。
- 表格必须用 `table()` 组件（自动带 `data-label`，移动端堆叠显示）。
- 任何示意图的图注必须声明"示意图，不代表实验数据或测量结果"。

---

## 7. 诚信红线（本纲领的立场，不得违反）

- **不提供服务、不卖产品、不承诺未来结果。** 不写"即将上线""我们的服务"。
- **不虚构数据、统计、用户数、合作方、资金、实验室。**
- **不把示意图说成测量结果。**
- 协议中的"待冻结/待定"事项必须如实标注为草案状态。
- 邮箱与仓库地址是**占位符**（`research@immortality-program.example.org`、
  `github.com/your-handle/immortality-program`），展示时应保留占位性质，
  不要改写成看似真实的地址。
- 每条内容都应有"解释边界"意识：说明它能回答什么、不能回答什么。

---

## 8. 移动端优先要求

- 所有多列布局用 `grid-2` / `grid-3` / `grid-auto` 等已响应式的类，不要自己写 `grid-template-columns`。
- 表格用 `table()` 组件。
- 交互控件最小触控尺寸 44×44（用 `btn` / `btn--icon` / `chip` 已满足）。
- 长 URL、长代码、长表格必须可横向滚动（已有 `table-scroll` / `code-block`）。
- 底部有固定导航栏（约 58px），页面最后一块内容要留出空间 —— 用
  `section` 的默认 padding，不要给最后一个元素加 `margin-bottom: 0` 之类的覆盖。

---

## 9. 完成后必须自检

在项目根目录运行：

```bash
node_modules/.bin/tsc.cmd --noEmit
```

必须 **0 错误**。然后确认：

1. 只创建/修改了你负责的页面文件，没有动别的文件。
2. 每个 `render` 返回的对象字段齐全（`html`、`title` 必须有）。
3. `html` 里没有未转义的动态文本（凡是来自数据的文本都要经过 `escapeHtml` 或 `inline`）。
4. 没有硬编码十六进制颜色。
5. 没有新增 CSS 文件、没有改 `design-system.css`。

汇报：文件路径、每个页面导出的函数名、tsc 输出、以及你为每个页面写的 `<h1>` 标题。
