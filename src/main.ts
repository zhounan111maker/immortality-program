/**
 * 应用入口
 * ============================================================
 * 启动顺序（每一层的理由都写明了，请勿随意调换）：
 *   1. 加载设计系统 CSS —— 必须在任何渲染之前，避免无样式闪烁
 *   2. 应用主题偏好 —— 尽早，避免深色模式用户看到白屏
 *   3. 挂载外壳（页头/页脚/抽屉/搜索面板/底部导航）
 *   4. 注册路由并启动
 *   5. 空闲时再加载网络字体与 Service Worker —— 不阻塞首屏
 *
 * 页面模块采用动态 import：首屏只下载外壳与当前页面。
 * 单文件归档构建（scripts/make-archive.mjs）会把这些分块重新内联，
 * 因此归档版依然是「一个文件」，两种产物互不影响。
 */

import './styles/design-system.css';

import { Router, type RouteContext } from './core/router';
import { setPageMeta, setStructuredData } from './core/meta';
import { initFonts } from './core/fonts';
import { initPwa } from './core/pwa';
import { toast } from './core/toast';
import { site } from './content/site';
import { storage } from './core/store';
import { mountShell, initShell, markActiveNav, applyTheme, applyFontScale } from './components/shell';

/* ------------------------------------------------------------------ */
/* 页面模块接口                                                        */
/* ------------------------------------------------------------------ */

export interface PageResult {
  html: string;
  title: string;
  description?: string;
  path?: string;
  /** 渲染完成后调用；可返回清理函数，页面切换时执行 */
  mount?: (root: HTMLElement) => void | (() => void);
}

interface PageModule {
  render(ctx: RouteContext): PageResult | Promise<PageResult>;
}

type PageLoader = () => Promise<unknown>;

/**
 * 页面加载器表。
 * 用动态 import 而不是静态 import，原因有两个：
 *   · 首屏只加载当前页面所需代码，其余页面按需下载
 *   · 单个页面出错不会导致整个应用无法启动
 */
const PAGES = {
  home: () => import('./pages/home'),
  protocols: () => import('./pages/protocols'),
  protocolDetail: () => import('./pages/protocolDetail'),
  experiments: () => import('./pages/experiments'),
  literature: () => import('./pages/literature'),
  blog: () => import('./pages/blogDetail'),
  about: () => import('./pages/about'),
  contact: () => import('./pages/contact'),
  deploy: () => import('./pages/deploy'),
  legal: () => import('./pages/legal'),
  offline: () => import('./pages/offline'),
  notFound: () => import('./pages/notFound'),
} satisfies Record<string, PageLoader>;

/* ------------------------------------------------------------------ */
/* 渲染循环                                                            */
/* ------------------------------------------------------------------ */

let viewRoot: HTMLElement;
let teardown: (() => void) | void;

/** 协议 / 博客详情页会插入阅读进度条，切页时统一清理 */
function clearReadingProgress(): void {
  document.querySelectorAll('.reading-progress').forEach((el) => el.remove());
}

function cleanupPreviousPage(): void {
  if (typeof teardown === 'function') {
    try {
      teardown();
    } catch (err) {
      console.warn('[app] 页面清理失败', err);
    }
    teardown = undefined;
  }
  clearReadingProgress();
}

/**
 * 加载并渲染一个页面。
 * 加载失败、模块形状不对、渲染抛错 —— 全部收敛到同一个降级页面，
 * 保证站点永远不会白屏。
 */
