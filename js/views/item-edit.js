import { getState, itemById, photoUrl, loadAll } from '../store.js';
import { saveItem, deleteItem } from '../db/items.js';
import { savePhoto, deletePhoto } from '../db/photos.js';
import { COLOR_HEX } from '../db/settings.js';
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
  document.body.classList.add('detail-mode');
  const app = document.getElementById('app');
  const existingCategories = existing
    ? (existing.categories ?? (existing.category ? [existing.category] : []))
    : [];
  const existingColors = existing
    ? (existing.colors ?? (existing.color ? [existing.color] : []))
    : [];
  const categories = [...new Set([...state.settings.categories, ...existingCategories])].filter(Boolean);
  const colors = [...new Set([...state.settings.colors, ...existingColors])].filter(Boolean);
  const selected = {
    categories: new Set(existing ? existingCategories : (categories.length ? [categories[0]] : [])),
    colors: new Set(existingColors),
    seasons: new Set(existing?.seasons ?? []),
    occasions: new Set(existing?.occasions ?? []),
    favorite: Boolean(existing?.favorite),
  };
  let photoChanged = false;
  let pendingPhoto = null;

  app.innerHTML = `
    <div class="page edit-page">
      <header class="page-header" style="padding-top:10px">
        <button type="button" class="icon-button" id="back-button" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <h1 class="page-title" style="font-size:17px;flex:1;text-align:center;line-height:44px">${existing ? '编辑单品' : '录入单品'}</h1>
        <button type="button" class="head-link" id="header-save">保存</button>
      </header>
      <div class="photo-card" id="photo-slot"></div>
      <form class="form-card" id="item-form" novalidate>
        <div class="field">
          <label class="field-label" for="item-name">名称 *</label>
          <input class="text-input" id="item-name" name="name" maxlength="60" value="${escapeHtml(existing?.name ?? '')}" required>
          <div class="field-error" id="error-name"></div>
        </div>
        <div class="field">
          <label class="field-label" for="item-brand">品牌</label>
          <input class="text-input" id="item-brand" maxlength="40" value="${escapeHtml(existing?.brand ?? '')}">
        </div>
        <div class="field">
          <div class="field-label">分类 · 可多选 *</div>
          <div class="choice-row" id="category-choices">
            ${categories.map(name => `<button type="button" class="choice-chip" data-category="${escapeHtml(name)}" aria-pressed="${selected.categories.has(name)}">${escapeHtml(name)}</button>`).join('')}
          </div>
          <div class="field-error" id="error-categories"></div>
        </div>
        <div class="field">
          <div class="field-label">颜色 · 可多选</div>
          <div class="choice-row" id="color-choices">
            ${colors.map(name => `<button type="button" class="choice-chip" data-color="${escapeHtml(name)}" aria-pressed="${selected.colors.has(name)}"><span class="color-dot" style="background:${COLOR_HEX[name] ?? '#C9A9A9'}"></span>${escapeHtml(name)}</button>`).join('')}
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
          <label class="field-label" for="item-note">备注</label>
          <textarea class="text-area" id="item-note" maxlength="500">${escapeHtml(existing?.note ?? '')}</textarea>
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

  const back = () => {
    photoInput.clear();
    if (history.length > 1) history.back();
    else navigate('/wardrobe');
  };
  document.getElementById('back-button').addEventListener('click', back);
  document.getElementById('header-save').addEventListener('click', () => {
    document.getElementById('item-form').requestSubmit();
  });
  document.getElementById('favorite-toggle').addEventListener('click', event => {
    selected.favorite = !selected.favorite;
    event.currentTarget.setAttribute('aria-pressed', String(selected.favorite));
  });
  document.getElementById('category-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    const value = button.dataset.category;
    selected.categories.has(value) ? selected.categories.delete(value) : selected.categories.add(value);
    button.setAttribute('aria-pressed', String(selected.categories.has(value)));
  });
  document.getElementById('color-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-color]');
    if (!button) return;
    const value = button.dataset.color;
    selected.colors.has(value) ? selected.colors.delete(value) : selected.colors.add(value);
    button.setAttribute('aria-pressed', String(selected.colors.has(value)));
  });
  document.getElementById('season-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-season]');
    if (!button) return;
    const value = button.dataset.season;
    selected.seasons.has(value) ? selected.seasons.delete(value) : selected.seasons.add(value);
    button.setAttribute('aria-pressed', String(selected.seasons.has(value)));
  });
  document.getElementById('occasion-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-occasion]');
    if (!button) return;
    const value = button.dataset.occasion;
    selected.occasions.has(value) ? selected.occasions.delete(value) : selected.occasions.add(value);
    button.setAttribute('aria-pressed', String(selected.occasions.has(value)));
  });

  document.getElementById('item-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = {
      id: existing?.id,
      name: document.getElementById('item-name').value,
      brand: document.getElementById('item-brand').value,
      categories: [...selected.categories],
      colors: [...selected.colors],
      seasons: [...selected.seasons],
      occasions: [...selected.occasions],
      note: document.getElementById('item-note').value,
      favorite: selected.favorite,
    };
    const errors = validateItem(form);
    document.getElementById('error-name').textContent = errors.name ?? '';
    document.getElementById('error-categories').textContent = errors.categories ?? '';
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

  return () => {
    photoInput.clear();
    document.body.classList.remove('detail-mode');
  };
}
