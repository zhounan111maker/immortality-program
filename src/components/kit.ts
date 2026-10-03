/**
 * 页面开发套件（kit）
 * ============================================================
 * 页面模块的统一入口：内容、类型、组件、工序函数全部从这里取。
 * 好处：页面只依赖一个稳定接口，内部重构不会波及每个页面。
 */

/* ---- 内容 ---- */
export {
  site,
  nav,
  releases,
  principles,
  roadmap,
  risks,
  openWork,
  architecture,
  pricing,
  deploySteps,
} from '../content/site';
export { protocols } from '../content/protocols';
export { experiments } from '../content/experiments';
export { literature, peerProjects } from '../content/literature';
export { glossary } from '../content/glossary';
export { posts } from '../content/posts';
export { legalDocs, complianceNotice, complianceLink, type LegalDoc } from '../content/legal';
export { homeFaq } from '../content/faq';

/* ---- 类型 ---- */
export type * from '../types/content';

/* ---- 核心工具 ---- */
export {
  inline,
  escapeHtml,
  formatDate,
  relativeTime,
  percent,
  slugify,
  highlight,
  tokenize,
  truncate,
  stripInline,
  formatBytes,
  EXPERIMENT_STATUS_LABEL,
  PUBLICATION_STATUS_LABEL,
} from '../core/format';
export { icon, icons, type IconName } from '../components/icons';
export * from './ui';
export { renderBlock, renderBlocks, renderSections, renderToc, sectionAnchor } from './blocks';
export { renderDiagram, type DiagramId } from './diagrams';

/* ---- 本地状态（无后端，仅本机） ---- */
export {
  storage,
  preferences,
  reading,
  markRead,
  toggleBookmark,
  isBookmarked,
  recordVisit,
  localId,
  type Annotation,
  type ThemeMode,
  type FontScale,
} from '../core/store';

/* ---- 界面行为 ---- */
export { toast } from '../core/toast';
export { confirmDialog, promptDialog } from '../core/dialog';
export { printDocument } from '../core/print';
