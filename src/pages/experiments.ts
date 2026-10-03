/**
 * 实验页 —— `/experiments`
 * ============================================================
 * 这一页的立场写在标题里：**诚实报告，包括阴性结果**。
 * 因此页面上的每一块都以「不夸大已完成的工作」为前提：
 *
 *   1. 状态图例：说明状态模型里每个取值的含义与当前占用情况；
 *   2. 实验台账：每项实验一张卡片，状态决定左边框颜色；事实区里的链接
 *      会解析成真实站内链接，正文用 `renderSections()` 渲染；
 *   3. 复现入口：给出指令序列，并**明确声明仓库地址是占位符、目前没有任何
 *      可运行代码**——不让页面暗示复现材料已经存在；
 *   4. 数据集与随机种子政策：种子与数据集随预注册冻结公开，阴性结果同等归档；
 *   5. 统计条：数字全部来自本页数据，其中「已发布数据集数」如实为 0。
 *
 * 所有来自数据的文本都经 `escapeHtml()` / `inline()` / 组件内部转义。
 */

import {
  experiments,
  protocols,
  posts,
  site,
  nav,
  escapeHtml,
  inline,
  stripInline,
  formatDate,
  metrics,
  factGrid,
  statusBadge,
  tag,
  callout,
  codeBlock,
  refItem,
  pageHero,
  renderSections,
  recordVisit,
  EXPERIMENT_STATUS_LABEL,
} from '../components/kit';
import type { RouteContext } from '../core/router';
import type { Experiment, ExperimentStatus } from '../components/kit';

/* ------------------------------------------------------------------ */
/* 页面结果形状（与 docs/PAGE-CONTRACT.md 第 1 节一致）                 */
/* ------------------------------------------------------------------ */

export interface PageResult {
  html: string;
  title: string;
  description?: string;
  path?: string;
  mount?: (root: HTMLElement) => void | (() => void);
}

const FALLBACK_KICKER = '实验 · Experiments';

/** 实验原文里这一页的标题（不是导航标签「实验」）。 */
const HERO_TITLE = '诚实报告，包括阴性结果';

/* ------------------------------------------------------------------ */
/* 状态模型：顺序与含义                                                */
/* ------------------------------------------------------------------ */

const STATUS_ORDER: ExperimentStatus[] = [
  'running',
  'design',
  'pending',
  'complete',
  'negative',
  'blocked',
];

/** 每个状态的一句话含义。颜色只是状态的编码，不是质量评分。 */
const STATUS_MEANING: Record<ExperimentStatus, string> = {
  running: '实验已启动，工作正在进行；目前没有可用结果。',
  design: '只有设计文档：不招募被试、不采集数据、不运行管线。',
  pending: '工作已告一段落，材料尚未发布。',
  complete: '实验已结束，结果与材料已发布。',
  negative: '实验已结束，结果未支持假设或为无效结果；与阳性结果同等归档、同等可检索。',
  blocked: '因外部条件（例如伦理审查或资源）暂停，等待条件满足后继续。',
};

/* ------------------------------------------------------------------ */
/* 小工具                                                              */
/* ------------------------------------------------------------------ */

/**
 * 把实验事实解析成 `factGrid()` 需要的形状：
 *  · 有 `href` 就当作真实链接；
 *  · 没有 `href` 但值里写了 `[文字](/路径)`，就用其中的路径（数据本来就有，
 *    不是新造的链接）；
 *  · 展示文本去掉行内标记，避免把 `[文字](/路径)` 原样显示给读者。
 */
function resolveFact(f: { label: string; value: string; href?: string }): {
  label: string;
  value: string;
  href?: string;
} {
  const fromMarkdown = /\[[^\]]+\]\(([^)\s]+)\)/.exec(f.value)?.[1];
  const href = f.href ?? fromMarkdown;
  return { label: f.label, value: stripInline(f.value), href };
}

/**
 * 已发布数据集数。
 * 内容模型里没有独立的数据集字段，数据集信息写在实验事实中
 * （EXP-001 的数据集标注为「待发布」）。因此这里从事实文本推导：
 * 只有事实里明确写了「数据集已发布」才算数。当前结果是 0——
 * 这是事实，不是缺省值，也不是「未知」。
 */
