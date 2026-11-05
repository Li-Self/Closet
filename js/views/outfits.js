import { getState, subscribe, photoUrl, itemById } from '../store.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { emptyState } from '../components/empty-state.js';
import { navigate } from '../router.js';

let unsubscribe = null;

export function renderOutfits() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

export function outfitCoverHtml(outfit) {
  const ids = (outfit.itemIds ?? []).slice(0, 4);
  const cells = ids.map(id => {
    const url = photoUrl(itemById(id)?.photoId);
    return `<div>${url ? `<img src="${url}" alt="">` : ''}</div>`;
  });
  while (cells.length < 4) cells.push('<div></div>');
  return `<div class="outfit-cover">${cells.join('')}</div>`;
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">Saved Looks</div>
          <h1 class="page-title">搭配</h1>
          <div class="page-meta">${state.outfits.length} 套搭配</div>
        </div>
        <button class="icon-button" id="add-outfit" aria-label="新建搭配">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </header>
      <div id="outfit-grid" class="outfit-grid"></div>
    </div>
  `;
  document.getElementById('add-outfit').addEventListener('click', () => navigate('/outfit/new'));
  const grid = document.getElementById('outfit-grid');
  if (!state.outfits.length) {
    grid.append(emptyState({
      title: '还没有搭配',
      description: '把常穿的单品组合起来，出门前直接选一套。',
      actionLabel: state.items.length ? '新建第一套搭配' : '先去录入单品',
      onAction: () => navigate(state.items.length ? '/outfit/new' : '/item/new'),
    }));
    return;
  }
  for (const outfit of state.outfits) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'outfit-card';
    card.setAttribute('aria-label', `查看 ${outfit.name}`);
    const seasonText = (outfit.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('');
    const occasionText = (outfit.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join(' · ');
    card.innerHTML = `
      ${outfitCoverHtml(outfit)}
      <div class="outfit-name">${escapeHtml(outfit.name)}</div>
      <div class="outfit-meta">${(outfit.itemIds ?? []).length} 件${seasonText ? ` · ${seasonText}` : ''}${occasionText ? ` · ${occasionText}` : ''}</div>
    `;
    card.addEventListener('click', () => navigate(`/outfit/${outfit.id}`));
    grid.append(card);
  }
}
