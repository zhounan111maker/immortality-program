/**
 * 站点级内容模型实例
 * ==================
 *
 * 来源：首页（发布记录 / 平台架构 / 路线图 / 合规提示）、协议页（发布标准）、
 *       关于页（风险与应对 / 合作邀请）、架构与部署页（部署步骤 / 运营与成本）。
 *
 * 工程说明：本站已从「单个自包含静态 HTML」重建为 Vite + TypeScript 多文件工程，
 * 由 GitHub 触发 Vercel 自动构建部署，同时保留单文件归档构建（npm run archive）
 * 用于 Arweave 永久存档。永久层（Arweave）承诺不变。
 */

import type {
  SiteMeta,
  NavItem,
  ReleaseRecord,
  ResearchPrinciple,
  RoadmapPhase,
  RiskItem,
  OpenWorkItem,
  ArchitectureLayer,
  PricingRow,
  DeployStep,
} from '../types/content';

export const site: SiteMeta = {
  name: '永生计划',
  latinName: 'IMMORTALITY PROGRAM',
  tagline: '研究纲领平台',
  description:
    '一个以「迁移永生协议」为核心的可检验研究纲领发布平台：协议、实验、文献，全部公开、可复现、可证伪。',
  establishedYear: 2026,
  email: 'research@immortality-program.example.org',
  repository: 'https://github.com/your-handle/immortality-program',
  license: 'CC BY 4.0',
  policyVersion: 'v1.0.0',
  policyDate: '2026-10-02',
};

/** 九条路由；kicker 与 description 取自各页 page-hero 原文 */
export const nav: NavItem[] = [
  {
    path: '/home',
    label: '首页',
    latin: 'Home',
    kicker: '研究纲领发布平台 · 建立于 2026',
    description:
      '一个以「迁移永生协议」为核心的可检验研究纲领：协议、实验与文献全部公开、可复现、可证伪。不提供服务，不贩卖愿景，只发布可以被独立验证的内容。',
    primary: true,
  },
  {
    path: '/protocols',
    label: '协议',
    latin: 'Protocols',
    kicker: '协议 · Protocols',
    description:
      '每份协议有独立版本号与变更日志；涉及实验的协议附完整预注册文档；每份协议顶部附「解释边界声明」——声明它能回答什么、不能回答什么。',
    primary: true,
  },
  {
    path: '/experiments',
    label: '实验',
    latin: 'Experiments',
    kicker: '实验 · Experiments',
    description:
      '本站所有实验的预注册文档、代码、数据与随机种子公开。进行中与设计阶段的实验同样在册——研究纲领不隐藏未完成的工作。',
    primary: true,
  },
  {
    path: '/literature',
    label: '文献',
    latin: 'Literature',
    kicker: '文献 · Literature',
    description:
      '术语表、关键文献索引与现有项目对比。索引只收录可核实来源的公开文献，不设下载镜像，不收录无法溯源的材料。',
    primary: true,
  },
  {
    path: '/blog',
    label: '博客',
    latin: 'Blog',
    kicker: '博客 · Blog',
    description:
      '博客承担三类功能：报告研究进展，澄清概念口径，回应外部反馈。最低更新承诺：每月至少一篇。',
    primary: true,
  },
  {
    path: '/about',
    label: '关于',
    latin: 'About',
    kicker: '关于 · About',
    description: '一个研究纲领最需要说清楚的三件事：它是什么、它不是什么、它需要谁。',
    primary: true,
  },
  {
    path: '/contact',
    label: '联系',
    latin: 'Contact',
    kicker: '联系 · Contact',
    description: '社区采用渐进式策略：从邮件列表开始，不一开始就建大论坛。交流质量优先于规模。',
    primary: true,
  },
  {
    path: '/deploy',
    label: '架构与部署',
    latin: 'Deploy',
    kicker: '架构与部署 · Deploy',
    description:
      'ecylt.top「七十年之约」讨论了如何让网站存在七十年甚至两百年。本站的答案是：永久层存档 + 零依赖静态主站。',
    primary: true,
  },
  {
    path: '/legal',
    label: '条款与隐私',
    latin: 'Legal',
    kicker: '条款 · Legal',
    description: '本站只发布研究文档，不提供任何实际服务——这是法律风险的根源性降低。',
    primary: false,
  },
];

