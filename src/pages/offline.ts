/**
 * 离线兜底页（PWA）
 * ================
 *
 * 这一页可能在任何时刻、没有任何网络的情况下被打开，因此刻意写得小：
 *   · 只 import kit 里的组件与 `nav` 常量（它们随应用外壳一起被缓存），
 *     不读取 `localStorage`、不请求任何资源、不依赖图片；
 *   · 只列出主导航（`nav.filter(n => n.primary)`）—— 这些是访问过本站的人
 *     最可能已经缓存过的页面，列出来比列全部路由更有用；
 *   · 提供一个重新加载按钮，恢复网络后一键重试。
 *
 * 文案与 public/offline.html（应用外壳尚未缓存时的兜底页）保持一致的口径：
 * 能读已访问过的内容，读不到从未访问的页面与外部链接。
 *
 * 所有来自数据的文本：或经 `escapeHtml()`，或由组件内部转义。
 */

import {
  nav,
  pageHero,
  sectionHead,
  callout,
  refItem,
  icon,
} from '../components/kit';
import type { RouteContext } from '../core/router';

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

/** 主导航项 → 交叉引用条目；描述缺失时给出中性的兜底说明。 */
function primaryRefs(): string {
  return nav
    .filter((n) => n.primary)
    .map((n) =>
      refItem({
        href: n.path,
        title: n.label,
        desc: n.description ? n.description : `${n.latin ?? ''}`.trim(),
        iconName: 'book',
      }),
    )
    .join('');
}

/* ================================================================== */
/* 骨架                                                                */
/* ================================================================== */

function html(): string {
  const hero = pageHero({
    kicker: '离线 · Offline',
    title: '当前离线',
    lead: '网络连接不可用。本站是纯静态的研究纲领发布平台，没有后端依赖——你已经访问过的页面仍然可以正常阅读。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '离线' }],
  });

  return `
    ${hero}

    <section class="section" aria-label="现在是什么情况">
      <div class="container-narrow">
        ${sectionHead({
          label: '现在是什么情况',
          title: '应用已装在这台设备上',
          lead: '本站以渐进式网络应用（PWA）形式发布：首次访问后，应用外壳、样式字体与已经浏览过的内容会被浏览器的 Service Worker 缓存在本机。',
        })}
        ${callout({
          variant: 'note',
          title: '可以做什么，不能做什么',
          items: [
            '**可以**：浏览此前加载过的协议、实验、文献与博客文章——包括它们的正文与图示，全部来自本机缓存。',
            '**可以**：使用检索、筛选、书签与批注，这些都在本机完成，不需要网络。',
            '**不能**：从未访问过的页面无法加载；指向外部文献的链接（出版社、arXiv、DOI 解析）也打不开。',
            '**离线阅读不会写入任何服务器**——因为本站根本没有服务器，也没有第三方统计脚本。',
          ],
        })}
        <p class="note">
          缓存不会自动变新：恢复到网络后重新加载一次本页，才会获取最新版本的内容与协议版本号。
        </p>
      </div>
    </section>

    <section class="section section--alt" aria-label="可能已缓存的页面">
      <div class="container-narrow">
        ${sectionHead({
          label: '可能已缓存的页面',
          title: '主要入口',
          lead: '下面这些是站点的主要页面。若你已经浏览过，它们在离线状态下都能打开。',
        })}
        <div class="ref-list">${primaryRefs()}</div>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="offline-retry-title">
      <div class="container-narrow">
        <h2 class="sec-label" id="offline-retry-title">恢复连接后</h2>
        <p>网络恢复后点击下面的按钮重新加载；若仍在离线状态，本页会再次出现，不会丢失你已经打开的内容。</p>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn--primary" type="button" data-action="reload">${icon('refresh')}重新加载</button>
          <a class="btn btn--ghost" href="/">返回首页</a>
        </div>
      </div>
    </section>`;
}

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

export function render(ctx: RouteContext): PageResult {
  return {
    html: html(),
    title: '离线',
    description: '当前离线。本站是纯静态站点，已经访问过的页面仍可阅读。',
    /* 用实际路径作 canonical：本页可能挂在 /offline，也可能被路由层复用为其它离线入口。 */
    path: ctx.path,
    mount: (root) => {
      const onReload = (): void => {
        window.location.reload();
      };

      const button = root.querySelector<HTMLButtonElement>('[data-action="reload"]');
      button?.addEventListener('click', onReload);

      return () => {
        button?.removeEventListener('click', onReload);
      };
    },
  };
}