function publishedDatasetCount(): number {
  return experiments.filter((e) =>
    e.facts.some(
      (f) => /数据集/.test(f.label) && /已发布/.test(f.value) && !/待发布/.test(f.value),
    ),
  ).length;
}

/* ------------------------------------------------------------------ */
/* 区块一：状态图例                                                    */
/* ------------------------------------------------------------------ */

function legendSection(): string {
  const entries = STATUS_ORDER.map((status) => {
    const count = experiments.filter((e) => e.status === status).length;
    const label = EXPERIMENT_STATUS_LABEL[status]?.label ?? status;
    return `
      <span role="listitem">
        <span class="status-dot status-dot--${status}" aria-hidden="true"></span>
        <strong>${escapeHtml(label)}</strong>
        <span class="text-muted nowrap">${count > 0 ? `当前 ${count} 项` : '当前无实验'}</span>
        <span class="note">${escapeHtml(STATUS_MEANING[status])}</span>
      </span>`;
  }).join('');

  return `
    <section class="section section--tight" aria-labelledby="exp-legend-title">
      <h2 class="sec-title" id="exp-legend-title">状态图例</h2>
      <p class="sec-lead">
        ${inline(
          '以下是实验状态模型中的**全部**取值。当前在册的实验只占用了其中两种，其余取值也一并列出含义，方便对照——未完成的状态同样在册，本站不隐藏未完成的工作。',
        )}
      </p>
      <div class="status-legend" role="list">${entries}</div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块二：实验台账                                                    */
/* ------------------------------------------------------------------ */

function experimentCard(e: Experiment): string {
  const factRows = e.facts.map(resolveFact);
  const outputs = e.outputs?.length
    ? `<h4>产出计划</h4><ul>${e.outputs.map((o) => `<li>${inline(o)}</li>`).join('')}</ul>`
    : '';

  return `
    <article class="exp-card" id="${escapeHtml(e.id)}" data-status="${escapeHtml(e.status)}" aria-labelledby="${escapeHtml(
      e.id,
    )}-title">
      <div class="exp-head">
        <span class="card-index">${escapeHtml(e.code)}</span>
        <h3 id="${escapeHtml(e.id)}-title">${escapeHtml(e.title)}</h3>
        <div class="cluster exp-head-tags">
          ${statusBadge(e.status)}
          ${e.statusNote ? tag(e.statusNote, 'muted') : ''}
        </div>
      </div>
      <p>${inline(e.lead)}</p>
      ${factGrid(factRows)}
      ${renderSections(e.sections)}
      ${outputs}
      <p class="note">最近更新：${escapeHtml(formatDate(e.updatedAt, 'full'))}</p>
    </article>`;
}

function ledgerSection(): string {
  const unfinished = experiments.filter((e) => e.status !== 'complete' && e.status !== 'negative').length;
  return `
    <section class="section section--tight" aria-labelledby="exp-ledger-title">
      <h2 class="sec-title" id="exp-ledger-title">实验台账</h2>
      <p class="sec-lead">
        当前在册 ${experiments.length} 项，其中 ${unfinished} 项尚未结束。卡片左边框的颜色对应状态（见上方图例）；
        每项实验的正文、事实与产出计划都如实列出，包括尚未开始的与尚未决定的。
      </p>
      <div class="stack-lg">
        ${experiments.map(experimentCard).join('')}
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块三：复现入口                                                    */
/* ------------------------------------------------------------------ */

/** 文档中记录的复现指令序列（仓库地址为占位符，与内容数据一致）。 */
function reproCommands(): string {
  return [
    `git clone ${site.repository}`,
    'pip install -r requirements.txt',
    'python run_experiment.py --seed <公开种子>',
  ].join('\n');
}

function reproSection(): string {
  return `
    <section class="section section--tight" aria-labelledby="exp-repro-title">
      <h2 class="sec-title" id="exp-repro-title">复现入口</h2>
      <p class="sec-lead">
        「单命令复现」是一项要求的形式，而不是字面上的一个命令：从空环境出发，安装依赖、固定公开种子、运行分析，得到与报告一致的结果。
        下面就是文档里记录的指令序列。
      </p>
      ${codeBlock(reproCommands(), {
        language: 'bash',
        caption: '复现指令（占位：仓库尚未建立，因此目前无法执行）',
      })}
      ${callout({
        variant: 'warning',
        title: '这些命令今天跑不通，请不要期待它们现在能运行',
        text:
          `上面显示的仓库地址 \`${site.repository}\` 是**占位符**，不是真实仓库；本站目前**没有发布任何可运行代码、数据集或随机种子**。` +
          '把指令列在这里，是为了说明复现材料将来以什么形式提供，而不是声明它已经存在。在预注册冻结之前，复现材料不会提前发布。',
      })}
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块四：数据集与随机种子政策                                        */
/* ------------------------------------------------------------------ */

