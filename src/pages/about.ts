/**
 * 关于页（/about）
 * ============================================================
 *
 * 迁移自《永生计划 · 研究纲领平台》的 `#view-about`，并做以下改进：
 *   1. 「协议发布标准」不再只是口号：每条原则下方单列「在本站的体现」，
 *      把 evidence 字段（可核查的执行位置）直接摆在读者面前；
 *   2. 新增「如何引用本纲领」：给出可直接复制的引用模板，并说明为什么
 *      引用协议必须写明版本号、为什么模板里的域名仍是占位符；
 *   3. 新增「数据与隐私立场」：逐条说明本站不收集什么，并提供导出 / 清除
 *      本机数据两个按钮——没有后端这件事必须可验证，而不是只写在文案里。
 *
 * 诚信边界：不提供服务、不承诺结果、不声称拥有合作方或经费；
 * 邮箱与代码仓库地址是占位符，正式域名启用前不应被当作可用地址引用。
 */

import type { RouteContext } from '../core/router';
import {
  site,
  nav,
  protocols,
  principles,
  risks,
  openWork,
  escapeHtml,
  inline,
  formatBytes,
  pageHero,
  sectionHead,
  quoteBlock,
  card,
  tag,
  faqList,
  codeBlock,
  icon,
  storage,
  confirmDialog,
  toast,
} from '../components/kit';

/** 路由层认识的页面结果形状（见 docs/PAGE-CONTRACT.md 第 1 节） */
export interface PageResult {
  html: string;
  title: string;
  description?: string;
  path?: string;
  mount?: (root: HTMLElement) => void | (() => void);
}

/* ------------------------------------------------------------------ */
/* 局部常量                                                            */
/* ------------------------------------------------------------------ */

/** 参与门槛的展示口径 */
const EFFORT_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: '低',
  medium: '中',
  high: '高',
};

/** 引用模板里的域名占位符（保留占位性质，不写成看似真实的地址） */
const DOMAIN_PLACEHOLDER = '<你的域名>';

/** 同上的 HTML 写法：占位符里的尖括号必须转义，否则会被浏览器当作标签吃掉 */
const DOMAIN_PLACEHOLDER_HTML = '&lt;你的域名&gt;';

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

