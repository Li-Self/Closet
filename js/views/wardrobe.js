import { getState, setFilters, setSort, subscribe, notify, photoUrl, wearIndex, loadAll } from '../store.js';
import { filterItems, sortItems } from '../utils/filters.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { COLOR_HEX } from '../db/settings.js';
import { saveItem, reorderItems } from '../db/items.js';
import { emptyState } from '../components/empty-state.js';
import { openSheet, closeSheet } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { makeSortable } from '../utils/sortable.js';
import { navigate } from '../router.js';

let unsubscribe = null;
let sortableCleanup = null;

const CATEGORY_ICONS = {
  全部: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  上衣: '<path d="M8 4l4 2 4-2 3 4-2 2v10H7V10L5 8z"/>',
  外套: '<path d="M7 4h10l2 5-2 3v8H7v-8L5 9z"/><path d="M12 4v16"/>',
  裤子: '<path d="M8 3h8l1 8-1 10h-3l-1-8-1 8H7L6 11z"/>',
  裙子: '<path d="M9 3h6l3 18H6z"/>',
  连衣裙: '<path d="M9 3h6l2 5-1 4 2 9H6l2-9-1-4z"/>',
  鞋靴: '<path d="M3 17c3-3 6-1 8 1 3 1 7 1 10 2v2H3z"/>',
  箱包: '<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  配饰: '<circle cx="12" cy="12" r="7"/><path d="M12 5v14"/>',
  其他: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
};

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/></svg>';
const PLACEHOLDER = '<svg class="placeholder" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M31 24 L42 16 Q50 27 58 16 L69 24 L84 41 L72 51 L72 103 L28 103 L28 51 L16 41 Z"/></svg>';

export function renderWardrobe() {
  unsubscribe?.();
  unsubscribe = subscribe(() => paint());
  paint();
  return () => {
    unsubscribe?.();
    unsubscribe = null;
    sortableCleanup?.();
    sortableCleanup = null;
  };
}

