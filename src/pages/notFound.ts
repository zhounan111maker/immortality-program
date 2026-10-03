/**
 * 404 页面 —— 未匹配任何路由时渲染
 * ============================================================
 * 404 页也属于这份纲领的一部分，因此它遵守同样的两条规则：
 *   1. 不说假话：不假装页面「正在建设中」，不承诺「即将上线」；
 *   2. 给出可继续的路径：列出全部主导航入口，并把当前路径原样回显，
 *      方便访问者复制反馈。
 *
 * 说明（写给维护者，不是页面文案）：
 *  `PageResult`（见 docs/PAGE-CONTRACT.md 第 1 节）目前没有 `noindex` 字段，
 *  元数据层对每个页面都写入 `index,follow`。这里按契约能做的只有：
 *  · 不返回 `path`，避免为这个不存在的地址生成 canonical；
 *  · 返回一段诚实的 `description`，说明请求的地址没有内容。
 *  如果要让 404 真正输出 `<meta name="robots" content="noindex">`，
 *  需要在 `core/meta.ts` / 路由层加一个 `noindex` 通道——那不属于页面文件。
 */

import { nav, escapeHtml, inline, refItem, emptyState, pageHero } from '../components/kit';
import type { RouteContext } from '../core/router';
import type { IconName } from '../components/kit';

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

/** 导航入口 → 图标（只是视觉提示，不承载语义）。 */
const NAV_ICON: Record<string, IconName> = {
  '/home': 'home',
  '/protocols': 'book',
  '/experiments': 'flask',
  '/literature': 'library',
  '/blog': 'note',
  '/about': 'info',
  '/contact': 'mail',
  '/deploy': 'layers',
  '/legal': 'shield',
};

/** 展示用清理：去掉可能被误读为标记的字符（escapeHtml 仍会再兜一层）。 */
function safePath(raw: string): string {
  return raw.replace(/[<>&"'`]/g, '');
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

export function render(ctx: RouteContext): PageResult {
  const primary = nav.filter((n) => n.primary);
  const asked = safePath(ctx.path);

  const hero = pageHero({
    kicker: '404',
    title: '没有找到这个页面',
    lead: '这个地址在站内没有对应的内容。可能是链接已经变了，也可能是地址里有一处笔误。本站只发布在册的文档，不存在被隐藏的页面。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '未找到' }],
  });

  const links = primary
    .map((n) =>
      refItem({
        href: n.path,
        title: n.label,
        desc: n.description,
        iconName: NAV_ICON[n.path] ?? 'file',
      }),
    )
    .join('');

  const html = `
    ${hero}
    <div class="container section">
      ${emptyState({
        title: '这个地址没有内容',
        text: '可以从下方的主要入口继续浏览；也可以使用页头的搜索找到具体的协议、实验或文章。',
        action: '<a class="btn btn--primary" href="/">返回首页</a>',
      })}

      <section class="section section--tight" aria-labelledby="notfound-links-title">
        <h2 class="sec-title" id="notfound-links-title">站内主要入口</h2>
        <div class="ref-list">${links}</div>
      </section>

      <section class="section section--tight" aria-labelledby="notfound-path-title">
        <h2 class="sec-title" id="notfound-path-title">你访问的地址</h2>
        <p class="note">${inline('如果这个地址来自站内的某个链接，那就是本站的疏忽——请把下面这一行原样反馈给我们。')}</p>
        <p class="mono">${escapeHtml(asked)}</p>
      </section>
    </div>`;

  return {
    html,
    title: '页面未找到',
    description: `这个地址没有对应的页面：${asked}。站内主要入口与当前路径列在页面上，便于继续浏览或反馈。`,
  };
}
