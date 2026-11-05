import { loadAll, subscribe } from './store.js';
import { register, start } from './router.js';
import { renderNav, updateNav } from './components/nav.js';
import { renderWardrobe } from './views/wardrobe.js';
import { renderItemDetail } from './views/item-detail.js';
import { renderItemEdit } from './views/item-edit.js';
import { renderLogs } from './views/logs.js';
import { renderOutfits } from './views/outfits.js';
import { renderOutfitDetail } from './views/outfit-detail.js';
import { renderOutfitEdit } from './views/outfit-edit.js';
import { renderSettings } from './views/settings.js';
import { showToast } from './components/toast.js';

function renderFatal(error) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="empty-state" style="margin-top:40px">
      <h3>数据加载失败</h3>
      <p style="font-size:13px;margin-bottom:12px">${String(error?.message ?? error)}</p>
      <button class="primary-button" id="retry-button" style="max-width:200px;margin:0 auto">重试</button>
    </div>
  `;
  document.getElementById('retry-button').addEventListener('click', () => location.reload());
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('有新版本，重新打开应用后生效');
        }
      });
    });
  } catch (error) {
    showToast('离线缓存注册失败，在线状态下仍可使用', { type: 'error' });
  }
}

async function boot() {
  renderNav();
  updateNav();
  addEventListener('hashchange', updateNav);
  subscribe(() => updateNav());
  addEventListener('error', event => showToast(event.message || '发生未知错误', { type: 'error' }));
  addEventListener('unhandledrejection', event => showToast(event.reason?.message || '操作失败', { type: 'error' }));
  try {
    await loadAll();
  } catch (error) {
    renderFatal(error);
    return;
  }
  register('/wardrobe', renderWardrobe);
  register('/item/new', renderItemEdit);
  register('/item/:id/edit', renderItemEdit);
  register('/item/:id', renderItemDetail);
  register('/logs', renderLogs);
  register('/outfits', renderOutfits);
  register('/outfit/new', renderOutfitEdit);
  register('/outfit/:id/edit', renderOutfitEdit);
  register('/outfit/:id', renderOutfitDetail);
  register('/settings', renderSettings);
  await start();
  registerServiceWorker();
  navigator.storage?.persist?.().catch(() => {});
}

boot();
