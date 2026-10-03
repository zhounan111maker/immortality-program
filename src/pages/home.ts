/**
 * 首页（/）
 * ============================================================
 *
 * 迁移自《永生计划 · 研究纲领平台》的 `#view-home`，并做以下实质改进：
 *   1. hero 的四项统计改为**从真实数据计算**（协议数 / 实验数 / 建立年 / 永久存档目标），
 *      页面加载后由 mount 再核对一次，不写死任何数字；
 *   2. 核心协议卡片可点击，并公开 `readiness` 字段对应的「预注册就绪度」进度条——
 *      这是协议数据里的真实字段，不是装饰；
 *   3. 发布记录用 `table()` 渲染，文档名解析为站内链接；
 *   4. 新增「继续阅读」条：从本机阅读状态恢复上次打开的文档，可一次性关闭；
 *   5. 订阅表单明确声明「没有后端」：提交只在本机浏览器记录，不发送到任何服务器。
 *
 * 诚信边界：本站不提供任何服务、不承诺任何结果；联系邮箱与代码仓库地址保持占位性质。
 * 无后端的代价必须写在界面上，而不是留给读者猜。
 */

import type { RouteContext } from '../core/router';
import {
  site,
  nav,
  protocols,
  experiments,
  releases,
  architecture,
  roadmap,
  posts,
  homeFaq,
  complianceNotice,
  complianceLink,
  PUBLICATION_STATUS_LABEL,
  escapeHtml,
  inline,
  formatDate,
  percent,
  dateLabel,
  card,
  tag,
  badge,
  publicationBadge,
  sectionHead,
  quoteBlock,
  table,
  timeline,
  faqList,
  progressBar,
  icon,
  storage,
  preferences,
  reading,
  toast,
  type PublicationStatus,
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
/* 局部常量与工具                                                      */
/* ------------------------------------------------------------------ */

/** 首页的稳定路径。`recordVisit` 不记录 `/`，因此「继续阅读」不会指回首页。 */
const HOME_PATH = '/';

/** 邮箱格式校验（仅前端提示用；本站没有后端，不会把地址发送到任何地方） */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * hero 的装饰性示意图：原站「源系统 → 迁移后」映射图 + C(t) 置信曲线底轴。
 * 与原站唯一差别是颜色全部改为设计系统变量（不硬编码十六进制）。
 * 图注按契约要求声明「示意图，不代表实验数据或测量结果」。
 */
const HERO_ART = `
  <svg viewBox="0 0 420 380" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="home-hero-mapping" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="var(--brand-3)"></stop>
        <stop offset="1" stop-color="var(--gold)"></stop>
      </linearGradient>
    </defs>
    <!-- 左侧：源系统节点 -->
    <g stroke="var(--brand-3)" stroke-width="1.1" fill="var(--dark-2)">
      <circle cx="80" cy="120" r="7"></circle><circle cx="80" cy="250" r="7"></circle>
      <circle cx="120" cy="165" r="7"></circle><circle cx="120" cy="205" r="7"></circle>
    </g>
    <!-- 右侧：迁移后系统节点 -->
    <g stroke="var(--brand-3)" stroke-width="1.1" fill="var(--dark-2)">
      <circle cx="340" cy="120" r="7"></circle><circle cx="340" cy="250" r="7"></circle>
      <circle cx="300" cy="165" r="7"></circle><circle cx="300" cy="205" r="7"></circle>
    </g>
    <!-- 映射弧线 -->
    <g fill="none" stroke="var(--brand-3)" stroke-width="1" opacity=".55">
      <path d="M84 120 C 190 78, 240 170, 336 120"></path>
      <path d="M84 250 C 190 292, 240 200, 336 250"></path>
      <path d="M123 165 C 190 130, 230 240, 297 165"></path>
      <path d="M123 205 C 180 250, 260 120, 297 205"></path>
    </g>
    <!-- 强调弧 -->
    <path d="M84 185 C 210 120, 210 240, 336 185" fill="none" stroke="url(#home-hero-mapping)" stroke-width="1.8" stroke-dasharray="1 7" stroke-linecap="round" opacity=".95"></path>
    <circle cx="336" cy="185" r="4.5" fill="var(--gold-soft)"></circle>
    <!-- 标签 -->
    <text x="80" y="286" text-anchor="middle" fill="var(--on-dark-3)" font-size="13">源系统</text>
    <text x="340" y="286" text-anchor="middle" fill="var(--on-dark-3)" font-size="13">迁移后</text>
    <!-- 底轴：置信曲线示意图 -->
    <g transform="translate(0,318)">
      <line x1="40" y1="8" x2="380" y2="8" stroke="var(--on-dark-line)" stroke-width="1"></line>
      <path d="M40 0 C 150 30, 260 -14, 378 -26" fill="none" stroke="var(--gold-3)" stroke-width="1.6"></path>
      <text x="40" y="32" fill="var(--on-dark-3)" font-size="11">C(t) 身份置信曲线（示意图，不代表实验数据或测量结果）</text>
    </g>
  </svg>`;

/** 把发布状态映射到 `badge()` 的配色变体（与 PUBLICATION_STATUS_LABEL 的 tone 对齐） */
function badgeVariant(status: PublicationStatus): 'draft' | 'brand' | 'muted' | 'alert' {
  switch (status) {
    case 'draft':
    case 'review':
      return 'draft';
    case 'published':
    case 'frozen':
      return 'brand';
    case 'archived':
    default:
      return 'muted';
  }
}

/** 发布状态的中文标签（与 publicationBadge 使用同一张表） */
function statusLabel(status: PublicationStatus): string {
  return PUBLICATION_STATUS_LABEL[status]?.label ?? status;
}

/** 「继续阅读」条：只在有可恢复的本地记录时渲染 */
function resumeBanner(path: string, title: string): string {
  return `
    <div class="banner banner--brand" data-resume-banner>
      <p class="banner-text">上次读到「<a href="${escapeHtml(path)}">${escapeHtml(title)}</a>」。这份记录只保存在你当前浏览器的 localStorage 里，没有上传到任何服务器。</p>
      <div class="banner-actions">
        <a class="btn btn--sm btn--on-dark" href="${escapeHtml(path)}">继续阅读</a>
        <button class="btn btn--sm btn--ghost" type="button" data-action="resume-dismiss">不再提示</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

export function render(ctx: RouteContext): PageResult {
  const homeNav = nav.find((item) => item.path === '/home');
  const heroKicker = homeNav?.kicker ?? site.tagline;
  const heroLead = homeNav?.description ?? site.description;

  const newestPosts = [...posts]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const lastRead = reading.get();
  const resumePath = lastRead.lastPath;
  const resumeTitle = lastRead.lastTitle !== '' ? lastRead.lastTitle : resumePath;
  const dismissed = storage.get<string>('resumeDismissed', '');
  const showResume = resumePath !== '' && resumePath !== HOME_PATH && resumePath !== dismissed;

  const showSubscribeCaveat = !preferences.get().subscribeNoticeSeen;

  const html = `
    ${showResume ? resumeBanner(resumePath, resumeTitle) : ''}

    <section class="hero" aria-label="纲领概览">
      <div class="hero-inner">
        <div>
          <p class="hero-kicker">${escapeHtml(heroKicker)}</p>
          <h1>${escapeHtml(site.name)}<span class="thin">${escapeHtml(site.latinName)}</span></h1>
          <p class="hero-lead">${inline(heroLead)}</p>
          <div class="hero-defs">
            <span class="hero-def">不提供冷冻保存服务</span>
            <span class="hero-def">不做超人类主义倡导</span>
            <span class="hero-def">只发布可检验的研究纲领</span>
          </div>
          <div class="hero-ctas">
            <a class="btn btn--on-dark" href="/protocols">浏览协议</a>
            <a class="btn btn--outline-dark" href="/about">阅读纲领定位</a>
          </div>
          <div class="hero-meta">
            <div><b data-stat="protocols">${escapeHtml(String(protocols.length))}</b><span>核心协议</span></div>
            <div><b data-stat="experiments">${escapeHtml(String(experiments.length))}</b><span>在册实验</span></div>
            <div><b data-stat="year">${escapeHtml(String(site.establishedYear))}</b><span>纲领建立年</span></div>
            <div><b>∞</b><span>永久存档目标</span></div>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">${HERO_ART}</div>
      </div>
    </section>

    <section class="section" aria-label="定位">
      <div class="container">
        ${sectionHead({
          label: '定位',
          title: '你要建的，是一个研究纲领发布平台',
          lead: '以「迁移永生协议」为核心的科学—哲学研究平台，而不是泛泛的「永生爱好者社区」。三个界定划清边界：',
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
        ${quoteBlock(
          '如果你不建这个网站，这些协议可能永远不会被发布。而一旦发布，它就从「一个人的笔记」变成「可被检验的科学纲领」。',
          '纲领立场',
        )}
      </div>
    </section>

    <section class="section section--alt" aria-label="核心协议">
      <div class="container">
        ${sectionHead({
          label: '核心协议',
          title: '全世界任何永生相关网站都没有发布过的东西',
          lead: '现有机构集中在保存、延长、倡导与分析四个方向；迁移永生的可检验协议不在任何机构的议程上。这里是它的发布处。',
        })}
        <div class="grid-3">
          ${protocols
            .map((protocol) => {
              const tier = protocol.tags[0];
              return `
                <div class="stack-sm">
                  ${card({
                    href: `/protocols/${protocol.id}`,
                    accent: protocol.accent,
                    meta:
                      badge(`${protocol.version} · ${statusLabel(protocol.status)}`, badgeVariant(protocol.status)) +
                      (tier ? tag(tier) : ''),
                    title: `${protocol.code} · ${protocol.title}`,
                    body: protocol.summary,
                    foot: `<span class="note">${dateLabel(protocol.updatedAt)}</span><span class="read-more">查看协议${icon('arrowRight')}</span>`,
                  })}
                  <div>
                    <p class="note">预注册就绪度 <span class="mono">${escapeHtml(percent(protocol.readiness))}</span></p>
                    ${progressBar(protocol.readiness, protocol.accent === 'gold')}
                  </div>
                </div>`;
            })
            .join('')}
        </div>
      </div>
    </section>

    <section class="section" aria-label="平台架构">
      <div class="container">
        ${sectionHead({
          label: '平台架构',
          title: '为「活很久」设计的技术架构',
          lead: '分层架构：永久层保证核心文档在域名失效后依然存在，主站层保持零依赖可迁移。主站为纯静态构建产物，同一份代码另有一个单文件归档构建用于永久存档。',
        })}
        <div class="stack">
          <div class="layer-list">
            ${architecture
              .map(
                (layer) => `
              <div class="layer-row">
                <span class="layer-no">${escapeHtml(layer.no)}</span>
                <span class="layer-name">${escapeHtml(layer.name)}</span>
                <span class="layer-desc">${escapeHtml(layer.description)}</span>
                <span class="layer-cost">${escapeHtml(layer.cost)}</span>
              </div>`,
              )
              .join('')}
          </div>
          <p class="note">完整部署步骤与成本说明见「<a href="/deploy">架构与部署</a>」。</p>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="发布记录">
      <div class="container">
        ${sectionHead({
          label: '发布记录',
          title: '最新发布',
          lead: '协议与文档的全部历史版本均保留，任何修改按「协议偏差」规则记录，不静默修订。',
        })}
        <div class="stack">
          ${table({
            columns: ['文档', '版本', '状态', '日期', '说明'],
            widths: [26, 16, 14, 14, 30],
            /*
             * 注意：table() 会对每个单元格走 inline()（先转义、再解释行内标记），
             * 单元格里因此不能放组件 HTML。文档列用行内标记 [文字](链接) 生成链接，
             * 版本 / 日期两列用 `码` 生成等宽 <code>，状态列用与 publicationBadge()
             * 完全同一张表（PUBLICATION_STATUS_LABEL）的中文标签；状态下方的图例
             * 用 publicationBadge() 给出配色与含义的对应关系。
             */
            rows: releases.map((record) => [
              `**[${record.document}](${record.href})**`,
              `\`${record.version}\``,
              statusLabel(record.status),
              `\`${record.date}\``,
              record.note,
            ]),
            caption: '协议与文档的全部历史版本均保留；「草案」表示预注册尚未冻结，正文仍会变更。',
          })}
          <div class="status-legend">
            <span>${publicationBadge('published')}已发布：内容已定稿，可以按版本号引用</span>
            <span>${publicationBadge('draft')}草案：结构与正文仍会变更，引用必须写明版本号</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-label="最新进展">
      <div class="container">
        ${sectionHead({
          label: '最新进展',
          title: '博客与研究笔记',
          lead: '按发布日期排列的最新三篇。博客承担三类功能：报告研究进展，澄清概念口径，回应外部反馈。',
        })}
        <div class="grid-3">
          ${newestPosts
            .map(
              (post) => `
            <a class="card post-card" href="/blog/${escapeHtml(post.id)}">
              <div class="post-meta">
                <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
                ${tag(post.category, 'brand')}
              </div>
              <h3 class="post-title">${escapeHtml(post.title)}</h3>
              <p class="post-excerpt">${inline(post.excerpt)}</p>
              <span class="read-more">阅读全文${icon('arrowRight')}</span>
            </a>`,
            )
            .join('')}
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="路线图">
      <div class="container">
        ${sectionHead({
          label: '路线图',
          title: '分阶段执行路线图',
          lead: '网站是长期项目而非短期冲刺：最低更新承诺比高频更新更重要。',
        })}
        ${timeline(roadmap)}
      </div>
    </section>

    <section class="section" aria-label="常见问题">
      <div class="container">
        ${sectionHead({
          label: '常见问题',
          title: '关于本站的工程问题',
          lead: '以下回答只描述本站当前的交付形态：纯静态 PWA，可安装、可离线、无后端、无账号、无云同步。做不到的事也写在里面。',
        })}
        ${faqList(homeFaq)}
      </div>
    </section>

    <section class="subscribe" aria-labelledby="home-subscribe-title">
      <div class="subscribe-inner">
        <div>
          <h2 id="home-subscribe-title">订阅研究进展</h2>
          <p>新协议版本、实验报告与协作邀请，通过邮件列表送达。研究纲领不依赖流量，依赖愿意复现与引用它的人。</p>
        </div>
        <div class="stack-sm">
          <form class="sub-form" data-action="subscribe-form" novalidate>
            <label class="sr-only" for="home-sub-email">邮箱地址</label>
            <input
              type="email"
              id="home-sub-email"
              name="email"
              placeholder="your@email.com"
              aria-label="邮箱地址"
              autocomplete="email"
              required
            >
            <button type="submit" class="btn btn--on-dark">订阅</button>
          </form>
          <p class="form-status" data-role="sub-status" role="status" aria-live="polite"></p>
          <p class="form-note">本站没有接入任何邮件服务：没有后端、没有账号、没有数据库。提交只会把这条记录写进你当前浏览器的 localStorage，不会上传到服务器，也不会有人给你发信。邮箱的占位地址、代码仓库地址同样如此，正式域名启用前不应被当作可用地址。详见<a href="/legal">条款与隐私</a>。</p>
          ${
            showSubscribeCaveat
              ? '<p class="form-note" data-role="sub-caveat">当前为静态演示模式：本站没有后端，订阅记录只在本机保存；邮件列表接入后才会正式生效。</p>'
              : ''
          }
        </div>
      </div>
    </section>

    <section class="compliance" aria-label="合规提示">
      <div class="compliance-inner">
        ${icon('shield')}
        <span>${escapeHtml(complianceNotice)}<a href="${escapeHtml(complianceLink.href)}">${escapeHtml(complianceLink.label)}</a>。</span>
      </div>
    </section>`;

  return {
    html,
    title: '首页',
    description: heroLead,
    path: ctx.path,
    mount(root) {
      mountHome(root, resumePath);
    },
  };
}

/* ------------------------------------------------------------------ */
/* 交互绑定                                                             */
/* ------------------------------------------------------------------ */

function mountHome(root: HTMLElement, resumePath: string): void {
  /* 1. hero 统计：从真实数据重算一次，避免任何写死的数字留在页面上 */
  const stats: Record<string, string> = {
    protocols: String(protocols.length),
    experiments: String(experiments.length),
    year: String(site.establishedYear),
  };
  root.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
    const value = stats[el.dataset.stat ?? ''];
    if (value !== undefined) el.textContent = value;
  });

  /* 2. 「继续阅读」条：关闭后把该路径记进本地，之后不再提示 */
  const banner = root.querySelector<HTMLElement>('[data-resume-banner]');
  banner?.querySelector<HTMLButtonElement>('[data-action="resume-dismiss"]')?.addEventListener('click', () => {
    if (resumePath !== '') storage.set('resumeDismissed', resumePath);
    banner.remove();
    toast('已关闭「继续阅读」提示。下次打开其它文档后仍会重新出现。', { tone: 'info' });
  });

  /* 3. 订阅表单：前端校验 + 本机记录（没有后端，没有邮件服务） */
  const form = root.querySelector<HTMLFormElement>('[data-action="subscribe-form"]');
  const emailInput = form?.querySelector<HTMLInputElement>('input[type="email"]');
  const statusEl = root.querySelector<HTMLElement>('[data-role="sub-status"]');
  const caveat = root.querySelector<HTMLElement>('[data-role="sub-caveat"]');

  const setStatus = (state: 'ok' | 'error', message: string): void => {
    if (!statusEl) return;
    statusEl.dataset.state = state;
    statusEl.textContent = message;
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = (emailInput?.value ?? '').trim();

    if (!EMAIL_PATTERN.test(email)) {
      setStatus('error', '请输入有效的邮箱地址（例如 name@example.org）。本站不会向该地址发送任何邮件——当前没有接入邮件服务。');
      toast('邮箱地址格式不正确，未记录。', { tone: 'warn' });
      return;
    }

    storage.set('subscribeRequest', {
      email,
      at: new Date().toISOString(),
      transport: 'local-only',
    });
    preferences.set({ subscribeNoticeSeen: true });
    caveat?.remove();
    setStatus('ok', `已在本机记录 ${email}。本站没有后端，这条记录不会离开你的浏览器，也不会被发送到任何邮件服务。`);
    toast('订阅申请已记录——仅保存在本机浏览器，没有发送到任何服务器。', { tone: 'success' });
    if (emailInput) emailInput.value = '';
  });
}
