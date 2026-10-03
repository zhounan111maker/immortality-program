/**
 * 博客：索引页 + 文章详情页
 * ============================================================
 * 一个模块同时承担两个路由，因为两者共享同一份数据（`posts`）与同一段
 * URL 空间（`/blog` 与 `/blog/:id`）：
 *
 *   · `/blog`      —— 索引：搜索、分类筛选、排序、结果重绘；
 *   · `/blog/:id`  —— 详情：目录 / 本文信息侧栏、正文、操作按钮、前后篇、相关文章。
 *
 * 分流依据是 `ctx.params.id`，两条分支的 `<h1>` 各自只有一处：
 *   · 索引为导航条目里 `/blog` 的标题；
 *   · 详情为文章标题（未找到时为「未找到这篇文章」）。
 *
 * 正文一律交给 `renderBlocks()` 渲染，本文件不手写段落标记。
 * 所有来自数据的文本或经 `escapeHtml()`，或经 `inline()`（内部先转义），
 * 或由组件内部转义，不存在裸插值。
 */

import {
  /* 内容 */
  posts,
  nav,
  /* 工具 */
  escapeHtml,
  formatDate,
  slugify,
  tokenize,
  readingTime,
  /* 组件 */
  renderBlocks,
  renderToc,
  callout,
  emptyState,
  pageHero,
  tag,
  refItem,
  icon,
  /* 本地状态与行为 */
  markRead,
  recordVisit,
  toast,
  printDocument,
} from '../components/kit';
import type { RouteContext } from '../core/router';
import type { BlogPost, ContentBlock, DocSection, HeadingBlock } from '../components/kit';

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
/* 共享小工具                                                          */
/* ------------------------------------------------------------------ */

/** 文章路径。目前唯一的站内稳定路径形式（域名尚未确定，见引用文案说明）。 */
function postUrl(id: string): string {
  return `/blog/${id}`;
}

const BLOG_KICKER = '博客 · Blog';

/** 按 `publishedAt` 排序（ISO 日期按字典序即时间序）。降序 = 最新优先。 */
function sortedPosts(desc: boolean): BlogPost[] {
  return posts
    .slice()
    .sort((a, b) =>
      desc ? b.publishedAt.localeCompare(a.publishedAt) : a.publishedAt.localeCompare(b.publishedAt),
    );
}

/** 文章内容中显式出现的 heading 块（用于目录；没有就如实显示「本文信息」）。 */
function headingBlocks(post: BlogPost): HeadingBlock[] {
  return post.blocks.filter((b): b is HeadingBlock => b.kind === 'heading');
}

/**
 * 把文章里的 heading 块映射成 `renderToc()` 需要的章节形状。
 * 锚点规则与 `blocks.ts` 渲染 `h2/h3` 时完全一致（显式 id 优先，否则 slugify 标题），
 * 因此目录链接不会指向不存在的锚点；目录条目只关心 id / no / title，blocks 留空。
 */
function outlineSections(list: HeadingBlock[]): DocSection[] {
  return list.map((h) => ({
    id: h.id ?? slugify(h.text),
    no: h.no,
    title: h.text,
    blocks: [],
  }));
}

/* ------------------------------------------------------------------ */
/* 文章 → Markdown（本地转换，供「复制正文 Markdown」使用）             */
/* ------------------------------------------------------------------ */

/** 去掉内容里的行内标记，得到 Markdown / 纯文本可用的字面文本。 */
function plain(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1（$2）')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2');
}

