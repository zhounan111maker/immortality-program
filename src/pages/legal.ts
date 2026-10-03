/**
 * 条款与隐私：四份政策文档 + 目录 + 隐私补充 + 合规提示
 * ==================================================
 *
 * 结构上与原始单文件版的差别：原始版本只把四段政策文本顺序排在 `.prose` 里。
 * 本页保留全部原文（不删减、不改写任何条款），另外补上三件原始版本没有的东西：
 *
 *   1. 目录 —— 四份文档的锚点清单，长文可以先看骨架；
 *   2. 隐私补充 —— 原文说的是「订阅地址由邮件服务商处理」，那描述的是邮件列表
 *      接入之后的情形。本站在那之前没有后端、没有账号、没有追踪 Cookie、
 *      没有任何第三方统计；唯一存下来的数据在这台设备的 localStorage 里，
 *      并且提供导出与清除两个按钮。这一段是补充说明，不覆盖原文的条款效力。
 *   3. 合规提示 —— 与首页同一条提示，出处是同一个内容源（legal.ts）。
 *
 * 诚信红线：本站不提供服务、不卖产品、不承诺未来结果。隐私补充里如实写明
 * 「永久层上传尚未执行」「仓库与邮箱是占位符」这类状态，不粉饰。
 *
 * 所有来自数据的文本：或经 `escapeHtml()`，或经 `inline()`，或由组件内部转义。
 */

import {
  /* 内容 */
  legalDocs,
  complianceNotice,
  complianceLink,
  nav,
  site,
  /* 工具 */
  escapeHtml,
  formatBytes,
  /* 内容块渲染 */
  renderBlocks,
  /* 组件 */
  pageHero,
  sectionHead,
  callout,
  dateLabel,
  tag,
  /* 本地状态与行为 */
  storage,
  toast,
  confirmDialog,
} from '../components/kit';
import type { RouteContext } from '../core/router';
import type { LegalDoc } from '../components/kit';

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

/* ================================================================== */
/* 一、目录                                                            */
/* ================================================================== */

/**
 * 目录：用 `post-index-item`（博客索引里已有的锚点列表样式），
 * 而不是 `doc-toc` —— 后者在窄屏下 `display:none`，做不了移动端目录。
 */
function tableOfContents(docs: LegalDoc[]): string {
  return `
    <section class="section section--tight" aria-labelledby="legal-toc-title">
      <div class="container-narrow">
        <h2 class="sec-label" id="legal-toc-title">目录</h2>
        <nav class="stack-sm" aria-label="本页目录">
          ${docs
            .map(
              (doc, i) => `
            <a class="post-index-item" href="#${escapeHtml(doc.id)}">
              <span class="t"><span class="sec-no">${String(i + 1).padStart(2, '0')}</span>${escapeHtml(doc.title)}</span>
              <span class="m"><span>本政策 ${escapeHtml(site.policyVersion)}</span><span>${escapeHtml(doc.updatedAt)}</span></span>
            </a>`,
            )
            .join('')}
        </nav>
      </div>
    </section>`;
}

/* ================================================================== */
/* 二、四份政策文档                                                    */
/* ================================================================== */

function legalDocument(doc: LegalDoc, index: number): string {
  /* 「政策版本」一篇：条目文字本身已含版本与生效日期，前缀只复述版本号，不再重复日期。 */
  const isPolicyVersion = doc.id === 'legal-policy-version';
  const label = isPolicyVersion
    ? dateLabel(doc.updatedAt, `本政策 ${site.policyVersion} ·`)
    : dateLabel(doc.updatedAt);
  const headingId = `${doc.id}-title`;

  return `
    <section class="section--tight" aria-labelledby="${escapeHtml(headingId)}">
      <h2 id="${escapeHtml(doc.id)}">
        <span class="sr-only" id="${escapeHtml(headingId)}">${escapeHtml(doc.title)}</span>
        <span class="sec-no">${String(index + 1).padStart(2, '0')}</span>${escapeHtml(doc.title)}
      </h2>
      <p class="doc-head-meta">${label}${isPolicyVersion ? '' : ` ${tag(doc.updatedAt === site.policyDate ? '当前版本' : '历史版本', doc.updatedAt === site.policyDate ? 'brand' : 'muted')}`}</p>
      <div class="prose">${renderBlocks(doc.blocks)}</div>
    </section>`;
}

/* ================================================================== */
/* 三、隐私补充（原始版本没有的一节）                                   */
/* ================================================================== */

