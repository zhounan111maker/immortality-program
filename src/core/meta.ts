/**
 * 文档元数据（<head> 管理）
 * ============================================================
 * 客户端渲染的单页应用需要自己维护标题与分享卡片。
 * 这里提供最小的命令式 API，不引入额外依赖。
 */

import { site } from '../content/site';

const SITE_SUFFIX = ` · ${site.name}研究纲领平台`;

function upsertMeta(selector: string, create: () => HTMLElement, content: string): void {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = create() as HTMLMetaElement;
    document.head.appendChild(el);
  }
  if (el instanceof HTMLMetaElement) el.content = content;
}

export interface PageMeta {
  title: string;
  description?: string;
  /** 是否要求搜索引擎不收录（用于导出/工具页） */
  noindex?: boolean;
  /** 稳定路径，用于 og:url 与 canonical */
  path?: string;
}

export function setPageMeta(meta: PageMeta): void {
  const fullTitle = meta.title.includes(site.name) ? meta.title : meta.title + SITE_SUFFIX;
  document.title = fullTitle;

  const desc = meta.description ?? site.description;

  upsertMeta(
    'meta[name="description"]',
    () => {
      const m = document.createElement('meta');
      m.name = 'description';
      return m;
    },
    desc,
  );

  upsertMeta(
    'meta[property="og:title"]',
    () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    },
    fullTitle,
  );

  upsertMeta(
    'meta[property="og:description"]',
    () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    },
    desc,
  );

  upsertMeta(
    'meta[name="twitter:title"]',
    () => {
      const m = document.createElement('meta');
      m.name = 'twitter:title';
      return m;
    },
    fullTitle,
  );

  upsertMeta(
    'meta[name="twitter:description"]',
    () => {
      const m = document.createElement('meta');
      m.name = 'twitter:description';
      return m;
    },
    desc,
  );

  upsertMeta(
    'meta[name="robots"]',
    () => {
      const m = document.createElement('meta');
      m.name = 'robots';
      return m;
    },
    meta.noindex ? 'noindex,nofollow' : 'index,follow',
  );

  // canonical：让搜索引擎明确这是唯一地址
  if (meta.path) {
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = new URL(meta.path, window.location.origin).href;
  }
}

/**
 * 注入结构化数据（schema.org），帮助搜索引擎理解本站是
 * 「一个发布学术协议与文献的研究纲领站点」。
 */
export function setStructuredData(data: Record<string, unknown> | null): void {
  const id = 'ip-structured-data';
  document.getElementById(id)?.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
