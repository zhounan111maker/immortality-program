/**
 * 客户端全文检索
 * ============================================================
 * 整个纲领的内容体量很小（数十篇文档），因此直接在浏览器里建索引，
 * 不需要任何搜索服务。这与「零后端、可永久存档」的目标一致。
 *
 * 打分策略（中文没有词边界，因此以子串匹配为主）：
 *   · 标题命中权重最高
 *   · 别名 / 编号（PRT-001、EXP-001）命中权重次高
 *   · 摘要高于正文
 *   · 多关键词需全部命中（AND 语义），并按覆盖度加权
 */

import { protocols } from '../content/protocols';
import { experiments } from '../content/experiments';
import { posts } from '../content/posts';
import { glossary } from '../content/glossary';
import { literature } from '../content/literature';
import { nav } from '../content/site';
import type { ContentBlock, DocSection } from '../types/content';
import { stripInline } from './format';

export type SearchKind = 'protocol' | 'experiment' | 'post' | 'glossary' | 'literature' | 'page';

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  /** 稳定路由路径 */
  path: string;
  title: string;
  /** 展示用的类别标签 */
  kindLabel: string;
  /** 编号或别名（PRT-001 / EXP-001 / WBE） */
  code?: string;
  /** 显示在结果里的摘要 */
  summary: string;
  /** 用于匹配的加权文本 */
  haystack: string;
  /** 标题的独立副本，用于打分与高亮 */
  titleRaw: string;
}

export interface SearchHit extends SearchDoc {
  score: number;
  /** 命中的关键词，用于界面高亮 */
  matched: string[];
}

const KIND_LABEL: Record<SearchKind, string> = {
  protocol: '协议',
  experiment: '实验',
  post: '博客',
  glossary: '术语',
  literature: '文献',
  page: '页面',
};

/* ------------------------------------------------------------------ */
/* 索引构建                                                            */
/* ------------------------------------------------------------------ */

/** 把内容块数组压成纯文本 */
function blocksToText(blocks: ContentBlock[]): string {
  const parts: string[] = [];

  const push = (s?: string): void => {
    if (!s) return;
    const t = stripInline(s).replace(/\s+/g, ' ').trim();
    if (t) parts.push(t);
  };

  for (const b of blocks) {
    switch (b.kind) {
      case 'paragraph':
        push(b.text);
        break;
      case 'heading':
        push(b.text);
        break;
      case 'list':
        b.items.forEach(push);
        break;
      case 'code':
        push(b.caption);
        push(b.code);
        break;
      case 'table':
        b.columns.forEach(push);
        b.rows.forEach((r) => r.forEach(push));
        push(b.caption);
        break;
      case 'callout':
        push(b.title);
        push(b.text);
        b.items?.forEach(push);
        break;
      case 'definitions':
        b.items.forEach((d) => {
          push(d.term);
          push(d.definition);
        });
        break;
      case 'figure':
        push(b.alt);
        push(b.caption);
        break;
      case 'metrics':
        b.items.forEach((m) => {
          push(m.label);
          push(m.note);
        });
        break;
      case 'quote':
        push(b.text);
        break;
      case 'faq':
        b.items.forEach((f) => {
          push(f.question);
          push(f.answer);
        });
        break;
      case 'timeline':
        b.items.forEach((t) => {
          push(t.phase);
          push(t.title);
          push(t.text);
          t.items?.forEach(push);
        });
        break;
    }
  }

  return parts.join(' ');
}

function sectionsToText(sections: DocSection[]): string {
  return sections
    .map((s) => `${stripInline(s.title)} ${s.lead ? stripInline(s.lead) : ''} ${blocksToText(s.blocks)}`)
    .join(' ');
}

let cachedIndex: SearchDoc[] | null = null;

