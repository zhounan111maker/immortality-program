/**
 * 通用 UI 片段（渲染为 HTML 字符串）
 * ============================================================
 * 本项目不使用框架，页面通过模板字符串组合这些片段。
 * 约定：
 *   · 所有函数返回受信任的 HTML 字符串
 *   · 一切动态文本必须先经 escapeHtml / inline 处理
 *   · 交互行为通过 data-action / data-* 属性声明，
 *     由各页面在渲染后统一绑定（或在 main.ts 里做事件委托）
 */

import { inline, escapeHtml, formatDate, EXPERIMENT_STATUS_LABEL, PUBLICATION_STATUS_LABEL, percent } from '../core/format';
import { icon, type IconName } from './icons';
import type { AccentKey } from '../types/content';

/* ------------------------------------------------------------------ */
/* 基础片段                                                            */
/* ------------------------------------------------------------------ */

/** 章节标题：档案编号式 */
export function sectionHead(opts: {
  label: string;
  title: string;
  lead?: string;
  center?: boolean;
}): string {
  return `
    <div class="section-head${opts.center ? ' section-head--center' : ''}">
      <p class="sec-label">${escapeHtml(opts.label)}</p>
      <h2 class="sec-title">${escapeHtml(opts.title)}</h2>
      ${opts.lead ? `<p class="sec-lead">${inline(opts.lead)}</p>` : ''}
    </div>`;
}

/** 标签 / 徽章 */
export function tag(text: string, tone: AccentKey | 'brand' | 'gold' | 'alert' | 'muted' = 'muted'): string {
  const cls = tone === 'brand' ? ' tag--brand' : tone === 'gold' ? ' tag--gold' : tone === 'alert' ? ' tag--alert' : ' tag--muted';
  return `<span class="tag${cls}">${escapeHtml(text)}</span>`;
}

export function badge(text: string, variant: 'draft' | 'brand' | 'muted' | 'alert' = 'brand'): string {
  const cls = variant === 'draft' ? ' badge--draft' : variant === 'muted' ? ' badge--muted' : variant === 'alert' ? ' badge--alert' : '';
  return `<span class="badge${cls}">${escapeHtml(text)}</span>`;
}

/** 状态徽章（实验 / 发布状态） */
export function statusBadge(
  status: string,
  map: Record<string, { label: string; tone: string }> = EXPERIMENT_STATUS_LABEL,
): string {
  const meta = map[status] ?? { label: status, tone: 'muted' };
  const dot = status === 'running' ? 'running' : status === 'design' ? 'design' : status === 'blocked' ? 'blocked' : 'pending';
  return `<span class="tag tag--${meta.tone === 'brand' ? 'brand' : meta.tone === 'gold' ? 'gold' : meta.tone === 'alert' ? 'alert' : 'muted'}">
    <span class="status-dot status-dot--${dot}" aria-hidden="true"></span>${escapeHtml(meta.label)}</span>`;
}

export function publicationBadge(status: string): string {
  return statusBadge(status, PUBLICATION_STATUS_LABEL);
}

/** 卡片 */
export function card(opts: {
  href?: string;
  accent?: AccentKey;
  no?: string;
  title: string;
  body: string;
  foot?: string;
  meta?: string;
  iconName?: IconName;
  titleTag?: 'h3' | 'h4';
  className?: string;
}): string {
  const tagName = opts.titleTag ?? 'h3';
  const accentCls = opts.accent ? ` card--accent-${opts.accent}` : '';
  const linkCls = opts.href ? ' card--link' : '';
  const cls = `card${linkCls}${accentCls}${opts.className ? ' ' + opts.className : ''}`;

  const inner = `
    ${opts.iconName ? `<div class="card-icon">${icon(opts.iconName)}</div>` : ''}
    ${opts.no ? `<span class="card-no">${escapeHtml(opts.no)}</span>` : ''}
    ${opts.meta ? `<div class="card-meta">${opts.meta}</div>` : ''}
    <${tagName}>${escapeHtml(opts.title)}</${tagName}>
    <p>${inline(opts.body)}</p>
    ${opts.foot ? `<div class="card-foot">${opts.foot}</div>` : ''}`;

  return opts.href
    ? `<a class="${cls}" href="${escapeHtml(opts.href)}">${inner}</a>`
    : `<div class="${cls}">${inner}</div>`;
}