/** 首页「最新发布」表 —— 五行，href 由 #/ 路由改写为路径 */
export const releases: ReleaseRecord[] = [
  {
    document: '平台 · 本站',
    href: '/home',
    version: 'v1.0.0',
    status: 'published',
    date: '2026-10-02',
    note: '单文件站点上线，当前版本',
  },
  {
    document: 'PRT-001 HES 实验规格',
    href: '/protocols/p01',
    version: 'v0.9.0',
    status: 'draft',
    date: '2026-09-30',
    note: '结构定稿，正式假设表述待冻结',
  },
  {
    document: 'PRT-002 TES 身份置信曲线协议',
    href: '/protocols/p02',
    version: 'v0.8.0',
    status: 'draft',
    date: '2026-09-18',
    note: '测量维度清单待定',
  },
  {
    document: 'PRT-003 迁移永生协议框架（QTR）',
    href: '/protocols/p03',
    version: 'v0.7.0',
    status: 'draft',
    date: '2026-09-05',
    note: '四门判定标准待冻结',
  },
  {
    document: '博客 · 为什么需要一个可检验的研究纲领',
    href: '/blog/post-1',
    version: '—',
    status: 'published',
    date: '2026-10-01',
    note: '纲领定位论述',
  },
];

/**
 * 研究原则 —— 协议页「协议如何在这里发布」四张卡片 + 「诚实性准则」阴性结果条款。
 * evidence 记录该原则在本站的实际执行位置（可核查，而非口号）。
 */
export const principles: ResearchPrinciple[] = [
  {
    id: 'pr-semver-deviation',
    no: '01',
    title: '语义化版本与协议偏差',
    text: '每份协议有明确的版本号（v1.0.0、v1.1.0）、发布日期与变更日志。任何修改必须记录为 *protocol deviation*，不静默修订历史版本。',
    evidence:
      '每份协议附变更日志表（版本 / 日期 / 变更三列）；协议列表页与详情页头部同时展示版本号与「最近更新」日期；首页「最新发布」表公开全部版本与状态。历史版本保留在 Git 历史中，任何改动可回滚、可审计。',
  },
  {
    id: 'pr-preregistration',
    no: '02',
    title: '预注册文档',
    text: '协议涉及实验时，必须包含完整预注册：假设、测量方法、统计模型、排除标准、停止规则、盲测协议。这是可检验性的制度保障。',
    evidence:
      'PRT-001 详情页以预注册清单逐条列出六项必填条目，已定条目用勾选标记、待冻结条目用方框标记；实验详情页展示「预注册」字段并链接到对应协议；预注册冻结前协议状态始终显示为「草案」，不产生任何验收结论。',
  },
  {
    id: 'pr-reproducibility',
    no: '03',
    title: '可复现性材料',
    text: '完整代码仓库链接、数据发布计划、环境版本要求、单命令复现指令。复现结果与报告一致即一次独立验证；不一致即一次有价值的讨论。',
    evidence:
      '每份涉及实验的协议附代码/命令块（git clone、pip install -r requirements.txt、python run_experiment.py --seed <公开种子>）；实验页公开环境要求（Python 3.11+，全开源依赖）与单命令复现指令；联系页承诺复现不一致的报告优先处理。',
  },
  {
    id: 'pr-boundary',
    no: '04',
    title: '解释边界声明',
    text: '每份协议必须声明：能回答什么、不能回答什么、哪些结论属于过度推论。诚实性是不可谈判的默认值。',
    evidence:
      '协议详情页顶部展示解释边界框（能回答 / 不能回答 / 过度推论红线三段）；关于页风险清单中「内容被误解」的应对即为该边界框的可见位置；站点导航与 hero 导语亦重复「不提供服务、不做倡导」的边界。',
  },
  {
    id: 'pr-negative-results',
    no: '05',
    title: '阴性结果照常发布',
    text: '实验没有支持假设、甚至推翻假设，是研究的一部分，不是失败。只发布阳性结果的研究纲领，本质上是在挑选数据。本站承诺：阴性结果与无效结果同样归档、同样可检索。',
    evidence:
      '实验页公开承诺「诚实报告，包括阴性结果」，并把「进行中」「设计阶段」「待发布」等未完成状态一并列入在册清单（EXP-001 进行中、EXP-002 设计阶段）；实验状态模型为阴性结果保留独立状态值；全部归档内容随 Git 历史与 Arweave 永久层可检索。',
  },
];