export function render(ctx: RouteContext): PageResult {
  const aboutNav = nav.find((item) => item.path === '/about');
  const kicker = aboutNav?.kicker ?? '关于 · About';
  const lead = aboutNav?.description ?? '';

  // 引用样例取 PRT-001（协议清单的第一份），版本号来自数据本身，不写死
  const citeSample = protocols.find((protocol) => protocol.id === 'p01') ?? protocols[0];
  const citation = `永生计划研究纲领（${site.establishedYear}）。${citeSample.code} · ${citeSample.title}，${citeSample.version}。检索自 https://${DOMAIN_PLACEHOLDER}/protocols/${citeSample.id}`;

  const usage = escapeHtml(formatBytes(storage.usageBytes()));

  const html = `
    ${pageHero({
      kicker,
      title: '纲领的定位、边界与合作',
      lead,
    })}

    <section class="section" aria-label="定位声明">
      <div class="container-narrow">
        ${sectionHead({ label: '定位声明', title: '这个网站是什么' })}
        ${quoteBlock(
          '永生计划是一个以『迁移永生协议』为核心的科学—哲学研究纲领。它不是冷冻保存服务，不是超人类主义倡导组织，而是一个协议与文献的发布平台：让 HES 实验、TES 身份置信曲线与迁移永生 QTR 框架可以被检索、被讨论、被引用、被独立验证。',
          '纲领定位声明',
        )}
        <p>这个定位直接决定了本站的一切设计：不需要论坛与用户系统，因为社区不是目标；不需要支付与客户支持，因为没有服务可卖；需要的是清晰的信息架构、可靠的版本控制、以及让研究者可以协作的机制。</p>
      </div>
    </section>

    <section class="section section--alt" aria-label="这个纲领不是什么">
      <div class="container">
        ${sectionHead({
          label: '边界',
          title: '这个纲领不是什么',
          lead: '把边界写在前面，比把愿景写在前面更有用。以下三条界定同时出现在首页与协议页，这里给出各自的理由：',
        })}
        <div class="grid-3">
          ${card({
            no: 'NO.01',
            title: '不是冷冻保存公司',
            body: 'Alcor、Cryonics Institute 提供付费保存服务，负责保存身体。本站不提供任何保存、迁移或治疗服务——这里没有服务可买。',
          })}
          ${card({
            no: 'NO.02',
            title: '不是超人类主义倡导组织',
            body: 'Humanity+、IEET 推动社会接受技术增强。本站不以说服为目标，不描绘必然到来的未来，只陈述可以检验的主张。',
          })}
          ${card({
            no: 'NO.03',
            title: '是协议与文献的发布平台',
            body: 'HES 实验、TES 身份置信曲线、迁移永生 QTR 框架——这些是本站的核心内容。网站的作用是让它们可检索、可讨论、可引用、可独立验证。',
          })}
        </div>
      </div>
    </section>

    <section class="section" aria-label="研究者背景">
      <div class="container">
        ${sectionHead({
          label: '研究者背景',
          title: '谁在维护这个纲领',
          lead: '纲领的规模很小，这一点不需要掩饰；资源限制也正是「只发布可检验内容」这一取舍的来源之一。',
        })}
        <div class="grid-2">
          ${card({
            title: '独立研究者 · 在校学生',
            body: '纲领由一名独立研究者维护。资源有限，但研究纲领不依赖实验室与经费，依赖程序、记录与公开——这三样都是免费的。',
          })}
          ${card({
            title: '研究方向',
            body: '人工意识理论（TSE 热力学自我体验模型）、迁移永生协议框架。本站的三份协议是这些方向的可执行化产物。',
          })}
          ${card({
            title: '研究立场',
            body: '主张必须是可检验的；结论必须附带边界；过程必须公开。本站所有文档遵循这三条，无一例外。',
          })}
          ${card({
            title: '与现有机构的关系',
            body: '与 Lifespan Research Institute、Buck Institute、中科院动物研究所刘光慧研究组等抗衰老机构存在方向交集但不重叠：他们研究延长，我们研究迁移。这个「不完全重叠」正是合作的价值所在。本站不对任何机构的实践作评价。',
          })}
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="研究原则">
      <div class="container">
        ${sectionHead({
          label: '研究原则',
          title: '协议如何在这里发布',
          lead: '区分「科学研究」与「空想」的唯一标准，是程序的可检验性。以下五条是本站对每一份协议的最低要求；每一条都附上它在本站的实际体现位置，而不是只留下口号。',
        })}
        <div class="grid-2">
          ${principles
            .map((principle) =>
              card({
                no: principle.no,
                title: principle.title,
                body: principle.text,
                foot: `<p class="note"><strong>在本站的体现</strong>：${
                  principle.evidence ? inline(principle.evidence) : '未记录'
                }</p>`,
              }),
            )
            .join('')}
        </div>
      </div>
    </section>

    <section class="section" aria-label="开放协作">
      <div class="container">
        ${sectionHead({
          label: '开放协作',
          title: '纲领欢迎研究者参与的工作',
          lead: '作为在校学生资源有限，但研究纲领平台可以吸引合作者——而不需要你拥有实验室。以下三项工作当前开放：',
        })}
        <div class="grid-3">
          ${openWork
            .map((item) =>
              card({
                title: item.title,
                body: item.text,
                meta: tag(`门槛：${EFFORT_LABEL[item.effort]}`),
                foot: `<span class="cluster">${item.skills.map((skill) => tag(skill)).join('')}</span>`,
              }),
            )
            .join('')}
        </div>
        <p class="note">有意参与的研究者可通过<a href="/contact">联系页</a>的邮箱或 GitHub 联系。上述工作都是研究性协作，不涉及报酬、职位或任何形式的服务承诺。</p>
      </div>
    </section>

    <section class="section section--alt" aria-label="风险与应对">
      <div class="container">
        ${sectionHead({
          label: '风险与应对',
          title: '已知风险与应对方案',
          lead: '这些是本纲领自己承认的失效模式。写出应对方案不表示风险已经解决，只表示它被记录在案。',
        })}
        ${faqList(risks)}
      </div>
    </section>

    <section class="section" aria-label="如何引用本纲领">
      <div class="container-narrow">
        ${sectionHead({ label: '引用', title: '如何引用本纲领' })}
        <div class="stack">
          ${codeBlock(citation, { language: 'text', caption: '建议引用格式（域名为占位符，启用正式域名后替换）' })}
          <p class="note">引用协议时必须写明版本号。协议是版本化文档：草案阶段的正文会继续改动，同一个协议编号在不同时间可能对应不同文本。只有带上版本号与检索日期，引用才能定位到你实际读到的那一版；版本号、发布日期与变更日志都列在协议详情页与首页「最新发布」表中。</p>
          <p class="note">上面的引用模板是占位形式：本站尚未绑定正式域名，<code>https://${DOMAIN_PLACEHOLDER_HTML}</code> 需要替换为实际部署域名后才可使用。文档中的联系邮箱与代码仓库地址同样是占位符，正式启用前不应被当作可用地址引用或分发。</p>
          <p class="note">许可：本纲领的协议与文档采用 ${escapeHtml(site.license)} 许可（署名 4.0 国际）发布，你可以自由复制、分发与改编，包括用于教学与研究，条件是注明来源；代码部分随仓库提供，便于独立复现与审计。</p>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="数据与隐私立场">
      <div class="container">
        ${sectionHead({
          label: '数据与隐私',
          title: '数据与隐私立场',
          lead: '本站没有后端，因此不存在「服务器上的你的数据」这回事。这一点不用承诺来表达，而用可以自己动手检查的按钮来表达。',
        })}
        <div class="grid-2">
          <div class="card">
            <h3>本站不收集、也不上传</h3>
            <ul>
              <li>没有后端、没有数据库：本站是纯静态站点，没有任何服务端进程接收你的输入。</li>
              <li>没有账号、没有登录、没有云同步：不存在需要注册或保护的服务端账户。</li>
              <li>没有追踪 Cookie，没有第三方分析脚本，没有广告与社交插件。</li>
              <li>订阅表单只做本机记录，不发送到任何服务器，也不会向你发送邮件。</li>
            </ul>
            <p>批注、书签与阅读进度只写在你当前浏览器的 localStorage 里。清理浏览器数据、更换设备或更换浏览器，这些记录就会消失——这是设计取舍，不是缺陷。</p>
          </div>
          <div class="card">
            <h3>导出与清除本机数据</h3>
            <p>你可以随时把保存在本机的数据导出为 JSON 文件留档，也可以一次性清除全部本地记录。清除之后没有云端副本可以恢复。</p>
            <div class="btn-row">
              <button class="btn btn--ghost" type="button" data-action="export-local">${icon('download')}导出本地数据（JSON）</button>
              <button class="btn btn--ghost" type="button" data-action="clear-local">${icon('warning')}清除全部本地数据</button>
            </div>
            <p class="note">当前已用：<span class="mono" data-role="local-usage">${usage}</span></p>
          </div>
        </div>
      </div>
    </section>`;

  return {
    html,
    title: '关于',
    description: lead,
    path: ctx.path,
    mount(root) {
      mountAbout(root);
    },
  };
}

