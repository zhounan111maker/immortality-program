/**
 * 协议详情页 —— `/protocols/:id`
 * ============================================================
 * 页面结构（顺序有意为之）：
 *   1. 页头：面包屑 + 协议编号 + 标题 + 导语；
 *   2. 文档卡：`doc-head`（编号 / 标题 / 版本 / 状态 / 标签 / 更新日期）
 *      → `factGrid`（版本、状态、日期、就绪度、待冻结项数、角色）
 *      → **解释边界声明**（三组 callout，紧跟事实区，放在页面上部，
 *        因为它是纲领对这份文档最重要的一条声明）；
 *   3. `doc-layout`：`doc-main`（正文用 `renderSections()` 渲染）+ 粘性目录侧栏；
 *   4. 变更日志（结构化 `changelog`，追加式，不静默修订）；
 *   5. 待冻结事项（草案状态如实标注，冻结前不产生验收结论）；
 *   6. 相关协议 / 实验；
 *   7. 本文档操作条（打印 / 导出 / 引用 / 收藏）；
 *   8. 许可与引用说明。
 *
 * 文档正文一律交给 `renderSections()`，本文件不手写章节标记。
 * 找不到协议时返回一个**正常的未找到页面**（列出可用编号），不抛异常。
 */

import {
  protocols,
  experiments,
  site,
  escapeHtml,
  inline,
  percent,
  formatDate,
  dateLabel,
  badge,
  tag,
  callout,
  table,
  factGrid,
  refItem,
  pageHero,
  renderSections,
  renderToc,
  emptyState,
  icon,
  progressBar,
  publicationBadge,
  markRead,
  recordVisit,
  isBookmarked,
  toggleBookmark,
  toast,
  printDocument,
  EXPERIMENT_STATUS_LABEL,
  PUBLICATION_STATUS_LABEL,
} from '../components/kit';
import type { RouteContext } from '../core/router';
import type { Experiment, Protocol } from '../components/kit';

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

const FALLBACK_KICKER = '协议 · Protocols';

/* ------------------------------------------------------------------ */
/* 表格单元格里的受控富文本                                            */
/* ------------------------------------------------------------------ */
/*
 * `table()` 会把每个单元格交给 `inline()`，而 `inline()` 的第一步是转义
 * HTML —— 这是正确的默认行为，但也意味着无法直接往单元格里放组件 HTML。
 * 因此这里用 U+0000 包住的占位符占住位置（`inline()` 不会改动它），
 * 等 `table()` 产出 HTML 后再把占位符换回受控标签。
 * 效果：单元格里的数据依然先被转义，同时「破坏性变更」标签与嵌套列表
 * 又能以真实组件形式呈现。占位符不可能出现在内容数据里。
 */
const CELL_BREAKING_OPEN = '\u0000bo\u0000';
const CELL_BREAKING_CLOSE = '\u0000bc\u0000';
const CELL_UL_OPEN = '\u0000uo\u0000';
const CELL_LI = '\u0000li\u0000';
const CELL_UL_CLOSE = '\u0000uc\u0000';

/** 把若干明细条目编码成一个「列表」占位符。 */
function detailsCell(items: string[]): string {
  return CELL_UL_OPEN + items.join(CELL_LI) + CELL_UL_CLOSE;
}

/** 把占位符换回真实标签（只作用于 `table()` 的产物）。 */
function restoreCellHtml(html: string): string {
  return html
    .split(CELL_BREAKING_OPEN)
    .join('<span class="tag tag--alert">')
    .split(CELL_BREAKING_CLOSE)
    .join('</span>')
    .split(CELL_UL_OPEN)
    .join('<ul><li>')
    .split(CELL_LI)
    .join('</li><li>')
    .split(CELL_UL_CLOSE)
    .join('</li></ul>');
}

/* ------------------------------------------------------------------ */
/* 小工具                                                              */
/* ------------------------------------------------------------------ */

function statusText(status: string): string {
  return PUBLICATION_STATUS_LABEL[status]?.label ?? status;
}

/** 引用串格式：`永生计划研究纲领（2026）。PRT-001 · HES 实验规格，v0.9.0。` */
function citation(p: Protocol): string {
  return `${site.name}研究纲领（${site.establishedYear}）。${p.code} · ${p.title}，${p.version}。`;
}

