import { getState, setFilters, setSort, subscribe, notify, photoUrl, wearIndex } from '../store.js';
import { filterItems, sortItems } from '../utils/filters.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { emptyState } from '../components/empty-state.js';
import { openSheet, closeSheet } from '../components/modal.js';
import { navigate } from '../router.js';

let unsubscribe = null;
let currentItems = [];

const placeholder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3v18M4 7h16M8 7l-3 5 3 2M16 7l3 5-3 2"/></svg>';

export function renderWardrobe() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  const { counts, lastWorn } = wearIndex();
  currentItems = sortItems(filterItems(state.items, state.filters), state.sort, { counts, lastWorn });
  const categories = ['', ...state.settings.categories];
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <div class="page-subtitle">My Wardrobe</div>
          <h1 class="page-title">我的衣橱</h1>
          <div class="page-meta">${state.items.length} 件单品 · ${state.outfits.length} 套搭配</div>
        </div>
        <button class="icon-button" id="add-item" aria-label="录入单品">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </header>
      <div class="search-row">
        <input id="search-input" class="text-input" type="search" placeholder="搜索名称、颜色、品牌" aria-label="搜索单品" value="${escapeHtml(state.filters.keyword)}">
        <button class="icon-button" id="filter-button" aria-label="筛选">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        </button>
      </div>
      <div class="chip-row" id="category-chips">
        ${categories.map(name => `<button type="button" class="chip" data-category="${escapeHtml(name)}" aria-pressed="${state.filters.category === name}">${name ? escapeHtml(name) : '全部'}</button>`).join('')}
      </div>
      <div class="toolbar-row">
        <span class="page-meta" id="result-count"></span>
        <select id="sort-select" class="select-input" aria-label="排序方式">
          <option value="recent">最近添加</option>
          <option value="mostWorn">最常穿</option>
          <option value="leastWorn">最久未穿</option>
        </select>
      </div>
      <div id="item-grid" class="item-grid"></div>
    </div>
  `;
  document.getElementById('sort-select').value = state.sort;
  document.getElementById('add-item').addEventListener('click', () => navigate('/item/new'));
  document.getElementById('search-input').addEventListener('input', event => {
    setFilters({ keyword: event.target.value });
    renderGrid();
  });
  document.getElementById('filter-button').addEventListener('click', openFilterSheet);
  document.getElementById('category-chips').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    setFilters({ category: button.dataset.category });
    for (const chip of event.currentTarget.querySelectorAll('.chip')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
    renderGrid();
  });
  document.getElementById('sort-select').addEventListener('change', event => {
    setSort(event.target.value);
    renderGrid();
  });
  renderGrid();
}

function renderGrid() {
  const state = getState();
  const { counts, lastWorn } = wearIndex();
  currentItems = sortItems(filterItems(state.items, state.filters), state.sort, { counts, lastWorn });
  const grid = document.getElementById('item-grid');
  const count = document.getElementById('result-count');
  if (count) count.textContent = `${currentItems.length} 件`;
  if (!grid) return;
  grid.innerHTML = '';
  if (!currentItems.length) {
    grid.append(emptyState({
      title: state.items.length ? '没有符合条件的单品' : '衣橱还是空的',
      description: state.items.length ? '换个关键词或清除筛选试试。' : '拍下第一件衣服，开始建立你的衣橱。',
      actionLabel: state.items.length ? '清除筛选' : '录入第一件单品',
      onAction: () => {
        if (state.items.length) {
          setFilters({ keyword: '', category: '', seasons: [], occasions: [], favoriteOnly: false });
          notify();
        } else {
          navigate('/item/new');
        }
      },
    }));
    return;
  }
  for (const item of currentItems) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'item-card';
    card.setAttribute('aria-label', `查看 ${item.name}`);
    const url = photoUrl(item.photoId);
    const seasonText = (item.seasons ?? []).map(s => SEASON_LABELS[s] ?? s).join('');
    const occasionText = (item.occasions ?? []).map(o => OCCASION_LABELS[o] ?? o).join(' · ');
    card.innerHTML = `
      <div class="item-photo">${url ? `<img src="${url}" alt="${escapeHtml(item.name)}" loading="lazy">` : placeholder}</div>
      <div class="item-meta">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-tags">${escapeHtml(item.category)}${seasonText ? ` · ${seasonText}` : ''}${occasionText ? ` · ${occasionText}` : ''}</div>
      </div>
    `;
    card.addEventListener('click', () => navigate(`/item/${item.id}`));
    grid.append(card);
  }
}

function openFilterSheet() {
  const state = getState();
  const draft = {
    seasons: new Set(state.filters.seasons),
    occasions: new Set(state.filters.occasions),
    favoriteOnly: state.filters.favoriteOnly,
  };
  const content = document.createElement('div');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.gap = '14px';
  const renderChoices = () => {
    content.innerHTML = `
      <div class="field">
        <div class="field-label">季节</div>
        <div class="choice-row">${Object.entries(SEASON_LABELS).map(([key, label]) => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${draft.seasons.has(key)}">${label}</button>`).join('')}</div>
      </div>
      <div class="field">
        <div class="field-label">场合</div>
        <div class="choice-row">${Object.entries(OCCASION_LABELS).map(([key, label]) => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${draft.occasions.has(key)}">${label}</button>`).join('')}</div>
      </div>
      <div class="field">
        <div class="field-label">收藏</div>
        <div class="choice-row"><button type="button" class="choice-chip" id="favorite-only" aria-pressed="${draft.favoriteOnly}">仅看收藏</button></div>
      </div>
    `;
    content.querySelectorAll('[data-season]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.season;
      draft.seasons.has(key) ? draft.seasons.delete(key) : draft.seasons.add(key);
      renderChoices();
    }));
    content.querySelectorAll('[data-occasion]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.occasion;
      draft.occasions.has(key) ? draft.occasions.delete(key) : draft.occasions.add(key);
      renderChoices();
    }));
    content.querySelector('#favorite-only').addEventListener('click', () => {
      draft.favoriteOnly = !draft.favoriteOnly;
      renderChoices();
    });
  };
  renderChoices();
  openSheet({
    title: '筛选',
    content,
    actions: [
      {
        label: '应用筛选',
        variant: 'primary',
        onClick: () => {
          setFilters({ seasons: [...draft.seasons], occasions: [...draft.occasions], favoriteOnly: draft.favoriteOnly });
          closeSheet();
          notify();
        },
      },
      {
        label: '清除筛选',
        variant: 'ghost',
        onClick: () => {
          setFilters({ keyword: '', category: '', seasons: [], occasions: [], favoriteOnly: false });
          closeSheet();
          notify();
        },
      },
    ],
  });
}
