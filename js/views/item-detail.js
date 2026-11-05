import { getState, itemById, photoUrl, getFullPhoto, loadAll } from '../store.js';
import { saveItem, deleteItem } from '../db/items.js';
import { itemWearStats } from '../utils/stats.js';
import { daysBetween, nowKey, toDateKey, formatDateLabel } from '../utils/dates.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { emptyState } from '../components/empty-state.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { openLogSheet } from '../components/log-sheet.js';
import { navigate } from '../router.js';

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/></svg>';
const PLACEHOLDER = '<svg class="placeholder" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M31 24 L42 16 Q50 27 58 16 L69 24 L84 41 L72 51 L72 103 L28 103 L28 51 L16 41 Z"/></svg>';

export async function renderItemDetail({ id }) {
  document.body.classList.add('detail-mode');
  const app = document.getElementById('app');
  const item = itemById(id);
  if (!item) {
    app.innerHTML = '';
    app.append(emptyState({ title: '单品不存在', description: '它可能已经被删除。', actionLabel: '返回衣橱', onAction: () => navigate('/wardrobe') }));
    return () => { document.body.classList.remove('detail-mode'); };
  }
  const state = getState();
  const stats = itemWearStats(item.id, state.logs, nowKey());
  const daysInWardrobe = daysBetween(toDateKey(new Date(item.createdAt)), nowKey());
  const thumb = photoUrl(item.photoId);
  const categories = item.categories ?? (item.category ? [item.category] : []);
  const colors = item.colors ?? (item.color ? [item.color] : []);
  const seasonText = (item.seasons ?? []).map(value => SEASON_LABELS[value] ?? value).join('、');
  const occasionText = (item.occasions ?? []).map(value => OCCASION_LABELS[value] ?? value).join('、');
  let favorite = Boolean(item.favorite);
  app.innerHTML = `
    <div class="page detail-page">
      <header class="page-header" style="padding-top:10px">
        <button type="button" class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:17px;flex:1;text-align:center;line-height:44px">单品详情</h1>
        <button type="button" class="head-link" id="edit-button">编辑</button>
      </header>
      <div class="detail-hero">
        <div class="detail-photo">
          ${thumb ? `<img id="detail-photo" src="${thumb}" alt="${escapeHtml(item.name)}">` : PLACEHOLDER}
          <button type="button" class="item-heart${favorite ? ' active' : ''}" id="favorite-button" aria-label="${favorite ? '取消收藏' : '收藏'}"><span>${HEART}</span></button>
        </div>
        <div class="detail-name">${escapeHtml(item.name)}</div>
        <div class="detail-meta">${[item.brand, colors.join(' / '), seasonText, occasionText].filter(Boolean).join(' · ') || '—'}</div>
        <div class="tag-row">
          ${categories.map(name => `<span class="tag accent">${escapeHtml(name)}</span>`).join('')}
          ${colors.map(name => `<span class="tag">${escapeHtml(name)}</span>`).join('')}
          ${seasonText ? `<span class="tag">${escapeHtml(seasonText)}</span>` : ''}
          ${occasionText ? `<span class="tag">${escapeHtml(occasionText)}</span>` : ''}
        </div>
      </div>
      <div class="detail-card">
        <div class="card-title">穿着数据</div>
        <div class="stat-row">
          <div class="stat-item"><b>${stats.wearCount}</b><span>穿过</span></div>
          <div class="stat-item"><b>${stats.lastWorn ? formatDateLabel(stats.lastWorn) : '—'}</b><span>最近穿着</span></div>
          <div class="stat-item"><b>${daysInWardrobe}</b><span>在衣橱天数</span></div>
        </div>
      </div>
      <div class="detail-card">
        <div class="card-title">备注</div>
        <p class="page-meta">${item.note ? escapeHtml(item.note) : '还没有备注。'}</p>
      </div>
      <div class="detail-actions">
        <button type="button" class="primary-button" id="log-button">记录今天穿它</button>
        <button type="button" class="ghost-button" id="detail-edit-button">编辑单品</button>
        <button type="button" class="danger-button" id="delete-button">删除单品</button>
      </div>
    </div>
  `;
  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/wardrobe');
  });
  document.getElementById('edit-button').addEventListener('click', () => navigate(`/item/${item.id}/edit`));
  document.getElementById('detail-edit-button').addEventListener('click', () => navigate(`/item/${item.id}/edit`));
  document.getElementById('log-button').addEventListener('click', () => openLogSheet({ date: nowKey(), itemIds: [item.id] }));
  document.getElementById('favorite-button').addEventListener('click', async () => {
    favorite = !favorite;
    const button = document.getElementById('favorite-button');
    button.classList.toggle('active', favorite);
    button.setAttribute('aria-label', favorite ? '取消收藏' : '收藏');
    try {
      await saveItem({ ...item, favorite });
      await loadAll();
      showToast(favorite ? '已收藏' : '已取消收藏');
    } catch {
      showToast('操作失败，请重试', { type: 'error' });
    }
  });
  document.getElementById('delete-button').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '删除单品',
      message: `确定删除「${item.name}」吗？它会从所有搭配中移除，历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await deleteItem(item.id);
    await loadAll();
    showToast('已删除');
    navigate('/wardrobe');
  });

  let objectUrl = null;
  if (item.photoId) {
    const photo = await getFullPhoto(item.photoId);
    if (photo) {
      objectUrl = URL.createObjectURL(photo.full);
      const img = document.getElementById('detail-photo');
      if (img) img.src = objectUrl;
    }
  }
  return () => {
    document.body.classList.remove('detail-mode');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}
