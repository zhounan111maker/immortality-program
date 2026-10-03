/**
 * 条款与隐私
 * ==========
 *
 * 来源：条款与隐私页的四个 h2 章节，逐段转换为 ContentBlock。
 * 首页合规提示条文本独立导出为 complianceNotice，其链接单独导出为 complianceLink。
 */

import type { ContentBlock } from '../types/content';

export interface LegalDoc {
  id: string;
  title: string;
  updatedAt: string;
  blocks: ContentBlock[];
}

export const legalDocs: LegalDoc[] = [
  {
    id: 'legal-disclaimer',
    title: '免责声明',
    updatedAt: '2026-10-02',
    blocks: [
      {
        kind: 'paragraph',
        text: '本站所有内容仅供研究参考，不构成医疗建议、投资建议或任何形式的服务承诺。协议中的「待冻结」「待定」条目为草案建议，不构成任何未来承诺或保证。',
      },
      {
        kind: 'paragraph',
        text: '本站不提供任何实际服务：不提供冷冻保存、不提供基因治疗、不提供任何需要执照的服务。任何第三方项目与本站内容之间的相似性，不构成本站对其实践的背书或评价。',
      },
    ],
  },
  {
    id: 'legal-terms',
    title: '服务条款',
    updatedAt: '2026-10-02',
    blocks: [
      {
        kind: 'paragraph',
        text: '**站点性质。**本站是研究纲领发布平台，而非服务或社区平台。',
      },
      {
        kind: 'paragraph',
        text: '**内容使用。**引用本站协议与文档请注明来源；商业性使用请先通过联系页取得许可。',
      },
      {
        kind: 'paragraph',
        text: '**可用性。**本站尽力维护，但不保证持续在线；核心文档规划经永久层（Arweave）存档，域名失效后仍可访问。',
      },
      {
        kind: 'paragraph',
        text: '**用户行为。**在 GitHub 等协作渠道中的讨论须基于证据；禁止人身攻击与无关灌水。本站保留对违反者采取移除与屏蔽措施的权利。',
      },
    ],
  },
  {
    id: 'legal-privacy',
    title: '隐私政策',
    updatedAt: '2026-10-02',
    blocks: [
      {
        kind: 'paragraph',
        text: '**收集。**本站仅收集你自愿填写的邮件订阅地址。',
      },
      {
        kind: 'paragraph',
        text: '**使用。**订阅地址仅用于发送研究进展与协作邀请，不用于任何其他目的。',
      },
      {
        kind: 'paragraph',
        text: '**存储。**订阅数据由邮件服务商处理，符合 GDPR 与《个人信息保护法》的基本要求；不向任何第三方出售或共享。',
      },
      {
        kind: 'paragraph',
        text: '**退出。**你可以随时一键退订，或通过联系页邮箱申请删除全部数据。',
      },
      {
        kind: 'paragraph',
        text: '**统计。**本站采用隐私友好的分析方式（如 Plausible），不采集个人可识别信息。',
      },
    ],
  },
  {
    id: 'legal-policy-version',
    title: '政策版本',
    updatedAt: '2026-10-02',
    blocks: [
      {
        kind: 'paragraph',
        text: '本政策 v1.0.0 · 2026-10-02 生效。任何修订会在此页记录版本与日期，不静默更改。',
      },
    ],
  },
];

/** 首页合规提示条正文（不含尾随链接标记） */
export const complianceNotice =
  '本站所有内容仅供研究参考，不构成医疗建议、投资建议或任何形式的服务承诺。详见';

/** 合规提示条中的链接 */
export const complianceLink = { label: '条款与免责声明', href: '/legal' };
