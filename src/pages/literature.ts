/**
 * 文献：术语表 + 术语检索 + 关键文献索引 + 项目对比 + 本站的位置 + 引用规范
 * ====================================================================
 *
 * 与原始单文件版的差别（这是本页唯一的「改进」，其余文案逐字迁移）：
 *   1. 术语表按 group 分组（概念 / 方法 / 技术），不再是一个扁平列表；
 *   2. `relatedRefs` 变成真正的站内交叉引用链接（指向对应协议详情页），
 *      术语与协议之间因此可以互相走到；
 *   3. 术语检索与文献领域筛选都在 `mount` 里就地重绘结果区，
 *      并把查询条件镜像进 URL，便于分享与刷新后保持。
 *
 * 诚信边界：本页只做索引与对比，不构成对任何文献观点的背书，
 * 也不对任何第三方项目作评价；这一点在表格下方的说明里写明。
 *
 * 所有来自数据的文本：或经 `escapeHtml()`，或经 `inline()`（内部先转义），
 * 或由组件内部转义 —— 不存在裸插值。
 */

import {
  /* 内容 */
  literature,
  peerProjects,
  glossary,
  protocols,
  nav,
  site,
  /* 工具 */
  escapeHtml,
  inline,
  highlight,
  tokenize,
  /* 组件 */
  pageHero,
  sectionHead,
  table,
  callout,
  codeBlock,
  emptyState,
  renderDiagram,
} from '../components/kit';
import type { RouteContext } from '../core/router';
import type { GlossaryTerm, LiteratureEntry, PeerProject } from '../components/kit';

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

/* ================================================================== */
/* 共享小工具                                                          */
/* ================================================================== */

/** 协议 id → 协议编号（"p02" → "PRT-002"）；找不到时回退为 id 本身。 */
function protocolCode(id: string): string {
  return protocols.find((p) => p.id === id)?.code ?? id;
}

/** 文献类型 → 中文标签（原始表格没有这一列，标签口径在此固定）。 */
const LITERATURE_TYPE_LABEL: Record<LiteratureEntry['type'], string> = {
  book: '专著',
  paper: '论文',
  report: '报告',
  chapter: '章节',
  preprint: '预印本',
};

function literatureTypeLabel(type: LiteratureEntry['type']): string {
  return LITERATURE_TYPE_LABEL[type] ?? type;
}

/* ================================================================== */
/* 一、术语表（分组 + 交叉引用）                                        */
/* ================================================================== */

/** group 值的展示顺序与中文标签：概念 / 方法 / 技术（governance 目前无数据，仍保留映射）。 */
const GLOSSARY_GROUPS: { key: GlossaryTerm['group']; label: string }[] = [
  { key: 'concept', label: '概念' },
  { key: 'method', label: '方法' },
  { key: 'technology', label: '技术' },
  { key: 'governance', label: '治理' },
];

/**
 * 单条术语。
 * 这里手写 `gloss-item` 标记（而不是用 `definitions()`），因为需要两个额外字段：
 *   · `alias` 落在 `dt` 的 `.alias` 里；
 *   · `relatedRefs` 在 `dd` 末尾生成指向协议的交叉引用链接。
 * 类名全部来自设计系统，未新增任何 CSS。
 */
function glossaryItem(term: GlossaryTerm): string {
  const refs = (term.relatedRefs ?? []).filter((id) => id.length > 0);
  const refLinks = refs.length
    ? ` 参见 ${refs
        .map(
          (id) =>
            `<a href="/protocols/${escapeHtml(id)}">${escapeHtml(protocolCode(id))}</a>`,
        )
        .join('、')}。`
    : '';

  return `
    <div class="gloss-item" data-term-item>
      <dt>
        ${escapeHtml(term.term)}
        ${term.alias ? `<span class="alias">${escapeHtml(term.alias)}</span>` : ''}
      </dt>
      <dd>${inline(term.definition)}${refLinks}</dd>
    </div>`;
}

/** 按分组渲染术语表；只渲染有内容的分组。 */
function glossaryGroupsHtml(items: GlossaryTerm[]): string {
  return GLOSSARY_GROUPS.map((group, index) => {
    const list = items.filter((t) => t.group === group.key);
    if (!list.length) return '';

    const headingId = `gloss-group-${group.key}`;
    const count = list.length;

    return `
      <section class="section section--tight" aria-labelledby="${headingId}">
        <div class="section-head">
          <p class="sec-label"><span class="sec-no">${String(index + 1).padStart(2, '0')}</span>${escapeHtml(group.label)}</p>
          <h3 class="sec-title" id="${headingId}">${escapeHtml(group.label)} · ${count} 条术语</h3>
        </div>
        <dl class="glossary-grid" style="margin:0">${list.map(glossaryItem).join('')}</dl>
      </section>`;
  }).join('');
}

