/**
 * 应用外壳
 * ============================================================
 * 负责整站的「容器」部分：页头、导航、抽屉、搜索面板、页脚、
 * 移动端底部导航，以及全局交互（复制、主题、字号）。
 *
 * 页面模块只关心 #view-root 里的内容，不动外壳。
 */

import { nav, site } from '../content/site';
import { complianceNotice, complianceLink } from '../content/legal';
import { icon, type IconName } from './icons';
import { escapeHtml } from '../core/format';
import { preferences, storage, type ThemeMode } from '../core/store';
import { buildIndex, search, groupHits } from '../core/search';
import { onPwaChange, canInstall, promptInstall, watchInstallPrompt, activateUpdate, getPwaState } from '../core/pwa';
import { toast } from '../core/toast';

/* ------------------------------------------------------------------ */
/* 主题                                                                */
/* ------------------------------------------------------------------ */

const THEME_ORDER: ThemeMode[] = ['auto', 'light', 'dark'];
const THEME_LABEL: Record<ThemeMode, string> = { auto: '主题：跟随系统', light: '主题：浅色', dark: '主题：深色' };

/** 应用主题到 <html>；auto 时清除手动覆盖，交给 CSS 媒体查询 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const dark =
      mode === 'dark' ||
      (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', dark ? '#132019' : '#0E5F4F');
  }
}

const FONT_SCALE_PX: Record<string, string> = { sm: '15px', base: '16px', lg: '17.5px' };

export function applyFontScale(scale: string): void {
  document.documentElement.style.fontSize = FONT_SCALE_PX[scale] ?? '16px';
}

/* ------------------------------------------------------------------ */
/* 页头 / 页脚 / 移动导航 / 抽屉 / 搜索面板                              */
/* ------------------------------------------------------------------ */

function brandMark(): string {
  return `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="var(--brand)"/><circle cx="16" cy="16" r="8" fill="none" stroke="var(--gold)" stroke-width="2.4"/><circle cx="16" cy="16" r="2.6" fill="var(--gold)"/></svg>`;
}

function headerHtml(): string {
  const primary = nav.filter((n) => n.primary);
  return `
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="${escapeHtml(site.name)}研究纲领平台 首页">
        ${brandMark()}
        <span class="brand-text">${escapeHtml(site.name)}<small>${escapeHtml(site.tagline)}</small></span>
      </a>

      <nav class="nav-desktop" aria-label="主导航">
        ${primary
          .map((n) => `<a class="nav-link" href="${escapeHtml(n.path)}">${escapeHtml(n.label)}</a>`)
          .join('')}
      </nav>

      <div class="header-actions">
        <button class="search-trigger" type="button" data-action="open-search" aria-label="检索全站内容">
          ${icon('search')}<span class="only-desktop">检索</span><kbd class="only-desktop">/</kbd>
        </button>
        <button class="icon-btn" type="button" data-action="cycle-theme" aria-label="${THEME_LABEL.auto}">
          ${icon('contrast')}
        </button>
        <button class="icon-btn only-mobile" type="button" data-action="open-drawer" aria-label="打开菜单" aria-expanded="false">
          ${icon('menu')}
        </button>
      </div>
    </div>
    <div id="banner-stack"></div>
  </header>`;
}

function drawerHtml(): string {
  return `
  <div class="drawer" id="app-drawer" hidden>
    <div class="drawer-backdrop" data-action="close-drawer"></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="站点导航">
      <div class="drawer-head">
        <h2>导航</h2>
        <button class="icon-btn" type="button" data-action="close-drawer" aria-label="关闭菜单">${icon('close')}</button>
      </div>
      <nav class="drawer-nav" aria-label="全部页面">
        ${nav
          .map(
            (n) => `
          <a class="drawer-link" href="${escapeHtml(n.path)}" data-nav-path="${escapeHtml(n.path)}">
            ${icon(iconForPath(n.path))}
            <span>${escapeHtml(n.label)}${n.latin ? `<small class="mono" style="display:block;font-size:.68rem;color:var(--muted)">${escapeHtml(n.latin)}</small>` : ''}</span>
          </a>`,
          )
          .join('')}
      </nav>
      <div class="drawer-section">
        <h3>显示</h3>
        <div class="cluster">
          <button class="chip" type="button" data-action="set-theme" data-theme-mode="auto">跟随系统</button>
          <button class="chip" type="button" data-action="set-theme" data-theme-mode="light">浅色</button>
          <button class="chip" type="button" data-action="set-theme" data-theme-mode="dark">深色</button>
        </div>
        <h3 style="margin-top:20px">正文字号</h3>
        <div class="cluster">
          <button class="chip" type="button" data-action="set-font" data-font-scale="sm">小</button>
          <button class="chip" type="button" data-action="set-font" data-font-scale="base">标准</button>
          <button class="chip" type="button" data-action="set-font" data-font-scale="lg">大</button>
        </div>
      </div>
      <div class="drawer-section">
        <button class="btn btn--ghost btn--block" type="button" data-action="install-app">${icon('install')}安装为应用</button>
      </div>
    </aside>
  </div>`;
}

