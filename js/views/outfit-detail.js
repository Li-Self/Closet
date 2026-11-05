import { getState, outfitById, itemById, photoUrl, loadAll } from '../store.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { formatDateLabel, nowKey } from '../utils/dates.js';
import { emptyState } from '../components/empty-state.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { openLogSheet } from '../components/log-sheet.js';
import { deleteOutfit } from '../db/outfits.js';
import { outfitCoverHtml } from './outfits.js';
import { navigate } from '../router.js';

export function renderOutfitDetail({ id }) {
  document.body.classList.add('detail-mode');
  const app = document.getElementById('app');
  const outfit = outfitById(id);
  if (!outfit) {
    app.innerHTML = '';
    app.append(emptyState({ title: '搭配不存在', description: '它可能已经被删除。', actionLabel: '返回搭配', onAction: () => navigate('/outfits') }));
    return () => { document.body.classList.remove('detail-mode'); };
  }
  const state = getState();
  const items = (outfit.itemIds ?? []).map(itemId => itemById(itemId));
  const existingItems = items.filter(Boolean);
  const outfitLogs = state.logs.filter(log => log.outfitId === outfit.id);
  const lastWorn = outfitLogs.reduce((max, log) => (log.date > max ? log.date : max), '');
  const seasonText = (outfit.seasons ?? []).map(value => SEASON_LABELS[value] ?? value).join('、');
  const occasionText = (outfit.occasions ?? []).map(value => OCCASION_LABELS[value] ?? value).join('、');
  app.innerHTML = `
    <div class="page outfit-detail-page">
      <header class="page-header" style="padding-top:10px">
        <button type="button" class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:17px;flex:1;text-align:center;line-height:44px">搭配详情</h1>
        <button type="button" class="head-link" id="edit-button">编辑</button>
      </header>
      <div class="outfit-hero">${outfitCoverHtml(outfit)}</div>
      <div>
        <h1 class="page-title" style="font-size:22px">${escapeHtml(outfit.name)}</h1>
        <div class="tag-row" style="margin-top:8px">
          ${seasonText ? `<span class="tag accent">${escapeHtml(seasonText)}</span>` : ''}
          ${occasionText ? `<span class="tag">${escapeHtml(occasionText)}</span>` : ''}
          <span class="tag">${existingItems.length} 件单品</span>
          ${outfit.favorite ? '<span class="tag">已收藏</span>' : ''}
        </div>
      </div>
      <div class="detail-card">
        <div class="card-title">单品清单</div>
        <div id="outfit-items"></div>
      </div>
      ${items.length !== existingItems.length ? `<div class="empty-inline">有 ${items.length - existingItems.length} 件单品已被删除，请编辑搭配补充。</div>` : ''}
      ${outfit.note ? `<div class="detail-card"><div class="card-title">备注</div><p class="page-meta">${escapeHtml(outfit.note)}</p></div>` : ''}
      <div class="detail-card">
        <div class="card-title">穿着数据</div>
        <div class="stat-row">
          <div class="stat-item"><b>${outfitLogs.length}</b><span>穿过</span></div>
          <div class="stat-item"><b>${lastWorn ? formatDateLabel(lastWorn) : '—'}</b><span>最近穿着</span></div>
          <div class="stat-item"><b>${existingItems.length}</b><span>可用单品</span></div>
        </div>
      </div>
      <div class="detail-actions">
        <button type="button" class="primary-button" id="log-button">今天穿这套</button>
        <button type="button" class="ghost-button" id="detail-edit-button">编辑搭配</button>
        <button type="button" class="danger-button" id="delete-button">删除搭配</button>
      </div>
    </div>
  `;
  const itemsBox = document.getElementById('outfit-items');
  for (const item of items) {
    if (!item) {
      const row = document.createElement('div');
      row.className = 'outfit-item-row';
      row.innerHTML = '<span class="thumb"></span><span><span class="nm">已删除的单品</span><br><span class="ct">请编辑搭配</span></span>';
      itemsBox.append(row);
      continue;
    }
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'outfit-item-row';
    const url = photoUrl(item.photoId);
    const categories = (item.categories ?? []).join(' / ') || '未分类';
    row.innerHTML = `
      <span class="thumb">${url ? `<img src="${url}" alt="">` : ''}</span>
      <span><span class="nm">${escapeHtml(item.name)}</span><br><span class="ct">${escapeHtml(categories)}</span></span>
    `;
    row.addEventListener('click', () => navigate(`/item/${item.id}`));
    itemsBox.append(row);
  }
  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/outfits');
  });
  document.getElementById('edit-button').addEventListener('click', () => navigate(`/outfit/${outfit.id}/edit`));
  document.getElementById('detail-edit-button').addEventListener('click', () => navigate(`/outfit/${outfit.id}/edit`));
  document.getElementById('log-button').addEventListener('click', () => openLogSheet({ date: nowKey(), outfitId: outfit.id }));
  document.getElementById('delete-button').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '删除搭配',
      message: `确定删除「${outfit.name}」吗？历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await deleteOutfit(outfit.id);
    await loadAll();
    showToast('已删除');
    navigate('/outfits');
  });
  return () => { document.body.classList.remove('detail-mode'); };
}
