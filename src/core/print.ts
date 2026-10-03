/**
 * 打印与导出
 * ============================================================
 * 研究纲领的文档必须可被打印归档、可被导出为纯数据。
 * 这两件事都不需要后端。
 */

/**
 * 打印当前文档。
 * 打印样式在 design-system.css 的 @media print 中定义：
 * 隐藏导航与装饰、暴露外链地址、避免分页截断。
 */
export function printDocument(): void {
  window.print();
}

/** 触发浏览器下载一个文本文件 */
export function downloadFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 让浏览器有时间开始下载后再释放
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * 把当前页面可见的正文导出为 Markdown。
 * 用途：把协议粘进邮件、issue、笔记软件，或作为长期纯文本归档。
 * 刻意只导出语义内容，不导出界面外壳。
 */
export function exportMainAsMarkdown(title: string): string {
  const main = document.querySelector<HTMLElement>('main, #view-root');
  if (!main) return `# ${title}\n`;

  const lines: string[] = [`# ${title}`, '', `> 导出时间：${new Date().toISOString()}`, ''];

  const walk = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      const text = normalize(child.textContent ?? '');

      switch (tag) {
        case 'h1':
          lines.push('', `# ${text}`, '');
          break;
        case 'h2':
          lines.push('', `## ${text}`, '');
          break;
        case 'h3':
          lines.push('', `### ${text}`, '');
          break;
        case 'h4':
          lines.push('', `#### ${text}`, '');
          break;
        case 'p':
          if (text) lines.push(text, '');
          break;
        case 'blockquote':
          lines.push(`> ${text}`, '');
          break;
        case 'pre':
          lines.push('```', (child.textContent ?? '').trim(), '```', '');
          break;
        case 'ul':
        case 'ol':
          for (const li of Array.from(child.querySelectorAll(':scope > li'))) {
            const t = normalize(li.textContent ?? '');
            if (t) lines.push(`${tag === 'ol' ? '1.' : '-'} ${t}`);
          }
          lines.push('');
          break;
        case 'table': {
          const head = Array.from(child.querySelectorAll('thead th')).map((th) =>
            normalize(th.textContent ?? ''),
          );
          if (head.length) {
            lines.push(`| ${head.join(' | ')} |`);
            lines.push(`| ${head.map(() => '---').join(' | ')} |`);
            for (const tr of Array.from(child.querySelectorAll('tbody tr'))) {
              const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
                normalize(td.textContent ?? ''),
              );
              lines.push(`| ${cells.join(' | ')} |`);
            }
            lines.push('');
          }
          break;
        }
        case 'details': {
          const summary = child.querySelector('summary');
          const body = child.querySelector('.faq-a, div:not(summary)');
          if (summary) lines.push(`**${normalize(summary.textContent ?? '')}**`, '');
          if (body) lines.push(normalize(body.textContent ?? ''), '');
          break;
        }
        case 'dl': {
          for (const pair of Array.from(child.children)) {
            if (pair.tagName.toLowerCase() === 'div') {
              const dt = pair.querySelector('dt');
              const dd = pair.querySelector('dd');
              if (dt && dd) {
                lines.push(`- **${normalize(dt.textContent ?? '')}**：${normalize(dd.textContent ?? '')}`);
              }
            }
          }
          lines.push('');
          break;
        }
        case 'nav':
        case 'footer':
        case 'script':
        case 'style':
          break;
        default:
          // 递归处理容器，但避免把整块文本重复输出
          if (!child.querySelector('h1,h2,h3,h4,p,ul,ol,table,pre,blockquote,details,dl')) {
            if (text && text.length > 0) lines.push(text, '');
          } else {
            walk(child);
          }
      }
    }
  };

  walk(main);

  lines.push('', '---', '', '本文档由「永生计划 · 研究纲领平台」导出，采用 CC BY 4.0 许可。');
  return lines.join('\n');
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