/** 把多行文本转成 Markdown 引用块。 */
function quoteLines(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function mdBlock(block: ContentBlock): string {
  switch (block.kind) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${block.no ? `${block.no} ` : ''}${plain(block.text)}`;

    case 'paragraph':
      return plain(block.text);

    case 'list':
      return block.items
        .map((item, i) => {
          // 勾选清单用 - [x] / - [ ]，普通清单用 - 或 1.
          const bullet = block.checks ? '- ' : block.ordered ? `${i + 1}. ` : '- ';
          const box = block.checks ? (block.checks[i] === true ? '[x] ' : '[ ] ') : '';
          return `${bullet}${box}${plain(item)}`;
        })
        .join('\n');

    case 'quote':
      return block.attribution
        ? `${quoteLines(plain(block.text))}\n>\n> —— ${plain(block.attribution)}`
        : quoteLines(plain(block.text));

    case 'code': {
      const cap = block.caption ? `**${plain(block.caption)}**\n\n` : '';
      return `${cap}\`\`\`${block.language ?? ''}\n${block.code}\n\`\`\``;
    }

    case 'table': {
      const head = `| ${block.columns.map(plain).join(' | ')} |`;
      const rule = `| ${block.columns.map(() => '---').join(' | ')} |`;
      const rows = block.rows.map((r) => `| ${r.map(plain).join(' | ')} |`);
      const cap = block.caption ? `\n\n*${plain(block.caption)}*` : '';
      return [head, rule, ...rows].join('\n') + cap;
    }

    case 'callout': {
      const title = block.title ? `**${plain(block.title)}**\n\n` : '';
      const text = block.text ? `${plain(block.text)}\n\n` : '';
      const items = block.items?.length ? `${block.items.map((i) => `- ${plain(i)}`).join('\n')}\n\n` : '';
      return quoteLines(`${title}${text}${items}`.trimEnd());
    }

    case 'definitions':
      return block.items.map((d) => `- **${plain(d.term)}**：${plain(d.definition)}`).join('\n');

    case 'figure': {
      // 图示在 Markdown 里无法还原，如实标注为「见网站页面」，并沿用图注的免责声明。
      const note = '（图示见网站页面；示意图，不代表实验数据或测量结果）';
      const alt = `![${plain(block.alt)}](${block.id})`;
      return block.caption ? `${alt}\n\n*${plain(block.caption)}*${note}` : `${alt}${note}`;
    }

    case 'metrics':
      return block.items
        .map((m) => `- **${plain(m.value)}** ${plain(m.label)}${m.note ? `（${plain(m.note)}）` : ''}`)
        .join('\n');

    case 'faq':
      return block.items.map((f) => `**${plain(f.question)}**\n\n${plain(f.answer)}`).join('\n\n');

    case 'timeline':
      return block.items
        .map((t) => {
          const head = `**${plain(t.phase)}**（${plain(t.period)}）${plain(t.title)}`;
          const items = t.items?.length ? `\n${t.items.map((i) => `  - ${plain(i)}`).join('\n')}` : '';
          return `${head}\n\n${plain(t.text)}${items}`;
        })
        .join('\n\n');

    default: {
      // 内容模型是穷尽联合，正常不会走到这里；留一条可读的降级说明。
      const never: never = block;
      return `<!-- 未识别的块：${String((never as { kind?: string }).kind ?? 'unknown')} -->`;
    }
  }
}