/** 用户可控的 URL 片段在展示前去掉行内标记字符，避免它被当成标记渲染。 */
function safeSegment(raw: string): string {
  return raw.replace(/[[\]()*`]/g, '');
}

/** 剪贴板：优先 Clipboard API，不可用时退回隐藏 textarea，均失败则返回 false。 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落到下面的降级路径 */
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'readonly');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '-2000px';
  document.body.appendChild(area);
  let ok = false;
  try {
    area.select();
    ok = typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    area.remove();
  }
  return ok;
}

/** 触发浏览器下载一个 UTF-8 文本文件（无后端、无外部依赖）。 */
function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ------------------------------------------------------------------ */
/* 区块：解释边界声明（页面上部，紧跟事实区）                          */
/* ------------------------------------------------------------------ */

function boundarySection(p: Protocol): string {
  return `
    <section class="doc-section" data-boundary aria-labelledby="protocol-boundary-title">
      <h3 id="protocol-boundary-title">解释边界声明</h3>
      <p>每份协议在发布时都必须声明它能回答什么、不能回答什么，以及哪些结论属于过度推论。这是本纲领对这份文档最重要的一条声明，因此放在正文之前。</p>
      <div class="stack-sm">
        ${callout({
          variant: 'boundary',
          title: '能回答',
          items: p.boundary.canAnswer,
        })}
        ${callout({
          variant: 'boundary',
          title: '不能回答',
          items: p.boundary.cannotAnswer,
        })}
        ${callout({
          variant: 'boundary',
          title: '过度推论红线',
          items: p.boundary.redLines,
        })}
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块：变更日志                                                      */
/* ------------------------------------------------------------------ */

function changelogSection(p: Protocol): string {
  const rows = p.changelog.map((entry) => {
    const version = entry.breaking
      ? `${CELL_BREAKING_OPEN}破坏性变更${CELL_BREAKING_CLOSE} ${entry.version}`
      : entry.version;
    const details = entry.details?.length ? detailsCell(entry.details) : '—';
    return [version, formatDate(entry.date, 'full'), entry.summary, details];
  });

  const html = table({
    columns: ['版本', '日期', '变更', '详细'],
    widths: [16, 20, 34, 30],
    rows,
    caption: '变更日志是追加式记录：历史条目只增不改，任何修订都作为新条目出现，既往版本不会被静默改写。',
  });

  return `
    <section class="section section--tight" aria-labelledby="protocol-changelog-title">
      <h2 class="sec-title" id="protocol-changelog-title">变更日志</h2>
      <p class="sec-lead">
        本页当前的版本是 ${escapeHtml(p.version)}（更新于 ${escapeHtml(formatDate(p.updatedAt, 'full'))}）。
        下面每一行都是一次留痕：修改已发布协议时，改动本身必须可被第三方核查。
      </p>
      ${restoreCellHtml(html)}
      <p class="note">
        ${inline(
          '修改的记录方式即「协议偏差」：偏差本身不是问题，不被记录才是问题。相关说明见 [协议偏差：已发布协议的修改如何留痕](/blog/post-4)。',
        )}
      </p>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块：待冻结事项                                                    */
/* ------------------------------------------------------------------ */

function openItemsSection(p: Protocol): string {
  const items = p.openItems ?? [];
  if (!items.length) return '';

  return `
    <section class="section section--tight" aria-labelledby="protocol-open-title">
      <h2 class="sec-title" id="protocol-open-title">待冻结事项</h2>
      <div class="cluster">
        <span class="mono">${escapeHtml(percent(p.readiness))}</span>
        <span class="note">预注册就绪度</span>
      </div>
      ${progressBar(p.readiness, p.accent === 'gold')}
      ${callout({
        variant: 'warning',
        title: `${items.length} 项尚未决定`,
        text:
          '以下条目在本版本中**尚未决定**，它们不是已确定的程序。在 v1.0 冻结之前，' +
          '任何人都不得依据本协议作出验收结论，也不得把这些条目的现状表述为研究结果。',
        items,
      })}
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块：相关协议 / 实验                                                */
/* ------------------------------------------------------------------ */

function relatedSection(p: Protocol): string {
  const relatedProtocols = (p.relatedProtocols ?? [])
    .map((id) => protocols.find((x) => x.id === id))
    .filter((x): x is Protocol => Boolean(x));

  const relatedExperiments = (p.relatedExperiments ?? [])
    .map((code) => experiments.find((e) => e.code === code || e.id === code))
    .filter((e): e is Experiment => Boolean(e));

  if (!relatedProtocols.length && !relatedExperiments.length) return '';

  const items = [
    ...relatedProtocols.map((x) =>
      refItem({
        href: `/protocols/${x.id}`,
        title: `${x.code} · ${x.title}`,
        desc: `协议 ｜ ${x.version} ｜ ${statusText(x.status)} ｜ 最近更新 ${formatDate(x.updatedAt)}`,
        iconName: 'book',
      }),
    ),
    ...relatedExperiments.map((e) =>
      refItem({
        href: '/experiments',
        title: `${e.code} · ${e.title}`,
        desc: `实验 ｜ ${EXPERIMENT_STATUS_LABEL[e.status]?.label ?? e.status} ｜ 更新于 ${formatDate(e.updatedAt)}`,
        iconName: 'flask',
      }),
    ),
  ].join('');

  return `
    <section class="section section--tight" aria-labelledby="protocol-related-title">
      <h2 class="sec-title" id="protocol-related-title">相关协议 / 实验</h2>
      <div class="ref-list">${items}</div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 区块：本文档操作条                                                  */
/* ------------------------------------------------------------------ */

function actionsSection(p: Protocol): string {
  const bookmarked = isBookmarked(p.id);
  return `
    <section class="section section--tight" aria-labelledby="protocol-actions-title">
      <h2 class="sec-label" id="protocol-actions-title">本文档操作</h2>
      <div class="cluster">
        <button class="btn btn--ghost" type="button" data-action="print">${icon('printer')}打印 / 导出 PDF</button>
        <button class="btn btn--ghost" type="button" data-action="export-md">${icon('download')}导出 Markdown</button>
        <button class="btn btn--ghost" type="button" data-action="cite">${icon('copy')}复制引用</button>
        <button class="btn btn--ghost" type="button" data-action="bookmark" aria-pressed="${bookmarked}">${icon(
          bookmarked ? 'bookmarkFilled' : 'bookmark',
        )}${bookmarked ? '已收藏' : '收藏'}</button>
      </div>
      <p class="note">
        引用格式：<span class="mono">${escapeHtml(citation(p))}</span>
        收藏与阅读记录只写在这台设备的浏览器里（localStorage），不会上传到任何服务器。
      </p>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* 导出文本（页面正文的纯文本 + 版本信息）                              */
/* ------------------------------------------------------------------ */

function exportText(p: Protocol, root: HTMLElement): string {
  const main = root.querySelector<HTMLElement>('[data-doc-root]');
  const body = (main?.innerText ?? '').replace(/\n{3,}/g, '\n\n').trim();

  return [
    `# ${p.code} · ${p.title}`,
    '',
    `> 版本 ${p.version} ｜ 状态：${statusText(p.status)} ｜ 最近更新 ${formatDate(p.updatedAt, 'full')}`,
    `> 站点：${site.name} · ${site.tagline} ｜ 许可：${site.license}`,
    `> 导出时间：${new Date().toISOString()}`,
    '> 说明：本站尚未发布 Markdown 源文件，此文件由页面正文文本导出；正式引用请以网站上带版本号的页面为准。',
    '',
    body || '（正文文本未能读取，请在页面上手动复制。）',
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* 阅读进度条 + 目录高亮                                               */
/* ------------------------------------------------------------------ */

/** 顶部阅读进度条元素（宽度由脚本按阅读深度更新）。 */
function progressElement(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  return bar;
}

function trackProgress(bar: HTMLElement, root: HTMLElement): () => void {
  const target = root.querySelector<HTMLElement>('[data-doc-root]');
  let frame = 0;

  const update = (): void => {
    frame = 0;
    if (!target) {
      bar.style.width = '0%';
      return;
    }
    const rect = target.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    // 从正文顶部进入视口起，到正文底部离开视口为止，映射为 0 → 1。
    const total = Math.max(rect.height - viewport * 0.35, 1);
    const passed = Math.min(Math.max(viewport * 0.35 - rect.top, 0), total);
    bar.style.width = `${Math.round((passed / total) * 100)}%`;
  };

  const schedule = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

/**
 * 目录高亮：观察每个 `doc-section`，把当前章节写进对应的 `[data-toc-link]`。
 * 优先用 IntersectionObserver；环境不支持时退回滚动位置判断。
 */
function trackToc(root: HTMLElement): () => void {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  if (!links.length) return () => {};

  const byId = new Map<string, HTMLAnchorElement>();
  for (const a of links) {
    const id = a.getAttribute('data-toc-link');
    if (id) byId.set(id, a);
  }

  /* 只观察真的有目录条目的章节（正文里的边界声明区块不属于目录）。 */
  const sections = Array.from(root.querySelectorAll<HTMLElement>('.doc-section')).filter((s) =>
    byId.has(s.id),
  );
  if (!sections.length) return () => {};

  const setCurrent = (id: string): void => {
    for (const [key, a] of byId) a.setAttribute('aria-current', String(key === id));
  };

  if (typeof IntersectionObserver === 'function') {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = sections.find((s) => visible.has(s.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }

  let frame = 0;
  const sync = (): void => {
    frame = 0;
    let current = sections[0]?.id ?? '';
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= 140) current = s.id;
    }
    if (current) setCurrent(current);
  };
  const schedule = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(sync);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  sync();

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
  };
}

/* ------------------------------------------------------------------ */
/* 未找到协议                                                          */
/* ------------------------------------------------------------------ */

function notFound(ctx: RouteContext): PageResult {
  const asked = safeSegment(ctx.params.id ?? '');
  const links = protocols
    .map((p) => `[${p.code} · ${p.title}](/protocols/${p.id})`)
    .join('；');

  const hero = pageHero({
    kicker: FALLBACK_KICKER,
    title: '未找到该协议',
    lead: '这个地址没有对应的协议文档：编号可能写错了，或者这份协议尚未公开。本站目前只发布在册的协议，未发布的内容不会以占位形式出现。',
    breadcrumbItems: [
      { label: '首页', href: '/' },
      { label: '协议', href: '/protocols' },
      { label: '未找到' },
    ],
  });

  return {
    html: `
      ${hero}
      <div class="container section">
        ${emptyState({
          title: '没有这份协议',
          text: `请求的编号：${asked}。当前在册的协议共 ${protocols.length} 份——${links}。`,
          action: '<a class="btn btn--primary" href="/protocols">返回协议清单</a>',
        })}
      </div>`,
    title: '未找到协议',
    description: `本站没有编号为「${asked}」的协议；协议清单页列出了当前在册的全部协议，且都标注为草案。`,
  };
}

/* ------------------------------------------------------------------ */
/* 协议详情                                                            */
/* ------------------------------------------------------------------ */

function renderProtocol(p: Protocol): PageResult {
  const openCount = p.openItems?.length ?? 0;

  const hero = pageHero({
    kicker: p.code,
    title: p.title,
    lead: p.lead,
    breadcrumbItems: [
      { label: '首页', href: '/' },
      { label: '协议', href: '/protocols' },
      { label: p.code },
    ],
  });

  const headMeta = [
    badge(p.version, 'muted'),
    publicationBadge(p.status),
    ...p.tags.map((t) => tag(t, 'muted')),
    dateLabel(p.updatedAt),
  ].join('');

  const facts = factGrid([
    { label: '版本', value: p.version },
    { label: '状态', value: statusText(p.status) },
    { label: '发布日期', value: formatDate(p.publishedAt, 'full') },
    { label: '最近更新', value: formatDate(p.updatedAt, 'full') },
    { label: '预注册就绪度', value: percent(p.readiness) },
    { label: '待冻结项', value: openCount > 0 ? `${openCount} 项` : '无' },
    { label: '角色', value: p.role },
  ]);

  const html = `
    ${hero}
    <div class="container section">
      <div class="doc-layout">
        <div class="doc-main">
          <div data-doc-root>
            <article class="doc-page" aria-labelledby="protocol-doc-title">
              <header class="doc-head">
                <div>
                  <span class="doc-id">${escapeHtml(p.code)}</span>
                  <h2 id="protocol-doc-title">${escapeHtml(p.title)}</h2>
                  <div class="doc-head-meta">${headMeta}</div>
                </div>
              </header>
              ${facts}
              <div class="doc-body stack-lg">
                ${boundarySection(p)}
                ${renderSections(p.sections)}
              </div>
            </article>
            ${changelogSection(p)}
            ${openItemsSection(p)}
            ${relatedSection(p)}
          </div>
          ${actionsSection(p)}
          <p class="note">
            ${inline(
              `许可与引用：本站协议文档采用 ${site.license} 许可，可复制、分发与改编，但需署名。` +
                `引用时**必须写明版本号**（本页为 ${p.version}）——协议是有版本的文档，不写版本的引用无法对应到任何一套具体程序；` +
                `引用串可直接用本节按钮复制。邮箱与仓库地址（${site.repository}）目前都是**占位符**，域名也尚未确定，` +
                `因此页面地址不是可长期稳定的正式 URL；需要长期引用时，请以「${p.code} · ${p.title}，${p.version}」为准。`,
            )}
          </p>
        </div>
        ${renderToc(p.sections, { label: '本页目录' })}
      </div>
    </div>`;

  return {
    html,
    title: `${p.code} · ${p.title}`,
    description: p.summary,
    path: `/protocols/${p.id}`,
    mount: (root) => {
      /* 阅读状态与足迹 */
      markRead(p.id);
      recordVisit(`/protocols/${p.id}`, p.title);

      /* 顶部阅读进度条 */
      const bar = progressElement();
      root.appendChild(bar);
      const stopProgress = trackProgress(bar, root);

      /* 目录高亮 */
      const stopToc = trackToc(root);

      /* 操作条 */
      const printBtn = root.querySelector<HTMLButtonElement>('[data-action="print"]');
      const exportBtn = root.querySelector<HTMLButtonElement>('[data-action="export-md"]');
      const citeBtn = root.querySelector<HTMLButtonElement>('[data-action="cite"]');
      const bookmarkBtn = root.querySelector<HTMLButtonElement>('[data-action="bookmark"]');

      const onPrint = (): void => {
        printDocument();
        toast('已调用打印：在打印对话框里选择「另存为 PDF」即可归档本文档。', { tone: 'info' });
      };

      const onExport = (): void => {
        const filename = `${p.code}-${p.version}.md`;
        downloadTextFile(filename, exportText(p, root));
        toast(`已导出 ${filename}（页面正文的纯文本 + 版本信息）。`, { tone: 'success' });
      };

      const onCite = (): void => {
        void copyText(citation(p)).then((ok) => {
          toast(ok ? `已复制引用串：${citation(p)}` : '无法自动复制，请手动选择并复制引用串。', {
            tone: ok ? 'success' : 'warn',
          });
        });
      };

      const onBookmark = (): void => {
        const saved = toggleBookmark({
          id: p.id,
          kind: 'protocol',
          title: `${p.code} ${p.title}`,
          path: `/protocols/${p.id}`,
        });
        if (bookmarkBtn) {
          bookmarkBtn.setAttribute('aria-pressed', String(saved));
          bookmarkBtn.innerHTML = `${icon(saved ? 'bookmarkFilled' : 'bookmark')}${saved ? '已收藏' : '收藏'}`;
        }
        toast(saved ? '已加入本机收藏（仅保存在这台设备上）。' : '已从本机收藏中移除。', {
          tone: saved ? 'success' : 'info',
        });
      };

      printBtn?.addEventListener('click', onPrint);
      exportBtn?.addEventListener('click', onExport);
      citeBtn?.addEventListener('click', onCite);
      bookmarkBtn?.addEventListener('click', onBookmark);

      /* 清理：滚动监听、观察器、进度条、按钮绑定 */
      return () => {
        stopProgress();
        stopToc();
        printBtn?.removeEventListener('click', onPrint);
        exportBtn?.removeEventListener('click', onExport);
        citeBtn?.removeEventListener('click', onCite);
        bookmarkBtn?.removeEventListener('click', onBookmark);
        bar.remove();
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

export function render(ctx: RouteContext): PageResult {
  const p = protocols.find((x) => x.id === ctx.params.id);
  if (!p) return notFound(ctx);
  return renderProtocol(p);
}