/* ------------------------------------------------------------------ */
/* 交互绑定                                                             */
/* ------------------------------------------------------------------ */

function mountAbout(root: HTMLElement): void {
  const usageEl = root.querySelector<HTMLElement>('[data-role="local-usage"]');

  const refreshUsage = (): void => {
    if (usageEl) usageEl.textContent = formatBytes(storage.usageBytes());
  };

  /** 把一段数据保存为本地文件：创建 Blob → 生成对象 URL → 触发下载 → 释放 */
  const downloadJson = (filename: string, payload: unknown): void => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  root.querySelector<HTMLButtonElement>('[data-action="export-local"]')?.addEventListener('click', () => {
    if (storage.keys().length === 0) {
      toast('当前没有保存在本机的数据可导出。阅读进度、书签与批注会在你使用之后出现。', { tone: 'info' });
      return;
    }
    downloadJson(`immortality-program-local-data-${new Date().toISOString().slice(0, 10)}.json`, {
      site: site.name,
      exportedAt: new Date().toISOString(),
      note: '本站没有后端：这份文件只包含保存在当前浏览器 localStorage 中的本地数据。导出动作本身不会上传任何内容。',
      data: storage.exportAll(),
    });
    toast('已导出本机数据（JSON）。文件只包含此浏览器中的本地记录。', { tone: 'success' });
  });

  root.querySelector<HTMLButtonElement>('[data-action="clear-local"]')?.addEventListener('click', () => {
    void (async () => {
      const confirmed = await confirmDialog({
        title: '清除全部本地数据？',
        message:
          '这会删除保存在此浏览器中的阅读进度、书签、批注与界面偏好。本站没有云端副本，删除后无法恢复。',
        confirmLabel: '确认清除',
        cancelLabel: '取消',
        danger: true,
      });
      if (!confirmed) return;
      storage.clearAll();
      refreshUsage();
      toast('本地数据已清除。已打开的界面偏好会在下次刷新后回到默认值。', { tone: 'info' });
    })();
  });

  refreshUsage();
}
