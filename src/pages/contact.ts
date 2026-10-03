/**
 * 联系与社区：联系方式 / 订阅 / 社区路线 / 复现不一致怎么办 / 不用联系我们的情况
 * ==========================================================================
 *
 * 本页最容易被写成「看起来很热闹」的一页，因此刻意反着写：
 *   · 每一处地址都逐字保留占位符原文，并在同一行标注「占位」，
 *     不给出任何看起来可以正常收信的地址；
 *   · 订阅表单与首页行为一致：只在本地记录并 toast 说明，不暗示有服务器；
 *   · 社区路线是「计划中的阶段」，明确写清受真实需求约束，不是承诺；
 *   · 专门用一节说明「什么情况下不必写邮件」——这样写反而让真正的
 *     复现不一致报告更容易被认真处理。
 *
 * 诚信红线：本站不提供服务、不卖产品、不承诺未来结果；不提供医疗、
 * 投资、治疗或任何需要执照的建议。
 *
 * 所有来自数据的文本：或经 `escapeHtml()`，或经 `inline()`，或由组件内部转义。
 */

import {
  /* 内容 */
  nav,
  site,
  protocols,
  /* 工具 */
  escapeHtml,
  inline,
  /* 组件 */
  pageHero,
  sectionHead,
  callout,
  timeline,
  refItem,
  /* 本地状态与行为 */
  toast,
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

/** 仓库地址在内容层是完整 URL，展示给读者时需要去掉协议前缀。 */
const REPO_DISPLAY = site.repository.replace(/^https?:\/\//, '');

/* ================================================================== */
/* 一、联系方式                                                        */
/* ================================================================== */

function contactInfo(): string {
  return `
    <div class="info-list">
      <div class="info-row">
        <span class="k">邮箱</span>
        <span class="v"><span class="mono">${escapeHtml(site.email)}</span>（占位符，正式域名启用后替换；现在这个地址收不到信）</span>
      </div>
      <div class="info-row">
        <span class="k">GitHub</span>
        <span class="v"><span class="mono">${escapeHtml(REPO_DISPLAY)}</span>（占位符；仓库尚未建立，现在这个地址打不开）</span>
      </div>
      <div class="info-row">
        <span class="k">邮件列表</span>
        <span class="v">见下方订阅表单；新协议版本、实验报告与协作邀请计划由此送达（服务商尚未接入）</span>
      </div>
      <div class="info-row">
        <span class="k">回复承诺</span>
        <span class="v">一般 7 天内回复；复现不一致的报告优先处理；不接受的服务请求会礼貌拒绝并说明原因</span>
      </div>
    </div>`;
}

/* ================================================================== */
/* 二、订阅（与首页一致的「仅本地记录」行为）                            */
/* ================================================================== */

function subscribeForm(): string {
  return `
    <form class="sub-form" data-action="subscribe" novalidate>
      <label class="sr-only" for="contact-sub-email">邮箱地址</label>
      <input id="contact-sub-email" type="email" name="email" inputmode="email" autocomplete="email"
             placeholder="your@email.com" required />
      <button class="btn btn--primary" type="submit">订阅</button>
    </form>
    <p class="form-note" data-form-status role="status" aria-live="polite"></p>
    <p class="note">
      订阅即表示同意按[隐私政策](/legal)处理邮箱地址；可随时一键退订。
      但请注意：**订阅表单目前只在你的浏览器里做本地记录，不会把地址发送到任何服务器**
      —— 本站没有后端，也尚未接入任何邮件服务商，因此「订阅」现在只是留下一个本地标记。
    </p>`;
}

/* ================================================================== */
/* 三、社区路线                                                        */
/* ================================================================== */

function communityTimeline(): string {
  return timeline([
    {
      phase: '第一阶段',
      period: '当前 · 尚未接入',
      title: '邮件列表',
      text: '上线即提供，无需内容审核。任何对协议感兴趣的人可以通过邮件联系。',
      items: ['邮件列表服务商尚未接入；当前的订阅表单只在本地记录'],
      status: 'active',
    },
    {
      phase: '第二阶段',
      period: '交流积累后',
      title: 'GitHub Discussions',
      text: '利用已有协作基础设施，无需自建用户系统；讨论记录与代码仓库绑定，不会丢失。',
      items: ['前置条件：仓库建立，且已有真实讨论需要承载'],
      status: 'planned',
    },
    {
      phase: '第三阶段',
      period: '活跃后',
      title: 'Discord / Telegram',
      text: '讨论足够活跃后建立实时交流渠道，参考 THPedia 的渠道组合。',
      items: ['前置条件：异步讨论已经持续活跃，而非为了「看起来有社区」而开'],
      status: 'planned',
    },
    {
      phase: '第四阶段',
      period: '可选',
      title: '自建论坛',
      text: '仅当讨论量达到每天数十条、且需要结构化分类时才考虑。参考 LongeCity：需要成员生命周期管理、行为规范与内容归档。',
      items: ['前置条件：讨论量与分类需求都真实存在'],
      status: 'planned',
    },
  ]);
}

/* ================================================================== */
/* 四、复现不一致的处理程序                                            */
/* ================================================================== */

function reproductionProcedure(): string {
  const codes = protocols.map((p) => p.code).join(' / ');

  return `
    <div class="prose">
      <p>
        如果你按某份实验报告复现，结果与报告不一致 —— 这正是本站最需要知道的信息。
        它不是「你搞错了」或「报告错了」的结论，而是一条待查的分歧。请按下面的顺序提供材料，
        我们会按收到的顺序逐条核对，并在博客上公开结论（包括结论是「报告需要修正」的情况）。
      </p>
    </div>
    <ul class="checklist">
      <li class="is-todo"><strong>协议编号与版本号</strong>：例如
        <span class="mono">PRT-001 v0.9.0</span>。本站协议是带版本的（${escapeHtml(codes)}），
        只写编号无法判断你复现的是哪一版文本。</li>
      <li class="is-todo"><strong>随机种子</strong>：报告里公开的那个种子原样写出；
        如果你改了种子，也请写出你用的值 —— 换种子得到不同结果是预期行为，不是不一致。</li>
      <li class="is-todo"><strong>运行环境</strong>：操作系统、Python 版本、依赖版本
        （<span class="mono">pip freeze</span> 的输出或 <span class="mono">requirements.txt</span> 的哈希）、
        硬件与是否使用 GPU／CUDA 版本。</li>
      <li class="is-todo"><strong>观察到的输出与预期输出</strong>：两条都要给。
        「预期」请引用报告里的具体数字或图表位置，「观察到」请贴原始输出或日志，
        而不是「结果不一样」这样的描述。</li>
      <li class="is-todo"><strong>完整复现命令</strong>：从克隆仓库到得出结果的完整命令行，
        包括中途改动过的任何参数。</li>
    </ul>
    <div class="ref-list" style="margin-top:20px">
      ${refItem({
        href: '/blog/post-6',
        title: '诚实性准则：预注册、阴性结果与解释边界',
        desc: '说明本站为什么把「复现不一致」当作最有价值的反馈，以及阴性结果如何归档。',
        iconName: 'note',
      })}
    </div>`;
}

/* ================================================================== */
/* 五、不用联系我们的情况                                              */
/* ================================================================== */

const CANNOT_HELP: { title: string; text: string }[] = [
  {
    title: '冷冻保存、人体冷冻相关咨询',
    text: '本站是研究纲领发布平台，不是冷冻保存机构；不提供保存、运输、复苏或任何相关服务，也不做转介。',
  },
  {
    title: '医疗建议、诊断或治疗',
    text: '本站不提供任何医疗意见，不做诊断，也不推荐治疗方案。请咨询有执业资格的医生。',
  },
  {
    title: '投资建议、项目推荐或资金对接',
    text: '本站不提供投资或金融建议，不接受投资，也不为任何项目背书或募资。',
  },
  {
    title: '「我该怎么做才能永生」这类个人方案',
    text: '本纲领研究的是可检验的协议与测量方法，不是个人延寿方案；这类问题在这里没有答案，也不会有。',
  },
  {
    title: '产品、服务与商务合作请求',
    text: '本站不卖也不买任何产品或服务，没有客户支持，也没有商务渠道。',
  },
  {
    title: '要求撤下或修改本纲领的学术内容',
    text: '此类请求请走学术渠道：提交问题与证据，按协议偏差流程处理 —— 有据可依的修正会被记录在变更日志里。',
  },
];

/* ================================================================== */
/* 骨架                                                                */
/* ================================================================== */

function html(): string {
  const entry = nav.find((n) => n.path === '/contact');
  const hero = pageHero({
    kicker: entry?.kicker ?? '联系 · Contact',
    title: '联系与社区',
    lead: '社区采用渐进式策略：从邮件列表开始，不一开始就建大论坛。交流质量优先于规模。',
    breadcrumbItems: [{ label: '首页', href: '/' }, { label: '联系' }],
  });

  return `
    ${hero}

    <section class="section" aria-label="联系方式">
      <div class="container">
        ${sectionHead({
          label: '联系方式',
          title: '直接联系',
          lead: '本站没有客服、没有工单系统，也没有社交账号。所有交流都通过下面这两个渠道——而它们目前都还是占位符。',
        })}
        ${contactInfo()}
        ${callout({
          variant: 'note',
          title: '关于这些地址',
          text:
            '上面两处地址目前是**占位符**，正式域名与仓库启用后替换。' +
            '写成 `example.org` / `your-handle` 是刻意的：与其给出一个看起来能用的地址、' +
            '让来信石沉大海，不如让占位性质直接可见。地址一启用，本页与页脚会同时更新。',
        })}
        <div class="grid-2" style="margin-top:32px">
          <div>
            ${sectionHead({ label: '订阅', title: '订阅研究进展' })}
            ${subscribeForm()}
          </div>
          <div>
            ${sectionHead({ label: '交流范围', title: '这里讨论什么' })}
            <div class="prose">
              <p>适合发来的内容：协议中的错误与不一致、复现结果、方法学质疑、文献补充、合作意向。</p>
              <p>不适合发来的内容：服务请求、医疗与投资咨询、产品推销、与协议无关的永生话题闲聊。</p>
              <p class="note">交流必须基于证据与可核查的材料。人身攻击、无关灌水与反复推销会被忽略或移除。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-label="社区路线">
      <div class="container">
        ${sectionHead({
          label: '社区路线',
          title: '渐进式社区：从零到有人参与',
          lead: 'LongeCity 的经验提醒我们：社区的生命周期往往比运营者的预期短。因此社区规模逐级放大，每一级都建立在上一级的真实需求之上。',
        })}
        ${communityTimeline()}
        ${callout({
          variant: 'boundary',
          title: '这是计划，不是承诺',
          text:
            '上面四个阶段是**按需求逐级解锁的计划**，不是时间表，也不是承诺：' +
            '每一级都以上一级的真实活跃度为前提，没有达到前提就不会开启下一级。' +
            '本站也不以「社区规模」为指标 —— 纲领的价值在于内容可检索、协议可复现，' +
            '不在于有多少人在这里说话。',
        })}
      </div>
    </section>

    <section class="section" aria-label="复现不一致怎么办">
      <div class="container-narrow">
        ${sectionHead({
          label: '复现不一致怎么办',
          title: '「结果和报告不一样」——请这样报',
          lead: '复现不一致是本站最重视的一类反馈：它直接检验协议是否真的可复现。请按下面五项提供材料，不必先自己判断谁对谁错。',
        })}
        ${reproductionProcedure()}
        ${callout({
          variant: 'principle',
          title: '处理承诺',
          text:
            '不一致报告**优先于其它任何邮件处理**，一般 7 天内回复。' +
            '如果结论是报告有误，修正会以协议偏差的形式记录在变更日志里，' +
            '并在博客公开说明 —— 包括阴性结果在内，不做删除式修订。',
        })}
      </div>
    </section>

    <section class="section section--alt" aria-label="不用联系我们的情况">
      <div class="container-narrow">
        ${sectionHead({
          label: '不用联系我们的情况',
          title: '这个纲领帮不上你的事',
          lead: '下面这些请求在这里不会有结果。写清楚是为了不浪费你的时间，也为了让真正的复现报告得到更快的处理。',
        })}
        <div class="grid-2">
          ${CANNOT_HELP.map(
            (item) => `
            <div class="card card--flat">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${inline(item.text)}</p>
            </div>`,
          ).join('')}
        </div>
        <p class="note">
          也没有「其它服务」：本站没有服务目录，没有会员、没有捐赠入口、没有付费支持 ——
          因为没有任何服务可卖，也就不存在需要联系的售后。唯一在此发生的事，是研究文档的发布与讨论。
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
    title: '联系',
    description: nav.find((n) => n.path === '/contact')?.description,
    path: '/contact',
    mount: (root) => {
      const form = root.querySelector<HTMLFormElement>('[data-action="subscribe"]');
      const input = form?.querySelector<HTMLInputElement>('input[type="email"]');
      const status = root.querySelector<HTMLElement>('[data-form-status]');

      const onSubmit = (event: Event): void => {
        event.preventDefault();
        const value = (input?.value ?? '').trim();

        /* 客户端校验：只在明显不合法时提示，不假装做了服务端校验。 */
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          if (status) status.textContent = '请输入一个格式正确的邮箱地址。';
          toast('邮箱格式不正确，未做任何记录。', { tone: 'warn' });
          input?.focus();
          return;
        }

        if (status) {
          status.textContent = `已在本机记录 ${value}（未发送到任何服务器）。`;
        }
        toast('订阅已在本地记录：本站没有后端，地址未发送到任何地方。邮件列表接入后需重新订阅。', {
          tone: 'info',
          duration: 6000,
        });
        if (input) input.value = '';
      };

      form?.addEventListener('submit', onSubmit);

      return () => {
        form?.removeEventListener('submit', onSubmit);
      };
    },
  };
}
