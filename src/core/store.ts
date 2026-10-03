/**
 * 本地状态与持久化
 * ============================================================
 * 本平台没有后端、没有账号、没有云同步 —— 这是纲领的立场，不是能力限制。
 * 因此所有用户侧状态都只存在这台设备的 localStorage 里：
 *   · 阅读进度与书签
 *   · 批注
 *   · 界面偏好（主题、字号、密度）
 *
 * 隐私承诺：这些数据永不上传。清理浏览器数据即彻底删除。
 */

const PREFIX = 'ip.v1.';

/** 触发变更通知的订阅者集合 */
type Listener = () => void;

/** 带命名空间与容错的 localStorage 包装 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      // 隐私模式 / 配额耗尽 / 数据损坏：一律安全降级，不抛出
      return fallback;
    }
  },

  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* 忽略 */
    }
  },

  /** 列出本应用写入的全部键（用于「导出我的数据」） */
  keys(): string[] {
    try {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
      }
      return out.sort();
    } catch {
      return [];
    }
  },

  /** 导出全部本地数据为可序列化对象 */
  exportAll(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const k of this.keys()) {
      out[k] = this.get<unknown>(k, null);
    }
    return out;
  },

  /** 清空本应用的本地数据（不影响其它站点） */
  clearAll(): void {
    for (const k of this.keys()) this.remove(k);
  },

  /** 粗略估算已用字节数，用于界面提示 */
  usageBytes(): number {
    let n = 0;
    for (const k of this.keys()) {
      const v = this.get<unknown>(k, null);
      n += (PREFIX + k).length + JSON.stringify(v ?? '').length;
    }
    return n * 2; // UTF-16
  },
};

/**
 * 极简响应式 store：多个页面共享同一份状态，变更后统一重渲染。
 * 不用框架，是因为这个站点的状态复杂度不值得引入依赖。
 */
export class Store<T extends object> {
  private state: T;
  private listeners = new Set<Listener>();
  private key: string | null;

  constructor(initial: T, persistKey?: string) {
    this.key = persistKey ?? null;
    this.state = this.key ? { ...initial, ...storage.get<Partial<T>>(this.key, {}) } : initial;
  }

  get(): Readonly<T> {
    return this.state;
  }

  set(patch: Partial<T>): void {
    this.state = { ...this.state, ...patch };
    if (this.key) storage.set(this.key, this.state);
    this.emit();
  }

  update(fn: (s: T) => Partial<T>): void {
    this.set(fn(this.state));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error('[store] listener failed', err);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 界面偏好                                                            */
/* ------------------------------------------------------------------ */

export type ThemeMode = 'auto' | 'light' | 'dark';
export type FontScale = 'sm' | 'base' | 'lg';

export interface Preferences {
  theme: ThemeMode;
  fontScale: FontScale;
  /** 是否已向用户展示过安装引导 */
  installPromptSeen: boolean;
  /** 是否已关闭「订阅为静态演示」的说明 */
  subscribeNoticeSeen: boolean;
}

export const preferences = new Store<Preferences>(
  {
    theme: 'auto',
    fontScale: 'base',
    installPromptSeen: false,
    subscribeNoticeSeen: false,
  },
  'preferences',
);

/* ------------------------------------------------------------------ */
/* 阅读状态：已读协议、书签、批注                                        */
/* ------------------------------------------------------------------ */

export interface Annotation {
  id: string;
  /** 所属文档 id，例如 'p01' */
  docId: string;
  /** 文档类型 */
  docKind: 'protocol' | 'experiment' | 'post';
  /** 引用的原文片段 */
  quote: string;
  /** 批注内容 */
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingState {
  /** 已读文档 id 集合 */
  read: string[];
  /** 书签（带标题便于离线展示） */
  bookmarks: { id: string; kind: string; title: string; path: string; at: string }[];
  /** 批注 */
  annotations: Annotation[];
  /** 上次访问路径，用于「继续阅读」 */
  lastPath: string;
  lastTitle: string;
  lastAt: string;
}

export const reading = new Store<ReadingState>(
  {
    read: [],
    bookmarks: [],
    annotations: [],
    lastPath: '',
    lastTitle: '',
    lastAt: '',
  },
  'reading',
);

/** 标记文档已读 */
export function markRead(id: string): void {
  const s = reading.get();
  if (s.read.includes(id)) return;
  reading.set({ read: [...s.read, id] });
}

/** 切换书签 */
export function toggleBookmark(entry: {
  id: string;
  kind: string;
  title: string;
  path: string;
}): boolean {
  const s = reading.get();
  const exists = s.bookmarks.some((b) => b.id === entry.id);
  if (exists) {
    reading.set({ bookmarks: s.bookmarks.filter((b) => b.id !== entry.id) });
    return false;
  }
  reading.set({
    bookmarks: [...s.bookmarks, { ...entry, at: new Date().toISOString() }],
  });
  return true;
}

export function isBookmarked(id: string): boolean {
  return reading.get().bookmarks.some((b) => b.id === id);
}

/** 记录访问足迹，供首页「继续阅读」使用 */
export function recordVisit(path: string, title: string): void {
  if (path === '/') return;
  reading.set({ lastPath: path, lastTitle: title, lastAt: new Date().toISOString() });
}

/** 生成一个稳定的本地 id（无外部依赖） */
export function localId(prefix = 'a'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