function categoryIcon(name) {
  const path = CATEGORY_ICONS[name] ?? CATEGORY_ICONS['其他'];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${path}</svg>`;
}

function usedCategories(state) {
  const values = [];
  for (const item of state.items) {
    for (const category of item.categories ?? []) {
      if (!values.includes(category)) values.push(category);
    }
  }
  return values;
}

function allCategories(state) {
  return [...new Set([...state.settings.categories, ...usedCategories(state)])].filter(Boolean);
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  const categories = allCategories(state);
  app.innerHTML = `
    <div class="page wardrobe-page">
      <header class="wardrobe-head">
        <div class="page-header">
          <div>
            <div class="wardrobe-title-row">
              <span class="logo-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v16M4 8h16M8 8l-3 5 3 2M16 8l3 5-3 2"/></svg></span>
              <h1 class="page-title">我的衣橱</h1>
            </div>
            <div class="page-meta">${state.items.length} 件单品 · ${state.outfits.length} 套搭配</div>
          </div>
          <div class="head-actions">
            <button type="button" class="icon-button" id="sort-button" aria-label="排序">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/></svg>
            </button>
            <button type="button" class="icon-button" id="search-button" aria-label="搜索">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
            </button>
            <button type="button" class="icon-button" id="filter-button" aria-label="筛选">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
            </button>
          </div>
        </div>
      </header>
      <div class="search-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
        <input id="search-input" type="search" placeholder="搜索单品、品牌、颜色" aria-label="搜索单品" value="${escapeHtml(state.filters.keyword)}">
      </div>
      <div class="wardrobe-body">
        <aside class="category-rail" id="category-rail"></aside>
        <main class="wardrobe-main">
          <div class="subhead">
            <span id="result-count"></span>
            <button type="button" class="filter-chip" id="color-filter"></button>
          </div>
          <div class="item-grid" id="item-grid"></div>
        </main>
      </div>
    </div>
  `;
  renderRail(categories);
  document.getElementById('sort-button').addEventListener('click', openSortSheet);
  document.getElementById('filter-button').addEventListener('click', openFilterSheet);
  document.getElementById('color-filter').addEventListener('click', openFilterSheet);
  document.getElementById('search-button').addEventListener('click', () => {
    document.getElementById('search-input')?.focus();
  });
  document.getElementById('search-input').addEventListener('input', event => {
    setFilters({ keyword: event.target.value });
    renderGrid();
  });
  renderGrid();
}

function renderRail(categories) {
  const state = getState();
  const rail = document.getElementById('category-rail');
  if (!rail) return;
  const options = [{ name: '', label: '全部', count: state.items.length }, ...categories.map(name => ({
    name,
    label: name,
    count: state.items.filter(item => (item.categories ?? []).includes(name)).length,
  }))];
  rail.innerHTML = options.map(option => `
    <button type="button" class="rail-item${state.filters.category === option.name ? ' active' : ''}" data-category="${escapeHtml(option.name)}">
      <span class="rail-icon">${categoryIcon(option.label)}</span>
      <span class="rail-label">${escapeHtml(option.label)}</span>
      <span class="rail-count">${option.count}</span>
    </button>
  `).join('');
  rail.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      setFilters({ category: button.dataset.category });
      renderRail(categories);
      renderGrid();
    });
  });
}

function renderGrid() {
  const state = getState();
  const grid = document.getElementById('item-grid');
  if (!grid) return;
  sortableCleanup?.();
  sortableCleanup = null;
  const { counts, lastWorn } = wearIndex();
  const items = sortItems(filterItems(state.items, state.filters), state.sort, { counts, lastWorn });
  grid.classList.toggle('no-drag', state.sort !== 'custom');
  const count = document.getElementById('result-count');
  const colorFilter = document.getElementById('color-filter');
  if (count) count.textContent = `${state.filters.category || '全部单品'} · ${items.length}`;
  if (colorFilter) {
    colorFilter.textContent = state.filters.colors.length ? `颜色 ${state.filters.colors.length} ▾` : '颜色 ▾';
  }
  grid.innerHTML = '';
  if (!items.length) {
    grid.append(emptyState({
      title: state.items.length ? '没有符合条件的单品' : '衣橱还是空的',
      description: state.items.length ? '换个关键词或清除筛选试试。' : '拍下第一件衣服，开始建立你的衣橱。',
      actionLabel: state.items.length ? '清除筛选' : '录入第一件单品',
      onAction: () => {
        if (state.items.length) {
          setFilters({ keyword: '', category: '', categories: [], colors: [], seasons: [], occasions: [], favoriteOnly: false });
          notify();
        } else {
          navigate('/item/new');
        }
      },
    }));
    return;
  }
  for (const item of items) {
    grid.append(createItemCard(item));
  }
  if (state.sort === 'custom') {
    sortableCleanup = makeSortable(grid, {
      itemSelector: '.item-card',
      handleSelector: '.drag-handle',
      onReorder: async ids => {
        try {
          await reorderItems(ids);
          await loadAll();
          showToast('顺序已保存');
        } catch {
          showToast('排序保存失败', { type: 'error' });
        }
      },
    });
  }
}

function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.dataset.id = item.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `查看 ${item.name}`);
  const url = photoUrl(item.photoId);
  const categories = item.categories ?? [];
  const colors = item.colors ?? [];
  const colorHex = colors.length ? (COLOR_HEX[colors[0]] ?? '#D9C7A7') : '#D9C7A7';
  const meta = [item.brand, colors.join('/')].filter(Boolean).join(' · ') || categories.join('/') || '未分类';
  card.innerHTML = `
    <div class="item-photo">
      ${url ? `<img src="${url}" alt="${escapeHtml(item.name)}" loading="lazy">` : PLACEHOLDER}
      <span class="drag-handle" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <button type="button" class="item-heart${item.favorite ? ' active' : ''}" aria-label="${item.favorite ? '取消收藏' : '收藏'}">
        <span>${HEART}</span>
      </button>
    </div>
    <div class="item-name">${escapeHtml(item.name)}</div>
    <div class="item-tags"><span class="color-dot" style="background:${colorHex}"></span>${escapeHtml(meta)}</div>
  `;
  card.addEventListener('click', event => {
    if (event.target.closest('.item-heart, .drag-handle')) return;
    navigate(`/item/${item.id}`);
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(`/item/${item.id}`);
    }
  });
  card.querySelector('.item-heart').addEventListener('click', async event => {
    event.stopPropagation();
    try {
      await saveItem({ ...item, favorite: !item.favorite });
      await loadAll();
      showToast(item.favorite ? '已取消收藏' : '已收藏');
    } catch {
      showToast('操作失败，请重试', { type: 'error' });
    }
  });
  return card;
}

function openSortSheet() {
  const state = getState();
  const options = [
    ['custom', '自定义顺序'],
    ['recent', '最近添加'],
    ['mostWorn', '最常穿'],
    ['leastWorn', '最久未穿'],
  ];
  openSheet({
    title: '排序方式',
    actions: options.map(([value, label]) => ({
      label: `${state.sort === value ? '✓ ' : ''}${label}`,
      variant: state.sort === value ? 'primary' : 'ghost',
      onClick: () => {
        setSort(value);
        closeSheet();
        notify();
      },
    })),
  });
}

function openFilterSheet() {
  const state = getState();
  const colors = [...new Set([...state.settings.colors, ...state.items.flatMap(item => item.colors ?? [])])].filter(Boolean);
  const draft = {
    colors: new Set(state.filters.colors),
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
        <div class="field-label">颜色</div>
        <div class="choice-row">
          ${colors.map(name => `<button type="button" class="choice-chip" data-color="${escapeHtml(name)}" aria-pressed="${draft.colors.has(name)}"><span class="color-dot" style="background:${COLOR_HEX[name] ?? '#C9A9A9'}"></span>${escapeHtml(name)}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <div class="field-label">季节</div>
        <div class="choice-row">
          ${Object.entries(SEASON_LABELS).map(([key, label]) => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${draft.seasons.has(key)}">${label}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <div class="field-label">场合</div>
        <div class="choice-row">
          ${Object.entries(OCCASION_LABELS).map(([key, label]) => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${draft.occasions.has(key)}">${label}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <div class="field-label">收藏</div>
        <div class="choice-row"><button type="button" class="choice-chip" id="favorite-only" aria-pressed="${draft.favoriteOnly}">仅看收藏</button></div>
      </div>
    `;
    content.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.color;
      draft.colors.has(value) ? draft.colors.delete(value) : draft.colors.add(value);
      renderChoices();
    }));
    content.querySelectorAll('[data-season]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.season;
      draft.seasons.has(value) ? draft.seasons.delete(value) : draft.seasons.add(value);
      renderChoices();
    }));
    content.querySelectorAll('[data-occasion]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.occasion;
      draft.occasions.has(value) ? draft.occasions.delete(value) : draft.occasions.add(value);
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
          setFilters({
            colors: [...draft.colors],
            seasons: [...draft.seasons],
            occasions: [...draft.occasions],
            favoriteOnly: draft.favoriteOnly,
          });
          closeSheet();
          notify();
        },
      },
      {
        label: '清除筛选',
        variant: 'ghost',
        onClick: () => {
          setFilters({ keyword: '', category: '', categories: [], colors: [], seasons: [], occasions: [], favoriteOnly: false });
          closeSheet();
          notify();
        },
      },
    ],
  });
}
