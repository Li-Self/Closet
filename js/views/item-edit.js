import { getState, itemById, photoUrl, loadAll } from '../store.js';
import { saveItem, deleteItem } from '../db/items.js';
import { savePhoto, deletePhoto } from '../db/photos.js';
import { uuid } from '../utils/id.js';
import { validateItem, hasErrors, SEASONS, OCCASIONS, SEASON_LABELS, OCCASION_LABELS } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { createPhotoInput } from '../components/photo-input.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export function renderItemEdit({ id = 'new' } = {}) {
  const state = getState();
  const existing = id && id !== 'new' ? itemById(id) : null;
  if (id !== 'new' && !existing) {
    showToast('单品不存在', { type: 'error' });
    navigate('/wardrobe');
    return () => {};
  }
  const app = document.getElementById('app');
  const selected = {
    seasons: new Set(existing?.seasons ?? []),
    occasions: new Set(existing?.occasions ?? []),
    favorite: Boolean(existing?.favorite),
  };
  const categories = existing?.category && !state.settings.categories.includes(existing.category)
    ? [...state.settings.categories, existing.category]
    : state.settings.categories;
  const colors = existing?.color && !state.settings.colors.includes(existing.color)
    ? [...state.settings.colors, existing.color]
    : state.settings.colors;
  let selectedCategory = existing?.category ?? categories[0] ?? '';
  let selectedColor = existing?.color ?? colors[0] ?? '';
  let photoChanged = false;
  let pendingPhoto = null;

  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <button class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:22px;flex:1;text-align:center">${existing ? '编辑单品' : '录入单品'}</h1>
        <span style="width:44px"></span>
      </header>
      <form class="form-grid" id="item-form" novalidate>
        <div id="photo-slot"></div>
        <div class="field">
          <label class="field-label" for="item-name">名称 *</label>
          <input class="text-input" id="item-name" name="name" maxlength="60" value="${escapeHtml(existing?.name ?? '')}" required>
          <div class="field-error" id="error-name"></div>
        </div>
        <div class="field">
          <div class="field-label">分类 *</div>
          <div class="choice-row" id="category-choices">
            ${categories.map(name => `<button type="button" class="choice-chip" data-category="${escapeHtml(name)}" aria-pressed="${name === selectedCategory}">${escapeHtml(name)}</button>`).join('')}
          </div>
          <div class="field-error" id="error-category"></div>
        </div>
        <div class="field">
          <div class="field-label">颜色</div>
          <div class="choice-row" id="color-choices">
            ${colors.map(name => `<button type="button" class="choice-chip" data-color="${escapeHtml(name)}" aria-pressed="${name === selectedColor}">${escapeHtml(name)}</button>`).join('')}
          </div>
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
          <label class="field-label" for="item-brand">品牌</label>
          <input class="text-input" id="item-brand" name="brand" maxlength="40" value="${escapeHtml(existing?.brand ?? '')}">
        </div>
        <div class="field">
          <label class="field-label" for="item-note">备注</label>
          <textarea class="text-area" id="item-note" name="note" maxlength="500">${escapeHtml(existing?.note ?? '')}</textarea>
        </div>
        <div class="field">
          <div class="field-label">收藏</div>
          <div class="choice-row"><button type="button" class="choice-chip" id="favorite-toggle" aria-pressed="${selected.favorite}">加入收藏</button></div>
        </div>
        <div class="detail-actions">
          <button type="submit" class="primary-button" id="save-button">保存单品</button>
          ${existing ? '<button type="button" class="danger-button" id="delete-button">删除单品</button>' : ''}
        </div>
      </form>
    </div>
  `;

  const photoInput = createPhotoInput({
    initialUrl: existing?.photoId ? photoUrl(existing.photoId) : null,
    onChange: photo => {
      photoChanged = true;
      pendingPhoto = photo;
    },
  });
  document.getElementById('photo-slot').append(photoInput.element);

  document.getElementById('back-button').addEventListener('click', () => {
    photoInput.clear();
    if (history.length > 1) history.back();
    else navigate('/wardrobe');
  });
  document.getElementById('favorite-toggle').addEventListener('click', event => {
    selected.favorite = !selected.favorite;
    event.currentTarget.setAttribute('aria-pressed', String(selected.favorite));
  });
  document.getElementById('category-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    for (const chip of event.currentTarget.querySelectorAll('.choice-chip')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
  });
  document.getElementById('color-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-color]');
    if (!button) return;
    selectedColor = button.dataset.color;
    for (const chip of event.currentTarget.querySelectorAll('.choice-chip')) {
      chip.setAttribute('aria-pressed', String(chip === button));
    }
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

  document.getElementById('item-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = {
      id: existing?.id,
      name: document.getElementById('item-name').value,
      category: selectedCategory,
      color: selectedColor,
      seasons: [...selected.seasons],
      occasions: [...selected.occasions],
      brand: document.getElementById('item-brand').value,
      note: document.getElementById('item-note').value,
      favorite: selected.favorite,
    };
    const errors = validateItem(form);
    document.getElementById('error-name').textContent = errors.name ?? '';
    document.getElementById('error-category').textContent = errors.category ?? '';
    if (hasErrors(errors)) return;
    const saveButton = document.getElementById('save-button');
    saveButton.disabled = true;
    saveButton.textContent = '保存中…';
    let newPhoto = null;
    try {
      if (pendingPhoto) {
        newPhoto = {
          id: uuid(),
          thumb: pendingPhoto.thumb,
          full: pendingPhoto.full,
          width: pendingPhoto.width,
          height: pendingPhoto.height,
          createdAt: new Date().toISOString(),
        };
        await savePhoto(newPhoto);
        form.photoId = newPhoto.id;
      } else if (photoChanged) {
        form.photoId = null;
      }
      const saved = await saveItem(form);
      if (photoChanged && existing?.photoId && existing.photoId !== newPhoto?.id) {
        await deletePhoto(existing.photoId).catch(() => {});
      }
      await loadAll();
      photoInput.clear();
      showToast('已保存');
      navigate(`/item/${saved.id}`);
    } catch (error) {
      if (newPhoto) await deletePhoto(newPhoto.id).catch(() => {});
      showToast(error?.errors ? Object.values(error.errors)[0] : '保存失败，请重试', { type: 'error' });
      saveButton.disabled = false;
      saveButton.textContent = '保存单品';
    }
  });

  document.getElementById('delete-button')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '删除单品',
      message: `确定删除「${existing.name}」吗？它会从所有搭配中移除，历史穿着记录会保留。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await deleteItem(existing.id);
    await loadAll();
    showToast('已删除');
    navigate('/wardrobe');
  });

  return () => photoInput.clear();
}