async function loadAndRender(ctx: RouteContext, loader: PageLoader, name: string): Promise<void> {
  cleanupPreviousPage();

  let mod: Partial<PageModule>;
  try {
    mod = (await loader()) as Partial<PageModule>;
  } catch (err) {
    console.error(`[app] 页面模块 ${name} 加载失败`, err);
    renderError(ctx, err);
    return;
  }

  if (typeof mod.render !== 'function') {
    const err = new Error(`页面模块 ${name} 未导出 render 函数`);
    console.error('[app]', err);
    renderError(ctx, err);
    return;
  }

  let result: PageResult;
  try {
    result = await mod.render(ctx);
  } catch (err) {
    console.error(`[app] 页面 ${name} 渲染失败`, err);
    renderError(ctx, err);
    return;
  }

  if (!result || typeof result.html !== 'string') {
    const err = new Error('页面未返回有效的 HTML');
    console.error('[app]', err, result);
    renderError(ctx, err);
    return;
  }

  // 1) 注入内容
  viewRoot.innerHTML = result.html;

  // 2) 元数据（标题 / 描述 / canonical）
  setPageMeta({
    title: result.title || site.name,
    description: result.description,
    path: result.path ?? ctx.path,
  });

  // 3) 结构化数据：帮助搜索引擎识别这是一个研究纲领站点
  setStructuredData({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${site.name} · ${site.tagline}`,
    description: site.description,
    inLanguage: 'zh-CN',
    license: site.license,
    isAccessibleForFree: true,
  });

  // 4) 导航高亮
  markActiveNav(ctx.path);

  // 5) 页面挂载钩子
  if (typeof result.mount === 'function') {
    try {
      teardown = result.mount(viewRoot);
    } catch (err) {
      console.error('[app] 页面挂载失败', err);
      toast('页面部分交互未能初始化，内容仍可正常阅读。', { tone: 'warn' });
    }
  }
}

/**
 * 渲染失败时的降级页面。
 * 内容可能出错，但站点不能白屏 —— 这是「可永久阅读」的基本要求。
 */
function renderError(ctx: RouteContext, err: unknown): void {
  const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const detail = err instanceof Error ? err.message : String(err);

  viewRoot.innerHTML = `
    <section class="page-hero">
      <div class="page-hero-inner">
        <p class="hero-kicker">出错了</p>
        <h1>这个页面没能加载</h1>
        <p class="p-lead">渲染过程中发生了错误。这不是你的操作问题，其它内容不受影响。</p>
      </div>
    </section>
    <section class="section">
      <div class="container-narrow">
        <div class="callout callout--warning">
          <p class="callout-title">技术细节</p>
          <p class="mono" style="font-size:.82rem;word-break:break-word">${esc(detail)}</p>
          <p class="note" style="margin-top:8px">路径：<span class="mono">${esc(ctx.path)}</span></p>
        </div>
        <div class="btn-row" style="margin-top:22px">
          <a class="btn btn--primary" href="/">返回首页</a>
          <button class="btn btn--ghost" type="button" data-action="reload-page">重新加载</button>
        </div>
      </div>
    </section>`;

  setPageMeta({ title: '页面加载失败', noindex: true });

  viewRoot.querySelector('[data-action="reload-page"]')?.addEventListener('click', () => {
    window.location.reload();
  });
}

/* ------------------------------------------------------------------ */
/* 启动                                                                */
/* ------------------------------------------------------------------ */

function start(): void {
  // 尽早应用偏好，避免深色模式用户看到白色闪屏
  const prefs = storage.get<{ theme?: 'auto' | 'light' | 'dark'; fontScale?: 'sm' | 'base' | 'lg' }>(
    'preferences',
    {},
  );
  applyTheme(prefs.theme ?? 'auto');
  applyFontScale(prefs.fontScale ?? 'base');

  viewRoot = mountShell();
  initShell();

  const router = new Router();

  router
    .on('/', (ctx) => loadAndRender(ctx, PAGES.home, 'home'))
    .on('/home', (ctx) => loadAndRender(ctx, PAGES.home, 'home'))
    .on('/protocols', (ctx) => loadAndRender(ctx, PAGES.protocols, 'protocols'))
    .on('/protocols/:id', (ctx) => loadAndRender(ctx, PAGES.protocolDetail, 'protocolDetail'))
    .on('/experiments', (ctx) => loadAndRender(ctx, PAGES.experiments, 'experiments'))
    .on('/literature', (ctx) => loadAndRender(ctx, PAGES.literature, 'literature'))
    .on('/blog', (ctx) => loadAndRender(ctx, PAGES.blog, 'blog'))
    .on('/blog/:id', (ctx) => loadAndRender(ctx, PAGES.blog, 'blogDetail'))
    .on('/about', (ctx) => loadAndRender(ctx, PAGES.about, 'about'))
    .on('/contact', (ctx) => loadAndRender(ctx, PAGES.contact, 'contact'))
    .on('/deploy', (ctx) => loadAndRender(ctx, PAGES.deploy, 'deploy'))
    .on('/legal', (ctx) => loadAndRender(ctx, PAGES.legal, 'legal'))
    /*
     * /offline 是给离线场景准备的可寻址页面。
     * 设备离线时，Service Worker 已把外壳与已访问内容缓存下来，
     * 用户可以直接导航到这个地址查看状态与可用的入口。
     */
    .on('/offline', (ctx) => loadAndRender(ctx, PAGES.offline, 'offline'))
    .fallback((ctx) => loadAndRender(ctx, PAGES.notFound, 'notFound'));

  router.start();

  // 不阻塞首屏的后台任务
  initFonts();
  void initPwa();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