function mobileNavHtml(): string {
  const items: { path: string; label: string; iconName: IconName }[] = [
    { path: '/', label: '首页', iconName: 'home' },
    { path: '/protocols', label: '协议', iconName: 'book' },
    { path: '/experiments', label: '实验', iconName: 'flask' },
    { path: '/blog', label: '博客', iconName: 'note' },
  ];
  return `
  <nav class="mobile-nav" aria-label="快捷导航">
    ${items
      .map(
        (it) => `
      <a href="${it.path}" data-nav-path="${it.path}">
        ${icon(it.iconName)}<span>${it.label}</span>
      </a>`,
      )
      .join('')}
    <button type="button" data-action="open-search">
      ${icon('search')}<span>检索</span>
    </button>
  </nav>`;
}

function searchOverlayHtml(): string {
  return `
  <div class="overlay" id="search-overlay" hidden role="dialog" aria-modal="true" aria-label="检索全站内容">
    <div class="search-panel">
      <div class="search-head">
        ${icon('search')}
        <input class="search-input" id="search-input" type="search" placeholder="检索协议、实验、博客、术语、文献…"
               autocomplete="off" autocorrect="off" spellcheck="false" aria-label="检索关键词" aria-controls="search-results">
        <button class="search-close" type="button" data-action="close-search" aria-label="关闭检索">Esc</button>
      </div>
      <div class="search-results" id="search-results" role="listbox" aria-label="检索结果"></div>
      <div class="search-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>Enter</kbd> 打开</span>
        <span><kbd>Esc</kbd> 关闭</span>
        <span class="result-count" id="search-count"></span>
      </div>
    </div>
  </div>`;
}

