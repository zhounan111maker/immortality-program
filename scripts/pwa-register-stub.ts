/**
 * `virtual:pwa-register` 的空实现（仅用于单文件归档构建）
 * ============================================================
 * 归档版本是**一个自包含的 HTML 文件**，它本身已经是离线的，
 * 不需要 Service Worker —— 也没有第二个文件可以放 sw.js。
 * 因此归档构建不启用 PWA 插件，也就没有 `virtual:pwa-register`
 * 这个虚拟模块。这里提供一个同形状的空实现，让 src/core/pwa.ts
 * 无需为归档版做任何特殊处理。
 *
 * 注意：这个文件只在 `pnpm run archive` 时通过别名被使用，
 * 主站构建（dist/）走的是 vite-plugin-pwa 提供的真实实现。
 */

/** 与 vite-plugin-pwa 的 RegisterSWOptions 保持结构兼容 */
export interface RegisterSWOptions {
  immediate?: boolean;
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
}

/**
 * 空实现：归档版不需要注册 Service Worker。
 * 返回一个同样为空的更新函数，保持调用方接口不变。
 */
export function registerSW(_options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void> {
  return async () => {
    /* 归档版没有 Service Worker，也没有可刷新的新版本 */
  };
}

export default registerSW;
