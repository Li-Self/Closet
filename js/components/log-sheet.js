import { getState, itemById, logByDate, loadAll, photoUrl } from '../store.js';
import { saveLog } from '../db/logs.js';
import { nowKey, formatDateLabel, weekdayLabel } from '../utils/dates.js';
import { escapeHtml } from '../utils/dom.js';
import { openSheet, closeSheet } from './modal.js';
import { showToast } from './toast.js';

const WEATHERS = ['晴', '阴', '雨', '冷', '热'];

export function openLogSheet({ date = nowKey(), outfitId = null, itemIds = [] } = {}) {
  const state = getState();
  const existing = logByDate(date);
  const initialMode = outfitId || existing?.outfitId ? 'outfit' : 'items';
  const draft = {
    mode: initialMode,
    outfitId: outfitId ?? existing?.outfitId ?? state.outfits[0]?.id ?? null,
    itemIds: new Set(itemIds.length ? itemIds : (existing?.itemIds ?? [])),
    note: existing?.note ?? '',
    weather: existing?.weather ?? '',
  };

  const content = document.createElement('div');
  content.className = 'log-sheet';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.gap = '12px';
  content.innerHTML = `
    <div class="log-date">${formatDateLabel(date)} · ${weekdayLabel(date)}</div>
    <div class="choice-row" id="mode-choices">
      <button type="button" class="choice-chip" data-mode="outfit" aria-pressed="${draft.mode === 'outfit'}">选搭配</button>
      <button type="button" class="choice-chip" data-mode="items" aria-pressed="${draft.mode === 'items'}">临时选单品</button>
    </div>
    <div id="outfit-pane"></div>
    <div id="items-pane"></div>
    <div class="field">
      <label class="field-label" for="log-note">备注</label>
      <textarea class="text-area" id="log-note" maxlength="300">${escapeHtml(draft.note)}</textarea>
    </div>
    <div class="field">
      <div class="field-label">天气（可选）</div>
      <div class="choice-row" id="weather-choices"></div>
    </div>
    <div class="field-error" id="log-error"></div>
  `;

  const paintModes = () => {
    content.querySelectorAll('[data-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === draft.mode));
    });
    paintOutfits();
    paintItems();
  };

  const paintOutfits = () => {
    const pane = content.querySelector('#outfit-pane');
    if (draft.mode !== 'outfit') { pane.innerHTML = ''; return; }
    if (!state.outfits.length) {
      pane.innerHTML = '<div class="empty-inline">还没有搭配，切换到「临时选单品」记录。</div>';
      return;
    }
    pane.innerHTML = state.outfits.map(outfit => {
      const ids = outfit.itemIds ?? [];
      const thumb = ids.map(id => photoUrl(itemById(id)?.photoId)).find(Boolean);
      return `
        <button type="button" class="log-option" data-outfit="${outfit.id}" aria-pressed="${draft.outfitId === outfit.id}">
          <span class="log-option-thumb">${thumb ? `<img src="${thumb}" alt="">` : ''}</span>
          <span><b>${escapeHtml(outfit.name)}</b><small>${ids.length} 件单品</small></span>
        </button>
      `;
    }).join('');
    pane.querySelectorAll('[data-outfit]').forEach(button => {
      button.addEventListener('click', () => {
        draft.outfitId = button.dataset.outfit;
        paintOutfits();
      });
    });
  };

  const paintItems = () => {
    const pane = content.querySelector('#items-pane');
    if (draft.mode !== 'items') { pane.innerHTML = ''; return; }
    if (!state.items.length) {
      pane.innerHTML = '<div class="empty-inline">衣橱还是空的，先去录入单品。</div>';
      return;
    }
    pane.innerHTML = `<div class="log-items-grid">${state.items.map(item => {
      const url = photoUrl(item.photoId);
      return `
        <button type="button" class="log-item" data-item="${item.id}" aria-pressed="${draft.itemIds.has(item.id)}">
          <span class="log-item-thumb">${url ? `<img src="${url}" alt="">` : ''}</span>
          <span>${escapeHtml(item.name)}</span>
        </button>
      `;
    }).join('')}</div>`;
    pane.querySelectorAll('[data-item]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.item;
        draft.itemIds.has(id) ? draft.itemIds.delete(id) : draft.itemIds.add(id);
        paintItems();
      });
    });
  };

  const paintWeather = () => {
    const row = content.querySelector('#weather-choices');
    row.innerHTML = WEATHERS.map(weather => `
      <button type="button" class="choice-chip" data-weather="${weather}" aria-pressed="${draft.weather === weather}">${weather}</button>
    `).join('');
    row.querySelectorAll('[data-weather]').forEach(button => {
      button.addEventListener('click', () => {
        draft.weather = draft.weather === button.dataset.weather ? '' : button.dataset.weather;
        paintWeather();
      });
    });
  };

  content.querySelector('#mode-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    draft.mode = button.dataset.mode;
    paintModes();
  });
  content.querySelector('#log-note').addEventListener('input', event => {
    draft.note = event.target.value;
  });

  paintModes();
  paintWeather();

  const save = async () => {
    let outfit = null;
    let items = [];
    if (draft.mode === 'outfit') {
      outfit = state.outfits.find(item => item.id === draft.outfitId);
      if (!outfit) { showToast('请选择一套搭配', { type: 'error' }); return; }
      items = outfit.itemIds.map(id => itemById(id)).filter(Boolean);
      if (!items.length) { showToast('这套搭配里的单品已被删除，请先编辑搭配', { type: 'error' }); return; }
    } else {
      items = [...draft.itemIds].map(id => itemById(id)).filter(Boolean);
      if (!items.length) { showToast('请至少选择一件单品', { type: 'error' }); return; }
    }
    try {
      await saveLog({
        id: existing?.id,
        date,
        outfitId: outfit?.id ?? null,
        outfitName: outfit?.name ?? '',
        items,
        note: draft.note,
        weather: draft.weather,
      });
      await loadAll();
      closeSheet();
      showToast('已记录');
    } catch (error) {
      const box = document.getElementById('log-error');
      if (box) box.textContent = error.code === 'DUPLICATE_DATE' ? '这一天已经有记录，请重新打开编辑。' : (error.message || '保存失败');
    }
  };

  openSheet({
    title: existing ? '编辑穿着记录' : '记录穿着',
    content,
    actions: [{ label: '保存记录', variant: 'primary', onClick: save }],
  });
}
