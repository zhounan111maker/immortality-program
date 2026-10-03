# 永生计划 · 研究纲领平台

> 一个以「迁移永生协议」为核心的可检验研究纲领发布平台：
> 协议、实验与文献全部公开、可复现、可证伪。
> **不提供服务，不贩卖愿景，只发布可以被独立验证的内容。**

这是一个 **Vite + TypeScript** 工程化的静态站点，同时是一个**可安装的渐进式网络应用（PWA）**。
无后端、无数据库、无账号系统 —— 这不是能力限制，是纲领的立场。

---

## 目录

- [这个仓库是什么](#这个仓库是什么)
- [快速开始](#快速开始)
- [部署上线](#部署上线)
- [项目结构](#项目结构)
- [内容如何维护](#内容如何维护)
- [两个交付产物](#两个交付产物)
- [本地数据与隐私](#本地数据与隐私)
- [功能清单](#功能清单)
- [设计系统](#设计系统)
- [技术决策与理由](#技术决策与理由)
- [常见问题](#常见问题)
- [许可](#许可)

---

## 这个仓库是什么

本站发布三份核心协议与两项在册实验：

| 编号 | 名称 | 版本 | 状态 |
| --- | --- | --- | --- |
| PRT-001 | HES 实验规格 | v0.9.0 | 草案 |
| PRT-002 | TES 身份置信曲线协议 | v0.8.0 | 草案 |
| PRT-003 | 迁移永生协议框架（QTR） | v0.7.0 | 草案 |

三份协议**均处于草案阶段**：结构已定，正式假设与判定标准待冻结。
在 v1.0 冻结之前，本仓库不产生任何验收结论。

它**不是**：

- 冷冻保存服务（Alcor、Cryonics Institute 那类付费保存机构）
- 超人类主义倡导组织（Humanity+、IEET 那类理念推广组织）
- 医疗、投资或法律建议的来源

---

## 快速开始

### 环境要求

- **Node.js ≥ 20.19**（或 ≥ 22.12）
  > Vite 8 要求 Node 20.19+ / 22.12+。低于这个版本会在构建时报
  > `Vite requires Node.js version 20.19+ or 22.12+`。
  > 用 `node --version` 确认。推荐 Node 22 LTS。
- **pnpm ≥ 9**（仓库内包含 `pnpm-lock.yaml`，请使用 pnpm 以保持依赖一致）

没有 pnpm 时：

```bash
npm install -g pnpm
```

### 安装与运行

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器（默认 http://localhost:5173）
pnpm dev

# 3. 类型检查（必须 0 错误）
pnpm typecheck

# 4. 生产构建（先类型检查，再打包到 dist/）
pnpm build

# 5. 本地预览生产构建（默认 http://localhost:4173）
pnpm preview
```

### 全部可用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器，带热更新 |
| `pnpm build` | 类型检查 + 生产构建 → `dist/` |
| `pnpm build:only` | 只构建，跳过类型检查（调试用） |
| `pnpm typecheck` | 只做 TypeScript 类型检查 |
| `pnpm verify` | 校验原站内容是否逐字迁移、有无丢失 |
| `pnpm verify:archive` | 校验单文件归档是否真的自包含、无外部依赖 |
| `pnpm verify:runtime` | 在 Node 里实跑检索引擎与渲染器（91 项断言） |
| `pnpm verify:deploy` | 上线前配置体检（Vercel 配置 / 产物 / 文档一致性） |
| `pnpm verify:live` | 对着预览服务器发真实 HTTP 请求（需先起 `pnpm preview`） |
| `pnpm verify:all` | 依次跑前四项（不需要服务器的那些） |
| `pnpm preview` | 预览 `dist/` 的产物（模拟线上环境） |
| `pnpm icons` | 重新生成 PWA 图标到 `public/icons/` |
| `pnpm archive` | 生成单文件归档版 → `dist-archive/` |

### 验证套件说明

这个项目带了一套可执行的验证脚本，不是文档里的口头承诺。
理由很直接：**纲领的立场是可检验性，那么它自己的代码也应该可检验。**

```bash
# 不需要服务器的四项
pnpm verify:all

# 需要在另一个终端先起预览服务器
pnpm preview -- --port 4180
pnpm verify:live http://127.0.0.1:4180
```

| 脚本 | 它到底在断言什么 |
| --- | --- |
| `verify-migration.mjs` | 原站 16 段博客正文、3 条摘要、9 条解释边界是否逐字保留 |
| `verify-archive.mjs` | 归档文件是否真的零外部依赖（外链 CSS/JS/图片/@import） |
| `verify-runtime.mjs` | 打包真实模块到 Node 里执行：检索排序、内容块渲染、路由一致性、**转义安全**、诚信红线 |
| `verify-deploy.mjs` | `vercel.json` 的 SPA 回退与响应头、产物完整性、指南与 `package.json` 是否自相矛盾 |
| `verify-live.mjs` | 深层链接是否 200、`sw.js` 与 manifest 的 MIME 是否正确、页面分块是否含对应文案 |

`verify-runtime.mjs` 里有一组**注入安全**断言值得特别说明：
它会把 `<img src=x onerror=alert(1)>` 和 `javascript:` 伪协议喂给渲染器，
断言产出的 HTML 里不会出现真实的可执行标签。内容虽由仓库自己维护，
但渲染路径不做例外处理 —— 这是防御性编程，不是不信任内容作者。

> **注意**：构建产物 `dist/index.html` **不能**通过双击打开。
> 它使用 ES 模块与绝对路径，需要通过 HTTP 服务访问。
> 本地预览请用 `pnpm preview`。
> 如果你要的正是「双击即开」，请用 `pnpm archive` 生成单文件版本。

---

## 部署上线

**完整的零基础部署指南见 [`docs/零基础部署指南.md`](docs/零基础部署指南.md)。**

那份指南假设你从未用过 Git、GitHub 或 Vercel，从注册账号讲到验证上线，
每一步都写明要点哪里、要输入什么，并附常见报错对照表。

简要流程：

1. 把本目录推送到一个 **空的** GitHub 仓库（`main` 分支）
2. 在 [vercel.com](https://vercel.com) 点 **New Project**，导入该仓库
3. Vercel 会自动识别 Vite 项目；**Install Command 必须留空**
4. 点 **Deploy**，约 1–3 分钟后获得 `https://<项目名>.vercel.app`

仓库内已包含 [`vercel.json`](vercel.json)，它负责两件关键的事：

- **SPA 路由回退**：让 `/protocols/p01` 这样的深层链接不会 404
- **响应头**：静态资源长期缓存、`sw.js` 与 `manifest.webmanifest` 不缓存且 MIME 正确

### 千万不要提交 npm 镜像源

仓库里**有**一个 `.npmrc`，但它**只含**一行 `node-linker=hoisted`。
这是构建配置，本地与 Vercel 都用同一套扁平依赖布局，构建结果因此可复现。
**它已经随仓库提交，不要删除。**

但是 —— **不要**把 npm 镜像源写进它，例如：

```ini
# ❌ 不要这样做
registry=https://registry.npmmirror.com
```

原因：Vercel 的构建机器在境外，镜像会导致构建变慢甚至直接失败
（`ERR_PNPM_TARBALL_INTEGRITY` —— pnpm 把校验和不匹配视为硬错误）。

镜像属于「你这台机器」的设置，请写在**用户级**配置里：

```
C:\Users\<你的用户名>\.npmrc
```

它自动对所有项目生效，而且不会跟着代码进仓库。

详见部署指南的 `.npmrc` 专章。

---

## 项目结构

```
immortality-program/
├── index.html                  应用外壳（唯一的 HTML 入口）
├── vite.config.ts              构建配置 + PWA（manifest / Workbox）
├── vercel.json                 Vercel 部署配置（SPA 回退 + 响应头）
├── tsconfig.json               TypeScript 严格模式配置
├── package.json                依赖与脚本
├── scripts/
│   ├── make-icons.mjs          无依赖生成 PWA 图标（PNG 编码器）
│   └── make-archive.mjs        单文件归档构建
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   ├── offline.html            离线兜底页（独立自包含）
│   └── icons/                  PWA 图标 192 / 512 / maskable
├── docs/
│   ├── 零基础部署指南.md        ⭐ 从零到上线的完整教程
│   └── PAGE-CONTRACT.md        页面层开发契约
└── src/
    ├── main.ts                 入口：启动顺序、路由表、错误边界
    ├── types/
    │   └── content.ts          ⭐ 全部内容的强类型契约
    ├── content/                ⭐ 内容层（纯数据，无 HTML）
    │   ├── site.ts             站点元信息、导航、路线图、架构、成本
    │   ├── protocols.ts        三份协议（16 个章节）
    │   ├── experiments.ts      两项实验
    │   ├── posts.ts            六篇博客
    │   ├── literature.ts       七条文献 + 十个对照项目
    │   ├── glossary.ts         十二条术语
    │   ├── legal.ts            条款、隐私、合规提示
    │   └── faq.ts              工程向常见问题
    ├── core/                   基础设施
    │   ├── router.ts           History API 路由（:param 与 * 通配）
    │   ├── store.ts            localStorage 封装 + 响应式 store
    │   ├── search.ts           客户端全文检索（打分 + 分组）
    │   ├── format.ts           日期、百分比、行内标记、转义
    │   ├── meta.ts             title / meta / canonical / 结构化数据
    │   ├── pwa.ts              Service Worker 注册、离线、安装引导
    │   ├── fonts.ts            非阻塞网络字体加载
    │   ├── toast.ts            轻量提示
    │   ├── dialog.ts           确认 / 输入对话框
    │   └── print.ts            打印与 Markdown 导出
    ├── components/             视图层
    │   ├── kit.ts              ⭐ 页面唯一允许的导入入口
    │   ├── ui.ts               卡片、标签、表格、时间轴等组件
    │   ├── blocks.ts           内容块渲染器（数据 → HTML）
    │   ├── diagrams.ts         七张内联 SVG 示意图
    │   ├── icons.ts            内联 SVG 图标集
    │   └── shell.ts            页头、页脚、抽屉、搜索面板、底部导航
    └── pages/                  页面模块（每个导出一个 render 函数）
        ├── home.ts             /
        ├── protocols.ts        /protocols
        ├── protocolDetail.ts   /protocols/:id
        ├── experiments.ts      /experiments
        ├── literature.ts       /literature
        ├── blogDetail.ts       /blog 与 /blog/:id
        ├── about.ts            /about
        ├── contact.ts          /contact
        ├── deploy.ts           /deploy
        ├── legal.ts            /legal
        └── notFound.ts         404 兜底
```

---

## 内容如何维护

**内容与渲染是分离的。** 修改文案不需要碰任何 HTML 或 CSS。

所有内容都是 `src/content/` 下的强类型数据。例如给博客加一篇文章，
只需要往 `src/content/posts.ts` 的数组里加一个对象：

```ts
{
  id: 'post-7',
  title: '文章标题',
  excerpt: '卡片上显示的摘要。',
  category: '方法',
  publishedAt: '2026-11-01',
  readingMinutes: 4,
  blocks: [
    { kind: 'paragraph', text: '正文段落。支持 **粗体**、`代码`、[链接](/about)。' },
    { kind: 'list', items: ['要点一', '要点二'] },
  ],
}
```

可用的内容块类型（定义在 `src/types/content.ts`）：
`paragraph` `heading` `list` `code` `table` `callout` `definitions`
`figure` `metrics` `quote` `faq` `timeline`

**为什么这样做？**

1. **类型即校验。** 漏字段、写错类型，`pnpm typecheck` 会直接报错，
   不会等到线上才发现某段文字是空的。
2. **结构可归档。** 内容是可序列化的纯数据，可以直接导出为永久档案。
3. **改版不留死角。** 渲染规则集中在 `blocks.ts`，
   调整样式或结构时不会漏掉某一份文档。

> 注意：不要在内容里写 HTML 字符串。
> 需要强调就用行内标记：`**粗体**` `*斜体*` `` `代码` `` `[文字](链接)`。

---

## 两个交付产物

同一个内容源，构建出两种形态，各自解决不同问题：

### 1. 工程化构建 → `dist/`

```bash
pnpm build
```

多文件、带内容哈希、可长期缓存、适合部署到 Vercel。
**这是主站。**

### 2. 单文件归档 → `dist-archive/immortality-program-archive.html`

```bash
pnpm archive
```

CSS 与 JavaScript 全部内联，产出**一个** HTML 文件：

- 双击即开，不需要服务器、不需要联网
- 可以作为一个文件上传到 Arweave / IPFS 等永久存储
- 十年后即使所有托管服务都不在了，文件本身依然可读

两个产物来自同一份内容源，因此不存在内容分歧。

---

## 本地数据与隐私

本站**没有后端**。以下数据只存在于你这台设备的浏览器 `localStorage` 里，
**从不上传**：

- 阅读进度、书签
- 你写的批注
- 界面偏好（主题、字号）
- 上次阅读的文档

你可以随时在 **关于** 或 **条款与隐私** 页面导出全部本地数据为 JSON，
或一键清除。清除浏览器数据也会删除它们。

站内不加载任何第三方统计、广告或追踪脚本。

---

## 功能清单

**内容与阅读**

- 三份协议完整文档：章节化、带锚点、侧栏目录、滚动高亮、阅读进度条
- 每份协议的解释边界声明（能回答什么 / 不能回答什么 / 过度推论红线）
- 变更日志表、预注册清单、待冻结事项、就绪度可视化
- 两份实验台账，含状态图例与复现入口
- 十二条术语（跨链到相关协议）、七条文献索引、十个对照项目
- 六篇博客，含三篇纲领立场文章

**检索**

- 客户端全文检索，覆盖协议、实验、博客、术语、文献、页面
- 评分排序（标题 > 编号 > 摘要 > 正文）+ 类型分组 + 关键词高亮
- 快捷键：`/` 或 `Ctrl/Cmd + K` 打开，`↑` `↓` 选择，`Enter` 打开
- 各列表页支持筛选，筛选状态同步到 URL（可分享、可收藏）

**PWA（可安装应用）**

- 可安装到桌面 / 主屏 / 开始菜单
- Service Worker 缓存，**离线可读已访问的内容**
- 新版本「就绪」时提示刷新，而不是静默替换内容 ——
  对一个研究纲领而言，「我读的是哪一版」必须是明确的
- 离线时页头显示状态横幅

**可用性**

- 移动端底部导航 + 抽屉菜单
- 深色模式（跟随系统，可手动覆盖）
- 正文字号三档可调
- 表格在窄屏自动堆叠为卡片
- 打印样式：隐藏导航、暴露外链地址、避免分页截断
- 键盘可达、跳过导航链接、`aria` 标注、尊重 `prefers-reduced-motion`
- 中文字体加载失败时静默降级到系统字体栈

---

## 设计系统

视觉语言：**档案纸 / 深档案绿 / 档案金**。

- 全部设计令牌集中在 [`src/styles/design-system.css`](src/styles/design-system.css) 的 `:root`
- 样式**只用 CSS 变量**取色，因此深色模式与打印样式自动生效
- 层级用 1px 发丝线表达，而不是投影
- 移动优先：断点从 620px / 900px / 1100px 向上叠加
- 无 CSS 框架、无 UI 库、无图标字体（图标是内联 SVG）

页面层如何使用这些类是强制的，见 [`docs/PAGE-CONTRACT.md`](docs/PAGE-CONTRACT.md)。

---

## 技术决策与理由

| 决策 | 理由 |
| --- | --- |
| **不用前端框架** | 站点是内容型、交互轻，框架的运行时代价与升级风险不值得。用模板字符串 + 事件委托足够。 |
| **History API 而非 hash 路由** | `/protocols/p01` 比 `/#/protocols/p01` 更适合被引用、被收录、被永久存档。代价是需要服务端回退规则（已在 `vercel.json` 中配置）。 |
| **内容与渲染分离** | 纲领的价值在于内容能被独立检验与引用。内容是可序列化数据，才谈得上长期归档与格式迁移。 |
| **零后端** | 没有后端就没有可被关停的服务器、没有被泄露的用户库、没有需要维护的数据库。所有用户侧数据留在用户设备上。 |
| **客户端检索** | 内容体量只有数十篇，浏览器内建索引足够快，且不引入外部依赖。 |
| **Service Worker 提示式更新** | 静默替换会让读者不知道自己在读哪一版。版本对研究纲领是实质信息。 |
| **字体非阻塞加载** | 存档十年后 Google Fonts 未必还在，但内容必须依然可读。字体是增强，不是前提。 |
| **单文件归档产物** | 把「内容不会因为托管方消失而消失」从口号变成可执行动作。 |

---

## 常见问题

**构建产物为什么不能双击打开？**
`dist/index.html` 使用 ES 模块与绝对路径，受浏览器同源策略限制，必须经 HTTP 访问。
用 `pnpm preview`。若要「双击即开」的自包含文件，用 `pnpm archive`。

**为什么把 `node_modules/` 和 `dist/` 排除在 Git 之外？**
它们是构建产物，可由 `pnpm install` 和 `pnpm build` 完全重建。
把构建产物提交进仓库会让历史膨胀、让 diff 失去意义。

**为什么必须提交 `pnpm-lock.yaml`？**
锁文件固定了每个依赖的确切版本。没有它，Vercel 每次构建可能装上不同版本，
构建结果就不可复现 —— 这对一个以可复现为立场的项目是自相矛盾的。

**可以换成 npm 或 yarn 吗？**
可以，但需要删除 `pnpm-lock.yaml` 并用对应包管理器重新生成锁文件，
同时把 `vercel.json` 里的 `buildCommand` 从 `pnpm run build` 改成 `npm run build`。
建议保持 pnpm，以免两套锁文件并存造成混乱。

**本站会一直存在吗？**
主站依赖托管服务，而托管服务没有永久保证。
这正是保留单文件归档产物的原因：核心文档可以独立于任何服务存在。
计划中的永久层（Arweave）上传**尚未执行** —— 这一点在「架构与部署」页已如实标注。

**发现内容错误怎么办？**
见「联系」页的「复现不一致怎么办」小节。复现不一致的报告被优先处理。

---

## 许可

内容采用 **CC BY 4.0**。引用本站协议时请**注明版本号** ——
协议是版本化的，不同版本的判定标准可能不同。

商业性使用请先通过「联系」页取得许可。

---

## 相关文档

- [`docs/零基础部署指南.md`](docs/零基础部署指南.md) —— 从零到公网上线
- [`docs/PAGE-CONTRACT.md`](docs/PAGE-CONTRACT.md) —— 页面层开发契约
- [`src/types/content.ts`](src/types/content.ts) —— 内容数据模型
