/**
 * Service Worker 注册与离线/更新状态
 * ============================================================
 * 采用的策略：`registerType: 'prompt'`。
 * 为什么不静默更新？对一个研究纲领而言，「我读的是哪一版协议」
 * 必须是明确的。新版本就绪时提示用户，而不是在用户阅读中途替换内容。
 */

import { toast } from './toast';

export interface PwaState {
  /** 是否有新版本等待激活 */
  updateReady: boolean;
  /** 当前是否离线 */
  offline: boolean;
  /** Service Worker 是否已成功注册 */
  registered: boolean;
  /** 是否运行在独立窗口（已安装为应用） */
  standalone: boolean;
}

type Listener = (state: PwaState) => void;

const state: PwaState = {
  updateReady: false,
  offline: !navigator.onLine,
  registered: false,
  standalone:
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true,
};

const listeners = new Set<Listener>();

export function getPwaState(): Readonly<PwaState> {
  return state;
}

export function onPwaChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error('[pwa] listener failed', err);
    }
  }
}

/** 应用待处理的 Service Worker 更新并刷新 */
let applyUpdate: (() => void) | null = null;

export function activateUpdate(reload = true): void {
  applyUpdate?.();
  if (reload) window.location.reload();
}

/**
 * 初始化 PWA：
 *   · 监听上线/下线
 *   · 注册 Service Worker（仅生产环境）
 *   · 捕获「新版本就绪」并提供一键刷新
 *
 * 由 main.ts 在应用启动后调用一次。
 */
export async function initPwa(): Promise<void> {
  // ---- 在线状态 ----
  window.addEventListener('online', () => {
    state.offline = false;
    emit();
    toast('网络已恢复。刷新页面可获取最新版本。', { tone: 'success' });
  });

  window.addEventListener('offline', () => {
    state.offline = true;
    emit();
    toast('已离线。已缓存的页面仍可阅读。', { tone: 'warn', duration: 5000 });
  });

  // ---- 独立窗口模式变化（用户安装后立即可感知） ----
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const onDisplayMode = (): void => {
    state.standalone = standaloneQuery.matches;
    emit();
  };
  standaloneQuery.addEventListener?.('change', onDisplayMode);

  // ---- Service Worker ----
  // dev 环境不注册，避免缓存干扰热更新
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    emit();
    return;
  }

  try {
    const { registerSW } = await import('virtual:pwa-register');

    const updateSW = registerSW({
      immediate: true,

      onRegisteredSW(_swUrl, registration) {
        state.registered = true;
        emit();

        // 定期检查更新：长时间打开的应用也能收到新版本
        if (registration) {
          window.setInterval(
            () => {
              registration.update().catch(() => {
                /* 离线时忽略 */
              });
            },
            60 * 60 * 1000,
          );
        }
      },

      onNeedRefresh() {
        state.updateReady = true;
        emit();
        toast('发现新版本的研究内容。刷新以获取最新版本。', {
          tone: 'info',
          duration: 0,
          action: {
            label: '立即刷新',
            onClick: () => {
              void updateSW(true);
            },
          },
        });
      },

      onOfflineReady() {
        state.registered = true;
        emit();
        toast('内容已缓存到本机，现在可以离线阅读。', { tone: 'success', duration: 4500 });
      },

      onRegisterError(error) {
        // 注册失败不应影响正常浏览：本站本来就是静态托管。
        console.warn('[pwa] Service Worker 注册失败，离线功能不可用。', error);
        state.registered = false;
        emit();
      },
    });

    applyUpdate = () => {
      void updateSW(true);
    };
  } catch (err) {
    console.warn('[pwa] 无法加载 PWA 运行时。', err);
    emit();
  }
}

/* ------------------------------------------------------------------ */
/* 安装引导                                                            */
/* ------------------------------------------------------------------ */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installEvent: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();

/** 浏览器是否提供了安装入口 */
export function canInstall(): boolean {
  return installEvent !== null;
}

export function onInstallAvailability(fn: (available: boolean) => void): () => void {
  installListeners.add(fn);
  fn(installEvent !== null);
  return () => installListeners.delete(fn);
}

/** 触发浏览器的安装流程；返回用户是否接受 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!installEvent) return 'unavailable';
  try {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      installEvent = null;
      installListeners.forEach((fn) => fn(false));
    }
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

/**
 * 监听安装可能性。必须在应用启动早期调用 ——
 * beforeinstallprompt 只触发一次，错过就要等下次访问。
 */
export function watchInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止浏览器自带的迷你信息条，改用站内引导
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    installListeners.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    installEvent = null;
    installListeners.forEach((fn) => fn(false));
    toast('已安装为应用。可从桌面或开始菜单直接打开。', { tone: 'success', duration: 5000 });
  });
}
