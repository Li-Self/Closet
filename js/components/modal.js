let active = null;

export function closeSheet() {
  if (!active) return;
  const { backdrop, onClose, keyHandler } = active;
  document.removeEventListener('keydown', keyHandler);
  backdrop.remove();
  document.body.style.overflow = '';
  active = null;
  onClose?.();
}

export function openSheet({ title, content, actions = [], onClose = null }) {
  closeSheet();
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');

  const header = document.createElement('div');
  header.className = 'page-header';
  const heading = document.createElement('h2');
  heading.className = 'page-title';
  heading.style.fontSize = '20px';
  heading.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'icon-button';
  close.setAttribute('aria-label', '关闭');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  close.addEventListener('click', closeSheet);
  header.append(heading, close);
  sheet.append(header);
  if (content) sheet.append(content);

  if (actions.length) {
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.flexDirection = 'column';
    footer.style.gap = '8px';
    footer.style.marginTop = '14px';
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.variant === 'primary' ? 'primary-button'
        : action.variant === 'danger' ? 'danger-button' : 'ghost-button';
      button.textContent = action.label;
      button.addEventListener('click', () => action.onClick?.());
      footer.append(button);
    }
    sheet.append(footer);
  }

  backdrop.append(sheet);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeSheet(); });
  root.append(backdrop);
  document.body.style.overflow = 'hidden';

  const keyHandler = event => { if (event.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', keyHandler);
  active = { backdrop, onClose, keyHandler };

  const focusTarget = sheet.querySelector('input, textarea, select') ?? sheet.querySelector('button');
  focusTarget?.focus({ preventScroll: true });
  return { sheet, close: closeSheet };
}

export function confirmDialog({ title, message, confirmText = '确定', cancelText = '取消', danger = false }) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const content = document.createElement('p');
    content.textContent = message;
    content.style.color = 'var(--ink-soft)';
    content.style.fontSize = '14px';
    openSheet({
      title,
      content,
      actions: [
        {
          label: confirmText,
          variant: danger ? 'danger' : 'primary',
          onClick: () => { finish(true); closeSheet(); },
        },
        {
          label: cancelText,
          variant: 'ghost',
          onClick: () => { finish(false); closeSheet(); },
        },
      ],
      onClose: () => finish(false),
    });
  });
}
