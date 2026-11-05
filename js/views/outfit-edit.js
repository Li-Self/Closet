import { getState, outfitById, itemById, photoUrl, loadAll } from '../store.js';
import { saveOutfit } from '../db/outfits.js';
import { COLOR_HEX } from '../db/settings.js';
import { validateOutfit, hasErrors, SEASONS, OCCASIONS, SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { openSheet, closeSheet } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 13l4 4L19 7"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>';
const PLACEHOLDER = '<svg class="placeholder" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M31 24 L42 16 Q50 27 58 16 L69 24 L84 41 L72 51 L72 103 L28 103 L28 51 L16 41 Z"/></svg>';
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

export function renderOutfitEdit({ id = 'new' } = {}) {
  const state = getState();
  const existing = id && id !== 'new' ? outfitById(id) : null;
  if (id !== 'new' && !existing) {
    showToast('搭配不存在', { type: 'error' });
    navigate('/outfits');
    return () => {};
  }
  const app = document.getElementById('app');
  const selectedItemIds = new Set(existing?.itemIds ?? []);
  let selectedCategory = '';
  let keyword = '';
  document.body.classList.add('builder-mode');

  const categories = () => [...new Set([
    ...state.settings.categories,
    ...state.items.flatMap(item => item.categories ?? []),
  ])].filter(Boolean);

  app.innerHTML = `
    <div class="page builder-page">
      <header class="builder-head">
        <button type="button" class="icon-button" id="builder-back" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div class="builder-title">${existing ? '编辑搭配' : '新建搭配'}</div>
        <button type="button" class="icon-button" id="builder-search-button" aria-label="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
        </button>
      </header>
      <div class="builder-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
        <input id="builder-search-input" type="search" placeholder="搜索单品" aria-label="搜索单品">
      </div>
      <div class="builder-body">
        <aside class="builder-rail" id="builder-rail"></aside>
        <div class="builder-list" id="builder-list"></div>
      </div>
      <div class="builder-bottom">
        <div class="builder-thumbs" id="builder-thumbs"></div>
        <div class="builder-count" id="builder-count">已选 0 件<span>点击右侧 + 添加单品</span></div>
        <button type="button" class="builder-next" id="builder-next" disabled>下一步 ›</button>
      </div>
    </div>
  `;

  const back = () => {
    if (history.length > 1) history.back();
    else navigate('/outfits');
  };
  document.getElementById('builder-back').addEventListener('click', back);
  document.getElementById('builder-search-button').addEventListener('click', () => {
    document.getElementById('builder-search-input')?.focus();
  });
  document.getElementById('builder-search-input').addEventListener('input', event => {
    keyword = event.target.value;
    renderList();
  });
  document.getElementById('builder-next').addEventListener('click', openInfoSheet);
  document.getElementById('builder-list').addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (!button) return;
    const itemId = button.dataset.add;
    selectedItemIds.has(itemId) ? selectedItemIds.delete(itemId) : selectedItemIds.add(itemId);
    const active = selectedItemIds.has(itemId);
    button.classList.toggle('selected', active);
    button.innerHTML = active ? CHECK : PLUS;
    button.setAttribute('aria-label', active ? '移出搭配' : '加入搭配');
    renderSummary();
  });

  function renderRail() {
    const rail = document.getElementById('builder-rail');
    if (!rail) return;
    const options = [{ name: '', label: '全部', count: state.items.length }, ...categories().map(name => ({
      name,
      label: name,
      count: state.items.filter(item => (item.categories ?? []).includes(name)).length,
    }))];
    rail.innerHTML = options.map(option => `
      <button type="button" class="rail-item${selectedCategory === option.name ? ' active' : ''}" data-category="${escapeHtml(option.name)}">
        <span class="rail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${CATEGORY_ICONS[option.label] ?? CATEGORY_ICONS['其他']}</svg></span>
        <span class="rail-label">${escapeHtml(option.label)}</span>
        <span class="rail-count">${option.count}</span>
      </button>
    `).join('');
    rail.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = button.dataset.category;
        renderRail();
        renderList();
      });
    });
  }

  function filteredItems() {
    const q = keyword.trim().toLowerCase();
    return state.items.filter(item => {
      if (selectedCategory && !(item.categories ?? []).includes(selectedCategory)) return false;
      if (!q) return true;
      return [item.name, item.brand, ...(item.categories ?? []), ...(item.colors ?? [])]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }

  function renderList() {
    const list = document.getElementById('builder-list');
    if (!list) return;
    const items = filteredItems();
    if (!items.length) {
      list.innerHTML = '<div class="empty-inline">没有符合条件的单品。</div>';
      return;
    }
    list.innerHTML = items.map(item => {
      const url = photoUrl(item.photoId);
      const active = selectedItemIds.has(item.id);
      const colors = (item.colors ?? []).join('/');
      const meta = [item.brand, colors].filter(Boolean).join(' · ') || (item.categories ?? []).join('/') || '未分类';
      return `
        <div class="builder-item">
          <span class="builder-item-photo">${url ? `<img src="${url}" alt="">` : PLACEHOLDER}</span>
          <span class="builder-item-info">
            <span class="builder-item-name">${escapeHtml(item.name)}</span>
            <span class="builder-item-meta"><span class="color-dot" style="background:${COLOR_HEX[(item.colors ?? [])[0]] ?? 'transparent'}"></span>${escapeHtml(meta)}</span>
          </span>
          <button type="button" class="builder-add${active ? ' selected' : ''}" data-add="${item.id}" aria-label="${active ? '移出搭配' : '加入搭配'}">${active ? CHECK : PLUS}</button>
        </div>
      `;
    }).join('');
  }

  function renderSummary() {
    const thumbs = document.getElementById('builder-thumbs');
    const count = document.getElementById('builder-count');
    const next = document.getElementById('builder-next');
    if (!thumbs || !count || !next) return;
    const selected = [...selectedItemIds].map(itemId => itemById(itemId)).filter(Boolean);
    thumbs.innerHTML = selected.slice(0, 4).map(item => {
      const url = photoUrl(item.photoId);
      return `<span class="builder-thumb">${url ? `<img src="${url}" alt="">` : PLACEHOLDER}</span>`;
    }).join('');
    count.innerHTML = `已选 ${selected.length} 件<span>${selected.length ? selected.slice(0, 3).map(item => escapeHtml(item.name)).join(' · ') : '点击右侧 + 添加单品'}</span>`;
    next.disabled = selected.length === 0;
  }

  function openInfoSheet() {
    const items = [...selectedItemIds].map(itemId => itemById(itemId)).filter(Boolean);
    if (!items.length) {
      showToast('请先选择单品', { type: 'error' });
      return;
    }
    const draft = {
      seasons: new Set(existing?.seasons ?? []),
      occasions: new Set(existing?.occasions ?? []),
      favorite: Boolean(existing?.favorite),
    };
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="builder-summary">
        <span class="builder-thumbs">${items.slice(0, 4).map(item => {
          const url = photoUrl(item.photoId);
          return `<span class="builder-thumb">${url ? `<img src="${url}" alt="">` : PLACEHOLDER}</span>`;
        }).join('')}</span>
        <span class="builder-count">已选 ${items.length} 件<span>${items.slice(0, 3).map(item => escapeHtml(item.name)).join(' · ')}</span></span>
      </div>
      <div class="builder-sheet-form">
        <div class="field full">
          <label class="field-label" for="builder-name">搭配名称 *</label>
          <input class="text-input" id="builder-name" maxlength="60" value="${escapeHtml(existing?.name ?? '')}" placeholder="例如：周末咖啡散步">
        </div>
        <div class="field full">
          <div class="field-label">季节 · 可多选</div>
          <div class="choice-row" id="builder-season-choices">
            ${SEASONS.map(key => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${draft.seasons.has(key)}">${SEASON_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field full">
          <div class="field-label">场合 · 可多选</div>
          <div class="choice-row" id="builder-occasion-choices">
            ${OCCASIONS.map(key => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${draft.occasions.has(key)}">${OCCASION_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field full">
          <label class="field-label" for="builder-note">备注</label>
          <textarea class="text-area" id="builder-note" maxlength="500">${escapeHtml(existing?.note ?? '')}</textarea>
        </div>
        <div class="field full">
          <div class="field-label">收藏</div>
          <div class="choice-row"><button type="button" class="choice-chip" id="builder-favorite" aria-pressed="${draft.favorite}">加入收藏</button></div>
        </div>
      </div>
    `;
    content.querySelector('#builder-season-choices').addEventListener('click', event => {
      const button = event.target.closest('[data-season]');
      if (!button) return;
      const value = button.dataset.season;
      draft.seasons.has(value) ? draft.seasons.delete(value) : draft.seasons.add(value);
      button.setAttribute('aria-pressed', String(draft.seasons.has(value)));
    });
    content.querySelector('#builder-occasion-choices').addEventListener('click', event => {
      const button = event.target.closest('[data-occasion]');
      if (!button) return;
      const value = button.dataset.occasion;
      draft.occasions.has(value) ? draft.occasions.delete(value) : draft.occasions.add(value);
      button.setAttribute('aria-pressed', String(draft.occasions.has(value)));
    });
    content.querySelector('#builder-favorite').addEventListener('click', event => {
      draft.favorite = !draft.favorite;
      event.currentTarget.setAttribute('aria-pressed', String(draft.favorite));
    });

    const save = async () => {
      const name = content.querySelector('#builder-name').value;
      const note = content.querySelector('#builder-note').value;
      const payload = {
        id: existing?.id,
        name,
        itemIds: items.map(item => item.id),
        seasons: [...draft.seasons],
        occasions: [...draft.occasions],
        note,
        favorite: draft.favorite,
      };
      const errors = validateOutfit(payload);
      if (hasErrors(errors)) {
        showToast(Object.values(errors)[0], { type: 'error' });
        return;
      }
      try {
        const saved = await saveOutfit(payload);
        await loadAll();
        closeSheet();
        showToast(existing ? '已保存' : '已生成搭配');
        navigate(`/outfit/${saved.id}`);
      } catch (error) {
        showToast(error?.errors ? Object.values(error.errors)[0] : '保存失败，请重试', { type: 'error' });
      }
    };

    openSheet({
      title: existing ? '编辑搭配信息' : '填写搭配信息',
      content,
      actions: [
        { label: existing ? '保存搭配' : '生成搭配', variant: 'primary', onClick: save },
        { label: '取消', variant: 'ghost', onClick: closeSheet },
      ],
    });
  }

  renderRail();
  renderList();
  renderSummary();
  return () => {
    document.body.classList.remove('builder-mode');
  };
}