function dataPolicySection(): string {
  const reproPost = posts.find((p) => p.id === 'post-6');
  const p01 = protocols.find((p) => p.id === 'p01');

  const points = [
    '随机种子与数据集**随预注册冻结一并公开**，并随实验报告一起发布：冻结之前不存在可复现的正式材料，冻结之后任何结果都能追溯到具体的种子与数据版本。',
    '阴性结果与无效结果**与阳性结果采用同一套归档与检索规则**：实验状态模型为阴性结果保留独立取值，报告不因结果方向而改变归档位置，也不会被移到「失败」栏目。',
    '复现不一致**公开处理**：与报告不一致的复现是一次有价值的讨论，不是需要压下的事故；这类报告在联系渠道中优先处理。',
    '环境与依赖版本随代码一并公开（Python 3.11+，全部依赖开源，无专有工具链）；脱离可复述环境的结论，本站不作为结论发布。',
  ];

  return `
    <section class="section section--tight" aria-labelledby="exp-data-title">
      <h2 class="sec-title" id="exp-data-title">数据集与随机种子政策</h2>
      <ul>
        ${points.map((t) => `<li>${inline(t)}</li>`).join('')}
      </ul>
      <div class="ref-list">
        ${
          reproPost
            ? refItem({
                href: '/blog/post-6',
                title: reproPost.title,
                desc: `博客 ｜ ${formatDate(reproPost.publishedAt)} ｜ 可复现性作为最低标准`,
                iconName: 'refresh',
              })
            : refItem({
                href: '/blog/post-6',
                title: '可复现性是最低标准，而不是加分项',
                desc: '博客 ｜ 单命令复现、公开环境与随机种子、阴性结果同等归档',
                iconName: 'refresh',
              })
        }
        ${
          p01
            ? refItem({
                href: '/protocols/p01',
                title: `${p01.code} · ${p01.title}`,
                desc: `协议 ｜ ${p01.version} ｜ 预注册清单固定包含「随机种子与数据发布计划」条目`,
                iconName: 'book',
              })
            : ''
        }
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块五：统计条                                                      */
/* ------------------------------------------------------------------ */

function statsSection(): string {
  const running = experiments.filter((e) => e.status === 'running').length;
  const design = experiments.filter((e) => e.status === 'design').length;
  const datasets = publishedDatasetCount();

  return `
    <section class="section section--tight" aria-labelledby="exp-stats-title">
      <h2 class="sec-title" id="exp-stats-title">统计条</h2>
      <p class="sec-lead">以下数字直接由本页数据统计得到，没有任何估算或推测。</p>
      ${metrics([
        { value: String(experiments.length), label: '在册实验数', note: '含未完成实验' },
        { value: String(running), label: '进行中数', note: '已启动，尚无可用结果' },
        { value: String(design), label: '设计阶段数', note: '仅有设计文档' },
        {
          value: String(datasets),
          label: '已发布数据集数',
          note: '目前为 0：数据集随预注册冻结与报告一并发布',
        },
      ])}
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

export function render(ctx: RouteContext): PageResult {
  const entry = nav.find((n) => n.path === '/experiments');

  /* 记录足迹时用当前规范化路径（路由层已去掉结尾斜杠），保证「继续阅读」指向真实地址。 */
  const visitPath = ctx.path || '/experiments';

  const hero = pageHero({
    kicker: entry?.kicker ?? FALLBACK_KICKER,
    title: HERO_TITLE,
    lead: entry?.description,
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '实验' }],
  });

  return {
    html: `
      ${hero}
      <div class="container">
        ${legendSection()}
        ${ledgerSection()}
        ${reproSection()}
        ${dataPolicySection()}
        ${statsSection()}
      </div>`,
    title: '实验',
    description: entry?.description,
    path: '/experiments',
    mount: () => {
      recordVisit(visitPath, '实验');
    },
  };
}
