/**
 * 架构与部署：交付形态 / 平台分层 / 部署步骤 / 运营与成本 / 维护承诺 / 真实状态
 * ========================================================================
 *
 * 与原始单文件版的差别（诚实性更新，不是美化）：
 *   · 原始版本说交付物是「单个自包含静态 HTML」，那描述的是当时的实现；
 *     本站现在由 Vite + TypeScript 多文件工程构建，GitHub 触发 Vercel 自动构建部署，
 *     **同一份内容源**另外产出一个单文件归档构建（`npm run archive`）供永久存档。
 *     两个交付物同源，这才是真正的改进，本页照实说明。
 *   · 原始版本的措辞容易让读者以为 Arweave 上传、GitHub 仓库、邮件列表、
 *     统计层都已经就位。本页用一节「这份文档与真实状态」逐条澄清：
 *     三件尚未发生，两处在用占位符，一件没有安装。
 *
 * 诚信红线：本站不提供服务、不卖产品、不承诺未来结果。本页不写「即将上线」。
 *
 * 所有来自数据的文本：或经 `escapeHtml()`，或经 `inline()`，或由组件内部转义。
 */

import {
  /* 内容 */
  architecture,
  pricing,
  deploySteps,
  nav,
  site,
  /* 工具 */
  escapeHtml,
  inline,
  /* 组件 */
  pageHero,
  sectionHead,
  callout,
  codeBlock,
  table,
  tag,
  card,
  refItem,
  renderDiagram,
} from '../components/kit';
import type { RouteContext } from '../core/router';

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
/* 一、交付形态                                                        */
/* ================================================================== */

function deliveryCards(): string {
  return `
    <div class="grid-3">
      ${card({
        no: '01',
        accent: 'brand',
        title: '零依赖',
        body:
          '构建产物是纯静态资源：无后端、无数据库、无运行时服务，也没有第三方脚本。' +
          '把它放到任意静态托管都能运行；拷贝到本地磁盘、双击打开也照样能读。',
      })}
      ${card({
        no: '02',
        accent: 'gold',
        title: '可审计',
        body:
          '文件即内容，Git 即历史。每一次修改都有记录、可回滚、可复核；' +
          '协议的版本号与变更日志不是文案，而是仓库里可以直接对账的提交历史。',
      })}
      ${card({
        no: '03',
        accent: 'muted',
        title: '可扩展',
        body:
          '主站与永久层分离：主站部署到静态托管（Vercel / Netlify 或任意等价服务），' +
          '核心文档以独立的单文件归档进入永久层。两边可以各自演进，互不阻塞。',
      })}
    </div>`;
}

/* ================================================================== */
/* 二、平台分层                                                        */
/* ================================================================== */

function layerList(): string {
  return `
    <div class="layer-list">
      ${architecture
        .map(
          (layer) => `
        <div class="layer-row">
          <span class="layer-no">${escapeHtml(layer.no)}</span>
          <span class="layer-name">${escapeHtml(layer.name)}</span>
          <p class="layer-desc">${inline(layer.description)}</p>
          <span class="layer-cost">${escapeHtml(layer.cost)}</span>
        </div>`,
        )
        .join('')}
    </div>`;
}

/* ================================================================== */
/* 三、部署步骤                                                        */
/* ================================================================== */

function stepList(): string {
  return `
    <div class="step-list">
      ${deploySteps
        .map(
          (step) => `
        <div class="step-row">
          <span class="step-no">${escapeHtml(step.no)}</span>
          <div class="step-body">
            <h4>${escapeHtml(step.title)}</h4>
            <p>${inline(step.text)}</p>
            ${step.code ? codeBlock(step.code, { language: 'bash', caption: '在仓库根目录执行' }) : ''}
            ${step.note ? `<p class="note">${inline(step.note)}</p>` : ''}
          </div>
        </div>`,
        )
        .join('')}
    </div>`;
}

/* ================================================================== */
/* 四、运营与成本                                                      */
/* ================================================================== */