/** 首页「分阶段执行路线图」—— 四阶段，逐字保留阶段 / 周期 / 标题 / 正文 */
export const roadmap: RoadmapPhase[] = [
  {
    id: 'roadmap-1',
    phase: '第一阶段',
    period: '1–2 个月',
    title: '最小可行发布',
    text: '站点上线；发布 HES 实验规格与合成模拟报告；设置邮件订阅；建立 GitHub 仓库。',
    items: ['站点上线', '发布 HES 实验规格', '发布合成模拟报告', '设置邮件订阅', '建立 GitHub 仓库'],
    status: 'done',
  },
  {
    id: 'roadmap-2',
    phase: '第二阶段',
    period: '3–6 个月',
    title: '协议扩展',
    text: '发布 TES 身份置信曲线协议与 QTR 框架文档；核心文档上传 Arweave 永久存档；启用 GitHub Discussions。',
    items: [
      '发布 TES 身份置信曲线协议',
      '发布 QTR 框架文档',
      '核心文档上传 Arweave 永久存档',
      '启用 GitHub Discussions',
    ],
    status: 'active',
  },
  {
    id: 'roadmap-3',
    phase: '第三阶段',
    period: '6–12 个月',
    title: '协作激活',
    text: '发布人类被试研究设计（TES 实验 1）；招募合作者；发布第一份预印本（arXiv / Zenodo）。',
    items: [
      '发布人类被试研究设计（TES 实验 1）',
      '招募合作者',
      '发布第一份预印本（arXiv / Zenodo）',
    ],
    status: 'planned',
  },
  {
    id: 'roadmap-4',
    phase: '第四阶段',
    period: '12–24 个月',
    title: '网络扩展',
    text: '与现有机构建立联系；扩展 HES 实验到 RNN / LSTM 架构；发布年度报告。',
    items: ['与现有机构建立联系', '扩展 HES 实验到 RNN / LSTM 架构', '发布年度报告'],
    status: 'planned',
  },
];

/** 关于页「已知风险与应对方案」—— 六个 FAQ 条目 */
export const risks: RiskItem[] = [
  {
    id: 'risk-low-traffic',
    question: '网站无人访问怎么办',
    answer:
      '纲领的价值不在于访问量，而在于可检索性。即使只有几个人访问，只要他们能复现实验、引用协议，网站就实现了价值。',
    mitigation: 'communication',
  },
  {
    id: 'risk-misread',
    question: '内容被误解怎么办',
    answer:
      '每份协议页面顶部放置「解释边界声明」，明确什么能说、什么不能说。误解通常源于边界不清，而非信息不足。',
    mitigation: 'procedural',
  },
  {
    id: 'risk-pseudoscience',
    question: '被当作「伪科学」怎么办',
    answer:
      '所有协议包含预注册文档、可复现代码与诚实的结果报告（含阴性结果）。面对指控，最有力的反驳是程序，不是辩白。',
    mitigation: 'procedural',
  },
  {
    id: 'risk-burnout',
    question: '个人精力耗尽怎么办',
    answer:
      '网站是长期项目而非短期冲刺。最低更新承诺（每月一篇进展、每季度一次协议更新）优先于高频更新；即使更新放缓，核心文档已入永久层，内容不消失。',
    mitigation: 'structural',
  },
  {
    id: 'risk-fees',
    question: '本站收费吗',
    answer: '不收费。本站无任何服务、产品、会员或捐赠入口，所有内容免费开放。',
    mitigation: 'communication',
  },
  {
    id: 'risk-disappear',
    question: '本站会消失吗',
    answer:
      '核心文档将上传至 Arweave 永久层——一旦上传不可删除，即使主站域名过期、服务器关闭，内容依然可访问。详见[架构与部署](/deploy)。',
    mitigation: 'structural',
  },
];

/** 关于页「合作邀请」—— 三项当前开放的工作 */
export const openWork: OpenWorkItem[] = [
  {
    id: 'open-hes-architectures',
    title: '扩展 HES 实验架构',
    text: '将 HES 实验从当前架构扩展到 RNN / LSTM 等序列架构，检验测量指标在不同架构下的稳定性。',
    effort: 'high',
    skills: ['Python', '序列模型（RNN / LSTM）', '实验管线实现', '统计检验'],
  },
  {
    id: 'open-human-subjects',
    title: '设计人类被试研究',
    text: '按 TES 协议设计人类被试研究（记忆与行为一致性测量）。注意：必须先通过伦理审查，本站不绕过任何程序。',
    effort: 'medium',
    skills: ['实验心理学设计', '伦理审查流程', '测量工具编制', 'TES 协议（PRT-002）'],
  },
  {
    id: 'open-physical-feasibility',
    title: '分析物理可行性',
    text: '从信息论与物理约束角度分析迁移永生协议的可行性边界——哪些部分成立，哪些部分需要修正。',
    effort: 'medium',
    skills: ['信息论', '物理学约束分析', '形式化论证'],
  },
];

