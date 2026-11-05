const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>';
const ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 7v6M12 17h.01"/></svg>';

export function showToast(message, { type = 'success', duration = 2600 } = {}) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    document.body.append(root);
  }
  let stack = root.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    root.append(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' error' : ''}`;
  toast.setAttribute('role', 'status');
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.innerHTML = type === 'error' ? ALERT : CHECK;
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);
  stack.append(toast);
  setTimeout(() => toast.remove(), duration);
}
