/**
 * 术语表
 * ======
 *
 * 来源：文献页「术语表」十二项。术语口径统一是讨论的前提；
 * 下列定义为本纲领的约定用法，逐字保留原文。
 *
 * group 取值：concept（概念）/ technology（技术）/ method（方法）。
 * relatedRefs 指向协议 id（"p01" = PRT-001，依此类推）。
 */

import type { GlossaryTerm } from '../types/content';

export const glossary: GlossaryTerm[] = [
  {
    id: 'migration-immortality',
    term: '迁移永生',
    definition: '以「迁移」为路径的永生研究纲领：不追求身体不朽，而追问信息与身份的可检验连续性。',
    group: 'concept',
  },
  {
    id: 'identity-continuity',
    term: '身份连续性',
    definition: '迁移前后「同一性」保持的可操作测量对象，定义见 PRT-002。',
    relatedRefs: ['p02'],
    group: 'concept',
  },
  {
    id: 'personal-identity',
    term: '人格同一性',
    definition: '分析哲学经典问题：什么使得不同时刻的经验属于同一个人（Parfit 语境）。',
    group: 'concept',
  },
  {
    id: 'consciousness',
    term: '意识',
    definition: '主观体验的存在。本纲领不定义其本质，只测量可规定的指标。',
    group: 'concept',
  },
  {
    id: 'wbe',
    term: '整体脑仿真（WBE）',
    definition: '将大脑信息结构在另一载体上重建的技术路线（Sandberg & Bostrom 路线图）。',
    group: 'technology',
  },
  {
    id: 'cryonics',
    term: '冷冻保存（Cryonics）',
    definition: '低温保存身体或大脑以待未来复苏的服务型路线。本站不提供。',
    group: 'technology',
  },
  {
    id: 'digital-twin',
    term: '数字孪生',
    definition: '实体的数字化镜像。区别于迁移：孪生是副本，迁移涉及连续性主张。',
    group: 'concept',
  },
  {
    id: 'simulation-hypothesis',
    term: '模拟假说',
    definition: '我们可能生活在计算机模拟中的主张（Bostrom 论证框架）。',
    group: 'concept',
  },
  {
    id: 'self-model',
    term: '自我模型（TSE）',
    definition: '系统对自身状态的内部表征；热力学自我体验模型的出发点之一。',
    group: 'concept',
  },
  {
    id: 'preregistration',
    term: '预注册',
    definition: '收集数据前公开假设、测量与统计计划，防止事后合理化。',
    group: 'method',
  },
  {
    id: 'falsifiability',
    term: '可证伪性',
    definition: '主张必须允许被反证推翻（Popper 传统）。本站协议以此为标准。',
    group: 'method',
  },
  {
    id: 'protocol-deviation',
    term: '协议偏差',
    definition: '对已发布协议的任何修改；必须记录并公开，不静默修订。',
    group: 'method',
  },
];
