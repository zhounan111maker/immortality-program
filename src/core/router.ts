/**
 * 客户端路由
 * ============================================================
 * 设计取舍：
 *  - 使用 History API（干净 URL），而不是哈希路由。原因：纲领的价值在于
 *    可检索与可引用，`/protocols/p01` 比 `/#/protocols/p01` 更适合被引用、
 *    被搜索引擎收录、被 Arweave 存档。
 *  - 代价是需要服务端把未知路径回退到 index.html，这由 vercel.json 的
 *    rewrites 规则承担（见 docs/零基础部署指南.md）。
 *  - 无外部依赖：支持 :param 与 *通配，足够本项目使用。
 */

export interface RouteContext {
  /** 匹配到的路径（不含 hash 与 query） */
  path: string;
  /** 路径参数，例如 /protocols/:id → { id: 'p01' } */
  params: Record<string, string>;
  /** URL 查询参数 */
  query: URLSearchParams;
  /** 原始 hash（用于锚点定位） */
  hash: string;
}

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

interface RouteDef {
  pattern: string;
  segments: string[];
  handler: RouteHandler;
}

/** 规范化路径：确保以 / 开头，去掉结尾斜杠（根路径除外） */
export function normalizePath(raw: string): string {
  if (!raw) return '/';
  let p = raw.split('#')[0]?.split('?')[0] ?? '/';
  if (!p.startsWith('/')) p = '/' + p;
  // 折叠重复斜杠
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

export class Router {
  private routes: RouteDef[] = [];
  private notFound: RouteHandler | null = null;
  private afterRender: (() => void) | null = null;
  private currentPath = '';
  private scrollPositions = new Map<string, number>();
  private started = false;

  /** 注册一条路由。pattern 形如 '/protocols/:id'，通配写作 '*' */
  on(pattern: string, handler: RouteHandler): this {
    const normalized = normalizePath(pattern);
    this.routes.push({
      pattern: normalized,
      segments: normalized === '/' ? [] : normalized.slice(1).split('/'),
      handler,
    });
    return this;
  }

  /** 未匹配任何路由时的处理器 */
  fallback(handler: RouteHandler): this {
    this.notFound = handler;
    return this;
  }

  /** 每次渲染完成后执行（用于滚动恢复、目录高亮等收尾工作） */
  afterEach(fn: () => void): this {
    this.afterRender = fn;
    return this;
  }

  /** 当前路径 */
  get path(): string {
    return this.currentPath;
  }

  /** 以编程方式导航 */
  navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}): void {
    const url = new URL(to, window.location.origin);
    const target = normalizePath(url.pathname) + url.search + url.hash;
    const here = window.location.pathname + window.location.search + window.location.hash;
    if (target === here) {
      // 同一地址：仅重新解析（例如只换了 hash 锚点）
      this.resolve();
      return;
    }
    if (!opts.keepScroll) {
      this.scrollPositions.set(normalizePath(window.location.pathname), window.scrollY);
    }
    if (opts.replace) {
      window.history.replaceState(null, '', target);
      this.resolve();
    } else {
      window.history.pushState(null, '', target);
      this.resolve();
    }
  }

  /** 返回到上一页；没有历史时退回首页 */
  back(fallbackTo = '/'): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.navigate(fallbackTo, { replace: true });
    }
  }

  /** 启动路由：接管站内链接 + 监听前进后退 */
  start(): void {
    if (this.started) return;
    this.started = true;

    // 拦截站内 <a> 点击，避免整页刷新
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // 外部链接、下载、新窗口、mailto/tel 一律交给浏览器
      if (anchor.hasAttribute('download')) return;
      if (anchor.getAttribute('target') === '_blank') return;
      if (/^(https?:)?\/\//i.test(href) && !href.startsWith(window.location.origin)) return;
      if (/^(mailto:|tel:|data:|blob:)/i.test(href)) return;
      // data-action 链接由组件自行处理
      if (anchor.hasAttribute('data-action')) return;

      // 只接管同源绝对路径链接
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      // 指向静态文件的链接交给浏览器（PDF、图片、zip 等）
      if (/\.(pdf|zip|png|jpe?g|svg|webp|gif|ico|txt|xml|json|csv|xlsx?|docx?|pptx?)$/i.test(url.pathname)) {
        return;
      }

      e.preventDefault();
      this.navigate(url.pathname + url.search + url.hash);
    });

    window.addEventListener('popstate', () => this.resolve());
    this.resolve();
  }

  /** 解析当前 URL 并渲染 */
  private resolve(): void {
    const path = normalizePath(window.location.pathname);
    const query = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isSamePath = path === this.currentPath;
    this.currentPath = path;

    const ctx: RouteContext = { path, params: {}, query, hash };

    for (const route of this.routes) {
      const params = matchSegments(route.segments, path);
      if (params) {
        ctx.params = params;
        // handler 可以是 async（页面渲染通常是异步的）。
        // 不 await 它，是为了让路由切换本身保持同步、可预测；
        // 渲染完成后的收尾由 afterEach + 各页面自行的 mount 负责。
        const out = route.handler(ctx);
        if (out instanceof Promise) {
          out.catch((err) => console.error('[router] 路由处理器失败', err));
        }
        this.finish(isSamePath, hash);
        return;
      }
    }

    if (this.notFound) {
      const out = this.notFound(ctx);
      if (out instanceof Promise) {
        out.catch((err) => console.error('[router] 未匹配处理器失败', err));
      }
    }
    this.finish(isSamePath, hash);
  }

  /** 渲染收尾：滚动位置、锚点、目录高亮、焦点管理 */
  private finish(isSamePath: boolean, hash: string): void {
    this.afterRender?.();

    if (hash) {
      // 有锚点：等 DOM 落地后滚动到锚点
      const id = decodeURIComponent(hash.slice(1));
      requestAnimationFrame(() => {
        const el =
          document.getElementById(id) ??
          document.querySelector<HTMLElement>(`[name="${CSS.escape(id)}"]`);
        if (el) {
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
      });
    } else if (isSamePath) {
      // 同路径重渲染：保持滚动位置，避免内容跳动
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }
}

/**
 * 把路由段与真实路径段做匹配。
 * 返回参数对象，或 null 表示不匹配。
 */
function matchSegments(segments: string[], path: string): Record<string, string> | null {
  const parts = path === '/' ? [] : path.slice(1).split('/');

  // 通配路由（例如 '*') 匹配剩余全部
  if (segments.length === 1 && segments[0] === '*') {
    return { '*': parts.join('/') };
  }

  if (segments.length !== parts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const part = parts[i]!;
    if (!seg) continue;

    if (seg.startsWith(':')) {
      const name = seg.slice(1);
      if (!part) return null;
      params[name] = decodeURIComponent(part);
      continue;
    }

    if (seg === '*') {
      params['*'] = parts.slice(i).join('/');
      return params;
    }

    if (seg !== part) return null;
  }

  return params;
}

/** 拼接查询字符串 */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
