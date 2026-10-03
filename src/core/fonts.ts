/**
 * 网络字体加载
 * ============================================================
 * 策略：字体是增强，不是前提。
 *   · 不在 <head> 里阻塞渲染去请求字体
 *   · 首屏用系统中文字体栈（PingFang SC / 微软雅黑 / Noto Sans CJK）立即成型
 *   · 浏览器空闲时再异步加载 Noto Serif SC / Noto Sans SC
 *   · 离线、被墙、或字体服务不可达时，页面完全不受影响
 *
 * 这一点对「永久可读」很重要：存档十年后 Google Fonts 未必还在，
 * 但内容必须依然可读。
 */

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700;900&family=Noto+Sans+SC:wght@400;500;600;700&display=swap';

const STORAGE_KEY = 'ip.v1.fonts';

/** 是否已成功加载过（同一会话内不重复请求） */
let loaded = false;

function injectStylesheet(): void {
  if (loaded) return;
  loaded = true;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_CSS_URL;
  link.media = 'print'; // 先以非阻塞方式插入
  link.onload = () => {
    // 加载完成后再启用，避免 FOIT（文字不可见）闪烁
    link.media = 'all';
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* 忽略 */
    }
  };
  link.onerror = () => {
    // 字体不可用：静默降级到系统字体栈，功能无损
    console.info('[fonts] 网络字体不可用，已降级到系统字体。');
    link.remove();
  };
  document.head.appendChild(link);
}

/** 仅在用户没有表达「节省流量」意愿时加载 */
function shouldLoad(): boolean {
  if (loaded) return false;

  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return false;

  // 尊重用户的动效/数据偏好设置
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) return false;

  return true;
}

/**
 * 启动字体加载。由 main.ts 调用一次。
 * 使用 requestIdleCallback 让位给首屏渲染；不支持时退回 setTimeout。
 */
export function initFonts(): void {
  if (!shouldLoad()) return;

  const run = (): void => injectStylesheet();

  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };

  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 900);
  }
}