const NO_TERM_MATCH = '没有匹配的术语';

function glossaryResultsHtml(items: GlossaryTerm[]): string {
  const count = `<p class="result-count" data-glossary-count>共 ${items.length} 条术语</p>`;
  if (!items.length) {
    return `${count}${emptyState({
      title: NO_TERM_MATCH,
      text: '当前关键词没有匹配任何术语。可以改用术语名、英文别名或定义中的关键词，并注意多个关键词之间是「同时满足」。',
    })}`;
  }
  return `${count}${glossaryGroupsHtml(items)}`;
}

/* ================================================================== */
/* 二、关键文献索引                                                     */
/* ================================================================== */

/** 文献标题单元格：有 href / doi 时给出链接，doi 另以 mono 显示。 */
function literatureTitleCell(entry: LiteratureEntry): string {
  const label = `<strong>${escapeHtml(entry.title)}</strong>`;
  const link = entry.href ?? (entry.doi ? `https://doi.org/${entry.doi}` : '');
  const head = link ? `<a href="${escapeHtml(link)}">${label}</a>` : label;
  const doi = entry.doi ? `<br><span class="mono">doi:${escapeHtml(entry.doi)}</span>` : '';
  return `${head}${doi}`;
}

function literatureRows(list: LiteratureEntry[]): string[][] {
  return list.map((entry) => [
    literatureTitleCell(entry),
    escapeHtml(entry.authors),
    String(entry.year),
    escapeHtml(entry.field),
    literatureTypeLabel(entry.type),
    escapeHtml(entry.relation),
  ]);
}

/** 只渲染当前筛选结果的表格；mount 里重绘的就是这个片段。 */
function literatureTableHtml(list: LiteratureEntry[]): string {
  if (!list.length) {
    return emptyState({
      title: '没有匹配的文献',
      text: '当前领域筛选下没有条目。点击「全部」可恢复完整索引；本索引只收录可核实来源的公开文献，不设下载镜像。',
    });
  }

  return table({
    columns: ['文献', '作者', '年份', '领域', '类型', '与本纲领的关系'],
    rows: literatureRows(list),
    caption:
      '本索引不构成对这些文献观点的背书；引用时以原文为准。条目按来源年份排列，未收录无法溯源的材料。',
  });
}

/* ================================================================== */
/* 三、项目对比                                                        */
/* ================================================================== */

