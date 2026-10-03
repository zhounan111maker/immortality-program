/**
 * 文献与项目对比
 * ==============
 *
 * 来源：文献页「关键文献索引」表与「项目对比」表。
 * 说明：
 *  - 索引只收录可核实来源的公开文献，不设下载镜像。
 *  - DOI / 链接仅在可确认为规范标识时给出；无法确认者一律省略，不编造。
 */

import type { LiteratureEntry, PeerProject } from '../types/content';

/** 关键文献索引 —— 哲学 · 意识科学 · 技术路线三类 */
export const literature: LiteratureEntry[] = [
  {
    id: 'lit-parfit-1984',
    title: '《Reasons and Persons》',
    authors: 'Parfit',
    year: 1984,
    field: '哲学 · 人格同一性',
    type: 'book',
    relation: '身份连续性问题的经典框架',
    doi: '10.1093/019824908X.001.0001',
  },
  {
    id: 'lit-chalmers-1995',
    title: 'Facing Up to the Problem of Consciousness',
    authors: 'Chalmers',
    year: 1995,
    field: '意识研究 · 困难问题',
    type: 'paper',
    relation: '区分可解释与不可解释的意识维度',
    href: 'https://consc.net/papers/facing.html',
  },
  {
    id: 'lit-tononi-koch-2015',
    title: 'Consciousness: here, there and everywhere?',
    authors: 'Tononi & Koch',
    year: 2015,
    field: '意识科学 · IIT',
    type: 'paper',
    relation: '意识可测量性的一种强主张',
    doi: '10.1098/rstb.2014.0167',
  },
  {
    id: 'lit-bostrom-2003',
    title: 'Are You Living in a Computer Simulation?',
    authors: 'Bostrom',
    year: 2003,
    field: '模拟假说',
    type: 'paper',
    relation: '模拟论证的概率框架',
    doi: '10.1111/1467-9337.00253',
  },
  {
    id: 'lit-sandberg-bostrom-2008',
    title: 'Whole Brain Emulation: A Roadmap',
    authors: 'Sandberg & Bostrom',
    year: 2008,
    field: '技术路线 · WBE',
    type: 'paper',
    relation: '迁移路线的工程可行性参照',
    href: 'https://www.fhi.ox.ac.uk/reports/2008-3.pdf',
  },
  {
    id: 'lit-moravec-1988',
    title: '《Mind Children》',
    authors: 'Moravec',
    year: 1988,
    field: '技术哲学',
    type: 'book',
    relation: '心智上传的早期论述',
  },
  {
    id: 'lit-kurzweil-2005',
    title: '《The Singularity Is Near》',
    authors: 'Kurzweil',
    year: 2005,
    field: '技术预言',
    type: 'book',
    relation: '技术增强时间表的争议性来源',
  },
];

/**
 * 项目对比 —— 永生领域的现有格局与本平台的位置
 *
 * href 仅在本站能确认项目实际网址时给出；个人项目与无法确认者省略。
 */
export const peerProjects: PeerProject[] = [
  {
    id: 'peer-alcor',
    name: 'Alcor',
    direction: '保存（人体冷冻）',
    form: '付费服务机构',
    relation: '对照：保存路线 vs 迁移路线',
    href: 'https://www.alcor.org/',
  },
  {
    id: 'peer-cryonics-institute',
    name: 'Cryonics Institute',
    direction: '保存',
    form: '非营利机构',
    relation: '同上',
    href: 'https://www.cryonics.org/',
  },
  {
    id: 'peer-2045-initiative',
    name: '2045 Initiative',
    direction: '倡导 / 路线',
    form: '倡议组织',
    relation: '理念倡导，非检验纲领',
    href: 'http://2045.com/',
  },
  {
    id: 'peer-lifenaut',
    name: 'Lifenaut',
    direction: '备份 / 倡导',
    form: '数字备份平台',
    relation: '数据保存与身份主张不同',
    href: 'https://www.lifenaut.com/',
  },
  {
    id: 'peer-longecity',
    name: 'LongeCity',
    direction: '社区（延寿讨论）',
    form: '论坛社区',
    relation: '社区生命周期参考（Immortality Institute 并入案例）',
    href: 'https://www.longecity.org/forum/',
  },
  {
    id: 'peer-humanity-plus',
    name: 'Humanity+',
    direction: '倡导',
    form: '非营利组织',
    relation: '超人类主义倡导，本站不做',
    href: 'https://humanityplus.org/',
  },
  {
    id: 'peer-ieet',
    name: 'IEET',
    direction: '分析 / 倡导',
    form: '智库',
    relation: '哲学分析资源',
    href: 'https://ieet.org/',
  },
  {
    id: 'peer-thpedia',
    name: 'THPedia',
    direction: '知识库',
    form: '众包百科',
    relation: '内容组织方式参考',
    href: 'https://thpedia.org/',
  },
  {
    id: 'peer-ecylt-top',
    name: 'ecylt.top「七十年之约」',
    direction: '永久存储实验',
    form: '个人项目',
    relation: '「网站如何存在七十年」技术参考（Arweave）',
  },
  {
    id: 'peer-great',
    name: 'GREAT',
    direction: '开源参考项目',
    form: 'GitHub 项目',
    relation: '站点架构与 Zenodo 发布流程参照',
  },
];
