/**
 * 协议索引页 —— `/protocols`
 * ============================================================
 * 这一页回答三个问题：
 *   1. 一份协议要满足什么标准才会被发布在这里（`principles`，每条都带
 *      「在本站的体现」——即该原则当前可核查的执行位置）；
 *   2. 当前在册的是哪几份协议，各自什么状态、预注册还差多少、还有几项没有冻结；
 *   3. 这些版本意味着什么：三份全是草案，**尚不存在冻结版本**。
 *
 * 过滤器（标签 / 状态）在 `mount` 里通过切换卡片外层容器的 `hidden` 实现，
 * 并把筛选状态镜像进 URL 查询串；初始状态从 `ctx.query` 读取。
 *
 * 为什么 `hidden` 不加在卡片自身：`.card--link` 的 `display:flex` 会压过
 * 浏览器默认的 `[hidden] { display:none }`（作者样式优先于 UA 样式），
 * 所以每张卡片外面必须有一层不带 display 样式的容器。
 *
 * 所有来自数据的文本都经 `escapeHtml()` / `inline()` / 组件内部转义，
 * 不存在裸插值。
 */

import {
  protocols,
  principles,
  posts,
  nav,
  escapeHtml,
  inline,
  percent,
  badge,
  tag,
  card,
  callout,
  sectionHead,
  pageHero,
  dateLabel,
  progressBar,
  publicationBadge,
  PUBLICATION_STATUS_LABEL,
} from '../components/kit';
import type { RouteContext } from '../core/router';
import type { Protocol, ResearchPrinciple } from '../components/kit';

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

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

const FALLBACK_KICKER = '协议 · Protocols';

/** 协议原文里这一页的标题（不是导航标签「协议」）。 */
const HERO_TITLE = '可检验的协议，是纲领的立足点';

/* ------------------------------------------------------------------ */
/* 小工具                                                              */
/* ------------------------------------------------------------------ */

function statusText(status: string): string {
  return PUBLICATION_STATUS_LABEL[status]?.label ?? status;
}

/** 当前在册协议的标签分布。 */
function tagCounts(): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of protocols) {
    for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 当前在册协议的发布状态分布。 */
function statusCounts(): { status: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of protocols) map.set(p.status, (map.get(p.status) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

/* ------------------------------------------------------------------ */
/* 区块一：发布标准（原则 + 可核查的执行位置）                          */
/* ------------------------------------------------------------------ */

function principleCard(p: ResearchPrinciple): string {
  const evidence = p.evidence
    ? `<p class="note">在本站的体现：${inline(p.evidence)}</p>`
    : '';
  return card({
    no: p.no,
    title: p.title,
    body: p.text,
    foot: evidence,
  });
}

function standardSection(): string {
  return `
    <section class="section" aria-label="协议发布标准">
      ${sectionHead({
        label: '发布标准 · Publication standard',
        title: '一份文档要满足什么，才会作为协议出现在这里',
        lead: `以下 ${principles.length} 条是本站对协议的最低要求。每条原则后面都附上它在本站的实际执行位置——原则如果不可核查，就只是口号。`,
      })}
      <div class="grid-2">
        ${principles.map(principleCard).join('')}
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块二：协议清单（富卡片 + 过滤器）                                  */
/* ------------------------------------------------------------------ */

function protocolCard(p: Protocol): string {
  const openCount = p.openItems?.length ?? 0;

  const meta = [
    badge(p.version, 'muted'),
    publicationBadge(p.status),
    ...p.tags.map((t) => tag(t, 'muted')),
  ].join('');

  /* 卡片页脚：角色、就绪度、待冻结项、更新时间。
     待冻结项数量是草案协议最有决策价值的事实，因此单独成行并给出配色。 */
  const foot = `
    <div class="stack-sm">
      <p class="note">${inline(p.role)}</p>
      <div class="cluster">
        <span class="mono">${escapeHtml(percent(p.readiness))}</span>
        <span class="note">预注册就绪度</span>
      </div>
      ${progressBar(p.readiness, p.accent === 'gold')}
      <div class="cluster">
        ${tag(`${openCount} 项待冻结`, openCount > 0 ? 'alert' : 'muted')}
      </div>
      <p class="note">${dateLabel(p.updatedAt)}</p>
    </div>`;

  return card({
    href: `/protocols/${p.id}`,
    accent: p.accent,
    no: p.code,
    title: p.title,
    meta,
    body: p.summary,
    foot,
  });
}

/** 卡片外层容器：只承载筛选所需的 data 属性，不带任何 display 样式。 */
function protocolCardWrapper(p: Protocol): string {
  return `
    <div data-protocol-card data-tags="${escapeHtml(p.tags.join('|'))}" data-status="${escapeHtml(
      p.status,
    )}">
      ${protocolCard(p)}
    </div>`;
}

function filterChip(o: {
  group: 'tag' | 'status';
  value: string;
  label: string;
  count: number;
  pressed: boolean;
}): string {
  return `<button class="chip" type="button" data-action="filter" data-group="${o.group}" data-value="${escapeHtml(
    o.value,
  )}" aria-pressed="${o.pressed}">${escapeHtml(o.label)} <span class="chip-count">${o.count}</span></button>`;
}

