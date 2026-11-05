import { getState, outfitById, photoUrl, loadAll } from '../store.js';
import { saveOutfit } from '../db/outfits.js';
import { validateOutfit, hasErrors, SEASONS, OCCASIONS, SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export function renderOutfitEdit({ id = 'new' } = {}) {
  const state = getState();
  const existing = id && id !== 'new' ? outfitById(id) : null;
  if (id !== 'new' && !existing) {
    showToast('搭配不存在', { type: 'error' });
    navigate('/outfits');
    return () => {};
  }
  const app = document.getElementById('app');
  const selected = {
    itemIds: new Set(existing?.itemIds ?? []),
    seasons: new Set(existing?.seasons ?? []),
    occasions: new Set(existing?.occasions ?? []),
    favorite: Boolean(existing?.favorite),
  };
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:22px;flex:1;text-align:center">${existing ? '编辑搭配' : '新建搭配'}</h1>
        <span style="width:44px"></span>
      </header>
      <form class="form-grid" id="outfit-form" novalidate>
        <div class="field">
          <label class="field-label" for="outfit-name">名称 *</label>
          <input class="text-input" id="outfit-name" maxlength="60" value="${escapeHtml(existing?.name ?? '')}" required>
          <div class="field-error" id="error-name"></div>
        </div>
        <div class="field">
          <div class="field-label">选择单品 * <span id="selected-count">${selected.itemIds.size}</span> 件</div>
          <div id="item-choices" class="item-choose-grid"></div>
          <div class="field-error" id="error-items"></div>
          ${state.items.length ? '' : '<div class="empty-inline">衣橱还是空的，先去录入单品。</div>'}
        </div>
        <div class="field">
          <div class="field-label">季节</div>
          <div class="choice-row" id="season-choices">
            ${SEASONS.map(key => `<button type="button" class="choice-chip" data-season="${key}" aria-pressed="${selected.seasons.has(key)}">${SEASON_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-label">场合</div>
          <div class="choice-row" id="occasion-choices">
            ${OCCASIONS.map(key => `<button type="button" class="choice-chip" data-occasion="${key}" aria-pressed="${selected.occasions.has(key)}">${OCCASION_LABELS[key]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="outfit-note">备注</label>
          <textarea class="text-area" id="outfit-note" maxlength="500">${escapeHtml(existing?.note ?? '')}</textarea>
        </div>
        <div class="field">
          <div class="field-label">收藏</div>
          <div class="choice-row"><button type="button" class="choice-chip" id="favorite-toggle" aria-pressed="${selected.favorite}">加入收藏</button></div>
        </div>
        <button type="submit" class="primary-button" id="save-button">保存搭配</button>
      </form>
    </div>
  `;

  const choices = document.getElementById('item-choices');
  const paintChoices = () => {
    choices.innerHTML = state.items.map(item => {
      const url = photoUrl(item.photoId);
      const active = selected.itemIds.has(item.id);
      return `
        <button type="button" class="item-choose" data-item="${item.id}" aria-pressed="${active}" aria-label="${escapeHtml(item.name)}">
          ${url ? `<img src="${url}" alt="">` : ''}
          <span class="choose-name">${escapeHtml(item.name)}</span>
          <span class="check">${active ? '✓' : ''}</span>
        </button>
      `;
    }).join('');
    choices.querySelectorAll('[data-item]').forEach(button => {
      button.addEventListener('click', () => {
        const itemId = button.dataset.item;
        selected.itemIds.has(itemId) ? selected.itemIds.delete(itemId) : selected.itemIds.add(itemId);
        document.getElementById('selected-count').textContent = selected.itemIds.size;
        paintChoices();
      });
    });
  };
  paintChoices();

  document.getElementById('back-button').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/outfits');
  });
  document.getElementById('favorite-toggle').addEventListener('click', event => {
    selected.favorite = !selected.favorite;
    event.currentTarget.setAttribute('aria-pressed', String(selected.favorite));
  });
  document.getElementById('season-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-season]');
    if (!button) return;
    const key = button.dataset.season;
    selected.seasons.has(key) ? selected.seasons.delete(key) : selected.seasons.add(key);
    button.setAttribute('aria-pressed', String(selected.seasons.has(key)));
  });
  document.getElementById('occasion-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-occasion]');
    if (!button) return;
    const key = button.dataset.occasion;
    selected.occasions.has(key) ? selected.occasions.delete(key) : selected.occasions.add(key);
    button.setAttribute('aria-pressed', String(selected.occasions.has(key)));
  });

  document.getElementById('outfit-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = {
      id: existing?.id,
      name: document.getElementById('outfit-name').value,
      itemIds: [...selected.itemIds],
      seasons: [...selected.seasons],
      occasions: [...selected.occasions],
      note: document.getElementById('outfit-note').value,
      favorite: selected.favorite,
    };
    const errors = validateOutfit(form);
    document.getElementById('error-name').textContent = errors.name ?? '';
    document.getElementById('error-items').textContent = errors.itemIds ?? '';
    if (hasErrors(errors)) return;
    const button = document.getElementById('save-button');
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const saved = await saveOutfit(form);
      await loadAll();
      showToast('已保存');
      navigate(`/outfit/${saved.id}`);
    } catch (error) {
      showToast(error?.errors ? Object.values(error.errors)[0] : '保存失败，请重试', { type: 'error' });
      button.disabled = false;
      button.textContent = '保存搭配';
    }
  });

  return () => {};
}