/**
 * 首页「平台架构」—— 六个 layer-row。
 *
 * 02 主站层已按工程现状改写：本站现由 Vite + TypeScript 多文件工程构建，
 * GitHub 触发 Vercel 自动构建部署，并同时产出单文件归档构建用于 Arweave。
 * 永久层（Arweave）说明保持不变。
 */
export const architecture: ArchitectureLayer[] = [
  {
    no: '01',
    name: '永久层',
    description:
      'Arweave 永久存储：核心文档以静态文件上传，上传即不可删，域名失效后仍可访问（ArDrive 网关）。',
    cost: '一次性存储费',
    category: 'permanence',
  },
  {
    no: '02',
    name: '主站层',
    description:
      'Vite + TypeScript 多文件静态工程：构建产物为纯静态资源，由 GitHub 仓库触发 Vercel 自动构建与部署，可迁移到任意静态托管；同一份代码另有一个单文件归档构建（npm run archive），用于上传 Arweave。',
    cost: '$0–20/月',
    category: 'delivery',
  },
  {
    no: '03',
    name: '内容层',
    description: 'Git 版本控制：文件即内容，每一次修改都有历史、可回滚、可审计，等效于内容管理系统。',
    cost: '免费',
    category: 'content',
  },
  {
    no: '04',
    name: '协作层',
    description: 'GitHub：代码与协议文档托管，任何研究者可提交 issue、发起 pull request、独立复现。',
    cost: '免费',
    category: 'collaboration',
  },
  {
    no: '05',
    name: '通讯层',
    description: '邮件列表：订阅研究进展、协议更新与协作邀请（接入 Brevo 免费层）。',
    cost: '免费层',
    category: 'ops',
  },
  {
    no: '06',
    name: '统计层',
    description: 'Plausible：隐私友好的网站分析，不采集个人可识别信息。',
    cost: '£9/月',
    category: 'ops',
  },
];

/** 架构与部署页「运营与成本」表 —— 六行 */
export const pricing: PricingRow[] = [
  { item: '域名', note: '自定义域名年费', cost: '约 $10/年' },
  { item: '主站托管', note: 'Vercel / Netlify 免费层；Pro 层可选', cost: '$0–20/月' },
  { item: '永久存档', note: 'Arweave 存储', cost: '一次性，视规模' },
  { item: '邮件列表', note: 'Brevo 免费层', cost: '$0' },
  { item: '网站分析', note: 'Plausible（隐私友好，可选）', cost: '£9/月', optional: true },
  { item: '合计', note: '基础运营（不含可选项）', cost: '约 $30/月以内' },
];

/**
 * 架构与部署页「部署步骤」—— 四步。
 *
 * 02 已按工程现状改写：不再「上传 HTML 文件」，而是由 GitHub 触发 Vercel 自动构建部署。
 * 03 保留 Arweave 永久存档承诺，并说明归档输入来自单文件归档构建。
 */
export const deploySteps: DeployStep[] = [
  {
    no: '01',
    title: '本地预览',
    text: '安装依赖并启动本地开发服务器，改动即时热更新：',
    code: 'npm install\nnpm run dev',
    note: '构建产物预览使用 npm run build && npm run preview。',
  },
  {
    no: '02',
    title: '主站托管（Vercel / Netlify）',
    text: '将仓库推送到 GitHub，在 Vercel 导入该仓库：构建命令为 `npm run build`，输出目录为 `dist`。此后每次推送到主分支都会自动构建并部署，绑定自定义域名后即可对外。免费层足够支撑研究纲领平台的流量。',
    note: '无需手动上传文件；部署由 Git 提交触发，与内容层、协作层共用同一套版本历史。',
  },
  {
    no: '03',
    title: '永久存档（Arweave）',
    text: '运行 `npm run archive` 生成单文件自包含归档（CSS 与 JS 内联，双击即可打开），再用 ArDrive 等工具将核心文档与归档上传至 Arweave：存储是永久性的，一旦上传无法删除，获得不依赖中心化服务器的永久网关链接。',
    note: '单文件归档是永久层的输入格式，与主站的 Vite 构建产物相互独立。',
  },
  {
    no: '04',
    title: '版本与协作（GitHub）',
    text: '建立 GitHub 仓库托管本站文件。研究者的 issue、pull request 与独立复现都发生在这里。',
  },
];
