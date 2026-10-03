/**
 * 内容模型 —— 纲领全部公开材料的强类型契约
 * ============================================
 *
 * 设计原则：
 *  1. 内容与渲染分离。所有文本以数据形式存在，页面只负责把数据渲染成 HTML。
 *  2. 结构可归档。数据是纯 JSON 可序列化结构，可直接导出为永久档案。
 *  3. 类型即校验。任何内容缺字段都会在 `tsc` 阶段报错，不静默降级。
 *  4. 块级组合。用 Block 联合类型表达富文本，避免在数据里写 HTML 字符串。
 */

/* ------------------------------------------------------------------ */
/* 通用                                                                 */
/* ------------------------------------------------------------------ */

/** 语义化版本字符串，例如 "v0.9.0" */
export type VersionString = string;

/** ISO 日期字符串，例如 "2026-09-30" */
export type IsoDate = string;

/** 发布状态 */
export type PublicationStatus =
  | 'published' // 已发布
  | 'draft' // 草案
  | 'review' // 内部复核
  | 'frozen' // 已冻结（预注册冻结后不再改动）
  | 'archived'; // 已归档（被新版本取代）

/** 卡片 / 徽章配色键 */
export type AccentKey = 'brand' | 'gold' | 'alert' | 'muted';

/** 一条变更日志记录 */
export interface ChangelogEntry {
  version: VersionString;
  date: IsoDate;
  /** 本次变更摘要，一句话 */
  summary: string;
  /** 可选的详细条目 */
  details?: string[];
  /** 是否为破坏性变更（协议偏差中的重大改动） */
  breaking?: boolean;
}

/** 解释边界声明 —— 每份协议必须附带 */
export interface BoundaryDeclaration {
  /** 能回答什么 */
  canAnswer: string[];
  /** 不能回答什么 */
  cannotAnswer: string[];
  /** 过度推论红线 */
  redLines: string[];
}

/** 外部链接 */
export interface ExternalRef {
  label: string;
  href: string;
  /** 链接性质，用于渲染图标与提示 */
  kind?: 'repository' | 'dataset' | 'paper' | 'archive' | 'spec' | 'site';
  note?: string;
}

/* ------------------------------------------------------------------ */
/* 块级内容                                                             */
/* ------------------------------------------------------------------ */

/** 段落 */
export interface ParagraphBlock {
  kind: 'paragraph';
  /** 允许内联标记：**粗体**、*斜体*、`代码`、[文字](链接) */
  text: string;
}

/** 各级标题 */
export interface HeadingBlock {
  kind: 'heading';
  /** 2 = h2，3 = h3，4 = h4 */
  level: 2 | 3 | 4;
  text: string;
  /** 章节编号，例如 "1.1" */
  no?: string;
  /** 显式锚点 id，省略时由标题文本生成 */
  id?: string;
}

/** 无序 / 有序列表 */
export interface ListBlock {
  kind: 'list';
  ordered?: boolean;
  items: string[];
  /** 勾选清单样式：true 表示已完成项，false 表示待办项；省略则为普通圆点 */
  checks?: boolean[];
}

/** 代码 / 命令块 */
export interface CodeBlock {
  kind: 'code';
  language?: string;
  code: string;
  /** 代码块上方的说明 */
  caption?: string;
}

/** 表格 */
export interface TableBlock {
  kind: 'table';
  caption?: string;
  /** 列宽百分比，长度需与 columns 一致；省略则自动分配 */
  widths?: number[];
  columns: string[];
  /** 单元格允许内联标记 */
  rows: string[][];
}

/** 强调框 —— 金底，用于边界、注意事项、准则 */
export interface CalloutBlock {
  kind: 'callout';
  variant: 'boundary' | 'note' | 'quote' | 'warning' | 'principle';
  title?: string;
  text?: string;
  items?: string[];
  /** 署名，variant 为 quote 时使用 */
  attribution?: string;
}

/** 定义列表（术语对） */
export interface DefinitionsBlock {
  kind: 'definitions';
  items: { term: string; definition: string }[];
}

