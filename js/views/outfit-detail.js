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
  const app = document.getElementById('app');
  const outfit = outfitById(id);
  if (!outfit) {
    app.innerHTML = '';
    app.append(emptyState({ title: '搭配不存在', description: '它可能已经被删除。', actionLabel: '返回搭配', onAction: () => navigate('/outfits') }));
    return () => {};
  }
  const state = getState();
  const items = (outfit.itemIds ?? []).map(itemId => itemById(itemId));
  const existingItems = items.filter(Boolean);
  const outfitLogs = state.logs.filter(log => log.outfitId === outfit.id);
  const lastWorn = outfitLogs.reduce((max, log) => (log.date > max ? log.date : max), '');
  const seasonText = (outfit.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('、');
  const occasionText = (outfit.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join('、');
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div style="flex:1;text-align:center"><div class="page-subtitle">Look No.${String(outfit.code ?? 0).padStart(2, '0')}</div></div>
        <span style="width:44px"></span>
      </header>
      ${outfitCoverHtml(outfit)}
      <div>
        <h1 class="page-title" style="font-size:24px">${escapeHtml(outfit.name)}</h1>
        <div class="tag-row" style="margin-top:8px">
          ${seasonText ? `<span class="tag accent">${escapeHtml(seasonText)}</span>` : ''}
          ${occasionText ? `<span class="tag">${escapeHtml(occasionText)}</span>` : ''}
          <span class="tag">${existingItems.length} 件单品</span>
          ${outfit.favorite ? '<span class="tag">已收藏</span>' : ''}
        </div>
      </div>
      <div id="outfit-items"></div>
      ${items.length !== existingItems.length ? `<div class="empty-inline">有 ${items.length - existingItems.length} 件单品已被删除，请编辑搭配补充。</div>` : ''}
      ${outfit.note ? `<p style="font-size:13px;color:var(--ink-soft)">${escapeHtml(outfit.note)}</p>` : ''}
      <div class="stat-row">
        <div class="stat-item"><b>${outfitLogs.length}</b><span>穿过</span></div>
        <div class="stat-item"><b>${lastWorn ? formatDateLabel(lastWorn) : '—'}</b><span>最近穿着</span></div>
        <div class="stat-item"><b>${existingItems.length}</b><span>可用单品</span></div>
      </div>
      <div class="detail-actions" id="outfit-actions"></div>
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
    row.innerHTML = `
      <span class="thumb">${url ? `<img src="${url}" alt="">` : ''}</span>
      <span><span class="nm">${escapeHtml(item.name)}</span><br><span class="ct">${escapeHtml(item.category)}</span></span>
    `;
    row.addEventListener('click', () => navigate(`/item/${item.id}`));
    itemsBox.append(row);
  }
  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/outfits');
  });
  const actions = document.getElementById('outfit-actions');
  const logButton = document.createElement('button');
  logButton.type = 'button';
  logButton.className = 'primary-button';
  logButton.textContent = '今天穿这套';
  logButton.addEventListener('click', () => openLogSheet({ date: nowKey(), outfitId: outfit.id }));
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'ghost-button';
  editButton.textContent = '编辑搭配';
  editButton.addEventListener('click', () => navigate(`/outfit/${outfit.id}/edit`));
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button';
  deleteButton.textContent = '删除搭配';
  deleteButton.addEventListener('click', async () => {
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
  actions.append(logButton, editButton, deleteButton);
  return () => {};
}
