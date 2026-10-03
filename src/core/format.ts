/**
 * 文案渲染与格式化工具
 * ============================================================
 * 安全前提：所有文本来自仓库内的内容模块（非用户输入），但依然
 * 采用「先转义、后套用标记」的顺序，确保即使内容里出现 HTML 也不会
 * 被当作标记执行。用户输入（批注、搜索词）一律走 escapeHtml。
 */

/** HTML 转义 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 把内容模块里的行内标记渲染为 HTML。
 * 支持：**粗体**、*斜体*、`代码`、[文字](链接)
 * 顺序：先整体转义，再逐个替换标记 —— 因此内容中的 `<script>` 只会显示为文本。
 */
export function inline(text: string): string {
  let out = escapeHtml(text);

  // `代码`（优先级最高，避免内部被其它规则改写）
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);

  // [文字](链接) —— 只允许站内路径与 http(s)，其它协议降级为纯文本
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) => {
      const safe = /^(https?:\/\/|\/|mailto:)/i.test(href);
      if (!safe) return label;
      const external = /^https?:\/\//i.test(href);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${attrs}>${label}</a>`;
    },
  );

  // **粗体**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // *斜体*（避开已经被用于粗体的星号）
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  return out;
}

/** 中英混排的标题转 slug，用于生成锚点 id */
export function slugify(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    // 保留中日韩字符、字母、数字、空格与连字符
    .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}a-z0-9\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'section';
}

/** 格式化 ISO 日期为中文可读形式 */
export function formatDate(iso: string, style: 'full' | 'short' | 'month' = 'short'): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  if (style === 'month') return `${y} 年 ${m} 月`;
  if (style === 'full') {
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${y} 年 ${m} 月 ${day} 日（周${week}）`;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 相对时间：用于「最近更新」提示 */
export function relativeTime(iso: string): string {
  const then = new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const day = 86_400_000;

  if (diff < 0) return formatDate(iso);
  if (diff < day) return '今天';
  if (diff < day * 2) return '昨天';
  if (diff < day * 30) return `${Math.floor(diff / day)} 天前`;
  if (diff < day * 365) return `${Math.floor(diff / (day * 30))} 个月前`;
  const years = Math.floor(diff / (day * 365));
  return years <= 1 ? '1 年前' : `${years} 年前`;
}

/** 字节数格式化 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 状态标签：实验状态 → 中文 + 配色键 */
export const EXPERIMENT_STATUS_LABEL: Record<
  string,
  { label: string; tone: 'brand' | 'gold' | 'muted' | 'alert' }
> = {
  running: { label: '进行中', tone: 'brand' },
  design: { label: '设计阶段', tone: 'gold' },
  pending: { label: '待发布', tone: 'muted' },
  complete: { label: '已完成', tone: 'brand' },
  negative: { label: '已完成 · 阴性结果', tone: 'brand' },
  blocked: { label: '受阻', tone: 'alert' },
};

/** 发布状态标签 */
export const PUBLICATION_STATUS_LABEL: Record<
  string,
  { label: string; tone: 'brand' | 'gold' | 'muted' | 'alert' }
> = {
  published: { label: '已发布', tone: 'brand' },
  draft: { label: '草案', tone: 'gold' },
  review: { label: '内部复核', tone: 'gold' },
  frozen: { label: '已冻结', tone: 'brand' },
  archived: { label: '已归档', tone: 'muted' },
};

/** 就绪度百分比（0–1 → 整数百分比字符串） */
export function percent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

/** 关键词高亮（用于搜索结果），输入必须是纯文本 */
export function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const q = query.trim();
  if (!q) return escaped;

  // 转义正则元字符，避免用户输入的括号等造成异常
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return escaped.replace(new RegExp(safe, 'gi'), (m) => `<mark>${m}</mark>`);
  } catch {
    return escaped;
  }
}

/** 多关键词切分：空格分隔，忽略单字符噪声 */
export function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** 截断文本，中文按字符数 */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + '…';
}

/** 去掉行内标记，得到纯文本（用于摘要与搜索索引） */
export function stripInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}