function footerHtml(): string {
  const cols: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: '平台',
      links: nav
        .filter((n) => ['/protocols', '/experiments', '/literature', '/blog'].includes(n.path))
        .map((n) => ({ label: n.label, href: n.path })),
    },
    {
      title: '资源',
      links: nav
        .filter((n) => ['/about', '/contact', '/deploy', '/legal'].includes(n.path))
        .map((n) => ({ label: n.label, href: n.path })),
    },
    {
      title: '联系',
      links: [
        { label: site.email, href: `mailto:${site.email}` },
        { label: 'GitHub 仓库（占位）', href: site.repository, external: true },
        { label: '订阅研究进展', href: '/contact' },
      ],
    },
  ];

  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <p class="footer-brand">${brandMark()}${escapeHtml(site.name)}</p>
        <p class="footer-about">${escapeHtml(site.description)}</p>
        <p class="footer-about" style="font-size:.8rem">本站不提供任何服务，不构成医疗、投资或法律建议。</p>
      </div>
      ${cols
        .map(
          (c) => `
        <div class="footer-col">
          <h4>${escapeHtml(c.title)}</h4>
          ${c.links
            .map(
              (l) =>
                `<a href="${escapeHtml(l.href)}"${l.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(l.label)}</a>`,
            )
            .join('')}
        </div>`,
        )
        .join('')}
    </div>
    <div class="footer-bottom">
      <div class="footer-bottom-inner">
        <span>© <span id="footer-year">2026</span> ${escapeHtml(site.name)}研究纲领平台 · 内容采用 ${escapeHtml(site.license)} 许可</span>
        <span>政策 ${escapeHtml(site.policyVersion)} · ${escapeHtml(site.policyDate)} 生效 · <a href="/legal">条款与隐私</a></span>
      </div>
    </div>
  </footer>`;
}

function complianceHtml(): string {
  return `
  <section class="compliance">
    <div class="compliance-inner">
      ${icon('shield')}
      <span>${escapeHtml(complianceNotice)}<a href="${escapeHtml(complianceLink.href)}">${escapeHtml(complianceLink.label)}</a>。</span>
    </div>
  </section>`;
}

function iconForPath(path: string): IconName {
  switch (path) {
    case '/':
    case '/home':
      return 'home';
    case '/protocols':
      return 'book';
    case '/experiments':
      return 'flask';
    case '/literature':
      return 'library';
    case '/blog':
      return 'note';
    case '/about':
      return 'compass';
    case '/contact':
      return 'mail';
    case '/deploy':
      return 'layers';
    case '/legal':
      return 'scale';
    default:
      return 'file';
  }
}

/* ------------------------------------------------------------------ */
/* 外壳装配                                                            */
/* ------------------------------------------------------------------ */

/** 渲染外壳到 #app，并返回 #view-root 供路由使用 */
export function mountShell(): HTMLElement {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app 不存在，无法挂载应用');

  app.innerHTML = `
    ${headerHtml()}
    ${drawerHtml()}
    <main id="view-root" tabindex="-1"></main>
    ${complianceHtml()}
    ${footerHtml()}
    ${mobileNavHtml()}
    ${searchOverlayHtml()}
    <div class="toast-region" id="global-toast-region" role="status" aria-live="polite"></div>`;

  // 首屏骨架屏移除
  document.getElementById('boot-fallback')?.remove();

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const root = document.getElementById('view-root');
  if (!root) throw new Error('#view-root 创建失败');
  return root;
}

/** 标记当前导航项 */
export function markActiveNav(path: string): void {
  // 归一化：/home → /、/protocols/p01 → /protocols
  const top = '/' + (path.split('/').filter(Boolean)[0] ?? '');

  document.querySelectorAll<HTMLAnchorElement>('[data-nav-path]').forEach((a) => {
    const p = a.getAttribute('data-nav-path') ?? '';
    const normalized = p === '/home' ? '/' : p;
    const isActive = normalized === path || normalized === top;
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ------------------------------------------------------------------ */
/* 全局交互                                                            */
/* ------------------------------------------------------------------ */

function openDrawer(): void {
  const drawer = document.getElementById('app-drawer');
  if (!drawer) return;
  drawer.hidden = false;
  document.body.style.overflow = 'hidden';
  drawer.querySelector<HTMLElement>('[data-action="close-drawer"]')?.focus();
}

function closeDrawer(): void {
  const drawer = document.getElementById('app-drawer');
  if (!drawer) return;
  drawer.hidden = true;
  document.body.style.overflow = '';
  document.querySelector<HTMLElement>('[data-action="open-drawer"]')?.setAttribute('aria-expanded', 'false');
}

/* ---- 搜索面板 ---- */

let searchActiveIndex = 0;

function openSearch(): void {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  const input = document.getElementById('search-input') as HTMLInputElement | null;
  if (input) {
    input.value = '';
    input.focus();
  }
  renderSearchResults('');
}

function closeSearch(): void {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = '';
}

function renderSearchResults(query: string): void {
  const container = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');
  if (!container) return;

  const q = query.trim();

  if (!q) {
    // 空查询时给出「可检索范围」的说明，而不是一片空白
    const index = buildIndex();
    const counts = index.reduce<Record<string, number>>((acc, d) => {
      acc[d.kindLabel] = (acc[d.kindLabel] ?? 0) + 1;
      return acc;
    }, {});
    container.innerHTML = `
      <p class="search-group-label">可检索的内容</p>
      <div style="padding:4px 12px 14px">
        <div class="cluster">
          ${Object.entries(counts)
            .map(([label, n]) => `<span class="tag tag--muted">${escapeHtml(label)} <span class="mono">${n}</span></span>`)
            .join('')}
        </div>
        <p class="note" style="margin-top:12px">支持中文关键词与协议编号（如 <span class="mono">PRT-001</span>、<span class="mono">EXP-001</span>）。多个关键词用空格分隔，需全部命中。</p>
      </div>`;
    if (countEl) countEl.textContent = `共 ${index.length} 条内容`;
    return;
  }

  const hits = search(q, { limit: 30 });

  if (!hits.length) {
    container.innerHTML = `
      <div class="empty-state" style="margin:12px">
        <h3>没有匹配的内容</h3>
        <p>试试更短的关键词，或改用协议编号检索（例如 PRT-001、EXP-001）。</p>
      </div>`;
    if (countEl) countEl.textContent = '0 条结果';
    return;
  }

  const groups = groupHits(hits);
  let flatIndex = 0;

  container.innerHTML = groups
    .map(
      (g) => `
      <p class="search-group-label">${escapeHtml(g.label)} · ${g.items.length}</p>
      ${g.items
        .map((h) => {
          const idx = flatIndex++;
          const excerpt = h.summary.length > 90 ? h.summary.slice(0, 90) + '…' : h.summary;
          return `
          <button class="search-item" type="button" role="option" data-search-index="${idx}" data-search-path="${escapeHtml(h.path)}" data-active="${idx === 0}">
            <span class="search-item-kind">${escapeHtml(h.kindLabel)}</span>
            <span class="search-item-body">
              <span class="search-item-title">${highlightInline(h.title, q)}</span>
              ${excerpt ? `<span class="search-item-desc">${highlightInline(excerpt, q)}</span>` : ''}
            </span>
          </button>`;
        })
        .join('')}`,
    )
    .join('');

  if (countEl) countEl.textContent = `${hits.length} 条结果`;
  searchActiveIndex = 0;
  container.scrollTop = 0;
}

/** 对已转义文本做关键词高亮（避免二次转义） */
function highlightInline(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 0);
  if (!terms.length) return escaped;
  let out = escaped;
  for (const t of terms) {
    const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      out = out.replace(new RegExp(safe, 'gi'), (m) => `<mark>${m}</mark>`);
    } catch {
      /* 忽略非法正则 */
    }
  }
  return out;
}

function moveSearchSelection(delta: number): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.search-item'));
  if (!items.length) return;

  searchActiveIndex = (searchActiveIndex + delta + items.length) % items.length;
  items.forEach((el, i) => el.setAttribute('data-active', String(i === searchActiveIndex)));

  const active = items[searchActiveIndex];
  active?.scrollIntoView({ block: 'nearest' });
}

function activateSearchSelection(): void {
  const el = document.querySelector<HTMLElement>(`.search-item[data-search-index="${searchActiveIndex}"]`);
  const path = el?.getAttribute('data-search-path');
  if (!path) return;
  closeSearch();
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ---- 复制 ---- */

async function copyText(text: string, label = '已复制'): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // 回退：部分浏览器在非安全上下文下没有 clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(label, { tone: 'success', duration: 2000 });
  } catch {
    toast('复制失败，请手动选择文本复制。', { tone: 'error' });
  }
}

/* ---- 横幅 ---- */

function renderBanners(): void {
  const host = document.getElementById('banner-stack');
  if (!host) return;

  const st = getPwaState();
  const banners: string[] = [];

  if (st.offline) {
    banners.push(`
      <div class="banner banner--offline">
        <span class="banner-icon">${icon('wifiOff')}</span>
        <span class="banner-text">当前离线。已缓存的页面仍可阅读。</span>
      </div>`);
  }

  if (st.updateReady) {
    banners.push(`
      <div class="banner banner--gold">
        <span class="banner-icon">${icon('refresh')}</span>
        <span class="banner-text">发现新版本的研究内容。</span>
        <span class="banner-actions">
          <button class="btn btn--sm btn--ghost" type="button" data-action="apply-update">立即刷新</button>
        </span>
      </div>`);
  }

  if (!st.standalone && canInstall() && !preferences.get().installPromptSeen) {
    banners.push(`
      <div class="banner banner--brand">
        <span class="banner-icon">${icon('install')}</span>
        <span class="banner-text">可以把本站安装为应用，离线也能阅读。</span>
        <span class="banner-actions">
          <button class="btn btn--sm btn--on-dark" type="button" data-action="install-app">安装</button>
          <button class="btn btn--sm btn--outline-dark" type="button" data-action="dismiss-install">以后再说</button>
        </span>
      </div>`);
  }

  host.innerHTML = banners.join('');
}

/* ------------------------------------------------------------------ */
/* 启动                                                                */
/* ------------------------------------------------------------------ */

/** 绑定全局交互。由 main.ts 调用一次。 */
export function initShell(): void {
  // ---- 主题与字号：先应用已保存的偏好，避免闪烁 ----
  const prefs = preferences.get();
  applyTheme(prefs.theme);
  applyFontScale(prefs.fontScale);

  // ---- 单一全局点击处理器：所有 data-action 集中在此 ----
  document.addEventListener('click', (e) => {
    const target = (e.target as Element | null)?.closest<HTMLElement>('[data-action]');
    if (!target) {
      // 点击抽屉外部区域时关闭抽屉
      return;
    }

    const action = target.getAttribute('data-action');

    switch (action) {
      case 'open-drawer':
        target.setAttribute('aria-expanded', 'true');
        openDrawer();
        break;

      case 'close-drawer':
        closeDrawer();
        break;

      case 'open-search':
        e.preventDefault();
        closeDrawer();
        openSearch();
        break;

      case 'close-search':
        closeSearch();
        break;

      case 'cycle-theme': {
        const current = preferences.get().theme;
        const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length]!;
        preferences.set({ theme: next });
        applyTheme(next);
        toast(THEME_LABEL[next], { tone: 'info', duration: 1600 });
        break;
      }

      case 'set-theme': {
        const mode = target.getAttribute('data-theme-mode') as ThemeMode | null;
        if (mode) {
          preferences.set({ theme: mode });
          applyTheme(mode);
          toast(THEME_LABEL[mode], { tone: 'info', duration: 1600 });
        }
        break;
      }

      case 'set-font': {
        const scale = target.getAttribute('data-font-scale') ?? 'base';
        preferences.set({ fontScale: scale as 'sm' | 'base' | 'lg' });
        applyFontScale(scale);
        toast('正文字号已更新', { tone: 'info', duration: 1600 });
        break;
      }

      case 'install-app': {
        void promptInstall().then((outcome) => {
          if (outcome === 'unavailable') {
            toast('当前浏览器未提供安装入口。可在浏览器菜单中选择「安装应用」或「添加到主屏幕」。', {
              tone: 'info',
              duration: 6000,
            });
          }
          preferences.set({ installPromptSeen: true });
          renderBanners();
        });
        break;
      }

      case 'dismiss-install':
        preferences.set({ installPromptSeen: true });
        renderBanners();
        break;

      case 'apply-update':
        activateUpdate(true);
        break;

      case 'dismiss-resume': {
        const path = target.getAttribute('data-path') ?? '';
        if (path) storage.set('resumeDismissed', path);
        target.closest('[data-resume-banner]')?.remove();
        break;
      }

      default:
        break;
    }
  });

  // ---- 复制按钮（全局委托，页面无需自己绑定） ----
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest<HTMLElement>('[data-copy]');
    if (!btn) return;
    const text = btn.getAttribute('data-copy') ?? '';
    if (!text) return;

    // 已复制状态的视觉反馈
    const original = btn.getAttribute('data-copied');
    btn.setAttribute('data-copied', 'true');
    window.setTimeout(() => {
      if (original === null) btn.removeAttribute('data-copied');
      else btn.setAttribute('data-copied', original);
    }, 1600);

    void copyText(text);
  });

  // ---- 搜索面板交互 ----
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    let debounce: number | undefined;
    searchInput.addEventListener('input', () => {
      if (debounce !== undefined) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => renderSearchResults(searchInput.value), 120);
    });
  }

  document.getElementById('search-results')?.addEventListener('click', (e) => {
    const item = (e.target as Element | null)?.closest<HTMLElement>('[data-search-path]');
    const path = item?.getAttribute('data-search-path');
    if (!path) return;
    closeSearch();
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // ---- 全局键盘快捷键 ----
  document.addEventListener('keydown', (e) => {
    const overlayOpen = !document.getElementById('search-overlay')?.hasAttribute('hidden');

    if (overlayOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSearchSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSearchSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activateSearchSelection();
      }
      return;
    }

    // "/" 或 Ctrl/Cmd+K 打开检索；只在非输入状态下触发
    const el = document.activeElement;
    const typing =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLElement && el.isContentEditable);

    if (!typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      openSearch();
      return;
    }

    if (e.key === 'Escape') {
      if (!document.getElementById('app-drawer')?.hasAttribute('hidden')) closeDrawer();
    }
  });

  // ---- 抽屉里的链接点击后关闭抽屉 ----
  document.getElementById('app-drawer')?.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest('a')) closeDrawer();
  });

  // ---- 视口变化时清理抽屉状态（避免平板→桌面时锁死滚动） ----
  window.matchMedia('(min-width: 900px)').addEventListener('change', (mq) => {
    if (mq.matches) closeDrawer();
  });

  // ---- PWA ----
  watchInstallPrompt();
  onPwaChange(renderBanners);
  renderBanners();
}