/** 强调框 */
export function callout(opts: {
  variant: 'boundary' | 'note' | 'warning' | 'principle' | 'quote';
  title?: string;
  text?: string;
  items?: string[];
}): string {
  const titleIcon: Record<string, IconName> = {
    boundary: 'scale',
    note: 'info',
    warning: 'warning',
    principle: 'target',
    quote: 'note',
  };
  const heading =
    opts.variant === 'boundary' && !opts.title ? '解释边界' : (opts.title ?? '');
  return `
    <div class="callout callout--${opts.variant}">
      ${heading ? `<p class="callout-title">${icon(titleIcon[opts.variant] ?? 'info')}${escapeHtml(heading)}</p>` : ''}
      ${opts.text ? `<p>${inline(opts.text)}</p>` : ''}
      ${opts.items?.length ? `<ul>${opts.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>` : ''}
    </div>`;
}

/** 引用块 */
export function quoteBlock(text: string, attribution?: string): string {
  return `
    <blockquote class="quote-block">
      <p>「${escapeHtml(text)}」</p>
      ${attribution ? `<p class="who">—— ${escapeHtml(attribution)}</p>` : ''}
    </blockquote>`;
}

/** 代码块（带复制按钮） */
export function codeBlock(code: string, opts: { language?: string; caption?: string } = {}): string {
  return `
    <div class="code-block">
      ${opts.caption ? `<p class="code-caption">${escapeHtml(opts.caption)}</p>` : ''}
      <pre class="code"${opts.language ? ` data-lang="${escapeHtml(opts.language)}"` : ''}><code>${escapeHtml(code)}</code></pre>
      <button class="copy-btn" type="button" data-copy="${escapeHtml(code)}" aria-label="复制这段代码">${icon('copy')}复制</button>
    </div>`;
}

/** 表格（移动端自动堆叠为卡片） */
export function table(opts: {
  columns: string[];
  rows: string[][];
  widths?: number[];
  caption?: string;
  stack?: boolean;
}): string {
  const colgroup = opts.widths?.length
    ? `<colgroup>${opts.widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup>`
    : '';

  const head = `<thead><tr>${opts.columns
    .map((c) => `<th scope="col">${escapeHtml(c)}</th>`)
    .join('')}</tr></thead>`;

  const body = `<tbody>${opts.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, i) => {
            const label = opts.columns[i] ?? '';
            return `<td data-label="${escapeHtml(label)}">${inline(cell)}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('')}</tbody>`;

  return `
    <div class="table-wrap">
      <div class="table-scroll">
        <table class="${opts.stack === false ? '' : 'table--stack'}">${colgroup}${head}${body}</table>
      </div>
      ${opts.caption ? `<p class="table-caption">${escapeHtml(opts.caption)}</p>` : ''}
    </div>`;
}

/** 指标卡组 */
export function metrics(items: { value: string; label: string; note?: string }[]): string {
  return `<div class="metrics">${items
    .map(
      (m) => `
      <div class="metric">
        <b>${escapeHtml(m.value)}</b>
        <span>${escapeHtml(m.label)}</span>
        ${m.note ? `<small>${escapeHtml(m.note)}</small>` : ''}
      </div>`,
    )
    .join('')}</div>`;
}

/** 阅读进度条 */
export function progressBar(value: number | undefined, gold = false): string {
  const pct = value === undefined ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return `
    <div class="progress${gold ? ' progress--gold' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="就绪度 ${percent(value)}">
      <div class="progress-bar" style="width:${pct}%"></div>
    </div>`;
}

/** 空状态 */
export function emptyState(opts: { title: string; text: string; action?: string }): string {
  return `
    <div class="empty-state">
      ${icon('search')}
      <h3>${escapeHtml(opts.title)}</h3>
      <p>${inline(opts.text)}</p>
      ${opts.action ?? ''}
    </div>`;
}

/** 定义列表（术语） */
export function definitions(items: { term: string; definition: string }[]): string {
  return `<dl class="glossary-grid">${items
    .map(
      (d) => `
      <div class="gloss-item">
        <dt>${escapeHtml(d.term)}</dt>
        <dd>${inline(d.definition)}</dd>
      </div>`,
    )
    .join('')}</dl>`;
}

/** FAQ 折叠面板 */
export function faqList(items: { question: string; answer: string; defaultOpen?: boolean }[]): string {
  return `<div class="faq-list">${items
    .map(
      (f) => `
      <details class="faq"${f.defaultOpen ? ' open' : ''}>
        <summary>${escapeHtml(f.question)}</summary>
        <div class="faq-a"><p>${inline(f.answer)}</p></div>
      </details>`,
    )
    .join('')}</div>`;
}

/** 时间轴 */
export function timeline(
  items: {
    phase: string;
    period: string;
    title: string;
    text: string;
    items?: string[];
    status?: 'done' | 'active' | 'planned';
  }[],
): string {
  return `<div class="timeline">${items
    .map(
      (t, i) => `
      <div class="timeline-item" data-status="${t.status ?? (i === 0 ? 'active' : 'planned')}">
        <div class="timeline-marker" aria-hidden="true"></div>
        <div class="timeline-body">
          <div class="timeline-phase">
            <strong>${escapeHtml(t.phase)}</strong>
            <span>${escapeHtml(t.period)}</span>
          </div>
          <h4>${escapeHtml(t.title)}</h4>
          <p>${inline(t.text)}</p>
          ${t.items?.length ? `<ul>${t.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>`,
    )
    .join('')}</div>`;
}

/** 交叉引用条目 */
export function refItem(opts: { href: string; title: string; desc?: string; iconName?: IconName }): string {
  return `
    <a class="ref-item" href="${escapeHtml(opts.href)}">
      ${icon(opts.iconName ?? 'file')}
      <span class="ref-item-body">
        <span class="ref-item-title">${escapeHtml(opts.title)}</span>
        ${opts.desc ? `<span class="ref-item-desc">${inline(opts.desc)}</span>` : ''}
      </span>
    </a>`;
}

/** 面包屑 */
export function breadcrumb(items: { label: string; href?: string }[]): string {
  return `<ol class="breadcrumb">${items
    .map((it, i) =>
      i === items.length - 1
        ? `<li aria-current="page">${escapeHtml(it.label)}</li>`
        : `<li><a href="${escapeHtml(it.href ?? '/')}">${escapeHtml(it.label)}</a></li>`,
    )
    .join('')}</ol>`;
}

/** 子页页头 */
export function pageHero(opts: {
  kicker: string;
  title: string;
  lead?: string;
  breadcrumbItems?: { label: string; href?: string }[];
  extra?: string;
}): string {
  return `
    <section class="page-hero">
      <div class="page-hero-inner">
        ${opts.breadcrumbItems?.length ? breadcrumb(opts.breadcrumbItems) : ''}
        <p class="hero-kicker">${escapeHtml(opts.kicker)}</p>
        <h1>${escapeHtml(opts.title)}</h1>
        ${opts.lead ? `<p class="p-lead">${inline(opts.lead)}</p>` : ''}
        ${opts.extra ?? ''}
      </div>
    </section>`;
}

/** 事实列表（协议 / 实验头部） */
export function factGrid(facts: { label: string; value: string; href?: string }[]): string {
  return `<dl class="doc-facts">${facts
    .map(
      (f) => `
      <div class="doc-fact">
        <dt>${escapeHtml(f.label)}</dt>
        <dd>${
          f.href
            ? `<a href="${escapeHtml(f.href)}">${escapeHtml(f.value)}</a>`
            : escapeHtml(f.value)
        }</dd>
      </div>`,
    )
    .join('')}</dl>`;
}

/** 图标按钮 */
export function iconButton(opts: {
  action: string;
  label: string;
  iconName: IconName;
  pressed?: boolean;
  extra?: string;
}): string {
  return `<button class="icon-btn" type="button" data-action="${escapeHtml(opts.action)}" aria-label="${escapeHtml(opts.label)}"${
    opts.pressed !== undefined ? ` aria-pressed="${opts.pressed}"` : ''
  }${opts.extra ?? ''}>${icon(opts.iconName)}</button>`;
}

/** 阅读时长 */
export function readingTime(minutes: number): string {
  return `<span class="nowrap">${icon('clock')} 约 ${minutes} 分钟</span>`;
}

/** 日期显示 */
export function dateLabel(iso: string, prefix = '更新于'): string {
  return `<time datetime="${escapeHtml(iso)}">${prefix} ${formatDate(iso)}</time>`;
}