/** 内嵌图示 */
export interface FigureBlock {
  kind: 'figure';
  id: string;
  /** 无障碍描述 */
  alt: string;
  caption?: string;
  /** 图示类型，由渲染器映射到具体 SVG */
  diagram:
    | 'confidence-curves'
    | 'qtr-gates'
    | 'architecture-layers'
    | 'roadmap'
    | 'migration-map'
    | 'dissonance'
    | 'domain-map';
}

/** 指标卡组 —— 用于展示关键量化信息 */
export interface MetricGridBlock {
  kind: 'metrics';
  items: { value: string; label: string; note?: string }[];
}

/** 引用块 */
export interface QuoteBlock {
  kind: 'quote';
  text: string;
  attribution?: string;
}

/** 常见问题 */
export interface FaqBlock {
  kind: 'faq';
  items: { question: string; answer: string; defaultOpen?: boolean }[];
}

/** 时间轴 */
export interface TimelineBlock {
  kind: 'timeline';
  items: {
    phase: string;
    period: string;
    title: string;
    text: string;
    items?: string[];
    status?: 'done' | 'active' | 'planned';
  }[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | CodeBlock
  | TableBlock
  | CalloutBlock
  | DefinitionsBlock
  | FigureBlock
  | MetricGridBlock
  | QuoteBlock
  | FaqBlock
  | TimelineBlock;

/** 文档的一个章节 */
export interface DocSection {
  id: string;
  no?: string;
  title: string;
  /** 该章节的引言（可选） */
  lead?: string;
  blocks: ContentBlock[];
}

/* ------------------------------------------------------------------ */
/* 协议                                                                 */
/* ------------------------------------------------------------------ */

export interface Protocol {
  /** 稳定标识，用于路由：/protocols/p01 */
  id: string;
  /** 协议编号：PRT-001 */
  code: string;
  title: string;
  /** 列表页与卡片上的一句话摘要 */
  summary: string;
  /** 详情页顶部导语 */
  lead: string;
  version: VersionString;
  status: PublicationStatus;
  updatedAt: IsoDate;
  publishedAt: IsoDate;
  /** 分类标签，例如 "预注册规格" */
  tags: string[];
  /** 主色调 */
  accent: AccentKey;
  /** 该协议在整个纲领中的角色 */
  role: string;
  /** 依赖 / 引用的其它协议 id */
  relatedProtocols?: string[];
  /** 关联实验 id */
  relatedExperiments?: string[];
  /** 预注册清单完成度，0–1，用于进度条 */
  readiness?: number;
  /** 待冻结事项 */
  openItems?: string[];
  boundary: BoundaryDeclaration;
  changelog: ChangelogEntry[];
  sections: DocSection[];
  refs?: ExternalRef[];
}

/* ------------------------------------------------------------------ */
/* 实验                                                                 */
/* ------------------------------------------------------------------ */

export type ExperimentStatus =
  | 'running' // 进行中
  | 'design' // 设计阶段
  | 'pending' // 待发布
  | 'blocked' // 受阻
  | 'complete' // 已完成
  | 'negative'; // 已完成（阴性结果）

export interface Experiment {
  id: string;
  code: string;
  title: string;
  summary: string;
  lead: string;
  status: ExperimentStatus;
  statusNote?: string;
  /** 关联协议 id */
  protocolId?: string;
  /** 关键字段清单，键值对形式渲染 */
  facts: { label: string; value: string; href?: string }[];
  /** 详细区块 */
  sections: DocSection[];
  /** 产出计划 */
  outputs?: string[];
  updatedAt: IsoDate;
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* 文献                                                                 */
/* ------------------------------------------------------------------ */

export interface LiteratureEntry {
  id: string;
  title: string;
  authors: string;
  year: number;
  /** 领域分类，例如 "哲学 · 人格同一性" */
  field: string;
  /** 文献类型 */
  type: 'book' | 'paper' | 'report' | 'chapter' | 'preprint';
  /** 与本纲领的关系 */
  relation: string;
  /** 可选：DOI 或稳定链接 */
  doi?: string;
  href?: string;
  /** 是否为纲领自身的产出 */
  ownWork?: boolean;
}

/* ------------------------------------------------------------------ */
/* 项目对比                                                             */
/* ------------------------------------------------------------------ */

export interface PeerProject {
  id: string;
  name: string;
  /** 方向：保存 / 延长 / 倡导 / 分析 / 知识库 / 存储 */
  direction: string;
  /** 形态：付费服务机构 / 非营利 / 论坛 … */
  form: string;
  /** 与本平台的关系 */
  relation: string;
  href?: string;
}

/* ------------------------------------------------------------------ */
/* 博客                                                                 */
/* ------------------------------------------------------------------ */

export interface BlogPost {
  id: string;
  title: string;
  /** 卡片摘要 */
  excerpt: string;
  /** 顶部分类标签，例如 "定位" */
  category: string;
  tags?: string[];
  publishedAt: IsoDate;
  updatedAt?: IsoDate;
  /** 预估阅读分钟数 */
  readingMinutes: number;
  /** 正文块 */
  blocks: ContentBlock[];
  /** 是否为纲领的核心立场文章 */
  cornerstone?: boolean;
}

/* ------------------------------------------------------------------ */
/* 术语 / 路线图 / 风险                                                  */
/* ------------------------------------------------------------------ */

export interface GlossaryTerm {
  id: string;
  term: string;
  /** 英文或别名 */
  alias?: string;
  definition: string;
  /** 关联文档 id，用于交叉引用 */
  relatedRefs?: string[];
  /** 分类 */
  group: 'concept' | 'method' | 'technology' | 'governance';
}

export interface RoadmapPhase {
  id: string;
  phase: string;
  period: string;
  title: string;
  text: string;
  items: string[];
  status: 'done' | 'active' | 'planned';
}

export interface RiskItem {
  id: string;
  question: string;
  answer: string;
  /** 应对等级 */
  mitigation: 'procedural' | 'structural' | 'communication';
}

export interface OpenWorkItem {
  id: string;
  title: string;
  text: string;
  /** 参与门槛 */
  effort: 'low' | 'medium' | 'high';
  /** 需要的背景 */
  skills: string[];
}

export interface ArchitectureLayer {
  no: string;
  name: string;
  description: string;
  cost: string;
  /** 层级类别 */
  category: 'permanence' | 'delivery' | 'content' | 'collaboration' | 'ops';
}

export interface PricingRow {
  item: string;
  note: string;
  cost: string;
  optional?: boolean;
}

export interface DeployStep {
  no: string;
  title: string;
  text: string;
  code?: string;
  note?: string;
}

export interface ResearchPrinciple {
  id: string;
  no: string;
  title: string;
  text: string;
  /** 该原则的可检验/可核查证据 */
  evidence?: string;
}

/* ------------------------------------------------------------------ */
/* 站点级                                                               */
/* ------------------------------------------------------------------ */

export interface NavItem {
  /** 路由路径，例如 "/protocols" */
  path: string;
  label: string;
  /** 简短英文副标题，用于页头 */
  latin?: string;
  description?: string;
  /** 是否出现在主导航（否则只在页脚 / 命令面板） */
  primary: boolean;
  /** 页头 kicker 文字 */
  kicker?: string;
}

export interface SiteMeta {
  name: string;
  latinName: string;
  tagline: string;
  description: string;
  establishedYear: number;
  /** 默认联系邮箱（占位符集中在此，便于替换） */
  email: string;
  repository: string;
  /** 协议文档许可 */
  license: string;
  /** 政策版本 */
  policyVersion: VersionString;
  policyDate: IsoDate;
}

/** 发布记录（首页表格） */
export interface ReleaseRecord {
  document: string;
  href: string;
  version: VersionString;
  status: PublicationStatus;
  date: IsoDate;
  note: string;
}