interface FilterState {
  /** 标签筛选，空字符串表示全部 */
  tag: string;
  /** 发布状态筛选，空字符串表示全部 */
  status: string;
}

/** 从 URL 查询串恢复筛选状态；无效值一律回落为「全部」，不制造空列表错觉。 */
function initState(query: URLSearchParams): FilterState {
  const rawTag = query.get('tag') ?? '';
  const rawStatus = query.get('status') ?? '';
  return {
    tag: protocols.some((p) => p.tags.includes(rawTag)) ? rawTag : '',
    status: protocols.some((p) => p.status === rawStatus) ? rawStatus : '',
  };
}

function stateQuery(state: FilterState): string {
  const sp = new URLSearchParams();
  if (state.tag) sp.set('tag', state.tag);
  if (state.status) sp.set('status', state.status);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function visibleCount(state: FilterState): number {
  return protocols.filter(
    (p) =>
      (!state.tag || p.tags.includes(state.tag)) &&
      (!state.status || p.status === state.status),
  ).length;
}

function filterBar(state: FilterState): string {
  const tagChips = [
    filterChip({
      group: 'tag',
      value: '',
      label: '全部标签',
      count: protocols.length,
      pressed: state.tag === '',
    }),
    ...tagCounts().map((t) =>
      filterChip({
        group: 'tag',
        value: t.name,
        label: t.name,
        count: t.count,
        pressed: state.tag === t.name,
      }),
    ),
  ].join('');

  const statusChips = [
    filterChip({
      group: 'status',
      value: '',
      label: '全部状态',
      count: protocols.length,
      pressed: state.status === '',
    }),
    ...statusCounts().map((s) =>
      filterChip({
        group: 'status',
        value: s.status,
        label: statusText(s.status),
        count: s.count,
        pressed: state.status === s.status,
      }),
    ),
  ].join('');

  return `
    <div class="toolbar" role="group" aria-label="筛选协议清单">
      <div class="filter-chips" role="group" aria-label="按标签筛选">${tagChips}</div>
      <div class="filter-chips" role="group" aria-label="按发布状态筛选">${statusChips}</div>
      <p class="result-count" data-result-count>显示 ${visibleCount(state)} / ${protocols.length} 份协议</p>
    </div>
    <p class="note">
      筛选条件会写进地址栏，可以复制分享。这份清单包含本站当前在册的全部协议——没有隐藏条目。
    </p>`;
}

function listSection(state: FilterState): string {
  const drafts = protocols.filter((p) => p.status === 'draft').length;
  return `
    <section class="section" aria-labelledby="protocol-list-title">
      <h2 class="sec-title" id="protocol-list-title">协议清单</h2>
      <p class="sec-lead">
        当前在册 ${protocols.length} 份，其中 ${drafts} 份处于草案状态。
        每张卡片上的「预注册就绪度」与「待冻结项」直接来自文档内容：数字偏低的协议并没有被藏起来，它们就是本站目前的实际进度。
      </p>
      ${filterBar(state)}
      <div class="grid-auto" data-protocol-list>
        ${protocols.map(protocolCardWrapper).join('')}
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块三：状态与版本说明                                              */
/* ------------------------------------------------------------------ */

function versionSection(): string {
  const deviationPost = posts.find((p) => p.id === 'post-4');
  const link = deviationPost
    ? `[${deviationPost.title}](/blog/post-4)`
    : '[协议偏差：已发布协议的修改如何留痕](/blog/post-4)';

  return `
    <section class="section section--tight" aria-labelledby="protocol-version-title">
      <h2 class="sec-title" id="protocol-version-title">状态与版本说明</h2>
      ${callout({
        variant: 'note',
        title: '三份协议目前都是草案，尚不存在冻结版本',
        text:
          `**PRT-001、PRT-002、PRT-003 全部标记为「草案」**：它们的版本号（v0.9.0 / v0.8.0 / v0.7.0）都低于 v1.0，预注册清单尚未冻结。` +
          '任何修改都会记录在各自文档的变更日志里，作为一次**协议偏差**（protocol deviation）留下痕迹，不会静默修订历史版本。' +
          `因此，这里没有任何内容应当被当作已确定的规格、结论或验收标准；在冻结之前，任何依据这些文档作出的验收结论都不成立。变更控制的具体做法见 ${link}。`,
      })}
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

export function render(ctx: RouteContext): PageResult {
  const entry = nav.find((n) => n.path === '/protocols');
  const state = initState(ctx.query);

  const hero = pageHero({
    kicker: entry?.kicker ?? FALLBACK_KICKER,
    title: HERO_TITLE,
    lead: entry?.description,
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '协议' }],
  });

  return {
    html: `
      ${hero}
      <div class="container">
        ${standardSection()}
        ${listSection(state)}
        ${versionSection()}
      </div>`,
    title: '协议',
    description: entry?.description,
    path: '/protocols',
    mount: (root) => {
      const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-protocol-card]'));
      const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="filter"]'));
      const counter = root.querySelector<HTMLElement>('[data-result-count]');

      /** 应用筛选：切换卡片的 hidden、同步 chips 按下态、更新计数与地址栏。 */
      const apply = (): void => {
        let shown = 0;
        for (const el of cards) {
          const tags = (el.dataset.tags ?? '').split('|').filter(Boolean);
          const status = el.dataset.status ?? '';
          const visible = (!state.tag || tags.includes(state.tag)) && (!state.status || status === state.status);
          el.hidden = !visible;
          if (visible) shown += 1;
        }

        for (const chip of chips) {
          const group = chip.dataset.group;
          const value = chip.dataset.value ?? '';
          chip.setAttribute('aria-pressed', String(value === (group === 'status' ? state.status : state.tag)));
        }

        if (counter) {
          counter.textContent =
            shown === 0
              ? `当前筛选下没有协议（共 ${cards.length} 份），可切换到「全部」`
              : `显示 ${shown} / ${cards.length} 份协议`;
        }

        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${stateQuery(state)}${window.location.hash}`,
        );
      };

      const onClick = (event: Event): void => {
        const target = (event.target as Element | null)?.closest?.('[data-action="filter"]');
        if (!target) return;
        const group = target.getAttribute('data-group');
        const value = target.getAttribute('data-value') ?? '';
        if (group === 'status') {
          state.status = state.status === value ? '' : value;
        } else {
          state.tag = state.tag === value ? '' : value;
        }
        apply();
      };

      root.addEventListener('click', onClick);
      apply();

      return () => root.removeEventListener('click', onClick);
    },
  };
}
