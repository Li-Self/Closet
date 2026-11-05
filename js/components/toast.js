export function showToast(message, { type = 'info', duration = 3000 } = {}) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
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
  toast.textContent = message;
  stack.append(toast);
  setTimeout(() => toast.remove(), duration);
}
