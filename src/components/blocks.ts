/**
 * 内容块渲染器
 * ============================================================
 * 把 types/content.ts 里的 ContentBlock 联合类型渲染为 HTML。
 * 这是内容层与界面层之间的唯一桥梁：
 *   · 内容作者只写结构化数据，不写 HTML
 *   · 渲染规则集中在这里，改版不会遗漏任何文档
 */

import type { ContentBlock, DocSection } from '../types/content';
import { escapeHtml, inline, slugify } from '../core/format';
import { callout, codeBlock, definitions, faqList, metrics, quoteBlock, table, timeline } from './ui';
import { renderDiagram } from './diagrams';

/** 生成章节锚点 id（优先使用显式 id） */
export function sectionAnchor(section: DocSection): string {
  return section.id || slugify(section.title);
}

/** 渲染单个内容块 */
export function renderBlock(block: ContentBlock): string {
  switch (block.kind) {
    case 'paragraph':
      return `<p>${inline(block.text)}</p>`;

    case 'heading': {
      const tag = `h${block.level}`;
      const id = block.id ?? slugify(block.text);
      const no = block.no ? `<span class="sec-no">${escapeHtml(block.no)}</span>` : '';
      return `<${tag} id="${escapeHtml(id)}">${no}${escapeHtml(block.text)}</${tag}>`;
    }

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const isChecklist = Array.isArray(block.checks);
      const cls = isChecklist ? ' class="checklist"' : '';
      const items = block.items
        .map((item, i) => {
          if (!isChecklist) return `<li>${inline(item)}</li>`;
          const done = block.checks?.[i] === true;
          return `<li class="${done ? 'is-done' : 'is-todo'}">${inline(item)}</li>`;
        })
        .join('');
      return `<${tag}${cls}>${items}</${tag}>`;
    }

    case 'code':
      return codeBlock(block.code, { language: block.language, caption: block.caption });

    case 'table':
      return table({
        columns: block.columns,
        rows: block.rows,
        widths: block.widths,
        caption: block.caption,
      });

    case 'callout':
      return callout({
        variant: block.variant === 'quote' ? 'note' : block.variant,
        title: block.title,
        text: block.text,
        items: block.items,
      });

    case 'definitions':
      return definitions(block.items);

    case 'figure':
      return renderDiagram(block.diagram, { id: block.id, caption: block.caption });

    case 'metrics':
      return metrics(block.items);

    case 'quote':
      return quoteBlock(block.text, block.attribution);

    case 'faq':
      return faqList(block.items);

    case 'timeline':
      return timeline(block.items);

    default: {
      // 穷尽性检查：新增块类型时这里会编译报错，避免静默漏渲染
      const never: never = block;
      return `<p class="note">未知内容块：${escapeHtml(String((never as { kind?: string }).kind))}</p>`;
    }
  }
}

/** 渲染一组内容块 */
export function renderBlocks(blocks: ContentBlock[]): string {
  return blocks.map(renderBlock).join('\n');
}

/**
 * 渲染文档章节列表。
 * 每个章节渲染为 <section class="doc-section">，
 * 带可链接的锚点，供目录与交叉引用使用。
 */
export function renderSections(sections: DocSection[]): string {
  return sections
    .map((section) => {
      const anchor = sectionAnchor(section);
      const no = section.no ? `<span class="sec-no">${escapeHtml(section.no)}</span>` : '';
      return `
        <section class="doc-section" id="${escapeHtml(anchor)}" aria-labelledby="${escapeHtml(anchor)}-title">
          <h3 id="${escapeHtml(anchor)}-title">${no}${escapeHtml(section.title)}</h3>
          ${section.lead ? `<p>${inline(section.lead)}</p>` : ''}
          ${renderBlocks(section.blocks)}
        </section>`;
    })
    .join('\n');
}

/**
 * 生成文档目录。
 * 桌面端作为粘性侧栏，移动端折叠为「本页目录」。
 */
export function renderToc(sections: DocSection[], opts: { label?: string } = {}): string {
  if (!sections.length) return '';
  return `
    <nav class="doc-toc" aria-label="${escapeHtml(opts.label ?? '本页目录')}" data-toc>
      <h2>${escapeHtml(opts.label ?? '本页目录')}</h2>
      <ol>
        ${sections
          .map((s) => {
            const anchor = sectionAnchor(s);
            const no = s.no ? `<span class="toc-no">${escapeHtml(s.no)}</span>` : '';
            return `<li><a href="#${escapeHtml(anchor)}" data-toc-link="${escapeHtml(anchor)}">${no}${escapeHtml(s.title)}</a></li>`;
          })
          .join('')}
      </ol>
    </nav>`;
}