/** 构建（并缓存）全站检索索引 */
export function buildIndex(): SearchDoc[] {
  if (cachedIndex) return cachedIndex;

  const docs: SearchDoc[] = [];

  // 协议
  for (const p of protocols) {
    const sections = sectionsToText(p.sections);
    const changelog = p.changelog.map((c) => `${c.version} ${c.summary}`).join(' ');
    const boundary = [...p.boundary.canAnswer, ...p.boundary.cannotAnswer, ...p.boundary.redLines].join(' ');
    const tags = p.tags.join(' ');
    docs.push({
      id: `protocol:${p.id}`,
      kind: 'protocol',
      kindLabel: KIND_LABEL.protocol,
      path: `/protocols/${p.id}`,
      title: `${p.code} · ${p.title}`,
      titleRaw: `${p.code} ${p.title}`,
      code: p.code,
      summary: p.summary,
      haystack: [
        p.code,
        p.title,
        p.summary,
        p.lead,
        p.role,
        tags,
        sections,
        changelog,
        boundary,
        (p.openItems ?? []).join(' '),
      ]
        .join(' ')
        .toLowerCase(),
    });
  }

  // 实验
  for (const e of experiments) {
    const sections = sectionsToText(e.sections);
    docs.push({
      id: `experiment:${e.id}`,
      kind: 'experiment',
      kindLabel: KIND_LABEL.experiment,
      path: '/experiments',
      title: `${e.code} · ${e.title}`,
      titleRaw: `${e.code} ${e.title}`,
      code: e.code,
      summary: e.summary,
      haystack: [
        e.code,
        e.title,
        e.summary,
        e.lead,
        e.statusNote ?? '',
        e.status,
        (e.tags ?? []).join(' '),
        e.facts.map((f) => `${f.label} ${f.value}`).join(' '),
        (e.outputs ?? []).join(' '),
        sections,
      ]
        .join(' ')
        .toLowerCase(),
    });
  }

  // 博客
  for (const post of posts) {
    const body = blocksToText(post.blocks);
    docs.push({
      id: `post:${post.id}`,
      kind: 'post',
      kindLabel: KIND_LABEL.post,
      path: `/blog/${post.id}`,
      title: post.title,
      titleRaw: post.title,
      summary: post.excerpt,
      haystack: [post.title, post.excerpt, post.category, (post.tags ?? []).join(' '), body]
        .join(' ')
        .toLowerCase(),
    });
  }

  // 术语
  for (const g of glossary) {
    docs.push({
      id: `glossary:${g.id}`,
      kind: 'glossary',
      kindLabel: KIND_LABEL.glossary,
      path: `/literature#${g.id}`,
      title: g.term,
      titleRaw: `${g.term} ${g.alias ?? ''}`,
      code: g.alias,
      summary: g.definition,
      haystack: [g.term, g.alias ?? '', g.definition].join(' ').toLowerCase(),
    });
  }

  // 文献
  for (const l of literature) {
    docs.push({
      id: `literature:${l.id}`,
      kind: 'literature',
      kindLabel: KIND_LABEL.literature,
      path: `/literature#${l.id}`,
      title: l.title,
      titleRaw: `${l.title} ${l.authors}`,
      code: String(l.year),
      summary: l.relation,
      haystack: [l.title, l.authors, String(l.year), l.field, l.relation].join(' ').toLowerCase(),
    });
  }

  // 站点页面
  for (const n of nav) {
    docs.push({
      id: `page:${n.path}`,
      kind: 'page',
      kindLabel: KIND_LABEL.page,
      path: n.path,
      title: n.label + (n.latin ? ` · ${n.latin}` : ''),
      titleRaw: `${n.label} ${n.latin ?? ''}`,
      summary: n.description ?? '',
      haystack: [n.label, n.latin ?? '', n.description ?? '', n.kicker ?? ''].join(' ').toLowerCase(),
    });
  }

  cachedIndex = docs;
  return docs;
}

/* ------------------------------------------------------------------ */
/* 检索                                                                */
/* ------------------------------------------------------------------ */

/**
 * 执行检索。
 * 多关键词为 AND 语义：全部命中才算结果，避免"稍微相关"的噪声。
 */
export function search(query: string, opts: { limit?: number; kinds?: SearchKind[] } = {}): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const limit = opts.limit ?? 24;
  const terms = q.split(/\s+/).filter(Boolean);
  const index = buildIndex();
  const hits: SearchHit[] = [];

  for (const doc of index) {
    if (opts.kinds?.length && !opts.kinds.includes(doc.kind)) continue;

    let score = 0;
    let allMatched = true;
    const matched: string[] = [];

    for (const term of terms) {
      const inTitle = doc.titleRaw.toLowerCase().includes(term);
      const inCode = doc.code?.toLowerCase().includes(term) ?? false;
      const inSummary = doc.summary.toLowerCase().includes(term);
      const inBody = doc.haystack.includes(term);

      if (!inTitle && !inCode && !inSummary && !inBody) {
        allMatched = false;
        break;
      }

      matched.push(term);

      if (inTitle) score += 60;
      if (inCode) score += 45;
      if (inSummary) score += 18;
      if (inBody) score += 6;

      // 前缀命中额外加权：输入 "PRT" 时协议应该排在前面
      if (inTitle && doc.titleRaw.toLowerCase().startsWith(term)) score += 25;

      // 短词命中长文档时降低噪声
      if (!inTitle && !inCode && !inSummary && term.length <= 2) score -= 4;
    }

    if (!allMatched) continue;

    // 类型优先级：协议与实验是纲领的核心内容
    if (doc.kind === 'protocol') score += 8;
    if (doc.kind === 'experiment') score += 6;
    if (doc.kind === 'post') score += 4;

    hits.push({ ...doc, score, matched });
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-Hans-CN'));
  return hits.slice(0, limit);
}

/** 按类型分组，用于搜索结果分区展示 */
export function groupHits(hits: SearchHit[]): { kind: SearchKind; label: string; items: SearchHit[] }[] {
  const order: SearchKind[] = ['protocol', 'experiment', 'post', 'glossary', 'literature', 'page'];
  const grouped = new Map<SearchKind, SearchHit[]>();

  for (const h of hits) {
    const list = grouped.get(h.kind);
    if (list) list.push(h);
    else grouped.set(h.kind, [h]);
  }

  return order
    .filter((k) => grouped.has(k))
    .map((k) => ({ kind: k, label: KIND_LABEL[k], items: grouped.get(k)! }));
}