function pricingTable(): string {
  /* `pricing` 的最后一行是合计行（数据里就是这样写的），单独拿出来加粗。 */
  const rows = pricing.slice(0, -1);
  const total = pricing[pricing.length - 1];

  const body: string[][] = rows.map((row) => [
    `<strong>${escapeHtml(row.item)}</strong>`,
    escapeHtml(row.note) + (row.optional ? ` ${tag('可选', 'muted')}` : ''),
    escapeHtml(row.cost),
  ]);

  if (total) {
    body.push([
      `<strong>${escapeHtml(total.item)}</strong>`,
      escapeHtml(total.note),
      `<strong>${escapeHtml(total.cost)}</strong>`,
    ]);
  }

  return table({
    columns: ['项目', '说明', '预估成本'],
    rows: body,
    caption:
      '以上为公开定价下的粗略估算，不是报价，也不是承诺；价格会变，以各服务商当前页面为准。',
  });
}

/* ================================================================== */
/* 骨架                                                                */
/* ================================================================== */

function html(): string {
  const entry = nav.find((n) => n.path === '/deploy');
  const hero = pageHero({
    kicker: entry?.kicker ?? '架构与部署 · Deploy',
    title: '为「活很久」而设计',
    lead: 'ecylt.top「七十年之约」讨论了如何让网站存在七十年甚至两百年。本站的答案是：永久层存档 + 零依赖静态主站。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '架构与部署' }],
  });

  const guideHref = `${site.repository}/blob/main/docs/零基础部署指南.md`;

  return `
    ${hero}

    <section class="section" aria-label="交付形态">
      <div class="container">
        ${sectionHead({
          label: '交付形态',
          title: '一份内容源，两个交付物',
          lead:
            '本站现在是 Vite + TypeScript 多文件工程：推送到 GitHub 即由 Vercel 自动构建部署；' +
            '同一份内容源另外产出一个单文件自包含归档（`npm run archive`），用于永久存档。' +
            '两者都由内容层生成，不需要各改一遍 —— 这是相对原始手写单文件版本的实际改进。',
        })}
        ${deliveryCards()}
        <div class="stack" style="margin-top:32px">
          ${renderDiagram('architecture-layers', {
            caption: '平台分层示意（示意图，不代表实验数据或测量结果）。上为永久层，下为交付与协作层。',
          })}
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="平台分层">
      <div class="container">
        ${sectionHead({
          label: '平台分层',
          title: '六层结构',
          lead: '每一层都可以单独替换：换托管、换邮件服务、甚至停掉分析层，都不影响其它层，也不影响永久层里的内容。',
        })}
        ${layerList()}
      </div>
    </section>

    <section class="section" aria-label="部署步骤">
      <div class="container">
        ${sectionHead({
          label: '部署步骤',
          title: '从本地到永久存档',
          lead: '四步走完一遍；其中第 03 步（永久存档）是承诺中尚未执行的一步，请对照下一节的真实状态一起读。',
        })}
        ${stepList()}
      </div>
    </section>

    <section class="section section--alt" aria-label="运营与成本">
      <div class="container">
        ${sectionHead({
          label: '运营与成本',
          title: '可持续运营',
          lead: '基础运营成本可控制在每月 30 美元以内。永生相关项目很多，活下来的很少——成本控制是存活的前提。',
        })}
        ${pricingTable()}
        ${callout({
          variant: 'note',
          title: '关于「网站分析」这一行',
          text:
            '表中的 Plausible 是可选行，也是唯一涉及访客数据的服务；' +
            '**本站当前没有安装任何第三方统计或分析脚本**——包括 Plausible 在内，一行都没有。' +
            '因此在它真正装上之前，本站不掌握任何访问数据，这一行只是「如果将来需要」的预算占位。',
        })}
      </div>
    </section>

    <section class="section" aria-label="维护承诺">
      <div class="container">
        ${sectionHead({
          label: '维护承诺',
          title: '内容不荒废的最低标准',
          lead: '承诺不是「高频更新」，而是「不消失」：即使更新放缓，已经发布的内容仍然可读、可追溯。',
        })}
        <div class="grid-2">
          ${card({
            iconName: 'clock',
            title: '最低更新承诺',
            body: '每月至少一篇研究进展博客；每季度至少一次协议版本更新；每年至少一次年度总结。',
            foot:
              '<p class="note">这是下限，不是上限。协议结构未冻结前（草案阶段），版本更新通常比这个频率更高。</p>',
          })}
          ${card({
            iconName: 'gitBranch',
            title: '内容管理方式',
            body:
              '采用「文件即内容」（file-as-content）：全部正文以带类型的 TypeScript 模块存放在 `src/content/` 下，' +
              '页面只负责把数据渲染成 HTML。Git 就是 CMS，提交历史就是内容历史——每次修改都可回溯、可回滚、可审计，' +
              '并且天然带署名与时间。',
            foot:
              `<p class="note">仓库地址目前是占位符（<span class="mono">${escapeHtml(site.repository)}</span>），` +
              '正式仓库启用后替换；在那之前，内容历史的完整副本只存在于作者本机。</p>',
          })}
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="这份文档与真实状态">
      <div class="container-narrow">
        ${sectionHead({
          label: '这份文档与真实状态',
          title: '哪些是真的，哪些还没做',
          lead: '原始版本的同名文档用「将来时」描述了几件当时并未完成的事，读起来像已经完成。这里逐条说清当前状态。',
        })}
        ${callout({
          variant: 'warning',
          title: '当前真实状态（截至本文档最后更新）',
          items: [
            '**已经做到的**：本站是可部署的纯静态站点，构建通过、可离线安装，**没有后端**——没有服务器代码、没有数据库、没有账号系统，也没有任何密钥需要配置。',
            '**尚未执行的**：**Arweave 永久层上传还没有做过**。归档构建（`npm run archive`）已经产出，但「上传即不可删」这一步没有发生，因此目前不存在任何永久网关链接。',
            '**占位符**：GitHub 仓库地址（' + escapeHtml(site.repository) + '）与邮件地址（' + escapeHtml(site.email) + '）都是**占位符**，不是可用地址。',
            '**没有安装的**：统计与分析层未安装，邮件列表尚未接入任何服务商——订阅表单不会把地址发送到任何地方。',
            '**因此**：本页描述的部署流程是「可以照着做的流程」，不是「已经做完的记录」。文档与站点的差距以本节为准。',
          ],
        })}
      </div>
    </section>

    <section class="section" aria-label="指向部署指南">
      <div class="container-narrow">
        ${sectionHead({
          label: '指向部署指南',
          title: '想自己部署一份，从这里开始',
          lead: '仓库里有一份面向「从没部署过任何网站」的读者的部署指南。',
        })}
        <div class="ref-list">
          ${refItem({
            href: guideHref,
            title: 'docs/零基础部署指南.md',
            desc:
              '按顺序覆盖：安装 Node.js 与 pnpm、本地预览、构建产物、导入 GitHub、在 Vercel 上配置构建命令与输出目录、' +
              '<code>vercel.json</code> 的 SPA 回退规则、自定义域名与 HTTPS、以及最后一步：把单文件归档上传到 Arweave。' +
              '假设读者此前没有部署过任何东西，命令逐条给出。',
            iconName: 'external',
          })}
        </div>
        <p class="note">
          说明：这份指南是<strong>仓库里的文件</strong>（<code>docs/</code> 目录），不是本站的一个页面 —— 站点上没有「部署指南」这个路由，
          上面的链接指向仓库，仓库地址目前仍是占位符。换句话说：指南已经写好，但它和仓库一样，要等正式地址启用后才能从网页打开。
          在那之前，请按本页步骤执行，两者内容一致。
        </p>
      </div>
    </section>`;
}

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

export function render(_ctx: RouteContext): PageResult {
  return {
    html: html(),
    title: '架构与部署',
    description: nav.find((n) => n.path === '/deploy')?.description,
    path: '/deploy',
  };
}
