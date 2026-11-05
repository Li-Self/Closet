import { getState, subscribe, loadAll, photoUrl, itemById } from '../store.js';
import { saveOutfit, reorderOutfits } from '../db/outfits.js';
import { escapeHtml } from '../utils/dom.js';
import { SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { emptyState } from '../components/empty-state.js';
import { openSheet, closeSheet } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { makeSortable } from '../utils/sortable.js';
import { navigate } from '../router.js';

let unsubscribe = null;
let sortableCleanup = null;
let currentTab = 'all';
let noteOnly = false;
let keyword = '';
let sortMode = 'custom';
let searchOpen = false;

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/></svg>';
const PLACEHOLDER = '<svg class="placeholder" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M31 24 L42 16 Q50 27 58 16 L69 24 L84 41 L72 51 L72 103 L28 103 L28 51 L16 41 Z"/></svg>';
const CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>';
const SWAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>';

export function outfitCoverHtml(outfit) {
  const ids = (outfit.itemIds ?? []).slice(0, 4);
  const tiles = ids.map(id => {
    const url = photoUrl(itemById(id)?.photoId);
    return `<div class="outfit-tile">${url ? `<img src="${url}" alt="">` : PLACEHOLDER}</div>`;
  });
  while (tiles.length < 4) tiles.push('<div class="outfit-tile"></div>');
  return `<div class="outfit-collage">${tiles.join('')}</div>`;
}

export function renderOutfits() {
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

function lastWornMap(state) {
  const map = new Map();
  for (const log of state.logs) {
    if (!log.outfitId) continue;
    const previous = map.get(log.outfitId);
    if (!previous || log.date > previous) map.set(log.outfitId, log.date);
  }
  return map;
}

function paint() {
  const app = document.getElementById('app');
  const state = getState();
  const lastWorn = lastWornMap(state);
  const recentCount = state.outfits.filter(outfit => lastWorn.has(outfit.id)).length;
  app.innerHTML = `
    <div class="page outfit-page">
      <header class="outfit-head">
        <div class="page-header">
          <div>
            <div class="wardrobe-title-row">
              <span class="logo-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></span>
              <h1 class="page-title">搭配</h1>
            </div>
            <div class="page-meta">${state.outfits.length} 套搭配 · 最近穿过 ${recentCount} 套</div>
          </div>
          <div class="head-actions">
            <button type="button" class="icon-button" id="outfit-search-button" aria-label="搜索">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
            </button>
            <button type="button" class="icon-button" id="outfit-sort-button" aria-label="排序">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/></svg>
            </button>
          </div>
        </div>
      </header>
      <div class="outfit-tabs" id="outfit-tabs">
        <button type="button" class="outfit-tab${currentTab === 'all' ? ' active' : ''}" data-tab="all">全部</button>
        <button type="button" class="outfit-tab${currentTab === 'favorite' ? ' active' : ''}" data-tab="favorite">收藏</button>
        <button type="button" class="outfit-tab${currentTab === 'recent' ? ' active' : ''}" data-tab="recent">最近穿过</button>
      </div>
      ${searchOpen ? `<div class="search-pill" style="margin-top:8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg><input id="outfit-search-input" type="search" placeholder="搜索搭配名称、备注" value="${escapeHtml(keyword)}" aria-label="搜索搭配"></div>` : ''}
      <button type="button" class="calendar-card" id="calendar-card" style="text-align:left;border:0;width:calc(100% - 32px);font-family:inherit">
        <span class="calendar-icon">${CAL}</span>
        <span class="calendar-text"><b>穿搭日历</b><span>记录每日穿着 · 本月已记 ${state.logs.filter(log => log.date.startsWith(new Date().toISOString().slice(0, 7))).length} 天</span></span>
        <span class="chevron">›</span>
      </button>
      <div class="outfit-filter-row">
        <button type="button" class="outfit-filter${noteOnly ? '' : ' active'}" data-note="all">全部</button>
        <button type="button" class="outfit-filter${noteOnly ? ' active' : ''}" data-note="note">有备注</button>
      </div>
      <div class="outfit-grid" id="outfit-grid"></div>
    </div>
  `;
  document.getElementById('outfit-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    currentTab = button.dataset.tab;
    paint();
  });
  document.getElementById('outfit-search-button').addEventListener('click', () => {
    searchOpen = !searchOpen;
    paint();
    if (searchOpen) setTimeout(() => document.getElementById('outfit-search-input')?.focus(), 0);
  });
  document.getElementById('outfit-sort-button').addEventListener('click', openSortSheet);
  document.getElementById('calendar-card').addEventListener('click', () => navigate('/logs'));
  document.querySelector('.outfit-filter-row').addEventListener('click', event => {
    const button = event.target.closest('[data-note]');
    if (!button) return;
    noteOnly = button.dataset.note === 'note';
    paint();
  });
  document.getElementById('outfit-search-input')?.addEventListener('input', event => {
    keyword = event.target.value;
    renderGrid();
  });
  renderGrid();
}

function visibleOutfits(state) {
  const lastWorn = lastWornMap(state);
  let list = [...state.outfits];
  if (currentTab === 'favorite') list = list.filter(outfit => outfit.favorite);
  if (currentTab === 'recent') list = list.filter(outfit => lastWorn.has(outfit.id));
  if (noteOnly) list = list.filter(outfit => (outfit.note ?? '').trim());
  const q = keyword.trim().toLowerCase();
  if (q) {
    list = list.filter(outfit => [outfit.name, outfit.note].filter(Boolean).join(' ').toLowerCase().includes(q));
  }
  if (sortMode === 'recent') {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortMode === 'recentWorn') {
    list.sort((a, b) => (lastWorn.get(b.id) ?? '').localeCompare(lastWorn.get(a.id) ?? ''));
  } else {
    list.sort((a, b) => (a.sortOrder ?? a.code ?? 0) - (b.sortOrder ?? b.code ?? 0));
  }
  return list;
}

function renderGrid() {
  const state = getState();
  const grid = document.getElementById('outfit-grid');
  if (!grid) return;
  sortableCleanup?.();
  sortableCleanup = null;
  const outfits = visibleOutfits(state);
  grid.classList.toggle('no-drag', sortMode !== 'custom');
  grid.innerHTML = '';
  if (!outfits.length) {
    grid.append(emptyState({
      title: state.outfits.length ? '没有符合条件的搭配' : '还没有搭配',
      description: state.outfits.length ? '换个标签或清除筛选试试。' : '把常穿的单品组合起来，出门前直接选一套。',
      actionLabel: state.outfits.length ? '查看全部搭配' : (state.items.length ? '新建第一套搭配' : '先去录入单品'),
      onAction: () => {
        if (state.outfits.length) {
          currentTab = 'all';
          noteOnly = false;
          keyword = '';
          paint();
        } else {
          navigate(state.items.length ? '/outfit/new' : '/item/new');
        }
      },
    }));
    return;
  }
  for (const outfit of outfits) grid.append(createOutfitCard(outfit));
  if (sortMode === 'custom') {
    sortableCleanup = makeSortable(grid, {
      itemSelector: '.outfit-card',
      handleSelector: '.drag-handle',
      onReorder: async ids => {
        try {
          await reorderOutfits(ids);
          await loadAll();
          showToast('顺序已保存');
        } catch {
          showToast('排序保存失败', { type: 'error' });
        }
      },
    });
  }
}

function createOutfitCard(outfit) {
  const card = document.createElement('div');
  card.className = 'outfit-card';
  card.dataset.id = outfit.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `查看 ${outfit.name}`);
  const ids = (outfit.itemIds ?? []).slice(0, 4);
  const tiles = ids.map(id => {
    const item = itemById(id);
    const url = photoUrl(item?.photoId);
    return `<div class="outfit-tile">${url ? `<img src="${url}" alt="">` : PLACEHOLDER}</div>`;
  });
  while (tiles.length < 4) tiles.push('<div class="outfit-tile"></div>');
  const seasonText = (outfit.seasons ?? []).map(value => SEASON_LABELS[value] ?? value).join('');
  const occasionText = (outfit.occasions ?? []).map(value => OCCASION_LABELS[value] ?? value).join(' · ');
  card.innerHTML = `
    <span class="drag-handle" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <button type="button" class="outfit-heart${outfit.favorite ? ' active' : ''}" aria-label="${outfit.favorite ? '取消收藏' : '收藏'}"><span>${HEART}</span></button>
    <div class="outfit-collage">${tiles.join('')}</div>
    <div class="outfit-name">${escapeHtml(outfit.name)}</div>
    <div class="outfit-meta"><span>${(outfit.itemIds ?? []).length} 件${seasonText ? ` · ${seasonText}` : ''}</span><span style="display:flex;gap:5px">${SWAP}${CAL}</span></div>
  `;
  card.addEventListener('click', event => {
    if (event.target.closest('.outfit-heart, .drag-handle')) return;
    navigate(`/outfit/${outfit.id}`);
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(`/outfit/${outfit.id}`);
    }
  });
  card.querySelector('.outfit-heart').addEventListener('click', async event => {
    event.stopPropagation();
    try {
      await saveOutfit({ ...outfit, favorite: !outfit.favorite });
      await loadAll();
      showToast(outfit.favorite ? '已取消收藏' : '已收藏');
    } catch {
      showToast('操作失败，请重试', { type: 'error' });
    }
  });
  return card;
}

function openSortSheet() {
  const options = [
    ['custom', '自定义顺序'],
    ['recent', '最近创建'],
    ['recentWorn', '最近穿过'],
  ];
  openSheet({
    title: '排序方式',
    actions: options.map(([value, label]) => ({
      label: `${sortMode === value ? '✓ ' : ''}${label}`,
      variant: sortMode === value ? 'primary' : 'ghost',
      onClick: () => {
        sortMode = value;
        closeSheet();
        paint();
      },
    })),
  });
}
