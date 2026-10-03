/**
 * 轻量提示（toast）
 * ============================================================
 * 无依赖、可访问（aria-live），自动消失，支持手动关闭。
 */

export type ToastTone = 'success' | 'info' | 'warn' | 'error';

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'false');
  document.body.appendChild(region);
  return region;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** 毫秒；0 表示不自动消失 */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export function toast(message: string, opts: ToastOptions = {}): void {
  const host = ensureRegion();
  const tone = opts.tone ?? 'info';
  const duration = opts.duration ?? 3600;

  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;

  const body = document.createElement('div');
  body.className = 'toast-body';
  body.textContent = message;
  el.appendChild(body);

  if (opts.action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--sm btn--ghost';
    btn.textContent = opts.action.label;
    btn.addEventListener('click', () => {
      opts.action?.onClick();
      dismiss();
    });
    el.appendChild(btn);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', '关闭提示');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  close.addEventListener('click', () => dismiss());
  el.appendChild(close);

  host.appendChild(el);

  let timer: number | undefined;
  const dismiss = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    el.style.transition = 'opacity 160ms ease, transform 160ms ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    window.setTimeout(() => el.remove(), 180);
  };

  if (duration > 0) {
    timer = window.setTimeout(dismiss, duration);
  }

  // 悬停暂停自动关闭，方便阅读较长的提示
  el.addEventListener('mouseenter', () => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
  el.addEventListener('mouseleave', () => {
    if (duration > 0) timer = window.setTimeout(dismiss, 1200);
  });
}