/** 由文章数据本地构建 Markdown 全文（不请求任何外部资源）。 */
function postMarkdown(post: BlogPost): string {
  const meta = [
    `# ${post.title}`,
    '',
    `> 分类：${post.category} ｜ 发布：${formatDate(post.publishedAt, 'full')} ｜ 阅读：约 ${post.readingMinutes} 分钟`,
    post.tags?.length ? `> 标签：${post.tags.join('、')}` : '',
    '',
    `> ${post.excerpt}`,
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return `${meta}\n${post.blocks.map(mdBlock).join('\n\n')}\n`;
}

/* ------------------------------------------------------------------ */
/* 剪贴板                                                              */
/* ------------------------------------------------------------------ */

/**
 * 写入剪贴板。
 * 优先使用 Clipboard API；不可用（例如非安全上下文或浏览器不支持）时退回
 * 隐藏 textarea + 复制命令；两者都不可用时用 toast 如实说明失败，不假装已复制。
 */
async function copyText(text: string, failLabel: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast('已复制到剪贴板');
      return;
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

  toast(ok ? '已复制到剪贴板' : failLabel);
}

/* ================================================================== */
/* 分支一：/blog/:id —— 单篇文章                                       */
/* ================================================================== */

/** 顶部 post-meta 行：分类标签、发布日期、阅读时长、标签。 */
function metaLine(post: BlogPost): string {
  const tags = (post.tags ?? []).map((t) => tag(t, 'muted')).join('');
  return `
    <div class="post-meta">
      ${tag(post.category, 'brand')}
      <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
      ${readingTime(post.readingMinutes)}
      ${tags}
      ${
        post.cornerstone
          ? tag('纲领核心立场', 'gold')
          : ''
      }
    </div>`;
}

/**
 * 侧栏。文章含 heading 块时生成真正的目录；不含时如实改为「本文信息」面板，
 * 不伪造任何锚点。
 */
function sidebar(post: BlogPost): string {
  const headings = headingBlocks(post);
  if (headings.length > 0) {
    return renderToc(outlineSections(headings), { label: '本文目录' });
  }

  const rows: { k: string; v: string }[] = [
    { k: '分类', v: escapeHtml(post.category) },
    { k: '发布日期', v: `<time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt, 'full'))}</time>` },
    { k: '阅读时长', v: `约 ${post.readingMinutes} 分钟` },
    {
      k: '标签',
      v: post.tags?.length ? post.tags.map((t) => escapeHtml(t)).join('、') : '—',
    },
    ...(post.cornerstone ? [{ k: '纲领立场', v: tag('纲领核心立场', 'gold') }] : []),
  ];

  return `
    <nav class="doc-toc" aria-label="本文信息">
      <h2>本文信息</h2>
      <dl class="info-list">
        ${rows
          .map(
            (r) => `
        <div class="info-row">
          <dt class="k">${escapeHtml(r.k)}</dt>
          <dd class="v">${r.v}</dd>
        </div>`,
          )
          .join('')}
      </dl>
      <p class="note">本文没有分节标题，因此不提供目录；此处列出的是文章的元信息。</p>
    </nav>`;
}

/** 本文操作：打印、复制引用、复制正文 Markdown。 */
function actions(post: BlogPost): string {
  return `
    <section class="section section--tight" aria-labelledby="post-actions-title">
      <h2 class="sec-label" id="post-actions-title">本文操作</h2>
      <div class="cluster">
        <button class="btn btn--ghost" type="button" data-action="print">${icon('printer')}打印本文</button>
        <button class="btn btn--ghost" type="button" data-action="cite" data-post-id="${escapeHtml(post.id)}">${icon('copy')}复制引用</button>
        <button class="btn btn--ghost" type="button" data-action="copy-markdown" data-post-id="${escapeHtml(post.id)}">${icon('file')}复制正文 Markdown</button>
      </div>
      <p class="note">
        引用说明：本站域名尚未确定，不存在可长期稳定的正式 URL，因此引用请以标题与发布日期为准；
        复制得到的引用串只包含标题、站点名称与发布日期，不包含任何看似正式的链接。
      </p>
    </section>`;
}

/** 上一篇 / 下一篇：按 `publishedAt` 升序排列取相邻两篇，两端自然省略。 */
function prevNext(post: BlogPost): string {
  const asc = sortedPosts(false);
  const i = asc.findIndex((p) => p.id === post.id);
  if (i < 0) return '';
  const prev = i > 0 ? asc[i - 1] : undefined;
  const next = i < asc.length - 1 ? asc[i + 1] : undefined;
  if (!prev && !next) return '';

  const items = [
    prev
      ? refItem({
          href: postUrl(prev.id),
          title: `上一篇 · ${prev.title}`,
          desc: `${prev.category} ｜ ${formatDate(prev.publishedAt)}`,
          iconName: 'arrowLeft',
        })
      : '',
    next
      ? refItem({
          href: postUrl(next.id),
          title: `下一篇 · ${next.title}`,
          desc: `${next.category} ｜ ${formatDate(next.publishedAt)}`,
          iconName: 'arrowRight',
        })
      : '',
  ].join('');

  return `
    <section class="section section--tight" aria-labelledby="post-prevnext-title">
      <h2 class="sec-title" id="post-prevnext-title">上一篇 / 下一篇</h2>
      <div class="ref-list">${items}</div>
    </section>`;
}

/** 相关文章：分类或标签有交集者，最多 2 篇。 */
function relatedPosts(post: BlogPost): string {
  const tags = new Set(post.tags ?? []);
  const related = sortedPosts(true)
    .filter((p) => p.id !== post.id)
    .filter((p) => p.category === post.category || (p.tags ?? []).some((t) => tags.has(t)))
    .slice(0, 2);

  if (!related.length) return '';

  const reason = (p: BlogPost): string => {
    if (p.category === post.category) return `同分类「${p.category}」｜ ${formatDate(p.publishedAt)}`;
    const shared = (p.tags ?? []).filter((t) => tags.has(t));
    return `同标签「${shared.join('、')}」｜ ${formatDate(p.publishedAt)}`;
  };

  return `
    <section class="section section--tight" aria-labelledby="post-related-title">
      <h2 class="sec-title" id="post-related-title">相关文章</h2>
      <div class="ref-list">
        ${related
          .map((p) => refItem({ href: postUrl(p.id), title: p.title, desc: reason(p), iconName: 'book' }))
          .join('')}
      </div>
    </section>`;
}

/** 未找到文章：不抛异常，给出可继续浏览的入口。 */
function notFoundArticle(ctx: RouteContext): PageResult {
  const hero = pageHero({
    kicker: BLOG_KICKER,
    title: '未找到这篇文章',
    lead: '按当前地址没有匹配的博客文章。可能是链接中的编号有误，或这篇文章尚未发布。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '博客', href: '/blog' }, { label: '未找到' }],
  });

  const available = sortedPosts(true)
    .map((p) => refItem({ href: postUrl(p.id), title: p.title, desc: `${p.category} ｜ ${formatDate(p.publishedAt)}`, iconName: 'book' }))
    .join('');

  const html = `
    ${hero}
    <div class="container section">
      <!-- 为保持 h1 → h2 → h3 的层级，空状态（h3）之前先给出一个可访问名称 -->
      <h2 class="sr-only">查找结果</h2>
      ${emptyState({
        title: '没有这篇文章',
        text: `请求的编号：${escapeHtml(ctx.params.id ?? '')}。下方列出了当前已发布的全部文章，可从中继续阅读。`,
        action: '<a class="btn btn--primary" href="/blog">返回博客索引</a>',
      })}
      <div class="section section--tight">
        <h2 class="sec-title">可用文章</h2>
        <div class="ref-list">${available}</div>
      </div>
    </div>`;

  return {
    html,
    title: '未找到这篇文章',
    description: '请求的博客文章不存在，此处列出当前已发布文章。',
    path: `/blog/${ctx.params.id ?? ''}`,
    mount: (root) => {
      const bar = progressElement();
      root.appendChild(bar);
      const cleanup = trackProgress(bar, root);
      return cleanup;
    },
  };
}

/** 阅读进度条元素（fixed 定位，插到页面根节点末尾；宽度由脚本更新）。 */
function progressElement(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  return bar;
}

/** 绑定滚动进度：随正文阅读深度更新宽度，返回清理函数。 */
function trackProgress(bar: HTMLElement, root: HTMLElement): () => void {
  const article = root.querySelector<HTMLElement>('[data-prose]');
  let frame = 0;

  const update = (): void => {
    frame = 0;
    if (!article) {
      bar.style.width = '0%';
      return;
    }
    const rect = article.getBoundingClientRect();
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

function renderArticle(post: BlogPost): PageResult {
  const index = sortedPosts(true).findIndex((p) => p.id === post.id);

  const hero = pageHero({
    kicker: post.category ? `${post.category} · Blog` : BLOG_KICKER,
    title: post.title,
    lead: post.excerpt,
    breadcrumbItems: [
      { label: '首页', href: '/' },
      { label: '博客', href: '/blog' },
      { label: post.title },
    ],
    extra: metaLine(post),
  });

  const cornerstone = post.cornerstone
    ? callout({
        variant: 'principle',
        title: '纲领核心立场',
        text: '本文陈述的是纲领的身份性立场，而不是研究报告：它说明本站为什么这样定位、按什么标准工作。文中不含实验数据，也不构成任何结果声明或服务承诺。',
      })
    : '';

  const html = `
    ${hero}
    <div class="container section">
      ${
        index >= 0
          ? `<p class="note">第 ${posts.length - index} 篇 / 共 ${posts.length} 篇（按发布日期倒序）</p>`
          : ''
      }
      <div class="doc-layout">
        ${sidebar(post)}
        <div class="doc-main">
          <article class="post-full" data-post-id="${escapeHtml(post.id)}">
            ${cornerstone}
            <div class="prose" data-prose>
              ${renderBlocks(post.blocks)}
            </div>
          </article>
          ${actions(post)}
          ${prevNext(post)}
          ${relatedPosts(post)}
        </div>
      </div>
    </div>`;

  return {
    html,
    title: post.title,
    description: post.excerpt,
    path: postUrl(post.id),
    mount: (root) => {
      /* 已读标记与访问记录：任何分支都不例外 */
      markRead(post.id);
      recordVisit(postUrl(post.id), post.title);

      /* 阅读进度条 */
      const bar = progressElement();
      root.appendChild(bar);
      const stopProgress = trackProgress(bar, root);

      /* 本文操作 */
      const onPrint = (): void => printDocument();
      const onCite = (): void => {
        const citation = `《${post.title}》，《永生计划 · 研究纲领平台》博客，${formatDate(post.publishedAt, 'full')}。`;
        void copyText(
          citation,
          '无法自动复制引用，请手动复制。注意：本站域名尚未确定，引用请以标题与日期为准。',
        );
      };
      const onMarkdown = (): void => {
        void copyText(postMarkdown(post), '无法自动复制正文 Markdown，请手动复制。');
      };

      const printBtn = root.querySelector<HTMLButtonElement>('[data-action="print"]');
      const citeBtn = root.querySelector<HTMLButtonElement>('[data-action="cite"]');
      const mdBtn = root.querySelector<HTMLButtonElement>('[data-action="copy-markdown"]');
      printBtn?.addEventListener('click', onPrint);
      citeBtn?.addEventListener('click', onCite);
      mdBtn?.addEventListener('click', onMarkdown);

      /* 侧栏目录高亮（仅当文章含 heading 块、真的生成了目录时存在） */
      const tocLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
      let tocFrame = 0;
      const syncToc = (): void => {
        tocFrame = 0;
        for (const link of tocLinks) {
          const id = link.getAttribute('data-toc-link') ?? '';
          const target = id ? document.getElementById(id) : null;
          if (!target) continue;
          const top = target.getBoundingClientRect().top;
          link.setAttribute('aria-current', top <= 120 ? 'true' : 'false');
        }
      };
      const scheduleToc = (): void => {
        if (!tocLinks.length || tocFrame) return;
        tocFrame = window.requestAnimationFrame(syncToc);
      };
      if (tocLinks.length) {
        window.addEventListener('scroll', scheduleToc, { passive: true });
        syncToc();
      }

      /* 清理：移除滚动监听与临时节点 */
      return () => {
        stopProgress();
        window.removeEventListener('scroll', scheduleToc);
        if (tocFrame) window.cancelAnimationFrame(tocFrame);
        printBtn?.removeEventListener('click', onPrint);
        citeBtn?.removeEventListener('click', onCite);
        mdBtn?.removeEventListener('click', onMarkdown);
        bar.remove();
      };
    },
  };
}

/* ================================================================== */
/* 分支二：/blog —— 索引                                               */
/* ================================================================== */

interface FilterState {
  /** 自由文本（标题 / 摘要 / 标签） */
  q: string;
  /** 分类筛选，空字符串表示全部 */
  cat: string;
  /** true = 最新优先 */
  desc: boolean;
}

interface IndexItem {
  post: BlogPost;
  titleHtml: string;
  excerptHtml: string;
}

function initState(query: URLSearchParams): FilterState {
  const sort = query.get('sort');
  const cat = query.get('cat') ?? '';
  return {
    q: query.get('q') ?? '',
    // 只接受确实存在的分类，避免 ?cat=xxx 这类脏参数把列表筛成空集
    cat: categoryCounts().some((c) => c.name === cat) ? cat : '',
    desc: sort === 'old' ? false : true,
  };
}

/** 统计各分类文章数，用于 chip 上的计数。 */
function categoryCounts(): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of posts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* 占位标记：先插入纯文本，随后只在文本节点里替换，避免高亮结果被二次转义。
   U+0000 不会出现在文章内容中。 */
const MARK_OPEN = '\u0000mo\u0000';
const MARK_CLOSE = '\u0000mc\u0000';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 高亮所有命中的词，返回已转义（并含 <mark>）的 HTML。 */
function highlightAll(text: string, terms: string[]): string {
  let out = escapeHtml(text);
  for (const term of terms) {
    if (!term) continue;
    try {
      out = out.replace(new RegExp(escapeRegExp(term), 'gi'), (m) => `${MARK_OPEN}${m}${MARK_CLOSE}`);
    } catch {
      /* 单个词出问题不影响其它词 */
    }
  }
  return out.split(MARK_OPEN).join('<mark>').split(MARK_CLOSE).join('</mark>');
}

/** 按当前状态筛选 + 排序 + 生成每条的 HTML 片段。 */
function computeItems(state: FilterState): IndexItem[] {
  const terms = tokenize(state.q);
  const filtered = sortedPosts(state.desc).filter((p) => {
    if (state.cat && p.category !== state.cat) return false;
    if (!terms.length) return true;
    const hay = [p.title, p.excerpt, ...(p.tags ?? [])].join(' ').toLowerCase();
    return terms.every((t) => hay.includes(t));
  });

  return filtered.map((p) => {
    const excerpt = terms.length ? highlightAll(p.excerpt, terms) : escapeHtml(p.excerpt);
    return {
      post: p,
      titleHtml: terms.length ? highlightAll(p.title, terms) : escapeHtml(p.title),
      excerptHtml: excerpt,
    };
  });
}

function renderIndexItems(items: IndexItem[]): string {
  return items
    .map(
      ({ post, titleHtml, excerptHtml }) => `
      <a class="post-index-item" href="${escapeHtml(postUrl(post.id))}">
        <span class="t">${titleHtml}</span>
        <span class="m">
          <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
          <span>${escapeHtml(post.category)}</span>
          <span>约 ${post.readingMinutes} 分钟</span>
        </span>
        <span class="post-excerpt">${excerptHtml}</span>
      </a>`,
    )
    .join('');
}

/** 结果条数文案（工具栏与结果区共用同一种措辞，由挂载脚本同步）。 */
function countText(total: number): string {
  return `共 ${total} 篇文章`;
}

/** 排序按钮文案与按下态：由挂载脚本在切换后重新写回。 */
function sortLabel(desc: boolean): string {
  return desc ? '最新优先' : '最早优先';
}

function renderIndexResults(state: FilterState): string {
  const items = computeItems(state);
  const count = `<p class="result-count" data-result-count>${escapeHtml(countText(items.length))}</p>`;
  if (!items.length) {
    return `
    ${count}
    ${emptyState({
      title: '没有匹配的文章',
      text: '当前搜索或筛选条件下没有结果。可以清空关键词、切换分类，或改用「全部」分类。',
    })}`;
  }
  return `
    ${count}
    <div class="stack">${renderIndexItems(items)}</div>`;
}

/** 分片渲染的分类筛选：为配合事件委托，chips 会随后重建。 */
function renderIndexChips(state: FilterState): string {
  const chips = [
    `<button class="chip" type="button" data-action="filter" data-cat="" aria-pressed="${state.cat === ''}">全部 <span class="chip-count">${posts.length}</span></button>`,
    ...categoryCounts().map(
      ({ name, count }) =>
        `<button class="chip" type="button" data-action="filter" data-cat="${escapeHtml(name)}" aria-pressed="${state.cat === name}">${escapeHtml(name)} <span class="chip-count">${count}</span></button>`,
    ),
  ];
  return `<div class="filter-chips" data-chips role="group" aria-label="按分类筛选">${chips.join('')}</div>`;
}

/** 索引 HTML 骨架：只有结果区与计数文案会在 mount 里重绘。 */
function indexShell(state: FilterState): string {
  const navEntry = nav.find((n) => n.path === '/blog');
  const hero = pageHero({
    kicker: navEntry?.kicker ?? BLOG_KICKER,
    title: navEntry?.label ?? '博客',
    lead: navEntry?.description,
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '博客' }],
  });

  const note = callout({
    variant: 'note',
    title: '关于本博客',
    text: '最低更新承诺：每月至少一篇。博客承担三类功能——报告研究进展，澄清概念口径，回应外部反馈。这里不发布任何未经验证的结论，也不构成服务承诺；每篇正文的末尾都说明它解释的边界。',
  });

  return `
    ${hero}
    <div class="container section">
      ${note}
      <div class="toolbar">
        <div class="input-group">
          <div class="field" role="search">
            <label class="sr-only" for="blog-search">搜索文章</label>
            <input class="input input--search" id="blog-search" type="search" name="q"
                   data-action="search" placeholder="搜索标题、摘要或标签…" value="${escapeHtml(state.q)}"
                   autocomplete="off" />
          </div>
          <button class="btn btn--ghost" type="button" data-action="sort" aria-pressed="${state.desc}">${sortLabel(state.desc)}</button>
        </div>
        <p class="result-count" data-result-count>${escapeHtml(countText(computeItems(state).length))}</p>
      </div>
      ${renderIndexChips(state)}
      <section class="section section--tight" data-results-region aria-label="文章列表">
        <div data-results>${renderIndexResults(state)}</div>
      </section>
    </div>`;
}

/** 状态 → URL 查询串（保持 replaceState 与初始读取使用的是同一套键名）。 */
function stateQuery(state: FilterState): string {
  const sp = new URLSearchParams();
  if (state.q.trim()) sp.set('q', state.q.trim());
  if (state.cat) sp.set('cat', state.cat);
  if (!state.desc) sp.set('sort', 'old');
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function renderIndex(ctx: RouteContext): PageResult {
  const state = initState(ctx.query);

  return {
    html: indexShell(state),
    title: '博客',
    description: nav.find((n) => n.path === '/blog')?.description,
    path: '/blog',
    mount: (root) => {
      const resultsEl = root.querySelector<HTMLElement>('[data-results]');
      const chipsEl = root.querySelector<HTMLElement>('[data-chips]');
      const input = root.querySelector<HTMLInputElement>('[data-action="search"]');
      const sortBtn = root.querySelector<HTMLButtonElement>('[data-action="sort"]');
      if (!resultsEl) return;

      let timer = 0;

      /** 把筛选状态镜像进地址栏（只在查询串真的变了时写，避免污染历史）。 */
      const syncUrl = (): void => {
        const url = `${window.location.pathname}${stateQuery(state)}${window.location.hash}`;
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (url !== current) window.history.replaceState(null, '', url);
      };

      /** 同步计数文案（工具栏与结果区各有一处）与排序按钮状态。 */
      const syncChrome = (total: number): void => {
        for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-result-count]'))) {
          el.textContent = countText(total);
        }
        if (sortBtn) {
          sortBtn.textContent = sortLabel(state.desc);
          sortBtn.setAttribute('aria-pressed', String(state.desc));
        }
      };

      /** 只重绘结果区，不动输入框（避免丢失焦点与光标位置）。 */
      const apply = (): void => {
        window.clearTimeout(timer);
        timer = 0;
        state.q = input?.value ?? state.q;
        const markup = renderIndexResults(state);
        const template = document.createElement('template');
        template.innerHTML = markup;
        resultsEl.replaceChildren(...Array.from(template.content.childNodes));
        if (chipsEl) {
          for (const chip of Array.from(chipsEl.querySelectorAll<HTMLButtonElement>('[data-action="filter"]'))) {
            chip.setAttribute('aria-pressed', String((chip.dataset.cat ?? '') === state.cat));
          }
        }
        syncChrome(computeItems(state).length);
        syncUrl();
      };

      const onInput = (): void => {
        state.q = input?.value ?? '';
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, 120);
      };

      const onClick = (event: Event): void => {
        const target = event.target as Element | null;
        if (!target) return;

        if (target.closest('[data-action="filter"]')) {
          const chip = target.closest<HTMLElement>('[data-action="filter"]');
          state.cat = chip?.getAttribute('data-cat') ?? '';
          apply();
          return;
        }

        if (target.closest('[data-action="sort"]')) {
          state.desc = !state.desc;
          apply();
        }
      };

      input?.addEventListener('input', onInput);
      root.addEventListener('click', onClick);

      /* 首次进入：按初始状态对齐一次（URL 已由路由层反映初始状态，这里只保证结果与状态一致） */
      apply();

      return () => {
        window.clearTimeout(timer);
        input?.removeEventListener('input', onInput);
        root.removeEventListener('click', onClick);
      };
    },
  };
}

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

export function render(ctx: RouteContext): PageResult {
  const id = ctx.params.id;
  if (!id) return renderIndex(ctx);

  const post = posts.find((p) => p.id === id);
  if (!post) return notFoundArticle(ctx);

  return renderArticle(post);
}