function peerTitleCell(project: PeerProject): string {
  const label = `<strong>${escapeHtml(project.name)}</strong>`;
  return project.href
    ? `<a href="${escapeHtml(project.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : label;
}

function peerTableHtml(): string {
  return table({
    columns: ['项目', '方向', '形态', '与本平台的关系'],
    rows: peerProjects.map((project) => [
      peerTitleCell(project),
      escapeHtml(project.direction),
      escapeHtml(project.form),
      escapeHtml(project.relation),
    ]),
    caption:
      '以上项目均为真实公开项目；本表只作格局对比（landscape comparison），不构成评价、推荐或合作关系声明。',
  });
}

/* ================================================================== */
/* 引用规范                                                            */
/* ================================================================== */

function citationFormat(): string {
  return [
    '# 引用本页收录的文献：以原文出处为准，本页只提供索引',
    'Authors. Title. Year. DOI 或出版社页面。',
    '',
    '# 引用本纲领自己的文档：必须给出编号与版本号',
    '永生计划研究纲领平台. <文档编号与版本>（<发布或更新日期>）. 检索自本站.',
    '',
    '# 版本号不可省略（草稿版本会继续改动）',
    'PRT-002 · TES 身份置信曲线协议 v0.8.0（2026-09-18）',
    `政策类文档同样带版本：${site.policyVersion} · ${site.policyDate}`,
  ].join('\n');
}

/* ================================================================== */
/* 骨架                                                                */
/* ================================================================== */

interface LiteratureState {
  /** 术语检索词 */
  q: string;
  /** 文献领域筛选，空字符串表示全部 */
  field: string;
}

const LIT_FIELDS: string[] = Array.from(new Set(literature.map((e) => e.field)));

function fieldCount(field: string): number {
  return literature.filter((e) => e.field === field).length;
}

function initState(query: URLSearchParams): LiteratureState {
  const field = query.get('field') ?? '';
  return {
    q: query.get('q') ?? '',
    field: LIT_FIELDS.includes(field) ? field : '',
  };
}

/** URL 查询串：术语检索与领域筛选共用一个状态源。 */
function stateQuery(state: LiteratureState): string {
  const sp = new URLSearchParams();
  if (state.q.trim()) sp.set('q', state.q.trim());
  if (state.field) sp.set('field', state.field);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function fieldChipsHtml(state: LiteratureState): string {
  const chips = [
    `<button class="chip" type="button" data-action="filter-field" data-field="" aria-pressed="${state.field === ''}">全部 <span class="chip-count">${literature.length}</span></button>`,
    ...LIT_FIELDS.map(
      (field) =>
        `<button class="chip" type="button" data-action="filter-field" data-field="${escapeHtml(field)}" aria-pressed="${state.field === field}">${escapeHtml(field)} <span class="chip-count">${fieldCount(field)}</span></button>`,
    ),
  ];
  return `<div class="filter-chips" data-field-chips role="group" aria-label="按领域筛选文献">${chips.join('')}</div>`;
}

function html(state: LiteratureState): string {
  const entry = nav.find((n) => n.path === '/literature');
  const hero = pageHero({
    kicker: entry?.kicker ?? '文献 · Literature',
    title: '站在已有的论证与路线上',
    lead: '术语表、关键文献索引与现有项目对比。索引只收录可核实来源的公开文献，不设下载镜像，不收录无法溯源的材料。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '文献' }],
  });

  return `
    ${hero}

    <section class="section" aria-label="术语表">
      <div class="container">
        ${sectionHead({
          label: '术语表',
          title: '纲领使用的关键概念',
          lead: '术语口径统一是讨论的前提。下列定义为本纲领的约定用法；与协议相关的术语直接给出交叉引用。',
        })}
        <div class="toolbar" role="search">
          <div class="input-group" style="flex:1;min-width:220px">
            <label class="sr-only" for="glossary-search">检索术语</label>
            <input class="input input--search" id="glossary-search" type="search" name="q"
                   data-action="search-term" placeholder="检索术语、英文别名或定义…"
                   value="${escapeHtml(state.q)}" autocomplete="off" />
          </div>
          <p class="result-count" data-glossary-count>共 ${glossary.length} 条术语</p>
        </div>
        <div data-glossary-results>${glossaryResultsHtml(glossary)}</div>
      </div>
    </section>

    <section class="section section--alt" aria-label="关键文献索引">
      <div class="container">
        ${sectionHead({
          label: '关键文献索引',
          title: '本纲领的论证与路线参照',
          lead: '按哲学、意识科学、技术路线三类组织。获取方式为学术数据库或出版社；本页不设下载镜像。',
        })}
        ${fieldChipsHtml(state)}
        <div data-lit-results>${literatureTableHtml(literature)}</div>
        <p class="note">本索引不构成对这些文献观点的背书；引用时以原文为准。有 DOI 者给出规范标识，无法确认者一律省略，不编造。</p>
      </div>
    </section>

    <section class="section" aria-label="项目对比">
      <div class="container">
        ${sectionHead({
          label: '项目对比',
          title: '永生领域的现有格局与本平台的位置',
          lead: '现有机构集中在四个方向：保存（冷冻）、延长（抗衰老）、倡导（超人类主义）、分析（哲学）。迁移永生的可检验协议不在任何机构的议程上。',
        })}
        ${peerTableHtml()}
      </div>
    </section>

    <section class="section section--alt" aria-label="本站的位置">
      <div class="container">
        ${sectionHead({
          label: '本站的位置',
          title: '四个方向之外的空缺',
          lead: '把上面的对比画成一张图：现有项目分布在四个方向，而迁移永生的可检验协议不在其中任何一个的议程上。',
        })}
        ${renderDiagram('domain-map', { caption: '永生领域的现有方向与本平台的位置（示意图，不代表实验数据或测量结果）。' })}
        <div class="stack" style="margin-top:24px">
          <p>
            四个方向——保存（冷冻）、延长（抗衰老）、倡导（超人类主义）、分析（哲学）——都不是无能，
            而是各自的目标不同：保存押注未来的复苏技术，延长关注衰老机制，倡导面向公众说服，
            分析停留在概念澄清。它们都不发布「可被反证」的迁移协议，因为那既不是它们的承诺，
            也不是它们能承担的风险。
          </p>
          <p>
            这正是本纲领占据的位置：把「迁移」写成带测量、预注册与停止规则的协议，公开发布，
            允许任何人复现并反驳。换句话说，本纲领的主张只有一条——
            <strong>协议是公开的，因此是可检验的</strong>。
          </p>
        </div>
        ${callout({
          variant: 'boundary',
          title: '空位不等于价值',
          text: '一处没有人站的位置，不会因为空着就自动变得有价值。无人认领可能是因为它太难、太早，或者根本不成立——这三种可能本纲领都承认。因此这里不主张「空缺即机会」，只主张一件可以被核查的事：这些协议已经发布，任何人可以按它复现、反驳或推翻。至于迁移永生最终是否成立，本页不作判断，也没有能力作判断。',
        })}
      </div>
    </section>

    <section class="section" aria-label="引用规范">
      <div class="container-narrow">
        ${sectionHead({
          label: '引用规范',
          title: '如何引用本页与本纲领的文档',
          lead: '两种引用对象的规则不同：收录的文献以原文出处为准，本纲领自己的文档必须带版本号。',
        })}
        ${callout({
          variant: 'note',
          title: '为什么版本号必须写',
          text: '本纲领的协议与政策文档都在继续修订：引用时只写编号而不写版本号，两个月后可能指向一份不同的文本。协议编号给出「是哪一份文档」，版本号给出「是哪一版」——两者缺一不可。草案状态的版本尤其如此。',
        })}
        ${codeBlock(citationFormat(), { language: 'text', caption: '引用格式（文献 / 本纲领文档 / 版本号示例）' })}
      </div>
    </section>`;
}

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

export function render(ctx: RouteContext): PageResult {
  return {
    html: html(initState(ctx.query)),
    title: '文献',
    description: nav.find((n) => n.path === '/literature')?.description,
    path: '/literature',
    mount: (root) => {
      const state = initState(ctx.query);

      const input = root.querySelector<HTMLInputElement>('[data-action="search-term"]');
      const termResults = root.querySelector<HTMLElement>('[data-glossary-results]');
      const litResults = root.querySelector<HTMLElement>('[data-lit-results]');
      const chipsEl = root.querySelector<HTMLElement>('[data-field-chips]');
      let timer = 0;

      /** 按 `data-*` 属性成批替换一段片段（不整页重绘，避免搜索框失焦）。 */
      const replace = (host: HTMLElement | null, markup: string): void => {
        if (!host) return;
        const template = document.createElement('template');
        template.innerHTML = markup;
        host.replaceChildren(...Array.from(template.content.childNodes));
      };

      const apply = (): void => {
        window.clearTimeout(timer);
        timer = 0;

        /* 术语检索：term / alias / definition 三处任一命中即可（多词为「同时满足」）。 */
        const terms = tokenize(state.q);
        const matched = glossary.filter((t) => {
          if (!terms.length) return true;
          const hay = [t.term, t.alias ?? '', t.definition].join(' ').toLowerCase();
          return terms.every((word) => hay.includes(word));
        });

        const marked = terms.length
          ? matched.map((t) => ({
              ...t,
              term: highlight(t.term, terms[0] ?? ''),
              definition: highlight(t.definition, terms[0] ?? ''),
            }))
          : matched;

        if (input && input.value !== state.q) input.value = state.q;
        replace(termResults, glossaryResultsHtml(marked));

        /* 文献领域筛选 */
        const list = state.field ? literature.filter((e) => e.field === state.field) : literature;
        replace(litResults, literatureTableHtml(list));

        /* chips 的按下态 */
        if (chipsEl) {
          for (const chip of Array.from(chipsEl.querySelectorAll<HTMLButtonElement>('[data-action="filter-field"]'))) {
            chip.setAttribute('aria-pressed', String((chip.dataset.field ?? '') === state.field));
          }
        }

        /* 镜像进 URL：可分享、可刷新 */
        const url = `${window.location.pathname}${stateQuery(state)}${window.location.hash}`;
        window.history.replaceState(null, '', url);
      };

      const onInput = (): void => {
        state.q = input?.value ?? '';
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, 120);
      };

      const onClick = (event: Event): void => {
        const target = event.target as Element | null;
        const chip = target?.closest?.('[data-action="filter-field"]');
        if (!chip) return;
        state.field = chip.getAttribute('data-field') ?? '';
        if (input) state.q = input.value;
        apply();
      };

      input?.addEventListener('input', onInput);
      root.addEventListener('click', onClick);

      /* 首屏对齐一次：URL 已由路由层反映初始状态，这里只保证结果与状态一致 */
      apply();

      return () => {
        window.clearTimeout(timer);
        input?.removeEventListener('input', onInput);
        root.removeEventListener('click', onClick);
      };
    },
  };
}