function privacySupplement(): string {
  return `
    <section class="section section--alt" aria-label="隐私补充">
      <div class="container-narrow">
        ${sectionHead({
          label: '隐私补充',
          title: '没有服务器，所以没有可泄露的数据',
          lead: '上面的隐私政策描述的是邮件列表接入之后的处理方式。在那之前，本页说清当前的真实情况——包括你能做什么。',
        })}

        ${callout({
          variant: 'note',
          title: '现在的实际情况',
          items: [
            '**没有后端**：本站是纯静态站点，没有服务器代码、没有数据库、没有 API、没有账号系统，也没有云同步。',
            '**没有账号**：不需要注册、登录，也不存在与你身份关联的记录。',
            '**没有追踪 Cookie**：本站不设置任何用于追踪的 Cookie，也不做跨站跟踪。',
            '**没有第三方统计**：没有 Google Analytics、没有 Plausible、没有像素、没有广告脚本——一个都没有安装。',
            '**唯一存下来的数据**：在你自己的浏览器 `localStorage` 里 —— 阅读进度、书签、批注与界面偏好（主题、字号）。',
            '**它不会离开这台设备**：这些数据从不发送到任何服务器（本站在你阅读时也不写任何服务器），换设备、换浏览器就是另一份空白数据。',
            '**清除浏览器数据即彻底删除**：清理站点数据、隐私模式结束、或使用下面的「清除本地数据」按钮，都会让它消失，且无法恢复。',
          ],
        })}

        <div class="info-list">
          <div class="info-row">
            <span class="k">存储位置</span>
            <span class="v">本浏览器 localStorage（键前缀 <span class="mono">ip.v1.</span>）；不使用 Cookie，不使用 IndexedDB 存档。</span>
          </div>
          <div class="info-row">
            <span class="k">导出内容</span>
            <span class="v">阅读进度、书签、批注与界面偏好，输出为一个 JSON 文件，便于自行备份或审阅。</span>
          </div>
          <div class="info-row">
            <span class="k">清除范围</span>
            <span class="v">只清除本站在本机写入的键，不影响同一浏览器里其它站点的数据。</span>
          </div>
        </div>

        <div class="btn-row" style="margin-top:22px">
          <button class="btn btn--primary" type="button" data-action="export-data">导出本地数据（JSON）</button>
          <button class="btn btn--ghost" type="button" data-action="clear-data">清除本地数据</button>
        </div>

        <p class="note">
          说明：上面的隐私政策提到「订阅数据由邮件服务商处理」。邮件列表目前**尚未接入任何服务商**，
          订阅表单只在本地提示「已记录」，不会把邮箱地址发送到任何地方。等到真正接入时，
          本页会先更新这段说明与政策版本号。
        </p>
      </div>
    </section>`;
}

/* ================================================================== */
/* 骨架                                                                */
/* ================================================================== */

function html(): string {
  const entry = nav.find((n) => n.path === '/legal');
  const hero = pageHero({
    kicker: entry?.kicker ?? '条款 · Legal',
    title: '免责声明、服务条款与隐私政策',
    lead: '本站只发布研究文档，不提供任何实际服务——这是法律风险的根源性降低。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '条款与隐私' }],
  });

  return `
    ${hero}
    ${tableOfContents(legalDocs)}
    <section class="section" aria-label="条款正文">
      <div class="container-narrow">
        ${legalDocs.map((doc, i) => legalDocument(doc, i)).join('')}
      </div>
    </section>
    ${privacySupplement()}
    <section class="section section--tight" aria-label="合规提示">
      <div class="container-narrow">
        ${callout({
          variant: 'note',
          title: '合规提示',
          text: `${complianceNotice}[${complianceLink.label}](${complianceLink.href})。`,
        })}
      </div>
    </section>`;
}

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

/** 导出本地数据：不发起任何请求，纯前端 Blob 下载。 */
function exportLocalData(): void {
  const data = storage.exportAll();
  const keys = Object.keys(data).length;
  if (!keys) {
    toast('本机还没有本站写入的数据，无需导出。', { tone: 'info' });
    return;
  }

  const payload = {
    site: `${site.name} · ${site.tagline}`,
    note: '本文件由浏览器本地导出，内容只来自这台设备的 localStorage；本站没有后端，也未上传任何数据。',
    exportedAt: new Date().toISOString(),
    keys,
    data,
  };

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `immortality-program-local-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`已导出 ${keys} 项本地数据，文件保存在你的下载目录。`, { tone: 'success' });
  } catch {
    toast('当前浏览器阻止了文件下载，无法导出；可在开发者工具的 Application → Local Storage 中查看。', {
      tone: 'warn',
      duration: 6000,
    });
  }
}

/** 清除本地数据：先确认，再报告释放的体积。 */
async function clearLocalData(): Promise<void> {
  const before = storage.usageBytes();
  const keys = storage.keys().length;

  if (!keys) {
    toast('本机没有本站写入的数据，无需清除。', { tone: 'info' });
    return;
  }

  const ok = await confirmDialog({
    title: '清除本地数据',
    message: `将删除本站在这台设备上保存的 ${keys} 项数据（阅读进度、书签、批注与界面偏好）。大约会释放 ${formatBytes(before)} 浏览器存储空间。此操作不可撤销，且本站没有云端副本可以恢复。`,
    confirmLabel: '清除',
    cancelLabel: '取消',
    danger: true,
  });
  if (!ok) return;

  storage.clearAll();
  const freed = formatBytes(before);
  toast(`已清除本地数据，释放约 ${freed}。本站不保留任何副本。`, { tone: 'success', duration: 5000 });
}

export function render(_ctx: RouteContext): PageResult {
  return {
    html: html(),
    title: '条款与隐私',
    description: nav.find((n) => n.path === '/legal')?.description,
    path: '/legal',
    mount: (root) => {
      const onExport = (): void => exportLocalData();
      const onClear = (): void => {
        void clearLocalData();
      };

      const exportBtn = root.querySelector<HTMLButtonElement>('[data-action="export-data"]');
      const clearBtn = root.querySelector<HTMLButtonElement>('[data-action="clear-data"]');
      exportBtn?.addEventListener('click', onExport);
      clearBtn?.addEventListener('click', onClear);

      return () => {
        exportBtn?.removeEventListener('click', onExport);
        clearBtn?.removeEventListener('click', onClear);
      };
    },
  };
}
