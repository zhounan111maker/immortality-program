/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import type { SiteMeta, NavItem } from './types/content';

/**
 * 内容模块的运行时契约。
 * 内容文件本身是强类型的 TS 模块；这里只补充「聚合入口」的形状，
 * 便于渲染层在内容尚未就位时也能通过类型检查。
 */
export interface ContentBundle {
  site: SiteMeta;
  nav: NavItem[];
}

declare global {
  interface Window {
    /** 由 Service Worker 注册流程写入，供界面提示「新版本已就绪」 */
    __IP_SW_UPDATE__?: () => void;
  }
}
