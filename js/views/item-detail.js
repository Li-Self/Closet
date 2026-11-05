import { getState, itemById, photoUrl, getFullPhoto } from '../store.js';
import { itemWearStats } from '../utils/stats.js';
import { daysBetween, nowKey, toDateKey, formatDateLabel } from '../utils/dates.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { emptyState } from '../components/empty-state.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { openLogSheet } from '../components/log-sheet.js';
import { navigate } from '../router.js';

const placeholder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 3v18M4 7h16M8 7l-3 5 3 2M16 7l3 5-3 2"/></svg>';

export async function renderItemDetail({ id }) {
  const app = document.getElementById('app');
  const item = itemById(id);
  if (!item) {
    app.innerHTML = '';
    app.append(emptyState({ title: '单品不存在', description: '它可能已经被删除。', actionLabel: '返回衣橱', onAction: () => navigate('/wardrobe') }));
    return () => {};
  }
  const state = getState();
  const stats = itemWearStats(item.id, state.logs, nowKey());
  const daysInWardrobe = daysBetween(toDateKey(new Date(item.createdAt)), nowKey());
  const thumb = photoUrl(item.photoId);
  const seasonText = (item.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('、');
  const occasionText = (item.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join('、');
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div style="flex:1; text-align:center">
          <div class="page-subtitle">Item No.${String(item.code ?? 0).padStart(3, '0')}</div>
        </div>
        <span style="width:44px"></span>
      </header>
      <div class="detail-photo" id="detail-photo-box">${thumb ? `<img id="detail-photo" src="${thumb}" alt="${escapeHtml(item.name)}">` : placeholder}</div>
      <div>
        <h1 class="page-title" style="font-size:24px">${escapeHtml(item.name)}</h1>
        <div class="tag-row" style="margin-top:8px">
          <span class="tag accent">${escapeHtml(item.category)}</span>
          ${item.color ? `<span class="tag">${escapeHtml(item.color)}</span>` : ''}
          ${seasonText ? `<span class="tag">${escapeHtml(seasonText)}</span>` : ''}
          ${occasionText ? `<span class="tag">${escapeHtml(occasionText)}</span>` : ''}
          ${item.favorite ? '<span class="tag">已收藏</span>' : ''}
        </div>
      </div>
      <dl class="info-list">
        ${item.brand ? `<div class="info-row"><dt>品牌</dt><dd>${escapeHtml(item.brand)}</dd></div>` : ''}
        <div class="info-row"><dt>备注</dt><dd>${item.note ? escapeHtml(item.note) : '—'}</dd></div>
      </dl>
      <div class="stat-row">
        <div class="stat-item"><b>${stats.wearCount}</b><span>穿过</span></div>
        <div class="stat-item"><b>${stats.lastWorn ? formatDateLabel(stats.lastWorn) : '—'}</b><span>最近穿着</span></div>
        <div class="stat-item"><b>${daysInWardrobe}</b><span>在衣橱天数</span></div>
      </div>
      <div class="detail-actions" id="detail-actions"></div>
    </div>
  `;
  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/wardrobe');
  });

  const actions = document.getElementById('detail-actions');
  const logButton = document.createElement('button');
  logButton.type = 'button';
  logButton.className = 'primary-button';
  logButton.textContent = '记录今天穿它';
  logButton.addEventListener('click', () => openLogSheet({ date: nowKey(), itemIds: [item.id] }));
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'primary-button';
  editButton.textContent = '编辑单品';
  editButton.addEventListener('click', () => navigate(`/item/${item.id}/edit`));
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button';
  deleteButton.textContent = '删除单品';
  deleteButton.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '删除单品',
      message: `确定删除「${item.name}」吗？它会从所有搭配中移除，历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    const { deleteItem } = await import('../db/items.js');
    const { loadAll } = await import('../store.js');
    await deleteItem(item.id);
    await loadAll();
    showToast('已删除');
    navigate('/wardrobe');
  });
  actions.append(logButton, editButton, deleteButton);

  let objectUrl = null;
  if (item.photoId) {
    const photo = await getFullPhoto(item.photoId);
    if (photo) {
      objectUrl = URL.createObjectURL(photo.full);
      const img = document.getElementById('detail-photo');
      if (img) img.src = objectUrl;
    }
  }
  return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
}
