/**
 * 对话框
 * ============================================================
 * 用原生 <dialog> 实现，天然获得焦点陷阱、Esc 关闭与背景遮罩。
 * 仅在需要用户确认或输入时使用（例如删除批注、导出命名）。
 */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** 确认对话框，返回用户是否确认 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'app-dialog';
    dlg.setAttribute('aria-labelledby', 'dlg-title');

    dlg.innerHTML = `
      <form method="dialog" class="app-dialog-form">
        <h2 id="dlg-title">${escapeText(opts.title)}</h2>
        <p>${escapeText(opts.message)}</p>
        <div class="app-dialog-actions">
          <button type="button" class="btn btn--ghost" data-role="cancel">${escapeText(opts.cancelLabel ?? '取消')}</button>
          <button type="submit" class="btn ${opts.danger ? 'btn--danger' : 'btn--primary'}" data-role="ok" value="ok">${escapeText(opts.confirmLabel ?? '确定')}</button>
        </div>
      </form>`;

    document.body.appendChild(dlg);

    const finish = (value: boolean): void => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };

    dlg.querySelector('[data-role="cancel"]')?.addEventListener('click', () => finish(false));
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(false);
    });
    dlg.addEventListener('close', () => {
      // 通过 Esc 关闭且未走 finish 时，保证 promise 一定结束
      if (dlg.isConnected) {
        dlg.remove();
        resolve(false);
      }
    });
    dlg.querySelector('form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      finish(true);
    });

    dlg.showModal();
    dlg.querySelector<HTMLElement>('[data-role="ok"]')?.focus();
  });
}

export interface PromptOptions {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  confirmLabel?: string;
  multiline?: boolean;
}

/** 输入对话框，返回用户输入；取消返回 null */
export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'app-dialog';
    dlg.setAttribute('aria-labelledby', 'dlg-title');

    const field = opts.multiline
      ? `<textarea class="input" id="dlg-input" rows="4" placeholder="${escapeAttr(opts.placeholder ?? '')}">${escapeText(opts.value ?? '')}</textarea>`
      : `<input class="input" id="dlg-input" type="text" placeholder="${escapeAttr(opts.placeholder ?? '')}" value="${escapeAttr(opts.value ?? '')}">`;

    dlg.innerHTML = `
      <form method="dialog" class="app-dialog-form">
        <h2 id="dlg-title">${escapeText(opts.title)}</h2>
        ${opts.message ? `<p>${escapeText(opts.message)}</p>` : ''}
        <div class="field">
          ${opts.label ? `<label for="dlg-input">${escapeText(opts.label)}</label>` : ''}
          ${field}
        </div>
        <div class="app-dialog-actions">
          <button type="button" class="btn btn--ghost" data-role="cancel">取消</button>
          <button type="submit" class="btn btn--primary" data-role="ok">${escapeText(opts.confirmLabel ?? '保存')}</button>
        </div>
      </form>`;

    document.body.appendChild(dlg);

    const input = dlg.querySelector<HTMLInputElement | HTMLTextAreaElement>('#dlg-input');

    const finish = (value: string | null): void => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };

    dlg.querySelector('[data-role="cancel"]')?.addEventListener('click', () => finish(null));
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(null);
    });
    dlg.addEventListener('close', () => {
      if (dlg.isConnected) {
        dlg.remove();
        resolve(null);
      }
    });
    dlg.querySelector('form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      finish(input?.value ?? '');
    });

    dlg.showModal();
    input?.focus();
    input?.select();
  });
}

/* 本地转义（避免从 format 引入循环依赖） */
function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;');
}
